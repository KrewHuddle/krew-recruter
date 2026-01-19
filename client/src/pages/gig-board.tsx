import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  AlertTriangle,
  Zap,
  ArrowRight,
  Filter,
} from "lucide-react";
import { useState } from "react";
import type { GigPost, Location, Tenant } from "@shared/schema";
import { FOH_ROLES, BOH_ROLES } from "@shared/schema";

type PublicGig = GigPost & {
  location?: Location;
  tenant?: Tenant;
};

const allRoles = [...FOH_ROLES, ...BOH_ROLES];

export default function GigBoard() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: gigs, isLoading } = useQuery<PublicGig[]>({
    queryKey: ["/api/gigs/public"],
  });

  const filteredGigs = gigs?.filter((gig) => {
    const matchesSearch =
      gig.role.toLowerCase().includes(search.toLowerCase()) ||
      gig.location?.name?.toLowerCase().includes(search.toLowerCase()) ||
      gig.tenant?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || gig.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Sort: urgent first, then by date
  const sortedGigs = filteredGigs?.sort((a, b) => {
    if (a.emergency && !b.emergency) return -1;
    if (!a.emergency && b.emergency) return 1;
    return new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold">Krew Gigs</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link href="/app">
                <Button data-testid="button-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/gigs/join">
                  <Button variant="outline" data-testid="button-join-gigs">
                    Join as Worker
                  </Button>
                </Link>
                <a href="/api/login">
                  <Button data-testid="button-login">Sign In</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-serif text-3xl font-bold sm:text-4xl">
              Find Hospitality Gigs Near You
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Browse short-term shifts at top restaurants, hotels, and venues.
              Get paid on your schedule.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by role, location, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-public-gigs"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-role-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Gigs List */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-3" />
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-6 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedGigs && sortedGigs.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                {sortedGigs.length} gig{sortedGigs.length !== 1 ? "s" : ""} available
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedGigs.map((gig) => (
                  <Card
                    key={gig.id}
                    className="overflow-visible hover-elevate cursor-pointer h-full group"
                    data-testid={`public-gig-card-${gig.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{gig.role}</h3>
                          <p className="text-sm text-muted-foreground">
                            {gig.tenant?.name || "Company"}
                          </p>
                        </div>
                        {gig.emergency && (
                          <Badge variant="destructive" className="gap-1 shrink-0">
                            <AlertTriangle className="h-3 w-3" />
                            Urgent
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        {gig.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {gig.location.city
                              ? `${gig.location.name}, ${gig.location.city}`
                              : gig.location.name}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {gig.startAt
                            ? new Date(gig.startAt).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })
                            : "TBD"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {gig.startAt && gig.endAt
                            ? `${new Date(gig.startAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })} - ${new Date(gig.endAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : "Time TBD"}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xl font-bold text-primary">
                          <DollarSign className="h-5 w-5" />
                          {gig.payRate}/hr
                        </div>
                        <Button
                          size="sm"
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-apply-gig-${gig.id}`}
                        >
                          Apply
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {search || roleFilter !== "all"
                    ? "No gigs found"
                    : "No gigs available right now"}
                </h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  {search || roleFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Check back soon for new opportunities"}
                </p>
                <Link href="/gigs/join">
                  <Button variant="outline" className="gap-2">
                    Join Krew Gigs
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-card/50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-2xl font-bold sm:text-3xl">
              Ready to start earning?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join Krew Gigs to get matched with hospitality shifts that fit
              your schedule and skills.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/gigs/join">
                <Button size="lg" className="gap-2" data-testid="button-cta-join">
                  Join as a Gig Worker
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="/api/login">
                <Button variant="outline" size="lg">
                  Post Gig Shifts
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-semibold">Krew Recruiter</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Krew Recruiter. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
