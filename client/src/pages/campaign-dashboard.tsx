import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useLocation } from "wouter";
import { Users, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CampaignDashboard() {
  const { apiFetch } = useCampaignAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("all");

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/campaign-stats", period],
    queryFn: async () => {
      const res = await apiFetch(`/api/dashboard/campaign-stats?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
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

  const hasData = stats?.totalApplicants > 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Candidates & Ad Spend</h3>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{stats?.totalApplicants || 0}</p>
              <p className="text-sm text-muted-foreground">candidates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">${stats?.avgCostPerApplicant?.toFixed(2) || "0.00"}</p>
              <p className="text-sm text-muted-foreground">avg cost per candidate</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {hasData && stats?.monthlyData?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <XAxis dataKey="month" tickFormatter={(v: string) => {
                  const [, m] = v.split("-");
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return months[parseInt(m) - 1] || v;
                }} />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "totalApplicants") return [value, "Candidates"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="totalApplicants" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center relative">
              {/* Placeholder bars */}
              <div className="absolute inset-0 flex items-end justify-around px-12 pb-8 opacity-10">
                {[40, 65, 45, 80, 55, 70, 30, 90, 60, 50, 75, 85].map((h, i) => (
                  <div
                    key={i}
                    className="w-8 bg-muted-foreground rounded-t"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="text-center z-10">
                <p className="font-medium mb-1">No analytics data yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Once your job ads start running and candidates apply, your data will appear here.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Candidates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Candidates</h3>
          <Button variant="link" onClick={() => setLocation("/campaign/candidates")}>
            View all candidates <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

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
          <TabsContent value="unreviewed" className="mt-4">
            <CandidateTable candidates={applicantsList?.filter((a: any) => a.status === "unreviewed") || []} />
          </TabsContent>
          <TabsContent value="shortlisted" className="mt-4">
            <CandidateTable candidates={applicantsList?.filter((a: any) => a.status === "shortlisted") || []} />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <CandidateTable candidates={applicantsList?.filter((a: any) => a.status === "rejected") || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
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
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Applied At</th>
          </tr>
        </thead>
        <tbody>
          {candidates.slice(0, 10).map((c: any) => (
            <tr key={c.id} className="border-t hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {(c.firstName?.[0] || "").toUpperCase()}{(c.lastName?.[0] || "").toUpperCase()}
                  </div>
                  <span className="font-medium">{c.firstName} {c.lastName}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unreviewed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    shortlisted: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    interview_scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    hired: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.unreviewed}`}>
      {status.replace("_", " ")}
    </span>
  );
}
