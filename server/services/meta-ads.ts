/**
 * Meta Marketing API Service
 *
 * Handles all Meta (Facebook/Instagram) ad campaign operations.
 * Flow: Campaign -> Ad Set -> Ad Creative -> Ad
 *
 * Credentials are read from the platformSettings table (DB),
 * configured by super admins via /admin/meta.
 */

import { getMetaCredentials, type MetaCredentials } from "./platformSettings";

// Meta deprecates Graph API versions ~2 years after release. v19.0 reaches
// end-of-life on 2026-05-21; bumping to v22.0 (released 2025-01-21) gives the
// longest stable runway without jumping to a brand-new version. Bump again
// before late 2027.
const META_API_VERSION = "v22.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// Cached credentials — refreshed on each campaign operation
let _cachedCreds: MetaCredentials | null = null;

async function getConfig() {
  _cachedCreds = await getMetaCredentials();
  return _cachedCreds;
}

async function metaApiCall(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: Record<string, any>
): Promise<any> {
  const { accessToken } = await getConfig();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${META_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    const errorMsg =
      data?.error?.message || data?.error?.error_user_msg || "Meta API error";
    const errorCode = data?.error?.code || res.status;
    throw new Error(`Meta API error (${errorCode}): ${errorMsg}`);
  }

  return data;
}

// ============ Hospitality Interest Targeting ============

const HOSPITALITY_INTERESTS = [
  { id: "6003107902433", name: "Food and drink" },
  { id: "6003409935506", name: "Restaurants" },
  { id: "6003384497938", name: "Cooking" },
  { id: "6003020834693", name: "Hospitality" },
];

// ============ Public API ============

export interface MetaJobInput {
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // miles — overrides smart default if provided
  pay?: string;
  description?: string;
  applyUrl: string;
}

export interface MetaCampaignResult {
  metaCampaignId: string;
  metaAdSetId: string;
  metaCreativeId: string;
  metaAdId: string;
}

export interface MetaCampaignStats {
  impressions: number;
  clicks: number;
  spendCents: number;
  cpc: number;
}

/**
 * Creates a full Meta ad campaign for a job posting.
 * Makes 4 sequential API calls: Campaign -> Ad Set -> Creative -> Ad.
 * All created in PAUSED status — call activateCampaign() to go live.
 */
export async function createJobCampaign(
  job: MetaJobInput,
  dailyBudgetUSD: number
): Promise<MetaCampaignResult> {
  const { adAccountId, pageId } = await getConfig();
  const budgetCents = Math.round(dailyBudgetUSD * 100);

  // 1. Create Campaign
  const campaign = await metaApiCall(
    `/${adAccountId}/campaigns`,
    "POST",
    {
      name: `Krew - ${job.jobTitle} at ${job.companyName}`,
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: ["EMPLOYMENT"],
    }
  );

  const metaCampaignId = campaign.id;

  // 2. Create Ad Set with location + interest targeting
  const targeting: Record<string, any> = {
    interests: HOSPITALITY_INTERESTS,
  };

  if (job.latitude && job.longitude) {
    // Use provided radius or smart default (caller should set this)
    const adRadius = job.radius || 25;
    targeting.geo_locations = {
      custom_locations: [
        {
          latitude: job.latitude,
          longitude: job.longitude,
          radius: adRadius,
          distance_unit: "mile",
        },
      ],
    };
  } else if (job.location) {
    // Fallback: target by city name
    targeting.geo_locations = {
      cities: [{ key: job.location }],
    };
  }

  const adSet = await metaApiCall(
    `/${adAccountId}/adsets`,
    "POST",
    {
      name: `${job.jobTitle} AdSet`,
      campaign_id: metaCampaignId,
      daily_budget: budgetCents,
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting,
      start_time: new Date().toISOString(),
      status: "PAUSED",
    }
  );

  const metaAdSetId = adSet.id;

  // 3. Create Ad Creative
  const payLine = job.pay ? `\n\n✅ ${job.pay}` : "";
  const message = `🍽️ ${job.companyName} is hiring a ${job.jobTitle}!${payLine}\n📍 ${job.location}\n🎥 Apply with a 60-sec video interview\n\nTap to apply now 👇`;

  const creative = await metaApiCall(
    `/${adAccountId}/adcreatives`,
    "POST",
    {
      name: `${job.jobTitle} Creative`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          link: job.applyUrl,
          message,
          name: `Now Hiring: ${job.jobTitle}`,
          description: `Join ${job.companyName}. Apply in minutes.`,
          call_to_action: {
            type: "APPLY_NOW",
            value: { link: job.applyUrl },
          },
        },
      },
    }
  );

  const metaCreativeId = creative.id;

  // 4. Create Ad
  const ad = await metaApiCall(
    `/${adAccountId}/ads`,
    "POST",
    {
      name: `${job.jobTitle} Ad`,
      adset_id: metaAdSetId,
      creative: { creative_id: metaCreativeId },
      status: "PAUSED",
    }
  );

  const metaAdId = ad.id;

  return { metaCampaignId, metaAdSetId, metaCreativeId, metaAdId };
}

