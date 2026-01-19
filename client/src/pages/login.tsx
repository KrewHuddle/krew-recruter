import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Mail, Chrome, Github, Apple, ArrowRight, Shield, Zap, Users } from "lucide-react";
import logoImage from "@assets/3_1768835575859.png";

export default function Login() {
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
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href="/api/login" className="block">
                  <Button className="w-full gap-2" size="lg" data-testid="button-continue-signin">
                    Continue to Sign In
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Available sign-in options</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <Chrome className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Google</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">GitHub</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    <Apple className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Apple</span>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <a href="/api/login" className="text-primary hover:underline" data-testid="link-signup">
                Sign up for free
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
