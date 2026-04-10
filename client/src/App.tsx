import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SeekerSidebar } from "@/components/seeker-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenantProvider } from "@/lib/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import { CampaignAuthProvider, useCampaignAuth } from "@/lib/campaign-auth";
import { CampaignSidebar } from "@/components/campaign-sidebar";

// Original pages
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Employers from "@/pages/employers";
import JobSearch from "@/pages/job-search";
import Dashboard from "@/pages/dashboard";
import Locations from "@/pages/locations";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import JobCreate from "@/pages/job-create";
import Applicants from "@/pages/applicants";
import Gigs from "@/pages/gigs";
import GigCreate from "@/pages/gig-create";
import GigDetail from "@/pages/gig-detail";
import GigBoard from "@/pages/gig-board";
import GigJoin from "@/pages/gig-join";
import Interviews from "@/pages/interviews";
import Settings from "@/pages/settings";
import SeekerDashboard from "@/pages/seeker-dashboard";
import SeekerProfile from "@/pages/seeker-profile";
import SeekerSaved from "@/pages/seeker-saved";
import SeekerGigs from "@/pages/seeker-gigs";
import Onboarding from "@/pages/onboarding";
import AdminDashboard from "@/pages/admin-dashboard";
import CandidateInterview from "@/pages/candidate-interview";
import VideoInterviews from "@/pages/video-interviews";
import ExternalJobs from "@/pages/external-jobs";
import Login from "@/pages/login";
import Billing from "@/pages/billing";
import Pricing from "@/pages/pricing";
import Help from "@/pages/help";
import TalentSearch from "@/pages/talent-search";

// New campaign engine pages
import CampaignLogin from "@/pages/campaign-login";
import CampaignDashboard from "@/pages/campaign-dashboard";
import CampaignJobs from "@/pages/campaign-jobs";
import CampaignCandidates from "@/pages/campaign-candidates";
import CampaignWizard from "@/pages/campaign-wizard";
import CampaignBilling from "@/pages/campaign-billing";
import CampaignInterviews from "@/pages/campaign-interviews";
import CampaignHelp from "@/pages/campaign-help";
import CampaignSettings from "@/pages/campaign-settings";
import CampaignTeam from "@/pages/campaign-team";

// Worker signup & onboarding
import WorkerSignup from "@/pages/worker-signup";
import WorkerOnboarding from "@/pages/worker-onboarding";

// Legal pages
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

import { Loader2, Shield } from "lucide-react";
import { UpgradePromptListener } from "@/components/upgrade-prompt";
import { CookieBanner } from "@/components/CookieBanner";
import type { UserProfile } from "@shared/schema";

// ============ ORIGINAL LAYOUTS ============

function EmployerLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <TenantProvider>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </TenantProvider>
  );
}

function SeekerLayout({ children }: { children: React.ReactNode }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <SeekerSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    localStorage.removeItem("krew_token");
    localStorage.removeItem("krew_org_id");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Super Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/campaign" className="text-sm text-muted-foreground hover:text-foreground">
            Campaign Engine
          </a>
          <button
            onClick={handleSignOut}
            className="text-sm text-destructive hover:text-destructive/80"
          >
            Sign Out
          </button>
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

// ============ ORIGINAL ROUTE GUARDS ============

function ProtectedEmployerRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/user/profile"],
    enabled: isAuthenticated,
  });

  if (isLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (!profile) {
    setLocation("/onboarding");
    return null;
  }

  if (profile.userType === "JOB_SEEKER") {
    setLocation("/seeker");
    return null;
  }

  return <EmployerLayout>{children}</EmployerLayout>;
}

function ProtectedSeekerRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/user/profile"],
    enabled: isAuthenticated,
  });

  if (isLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (!profile) {
    setLocation("/onboarding");
    return null;
  }

  if (profile.userType === "EMPLOYER") {
    setLocation("/app");
    return null;
  }

  return <SeekerLayout>{children}</SeekerLayout>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Check admin status with both session cookie and JWT token
  const { data: adminCheck, isLoading: adminLoading } = useQuery<{ isSuperAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem("krew_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/check", {
        credentials: "include",
        headers,
      });
      if (!res.ok) return { isSuperAdmin: false };
      return res.json();
    },
    enabled: isAuthenticated || !!localStorage.getItem("krew_token"),
  });

  if (isLoading || adminLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasToken = !!localStorage.getItem("krew_token");

  if (!isAuthenticated && !hasToken) {
    window.location.href = "/login";
    return null;
  }

  if (!adminCheck?.isSuperAdmin) {
    setLocation("/campaign");
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

// ============ NEW CAMPAIGN ENGINE LAYOUT ============

function CampaignLayout({ children }: { children: React.ReactNode }) {
  const { user, organizations, orgId, switchOrg, logout } = useCampaignAuth();

  const currentOrg = organizations.find(o => o.orgId === orgId);

  const { data: branding } = useQuery({
    queryKey: ["/api/org/branding", orgId],
    queryFn: async () => {
      const token = localStorage.getItem("krew_token");
      const res = await fetch("/api/org/branding", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-org-id": orgId || "",
        },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
  });

  return (
    <div className="flex h-screen w-full">
      <CampaignSidebar
        user={{
          name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User",
          email: user?.email || "",
        }}
        org={{
          name: currentOrg?.orgName || branding?.name || "My Organization",
          logoUrl: branding?.logoUrl,
        }}
        orgs={organizations.map(o => ({
          id: o.orgId,
          name: o.orgName,
        }))}
        onOrgSwitch={(id: string) => switchOrg(id)}
        onLogout={logout}
      />
      <div className="flex-1 ml-[220px] overflow-auto bg-background">
        {children}
      </div>
    </div>
  );
}

function ProtectedCampaignRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useCampaignAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/campaign/login");
    return null;
  }

  return <CampaignLayout>{children}</CampaignLayout>;
}

// ============ ROUTER ============

function AppRouter() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/employers" component={Employers} />
      <Route path="/jobs" component={JobSearch} />
      <Route path="/gigs" component={GigBoard} />
      <Route path="/gigs/join" component={GigJoin} />
      <Route path="/video-interviews" component={VideoInterviews} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/help" component={Help} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />

      {/* Worker signup & onboarding (public entry, protected onboarding) */}
      <Route path="/workers/signup" component={WorkerSignup} />
      <Route path="/workers/onboarding">
        <ProtectedRoute>
          <WorkerOnboarding />
        </ProtectedRoute>
      </Route>

      {/* Onboarding */}
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>

      {/* Job Seeker routes */}
      <Route path="/seeker">
        <ProtectedSeekerRoute>
          <SeekerDashboard />
        </ProtectedSeekerRoute>
      </Route>
      <Route path="/seeker/profile">
        <ProtectedSeekerRoute>
          <SeekerProfile />
        </ProtectedSeekerRoute>
      </Route>
      <Route path="/seeker/applications">
        <ProtectedSeekerRoute>
          <SeekerDashboard />
        </ProtectedSeekerRoute>
      </Route>
      <Route path="/seeker/saved">
        <ProtectedSeekerRoute>
          <SeekerSaved />
        </ProtectedSeekerRoute>
      </Route>
      <Route path="/seeker/gigs">
        <ProtectedSeekerRoute>
          <SeekerGigs />
        </ProtectedSeekerRoute>
      </Route>
      <Route path="/seeker/external-jobs">
        <ProtectedSeekerRoute>
          <ExternalJobs />
        </ProtectedSeekerRoute>
      </Route>

      {/* Employer routes (original) */}
      <Route path="/app">
        <ProtectedEmployerRoute>
          <Dashboard />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/locations">
        <ProtectedEmployerRoute>
          <Locations />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/jobs">
        <ProtectedEmployerRoute>
          <Jobs />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/jobs/new">
        <ProtectedEmployerRoute>
          <JobCreate />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/jobs/:id">
        <ProtectedEmployerRoute>
          <JobDetail />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/applicants">
        <ProtectedEmployerRoute>
          <Applicants />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/gigs">
        <ProtectedEmployerRoute>
          <Gigs />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/gigs/new">
        <ProtectedEmployerRoute>
          <GigCreate />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/gigs/:id">
        <ProtectedEmployerRoute>
          <GigDetail />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/interviews">
        <ProtectedEmployerRoute>
          <Interviews />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/talent">
        <ProtectedEmployerRoute>
          <TalentSearch />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/billing">
        <ProtectedEmployerRoute>
          <Billing />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/settings">
        <ProtectedEmployerRoute>
          <Settings />
        </ProtectedEmployerRoute>
      </Route>

      {/* Krew Social / Campaign Engine (inside employer layout) */}
      <Route path="/app/campaigns">
        <ProtectedEmployerRoute>
          <CampaignDashboard />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/jobs">
        <ProtectedEmployerRoute>
          <CampaignJobs />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/jobs/new">
        <ProtectedEmployerRoute>
          <CampaignWizard />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/candidates">
        <ProtectedEmployerRoute>
          <CampaignCandidates />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/interviews">
        <ProtectedEmployerRoute>
          <CampaignInterviews />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/team">
        <ProtectedEmployerRoute>
          <CampaignTeam />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/billing">
        <ProtectedEmployerRoute>
          <CampaignTeam defaultTab="billing" />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/settings">
        <ProtectedEmployerRoute>
          <CampaignSettings />
        </ProtectedEmployerRoute>
      </Route>
      <Route path="/app/campaigns/help">
        <ProtectedEmployerRoute>
          <CampaignHelp />
        </ProtectedEmployerRoute>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <ProtectedAdminRoute>
          <AdminDashboard />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/dashboard">
        <ProtectedAdminRoute>
          <AdminDashboard />
        </ProtectedAdminRoute>
      </Route>

      {/* Public interview route */}
      <Route path="/interview/:token" component={CandidateInterview} />

      {/* ============ CAMPAIGN ENGINE ROUTES ============ */}
      <Route path="/campaign/login" component={CampaignLogin} />

      <Route path="/campaign">
        <ProtectedCampaignRoute>
          <CampaignDashboard />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/jobs">
        <ProtectedCampaignRoute>
          <CampaignJobs />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/jobs/new">
        <ProtectedCampaignRoute>
          <CampaignWizard />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/candidates">
        <ProtectedCampaignRoute>
          <CampaignCandidates />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/interviews">
        <ProtectedCampaignRoute>
          <CampaignInterviews />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/help">
        <ProtectedCampaignRoute>
          <CampaignHelp />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/talent">
        <ProtectedCampaignRoute>
          <TalentSearch />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/jobs/:id">
        <ProtectedCampaignRoute>
          <PlaceholderPage title="Job Detail" />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/team">
        <ProtectedCampaignRoute>
          <CampaignTeam />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/billing">
        <ProtectedCampaignRoute>
          <CampaignTeam defaultTab="billing" />
        </ProtectedCampaignRoute>
      </Route>
      <Route path="/campaign/settings">
        <ProtectedCampaignRoute>
          <CampaignSettings />
        </ProtectedCampaignRoute>
      </Route>

      {/* Public chatbot apply page */}
      <Route path="/apply/:campaignId">
        <PlaceholderPage title="Apply" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-muted-foreground">This page is coming in a future sprint.</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CampaignAuthProvider>
        <TooltipProvider>
          <Toaster />
          <UpgradePromptListener />
          <CookieBanner />
          <AppRouter />
        </TooltipProvider>
      </CampaignAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
