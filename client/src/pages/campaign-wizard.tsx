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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Link2, PenLine, ArrowRight, Loader2, Check, X, Plus,
  Rocket, ChevronLeft, TrendingUp, Target, Shield,
  Upload, Facebook, Instagram, MapPin, Clock,
} from "lucide-react";

interface CampaignData {
  id?: string;
  title: string;
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
  adBodyText: string;
  imageChoice: string;
  customImageUrl: string;
  platforms: { facebook: boolean; instagram: boolean; instagramStories: boolean };
}

const STEP_LABELS = ["Job Details", "Ad Creative", "Audience & Budget", "Review & Launch"];

const JOB_SUGGESTIONS = [
  "Line Cook", "Sous Chef", "Server", "Bartender", "Host/Hostess",
  "Busser", "Dishwasher", "Floor Manager", "Catering Staff", "Prep Cook",
  "Executive Chef", "GM", "Barback", "Food Runner", "Event Staff",
];

const STOCK_IMAGES = [
  { id: "bartender", label: "Bartender", emoji: "🍸" },
  { id: "server", label: "Server", emoji: "🍽️" },
  { id: "chef", label: "Chef", emoji: "👨‍🍳" },
  { id: "line-cook", label: "Line Cook", emoji: "🔥" },
  { id: "host", label: "Host", emoji: "🙋" },
  { id: "dishwasher", label: "Dishwasher", emoji: "🫧" },
];

const BUDGET_OPTIONS = [
  { amount: 5, reach: "~500-1,200 people/day" },
  { amount: 10, reach: "~1,000-2,500 people/day" },
  { amount: 25, reach: "~2,500-6,000 people/day" },
  { amount: 50, reach: "~5,000-12,000 people/day" },
];

const DURATION_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 0, label: "Ongoing" },
];

