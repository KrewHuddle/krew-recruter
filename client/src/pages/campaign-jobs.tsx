import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Plus, Pause, Play, Users, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export default function CampaignJobs() {
  const { apiFetch } = useCampaignAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const res = await apiFetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch");
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] }),
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    filled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Button onClick={() => setLocation("/campaign/jobs/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Job
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({campaigns.filter((c: any) => c.status === "active").length})</TabsTrigger>
          <TabsTrigger value="paused">Paused ({campaigns.filter((c: any) => c.status === "paused").length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({campaigns.filter((c: any) => c.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="filled">Filled ({campaigns.filter((c: any) => c.status === "filled").length})</TabsTrigger>
        </TabsList>

        {["all", "active", "paused", "draft", "filled"].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <JobTable
              campaigns={tab === "all" ? campaigns : campaigns.filter((c: any) => c.status === tab)}
              statusColors={statusColors}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onNavigate={setLocation}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function JobTable({ campaigns, statusColors, onStatusChange, onNavigate }: {
  campaigns: any[];
  statusColors: Record<string, string>;
  onStatusChange: (id: string, status: string) => void;
  onNavigate: (path: string) => void;
}) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">No jobs found</p>
        <p className="text-sm">Create a new job to get started.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Job Title</th>
            <th className="text-left px-4 py-3 font-medium">Location</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Applicants</th>
            <th className="text-left px-4 py-3 font-medium">Daily Budget</th>
            <th className="text-left px-4 py-3 font-medium">Started</th>
            <th className="text-left px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c: any) => (
            <tr key={c.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => onNavigate(`/app/jobs/${c.id}`)}>
              <td className="px-4 py-3 font-medium">{c.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{c.location || "-"}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || ""}`}>
                  {c.status}
                </span>
              </td>
              <td className="px-4 py-3">{c.applicantCount || 0}</td>
              <td className="px-4 py-3">${(c.dailyBudgetCents || 0) / 100}/day</td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.activatedAt ? formatDistanceToNow(new Date(c.activatedAt), { addSuffix: true }) : "-"}
              </td>
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <div className="flex gap-1">
                  {c.status === "active" && (
                    <Button variant="ghost" size="sm" onClick={() => onStatusChange(c.id, "paused")}>
                      <Pause className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {(c.status === "paused" || c.status === "draft") && (
                    <Button variant="ghost" size="sm" onClick={() => onStatusChange(c.id, "active")}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onNavigate(`/app/candidates?campaign_id=${c.id}`)}>
                    <Users className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onNavigate(`/app/jobs/${c.id}`)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(c.id, "filled")}>Mark as Filled</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onStatusChange(c.id, "cancelled")} className="text-destructive">Cancel</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
