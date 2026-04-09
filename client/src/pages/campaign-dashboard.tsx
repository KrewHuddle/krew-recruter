import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Users,
  ArrowRight,
  Plus,
  Pause,
  Play,
  MoreHorizontal,
  Rocket,
  ChevronRight,
  Home,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export default function CampaignDashboard() {
  const { apiFetch, organizations, orgId } = useCampaignAuth();
  const [location, setLocation] = useLocation();
  const [period, setPeriod] = useState("all");
  const queryClient = useQueryClient();
  const basePath = location.startsWith("/app/campaigns") ? "/app/campaigns" : "/campaign";

  const currentOrg = organizations.find(o => o.orgId === orgId);
  const orgName = currentOrg?.orgName || "My Organization";

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/campaign-stats", period],
    queryFn: async () => {
      const res = await apiFetch(`/api/dashboard/campaign-stats?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await apiFetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const { data: applicantsList } = useQuery({
    queryKey: ["/api/applicants"],
    queryFn: async () => {
      const res = await apiFetch("/api/applicants");
      if (!res.ok) throw new Error("Failed to fetch applicants");
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiFetch(`/api/campaigns/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/campaign-stats"] });
    },
  });

  const activeCampaigns = campaigns.filter((c: any) => c.status === "active");
  const hasData = stats?.totalApplicants > 0 || campaigns.length > 0;

  // Empty state
  if (!hasData && campaigns.length === 0) {
    return (
      <div className="p-6">
        <Breadcrumb items={[{ label: "Home" }, { label: "Analytics" }]} />
        <h1 className="text-2xl font-bold mb-6">
          Dashboard for <span className="text-primary">{orgName}</span>
        </h1>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Rocket className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Launch your first campaign</h2>
            <p className="text-muted-foreground mb-8">
              Create a job ad and start reaching qualified hospitality candidates on
              Facebook and Instagram in minutes.
            </p>
            <Button onClick={() => setLocation(`${basePath}/jobs/new`)} size="lg">
              <Plus className="mr-2 h-4 w-4" /> Create Campaign
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "Home" }, { label: "Analytics" }]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Dashboard for <span className="text-primary">{orgName}</span>
        </h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setLocation(`${basePath}/jobs/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Button>
        </div>
      </div>

      {/* Candidates & Ad Spend Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Candidates & Ad Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-6 mb-4">
            <div>
              <p className="text-3xl font-bold">{stats?.totalApplicants || 0}</p>
              <p className="text-sm text-muted-foreground">candidates</p>
            </div>
            <div>
              <p className="text-3xl font-bold">${stats?.avgCostPerApplicant?.toFixed(2) || "0.00"}</p>
              <p className="text-sm text-muted-foreground">avg cost per candidate</p>
            </div>
          </div>

          {stats?.monthlyData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyData}>
                <XAxis
                  dataKey="month"
                  tickFormatter={(v: string) => {
                    const [, m] = v.split("-");
                    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return months[parseInt(m) - 1] || v;
                  }}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "totalApplicants") return [value, "Candidates"];
                    return [value, name];
                  }}
                />
                <Bar
                  dataKey="totalApplicants"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-end justify-around px-12 pb-8">
                {[40, 65, 45, 80, 55, 70, 30, 90, 60, 50, 75, 85].map((h, i) => (
                  <div
                    key={i}
                    className="w-8 rounded-t"
                    style={{
                      height: `${h}%`,
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                    }}
                  />
                ))}
              </div>
              <div className="text-center z-10">
                <p className="font-medium mb-1">No analytics data yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Once your campaigns start running, your data will appear here.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Campaigns Table */}
      {campaigns.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Active Campaigns</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation(`${basePath}/jobs`)}>
                View all jobs <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Applicants</th>
                  <th className="text-left px-4 py-3 font-medium">Spend</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 8).map((c: any) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3">
                      <CampaignStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">{c.applicantCount || 0}</td>
                    <td className="px-4 py-3">
                      ${((c.totalSpendCents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {c.status === "active" && (
                          <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: c.id, status: "paused" })}>
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(c.status === "paused" || c.status === "draft") && (
                          <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: c.id, status: "active" })}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setLocation(`/campaign/jobs/${c.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setLocation(`/campaign/candidates?campaign_id=${c.id}`)}>
                              View Candidates
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: c.id, status: "filled" })}>
                              Mark as Filled
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Recent Candidates */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Candidates</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => setLocation(`${basePath}/candidates`)}>
              View all candidates <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="unreviewed">
            <TabsList>
              <TabsTrigger value="unreviewed">
                Unreviewed ({applicantsList?.filter((a: any) => a.status === "unreviewed").length || 0})
              </TabsTrigger>
              <TabsTrigger value="shortlisted">
                Shortlisted ({applicantsList?.filter((a: any) => a.status === "shortlisted").length || 0})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({applicantsList?.filter((a: any) => a.status === "rejected").length || 0})
              </TabsTrigger>
            </TabsList>
            {["unreviewed", "shortlisted", "rejected"].map(tab => (
              <TabsContent key={tab} value={tab} className="mt-4">
                <CandidateTable
                  candidates={applicantsList?.filter((a: any) => a.status === tab) || []}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          {item.href ? (
            <a href={item.href} className="hover:text-foreground transition-colors">{item.label}</a>
          ) : (
            <span className={i === items.length - 1 ? "text-foreground" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    paused: "bg-accent text-accent-foreground",
    draft: "bg-muted text-muted-foreground",
    filled: "bg-primary/10 text-primary",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function CandidateTable({ candidates }: { candidates: any[] }) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No candidates yet</p>
        <p className="text-sm">Candidates who apply will appear here.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Candidate</th>
            <th className="text-left px-4 py-3 font-medium">Job</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Applied At</th>
          </tr>
        </thead>
        <tbody>
          {candidates.slice(0, 10).map((c: any) => (
            <tr key={c.id} className="border-t hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {(c.firstName?.[0] || "").toUpperCase()}
                    {(c.lastName?.[0] || "").toUpperCase()}
                  </div>
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.campaignTitle || "-"}</td>
              <td className="px-4 py-3">
                <CandidateStatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.appliedAt ? formatDistanceToNow(new Date(c.appliedAt), { addSuffix: true }) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unreviewed: "bg-primary/10 text-primary",
    shortlisted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    rejected: "bg-destructive/10 text-destructive",
    interview_scheduled: "bg-accent text-accent-foreground",
    hired: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.unreviewed}`}>
      {status === "unreviewed" ? "New" : status.replace("_", " ")}
    </span>
  );
}
