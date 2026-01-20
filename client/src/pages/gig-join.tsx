import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Loader2,
  Clock,
  DollarSign,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Briefcase,
} from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";
import type { UserProfile } from "@shared/schema";

export default function GigJoin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/user/profile"],
    enabled: isAuthenticated,
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Account created!",
        description: "Welcome to Krew Gigs!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/user/profile", { userType: "JOB_SEEKER" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setProfileCreated(true);
      setIsCreatingProfile(false);
      toast({
        title: "Profile created!",
        description: "Complete your profile to start applying for gigs.",
      });
      setLocation("/seeker/profile");
    },
    onError: () => {
      setIsCreatingProfile(false);
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isAuthenticated && !profileLoading && !isCreatingProfile && !profileCreated) {
      if (profile) {
        if (profile.userType === "JOB_SEEKER") {
          setLocation("/gigs");
        } else {
          setLocation("/app");
        }
      } else if (!createProfileMutation.isPending) {
        setIsCreatingProfile(true);
        createProfileMutation.mutate();
      }
    }
  }, [isAuthenticated, profile, profileLoading, isCreatingProfile, profileCreated, createProfileMutation.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup") {
      registerMutation.mutate({ email, password, firstName, lastName });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && (!profile || isCreatingProfile)) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Setting up your worker account...</p>
      </div>
    );
  }

  const isLoading = registerMutation.isPending || loginMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="flex items-center justify-between p-4 border-b">
        <a href="/gigs" className="flex items-center gap-2">
          <img src={logoImage} alt="Krew" className="h-8 w-auto" />
          <span className="font-bold text-lg">Krew Gigs</span>
        </a>
        <ThemeToggle />
      </header>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Join Krew Gigs
              </h1>
              <p className="text-xl text-muted-foreground">
                Find flexible hospitality shifts that fit your schedule. Get paid fast for your work.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Flexible Scheduling</h3>
                  <p className="text-sm text-muted-foreground">
                    Pick shifts that work for you. Work when you want, where you want.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Competitive Pay</h3>
                  <p className="text-sm text-muted-foreground">
                    Earn $18-45/hr depending on the role. See pay rates upfront before you apply.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Fast Payments</h3>
                  <p className="text-sm text-muted-foreground">
                    Get paid quickly after completing shifts via direct deposit.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Build Your Network</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with top hospitality venues and grow your career.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {mode === "signup" ? "Create your worker account" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {mode === "signup" 
                  ? "Sign up to start applying for gig shifts" 
                  : "Sign in to continue to your dashboard"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        required
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    required
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                      required
                      minLength={mode === "signup" ? 8 : undefined}
                      className="pr-10"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === "signup" ? "Create Account" : "Sign In"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                {mode === "signup" ? (
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-primary hover:underline font-medium"
                      data-testid="link-switch-to-login"
                    >
                      Sign in
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-primary hover:underline font-medium"
                      data-testid="link-switch-to-signup"
                    >
                      Sign up
                    </button>
                  </p>
                )}
              </div>

              {mode === "signup" && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Free to join, no fees</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Start applying to shifts immediately</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