export default function CampaignWizard() {
  const [, setLocation] = useLocation();
  const { apiFetch } = useCampaignAuth();

  const [step, setStep] = useState(0);
  const [subStep, setSubStep] = useState<"choose" | "url" | "manual">("choose");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [loadingPercent, setLoadingPercent] = useState(0);

  const [campaign, setCampaign] = useState<CampaignData>({
    title: "", location: "", employmentType: "Full-time",
    payMin: null, payMax: null, payPeriod: "hr",
    description: "", requirements: [], benefits: [],
  });

  const [creative, setCreative] = useState<AdCreative>({
    headline: "", subheadline: "", bulletPoints: [],
    payDisplay: "", benefitsDisplay: [], cta: "Apply Now",
    adBodyText: "",
    imageChoice: "server",
    customImageUrl: "",
    platforms: { facebook: true, instagram: true, instagramStories: false },
  });

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [radius, setRadius] = useState(10);
  const [dailyBudget, setDailyBudget] = useState(25);
  const [customBudgetMode, setCustomBudgetMode] = useState(false);
  const [customBudgetValue, setCustomBudgetValue] = useState(25);
  const [duration, setDuration] = useState(14);
  const [isEditing, setIsEditing] = useState(false);
  const [newRequirement, setNewRequirement] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [launchSuccess, setLaunchSuccess] = useState(false);

  const orgName = "Your Restaurant";
  const primaryColor = "#111111";

  const effectiveBudget = customBudgetMode ? customBudgetValue : dailyBudget;
  const totalEstSpend = duration > 0 ? effectiveBudget * duration : effectiveBudget * 30;

  const generateAdBody = (c: CampaignData) => {
    const pay = c.payMin && c.payMax
      ? `$${c.payMin}-$${c.payMax}/${c.payPeriod === "year" ? "yr" : "hr"}`
      : c.payMin ? `$${c.payMin}/${c.payPeriod === "year" ? "yr" : "hr"}` : "";
    return `🍽️ ${orgName} is hiring a ${c.title}!\n${pay ? `✅ ${pay}  ` : ""}📍 ${c.location}\n🎥 Apply with a 60-sec video\nTap to apply 👇`;
  };

  // ---- Step 1: URL Import ----
  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setLoadingPercent(0);

    const statusMessages = [
      "Extracting key details...",
      "Analyzing requirements...",
      "Generating your ad...",
    ];
    let msgIndex = 0;
    setLoadingStatus(statusMessages[0]);

    const interval = setInterval(() => {
      setLoadingPercent(p => Math.min(p + 3, 90));
      msgIndex = Math.min(msgIndex + 1, statusMessages.length - 1);
      setLoadingStatus(statusMessages[msgIndex]);
    }, 2000);

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
      const importedCampaign = {
        title: data.title || "",
        location: data.location || "",
        employmentType: data.employmentType || "Full-time",
        payMin: data.payMin,
        payMax: data.payMax,
        payPeriod: data.payPeriod || "hr",
        description: data.description || "",
        requirements: data.requirements || [],
        benefits: data.benefits || [],
        sourceUrl: url,
      };
      setCampaign(importedCampaign);

      // Fetch the ad creative
      const campaignRes = await apiFetch(`/api/campaigns/${data.id}`);
      if (campaignRes.ok) {
        const fullData = await campaignRes.json();
        if (fullData.adCreatives?.[0]) {
          const c = fullData.adCreatives[0];
          setCreative(prev => ({
            ...prev,
            headline: c.headline || `HIRING ${(data.title || "").toUpperCase()}`,
            subheadline: c.subheadline || `${data.location || ""} | ${data.employmentType || "Full-time"}`,
            bulletPoints: c.bulletPoints || data.requirements?.slice(0, 3) || [],
            payDisplay: c.payDisplay || "",
            benefitsDisplay: c.benefitsDisplay || data.benefits?.slice(0, 3) || [],
            cta: c.cta || "Apply Now",
            adBodyText: generateAdBody(importedCampaign),
          }));
        }
      }

      setLoadingPercent(100);
      setStep(2);
    } catch (error: any) {
      alert(error.message || "Failed to import job from URL");
    } finally {
      setIsLoading(false);
      clearInterval(interval);
    }
  }, [url, apiFetch]);

  // ---- Step 1: Manual creation ----
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
          payMin: campaign.payMin,
          payMax: campaign.payMax,
          payPeriod: campaign.payPeriod,
          description: campaign.description,
          requirements: campaign.requirements,
          benefits: campaign.benefits,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create campaign");
      }

      const data = await res.json();
      setCampaignId(data.id);

      // Fetch the generated creative
      const campaignRes = await apiFetch(`/api/campaigns/${data.id}`);
      if (campaignRes.ok) {
        const fullData = await campaignRes.json();
        if (fullData.adCreatives?.[0]) {
          const c = fullData.adCreatives[0];
          setCreative(prev => ({
            ...prev,
            headline: c.headline || `HIRING ${campaign.title.toUpperCase()}`,
            subheadline: c.subheadline || `${campaign.location} | ${campaign.employmentType}`,
            bulletPoints: c.bulletPoints || campaign.requirements.slice(0, 3),
            payDisplay: c.payDisplay || "",
            benefitsDisplay: c.benefitsDisplay || campaign.benefits.slice(0, 3),
            cta: c.cta || "Apply Now",
            adBodyText: generateAdBody(campaign),
          }));
        } else {
          setCreative(prev => ({
            ...prev,
            headline: `HIRING ${campaign.title.toUpperCase()}`,
            subheadline: `${campaign.location} | ${campaign.employmentType}`,
            bulletPoints: campaign.requirements.slice(0, 3),
            payDisplay: campaign.payMin && campaign.payMax
              ? `$${campaign.payMin} - $${campaign.payMax} / ${campaign.payPeriod === "year" ? "Yr" : "Hr"}`
              : "Competitive Pay",
            benefitsDisplay: campaign.benefits.slice(0, 3),
            cta: "Apply Now",
            adBodyText: generateAdBody(campaign),
          }));
        }
      }

      setStep(2);
    } catch (error: any) {
      alert(error.message || "Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  }, [campaign, apiFetch]);

  // ---- Step 4: Launch ----
  const handleLaunch = useCallback(async (asDraft = false) => {
    if (!campaignId) return;
    setIsLoading(true);

    try {
      // Update budget
      await apiFetch(`/api/campaigns/${campaignId}/budget`, {
        method: "PATCH",
        body: JSON.stringify({ dailyBudgetCents: effectiveBudget * 100 }),
      });

      // Update creative if edited
      await apiFetch(`/api/campaigns/${campaignId}/creative`, {
        method: "PATCH",
        body: JSON.stringify({
          headline: creative.headline,
          subheadline: creative.subheadline,
          bulletPoints: creative.bulletPoints,
          payDisplay: creative.payDisplay,
          benefitsDisplay: creative.benefitsDisplay,
          platforms: creative.platforms,
          imageChoice: creative.imageChoice,
          radius,
          duration,
        }),
      });

      if (!asDraft) {
        const res = await apiFetch(`/api/campaigns/${campaignId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        });
        if (!res.ok) throw new Error("Failed to launch campaign");
      }

      setLaunchSuccess(true);
    } catch (error: any) {
      alert(error.message || "Failed to launch campaign");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, effectiveBudget, creative, radius, duration, apiFetch]);

  // ---- Progress Bar ----
  const currentMainStep = step === 0 || step === 1 ? 0 : step - 1;

  const ProgressBar = () => (
    <div className="flex items-center gap-1 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex-1">
          <div className={`h-1.5 rounded-full transition-colors ${i <= currentMainStep ? "bg-primary" : "bg-muted"}`} />
          <p className={`text-xs mt-1.5 ${i <= currentMainStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {label}
          </p>
        </div>
      ))}
    </div>
  );

  // ---- Launch Success ----
  if (launchSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <Check className="h-8 w-8 text-green-600" />
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProgressBar />

      {/* ==================== STEP 1: Choose Method ==================== */}
      {step === 0 && subStep === "choose" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">How would you like to set up your job?</h2>
          <p className="text-muted-foreground mb-8">Step 1 of 4</p>

          <div className="space-y-4">
            <Card
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => setSubStep("url")}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">Paste a job post link</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll import the details and set up targeting automatically
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => setSubStep("manual")}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-lg bg-muted">
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Start from scratch</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter job details manually and we'll create the ad campaign
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== STEP 1B: URL Import ==================== */}
      {step === 0 && subStep === "url" && (
        <div className="max-w-xl mx-auto">
          {isLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <h3 className="text-lg font-semibold mb-4">Retrieving your Job...</h3>
                <div className="bg-muted rounded-lg px-4 py-2 mb-6 text-sm text-muted-foreground truncate">
                  {url}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-3">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${loadingPercent}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{loadingStatus}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">Paste your job post link</h2>
              <p className="text-muted-foreground mb-6">Step 1 of 4</p>

              <Input
                placeholder="e.g. ziprecruiter.com/jobs/line-cook-abc123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mb-4"
              />

              <Button onClick={handleUrlImport} disabled={!url.trim()} className="w-full mb-6">
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <ul className="text-sm text-muted-foreground space-y-2">
                <li>Paste a link to an existing job posting</li>
                <li>We'll use it to generate an ad and target candidates</li>
                <li>Make sure it's a direct job link, not a careers page</li>
              </ul>

              <Button variant="ghost" className="mt-4" onClick={() => setSubStep("choose")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </>
          )}
        </div>
      )}

      {/* ==================== STEP 1C: Manual Entry ==================== */}
      {step === 0 && subStep === "manual" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Tell us about the role</h2>
          <p className="text-muted-foreground mb-6">Step 1 of 4</p>

          <div className="space-y-5">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={campaign.title}
                onChange={e => setCampaign(c => ({ ...c, title: e.target.value }))}
                placeholder="e.g. Line Cook"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {JOB_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCampaign(c => ({ ...c, title: s }))}
                    className="text-xs px-2 py-1 rounded-full border hover:bg-muted transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={campaign.location}
                onChange={e => setCampaign(c => ({ ...c, location: e.target.value }))}
                placeholder="City, State"
              />
            </div>

            <div>
              <Label>Job Type</Label>
              <RadioGroup
                value={campaign.employmentType}
                onValueChange={v => setCampaign(c => ({ ...c, employmentType: v }))}
                className="flex flex-wrap gap-4 mt-2"
              >
                {["Full-time", "Part-time", "Gig Shift", "Seasonal"].map(t => (
                  <div key={t} className="flex items-center space-x-2">
                    <RadioGroupItem value={t} id={t} />
                    <Label htmlFor={t} className="font-normal">{t}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>Pay Rate</Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="min"
                  className="w-24"
                  value={campaign.payMin ?? ""}
                  onChange={e => setCampaign(c => ({ ...c, payMin: e.target.value ? parseInt(e.target.value) : null }))}
                />
                <span className="text-muted-foreground">-</span>
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="max"
                  className="w-24"
                  value={campaign.payMax ?? ""}
                  onChange={e => setCampaign(c => ({ ...c, payMax: e.target.value ? parseInt(e.target.value) : null }))}
                />
                <span className="text-muted-foreground">per</span>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  value={campaign.payPeriod}
                  onChange={e => setCampaign(c => ({ ...c, payPeriod: e.target.value }))}
                >
                  <option value="hr">hour</option>
                  <option value="year">year</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Key Requirements (up to 5)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="e.g. ServSafe Certified"
                  value={newRequirement}
                  onChange={e => setNewRequirement(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newRequirement.trim() && campaign.requirements.length < 5) {
                      setCampaign(c => ({ ...c, requirements: [...c.requirements, newRequirement.trim()] }));
                      setNewRequirement("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!newRequirement.trim() || campaign.requirements.length >= 5}
                  onClick={() => {
                    if (newRequirement.trim()) {
                      setCampaign(c => ({ ...c, requirements: [...c.requirements, newRequirement.trim()] }));
                      setNewRequirement("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {campaign.requirements.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                    {r}
                    <button onClick={() => setCampaign(c => ({ ...c, requirements: c.requirements.filter((_, j) => j !== i) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label>Benefits (up to 5)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="e.g. Employee meals"
                  value={newBenefit}
                  onChange={e => setNewBenefit(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && newBenefit.trim() && campaign.benefits.length < 5) {
                      setCampaign(c => ({ ...c, benefits: [...c.benefits, newBenefit.trim()] }));
                      setNewBenefit("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!newBenefit.trim() || campaign.benefits.length >= 5}
                  onClick={() => {
                    if (newBenefit.trim()) {
                      setCampaign(c => ({ ...c, benefits: [...c.benefits, newBenefit.trim()] }));
                      setNewBenefit("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {campaign.benefits.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                    {b}
                    <button onClick={() => setCampaign(c => ({ ...c, benefits: c.benefits.filter((_, j) => j !== i) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Job Description (optional)</Label>
              <Textarea
                id="description"
                value={campaign.description}
                onChange={e => setCampaign(c => ({ ...c, description: e.target.value }))}
                rows={4}
                placeholder="Describe the role, responsibilities, and what makes your restaurant a great place to work..."
              />
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setSubStep("choose")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleManualSubmit}
                disabled={!campaign.title.trim() || !campaign.location.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating your ad...</>
                ) : (
                  <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: Ad Creative ==================== */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Live Preview */}
          <div>
            <div className="sticky top-8">
              {/* Facebook Feed Mockup */}
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="bg-[#1877F2] px-4 py-2 flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-white" />
                  <span className="text-white text-xs font-medium">Facebook Feed Preview</span>
                </div>
                <div className="p-3">
                  <AdPreviewCard
                    orgName={orgName}
                    primaryColor={primaryColor}
                    headline={creative.headline}
                    subheadline={creative.subheadline}
                    bulletPoints={creative.bulletPoints}
                    payDisplay={creative.payDisplay}
                    benefitsDisplay={creative.benefitsDisplay}
                    cta={creative.cta}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                We'll test multiple versions to find the best performers.
              </p>
            </div>
          </div>

          {/* Right: Controls */}
          <div>
            {!isEditing ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Your Ad Creative</h2>
                <p className="text-muted-foreground mb-6">
                  Review your ad, choose an image, and select platforms.
                </p>

                {/* Ad Body Text */}
                <div className="mb-6">
                  <Label>Ad Body Text</Label>
                  <Textarea
                    value={creative.adBodyText}
                    onChange={e => setCreative(c => ({ ...c, adBodyText: e.target.value }))}
                    rows={4}
                    className="mt-2 text-sm"
                  />
                </div>

                {/* Image Selection */}
                <div className="mb-6">
                  <Label>Ad Image</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose a stock image or upload your own
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {STOCK_IMAGES.map(img => (
                      <button
                        key={img.id}
                        onClick={() => setCreative(c => ({ ...c, imageChoice: img.id, customImageUrl: "" }))}
                        className={`relative h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                          creative.imageChoice === img.id && !creative.customImageUrl
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                      >
                        <span className="text-2xl">{img.emoji}</span>
                        <span className="text-xs font-medium">{img.label}</span>
                        {creative.imageChoice === img.id && !creative.customImageUrl && (
                          <div className="absolute top-1 right-1">
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <label>
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-3.5 w-3.5" /> Upload Custom Image
                      </span>
                    </Button>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setCreative(c => ({ ...c, customImageUrl: reader.result as string, imageChoice: "custom" }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                  {creative.customImageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={creative.customImageUrl} alt="Custom" className="h-12 w-12 rounded object-cover" />
                      <span className="text-xs text-muted-foreground">Custom image selected</span>
                      <Button variant="ghost" size="sm" onClick={() => setCreative(c => ({ ...c, customImageUrl: "", imageChoice: "server" }))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Platform Toggles */}
                <div className="mb-6">
                  <Label>Platforms</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Facebook className="h-4 w-4 text-[#1877F2]" />
                        <span className="text-sm">Facebook</span>
                      </div>
                      <Switch
                        checked={creative.platforms.facebook}
                        onCheckedChange={v => setCreative(c => ({ ...c, platforms: { ...c.platforms, facebook: v } }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-[#E4405F]" />
                        <span className="text-sm">Instagram Feed</span>
                      </div>
                      <Switch
                        checked={creative.platforms.instagram}
                        onCheckedChange={v => setCreative(c => ({ ...c, platforms: { ...c.platforms, instagram: v } }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-[#E4405F]" />
                        <span className="text-sm">Instagram Stories</span>
                      </div>
                      <Switch
                        checked={creative.platforms.instagramStories}
                        onCheckedChange={v => setCreative(c => ({ ...c, platforms: { ...c.platforms, instagramStories: v } }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Value props */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Optimized for results</p>
                      <p className="text-xs text-muted-foreground">
                        We'll A/B test multiple ad versions to maximize your reach
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <Target className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Quality candidates only</p>
                      <p className="text-xs text-muted-foreground">
                        Smart targeting finds the right people and filters out the rest
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                      <Shield className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Protected reputation</p>
                      <p className="text-xs text-muted-foreground">
                        Negative comments are automatically hidden from your posts
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button onClick={() => setStep(3)} className="w-full" size="lg">
                    Looks good, continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full">
                    Edit headline & details
                  </Button>
                  <button
                    onClick={() => { setStep(0); setSubStep("choose"); }}
                    className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
                  >
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
                    <Input
                      value={creative.headline}
                      onChange={e => setCreative(c => ({ ...c, headline: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Subheadline</Label>
                    <Input
                      value={creative.subheadline}
                      onChange={e => setCreative(c => ({ ...c, subheadline: e.target.value }))}
                    />
                  </div>
                  {creative.bulletPoints.map((bp, i) => (
                    <div key={i}>
                      <Label>Requirement {i + 1}</Label>
                      <Input
                        value={bp}
                        onChange={e => {
                          const updated = [...creative.bulletPoints];
                          updated[i] = e.target.value;
                          setCreative(c => ({ ...c, bulletPoints: updated }));
                        }}
                      />
                    </div>
                  ))}
                  <div>
                    <Label>Pay Display</Label>
                    <Input
                      value={creative.payDisplay}
                      onChange={e => setCreative(c => ({ ...c, payDisplay: e.target.value }))}
                    />
                  </div>
                  {creative.benefitsDisplay.map((b, i) => (
                    <div key={i}>
                      <Label>Benefit {i + 1}</Label>
                      <Input
                        value={b}
                        onChange={e => {
                          const updated = [...creative.benefitsDisplay];
                          updated[i] = e.target.value;
                          setCreative(c => ({ ...c, benefitsDisplay: updated }));
                        }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (campaignId) {
                          await apiFetch(`/api/campaigns/${campaignId}/creative`, {
                            method: "PATCH",
                            body: JSON.stringify({
                              headline: creative.headline,
                              subheadline: creative.subheadline,
                              bulletPoints: creative.bulletPoints,
                              payDisplay: creative.payDisplay,
                              benefitsDisplay: creative.benefitsDisplay,
                            }),
                          });
                        }
                        setIsEditing(false);
                      }}
                      className="flex-1"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== STEP 3: Audience & Budget ==================== */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Audience & Budget</h2>
            <p className="text-muted-foreground mb-6">
              Set your targeting radius, daily budget, and campaign duration.
            </p>

            {/* Location Radius */}
            <div className="mb-8">
              <Label className="mb-3 block">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Targeting Radius
                </div>
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Show your ad to people within <strong>{radius} miles</strong> of {campaign.location || "your location"}
              </p>

              {/* Map Preview */}
              <div className="relative h-48 rounded-lg border bg-muted/30 mb-4 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-full border-2 border-primary/40 bg-primary/10 transition-all duration-300"
                    style={{
                      width: `${Math.min(90, radius * 3.5)}%`,
                      height: `${Math.min(90, radius * 3.5)}%`,
                    }}
                  />
                  <div className="absolute w-3 h-3 rounded-full bg-primary" />
                </div>
                <div className="absolute bottom-2 left-2 text-xs bg-background/80 backdrop-blur px-2 py-1 rounded">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  {campaign.location || "Location"}
                </div>
                <div className="absolute bottom-2 right-2 text-xs bg-background/80 backdrop-blur px-2 py-1 rounded">
                  {radius} mi radius
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Slider
                  value={[radius]}
                  onValueChange={([v]) => setRadius(v)}
                  min={5}
                  max={50}
                  step={5}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 mi</span>
                <span>10 mi</span>
                <span>25 mi</span>
                <span>50 mi</span>
              </div>
            </div>

            {/* Daily Budget */}
            <div className="mb-8">
              <Label className="mb-3 block">Daily Budget</Label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {BUDGET_OPTIONS.map(opt => (
                  <Card
                    key={opt.amount}
                    className={`cursor-pointer transition-all ${
                      !customBudgetMode && dailyBudget === opt.amount
                        ? "border-primary ring-1 ring-primary"
                        : "hover:border-muted-foreground/30"
                    }`}
                    onClick={() => {
                      setCustomBudgetMode(false);
                      setDailyBudget(opt.amount);
                    }}
                  >
                    <CardContent className="p-4">
                      <p className="text-lg font-bold">${opt.amount}<span className="text-sm font-normal text-muted-foreground">/day</span></p>
                      <p className="text-xs text-muted-foreground">{opt.reach}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card
                className={`cursor-pointer transition-all ${
                  customBudgetMode ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/30"
                }`}
                onClick={() => setCustomBudgetMode(true)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Custom Budget</span>
                    {customBudgetMode && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">$</span>
                        <Input
                          type="number"
                          min={5}
                          max={200}
                          value={customBudgetValue}
                          onChange={e => setCustomBudgetValue(Math.min(200, Math.max(5, parseInt(e.target.value) || 5)))}
                          className="w-20"
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-muted-foreground text-sm">/day</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Duration */}
            <div className="mb-8">
              <Label className="mb-3 block">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Campaign Duration
                </div>
              </Label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    variant={duration === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDuration(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Total Estimated Spend */}
            <Card className="mb-6 bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total estimated spend</span>
                  <span className="text-lg font-bold">
                    ${totalEstSpend}
                    {duration === 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ${effectiveBudget}/day {duration > 0 ? `x ${duration} days` : "(ongoing, billed monthly)"}. Pause or cancel at any time.
                </p>
              </CardContent>
            </Card>

            <Button onClick={() => setStep(4)} className="w-full" size="lg">
              Review & Launch <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="ghost" className="w-full mt-2" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to ad creative
            </Button>
          </div>

          {/* Right: FAQ */}
          <div>
            <Accordion type="single" collapsible defaultValue="spend">
              <AccordionItem value="spend">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  How much should I spend?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  $25/day is a great starting budget for most restaurant roles. This typically generates 5-15 applications per day. For urgent hires or competitive markets, try $50/day.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="paying">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  What am I paying for?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Your budget goes toward showing your job ad to local hospitality workers on Facebook and Instagram. You're charged daily only while the campaign is active.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="results">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  How long until I see results?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Most restaurants see their first applicants within 24-48 hours of launching a campaign.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="radius">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  What radius should I choose?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  10-15 miles works best for urban areas. For suburban or rural locations, try 25-50 miles. A wider radius means more reach but potentially longer commutes for candidates.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="charged">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  When will I be charged?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Your card on file is charged daily while the campaign is active. Pause at any time to stop charges immediately.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="over">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  Will I ever be charged over my daily budget?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  No. Your daily budget is a hard cap. The ad stops serving once the daily limit is reached.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}

      {/* ==================== STEP 4: Review & Launch ==================== */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">Review & Launch</h2>

            <Card className="mb-6">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold mb-3">Campaign Summary</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <span className="text-muted-foreground">Job:</span>
                  <span className="font-medium">{campaign.title}</span>
                  <span className="text-muted-foreground">Location:</span>
                  <span>{campaign.location}</span>
                  <span className="text-muted-foreground">Type:</span>
                  <span>{campaign.employmentType}</span>
                  <span className="text-muted-foreground">Pay:</span>
                  <span>{creative.payDisplay || "Not specified"}</span>
                  <span className="text-muted-foreground">Targeting:</span>
                  <span>{radius} mile radius</span>
                  <span className="text-muted-foreground">Platforms:</span>
                  <span>
                    {[
                      creative.platforms.facebook && "Facebook",
                      creative.platforms.instagram && "Instagram",
                      creative.platforms.instagramStories && "Stories",
                    ].filter(Boolean).join(", ")}
                  </span>
                  <span className="text-muted-foreground">Daily Budget:</span>
                  <span className="font-medium">${effectiveBudget}/day</span>
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{duration > 0 ? `${duration} days` : "Ongoing"}</span>
                  <span className="text-muted-foreground">Est. Total:</span>
                  <span className="font-medium">${totalEstSpend}{duration === 0 ? "/mo" : ""}</span>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => handleLaunch(false)}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Launching...</>
              ) : (
                <><Rocket className="mr-2 h-4 w-4" /> Launch Campaign</>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleLaunch(true)}
              disabled={isLoading}
              className="w-full mt-3"
            >
              Save as Draft
            </Button>

            <Button variant="ghost" className="w-full mt-2" onClick={() => setStep(3)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to budget
            </Button>
          </div>

          {/* Right: Ad Preview */}
          <div>
            <p className="text-sm font-medium mb-3">Ad Preview</p>
            <AdPreviewCard
              orgName={orgName}
              primaryColor={primaryColor}
              headline={creative.headline}
              subheadline={creative.subheadline}
              bulletPoints={creative.bulletPoints}
              payDisplay={creative.payDisplay}
              benefitsDisplay={creative.benefitsDisplay}
              cta={creative.cta}
            />
          </div>
        </div>
      )}
    </div>
  );
}
