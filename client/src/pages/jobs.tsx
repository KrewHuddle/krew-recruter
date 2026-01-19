import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/lib/tenant-context";
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  DollarSign,
  Users,
  Star,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import type { Job, Location, SponsoredCampaign } from "@shared/schema";

type JobWithRelations = Job & {
  location?: Location;
  _count?: { applications: number };
  sponsoredCampaign?: SponsoredCampaign | null;
};

export default function Jobs() {
  const { currentTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: jobs, isLoading } = useQuery<JobWithRelations[]>({
    queryKey: ["/api/jobs", currentTenant?.id],
    enabled: !!currentTenant,
  });

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.role.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to manage jobs
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage job postings for {currentTenant.name}
          </p>
        </div>
        <Link href="/app/jobs/new">
          <Button className="gap-2" data-testid="button-create-job">
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-jobs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-job-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs && filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link key={job.id} href={`/app/jobs/${job.id}`}>
              <Card
                className="overflow-visible hover-elevate cursor-pointer transition-all"
                data-testid={`job-card-${job.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        {job.sponsoredCampaign &&
                          job.sponsoredCampaign.status === "ACTIVE" && (
                            <Badge className="bg-secondary text-secondary-foreground gap-1">
                              <Star className="h-3 w-3" />
                              Sponsored
                            </Badge>
                          )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {job.role}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location.name}
                          </span>
                        )}
                        {(job.payRangeMin || job.payRangeMax) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {job.payRangeMin && job.payRangeMax
                              ? `$${job.payRangeMin} - $${job.payRangeMax}`
                              : job.payRangeMin
                              ? `$${job.payRangeMin}+`
                              : `Up to $${job.payRangeMax}`}
                            /hr
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {job._count?.applications || 0} applicants
                        </span>
                      </div>
                      {job.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {job.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{job.jobType.replace("_", " ")}</Badge>
                        {job.scheduleTags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          job.status === "PUBLISHED"
                            ? "default"
                            : job.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {job.status}
                      </Badge>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search || statusFilter !== "all" ? "No jobs found" : "No jobs yet"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first job posting to start receiving applications"}
            </p>
            {!search && statusFilter === "all" && (
              <Link href="/app/jobs/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Job
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
