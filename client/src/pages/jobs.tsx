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
  Building2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { JobAdBooster } from "@/components/JobAdBooster";
import { Zap } from "lucide-react";
import type { Job, Location as LocationType, SponsoredCampaign, JobDistributionChannel } from "@shared/schema";

type ExternalJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
};

type ExternalJobsResponse = {
  jobs: ExternalJob[];
  totalJobs: number;
  page: number;
  totalPages: number;
  source: string;
};

type JobWithRelations = Job & {
  location?: LocationType;
  _count?: { applications: number };
  sponsoredCampaign?: SponsoredCampaign | null;
  distributionChannels?: JobDistributionChannel[];
};

type ImportResult = {
  success: number;
  failed: number;
  errors: string[];
};

type ParsedCSV = {
  headers: string[];
  rows: Record<string, string>[];
  error?: string;
};

const REQUIRED_HEADERS = ["title", "role"];
const VALID_HEADERS = ["title", "role", "description", "jobType", "location", "payRangeMin", "payRangeMax", "scheduleTags"];

function parseCSV(text: string): ParsedCSV {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { headers: [], rows: [], error: "CSV must have a header row and at least one data row" };
  }
  
  // Parse headers
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  
  // Validate required headers
  const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return { 
      headers: [], 
      rows: [], 
      error: `Missing required headers: ${missingHeaders.join(", ")}. Required: ${REQUIRED_HEADERS.join(", ")}` 
    };
  }
  
  // Warn about unknown headers (but don't block)
  const unknownHeaders = headers.filter(h => !VALID_HEADERS.includes(h));
  const warnings: string[] = [];
  if (unknownHeaders.length > 0) {
    warnings.push(`Ignored unknown columns: ${unknownHeaders.join(", ")}`);
  }
  
  const rows: Record<string, string>[] = [];
  let unbalancedQuoteRows: number[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Check for unbalanced quotes (multiline fields not supported)
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      unbalancedQuoteRows.push(i + 1);
      continue; // Skip this row as it's malformed
    }
    
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        // Handle escaped quotes (double quotes inside quoted field)
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    // Check for field count mismatch
    if (values.length !== headers.length) {
      unbalancedQuoteRows.push(i + 1);
      continue;
    }
    
    // Only use valid headers
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      if (VALID_HEADERS.includes(header)) {
        row[header] = values[idx] || "";
      }
    });
    rows.push(row);
  }
  
  if (unbalancedQuoteRows.length > 0) {
    const rowsList = unbalancedQuoteRows.slice(0, 5).join(", ");
    warnings.push(`Skipped ${unbalancedQuoteRows.length} malformed row(s): ${rowsList}${unbalancedQuoteRows.length > 5 ? "..." : ""}`);
  }
  
  if (rows.length === 0) {
    return { 
      headers: [], 
      rows: [], 
      error: "No valid rows found. Check that your CSV has proper formatting (no multiline fields, balanced quotes)." 
    };
  }
  
  return { 
    headers: headers.filter(h => VALID_HEADERS.includes(h)), 
    rows,
    error: warnings.length > 0 ? warnings.join(". ") : undefined
  };
}

