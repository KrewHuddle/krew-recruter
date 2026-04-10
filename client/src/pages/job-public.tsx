import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Building2,
  Clock,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";

// Public job detail page — accessible without authentication.
// Used as the landing destination for Meta ads (see server/routes.ts where
// the Meta applyUrl is built) and any shared job link. Renders a single
// PUBLISHED job from the legacy `jobs` table via /api/jobs/public/tenant/:id.
//
// Apply CTA behavior:
//   - Authenticated job seeker → POST /api/applications/apply directly
//   - Unauthenticated visitor  → redirect to /workers/signup?jobId=:id
//     so the signup flow can capture the intent and apply post-onboarding
//     (the post-signup auto-apply wiring is a separate follow-up).

interface PublicJob {
  id: string;
  title: string;
  role: string;
  description: string | null;
  jobType: "FULL_TIME" | "PART_TIME";
  payRangeMin: number | null;
  payRangeMax: number | null;
  scheduleTags: string[] | null;
  createdAt: string;
  tenant: { id: string; name: string; slug: string } | null;
  location: { name: string; city: string | null; state: string | null } | null;
}

function payDisplay(min: number | null, max: number | null): string | null {
  if (min && max) return `$${min} - $${max}/hr`;
  if (min) return `$${min}+/hr`;
  if (max) return `Up to $${max}/hr`;
  return null;
}

export default function JobPublic() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: job, isLoading, error } = useQuery<PublicJob>({
    queryKey: [`/api/jobs/public/tenant/${jobId}`],
    enabled: !!jobId,
    retry: false,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/applications/apply", { jobId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Application submitted!", description: "The employer will be in touch." });
      navigate("/seeker");
    },
    onError: (err: any) => {
      toast({
        title: "Could not apply",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApply = () => {
    if (!jobId) return;
    if (isAuthenticated) {
      applyMutation.mutate();
    } else {
      // Hand off to signup with jobId so the signup flow can pick it up
      // post-completion. Even if signup doesn't yet auto-apply, we get the
      // user into a real account where they can apply through the seeker UI.
      navigate(`/workers/signup?jobId=${encodeURIComponent(jobId)}`);
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageShell>
    );
  }

  if (error || !job) {
    return (
      <PageShell>
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h1 className="text-xl font-semibold mb-2">This job is no longer available</h1>
            <p className="text-muted-foreground max-w-md mb-6">
              The position may have been filled or the link is incorrect. Browse other open jobs instead.
            </p>
            <Link href="/jobs">
              <Button>Browse all jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const pay = payDisplay(job.payRangeMin, job.payRangeMax);
  const locationLabel =
    job.location?.city && job.location?.state
      ? `${job.location.city}, ${job.location.state}`
      : job.location?.name || "Location available on application";
  const companyName = job.tenant?.name || "A local restaurant";
  const ogTitle = `${job.title} at ${companyName}`;
  const ogDescription = [
    job.role,
    pay,
    locationLabel !== "Location available on application" ? locationLabel : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <PageShell>
      <Helmet>
        <title>{ogTitle} — Krew Recruiter</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Link href="/jobs">
        <Button variant="ghost" size="sm" className="gap-2 mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          All jobs
        </Button>
      </Link>

      <Card>
        <CardContent className="p-6 md:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{job.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{companyName}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm mb-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {locationLabel}
            </span>
            {pay && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                {pay}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {job.jobType.replace("_", " ")}
            </span>
          </div>

          {job.scheduleTags && job.scheduleTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {job.scheduleTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {job.description && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">About this role</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {job.description}
              </p>
            </div>
          )}

          <div className="border-t pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Apply in under 60 seconds
            </div>
            <Button
              size="lg"
              onClick={handleApply}
              disabled={applyMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-apply-public"
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : isAuthenticated ? (
                "Apply Now"
              ) : (
                "Apply Now — Quick Signup"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <img src={logoImage} alt="Krew Recruiter" className="h-8 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">{children}</main>
    </div>
  );
}
