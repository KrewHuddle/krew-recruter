/**
 * Meta (Facebook/Instagram) ads routes.
 *
 * Extracted from server/routes.ts where these routes lived inline as part
 * of the 4800+ line registerRoutes function. Behavior is unchanged — all
 * paths, middleware chains, response shapes, and DB access patterns are
 * identical to the inline versions. The extraction exists purely for
 * discoverability and reviewability; routes.ts was long enough that
 * finding and auditing the Meta flow required line-number navigation.
 *
 * Exports a default Router that the main routes.ts mounts at `/api` via
 *     app.use("/api", metaAdsRouter);
 * so the paths inside this file are relative (e.g. `/meta/campaign`
 * rather than `/api/meta/campaign`). Matches the convention of
 * server/campaignRoutes.ts.
 *
 * Route inventory (as mounted):
 *     POST   /api/meta/campaign              — create + (optionally) launch
 *     POST   /api/meta/campaign/:id/activate — resume paused
 *     POST   /api/meta/campaign/:id/pause    — pause active
 *     DELETE /api/meta/campaign/:id          — soft-delete
 *     GET    /api/meta/campaign/:id/stats    — live insights from Meta
 *     GET    /api/meta/campaigns             — list (filterable by jobId)
 *     GET    /api/meta/status                — is Meta configured?
 *     GET    /api/meta/configured            — public-ish config check
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { jobAdCampaigns } from "@shared/schema";
import { storage } from "./storage";
import { isAuthenticated } from "./customAuth";
import { requireAuth } from "./jwtAuth";
import { requireTenant, requireRole } from "./middleware/tenantAuth";
import { requirePlan } from "./middleware/requirePlan";
import { geocodeAddress, getSmartRadius } from "./services/talent-pool";
import * as metaAds from "./services/meta-ads";
import { getMetaCredentials, isMetaConfiguredFromDB } from "./services/platformSettings";

const router = Router();

// Budget validation has three precedence layers:
//   1. Zod ceiling (this schema): guards against garbage / negative /
//      typo input. $1-$10,000/day absolute range. Catches obvious abuse
//      and type errors regardless of platform configuration.
//   2. Platform default (meta_default_daily_budget_cents): used when
//      the client omits dailyBudgetUSD entirely. Configurable by the
//      platform admin via the admin UI.
//   3. Per-deployment policy ceiling (meta_max_daily_budget_cents):
//      enforced in the route handler below against the resolved value.
//      Configurable by the platform admin, defaults to $100/day.
//
// dailyBudgetUSD is OPTIONAL — when omitted, the handler falls back to
// the platform default. When provided, it must satisfy the Zod range
// constraints.
const createMetaCampaignBodySchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
  dailyBudgetUSD: z
    .number({ invalid_type_error: "dailyBudgetUSD must be a number" })
    .positive("dailyBudgetUSD must be greater than zero")
    .min(1, "dailyBudgetUSD must be at least $1/day")
    .max(10000, "dailyBudgetUSD exceeds the $10,000/day absolute ceiling")
    .optional(),
  radius: z
    .number()
    .int()
    .positive()
    .max(50, "radius cannot exceed 50 miles (Meta maximum)")
    .optional(),
});

// Helper to safely extract string param from Express 5 params where the
// type is widened to `string | string[]`. Previously defined inline in
// routes.ts.
const paramStr = (val: string | string[]): string =>
  Array.isArray(val) ? val[0] : val;

// ─────────────────────────────────────────────────────────────────────
// POST /api/meta/campaign — create a Meta ad campaign for a job
// ─────────────────────────────────────────────────────────────────────
router.post(
  "/meta/campaign",
  isAuthenticated,
  requireTenant,
  requirePlan("PRO", "ENTERPRISE"),
  requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
  async (req, res) => {
    try {
      const tenantId = (req as any).tenantId;

      // Validate request shape. The previous truthy-only check let strings,
      // negatives, and astronomical numbers pass straight through to the
      // Meta API, which would happily accept e.g. dailyBudgetUSD: 999999
      // and create a $999,999/day ad set.
      const parsed = createMetaCampaignBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        });
      }
      const { jobId } = parsed.data;
      const radiusOverride = parsed.data.radius;

      // Fetch the job
      const job = await storage.getJob(jobId);
      if (!job || job.tenantId !== tenantId) {
        return res.status(404).json({ error: "Job not found" });
      }

      // Pre-fetch Meta credentials ONCE — used for both the default-
      // budget fallback below and the per-deployment max enforcement
      // further down.
      let metaCreds: { defaultDailyBudgetCents: number; maxDailyBudgetCents: number } | null = null;
      try {
        metaCreds = await getMetaCredentials();
      } catch {
        // Meta not configured — credentials throw, we just save a draft
        metaCreds = null;
      }

      // Resolve the daily budget. Precedence:
      //   1. Explicit client value (already Zod-validated above)
      //   2. Platform admin default (meta_default_daily_budget_cents)
      //   3. Schema column default ($10/day) when Meta isn't configured
      //      at all and there are no credentials to read a default from
      let dailyBudgetUSD = parsed.data.dailyBudgetUSD;
      if (dailyBudgetUSD === undefined) {
        dailyBudgetUSD = metaCreds
          ? metaCreds.defaultDailyBudgetCents / 100
          : 10;
      }

      // Re-validate the resolved value. Zod's constraints applied only
      // to the explicit-value path; the fallback bypassed them, so we
      // defensively re-check the same $1-$10,000/day range here.
      if (dailyBudgetUSD < 1 || dailyBudgetUSD > 10000) {
        return res.status(400).json({
          error: `Resolved daily budget of $${dailyBudgetUSD.toFixed(
            2
          )} is outside the $1-$10,000/day range. Check the meta_default_daily_budget_cents setting in the admin UI.`,
        });
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

      if (metaCreds) {
        // Per-deployment policy ceiling using the credentials we
        // already fetched above (no second DB call).
        const requestedCents = Math.round(dailyBudgetUSD * 100);
        if (requestedCents > metaCreds.maxDailyBudgetCents) {
          return res.status(400).json({
            error: `Daily budget of $${dailyBudgetUSD} exceeds the platform maximum of $${(
              metaCreds.maxDailyBudgetCents / 100
            ).toFixed(2)}/day. Contact support if you need a higher cap.`,
          });
        }

        metaResult = await metaAds.createJobCampaign(
          {
            jobId: job.id,
            jobTitle: job.title,
            companyName: tenant?.name || "Restaurant",
            location: locationStr,
            latitude: lat,
            longitude: lng,
            radius: radiusOverride || smartRadius,
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

// ─────────────────────────────────────────────────────────────────────
// POST /api/meta/campaign/:id/activate — resume a paused campaign
// ─────────────────────────────────────────────────────────────────────
// NOTE: plan-gated like create — preventing a downgraded tenant from
// resuming an old paused campaign and accruing fresh ad spend. Pause and
// delete are intentionally NOT plan-gated so users can always stop spending.
router.post(
  "/meta/campaign/:id/activate",
  isAuthenticated,
  requireTenant,
  requirePlan("PRO", "ENTERPRISE"),
  requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
  async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const id = paramStr(req.params.id);

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

// ─────────────────────────────────────────────────────────────────────
// POST /api/meta/campaign/:id/pause — pause an active campaign
// ─────────────────────────────────────────────────────────────────────
router.post(
  "/meta/campaign/:id/pause",
  isAuthenticated,
  requireTenant,
  requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
  async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const id = paramStr(req.params.id);

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

// ─────────────────────────────────────────────────────────────────────
// DELETE /api/meta/campaign/:id — soft-delete a campaign
// ─────────────────────────────────────────────────────────────────────
router.delete(
  "/meta/campaign/:id",
  isAuthenticated,
  requireTenant,
  requireRole("OWNER", "ADMIN", "HIRING_MANAGER"),
  async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const id = paramStr(req.params.id);

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

// ─────────────────────────────────────────────────────────────────────
// GET /api/meta/campaign/:id/stats — live insights from Meta + persist
// ─────────────────────────────────────────────────────────────────────
router.get(
  "/meta/campaign/:id/stats",
  isAuthenticated,
  requireTenant,
  async (req, res) => {
    try {
      const tenantId = (req as any).tenantId as string;
      const id = paramStr(req.params.id);

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

// ─────────────────────────────────────────────────────────────────────
// GET /api/meta/campaigns — list campaigns for a tenant (or one job)
// ─────────────────────────────────────────────────────────────────────
router.get(
  "/meta/campaigns",
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

// ─────────────────────────────────────────────────────────────────────
// GET /api/meta/status — is Meta configured? (session-auth)
// ─────────────────────────────────────────────────────────────────────
router.get("/meta/status", isAuthenticated, async (_req, res) => {
  res.json({ configured: await metaAds.isMetaConfigured() });
});

// ─────────────────────────────────────────────────────────────────────
// GET /api/meta/configured — public-ish config check (JWT-auth via
// campaign engine). Previously lived orphaned far from the other Meta
// routes in routes.ts around line 4931.
// ─────────────────────────────────────────────────────────────────────
router.get("/meta/configured", requireAuth, async (_req, res) => {
  try {
    const configured = await isMetaConfiguredFromDB();
    res.json({ configured });
  } catch {
    res.json({ configured: false });
  }
});

export default router;
