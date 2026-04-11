import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupCustomAuth, isAuthenticated, getUserId as getCustomUserId, getUserClaims as getCustomUserClaims } from "./customAuth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { stripeService } from "./stripeService";
import { getStripePublishableKey, getStripeClient } from "./stripeUtils";
import { adzunaService } from "./services/adzuna";
import { upsertToTalentPool, recordTalentApplication, geocodeAddress, getSmartRadius } from "./services/talent-pool";
import { requirePlan } from "./middleware/requirePlan";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";

// Single ObjectStorageService instance reused by every route that touches
// uploaded files (interview videos, generated ad images). The class has an
// empty constructor with no side effects, so module-level instantiation is
// safe. Previously this was referenced as a bare `objectStorageService`
// identifier without ever being declared, producing 6 "Cannot find name"
// errors at lines 1586, 1693, 2088, 2089, 2375, 2376.
const objectStorageService = new ObjectStorageService();
import { db } from "./db";
import {
  organizations, campaigns, jobs, applications, interviewInvites,
  campaignSpend, paymentHistory, aggregatedJobs, announcements,
  auditEvents,
} from "@shared/schema";
import { eq, desc, sql, sum, count, and } from "drizzle-orm";

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

  // Setup campaign engine routes (JWT-based)
  const { default: campaignRouter } = await import("./campaignRoutes");
  const { registerHandler, loginHandler, meHandler, logoutHandler, requireAuth, requireOrg } = await import("./jwtAuth");
  app.post("/api/v2/auth/register", registerHandler);
  app.post("/api/v2/auth/login", loginHandler);
  app.get("/api/v2/auth/me", requireAuth, meHandler);

  // Aliases so frontend can use /api/auth/* uniformly
  app.post("/api/auth/register", registerHandler);
  app.post("/api/auth/login", loginHandler);
  app.get("/api/auth/me", requireAuth, meHandler);
  app.post("/api/auth/logout", logoutHandler);

  app.use("/api", campaignRouter);

  // ============ SEO ROUTES ============

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /campaign
Disallow: /app
Disallow: /seeker
Sitemap: https://krewrecruiter.com/sitemap.xml`
    );
  });

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const staticPages = [
        { loc: "/", priority: "1.0", freq: "weekly" },
        { loc: "/jobs", priority: "0.9", freq: "daily" },
        { loc: "/pricing", priority: "0.8", freq: "monthly" },
        { loc: "/workers/signup", priority: "0.8", freq: "monthly" },
        { loc: "/login", priority: "0.5", freq: "monthly" },
        { loc: "/privacy", priority: "0.3", freq: "yearly" },
        { loc: "/terms", priority: "0.3", freq: "yearly" },
      ];

      const locations = [
        "charlotte-nc", "new-york-ny", "los-angeles-ca", "chicago-il",
        "houston-tx", "miami-fl", "atlanta-ga", "nashville-tn",
        "las-vegas-nv", "seattle-wa", "portland-or", "denver-co",
        "san-francisco-ca", "austin-tx", "dallas-tx", "boston-ma",
        "philadelphia-pa", "phoenix-az", "san-diego-ca", "tampa-fl",
        "orlando-fl", "raleigh-nc", "new-orleans-la", "minneapolis-mn",
        "kansas-city-mo", "indianapolis-in", "columbus-oh", "san-antonio-tx",
        "jacksonville-fl", "fort-worth-tx", "waxhaw-nc",
      ];

      const roles = [
        "line-cook", "bartender", "server", "chef", "sous-chef",
        "executive-chef", "dishwasher", "host-hostess", "food-runner",
        "barback", "prep-cook", "restaurant-manager", "general-manager",
        "catering-staff", "hotel-front-desk", "barista", "busser",
      ];

      // Fetch active aggregated jobs for dynamic pages
      let jobUrls: string[] = [];
      try {
        const activeJobs = await db
          .select({ id: aggregatedJobs.id })
          .from(aggregatedJobs)
          .where(eq(aggregatedJobs.isActive, true))
          .limit(1000);
        jobUrls = activeJobs.map(j => `/jobs/${j.id}`);
      } catch {}

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
      for (const page of staticPages) {
        xml += `  <url>
    <loc>https://krewrecruiter.com${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }

      for (const loc of locations) {
        xml += `  <url>
    <loc>https://krewrecruiter.com/jobs/location/${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }

      for (const role of roles) {
        xml += `  <url>
    <loc>https://krewrecruiter.com/jobs/role/${role}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }

      for (const jobUrl of jobUrls) {
        xml += `  <url>
    <loc>https://krewrecruiter.com${jobUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }

      xml += `</urlset>`;

      res.type("application/xml").send(xml);
    } catch (error) {
      console.error("Sitemap error:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

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
        const { tenantId } = (req.params as Record<string, string>);
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
        const { tenantId } = (req.params as Record<string, string>);
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
    requirePlan("STARTER", "PRO", "ENTERPRISE"),
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
        const { id } = (req.params as Record<string, string>);
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
        const { id } = (req.params as Record<string, string>);
        await storage.deleteLocation(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting location:", error);
        res.status(500).json({ error: "Failed to delete location" });
      }
    }
  );

  // ============ PUBLIC JOB FEED (no auth — must be BEFORE /api/jobs/:id) ============

  app.get("/api/jobs/public", async (req, res) => {
    try {
      const { city, state, q, page = "1", limit = "20" } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 50);
      const offset = (pageNum - 1) * limitNum;

      const results = await db
        .select()
        .from(aggregatedJobs)
        .where(eq(aggregatedJobs.isActive, true))
        .orderBy(desc(aggregatedJobs.postedAt))
        .limit(limitNum)
        .offset(offset);

      let filtered = results;
      if (city) {
        const cityLower = (city as string).toLowerCase();
        filtered = filtered.filter(j => j.city?.toLowerCase().includes(cityLower));
      }
      if (state) {
        const stateLower = (state as string).toLowerCase();
        filtered = filtered.filter(j => j.state?.toLowerCase().includes(stateLower));
      }
      if (q) {
        const qLower = (q as string).toLowerCase();
        filtered = filtered.filter(
          j => j.title?.toLowerCase().includes(qLower) || j.company?.toLowerCase().includes(qLower)
        );
      }

      res.json({ jobs: filtered, page: pageNum, hasMore: results.length === limitNum });
    } catch (error) {
      console.error("Public jobs error:", error);
      res.json({ jobs: [] });
    }
  });

  app.get("/api/jobs/public/:id", async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const [job] = await db.select().from(aggregatedJobs).where(eq(aggregatedJobs.id, id as string));
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

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
      const { id } = (req.params as Record<string, string>);
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
        const { id } = (req.params as Record<string, string>);
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
        const { id } = (req.params as Record<string, string>);
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

  // ============ EXTERNAL JOB BOARD IMPORT ============

  // Cache for external job board data (simple in-memory cache)
  let arbeitnowCache: { data: any[]; timestamp: number } | null = null;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Fetch jobs from Arbeitnow (free API, no key required)
  app.get("/api/external-jobs", isAuthenticated, async (req, res) => {
    try {
      const { search, page = "1" } = req.query;
      const pageNum = parseInt(page as string, 10) || 1;

      // Check cache first
      const now = Date.now();
      if (arbeitnowCache && (now - arbeitnowCache.timestamp) < CACHE_TTL) {
        let jobs = arbeitnowCache.data;
        
        // Apply search filter
        if (search && typeof search === "string") {
          const searchLower = search.toLowerCase();
          jobs = jobs.filter((job: any) =>
            job.title?.toLowerCase().includes(searchLower) ||
            job.company_name?.toLowerCase().includes(searchLower) ||
            job.description?.toLowerCase().includes(searchLower)
          );
        }

        // Paginate (20 per page)
        const start = (pageNum - 1) * 20;
        const paginatedJobs = jobs.slice(start, start + 20);

        return res.json({
          jobs: paginatedJobs,
          totalJobs: jobs.length,
          page: pageNum,
          totalPages: Math.ceil(jobs.length / 20),
          source: "arbeitnow",
          cached: true,
        });
      }

      // Fetch from Arbeitnow API
      const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Arbeitnow API returned ${response.status}`);
      }

      const apiData = await response.json();
      const allJobs = apiData.data || [];

      // Cache the results
      arbeitnowCache = { data: allJobs, timestamp: now };

      let jobs = allJobs;

      // Apply search filter
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        jobs = jobs.filter((job: any) =>
          job.title?.toLowerCase().includes(searchLower) ||
          job.company_name?.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower)
        );
      }

      // Paginate (20 per page)
      const start = (pageNum - 1) * 20;
      const paginatedJobs = jobs.slice(start, start + 20);

      res.json({
        jobs: paginatedJobs,
        totalJobs: jobs.length,
        page: pageNum,
        totalPages: Math.ceil(jobs.length / 20),
        source: "arbeitnow",
        cached: false,
      });
    } catch (error) {
      console.error("Error fetching external jobs:", error);
      res.status(500).json({ error: "Failed to fetch external jobs" });
    }
  });

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
        const { id } = (req.params as Record<string, string>);
        const app = await storage.updateApplication(id, req.body);
        res.json(app);
      } catch (error) {
        console.error("Error updating application:", error);
        res.status(500).json({ error: "Failed to update application" });
      }
    }
  );

  // ============ EXTERNAL JOBS (ADZUNA) ROUTES ============

  // Check if Adzuna is configured
  app.get("/api/external-jobs/status", async (req, res) => {
    res.json({ 
      configured: adzunaService.isConfigured(),
      source: "adzuna" 
    });
  });

  // Search external jobs (public endpoint for job seekers)
  app.get("/api/external-jobs", async (req, res) => {
    try {
      const { query, location, page, limit } = req.query;
      
      const result = await adzunaService.searchJobs({
        query: (query as string) || "restaurant hospitality",
        location: location as string,
        page: parseInt(page as string) || 1,
        resultsPerPage: parseInt(limit as string) || 20,
      });
      
      res.json({
        jobs: result.jobs,
        totalCount: result.totalCount,
        page: parseInt(page as string) || 1,
        source: "adzuna",
        configured: adzunaService.isConfigured(),
      });
    } catch (error) {
      console.error("Error fetching external jobs:", error);
      res.status(500).json({ error: "Failed to fetch external jobs" });
    }
  });

  // Clear Adzuna cache (admin only)
  app.post(
    "/api/external-jobs/refresh",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      adzunaService.clearCache();
      res.json({ success: true, message: "External jobs cache cleared" });
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

  // Get single gig by ID
  app.get("/api/gigs/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const tenantId = (req as any).tenantId;
      const gig = await storage.getGigPost(id);
      
      if (!gig) {
        return res.status(404).json({ error: "Gig not found" });
      }
      
      // Enforce tenant ownership
      if (gig.tenantId !== tenantId) {
        return res.status(404).json({ error: "Gig not found" });
      }
      
      const location = gig.locationId ? await storage.getLocation(gig.locationId) : undefined;
      res.json({ ...gig, location });
    } catch (error) {
      console.error("Error fetching gig:", error);
      res.status(500).json({ error: "Failed to fetch gig" });
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
        const { id } = (req.params as Record<string, string>);
        const tenantId = (req as any).tenantId;
        
        // Verify gig belongs to this tenant
        const existingGig = await storage.getGigPost(id);
        if (!existingGig || existingGig.tenantId !== tenantId) {
          return res.status(404).json({ error: "Gig not found" });
        }
        
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
        const { id } = (req.params as Record<string, string>);
        const tenantId = (req as any).tenantId;
        
        // Verify gig belongs to this tenant
        const existingGig = await storage.getGigPost(id);
        if (!existingGig || existingGig.tenantId !== tenantId) {
          return res.status(404).json({ error: "Gig not found" });
        }
        
        await storage.deleteGigPost(id);
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting gig:", error);
        res.status(500).json({ error: "Failed to delete gig" });
      }
    }
  );

  // Get gig applicants (employer view)
  app.get(
    "/api/gigs/:id/applicants",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER"),
    async (req, res) => {
      try {
        const { id } = (req.params as Record<string, string>);
        const tenantId = (req as any).tenantId;
        
        // Verify gig belongs to this tenant
        const gig = await storage.getGigPost(id);
        if (!gig || gig.tenantId !== tenantId) {
          return res.status(404).json({ error: "Gig not found" });
        }
        
        const assignments = await storage.getGigAssignmentsByGig(id);
        
        // Get worker profiles for each assignment
        const applicantsWithProfiles = await Promise.all(
          assignments.map(async (assignment) => {
            const workerProfile = await storage.getWorkerProfile(assignment.workerUserId);
            const userProfile = await storage.getUserProfile(assignment.workerUserId);
            const avgRating = await storage.getAverageRatingForUser(assignment.workerUserId);
            return { 
              ...assignment, 
              workerProfile, 
              userProfile,
              avgRating: avgRating ? Number(avgRating).toFixed(1) : null
            };
          })
        );
        
        res.json(applicantsWithProfiles);
      } catch (error) {
        console.error("Error fetching gig applicants:", error);
        res.status(500).json({ error: "Failed to fetch applicants" });
      }
    }
  );

  // Worker applies to gig
  app.post("/api/gigs/:id/apply", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      // Verify user is a job seeker
      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile || userProfile.userType !== "JOB_SEEKER") {
        return res.status(403).json({ error: "Only job seekers can apply for gigs" });
      }
      
      const { id } = (req.params as Record<string, string>);
      const gig = await storage.getGigPost(id);
      
      if (!gig) {
        return res.status(404).json({ error: "Gig not found" });
      }
      
      if (gig.status !== "OPEN") {
        return res.status(400).json({ error: "Gig is not accepting applications" });
      }
      
      // Check if already applied (including cancelled - allow re-apply only if not cancelled)
      const existing = await storage.getGigAssignmentByGigAndWorker(id, userId);
      if (existing && existing.status !== "CANCELLED") {
        return res.status(400).json({ error: "Already applied to this gig" });
      }
      
      // If previously cancelled, update status instead of creating new
      if (existing && existing.status === "CANCELLED") {
        const assignment = await storage.updateGigAssignment(existing.id, { status: "PENDING" });
        return res.json(assignment);
      }
      
      // Create assignment with PENDING status
      const assignment = await storage.createGigAssignment({
        tenantId: gig.tenantId,
        gigPostId: id,
        workerUserId: userId,
        status: "PENDING",
      });
      
      res.json(assignment);
    } catch (error) {
      console.error("Error applying to gig:", error);
      res.status(500).json({ error: "Failed to apply to gig" });
    }
  });

  // Worker withdraws gig application
  app.delete("/api/gigs/:id/apply", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { id } = (req.params as Record<string, string>);
      const assignment = await storage.getGigAssignmentByGigAndWorker(id, userId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      if (assignment.status !== "PENDING") {
        return res.status(400).json({ error: "Cannot withdraw after being confirmed" });
      }
      
      await storage.updateGigAssignment(assignment.id, { status: "CANCELLED" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error withdrawing application:", error);
      res.status(500).json({ error: "Failed to withdraw application" });
    }
  });

  // Update gig assignment status (approve/reject/check-in/complete)
  app.patch(
    "/api/gigs/assignments/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER"),
    async (req, res) => {
      try {
        const { id } = (req.params as Record<string, string>);
        const { status } = req.body;
        const tenantId = (req as any).tenantId;
        
        const assignment = await storage.getGigAssignment(id);
        if (!assignment) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        
        // Verify assignment belongs to this tenant
        if (assignment.tenantId !== tenantId) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        
        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          PENDING: ["CONFIRMED", "CANCELLED"],
          CONFIRMED: ["CHECKED_IN", "CANCELLED"],
          CHECKED_IN: ["COMPLETED", "NO_SHOW", "CANCELLED"],
        };
        
        if (validTransitions[assignment.status] && !validTransitions[assignment.status].includes(status)) {
          return res.status(400).json({ error: `Invalid status transition from ${assignment.status} to ${status}` });
        }
        
        const updated = await storage.updateGigAssignment(id, { status });
        res.json(updated);
      } catch (error) {
        console.error("Error updating assignment:", error);
        res.status(500).json({ error: "Failed to update assignment" });
      }
    }
  );

  // Mark gig assignment as completed and create payout
  app.post(
    "/api/gigs/assignments/:id/complete",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER"),
    async (req, res) => {
      try {
        const { id } = (req.params as Record<string, string>);
        const tenantId = (req as any).tenantId;
        const { hoursWorked } = req.body;
        
        const assignment = await storage.getGigAssignment(id);
        if (!assignment) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        
        // Verify assignment belongs to this tenant
        if (assignment.tenantId !== tenantId) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        
        // Validate status transition - only CONFIRMED or CHECKED_IN can be completed
        if (!["CONFIRMED", "CHECKED_IN"].includes(assignment.status)) {
          return res.status(400).json({ error: `Cannot complete gig from ${assignment.status} status` });
        }
        
        const gig = await storage.getGigPost(assignment.gigPostId);
        if (!gig) {
          return res.status(404).json({ error: "Gig not found" });
        }
        
        // Calculate payout based on hours worked and pay rate
        const hours = hoursWorked || ((new Date(gig.endAt).getTime() - new Date(gig.startAt).getTime()) / (1000 * 60 * 60));
        const amountCents = Math.round(gig.payRate * hours * 100);
        const platformFeeCents = Math.round(amountCents * 0.10); // 10% platform fee
        const netAmountCents = amountCents - platformFeeCents;
        
        // Update assignment to completed
        await storage.updateGigAssignment(id, { status: "COMPLETED" });
        
        // Create payout record
        const payout = await storage.createGigPayout({
          tenantId,
          gigAssignmentId: id,
          workerUserId: assignment.workerUserId,
          amountCents,
          platformFeeCents,
          netAmountCents,
          status: "PENDING",
        });
        
        res.json({ assignment: await storage.getGigAssignment(id), payout });
      } catch (error) {
        console.error("Error completing gig:", error);
        res.status(500).json({ error: "Failed to complete gig" });
      }
    }
  );

  // Rate completed gig
  app.post("/api/gigs/assignments/:id/rate", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const { id } = (req.params as Record<string, string>);
      const { rating, review, ratedUserId, raterType } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      
      if (!["EMPLOYER", "WORKER"].includes(raterType)) {
        return res.status(400).json({ error: "Invalid rater type" });
      }
      
      const assignment = await storage.getGigAssignment(id);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      if (assignment.status !== "COMPLETED") {
        return res.status(400).json({ error: "Can only rate completed gigs" });
      }
      
      // Verify the rater is authorized for this assignment
      if (raterType === "WORKER") {
        // Worker can only rate their own assignment
        if (assignment.workerUserId !== userId) {
          return res.status(403).json({ error: "Not authorized to rate this gig" });
        }
      } else {
        // Employer must be a member of the tenant that owns the assignment.
        // Note: storage.getMembership signature is (tenantId, userId) — the
        // previous getTenantMembership name was wrong AND the args were
        // passed in the wrong order. Both are corrected here.
        const membership = await storage.getMembership(assignment.tenantId, userId);
        if (!membership) {
          return res.status(403).json({ error: "Not authorized to rate this gig" });
        }
      }
      
      // Check if already rated
      const alreadyRated = await storage.hasUserRatedAssignment(id, userId);
      if (alreadyRated) {
        return res.status(400).json({ error: "Already rated this gig" });
      }
      
      const gigRating = await storage.createGigRating({
        gigAssignmentId: id,
        raterUserId: userId,
        ratedUserId,
        raterType,
        rating,
        review,
      });
      
      res.json(gigRating);
    } catch (error) {
      console.error("Error rating gig:", error);
      res.status(500).json({ error: "Failed to rate gig" });
    }
  });

  // Get ratings for a user
  app.get("/api/users/:userId/ratings", async (req, res) => {
    try {
      const { userId } = (req.params as Record<string, string>);
      const ratings = await storage.getGigRatingsByUser(userId);
      const avgRating = await storage.getAverageRatingForUser(userId);
      
      res.json({ ratings, avgRating: avgRating ? Number(avgRating).toFixed(1) : null });
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  // Worker's gig applications and history
  app.get("/api/worker/gigs", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const assignments = await storage.getGigAssignmentsByWorker(userId);
      
      // Get gig details for each assignment
      const gigsWithDetails = await Promise.all(
        assignments.map(async (assignment) => {
          const gig = await storage.getGigPost(assignment.gigPostId);
          const location = gig?.locationId ? await storage.getLocation(gig.locationId) : undefined;
          const tenant = gig ? await storage.getTenant(gig.tenantId) : undefined;
          const payout = await storage.getGigPayoutByAssignment(assignment.id);
          const ratings = await storage.getGigRatingsByAssignment(assignment.id);
          
          return { 
            ...assignment, 
            gig: gig ? { ...gig, location, tenant } : null,
            payout,
            ratings
          };
        })
      );
      
      res.json(gigsWithDetails);
    } catch (error) {
      console.error("Error fetching worker gigs:", error);
      res.status(500).json({ error: "Failed to fetch gigs" });
    }
  });

  // Worker's gig earnings summary
  app.get("/api/worker/earnings", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      
      const payouts = await storage.getGigPayoutsByWorker(userId);
      
      const totalEarnings = payouts
        .filter(p => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.netAmountCents, 0);
      
      const pendingEarnings = payouts
        .filter(p => p.status === "PENDING" || p.status === "PROCESSING")
        .reduce((sum, p) => sum + p.netAmountCents, 0);
      
      const completedGigs = payouts.filter(p => p.status === "COMPLETED").length;
      
      res.json({
        totalEarnings: totalEarnings / 100,
        pendingEarnings: pendingEarnings / 100,
        completedGigs,
        payouts: payouts.slice(0, 10), // Last 10 payouts
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ error: "Failed to fetch earnings" });
    }
  });

  // Employer payouts list
  app.get(
    "/api/payouts",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const payouts = await storage.getGigPayoutsByTenant(tenantId);
        
        // Get assignment and worker details
        const payoutsWithDetails = await Promise.all(
          payouts.map(async (payout) => {
            const assignment = await storage.getGigAssignment(payout.gigAssignmentId);
            const gig = assignment ? await storage.getGigPost(assignment.gigPostId) : null;
            const workerProfile = await storage.getWorkerProfile(payout.workerUserId);
            const userProfile = await storage.getUserProfile(payout.workerUserId);
            
            return { ...payout, assignment, gig, workerProfile, userProfile };
          })
        );
        
        res.json(payoutsWithDetails);
      } catch (error) {
        console.error("Error fetching payouts:", error);
        res.status(500).json({ error: "Failed to fetch payouts" });
      }
    }
  );

  // Process payout via Stripe Connect
  app.post(
    "/api/payouts/:id/process",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const userId = getUserId(req);
        const { id } = (req.params as Record<string, string>);
        
        const payout = await storage.getGigPayoutByAssignment(id);
        if (!payout) {
          // Check if id is the payout ID itself
          const payouts = await storage.getGigPayoutsByTenant((req as any).tenantId);
          const foundPayout = payouts.find(p => p.id === id);
          if (!foundPayout) {
            return res.status(404).json({ error: "Payout not found" });
          }
        }
        
        // Get worker's payout account
        const workerAccount = await storage.getWorkerPayoutAccount(payout?.workerUserId || "");
        if (!workerAccount || !workerAccount.stripeAccountId || !workerAccount.payoutsEnabled) {
          return res.status(400).json({ error: "Worker does not have a valid payout account" });
        }
        
        // Create Stripe transfer
        try {
          const transfer = await stripeService.createTransfer(
            payout!.netAmountCents,
            workerAccount.stripeAccountId,
            { gigAssignmentId: payout!.gigAssignmentId }
          );
          
          // Update payout with transfer ID
          await storage.updateGigPayout(payout!.id, {
            stripeTransferId: transfer.id,
            status: "COMPLETED",
            approvedByUserId: userId,
            approvedAt: new Date(),
            paidAt: new Date(),
          });
          
          res.json({ success: true, transferId: transfer.id });
        } catch (stripeError: any) {
          console.error("Stripe transfer failed:", stripeError);
          await storage.updateGigPayout(payout!.id, { status: "FAILED" });
          return res.status(500).json({ error: "Payment processing failed" });
        }
      } catch (error) {
        console.error("Error processing payout:", error);
        res.status(500).json({ error: "Failed to process payout" });
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
    requirePlan("PRO", "ENTERPRISE"),
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
        const { id } = (req.params as Record<string, string>);
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
      const { id } = (req.params as Record<string, string>);
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

  // Bulk invite candidates
  app.post(
    "/api/interviews/invites/bulk",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const { templateId, candidates } = req.body;
        
        // Validate input
        const bulkInviteSchema = z.object({
          templateId: z.string().uuid(),
          candidates: z.array(z.object({
            name: z.string().optional(),
            email: z.string().email(),
          })).min(1).max(100),
        });
        
        const validated = bulkInviteSchema.safeParse({ templateId, candidates });
        if (!validated.success) {
          return res.status(400).json({ error: "Invalid input: Template ID and valid candidate emails are required (max 100)" });
        }
        
        // Verify the template belongs to this tenant
        const template = await storage.getInterviewTemplate(templateId);
        if (!template || template.tenantId !== tenantId) {
          return res.status(403).json({ error: "Template not found or access denied" });
        }
        
        const createdInvites = [];
        
        for (const candidate of validated.data.candidates) {
          const inviteToken = randomBytes(32).toString("hex");
          
          const invite = await storage.createInterviewInvite({
            tenantId,
            templateId,
            inviteToken,
            candidateName: candidate.name || null,
            candidateEmail: candidate.email || null,
          });
          
          createdInvites.push(invite);
        }
        
        res.json({ created: createdInvites.length, invites: createdInvites });
      } catch (error) {
        console.error("Error creating bulk invites:", error);
        res.status(500).json({ error: "Failed to create bulk invites" });
      }
    }
  );

  // GDPR: Delete candidate interview data (complete deletion with audit trail)
  app.delete(
    "/api/interviews/invites/:inviteId/gdpr",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { inviteId } = (req.params as Record<string, string>);
        
        // Verify the invite belongs to this tenant
        const invite = await storage.getInterviewInvite(inviteId);
        if (!invite || invite.tenantId !== tenantId) {
          return res.status(404).json({ error: "Interview invite not found" });
        }
        
        // Get all responses for this invite
        const responses = await storage.getInterviewResponsesByInvite(inviteId);
        let deletedFiles = 0;
        let deletedRatings = 0;
        let deletedComments = 0;
        
        // Explicitly delete all related data for GDPR compliance
        for (const response of responses) {
          // Delete video files from object storage
          if (response.videoPath) {
            try {
              await objectStorageService.deleteObject(response.videoPath);
              deletedFiles++;
            } catch (err) {
              console.error("Failed to delete video:", response.videoPath, err);
            }
          }
          
          // Delete ratings for this response
          const ratingsDeleted = await storage.deleteResponseRatingsByResponse(response.id);
          deletedRatings += ratingsDeleted;
          
          // Delete comments for this response
          const commentsDeleted = await storage.deleteResponseCommentsByResponse(response.id);
          deletedComments += commentsDeleted;
        }
        
        // Delete all responses for this invite
        await storage.deleteInterviewResponsesByInvite(inviteId);
        
        // Delete the invite itself
        const deleted = await storage.deleteInterviewInvite(inviteId);
        if (!deleted) {
          return res.status(500).json({ error: "Failed to delete interview invite" });
        }
        
        // Log the GDPR deletion for audit
        const auditLog = {
          action: "GDPR_DELETE",
          userId,
          tenantId,
          inviteId,
          candidateEmail: invite.candidateEmail,
          deletedAt: new Date().toISOString(),
          deletedResponses: responses.length,
          deletedFiles,
          deletedRatings,
          deletedComments,
        };
        console.log("GDPR DELETE AUDIT:", JSON.stringify(auditLog));
        
        res.json({ 
          success: true, 
          message: "Candidate interview data permanently deleted",
          audit: {
            deletedResponses: responses.length,
            deletedFiles,
            deletedRatings,
            deletedComments,
          },
        });
      } catch (error) {
        console.error("Error performing GDPR delete:", error);
        res.status(500).json({ error: "Failed to delete candidate data" });
      }
    }
  );

  // Export interview candidates with ratings as CSV (with pagination limit)
  app.get(
    "/api/interviews/export",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const { templateId, limit: limitStr } = req.query;
        
        // Limit to 500 records by default to prevent timeout
        const maxRecords = Math.min(Number(limitStr) || 500, 1000);
        
        // Get all invites for this tenant (optionally filtered by template)
        let invites = await storage.getInterviewInvitesByTenant(tenantId);
        
        if (templateId && typeof templateId === "string") {
          invites = invites.filter(inv => inv.templateId === templateId);
        }
        
        // Apply limit to prevent timeout on large exports
        invites = invites.slice(0, maxRecords);
        
        // Build CSV data
        const headers = [
          "Candidate Name",
          "Candidate Email",
          "Template",
          "Status",
          "Sent At",
          "Started At",
          "Completed At",
          "Deadline",
          "Response Count",
          "Average Rating",
        ];
        
        const rows: string[][] = [];
        
        for (const invite of invites) {
          const template = await storage.getInterviewTemplate(invite.templateId);
          const responses = await storage.getInterviewResponsesByInvite(invite.id);
          
          // Calculate average rating from response ratings
          let totalRating = 0;
          let ratingCount = 0;
          for (const resp of responses) {
            const ratings = await storage.getResponseRatings(resp.id, tenantId);
            for (const r of ratings) {
              totalRating += r.rating;
              ratingCount++;
            }
          }
          const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "N/A";
          
          rows.push([
            invite.candidateName || "",
            invite.candidateEmail || "",
            template?.name || "",
            invite.status,
            invite.createdAt?.toISOString() || "",
            invite.startedAt?.toISOString() || "",
            invite.completedAt?.toISOString() || "",
            invite.deadlineAt?.toISOString() || "",
            responses.length.toString(),
            avgRating,
          ]);
        }
        
        // Build CSV string
        const csvContent = [
          headers.join(","),
          ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")),
        ].join("\n");
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=interview-candidates.csv");
        res.send(csvContent);
      } catch (error) {
        console.error("Error exporting interviews:", error);
        res.status(500).json({ error: "Failed to export interviews" });
      }
    }
  );

  // Rate a response
  app.post(
    "/api/interviews/responses/rate",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { responseId, rating } = req.body;
        
        // Validate input
        const ratingSchema = z.object({
          responseId: z.string().uuid(),
          rating: z.number().int().min(1).max(5),
        });
        
        const validated = ratingSchema.safeParse({ responseId, rating });
        if (!validated.success) {
          return res.status(400).json({ error: "Invalid input: Response ID and rating (1-5) are required" });
        }
        
        // Verify the response belongs to this tenant using tenant-scoped lookup
        const response = await storage.getInterviewResponseByIdForTenant(responseId, tenantId);
        if (!response) {
          return res.status(404).json({ error: "Response not found or access denied" });
        }
        
        // Use storage method which enforces tenant scoping
        await storage.upsertResponseRating({
          tenantId,
          responseId,
          reviewerUserId: userId,
          rating,
        });
        
        res.json({ success: true });
      } catch (error) {
        console.error("Error rating response:", error);
        res.status(500).json({ error: "Failed to rate response" });
      }
    }
  );

  // Add comment to a response
  app.post(
    "/api/interviews/responses/comment",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const userId = (req as any).userId;
        const { responseId, comment } = req.body;
        
        // Validate input
        const commentSchema = z.object({
          responseId: z.string().uuid(),
          comment: z.string().min(1).max(2000),
        });
        
        const validated = commentSchema.safeParse({ responseId, comment });
        if (!validated.success) {
          return res.status(400).json({ error: "Invalid input: Response ID and comment are required" });
        }
        
        // Verify the response belongs to this tenant using tenant-scoped lookup
        const response = await storage.getInterviewResponseByIdForTenant(responseId, tenantId);
        if (!response) {
          return res.status(404).json({ error: "Response not found or access denied" });
        }
        
        // Get user name for the comment. storage exposes getUserProfile
        // (not getUser), and UserProfile has firstName/lastName rather
        // than a computed displayName, so we build the name here.
        const user = await storage.getUserProfile(userId);
        const displayName =
          [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
          user?.email ||
          "Unknown";

        // Use storage method which enforces tenant scoping
        await storage.createResponseComment({
          tenantId,
          responseId,
          userId,
          userName: displayName,
          comment,
        });
        
        res.json({ success: true });
      } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ error: "Failed to add comment" });
      }
    }
  );

  // ============ PUBLIC INTERVIEW ROUTES (Candidate) ============
  
  // Get interview by token (public - for candidates)
  app.get("/api/public/interview/:token", async (req, res) => {
    try {
      const { token } = (req.params as Record<string, string>);
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
          candidateEmail: invite.candidateEmail,
          deadlineAt: invite.deadlineAt,
          consentAcceptedAt: invite.consentAcceptedAt,
          systemCheckPassedAt: invite.systemCheckPassedAt,
          startedAt: invite.startedAt,
          completedAt: invite.completedAt,
        },
        template: {
          id: template?.id,
          name: template?.name,
          role: template?.role,
          introText: template?.introText,
          outroText: template?.outroText,
          brandPrimaryColor: template?.brandPrimaryColor,
          language: template?.language,
        },
        questions: questions.map(q => ({
          id: q.id,
          promptText: q.promptText,
          responseType: q.responseType,
          timeLimitSeconds: q.timeLimitSeconds,
          thinkingTimeSeconds: q.thinkingTimeSeconds,
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
  
  // Accept consent for interview
  app.post("/api/public/interview/:token/consent", async (req, res) => {
    try {
      const { token } = (req.params as Record<string, string>);
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "COMPLETED" || invite.status === "EXPIRED") {
        return res.status(400).json({ error: "Interview is no longer available" });
      }
      
      await storage.updateInterviewInvite(invite.id, { 
        consentAcceptedAt: new Date() 
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting consent:", error);
      res.status(500).json({ error: "Failed to accept consent" });
    }
  });

  // Record system check passed
  app.post("/api/public/interview/:token/system-check", async (req, res) => {
    try {
      const { token } = (req.params as Record<string, string>);
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "COMPLETED" || invite.status === "EXPIRED") {
        return res.status(400).json({ error: "Interview is no longer available" });
      }
      
      await storage.updateInterviewInvite(invite.id, { 
        systemCheckPassedAt: new Date() 
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error recording system check:", error);
      res.status(500).json({ error: "Failed to record system check" });
    }
  });
  
  // Start interview (update status to IN_PROGRESS)
  app.post("/api/public/interview/:token/start", async (req, res) => {
    try {
      const { token } = (req.params as Record<string, string>);
      const invite = await storage.getInterviewInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Interview not found" });
      }
      
      if (invite.status === "PENDING") {
        await storage.updateInterviewInvite(invite.id, { 
          status: "IN_PROGRESS",
          startedAt: new Date()
        });
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
      const { token } = (req.params as Record<string, string>);
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
      const { token } = (req.params as Record<string, string>);
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
      const { token } = (req.params as Record<string, string>);
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

      // Auto-upsert applicant into talent pool
      try {
        const userProfile = await storage.getUserProfile(userId);
        const claims = getUserClaims(req);
        if (userProfile || claims.email) {
          const talentId = await upsertToTalentPool({
            email: claims.email || userProfile?.email || "",
            firstName: userProfile?.firstName || claims.first_name || "",
            lastName: userProfile?.lastName || claims.last_name || "",
            jobTitle: job.title,
            userId,
            resumeUrl,
            source: "job_application",
          });
          if (talentId) {
            await recordTalentApplication(talentId, jobId, job.tenantId);
          }
        }
      } catch (e) {
        console.error("Talent pool upsert failed (non-blocking):", e);
      }

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

      const { jobId } = (req.params as Record<string, string>);
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

  // Get upload URL for authenticated users (e.g., video prompts)
  app.post("/api/upload-url", isAuthenticated, async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
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
      const { id } = (req.params as Record<string, string>);
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
      const { id } = (req.params as Record<string, string>);
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
      const { jobId } = (req.params as Record<string, string>);
      
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
      const { jobId } = (req.params as Record<string, string>);
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
      const { jobId, channelId } = (req.params as Record<string, string>);
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
      const { jobId, channelId } = (req.params as Record<string, string>);

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

  // Helper to check if user is super admin (checks both profile and env variable)
  function checkIsSuperAdmin(userProfile: { email?: string | null; isSuperAdmin?: boolean | null } | null): boolean {
    // Check if explicitly marked as super admin in profile
    if (userProfile?.isSuperAdmin) return true;
    
    // Also check against SUPER_ADMIN_EMAILS env variable at runtime
    const email = userProfile?.email?.toLowerCase();
    if (email && SUPER_ADMIN_EMAILS.includes(email)) return true;
    
    return false;
  }

  // Middleware to require super admin
  async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
    // Try session auth first
    let userId = getUserId(req);

    // Fall back to JWT
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const jwt = await import("jsonwebtoken");
          const token = authHeader.slice(7);
          const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "krew-jwt-secret") as any;
          userId = decoded.userId;
        } catch {}
      }
    }

    // Fall back to session
    if (!userId) {
      const session = req.session as any;
      userId = session?.userId;
    }

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // checkIsSuperAdmin's signature accepts `... | null` but storage.getUserProfile
    // returns `... | undefined` — coalesce here so the call typechecks.
    const userProfile = (await storage.getUserProfile(userId)) ?? null;
    if (checkIsSuperAdmin(userProfile)) return next();

    // No profile — check session email
    const sessionEmail = (req.session as any)?.email?.toLowerCase();
    if (sessionEmail && SUPER_ADMIN_EMAILS.includes(sessionEmail)) return next();

    // Check users table
    const { users: usersTable } = await import("@shared/schema");
    const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
    if (user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) return next();

    return res.status(403).json({ error: "Super admin access required" });
  }

  // Check if current user is super admin
  // Accept both session auth and JWT for admin check
  app.get("/api/admin/check", async (req, res) => {
    try {
      // Try session auth first
      let userId = getUserId(req);

      // Fall back to JWT
      if (!userId) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          try {
            const jwt = await import("jsonwebtoken");
            const token = authHeader.slice(7);
            const decoded = jwt.default.verify(token, process.env.JWT_SECRET || "krew-jwt-secret") as any;
            userId = decoded.userId;
          } catch {}
        }
      }

      // Fall back to cookie-based org auth
      if (!userId) {
        const session = req.session as any;
        userId = session?.userId;
      }

      if (!userId) return res.json({ isSuperAdmin: false });

      const userProfile = await storage.getUserProfile(userId);
      if (userProfile) {
        return res.json({ isSuperAdmin: checkIsSuperAdmin(userProfile) });
      }

      // No profile yet — check user's email directly from session or users table
      const sessionEmail = (req.session as any)?.email?.toLowerCase();
      if (sessionEmail && SUPER_ADMIN_EMAILS.includes(sessionEmail)) {
        return res.json({ isSuperAdmin: true });
      }

      // Check users table as last resort
      const { users: usersTable } = await import("@shared/schema");
      const [user] = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
      if (user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return res.json({ isSuperAdmin: true });
      }

      res.json({ isSuperAdmin: false });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.json({ isSuperAdmin: false });
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
      const { id } = (req.params as Record<string, string>);
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
      const { userId } = (req.params as Record<string, string>);
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

  // Get platform revenue analytics
  app.get("/api/admin/revenue", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const revenue = await storage.getPlatformRevenue();
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching revenue:", error);
      res.status(500).json({ error: "Failed to fetch revenue" });
    }
  });

  // Get all payouts for admin
  app.get("/api/admin/payouts", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const payouts = await storage.getAllGigPayouts();
      
      // Get details for each payout
      const payoutsWithDetails = await Promise.all(
        payouts.map(async (payout) => {
          const assignment = await storage.getGigAssignment(payout.gigAssignmentId);
          const gig = assignment ? await storage.getGigPost(assignment.gigPostId) : null;
          const workerProfile = await storage.getUserProfile(payout.workerUserId);
          const tenant = await storage.getTenant(payout.tenantId);
          return { ...payout, assignment, gig, workerProfile, tenant };
        })
      );
      
      res.json(payoutsWithDetails);
    } catch (error) {
      console.error("Error fetching admin payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
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

      // listProductsWithPrices already returns one entry per product with
      // a nested `prices` array — no grouping needed. The previous code
      // treated the result as a flat join of (product × price) rows and
      // accessed nonexistent top-level fields (price_id, unit_amount,
      // etc.) directly on each product object, producing 5 TS2339 errors.
      const plans = products.map((product) => ({
        id: product.product_id,
        name: product.product_name,
        description: product.product_description,
        active: product.product_active,
        metadata: product.product_metadata,
        prices: product.prices.map((price) => ({
          id: price.price_id,
          unitAmount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          active: price.price_active,
        })),
      }));

      res.json({ plans });
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

  // Invoice history
  app.get("/api/billing/invoices", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const billing = await storage.getTenantBilling(tenantId);

      if (!billing?.stripeCustomerId) {
        return res.json({ invoices: [] });
      }

      const stripe = getStripeClient();
      const invoices = await stripe.invoices.list({
        customer: billing.stripeCustomerId,
        limit: 24,
        status: "paid",
      });

      const formatted = invoices.data.map(inv => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amount: inv.amount_paid / 100,
        currency: inv.currency.toUpperCase(),
        status: inv.status,
        description: inv.lines.data[0]?.description || "Subscription",
        downloadUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
      }));

      res.json({ invoices: formatted });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // GET /api/billing/usage — current period usage stats for billing page
  app.get("/api/billing/usage", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;

      // Jobs posted by this tenant
      const [jobCount] = await db
        .select({ count: count() })
        .from(jobs)
        .where(eq(jobs.tenantId, tenantId));

      // Total applications (candidates) for this tenant
      const [appCount] = await db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.tenantId, tenantId));

      // Video interviews completed for this tenant
      const [interviewCount] = await db
        .select({ count: count() })
        .from(interviewInvites)
        .where(eq(interviewInvites.tenantId, tenantId));

      // Total ad spend across all campaigns for this tenant's org
      // campaigns link via orgId — for tenants that also have an org, we match on tenantId
      const [spendResult] = await db
        .select({ total: sum(campaignSpend.spendCents) })
        .from(campaignSpend)
        .innerJoin(campaigns, eq(campaignSpend.campaignId, campaigns.id))
        .where(eq(campaigns.orgId, tenantId));

      res.json({
        jobsPosted: jobCount?.count || 0,
        totalCandidates: appCount?.count || 0,
        videoInterviews: interviewCount?.count || 0,
        adSpendCents: parseInt(String(spendResult?.total || "0"), 10),
      });
    } catch (error) {
      console.error("Error fetching billing usage:", error);
      res.status(500).json({ error: "Failed to fetch usage data" });
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

  // ============ SUPER ADMIN FEATURE FLAGS ============

  app.get("/api/admin/feature-flags", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const flags = await storage.getAllFeatureFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  });

  app.post("/api/admin/feature-flags", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const flag = await storage.createFeatureFlag(req.body);
      res.status(201).json(flag);
    } catch (error) {
      console.error("Error creating feature flag:", error);
      res.status(500).json({ error: "Failed to create feature flag" });
    }
  });

  app.patch("/api/admin/feature-flags/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const flag = await storage.updateFeatureFlag(id, req.body);
      if (!flag) return res.status(404).json({ error: "Feature flag not found" });
      res.json(flag);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ error: "Failed to update feature flag" });
    }
  });

  app.delete("/api/admin/feature-flags/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      await storage.deleteFeatureFlag(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting feature flag:", error);
      res.status(500).json({ error: "Failed to delete feature flag" });
    }
  });

  // ============ SUPER ADMIN COUPONS ============

  app.get("/api/admin/coupons", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ error: "Failed to fetch coupons" });
    }
  });

  app.post("/api/admin/coupons", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const coupon = await storage.createCoupon(req.body);
      res.status(201).json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ error: "Failed to create coupon" });
    }
  });

  app.patch("/api/admin/coupons/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const coupon = await storage.updateCoupon(id, req.body);
      if (!coupon) return res.status(404).json({ error: "Coupon not found" });
      res.json(coupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ error: "Failed to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      await storage.deleteCoupon(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ error: "Failed to delete coupon" });
    }
  });

  // Validate and redeem coupon (tenant-scoped)
  app.post("/api/coupons/validate", isAuthenticated, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Coupon code required" });
      const result = await storage.validateCoupon(code);
      res.json(result);
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({ error: "Failed to validate coupon" });
    }
  });

  app.post("/api/coupons/redeem", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: "Coupon code required" });

      const validation = await storage.validateCoupon(code);
      if (!validation.valid) return res.status(400).json({ error: validation.error });

      const redemption = await storage.redeemCoupon(validation.coupon!.id, tenantId);
      res.json({ success: true, redemption, coupon: validation.coupon });
    } catch (error) {
      console.error("Error redeeming coupon:", error);
      res.status(500).json({ error: "Failed to redeem coupon" });
    }
  });

  // ============ SUPER ADMIN ANALYTICS ============

  app.get("/api/admin/analytics/mrr", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const mrrData = await storage.getMrrByMonth();
      const latestMrr = mrrData.length > 0 ? mrrData[mrrData.length - 1] : { mrr: 0, arr: 0 };
      res.json({ monthly: mrrData, currentMrr: latestMrr.mrr, currentArr: latestMrr.arr });
    } catch (error) {
      console.error("Error fetching MRR analytics:", error);
      res.status(500).json({ error: "Failed to fetch MRR analytics" });
    }
  });

  app.get("/api/admin/analytics/churn", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const churnData = await storage.getChurnRate();
      res.json(churnData);
    } catch (error) {
      console.error("Error fetching churn analytics:", error);
      res.status(500).json({ error: "Failed to fetch churn analytics" });
    }
  });

  app.get("/api/admin/analytics/tenant-health", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const healthScores = await storage.getTenantHealthScores();
      res.json(healthScores);
    } catch (error) {
      console.error("Error fetching tenant health scores:", error);
      res.status(500).json({ error: "Failed to fetch tenant health scores" });
    }
  });

  // ============ SUPER ADMIN IMPERSONATION ============

  app.post("/api/admin/impersonate/:userId", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) return res.status(401).json({ error: "Unauthorized" });

      const { userId } = (req.params as Record<string, string>);
      const targetUser = await storage.getUserProfile(userId);
      if (!targetUser) return res.status(404).json({ error: "User not found" });

      const session = await storage.createImpersonationSession({
        adminUserId,
        targetUserId: userId,
        reason: req.body.reason || "Admin debugging",
      });
      res.json({ session, targetUser });
    } catch (error) {
      console.error("Error starting impersonation:", error);
      res.status(500).json({ error: "Failed to start impersonation session" });
    }
  });

  app.post("/api/admin/impersonate/end", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const adminUserId = getUserId(req);
      if (!adminUserId) return res.status(401).json({ error: "Unauthorized" });

      const activeSession = await storage.getActiveImpersonationSession(adminUserId);
      if (!activeSession) return res.status(404).json({ error: "No active impersonation session" });

      const endedSession = await storage.endImpersonationSession(activeSession.id);
      res.json({ session: endedSession });
    } catch (error) {
      console.error("Error ending impersonation:", error);
      res.status(500).json({ error: "Failed to end impersonation session" });
    }
  });

  // ============ SMS MESSAGING (TENANT-SCOPED) ============

  app.post("/api/sms/send", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { recipientPhone, message, recipientUserId, applicationId } = req.body;
      if (!recipientPhone || !message) {
        return res.status(400).json({ error: "Recipient phone and message required" });
      }

      const smsMessage = await storage.createSmsMessage({
        tenantId,
        senderUserId: userId,
        recipientPhone,
        message,
        recipientUserId,
        applicationId,
        status: "PENDING",
      });

      res.status(201).json(smsMessage);
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  app.get("/api/sms/messages", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const messages = await storage.getSmsMessagesByTenant(tenantId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching SMS messages:", error);
      res.status(500).json({ error: "Failed to fetch SMS messages" });
    }
  });

  // ============ INTERVIEW SCHEDULING (TENANT-SCOPED) ============

  app.get("/api/scheduling/slots", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const slots = await storage.getInterviewSlotsByTenant(tenantId);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching interview slots:", error);
      res.status(500).json({ error: "Failed to fetch interview slots" });
    }
  });

  app.post("/api/scheduling/slots", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const slot = await storage.createInterviewSlot({
        ...req.body,
        tenantId,
        createdByUserId: userId,
      });
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating interview slot:", error);
      res.status(500).json({ error: "Failed to create interview slot" });
    }
  });

  app.patch("/api/scheduling/slots/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const slot = await storage.updateInterviewSlot(id, req.body);
      if (!slot) return res.status(404).json({ error: "Slot not found" });
      res.json(slot);
    } catch (error) {
      console.error("Error updating interview slot:", error);
      res.status(500).json({ error: "Failed to update interview slot" });
    }
  });

  app.delete("/api/scheduling/slots/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      await storage.deleteInterviewSlot(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting interview slot:", error);
      res.status(500).json({ error: "Failed to delete interview slot" });
    }
  });

  app.post("/api/scheduling/book", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { slotId, applicationId } = req.body;
      if (!slotId) return res.status(400).json({ error: "Slot ID required" });

      const slot = await storage.getInterviewSlot(slotId);
      if (!slot) return res.status(404).json({ error: "Slot not found" });
      if ((slot.currentBookings || 0) >= (slot.maxBookings || 1)) {
        return res.status(400).json({ error: "Slot is fully booked" });
      }

      const booking = await storage.createInterviewBooking({
        slotId,
        applicationId,
        candidateUserId: userId,
        status: "CONFIRMED",
      });
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error booking interview:", error);
      res.status(500).json({ error: "Failed to book interview" });
    }
  });

  // ============ JOB TEMPLATES (TENANT-SCOPED) ============

  app.get("/api/templates/jobs", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const templates = await storage.getJobTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching job templates:", error);
      res.status(500).json({ error: "Failed to fetch job templates" });
    }
  });

  app.post("/api/templates/jobs", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const template = await storage.createJobTemplate({
        ...req.body,
        tenantId,
        createdByUserId: userId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating job template:", error);
      res.status(500).json({ error: "Failed to create job template" });
    }
  });

  app.patch("/api/templates/jobs/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const template = await storage.updateJobTemplate(id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error) {
      console.error("Error updating job template:", error);
      res.status(500).json({ error: "Failed to update job template" });
    }
  });

  app.delete("/api/templates/jobs/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      await storage.deleteJobTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting job template:", error);
      res.status(500).json({ error: "Failed to delete job template" });
    }
  });

  // ============ MESSAGE TEMPLATES (TENANT-SCOPED) ============

  app.get("/api/templates/messages", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const templates = await storage.getMessageTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching message templates:", error);
      res.status(500).json({ error: "Failed to fetch message templates" });
    }
  });

  app.post("/api/templates/messages", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const template = await storage.createMessageTemplate({
        ...req.body,
        tenantId,
        createdByUserId: userId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating message template:", error);
      res.status(500).json({ error: "Failed to create message template" });
    }
  });

  app.patch("/api/templates/messages/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const template = await storage.updateMessageTemplate(id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found" });
      res.json(template);
    } catch (error) {
      console.error("Error updating message template:", error);
      res.status(500).json({ error: "Failed to update message template" });
    }
  });

  app.delete("/api/templates/messages/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      await storage.deleteMessageTemplate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting message template:", error);
      res.status(500).json({ error: "Failed to delete message template" });
    }
  });

  // ============ BACKGROUND CHECKS (TENANT-SCOPED) ============

  app.get("/api/background-checks", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const checks = await storage.getBackgroundChecksByTenant(tenantId);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching background checks:", error);
      res.status(500).json({ error: "Failed to fetch background checks" });
    }
  });

  app.post("/api/background-checks", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const check = await storage.createBackgroundCheck({
        ...req.body,
        tenantId,
        requestedByUserId: userId,
        status: "PENDING",
      });
      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating background check:", error);
      res.status(500).json({ error: "Failed to create background check" });
    }
  });

  app.patch("/api/background-checks/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const check = await storage.updateBackgroundCheck(id, req.body);
      if (!check) return res.status(404).json({ error: "Background check not found" });
      res.json(check);
    } catch (error) {
      console.error("Error updating background check:", error);
      res.status(500).json({ error: "Failed to update background check" });
    }
  });

  // ============ ONBOARDING (TENANT-SCOPED) ============

  app.get("/api/onboarding/documents/:applicationId", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { applicationId } = (req.params as Record<string, string>);
      const documents = await storage.getOnboardingDocumentsByApplication(applicationId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching onboarding documents:", error);
      res.status(500).json({ error: "Failed to fetch onboarding documents" });
    }
  });

  app.post("/api/onboarding/documents", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const document = await storage.createOnboardingDocument({
        ...req.body,
        tenantId,
      });
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating onboarding document:", error);
      res.status(500).json({ error: "Failed to create onboarding document" });
    }
  });

  app.patch("/api/onboarding/documents/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const document = await storage.updateOnboardingDocument(id, req.body);
      if (!document) return res.status(404).json({ error: "Document not found" });
      res.json(document);
    } catch (error) {
      console.error("Error updating onboarding document:", error);
      res.status(500).json({ error: "Failed to update onboarding document" });
    }
  });

  app.get("/api/onboarding/checklists/:applicationId", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { applicationId } = (req.params as Record<string, string>);
      const checklists = await storage.getOnboardingChecklistsByApplication(applicationId);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching onboarding checklists:", error);
      res.status(500).json({ error: "Failed to fetch onboarding checklists" });
    }
  });

  app.post("/api/onboarding/checklists", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const checklist = await storage.createOnboardingChecklist({
        ...req.body,
        tenantId,
      });
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Error creating onboarding checklist:", error);
      res.status(500).json({ error: "Failed to create onboarding checklist" });
    }
  });

  app.patch("/api/onboarding/checklists/:id", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const checklist = await storage.updateOnboardingChecklist(id, req.body);
      if (!checklist) return res.status(404).json({ error: "Checklist not found" });
      res.json(checklist);
    } catch (error) {
      console.error("Error updating onboarding checklist:", error);
      res.status(500).json({ error: "Failed to update onboarding checklist" });
    }
  });

  // ============ FEATURE FLAG CHECK (TENANT-SCOPED) ============

  app.get("/api/features/:featureName", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;
      const { featureName } = (req.params as Record<string, string>);
      const tenant = await storage.getTenant(tenantId);
      const enabled = await storage.isFeatureEnabled(featureName, tenantId, tenant?.planType || undefined);
      res.json({ enabled });
    } catch (error) {
      console.error("Error checking feature:", error);
      res.status(500).json({ error: "Failed to check feature" });
    }
  });

  // ============ TALENT POOL ROUTES ============

  const { talentPool: talentPoolTable, talentPoolApplications: talentAppTable } = await import("@shared/schema");
  const talentOrm = await import("drizzle-orm");
  const talentDb = (await import("./db")).db;

  // Search talent pool
  app.get("/api/talent/search", isAuthenticated, requireTenant, requirePlan("PRO", "ENTERPRISE"), async (req, res) => {
    try {
      const {
        q, city, state, radius = "25", jobTitle,
        availability, isGigAvailable, experienceYears,
        page = "1", limit = "20"
      } = req.query as Record<string, string>;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const conditions: any[] = [talentOrm.eq(talentPoolTable.isPublic, true)];

      if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(
          talentOrm.or(
            talentOrm.sql`${talentPoolTable.firstName} ILIKE ${searchTerm}`,
            talentOrm.sql`${talentPoolTable.lastName} ILIKE ${searchTerm}`,
            talentOrm.sql`array_to_string(${talentPoolTable.jobTitles}, ',') ILIKE ${searchTerm}`,
            talentOrm.sql`array_to_string(${talentPoolTable.skills}, ',') ILIKE ${searchTerm}`
          )
        );
      }

      if (jobTitle) {
        conditions.push(talentOrm.sql`${jobTitle} = ANY(${talentPoolTable.jobTitles})`);
      }

      if (availability && availability !== "any") {
        conditions.push(talentOrm.eq(talentPoolTable.availability, availability as any));
      }

      if (isGigAvailable === "true") {
        conditions.push(talentOrm.eq(talentPoolTable.isGigAvailable, true));
      }

      if (experienceYears) {
        conditions.push(talentOrm.sql`${talentPoolTable.experienceYears} >= ${parseInt(experienceYears)}`);
      }

      if (city && state) {
        conditions.push(talentOrm.eq(talentPoolTable.state, state));
      }

      const where = conditions.length > 1
        ? talentOrm.and(...conditions)!
        : conditions[0];

      const results = await talentDb
        .select({
          id: talentPoolTable.id,
          firstName: talentPoolTable.firstName,
          lastName: talentPoolTable.lastName,
          city: talentPoolTable.city,
          state: talentPoolTable.state,
          lat: talentPoolTable.lat,
          lng: talentPoolTable.lng,
          jobTitles: talentPoolTable.jobTitles,
          skills: talentPoolTable.skills,
          experienceYears: talentPoolTable.experienceYears,
          availability: talentPoolTable.availability,
          isGigAvailable: talentPoolTable.isGigAvailable,
          avgRating: talentPoolTable.avgRating,
          totalGigsCompleted: talentPoolTable.totalGigsCompleted,
          videoIntroUrl: talentPoolTable.videoIntroUrl,
          lastActiveAt: talentPoolTable.lastActiveAt,
        })
        .from(talentPoolTable)
        .where(where)
        .limit(parseInt(limit))
        .offset(offset);

      // Get total count
      const [countResult] = await talentDb
        .select({ count: talentOrm.sql<number>`count(*)` })
        .from(talentPoolTable)
        .where(where);

      res.json({
        results,
        total: Number(countResult?.count || 0),
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error: any) {
      console.error("Error searching talent pool:", error);
      res.status(500).json({ error: "Failed to search talent pool" });
    }
  });

  // Get single talent profile (sanitized — no email/phone for employers)
  app.get("/api/talent/:id", isAuthenticated, async (req, res) => {
    try {
      const id = Array.isArray((req.params as Record<string, string>).id) ? (req.params as Record<string, string>).id[0] : (req.params as Record<string, string>).id;
      const [talent] = await talentDb
        .select({
          id: talentPoolTable.id,
          firstName: talentPoolTable.firstName,
          lastName: talentPoolTable.lastName,
          city: talentPoolTable.city,
          state: talentPoolTable.state,
          jobTitles: talentPoolTable.jobTitles,
          skills: talentPoolTable.skills,
          experienceYears: talentPoolTable.experienceYears,
          availability: talentPoolTable.availability,
          isGigAvailable: talentPoolTable.isGigAvailable,
          avgRating: talentPoolTable.avgRating,
          totalGigsCompleted: talentPoolTable.totalGigsCompleted,
          videoIntroUrl: talentPoolTable.videoIntroUrl,
          lastActiveAt: talentPoolTable.lastActiveAt,
          resumeUrl: talentPoolTable.resumeUrl,
        })
        .from(talentPoolTable)
        .where(talentOrm.and(
          talentOrm.eq(talentPoolTable.id, id),
          talentOrm.eq(talentPoolTable.isPublic, true)
        )!);

      if (!talent) return res.status(404).json({ error: "Talent not found" });
      res.json(talent);
    } catch (error) {
      console.error("Error fetching talent:", error);
      res.status(500).json({ error: "Failed to fetch talent" });
    }
  });

  // Contact a talent (sends message, logs attempt)
  app.post("/api/talent/:id/contact", isAuthenticated, requireTenant, async (req, res) => {
    try {
      const id = Array.isArray((req.params as Record<string, string>).id) ? (req.params as Record<string, string>).id[0] : (req.params as Record<string, string>).id;
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message is required" });

      const [talent] = await talentDb
        .select()
        .from(talentPoolTable)
        .where(talentOrm.eq(talentPoolTable.id, id));

      if (!talent) return res.status(404).json({ error: "Talent not found" });

      // In production, this would send an email/notification to the talent
      // For now, log the contact attempt
      console.log(`Contact attempt: employer -> talent ${talent.email} | message: ${message.slice(0, 100)}`);

      res.json({ success: true, message: "Message sent to candidate" });
    } catch (error) {
      console.error("Error contacting talent:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get own talent pool record
  app.get("/api/talent/me", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [existing] = await talentDb
        .select()
        .from(talentPoolTable)
        .where(talentOrm.eq(talentPoolTable.userId, userId));

      if (!existing) {
        return res.json(null);
      }

      res.json(existing);
    } catch (error) {
      console.error("Error fetching talent me:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update own talent pool profile (gig opt-in, etc.)
  app.patch("/api/talent/me", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { isGigAvailable, availability, skills, experienceYears, videoIntroUrl } = req.body;

      const [existing] = await talentDb
        .select()
        .from(talentPoolTable)
        .where(talentOrm.eq(talentPoolTable.userId, userId));

      if (!existing) {
        return res.status(404).json({ error: "No talent pool record found. Apply to a job first." });
      }

      const updates: Record<string, any> = { lastActiveAt: new Date() };
      if (isGigAvailable !== undefined) updates.isGigAvailable = isGigAvailable;
      if (availability) updates.availability = availability;
      if (skills) updates.skills = skills;
      if (experienceYears !== undefined) updates.experienceYears = experienceYears;
      if (videoIntroUrl !== undefined) updates.videoIntroUrl = videoIntroUrl;

      const [updated] = await talentDb
        .update(talentPoolTable)
        .set(updates)
        .where(talentOrm.eq(talentPoolTable.id, existing.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating talent profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Gig opt-in shortcut
  app.patch("/api/talent/me/gig-opt-in", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const [existing] = await talentDb
        .select()
        .from(talentPoolTable)
        .where(talentOrm.eq(talentPoolTable.userId, userId));

      if (!existing) {
        return res.status(404).json({ error: "No talent pool record found" });
      }

      const [updated] = await talentDb
        .update(talentPoolTable)
        .set({ isGigAvailable: true, lastActiveAt: new Date() })
        .where(talentOrm.eq(talentPoolTable.id, existing.id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error opting into gigs:", error);
      res.status(500).json({ error: "Failed to opt in" });
    }
  });

  // Get talent pool count (for display)
  app.get("/api/talent/count", async (_req, res) => {
    try {
      const [result] = await talentDb
        .select({ count: talentOrm.sql<number>`count(*)` })
        .from(talentPoolTable)
        .where(talentOrm.eq(talentPoolTable.isPublic, true));
      res.json({ count: Number(result?.count || 0) });
    } catch {
      res.json({ count: 0 });
    }
  });

  // ============ META ADS CAMPAIGN ROUTES ============

  const metaAds = await import("./services/meta-ads");
  const { jobAdCampaigns } = await import("@shared/schema");
  const { eq, and } = await import("drizzle-orm");
  const { db } = await import("./db");

  // Helper to safely extract string param from Express 5 params
  const paramStr = (val: string | string[]): string =>
    Array.isArray(val) ? val[0] : val;

  // Create a Meta ad campaign for a job
  app.post(
    "/api/meta/campaign",
    isAuthenticated,
    requireTenant,
    requirePlan("PRO", "ENTERPRISE"),
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId;
        const { jobId, dailyBudgetUSD } = req.body;

        if (!jobId || !dailyBudgetUSD) {
          return res.status(400).json({ error: "jobId and dailyBudgetUSD are required" });
        }

        // Fetch the job
        const job = await storage.getJob(jobId);
        if (!job || job.tenantId !== tenantId) {
          return res.status(404).json({ error: "Job not found" });
        }

        const tenant = await storage.getTenant(tenantId);
        const location = job.locationId ? await storage.getLocation(job.locationId) : null;
        const baseUrl = process.env.PUBLIC_URL || "https://krewrecruiter.com";

        // Geocode location if we have city/state
        const locationStr = location?.city && location?.state
          ? `${location.city}, ${location.state}`
          : "Local";
        let lat: number | undefined;
        let lng: number | undefined;

        if (location?.city && location?.state) {
          const coords = await geocodeAddress(`${location.city}, ${location.state}`);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        // Smart radius based on city size
        const smartRadius = location?.city && location?.state
          ? getSmartRadius(location.city, location.state)
          : 25;

        let metaResult = null;

        if (await metaAds.isMetaConfigured()) {
          metaResult = await metaAds.createJobCampaign(
            {
              jobId: job.id,
              jobTitle: job.title,
              companyName: tenant?.name || "Restaurant",
              location: locationStr,
              latitude: lat,
              longitude: lng,
              radius: req.body.radius || smartRadius,
              pay: job.payRangeMin && job.payRangeMax
                ? `$${job.payRangeMin}-$${job.payRangeMax}/hr`
                : job.payRangeMin ? `$${job.payRangeMin}/hr` : undefined,
              applyUrl: `${baseUrl}/jobs/${job.id}`,
            },
            dailyBudgetUSD
          );
        }

        // Save to database
        const [campaign] = await db
          .insert(jobAdCampaigns)
          .values({
            jobId,
            tenantId,
            metaCampaignId: metaResult?.metaCampaignId || null,
            metaAdSetId: metaResult?.metaAdSetId || null,
            metaAdId: metaResult?.metaAdId || null,
            metaCreativeId: metaResult?.metaCreativeId || null,
            status: metaResult ? "paused" : "draft",
            dailyBudgetUSD,
          })
          .returning();

        res.json(campaign);
      } catch (error: any) {
        console.error("Error creating Meta campaign:", error);
        res.status(500).json({ error: error.message || "Failed to create campaign" });
      }
    }
  );

  // Activate a Meta campaign
  app.post(
    "/api/meta/campaign/:id/activate",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId as string;
        const id = paramStr((req.params as Record<string, string>).id);

        const [campaign] = await db
          .select()
          .from(jobAdCampaigns)
          .where(and(eq(jobAdCampaigns.id, id), eq(jobAdCampaigns.tenantId, tenantId))!);

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.metaCampaignId && await metaAds.isMetaConfigured()) {
          await metaAds.activateCampaign(campaign.metaCampaignId);
        }

        const [updated] = await db
          .update(jobAdCampaigns)
          .set({ status: "active" as const, updatedAt: new Date() })
          .where(eq(jobAdCampaigns.id, id))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error("Error activating campaign:", error);
        res.status(500).json({ error: error.message || "Failed to activate campaign" });
      }
    }
  );

  // Pause a Meta campaign
  app.post(
    "/api/meta/campaign/:id/pause",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId as string;
        const id = paramStr((req.params as Record<string, string>).id);

        const [campaign] = await db
          .select()
          .from(jobAdCampaigns)
          .where(and(eq(jobAdCampaigns.id, id), eq(jobAdCampaigns.tenantId, tenantId))!);

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.metaCampaignId && await metaAds.isMetaConfigured()) {
          await metaAds.pauseCampaign(campaign.metaCampaignId);
        }

        const [updated] = await db
          .update(jobAdCampaigns)
          .set({ status: "paused" as const, updatedAt: new Date() })
          .where(eq(jobAdCampaigns.id, id))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error("Error pausing campaign:", error);
        res.status(500).json({ error: error.message || "Failed to pause campaign" });
      }
    }
  );

  // Delete a Meta campaign
  app.delete(
    "/api/meta/campaign/:id",
    isAuthenticated,
    requireTenant,
    requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId as string;
        const id = paramStr((req.params as Record<string, string>).id);

        const [campaign] = await db
          .select()
          .from(jobAdCampaigns)
          .where(and(eq(jobAdCampaigns.id, id), eq(jobAdCampaigns.tenantId, tenantId))!);

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        if (campaign.metaCampaignId && await metaAds.isMetaConfigured()) {
          await metaAds.deleteCampaign(campaign.metaCampaignId);
        }

        const [updated] = await db
          .update(jobAdCampaigns)
          .set({ status: "deleted" as const, updatedAt: new Date() })
          .where(eq(jobAdCampaigns.id, id))
          .returning();

        res.json(updated);
      } catch (error: any) {
        console.error("Error deleting campaign:", error);
        res.status(500).json({ error: error.message || "Failed to delete campaign" });
      }
    }
  );

  // Get campaign stats (fetches from Meta + updates db)
  app.get(
    "/api/meta/campaign/:id/stats",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId as string;
        const id = paramStr((req.params as Record<string, string>).id);

        const [campaign] = await db
          .select()
          .from(jobAdCampaigns)
          .where(and(eq(jobAdCampaigns.id, id), eq(jobAdCampaigns.tenantId, tenantId))!);

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        let stats = {
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          spendCents: campaign.totalSpendCents,
          cpc: campaign.clicks > 0 ? campaign.totalSpendCents / campaign.clicks / 100 : 0,
        };

        // Fetch live stats from Meta if configured
        if (campaign.metaCampaignId && await metaAds.isMetaConfigured()) {
          stats = await metaAds.getCampaignStats(campaign.metaCampaignId);

          // Persist latest stats
          await db
            .update(jobAdCampaigns)
            .set({
              impressions: stats.impressions,
              clicks: stats.clicks,
              totalSpendCents: stats.spendCents,
              updatedAt: new Date(),
            })
            .where(eq(jobAdCampaigns.id, id));
        }

        res.json({ ...campaign, ...stats });
      } catch (error: any) {
        console.error("Error getting campaign stats:", error);
        res.status(500).json({ error: error.message || "Failed to get stats" });
      }
    }
  );

  // List all campaigns for a job (or all for tenant)
  app.get(
    "/api/meta/campaigns",
    isAuthenticated,
    requireTenant,
    async (req, res) => {
      try {
        const tenantId = (req as any).tenantId as string;
        const jobId = req.query.jobId as string | undefined;

        const conditions = jobId
          ? and(eq(jobAdCampaigns.tenantId, tenantId), eq(jobAdCampaigns.jobId, jobId))!
          : eq(jobAdCampaigns.tenantId, tenantId);

        const campaigns = await db
          .select()
          .from(jobAdCampaigns)
          .where(conditions);

        res.json(campaigns);
      } catch (error: any) {
        console.error("Error listing campaigns:", error);
        res.status(500).json({ error: "Failed to list campaigns" });
      }
    }
  );

  // Check if Meta API is configured
  app.get("/api/meta/status", isAuthenticated, async (_req, res) => {
    res.json({ configured: await metaAds.isMetaConfigured() });
  });

  // ============ AD IMAGE GENERATION ============

  const adImageGen = await import("./services/ad-image-generator");
  const fs = await import("fs/promises");
  const path = await import("path");

  // Preview ad image (returns base64 PNG)
  app.post(
    "/api/campaign/preview-image",
    requireAuth,
    async (req, res) => {
      try {
        const tenantId = req.orgId || (req as any).tenantId || getTenantIdFromCookie(req);
        const { jobId, format, ...overrides } = req.body;

        let imageInput: { title: string; company: string; location: string; pay: string; requirements: string[]; benefits: string[]; logoUrl?: string; primaryColor?: string; accentColor?: string };

        if (jobId) {
          const job = await storage.getJob(jobId);
          if (!job || job.tenantId !== tenantId) {
            return res.status(404).json({ error: "Job not found" });
          }
          const tenant = await storage.getTenant(tenantId);
          const location = job.locationId ? await storage.getLocation(job.locationId) : null;

          imageInput = {
            title: overrides.title || job.title,
            company: overrides.company || tenant?.name || "Restaurant",
            location: overrides.location || (location?.city && location?.state ? `${location.city}, ${location.state}` : "Local"),
            pay: overrides.pay || (job.payRangeMin && job.payRangeMax ? `$${job.payRangeMin} - $${job.payRangeMax} / HR` : ""),
            requirements: overrides.requirements || [],
            benefits: overrides.benefits || [],
            logoUrl: overrides.logoUrl,
            primaryColor: overrides.primaryColor,
            accentColor: overrides.accentColor,
          };
        } else {
          imageInput = {
            title: overrides.title || "Job Title",
            company: overrides.company || "Company",
            location: overrides.location || "City, State",
            pay: overrides.pay || "",
            requirements: overrides.requirements || [],
            benefits: overrides.benefits || [],
            logoUrl: overrides.logoUrl,
            primaryColor: overrides.primaryColor,
            accentColor: overrides.accentColor,
          };
        }

        const buffer = await adImageGen.generateAdImage(imageInput, format || "feed");
        const base64 = buffer.toString("base64");

        res.json({ image: `data:image/png;base64,${base64}`, format: format || "feed" });
      } catch (error: any) {
        console.error("Error generating preview image:", error);
        res.status(500).json({ error: error.message || "Failed to generate image" });
      }
    }
  );

  // Generate and save ad image
  app.post(
    "/api/campaign/generate-image",
    requireAuth,
    async (req, res) => {
      try {
        const tenantId = req.orgId || (req as any).tenantId || getTenantIdFromCookie(req);
        const { campaignId, format } = req.body;

        if (!campaignId) {
          return res.status(400).json({ error: "campaignId is required" });
        }

        const [campaign] = await db
          .select()
          .from(jobAdCampaigns)
          .where(and(eq(jobAdCampaigns.id, campaignId), eq(jobAdCampaigns.tenantId, tenantId))!);

        if (!campaign) {
          return res.status(404).json({ error: "Campaign not found" });
        }

        const job = await storage.getJob(campaign.jobId);
        if (!job) {
          return res.status(404).json({ error: "Job not found" });
        }

        const tenant = await storage.getTenant(tenantId);
        const location = job.locationId ? await storage.getLocation(job.locationId) : null;

        const imageInput = {
          title: job.title,
          company: tenant?.name || "Restaurant",
          location: location?.city && location?.state ? `${location.city}, ${location.state}` : "Local",
          pay: job.payRangeMin && job.payRangeMax ? `$${job.payRangeMin} - $${job.payRangeMax} / HR` : "",
          requirements: [] as string[],
          benefits: [] as string[],
        };

        const buffer = await adImageGen.generateAdImage(imageInput, format || "feed");

        // Save to uploads directory
        const uploadsDir = path.join(process.cwd(), "uploads", "ad-images");
        await fs.mkdir(uploadsDir, { recursive: true });
        const filename = `${campaignId}.png`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, buffer);

        const imageUrl = `/uploads/ad-images/${filename}`;

        res.json({ imageUrl, size: buffer.length });
      } catch (error: any) {
        console.error("Error generating ad image:", error);
        res.status(500).json({ error: error.message || "Failed to generate image" });
      }
    }
  );

  // ============ ANNOUNCEMENTS ============

  // GET /api/announcements — public, shows active announcements
  app.get("/api/announcements", async (_req, res) => {
    try {
      const active = await db
        .select()
        .from(announcements)
        .where(eq(announcements.isActive, true))
        .orderBy(desc(announcements.createdAt));
      res.json(active);
    } catch (error) {
      console.error("Announcements error:", error);
      res.json([]);
    }
  });

  // GET /api/admin/announcements — all announcements
  app.get("/api/admin/announcements", isAuthenticated, requireSuperAdmin, async (_req, res) => {
    try {
      const all = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
      res.json(all);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  // POST /api/admin/announcements — create announcement
  app.post("/api/admin/announcements", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const userId = getUserId(req) || (req.session as any)?.userId;
      const { title, message, type, target } = req.body;
      const [ann] = await db.insert(announcements).values({
        title, message, type: type || "info", target: target || "all",
        createdBy: userId,
      }).returning();
      res.json(ann);
    } catch (error) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // PATCH /api/admin/announcements/:id — toggle active
  app.patch("/api/admin/announcements/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      const { isActive } = req.body;
      const [updated] = await db.update(announcements)
        .set({ isActive })
        .where(eq(announcements.id, id as string))
        .returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // DELETE /api/admin/announcements/:id
  app.delete("/api/admin/announcements/:id", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = (req.params as Record<string, string>);
      await db.delete(announcements).where(eq(announcements.id, id as string));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // ============ AUDIT LOG ============

  app.get("/api/admin/audit-log", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { page = "1", limit = "50", action } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      let query = db.select().from(auditEvents)
        .orderBy(desc(auditEvents.createdAt))
        .limit(limitNum)
        .offset((pageNum - 1) * limitNum);

      const results = await query;

      // Filter by action in JS if specified
      const filtered = action
        ? results.filter(e => e.action === action)
        : results;

      res.json({ events: filtered, page: pageNum });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit log" });
    }
  });

  // ============ PLATFORM SETTINGS (admin view all) ============

  app.get("/api/admin/platform-settings", isAuthenticated, requireSuperAdmin, async (_req, res) => {
    try {
      const { getMaskedPlatformSettings } = await import("./services/platformSettings");
      const settings = await getMaskedPlatformSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch platform settings" });
    }
  });

  // ============ ADMIN AD SPEND BILLING ============

  // POST /api/admin/billing/process-daily-spend
  // Called daily by cron or admin to charge employers for active campaign ad spend.
  // For each active campaign: employer pays dailyBudgetCents (includes markup).
  // We create a Stripe invoice item on the org's Stripe customer.
  app.post("/api/admin/billing/process-daily-spend", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { getMetaCredentials } = await import("./services/platformSettings");

      let markupPercent = 20;
      try {
        const creds = await getMetaCredentials();
        markupPercent = creds.markupPercent;
      } catch {
        // Use default markup if Meta not configured
      }

      // Get all active campaigns with their org's Stripe customer ID
      const activeCampaigns = await db
        .select({
          campaignId: campaigns.id,
          title: campaigns.title,
          dailyBudgetCents: campaigns.dailyBudgetCents,
          orgId: campaigns.orgId,
          orgName: organizations.name,
          stripeCustomerId: organizations.stripeCustomerId,
        })
        .from(campaigns)
        .innerJoin(organizations, eq(campaigns.orgId, organizations.id))
        .where(eq(campaigns.status, "active"));

      let charged = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const campaign of activeCampaigns) {
        if (!campaign.stripeCustomerId) {
          skipped++;
          continue;
        }

        const employerBudgetCents = campaign.dailyBudgetCents || 3200;
        const metaSpendCents = Math.round(employerBudgetCents * 100 / (100 + markupPercent));
        const markupCents = employerBudgetCents - metaSpendCents;

        try {
          // Create invoice item for this day's ad spend
          await stripeService.createAdSpendInvoiceItem(
            campaign.stripeCustomerId,
            employerBudgetCents,
            `Ad spend: ${campaign.title} (${today})`,
            {
              campaignId: campaign.campaignId,
              date: today,
              metaSpendCents: String(metaSpendCents),
              markupCents: String(markupCents),
            }
          );

          // Record the spend in our DB
          await db.insert(campaignSpend).values({
            campaignId: campaign.campaignId,
            date: today,
            spendCents: employerBudgetCents,
          });

          // Also update total spent on campaign
          await db
            .update(campaigns)
            .set({
              totalSpentCents: sql`${campaigns.totalSpentCents} + ${employerBudgetCents}`,
            })
            .where(eq(campaigns.id, campaign.campaignId));

          charged++;
        } catch (err: any) {
          errors.push(`${campaign.orgName}/${campaign.title}: ${err.message}`);
        }
      }

      res.json({
        processed: activeCampaigns.length,
        charged,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        date: today,
      });
    } catch (error) {
      console.error("Error processing daily spend:", error);
      res.status(500).json({ error: "Failed to process daily ad spend" });
    }
  });

  // POST /api/admin/billing/collect-invoices
  // Collects all pending invoice items into invoices and charges them.
  // Run after process-daily-spend, or at end of billing period.
  app.post("/api/admin/billing/collect-invoices", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      // Get unique Stripe customer IDs that have active campaigns
      const activeOrgs = await db
        .select({
          stripeCustomerId: organizations.stripeCustomerId,
          orgName: organizations.name,
        })
        .from(campaigns)
        .innerJoin(organizations, eq(campaigns.orgId, organizations.id))
        .where(eq(campaigns.status, "active"));

      const uniqueCustomers = Array.from(new Set(
        activeOrgs
          .map(o => o.stripeCustomerId)
          .filter((id): id is string => !!id)
      ));

      let invoiced = 0;
      const errors: string[] = [];

      for (const customerId of uniqueCustomers) {
        try {
          await stripeService.createAndPayInvoice(customerId);
          invoiced++;
        } catch (err: any) {
          // "Nothing to invoice" is not an error
          if (err.message?.includes("Nothing to invoice")) continue;
          errors.push(`${customerId}: ${err.message}`);
        }
      }

      res.json({ invoiced, errors: errors.length > 0 ? errors : undefined });
    } catch (error) {
      console.error("Error collecting invoices:", error);
      res.status(500).json({ error: "Failed to collect invoices" });
    }
  });

  // ============ JOB AGGREGATION ============

  // POST /api/admin/aggregation/run — trigger a full aggregation cycle
  app.post("/api/admin/aggregation/run", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { runAggregation } = await import("./services/job-aggregator");
      const { skipAiFilter, sources } = req.body || {};

      const { jobs: aggregatedJobsList, stats } = await runAggregation({
        skipAiFilter,
        sources,
      });

      // Save to DB (upsert by externalId)
      let saved = 0;
      for (const job of aggregatedJobsList) {
        try {
          await db
            .insert(aggregatedJobs)
            .values({
              externalId: job.externalId,
              source: job.source,
              title: job.title,
              company: job.company,
              location: job.location,
              city: job.city,
              state: job.state,
              country: job.country,
              description: job.description,
              applyUrl: job.applyUrl,
              salary: job.salary,
              employmentType: job.employmentType,
              category: job.category,
              logoUrl: job.logoUrl,
              remote: job.remote,
              postedAt: job.postedAt,
              isActive: true,
            })
            .onConflictDoUpdate({
              target: aggregatedJobs.externalId,
              set: {
                title: job.title,
                description: job.description,
                salary: job.salary,
                isActive: true,
                fetchedAt: new Date(),
              },
            });
          saved++;
        } catch (err: any) {
          // Skip duplicates silently
          if (!err.message?.includes("duplicate")) {
            console.error("[aggregation] Save error:", err.message);
          }
        }
      }

      stats.saved = saved;
      res.json(stats);
    } catch (error) {
      console.error("Aggregation error:", error);
      res.status(500).json({ error: "Aggregation failed" });
    }
  });

  // GET /api/admin/aggregation/stats — aggregation stats
  app.get("/api/admin/aggregation/stats", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const [totalResult] = await db
        .select({ count: count() })
        .from(aggregatedJobs);
      const [activeResult] = await db
        .select({ count: count() })
        .from(aggregatedJobs)
        .where(eq(aggregatedJobs.isActive, true));

      const sourceCounts = await db
        .select({ source: aggregatedJobs.source, count: count() })
        .from(aggregatedJobs)
        .where(eq(aggregatedJobs.isActive, true))
        .groupBy(aggregatedJobs.source);

      res.json({
        total: totalResult?.count || 0,
        active: activeResult?.count || 0,
        bySource: Object.fromEntries(sourceCounts.map(s => [s.source, s.count])),
      });
    } catch (error) {
      console.error("Aggregation stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ============ ADMIN META ADS MANAGEMENT ============

  // GET /api/admin/meta/settings — return masked platform settings
  app.get("/api/admin/meta/settings", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { getMaskedPlatformSettings } = await import("./services/platformSettings");
      const settings = await getMaskedPlatformSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching meta settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // PUT /api/admin/meta/settings — save platform settings
  app.put("/api/admin/meta/settings", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { setPlatformSetting } = await import("./services/platformSettings");
      const userId = getUserId(req) || "admin";
      const {
        appId, appSecret, accessToken, adAccountId,
        pageId, defaultBudget, maxBudget, markupPercent,
      } = req.body;

      const updates: Array<{ key: string; value: string; description: string }> = [];

      if (appId !== undefined) updates.push({ key: "meta_app_id", value: appId, description: "Meta App ID" });
      if (appSecret !== undefined) updates.push({ key: "meta_app_secret", value: appSecret, description: "Meta App Secret" });
      if (accessToken !== undefined) updates.push({ key: "meta_access_token", value: accessToken, description: "Meta System User Access Token" });
      if (adAccountId !== undefined) updates.push({ key: "meta_ad_account_id", value: adAccountId, description: "Meta Ad Account ID (act_XXX)" });
      if (pageId !== undefined) updates.push({ key: "meta_page_id", value: pageId, description: "Krew Recruiter Facebook Page ID" });
      if (defaultBudget !== undefined) updates.push({ key: "meta_default_daily_budget_cents", value: String(Math.round(defaultBudget * 100)), description: "Default daily budget in cents" });
      if (maxBudget !== undefined) updates.push({ key: "meta_max_daily_budget_cents", value: String(Math.round(maxBudget * 100)), description: "Max daily budget in cents" });
      if (markupPercent !== undefined) updates.push({ key: "meta_platform_markup_percent", value: String(markupPercent), description: "Platform markup percentage on ad spend" });

      for (const { key, value, description } of updates) {
        if (value) {
          await setPlatformSetting(key, value, userId, description);
        }
      }

      res.json({ success: true, updated: updates.length });
    } catch (error) {
      console.error("Error saving meta settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // GET /api/admin/meta/test — verify Meta API connection
  app.get("/api/admin/meta/test", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const { getMetaCredentials } = await import("./services/platformSettings");
      const creds = await getMetaCredentials();

      // Test the token by calling the Graph API
      const meRes = await fetch(
        `https://graph.facebook.com/v19.0/${creds.adAccountId}?fields=name,account_status,currency&access_token=${creds.accessToken}`
      );
      const meData = await meRes.json() as any;

      if (meData.error) {
        return res.json({
          valid: false,
          error: meData.error.message,
        });
      }

      // Also fetch page name if pageId is set
      let pageName = "";
      if (creds.pageId) {
        try {
          const pageRes = await fetch(
            `https://graph.facebook.com/v19.0/${creds.pageId}?fields=name&access_token=${creds.accessToken}`
          );
          const pageData = await pageRes.json() as any;
          pageName = pageData.name || "";
        } catch {}
      }

      res.json({
        valid: true,
        adAccountName: meData.name,
        adAccountStatus: meData.account_status,
        currency: meData.currency,
        pageName,
      });
    } catch (error: any) {
      res.json({
        valid: false,
        error: error.message || "Meta ads not configured",
      });
    }
  });

  // GET /api/admin/meta/campaigns — list all active campaigns across all orgs
  app.get("/api/admin/meta/campaigns", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const allCampaigns = await db
        .select({
          id: campaigns.id,
          orgId: campaigns.orgId,
          title: campaigns.title,
          status: campaigns.status,
          dailyBudgetCents: campaigns.dailyBudgetCents,
          totalSpentCents: campaigns.totalSpentCents,
          location: campaigns.location,
          createdAt: campaigns.createdAt,
          activatedAt: campaigns.activatedAt,
          orgName: organizations.name,
        })
        .from(campaigns)
        .leftJoin(organizations, eq(campaigns.orgId, organizations.id))
        .orderBy(desc(campaigns.createdAt));

      res.json(allCampaigns);
    } catch (error) {
      console.error("Error fetching admin campaigns:", error);
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  // POST /api/admin/meta/campaigns/:id/pause — admin force pause
  app.post("/api/admin/meta/campaigns/:id/pause", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const id = (req.params as Record<string, string>).id as string;
      await db.update(campaigns).set({ status: "paused" } as any).where(eq(campaigns.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing campaign:", error);
      res.status(500).json({ error: "Failed to pause campaign" });
    }
  });

  // POST /api/admin/meta/campaigns/:id/resume — admin resume
  app.post("/api/admin/meta/campaigns/:id/resume", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      const id = (req.params as Record<string, string>).id as string;
      await db.update(campaigns).set({ status: "active" } as any).where(eq(campaigns.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error resuming campaign:", error);
      res.status(500).json({ error: "Failed to resume campaign" });
    }
  });

  // POST /api/admin/meta/campaigns/pause-all — emergency pause all active campaigns
  app.post("/api/admin/meta/campaigns/pause-all", isAuthenticated, requireSuperAdmin, async (req, res) => {
    try {
      await db
        .update(campaigns)
        .set({ status: "paused" } as any)
        .where(eq(campaigns.status, "active"));
      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing all campaigns:", error);
      res.status(500).json({ error: "Failed to pause all campaigns" });
    }
  });

  // GET /api/meta/configured — public check for employers (no credentials exposed)
  app.get("/api/meta/configured", requireAuth, async (req, res) => {
    try {
      const { isMetaConfiguredFromDB } = await import("./services/platformSettings");
      const configured = await isMetaConfiguredFromDB();
      res.json({ configured });
    } catch {
      res.json({ configured: false });
    }
  });

  return httpServer;
}
