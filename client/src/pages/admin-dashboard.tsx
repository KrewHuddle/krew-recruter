import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  TrendingDown,
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
  BarChart3,
  Activity,
  Flag,
  Ticket,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle2,
  UserCog,
  Eye,
  Megaphone,
  Loader2,
  Pause,
  Play,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant, UserProfile, GigPayout, GigPost, FeatureFlag, Coupon } from "@shared/schema";

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

interface MrrMetrics {
  currentMrr: number;
  previousMrr: number;
  mrrGrowth: number;
  arr: number;
  monthlyBreakdown: { month: string; mrr: number; newMrr: number; churnedMrr: number }[];
}

interface ChurnMetrics {
  currentChurnRate: number;
  previousChurnRate: number;
  churnTrend: number;
  totalCanceled: number;
  monthlyChurn: { month: string; rate: number; count: number }[];
}

interface TenantHealth {
  tenantId: string;
  tenantName: string;
  planType: string;
  healthScore: number;
  jobsPosted: number;
  gigsPosted: number;
  hiresMade: number;
  lastActiveAt: string | null;
  isAtRisk: boolean;
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

  const { data: mrrMetrics, isLoading: mrrLoading } = useQuery<MrrMetrics>({
    queryKey: ["/api/admin/analytics/mrr"],
  });

  const { data: churnMetrics, isLoading: churnLoading } = useQuery<ChurnMetrics>({
    queryKey: ["/api/admin/analytics/churn"],
  });

  const { data: tenantHealth, isLoading: healthLoading } = useQuery<TenantHealth[]>({
    queryKey: ["/api/admin/analytics/tenant-health"],
  });

