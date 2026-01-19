import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  Users,
  Briefcase,
  FileText,
  Clock,
  Shield,
  ShieldCheck,
  ShieldOff,
  DollarSign,
  TrendingUp,
  CreditCard,
  Map,
  ExternalLink,
  Home,
  LogIn,
  UserPlus,
  LayoutDashboard,
  MapPin,
  CalendarDays,
  MessageSquare,
  Settings,
  User,
  Heart,
  CreditCard as CreditCardIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant, UserProfile, GigPayout, GigPost } from "@shared/schema";

interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalGigs: number;
}

interface PlatformRevenue {
  totalRevenue: number;
  totalPayouts: number;
  platformFees: number;
  completedPayouts: number;
  pendingPayouts: number;
}

interface AdminPayout extends GigPayout {
  gig?: GigPost | null;
  workerProfile?: UserProfile | null;
  tenant?: Tenant | null;
}

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  PRO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ENTERPRISE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

export default function AdminDashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery<PlatformRevenue>({
    queryKey: ["/api/admin/revenue"],
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery<AdminPayout[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Tenant> }) => {
      return apiRequest("PATCH", `/api/admin/tenants/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update tenant", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<UserProfile> }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const handlePlanChange = (tenantId: string, planType: string) => {
    updateTenantMutation.mutate({ id: tenantId, data: { planType: planType as any } });
  };

  const toggleSuperAdmin = (userId: string, currentStatus: boolean) => {
    updateUserMutation.mutate({ userId, data: { isSuperAdmin: !currentStatus } });
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Platform-wide management and analytics
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card data-testid="stat-tenants">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="stat-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="stat-jobs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalJobs || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="stat-applications">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="stat-gigs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gigs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalGigs || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants" data-testid="tab-tenants">
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="pages" data-testid="tab-pages">
            <Map className="h-4 w-4 mr-2" />
            Pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>
                Manage organizations and their subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : tenants && tenants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                        <TableCell>
                          <Badge className={planColors[tenant.planType] || planColors.FREE}>
                            {tenant.planType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={tenant.planType}
                            onValueChange={(value) => handlePlanChange(tenant.id, value)}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-plan-${tenant.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FREE">Free</SelectItem>
                              <SelectItem value="PRO">Pro</SelectItem>
                              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No organizations yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage users and grant super admin access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : users && users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Super Admin</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.userType}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.isSuperAdmin ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={user.isSuperAdmin ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggleSuperAdmin(user.userId, user.isSuperAdmin || false)}
                            data-testid={`toggle-admin-${user.id}`}
                          >
                            {user.isSuperAdmin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Revoke
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                Grant Admin
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No users yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card data-testid="stat-total-revenue">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">${revenue?.totalRevenue?.toFixed(2) || "0.00"}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="stat-platform-fees">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Fees (10%)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">${revenue?.platformFees?.toFixed(2) || "0.00"}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="stat-completed-payouts">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Payouts</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{revenue?.completedPayouts || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="stat-pending-payouts">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-orange-600">{revenue?.pendingPayouts || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Payouts</CardTitle>
              <CardDescription>
                All gig payouts across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : payouts && payouts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker</TableHead>
                      <TableHead>Gig</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Platform Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id} data-testid={`payout-row-${payout.id}`}>
                        <TableCell className="font-medium">
                          {payout.workerProfile
                            ? `${payout.workerProfile.firstName} ${payout.workerProfile.lastName}`
                            : "Unknown"}
                        </TableCell>
                        <TableCell>{payout.gig?.role || "N/A"}</TableCell>
                        <TableCell className="text-muted-foreground">{payout.tenant?.name || "N/A"}</TableCell>
                        <TableCell>${((payout.netAmountCents || 0) / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">${((payout.platformFeeCents || 0) / 100).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payout.status === "COMPLETED"
                                ? "default"
                                : payout.status === "PENDING"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payouts yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Page Directory</CardTitle>
              <CardDescription>
                All application routes and pages organized by section
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Public Pages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    Public Pages
                  </h3>
                  <div className="space-y-2 pl-7">
                    <Link href="/" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-landing">
                      <Home className="h-4 w-4" />
                      Landing Page
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/gigs" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-gigs">
                      <CalendarDays className="h-4 w-4" />
                      Gig Board
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/jobs" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-jobs">
                      <Briefcase className="h-4 w-4" />
                      Job Board
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                </div>

                {/* Auth Pages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-muted-foreground" />
                    Authentication
                  </h3>
                  <div className="space-y-2 pl-7">
                    <Link href="/login" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-login">
                      <LogIn className="h-4 w-4" />
                      Login
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/register" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-register">
                      <UserPlus className="h-4 w-4" />
                      Register
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/onboarding" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-onboarding">
                      <User className="h-4 w-4" />
                      Onboarding
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                </div>

                {/* Employer Pages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    Employer Dashboard
                  </h3>
                  <div className="space-y-2 pl-7">
                    <Link href="/app" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-employer-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/app/locations" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-locations">
                      <MapPin className="h-4 w-4" />
                      Locations
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/app/jobs" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-employer-jobs">
                      <Briefcase className="h-4 w-4" />
                      Jobs
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/app/applicants" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-applicants">
                      <Users className="h-4 w-4" />
                      Applicants
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/app/gigs" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-employer-gigs">
                      <CalendarDays className="h-4 w-4" />
                      Gigs
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/app/interviews" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-interviews">
                      <MessageSquare className="h-4 w-4" />
                      Interviews
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/app/settings" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-employer-settings">
                      <Settings className="h-4 w-4" />
                      Settings
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                </div>

                {/* Job Seeker Pages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    Job Seeker Dashboard
                  </h3>
                  <div className="space-y-2 pl-7">
                    <Link href="/seeker" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-seeker-dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/seeker/profile" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-seeker-profile">
                      <User className="h-4 w-4" />
                      Profile
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/seeker/saved" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-saved-jobs">
                      <Heart className="h-4 w-4" />
                      Saved Jobs
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/seeker/gigs" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-seeker-gigs">
                      <CalendarDays className="h-4 w-4" />
                      My Gigs
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                </div>

                {/* Admin Pages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    Super Admin
                  </h3>
                  <div className="space-y-2 pl-7">
                    <Link href="/admin" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-admin">
                      <Shield className="h-4 w-4" />
                      Admin Dashboard
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                </div>

                {/* Billing Pages */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                    Billing & Payments
                  </h3>
                  <div className="space-y-2 pl-7">
                    <Link href="/billing/success" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-billing-success">
                      <CreditCardIcon className="h-4 w-4" />
                      Billing Success
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                    <Link href="/payout/return" className="flex items-center gap-2 text-sm hover-elevate p-2 rounded-md" data-testid="page-link-payout-return">
                      <DollarSign className="h-4 w-4" />
                      Payout Return
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
