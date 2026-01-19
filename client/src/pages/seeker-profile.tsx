import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  User,
  MapPin,
  Briefcase,
  DollarSign,
  FileText,
  Save,
  Plus,
  X,
  ChefHat,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { FOH_ROLES, BOH_ROLES, type WorkerProfile } from "@shared/schema";

export default function SeekerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<WorkerProfile>({
    queryKey: ["/api/profile"],
  });

  const [formData, setFormData] = useState({
    name: "",
    headline: "",
    city: "",
    state: "",
    summary: "",
    experienceYears: 0,
    fohRoles: [] as string[],
    bohRoles: [] as string[],
    desiredPayMin: 0,
    desiredPayMax: 0,
    openToGigs: true,
    openToFullTime: true,
    openToPartTime: true,
  });

  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setFormData({
      name: profile.name || "",
      headline: profile.headline || "",
      city: profile.city || "",
      state: profile.state || "",
      summary: profile.summary || "",
      experienceYears: profile.experienceYears || 0,
      fohRoles: profile.fohRoles || [],
      bohRoles: profile.bohRoles || [],
      desiredPayMin: profile.desiredPayMin || 0,
      desiredPayMax: profile.desiredPayMax || 0,
      openToGigs: profile.openToGigs ?? true,
      openToFullTime: profile.openToFullTime ?? true,
      openToPartTime: profile.openToPartTime ?? true,
    });
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest(profile ? "PATCH" : "POST", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    },
  });

  const toggleRole = (role: string, type: "foh" | "boh") => {
    if (type === "foh") {
      setFormData((prev) => ({
        ...prev,
        fohRoles: prev.fohRoles.includes(role)
          ? prev.fohRoles.filter((r) => r !== role)
          : [...prev.fohRoles, role],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        bohRoles: prev.bohRoles.includes(role)
          ? prev.bohRoles.filter((r) => r !== role)
          : [...prev.bohRoles, role],
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Stand out to employers with a complete profile
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-profile"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Tell employers about yourself
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="John Doe"
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headline">Professional Headline</Label>
                <Input
                  id="headline"
                  value={formData.headline}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, headline: e.target.value }))
                  }
                  placeholder="Experienced Server | Fine Dining Specialist"
                  data-testid="input-headline"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="New York"
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  placeholder="NY"
                  data-testid="input-state"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Professional Summary</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, summary: e.target.value }))
                }
                placeholder="Tell employers about your experience, skills, and what makes you a great hire..."
                rows={4}
                data-testid="input-summary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                max={50}
                value={formData.experienceYears}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    experienceYears: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-32"
                data-testid="input-experience"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Roles & Skills
            </CardTitle>
            <CardDescription>
              Select the roles you're interested in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary" />
                Front of House (FOH)
              </h4>
              <div className="flex flex-wrap gap-2">
                {FOH_ROLES.map((role) => (
                  <Badge
                    key={role}
                    variant={formData.fohRoles.includes(role) ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => toggleRole(role, "foh")}
                  >
                    {formData.fohRoles.includes(role) && (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <ChefHat className="h-4 w-4 text-primary" />
                Back of House (BOH)
              </h4>
              <div className="flex flex-wrap gap-2">
                {BOH_ROLES.map((role) => (
                  <Badge
                    key={role}
                    variant={formData.bohRoles.includes(role) ? "default" : "outline"}
                    className="cursor-pointer hover-elevate"
                    onClick={() => toggleRole(role, "boh")}
                  >
                    {formData.bohRoles.includes(role) && (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Job Preferences
            </CardTitle>
            <CardDescription>
              Set your work and pay preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-3 block">I'm interested in:</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Full-time positions</span>
                  </div>
                  <Switch
                    checked={formData.openToFullTime}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, openToFullTime: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Part-time positions</span>
                  </div>
                  <Switch
                    checked={formData.openToPartTime}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, openToPartTime: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Gig shifts / On-demand work</span>
                  </div>
                  <Switch
                    checked={formData.openToGigs}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, openToGigs: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Desired Pay Range ($/hr)</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.desiredPayMin}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        desiredPayMin: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-24"
                    placeholder="Min"
                    data-testid="input-pay-min"
                  />
                </div>
                <span className="text-muted-foreground">to</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={formData.desiredPayMax}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        desiredPayMax: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-24"
                    placeholder="Max"
                    data-testid="input-pay-max"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/seeker">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
