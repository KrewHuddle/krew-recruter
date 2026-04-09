import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link, useLocation } from "wouter";
import { Mail, Eye, EyeOff, Zap, Users, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/3_1768835575859.png";

type AuthMode = "login" | "register";

/**
 * After login, determine the right dashboard based on user type:
 * - Super admin → /admin
 * - Job seeker → /seeker
 * - Employer → /campaign (or /app)
 * - No profile → /onboarding
 */
async function getLoginRedirect(token?: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // 1. Check super admin
  try {
    const adminRes = await fetch("/api/admin/check", { credentials: "include", headers });
    if (adminRes.ok) {
      const { isSuperAdmin } = await adminRes.json();
      if (isSuperAdmin) return "/admin";
    }
  } catch {}

  // 2. Check user profile type
  try {
    const profileRes = await fetch("/api/user/profile", { credentials: "include", headers });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      if (profile?.userType === "JOB_SEEKER") return "/seeker";
      if (profile?.userType === "EMPLOYER") return "/campaign";
    }
  } catch {}

  // 3. No profile yet — needs onboarding
  return "/onboarding";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Welcome back!", description: "You've successfully signed in." });

      const token = data?.token;
      if (token) localStorage.setItem("krew_token", token);

      // Determine where to redirect based on user type
      const destination = await getLoginRedirect(token);
      setLocation(destination);
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName?: string; lastName?: string }) => {
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
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Account created!", description: "Welcome to Krew Recruiter." });

      const token = data?.token;
      if (token) localStorage.setItem("krew_token", token);

      // New registrations go to onboarding
      setLocation("/onboarding");
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, firstName, lastName });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={logoImage} alt="Krew Recruiter" className="h-9 w-9 rounded-lg object-contain" data-testid="img-logo-nav" />
              <span className="text-xl font-semibold">Krew Recruiter</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex min-h-screen pt-16">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <img src={logoImage} alt="Krew Recruiter" className="h-16 w-16 rounded-xl object-contain" />
              <div>
                <h2 className="text-2xl font-bold">Krew Recruiter</h2>
                <p className="text-muted-foreground">Hospitality Hiring Platform</p>
              </div>
            </div>
            
            <h1 className="font-serif text-4xl font-bold mb-6">
              The smarter way to hire hospitality talent
            </h1>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Fast Hiring</h3>
                  <p className="text-sm text-muted-foreground">Fill positions 3x faster with our ATS and gig marketplace</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Quality Candidates</h3>
                  <p className="text-sm text-muted-foreground">Access 50K+ vetted hospitality professionals</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">Secure & Reliable</h3>
                  <p className="text-sm text-muted-foreground">Enterprise-grade security for your hiring data</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <img src={logoImage} alt="Krew Recruiter" className="h-12 w-12 rounded-xl object-contain" />
              <span className="text-xl font-bold">Krew Recruiter</span>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">
                  {mode === "login" ? "Welcome back" : "Create your account"}
                </CardTitle>
                <CardDescription>
                  {mode === "login" 
                    ? "Sign in to your account to continue" 
                    : "Get started with Krew Recruiter"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === "register" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          data-testid="input-first-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={mode === "register" ? 8 : undefined}
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === "login" && (
                    <div className="text-right">
                      <Link href="/forgot-password">
                        <span className="text-sm text-primary hover:underline cursor-pointer" data-testid="link-forgot-password">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "login" ? "Sign in" : "Create account"}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  {mode === "login" ? (
                    <p className="text-muted-foreground">
                      Don't have an account?{" "}
                      <button 
                        onClick={() => setMode("register")}
                        className="text-primary hover:underline font-medium"
                        data-testid="link-switch-register"
                      >
                        Sign up
                      </button>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Already have an account?{" "}
                      <button 
                        onClick={() => setMode("login")}
                        className="text-primary hover:underline font-medium"
                        data-testid="link-switch-login"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
