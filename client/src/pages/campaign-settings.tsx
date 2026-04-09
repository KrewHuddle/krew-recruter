import { useState, useEffect } from "react";
import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Save } from "lucide-react";

export default function CampaignSettings() {
  const { apiFetch, orgId } = useCampaignAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#111111");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState({
    emailNewApplicant: true,
    emailDailyDigest: true,
    emailWeeklyReport: false,
    emailCampaignUpdates: true,
  });

  const { data: branding, isLoading } = useQuery({
    queryKey: ["/api/org/branding", orgId],
    queryFn: async () => {
      const res = await apiFetch("/api/org/branding");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
  });

  useEffect(() => {
    if (branding) {
      setOrgName(branding.name || "");
      setPrimaryColor(branding.primaryColor || "#111111");
      setLogoUrl(branding.logoUrl || "");
      if (branding.notifications) {
        setNotifications((prev) => ({ ...prev, ...branding.notifications }));
      }
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/org/settings", {
        method: "PUT",
        body: JSON.stringify({
          name: orgName,
          primaryColor,
          logoUrl,
          notifications,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/org/branding"] });
      toast({ title: "Settings saved", description: "Your organization settings have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "destructive" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch("/api/org/logo", {
        method: "POST",
        headers: {}, // let browser set content-type for FormData
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.url);
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not upload logo. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Organization Settings</h1>

      {/* Organization Info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Organization Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your restaurant or company name"
            />
          </div>

          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-4 mt-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-16 h-16 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <div>
                <label>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {uploading ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-3.5 w-3.5" />
                      )}
                      Upload Logo
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 2MB. Square images work best.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="primary-color">Brand Color</Label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="color"
                id="primary-color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 p-0"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 font-mono text-sm"
                maxLength={7}
              />
              <div
                className="h-10 flex-1 rounded-md border"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Used in your ad creatives, sidebar accent, and branding.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New applicant alerts</p>
              <p className="text-xs text-muted-foreground">
                Get emailed when a candidate applies to your campaign
              </p>
            </div>
            <Switch
              checked={notifications.emailNewApplicant}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, emailNewApplicant: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Daily digest</p>
              <p className="text-xs text-muted-foreground">
                Summary of yesterday's campaign performance
              </p>
            </div>
            <Switch
              checked={notifications.emailDailyDigest}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, emailDailyDigest: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Weekly report</p>
              <p className="text-xs text-muted-foreground">
                Weekly performance summary with trends and insights
              </p>
            </div>
            <Switch
              checked={notifications.emailWeeklyReport}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, emailWeeklyReport: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Campaign updates</p>
              <p className="text-xs text-muted-foreground">
                Alerts when campaigns are paused, exhausted, or need attention
              </p>
            </div>
            <Switch
              checked={notifications.emailCampaignUpdates}
              onCheckedChange={(v) =>
                setNotifications((n) => ({ ...n, emailCampaignUpdates: v }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full"
        size="lg"
      >
        {saveMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
