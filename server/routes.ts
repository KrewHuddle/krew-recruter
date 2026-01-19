import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

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

  const userId = req.user?.claims?.sub;
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
  // Setup auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // ============ TENANT ROUTES ============

  // Get user's tenant memberships
  app.get("/api/tenants/memberships", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
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
      
      // Get location info for each job
      const jobsWithLocations = await Promise.all(
        jobList.map(async (job) => {
          const location = job.locationId ? await storage.getLocation(job.locationId) : undefined;
          const apps = await storage.getApplicationsByJob(job.id);
          return { ...job, location, _count: { applications: apps.length } };
        })
      );
      
      res.json(jobsWithLocations);
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
      
      // Get template info
      const invitesWithTemplates = await Promise.all(
        invites.map(async (invite) => {
          const template = await storage.getInterviewTemplate(invite.templateId);
          return { ...invite, template };
        })
      );
      
      res.json(invitesWithTemplates);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  return httpServer;
}
