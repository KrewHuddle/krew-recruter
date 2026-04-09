import { Router, Request, Response } from "express";
import { db } from "./db";
import {
  campaigns, adCreatives, screeningQuestions, applicants,
  campaignSpend, organizations, orgBranding, orgMembers,
  type InsertCampaign, type InsertAdCreative, type InsertScreeningQuestion,
  type InsertApplicant,
} from "@shared/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requireAuth, requireOrg } from "./jwtAuth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

const router = Router();

// ============ CAMPAIGNS ============

// GET /api/campaigns — list campaigns for org
router.get("/campaigns", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const statusFilter = req.query.status as string;

    let query = db.select().from(campaigns).where(eq(campaigns.orgId, orgId)).orderBy(desc(campaigns.createdAt));

    const results = await query;

    // Filter by status if provided (and not 'all')
    const filtered = statusFilter && statusFilter !== "all"
      ? results.filter(c => c.status === statusFilter)
      : results;

    // Get applicant counts per campaign
    const campaignIds = filtered.map(c => c.id);
    const applicantCounts = campaignIds.length > 0
      ? await db.select({
          campaignId: applicants.campaignId,
          count: count(),
        })
          .from(applicants)
          .where(sql`${applicants.campaignId} = ANY(${campaignIds})`)
          .groupBy(applicants.campaignId)
      : [];

    const countMap = Object.fromEntries(applicantCounts.map(a => [a.campaignId, a.count]));

    res.json(filtered.map(c => ({
      ...c,
      applicantCount: countMap[c.id] || 0,
    })));
  } catch (error) {
    console.error("List campaigns error:", error);
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

// POST /api/campaigns — create campaign manually
router.post("/campaigns", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { title, location, employmentType, payMin, payMax, payPeriod, description, requirements, benefits } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Job title is required" });
    }

    // Fetch org branding for logo/colors
    const [branding] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    const [campaign] = await db.insert(campaigns).values({
      orgId,
      title,
      location,
      employmentType,
      payMin,
      payMax,
      payPeriod: payPeriod || "hr",
      description,
      requirements: requirements || [],
      benefits: benefits || [],
      status: "draft",
    }).returning();

    // Generate ad creative via Claude
    const adData = await generateAdCreative(campaign);
    if (adData) {
      await db.insert(adCreatives).values({
        campaignId: campaign.id,
        headline: adData.headline,
        subheadline: adData.subheadline,
        bulletPoints: adData.bullet_points,
        payDisplay: adData.pay_display,
        benefitsDisplay: adData.benefits_display,
        cta: adData.cta || "Apply Now",
      });

      // Save screening questions
      if (adData.screening_questions?.length) {
        await db.insert(screeningQuestions).values(
          adData.screening_questions.map((q: any, i: number) => ({
            campaignId: campaign.id,
            question: q.question,
            type: q.type,
            options: q.options || null,
            disqualifyingAnswer: q.disqualifying_answer || null,
            sortOrder: q.sort_order || i + 1,
          }))
        );
      }
    }

    res.json(campaign);
  } catch (error) {
    console.error("Create campaign error:", error);
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// POST /api/campaigns/import-url — scrape URL and create campaign
router.post("/campaigns/import-url", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Fetch the page HTML
    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });
      html = await response.text();
    } catch {
      return res.status(400).json({ error: "Failed to fetch the URL. Please check the link and try again." });
    }

    console.log("[import-url] Fetched HTML:", html.length, "chars from", url);

    // Extract job data via Claude
    const extractedData = await extractJobFromHtml(html);
    if (!extractedData) {
      return res.status(400).json({ error: "Could not extract job details from that page. Try a direct job listing URL (not a search page)." });
    }

    // Create campaign from extracted data
    const [campaign] = await db.insert(campaigns).values({
      orgId,
      title: extractedData.title || "Untitled Position",
      location: extractedData.location,
      employmentType: normalizeEmploymentType(extractedData.employment_type),
      payMin: extractedData.pay_min,
      payMax: extractedData.pay_max,
      payPeriod: extractedData.pay_period || "hr",
      description: extractedData.description,
      requirements: extractedData.requirements || [],
      benefits: extractedData.benefits || [],
      sourceUrl: url,
      status: "draft",
    }).returning();

    // Generate ad creative
    const adData = await generateAdCreative(campaign);
    if (adData) {
      await db.insert(adCreatives).values({
        campaignId: campaign.id,
        headline: adData.headline,
        subheadline: adData.subheadline,
        bulletPoints: adData.bullet_points,
        payDisplay: adData.pay_display,
        benefitsDisplay: adData.benefits_display,
        cta: adData.cta || "Apply Now",
      });

      if (adData.screening_questions?.length) {
        await db.insert(screeningQuestions).values(
          adData.screening_questions.map((q: any, i: number) => ({
            campaignId: campaign.id,
            question: q.question,
            type: q.type,
            options: q.options || null,
            disqualifyingAnswer: q.disqualifying_answer || null,
            sortOrder: q.sort_order || i + 1,
          }))
        );
      }
    }

    res.json(campaign);
  } catch (error) {
    console.error("Import URL error:", error);
    res.status(500).json({ error: "Failed to import job from URL" });
  }
});

