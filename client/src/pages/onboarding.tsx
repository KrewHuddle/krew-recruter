import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Building2, User, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

type UserProfile = {
  id: string;
  userId: string;
  userType: "EMPLOYER" | "JOB_SEEKER";
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<"EMPLOYER" | "JOB_SEEKER" | null>(null);

  const { data: existingProfile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/user/profile"],
  });

  const createProfileMutation = useMutation({
    mutationFn: async (userType: "EMPLOYER" | "JOB_SEEKER") => {
      return apiRequest("POST", "/api/user/profile", { userType });
    },
    onSuccess: (_, userType) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      if (userType === "EMPLOYER") {
        setLocation("/app");
      } else {
        setLocation("/seeker/profile");
      }
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create profile. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  useEffect(() => {
    if (existingProfile) {
      if (existingProfile.userType === "EMPLOYER") {
        setLocation("/app");
      } else {
        setLocation("/seeker");
      }
    }
  }, [existingProfile, setLocation]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (existingProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleContinue = () => {
    if (selected) {
      createProfileMutation.mutate(selected);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to Krew Recruiter!</h1>
          <p className="text-muted-foreground text-lg">
            Let's get you set up. How will you be using Krew?
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card
            className={`cursor-pointer transition-all hover-elevate ${
              selected === "JOB_SEEKER" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelected("JOB_SEEKER")}
            data-testid="card-job-seeker"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                  selected === "JOB_SEEKER" ? "bg-primary text-primary-foreground" : "bg-primary/10"
                }`}>
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">I'm looking for work</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse jobs, apply to positions, and find gig opportunities in hospitality
                  </p>
                </div>
                {selected === "JOB_SEEKER" && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover-elevate ${
              selected === "EMPLOYER" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelected("EMPLOYER")}
            data-testid="card-employer"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                  selected === "EMPLOYER" ? "bg-primary text-primary-foreground" : "bg-primary/10"
                }`}>
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">I'm hiring</h3>
                  <p className="text-sm text-muted-foreground">
                    Post jobs, manage applications, and find great hospitality talent
                  </p>
                </div>
                {selected === "EMPLOYER" && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selected || createProfileMutation.isPending}
            onClick={handleContinue}
            className="gap-2 min-w-[200px]"
            data-testid="button-continue"
          >
            {createProfileMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          You can always access both experiences later from your settings
        </p>
      </div>
    </div>
  );
}
