import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft, ArrowRight, Loader2, Upload, CheckCircle, Zap,
  MapPin, DollarSign, User, PartyPopper, Briefcase, Clock,
} from "lucide-react";

const FOH_ROLES = [
  "Server", "Bartender", "Host/Hostess", "Food Runner",
  "Barback", "Cashier", "Counter Service", "Catering Staff",
];

const BOH_ROLES = [
  "Line Cook", "Prep Cook", "Sous Chef", "Executive Chef",
  "Dishwasher", "Expo", "Pastry Cook", "Grill Cook",
];

const TOTAL_STEPS = 6;

export default function WorkerOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Step 1
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  // Step 2
  const [fohRoles, setFohRoles] = useState<string[]>([]);
  const [bohRoles, setBohRoles] = useState<string[]>([]);
  const [isNewToIndustry, setIsNewToIndustry] = useState(false);
  const [experienceYears, setExperienceYears] = useState(1);
  // Step 3
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [radius, setRadius] = useState(15);
  const [openToRelocation, setOpenToRelocation] = useState(false);
  // Step 4
  const [payType, setPayType] = useState<"hourly" | "salary">("hourly");
  const [payMin, setPayMin] = useState(15);
  const [payMax, setPayMax] = useState(25);
  const [flexiblePay, setFlexiblePay] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("immediately");
  // Step 5
  const [bio, setBio] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  // Step 6
  const [gigDays, setGigDays] = useState<string[]>([]);
  const [gigTimes, setGigTimes] = useState<string[]>([]);

  // Load existing profile data
  const { data: profile } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (profile) {
      if (profile.city) setCity(profile.city);
      if (profile.state) setState(profile.state);
      if (profile.fohRoles?.length) setFohRoles(profile.fohRoles);
      if (profile.bohRoles?.length) setBohRoles(profile.bohRoles);
      if (profile.experienceYears) setExperienceYears(profile.experienceYears);
    }
  }, [profile]);

  const showGigStep = workTypes.includes("gigs") || workTypes.includes("all");

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const method = profile ? "PATCH" : "POST";
      const res = await fetch("/api/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
  });

  const handleNext = () => {
    // Auto-save on each step transition
    const stepData: Record<string, any> = {};
    if (step === 1) {
      stepData.openToFullTime = workTypes.includes("fulltime") || workTypes.includes("all");
      stepData.openToPartTime = workTypes.includes("parttime") || workTypes.includes("all");
      stepData.openToGigs = workTypes.includes("gigs") || workTypes.includes("all");
    } else if (step === 2) {
      stepData.fohRoles = fohRoles;
      stepData.bohRoles = bohRoles;
      stepData.experienceYears = experienceYears;
    } else if (step === 3) {
      stepData.city = city;
      stepData.state = state;
    } else if (step === 4) {
      stepData.desiredPayMin = flexiblePay ? null : payMin;
      stepData.desiredPayMax = flexiblePay ? null : payMax;
    } else if (step === 5) {
      stepData.summary = bio;
    }

    if (Object.keys(stepData).length > 0) {
      saveMutation.mutate(stepData);
    }

    // Skip gig step if not interested
    if (step === 5 && !showGigStep) {
      setStep(TOTAL_STEPS + 1); // Go to completion
    } else {
      setStep(s => s + 1);
    }
  };

  const handleComplete = () => {
    // Final save with gig data
    const finalData: Record<string, any> = {};
    if (showGigStep) {
      finalData.openToGigs = true;
      finalData.availabilityJson = JSON.stringify({ days: gigDays, times: gigTimes });
    }
    saveMutation.mutate(finalData);
    setStep(TOTAL_STEPS + 1);
  };

  const toggleRole = (role: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(role) ? list.filter(r => r !== role) : [...list, role]);
  };

  const toggleWorkType = (type: string) => {
    if (type === "all") {
      setWorkTypes(workTypes.includes("all") ? [] : ["all"]);
    } else {
      const without = workTypes.filter(t => t !== "all");
      setWorkTypes(without.includes(type) ? without.filter(t => t !== type) : [...without, type]);
    }
  };

  // Completion screen
  if (step > TOTAL_STEPS) {
    const firstName = profile?.name?.split(" ")[0] || "there";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Krew, {firstName}!</h1>
          <p className="text-muted-foreground mb-8">
            Your profile is set up. We'll start matching you with jobs in {city || "your area"}.
          </p>

          <div className="bg-muted/50 rounded-xl p-4 mb-8 text-left space-y-2 text-sm">
            {city && <p><MapPin className="h-3.5 w-3.5 inline mr-1" /> {radius} miles around {city}, {state}</p>}
            {(fohRoles.length > 0 || bohRoles.length > 0) && (
              <p><Briefcase className="h-3.5 w-3.5 inline mr-1" /> {[...fohRoles, ...bohRoles].slice(0, 3).join(", ")}{fohRoles.length + bohRoles.length > 3 ? ` +${fohRoles.length + bohRoles.length - 3} more` : ""}</p>
            )}
            {showGigStep && <p><Zap className="h-3.5 w-3.5 inline mr-1 text-yellow-500" /> Gig Portal: Active</p>}
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" onClick={() => setLocation("/seeker")}>
              Browse Jobs Near Me <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => setLocation("/seeker/profile")}>
              Complete My Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xs">K</div>
          <span className="font-semibold text-sm tracking-wide">KREW RECRUITER</span>
        </div>
        <Link href="/seeker" className="text-sm text-muted-foreground hover:text-foreground">
          Skip for now
        </Link>
      </div>

      {/* Progress bar */}
      <div className="max-w-xl mx-auto px-6 pt-8">
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i < step ? "bg-primary" : "bg-muted"
            }`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-8">Step {step} of {TOTAL_STEPS}</p>
      </div>

      {/* Step content */}
      <div className="max-w-xl mx-auto px-6 pb-12">
        {/* STEP 1 — Work types */}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold mb-1">What brings you to Krew?</h2>
            <p className="text-muted-foreground mb-6">Choose all that apply</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { key: "fulltime", icon: Briefcase, label: "Full-time restaurant job" },
                { key: "parttime", icon: Clock, label: "Part-time hospitality work" },
                { key: "gigs", icon: Zap, label: "Gig shifts for extra cash" },
                { key: "all", icon: MapPin, label: "I'm open to all of the above" },
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => toggleWorkType(item.key)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                    workTypes.includes(item.key)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <item.icon className={`h-5 w-5 shrink-0 ${workTypes.includes(item.key) ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — Roles */}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold mb-1">What's your hospitality experience?</h2>
            <p className="text-muted-foreground mb-6">Select roles you've worked before</p>

            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Front of House (FOH)</p>
              <div className="flex flex-wrap gap-2">
                {FOH_ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => { setIsNewToIndustry(false); toggleRole(role, fohRoles, setFohRoles); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      fohRoles.includes(role) ? "bg-primary text-white border-primary" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Back of House (BOH)</p>
              <div className="flex flex-wrap gap-2">
                {BOH_ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => { setIsNewToIndustry(false); toggleRole(role, bohRoles, setBohRoles); }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      bohRoles.includes(role) ? "bg-primary text-white border-primary" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setIsNewToIndustry(!isNewToIndustry); setFohRoles([]); setBohRoles([]); }}
              className={`w-full p-3 rounded-lg border-2 text-sm text-left transition-colors mb-6 ${
                isNewToIndustry ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              None yet — I'm new to hospitality
            </button>

            <div>
              <Label>How many years in hospitality?</Label>
              <div className="flex items-center gap-4 mt-2">
                <Slider
                  value={[experienceYears]}
                  onValueChange={([v]) => setExperienceYears(v)}
                  min={0} max={10} step={1}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-16 text-right">
                  {experienceYears === 0 ? "< 1 yr" : experienceYears === 10 ? "10+ yrs" : `${experienceYears} yr${experienceYears > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          </>
        )}

        {/* STEP 3 — Location */}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Where are you looking for work?</h2>
            <p className="text-muted-foreground mb-6">We'll show you jobs near your location</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <Label>City</Label>
                <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Charlotte" className="mt-1" />
              </div>
              <div>
                <Label>State</Label>
                <Input value={state} onChange={e => setState(e.target.value)} placeholder="NC" maxLength={2} className="mt-1" />
              </div>
            </div>

            <div className="mb-6">
              <Label>How far will you travel?</Label>
              <div className="flex gap-2 mt-2">
                {[5, 10, 15, 25, 50].map(mi => (
                  <button
                    key={mi}
                    onClick={() => setRadius(mi)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      radius === mi ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {mi} mi
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Open to relocation?</Label>
              <Switch checked={openToRelocation} onCheckedChange={setOpenToRelocation} />
            </div>
          </>
        )}

        {/* STEP 4 — Pay */}
        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold mb-1">What pay are you looking for?</h2>
            <p className="text-muted-foreground mb-6">This helps us match you with the right jobs</p>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setPayType("hourly"); setPayMin(15); setPayMax(25); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  payType === "hourly" ? "border-primary bg-primary/5 text-primary" : "border-border"
                }`}
              >
                Hourly
              </button>
              <button
                onClick={() => { setPayType("salary"); setPayMin(35); setPayMax(55); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                  payType === "salary" ? "border-primary bg-primary/5 text-primary" : "border-border"
                }`}
              >
                Salary
              </button>
            </div>

            {!flexiblePay && (
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Min</span>
                  <span className="font-medium">
                    {payType === "hourly" ? `$${payMin}/hr — $${payMax}/hr` : `$${payMin}k — $${payMax}k`}
                  </span>
                  <span className="text-muted-foreground">Max</span>
                </div>
                <div className="space-y-3">
                  <Slider
                    value={[payMin]}
                    onValueChange={([v]) => setPayMin(Math.min(v, payMax - 1))}
                    min={payType === "hourly" ? 10 : 25}
                    max={payType === "hourly" ? 50 : 100}
                    step={1}
                  />
                  <Slider
                    value={[payMax]}
                    onValueChange={([v]) => setPayMax(Math.max(v, payMin + 1))}
                    min={payType === "hourly" ? 10 : 25}
                    max={payType === "hourly" ? 50 : 100}
                    step={1}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-8">
              <Switch checked={flexiblePay} onCheckedChange={setFlexiblePay} />
              <Label>I'm flexible on pay</Label>
            </div>

            <div>
              <Label>When can you start?</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["immediately", "2weeks", "nextmonth", "browsing"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAvailableFrom(opt)}
                    className={`py-2 px-3 rounded-lg text-sm border-2 transition-colors ${
                      availableFrom === opt ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                    }`}
                  >
                    {opt === "immediately" ? "Immediately" : opt === "2weeks" ? "Within 2 weeks" : opt === "nextmonth" ? "Next month" : "Just browsing"}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* STEP 5 — Profile */}
        {step === 5 && (
          <>
            <h2 className="text-2xl font-bold mb-1">Make your profile stand out</h2>
            <p className="text-muted-foreground mb-6">Help employers get to know you</p>

            <div className="mb-6">
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-4 mt-2">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <label>
                  <Button variant="outline" size="sm" disabled={photoUploading} asChild>
                    <span className="cursor-pointer">
                      {photoUploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                      Upload photo
                    </span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Max 2MB", variant: "destructive" });
                      return;
                    }
                    setPhotoUploading(true);

                    // Real upload to /api/worker/profile-photo, which
                    // pushes to DigitalOcean Spaces and returns a
                    // permanent public URL. Previously this was a
                    // TODO that just read the file as a base64 data
                    // URL and set it in React state — the photo was
                    // visible until form submit, then dropped on the
                    // floor because no upload ever happened.
                    try {
                      const token = localStorage.getItem("krew_token");
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/worker/profile-photo", {
                        method: "POST",
                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                        credentials: "include",
                        body: formData,
                      });
                      if (!res.ok) {
                        const errBody = await res.json().catch(() => ({}));
                        toast({
                          title: "Upload failed",
                          description: errBody?.error || "Could not upload photo. Please try again.",
                          variant: "destructive",
                        });
                      } else {
                        const data = await res.json();
                        setPhotoUrl(data.url);
                      }
                    } catch (err) {
                      toast({
                        title: "Upload failed",
                        description: "Network error. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setPhotoUploading(false);
                    }
                  }} />
                </label>
              </div>
            </div>

            <div className="mb-6">
              <Label>Quick bio (optional)</Label>
              <Textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 200))}
                placeholder="e.g. Line cook with 3 years experience in fast-casual dining. Known for speed and clean stations."
                className="mt-1"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">{bio.length}/200</p>
            </div>
          </>
        )}

        {/* STEP 6 — Gig Portal */}
        {step === 6 && showGigStep && (
          <>
            <h2 className="text-2xl font-bold mb-1">Join the Gig Portal</h2>
            <p className="text-muted-foreground mb-6">Get notified when restaurants near you need last-minute help</p>

            <Card className="mb-6">
              <CardContent className="p-5">
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    <p>Restaurant posts a shift on Krew Recruiter</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    <p>You get a notification</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    <p>Accept the shift, show up, get paid</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium">Average gig shift: 4-6 hours | $18-28/hr</p>
                  <p className="text-muted-foreground">Payout within 24 hours via direct deposit</p>
                </div>
              </CardContent>
            </Card>

            <div className="mb-6">
              <Label>Available days</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                  <button
                    key={day}
                    onClick={() => toggleRole(day, gigDays, setGigDays)}
                    className={`w-12 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                      gigDays.includes(day) ? "border-primary bg-primary/5 text-primary" : "border-border"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <Label>Available times</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Morning (6am-12pm)", "Afternoon (12-6pm)", "Evening (6pm-close)", "Overnight"].map(time => (
                  <button
                    key={time}
                    onClick={() => toggleRole(time, gigTimes, setGigTimes)}
                    className={`py-2 px-3 rounded-lg text-sm border-2 transition-colors ${
                      gigTimes.includes(time) ? "border-primary bg-primary/5 text-primary" : "border-border"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {step === 6 && showGigStep ? (
            <Button onClick={handleComplete}>
              Finish <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={step === 1 && workTypes.length === 0}
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
