import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Rocket,
  Pause,
  Play,
  BarChart3,
  Eye,
  MousePointerClick,
  DollarSign,
  Target,
  Loader2,
  Zap,
  TrendingUp,
} from "lucide-react";
import type { Job } from "@shared/schema";

interface JobAdCampaign {
  id: string;
  jobId: string;
  status: string;
  dailyBudgetUSD: number;
  totalSpendCents: number;
  impressions: number;
  clicks: number;
  metaCampaignId: string | null;
  createdAt: string;
}

interface JobAdBoosterProps {
  job: Job;
  tenantName?: string;
}

const BUDGET_OPTIONS = [
  { value: 5, label: "$5/day", reach: "~500-1,200" },
  { value: 10, label: "$10/day", reach: "~1,000-2,500" },
  { value: 25, label: "$25/day", reach: "~2,500-6,000" },
  { value: 50, label: "$50/day", reach: "~5,000-12,000" },
];

export function JobAdBooster({ job, tenantName }: JobAdBoosterProps) {
  const { toast } = useToast();
  const [budget, setBudget] = useState(10);

  // Fetch existing campaign for this job
  const { data: campaigns = [], isLoading } = useQuery<JobAdCampaign[]>({
    queryKey: [`/api/meta/campaigns?jobId=${job.id}`],
    refetchInterval: false,
  });

  const activeCampaign = campaigns.find(
    (c) => c.status === "active" || c.status === "paused"
  );

  // Poll stats when campaign is active
  const { data: stats } = useQuery<JobAdCampaign>({
    queryKey: [`/api/meta/campaign/${activeCampaign?.id}/stats`],
    enabled: !!activeCampaign && activeCampaign.status === "active",
    refetchInterval: 60000, // every 60 seconds
  });

  const displayCampaign = stats || activeCampaign;

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meta/campaign", {
        jobId: job.id,
        dailyBudgetUSD: budget,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meta/campaigns?jobId=${job.id}`],
      });
      toast({ title: "Campaign created! Activating..." });
      // Auto-activate after creation
      activateMutation.mutate(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/meta/campaign/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meta/campaigns?jobId=${job.id}`],
      });
      toast({ title: "Campaign activated!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to activate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/meta/campaign/${id}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/meta/campaigns?jobId=${job.id}`],
      });
      toast({ title: "Campaign paused" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to pause",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isCreating = createMutation.isPending || activateMutation.isPending;

  // State 2: Campaign Active
  if (displayCampaign?.status === "active") {
    return (
      <Card className="border-green-200 dark:border-green-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              Facebook & Instagram Ads
            </CardTitle>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Campaign Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatBox
              icon={<Eye className="h-3.5 w-3.5" />}
              label="Impressions"
              value={(displayCampaign.impressions || 0).toLocaleString()}
            />
            <StatBox
              icon={<MousePointerClick className="h-3.5 w-3.5" />}
              label="Clicks"
              value={(displayCampaign.clicks || 0).toLocaleString()}
            />
            <StatBox
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Spent"
              value={`$${((displayCampaign.totalSpendCents || 0) / 100).toFixed(2)}`}
            />
            <StatBox
              icon={<Target className="h-3.5 w-3.5" />}
              label="CPC"
              value={
                displayCampaign.clicks > 0
                  ? `$${(displayCampaign.totalSpendCents / displayCampaign.clicks / 100).toFixed(2)}`
                  : "-"
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Budget: ${displayCampaign.dailyBudgetUSD}/day
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pauseMutation.mutate(displayCampaign.id)}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pause className="mr-1 h-3.5 w-3.5" />
              )}
              Pause
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State 3: Campaign Paused
  if (displayCampaign?.status === "paused") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Facebook & Instagram Ads
            </CardTitle>
            <Badge variant="secondary">Paused</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <StatBox
              icon={<Eye className="h-3.5 w-3.5" />}
              label="Impressions"
              value={(displayCampaign.impressions || 0).toLocaleString()}
            />
            <StatBox
              icon={<MousePointerClick className="h-3.5 w-3.5" />}
              label="Clicks"
              value={(displayCampaign.clicks || 0).toLocaleString()}
            />
            <StatBox
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Spent"
              value={`$${((displayCampaign.totalSpendCents || 0) / 100).toFixed(2)}`}
            />
            <StatBox
              icon={<Target className="h-3.5 w-3.5" />}
              label="CPC"
              value={
                displayCampaign.clicks > 0
                  ? `$${(displayCampaign.totalSpendCents / displayCampaign.clicks / 100).toFixed(2)}`
                  : "-"
              }
            />
          </div>
          <Button
            onClick={() => activateMutation.mutate(displayCampaign.id)}
            disabled={activateMutation.isPending}
            className="w-full"
          >
            {activateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Reactivate Campaign
          </Button>
        </CardContent>
      </Card>
    );
  }

  // State 1: No campaign — show creation flow
  const payDisplay =
    job.payRangeMin && job.payRangeMax
      ? `$${job.payRangeMin}-$${job.payRangeMax}/hr`
      : job.payRangeMin
        ? `$${job.payRangeMin}/hr`
        : "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Boost This Job on Facebook & Instagram
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Reach hospitality workers in your area automatically
        </p>
      </CardHeader>
      <CardContent>
        {/* Ad Preview */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4 text-sm">
          <p className="font-medium mb-1">Ad Preview:</p>
          <p className="text-muted-foreground">
            🍽️ {tenantName || "Your Restaurant"} is hiring a {job.title}!
            {payDisplay && `\n✅ ${payDisplay}`}
            {"\n📍 Local Area"}
            {"\n🎥 Apply with a 60-sec video interview"}
          </p>
        </div>

        {/* Budget Selection */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">
            Daily Budget
          </Label>
          <RadioGroup
            value={String(budget)}
            onValueChange={(v) => setBudget(parseInt(v))}
            className="grid grid-cols-2 gap-2"
          >
            {BUDGET_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                  budget === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value={String(opt.value)} className="sr-only" />
                  <span className="font-medium text-sm">{opt.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {opt.reach} reach
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Estimated reach */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>
            Estimated {BUDGET_OPTIONS.find((o) => o.value === budget)?.reach || ""}{" "}
            people per day
          </span>
        </div>

        <Button
          onClick={() => createMutation.mutate()}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Launching...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" /> Launch Campaign — $
              {budget}/day
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
