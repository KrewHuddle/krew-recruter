import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import JobCreate from "@/pages/job-create";
import Applicants from "@/pages/applicants";
import Gigs from "@/pages/gigs";
import GigCreate from "@/pages/gig-create";
import GigBoard from "@/pages/gig-board";
import Interviews from "@/pages/interviews";
import Settings from "@/pages/settings";
import SeekerDashboard from "@/pages/seeker-dashboard";
import SeekerProfile from "@/pages/seeker-profile";
import { Loader2 } from "lucide-react";

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
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  return <EmployerLayout>{children}</EmployerLayout>;
}

function ProtectedSeekerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/api/login";
    return null;
  }

  return <SeekerLayout>{children}</SeekerLayout>;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      
      <Route path="/employers" component={Employers} />
      
      <Route path="/jobs" component={JobSearch} />
      
      <Route path="/gigs" component={GigBoard} />
      
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
          <SeekerDashboard />
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
