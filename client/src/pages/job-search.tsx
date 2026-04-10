import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  Bookmark,
  BookmarkCheck,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import type { Job, Location as LocationType, Tenant } from "@shared/schema";
import logoImage from "@assets/3_1768835575859.png";

type JobWithDetails = Job & {
  location: LocationType | null;
  tenant: Tenant | null;
};

const jobTypes = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
];

const schedules = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Weekdays",
  "Weekends",
];

type SavedJob = {
  id: string;
  jobId: string;
  userId: string;
  savedAt: string;
};

export default function JobSearch() {
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const params = new URLSearchParams(searchParams);
  const initialQuery = params.get("q") || "";
  const initialLocation = params.get("location") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [locationQuery, setLocationQuery] = useState(initialLocation);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: jobsResponse, isLoading } = useQuery<{ jobs: any[] } | any[]>({
    queryKey: ["/api/jobs/public", searchQuery, locationQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (locationQuery) params.set("city", locationQuery);
      params.set("limit", "50");
      const res = await fetch(`/api/jobs/public?${params.toString()}`);
      if (!res.ok) return { jobs: [] };
      return res.json();
    },
  });

  // Handle both old format (array) and new format ({ jobs: [] })
  const jobs: any[] = Array.isArray(jobsResponse) ? jobsResponse : (jobsResponse as any)?.jobs || [];

  const { data: savedJobsData } = useQuery<SavedJob[]>({
    queryKey: ["/api/saved-jobs"],
    enabled: isAuthenticated,
  });

  const savedJobIds = new Set(savedJobsData?.map((s) => s.jobId) || []);

  const saveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("POST", "/api/saved-jobs", { jobId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      toast({ title: "Job saved", description: "Added to your saved jobs" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save job", variant: "destructive" });
    },
  });

  const unsaveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      return apiRequest("DELETE", `/api/saved-jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-jobs"] });
      toast({ title: "Job removed", description: "Removed from saved jobs" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove job", variant: "destructive" });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set("q", searchQuery);
    if (locationQuery) newParams.set("location", locationQuery);
    setLocation(`/jobs?${newParams.toString()}`);
  };

  const toggleSave = (jobId: string) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (savedJobIds.has(jobId)) {
      unsaveJobMutation.mutate(jobId);
    } else {
      saveJobMutation.mutate(jobId);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleSchedule = (schedule: string) => {
    setSelectedSchedules((prev) =>
      prev.includes(schedule)
        ? prev.filter((s) => s !== schedule)
        : [...prev, schedule]
    );
  };

  // Normalize job data — handle both old tenant format and new aggregated format
  const normalizedJobs = (jobs || []).map((job: any) => ({
    ...job,
    companyName: job.tenant?.name || job.company || "Company",
    cityName: job.location?.city || job.city || "",
    stateName: job.location?.state || job.state || "",
    typeLabel: job.jobType === "FULL_TIME" ? "Full-time" : job.jobType === "PART_TIME" ? "Part-time" : job.employmentType || "Full-time",
    payDisplay: job.payRangeMin ? `$${job.payRangeMin}${job.payRangeMax ? `-$${job.payRangeMax}` : ""}/hr` : job.salary || null,
    applyLink: job.applyUrl || `/jobs/${job.id}`,
  }));

  const filteredJobs = normalizedJobs.filter((job: any) => {
    if (selectedTypes.length > 0) {
      const typeMatch = selectedTypes.some(t =>
        t === job.jobType || job.typeLabel?.toUpperCase().replace(/[- ]/g, "_").includes(t)
      );
      if (!typeMatch) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={logoImage} alt="Krew Recruiter" className="h-9 w-9 rounded-lg object-contain" data-testid="img-logo-nav" />
              <span className="text-xl font-semibold">Krew</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jobs">
              <span className="text-sm font-medium cursor-pointer">
                Find Jobs
              </span>
            </Link>
            <Link href="/gigs">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Gig Shifts
              </span>
            </Link>
            <Link href="/employers">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                For Employers
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/login">
              <Button variant="ghost" data-testid="button-login">
                Sign in
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Job title or keyword"
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-job-search"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="City or state"
                className="pl-9"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                data-testid="input-location-search"
              />
            </div>
            <Button type="submit" data-testid="button-search">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              className="sm:hidden gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <aside className={`w-64 shrink-0 ${showFilters ? "block" : "hidden"} md:block`}>
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Job Type</h3>
                <div className="space-y-2">
                  {jobTypes.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={type.value}
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={() => toggleType(type.value)}
                      />
                      <Label htmlFor={type.value} className="cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Schedule</h3>
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div key={schedule} className="flex items-center gap-2">
                      <Checkbox
                        id={schedule}
                        checked={selectedSchedules.includes(schedule)}
                        onCheckedChange={() => toggleSchedule(schedule)}
                      />
                      <Label htmlFor={schedule} className="cursor-pointer">
                        {schedule}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {(selectedTypes.length > 0 || selectedSchedules.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTypes([]);
                    setSelectedSchedules([]);
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {isLoading ? (
                  "Searching..."
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {filteredJobs?.length || 0}
                    </span>{" "}
                    jobs found
                    {searchQuery && (
                      <>
                        {" "}for "<span className="font-medium">{searchQuery}</span>"
                      </>
                    )}
                  </>
                )}
              </p>
            </div>

            {(selectedTypes.length > 0 || selectedSchedules.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="gap-1">
                    {jobTypes.find((t) => t.value === type)?.label}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleType(type)}
                    />
                  </Badge>
                ))}
                {selectedSchedules.map((schedule) => (
                  <Badge key={schedule} variant="secondary" className="gap-1">
                    {schedule}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleSchedule(schedule)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5">
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-32 mb-4" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredJobs && filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <Card key={job.id} className="hover-elevate transition-all" data-testid={`job-card-${job.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <a href={job.applyUrl || job.applyLink || `/jobs/${job.id}`} target={job.applyUrl ? "_blank" : undefined} rel={job.applyUrl ? "noopener noreferrer" : undefined}>
                            <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                              {job.title}
                            </h3>
                          </a>
                          <p className="text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="h-4 w-4" />
                            {job.companyName}
                          </p>
                        </div>
                        {isAuthenticated && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSave(job.id)}
                            disabled={saveJobMutation.isPending || unsaveJobMutation.isPending}
                            data-testid={`button-save-${job.id}`}
                          >
                            {savedJobIds.has(job.id) ? (
                              <BookmarkCheck className="h-5 w-5 text-primary" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {(job.cityName || job.stateName) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {[job.cityName, job.stateName].filter(Boolean).join(", ")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.typeLabel}
                        </span>
                        {job.payDisplay && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {job.payDisplay}
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                          {job.description}
                        </p>
                      )}

                      {job.scheduleTags && job.scheduleTags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {job.scheduleTags.map((tag: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "recently"}
                        </span>
                        {job.applyUrl ? (
                          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" data-testid={`button-apply-${job.id}`}>
                              Apply Now
                            </Button>
                          </a>
                        ) : (
                          <Link href={isAuthenticated ? `/jobs/${job.id}` : "/workers/signup"}>
                            <Button size="sm" data-testid={`button-apply-${job.id}`}>
                              Apply Now
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setLocationQuery("");
                      setSelectedTypes([]);
                      setSelectedSchedules([]);
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
