export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
    area: string[];
  };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_type?: string;
  contract_time?: string;
  created: string;
  redirect_url: string;
  category: {
    label: string;
    tag: string;
  };
}

export interface AdzunaSearchResult {
  results: AdzunaJob[];
  count: number;
  mean: number;
}

export interface ExternalJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  contractType?: string;
  contractTime?: string;
  postedAt: string;
  applyUrl: string;
  source: "adzuna";
  category: string;
}

interface CacheEntry {
  data: ExternalJob[];
  timestamp: number;
  totalCount: number;
}

class AdzunaService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDurationMs = 30 * 60 * 1000; // 30 minutes cache

  private get appId(): string | undefined {
    return process.env.ADZUNA_APP_ID;
  }

  private get appKey(): string | undefined {
    return process.env.ADZUNA_APP_KEY;
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appKey);
  }

  private getCacheKey(params: {
    query: string;
    location: string;
    page: number;
    resultsPerPage: number;
  }): string {
    return `${params.query}:${params.location}:${params.page}:${params.resultsPerPage}`;
  }

  private transformJob(job: AdzunaJob): ExternalJob {
    return {
      id: job.id,
      title: job.title,
      company: job.company?.display_name || "Unknown Company",
      location: job.location?.display_name || "Location not specified",
      description: job.description || "",
      salaryMin: job.salary_min,
      salaryMax: job.salary_max,
      contractType: job.contract_type,
      contractTime: job.contract_time,
      postedAt: job.created,
      applyUrl: job.redirect_url,
      source: "adzuna",
      category: job.category?.label || "Hospitality",
    };
  }

  async searchJobs(params: {
    query?: string;
    location?: string;
    page?: number;
    resultsPerPage?: number;
  }): Promise<{ jobs: ExternalJob[]; totalCount: number }> {
    if (!this.isConfigured()) {
      console.warn("Adzuna API not configured - missing ADZUNA_APP_ID or ADZUNA_APP_KEY");
      return { jobs: [], totalCount: 0 };
    }

    const query = params.query || "restaurant hospitality";
    const location = params.location || "";
    const page = params.page || 1;
    const resultsPerPage = Math.min(params.resultsPerPage || 20, 50);

    const cacheKey = this.getCacheKey({ query, location, page, resultsPerPage });
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDurationMs) {
      return { jobs: cached.data, totalCount: cached.totalCount };
    }

    try {
      const baseUrl = "https://api.adzuna.com/v1/api/jobs/us/search";
      const searchParams = new URLSearchParams({
        app_id: this.appId!,
        app_key: this.appKey!,
        results_per_page: resultsPerPage.toString(),
        what: query,
        content_type: "application/json",
      });

      if (location) {
        searchParams.append("where", location);
      }

      // Filter for hospitality/food service categories
      searchParams.append("category", "hospitality-catering-jobs");

      const url = `${baseUrl}/${page}?${searchParams.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Adzuna API error:", response.status, errorText);
        throw new Error(`Adzuna API error: ${response.status}`);
      }

      const data = await response.json() as AdzunaSearchResult;
      const jobs = (data.results || []).map(job => this.transformJob(job));
      const totalCount = data.count || 0;

      // Cache the results
      this.cache.set(cacheKey, {
        data: jobs,
        timestamp: Date.now(),
        totalCount,
      });

      return { jobs, totalCount };
    } catch (error) {
      console.error("Error fetching jobs from Adzuna:", error);
      
      // Return cached data if available (even if stale)
      if (cached) {
        return { jobs: cached.data, totalCount: cached.totalCount };
      }
      
      return { jobs: [], totalCount: 0 };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const adzunaService = new AdzunaService();
