import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TenantProvider } from "@/lib/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
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
import { Loader2 } from "lucide-react";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  return <ProtectedLayout>{children}</ProtectedLayout>;
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">
        {isLoading ? (
          <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isAuthenticated ? (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ) : (
          <Landing />
        )}
      </Route>
      
      <Route path="/gigs" component={GigBoard} />
      
      {/* Protected routes */}
      <Route path="/app">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/locations">
        <ProtectedRoute>
          <Locations />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/jobs">
        <ProtectedRoute>
          <Jobs />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/jobs/new">
        <ProtectedRoute>
          <JobCreate />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/applicants">
        <ProtectedRoute>
          <Applicants />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/gigs">
        <ProtectedRoute>
          <Gigs />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/gigs/new">
        <ProtectedRoute>
          <GigCreate />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/interviews">
        <ProtectedRoute>
          <Interviews />
        </ProtectedRoute>
      </Route>
      
      <Route path="/app/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
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
