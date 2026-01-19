import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupCustomAuth, isAuthenticated, getUserId as getCustomUserId, getUserClaims as getCustomUserClaims } from "./customAuth";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { z } from "zod";
import { randomBytes } from "crypto";
import { stripeService } from "./stripeService";
import { getStripePublishableKey } from "./stripeClient";

// Helper to safely get user ID from session
function getUserId(req: Request): string | undefined {
  return getCustomUserId(req);
}

// Helper to safely get user claims from session
function getUserClaims(req: Request): { sub?: string; email?: string; first_name?: string; last_name?: string } {
  return getCustomUserClaims(req);
}

// Utility to get tenant ID from cookie
function getTenantIdFromCookie(req: Request): string | undefined {
  return req.cookies?.tenantId;
}

// Middleware to require tenant context
async function requireTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = getTenantIdFromCookie(req);
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant context required" });
  }

  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const membership = await storage.getMembership(tenantId, userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this organization" });
  }

  // Attach tenant and membership to request
  (req as any).tenantId = tenantId;
  (req as any).membership = membership;
  next();
}

// Role-based access control
const roleHierarchy: Record<string, number> = {
  OWNER: 100,
  ADMIN: 80,
  HIRING_MANAGER: 60,
  LOCATION_MANAGER: 40,
  REVIEWER: 20,
  VIEWER: 10,
};

