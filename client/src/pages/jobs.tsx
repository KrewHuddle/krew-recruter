import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTenant } from "@/lib/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  DollarSign,
  Users,
  Star,
  ExternalLink,
  Globe,
  CheckCircle2,
  Upload,
  FileText,
  Download,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useState, useRef } from "react";
import type { Job, Location, SponsoredCampaign, JobDistributionChannel } from "@shared/schema";

type JobWithRelations = Job & {
  location?: Location;
  _count?: { applications: number };
  sponsoredCampaign?: SponsoredCampaign | null;
  distributionChannels?: JobDistributionChannel[];
};

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
    rows.push(row);
  }
  
  return rows;
}

export default function Jobs() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedJobs, setParsedJobs] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: jobs, isLoading } = useQuery<JobWithRelations[]>({
    queryKey: ["/api/jobs"],
    enabled: !!currentTenant,
    refetchOnMount: "always",
  });

  const importMutation = useMutation({
    mutationFn: async (jobsData: Record<string, string>[]) => {
      const res = await apiRequest("POST", "/api/jobs/import", { jobs: jobsData });
      return res.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      if (result.success > 0) {
        toast({ title: `Successfully imported ${result.success} job(s)` });
      }
    },
    onError: () => {
      toast({ title: "Failed to import jobs", variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setParsedJobs(rows);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsedJobs.length === 0) return;
    importMutation.mutate(parsedJobs);
  };

  const resetImport = () => {
    setParsedJobs([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = "title,role,description,jobType,location,payRangeMin,payRangeMax,scheduleTags\nServer,Server,\"Looking for experienced server\",FULL_TIME,\"Downtown Location\",15,20,\"Morning,Evening\"";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.role.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to manage jobs
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage job postings for {currentTenant.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={importDialogOpen} onOpenChange={(open) => {
            setImportDialogOpen(open);
            if (!open) resetImport();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-import-jobs">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Jobs from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to bulk import job postings
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">CSV File</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedJobs.length > 0 
                          ? `${parsedJobs.length} job(s) ready to import` 
                          : "Select a CSV file to import"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadTemplate}
                      className="gap-1"
                      data-testid="button-download-template"
                    >
                      <Download className="h-4 w-4" />
                      Template
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-select-csv"
                    >
                      Select File
                    </Button>
                  </div>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {parsedJobs.length > 0 && !importResult && (
                  <div className="max-h-48 overflow-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left font-medium">Title</th>
                          <th className="p-2 text-left font-medium">Role</th>
                          <th className="p-2 text-left font-medium">Type</th>
                          <th className="p-2 text-left font-medium">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedJobs.slice(0, 10).map((job, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="p-2">{job.title || "-"}</td>
                            <td className="p-2">{job.role || "-"}</td>
                            <td className="p-2">{job.jobType || "FULL_TIME"}</td>
                            <td className="p-2">{job.location || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedJobs.length > 10 && (
                      <p className="p-2 text-sm text-muted-foreground text-center border-t border-border">
                        ...and {parsedJobs.length - 10} more
                      </p>
                    )}
                  </div>
                )}

                {importResult && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                      {importResult.success > 0 && (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>{importResult.success} imported</span>
                        </div>
                      )}
                      {importResult.failed > 0 && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-5 w-5" />
                          <span>{importResult.failed} failed</span>
                        </div>
                      )}
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="max-h-32 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <p className="font-medium text-sm mb-1">Errors:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {importResult.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false);
                      resetImport();
                    }}
                  >
                    {importResult ? "Close" : "Cancel"}
                  </Button>
                  {!importResult && (
                    <Button
                      onClick={handleImport}
                      disabled={parsedJobs.length === 0 || importMutation.isPending}
                      data-testid="button-confirm-import"
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import ${parsedJobs.length} Job(s)`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Link href="/app/jobs/new">
            <Button className="gap-2" data-testid="button-create-job">
              <Plus className="h-4 w-4" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-jobs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40" data-testid="select-job-status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobs && filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link key={job.id} href={`/app/jobs/${job.id}`}>
              <Card
                className="overflow-visible hover-elevate cursor-pointer transition-all"
                data-testid={`job-card-${job.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        {job.sponsoredCampaign &&
                          job.sponsoredCampaign.status === "ACTIVE" && (
                            <Badge className="bg-secondary text-secondary-foreground gap-1">
                              <Star className="h-3 w-3" />
                              Sponsored
                            </Badge>
                          )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {job.role}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location.name}
                          </span>
                        )}
                        {(job.payRangeMin || job.payRangeMax) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            {job.payRangeMin && job.payRangeMax
                              ? `$${job.payRangeMin} - $${job.payRangeMax}`
                              : job.payRangeMin
                              ? `$${job.payRangeMin}+`
                              : `Up to $${job.payRangeMax}`}
                            /hr
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {job._count?.applications || 0} applicants
                        </span>
                      </div>
                      {job.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {job.description}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{job.jobType.replace("_", " ")}</Badge>
                        {job.scheduleTags?.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {job.distributionChannels && job.distributionChannels.filter(c => c.status === "ACTIVE").length > 0 && (
                          <Badge variant="outline" className="gap-1 text-xs border-green-500/50 text-green-600 dark:text-green-400">
                            <Globe className="h-3 w-3" />
                            {job.distributionChannels.filter(c => c.status === "ACTIVE").length} board{job.distributionChannels.filter(c => c.status === "ACTIVE").length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          job.status === "PUBLISHED"
                            ? "default"
                            : job.status === "DRAFT"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {job.status}
                      </Badge>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {search || statusFilter !== "all" ? "No jobs found" : "No jobs yet"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first job posting to start receiving applications"}
            </p>
            {!search && statusFilter === "all" && (
              <Link href="/app/jobs/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Job
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
