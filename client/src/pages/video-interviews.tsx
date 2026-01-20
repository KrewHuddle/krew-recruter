import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Video,
  Share2,
  Zap,
  Star,
  CheckCircle,
  Calendar,
  Play,
  ArrowRight,
  Sparkles,
  Building2,
  Shield,
  Heart,
} from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";
import serverImage from "@assets/stock_images/american_waiter_serv_e9242854.jpg";
import bartenderImage from "@assets/stock_images/american_bartender_s_130b2a50.jpg";
import chefImage from "@assets/stock_images/american_chef_cookin_bc491ccc.jpg";

const benefits = [
  {
    icon: Calendar,
    title: "No More Scheduling",
    description: "Eliminate the back-and-forth of scheduling phone screens. Candidates record at their convenience.",
  },
  {
    icon: Zap,
    title: "Screen 10x Faster",
    description: "Review video responses in your own time. Watch at 2x speed to save even more time.",
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    description: "Share candidate videos with your team. Get everyone's input before making decisions.",
  },
  {
    icon: Building2,
    title: "Built into Your ATS",
    description: "Video interviews integrate seamlessly with Krew's applicant tracking system.",
  },
  {
    icon: Heart,
    title: "Great Candidate Experience",
    description: "No apps to download, no accounts to create. Works on any device with a camera.",
  },
];

const testimonials = [
  {
    quote: "We went from screening 20 candidates a week to over 100. The time savings have been incredible for our restaurant group.",
    name: "Maria Santos",
    role: "HR Director",
    company: "Coastal Dining Group",
    image: serverImage,
  },
  {
    quote: "I love seeing candidates' personalities before the in-person interview. It helps us find people who truly love hospitality.",
    name: "James Chen",
    role: "General Manager",
    company: "The Grand Hotel",
    image: bartenderImage,
  },
  {
    quote: "Our hiring managers can review candidates on their own schedule. No more coordinating 10 calendars for phone screens.",
    name: "Sarah Williams",
    role: "Talent Acquisition",
    company: "Premiere Restaurants",
    image: chefImage,
  },
];

const features = [
  {
    tag: "SAVE TIME AND MONEY",
    title: "Record once, interview thousands",
    description: "Build your interview template once with hospitality-focused questions. Then invite as many candidates as you want. Each candidate records their responses independently - no scheduling required.",
    points: [
      "Create reusable question templates for each role",
      "Set time limits per question (30 seconds to 5 minutes)",
      "Include intro videos to make candidates feel welcome",
      "Track completion rates in real-time",
    ],
  },
  {
    tag: "AUTOMATE YOUR PROCESS",
    title: "No more scheduling nightmares",
    description: "Forget about coordinating time zones, missed calls, and phone tag. Candidates view questions from your hiring team and record their answers whenever it works for them.",
    points: [
      "Candidates complete interviews on their own time",
      "Works across all time zones automatically",
      "No downloads or app installations needed",
      "Mobile-friendly for on-the-go candidates",
    ],
  },
  {
    tag: "REVIEW & SHARE",
    title: "Collaborate with your team",
    description: "Review candidate submissions when it suits you. Watch at 1.5x or 2x speed. Share favorites with your hiring team and get everyone aligned before the next round.",
    points: [
      "Star and rate candidate responses",
      "Add notes and comments for your team",
      "Share interview links with hiring managers",
      "Compare candidates side-by-side",
    ],
  },
  {
    tag: "HOSPITALITY-FOCUSED",
    title: "Questions designed for service roles",
    description: "Our question library is built specifically for hospitality hiring. Pre-built templates for servers, bartenders, hosts, line cooks, and more.",
    points: [
      '"Tell me about a time you turned an unhappy guest into a regular"',
      '"How do you handle a busy Friday night rush?"',
      '"Describe your approach to upselling menu items"',
      "50+ hospitality-specific question templates",
    ],
  },
];

const faqs = [
  {
    question: "What is a one-way video interview?",
    answer: "A one-way video interview allows candidates to record their responses to pre-set interview questions at their convenience. Instead of scheduling live calls, candidates watch your recorded questions and record their answers using their phone or computer. Recruiters can then review responses at their own pace.",
  },
  {
    question: "Do candidates need to download an app?",
    answer: "No! Candidates simply click the interview link you send them. The interview works directly in their web browser on any device - phone, tablet, or computer. No downloads, no accounts to create.",
  },
  {
    question: "Can I customize questions for different roles?",
    answer: "Absolutely. You can create different interview templates for each position. A server template might focus on guest service scenarios, while a line cook template might ask about kitchen experience and food safety knowledge.",
  },
  {
    question: "How long can candidate responses be?",
    answer: "You set the time limit for each question - anywhere from 30 seconds to 5 minutes. Most hospitality employers find 1-2 minutes per question works well. You can also give candidates thinking time before they start recording.",
  },
  {
    question: "Can I share candidate videos with my team?",
    answer: "Yes! Share individual videos or entire interview sessions with hiring managers, location managers, or anyone on your team. They can watch, rate, and comment - all without scheduling a meeting.",
  },
  {
    question: "Is this included in my Krew Recruiter subscription?",
    answer: "Video interviews are included in Pro and Enterprise plans. Free plan users can try 5 video interviews to see how it works for their hiring process.",
  },
];

