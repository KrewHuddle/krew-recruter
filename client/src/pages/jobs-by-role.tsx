import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, ArrowRight } from "lucide-react";

const ROLE_INFO: Record<string, { title: string; description: string; avgPay: string }> = {
  "line-cook": { title: "Line Cook", description: "Prepare food items according to recipes and chef instructions. Work stations include grill, saute, fry, and prep.", avgPay: "$14-$20/hr" },
  "bartender": { title: "Bartender", description: "Mix and serve drinks, manage bar inventory, provide excellent customer service. Tips often double base pay.", avgPay: "$12-$18/hr + tips" },
  "server": { title: "Server", description: "Take orders, serve food and beverages, ensure guest satisfaction. Strong communication and multitasking skills required.", avgPay: "$3-$8/hr + tips" },
  "chef": { title: "Chef", description: "Lead kitchen operations, develop menus, manage food costs and kitchen staff. Requires culinary training and experience.", avgPay: "$45k-$75k/yr" },
  "sous-chef": { title: "Sous Chef", description: "Second-in-command in the kitchen. Oversee daily operations, train line cooks, maintain quality standards.", avgPay: "$40k-$60k/yr" },
  "executive-chef": { title: "Executive Chef", description: "Top culinary leadership role. Menu development, budgeting, hiring, and overall kitchen management.", avgPay: "$60k-$100k/yr" },
  "dishwasher": { title: "Dishwasher", description: "Clean and sanitize dishes, kitchen equipment, and work areas. Essential role keeping the kitchen running smoothly.", avgPay: "$12-$16/hr" },
  "host-hostess": { title: "Host/Hostess", description: "Greet guests, manage reservations and waitlists, coordinate seating. The first impression of the restaurant.", avgPay: "$12-$16/hr" },
  "food-runner": { title: "Food Runner", description: "Deliver food from kitchen to tables quickly and accurately. Support servers and maintain dining room flow.", avgPay: "$10-$14/hr + tips" },
  "barback": { title: "Barback", description: "Support bartenders by restocking supplies, cleaning glassware, and maintaining the bar area.", avgPay: "$10-$14/hr + tips" },
  "prep-cook": { title: "Prep Cook", description: "Prepare ingredients for cooking — chopping, measuring, marinating. Foundation of kitchen efficiency.", avgPay: "$13-$17/hr" },
  "restaurant-manager": { title: "Restaurant Manager", description: "Oversee all restaurant operations including staff, finances, customer service, and compliance.", avgPay: "$45k-$70k/yr" },
  "general-manager": { title: "General Manager", description: "Full P&L responsibility for the restaurant. Strategic planning, hiring, budgeting, and growth.", avgPay: "$55k-$90k/yr" },
  "catering-staff": { title: "Catering Staff", description: "Set up, serve, and break down catering events. Flexible scheduling with varied event types.", avgPay: "$14-$22/hr" },
  "hotel-front-desk": { title: "Hotel Front Desk", description: "Check guests in and out, handle reservations, resolve issues. Customer service focused.", avgPay: "$13-$18/hr" },
  "barista": { title: "Barista", description: "Prepare espresso drinks, serve customers, maintain cafe cleanliness. Coffee knowledge a plus.", avgPay: "$12-$16/hr + tips" },
  "busser": { title: "Busser", description: "Clear and reset tables, assist servers, maintain dining room cleanliness. Great entry-level position.", avgPay: "$10-$14/hr + tips" },
};

function formatRole(slug: string): string {
  return ROLE_INFO[slug]?.title || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function JobsByRole() {
  const [, params] = useRoute("/jobs/role/:role");
  const roleSlug = params?.role || "";
  const roleTitle = formatRole(roleSlug);
  const info = ROLE_INFO[roleSlug];

  const { data, isLoading } = useQuery({
    queryKey: ["/api/jobs/public", roleSlug],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/public?q=${encodeURIComponent(roleTitle)}&limit=50`);
      if (!res.ok) return { jobs: [] };
      return res.json();
    },
    enabled: !!roleSlug,
  });

  const jobs = data?.jobs || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{roleTitle} Jobs — Find {roleTitle} Positions Near You | Krew Recruiter</title>
        <meta name="description" content={`Find ${roleTitle.toLowerCase()} jobs at restaurants near you. ${info?.avgPay || "Competitive pay"}. Apply in minutes with video interviews on Krew Recruiter.`} />
        <link rel="canonical" href={`https://krewrecruiter.com/jobs/role/${roleSlug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": `${roleTitle} Jobs`,
          "description": `${roleTitle} job listings in hospitality`,
          "url": `https://krewrecruiter.com/jobs/role/${roleSlug}`,
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
          <span>{roleTitle}</span>
        </div>

        <h1 className="text-3xl font-bold mb-2">{roleTitle} Jobs</h1>

        {info && (
          <div className="mb-8">
            <p className="text-muted-foreground mb-3">{info.description}</p>
            <Badge variant="secondary" className="text-sm">Average Pay: {info.avgPay}</Badge>
          </div>
        )}

        {/* CTA */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm font-medium">Looking for a {roleTitle.toLowerCase()} position? Create your profile and get matched.</p>
            <Link href="/workers/signup"><Button size="sm">Get Started <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
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
            <h2 className="text-xl font-semibold mb-2">No {roleTitle.toLowerCase()} jobs posted yet</h2>
            <p className="text-muted-foreground mb-6">Create a profile and we'll notify you when positions open.</p>
            <Link href="/workers/signup"><Button>Create Free Account</Button></Link>
          </div>
        )}

        {/* Other roles */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4">Explore Other Roles</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_INFO)
              .filter(([slug]) => slug !== roleSlug)
              .slice(0, 12)
              .map(([slug, r]) => (
                <Link key={slug} href={`/jobs/role/${slug}`}>
                  <Button variant="outline" size="sm">{r.title}</Button>
                </Link>
              ))}
          </div>
        </div>

        {/* City links */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">{roleTitle} Jobs by City</h2>
          <div className="flex flex-wrap gap-2">
            {["charlotte-nc", "new-york-ny", "los-angeles-ca", "chicago-il", "miami-fl", "atlanta-ga", "nashville-tn", "las-vegas-nv", "houston-tx", "seattle-wa"].map(slug => {
              const parts = slug.split("-");
              const st = parts.pop()?.toUpperCase();
              const ct = parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
              return (
                <Link key={slug} href={`/jobs/location/${slug}`}>
                  <Button variant="outline" size="sm">{ct}, {st}</Button>
                </Link>
              );
            })}
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