// GET /api/campaigns/:id — get campaign with creative + stats
router.get("/campaigns/:id", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId)));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const creatives = await db.select().from(adCreatives)
      .where(eq(adCreatives.campaignId, id));

    const questions = await db.select().from(screeningQuestions)
      .where(eq(screeningQuestions.campaignId, id))
      .orderBy(screeningQuestions.sortOrder);

    const [stats] = await db.select({
      totalApplicants: count(),
    }).from(applicants).where(eq(applicants.campaignId, id));

    res.json({
      ...campaign,
      adCreatives: creatives,
      screeningQuestions: questions,
      totalApplicants: stats?.totalApplicants || 0,
    });
  } catch (error) {
    console.error("Get campaign error:", error);
    res.status(500).json({ error: "Failed to get campaign" });
  }
});

// PATCH /api/campaigns/:id — update campaign
router.patch("/campaigns/:id", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const [existing] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId)));

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const allowedFields = [
      "title", "location", "employmentType", "payMin", "payMax",
      "payPeriod", "description", "requirements", "benefits",
    ];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const [updated] = await db.update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update campaign error:", error);
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// PATCH /api/campaigns/:id/status — update campaign status
router.patch("/campaigns/:id/status", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "active", "paused", "filled", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [existing] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId)));

    if (!existing) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const updates: Record<string, any> = { status };
    if (status === "active" && !existing.activatedAt) {
      updates.activatedAt = new Date();
    }
    if (status === "filled") {
      updates.filledAt = new Date();
    }

    const [updated] = await db.update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update campaign status" });
  }
});

// PATCH /api/campaigns/:id/budget — update daily budget
router.patch("/campaigns/:id/budget", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;
    const { dailyBudgetCents } = req.body;

    if (!dailyBudgetCents || dailyBudgetCents < 1000 || dailyBudgetCents > 20000) {
      return res.status(400).json({ error: "Daily budget must be between $10 and $200" });
    }

    const [updated] = await db.update(campaigns)
      .set({ dailyBudgetCents })
      .where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

// DELETE /api/campaigns/:id
router.delete("/campaigns/:id", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const [deleted] = await db.delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete campaign error:", error);
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// ============ AD CREATIVES ============

// PATCH /api/campaigns/:id/creative — update ad creative
router.patch("/campaigns/:id/creative", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { headline, subheadline, bulletPoints, payDisplay, benefitsDisplay, cta } = req.body;

    const [creative] = await db.select().from(adCreatives)
      .where(and(eq(adCreatives.campaignId, id), eq(adCreatives.isActive, true)))
      .limit(1);

    if (!creative) {
      return res.status(404).json({ error: "Ad creative not found" });
    }

    const updates: Record<string, any> = {};
    if (headline !== undefined) updates.headline = headline;
    if (subheadline !== undefined) updates.subheadline = subheadline;
    if (bulletPoints !== undefined) updates.bulletPoints = bulletPoints;
    if (payDisplay !== undefined) updates.payDisplay = payDisplay;
    if (benefitsDisplay !== undefined) updates.benefitsDisplay = benefitsDisplay;
    if (cta !== undefined) updates.cta = cta;

    const [updated] = await db.update(adCreatives)
      .set(updates)
      .where(eq(adCreatives.id, creative.id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Update creative error:", error);
    res.status(500).json({ error: "Failed to update ad creative" });
  }
});

// POST /api/campaigns/:id/regenerate — regenerate ad creative
router.post("/campaigns/:id/regenerate", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.orgId, orgId)));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Deactivate old creatives
    await db.update(adCreatives)
      .set({ isActive: false })
      .where(eq(adCreatives.campaignId, id));

    // Generate new creative
    const adData = await generateAdCreative(campaign);
    if (!adData) {
      return res.status(500).json({ error: "Failed to generate ad creative" });
    }

    const [creative] = await db.insert(adCreatives).values({
      campaignId: campaign.id,
      headline: adData.headline,
      subheadline: adData.subheadline,
      bulletPoints: adData.bullet_points,
      payDisplay: adData.pay_display,
      benefitsDisplay: adData.benefits_display,
      cta: adData.cta || "Apply Now",
    }).returning();

    res.json(creative);
  } catch (error) {
    console.error("Regenerate creative error:", error);
    res.status(500).json({ error: "Failed to regenerate ad creative" });
  }
});

