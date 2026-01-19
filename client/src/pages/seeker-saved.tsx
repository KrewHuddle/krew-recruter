import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Bookmark,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  Trash2,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import type { Job, Location as LocationType, Tenant } from "@shared/schema";

type SavedJobWithDetails = {
  id: string;
  jobId: string;
  userId: string;
  savedAt: string;
  job: Job & {
    location: LocationType | null;
    tenant: Tenant | null;
  };
};

export default function SeekerSaved() {
  const { toast } = useToast();

  const { data: savedJobs, isLoading } = useQuery<SavedJobWithDetails[]>({
    queryKey: ["/api/saved-jobs"],
  });

  const unsaveMutation = useMutation({
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Saved Jobs</h1>
          <p className="text-muted-foreground">
            Jobs you've bookmarked for later
          </p>
        </div>
        <Link href="/jobs">
          <Button className="gap-2" data-testid="button-find-more-jobs">
            <Briefcase className="h-4 w-4" />
            Find More Jobs
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : savedJobs && savedJobs.length > 0 ? (
        <div className="space-y-4">
          {savedJobs.map((saved) => (
            <Card key={saved.id} className="hover-elevate" data-testid={`saved-job-card-${saved.jobId}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${saved.jobId}`}>
                      <h3 className="font-semibold text-lg hover:text-primary cursor-pointer">
                        {saved.job?.title || "Job Title"}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <Building2 className="h-4 w-4" />
                      {saved.job?.tenant?.name || "Company"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => unsaveMutation.mutate(saved.jobId)}
                    disabled={unsaveMutation.isPending}
                    data-testid={`button-unsave-${saved.jobId}`}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {saved.job?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {saved.job.location.city}, {saved.job.location.state}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {saved.job?.jobType === "FULL_TIME" ? "Full-time" : "Part-time"}
                  </span>
                  {saved.job?.payRangeMin && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${saved.job.payRangeMin}
                      {saved.job.payRangeMax && `-$${saved.job.payRangeMax}`}/hr
                    </span>
                  )}
                </div>

                {saved.job?.scheduleTags && saved.job.scheduleTags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {saved.job.scheduleTags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Saved {saved.savedAt ? new Date(saved.savedAt).toLocaleDateString() : "recently"}
                  </span>
                  <Link href={`/jobs/${saved.jobId}`}>
                    <Button size="sm" className="gap-1" data-testid={`button-view-${saved.jobId}`}>
                      View Job
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bookmark className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              When you find jobs you're interested in, bookmark them to easily find them later.
            </p>
            <Link href="/jobs">
              <Button className="gap-2">
                <Briefcase className="h-4 w-4" />
                Browse Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
