import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant-context";
import {
  Video,
  Plus,
  FileText,
  Trash2,
  Clock,
  MessageSquare,
  CheckCircle2,
  Copy,
  Link2,
  Eye,
  Send,
  Play,
  User,
  X,
} from "lucide-react";
import type { InterviewTemplate, InterviewQuestion, InterviewInvite, InterviewResponse } from "@shared/schema";

type TemplateWithQuestions = InterviewTemplate & {
  questions?: InterviewQuestion[];
  _count?: { invites: number };
};

type InviteWithDetails = InterviewInvite & {
  template?: InterviewTemplate;
  questionCount?: number;
  responseCount?: number;
};

type InviteReviewData = InterviewInvite & {
  template?: InterviewTemplate;
  questions?: InterviewQuestion[];
  responses?: InterviewResponse[];
};

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

const questionFormSchema = z.object({
  promptText: z.string().min(1, "Question text is required"),
  responseType: z.enum(["VIDEO", "TEXT"]).default("VIDEO"),
  timeLimitSeconds: z.coerce.number().min(30).max(300).default(120),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

const inviteFormSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  candidateName: z.string().min(1, "Candidate name is required"),
  candidateEmail: z.string().email("Valid email required"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function Interviews() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithQuestions | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [reviewInviteId, setReviewInviteId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery<TemplateWithQuestions[]>({
    queryKey: ["/api/interviews/templates"],
    enabled: !!currentTenant,
    refetchOnMount: "always",
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<InviteWithDetails[]>({
    queryKey: ["/api/interviews/invites"],
    enabled: !!currentTenant,
    refetchOnMount: "always",
  });


  const { data: reviewData, isLoading: reviewLoading } = useQuery<InviteReviewData>({
    queryKey: ["/api/interviews/invites", reviewInviteId],
    enabled: !!reviewInviteId,
  });

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: "", role: "" },
  });

  const questionForm = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: { promptText: "", responseType: "VIDEO", timeLimitSeconds: 120 },
  });

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { templateId: "", candidateName: "", candidateEmail: "" },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return apiRequest("POST", "/api/interviews/templates", {
        ...data,
        tenantId: currentTenant?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/templates"] });
      toast({ title: "Template created successfully" });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (data: QuestionFormValues) => {
      return apiRequest("POST", "/api/interviews/questions", {
        ...data,
        tenantId: currentTenant?.id,
        templateId: selectedTemplate?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/templates"] });
      toast({ title: "Question added successfully" });
      setIsQuestionDialogOpen(false);
      questionForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to add question", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/interviews/templates/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/templates"] });
      toast({ title: "Template deleted successfully" });
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      return apiRequest("POST", "/api/interviews/invites", {
        ...data,
        tenantId: currentTenant?.id,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews/invites"] });
      const inviteLink = `${window.location.origin}/interview/${data.inviteToken}`;
      navigator.clipboard.writeText(inviteLink);
      toast({ 
        title: "Interview invite created!",
        description: "Link copied to clipboard",
      });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: () => {
      toast({ title: "Failed to create invite", variant: "destructive" });
    },
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/interview/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(token);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to manage interviews
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Virtual Interviews</h1>
          <p className="text-muted-foreground">
            Create interview templates and invite candidates to record video responses
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-create-invite">
                <Send className="h-4 w-4" />
                Send Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Interview Invite</DialogTitle>
                <DialogDescription>
                  Create an interview invite with a shareable link
                </DialogDescription>
              </DialogHeader>
              <Form {...inviteForm}>
                <form
                  onSubmit={inviteForm.handleSubmit((data) => createInviteMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={inviteForm.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interview Template</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} ({template.questions?.length || 0} questions)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="candidateName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Candidate Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} data-testid="input-candidate-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="candidateEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Candidate Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-candidate-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createInviteMutation.isPending} data-testid="button-send-invite">
                      {createInviteMutation.isPending ? "Creating..." : "Create & Copy Link"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-template">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Interview Template</DialogTitle>
                <DialogDescription>
                  Create a reusable interview template with questions
                </DialogDescription>
              </DialogHeader>
              <Form {...templateForm}>
                <form
                  onSubmit={templateForm.handleSubmit((data) => createTemplateMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Server Screening" {...field} data-testid="input-template-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Server, Bartender" {...field} data-testid="input-template-role" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTemplateMutation.isPending} data-testid="button-save-template">
                      {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2">
            <Send className="h-4 w-4" />
            Invites
            {invites && invites.length > 0 && (
              <Badge variant="secondary" className="ml-1">{invites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-4 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`overflow-visible hover-elevate cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`template-card-${template.id}`}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Video className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.role && (
                          <Badge variant="secondary" className="mt-1 text-xs">{template.role}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {template.questions?.length || 0} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        {template._count?.invites || 0} uses
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  Create interview templates to streamline candidate screening
                </p>
                <Button onClick={() => setIsTemplateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Template
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedTemplate && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>{selectedTemplate.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.questions?.length || 0} questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2" data-testid="button-add-question">
                        <Plus className="h-4 w-4" />
                        Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Question</DialogTitle>
                        <DialogDescription>Add a new question to this template</DialogDescription>
                      </DialogHeader>
                      <Form {...questionForm}>
                        <form
                          onSubmit={questionForm.handleSubmit((data) => addQuestionMutation.mutate(data))}
                          className="space-y-4"
                        >
                          <FormField
                            control={questionForm.control}
                            name="promptText"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter your interview question..."
                                    className="min-h-24 resize-none"
                                    {...field}
                                    data-testid="input-question-text"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={questionForm.control}
                            name="responseType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Response Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-response-type">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="VIDEO">Video Response</SelectItem>
                                    <SelectItem value="TEXT">Text Response</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={questionForm.control}
                            name="timeLimitSeconds"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time Limit (seconds)</FormLabel>
                                <FormControl>
                                  <Input type="number" min={30} max={300} {...field} data-testid="input-question-time" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={addQuestionMutation.isPending} data-testid="button-save-question">
                              {addQuestionMutation.isPending ? "Adding..." : "Add Question"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this template?")) {
                        deleteTemplateMutation.mutate(selectedTemplate.id);
                      }
                    }}
                    data-testid="button-delete-template"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedTemplate.questions && selectedTemplate.questions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTemplate.questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="flex items-start gap-4 rounded-lg border border-border p-4"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{question.promptText}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {question.timeLimitSeconds}s
                            </span>
                            <Badge variant={question.responseType === "VIDEO" ? "default" : "secondary"} className="text-xs">
                              {question.responseType === "VIDEO" ? "Video" : "Text"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No questions yet. Add your first question to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-4">
          {invitesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : invites && invites.length > 0 ? (
            <div className="space-y-4">
              {invites.map((invite) => (
                <Card key={invite.id} data-testid={`invite-card-${invite.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {invite.candidateName || invite.candidateEmail || "Unnamed Candidate"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {invite.template?.name || "Interview"} • {invite.responseCount || 0}/{invite.questionCount || 0} responses
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            invite.status === "COMPLETED"
                              ? "default"
                              : invite.status === "EXPIRED"
                              ? "destructive"
                              : invite.status === "IN_PROGRESS"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {invite.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyInviteLink(invite.inviteToken)}
                          data-testid={`button-copy-link-${invite.id}`}
                        >
                          {copiedLink === invite.inviteToken ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        {invite.status === "COMPLETED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewInviteId(invite.id)}
                            className="gap-2"
                            data-testid={`button-review-${invite.id}`}
                          >
                            <Play className="h-4 w-4" />
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No invites yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  Send interview invites to candidates with shareable links
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send First Invite
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewInviteId} onOpenChange={() => setReviewInviteId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Interview Review</DialogTitle>
                <DialogDescription>
                  {reviewData?.candidateName || "Candidate"} - {reviewData?.template?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {reviewLoading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : reviewData?.questions && reviewData.responses ? (
            <div className="space-y-6">
              {reviewData.questions.map((question, idx) => {
                const response = reviewData.responses?.find(r => r.questionId === question.id);
                return (
                  <div key={question.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{question.promptText}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {question.responseType === "VIDEO" ? "Video" : "Text"}
                        </Badge>
                      </div>
                    </div>
                    
                    {response ? (
                      <div className="ml-11">
                        {response.type === "VIDEO" && response.videoPath ? (
                          <video
                            src={response.videoPath}
                            controls
                            className="w-full max-w-2xl rounded-lg bg-black aspect-video"
                            data-testid={`video-response-${question.id}`}
                          />
                        ) : response.text ? (
                          <div className="bg-muted rounded-lg p-4">
                            <p className="whitespace-pre-wrap">{response.text}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic">No response submitted</p>
                        )}
                      </div>
                    ) : (
                      <div className="ml-11">
                        <p className="text-muted-foreground italic">No response submitted</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No responses to review
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