// ============ APPLICANTS ============

// GET /api/applicants — list applicants for org
router.get("/applicants", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const statusFilter = req.query.status as string;
    const campaignId = req.query.campaign_id as string;

    let conditions = [eq(applicants.orgId, orgId)];
    if (statusFilter) {
      conditions.push(eq(applicants.status, statusFilter as any));
    }
    if (campaignId) {
      conditions.push(eq(applicants.campaignId, campaignId));
    }

    const results = await db.select({
      applicant: applicants,
      campaignTitle: campaigns.title,
    })
      .from(applicants)
      .innerJoin(campaigns, eq(applicants.campaignId, campaigns.id))
      .where(and(...conditions))
      .orderBy(desc(applicants.appliedAt));

    res.json(results.map(r => ({
      ...r.applicant,
      campaignTitle: r.campaignTitle,
    })));
  } catch (error) {
    console.error("List applicants error:", error);
    res.status(500).json({ error: "Failed to list applicants" });
  }
});

// GET /api/applicants/:id — get applicant detail
router.get("/applicants/:id", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;

    const [result] = await db.select({
      applicant: applicants,
      campaignTitle: campaigns.title,
    })
      .from(applicants)
      .innerJoin(campaigns, eq(applicants.campaignId, campaigns.id))
      .where(and(eq(applicants.id, id), eq(applicants.orgId, orgId)));

    if (!result) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    res.json({
      ...result.applicant,
      campaignTitle: result.campaignTitle,
    });
  } catch (error) {
    console.error("Get applicant error:", error);
    res.status(500).json({ error: "Failed to get applicant" });
  }
});

