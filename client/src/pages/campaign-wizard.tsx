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
  Rocket, ChevronLeft, TrendingUp, Target, Shield,
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
}

const STEP_LABELS = ["Basic Info", "Review your Ad", "Set your Budget", "Post"];

const JOB_SUGGESTIONS = [
  "Line Cook", "Sous Chef", "Server", "Bartender", "Host/Hostess",
  "Busser", "Dishwasher", "Floor Manager", "Catering Staff", "Prep Cook",
  "Executive Chef", "GM", "Barback", "Food Runner", "Event Staff",
];

export default function CampaignWizard() {
  const [, setLocation] = useLocation();
  const { apiFetch } = useCampaignAuth();

  const [step, setStep] = useState(0); // 0 = choose method, 1a/1b = sub-steps, 2-4 = main steps
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
  });

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [budgetType, setBudgetType] = useState<"recommended" | "custom">("recommended");
  const [customBudget, setCustomBudget] = useState(32);
  const [isEditing, setIsEditing] = useState(false);
  const [newRequirement, setNewRequirement] = useState("");
  const [newBenefit, setNewBenefit] = useState("");
  const [launchSuccess, setLaunchSuccess] = useState(false);

  // Branding (would come from context in production)
  const orgName = "Your Restaurant";
  const primaryColor = "#111111";

  const dailyBudget = budgetType === "recommended" ? 32 : customBudget;

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
      setCampaign({
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
      });

      // Fetch the ad creative
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
          setCreative({
            headline: c.headline || `HIRING ${campaign.title.toUpperCase()}`,
            subheadline: c.subheadline || `${campaign.location} | ${campaign.employmentType}`,
            bulletPoints: c.bulletPoints || campaign.requirements.slice(0, 3),
            payDisplay: c.payDisplay || "",
            benefitsDisplay: c.benefitsDisplay || campaign.benefits.slice(0, 3),
            cta: c.cta || "Apply Now",
          });
        } else {
          // Fallback creative
          setCreative({
            headline: `HIRING ${campaign.title.toUpperCase()}`,
            subheadline: `${campaign.location} | ${campaign.employmentType}`,
            bulletPoints: campaign.requirements.slice(0, 3),
            payDisplay: campaign.payMin && campaign.payMax
              ? `$${campaign.payMin} - $${campaign.payMax} / ${campaign.payPeriod === "year" ? "Yr" : "Hr"}`
              : "Competitive Pay",
            benefitsDisplay: campaign.benefits.slice(0, 3),
            cta: "Apply Now",
          });
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
  const handleLaunch = useCallback(async () => {
    if (!campaignId) return;
    setIsLoading(true);

    try {
      // Update budget
      await apiFetch(`/api/campaigns/${campaignId}/budget`, {
        method: "PATCH",
        body: JSON.stringify({ dailyBudgetCents: dailyBudget * 100 }),
      });

      // Activate campaign
      const res = await apiFetch(`/api/campaigns/${campaignId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });

      if (!res.ok) throw new Error("Failed to launch campaign");

      setLaunchSuccess(true);
    } catch (error: any) {
      alert(error.message || "Failed to launch campaign");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, dailyBudget, apiFetch]);

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

      {/* STEP 1: Choose Method */}
      {step === 0 && subStep === "choose" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">How would you like to set up your job?</h2>
          <p className="text-muted-foreground mb-8">Step 1 of 4</p>

          <div className="space-y-4">
            <Card
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
              onClick={() => { setSubStep("url"); }}
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
              onClick={() => { setSubStep("manual"); }}
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

      {/* STEP 1B: URL Import */}
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

              <Button
                onClick={handleUrlImport}
                disabled={!url.trim()}
                className="w-full mb-6"
              >
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

      {/* STEP 1C: Manual Entry */}
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
              <Label>Employment Type</Label>
              <RadioGroup
                value={campaign.employmentType}
                onValueChange={v => setCampaign(c => ({ ...c, employmentType: v }))}
                className="flex flex-wrap gap-4 mt-2"
              >
                {["Full-time", "Part-time", "Seasonal", "Per Diem"].map(t => (
                  <div key={t} className="flex items-center space-x-2">
                    <RadioGroupItem value={t} id={t} />
                    <Label htmlFor={t} className="font-normal">{t}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label>Pay Range</Label>
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

      {/* STEP 2: Review Ad */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
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
            <p className="text-xs text-muted-foreground text-center mt-3">
              This is a sample ad. We'll test multiple versions to find the best performers.
            </p>
          </div>

          <div>
            {!isEditing ? (
              <>
                <h2 className="text-2xl font-bold mb-2">How does this look?</h2>
                <p className="text-muted-foreground mb-6">
                  Review your ad and make any changes before setting your budget.
                </p>

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
                    Make changes
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
                        // Save creative changes to API
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

      {/* STEP 3: Budget */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Set your budget</h2>
            <p className="text-muted-foreground mb-6">
              Choose how much to spend daily on promoting your job.
            </p>

            <div className="space-y-4">
              <Card
                className={`cursor-pointer transition-all ${budgetType === "recommended" ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/30"}`}
                onClick={() => setBudgetType("recommended")}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">Recommended Budget</h3>
                  <p className="text-3xl font-bold">$32 <span className="text-base font-normal text-muted-foreground">/ day</span></p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Your budget decides how many candidates see your job ad. A higher budget means more visibility and more candidates applying.
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${budgetType === "custom" ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/30"}`}
                onClick={() => setBudgetType("custom")}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">Custom Budget</h3>
                  {budgetType === "custom" ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg">$</span>
                      <Input
                        type="number"
                        min={10}
                        max={200}
                        value={customBudget}
                        onChange={e => setCustomBudget(Math.min(200, Math.max(10, parseInt(e.target.value) || 10)))}
                        className="w-24 text-lg"
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-muted-foreground">/ day</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Set a custom daily budget (min $10, max $200)</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Your budget decides how many candidates see your job ad.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Button onClick={() => setStep(4)} className="w-full mt-6" size="lg">
              Proceed to checkout <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              You can pause or cancel at any time
            </p>
            <Button variant="ghost" className="mt-2" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to review
            </Button>
          </div>

          <div>
            <Accordion type="single" collapsible defaultValue="spend">
              <AccordionItem value="spend">
                <AccordionTrigger className="text-sm font-semibold uppercase tracking-wide">
                  How much should I spend?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  $32/day is our recommended starting budget for most restaurant roles. This ensures a steady candidate flow. You can pause or adjust at any time.
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

      {/* STEP 4: Checkout */}
      {step === 4 && (
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-6">Checkout and Post</h2>

          <Card className="mb-6">
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold mb-3">Review your campaign</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Job:</span>
                <span className="font-medium">{campaign.title} - {campaign.location}</span>
                <span className="text-muted-foreground">Employment:</span>
                <span>{campaign.employmentType}</span>
                <span className="text-muted-foreground">Pay:</span>
                <span>{creative.payDisplay || "Not specified"}</span>
                <span className="text-muted-foreground">Daily Budget:</span>
                <span className="font-medium">${dailyBudget}/day</span>
                <span className="text-muted-foreground">Est. weekly:</span>
                <span>${dailyBudget * 7}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleLaunch}
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

          <Button variant="ghost" className="w-full mt-3" onClick={() => setStep(3)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to budget
          </Button>
        </div>
      )}
    </div>
  );
}
