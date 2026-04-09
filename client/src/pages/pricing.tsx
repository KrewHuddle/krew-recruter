import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Briefcase, Users, Video, Zap, Globe, Shield, Clock, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

const PLANS = [
  {
    name: "Free",
    price: 0,
    description: "Get started with the basics",
    features: [
      "1 active job posting",
      "Up to 10 candidates",
      "Basic job board listing",
      "Email support",
    ],
    cta: "Get Started",
    href: "/login",
    popular: false,
  },
  {
    name: "Starter",
    price: 49,
    description: "For small restaurants hiring regularly",
    features: [
      "5 active job postings",
      "Up to 200 candidates/mo",
      "Video interviews (50/mo)",
      "Job distribution to Indeed & ZipRecruiter",
      "Candidate messaging",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    href: "/login",
    popular: false,
  },
  {
    name: "Pro",
    price: 99,
    description: "For busy restaurants & multi-location groups",
    features: [
      "Unlimited job postings",
      "Unlimited candidates",
      "Unlimited video interviews",
      "Gig marketplace access",
      "Sponsored ad campaigns",
      "Team collaboration",
      "Background check integrations",
      "Onboarding documents",
      "Phone & chat support",
    ],
    cta: "Start Free Trial",
    href: "/login",
    popular: true,
  },
  {
    name: "Enterprise",
    price: -1,
    description: "For restaurant groups & franchises",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations & API access",
      "SLA guarantee",
      "Multi-location management",
      "Custom branding",
      "SSO / SAML",
      "Priority onboarding",
    ],
    cta: "Contact Sales",
    href: "mailto:sales@krewhuddle.com?subject=Enterprise Plan Inquiry",
    popular: false,
  },
];

const COMPARISON_FEATURES = [
  { name: "Active job postings", free: "1", starter: "5", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Candidates per month", free: "10", starter: "200", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Video interviews", free: "-", starter: "50/mo", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Job distribution", free: "-", starter: true, pro: true, enterprise: true },
  { name: "Gig marketplace", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Sponsored campaigns", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Team members", free: "1", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Candidate messaging", free: "-", starter: true, pro: true, enterprise: true },
  { name: "Background checks", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Onboarding documents", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Custom branding", free: "-", starter: "-", pro: "-", enterprise: true },
  { name: "API access", free: "-", starter: "-", pro: "-", enterprise: true },
  { name: "Dedicated account manager", free: "-", starter: "-", pro: "-", enterprise: true },
  { name: "SLA guarantee", free: "-", starter: "-", pro: "-", enterprise: true },
];

export default function Pricing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              K
            </div>
            <span className="font-semibold">Krew Recruiter</span>
          </a>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/login")}>Log in</Button>
            <Button onClick={() => setLocation("/login")}>Sign Up Free</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center py-16 px-6">
        <Badge variant="secondary" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl font-bold mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Start free. Upgrade as you grow. No hidden fees, no long-term contracts.
          Cancel anytime.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {PLANS.map(plan => (
            <Card key={plan.name} className={plan.popular ? "border-primary ring-2 ring-primary relative" : ""}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardContent className="pt-8 pb-6 flex flex-col h-full">
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                {plan.price === 0 ? (
                  <p className="text-3xl font-bold mb-6">Free</p>
                ) : plan.price === -1 ? (
                  <p className="text-3xl font-bold mb-6">Custom</p>
                ) : (
                  <p className="text-3xl font-bold mb-6">
                    ${plan.price}<span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                )}

                <ul className="space-y-2.5 text-sm flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.href.startsWith("mailto:") ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={plan.href}>{plan.cta} <ArrowRight className="ml-2 h-4 w-4" /></a>
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setLocation(plan.href)}
                  >
                    {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-1/3">Feature</th>
                  <th className="text-center px-4 py-3 font-medium">Free</th>
                  <th className="text-center px-4 py-3 font-medium">Starter</th>
                  <th className="text-center px-4 py-3 font-medium">
                    <span className="text-primary">Pro</span>
                  </th>
                  <th className="text-center px-4 py-3 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feat, i) => (
                  <tr key={feat.name} className={i > 0 ? "border-t" : ""}>
                    <td className="px-4 py-3 font-medium">{feat.name}</td>
                    {(["free", "starter", "pro", "enterprise"] as const).map(tier => {
                      const val = feat[tier];
                      return (
                        <td key={tier} className="px-4 py-3 text-center">
                          {val === true ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : val === "-" ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-12 border rounded-lg bg-primary/5">
          <h2 className="text-2xl font-bold mb-2">Ready to start hiring?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join hundreds of restaurants using Krew Recruiter to find and hire
            great hospitality talent.
          </p>
          <Button size="lg" onClick={() => setLocation("/login")}>
            Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
