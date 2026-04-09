import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, X, Check } from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";

interface UpgradePromptProps {
  feature?: string;
  requiredPlan?: string;
  onClose: () => void;
}

const featureDescriptions: Record<string, string> = {
  campaigns: "Run Facebook & Instagram ads to find hospitality workers near your restaurant. Included in Pro.",
  video: "Screen candidates with async video interviews. See their personality before the first shift.",
  talent: "Search 50K+ hospitality professionals in your area ready to work.",
  locations: "Manage multiple restaurant locations from one dashboard.",
};

const plans = [
  { name: "Free", price: "$0", features: ["1 job", "5 applicants/mo"] },
  { name: "Starter", price: "$49", features: ["3 jobs", "25 applicants/mo", "1 location"] },
  { name: "Pro", price: "$99", features: ["Unlimited jobs", "Campaigns", "Video", "Talent pool", "5 locations"], popular: true },
  { name: "Enterprise", price: "$299", features: ["Everything in Pro", "Unlimited locations", "API", "White label"] },
];

function UpgradePromptDialog({ feature, requiredPlan, onClose }: UpgradePromptProps) {
  const [, setLocation] = useLocation();
  const description = feature ? featureDescriptions[feature.toLowerCase()] || `This feature requires the ${requiredPlan || "Pro"} plan.` : "Upgrade your plan to unlock this feature.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <CardContent className="pt-8 pb-6 px-8 text-center">
          <img src={logoImage} alt="Krew Recruiter" className="h-10 w-10 mx-auto mb-4 rounded-lg" />
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Unlock {feature || "this feature"}
          </h2>
          <p className="text-muted-foreground mb-6">{description}</p>

          <div className="grid grid-cols-4 gap-2 mb-6 text-xs">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-2 ${
                  plan.name === (requiredPlan || "Pro")
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                <div className="font-semibold">{plan.name}</div>
                <div className="text-muted-foreground">{plan.price}/mo</div>
                <div className="mt-1 space-y-0.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-1">
                      <Check className="h-2.5 w-2.5 text-primary shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full mb-2"
            onClick={() => {
              onClose();
              setLocation("/pricing");
            }}
          >
            Upgrade to {requiredPlan || "Pro"} — {plans.find(p => p.name === (requiredPlan || "Pro"))?.price}/mo
          </Button>
          <button
            onClick={() => {
              onClose();
              setLocation("/pricing");
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all plans
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

export function UpgradePromptListener() {
  const [prompt, setPrompt] = useState<{ feature?: string; plan?: string } | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setPrompt({ feature: e.detail?.feature, plan: e.detail?.plan });
    };
    window.addEventListener("upgrade-required" as any, handler);
    return () => window.removeEventListener("upgrade-required" as any, handler);
  }, []);

  if (!prompt) return null;

  return (
    <UpgradePromptDialog
      feature={prompt.feature}
      requiredPlan={prompt.plan}
      onClose={() => setPrompt(null)}
    />
  );
}
