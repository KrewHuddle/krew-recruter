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
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
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
import GigBoard from "@/pages/gig-board";
import Interviews from "@/pages/interviews";
import Settings from "@/pages/settings";
import SeekerDashboard from "@/pages/seeker-dashboard";
import SeekerProfile from "@/pages/seeker-profile";
import SeekerSaved from "@/pages/seeker-saved";
import Onboarding from "@/pages/onboarding";
import AdminDashboard from "@/pages/admin-dashboard";
import CandidateInterview from "@/pages/candidate-interview";
import Login from "@/pages/login";
import { Loader2, Shield } from "lucide-react";
import type { UserProfile } from "@shared/schema";

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

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Super Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/app" className="text-sm text-muted-foreground hover:text-foreground">
            Back to App
          </a>
          <ThemeToggle />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: adminCheck, isLoading: adminLoading } = useQuery<{ isSuperAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: isAuthenticated,
  });

  if (isLoading || adminLoading) {
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

  if (!adminCheck?.isSuperAdmin) {
    setLocation("/app");
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      <Route path="/login" component={Login} />
      
      <Route path="/employers" component={Employers} />
      
      <Route path="/jobs" component={JobSearch} />
      
      <Route path="/gigs" component={GigBoard} />
      
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>
      
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
      
      <Route path="/app/interviews">
        <ProtectedEmployerRoute>
          <Interviews />
        </ProtectedEmployerRoute>
      </Route>
      
      <Route path="/app/settings">
        <ProtectedEmployerRoute>
          <Settings />
        </ProtectedEmployerRoute>
      </Route>
      
      <Route path="/admin">
        <ProtectedAdminRoute>
          <AdminDashboard />
        </ProtectedAdminRoute>
      </Route>
      
      {/* Public interview route for candidates */}
      <Route path="/interview/:token" component={CandidateInterview} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
