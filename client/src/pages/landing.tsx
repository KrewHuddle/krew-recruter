import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
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
  Wand2,
  Radio,
  Megaphone,
  Menu,
  X,
} from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";
import bartenderImage from "@assets/stock_images/american_bartender_s_130b2a50.jpg";
import serverImage from "@assets/stock_images/american_waiter_serv_e9242854.jpg";
import chefImage from "@assets/stock_images/american_chef_cookin_bc491ccc.jpg";
const interviewVideo = "/candidate_recording_video_interview.mp4";

// Example quotes representing the kinds of feedback we've heard from
// operators during beta. Attributed to anonymized roles rather than
// fabricated people — replace these with real, permissioned quotes
// as they become available.
const testimonials = [
  {
    quote:
      "We used to post on three job boards and wait a week for applicants. Now we get video interviews in our dashboard the same day we launch a campaign.",
    author: "Hiring Manager",
    role: "Multi-location restaurant group",
    rating: 5,
  },
  {
    quote:
      "The gig marketplace saved us on a Saturday night — a line cook no-showed and we had a vetted replacement on the floor in under two hours.",
    author: "General Manager",
    role: "Independent bar & kitchen",
    rating: 5,
  },
  {
    quote:
      "Video interviews let us screen for personality before we commit to a face-to-face. In this industry, attitude matters more than resumes.",
    author: "Talent Lead",
    role: "Hospitality staffing group",
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState("");
  const [jobSearchCity, setJobSearchCity] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch jobs for the landing page job board (debounced)
  const [landingJobs, setLandingJobs] = useState<any[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/jobs/public?limit=6${jobSearchQuery ? `&q=${encodeURIComponent(jobSearchQuery)}` : ""}${jobSearchCity ? `&city=${encodeURIComponent(jobSearchCity)}` : ""}`)
        .then(r => r.ok ? r.json() : { jobs: [] })
        .then(d => setLandingJobs(d.jobs || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [jobSearchQuery, jobSearchCity]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('canplay', () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setShowPlayButton(false);
            })
            .catch(() => {
              setShowPlayButton(true);
            });
        }
      });
      video.addEventListener('error', () => {
        setVideoError(true);
        setShowPlayButton(true);
      });
    }
  }, []);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (video && !videoError) {
      video.play().then(() => {
        setShowPlayButton(false);
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Krew Recruiter — #1 Hospitality Hiring Platform | Find Restaurant Jobs & Staff</title>
        <meta name="description" content="Krew Recruiter connects restaurants and hospitality venues with passionate staff. Post jobs, run Facebook and Instagram ad campaigns, screen with async video interviews, and fill gig shifts instantly — built for hospitality operators." />
        <meta name="keywords" content="hospitality jobs, restaurant jobs, line cook jobs, bartender jobs, server jobs, restaurant hiring, hospitality staffing, food service jobs, chef jobs, hire restaurant staff" />
        <link rel="canonical" href="https://krewrecruiter.com" />
        <meta property="og:title" content="Krew Recruiter — Hospitality Hiring Platform" />
        <meta property="og:description" content="Find hospitality jobs or hire restaurant staff. Video interviews, Facebook ad campaigns, and gig shifts in one platform." />
        <meta property="og:url" content="https://krewrecruiter.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Krew Recruiter — Hospitality Hiring Platform" />
        <meta name="twitter:description" content="The hiring platform for hospitality." />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Krew Recruiter",
          "url": "https://krewrecruiter.com",
          "description": "Hospitality hiring platform for restaurants and venues",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://krewrecruiter.com/jobs?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        })}</script>
      </Helmet>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Krew Recruiter" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-semibold">Krew Recruiter</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#gigs" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Krew Gigs</a>
            <a href="/video-interviews" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Video Interviews</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Testimonials</a>
            <Link href="/gigs"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200">Find Gigs</span></Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <a href="/login"><Button variant="ghost">Sign in</Button></a>
            <a href="/login"><Button>Get Started</Button></a>
          </div>
          {/* Mobile: CTA + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <a href="/login"><Button size="sm" className="text-sm px-3">Get Started</Button></a>
            <button className="p-2 rounded-lg hover:bg-accent" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-1">
            {[
              { label: "Krew Gigs", href: "#gigs" },
              { label: "Video Interviews", href: "/video-interviews" },
              { label: "Find Jobs", href: "/jobs" },
              { label: "Find Gigs", href: "/gigs" },
              { label: "Pricing", href: "/pricing" },
            ].map(item => (
              <a key={item.label} href={item.href} onClick={() => setMobileMenuOpen(false)} className="py-3 px-3 rounded-lg hover:bg-accent text-base font-medium">{item.label}</a>
            ))}
            <div className="border-t border-border my-2" />
            <a href="/login"><Button variant="outline" className="w-full mb-2">Sign In</Button></a>
            <a href="/workers/signup"><Button className="w-full">Get Started</Button></a>
          </div>
        )}
      </nav>

      <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '5s' }} />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="mb-6 inline-flex flex-wrap items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
                <Heart className="h-4 w-4" />
                <span>Built for hospitality, by hospitality</span>
              </div>
              <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Find hospitality people who{" "}
                <span className="text-primary relative">
                  love to serve
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" stroke="currentColor" strokeWidth="3" fill="none"/>
                  </svg>
                </span>
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-xl text-muted-foreground leading-relaxed">
                Great hospitality starts with great people. Krew Recruiter helps you discover passionate talent through video interviews, and fills last-minute shifts with our gig worker marketplace.
              </p>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4">
                {/* "I'm Hiring" now points to /employers (the real employer
                    landing page) instead of /login. Previously new visitors
                    clicking this button had nothing to sign into — friction
                    at the highest-value conversion point on the page. */}
                <Link href="/employers" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/25">
                    I'm Hiring
                    <Briefcase className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/workers/signup" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                    I Want to Work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground text-center lg:text-left">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Free to start
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Video interviews included
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  Access gig workers instantly
                </div>
              </div>
            </div>
            {/* Mobile hero image — a single strong hero shot for mobile
                users. Previously the entire right column was `hidden
                lg:block` so visitors on phones saw no hero imagery at
                all, which loses ~40% of the page's visual impact on
                devices that probably account for the majority of
                traffic. Shown only below lg; desktop uses the 3-image
                mosaic below. */}
            <div className="relative lg:hidden mt-10">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/15 to-secondary/15 rounded-3xl blur-2xl" />
              <img
                src={serverImage}
                alt="Friendly server at work"
                className="relative rounded-2xl shadow-2xl object-cover h-64 sm:h-80 w-full"
              />
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

                    />
                    <img
                      src={chefImage}
                      alt="Professional chef"
                      className="rounded-2xl shadow-2xl object-cover h-32 w-full"

                    />
                  </div>
                  <div className="pt-8">
                    <img
                      src={serverImage}
                      alt="Friendly server"
                      className="rounded-2xl shadow-2xl object-cover h-72 w-full"

                    />
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-card border border-border rounded-xl p-4 shadow-xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex flex-wrap items-center justify-center">
                      <Heart className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">Built for</div>
                      <div className="text-xs text-muted-foreground">Hospitality Teams</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS SECTION ═══════
          Previously this section hardcoded hsl(270 25% 6%) backgrounds
          and text-white/* everywhere, which looked like a jarring dark
          band in light mode. Now uses design-system tokens (bg-card,
          text-foreground, border, muted-foreground) so it adapts to
          both light and dark modes, while keeping the same visual
          rhythm and dot-pattern overlay. */}
      <section className="py-24 px-6 relative overflow-hidden bg-card border-y border-border">
        {/* Dot pattern — uses currentColor via primary tint so it reads
            correctly in both modes instead of a hardcoded hex. */}
        <div className="absolute inset-0 opacity-[0.04] text-primary" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="max-w-6xl mx-auto relative">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">How It Works</span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
              Hire smarter. <span className="text-primary">Fill shifts faster.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Krew Recruiter runs targeted ads for your open positions on Facebook & Instagram — reaching hospitality workers who aren't on job boards.
            </p>
          </div>

          {/* 4 Steps */}
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px border-t-2 border-dashed border-primary/30 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { num: "01", icon: <Briefcase className="h-6 w-6 text-primary-foreground" />, title: "Post Your Job", desc: "Add job details in minutes. Import directly from Indeed or ZipRecruiter with a single link." },
                { num: "02", icon: <Wand2 className="h-6 w-6 text-primary-foreground" />, title: "We Build Your Ad", desc: "We auto-generate a high-converting ad with your logo and branding. No design skills needed." },
                { num: "03", icon: <Radio className="h-6 w-6 text-primary-foreground" />, title: "Ad Goes Live", desc: "Your job ad reaches hospitality workers within miles of your restaurant. Set your own daily budget." },
                { num: "04", icon: <Users className="h-6 w-6 text-primary-foreground" />, title: "Candidates Come to You", desc: "Review video interviews and shortlist candidates — all inside your Krew Recruiter dashboard." },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center relative z-10">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-primary to-secondary">
                      <div className="w-full h-full rounded-full flex flex-col items-center justify-center bg-primary">
                        {step.icon}
                        <span className="text-primary-foreground/90 text-xs font-bold mt-0.5">{step.num}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Platforms Bar */}
          <div className="mt-16 rounded-2xl border border-border bg-background/50 px-8 py-8">
            <p className="text-center text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase mb-8">
              Your job ads appear across these platforms — reaching the 97% of workers not on job boards
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10">
              {/* Facebook */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="24" fill="#1877F2"/><path d="M28.5 25H25.5V36H21V25H18.5V21H21V18.5C21 15.5 22.5 13 26 13H29V17H27C25.9 17 25.5 17.5 25.5 18.5V21H29L28.5 25Z" fill="white"/></svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                </div>
                <span className="font-medium text-sm">Facebook</span>
                <span className="text-muted-foreground text-xs">2.9B+ users</span>
              </div>
              {/* Instagram */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><defs><radialGradient id="ig-grad" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497"/><stop offset="5%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/><stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/></radialGradient></defs><rect width="48" height="48" rx="12" fill="url(#ig-grad)"/><rect x="13" y="13" width="22" height="22" rx="6" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.5" fill="none"/><circle cx="31.5" cy="16.5" r="1.5" fill="white"/></svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                </div>
                <span className="font-medium text-sm">Instagram</span>
                <span className="text-muted-foreground text-xs">2B+ users</span>
              </div>
              {/* Messenger */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="msg-grad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00B2FF"/><stop offset="100%" stopColor="#006AFF"/></linearGradient></defs><circle cx="24" cy="24" r="24" fill="url(#msg-grad)"/><path d="M24 10C16.27 10 10 15.9 10 23.2C10 27.32 11.98 31 15.2 33.44V38L19.84 35.4C21.16 35.76 22.56 36 24 36C31.73 36 38 30.1 38 22.8C38 15.5 31.73 10 24 10ZM25.2 27L22 23.6L15.8 27L22.6 19.6L25.8 23L32 19.6L25.2 27Z" fill="white"/></svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full ring-2 ring-background" />
                </div>
                <span className="font-medium text-sm">Messenger</span>
                <span className="text-muted-foreground text-xs">1B+ users</span>
              </div>
              {/* Divider */}
              <div className="hidden md:block w-px h-16 bg-border" />
              {/* TikTok — Coming Soon */}
              <div className="flex flex-col items-center gap-2 opacity-60">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="#010101"/><path d="M31 16.5C29.9 15.3 29.2 13.7 29 12H25.4V29C25.3 30.7 23.9 32 22.2 32C20.4 32 19 30.6 19 28.8C19 26.7 20.9 25.1 23 25.5V21.8C18.8 21.4 15.5 24.7 15.5 28.8C15.5 32.9 18.5 36 22.2 36C26.1 36 29.2 32.9 29.2 29V20.1C30.7 21.2 32.5 21.8 34.5 21.8V18.2C32.9 18.2 31.8 17.5 31 16.5Z" fill="white"/></svg>
                <span className="font-medium text-sm">TikTok</span>
                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Benefits bar. Previously this was a big-number stats bar
              claiming specific counts (50K+ in network, 48 hrs to first
              candidate, 20% below board cost per hire) that couldn't
              be verified. Replaced with qualitative benefit claims
              that are honest and still communicate the product value.
              When real metrics are available, promote them back here. */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border rounded-2xl border border-border bg-background/50 overflow-hidden">
            {[
              { icon: "\uD83C\uDF7D\uFE0F", title: "Hospitality-only", desc: "Every candidate is focused on restaurant and hospitality work" },
              { icon: "\u26A1", title: "Hours, not weeks", desc: "Candidates reach you as soon as the ad starts running" },
              { icon: "\uD83D\uDCB0", title: "Lower cost per hire", desc: "Pay per ad spend, not per posting — no per-job board fees" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-8 px-6 text-center">
                <span className="text-2xl mb-3">{stat.icon}</span>
                <span className="text-primary text-lg font-bold mb-1">{stat.title}</span>
                <span className="text-muted-foreground text-sm">{stat.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The second big-number stats bar that used to live here (50K+
          Hospitality Pros / 10K+ Video Interviews / 2K+ Venues Served /
          4hrs Avg Time to Fill Gig) was removed. Reasons: (1) it was
          redundant with the How It Works stats bar right above it —
          two big-number panels back-to-back was visually repetitive,
          and (2) the specific counts couldn't be verified and would
          be a false-advertising risk if fabricated. The page flows
          directly from the How It Works section into the job search
          without needing another metrics bar. */}

      {/* ═══════ JOB SEARCH SECTION ═══════ */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-bold sm:text-4xl mb-3">Browse Hospitality Jobs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Find restaurant, hotel, and food service positions near you.
            </p>
          </div>

          {/* Search bar. Wrapped in a form so pressing Enter submits
              and the Search Jobs button is a real submit button (was
              previously a Button with an empty onClick={() => {}} no-op,
              which looked broken when users clicked it). The actual
              fetch happens via the debounced effect on state change,
              so onSubmit just prevents the default page reload — the
              visible click feedback is what matters here. */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-10"
          >
            <input
              type="text"
              placeholder="Job title (e.g. Line Cook, Bartender)"
              className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={jobSearchQuery}
              onChange={e => setJobSearchQuery(e.target.value)}
              aria-label="Search jobs by title"
            />
            <input
              type="text"
              placeholder="City (e.g. Charlotte)"
              className="sm:w-44 px-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={jobSearchCity}
              onChange={e => setJobSearchCity(e.target.value)}
              aria-label="Filter jobs by city"
            />
            <Button type="submit" size="lg" className="shrink-0">
              Search Jobs
            </Button>
          </form>

          {/* Job listings — these come from /api/jobs/public which serves
              the aggregatedJobs table (scraped external postings from
              Adzuna, TheMuse, Arbeitnow, etc.). Link each card to the
              job's native applyUrl so users land on the real listing
              instead of an unrelated signup form. Opens in a new tab
              because it's leaving the Krew app entirely. Falls back to
              the worker signup only when no applyUrl is present. */}
          {landingJobs && landingJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {landingJobs.slice(0, 6).map((job: any) => {
                const destination = job.applyUrl || "/workers/signup";
                const isExternal = !!job.applyUrl;
                return (
                <a
                  key={job.id}
                  href={destination}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  className="block border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                    </div>
                    {job.salary && (
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full shrink-0">
                        {job.salary}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(job.city || job.location) && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {job.city && job.state ? `${job.city}, ${job.state}` : job.location}
                      </span>
                    )}
                    {job.employmentType && <span>{job.employmentType}</span>}
                    {job.source && <span className="opacity-50">via {job.source}</span>}
                  </div>
                  <p className="text-xs text-primary font-medium mt-3 group-hover:underline">
                    {isExternal ? "View listing" : "Apply now"} &rarr;
                  </p>
                </a>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Jobs loading... Check back soon or <Link href="/workers/signup" className="text-primary underline">create your profile</Link> to get notified.</p>
            </div>
          )}

          <div className="text-center mt-8">
            <Link href="/jobs">
              <Button variant="outline" size="lg">
                View All Jobs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section id="gigs" className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <Clock className="h-3 w-3 mr-1" />
                Krew Gigs Marketplace
              </Badge>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl lg:text-5xl">
                Fill shifts in hours, not weeks
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                Short-staffed for tonight's rush? Access a pool of pre-vetted hospitality professionals ready to work on your schedule. From bartenders to line cooks, find reliable gig workers who know the industry.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/20 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Zap className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Instant Booking</h4>
                    <p className="text-sm text-muted-foreground">Post a shift and get confirmed workers within hours</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/20 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Star className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Reliability Scores</h4>
                    <p className="text-sm text-muted-foreground">Every worker rated by venues. No more no-shows.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary/20 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Transparent Pricing</h4>
                    <p className="text-sm text-muted-foreground">Set your rate. Workers see what they'll earn upfront.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="/login">
                  <Button className="gap-2 shadow-lg shadow-primary/25">
                    Post a Gig Shift
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
                <Link href="/gigs">
                  <Button variant="outline" className="gap-2">
                    Browse Available Shifts
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-3xl blur-xl" />
              <Card className="relative p-6 space-y-4 border-secondary/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20">Open Shift</Badge>
                  <span className="text-sm text-muted-foreground">Posted 2h ago</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Bartender Needed Tonight</h3>
                  <p className="text-muted-foreground mt-1">The Brass Monkey - Downtown</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-secondary" />
                    Tonight, 6PM - 2AM
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-secondary" />
                    $28/hr + tips
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">3 workers interested</p>
                  <div className="flex flex-wrap -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary flex flex-wrap items-center justify-center text-xs font-medium text-primary-foreground ring-2 ring-background">JM</div>
                    <div className="h-8 w-8 rounded-full bg-secondary flex flex-wrap items-center justify-center text-xs font-medium text-secondary-foreground ring-2 ring-background">AK</div>
                    <div className="h-8 w-8 rounded-full bg-muted flex flex-wrap items-center justify-center text-xs font-medium text-muted-foreground ring-2 ring-background">+1</div>
                  </div>
                </div>
                <img 
                  src={bartenderImage} 
                  alt="Bartender at work" 
                  className="rounded-lg object-cover h-32 w-full mt-4"
                 
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
              <Card className="relative p-6 border-primary/20">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary flex flex-wrap items-center justify-center text-sm font-medium text-primary-foreground">SR</div>
                  <div>
                    <p className="font-semibold">Sofia Rodriguez</p>
                    <p className="text-sm text-muted-foreground">Applying for Server</p>
                  </div>
                </div>
                <div className="aspect-video rounded-lg flex flex-wrap items-center justify-center mb-4 relative overflow-hidden bg-muted">
                  {!videoError && (
                    <video 
                      ref={videoRef}
                      src={interviewVideo}
                      poster={serverImage}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      className="absolute inset-0 w-full h-full object-cover"
                     
                      onError={() => setVideoError(true)}
                    />
                  )}
                  {videoError && (
                    <img 
                      src={serverImage} 
                      alt="Video interview demo" 
                      className="absolute inset-0 w-full h-full object-cover"
                     
                    />
                  )}
                  {showPlayButton && !videoError && (
                    <button
                      onClick={handlePlayClick}
                      className="relative z-10 h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl cursor-pointer"
                     
                    >
                      <Play className="h-8 w-8 text-primary-foreground ml-1" />
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">"Tell us about a time you turned an unhappy guest into a regular."</p>
                      <p className="text-xs text-muted-foreground mt-1">2:34 response</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Great personality
                    </Badge>
                    <Badge variant="outline">5 yrs experience</Badge>
                  </div>
                </div>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="secondary" className="mb-4">
                <Video className="h-3 w-3 mr-1" />
                Async Video Interviews
              </Badge>
              <h2 className="font-serif text-3xl font-bold sm:text-4xl lg:text-5xl">
                See the person behind the resume
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                In hospitality, personality matters as much as skills. Our async video interviews let candidates show their service mindset, communication style, and passion for the industry - on their time.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Screen 10x Faster</h4>
                    <p className="text-sm text-muted-foreground">Review video responses at your pace. No more scheduling phone screens.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Hospitality-Focused Questions</h4>
                    <p className="text-sm text-muted-foreground">Templates designed for service roles. "Tell me about a difficult guest..."</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex flex-wrap items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Team Collaboration</h4>
                    <p className="text-sm text-muted-foreground">Share videos with your management team. Get everyone's input.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <a href="/login">
                  <Button className="gap-2 shadow-lg shadow-primary/25">
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
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              Why hospitality teams love Krew
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built specifically for the unique challenges of hospitality hiring.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {hospitalityBenefits.map((benefit, index) => (
              <Card key={index} className="relative overflow-visible hover-elevate transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex flex-wrap h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 text-primary transition-transform duration-300">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{benefit.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
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
            <Badge variant="secondary" className="mb-4">
              Example feedback
            </Badge>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">
              What hospitality operators tell us
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Representative examples of the feedback we've heard from beta operators. Quotes are illustrative; specific names are withheld until we have permission to share them.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="overflow-visible hover-elevate transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-1 text-primary">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-foreground leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-medium text-primary-foreground">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <div className="font-medium">{testimonial.author}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
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
              <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '3s' }} />
              <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse motion-reduce:animate-none" style={{ animationDuration: '4s' }} />
            </div>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-serif text-3xl font-bold text-primary-foreground sm:text-4xl">
                Ready to find people who love to serve?
              </h2>
              <p className="mt-4 text-lg text-primary-foreground/90">
                Whether you need full-time staff or gig workers for tonight, Krew Recruiter has you covered.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                {/* Matches the hero: employer CTA → /employers, not /login */}
                <Link href="/employers">
                  <Button size="lg" variant="secondary" className="gap-2 shadow-xl">
                    Start Hiring Free
                    <Briefcase className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/workers/signup">
                  <Button size="lg" variant="outline" className="gap-2 bg-white/10 border-white/30 text-primary-foreground">
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
                <img src={logoImage} alt="Krew Recruiter" className="h-8 w-8 rounded-lg object-contain" />
                <span className="font-semibold">Krew Recruiter</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The hiring platform for hospitality teams who care about service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/login" className="hover:text-foreground transition-colors duration-200">Post Jobs</a></li>
                <li><a href="/login" className="hover:text-foreground transition-colors duration-200">Post Gig Shifts</a></li>
                <li><a href="/video-interviews" className="hover:text-foreground transition-colors duration-200">Video Interviews</a></li>
                <li><a href="/employers" className="hover:text-foreground transition-colors duration-200">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Workers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/gigs"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">Browse Gigs</span></Link></li>
                <li><Link href="/workers/signup"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">Join as Worker</span></Link></li>
                <li><Link href="/jobs"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">Full-Time Jobs</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {/* About and Contact previously linked to href="#" (dead
                    links landing on the current URL). Wired to real
                    mailto: addresses matching the pattern already used
                    on other pages (pricing.tsx, help.tsx, billing.tsx).
                    An actual /about page would be the proper long-term
                    fix. */}
                <li><a href="mailto:hello@krewhuddle.com?subject=About%20Krew%20Recruiter" className="hover:text-foreground transition-colors duration-200">About</a></li>
                <li><a href="mailto:support@krewhuddle.com" className="hover:text-foreground transition-colors duration-200">Contact</a></li>
                <li><Link href="/privacy"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">Privacy Policy</span></Link></li>
                <li><Link href="/terms"><span className="cursor-pointer hover:text-foreground transition-colors duration-200">Terms of Use</span></Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Krew Recruiter. All rights reserved.
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Built for people who love to serve
              </span>
              <span>&middot;</span>
              <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
              <span>&middot;</span>
              <Link href="/terms" className="hover:text-foreground">Terms of Use</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