// PATCH /api/applicants/:id — update applicant status/notes
router.patch("/applicants/:id", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { id } = req.params;
    const { status, notes, interviewScheduledAt } = req.body;

    const updates: Record<string, any> = {};
    if (status) {
      updates.status = status;
      updates.reviewedAt = new Date();
    }
    if (notes !== undefined) updates.notes = notes;
    if (interviewScheduledAt) updates.interviewScheduledAt = new Date(interviewScheduledAt);

    const [updated] = await db.update(applicants)
      .set(updates)
      .where(and(eq(applicants.id, id), eq(applicants.orgId, orgId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Update applicant error:", error);
    res.status(500).json({ error: "Failed to update applicant" });
  }
});

// ============ DASHBOARD ============

// GET /api/dashboard/campaign-stats — dashboard analytics
router.get("/dashboard/campaign-stats", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;

    const [totalApplicants] = await db.select({ count: count() })
      .from(applicants)
      .where(eq(applicants.orgId, orgId));

    const orgCampaigns = await db.select()
      .from(campaigns)
      .where(eq(campaigns.orgId, orgId));

    const totalSpent = orgCampaigns.reduce((sum, c) => sum + (c.totalSpentCents || 0), 0);
    const totalCount = totalApplicants?.count || 0;
    const avgCostPerApplicant = totalCount > 0 ? totalSpent / totalCount : 0;

    const activeCampaignsCount = orgCampaigns.filter(c => c.status === "active").length;

    // Monthly data from campaign_spend
    const spendData = await db.select({
      month: sql<string>`to_char(${campaignSpend.date}, 'YYYY-MM')`,
      totalApplicants: sql<number>`SUM(${campaignSpend.applicantsCount})`,
      totalSpendCents: sql<number>`SUM(${campaignSpend.spendCents})`,
    })
      .from(campaignSpend)
      .innerJoin(campaigns, eq(campaignSpend.campaignId, campaigns.id))
      .where(eq(campaigns.orgId, orgId))
      .groupBy(sql`to_char(${campaignSpend.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${campaignSpend.date}, 'YYYY-MM')`);

    res.json({
      totalApplicants: totalCount,
      avgCostPerApplicant: Math.round(avgCostPerApplicant) / 100,
      activeCampaignsCount,
      totalSpentCents: totalSpent,
      monthlyData: spendData,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

// ============ ORG BRANDING ============

// GET /api/org/branding
router.get("/org/branding", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const [branding] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    res.json(branding || null);
  } catch (error) {
    console.error("Get branding error:", error);
    res.status(500).json({ error: "Failed to get branding" });
  }
});

// PATCH /api/org/branding
router.patch("/org/branding", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { name, website, logoUrl, coverPhotoUrl, primaryColor, accentColor, glassdoorRating } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (website !== undefined) updates.website = website;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (coverPhotoUrl !== undefined) updates.coverPhotoUrl = coverPhotoUrl;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (accentColor !== undefined) updates.accentColor = accentColor;
    if (glassdoorRating !== undefined) updates.glassdoorRating = glassdoorRating;

    const [existing] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    let result;
    if (existing) {
      [result] = await db.update(orgBranding)
        .set(updates)
        .where(eq(orgBranding.orgId, orgId))
        .returning();
    } else {
      [result] = await db.insert(orgBranding).values({
        orgId,
        ...updates,
      }).returning();
    }

    res.json(result);
  } catch (error) {
    console.error("Update branding error:", error);
    res.status(500).json({ error: "Failed to update branding" });
  }
});

// PUT /api/org/branding (alias for PATCH — client sends PUT)
router.put("/org/branding", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { name, website, logoUrl, coverUrl, coverPhotoUrl, primaryColor, accentColor, glassdoorRating } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (website !== undefined) updates.website = website;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (coverUrl !== undefined) updates.coverPhotoUrl = coverUrl;
    if (coverPhotoUrl !== undefined) updates.coverPhotoUrl = coverPhotoUrl;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (accentColor !== undefined) updates.accentColor = accentColor;
    if (glassdoorRating !== undefined) updates.glassdoorRating = glassdoorRating;

    const [existing] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    let result;
    if (existing) {
      [result] = await db.update(orgBranding)
        .set(updates)
        .where(eq(orgBranding.orgId, orgId))
        .returning();
    } else {
      [result] = await db.insert(orgBranding).values({
        orgId,
        ...updates,
      }).returning();
    }

    res.json(result);
  } catch (error) {
    console.error("Update branding error:", error);
    res.status(500).json({ error: "Failed to update branding" });
  }
});

// PUT /api/org/settings (alias used by campaign-settings page)
router.put("/org/settings", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { name, primaryColor, logoUrl } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;

    const [existing] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    let result;
    if (existing) {
      [result] = await db.update(orgBranding)
        .set(updates)
        .where(eq(orgBranding.orgId, orgId))
        .returning();
    } else {
      [result] = await db.insert(orgBranding).values({
        orgId,
        ...updates,
      }).returning();
    }

    res.json(result);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ============ ORG FILE UPLOADS ============

const logoUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, GIF, and WebP images are allowed"));
    }
  },
  storage: multer.memoryStorage(),
});

