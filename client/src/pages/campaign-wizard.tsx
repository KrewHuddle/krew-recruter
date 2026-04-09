import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useCampaignAuth } from "@/lib/campaign-auth";
import { AdPreviewCard } from "@/components/ad-preview-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Link2, PenLine, ArrowRight, Loader2, Check, X, Plus,
  Rocket, ChevronLeft, ChevronRight, TrendingUp, Target, Shield,
  Globe, CreditCard, CheckCircle, RefreshCw, Image,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CampaignData {
  id?: string;
  title: string;
  companyName: string;
  location: string;
  employmentType: string;
  payMin: number | null;
  payMax: number | null;
  payPeriod: string;
  description: string;
  requirements: string[];
  benefits: string[];
  sourceUrl?: string;
}

interface AdCreative {
  headline: string;
  subheadline: string;
  bulletPoints: string[];
  payDisplay: string;
  benefitsDisplay: string[];
  cta: string;
}

const STEP_LABELS = ["Basic Info", "Review your Ad", "Set your Budget", "Checkout and Post"];

const JOB_SUGGESTIONS = [
  "Line Cook", "Sous Chef", "Server", "Bartender", "Host/Hostess",
  "Busser", "Dishwasher", "Floor Manager", "Catering Staff", "Prep Cook",
  "Executive Chef", "GM", "Barback", "Food Runner", "Event Staff",
];

const BENEFIT_OPTIONS = [
  "401(k)", "Health Insurance", "Employee Discount", "PTO",
  "Flexible Schedule", "Tips", "Free Meals", "Uniforms Provided",
];

