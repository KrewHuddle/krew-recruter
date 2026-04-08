import { useState } from "react";
import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Download, Search, Users, X, ChevronLeft, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  notes: string | null;
  campaignTitle: string;
  screeningResponses: any;
  passedScreening: boolean;
  appliedAt: string;
  reviewedAt: string | null;
  interviewScheduledAt: string | null;
}

export default function CampaignCandidates() {
  const { apiFetch } = useCampaignAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  const { data: applicants = [] } = useQuery<Applicant[]>({
    queryKey: ["/api/applicants"],
    queryFn: async () => {
      const res = await apiFetch("/api/applicants");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; notes?: string }) => {
      const res = await apiFetch(`/api/applicants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
      if (selectedApplicant) {
        setSelectedApplicant({ ...selectedApplicant, ...data });
      }
    },
  });

  const filtered = applicants.filter((a: Applicant) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.firstName?.toLowerCase().includes(s) ||
      a.lastName?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.campaignTitle?.toLowerCase().includes(s)
    );
  });

  const statusCounts = {
    unreviewed: applicants.filter(a => a.status === "unreviewed").length,
    shortlisted: applicants.filter(a => a.status === "shortlisted").length,
    rejected: applicants.filter(a => a.status === "rejected").length,
  };

  const statusColors: Record<string, string> = {
    unreviewed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    shortlisted: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    interview_scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    hired: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  };

  if (applicants.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Candidates</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">You don't have any candidates yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Candidates will appear here after you start promoting your first job.
          </p>
          <Button onClick={() => setLocation("/campaign/jobs/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Job
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={`flex-1 p-6 ${selectedApplicant ? "hidden lg:block" : ""}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Candidates</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                className="pl-9 w-64"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="unreviewed">
          <TabsList>
            <TabsTrigger value="unreviewed">Unreviewed ({statusCounts.unreviewed})</TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted ({statusCounts.shortlisted})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
          </TabsList>

          {["unreviewed", "shortlisted", "rejected"].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Candidate</th>
                      <th className="text-left px-4 py-3 font-medium">Job</th>
                      <th className="text-left px-4 py-3 font-medium">Location</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Applied At</th>
                      <th className="text-left px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter(a => a.status === tab).map(a => (
                      <tr
                        key={a.id}
                        className="border-t hover:bg-muted/30 cursor-pointer"
                        onClick={() => setSelectedApplicant(a)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {(a.firstName?.[0] || "").toUpperCase()}{(a.lastName?.[0] || "").toUpperCase()}
                            </div>
                            <span className="font-medium">{a.firstName} {a.lastName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{a.campaignTitle}</td>
                        <td className="px-4 py-3 text-muted-foreground">{a.location || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || ""}`}>
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDistanceToNow(new Date(a.appliedAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: a.id, status: "shortlisted" })}>
                              Shortlist
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => updateMutation.mutate({ id: a.id, status: "rejected" })}>
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Side panel */}
      {selectedApplicant && (
        <div className="w-full lg:w-[400px] border-l bg-background overflow-y-auto">
          <div className="p-6">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedApplicant(null)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                {(selectedApplicant.firstName?.[0] || "").toUpperCase()}
                {(selectedApplicant.lastName?.[0] || "").toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold">{selectedApplicant.firstName} {selectedApplicant.lastName}</h2>
                <p className="text-sm text-muted-foreground">{selectedApplicant.email}</p>
                {selectedApplicant.phone && (
                  <p className="text-sm text-muted-foreground">{selectedApplicant.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applied for:</span>
                <span className="font-medium">{selectedApplicant.campaignTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applied:</span>
                <span>{new Date(selectedApplicant.appliedAt).toLocaleDateString()}</span>
              </div>
              {selectedApplicant.location && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span>{selectedApplicant.location}</span>
                </div>
              )}
            </div>

            {/* Screening Answers */}
            {selectedApplicant.screeningResponses && (
              <>
                <hr className="my-4" />
                <h3 className="font-semibold mb-3">Screening Answers</h3>
                <div className="space-y-3 text-sm">
                  {Object.entries(selectedApplicant.screeningResponses as Record<string, any>).map(([question, answer]) => (
                    <div key={question}>
                      <p className="text-muted-foreground">Q: {question}</p>
                      <p className="font-medium">A: {String(answer)} {answer === "Yes" ? "\u2713" : ""}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <span className="text-sm">Passed screening: </span>
                  <span className="text-sm font-medium">
                    {selectedApplicant.passedScreening ? "Yes" : "No"}
                  </span>
                </div>
              </>
            )}

            <hr className="my-4" />

            {/* Status */}
            <div className="mb-4">
              <Label className="mb-2 block">Status</Label>
              <Select
                value={selectedApplicant.status}
                onValueChange={status => updateMutation.mutate({ id: selectedApplicant.id, status })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unreviewed">Unreviewed</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <Label className="mb-2 block">Notes</Label>
              <Textarea
                defaultValue={selectedApplicant.notes || ""}
                rows={3}
                onBlur={e => {
                  if (e.target.value !== (selectedApplicant.notes || "")) {
                    updateMutation.mutate({ id: selectedApplicant.id, notes: e.target.value });
                  }
                }}
              />
            </div>

            <Button className="w-full">Schedule Interview</Button>
          </div>
        </div>
      )}
    </div>
  );
}
