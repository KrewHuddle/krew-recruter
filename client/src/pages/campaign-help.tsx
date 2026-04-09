import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Mail, Rocket, BarChart3, Video, CreditCard } from "lucide-react";

interface HelpItem {
  question: string;
  answer: string;
}

interface HelpSection {
  title: string;
  icon: React.ReactNode;
  items: HelpItem[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "Getting Started",
    icon: <Rocket className="h-5 w-5" />,
    items: [
      {
        question: "How to create your first job ad",
        answer:
          'Click "New Job" in the sidebar, then choose to either paste a link from an existing job posting or fill in the details manually. Our system will automatically generate an optimized ad for Facebook and Instagram. Review the ad, set your daily budget, and launch your campaign.',
      },
      {
        question: "How to connect your Facebook Page",
        answer:
          "Go to Settings > Integrations and click \"Connect Facebook.\" You'll be redirected to Facebook to authorize Krew Recruiter to post ads on your behalf. We only request the minimum permissions needed to run your hiring campaigns. You can disconnect at any time.",
      },
      {
        question: "Understanding your dashboard",
        answer:
          "Your dashboard shows key metrics at a glance: total active campaigns, impressions (how many people saw your ads), clicks (how many interacted), and applications received. The chart shows trends over time. Below that, you'll see your recent candidates organized by review status.",
      },
    ],
  },
  {
    title: "Running Campaigns",
    icon: <BarChart3 className="h-5 w-5" />,
    items: [
      {
        question: "How to write a great ad headline",
        answer:
          'Keep it short and specific. Include the job title and one key selling point. For example: "Line Cook — $22/hr + Free Meals" performs better than "We\'re Hiring!" Our system generates optimized headlines automatically, but you can always edit them.',
      },
      {
        question: "Setting the right budget for your restaurant",
        answer:
          "We recommend starting at $25-35/day for most restaurant roles. This typically generates 5-15 applications per day depending on your location and role. For urgent hires or competitive markets, consider $50/day. You can adjust your budget at any time — there's no minimum commitment.",
      },
      {
        question: "Understanding reach vs. clicks vs. applications",
        answer:
          "Reach is the number of unique people who saw your ad. Clicks are the number who tapped on it to learn more. Applications are the candidates who completed and submitted their application. A healthy funnel looks like: 1,000 reach → 50 clicks → 5-10 applications. If your clicks are low, try a different headline. If applications are low, simplify your application questions.",
      },
      {
        question: "How to pause or edit a live campaign",
        answer:
          'Go to Jobs, find the campaign you want to modify, and click the pause button (⏸) to stop the campaign immediately. No more budget will be spent while paused. To edit, click the three-dot menu and select "Edit." You can change the headline, budget, or targeting. Resume the campaign when you\'re ready.',
      },
    ],
  },
  {
    title: "Video Interviews",
    icon: <Video className="h-5 w-5" />,
    items: [
      {
        question: "How video interviews work for candidates",
        answer:
          "When you enable video interviews, candidates receive a link to record short video responses (30-90 seconds) to your preset questions. They can record from their phone or computer — no app download needed. Candidates can review and re-record before submitting. Videos are stored securely and only visible to your team.",
      },
      {
        question: "Setting up your interview questions",
        answer:
          'Go to Video Interviews and click "Create Interview." We provide three default questions suitable for hospitality roles. You can customize them, remove any, or add your own (up to 5 questions). Keep questions clear and concise. Good questions: "Tell us about your restaurant experience" or "How do you handle a rush?"',
      },
      {
        question: "Scoring and shortlisting candidates",
        answer:
          'Each video response has three quick-score buttons: thumbs up (good candidate), thumbs down (not a fit), and star (shortlist for interview). Click "Watch" to view the full video in a side panel. You can score directly from the video player. Use the shortlist to quickly identify your top candidates to bring in for an in-person interview.',
      },
    ],
  },
  {
    title: "Billing & Account",
    icon: <CreditCard className="h-5 w-5" />,
    items: [
      {
        question: "How billing works",
        answer:
          "Your subscription covers platform access and features. Ad spend is separate and charged daily while campaigns are active. Your daily budget is a hard cap — you'll never be charged more. All charges appear on a single monthly invoice. You can view invoices and manage your payment method from the Billing page.",
      },
      {
        question: "Upgrading or downgrading your plan",
        answer:
          'Go to Billing and click "Upgrade" on the plan you want. Upgrades take effect immediately and you\'ll be charged a prorated amount. Downgrades take effect at the end of your current billing period. Your existing campaigns will continue running, but you may lose access to some features on lower plans.',
      },
      {
        question: "Cancelling your subscription",
        answer:
          'Click "Manage Billing" on the Billing page to open the Stripe Customer Portal. From there, you can cancel your subscription. Active campaigns will be paused when your subscription ends. Your data is retained for 90 days, so you can reactivate at any time without losing your campaign history or candidate data.',
      },
    ],
  },
];

export default function CampaignHelp() {
  const [search, setSearch] = useState("");

  const filteredSections = useMemo(() => {
    if (!search.trim()) return HELP_SECTIONS;

    const q = search.toLowerCase();
    return HELP_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
      ),
    })).filter((section) => section.items.length > 0);
  }, [search]);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Help Center</h1>
      <p className="text-muted-foreground mb-6">
        Find answers to common questions about running campaigns, video
        interviews, and billing.
      </p>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredSections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No results found</p>
          <p className="text-sm">
            Try a different search term or browse all sections below.
          </p>
          <Button
            variant="ghost"
            className="mt-2"
            onClick={() => setSearch("")}
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-muted-foreground">{section.icon}</div>
                <h2 className="text-lg font-semibold">{section.title}</h2>
              </div>
              <Accordion type="single" collapsible>
                {section.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`${section.title}-${i}`}
                  >
                    <AccordionTrigger className="text-sm text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {/* Contact Support */}
      <div className="mt-12 border rounded-lg p-6 text-center bg-muted/30">
        <h3 className="font-semibold mb-2">Still need help?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Our support team is here to help you get the most out of Krew
          Recruiter.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            (window.location.href = "mailto:support@krewhuddle.com")
          }
        >
          <Mail className="mr-2 h-4 w-4" />
          Contact Support
        </Button>
      </div>
    </div>
  );
}
