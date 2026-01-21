import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, DollarSign, Clock, Building2, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";

interface ExternalJob {
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
  source: string;
  category: string;
}

interface ExternalJobsResponse {
  jobs: ExternalJob[];
  totalCount: number;
  page: number;
  source: string;
  configured: boolean;
}

export default function ExternalJobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [page, setPage] = useState(1);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [submittedLocation, setSubmittedLocation] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery<ExternalJobsResponse>({
    queryKey: ["/api/external-jobs", { query: submittedQuery, location: submittedLocation, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (submittedQuery) params.append("query", submittedQuery);
      if (submittedLocation) params.append("location", submittedLocation);
      params.append("page", page.toString());
      params.append("limit", "20");
      
      const response = await fetch(`/api/external-jobs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSubmittedQuery(searchQuery);
    setSubmittedLocation(location);
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `From $${(min / 1000).toFixed(0)}k`;
    if (max) return `Up to $${(max / 1000).toFixed(0)}k`;
    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (!data?.configured && !isLoading) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle>External Jobs Not Configured</CardTitle>
            </div>
            <CardDescription>
              The external job aggregation feature requires API credentials to be set up.
              Please contact your administrator to configure the Adzuna integration.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Browse Restaurant Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Find hospitality jobs from across the web
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Job title, keyword, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="City, state, or zip code..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10"
            data-testid="input-location"
          />
        </div>
        <Button type="submit" disabled={isFetching} data-testid="button-search">
          Search Jobs
        </Button>
      </form>

      {data?.totalCount !== undefined && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.jobs.length} of {data.totalCount.toLocaleString()} jobs
          </p>
          <Badge variant="outline" className="gap-1">
            Powered by Adzuna
          </Badge>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or location
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.jobs.map((job) => (
            <Card key={job.id} className="hover-elevate transition-all" data-testid={`card-job-${job.id}`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 truncate" data-testid={`text-job-title-${job.id}`}>
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {job.company}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                      {formatSalary(job.salaryMin, job.salaryMax) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSalary(job.salaryMin, job.salaryMax)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(job.postedAt)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {job.contractTime && (
                        <Badge variant="secondary">
                          {job.contractTime === "full_time" ? "Full-time" : 
                           job.contractTime === "part_time" ? "Part-time" : job.contractTime}
                        </Badge>
                      )}
                      {job.contractType && (
                        <Badge variant="outline">
                          {job.contractType === "permanent" ? "Permanent" : 
                           job.contractType === "contract" ? "Contract" : job.contractType}
                        </Badge>
                      )}
                      <Badge variant="outline">{job.category}</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {job.description.replace(/<[^>]*>/g, '').substring(0, 250)}...
                    </p>
                  </div>
                  
                  <Button asChild data-testid={`button-apply-${job.id}`}>
                    <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                      Apply
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalCount > 20 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isFetching}
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(data.totalCount / 20)}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= data.totalCount || isFetching}
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
