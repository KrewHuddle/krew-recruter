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
import { useTenant } from "@/lib/tenant-context";
import {
  Clock,
  Plus,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import type { GigPost, Location, GigAssignment } from "@shared/schema";

type GigPostWithRelations = GigPost & {
  location?: Location;
  _count?: { assignments: number };
};

export default function Gigs() {
  const { currentTenant } = useTenant();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: gigs, isLoading } = useQuery<GigPostWithRelations[]>({
    queryKey: ["/api/gigs", currentTenant?.id],
    enabled: !!currentTenant,
  });

  const filteredGigs = gigs?.filter((gig) => {
    const matchesSearch = gig.role.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || gig.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to manage gigs
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gig Posts</h1>
          <p className="text-muted-foreground">
            Manage short-term gig shifts for {currentTenant.name}
          </p>
        </div>
        <Link href="/app/gigs/new">
          <Button className="gap-2" data-testid="button-create-gig">
            <Plus className="h-4 w-4" />
            Post Gig
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search gigs by role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-gigs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-gig-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="FILLED">Filled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gigs Grid */}
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
      ) : filteredGigs && filteredGigs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGigs.map((gig) => (
            <Link key={gig.id} href={`/app/gigs/${gig.id}`}>
              <Card
                className="overflow-visible hover-elevate cursor-pointer h-full"
                data-testid={`gig-card-${gig.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{gig.role}</h3>
                        <Badge
                          variant={
                            gig.status === "OPEN"
                              ? "default"
                              : gig.status === "FILLED"
                              ? "secondary"
                              : "outline"
                          }
                          className="mt-1"
                        >
                          {gig.status}
                        </Badge>
                      </div>
                    </div>
                    {gig.emergency && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Urgent
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {gig.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {gig.location.name}
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
                      {gig.startAt && gig.endAt && (
                        <span>
                          {new Date(gig.startAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(gig.endAt).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {gig._count?.assignments || 0} applicants
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-lg font-semibold text-primary">
                      <DollarSign className="h-5 w-5" />
                      {gig.payRate}/hr
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {gig.acceptanceMode === "INSTANT_BOOK"
                        ? "Instant Book"
                        : "Approval Required"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search || statusFilter !== "all"
                ? "No gigs found"
                : "No gig posts yet"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Post gig shifts to find short-term hospitality workers"}
            </p>
            {!search && statusFilter === "all" && (
              <Link href="/app/gigs/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Post Your First Gig
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
