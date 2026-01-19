import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useTenant } from "@/lib/tenant-context";
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  MapPin,
  Calendar,
} from "lucide-react";
import type { Job, Application, GigPost, Location } from "@shared/schema";

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  newApplicants: number;
  openGigs: number;
  pendingAssignments: number;
}

export default function Dashboard() {
  const { currentTenant } = useTenant();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!currentTenant,
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    enabled: !!currentTenant,
  });

  const { data: recentApplicants, isLoading: applicantsLoading } = useQuery<
    (Application & { job?: Job })[]
  >({
    queryKey: ["/api/applications"],
    enabled: !!currentTenant,
  });

  const { data: upcomingGigs, isLoading: gigsLoading } = useQuery<
    (GigPost & { location?: Location })[]
  >({
    queryKey: ["/api/gigs"],
    enabled: !!currentTenant,
  });

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-2xl font-semibold">Welcome to Krew Recruiter</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Create or join an organization to start managing your hospitality
          hiring.
        </p>
        <Link href="/app/settings?tab=create-org">
          <Button data-testid="button-create-first-org">
            Create Your First Organization
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your hiring activity at {currentTenant.name}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/gigs/new">
            <Button variant="outline" className="gap-2" data-testid="button-post-gig">
              <Clock className="h-4 w-4" />
              Post Gig
            </Button>
          </Link>
          <Link href="/app/jobs/new">
            <Button className="gap-2" data-testid="button-create-job">
              <Plus className="h-4 w-4" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Jobs
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalJobs || 0} total jobs
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Applicants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.totalApplicants || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.newApplicants || 0} new this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Gigs
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.openGigs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingAssignments || 0} pending approvals
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hiring Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">24%</div>
                <p className="text-xs text-muted-foreground">
                  +5% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Jobs</CardTitle>
            <Link href="/app/jobs">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-jobs">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : recentJobs && recentJobs.length > 0 ? (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <Link key={job.id} href={`/app/jobs/${job.id}`}>
                    <div
                      className="flex items-center gap-4 rounded-lg p-2 -mx-2 hover-elevate cursor-pointer"
                      data-testid={`job-item-${job.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{job.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {job.role}
                        </div>
                      </div>
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
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No jobs yet</p>
                <Link href="/app/jobs/new">
                  <Button variant="ghost" size="sm" className="mt-2 text-primary">
                    Create your first job
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Applicants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Recent Applicants</CardTitle>
            <Link href="/app/applicants">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-applicants">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {applicantsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : recentApplicants && recentApplicants.length > 0 ? (
              <div className="space-y-4">
                {recentApplicants.map((app) => (
                  <Link key={app.id} href={`/app/applications/${app.id}`}>
                    <div
                      className="flex items-center gap-4 rounded-lg p-2 -mx-2 hover-elevate cursor-pointer"
                      data-testid={`applicant-item-${app.id}`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground font-medium">
                        {app.workerUserId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          Applicant {app.workerUserId.slice(0, 8)}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {app.job?.title || "Job"}
                        </div>
                      </div>
                      <Badge variant="secondary">{app.stage}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No applicants yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish jobs to start receiving applications
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Gigs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Upcoming Gig Shifts</CardTitle>
            <Link href="/app/gigs">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-all-gigs">
                View all
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {gigsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-lg border border-border p-4">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-32 mb-3" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : upcomingGigs && upcomingGigs.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingGigs.map((gig) => (
                  <Link key={gig.id} href={`/app/gigs/${gig.id}`}>
                    <div
                      className="rounded-lg border border-border p-4 hover-elevate cursor-pointer"
                      data-testid={`gig-item-${gig.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium">{gig.role}</span>
                        {gig.emergency && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3.5 w-3.5" />
                        {gig.location?.name || "Location TBD"}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {gig.startAt
                          ? new Date(gig.startAt).toLocaleDateString()
                          : "TBD"}
                      </div>
                      <div className="mt-3 text-lg font-semibold text-primary">
                        ${gig.payRate}/hr
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No upcoming gigs
                </p>
                <Link href="/app/gigs/new">
                  <Button variant="ghost" size="sm" className="mt-2 text-primary">
                    Post your first gig
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