/**
 * Activates a paused campaign (sets campaign + ad set + ad to ACTIVE).
 */
export async function activateCampaign(metaCampaignId: string): Promise<void> {
  await metaApiCall(`/${metaCampaignId}`, "POST", { status: "ACTIVE" });
}

/**
 * Pauses an active campaign.
 */
export async function pauseCampaign(metaCampaignId: string): Promise<void> {
  await metaApiCall(`/${metaCampaignId}`, "POST", { status: "PAUSED" });
}

/**
 * Deletes a campaign (sets status to DELETED in Meta).
 */
export async function deleteCampaign(metaCampaignId: string): Promise<void> {
  await metaApiCall(`/${metaCampaignId}`, "DELETE");
}

/**
 * Fetches campaign performance stats from Meta Insights API.
 */
export async function getCampaignStats(
  metaCampaignId: string
): Promise<MetaCampaignStats> {
  try {
    const data = await metaApiCall(
      `/${metaCampaignId}/insights?fields=impressions,clicks,spend,cpc&date_preset=lifetime`
    );

    const insight = data?.data?.[0];
    if (!insight) {
      return { impressions: 0, clicks: 0, spendCents: 0, cpc: 0 };
    }

    return {
      impressions: parseInt(insight.impressions || "0", 10),
      clicks: parseInt(insight.clicks || "0", 10),
      spendCents: Math.round(parseFloat(insight.spend || "0") * 100),
      cpc: parseFloat(insight.cpc || "0"),
    };
  } catch {
    // If insights aren't available yet (new campaign), return zeros
    return { impressions: 0, clicks: 0, spendCents: 0, cpc: 0 };
  }
}

/**
 * Uploads an ad image to Meta and returns the image_hash.
 * Used when creating ad creatives with custom generated images.
 */
export async function uploadAdImage(
  imageBuffer: Buffer
): Promise<string> {
  const { accessToken, adAccountId } = await getConfig();

  const formData = new FormData();
  formData.append("filename", new Blob([imageBuffer], { type: "image/png" }), "ad-image.png");
  formData.append("access_token", accessToken);

  const res = await fetch(
    `${META_BASE_URL}/${adAccountId}/adimages`,
    { method: "POST", body: formData }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Meta image upload error: ${data?.error?.message || "Unknown error"}`);
  }

  // Response format: { images: { "ad-image.png": { hash: "..." } } }
  const images = data?.images;
  if (images) {
    const firstKey = Object.keys(images)[0];
    if (firstKey && images[firstKey].hash) {
      return images[firstKey].hash;
    }
  }

  throw new Error("Failed to get image hash from Meta upload response");
}

/**
 * Checks if Meta API credentials are configured (reads from DB).
 */
export async function isMetaConfigured(): Promise<boolean> {
  try {
    await getConfig();
    return true;
  } catch {
    return false;
  }
}
