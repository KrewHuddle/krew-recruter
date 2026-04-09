/**
 * Job Aggregator
 *
 * Pulls hospitality jobs from multiple free external sources,
 * filters them, deduplicates, and returns clean results.
 *
 * Sources:
 * 1. Adzuna API (free tier, 250 calls/day)
 * 2. Arbeitnow (free, no key needed)
 * 3. The Muse API (free, no key needed)
 */

import { quickFilter, aiFilter } from "./job-filter";

export interface AggregatedJob {
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  city: string;
  state: string;
  country: string;
  description: string;
  applyUrl: string;
  salary: string | null;
  employmentType: string;
  postedAt: Date;
  category: string | null;
  logoUrl: string | null;
  remote: boolean;
}

// ============ SOURCE 1: Adzuna ============

async function fetchAdzuna(): Promise<AggregatedJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.log("[aggregator] Adzuna not configured, skipping");
    return [];
  }

  const searches = ["restaurant", "chef", "bartender", "server", "hotel", "line cook"];
  const allJobs: AggregatedJob[] = [];

  for (const query of searches) {
    try {
      const url =
        `https://api.adzuna.com/v1/api/jobs/us/search/1?` +
        `app_id=${appId}&app_key=${appKey}` +
        `&results_per_page=20&what=${encodeURIComponent(query)}` +
        `&category=hospitality-catering-jobs` +
        `&content-type=application/json`;

      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as any;

      for (const job of data.results || []) {
        allJobs.push({
          externalId: `adzuna_${job.id}`,
          source: "adzuna",
          title: job.title || "",
          company: job.company?.display_name || "Unknown",
          location: job.location?.display_name || "",
          city: job.location?.area?.[3] || "",
          state: job.location?.area?.[2] || "",
          country: "US",
          description: job.description || "",
          applyUrl: job.redirect_url || "",
          salary: job.salary_min
            ? `$${Math.round(job.salary_min)}-$${Math.round(job.salary_max)}/yr`
            : null,
          employmentType: job.contract_time === "part_time" ? "Part-time" : "Full-time",
          postedAt: new Date(job.created),
          category: job.category?.label || null,
          logoUrl: null,
          remote: false,
        });
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[aggregator] Adzuna "${query}" failed:`, err);
    }
  }

  return allJobs;
}

// ============ SOURCE 2: Arbeitnow ============

async function fetchArbeitnow(): Promise<AggregatedJob[]> {
  try {
    console.log("[aggregator] Fetching Arbeitnow...");
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api");
    if (!res.ok) return [];
    const data = (await res.json()) as any;

    return (data.data || []).map((job: any) => ({
      externalId: `arbeitnow_${job.slug}`,
      source: "arbeitnow",
      title: job.title || "",
      company: job.company_name || "",
      location: job.location || "",
      city: job.location?.split(",")[0]?.trim() || "",
      state: job.location?.split(",")[1]?.trim() || "",
      country: "US",
      description: (job.description || "").replace(/<[^>]*>/g, ""),
      applyUrl: job.url || "",
      salary: null,
      employmentType: job.job_types?.[0] || "Full-time",
      postedAt: new Date((job.created_at || 0) * 1000),
      category: job.tags?.[0] || null,
      logoUrl: null,
      remote: !!job.remote,
    }));
  } catch (err) {
    console.error("[aggregator] Arbeitnow failed:", err);
    return [];
  }
}

// ============ SOURCE 3: The Muse ============

async function fetchTheMuse(): Promise<AggregatedJob[]> {
  try {
    console.log("[aggregator] Fetching The Muse...");
    const res = await fetch(
      "https://www.themuse.com/api/public/jobs?" +
        "category=Food+%26+Hospitality&" +
        "category=Restaurant+%26+Food+Service&" +
        "page=1&descending=true"
    );
    if (!res.ok) return [];
    const data = (await res.json()) as any;

    return (data.results || []).map((job: any) => ({
      externalId: `muse_${job.id}`,
      source: "the_muse",
      title: job.name || "",
      company: job.company?.name || "",
      location: job.locations?.[0]?.name || "United States",
      city: job.locations?.[0]?.name?.split(",")[0]?.trim() || "",
      state: job.locations?.[0]?.name?.split(",")[1]?.trim() || "",
      country: "US",
      description: (job.contents || "").replace(/<[^>]*>/g, ""),
      applyUrl: job.refs?.landing_page || "",
      employmentType: job.levels?.[0]?.name || "Full-time",
      postedAt: new Date(job.publication_date),
      salary: null,
      category: null,
      logoUrl: job.company?.refs?.logo_image || null,
      remote: job.locations?.[0]?.name?.includes("Flexible") || false,
    }));
  } catch (err) {
    console.error("[aggregator] TheMuse failed:", err);
    return [];
  }
}

// ============ MAIN AGGREGATION ============

function deduplicateJobs(jobs: AggregatedJob[]): AggregatedJob[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    // Dedupe by externalId
    if (seen.has(job.externalId)) return false;
    // Also dedupe by title+company combo (cross-source dupes)
    const key = `${job.title.toLowerCase().trim()}_${job.company.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(job.externalId);
    seen.add(key);
    return true;
  });
}

export interface AggregationResult {
  total: number;
  filtered: number;
  saved: number;
  sources: Record<string, number>;
  errors: string[];
}

/**
 * Run a full aggregation cycle:
 * 1. Pull from all sources
 * 2. Quick-filter by keywords
 * 3. AI-filter batches for accuracy
 * 4. Deduplicate
 * 5. Return clean results
 */
export async function runAggregation(options?: {
  skipAiFilter?: boolean;
  sources?: string[];
}): Promise<{ jobs: AggregatedJob[]; stats: AggregationResult }> {
  const enabledSources = options?.sources || ["adzuna", "arbeitnow", "the_muse"];
  const errors: string[] = [];
  const sourceCounts: Record<string, number> = {};

  console.log("[aggregator] Starting aggregation from:", enabledSources.join(", "));

  // 1. Pull from all sources in parallel
  const fetchers: Promise<AggregatedJob[]>[] = [];
  if (enabledSources.includes("adzuna")) fetchers.push(fetchAdzuna());
  if (enabledSources.includes("arbeitnow")) fetchers.push(fetchArbeitnow());
  if (enabledSources.includes("the_muse")) fetchers.push(fetchTheMuse());

  const results = await Promise.allSettled(fetchers);
  let allJobs: AggregatedJob[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allJobs = allJobs.concat(result.value);
      const source = enabledSources[i];
      sourceCounts[source] = result.value.length;
    } else {
      errors.push(`${enabledSources[i]}: ${result.reason}`);
    }
  });

  const totalRaw = allJobs.length;
  console.log(`[aggregator] Pulled ${totalRaw} raw jobs`);

  // 2. Quick keyword filter
  let filtered = allJobs.filter((job) => quickFilter(job));
  console.log(`[aggregator] After keyword filter: ${filtered.length}/${totalRaw}`);

  // 3. AI filter (in batches of 20)
  if (!options?.skipAiFilter && filtered.length > 0) {
    const aiFiltered: AggregatedJob[] = [];
    const batchSize = 20;

    for (let i = 0; i < filtered.length; i += batchSize) {
      const batch = filtered.slice(i, i + batchSize);
      try {
        const aiResults = await aiFilter(batch);
        for (const result of aiResults) {
          if (result.isHospitality && result.confidence >= 0.7) {
            const job = batch[result.index];
            if (job) {
              job.category = result.category;
              aiFiltered.push(job);
            }
          }
        }
      } catch (err) {
        // On AI failure, keep all keyword-filtered jobs
        aiFiltered.push(...batch);
        errors.push(`AI filter batch ${i}: ${err}`);
      }
    }

    filtered = aiFiltered;
    console.log(`[aggregator] After AI filter: ${filtered.length}`);
  }

  // 4. Deduplicate
  const deduped = deduplicateJobs(filtered);
  console.log(`[aggregator] After dedup: ${deduped.length}`);

  return {
    jobs: deduped,
    stats: {
      total: totalRaw,
      filtered: deduped.length,
      saved: 0, // Updated by caller after DB insert
      sources: sourceCounts,
      errors,
    },
  };
}
