import { useState } from "react";
import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Download,
  ExternalLink,
  Check,
  Briefcase,
  Users,
  DollarSign,
  Video,
  Loader2,
  Zap,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "mo",
    features: [
      "1 active job campaign",
      "Up to 25 candidates/mo",
      "Basic ad targeting",
      "Email support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: 49,
    interval: "mo",
    features: [
      "5 active job campaigns",
      "Up to 200 candidates/mo",
      "Advanced ad targeting",
      "Video interviews (50/mo)",
      "Priority email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    interval: "mo",
    features: [
      "Unlimited campaigns",
      "Unlimited candidates",
      "AI-optimized targeting",
      "Unlimited video interviews",
      "Phone & chat support",
      "Team collaboration",
      "Custom branding",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: -1,
    interval: "mo",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Multi-location support",
      "API access",
    ],
  },
];

export default function CampaignBilling() {
  const { apiFetch } = useCampaignAuth();
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["/api/billing/subscription"],
    queryFn: async () => {
      const res = await apiFetch("/api/billing/subscription");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ["/api/billing/invoices"],
    queryFn: async () => {
      const res = await apiFetch("/api/billing/invoices");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const currentPlanId = subscription?.planId || "free";
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];

  const usageStats = subscription?.usage || {
    jobsPosted: 0,
    jobsLimit: 1,
    candidatesReached: 0,
    candidatesLimit: 25,
    adSpend: 0,
    videoInterviews: 0,
    videoInterviewsLimit: 0,
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await apiFetch("/api/stripe/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      }
    } catch {
      // silently fail
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const res = await apiFetch("/api/billing/upgrade", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.open(data.checkoutUrl, "_blank");
        }
      }
    } catch {
      // silently fail
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <Badge variant={currentPlanId === "free" ? "secondary" : "default"}>
              {currentPlan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1 mb-4">
            {currentPlan.price === 0 ? (
              <span className="text-3xl font-bold">Free</span>
            ) : currentPlan.price === -1 ? (
              <span className="text-3xl font-bold">Custom</span>
            ) : (
              <>
                <span className="text-3xl font-bold">${currentPlan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </>
            )}
          </div>
          {subscription?.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              {subscription.cancelAtPeriodEnd
                ? "Cancels"
                : "Renews"}{" "}
              on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <h2 className="text-lg font-semibold mb-3">Usage This Month</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Jobs Posted</span>
            </div>
            <p className="text-2xl font-bold">
              {usageStats.jobsPosted}
              {usageStats.jobsLimit > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  /{usageStats.jobsLimit}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Candidates</span>
            </div>
            <p className="text-2xl font-bold">
              {usageStats.candidatesReached}
              {usageStats.candidatesLimit > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  /{usageStats.candidatesLimit}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Ad Spend</span>
            </div>
            <p className="text-2xl font-bold">
              ${((usageStats.adSpend || 0) / 100).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Video Interviews</span>
            </div>
            <p className="text-2xl font-bold">
              {usageStats.videoInterviews}
              {usageStats.videoInterviewsLimit > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  /{usageStats.videoInterviewsLimit}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plans */}
      <h2 className="text-lg font-semibold mb-3">Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isUpgrade =
            PLANS.indexOf(plan) > PLANS.indexOf(currentPlan);
          return (
            <Card
              key={plan.id}
              className={isCurrent ? "border-primary ring-1 ring-primary" : ""}
            >
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-1">{plan.name}</h3>
                {plan.price === 0 ? (
                  <p className="text-2xl font-bold mb-3">Free</p>
                ) : plan.price === -1 ? (
                  <p className="text-2xl font-bold mb-3">Custom</p>
                ) : (
                  <p className="text-2xl font-bold mb-3">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                )}
                <ul className="space-y-2 text-sm mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.price === -1 ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      (window.location.href =
                        "mailto:sales@krewhuddle.com?subject=Enterprise Plan Inquiry")
                    }
                  >
                    Contact Sales
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Upgrade
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    Downgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Method */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription?.paymentMethod ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-muted rounded flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {subscription.paymentMethod.brand?.toUpperCase()} ****
                    {subscription.paymentMethod.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {subscription.paymentMethod.expMonth}/
                    {subscription.paymentMethod.expYear}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payment method on file
              </p>
            )}
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Billing
            </Button>
          </CardContent>
        </Card>

        {/* Invoice History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices && invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        ${(inv.amountPaid / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          inv.status === "paid" ? "default" : "secondary"
                        }
                      >
                        {inv.status}
                      </Badge>
                      {inv.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(inv.pdfUrl, "_blank")}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invoices yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
