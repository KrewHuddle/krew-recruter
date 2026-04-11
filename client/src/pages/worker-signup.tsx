import { useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Briefcase, Zap, ChefHat, Video, Star } from "lucide-react";
export default function WorkerSignup() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();

  // If the user landed here from clicking "Apply Now" on a public job page
  // while unauthenticated, that page passes ?jobId=<uuid> through to us so
  // we can auto-submit the application after signup completes. Without this
  // step, every Meta-driven application requires the user to manually
  // navigate back to the job after signup — and most won't.
  const incomingJobId = new URLSearchParams(searchParams).get("jobId");

  const [intent, setIntent] = useState<"jobs" | "gigs">("jobs");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          firstName,
          lastName,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      // Create user profile as JOB_SEEKER
      try {
        await fetch("/api/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            userType: "JOB_SEEKER",
            firstName,
            lastName,
            email,
            city,
            state,
          }),
        });
      } catch {}

      // Store token if JWT-based
      if (data.token) {
        localStorage.setItem("krew_token", data.token);
      }

      // Auto-apply to the originating job if this signup was kicked off
      // by an "Apply Now" click on a public job page. We always continue
      // to onboarding regardless of apply success/failure — the goal here
      // is to get the application into the employer's queue ASAP, not to
      // gate onboarding on it. The apply endpoint already handles the
      // job-not-published / already-applied / job-not-found cases with
      // 4xx responses, which we surface as a destructive toast but don't
      // treat as a fatal error.
      if (incomingJobId) {
        try {
          const applyRes = await fetch("/api/applications/apply", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(data.token ? { Authorization: `Bearer ${data.token}` } : {}),
            },
            credentials: "include",
            body: JSON.stringify({ jobId: incomingJobId }),
          });
          if (applyRes.ok) {
            toast({
              title: "Application submitted!",
              description: "We'll let you know when the employer responds.",
            });
          } else {
            const errBody = await applyRes.json().catch(() => ({}));
            toast({
              title: "Account created — but we couldn't submit your application",
              description: errBody?.error || "You can apply manually from your dashboard.",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "Account created — but we couldn't submit your application",
            description: "You can apply manually from your dashboard.",
            variant: "destructive",
          });
        }
      }

      setLocation("/workers/onboarding");
    },
    onError: (err: Error) => {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = firstName && lastName && email && password.length >= 8;

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-primary/90 to-primary flex-col justify-between p-10 text-white">
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center font-bold text-sm">
              K
            </div>
            <span className="font-semibold tracking-wide text-sm">KREW RECRUITER</span>
          </div>

          <h1 className="text-4xl font-bold mb-6 leading-tight">
            Find work you love.
          </h1>

          <div className="space-y-5 mb-12">
            <div className="flex items-start gap-3">
              <ChefHat className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-white/90">Browse hospitality jobs near you</p>
            </div>
            <div className="flex items-start gap-3">
              <Video className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-white/90">Video profile — stand out from the crowd</p>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="text-white/90">Pick up gig shifts for extra income</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl p-5 backdrop-blur-sm">
          <p className="text-white/90 text-sm italic mb-3">
            "I found my line cook job at a great restaurant in 2 days."
          </p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              M
            </div>
            <div>
              <p className="text-sm font-medium">Marcus T.</p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-white/60">Charlotte, NC</p>
                <div className="flex ml-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold text-sm">
              K
            </div>
            <span className="font-semibold tracking-wide text-sm">KREW RECRUITER</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Create your free account</h2>
          <p className="text-muted-foreground text-sm mb-6">Start finding hospitality work today</p>

          {/* Intent selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setIntent("jobs")}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                intent === "jobs"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              I'm looking for a job
            </button>
            <button
              onClick={() => setIntent("gigs")}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                intent === "gigs"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Zap className="h-4 w-4" />
              I want gig shifts
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Marcus"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Thompson"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="marcus@email.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Charlotte"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder="NC"
                  maxLength={2}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={() => registerMutation.mutate()}
            disabled={!canSubmit || registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
            ) : (
              "Create Account"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            By creating an account you agree to our Terms of Service and Privacy Policy
          </p>

          <p className="text-sm text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