export default function Jobs() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Boost sheet state
  const [boostJob, setBoostJob] = useState<any>(null);

  // External job board state
  const [externalJobsDialogOpen, setExternalJobsDialogOpen] = useState(false);
  const [externalSearch, setExternalSearch] = useState("");
  const [externalSearchInput, setExternalSearchInput] = useState("");
  const [externalPage, setExternalPage] = useState(1);

  const { data: jobs, isLoading } = useQuery<JobWithRelations[]>({
    queryKey: ["/api/jobs"],
    enabled: !!currentTenant,
    refetchOnMount: "always",
  });

  // External jobs query - uses URL with params as queryKey for caching
  const externalJobsQueryKey = `/api/external-jobs?search=${externalSearch}&page=${externalPage}`;
  const { data: externalJobsData, isLoading: isLoadingExternalJobs } = useQuery<ExternalJobsResponse>({
    queryKey: [externalJobsQueryKey],
    enabled: externalJobsDialogOpen,
  });

  const importMutation = useMutation({
    mutationFn: async (data: { jobs: Record<string, string>[]; headers: string[] }) => {
      const res = await apiRequest("POST", "/api/jobs/import", data);
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
      const result = parseCSV(text);
      
      if (result.rows.length === 0 && result.error) {
        toast({ title: result.error, variant: "destructive" });
        setParsedData(null);
        setParseWarning(null);
      } else {
        setParsedData(result);
        setParseWarning(result.error || null);
      }
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedData || parsedData.rows.length === 0) return;
    importMutation.mutate({ jobs: parsedData.rows, headers: parsedData.headers });
  };

  const resetImport = () => {
    setParsedData(null);
    setParseWarning(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = "title,role,description,jobType,location,payRangeMin,payRangeMax,scheduleTags\nServer,Server,\"Looking for an experienced server to join our team\",FULL_TIME,\"Downtown Location\",15,20,\"Morning,Evening\"";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExternalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setExternalSearch(externalSearchInput);
    setExternalPage(1);
  };

  const handleImportExternalJob = (job: ExternalJob) => {
    // Strip HTML from description
    const cleanDescription = job.description
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .slice(0, 5000);

    // Store imported job data in sessionStorage to pre-fill form
    const importedData = {
      title: job.title,
      description: cleanDescription,
      role: job.tags?.[0] || "Other",
      jobType: job.job_types?.includes("Full Time") ? "FULL_TIME" : "PART_TIME",
      sourceUrl: job.url,
      sourceCompany: job.company_name,
    };
    sessionStorage.setItem("importedJobData", JSON.stringify(importedData));
    
    setExternalJobsDialogOpen(false);
    toast({ title: "Job data imported! Complete the form to create your posting." });
    navigate("/app/jobs/new");
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
                        {parsedData && parsedData.rows.length > 0 
                          ? `${parsedData.rows.length} job(s) ready to import` 
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

                {parseWarning && !importResult && (
                  <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-sm text-muted-foreground" data-testid="import-parse-warning">
                    {parseWarning}
                  </div>
                )}

                {parsedData && parsedData.rows.length > 0 && !importResult && (
                  <div className="max-h-48 overflow-auto rounded-lg border border-border" data-testid="import-preview-table">
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
                        {parsedData.rows.slice(0, 10).map((job, i) => (
                          <tr key={i} className="border-t border-border" data-testid={`import-preview-row-${i}`}>
                            <td className="p-2" data-testid={`import-preview-title-${i}`}>{job.title || "-"}</td>
                            <td className="p-2" data-testid={`import-preview-role-${i}`}>{job.role || "-"}</td>
                            <td className="p-2" data-testid={`import-preview-type-${i}`}>{job.jobType || "FULL_TIME"}</td>
                            <td className="p-2" data-testid={`import-preview-location-${i}`}>{job.location || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.rows.length > 10 && (
                      <p className="p-2 text-sm text-muted-foreground text-center border-t border-border" data-testid="import-preview-more">
                        ...and {parsedData.rows.length - 10} more
                      </p>
                    )}
                  </div>
                )}

                {importResult && (
                  <div className="space-y-3" data-testid="import-result">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted" data-testid="import-result-summary">
                      {importResult.success > 0 && (
                        <div className="flex items-center gap-2 text-green-600" data-testid="import-success-count">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>{importResult.success} imported</span>
                        </div>
                      )}
                      {importResult.failed > 0 && (
                        <div className="flex items-center gap-2 text-destructive" data-testid="import-failed-count">
                          <AlertCircle className="h-5 w-5" />
                          <span>{importResult.failed} failed</span>
                        </div>
                      )}
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="max-h-32 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3" data-testid="import-errors">
                        <p className="font-medium text-sm mb-1">Errors:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {importResult.errors.map((err, i) => (
                            <li key={i} data-testid={`import-error-${i}`}>{err}</li>
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
                      disabled={!parsedData || parsedData.rows.length === 0 || importMutation.isPending}
                      data-testid="button-confirm-import"
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import ${parsedData?.rows.length || 0} Job(s)`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* External Job Board Browser */}
          <Dialog open={externalJobsDialogOpen} onOpenChange={(open) => {
            setExternalJobsDialogOpen(open);
            if (!open) {
              setExternalSearch("");
              setExternalSearchInput("");
              setExternalPage(1);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-browse-job-boards">
                <Globe className="h-4 w-4" />
                Browse Job Boards
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Browse External Job Boards</DialogTitle>
                <DialogDescription>
                  Search and import job postings from external sources to use as templates
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleExternalSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs (e.g., developer, marketing, sales...)"
                    value={externalSearchInput}
                    onChange={(e) => setExternalSearchInput(e.target.value)}
                    className="pl-9"
                    data-testid="input-external-search"
                  />
                </div>
                <Button type="submit" data-testid="button-external-search">
                  Search
                </Button>
              </form>

              <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                {isLoadingExternalJobs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : externalJobsData?.jobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {externalSearch ? "No jobs found. Try a different search term." : "Search for jobs to get started"}
                    </p>
                  </div>
                ) : (
                  externalJobsData?.jobs.map((job, index) => (
                    <Card key={job.slug} className="hover-elevate" data-testid={`card-external-job-${index}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate" data-testid={`text-external-job-title-${index}`}>{job.title}</h3>
                              {job.remote && (
                                <Badge variant="secondary" className="shrink-0" data-testid={`badge-remote-${index}`}>Remote</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate" data-testid={`text-external-job-company-${index}`}>{job.company_name}</span>
                              {job.location && (
                                <>
                                  <MapPin className="h-3 w-3 ml-2" />
                                  <span className="truncate" data-testid={`text-external-job-location-${index}`}>{job.location}</span>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-external-job-description-${index}`}>
                              {job.description.replace(/<[^>]*>/g, "").slice(0, 200)}...
                            </p>
                            {job.tags && job.tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {job.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleImportExternalJob(job)}
                              className="gap-1"
                              data-testid={`button-import-external-${index}`}
                            >
                              <ArrowRight className="h-3 w-3" />
                              Use as Template
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              data-testid={`link-view-original-${index}`}
                            >
                              <a href={job.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                                <ExternalLink className="h-3 w-3" />
                                View Original
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {externalJobsData && externalJobsData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t" data-testid="external-jobs-pagination">
                  <p className="text-sm text-muted-foreground" data-testid="text-external-jobs-count">
                    Showing {externalJobsData.jobs.length} of {externalJobsData.totalJobs} jobs
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExternalPage((p) => Math.max(1, p - 1))}
                      disabled={externalPage === 1}
                      data-testid="button-external-prev"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm" data-testid="text-external-page-info">
                      Page {externalPage} of {externalJobsData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExternalPage((p) => Math.min(externalJobsData.totalPages, p + 1))}
                      disabled={externalPage === externalJobsData.totalPages}
                      data-testid="button-external-next"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
                      {job.status === "PUBLISHED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBoostJob(job);
                          }}
                        >
                          <Zap className="h-3 w-3" />
                          Boost
                        </Button>
                      )}
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
      {/* Boost Sheet */}
      <Sheet open={!!boostJob} onOpenChange={(open) => { if (!open) setBoostJob(null); }}>
        <SheetContent side="right" className="sm:max-w-md w-full">
          <SheetHeader>
            <SheetTitle>Boost Job</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {boostJob && (
              <JobAdBooster job={boostJob} tenantName={currentTenant?.name} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
