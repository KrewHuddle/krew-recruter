import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant-context";
import {
  Briefcase,
  ArrowLeft,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Star,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  Send,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { JobAdBooster } from "@/components/JobAdBooster";
import type { Job, Location, Application, JobDistributionChannel, IntegrationConnection } from "@shared/schema";

type JobWithDetails = Job & {
  location?: Location;
  applications?: Application[];
};

const DISTRIBUTION_PROVIDERS = [
  { id: "INDEED", name: "Indeed", description: "World's largest job site" },
  { id: "ZIPRECRUITER", name: "ZipRecruiter", description: "Millions of job seekers" },
  { id: "AGGREGATOR", name: "Aggregator Feed", description: "XML/JSON feed for aggregators" },
];

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const { data: job, isLoading: jobLoading } = useQuery<JobWithDetails>({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: !!jobId && !!currentTenant,
  });

  const { data: channels, isLoading: channelsLoading } = useQuery<JobDistributionChannel[]>({
    queryKey: [`/api/jobs/${jobId}/distribution`],
    enabled: !!jobId && !!currentTenant,
  });

  const { data: integrations } = useQuery<IntegrationConnection[]>({
    queryKey: ["/api/integrations"],
    enabled: !!currentTenant,
  });

  const distributeMutation = useMutation({
    mutationFn: async (provider: string) => {
      return apiRequest("POST", `/api/jobs/${jobId}/distribute`, { provider });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/distribution`] });
      toast({ title: "Job posted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to post job", 
        description: error?.message || "Check your integration settings",
        variant: "destructive" 
      });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async ({ channelId, status }: { channelId: string; status: string }) => {
      return apiRequest("PATCH", `/api/jobs/${jobId}/distribution/${channelId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/distribution`] });
      toast({ title: "Distribution updated" });
    },
    onError: () => {
      toast({ title: "Failed to update distribution", variant: "destructive" });
    },
  });

  const removeChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return apiRequest("DELETE", `/api/jobs/${jobId}/distribution/${channelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/distribution`] });
      toast({ title: "Distribution removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove distribution", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/jobs/${jobId}`, { status: "PUBLISHED" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}`] });
      toast({ title: "Job published successfully" });
    },
    onError: () => {
      toast({ title: "Failed to publish job", variant: "destructive" });
    },
  });

  const getChannelForProvider = (providerId: string) => {
    return channels?.find(c => c.provider === providerId);
  };

  const hasActiveIntegration = (providerId: string) => {
    return integrations?.some(i => i.provider === providerId && i.status === "active");
  };

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Select an organization to view jobs</p>
      </div>
    );
  }

  if (jobLoading) {
    return (
      <div className="flex-1 space-y-6 p-6 lg:p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Job not found</h3>
        <Link href="/app/jobs">
          <Button variant="outline">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Link href="/app/jobs">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
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
          <p className="text-muted-foreground">{job.role}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {job.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{job.location.name}</span>
                  </div>
                )}
                {(job.payRangeMin || job.payRangeMax) && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {job.payRangeMin && job.payRangeMax
                        ? `$${job.payRangeMin} - $${job.payRangeMax}/hr`
                        : job.payRangeMin
                        ? `$${job.payRangeMin}+/hr`
                        : `Up to $${job.payRangeMax}/hr`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{job.jobType.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{job.applications?.length || 0} applicants</span>
                </div>
              </div>

              {job.scheduleTags && job.scheduleTags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Schedule</h4>
                  <div className="flex flex-wrap gap-2">
                    {job.scheduleTags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {job.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Ad Booster */}
          {job.status === "PUBLISHED" && (
            <JobAdBooster job={job} tenantName={currentTenant?.name} />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Job Board Distribution
              </CardTitle>
              <CardDescription>
                Post this job to external job boards to reach more candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {job.status !== "PUBLISHED" ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Job must be published first</p>
                    <p className="text-sm text-muted-foreground">
                      Publish this job to enable distribution to external job boards
                    </p>
                  </div>
                  <Button
                    onClick={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    data-testid="button-publish-job"
                  >
                    {publishMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Publish Now
                  </Button>
                </div>
              ) : channelsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {DISTRIBUTION_PROVIDERS.map((provider) => {
                    const channel = getChannelForProvider(provider.id);
                    const hasIntegration = hasActiveIntegration(provider.id);
                    const isPosted = !!channel;
                    const isActive = channel?.status === "ACTIVE";
                    const isPaused = channel?.status === "PAUSED";

                    return (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                        data-testid={`distribution-${provider.id.toLowerCase()}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold ${
                            isActive 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : isPaused
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {provider.name[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{provider.name}</span>
                              {isActive && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                              {isPaused && (
                                <Badge variant="secondary" className="text-xs">
                                  Paused
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {!hasIntegration 
                                ? "Not connected - configure in Settings"
                                : provider.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasIntegration ? (
                            <Link href="/app/settings">
                              <Button variant="outline" size="sm">
                                Connect
                              </Button>
                            </Link>
                          ) : !isPosted ? (
                            <Button
                              size="sm"
                              onClick={() => distributeMutation.mutate(provider.id)}
                              disabled={distributeMutation.isPending}
                              data-testid={`button-post-${provider.id.toLowerCase()}`}
                            >
                              {distributeMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1" />
                                  Post
                                </>
                              )}
                            </Button>
                          ) : (
                            <>
                              {isActive ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateChannelMutation.mutate({ 
                                    channelId: channel.id, 
                                    status: "PAUSED" 
                                  })}
                                  disabled={updateChannelMutation.isPending}
                                  title="Pause"
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateChannelMutation.mutate({ 
                                    channelId: channel.id, 
                                    status: "ACTIVE" 
                                  })}
                                  disabled={updateChannelMutation.isPending}
                                  title="Resume"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeChannelMutation.mutate(channel.id)}
                                disabled={removeChannelMutation.isPending}
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Applicants</span>
                <span className="font-semibold">{job.applications?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Posted to Boards</span>
                <span className="font-semibold">
                  {channels?.filter(c => c.status === "ACTIVE").length || 0}
                </span>
              </div>
              {job.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="font-semibold text-sm">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/app/applicants?job=${job.id}`}>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Users className="h-4 w-4" />
                  View Applicants
                </Button>
              </Link>
              <Button className="w-full justify-start gap-2" variant="outline" disabled>
                <Star className="h-4 w-4" />
                Sponsor Job (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
