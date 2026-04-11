import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, ArrowRight, Clock } from "lucide-react";

const NEARBY_CITIES: Record<string, string[]> = {
  "charlotte-nc": ["raleigh-nc", "waxhaw-nc", "atlanta-ga", "richmond-va"],
  "new-york-ny": ["newark-nj", "boston-ma", "philadelphia-pa"],
  "los-angeles-ca": ["san-diego-ca", "san-jose-ca", "san-francisco-ca"],
  "chicago-il": ["indianapolis-in", "minneapolis-mn", "columbus-oh"],
  "houston-tx": ["san-antonio-tx", "dallas-tx", "austin-tx"],
  "miami-fl": ["orlando-fl", "tampa-fl", "jacksonville-fl"],
  "atlanta-ga": ["charlotte-nc", "nashville-tn", "jacksonville-fl"],
  "nashville-tn": ["atlanta-ga", "louisville-ky", "memphis-tn"],
  "las-vegas-nv": ["phoenix-az", "los-angeles-ca", "denver-co"],
  "seattle-wa": ["portland-or", "san-francisco-ca"],
};

function formatCityState(slug: string): { city: string; state: string } {
  const parts = slug.split("-");
  const state = parts.pop()?.toUpperCase() || "";
  const city = parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { city, state };
}

export default function JobsByLocation() {
  const [, params] = useRoute("/jobs/location/:cityState");
  const cityState = params?.cityState || "";
  const { city, state } = formatCityState(cityState);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/jobs/public", city, state],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/public?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&limit=50`);
      if (!res.ok) return { jobs: [] };
      return res.json();
    },
    enabled: !!city,
  });

  const jobs = data?.jobs || [];
  const nearby = NEARBY_CITIES[cityState] || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Hospitality Jobs in {city}, {state} | Restaurant & Food Service Careers — Krew Recruiter</title>
        <meta name="description" content={`Find restaurant and hospitality jobs in ${city}, ${state}. Line cook, bartender, server, chef, and hotel positions. Apply in minutes on Krew Recruiter.`} />
        <link rel="canonical" href={`https://krewrecruiter.com/jobs/location/${cityState}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": `Hospitality Jobs in ${city}, ${state}`,
          "description": `Restaurant and hospitality job listings in ${city}, ${state}`,
          "url": `https://krewrecruiter.com/jobs/location/${cityState}`,
          "numberOfItems": jobs.length,
        })}</script>
      </Helmet>

      {/* Header */}
      <div className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xs">K</div>
            <span className="font-semibold text-sm">KREW RECRUITER</span>
          </Link>
          <div className="flex gap-2">
            <Link href="/jobs"><Button variant="ghost" size="sm">All Jobs</Button></Link>
            <Link href="/workers/signup"><Button size="sm">Find Work</Button></Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/jobs" className="hover:text-foreground">Jobs</Link>
          <span>/</span>
          <span>{city}, {state}</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">Hospitality Jobs in {city}, {state}</h1>
        <p className="text-muted-foreground mb-8">
          {jobs.length} open positions in restaurants, hotels, and food service near {city}.
        </p>

        {/* CTA for employers */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm font-medium">Hiring in {city}? Reach hospitality workers in your area.</p>
            <Link href="/employers"><Button size="sm">Post a Job <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
          </CardContent>
        </Card>

        {/* Job listings */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : jobs.length > 0 ? (
          <div className="space-y-3">
            {jobs.map((job: any) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold">{job.title}</h2>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location || `${job.city}, ${job.state}`}</span>
                        {job.salary && <span>{job.salary}</span>}
                        {job.employmentType && <Badge variant="secondary">{job.employmentType}</Badge>}
                      </div>
                    </div>
                    {job.applyUrl && (
                      <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm">Apply</Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No jobs in {city} yet</h2>
            <p className="text-muted-foreground mb-6">Be the first to know when restaurants in {city} start hiring.</p>
            <Link href="/workers/signup"><Button>Create Free Account</Button></Link>
          </div>
        )}

        {/* Nearby cities */}
        {nearby.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-4">Hospitality Jobs in Nearby Cities</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map(slug => {
                const { city: c, state: s } = formatCityState(slug);
                return (
                  <Link key={slug} href={`/jobs/location/${slug}`}>
                    <Button variant="outline" size="sm">{c}, {s}</Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Role links for this city */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4">Popular Roles in {city}</h2>
          <div className="flex flex-wrap gap-2">
            {["line-cook", "bartender", "server", "chef", "dishwasher", "host-hostess", "restaurant-manager", "barista"].map(role => (
              <Link key={role} href={`/jobs/role/${role}`}>
                <Button variant="outline" size="sm">{role.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t mt-12 py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Krew Recruiter. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
        </div>
      </div>
    </div>
  );
}
