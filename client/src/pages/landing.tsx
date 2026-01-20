import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Users,
  Clock,
  Video,
  Briefcase,
  Heart,
  ArrowRight,
  CheckCircle2,
  Star,
  Calendar,
  DollarSign,
  Play,
  MessageSquare,
  Zap,
  Building2,
  UserCheck,
  Sparkles,
} from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";
import bartenderImage from "@assets/stock_images/professional_bartend_1db7c91e.jpg";
import serverImage from "@assets/stock_images/friendly_server_wait_3f557bb6.jpg";
import chefImage from "@assets/stock_images/chef_kitchen_profess_3d2a4a77.jpg";

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
      "Video interviews let us see the personality behind the resume. We finally hire people who genuinely love hospitality.",
    author: "Elena Rodriguez",
    role: "Talent Acquisition, Hospitality Group",
    rating: 5,
  },
];

const hospitalityBenefits = [
  {
    icon: Heart,
    title: "Passion-First Hiring",
    description: "Video interviews reveal personality and service mindset before the first day.",
  },
  {
    icon: Zap,
    title: "Fill Shifts Instantly",
    description: "Access vetted gig workers ready for last-minute coverage when you need it.",
  },
  {
    icon: Calendar,
    title: "Seasonal Flexibility",
    description: "Scale your team up or down with a mix of full-time staff and gig workers.",
  },
  {
    icon: Building2,
    title: "Multi-Location Ready",
    description: "Manage hiring across all your venues from one centralized dashboard.",
  },
  {
    icon: UserCheck,
    title: "Pre-Vetted Talent",
    description: "Every gig worker is verified with ratings and reliability scores.",
  },
  {
    icon: Sparkles,
    title: "Smart Matching",
    description: "AI-powered matching connects you with candidates who fit your culture.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex flex-wrap h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <img src={logoImage} alt="Krew Recruiter" className="h-9 w-9 rounded-lg object-contain" data-testid="img-logo-nav" />
            <span className="text-xl font-semibold" data-testid="text-brand-nav">Krew Recruiter</span>
          </div>
          <div className="hidden md:flex flex-wrap items-center gap-8">
            <a href="#gigs" className="text-sm text-muted-foreground transition-colors duration-200" data-testid="link-nav-gigs">
              Krew Gigs
            </a>
            <a href="#interviews" className="text-sm text-muted-foreground transition-colors duration-200" data-testid="link-nav-interviews">
              Video Interviews
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground transition-colors duration-200" data-testid="link-nav-testimonials">
              Testimonials
            </a>
            <Link href="/gigs">
              <span className="text-sm text-muted-foreground cursor-pointer transition-colors duration-200" data-testid="link-nav-find-gigs">
                Find Gigs
              </span>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            <a href="/login">
              <Button variant="ghost" data-testid="button-login">Sign in</Button>
            </a>
            <a href="/login">
              <Button data-testid="button-get-started">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary" data-testid="text-hero-tagline">
                <Heart className="h-4 w-4" />
                <span data-testid="text-hero-tagline-text">Built for hospitality, by hospitality</span>
              </div>
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" data-testid="text-hero-heading">
                Find people who{" "}
                <span className="text-primary relative">
                  love to serve
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="3" fill="none"/>
                  </svg>
                </span>
              </h1>
              <p className="mt-6 text-xl text-muted-foreground leading-relaxed" data-testid="text-hero-description">
                Great hospitality starts with great people. Krew Recruiter helps you discover passionate talent through video interviews, and fills last-minute shifts with our gig worker marketplace.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4">
                <a href="/login">
                  <Button size="lg" className="gap-2 shadow-lg shadow-primary/25" data-testid="button-hero-employer">
                    I'm Hiring
                    <Briefcase className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/gigs/join">
                  <Button variant="outline" size="lg" className="gap-2" data-testid="button-hero-worker">
                    I Want to Work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-1.5" data-testid="text-hero-free">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Free to start
                </div>
                <div className="flex flex-wrap items-center gap-1.5" data-testid="text-hero-video">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Video interviews included
                </div>
                <div className="flex flex-wrap items-center gap-1.5" data-testid="text-hero-gigs">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Access gig workers instantly
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
                <div className="relative grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <img 
                      src={bartenderImage} 
                      alt="Professional bartender" 
                      className="rounded-2xl shadow-2xl object-cover h-48 w-full"
                      data-testid="img-hero-bartender"
                    />
                    <img 
                      src={chefImage} 
                      alt="Professional chef" 
                      className="rounded-2xl shadow-2xl object-cover h-32 w-full"
                      data-testid="img-hero-chef"
                    />
                  </div>
                  <div className="pt-8">
                    <img 
                      src={serverImage} 
                      alt="Friendly server" 
                      className="rounded-2xl shadow-2xl object-cover h-72 w-full"
                      data-testid="img-hero-server"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-card border border-border rounded-xl p-4 shadow-xl" data-testid="card-hero-stat">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex flex-wrap items-center justify-center">
                      <Users className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">50K+</div>
                      <div className="text-xs text-muted-foreground">Hospitality Pros</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-gradient-to-r from-card via-card/80 to-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4" data-testid="stats-container">
            <div className="text-center group" data-testid="stat-hospitality-pros">
              <div className="text-3xl font-bold text-primary transition-transform duration-300">50K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Hospitality Pros</div>
            </div>
            <div className="text-center group" data-testid="stat-video-interviews">
              <div className="text-3xl font-bold text-primary transition-transform duration-300">10K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Video Interviews</div>
            </div>
            <div className="text-center group" data-testid="stat-venues-served">
              <div className="text-3xl font-bold text-primary transition-transform duration-300">2K+</div>
              <div className="mt-1 text-sm text-muted-foreground">Venues Served</div>
            </div>
            <div className="text-center group" data-testid="stat-time-to-fill">
              <div className="text-3xl font-bold text-primary transition-transform duration-300">4hrs</div>
              <div className="mt-1 text-sm text-muted-foreground">Avg. Time to Fill Gig</div>
            </div>
          </div>
        </div>
      </section>

      <section id="gigs" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <Badge variant="secondary" className="mb-4" data-testid="badge-gigs-marketplace">
                <Clock className="h-3 w-3 mr-1" />
                Krew Gigs Marketplace
              </Badge>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl lg:text-5xl" data-testid="text-gigs-heading">
                Fill shifts in hours, not weeks
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed" data-testid="text-gigs-description">
                Short-staffed for tonight's rush? Access a pool of pre-vetted hospitality professionals ready to work on your schedule. From bartenders to line cooks, find reliable gig workers who know the industry.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/20 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-feature-instant-booking">Instant Booking</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-feature-instant-booking-desc">Post a shift and get confirmed workers within hours</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/20 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Star className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-feature-reliability">Reliability Scores</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-feature-reliability-desc">Every worker rated by venues. No more no-shows.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/20 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-feature-pricing">Transparent Pricing</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-feature-pricing-desc">Set your rate. Workers see what they'll earn upfront.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/login" data-testid="link-post-gig">
                  <Button className="gap-2 shadow-lg shadow-primary/25" data-testid="button-post-gig">
                    Post a Gig Shift
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/gigs">
                  <Button variant="outline" className="gap-2" data-testid="button-browse-shifts">
                    Browse Available Shifts
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-3xl blur-xl" />
              <Card className="relative p-6 space-y-4 border-secondary/20" data-testid="card-gig-mockup">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20" data-testid="badge-open-shift">Open Shift</Badge>
                  <span className="text-sm text-muted-foreground" data-testid="text-posted-time">Posted 2h ago</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold" data-testid="text-gig-title">Bartender Needed Tonight</h3>
                  <p className="text-muted-foreground mt-1" data-testid="text-gig-location">The Brass Monkey - Downtown</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5" data-testid="text-gig-time">
                    <Calendar className="h-4 w-4 text-secondary" />
                    Tonight, 6PM - 2AM
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5" data-testid="text-gig-pay">
                    <DollarSign className="h-4 w-4 text-secondary" />
                    $28/hr + tips
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3" data-testid="text-workers-interested">3 workers interested</p>
                  <div className="flex flex-wrap -space-x-2" data-testid="avatars-workers">
                    <div className="h-8 w-8 rounded-full bg-primary flex flex-wrap items-center justify-center text-xs font-medium text-primary-foreground ring-2 ring-background" data-testid="avatar-jm">JM</div>
                    <div className="h-8 w-8 rounded-full bg-secondary flex flex-wrap items-center justify-center text-xs font-medium text-secondary-foreground ring-2 ring-background" data-testid="avatar-ak">AK</div>
                    <div className="h-8 w-8 rounded-full bg-muted flex flex-wrap items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-background" data-testid="avatar-more">+1</div>
                  </div>
                </div>
                <img 
                  src={bartenderImage} 
                  alt="Bartender at work" 
                  className="rounded-lg object-cover h-32 w-full mt-4"
                  data-testid="img-gig-bartender"
                />
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="interviews" className="py-20 lg:py-32 bg-gradient-to-b from-card/50 to-background border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl blur-xl" />
              <Card className="relative p-6 border-primary/20" data-testid="card-interview-mockup">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex flex-wrap items-center justify-center text-sm font-medium text-primary-foreground" data-testid="avatar-candidate">SR</div>
                  <div>
                    <p className="font-semibold" data-testid="text-candidate-name">Sofia Rodriguez</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-candidate-role">Applying for Server</p>
                  </div>
                </div>
                <div className="aspect-video rounded-lg flex flex-wrap items-center justify-center mb-4 relative overflow-hidden" data-testid="video-placeholder">
                  <img 
                    src={serverImage} 
                    alt="Server interview" 
                    className="absolute inset-0 w-full h-full object-cover"
                    data-testid="img-interview-preview"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="relative h-16 w-16 rounded-full bg-primary/90 flex flex-wrap items-center justify-center shadow-xl">
                    <Play className="h-8 w-8 text-primary-foreground ml-1" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-medium" data-testid="text-interview-question">"Tell us about a time you turned an unhappy guest into a regular."</p>
                      <p className="text-xs text-muted-foreground mt-1" data-testid="text-response-duration">2:34 response</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" data-testid="badge-personality">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Great personality
                    </Badge>
                    <Badge variant="outline" data-testid="badge-experience">5 yrs experience</Badge>
                  </div>
                </div>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="secondary" className="mb-4" data-testid="badge-video-interviews">
                <Video className="h-3 w-3 mr-1" />
                Async Video Interviews
              </Badge>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl lg:text-5xl" data-testid="text-interviews-heading">
                See the person behind the resume
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed" data-testid="text-interviews-description">
                In hospitality, personality matters as much as skills. Our async video interviews let candidates show their service mindset, communication style, and passion for the industry - on their time.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-feature-screening">Screen 10x Faster</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-feature-screening-desc">Review video responses at your pace. No more scheduling phone screens.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-feature-questions">Hospitality-Focused Questions</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-feature-questions-desc">Templates designed for service roles. "Tell me about a difficult guest..."</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-feature-collaboration">Team Collaboration</h4>
                    <p className="text-sm text-muted-foreground" data-testid="text-feature-collaboration-desc">Share videos with your management team. Get everyone's input.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <a href="/login" data-testid="link-try-interviews">
                  <Button className="gap-2 shadow-lg shadow-primary/25" data-testid="button-try-interviews">
                    Try Video Interviews Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl" data-testid="text-benefits-heading">
              Why hospitality teams love Krew
            </h2>
            <p className="mt-4 text-lg text-muted-foreground" data-testid="text-benefits-description">
              Built specifically for the unique challenges of hospitality hiring.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hospitalityBenefits.map((benefit, index) => (
              <Card key={index} className="relative overflow-visible hover-elevate transition-all duration-300 group" data-testid={`card-benefit-${index}`}>
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex flex-wrap h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 text-primary transition-transform duration-300" data-testid={`icon-benefit-${index}`}>
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold" data-testid={`text-benefit-title-${index}`}>{benefit.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed" data-testid={`text-benefit-desc-${index}`}>
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="border-y border-border bg-gradient-to-b from-card/50 to-card py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl" data-testid="text-testimonials-heading">
              Trusted by hospitality leaders
            </h2>
            <p className="mt-4 text-lg text-muted-foreground" data-testid="text-testimonials-description">
              See why venues choose Krew to find people who love to serve.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="overflow-visible hover-elevate transition-all duration-300" data-testid={`card-testimonial-${index}`}>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-1 text-primary" data-testid={`rating-testimonial-${index}`}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-foreground leading-relaxed" data-testid={`quote-testimonial-${index}`}>
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-medium text-primary-foreground" data-testid={`avatar-testimonial-${index}`}>
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <div className="font-medium" data-testid={`author-testimonial-${index}`}>{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground" data-testid={`role-testimonial-${index}`}>{testimonial.role}</div>
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary px-6 py-16 sm:px-12 lg:px-20">
            <div className="absolute inset-0 -z-10">
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
              <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            </div>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-serif text-3xl font-bold text-primary-foreground sm:text-4xl" data-testid="text-cta-heading">
                Ready to find people who love to serve?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/90" data-testid="text-cta-subheading">
                Whether you need full-time staff or gig workers for tonight, Krew Recruiter has you covered.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                <a href="/login">
                  <Button size="lg" variant="secondary" className="gap-2 shadow-xl" data-testid="button-cta-employer">
                    Start Hiring Free
                    <Briefcase className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/gigs/join">
                  <Button size="lg" variant="outline" className="gap-2 bg-white/10 border-white/30 text-primary-foreground" data-testid="button-cta-worker">
                    Join as a Worker
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <img src={logoImage} alt="Krew Recruiter" className="h-8 w-8 rounded-lg object-contain" data-testid="img-logo-footer" />
                <span className="font-semibold" data-testid="text-brand-footer">Krew Recruiter</span>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-footer-tagline">
                The hiring platform for hospitality teams who care about service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4" data-testid="text-footer-employers-heading">For Employers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/login" className="transition-colors duration-200" data-testid="link-footer-post-jobs">Post Jobs</a></li>
                <li><a href="/login" className="transition-colors duration-200" data-testid="link-footer-post-gigs">Post Gig Shifts</a></li>
                <li><a href="/login" className="transition-colors duration-200" data-testid="link-footer-video-interviews">Video Interviews</a></li>
                <li><a href="/employers" className="transition-colors duration-200" data-testid="link-footer-pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" data-testid="text-footer-workers-heading">For Workers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/gigs"><span className="cursor-pointer transition-colors duration-200" data-testid="link-footer-browse-gigs">Browse Gigs</span></Link></li>
                <li><Link href="/gigs/join"><span className="cursor-pointer transition-colors duration-200" data-testid="link-footer-join-worker">Join as Worker</span></Link></li>
                <li><Link href="/jobs"><span className="cursor-pointer transition-colors duration-200" data-testid="link-footer-full-time">Full-Time Jobs</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" data-testid="text-footer-company-heading">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="transition-colors duration-200" data-testid="link-footer-about">About</a></li>
                <li><a href="#" className="transition-colors duration-200" data-testid="link-footer-contact">Contact</a></li>
                <li><a href="#" className="transition-colors duration-200" data-testid="link-footer-privacy">Privacy</a></li>
                <li><a href="#" className="transition-colors duration-200" data-testid="link-footer-terms">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
              &copy; {new Date().getFullYear()} Krew Recruiter. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-testid="text-footer-love">
              <Heart className="h-4 w-4 text-primary" />
              Built for people who love to serve
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
