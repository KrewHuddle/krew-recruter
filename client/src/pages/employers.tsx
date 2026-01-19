import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Users,
  Clock,
  Video,
  Briefcase,
  Globe,
  ArrowRight,
  CheckCircle2,
  Star,
  Building2,
  BarChart3,
  Layers,
  Shield,
} from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";

const features = [
  {
    icon: Briefcase,
    title: "Smart ATS Pipeline",
    description:
      "Streamline your hiring with an intuitive applicant tracking system built for hospitality. From screening to offer, manage every stage effortlessly.",
  },
  {
    icon: Clock,
    title: "Krew Gigs Marketplace",
    description:
      "Fill last-minute shifts instantly. Access a pool of vetted hospitality workers ready to work on-demand with reliability scores.",
  },
  {
    icon: Video,
    title: "Async Video Interviews",
    description:
      "Screen candidates faster with one-way video interviews. Review responses on your schedule and make better hiring decisions.",
  },
  {
    icon: Globe,
    title: "Job Board Distribution",
    description:
      "Post once, reach everywhere. Distribute jobs to Indeed, ZipRecruiter, and more with a single click.",
  },
  {
    icon: Star,
    title: "Sponsored Promotions",
    description:
      "Boost visibility for your most critical roles. Sponsored jobs get priority placement in search results.",
  },
  {
    icon: Users,
    title: "Multi-Location Management",
    description:
      "Manage hiring across all your locations from one dashboard. Perfect for restaurant groups and hotel chains.",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for small businesses just getting started",
    features: [
      "Post up to 3 jobs",
      "Basic applicant tracking",
      "Email support",
      "Job board distribution",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For growing teams with multiple locations",
    features: [
      "Unlimited job posts",
      "Advanced ATS pipeline",
      "Video interviews",
      "Gig marketplace access",
      "Priority support",
      "Team collaboration",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large hospitality groups and chains",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated success manager",
      "API access",
      "Custom branding",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    quote:
      "Krew Recruiter transformed how we hire seasonal staff. We filled 50 positions in half the time.",
    author: "Sarah Chen",
    role: "HR Director, Coastal Resorts",
    rating: 5,
  },
  {
    quote:
      "The gig marketplace saved us during our busiest weekend. Found amazing bartenders in hours, not weeks.",
    author: "Marcus Williams",
    role: "GM, The Brass Monkey",
    rating: 5,
  },
  {
    quote:
      "Video interviews let us screen candidates faster and find the perfect fit for our fine dining service team.",
    author: "Elena Rodriguez",
    role: "Talent Acquisition, Hospitality Group",
    rating: 5,
  },
];

export default function Employers() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={logoImage} alt="Krew Recruiter" className="h-9 w-9 rounded-lg object-contain" data-testid="img-logo-nav" />
              <span className="text-xl font-semibold">Krew</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/jobs">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Find Jobs
              </span>
            </Link>
            <Link href="/gigs">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Gig Shifts
              </span>
            </Link>
            <Link href="/employers">
              <span className="text-sm font-medium cursor-pointer">
                For Employers
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/api/login">
              <Button variant="ghost" data-testid="button-login">
                Sign in
              </Button>
            </a>
            <a href="/api/login">
              <Button data-testid="button-get-started">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              For Employers
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Hire hospitality talent{" "}
              <span className="text-primary">faster</span> and{" "}
              <span className="text-secondary">smarter</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              The all-in-one hiring platform for restaurants, hotels, and
              hospitality groups. From full-time staff to last-minute gig
              workers, find the right talent when you need it.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/api/login">
                <Button size="lg" className="gap-2" data-testid="button-hero-cta">
                  Start Hiring for Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#pricing">
                <Button variant="outline" size="lg" data-testid="button-view-pricing">
                  View Pricing
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Free forever plan
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Sign up with email or Google
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Jobs Posted
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Candidates Available
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">3 days</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Avg Time to Hire
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">92%</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Employer Satisfaction
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Everything you need to hire great hospitality talent
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From sourcing to onboarding, we've got you covered with powerful
              tools designed specifically for hospitality.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group relative overflow-visible hover-elevate transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-y border-border bg-card/50 py-20 lg:py-32"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the plan that fits your hiring needs
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative overflow-visible ${
                  plan.popular ? "border-primary shadow-lg" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href="/api/login" className="block mt-8">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Trusted by hospitality leaders
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See why thousands of venues choose Krew for their
              hiring needs.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="overflow-visible">
                <CardContent className="p-6">
                  <div className="flex gap-1 text-secondary">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-foreground leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <div className="font-medium">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 sm:px-12 lg:px-20">
            <div className="absolute inset-0 -z-10">
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-bold text-primary-foreground sm:text-4xl">
                Ready to transform your hiring?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/80">
                Join thousands of hospitality venues already using Krew
                to find and hire the best talent.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/api/login">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="gap-2"
                    data-testid="button-cta-bottom"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Krew Recruiter" className="h-8 w-8 rounded-lg object-contain" data-testid="img-logo-footer" />
              <span className="font-semibold">Krew</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Krew. All rights
              reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
