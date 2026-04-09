import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Check, X, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import logoImage from "@assets/3_1768835575859.png";

const PLANS = [
  {
    name: "Free",
    monthlyPrice: 0,
    description: "Get started",
    features: [
      { text: "1 active job posting", included: true },
      { text: "5 applicants per month", included: true },
      { text: "Basic applicant tracking", included: true },
      { text: "Video interviews", included: false },
      { text: "Campaign engine", included: false },
      { text: "Talent pool", included: false },
    ],
    cta: "Get Started Free",
    href: "/login",
    popular: false,
  },
  {
    name: "Starter",
    monthlyPrice: 49,
    description: "For small teams",
    features: [
      { text: "3 active job postings", included: true },
      { text: "25 applicants per month", included: true },
      { text: "Applicant tracking", included: true },
      { text: "Gig shift posting", included: true },
      { text: "1 location", included: true },
      { text: "Video interviews", included: false },
      { text: "Campaign engine", included: false },
    ],
    cta: "Start Starter",
    href: "/login?plan=starter",
    popular: false,
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    description: "For growing restaurants",
    features: [
      { text: "Unlimited job postings", included: true },
      { text: "Unlimited applicants", included: true },
      { text: "Campaign engine (Facebook & Instagram ads)", included: true },
      { text: "Async video interviews", included: true },
      { text: "Talent pool search", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Up to 5 locations", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Start Pro",
    href: "/login?plan=pro",
    popular: true,
    footnote: "Includes $0 in ad spend. Pay only for actual ads.",
  },
  {
    name: "Enterprise",
    monthlyPrice: 299,
    description: "For restaurant groups",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited locations", included: true },
      { text: "White label", included: true },
      { text: "API access", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    cta: "Contact Sales",
    href: "mailto:sales@krewhuddle.com?subject=Enterprise Plan Inquiry",
    popular: false,
  },
];

const FAQ = [
  {
    question: "Is there a free trial?",
    answer: "Yes, you get 14 days free on the Pro plan. No credit card required.",
  },
  {
    question: "Can I change plans?",
    answer: "Yes, you can upgrade or downgrade anytime. Changes take effect immediately and are prorated.",
  },
  {
    question: "How does ad billing work?",
    answer: "You pay for actual ad spend separately from your subscription. We add a 20% management fee on top of what Meta charges.",
  },
  {
    question: "What's the ad management fee?",
    answer: "We charge 20% on top of actual Meta ad spend. If Meta charges $32/day, you pay $38.40.",
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes, we offer prorated refunds within 7 days of any charge.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "All major credit and debit cards via Stripe. We also support ACH for Enterprise plans.",
  },
];

const COMPARISON_FEATURES = [
  { name: "Active job postings", free: "1", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Applicants per month", free: "5", starter: "25", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Video interviews", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Campaign engine", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Talent pool", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "Gig marketplace", free: "-", starter: true, pro: true, enterprise: true },
  { name: "Locations", free: "1", starter: "1", pro: "5", enterprise: "Unlimited" },
  { name: "Team members", free: "1", starter: "3", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Analytics", free: "-", starter: "-", pro: true, enterprise: true },
  { name: "White label", free: "-", starter: "-", pro: "-", enterprise: true },
  { name: "API access", free: "-", starter: "-", pro: "-", enterprise: true },
  { name: "Dedicated account manager", free: "-", starter: "-", pro: "-", enterprise: true },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Krew Recruiter" className="h-8 w-8 rounded-md object-contain" />
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
        <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Start free. Upgrade when you're ready to grow.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? "font-semibold" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${annual ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm ${annual ? "font-semibold" : "text-muted-foreground"}`}>
            Annual <Badge variant="secondary" className="ml-1 text-xs">2 months free</Badge>
          </span>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {PLANS.map(plan => {
            const price = annual && plan.monthlyPrice > 0
              ? Math.round(plan.monthlyPrice * 10 / 12)
              : plan.monthlyPrice;

            return (
              <Card key={plan.name} className={plan.popular ? "border-primary ring-2 ring-primary relative shadow-lg" : ""}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-secondary text-secondary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="pt-8 pb-6 flex flex-col h-full">
                  <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                  {plan.monthlyPrice === 0 ? (
                    <p className="text-3xl font-bold mb-6">Free</p>
                  ) : (
                    <p className="text-3xl font-bold mb-6">
                      ${price}<span className="text-base font-normal text-muted-foreground">/mo</span>
                      {annual && plan.monthlyPrice > 0 && (
                        <span className="block text-xs text-muted-foreground font-normal mt-1">
                          billed annually
                        </span>
                      )}
                    </p>
                  )}

                  <ul className="space-y-2.5 text-sm flex-1 mb-6">
                    {plan.features.map(f => (
                      <li key={f.text} className="flex items-start gap-2">
                        {f.included ? (
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <span className={f.included ? "" : "text-muted-foreground"}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.footnote && (
                    <p className="text-xs text-muted-foreground mb-3">{plan.footnote}</p>
                  )}

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
                      {plan.cta}{plan.popular && plan.monthlyPrice > 0 ? ` \u2014 $${price}/mo` : ""} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
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

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
