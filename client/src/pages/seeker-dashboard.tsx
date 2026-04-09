import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Briefcase,
  Clock,
  FileText,
  MapPin,
  DollarSign,
  Building2,
  ArrowRight,
  Bell,
  Bookmark,
  CheckCircle2,
  Send,
  Eye,
  Calendar,
  TrendingUp,
  Loader2,
  ExternalLink,
  Wallet,
} from "lucide-react";
import type { Application, Job, WorkerProfile } from "@shared/schema";

type ApplicationWithJob = Application & {
  job: Job & { tenant?: { name: string } | null };
};

const stageLabels: Record<string, { label: string; color: string }> = {
  APPLIED: { label: "Applied", color: "bg-blue-500" },
  SCREENING: { label: "Screening", color: "bg-yellow-500" },
  INTERVIEW: { label: "Interview", color: "bg-purple-500" },
  OFFER: { label: "Offer", color: "bg-green-500" },
  HIRED: { label: "Hired", color: "bg-emerald-600" },
  REJECTED: { label: "Not Selected", color: "bg-gray-500" },
};

type PayoutAccount = {
  id: string;
  stripeAccountId: string | null;
  onboardingComplete: boolean;
  payoutsEnabled: boolean;
};

export default function SeekerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<WorkerProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: applications, isLoading: applicationsLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/applications/mine"],
  });

  const { data: savedJobs, isLoading: savedLoading } = useQuery<any[]>({
    queryKey: ["/api/saved-jobs"],
  });

  const { data: payoutAccount, isLoading: payoutLoading } = useQuery<PayoutAccount | null>({
    queryKey: ["/api/worker/payout-account"],
  });

  // Gig availability
  const { data: talentMe } = useQuery<{ isGigAvailable: boolean } | null>({
    queryKey: ["/api/talent/me"],
    retry: false,
  });

  const gigToggleMutation = useMutation({
    mutationFn: async (isGigAvailable: boolean) => {
      return apiRequest("PATCH", "/api/talent/me", { isGigAvailable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talent/me"] });
      toast({ title: "Gig availability updated" });
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/worker/payout-account/onboard", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "Failed to start payout setup", variant: "destructive" });
    },
  });

  const profileCompleteness = profile
    ? [
        profile.name,
        profile.headline,
        profile.city,
        profile.summary,
        profile.fohRoles?.length || profile.bohRoles?.length,
        profile.experienceYears,
      ].filter(Boolean).length * 16
    : 0;

  const activeApplications = applications?.filter(
    (app) => !["HIRED", "REJECTED"].includes(app.stage)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Track your applications and find your next opportunity
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs">
            <Button className="gap-2" data-testid="button-find-jobs">
              <Briefcase className="h-4 w-4" />
              Find Jobs
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{applications?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {applications?.filter((a) => a.stage === "SCREENING").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">In Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {applications?.filter((a) => a.stage === "INTERVIEW").length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Bookmark className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{savedJobs?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Saved Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gig Availability Toggle */}
      {talentMe !== undefined && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">I'm available for gig shifts</p>
                  <p className="text-sm text-muted-foreground">
                    {talentMe?.isGigAvailable
                      ? "Restaurants near you can find you for last-minute shifts"
                      : "Toggle on to get notified about gig opportunities near you"}
                  </p>
                </div>
              </div>
              <Switch
                checked={talentMe?.isGigAvailable || false}
                onCheckedChange={(checked) => gigToggleMutation.mutate(checked)}
                disabled={gigToggleMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
              <CardTitle>Active Applications</CardTitle>
              <Link href="/seeker/applications">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeApplications && activeApplications.length > 0 ? (
                <div className="space-y-4">
                  {activeApplications.slice(0, 5).map((app) => (
                    <div
                      key={app.id}
                      className="flex items-start gap-4 p-3 rounded-lg border border-border hover-elevate transition-all cursor-pointer"
                    >
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{app.job.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {app.job.tenant?.name || "Company"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="secondary"
                            className={`${stageLabels[app.stage]?.color} text-white text-xs`}
                          >
                            {stageLabels[app.stage]?.label || app.stage}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : "recently"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">No active applications yet</p>
                  <Link href="/jobs">
                    <Button>Start Applying</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
              <CardTitle>Recommended Jobs</CardTitle>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="gap-1">
                  Browse All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-2">
                  Complete your profile to get personalized job recommendations
                </p>
                <Link href="/seeker/profile">
                  <Button variant="outline">Complete Profile</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile Completeness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{profileCompleteness}%</span>
                  {profileCompleteness >= 80 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      Strong Profile
                    </Badge>
                  )}
                </div>
                <Progress value={profileCompleteness} />
                <p className="text-sm text-muted-foreground">
                  {profileCompleteness < 80
                    ? "Complete your profile to stand out to employers"
                    : "Great job! Your profile is looking strong"}
                </p>
                <Link href="/seeker/profile">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    {profileCompleteness < 80 ? "Complete Profile" : "Edit Profile"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/jobs">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Briefcase className="h-4 w-4" />
                  Search Jobs
                </Button>
              </Link>
              <Link href="/gigs">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Clock className="h-4 w-4" />
                  Find Gig Shifts
                </Button>
              </Link>
              <Link href="/seeker/saved">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <Bookmark className="h-4 w-4" />
                  Saved Jobs
                </Button>
              </Link>
              <Link href="/seeker/profile">
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Update Resume
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Get notified when new jobs match your preferences
                </p>
                <Button variant="outline" size="sm">
                  Set Up Alerts
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-gig-payouts">
            <CardHeader>
              <CardTitle className="text-base">Gig Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                </div>
              ) : payoutAccount?.payoutsEnabled ? (
                <div className="text-center py-2" data-testid="payout-status-enabled">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="font-medium text-green-600 mb-1" data-testid="text-payout-enabled">Payouts Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    You can receive payments for gig shifts
                  </p>
                </div>
              ) : payoutAccount?.onboardingComplete ? (
                <div className="text-center py-2" data-testid="payout-status-pending">
                  <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-6 w-6 text-yellow-500" />
                  </div>
                  <p className="font-medium text-yellow-600 mb-1" data-testid="text-payout-pending">Pending Verification</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your account is being reviewed
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onboardMutation.mutate()}
                    disabled={onboardMutation.isPending}
                    data-testid="button-payout-update"
                  >
                    {onboardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Update Info
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2" data-testid="payout-status-not-setup">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Set up your payout account to get paid for gig shifts
                  </p>
                  <Button
                    size="sm"
                    onClick={() => onboardMutation.mutate()}
                    disabled={onboardMutation.isPending}
                    data-testid="button-payout-setup"
                  >
                    {onboardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    Set Up Payouts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