// POST /api/org/logo — upload org logo
router.post("/org/logo", requireAuth, requireOrg, logoUpload.single("file"), async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const ext = path.extname(file.originalname) || ".png";
    const filename = `${orgId}-logo-${Date.now()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "uploads", "org-logos");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), file.buffer);

    const url = `/uploads/org-logos/${filename}`;

    // Save to branding record
    const [existing] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    if (existing) {
      await db.update(orgBranding)
        .set({ logoUrl: url, updatedAt: new Date() })
        .where(eq(orgBranding.orgId, orgId));
    } else {
      await db.insert(orgBranding).values({ orgId, logoUrl: url });
    }

    res.json({ url });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload logo" });
  }
});

// POST /api/org/cover — upload org cover photo
router.post("/org/cover", requireAuth, requireOrg, logoUpload.single("file"), async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const ext = path.extname(file.originalname) || ".png";
    const filename = `${orgId}-cover-${Date.now()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "uploads", "org-covers");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, filename), file.buffer);

    const url = `/uploads/org-covers/${filename}`;

    // Save to branding record
    const [existing] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, orgId));

    if (existing) {
      await db.update(orgBranding)
        .set({ coverPhotoUrl: url, updatedAt: new Date() })
        .where(eq(orgBranding.orgId, orgId));
    } else {
      await db.insert(orgBranding).values({ orgId, coverPhotoUrl: url });
    }

    res.json({ url });
  } catch (error: any) {
    console.error("Cover upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload cover" });
  }
});

// ============ ORG MEMBERS ============

// GET /api/org/members
router.get("/org/members", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const members = await db.select()
      .from(orgMembers)
      .where(eq(orgMembers.orgId, orgId));
    res.json(members);
  } catch (error) {
    console.error("List members error:", error);
    res.status(500).json({ error: "Failed to list members" });
  }
});

// POST /api/org/members/invite
router.post("/org/members/invite", requireAuth, requireOrg, async (req: Request, res: Response) => {
  try {
    const orgId = req.orgId!;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // TODO: Send invite email, for now just create the membership
    res.json({ success: true, message: "Invite sent" });
  } catch (error) {
    console.error("Invite member error:", error);
    res.status(500).json({ error: "Failed to invite member" });
  }
});

// ============ PUBLIC APPLY ROUTES ============

// GET /api/apply/:campaignId — get campaign info + screening questions (public)
router.get("/apply/:campaignId", async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, "active")));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found or not active" });
    }

    const questions = await db.select().from(screeningQuestions)
      .where(eq(screeningQuestions.campaignId, campaignId))
      .orderBy(screeningQuestions.sortOrder);

    const [branding] = await db.select().from(orgBranding)
      .where(eq(orgBranding.orgId, campaign.orgId));

    res.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        location: campaign.location,
        employmentType: campaign.employmentType,
        payMin: campaign.payMin,
        payMax: campaign.payMax,
        payPeriod: campaign.payPeriod,
      },
      screeningQuestions: questions,
      branding: branding || null,
    });
  } catch (error) {
    console.error("Get apply page error:", error);
    res.status(500).json({ error: "Failed to load application" });
  }
});

