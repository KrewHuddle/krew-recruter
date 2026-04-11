import { useState, useEffect } from "react";
import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Save,
  Star,
  Upload,
  UserPlus,
  Download,
  CreditCard,
  Check,
} from "lucide-react";

interface CampaignTeamProps {
  defaultTab?: string;
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

export default function CampaignTeam({ defaultTab = "members" }: CampaignTeamProps) {
  const { apiFetch, organizations, orgId } = useCampaignAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const currentOrg = organizations.find(o => o.orgId === orgId);
  const orgName = currentOrg?.orgName || "My Organization";

  // Members
  const { data: members = [] } = useQuery({
    queryKey: ["/api/org/members", orgId],
    queryFn: async () => {
      const res = await apiFetch("/api/org/members");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!orgId,
  });

  // Branding
  const { data: branding } = useQuery({
    queryKey: ["/api/org/branding", orgId],
    queryFn: async () => {
      const res = await apiFetch("/api/org/branding");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
  });

  // Billing
  const { data: subscription } = useQuery({
    queryKey: ["/api/billing/subscription"],
    queryFn: async () => {
      const res = await apiFetch("/api/billing/subscription");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/billing/invoices"],
    queryFn: async () => {
      const res = await apiFetch("/api/billing/invoices");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await apiFetch("/api/org/invite", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setInviteUrl(data.url || data.inviteUrl || "");
        setInviteOpen(true);
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate invite link", variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await apiFetch("/api/stripe/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <Breadcrumb items={[
        { label: "Organization", href: "/campaign" },
        { label: orgName },
        { label: "Settings" },
      ]} />

      <h1 className="text-2xl font-bold mb-6">{orgName}</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* ============ MEMBERS TAB ============ */}
        <TabsContent value="members" className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Members</h2>
            <Button variant="secondary" onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Invite Link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage members in your organization.
          </p>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.length > 0 ? (
                  members.map((m: any) => (
                    <tr key={m.id || m.email} className="border-t">
                      <td className="px-4 py-3">{m.email}</td>
                      <td className="px-4 py-3">
                        {m.role === "owner" ? (
                          <Badge>Admin</Badge>
                        ) : (
                          <Badge variant="secondary">{m.role}</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                      No members found. Use the invite link to add team members.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Invite Dialog */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Link</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link with your team members to join {orgName}.
              </p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast({ title: "Copied!", description: "Invite link copied to clipboard." });
                }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============ BRANDING TAB ============ */}
        <TabsContent value="branding" className="mt-6">
          <BrandingForm apiFetch={apiFetch} branding={branding} orgName={orgName} toast={toast} queryClient={queryClient} orgId={orgId} />
        </TabsContent>

        {/* ============ BILLING TAB ============ */}
        <TabsContent value="billing" className="mt-6">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <Badge>{subscription?.planName || "Free"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {subscription?.features ? (
                <ul className="space-y-2 text-sm mb-4">
                  {subscription.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  You're on the free plan.
                </p>
              )}
              <Button onClick={handleManageBilling}>
                <ExternalLink className="mr-2 h-4 w-4" /> Manage Billing
              </Button>
            </CardContent>
          </Card>

          <h3 className="font-semibold mb-3">Invoice History</h3>
          {invoices.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-3">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">${(inv.amountPaid / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={inv.status === "paid" ? "default" : "secondary"}>{inv.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {inv.pdfUrl && (
                          <Button variant="ghost" size="sm" onClick={() => window.open(inv.pdfUrl, "_blank")}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No invoices yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BrandingForm({ apiFetch, branding, orgName, toast, queryClient, orgId }: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  branding: any;
  orgName: string;
  toast: any;
  queryClient: any;
  orgId: string | null;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#8B33D4");
  const [accentColor, setAccentColor] = useState("#CC2B7F");
  const [glassdoorRating, setGlassdoorRating] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (branding) {
      setName(branding.name || "");
      setWebsite(branding.website || "");
      setLogoUrl(branding.logoUrl || "");
      // DB column is cover_photo_url → drizzle returns coverPhotoUrl, NOT
      // coverUrl. Reading branding.coverUrl here used to always return
      // undefined, so the cover image went blank on every refetch even
      // after a successful upload.
      setCoverUrl(branding.coverPhotoUrl || "");
      setPrimaryColor(branding.primaryColor || "#8B33D4");
      setAccentColor(branding.accentColor || "#CC2B7F");
      setGlassdoorRating(branding.glassdoorRating?.toString() || "");
    }
  }, [branding]);

  // Direct-to-Spaces upload via presigned URL. Bypasses Express entirely
  // so we dodge DigitalOcean App Platform's ~1MB gateway body limit — the
  // file streams from the browser straight to the Spaces bucket, and the
  // only things that touch our server are two small JSON calls (presign +
  // confirm). See server/campaignRoutes.ts → ORG PRESIGNED UPLOADS.
  const handleUpload = async (file: File, type: "logo" | "cover") => {
    // Client-side validation — instant feedback before we even talk to
    // the server. 5MB is both a sensible UX ceiling and the limit the
    // old multer endpoints were configured with.
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image (JPG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Images must be under 5 MB. Try resizing or compressing it.",
        variant: "destructive",
      });
      return;
    }

    setUploading(type);
    try {
      // Step 1: ask the server for a presigned upload URL
      const presignRes = await apiFetch(`/api/org/${type}/presign`, {
        method: "POST",
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!presignRes.ok) {
        const errBody = await presignRes.json().catch(() => ({}));
        toast({
          title: "Upload failed",
          description: errBody?.error || "Could not prepare upload. Please try again.",
          variant: "destructive",
        });
        return;
      }
      const { uploadUrl, key } = await presignRes.json();

      // Step 2: PUT the file directly to Spaces. Must NOT go through
      // apiFetch — that would send our auth headers to DO, which would
      // break the request signature. Plain native fetch, only Content-Type
      // matching what the server signed. The ACL is baked into the
      // presigned URL as a query param, so no x-amz-acl header needed.
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        toast({
          title: "Upload failed",
          description: `Could not upload to storage (${putRes.status}). Check the CORS rule on your Spaces bucket.`,
          variant: "destructive",
        });
        return;
      }

      // Step 3: tell the server the upload is done so it can persist
      // the permanent URL to the orgBranding row.
      const confirmRes = await apiFetch(`/api/org/${type}/confirm`, {
        method: "POST",
        body: JSON.stringify({ key }),
      });
      if (!confirmRes.ok) {
        const errBody = await confirmRes.json().catch(() => ({}));
        toast({
          title: "Upload failed",
          description: errBody?.error || "Upload completed but could not be saved. Please try again.",
          variant: "destructive",
        });
        return;
      }
      const { url } = await confirmRes.json();
      if (type === "logo") setLogoUrl(url);
      else setCoverUrl(url);
      toast({
        title: `${type === "logo" ? "Logo" : "Cover photo"} uploaded!`,
        description: "Click Save Changes to apply.",
      });
    } catch {
      toast({
        title: "Upload failed",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    try {
      const res = await apiFetch("/api/org/branding", {
        method: "PUT",
        body: JSON.stringify({
          name,
          website,
          logoUrl,
          // Send the canonical field name matching the DB column so the
          // server doesn't need its coverUrl→coverPhotoUrl alias.
          coverPhotoUrl: coverUrl,
          primaryColor,
          accentColor,
          glassdoorRating: glassdoorRating ? parseFloat(glassdoorRating) : null,
        }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/org/branding"] });
        toast({ title: "Branding saved", description: "Your changes have been saved." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Branding</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.open("/jobs", "_blank")}>
            Jobs Page <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Configure how your restaurant appears in job ads. Changes affect new ads only.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Label htmlFor="brand-name">Restaurant Name</Label>
          <Input id="brand-name" value={name} onChange={e => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="brand-website">Restaurant Website</Label>
          <Input id="brand-website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <Label>Restaurant Logo</Label>
          <UploadBox
            url={logoUrl}
            uploading={uploading === "logo"}
            onUpload={(file) => handleUpload(file, "logo")}
            label="Upload logo"
          />
        </div>
        <div>
          <Label>Cover Photo</Label>
          <UploadBox
            url={coverUrl}
            uploading={uploading === "cover"}
            onUpload={(file) => handleUpload(file, "cover")}
            label="Upload cover photo"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label>Primary Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
            <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
              className="w-28 font-mono text-sm" maxLength={7} />
          </div>
        </div>
        <div>
          <Label>Accent Color</Label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={accentColor}
              onChange={e => setAccentColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
            <Input value={accentColor} onChange={e => setAccentColor(e.target.value)}
              className="w-28 font-mono text-sm" maxLength={7} />
          </div>
        </div>
        <div>
          <Label>Glassdoor Rating</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input type="number" min={0} max={5} step={0.1} value={glassdoorRating}
              onChange={e => setGlassdoorRating(e.target.value)}
              placeholder="e.g. 4.2" className="w-24" />
            {glassdoorRating && parseFloat(glassdoorRating) > 0 && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                {parseFloat(glassdoorRating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function UploadBox({ url, uploading, onUpload, label }: {
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  label: string;
}) {
  return (
    <label className="block mt-1 cursor-pointer">
      <div className={`border-2 border-dashed rounded-lg h-32 flex items-center justify-center transition-colors hover:border-primary/50 ${
        url ? "border-border" : "border-muted-foreground/25"
      }`}
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
        onDragLeave={e => e.currentTarget.classList.remove("border-primary")}
        onDrop={e => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-primary");
          const file = e.dataTransfer.files[0];
          if (file) onUpload(file);
        }}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : url ? (
          <img src={url} alt="" className="h-full w-full object-contain rounded-lg p-2" />
        ) : (
          <div className="text-center">
            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        )}
      </div>
      <input type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
    </label>
  );
}
