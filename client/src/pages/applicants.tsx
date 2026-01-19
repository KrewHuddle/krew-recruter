import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTenant } from "@/lib/tenant-context";
import { Users, Search, Briefcase, Calendar, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { Application, Job } from "@shared/schema";

type ApplicationWithJob = Application & { job?: Job };

const stageColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SCREENING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  INTERVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  OFFER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  HIRED: "bg-primary/20 text-primary",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function Applicants() {
  const { currentTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const { data: applications, isLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/applications"],
    enabled: !!currentTenant,
    refetchOnMount: "always",
  });

  const filteredApplications = applications?.filter((app) => {
    const matchesSearch = app.job?.title
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || app.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Group by stage for pipeline view
  const stages = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
  const groupedByStage = stages.reduce((acc, stage) => {
    acc[stage] = filteredApplications?.filter((app) => app.stage === stage) || [];
    return acc;
  }, {} as Record<string, ApplicationWithJob[]>);

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to view applicants
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applicants</h1>
          <p className="text-muted-foreground">
            Manage applications for {currentTenant.name}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-applicants"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-stage-filter">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline View */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredApplications && filteredApplications.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage) => (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{stage}</span>
                <Badge variant="secondary" className="text-xs">
                  {groupedByStage[stage].length}
                </Badge>
              </div>
              <div className="space-y-2">
                {groupedByStage[stage].map((app) => (
                  <Link key={app.id} href={`/app/applications/${app.id}`}>
                    <Card
                      className="overflow-visible hover-elevate cursor-pointer"
                      data-testid={`applicant-card-${app.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {app.workerUserId.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {app.workerUserId.slice(0, 8)}...
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Briefcase className="h-3 w-3" />
                              <span className="truncate">
                                {app.job?.title || "Job"}
                              </span>
                            </div>
                            {app.appliedAt && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(app.appliedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                {groupedByStage[stage].length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No applicants
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search || stageFilter !== "all"
                ? "No applicants found"
                : "No applicants yet"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {search || stageFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Publish jobs to start receiving applications"}
            </p>
            {!search && stageFilter === "all" && (
              <Link href="/app/jobs">
                <Button className="gap-2">
                  View Jobs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