function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const membership = (req as any).membership;
    if (!membership) {
      return res.status(403).json({ error: "No membership context" });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup custom auth
  await setupCustomAuth(app);
  
  // Setup object storage
  registerObjectStorageRoutes(app);
  const objectStorageService = new ObjectStorageService();

  // ============ TENANT ROUTES ============

  // Get user's tenant memberships
  app.get("/api/tenants/memberships", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const memberships = await storage.getMembershipsByUser(userId);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching memberships:", error);
      res.status(500).json({ error: "Failed to fetch memberships" });
    }
  });

  // Create tenant
  app.post("/api/tenants", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name required" });

      // Create slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 50);

      // Check if slug exists
      const existing = await storage.getTenantBySlug(slug);
      const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

      const tenant = await storage.createTenant({
        name,
        slug: finalSlug,
        planType: "FREE",
      });

      // Create owner membership
      await storage.createMembership({
        tenantId: tenant.id,
        userId,
        role: "OWNER",
        acceptedAt: new Date(),
      });

      res.json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // Get tenant members
  app.get(
    "/api/tenants/:tenantId/members",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const { tenantId } = req.params;
        const members = await storage.getMembershipsByTenant(tenantId);
        res.json(members);
      } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).json({ error: "Failed to fetch members" });
      }
    }
  );

  // Invite member
  app.post(
    "/api/tenants/:tenantId/invite",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const { tenantId } = req.params;
        const { email, role } = req.body;

        const inviteToken = randomBytes(32).toString("hex");

        const membership = await storage.createMembership({
          tenantId,
          userId: email, // Temporary placeholder until accepted
          role,
          inviteToken,
        });

        res.json({ inviteToken, membership });
      } catch (error) {
        console.error("Error creating invite:", error);
        res.status(500).json({ error: "Failed to create invite" });
      }
    }
  );

  // ============ DASHBOARD ROUTES ============

  app.get("/api/dashboard/stats", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ============ LOCATION ROUTES ============

  app.get("/api/locations", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const locs = await storage.getLocationsByTenant(tenantId);
      res.json(locs);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post(
    "/api/locations",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const location = await storage.createLocation({ ...req.body, tenantId });
        res.json(location);
      } catch (error) {
        console.error("Error creating location:", error);
        res.status(500).json({ error: "Failed to create location" });
      }
    }
  );

  app.patch(
    "/api/locations/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const location = await storage.updateLocation(id, req.body);
        res.json(location);
      } catch (error) {
        console.error("Error updating location:", error);
        res.status(500).json({ error: "Failed to update location" });
      }
    }
  );

  app.delete(
    "/api/locations/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteLocation(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting location:", error);
        res.status(500).json({ error: "Failed to delete location" });
      }
    }
  );

  // ============ JOB ROUTES ============

  app.get("/api/jobs", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const jobList = await storage.getJobsByTenant(tenantId);
      
      // Get location info and distribution channels for each job
      const jobsWithDetails = await Promise.all(
        jobList.map(async (job) => {
          const location = job.locationId ? await storage.getLocation(job.locationId) : undefined;
          const apps = await storage.getApplicationsByJob(job.id);
          const distributionChannels = await storage.getDistributionChannelsByJob(job.id);
          return { ...job, location, _count: { applications: apps.length }, distributionChannels };
        })
      );
      
      res.json(jobsWithDetails);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      
      const location = job.locationId ? await storage.getLocation(job.locationId) : undefined;
      const apps = await storage.getApplicationsByJob(id);
      
      res.json({ ...job, location, applications: apps });
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post(
    "/api/jobs",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const job = await storage.createJob({ ...req.body, tenantId });
        res.json(job);
      } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ error: "Failed to create job" });
      }
    }
  );

  app.patch(
    "/api/jobs/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const job = await storage.updateJob(id, req.body);
        res.json(job);
      } catch (error) {
        console.error("Error updating job:", error);
        res.status(500).json({ error: "Failed to update job" });
      }
    }
  );

  app.delete(
    "/api/jobs/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteJob(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting job:", error);
        res.status(500).json({ error: "Failed to delete job" });
      }
    }
  );

  // CSV Import Jobs
  const REQUIRED_CSV_HEADERS = ["title", "role"];
  const VALID_CSV_HEADERS = ["title", "role", "description", "jobType", "location", "payRangeMin", "payRangeMax", "scheduleTags"];
  
  const csvJobRowSchema = z.object({
    title: z.string().min(1, "Title is required").max(200),
    role: z.string().min(1, "Role is required").max(100),
    description: z.string().max(5000).optional().nullable(),
    jobType: z.string().optional(),
    location: z.string().max(200).optional(),
    payRangeMin: z.union([z.string(), z.number()]).optional(),
    payRangeMax: z.union([z.string(), z.number()]).optional(),
    scheduleTags: z.string().max(500).optional(),
  });

  const csvImportSchema = z.object({
    jobs: z.array(csvJobRowSchema).min(1, "At least one job is required").max(100, "Maximum 100 jobs allowed"),
    headers: z.array(z.string()).min(1, "Headers are required for CSV import"),
  });

  app.post(
    "/api/jobs/import",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        
        // Validate input schema
        const parseResult = csvImportSchema.safeParse(req.body);
        if (!parseResult.success) {
          const issues = parseResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
          return res.status(400).json({ error: "Invalid input", details: issues.slice(0, 5) });
        }

        const { jobs: jobsToImport, headers } = parseResult.data;

        // Validate required headers (always required)
        const missingHeaders = REQUIRED_CSV_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          return res.status(400).json({ 
            error: "Missing required headers", 
            details: [`Required headers: ${REQUIRED_CSV_HEADERS.join(", ")}. Found: ${headers.join(", ")}`] 
          });
        }
        
        // Check for unknown headers (warning, logged but not rejected)
        const unknownHeaders = headers.filter(h => !VALID_CSV_HEADERS.includes(h));
        if (unknownHeaders.length > 0) {
          console.log(`CSV import has unknown headers that will be ignored: ${unknownHeaders.join(", ")}`);
        }

        const results: { success: number; failed: number; errors: string[] } = {
          success: 0,
          failed: 0,
          errors: [],
        };

        const locations = await storage.getLocationsByTenant(tenantId);
        const locationMap = new Map(locations.map(l => [l.name.toLowerCase(), l.id]));

        for (let i = 0; i < jobsToImport.length; i++) {
          const row = jobsToImport[i];
          try {
            const title = row.title.trim().slice(0, 200);
            const role = row.role.trim().slice(0, 100);

            if (!title || !role) {
              results.failed++;
              results.errors.push(`Row ${i + 1}: Title and role are required`);
              continue;
            }

            // Validate job type
            const jobTypeInput = row.jobType?.toUpperCase() || "FULL_TIME";
            if (!["FULL_TIME", "PART_TIME"].includes(jobTypeInput)) {
              results.failed++;
              results.errors.push(`Row ${i + 1}: Invalid job type "${row.jobType}". Use FULL_TIME or PART_TIME`);
              continue;
            }

            // Look up location by name
            let locationId = null;
            if (row.location) {
              locationId = locationMap.get(row.location.toLowerCase().trim()) || null;
            }

            // Parse and validate pay range
            const payRangeMin = row.payRangeMin ? parseInt(String(row.payRangeMin), 10) : null;
            const payRangeMax = row.payRangeMax ? parseInt(String(row.payRangeMax), 10) : null;
            
            if (payRangeMin !== null && (isNaN(payRangeMin) || payRangeMin < 0 || payRangeMin > 1000000)) {
              results.failed++;
              results.errors.push(`Row ${i + 1}: Invalid payRangeMin value`);
              continue;
            }
            if (payRangeMax !== null && (isNaN(payRangeMax) || payRangeMax < 0 || payRangeMax > 1000000)) {
              results.failed++;
              results.errors.push(`Row ${i + 1}: Invalid payRangeMax value`);
              continue;
            }

            // Parse schedule tags (limit to 10 tags)
            const scheduleTags = row.scheduleTags
              ? row.scheduleTags.split(",").map((t: string) => t.trim().slice(0, 50)).filter(Boolean).slice(0, 10)
              : null;

            const description = row.description?.slice(0, 5000) || null;

            await storage.createJob({
              tenantId,
              title,
              role,
              description,
              jobType: jobTypeInput as "FULL_TIME" | "PART_TIME",
              locationId,
              payRangeMin,
              payRangeMax,
              scheduleTags,
              status: "DRAFT",
            });

            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        }

        res.json(results);
      } catch (error) {
        console.error("Error importing jobs:", error);
        res.status(500).json({ error: "Failed to import jobs" });
      }
    }
  );

  // ============ APPLICATION ROUTES ============

  app.get("/api/applications", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const apps = await storage.getApplicationsByTenant(tenantId);
      
      // Get job info for each application
      const appsWithJobs = await Promise.all(
        apps.map(async (app) => {
          const job = await storage.getJob(app.jobId);
          return { ...app, job };
        })
      );
      
      res.json(appsWithJobs);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.patch(
    "/api/applications/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "REVIEWER"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const app = await storage.updateApplication(id, req.body);
        res.json(app);
      } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ error: "Failed to update application" });
      }
    }
  );

  // ============ GIG ROUTES ============

  // Public gig board
  app.get("/api/gigs/public", async (req, res) => {
    try {
      const gigs = await storage.getPublicGigPosts();
      
      // Get location and tenant info
      const gigsWithInfo = await Promise.all(
        gigs.map(async (gig) => {
          const location = gig.locationId ? await storage.getLocation(gig.locationId) : undefined;
          const tenant = await storage.getTenant(gig.tenantId);
          return { ...gig, location, tenant };
        })
      );
      
      res.json(gigsWithInfo);
    } catch (error) {
      console.error("Error fetching public gigs:", error);
      res.status(500).json({ error: "Failed to fetch gigs" });
    }
  });

  app.get("/api/gigs", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const gigs = await storage.getGigPostsByTenant(tenantId);
      
      // Get location info and assignment count
      const gigsWithInfo = await Promise.all(
        gigs.map(async (gig) => {
          const location = gig.locationId ? await storage.getLocation(gig.locationId) : undefined;
          const assignments = await storage.getGigAssignmentsByGig(gig.id);
          return { ...gig, location, _count: { assignments: assignments.length } };
        })
      );
      
      res.json(gigsWithInfo);
    } catch (error) {
      console.error("Error fetching gigs:", error);
      res.status(500).json({ error: "Failed to fetch gigs" });
    }
  });

  app.post(
    "/api/gigs",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const gig = await storage.createGigPost({ ...req.body, tenantId });
        res.json(gig);
      } catch (error) {
        console.error("Error creating gig:", error);
        res.status(500).json({ error: "Failed to create gig" });
      }
    }
  );

  app.patch(
    "/api/gigs/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const gig = await storage.updateGigPost(id, req.body);
        res.json(gig);
      } catch (error) {
        console.error("Error updating gig:", error);
        res.status(500).json({ error: "Failed to update gig" });
      }
    }
  );

  app.delete(
    "/api/gigs/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteGigPost(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting gig:", error);
        res.status(500).json({ error: "Failed to delete gig" });
      }
    }
  );

  // ============ INTERVIEW ROUTES ============

  app.get("/api/interviews/templates", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const templates = await storage.getInterviewTemplatesByTenant(tenantId);
      
      // Get questions for each template
      const templatesWithQuestions = await Promise.all(
        templates.map(async (template) => {
          const questions = await storage.getQuestionsByTemplate(template.id);
          return { ...template, questions };
        })
      );
      
      res.json(templatesWithQuestions);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post(
    "/api/interviews/templates",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const template = await storage.createInterviewTemplate({ ...req.body, tenantId });
        res.json(template);
      } catch (error) {
        console.error("Error creating template:", error);
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  );

  app.delete(
    "/api/interviews/templates/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const { id } = req.params;
        await storage.deleteInterviewTemplate(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting template:", error);
        res.status(500).json({ error: "Failed to delete template" });
      }
    }
  );

  app.post(
    "/api/interviews/questions",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const question = await storage.createInterviewQuestion({ ...req.body, tenantId });
        res.json(question);
      } catch (error) {
        console.error("Error creating question:", error);
        res.status(500).json({ error: "Failed to create question" });
      }
    }
  );

  app.get("/api/interviews/invites", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const invites = await storage.getInterviewInvitesByTenant(tenantId);
      
      // Get template info and response counts
      const invitesWithTemplates = await Promise.all(
        invites.map(async (invite) => {
          const template = await storage.getInterviewTemplate(invite.templateId);
          const questions = await storage.getQuestionsByTemplate(invite.templateId);
          const responses = await storage.getInterviewResponsesByInvite(invite.id);
          return { 
            ...invite, 
            template,
            questionCount: questions.length,
            responseCount: responses.length,
          };
        })
      );
      
      res.json(invitesWithTemplates);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  // Create interview invite with token
  app.post(
    "/api/interviews/invites",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const { templateId, applicationId, workerUserId, candidateName, candidateEmail, deadlineAt } = req.body;
        
        if (!templateId) {
          return res.status(400).json({ error: "Template ID is required" });
        }
        
        // Generate secure invite token
        const inviteToken = randomBytes(32).toString("hex");
        
        const invite = await storage.createInterviewInvite({
          tenantId,
          templateId,
          applicationId: applicationId || null,
          workerUserId: workerUserId || null,
          inviteToken,
          candidateName: candidateName || null,
          candidateEmail: candidateEmail || null,
          deadlineAt: deadlineAt ? new Date(deadlineAt) : undefined,
        });
        
        res.json(invite);
      } catch (error) {
        console.error("Error creating invite:", error);
        res.status(500).json({ error: "Failed to create invite" });
      }
    }
  );

  // Get invite with responses (for review)
  app.get("/api/interviews/invites/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = req.params;
      const invite = await storage.getInterviewInvite(id);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      const tenantId = (req as any).tenantId;
      if (invite.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const template = await storage.getInterviewTemplate(invite.templateId);
      const questions = await storage.getQuestionsByTemplate(invite.templateId);
      const responses = await storage.getInterviewResponsesByInvite(invite.id);
      
      // Generate signed URLs for video responses
      const responsesWithUrls = await Promise.all(
        responses.map(async (response) => {
          if (response.type === "VIDEO" && response.videoPath) {
            try {
              const signedUrl = await objectStorageService.getObjectEntityReadURL(response.videoPath);
              return { ...response, videoPath: signedUrl };
            } catch (err) {
              console.error("Error generating signed URL:", err);
              return response;
            }
          }
          return response;
        })
      );
      
      res.json({
        ...invite,
        template,
        questions,
        responses: responsesWithUrls,
      });
    } catch (error) {
      console.error("Error fetching invite:", error);
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  // ============ PUBLIC INTERVIEW ROUTES (Candidate) ============
  
  // Get interview by token (public - for candidates)
  app.get("/api/public/interview/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "EXPIRED") {
        return res.status(410).json({ error: "This interview has expired" });
      }
      
      if (invite.deadlineAt && new Date(invite.deadlineAt) < new Date()) {
        await storage.updateInterviewInvite(invite.id, { status: "EXPIRED" });
        return res.status(410).json({ error: "This interview has expired" });
      }
      
      const template = await storage.getInterviewTemplate(invite.templateId);
      const questions = await storage.getQuestionsByTemplate(invite.templateId);
      const existingResponses = await storage.getInterviewResponsesByInvite(invite.id);
      
      // Get tenant for branding
      const tenant = await storage.getTenant(invite.tenantId);
      
      res.json({
        invite: {
          id: invite.id,
          status: invite.status,
          candidateName: invite.candidateName,
          deadlineAt: invite.deadlineAt,
        },
        template: {
          id: template?.id,
          name: template?.name,
          role: template?.role,
        },
        questions: questions.map(q => ({
          id: q.id,
          promptText: q.promptText,
          responseType: q.responseType,
          timeLimitSeconds: q.timeLimitSeconds,
          maxRetakes: q.maxRetakes,
          sortOrder: q.sortOrder,
        })),
        existingResponses: existingResponses.map(r => ({
          questionId: r.questionId,
          type: r.type,
          hasVideo: !!r.videoPath,
          hasText: !!r.text,
        })),
        organization: tenant?.name || "Hiring Company",
      });
    } catch (error) {
      console.error("Error fetching public interview:", error);
      res.status(500).json({ error: "Failed to fetch interview" });
    }
  });
  
  // Start interview (update status to IN_PROGRESS)
  app.post("/api/public/interview/:token/start", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "PENDING") {
        await storage.updateInterviewInvite(invite.id, { status: "IN_PROGRESS" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error starting interview:", error);
      res.status(500).json({ error: "Failed to start interview" });
    }
  });
  
  // Get upload URL for video response
  app.post("/api/public/interview/:token/upload-url", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "COMPLETED" || invite.status === "EXPIRED") {
        return res.status(400).json({ error: "Cannot upload to a completed or expired interview" });
      }
      
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  
  // Submit response to a question
  app.post("/api/public/interview/:token/respond", async (req, res) => {
    try {
      const { token } = req.params;
      const { questionId, type, videoPath, text } = req.body;
      
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "COMPLETED" || invite.status === "EXPIRED") {
        return res.status(400).json({ error: "Cannot respond to a completed or expired interview" });
      }
      
      // Check if response already exists
      const existing = await storage.getInterviewResponse(invite.id, questionId);
      
      let response;
      if (existing) {
        response = await storage.updateInterviewResponse(existing.id, {
          type,
          videoPath,
          text,
        });
      } else {
        response = await storage.createInterviewResponse({
          tenantId: invite.tenantId,
          inviteId: invite.id,
          questionId,
          type,
          videoPath,
          text,
        });
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error submitting response:", error);
      res.status(500).json({ error: "Failed to submit response" });
    }
  });
  
  // Complete interview
  app.post("/api/public/interview/:token/complete", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      await storage.updateInterviewInvite(invite.id, {
        status: "COMPLETED",
        completedAt: new Date(),
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing interview:", error);
      res.status(500).json({ error: "Failed to complete interview" });
    }
  });

  // ============ PUBLIC JOB ROUTES (Job Seeker) ============

  // Get all published jobs (public - no auth required)
  app.get("/api/jobs/public", async (req, res) => {
    try {
      const jobsList = await storage.getPublishedJobs();
      
      // Get location and tenant info for each job
      const jobsWithInfo = await Promise.all(
        jobsList.map(async (job) => {
          const location = job.locationId ? await storage.getLocation(job.locationId) : null;
          const tenant = await storage.getTenant(job.tenantId);
          return { ...job, location, tenant };
        })
      );
      
      res.json(jobsWithInfo);
    } catch (error) {
      console.error("Error fetching public jobs:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get single public job details
  app.get("/api/jobs/public/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.getJob(id);
      
      if (!job || job.status !== "PUBLISHED") {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const location = job.locationId ? await storage.getLocation(job.locationId) : null;
      const tenant = await storage.getTenant(job.tenantId);
      
      res.json({ ...job, location, tenant });
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // ============ JOB SEEKER PROFILE ROUTES ============

  // Get current user's profile
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const profile = await storage.getWorkerProfile(userId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Create worker profile
  app.post("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const profile = await storage.createWorkerProfile({ ...req.body, userId });
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  // Update worker profile
  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const profile = await storage.updateWorkerProfile(userId, req.body);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ============ JOB SEEKER APPLICATION ROUTES ============

  // Get current user's applications
  app.get("/api/applications/mine", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const apps = await storage.getApplicationsByWorker(userId);
      
      // Get job and tenant info
      const appsWithJobs = await Promise.all(
        apps.map(async (app) => {
          const job = await storage.getJob(app.jobId);
          const tenant = job ? await storage.getTenant(job.tenantId) : null;
          return { ...app, job: job ? { ...job, tenant } : null };
        })
      );
      
      res.json(appsWithJobs);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // Apply to a job
  app.post("/api/applications/apply", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { jobId, coverLetter, resumeUrl } = req.body;
      if (!jobId) return res.status(400).json({ error: "Job ID required" });

      // Get the job to find tenant
      const job = await storage.getJob(jobId);
      if (!job || job.status !== "PUBLISHED") {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if already applied
      const existingApps = await storage.getApplicationsByWorker(userId);
      if (existingApps.some(app => app.jobId === jobId)) {
        return res.status(400).json({ error: "Already applied to this job" });
      }

      const application = await storage.createApplication({
        tenantId: job.tenantId,
        jobId,
        workerUserId: userId,
        coverLetter,
        resumeUrl,
        stage: "APPLIED",
      });

      res.json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ error: "Failed to apply" });
    }
  });

  // ============ SAVED JOBS ROUTES ============

  // Get user's saved jobs
  app.get("/api/saved-jobs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const savedJobs = await storage.getSavedJobsByUser(userId);
      
      // Get job details
      const jobsWithDetails = await Promise.all(
        savedJobs.map(async (saved) => {
          const job = await storage.getJob(saved.jobId);
          if (!job) return null;
          const location = job.locationId ? await storage.getLocation(job.locationId) : null;
          const tenant = await storage.getTenant(job.tenantId);
          return { ...saved, job: { ...job, location, tenant } };
        })
      );
      
      res.json(jobsWithDetails.filter(Boolean));
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
      res.status(500).json({ error: "Failed to fetch saved jobs" });
    }
  });

  // Save a job
  app.post("/api/saved-jobs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ error: "Job ID required" });

      const saved = await storage.saveJob({ userId, jobId });
      res.json(saved);
    } catch (error) {
      console.error("Error saving job:", error);
      res.status(500).json({ error: "Failed to save job" });
    }
  });

  // Remove saved job
  app.delete("/api/saved-jobs/:jobId", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { jobId } = req.params;
      await storage.unsaveJob(userId, jobId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing saved job:", error);
      res.status(500).json({ error: "Failed to remove saved job" });
    }
  });

  // ============ INTEGRATION CONNECTIONS ROUTES ============

  // Get integration connections for tenant
  app.get("/api/integrations", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const connections = await storage.getIntegrationConnectionsByTenant(tenantId);
      // Mask credentials before sending
      const masked = connections.map(conn => ({
        ...conn,
        credentialsEncryptedJson: conn.credentialsEncryptedJson ? "********" : null,
      }));
      res.json(masked);
    } catch (error) {
      console.error("Error fetching integrations:", error);
      res.status(500).json({ error: "Failed to fetch integrations" });
    }
  });

  // Create integration connection
  app.post("/api/integrations", isAuthenticated, requireTenant, requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { provider, credentials } = req.body;

      if (!provider) {
        return res.status(400).json({ error: "Provider required" });
      }

      // Store credentials as JSON (in production would encrypt)
      const connection = await storage.createIntegrationConnection({
        tenantId,
        provider,
        credentialsEncryptedJson: credentials ? JSON.stringify(credentials) : null,
        status: "active",
      });

      res.json({
        ...connection,
        credentialsEncryptedJson: "********",
      });
    } catch (error) {
      console.error("Error creating integration:", error);
      res.status(500).json({ error: "Failed to create integration" });
    }
  });

  // Update integration connection
  app.patch("/api/integrations/:id", isAuthenticated, requireTenant, requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      const { credentials, status } = req.body;

      const updateData: any = {};
      if (credentials !== undefined) {
        updateData.credentialsEncryptedJson = credentials ? JSON.stringify(credentials) : null;
      }
      if (status !== undefined) {
        updateData.status = status;
      }

      const connection = await storage.updateIntegrationConnection(id, updateData);
      if (!connection) {
        return res.status(404).json({ error: "Integration not found" });
      }

      res.json({
        ...connection,
        credentialsEncryptedJson: connection.credentialsEncryptedJson ? "********" : null,
      });
    } catch (error) {
      console.error("Error updating integration:", error);
      res.status(500).json({ error: "Failed to update integration" });
    }
  });

  // Delete integration connection
  app.delete("/api/integrations/:id", isAuthenticated, requireTenant, requireRole("OWNER", "ADMIN"), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIntegrationConnection(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting integration:", error);
      res.status(500).json({ error: "Failed to delete integration" });
    }
  });

  // ============ JOB DISTRIBUTION ROUTES ============

  // Get distribution channels for a job
  app.get("/api/jobs/:jobId/distribution", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { jobId } = req.params;
      
      // Verify job belongs to tenant
      const job = await storage.getJob(jobId as string);
      if (!job || job.tenantId !== tenantId) {
        return res.status(404).json({ error: "Job not found" });
      }
      
      const channels = await storage.getDistributionChannelsByJob(jobId as string);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching distribution channels:", error);
      res.status(500).json({ error: "Failed to fetch distribution channels" });
    }
  });

  // Create or update distribution for a job (post to job board)
  app.post("/api/jobs/:jobId/distribute", isAuthenticated, requireTenant, requireRole("OWNER", "ADMIN", "HIRING_MANAGER"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { jobId } = req.params;
      const { provider } = req.body;

      if (!provider) {
        return res.status(400).json({ error: "Provider required" });
      }

      // Check if integration exists
      const connections = await storage.getIntegrationConnectionsByTenant(tenantId);
      const connection = connections.find(c => c.provider === provider && c.status === "active");

      if (!connection) {
        return res.status(400).json({ error: `No active ${provider} integration found. Configure it in Settings first.` });
      }

      // Get job details and verify tenant ownership
      const job = await storage.getJob(jobId as string);
      if (!job || job.tenantId !== tenantId) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Check if already distributed to this provider
      const existingChannels = await storage.getDistributionChannelsByJob(jobId);
      const existingChannel = existingChannels.find(c => c.provider === provider);

      if (existingChannel) {
        // Update existing channel
        const updated = await storage.updateDistributionChannel(existingChannel.id, {
          status: "ACTIVE",
          postedAt: new Date(),
          lastError: null,
        });
        return res.json(updated);
      }

      // Create new distribution channel
      // In production, this would call the actual job board API
      // For now, we simulate a successful post
      const externalJobId = `${provider.toLowerCase()}-${job.id}-${Date.now()}`;

      const channel = await storage.createDistributionChannel({
        tenantId,
        jobId,
        provider,
        externalJobId,
        status: "ACTIVE",
        postedAt: new Date(),
      });

      res.json(channel);
    } catch (error) {
      console.error("Error distributing job:", error);
      res.status(500).json({ error: "Failed to distribute job" });
    }
  });

  // Pause/unpause distribution
  app.patch("/api/jobs/:jobId/distribution/:channelId", isAuthenticated, requireTenant, requireRole("OWNER", "ADMIN", "HIRING_MANAGER"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { jobId, channelId } = req.params;
      const { status } = req.body;

      // Verify job belongs to tenant
      const job = await storage.getJob(jobId as string);
      if (!job || job.tenantId !== tenantId) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (!["ACTIVE", "PAUSED", "CLOSED"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const channel = await storage.updateDistributionChannel(channelId as string, { status });
      if (!channel) {
        return res.status(404).json({ error: "Distribution channel not found" });
      }

      res.json(channel);
    } catch (error) {
      console.error("Error updating distribution:", error);
      res.status(500).json({ error: "Failed to update distribution" });
    }
  });

  // Remove distribution (take down from job board)
  app.delete("/api/jobs/:jobId/distribution/:channelId", isAuthenticated, requireTenant, requireRole("OWNER", "ADMIN", "HIRING_MANAGER"), async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { jobId, channelId } = req.params;

      // Verify job belongs to tenant
      const job = await storage.getJob(jobId as string);
      if (!job || job.tenantId !== tenantId) {
        return res.status(404).json({ error: "Job not found" });
      }

      // In production, would call job board API to remove the posting
      await storage.deleteDistributionChannel(channelId as string);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing distribution:", error);
      res.status(500).json({ error: "Failed to remove distribution" });
    }
  });

  // ============ USER TYPE / ONBOARDING ROUTES ============

  // Get user profile (type: employer or job seeker)
  app.get("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const userProfile = await storage.getUserProfile(userId);
      res.json(userProfile || null);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Super admin emails - these users automatically get super admin access
  // Configure via SUPER_ADMIN_EMAILS environment variable (comma-separated)
  const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Set user type (employer or job seeker)
  app.post("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const claims = getUserClaims(req);
      const email = claims.email;
      const firstName = claims.first_name;
      const lastName = claims.last_name;

      // Auto-grant super admin for designated emails
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email?.toLowerCase() || "");

      const userProfile = await storage.createUserProfile({
        userId,
        email,
        firstName,
        lastName,
        isSuperAdmin,
        ...req.body,
      });

      res.json(userProfile);
    } catch (error) {
      console.error("Error creating user profile:", error);
      res.status(500).json({ error: "Failed to create user profile" });
    }
  });

  // ============ SUPER ADMIN ROUTES ============

  // Middleware to require super admin
  async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userProfile = await storage.getUserProfile(userId);
    if (!userProfile?.isSuperAdmin) {
      return res.status(403).json({ error: "Super admin access required" });
    }

    next();
  }

  // Check if current user is super admin
  app.get("/api/admin/check", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const userProfile = await storage.getUserProfile(userId);
      res.json({ isSuperAdmin: userProfile?.isSuperAdmin || false });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ error: "Failed to check admin status" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Get all tenants (organizations)
  app.get("/api/admin/tenants", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      res.json(allTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Update tenant (e.g., plan type, suspend)
  app.patch("/api/admin/tenants/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const tenant = await storage.updateTenant(id, req.body);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // Get all users
  app.get("/api/admin/users", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUserProfiles();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Update user (e.g., grant/revoke super admin)
  app.patch("/api/admin/users/:userId", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const userProfile = await storage.updateUserProfile(userId, req.body);
      if (!userProfile) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(userProfile);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // ============ BILLING ROUTES ============

  // Get Stripe publishable key
  app.get("/api/billing/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Failed to get billing config" });
    }
  });

  // Get subscription plans
  app.get("/api/billing/plans", async (req, res) => {
    try {
      const products = await stripeService.listProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of products) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unitAmount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
          });
        }
      }

      res.json({ plans: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/billing/checkout", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const billingInfo = await storage.getTenantBilling(tenantId);
      let customerId = billingInfo?.stripeCustomerId;

      if (!customerId) {
        const claims = getUserClaims(req);
        const customer = await stripeService.createCustomer(
          claims.email || "",
          tenantId,
          tenant.name
        );
        await storage.createTenantBilling({
          tenantId,
          stripeCustomerId: customer.id,
        });
        customerId = customer.id;
      }

      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${req.protocol}://${req.get('host')}/app/settings?tab=billing&success=true`,
        `${req.protocol}://${req.get('host')}/app/settings?tab=billing&canceled=true`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Get tenant billing status
  app.get("/api/billing/status", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const billing = await storage.getTenantBilling(tenantId);

      if (!billing || !billing.stripeSubscriptionId) {
        return res.json({ status: null, subscription: null });
      }

      const subscription = await stripeService.getSubscription(billing.stripeSubscriptionId);
      res.json({ 
        status: billing.subscriptionStatus,
        subscription,
        currentPeriodEnd: billing.currentPeriodEnd,
      });
    } catch (error) {
      console.error("Error fetching billing status:", error);
      res.status(500).json({ error: "Failed to fetch billing status" });
    }
  });

  // Create customer portal session
  app.post("/api/billing/portal", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const billing = await storage.getTenantBilling(tenantId);

      if (!billing?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const session = await stripeService.createCustomerPortalSession(
        billing.stripeCustomerId,
        `${req.protocol}://${req.get('host')}/app/settings?tab=billing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // ============ WORKER PAYOUT ROUTES ============

  // Get worker payout account status
  app.get("/api/worker/payout-account", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const account = await storage.getWorkerPayoutAccount(userId);
      res.json(account || null);
    } catch (error) {
      console.error("Error fetching payout account:", error);
      res.status(500).json({ error: "Failed to fetch payout account" });
    }
  });

  // Create Connect onboarding link
  app.post("/api/worker/payout-account/onboard", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const claims = getUserClaims(req);
      let account = await storage.getWorkerPayoutAccount(userId);

      if (!account) {
        const stripeAccount = await stripeService.createConnectAccount(
          claims.email || "",
          userId
        );
        account = await storage.createWorkerPayoutAccount({
          userId,
          stripeAccountId: stripeAccount.id,
          email: claims.email,
        });
      }

      const accountLink = await stripeService.createConnectAccountLink(
        account.stripeAccountId!,
        `${req.protocol}://${req.get('host')}/seeker?refresh=true`,
        `${req.protocol}://${req.get('host')}/seeker?onboarded=true`
      );

      res.json({ url: accountLink.url });
    } catch (error) {
      console.error("Error creating onboarding link:", error);
      res.status(500).json({ error: "Failed to create onboarding link" });
    }
  });

  return httpServer;
}