export default function CampaignWizard() {
  const [, setLocation] = useLocation();
  const { apiFetch, organizations, orgId } = useCampaignAuth();
  const { toast } = useToast();

  const currentOrg = organizations.find(o => o.orgId === orgId);
  const orgName = currentOrg?.orgName || "Your Restaurant";

  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState<"choose" | "url" | "manual">("choose");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [loadingPercent, setLoadingPercent] = useState(0);

  const [campaign, setCampaign] = useState<CampaignData>({
    title: "", companyName: orgName, location: "", employmentType: "Full-time",
    payMin: null, payMax: null, payPeriod: "hr",
    description: "", requirements: [], benefits: [],
  });

  const [creative, setCreative] = useState<AdCreative>({
    headline: "", subheadline: "", bulletPoints: [],
    payDisplay: "", benefitsDisplay: [], cta: "Apply Now",
  });

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [budgetType, setBudgetType] = useState<"recommended" | "custom">("recommended");
  const [customBudget, setCustomBudget] = useState(32);
  const [isEditing, setIsEditing] = useState(false);
  const [newRequirement, setNewRequirement] = useState("");
  const [launchSuccess, setLaunchSuccess] = useState(false);
  const [adImageSrc, setAdImageSrc] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const dailyBudget = budgetType === "recommended" ? 32 : customBudget;

  const generatePreviewImage = useCallback(async () => {
    setImageLoading(true);
    try {
      const res = await apiRequest("POST", "/api/campaign/preview-image", {
        title: campaign.title,
        company: campaign.companyName || orgName,
        location: campaign.location,
        pay: creative.payDisplay,
        requirements: creative.bulletPoints,
        benefits: creative.benefitsDisplay,
      });
      const data = await res.json();
      if (data.image) {
        setAdImageSrc(data.image);
      }
    } catch {
      // Fall back to HTML preview if image generation fails
    } finally {
      setImageLoading(false);
    }
  }, [campaign, creative, orgName]);

  // ---- URL Import ----
  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setLoadingPercent(0);

    const statusMessages = [
      "Extracting key details...",
      "Building your ad...",
      "Almost done...",
    ];
    let msgIndex = 0;
    setLoadingStatus(statusMessages[0]);

    const interval = setInterval(() => {
      setLoadingPercent(p => Math.min(p + 4, 90));
      msgIndex = Math.min(msgIndex + 1, statusMessages.length - 1);
      setLoadingStatus(statusMessages[msgIndex]);
    }, 1500);

    try {
      const res = await apiFetch("/api/campaigns/import-url", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      clearInterval(interval);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import");
      }

      const data = await res.json();
      setCampaignId(data.id);
      const imported = {
        ...campaign,
        title: data.title || "",
        location: data.location || "",
        employmentType: data.employmentType || "Full-time",
        payMin: data.payMin, payMax: data.payMax,
        payPeriod: data.payPeriod || "hr",
        description: data.description || "",
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        sourceUrl: url,
      };
      setCampaign(imported);

      const campaignRes = await apiFetch(`/api/campaigns/${data.id}`);
      if (campaignRes.ok) {
        const fullData = await campaignRes.json();
        if (fullData.adCreatives?.[0]) {
          const c = fullData.adCreatives[0];
          setCreative({
            headline: c.headline || `HIRING ${(data.title || "").toUpperCase()}`,
            subheadline: c.subheadline || `${data.location || ""} | ${data.employmentType || "Full-time"}`,
            bulletPoints: c.bulletPoints || data.requirements?.slice(0, 3) || [],
            payDisplay: c.payDisplay || "",
            benefitsDisplay: c.benefitsDisplay || data.benefits?.slice(0, 3) || [],
            cta: c.cta || "Apply Now",
          });
        }
      }

      setLoadingPercent(100);
      setStep(2);
      // Generate preview image in background
      setTimeout(() => generatePreviewImage(), 100);
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      clearInterval(interval);
    }
  }, [url, apiFetch, campaign, toast, generatePreviewImage]);

  // ---- Manual creation ----
  const handleManualSubmit = useCallback(async () => {
    if (!campaign.title.trim()) return;
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          title: campaign.title,
          location: campaign.location,
          employmentType: campaign.employmentType,
          payMin: campaign.payMin, payMax: campaign.payMax,
          payPeriod: campaign.payPeriod,
          description: campaign.description,
          requirements: campaign.requirements,
          benefits: campaign.benefits,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create campaign");

      const data = await res.json();
      setCampaignId(data.id);

      const campaignRes = await apiFetch(`/api/campaigns/${data.id}`);
      if (campaignRes.ok) {
        const fullData = await campaignRes.json();
        const c = fullData.adCreatives?.[0];
        setCreative({
          headline: c?.headline || `HIRING ${campaign.title.toUpperCase()}`,
          subheadline: c?.subheadline || `${campaign.location} | ${campaign.employmentType}`,
          bulletPoints: c?.bulletPoints || campaign.requirements.slice(0, 3),
          payDisplay: c?.payDisplay || (campaign.payMin && campaign.payMax
            ? `$${campaign.payMin} - $${campaign.payMax} / ${campaign.payPeriod === "year" ? "Yr" : "Hr"}`
            : "Competitive Pay"),
          benefitsDisplay: c?.benefitsDisplay || campaign.benefits.slice(0, 3),
          cta: c?.cta || "Apply Now",
        });
      }
      setStep(2);
      setTimeout(() => generatePreviewImage(), 100);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [campaign, apiFetch, toast, generatePreviewImage]);

  // ---- Launch ----
  const handleLaunch = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);
    try {
      await apiFetch(`/api/campaigns/${campaignId}/budget`, {
        method: "PATCH",
        body: JSON.stringify({ dailyBudgetCents: dailyBudget * 100 }),
      });
      const res = await apiFetch(`/api/campaigns/${campaignId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Failed to launch campaign");
      setLaunchSuccess(true);
    } catch (error: any) {
      toast({ title: "Launch failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, dailyBudget, apiFetch, toast]);

  // Current main step for progress bar
  const currentMainStep = step === 0 || step === 1 ? 0 : step - 1;

  // ---- Progress Bar ----
  function ProgressBar() {
    return (
      <div className="mt-auto pt-6">
        <div className="flex items-center gap-0.5 mb-2">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= currentMainStep ? "bg-primary" : "bg-muted"
            }`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Step {currentMainStep + 1} of {STEP_LABELS.length}
        </p>
      </div>
    );
  }

  // ---- Stepper for steps 2-4 (full-page) ----
  function Stepper() {
    return (
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-8 ${i <= currentMainStep ? "bg-primary" : "bg-border"}`} />}
            <div className="flex items-center gap-1.5">
              {i < currentMainStep ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  i === currentMainStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
              )}
              <span className={`text-sm ${
                i === currentMainStep
                  ? "text-primary font-medium"
                  : i < currentMainStep ? "text-foreground" : "text-muted-foreground"
              }`}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---- Success ----
  if (launchSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your job is now live!</h2>
          <p className="text-muted-foreground mb-8">
            Candidates will start appearing in your dashboard as they apply.
          </p>
          <Button onClick={() => setLocation("/campaign")} size="lg">
            View Dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ============ STEP 1: Card-based steps ============
  if (step === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-[520px] shadow-md rounded-xl">
          <CardContent className="p-8 flex flex-col min-h-[480px]">

            {/* Choose method */}
            {subStep === "choose" && (
              <>
                <h2 className="text-xl font-bold mb-2">How would you like to set up your job?</h2>
                <p className="text-muted-foreground text-sm mb-6">We'll create a targeted ad campaign for you.</p>

                <div className="space-y-3 flex-1">
                  <button
                    onClick={() => setSubStep("url")}
                    className="flex items-center justify-between w-full border border-border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Link2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">Paste a job post link</span>
                          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          We'll extract the details and build your ad automatically
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>

                  <button
                    onClick={() => setSubStep("manual")}
                    className="flex items-center justify-between w-full border border-border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <PenLine className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm">Start from scratch</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enter job details manually and we'll create the ad
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>

                <ProgressBar />
              </>
            )}

            {/* URL Import */}
            {subStep === "url" && !isLoading && (
              <>
                <h2 className="text-xl font-bold mb-2">Paste your job post link</h2>
                <p className="text-muted-foreground text-sm mb-6">We'll import everything automatically.</p>

                <div className="relative mb-4">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. indeed.com/job/line-cook-123"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Button onClick={handleUrlImport} disabled={!url.trim()} className="w-full mb-6">
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <div className="space-y-2 flex-1">
                  {[
                    "Paste a link from Indeed, ZipRecruiter, or your own site",
                    "We'll extract the details and build your ad automatically",
                    "Make sure it's a direct job link, not a careers page",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>

                <Button variant="ghost" className="mt-4 self-start" onClick={() => setSubStep("choose")}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
                <ProgressBar />
              </>
            )}

            {/* URL Loading */}
            {subStep === "url" && isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-semibold mb-4">Retrieving your Job...</h3>
                <div className="bg-muted rounded-lg px-4 py-2 mb-6 text-sm text-muted-foreground truncate w-full max-w-sm">
                  {url}
                </div>
                <div className="w-full max-w-xs bg-muted rounded-full h-2 mb-3">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${loadingPercent}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{loadingStatus}</p>
              </div>
            )}

            {/* Manual Entry */}
            {subStep === "manual" && (
              <>
                <h2 className="text-xl font-bold mb-1">Tell us about the role</h2>
                <p className="text-muted-foreground text-sm mb-5">Fill in the details for your job ad.</p>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="title" className="text-xs">Job Title *</Label>
                      <Input id="title" value={campaign.title}
                        onChange={e => setCampaign(c => ({ ...c, title: e.target.value }))}
                        placeholder="e.g. Line Cook" className="mt-1" />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {JOB_SUGGESTIONS.slice(0, 6).map(s => (
                          <button key={s} type="button"
                            onClick={() => setCampaign(c => ({ ...c, title: s }))}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border hover:bg-muted transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="company" className="text-xs">Company Name</Label>
                      <Input id="company" value={campaign.companyName}
                        onChange={e => setCampaign(c => ({ ...c, companyName: e.target.value }))}
                        className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="location" className="text-xs">Location *</Label>
                      <Input id="location" value={campaign.location}
                        onChange={e => setCampaign(c => ({ ...c, location: e.target.value }))}
                        placeholder="City, State" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Pay Rate</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-muted-foreground text-sm">$</span>
                        <Input type="number" placeholder="min" className="w-16"
                          value={campaign.payMin ?? ""}
                          onChange={e => setCampaign(c => ({ ...c, payMin: e.target.value ? parseInt(e.target.value) : null }))} />
                        <span className="text-muted-foreground text-xs">-</span>
                        <Input type="number" placeholder="max" className="w-16"
                          value={campaign.payMax ?? ""}
                          onChange={e => setCampaign(c => ({ ...c, payMax: e.target.value ? parseInt(e.target.value) : null }))} />
                        <span className="text-muted-foreground text-xs">/hr</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Job Type</Label>
                    <RadioGroup value={campaign.employmentType}
                      onValueChange={v => setCampaign(c => ({ ...c, employmentType: v }))}
                      className="flex flex-wrap gap-3 mt-1.5">
                      {["Full-time", "Part-time", "Gig Shift"].map(t => (
                        <div key={t} className="flex items-center space-x-1.5">
                          <RadioGroupItem value={t} id={t} />
                          <Label htmlFor={t} className="font-normal text-sm">{t}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-xs">Key Requirements</Label>
                    <Textarea value={campaign.requirements.join("\n")}
                      onChange={e => setCampaign(c => ({ ...c, requirements: e.target.value.split("\n").filter(Boolean) }))}
                      rows={3} placeholder="One per line" className="mt-1 text-sm" />
                  </div>

                  <div>
                    <Label className="text-xs">Benefits</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {BENEFIT_OPTIONS.map(b => {
                        const selected = campaign.benefits.includes(b);
                        return (
                          <Button key={b} type="button" size="sm"
                            variant={selected ? "secondary" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => setCampaign(c => ({
                              ...c,
                              benefits: selected
                                ? c.benefits.filter(x => x !== b)
                                : [...c.benefits, b],
                            }))}>
                            {b}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="desc" className="text-xs">Job Description</Label>
                    <Textarea id="desc" value={campaign.description}
                      onChange={e => setCampaign(c => ({ ...c, description: e.target.value }))}
                      rows={3} className="mt-1 text-sm"
                      placeholder="Describe the role, responsibilities..." />
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button variant="ghost" onClick={() => setSubStep("choose")}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button onClick={handleManualSubmit}
                    disabled={!campaign.title.trim() || !campaign.location.trim() || isLoading}
                    className="flex-1">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
                    )}
                  </Button>
                </div>
                <ProgressBar />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ STEP 2: Review your Ad (full page) ============
  if (step === 2) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Stepper />

        <div className="grid grid-cols-1 lg:grid-cols-[55%_45%] gap-8">
          {/* Left: Ad Preview (Generated Image or Fallback) */}
          <div>
            {imageLoading ? (
              <div className="aspect-[1200/628] rounded-lg bg-muted/50 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Generating ad image...</p>
                </div>
              </div>
            ) : adImageSrc ? (
              <div>
                <img
                  src={adImageSrc}
                  alt="Ad Preview"
                  className="w-full rounded-lg shadow-lg"
                />
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generatePreviewImage()}
                    disabled={imageLoading}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Image className="mr-1 h-3.5 w-3.5" /> Customize
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <AdPreviewCard
                  orgName={campaign.companyName || orgName}
                  primaryColor="hsl(280, 70%, 52%)"
                  headline={creative.headline}
                  subheadline={creative.subheadline}
                  bulletPoints={creative.bulletPoints}
                  payDisplay={creative.payDisplay}
                  benefitsDisplay={creative.benefitsDisplay}
                  cta={creative.cta}
                />
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generatePreviewImage()}
                    disabled={imageLoading}
                  >
                    <Image className="mr-1 h-3.5 w-3.5" /> Generate Image
                  </Button>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center mt-3">
              This is a sample ad. We'll test multiple versions to find the best performers.
            </p>
          </div>

          {/* Right: Actions */}
          <div>
            {!isEditing ? (
              <>
                <h2 className="text-2xl font-bold mb-2">How does this look?</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Review before setting your budget.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    { icon: TrendingUp, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950",
                      title: "Optimized for results",
                      desc: "We A/B test multiple ad versions to maximize your reach" },
                    { icon: Target, color: "text-primary", bg: "bg-primary/10",
                      title: "Quality candidates only",
                      desc: "Smart targeting finds hospitality workers in your area" },
                    { icon: Shield, color: "text-secondary", bg: "bg-secondary/10",
                      title: "Protected reputation",
                      desc: "Negative comments are automatically hidden" },
                  ].map(({ icon: Icon, color, bg, title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <Button onClick={() => setStep(3)} className="w-full" size="lg">
                    Looks good, continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                    Make changes
                  </Button>
                  <button onClick={() => { setStep(0); setSubStep("choose"); }}
                    className="text-sm text-muted-foreground hover:text-foreground w-full text-center">
                    Start over
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Edit your ad</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Headline</Label>
                    <Input value={creative.headline}
                      onChange={e => setCreative(c => ({ ...c, headline: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Subheadline</Label>
                    <Input value={creative.subheadline}
                      onChange={e => setCreative(c => ({ ...c, subheadline: e.target.value }))} />
                  </div>
                  {creative.bulletPoints.map((bp, i) => (
                    <div key={i}>
                      <Label>Requirement {i + 1}</Label>
                      <Input value={bp}
                        onChange={e => {
                          const updated = [...creative.bulletPoints];
                          updated[i] = e.target.value;
                          setCreative(c => ({ ...c, bulletPoints: updated }));
                        }} />
                    </div>
                  ))}
                  <div>
                    <Label>Pay Display</Label>
                    <Input value={creative.payDisplay}
                      onChange={e => setCreative(c => ({ ...c, payDisplay: e.target.value }))} />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      if (campaignId) {
                        await apiFetch(`/api/campaigns/${campaignId}/creative`, {
                          method: "PATCH",
                          body: JSON.stringify(creative),
                        });
                      }
                      setIsEditing(false);
                    }} className="flex-1">Save Changes</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 3: Set your Budget (full page) ============
  if (step === 3) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Stepper />

        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Set your budget</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Choose how much to spend daily promoting this job.
            </p>

            <div className="space-y-4 mb-6">
              <Card className={`cursor-pointer transition-all ${
                budgetType === "recommended" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/30"
              }`} onClick={() => setBudgetType("recommended")}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">Recommended Budget</h3>
                  <p className="text-3xl font-bold text-primary">$32 <span className="text-base font-normal text-muted-foreground">/ day</span></p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Reaches enough candidates for a steady application flow. Most restaurants start here.
                  </p>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${
                budgetType === "custom" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-muted-foreground/30"
              }`} onClick={() => setBudgetType("custom")}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">Custom Budget</h3>
                  {budgetType === "custom" ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg">$</span>
                      <Input type="number" min={10} max={200} value={customBudget}
                        onChange={e => setCustomBudget(Math.min(200, Math.max(10, parseInt(e.target.value) || 10)))}
                        className="w-24 text-lg" onClick={e => e.stopPropagation()} />
                      <span className="text-muted-foreground">/ day</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Set your own daily budget (min $10)</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button onClick={() => setStep(4)} className="w-full" size="lg">
              Proceed to checkout <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              You can pause or cancel at any time
            </p>
            <Button variant="outline" className="w-full mt-3" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to review
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Common questions</h3>
            <Accordion type="single" collapsible defaultValue="spend">
              {[
                { value: "spend", q: "HOW MUCH SHOULD I SPEND?",
                  a: "$32/day is our recommended starting point for most restaurant roles. This ensures your job ad reaches enough hospitality workers to generate a steady flow of applications. You can pause or adjust at any time." },
                { value: "paying", q: "WHAT AM I PAYING FOR?",
                  a: "You're paying for Facebook and Instagram ads that reach hospitality workers near your restaurant. Krew Recruiter manages the campaigns for you." },
                { value: "results", q: "HOW LONG UNTIL I SEE RESULTS?",
                  a: "Most restaurants see their first candidates within 24-48 hours of launching a campaign." },
                { value: "charged", q: "WHEN WILL I BE CHARGED?",
                  a: "Your card is charged daily based on your actual ad spend, not your max budget." },
                { value: "over", q: "WILL I EVER BE CHARGED OVER MY DAILY BUDGET?",
                  a: "No. Your daily budget is a hard cap. You'll never be charged more than your set daily amount." },
              ].map(({ value, q, a }) => (
                <AccordionItem key={value} value={value}>
                  <AccordionTrigger className="text-xs font-semibold uppercase tracking-wide">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    );
  }

  // ============ STEP 4: Checkout & Post (full page) ============
  if (step === 4) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Stepper />

        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-6">Checkout and Post</h2>

          <Card className="mb-6">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold mb-3">Campaign Summary</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">{campaign.title}</span>
                <span className="text-muted-foreground">Company:</span>
                <span>{campaign.companyName || orgName}</span>
                <span className="text-muted-foreground">Location:</span>
                <span>{campaign.location}</span>
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium text-primary">${dailyBudget}/day</span>
                <span className="text-muted-foreground">Duration:</span>
                <span>Ongoing (can pause anytime)</span>
                <span className="text-muted-foreground">Platform:</span>
                <span>Facebook & Instagram</span>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleLaunch} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Launching...</>
            ) : (
              <><Rocket className="mr-2 h-4 w-4" /> Launch Campaign</>
            )}
          </Button>

          <Button variant="outline" className="w-full mt-3" onClick={() => setStep(3)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to budget
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