// POST /api/apply/:campaignId — submit application (public)
router.post("/apply/:campaignId", async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { firstName, lastName, email, phone, location, screeningResponses, passedScreening } = req.body;

    const [campaign] = await db.select().from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const [applicant] = await db.insert(applicants).values({
      campaignId,
      orgId: campaign.orgId,
      firstName,
      lastName,
      email,
      phone,
      location,
      screeningResponses,
      passedScreening: passedScreening ?? true,
      disqualifiedReason: passedScreening === false ? "Did not pass screening" : null,
      status: "unreviewed",
    }).returning();

    // TODO: Send notification email to org recruiter via SendGrid

    res.json({ success: true, applicant });
  } catch (error) {
    console.error("Submit application error:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// ============ AI HELPERS ============

function stripHtmlToText(html: string): string {
  // Remove script, style, nav, footer, header tags and their content
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "");
  // Replace tags with spaces, collapse whitespace
  text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.substring(0, 8000);
}

async function extractJobFromHtml(html: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[import-url] ANTHROPIC_API_KEY not set");
    return null;
  }

  const cleanText = stripHtmlToText(html);
  if (cleanText.length < 50) {
    console.error("[import-url] Page text too short after stripping:", cleanText.length);
    return null;
  }

  try {
    console.log("[import-url] Calling Claude API with", cleanText.length, "chars of text");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You are a job posting parser. Extract structured data from job posting text and return ONLY valid JSON. No markdown, no backticks, no explanation — just the JSON object.`,
        messages: [{
          role: "user",
          content: `Extract job details from this text and return as JSON with these exact keys:
{
  "title": string,
  "location": string,
  "employment_type": string,
  "pay_min": number or null,
  "pay_max": number or null,
  "pay_period": "hr" or "year",
  "description": string (2-3 sentences),
  "requirements": string[] (max 5),
  "benefits": string[] (max 5)
}

Text from job posting page:
${cleanText}`,
        }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[import-url] Claude API error:", response.status, errBody);
      return null;
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      console.error("[import-url] No text in Claude response:", JSON.stringify(data).substring(0, 300));
      return null;
    }

    // Strip markdown code fences if present
    const jsonStr = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    console.log("[import-url] Claude returned:", jsonStr.substring(0, 200));

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[import-url] Claude extraction error:", error);
    return null;
  }
}

async function generateAdCreative(campaign: any): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set, returning default creative");
    // Return a default creative so the flow still works without API key
    return {
      headline: `HIRING ${(campaign.title || "").toUpperCase()}`,
      subheadline: `${campaign.location || "Location TBD"} | ${campaign.employmentType || "Full-time"}`,
      bullet_points: campaign.requirements?.slice(0, 3) || ["Experience required"],
      pay_display: campaign.payMin && campaign.payMax
        ? `$${campaign.payMin} - $${campaign.payMax} / ${campaign.payPeriod === "year" ? "Yr" : "Hr"}`
        : "Competitive Pay",
      benefits_display: campaign.benefits?.slice(0, 3) || ["Great team environment"],
      cta: "Apply Now",
      screening_questions: [
        { question: `Do you have experience as a ${campaign.title}?`, type: "yes_no", options: null, disqualifying_answer: "No", sort_order: 1 },
        { question: "Are you available to start within 2 weeks?", type: "yes_no", options: null, disqualifying_answer: "No", sort_order: 2 },
        { question: "Are you available to work weekends?", type: "yes_no", options: null, disqualifying_answer: null, sort_order: 3 },
      ],
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are an expert social media recruiter specializing in restaurants and hospitality. You write high-converting Facebook and Instagram job ads for independent restaurants. Your ads are punchy, specific, and highlight the 2-3 strongest selling points. Always highlight pay, schedule, and notable benefits. Keep it short — workers see this on their phone for 2 seconds. Return ONLY valid JSON. No markdown, no backticks, no explanation text.`,
        messages: [{
          role: "user",
          content: `Generate a Facebook job ad for this position:

Title: ${campaign.title}
Location: ${campaign.location || "TBD"}
Employment Type: ${campaign.employmentType || "Full-time"}
Pay: $${campaign.payMin || "?"}–$${campaign.payMax || "?"}/${campaign.payPeriod || "hr"}
Requirements: ${(campaign.requirements || []).join(", ") || "None specified"}
Benefits: ${(campaign.benefits || []).join(", ") || "None specified"}
Description: ${campaign.description || "None provided"}

Return JSON in this exact format:
{
  "headline": "HIRING [ROLE NAME]",
  "subheadline": "[City, State] | [Type]",
  "bullet_points": ["[2-3 key requirements]"],
  "pay_display": "$[min] - $[max] / Hr",
  "benefits_display": ["[up to 3 benefits]"],
  "cta": "Apply Now",
  "screening_questions": [
    {
      "question": "[question text]",
      "type": "yes_no",
      "options": null,
      "disqualifying_answer": "[answer or null]",
      "sort_order": 1
    }
  ]
}

Generate 4-5 screening questions relevant to the ${campaign.title} role. For kitchen roles: experience, weekend availability, certifications. For FOH roles: customer service, alcohol certifications. For management: team size, P&L experience.`,
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch (error) {
    console.error("Claude ad generation error:", error);
    return null;
  }
}

function normalizeEmploymentType(type: string | null | undefined): any {
  if (!type) return null;
  const normalized = type.toLowerCase().trim();
  if (normalized.includes("full")) return "Full-time";
  if (normalized.includes("part")) return "Part-time";
  if (normalized.includes("season")) return "Seasonal";
  if (normalized.includes("per diem") || normalized.includes("contract")) return "Per Diem";
  return null;
}

export default router;
