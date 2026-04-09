import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  MapPin,
  Star,
  Clock,
  Briefcase,
  MessageSquare,
  Eye,
  Users,
  Loader2,
  UserPlus,
  Video,
  Send,
  ChevronRight,
} from "lucide-react";

interface TalentResult {
  id: string;
  firstName: string;
  lastName: string;
  city: string | null;
  state: string | null;
  lat: string | null;
  lng: string | null;
  jobTitles: string[] | null;
  skills: string[] | null;
  experienceYears: number | null;
  availability: string | null;
  isGigAvailable: boolean | null;
  avgRating: string | null;
  totalGigsCompleted: number | null;
  videoIntroUrl: string | null;
  resumeUrl: string | null;
  lastActiveAt: string | null;
}

const ROLE_OPTIONS = [
  "All Roles", "Line Cook", "Prep Cook", "Sous Chef", "Executive Chef",
  "Server", "Bartender", "Host/Hostess", "Busser", "Food Runner",
  "Dishwasher", "Floor Manager", "Barback", "Catering Staff",
];

export default function TalentSearch() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState(25);
  const [role, setRole] = useState("All Roles");
  const [availability, setAvailability] = useState("any");
  const [gigOnly, setGigOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedTalent, setSelectedTalent] = useState<TalentResult | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactTalentId, setContactTalentId] = useState<string>("");
  const [contactMessage, setContactMessage] = useState("");

  const buildSearchParams = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    if (state) params.set("state", state);
    params.set("radius", String(radius));
    if (role !== "All Roles") params.set("jobTitle", role);
    if (availability !== "any") params.set("availability", availability);
    if (gigOnly) params.set("isGigAvailable", "true");
    params.set("page", String(page));
    params.set("limit", "20");
    return params.toString();
  };

  const { data, isLoading } = useQuery<{
    results: TalentResult[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: [`/api/talent/search?${buildSearchParams()}`],
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/talent/count"],
  });

  const contactMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/talent/${contactTalentId}/contact`, {
        message: contactMessage,
      });
    },
    onSuccess: () => {
      toast({ title: "Message sent!" });
      setContactOpen(false);
      setContactMessage("");
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const results = data?.results || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Talent Pool</h1>
        <p className="text-muted-foreground">
          Search {countData?.count?.toLocaleString() || "0"}+ hospitality professionals
          in your area ready to work.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, role, skills..."
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="w-36">
              <Label className="text-xs mb-1 block">City</Label>
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="w-20">
              <Label className="text-xs mb-1 block">State</Label>
              <Input
                placeholder="NC"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
              />
            </div>

            <div className="w-36">
              <Label className="text-xs mb-1 block">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-36">
              <Label className="text-xs mb-1 block">Availability</Label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">All</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="gig">Gig Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pb-1">
              <Switch checked={gigOnly} onCheckedChange={setGigOnly} />
              <Label className="text-xs">Gig Ready</Label>
            </div>

            <Button onClick={() => setPage(1)}>
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No talent found</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Try adjusting your search criteria or broadening your location filter.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {total} result{total !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {results.map((talent) => (
              <TalentCard
                key={talent.id}
                talent={talent}
                onView={() => setSelectedTalent(talent)}
                onMessage={() => {
                  setContactTalentId(talent.id);
                  setContactOpen(true);
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Profile Side Sheet */}
      <Sheet open={!!selectedTalent} onOpenChange={(open) => { if (!open) setSelectedTalent(null); }}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Candidate Profile</SheetTitle>
          </SheetHeader>
          {selectedTalent && (
            <div className="mt-4 space-y-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
                  {selectedTalent.firstName[0]}{selectedTalent.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {selectedTalent.firstName} {selectedTalent.lastName.charAt(0)}.
                  </h3>
                  {selectedTalent.city && selectedTalent.state && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedTalent.city}, {selectedTalent.state}
                    </p>
                  )}
                </div>
              </div>

              {/* Job titles */}
              {selectedTalent.jobTitles && selectedTalent.jobTitles.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Roles</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedTalent.jobTitles.map((title) => (
                      <Badge key={title} variant="secondary" className="text-xs">{title}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedTalent.skills && selectedTalent.skills.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Skills</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedTalent.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedTalent.experienceYears && (
                  <div>
                    <span className="text-muted-foreground">Experience</span>
                    <p className="font-medium">{selectedTalent.experienceYears} years</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Availability</span>
                  <p className="font-medium capitalize">{selectedTalent.availability || "Any"}</p>
                </div>
                {selectedTalent.avgRating && (
                  <div>
                    <span className="text-muted-foreground">Rating</span>
                    <p className="font-medium flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      {parseFloat(selectedTalent.avgRating).toFixed(1)}
                    </p>
                  </div>
                )}
                {selectedTalent.totalGigsCompleted && selectedTalent.totalGigsCompleted > 0 && (
                  <div>
                    <span className="text-muted-foreground">Gigs Completed</span>
                    <p className="font-medium">{selectedTalent.totalGigsCompleted}</p>
                  </div>
                )}
              </div>

              {selectedTalent.isGigAvailable && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  Gig Available
                </Badge>
              )}

              {/* Video intro */}
              {selectedTalent.videoIntroUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Video Intro</Label>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <video src={selectedTalent.videoIntroUrl} controls className="w-full h-full" />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => {
                  setContactTalentId(selectedTalent.id);
                  setContactOpen(true);
                }}>
                  <Send className="mr-2 h-4 w-4" /> Send Message
                </Button>
                <Button variant="outline" className="flex-1">
                  Invite to Apply
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Contact Modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Textarea
              placeholder="Hi! We have an opening that might be a great fit for you..."
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              rows={4}
            />
            <Button
              className="w-full"
              disabled={!contactMessage.trim() || contactMutation.isPending}
              onClick={() => contactMutation.mutate()}
            >
              {contactMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TalentCard({
  talent,
  onView,
  onMessage,
}: {
  talent: TalentResult;
  onView: () => void;
  onMessage: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {talent.firstName[0]}{talent.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {talent.firstName} {talent.lastName.charAt(0)}.
            </h3>
            {talent.city && talent.state && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {talent.city}, {talent.state}
              </p>
            )}
          </div>
          {talent.isGigAvailable && (
            <span className="text-xs text-green-600 font-medium shrink-0">Gig Ready</span>
          )}
        </div>

        {/* Job titles */}
        {talent.jobTitles && talent.jobTitles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {talent.jobTitles.slice(0, 3).map((title) => (
              <Badge key={title} variant="secondary" className="text-[10px]">{title}</Badge>
            ))}
            {talent.jobTitles.length > 3 && (
              <Badge variant="outline" className="text-[10px]">+{talent.jobTitles.length - 3}</Badge>
            )}
          </div>
        )}

        {/* Skills */}
        {talent.skills && talent.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {talent.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{skill}</span>
            ))}
          </div>
        )}

        {/* Info row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {talent.experienceYears && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {talent.experienceYears} yrs
            </span>
          )}
          {talent.availability && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="capitalize">{talent.availability}</span>
            </span>
          )}
          {talent.avgRating && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              {parseFloat(talent.avgRating).toFixed(1)}
              {talent.totalGigsCompleted ? ` (${talent.totalGigsCompleted} gigs)` : ""}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="mr-1 h-3.5 w-3.5" /> View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onMessage}>
            <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
