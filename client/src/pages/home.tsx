import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  MapPin,
  Briefcase,
  Clock,
  DollarSign,
  Building2,
  ChefHat,
  Users,
  ArrowRight,
  Star,
  TrendingUp,
} from "lucide-react";
import type { Job, Location as LocationType, Tenant } from "@shared/schema";
import logoImage from "@assets/3_1768835575859.png";

type JobWithDetails = Job & {
  location: LocationType | null;
  tenant: Tenant | null;
};

const popularRoles = [
  { name: "Server", icon: Users, count: 1240 },
  { name: "Bartender", icon: ChefHat, count: 856 },
  { name: "Line Cook", icon: ChefHat, count: 723 },
  { name: "Host/Hostess", icon: Users, count: 512 },
  { name: "Dishwasher", icon: ChefHat, count: 445 },
  { name: "Busser", icon: Users, count: 389 },
];

const featuredCompanies = [
  { name: "Coastal Resorts", jobs: 45, rating: 4.8 },
  { name: "Urban Eats Group", jobs: 32, rating: 4.6 },
  { name: "The Brass Monkey", jobs: 12, rating: 4.9 },
  { name: "Harbor Hotels", jobs: 28, rating: 4.7 },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: recentJobs } = useQuery<JobWithDetails[]>({
    queryKey: ["/api/jobs/public"],
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (locationQuery) params.set("location", locationQuery);
    setLocation(`/jobs?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img 
                src={logoImage} 
                alt="Krew Recruiter" 
                className="h-9 w-9 rounded-lg object-contain"
                data-testid="img-logo-nav"
              />
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
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
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
              <Button data-testid="button-post-job">Post a Job</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find your next{" "}
              <span className="text-primary">hospitality</span> job
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Thousands of restaurant, hotel, and hospitality jobs. 
              From servers to sous chefs, find your next opportunity.
            </p>

            <form onSubmit={handleSearch} className="mt-8">
              <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Job title, keyword, or company"
                    className="pl-10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-job-search"
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="City, state, or zip code"
                    className="pl-10 h-12"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    data-testid="input-location-search"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-8" data-testid="button-search-jobs">
                  Search Jobs
                </Button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {["Server", "Bartender", "Line Cook", "Host", "Dishwasher"].map((role) => (
                <Link key={role} href={`/jobs?q=${role}`}>
                  <Badge variant="secondary" className="cursor-pointer hover-elevate">
                    {role}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/50 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">15K+</div>
              <div className="text-sm text-muted-foreground">Active Jobs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">2K+</div>
              <div className="text-sm text-muted-foreground">Companies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Job Seekers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">4.8</div>
              <div className="text-sm text-muted-foreground">Avg Rating</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Recent Jobs</h2>
              <p className="text-muted-foreground">Fresh opportunities posted today</p>
            </div>
            <Link href="/jobs">
              <Button variant="outline" className="gap-2">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(recentJobs || []).slice(0, 6).map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="h-full hover-elevate cursor-pointer transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{job.title}</h3>
                        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {job.tenant?.name || "Company"}
                        </p>
                      </div>
                      {job.status === "PUBLISHED" && (
                        <Badge variant="secondary" className="shrink-0">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location.city}, {job.location.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {job.jobType === "FULL_TIME" ? "Full-time" : "Part-time"}
                      </span>
                      {job.payRangeMin && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          ${job.payRangeMin}
                          {job.payRangeMax && `-$${job.payRangeMax}`}/hr
                        </span>
                      )}
                    </div>
                    {job.scheduleTags && job.scheduleTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {job.scheduleTags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {(!recentJobs || recentJobs.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>New jobs coming soon! Check back later.</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Browse by Role</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularRoles.map((role) => (
              <Link key={role.name} href={`/jobs?q=${role.name}`}>
                <Card className="hover-elevate cursor-pointer transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <role.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground">{role.count.toLocaleString()} jobs</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Featured Companies</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCompanies.map((company) => (
              <Card key={company.name} className="hover-elevate cursor-pointer transition-all">
                <CardContent className="p-5 text-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold">{company.name}</h3>
                  <div className="flex items-center justify-center gap-1 mt-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
                    {company.rating}
                  </div>
                  <p className="text-sm text-primary mt-2">{company.jobs} open positions</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold">Are you hiring?</h2>
              <p className="mt-4 text-primary-foreground/80 text-lg">
                Post your jobs and reach thousands of qualified hospitality professionals. 
                From servers to executive chefs, find your next great hire.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link href="/employers">
                  <Button variant="secondary" size="lg" data-testid="button-employer-signup">
                    Start Hiring Free
                  </Button>
                </Link>
                <Link href="/employers">
                  <Button variant="outline" size="lg" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-primary-foreground/10 border-primary-foreground/20">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">3 days</div>
                  <div className="text-sm text-primary-foreground/70">Avg time to first applicant</div>
                </CardContent>
              </Card>
              <Card className="bg-primary-foreground/10 border-primary-foreground/20">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">Free</div>
                  <div className="text-sm text-primary-foreground/70">To post your first job</div>
                </CardContent>
              </Card>
              <Card className="bg-primary-foreground/10 border-primary-foreground/20">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-sm text-primary-foreground/70">Active job seekers</div>
                </CardContent>
              </Card>
              <Card className="bg-primary-foreground/10 border-primary-foreground/20">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold">92%</div>
                  <div className="text-sm text-primary-foreground/70">Employer satisfaction</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src={logoImage} 
                  alt="Krew Recruiter" 
                  className="h-8 w-8 rounded-lg object-contain"
                  data-testid="img-logo-footer"
                />
                <span className="font-semibold">Krew</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The #1 hospitality job marketplace connecting talent with opportunity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Job Seekers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/jobs"><span className="hover:text-foreground cursor-pointer">Browse Jobs</span></Link></li>
                <li><Link href="/gigs"><span className="hover:text-foreground cursor-pointer">Gig Shifts</span></Link></li>
                <li><a href="/api/login" className="hover:text-foreground">Create Profile</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Employers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/employers"><span className="hover:text-foreground cursor-pointer">Post a Job</span></Link></li>
                <li><Link href="/employers"><span className="hover:text-foreground cursor-pointer">Pricing</span></Link></li>
                <li><a href="/api/login" className="hover:text-foreground">Employer Login</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Krew. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
