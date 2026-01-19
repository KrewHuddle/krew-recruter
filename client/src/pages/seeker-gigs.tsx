import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Briefcase,
  TrendingUp,
  Loader2,
} from "lucide-react";
import type { GigPost, Location, Tenant, GigAssignment, GigPayout, GigRating } from "@shared/schema";

type WorkerGig = GigAssignment & {
  gig: (GigPost & { location?: Location; tenant?: Tenant }) | null;
  payout?: GigPayout | null;
  ratings?: GigRating[];
};

type EarningsSummary = {
  totalEarnings: number;
  pendingEarnings: number;
  completedGigs: number;
  payouts: GigPayout[];
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  PENDING: { label: "Pending Review", variant: "secondary", icon: Clock },
  CONFIRMED: { label: "Confirmed", variant: "default", icon: CheckCircle },
  CHECKED_IN: { label: "Checked In", variant: "default", icon: CheckCircle },
  COMPLETED: { label: "Completed", variant: "default", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
  NO_SHOW: { label: "No Show", variant: "destructive", icon: XCircle },
};

export default function SeekerGigs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myGigs, isLoading } = useQuery<WorkerGig[]>({
    queryKey: ["/api/worker/gigs"],
  });

  const { data: earnings } = useQuery<EarningsSummary>({
    queryKey: ["/api/worker/earnings"],
  });

  const withdrawMutation = useMutation({
    mutationFn: async (gigId: string) => {
      const res = await apiRequest("DELETE", `/api/gigs/${gigId}/apply`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/worker/gigs"] });
      toast({
        title: "Application withdrawn",
        description: "You have withdrawn your application.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const pendingGigs = myGigs?.filter((g) => g.status === "PENDING") || [];
  const confirmedGigs = myGigs?.filter((g) => g.status === "CONFIRMED" || g.status === "CHECKED_IN") || [];
  const completedGigs = myGigs?.filter((g) => g.status === "COMPLETED") || [];
  const cancelledGigs = myGigs?.filter((g) => g.status === "CANCELLED" || g.status === "NO_SHOW") || [];

  const renderGigCard = (workerGig: WorkerGig, showWithdraw = false) => {
    const { gig, status, payout, ratings } = workerGig;
    if (!gig) return null;

    const statusInfo = statusConfig[status] || statusConfig.PENDING;
    const StatusIcon = statusInfo.icon;

    return (
      <Card key={workerGig.id} className="hover-elevate" data-testid={`worker-gig-card-${workerGig.id}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-lg">{gig.role}</h3>
              <p className="text-sm text-muted-foreground">{gig.tenant?.name || "Company"}</p>
            </div>
            <Badge variant={statusInfo.variant} className="gap-1 shrink-0">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            {gig.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {gig.location.city ? `${gig.location.name}, ${gig.location.city}` : gig.location.name}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {gig.startAt
                ? new Date(gig.startAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "TBD"}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {gig.startAt && gig.endAt
                ? `${new Date(gig.startAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })} - ${new Date(gig.endAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "Time TBD"}
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              ${gig.payRate}/hr
            </div>
          </div>

          {payout && (
            <div className="bg-primary/10 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Earnings</span>
                <span className="font-bold text-primary">${(payout.netAmountCents / 100).toFixed(2)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {payout.status === "COMPLETED" ? "Paid" : payout.status === "PENDING" ? "Pending payout" : payout.status}
              </div>
            </div>
          )}

          {ratings && ratings.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>
                {ratings.find((r) => r.raterType === "EMPLOYER")?.rating || "Not rated"}/5 from employer
              </span>
            </div>
          )}

          {showWithdraw && status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => withdrawMutation.mutate(gig.id)}
              disabled={withdrawMutation.isPending}
              data-testid={`button-withdraw-${workerGig.id}`}
            >
              {withdrawMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Withdraw Application
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Gigs</h1>
        <p className="text-muted-foreground">Track your gig applications and earnings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-total-earnings">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">${earnings?.totalEarnings?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-earnings">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold">${earnings?.pendingEarnings?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-gigs">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Briefcase className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Gigs</p>
                <p className="text-2xl font-bold">{earnings?.completedGigs || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-gig-status">
          <TabsTrigger value="pending" className="gap-1">
            <AlertCircle className="h-4 w-4" />
            Pending ({pendingGigs.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="gap-1">
            <CheckCircle className="h-4 w-4" />
            Upcoming ({confirmedGigs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <Star className="h-4 w-4" />
            Completed ({completedGigs.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-1">
            <XCircle className="h-4 w-4" />
            Cancelled ({cancelledGigs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingGigs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingGigs.map((gig) => renderGigCard(gig, true))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No pending applications</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Browse available gigs and apply to get started!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="mt-6">
          {confirmedGigs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {confirmedGigs.map((gig) => renderGigCard(gig))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No upcoming gigs</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Confirmed gigs will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedGigs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGigs.map((gig) => renderGigCard(gig))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No completed gigs yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Your completed work history will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="mt-6">
          {cancelledGigs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cancelledGigs.map((gig) => renderGigCard(gig))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No cancelled gigs</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  This is a good sign!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
