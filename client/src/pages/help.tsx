import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Mail,
  Briefcase,
  Video,
  Clock,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

interface GuideSection {
  title: string;
  icon: React.ReactNode;
  items: { question: string; answer: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    title: "Getting Started",
    icon: <BookOpen className="h-5 w-5" />,
    items: [
      {
        question: "How do I create an account?",
        answer:
          "Click \"Sign Up\" on the homepage. Choose whether you're an employer or job seeker. Employers will be asked to create an organization during onboarding. You can invite team members after setup is complete.",
      },
      {
        question: "How do I set up my organization?",
        answer:
          "After signing up as an employer, you'll go through onboarding where you provide your restaurant or company name. You can then add locations, invite team members, and configure your settings from the Settings page.",
      },
      {
        question: "What's the difference between the Employer and Job Seeker accounts?",
        answer:
          "Employer accounts can post jobs, manage candidates, run gig shifts, and use video interviews. Job Seeker accounts can search and apply for jobs, browse gig opportunities, and manage their profile and applications.",
      },
    ],
  },
  {
    title: "Posting Jobs",
    icon: <Briefcase className="h-5 w-5" />,
    items: [
      {
        question: "How do I post a job?",
        answer:
          "Go to Jobs in your sidebar, then click \"Create Job.\" Fill in the job title, location, pay range, schedule, and description. You can save as a draft or publish immediately. Published jobs appear on the public job board and can be distributed to Indeed and ZipRecruiter.",
      },
      {
        question: "How do I distribute jobs to external boards?",
        answer:
          "First, connect your Indeed and/or ZipRecruiter accounts in Settings > Integrations. Then when viewing a job, click \"Distribute\" to push it to connected job boards. You can track the status of each distribution.",
      },
      {
        question: "How do I manage applications?",
        answer:
          "Go to Applicants in your sidebar. You'll see all applications organized by status: Applied, Screening, Interview, Offer, Hired, or Rejected. Click on any applicant to view their details, resume, and move them through the pipeline.",
      },
      {
        question: "Can I use templates for job postings?",
        answer:
          "Yes! When creating a new job, you can start from one of our 40+ pre-built hospitality role templates (Line Cook, Server, Bartender, etc.). These include pre-filled descriptions, requirements, and suggested pay ranges that you can customize.",
      },
    ],
  },
  {
    title: "Video Interviews",
    icon: <Video className="h-5 w-5" />,
    items: [
      {
        question: "How do video interviews work?",
        answer:
          "Create an interview template with your questions (up to 5). Set think time and retake limits for each question. Then invite candidates by email. Candidates record their video responses from their phone or computer, no app needed. You review responses at your own pace.",
      },
      {
        question: "How do I set up interview questions?",
        answer:
          "Go to Interviews in your sidebar and click \"Create Template.\" Add your questions, set the think time (how long candidates can prepare before recording), and set how many retakes are allowed. You can also add video prompts where you ask the question on camera.",
      },
      {
        question: "How do I review video responses?",
        answer:
          "Go to Interviews, select a template, and view the responses. Each response shows the candidate's name, the question asked, and the video recording. You can rate responses, leave comments, and collaborate with your team on reviews.",
      },
      {
        question: "Do candidates need to install an app?",
        answer:
          "No. Candidates receive a link and record their video directly in their web browser. We check their camera and microphone before the interview starts. Candidates can review and re-record their answers before submitting.",
      },
    ],
  },
  {
    title: "Gig Shifts",
    icon: <Clock className="h-5 w-5" />,
    items: [
      {
        question: "How do I post a gig shift?",
        answer:
          "Go to Gig Posts in your sidebar and click \"Create Gig.\" Specify the role, date/time, pay rate, and any requirements. You can choose instant booking (workers auto-confirm) or require your approval before confirming workers.",
      },
      {
        question: "How does worker vetting work?",
        answer:
          "Workers go through vetting levels: None, Basic, Verified, and Pro. Each level requires more verification. You can set minimum vetting requirements for your gig posts. Workers build their reputation through ratings from employers.",
      },
      {
        question: "How do I pay gig workers?",
        answer:
          "Gig workers connect their Stripe account to receive payouts. After a shift is completed and confirmed, you can initiate a payout. Payments are processed through Stripe Connect and deposited directly to the worker's bank account.",
      },
      {
        question: "Can I mark shifts as emergency?",
        answer:
          "Yes. When creating a gig post, you can flag it as an emergency shift. Emergency shifts are highlighted in the marketplace and can attract workers looking for immediate opportunities.",
      },
    ],
  },
  {
    title: "Frequently Asked Questions",
    icon: <HelpCircle className="h-5 w-5" />,
    items: [
      {
        question: "How much does Krew Recruiter cost?",
        answer:
          "We offer a free tier with 1 active job posting and up to 10 candidates. Our Starter plan is $49/mo with 5 jobs and video interviews. Our Pro plan at $99/mo gives you unlimited everything. Enterprise pricing is custom. Visit our Pricing page for full details.",
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer:
          "Yes. There are no long-term contracts. You can cancel from your billing settings at any time. Your subscription will remain active until the end of your current billing period. Your data is retained for 90 days after cancellation.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Yes. We use industry-standard encryption for all data in transit and at rest. We are GDPR-compliant and follow best practices for data security. Video interview recordings are stored securely and only accessible to authorized team members.",
      },
      {
        question: "Can I use Krew Recruiter for multiple locations?",
        answer:
          "Yes. You can add multiple locations to your organization in the Locations section. Jobs and gigs can be assigned to specific locations. Our Pro and Enterprise plans support unlimited locations.",
      },
      {
        question: "How do I get help?",
        answer:
          "You can email us at support@krewhuddle.com for any questions. Starter and Pro plans include priority email support. Enterprise plans include phone and chat support plus a dedicated account manager.",
      },
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const filteredSections = useMemo(() => {
    if (!search.trim()) return GUIDE_SECTIONS;
    const q = search.toLowerCase();
    return GUIDE_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(
        item =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
      ),
    })).filter(section => section.items.length > 0);
  }, [search]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              K
            </div>
            <span className="font-semibold">Krew Recruiter</span>
          </a>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button variant="ghost" onClick={() => setLocation("/login")}>Log in</Button>
            <Button onClick={() => setLocation("/login")}>Sign Up</Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Help & Guide Center</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to know about using Krew Recruiter to hire great
            hospitality talent.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-10 max-w-lg mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Links */}
        {!search && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
            {[
              { icon: Briefcase, label: "Post a Job", href: "/app/jobs/new" },
              { icon: Video, label: "Video Interviews", href: "/app/interviews" },
              { icon: Clock, label: "Post a Gig", href: "/app/gigs/new" },
              { icon: HelpCircle, label: "Contact Support", href: "mailto:support@krewhuddle.com" },
            ].map(link => (
              <Card key={link.label} className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (link.href.startsWith("mailto:")) window.location.href = link.href;
                  else setLocation(link.href);
                }}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <link.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{link.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sections */}
        {filteredSections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No results found</p>
            <p className="text-sm mb-3">Try a different search term.</p>
            <Button variant="ghost" onClick={() => setSearch("")}>Clear search</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSections.map(section => (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-primary">{section.icon}</div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                </div>
                <Accordion type="single" collapsible>
                  {section.items.map((item, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`}>
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
        <div className="mt-16 border rounded-lg p-8 text-center bg-muted/30">
          <h3 className="font-semibold text-lg mb-2">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Our support team is here to help you get the most out of Krew Recruiter.
          </p>
          <Button onClick={() => window.location.href = "mailto:support@krewhuddle.com"}>
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}
