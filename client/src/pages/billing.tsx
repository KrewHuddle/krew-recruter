import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant-context";
import {
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Briefcase,
  Users,
  Video,
  DollarSign,
  Download,
  Zap,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  metadata?: Record<string, string>;
  prices: { id: string; unit_amount: number; recurring?: { interval: string } }[];
}

interface BillingStatus {
  status: string;
  planType: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function Billing() {
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const currentPlan = currentTenant?.planType || "FREE";
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/billing/plans"],
  });

  const { data: billingStatus, isLoading: statusLoading } = useQuery<BillingStatus>({
    queryKey: ["/api/billing/status"],
    enabled: !!tenantId,
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/billing/invoices"],
    enabled: !!tenantId,
  });

  const { data: usage } = useQuery<{
    jobsPosted: number;
    totalCandidates: number;
    videoInterviews: number;
    adSpendCents: number;
  }>({
    queryKey: ["/api/billing/usage"],
    enabled: !!tenantId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/billing/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Failed to start checkout", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing/portal", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: () => {
      toast({ title: "Failed to open billing portal", variant: "destructive" });
    },
  });

  const plans = plansData?.plans || [];
  const hasSubscription = billingStatus?.status && billingStatus.status !== "canceled";

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount / 100);

  const parseFeatures = (plan: Plan | undefined): string[] => {
    if (!plan?.metadata?.features) return [];
    try { return JSON.parse(plan.metadata.features); } catch { return []; }
  };

  const getPrice = (plan: Plan | undefined, interval: string) =>
    plan?.prices.find(p => p.recurring?.interval === interval);

  // Static fallback plans if API hasn't loaded
  const STATIC_PLANS = [
    { id: "free", name: "Free", price: 0, features: ["1 active job", "Up to 10 candidates", "Basic job board", "Email support"] },
    { id: "starter", name: "Starter", price: 49, features: ["5 active jobs", "Up to 200 candidates", "Video interviews (50/mo)", "Job distribution", "Priority support"] },
    { id: "pro", name: "Pro", price: 99, features: ["Unlimited jobs", "Unlimited candidates", "Unlimited video interviews", "Gig marketplace", "Sponsored campaigns", "Phone & chat support"] },
    { id: "enterprise", name: "Enterprise", price: -1, features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Multi-location", "API access"] },
  ];

  if (!tenantId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organization selected</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Select or create an organization to manage billing.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (plansLoading || statusLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        {hasSubscription && (
          <Button variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
            {portalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            Manage in Stripe
          </Button>
        )}
      </div>

      {/* Current Plan Banner */}
      {hasSubscription && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">
                  You're on the <Badge className="ml-1">{currentPlan}</Badge> plan
                </p>
                {billingStatus?.currentPeriodEnd && (
                  <p className="text-sm text-muted-foreground">
                    {billingStatus.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
                    {new Date(billingStatus.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={() => portalMutation.mutate()}>
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Usage Stats */}
      <h2 className="text-lg font-semibold mb-3">Usage This Month</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Jobs Posted</span>
            </div>
            <p className="text-2xl font-bold">{usage?.jobsPosted ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Candidates</span>
            </div>
            <p className="text-2xl font-bold">{usage?.totalCandidates ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Video Interviews</span>
            </div>
            <p className="text-2xl font-bold">{usage?.videoInterviews ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ad Spend</span>
            </div>
            <p className="text-2xl font-bold">${((usage?.adSpendCents ?? 0) / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Plans</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            className={`px-3 py-1 rounded-full transition-colors ${billingPeriod === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-3 py-1 rounded-full transition-colors ${billingPeriod === "yearly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setBillingPeriod("yearly")}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(plans.length > 0 ? plans : STATIC_PLANS.map(sp => ({
          id: sp.id,
          name: sp.name,
          metadata: { tier: sp.id, features: JSON.stringify(sp.features) },
          prices: sp.price >= 0
            ? [{ id: sp.id, unit_amount: sp.price * 100, recurring: { interval: "month" } }]
            : [],
        }))).map((plan: any) => {
          const tier = plan.metadata?.tier || plan.name.toLowerCase();
          const isCurrent = currentPlan.toLowerCase() === tier;
          const price = getPrice(plan, billingPeriod === "yearly" ? "year" : "month");
          const features = parseFeatures(plan);
          const isEnterprise = tier === "enterprise";
          const isFree = tier === "free";

          return (
            <Card key={plan.id} className={isCurrent ? "border-primary ring-1 ring-primary" : ""}>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-1">{plan.name}</h3>
                {isFree ? (
                  <p className="text-2xl font-bold mb-3">Free</p>
                ) : isEnterprise ? (
                  <p className="text-2xl font-bold mb-3">Custom</p>
                ) : price ? (
                  <p className="text-2xl font-bold mb-3">
                    {formatPrice(price.unit_amount)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{billingPeriod === "yearly" ? "yr" : "mo"}
                    </span>
                  </p>
                ) : (
                  <p className="text-2xl font-bold mb-3">-</p>
                )}
                <ul className="space-y-2 text-sm mb-4">
                  {features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                ) : isEnterprise ? (
                  <Button variant="outline" className="w-full"
                    onClick={() => window.location.href = "mailto:sales@krewhuddle.com?subject=Enterprise Plan"}>
                    Contact Sales
                  </Button>
                ) : isFree ? (
                  <Button variant="outline" className="w-full" disabled>Free Tier</Button>
                ) : price ? (
                  <Button className="w-full" onClick={() => checkoutMutation.mutate(price.id)}
                    disabled={checkoutMutation.isPending}>
                    {checkoutMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Upgrade
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoice History */}
      <h2 className="text-lg font-semibold mb-3">Invoice History</h2>
      {invoices.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-4 py-3">{new Date(inv.date || inv.created * 1000).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium">${((inv.amount_paid || inv.amountPaid || 0) / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {(inv.invoice_pdf || inv.pdfUrl) && (
                        <Button variant="ghost" size="sm"
                          onClick={() => window.open(inv.invoice_pdf || inv.pdfUrl, "_blank")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No invoices yet. Invoices will appear here after your first payment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