const stats = [
  { value: "90%", label: "Less time scheduling" },
  { value: "5x", label: "More candidates screened" },
  { value: "48hrs", label: "Avg. time to first response" },
  { value: "4.9/5", label: "Candidate satisfaction" },
];

export default function VideoInterviews() {
  useEffect(() => {
    document.title = "One-Way Video Interviews for Hospitality | Krew Recruiter";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Screen more candidates in less time with async video interviews. No scheduling, no phone tag. Built for hospitality hiring teams. Try free for 30 days.");
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "Screen more candidates in less time with async video interviews. No scheduling, no phone tag. Built for hospitality hiring teams. Try free for 30 days.";
      document.head.appendChild(meta);
    }
    
    return () => {
      document.title = "Krew Recruiter";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex flex-wrap h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex flex-wrap items-center gap-2">
            <img src={logoImage} alt="Krew Recruiter" className="h-8 w-auto" />
            <span className="text-xl font-bold text-foreground" data-testid="text-logo">Krew Recruiter</span>
          </Link>
          <div className="hidden md:flex flex-wrap items-center gap-6">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-home">
              Home
            </Link>
            <Link href="/gig-board" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-gig-board">
              Gig Board
            </Link>
            <Link href="/jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-jobs">
              Find Jobs
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" data-testid="button-sign-in">Sign In</Button>
            </Link>
            <Link href="/auth">
              <Button data-testid="button-get-started">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8" data-testid="section-hero">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6" data-testid="badge-hero">
              <Sparkles className="h-3 w-3 mr-1" />
              One-Way Video Interviews for Hospitality
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6" data-testid="heading-hero">
              The most <span className="text-primary">candidate-friendly</span> video interview platform
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              Screen more candidates in less time. No scheduling, no phone tag. 
              Just authentic responses from people who love to serve.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
              <Link href="/auth">
                <Button size="lg" className="gap-2" data-testid="button-try-free">
                  Try Free for 30 Days
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="gap-2" data-testid="button-book-demo">
                <Play className="h-4 w-4" />
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-8">No credit card required</p>

            {/* Review Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8" data-testid="review-badges">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">G2</div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Based on 200+ reviews</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">Capterra</div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Based on 150+ reviews</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/40 bg-muted/30" data-testid="section-stats">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center" data-testid={`stat-${index}`}>
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" data-testid="section-trusted-by">
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-sm text-muted-foreground mb-8">
            TRUSTED BY LEADING HOSPITALITY BRANDS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
            <div className="text-xl font-bold text-muted-foreground">Marriott Hotels</div>
            <div className="text-xl font-bold text-muted-foreground">Darden Restaurants</div>
            <div className="text-xl font-bold text-muted-foreground">Hilton</div>
            <div className="text-xl font-bold text-muted-foreground">Chipotle</div>
            <div className="text-xl font-bold text-muted-foreground">Hyatt</div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30" data-testid="section-benefits">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-benefits">
              Why use video interviews?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hospitality hiring moves fast. Video interviews help you screen more candidates 
              without sacrificing the personal touch.
            </p>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover-elevate" data-testid={`card-benefit-${index}`}>
                <CardContent className="pt-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" data-testid="section-testimonials">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">
              <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
              Customer Stories
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-testimonials">
              Loved by hospitality recruiters
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-testimonial-${index}`}>
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Deep-Dives */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30" data-testid="section-features">
        <div className="mx-auto max-w-7xl space-y-24">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              data-testid={`feature-${index}`}
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <Badge variant="outline" className="mb-4">{feature.tag}</Badge>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground mb-6">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex flex-wrap items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <div className="text-center p-8">
                        <Video className="h-16 w-16 text-primary/40 mx-auto mb-4" />
                        <p className="text-muted-foreground">Product Screenshot</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Awards/Badges Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" data-testid="section-awards">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-lg font-semibold text-muted-foreground">
              "Easiest to use video interviewing software"
            </p>
            <p className="text-sm text-muted-foreground">— G2 Crowd, 2025</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["Ease of Setup", "Ease of Admin", "Ease of Use", "Leader", "Best Results", "Best Support"].map((badge, index) => (
              <div key={index} className="flex flex-col items-center gap-2 p-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <span className="text-xs font-medium text-center">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30" data-testid="section-faq">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-faq">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Everything you need to know about one-way video interviews
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full" data-testid="accordion-faq">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} data-testid={`faq-item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" data-testid="section-cta">
        <div className="mx-auto max-w-4xl">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-12 text-center text-primary-foreground">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="heading-cta">
                  Try it out
                </h2>
                <p className="text-lg mb-8 opacity-90 max-w-xl mx-auto">
                  See what makes Krew the easiest, most powerful video interviewing platform 
                  for hospitality hiring.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/auth">
                    <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-try-free">
                      Try Free for 30 Days
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button size="lg" variant="outline" className="gap-2 bg-transparent border-primary-foreground/30 text-primary-foreground" data-testid="button-cta-book-demo">
                    Book a Demo
                  </Button>
                </div>
                <p className="text-sm mt-4 opacity-75">No credit card required</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <img src={logoImage} alt="Krew Recruiter" className="h-6 w-auto" />
              <span className="font-semibold">Krew Recruiter</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/gig-board" className="hover:text-foreground transition-colors">Gig Board</Link>
              <Link href="/jobs" className="hover:text-foreground transition-colors">Find Jobs</Link>
              <Link href="/auth" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            © 2026 Krew Recruiter. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