  const { data: featureFlags, isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/admin/feature-flags"],
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
  });

  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagDescription, setNewFlagDescription] = useState("");
  const [newFlagEnabled, setNewFlagEnabled] = useState(false);
  const [newFlagPlans, setNewFlagPlans] = useState("all");
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percentage" | "fixed">("percentage");
  const [newCouponMaxUses, setNewCouponMaxUses] = useState("");

  // Meta Ads state
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [metaPageId, setMetaPageId] = useState("");
  const [metaDefaultBudget, setMetaDefaultBudget] = useState("32");
  const [metaMaxBudget, setMetaMaxBudget] = useState("100");
  const [metaMarkupPercent, setMetaMarkupPercent] = useState("20");
  const [metaTestResult, setMetaTestResult] = useState<any>(null);
  const [metaTesting, setMetaTesting] = useState(false);
  const [pauseAllOpen, setPauseAllOpen] = useState(false);
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);

  const createFlagMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; enabled: boolean; enabledForPlans: string[] }) => {
      return apiRequest("POST", "/api/admin/feature-flags", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      toast({ title: "Feature flag created successfully" });
      setFlagDialogOpen(false);
      setNewFlagName("");
      setNewFlagDescription("");
      setNewFlagEnabled(false);
      setNewFlagPlans("all");
    },
    onError: () => {
      toast({ title: "Failed to create feature flag", variant: "destructive" });
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return apiRequest("PATCH", `/api/admin/feature-flags/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      toast({ title: "Feature flag updated" });
    },
  });

  const deleteFlagMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/feature-flags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feature-flags"] });
      toast({ title: "Feature flag deleted" });
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: { code: string; discountType: string; discountValue: number; maxRedemptions?: number }) => {
      return apiRequest("POST", "/api/admin/coupons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "Coupon created successfully" });
      setCouponDialogOpen(false);
      setNewCouponCode("");
      setNewCouponDiscount("");
      setNewCouponMaxUses("");
    },
    onError: () => {
      toast({ title: "Failed to create coupon", variant: "destructive" });
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/coupons/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "Coupon updated" });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({ title: "Coupon deleted" });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/impersonate/${userId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Impersonation session started", description: "You are now viewing as this user" });
    },
    onError: () => {
      toast({ title: "Failed to start impersonation", variant: "destructive" });
    },
  });

  const handleCreateFlag = () => {
    const plans = newFlagPlans === "all" ? ["FREE", "PRO", "ENTERPRISE"] : [newFlagPlans];
    createFlagMutation.mutate({
      name: newFlagName,
      description: newFlagDescription,
      enabled: newFlagEnabled,
      enabledForPlans: plans,
    });
  };

  const handleCreateCoupon = () => {
    createCouponMutation.mutate({
      code: newCouponCode.toUpperCase(),
      discountType: newCouponType,
      discountValue: parseFloat(newCouponDiscount),
      maxRedemptions: newCouponMaxUses ? parseInt(newCouponMaxUses) : undefined,
    });
  };

  // Meta Ads queries
  const { data: metaSettings, isLoading: metaSettingsLoading } = useQuery<
    Array<{ key: string; value: string; description: string | null; updatedAt: string | null }>
  >({
    queryKey: ["/api/admin/meta/settings"],
  });

  const { data: metaCampaigns, isLoading: metaCampaignsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/meta/campaigns"],
  });

  // Populate form fields from fetched settings
  useEffect(() => {
    if (metaSettings) {
      const map: Record<string, string> = {};
      for (const s of metaSettings) map[s.key] = s.value;
      if (map.meta_app_id) setMetaAppId(map.meta_app_id);
      if (map.meta_app_secret) setMetaAppSecret(map.meta_app_secret);
      if (map.meta_access_token) setMetaAccessToken(map.meta_access_token);
      if (map.meta_ad_account_id) setMetaAdAccountId(map.meta_ad_account_id);
      if (map.meta_page_id) setMetaPageId(map.meta_page_id);
      if (map.meta_default_daily_budget_cents) setMetaDefaultBudget(String(parseInt(map.meta_default_daily_budget_cents) / 100));
      if (map.meta_max_daily_budget_cents) setMetaMaxBudget(String(parseInt(map.meta_max_daily_budget_cents) / 100));
      if (map.meta_platform_markup_percent) setMetaMarkupPercent(map.meta_platform_markup_percent);
    }
  }, [metaSettings]);

  const saveMetaSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PUT", "/api/admin/meta/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meta/settings"] });
      toast({ title: "Meta settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save Meta settings", variant: "destructive" });
    },
  });

  const pauseCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/meta/campaigns/${id}/pause`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meta/campaigns"] });
      toast({ title: "Campaign paused" });
    },
  });

  const resumeCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/meta/campaigns/${id}/resume`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meta/campaigns"] });
      toast({ title: "Campaign resumed" });
    },
  });

  const pauseAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/meta/campaigns/pause-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/meta/campaigns"] });
      toast({ title: "All campaigns paused" });
      setPauseAllOpen(false);
    },
  });

  const handleTestMeta = async () => {
    setMetaTesting(true);
    setMetaTestResult(null);
    try {
      const res = await apiRequest("GET", "/api/admin/meta/test");
      const data = await res.json();
      setMetaTestResult(data);
    } catch {
      setMetaTestResult({ valid: false, error: "Request failed" });
    } finally {
      setMetaTesting(false);
    }
  };

  const handleSaveMetaSettings = () => {
    const payload: Record<string, any> = {};
    // Only send non-masked values (user typed real credentials)
    if (metaAppId && !metaAppId.startsWith("••")) payload.appId = metaAppId;
    if (metaAppSecret && !metaAppSecret.startsWith("••")) payload.appSecret = metaAppSecret;
    if (metaAccessToken && !metaAccessToken.startsWith("••")) payload.accessToken = metaAccessToken;
    if (metaAdAccountId) payload.adAccountId = metaAdAccountId;
    if (metaPageId) payload.pageId = metaPageId;
    payload.defaultBudget = parseFloat(metaDefaultBudget) || 32;
    payload.maxBudget = parseFloat(metaMaxBudget) || 100;
    payload.markupPercent = parseInt(metaMarkupPercent) || 20;
    saveMetaSettingsMutation.mutate(payload);
  };

  const metaConnected = metaSettings?.some(s => s.key === "meta_access_token" && s.value && s.value !== "••••");
  const activeCampaignCount = metaCampaigns?.filter((c: any) => c.status === "active").length || 0;
  const totalSpendToday = metaCampaigns
    ?.filter((c: any) => c.status === "active")
    .reduce((sum: number, c: any) => sum + (c.dailyBudgetCents || 0), 0) || 0;

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
        <TabsList className="flex-wrap">
          <TabsTrigger value="tenants" data-testid="tab-tenants">
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="health" data-testid="tab-health">
            <Activity className="h-4 w-4 mr-2" />
            Tenant Health
          </TabsTrigger>
          <TabsTrigger value="flags" data-testid="tab-flags">
            <Flag className="h-4 w-4 mr-2" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="coupons" data-testid="tab-coupons">
            <Ticket className="h-4 w-4 mr-2" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            <DollarSign className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="pages" data-testid="tab-pages">
            <Map className="h-4 w-4 mr-2" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="meta-ads" data-testid="tab-meta-ads">
            <Megaphone className="h-4 w-4 mr-2" />
            Meta Ads
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

        <TabsContent value="analytics">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card data-testid="card-mrr">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {mrrLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${(mrrMetrics?.currentMrr || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {(mrrMetrics?.mrrGrowth || 0) >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        {(mrrMetrics?.mrrGrowth || 0).toFixed(1)}% from last month
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-arr">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {mrrLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-2xl font-bold">
                      ${(mrrMetrics?.arr || 0).toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-churn">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {churnLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        {(churnMetrics?.currentChurnRate || 0).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {(churnMetrics?.churnTrend || 0) <= 0 ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-yellow-500" />
                        )}
                        {Math.abs(churnMetrics?.churnTrend || 0).toFixed(1)}% {(churnMetrics?.churnTrend || 0) <= 0 ? 'better' : 'worse'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-canceled">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Canceled</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {churnLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {churnMetrics?.totalCanceled || 0}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Breakdown</CardTitle>
                <CardDescription>MRR trends over the past 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {mrrLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : mrrMetrics?.monthlyBreakdown && mrrMetrics.monthlyBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">MRR</TableHead>
                        <TableHead className="text-right">New MRR</TableHead>
                        <TableHead className="text-right">Churned MRR</TableHead>
                        <TableHead className="text-right">Net Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mrrMetrics.monthlyBreakdown.map((row) => (
                        <TableRow key={row.month} data-testid={`mrr-row-${row.month}`}>
                          <TableCell className="font-medium">{row.month}</TableCell>
                          <TableCell className="text-right">${row.mrr.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600">+${row.newMrr.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-red-600">-${row.churnedMrr.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={row.newMrr - row.churnedMrr >= 0 ? "default" : "destructive"}>
                              {row.newMrr - row.churnedMrr >= 0 ? '+' : ''}{(row.newMrr - row.churnedMrr).toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No revenue data available yet. Revenue tracking starts when tenants subscribe.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Health Scores</CardTitle>
              <CardDescription>
                Monitor tenant engagement and identify at-risk customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : tenantHealth && tenantHealth.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Health Score</TableHead>
                      <TableHead className="text-center">Jobs</TableHead>
                      <TableHead className="text-center">Gigs</TableHead>
                      <TableHead className="text-center">Hires</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantHealth.map((tenant) => (
                      <TableRow key={tenant.tenantId} data-testid={`health-row-${tenant.tenantId}`}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell>
                          <Badge className={planColors[tenant.planType] || planColors.FREE}>
                            {tenant.planType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={tenant.healthScore} className="w-20" />
                            <span className="text-sm">{tenant.healthScore}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{tenant.jobsPosted}</TableCell>
                        <TableCell className="text-center">{tenant.gigsPosted}</TableCell>
                        <TableCell className="text-center">{tenant.hiresMade}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          {tenant.isAtRisk ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="h-3 w-3" />
                              At Risk
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <CheckCircle2 className="h-3 w-3" />
                              Healthy
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tenant health data available. Health scores are calculated based on tenant activity.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>
                  Control feature rollouts across the platform
                </CardDescription>
              </div>
              <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-flag">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Flag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Feature Flag</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="flag-name">Flag Name</Label>
                      <Input
                        id="flag-name"
                        placeholder="e.g., enable_video_interviews"
                        value={newFlagName}
                        onChange={(e) => setNewFlagName(e.target.value)}
                        data-testid="input-flag-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flag-description">Description</Label>
                      <Textarea
                        id="flag-description"
                        placeholder="What does this feature flag control?"
                        value={newFlagDescription}
                        onChange={(e) => setNewFlagDescription(e.target.value)}
                        data-testid="input-flag-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flag-plans">Enabled For Plans</Label>
                      <Select value={newFlagPlans} onValueChange={setNewFlagPlans}>
                        <SelectTrigger data-testid="select-flag-plans">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Plans</SelectItem>
                          <SelectItem value="FREE">Free Only</SelectItem>
                          <SelectItem value="PRO">Pro Only</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="flag-enabled">Enabled</Label>
                      <Switch
                        id="flag-enabled"
                        checked={newFlagEnabled}
                        onCheckedChange={setNewFlagEnabled}
                        data-testid="switch-flag-enabled"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateFlag}
                      disabled={!newFlagName || createFlagMutation.isPending}
                      data-testid="button-submit-flag"
                    >
                      {createFlagMutation.isPending ? "Creating..." : "Create Flag"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : featureFlags && featureFlags.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Plans</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {featureFlags.map((flag) => (
                      <TableRow key={flag.id} data-testid={`flag-row-${flag.id}`}>
                        <TableCell className="font-medium font-mono">{flag.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {flag.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(flag.enabledForPlans || []).map((plan) => (
                              <Badge key={plan} variant="outline" className="text-xs">
                                {plan}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={(checked) => toggleFlagMutation.mutate({ id: flag.id, enabled: checked })}
                            data-testid={`switch-flag-${flag.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteFlagMutation.mutate(flag.id)}
                            data-testid={`button-delete-flag-${flag.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No feature flags created yet. Create one to control feature rollouts.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Discount Coupons</CardTitle>
                <CardDescription>
                  Manage promotional codes and discounts
                </CardDescription>
              </div>
              <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-coupon">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Coupon
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Coupon</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="coupon-code">Coupon Code</Label>
                      <Input
                        id="coupon-code"
                        placeholder="e.g., SUMMER25"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                        data-testid="input-coupon-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coupon-type">Discount Type</Label>
                      <Select value={newCouponType} onValueChange={(v) => setNewCouponType(v as "percentage" | "fixed")}>
                        <SelectTrigger data-testid="select-coupon-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coupon-discount">
                        Discount Value {newCouponType === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        id="coupon-discount"
                        type="number"
                        placeholder={newCouponType === 'percentage' ? '25' : '10'}
                        value={newCouponDiscount}
                        onChange={(e) => setNewCouponDiscount(e.target.value)}
                        data-testid="input-coupon-discount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coupon-max-uses">Max Redemptions (optional)</Label>
                      <Input
                        id="coupon-max-uses"
                        type="number"
                        placeholder="Leave empty for unlimited"
                        value={newCouponMaxUses}
                        onChange={(e) => setNewCouponMaxUses(e.target.value)}
                        data-testid="input-coupon-max-uses"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateCoupon}
                      disabled={!newCouponCode || !newCouponDiscount || createCouponMutation.isPending}
                      data-testid="button-submit-coupon"
                    >
                      {createCouponMutation.isPending ? "Creating..." : "Create Coupon"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {couponsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : coupons && coupons.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead className="text-center">Used</TableHead>
                      <TableHead className="text-center">Max Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => (
                      <TableRow key={coupon.id} data-testid={`coupon-row-${coupon.id}`}>
                        <TableCell className="font-medium font-mono">{coupon.code}</TableCell>
                        <TableCell>
                          {coupon.discountType === 'percentage' 
                            ? `${coupon.discountValue}%` 
                            : `$${coupon.discountValue}`}
                        </TableCell>
                        <TableCell className="text-center">{coupon.currentRedemptions || 0}</TableCell>
                        <TableCell className="text-center">
                          {coupon.maxRedemptions || '∞'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={coupon.isActive}
                            onCheckedChange={(checked) => toggleCouponMutation.mutate({ id: coupon.id, isActive: checked })}
                            data-testid={`switch-coupon-${coupon.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteCouponMutation.mutate(coupon.id)}
                            data-testid={`button-delete-coupon-${coupon.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No coupons created yet. Create one to offer promotional discounts.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ META ADS TAB ============ */}
        <TabsContent value="meta-ads">
          <div className="space-y-6">

            {/* Connection Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Meta Ads Configuration
                    </CardTitle>
                    <CardDescription>
                      Manage Krew Recruiter's Meta Business account for all employer campaigns
                    </CardDescription>
                  </div>
                  <Badge variant={metaConnected ? "default" : "destructive"} className="text-sm">
                    {metaConnected ? (
                      <><Wifi className="h-3 w-3 mr-1" /> Meta Connected</>
                    ) : (
                      <><WifiOff className="h-3 w-3 mr-1" /> Not Connected</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-6">
                  <Button onClick={handleTestMeta} disabled={metaTesting} variant="outline">
                    {metaTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Test Connection
                  </Button>
                </div>
                {metaTestResult && (
                  <div className={`rounded-lg border p-4 mb-6 ${metaTestResult.valid ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"}`}>
                    {metaTestResult.valid ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-green-700 dark:text-green-400">Connection valid</p>
                        <p>Ad Account: {metaTestResult.adAccountName}</p>
                        {metaTestResult.pageName && <p>Page: {metaTestResult.pageName}</p>}
                        <p>Currency: {metaTestResult.currency}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Connection failed: {metaTestResult.error}
                      </p>
                    )}
                  </div>
                )}

                {/* Settings Form */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="meta-app-id">Meta App ID</Label>
                    <Input
                      id="meta-app-id"
                      value={metaAppId}
                      onChange={(e) => setMetaAppId(e.target.value)}
                      placeholder="1234567890"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meta-app-secret">Meta App Secret</Label>
                    <Input
                      id="meta-app-secret"
                      type="password"
                      value={metaAppSecret}
                      onChange={(e) => setMetaAppSecret(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="meta-access-token">System User Access Token</Label>
                    <Input
                      id="meta-access-token"
                      type="password"
                      value={metaAccessToken}
                      onChange={(e) => setMetaAccessToken(e.target.value)}
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate in Meta Business Manager &rarr; System Users &rarr; Generate Token. Never expires.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="meta-ad-account">Ad Account ID</Label>
                    <Input
                      id="meta-ad-account"
                      value={metaAdAccountId}
                      onChange={(e) => setMetaAdAccountId(e.target.value)}
                      placeholder="act_1234567890"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="meta-page-id">Facebook Page ID</Label>
                    <Input
                      id="meta-page-id"
                      value={metaPageId}
                      onChange={(e) => setMetaPageId(e.target.value)}
                      placeholder="Krew Recruiter Page ID"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The Krew Recruiter Facebook Page used for ad creatives.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="meta-default-budget">Default Daily Budget ($)</Label>
                    <Input
                      id="meta-default-budget"
                      type="number"
                      value={metaDefaultBudget}
                      onChange={(e) => setMetaDefaultBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="meta-max-budget">Max Daily Budget ($)</Label>
                    <Input
                      id="meta-max-budget"
                      type="number"
                      value={metaMaxBudget}
                      onChange={(e) => setMetaMaxBudget(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Employers cannot exceed this amount per day.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="meta-markup">Platform Markup %</Label>
                    <Input
                      id="meta-markup"
                      type="number"
                      value={metaMarkupPercent}
                      onChange={(e) => setMetaMarkupPercent(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Krew Recruiter charges this % on top of actual Meta spend.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleSaveMetaSettings}
                  disabled={saveMetaSettingsMutation.isPending}
                  className="mt-6"
                >
                  {saveMetaSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Meta Settings
                </Button>
              </CardContent>
            </Card>

            {/* Campaign Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Campaigns</CardTitle>
                    <CardDescription>
                      {activeCampaignCount} active &middot; Platform daily spend: ${(totalSpendToday / 100).toFixed(2)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={pauseAllOpen} onOpenChange={setPauseAllOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={activeCampaignCount === 0}>
                          <Square className="h-3.5 w-3.5 mr-1" />
                          Pause All Campaigns
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Pause all active campaigns?</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          This will immediately pause {activeCampaignCount} active campaigns across all employers.
                          Employers will be notified their campaigns are paused.
                        </p>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setPauseAllOpen(false)}>Cancel</Button>
                          <Button
                            variant="destructive"
                            onClick={() => pauseAllMutation.mutate()}
                            disabled={pauseAllMutation.isPending}
                          >
                            {pauseAllMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Confirm Pause All
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {metaCampaignsLoading ? (
                  <div className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : metaCampaigns && metaCampaigns.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Restaurant</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Employer Pays</TableHead>
                        <TableHead>Meta Spend</TableHead>
                        <TableHead>Markup</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metaCampaigns.map((c: any) => {
                        const markupPct = parseInt(metaMarkupPercent) || 20;
                        const employerBudget = (c.dailyBudgetCents || 0) / 100;
                        const metaSpend = employerBudget * 100 / (100 + markupPct);
                        const markup = employerBudget - metaSpend;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.orgName || "—"}</TableCell>
                            <TableCell>{c.title}</TableCell>
                            <TableCell>
                              <Badge variant={
                                c.status === "active" ? "default" :
                                c.status === "paused" ? "secondary" : "outline"
                              }>
                                {c.status}
                              </Badge>
                            </TableCell>
                            <TableCell>${employerBudget.toFixed(2)}/day</TableCell>
                            <TableCell>${metaSpend.toFixed(2)}/day</TableCell>
                            <TableCell className="text-green-600">${markup.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {c.status === "active" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => pauseCampaignMutation.mutate(c.id)}
                                    title="Pause"
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {(c.status === "paused" || c.status === "draft") && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => resumeCampaignMutation.mutate(c.id)}
                                    title="Resume"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No campaigns yet. Employers will create campaigns through the Campaign Engine.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
