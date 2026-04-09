import { useState } from "react";
import { useCampaignAuth } from "@/lib/campaign-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Video,
  Plus,
  Play,
  ThumbsUp,
  ThumbsDown,
  Star,
  ArrowLeft,
  Users,
  CheckCircle,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InterviewCampaign {
  id: string;
  jobTitle: string;
  totalResponses: number;
  reviewedCount: number;
  createdAt: string;
  status: string;
  questions: { id: string; questionText: string; thinkTimeSeconds: number }[];
}

interface VideoResponse {
  id: string;
  candidateName: string;
  candidateEmail: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  score?: "thumbs_up" | "thumbs_down" | "shortlisted" | null;
  submittedAt: string;
  questionText: string;
}

export default function CampaignInterviews() {
  const { apiFetch } = useCampaignAuth();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["/api/video-interviews"],
    queryFn: async () => {
      const res = await apiFetch("/api/video-interviews");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["/api/video-interviews", selectedCampaign, "responses"],
    queryFn: async () => {
      if (!selectedCampaign) return [];
      const res = await apiFetch(
        `/api/video-interviews/${selectedCampaign}/responses`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedCampaign,
  });

  const scoreMutation = useMutation({
    mutationFn: async ({
      responseId,
      score,
    }: {
      responseId: string;
      score: string;
    }) => {
      const res = await apiFetch(
        `/api/video-interviews/responses/${responseId}/score`,
        {
          method: "PATCH",
          body: JSON.stringify({ score }),
        }
      );
      if (!res.ok) throw new Error("Failed to score");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/video-interviews", selectedCampaign, "responses"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/video-interviews"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      jobTitle: string;
      questions: string[];
    }) => {
      const res = await apiFetch("/api/video-interviews", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-interviews"] });
      setCreateOpen(false);
    },
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const selectedCampaignData = campaigns.find(
    (c: InterviewCampaign) => c.id === selectedCampaign
  );

  // Campaign list view
  if (!selectedCampaign) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Video Interviews</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Interview
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold mb-2">
              No video interviews yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Video interviews let candidates record short responses to your
              questions. Screen candidates faster without scheduling calls.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Your First Interview
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    Job Title
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    Responses
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Reviewed</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: InterviewCampaign) => (
                  <tr
                    key={c.id}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedCampaign(c.id)}
                  >
                    <td className="px-4 py-3 font-medium">{c.jobTitle}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.totalResponses}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        {c.reviewedCount}/{c.totalResponses}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          c.status === "active" ? "default" : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Interview Dialog */}
        <CreateInterviewDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </div>
    );
  }

  // Response list view
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCampaign(null)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {selectedCampaignData?.jobTitle || "Video Responses"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {responses.length} response{responses.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No responses yet</p>
          <p className="text-sm">
            Responses will appear here when candidates complete their
            interviews.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {responses.map((r: VideoResponse) => (
            <Card key={r.id} className="overflow-hidden">
              <div
                className="relative h-40 bg-muted flex items-center justify-center cursor-pointer group"
                onClick={() => {
                  setActiveVideo(r);
                  setVideoModalOpen(true);
                }}
              >
                {r.thumbnailUrl ? (
                  <img
                    src={r.thumbnailUrl}
                    alt={r.candidateName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Video className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="h-5 w-5 text-black ml-0.5" />
                  </div>
                </div>
                {r.duration > 0 && (
                  <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
                    {formatDuration(r.duration)}
                  </span>
                )}
                {r.score && (
                  <div className="absolute top-2 right-2">
                    <ScoreBadge score={r.score} />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.submittedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  <Button
                    variant={r.score === "thumbs_up" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      scoreMutation.mutate({
                        responseId: r.id,
                        score: "thumbs_up",
                      })
                    }
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={r.score === "thumbs_down" ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      scoreMutation.mutate({
                        responseId: r.id,
                        score: "thumbs_down",
                      })
                    }
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={r.score === "shortlisted" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      scoreMutation.mutate({
                        responseId: r.id,
                        score: "shortlisted",
                      })
                    }
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Sheet */}
      <Sheet open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <SheetContent side="right" className="sm:max-w-lg w-full p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">
              {activeVideo?.candidateName}
            </SheetTitle>
          </SheetHeader>
          {activeVideo && (
            <div className="p-4 space-y-4">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Question</p>
                <p className="text-sm text-muted-foreground">
                  {activeVideo.questionText}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Candidate</p>
                <p className="text-sm">{activeVideo.candidateName}</p>
                <p className="text-xs text-muted-foreground">
                  {activeVideo.candidateEmail}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={
                    activeVideo.score === "thumbs_up" ? "default" : "outline"
                  }
                  className="flex-1"
                  onClick={() => {
                    scoreMutation.mutate({
                      responseId: activeVideo.id,
                      score: "thumbs_up",
                    });
                    setActiveVideo((v) =>
                      v ? { ...v, score: "thumbs_up" } : v
                    );
                  }}
                >
                  <ThumbsUp className="mr-2 h-4 w-4" /> Good
                </Button>
                <Button
                  variant={
                    activeVideo.score === "thumbs_down"
                      ? "destructive"
                      : "outline"
                  }
                  className="flex-1"
                  onClick={() => {
                    scoreMutation.mutate({
                      responseId: activeVideo.id,
                      score: "thumbs_down",
                    });
                    setActiveVideo((v) =>
                      v ? { ...v, score: "thumbs_down" } : v
                    );
                  }}
                >
                  <ThumbsDown className="mr-2 h-4 w-4" /> Pass
                </Button>
                <Button
                  variant={
                    activeVideo.score === "shortlisted" ? "default" : "outline"
                  }
                  className="flex-1"
                  onClick={() => {
                    scoreMutation.mutate({
                      responseId: activeVideo.id,
                      score: "shortlisted",
                    });
                    setActiveVideo((v) =>
                      v ? { ...v, score: "shortlisted" } : v
                    );
                  }}
                >
                  <Star className="mr-2 h-4 w-4" /> Shortlist
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ScoreBadge({ score }: { score: string }) {
  if (score === "thumbs_up")
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
        <ThumbsUp className="h-3 w-3" /> Good
      </span>
    );
  if (score === "thumbs_down")
    return (
      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
        <ThumbsDown className="h-3 w-3" /> Pass
      </span>
    );
  if (score === "shortlisted")
    return (
      <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full">
        <Star className="h-3 w-3" /> Shortlisted
      </span>
    );
  return null;
}

function CreateInterviewDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { jobTitle: string; questions: string[] }) => void;
  isLoading: boolean;
}) {
  const [jobTitle, setJobTitle] = useState("");
  const [questions, setQuestions] = useState<string[]>([
    "Tell us about yourself and your experience in hospitality.",
    "Why are you interested in this position?",
    "Describe a time you handled a difficult customer.",
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Video Interview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="interview-title">Job Title</Label>
            <Input
              id="interview-title"
              placeholder="e.g. Line Cook"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div>
            <Label>Interview Questions</Label>
            <div className="space-y-2 mt-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-medium text-muted-foreground mt-2.5 shrink-0">
                    Q{i + 1}
                  </span>
                  <Textarea
                    value={q}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[i] = e.target.value;
                      setQuestions(updated);
                    }}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 shrink-0"
                    onClick={() =>
                      setQuestions(questions.filter((_, j) => j !== i))
                    }
                    disabled={questions.length <= 1}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {questions.length < 5 && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add a question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newQuestion.trim()) {
                      setQuestions([...questions, newQuestion.trim()]);
                      setNewQuestion("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!newQuestion.trim()}
                  onClick={() => {
                    setQuestions([...questions, newQuestion.trim()]);
                    setNewQuestion("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={() => onSubmit({ jobTitle, questions })}
            disabled={!jobTitle.trim() || questions.length === 0 || isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Video className="mr-2 h-4 w-4" />
            )}
            Create Interview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
