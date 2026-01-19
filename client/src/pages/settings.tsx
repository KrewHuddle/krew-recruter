import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant-context";
import { useAuth } from "@/hooks/use-auth";
import {
  Settings as SettingsIcon,
  Users,
  CreditCard,
  Link as LinkIcon,
  Building2,
  Plus,
  Copy,
  CheckCircle2,
  Crown,
  Shield,
  Eye,
} from "lucide-react";
import type { Tenant, TenantMembership } from "@shared/schema";

type MemberWithUser = TenantMembership & {
  user?: { email: string; firstName?: string; lastName?: string };
};

const orgFormSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
});

type OrgFormValues = z.infer<typeof orgFormSchema>;

const inviteFormSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER", "REVIEWER", "VIEWER"]),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const roleIcons: Record<string, typeof Crown> = {
  OWNER: Crown,
  ADMIN: Shield,
  HIRING_MANAGER: Users,
  LOCATION_MANAGER: Building2,
  REVIEWER: Eye,
  VIEWER: Eye,
};

export default function Settings() {
  const { currentTenant, memberships, refetch } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: members, isLoading: membersLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/tenants", currentTenant?.id, "members"],
    enabled: !!currentTenant,
  });

  const orgForm = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: { name: "" },
  });

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: "VIEWER" },
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: OrgFormValues) => {
      return apiRequest("POST", "/api/tenants", data);
    },
    onSuccess: async (response) => {
      const tenant = await response.json();
      refetch();
      toast({ title: "Organization created successfully" });
      setIsOrgDialogOpen(false);
      orgForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create organization", variant: "destructive" });
    },
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      return apiRequest("POST", `/api/tenants/${currentTenant?.id}/invite`, data);
    },
    onSuccess: async (response) => {
      const { inviteToken } = await response.json();
      const link = `${window.location.origin}/invite/${inviteToken}`;
      setInviteLink(link);
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", currentTenant?.id, "members"],
      });
      toast({ title: "Invitation created" });
    },
    onError: () => {
      toast({ title: "Failed to create invitation", variant: "destructive" });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: string;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/tenants/${currentTenant?.id}/members/${memberId}`,
        { role }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", currentTenant?.id, "members"],
      });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const currentMembership = memberships.find(
    (m) => m.tenantId === currentTenant?.id
  );
  const isOwnerOrAdmin =
    currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization and account settings
          </p>
        </div>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Organization Tab */}
        <TabsContent value="organization" className="space-y-4">
          {currentTenant ? (
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Manage your organization settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                    {currentTenant.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{currentTenant.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          currentTenant.planType === "PRO"
                            ? "default"
                            : currentTenant.planType === "ENTERPRISE"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {currentTenant.planType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Slug: {currentTenant.slug}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No organization selected</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  Create your first organization to get started
                </p>
                <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2" data-testid="button-create-org">
                      <Plus className="h-4 w-4" />
                      Create Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Organization</DialogTitle>
                      <DialogDescription>
                        Create a new organization to manage your hiring
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...orgForm}>
                      <form
                        onSubmit={orgForm.handleSubmit((data) =>
                          createOrgMutation.mutate(data)
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={orgForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Coastal Restaurant Group"
                                  {...field}
                                  data-testid="input-org-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOrgDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createOrgMutation.isPending}
                            data-testid="button-save-org"
                          >
                            {createOrgMutation.isPending
                              ? "Creating..."
                              : "Create Organization"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Create New Organization */}
          {currentTenant && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Organizations</CardTitle>
                <CardDescription>
                  Create or switch to another organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="button-create-new-org">
                      <Plus className="h-4 w-4" />
                      Create New Organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Organization</DialogTitle>
                      <DialogDescription>
                        Create a new organization to manage your hiring
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...orgForm}>
                      <form
                        onSubmit={orgForm.handleSubmit((data) =>
                          createOrgMutation.mutate(data)
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={orgForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Coastal Restaurant Group"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOrgDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createOrgMutation.isPending}
                          >
                            {createOrgMutation.isPending
                              ? "Creating..."
                              : "Create Organization"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          {currentTenant ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage who has access to {currentTenant.name}
                  </CardDescription>
                </div>
                {isOwnerOrAdmin && (
                  <Dialog
                    open={isInviteDialogOpen}
                    onOpenChange={(open) => {
                      setIsInviteDialogOpen(open);
                      if (!open) {
                        setInviteLink(null);
                        inviteForm.reset();
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="gap-2" data-testid="button-invite-member">
                        <Plus className="h-4 w-4" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>
                          Send an invitation to join your organization
                        </DialogDescription>
                      </DialogHeader>
                      {inviteLink ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 rounded-lg border border-border p-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="text-sm">
                              Invitation created! Share this link:
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={inviteLink}
                              readOnly
                              className="font-mono text-sm"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={copyInviteLink}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => {
                              setIsInviteDialogOpen(false);
                              setInviteLink(null);
                              inviteForm.reset();
                            }}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <Form {...inviteForm}>
                          <form
                            onSubmit={inviteForm.handleSubmit((data) =>
                              inviteMemberMutation.mutate(data)
                            )}
                            className="space-y-4"
                          >
                            <FormField
                              control={inviteForm.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email Address</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="email"
                                      placeholder="colleague@company.com"
                                      {...field}
                                      data-testid="input-invite-email"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={inviteForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Role</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-invite-role">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="ADMIN">Admin</SelectItem>
                                      <SelectItem value="HIRING_MANAGER">
                                        Hiring Manager
                                      </SelectItem>
                                      <SelectItem value="LOCATION_MANAGER">
                                        Location Manager
                                      </SelectItem>
                                      <SelectItem value="REVIEWER">
                                        Reviewer
                                      </SelectItem>
                                      <SelectItem value="VIEWER">Viewer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Choose what this member can do
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex justify-end gap-3 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInviteDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={inviteMemberMutation.isPending}
                                data-testid="button-send-invite"
                              >
                                {inviteMemberMutation.isPending
                                  ? "Creating..."
                                  : "Create Invite"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      )}
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                ) : members && members.length > 0 ? (
                  <div className="space-y-4">
                    {members.map((member) => {
                      const RoleIcon = roleIcons[member.role] || Eye;
                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                          data-testid={`member-item-${member.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {(
                                  member.user?.firstName?.[0] ||
                                  member.user?.email?.[0] ||
                                  "U"
                                ).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.user?.firstName && member.user?.lastName
                                  ? `${member.user.firstName} ${member.user.lastName}`
                                  : member.user?.email || "Pending Invite"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.user?.email}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                member.role === "OWNER"
                                  ? "default"
                                  : member.role === "ADMIN"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="gap-1"
                            >
                              <RoleIcon className="h-3 w-3" />
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No team members yet
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No organization selected
                </h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Select or create an organization to manage members
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border p-6">
                <div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        currentTenant?.planType === "PRO"
                          ? "default"
                          : currentTenant?.planType === "ENTERPRISE"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-base px-3 py-1"
                    >
                      {currentTenant?.planType || "FREE"}
                    </Badge>
                    {currentTenant?.planType === "FREE" && (
                      <span className="text-muted-foreground">plan</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {currentTenant?.planType === "FREE"
                      ? "Upgrade to PRO to unlock gigs, interviews, and job distribution"
                      : currentTenant?.planType === "PRO"
                      ? "Full access to all features"
                      : "Enterprise features with dedicated support"}
                  </p>
                </div>
                {currentTenant?.planType === "FREE" && (
                  <Button data-testid="button-upgrade">Upgrade to PRO</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Board Integrations</CardTitle>
              <CardDescription>
                Connect your job board accounts for automatic distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Indeed", "ZipRecruiter", "Aggregator"].map((provider) => (
                  <div
                    key={provider}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground font-bold">
                        {provider[0]}
                      </div>
                      <div>
                        <div className="font-medium">{provider}</div>
                        <div className="text-sm text-muted-foreground">
                          Not connected
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-connect-${provider.toLowerCase()}`}>
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
