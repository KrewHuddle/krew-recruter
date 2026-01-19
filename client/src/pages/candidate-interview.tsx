import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Play,
  Square,
  RefreshCw,
  Send,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import logoUrl from "@assets/3_1768835575859.png";

interface InterviewQuestion {
  id: string;
  promptText: string;
  responseType: "VIDEO" | "TEXT";
  timeLimitSeconds: number | null;
  maxRetakes: number | null;
  sortOrder: number | null;
}

interface ExistingResponse {
  questionId: string;
  type: "VIDEO" | "TEXT";
  hasVideo: boolean;
  hasText: boolean;
}

interface InterviewData {
  invite: {
    id: string;
    status: string;
    candidateName: string | null;
    deadlineAt: string | null;
  };
  template: {
    id: string;
    name: string;
    role: string | null;
  };
  questions: InterviewQuestion[];
  existingResponses: ExistingResponse[];
  organization: string;
}

export default function CandidateInterview() {
  const params = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [retakeCount, setRetakeCount] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: interviewData, isLoading, error } = useQuery<InterviewData>({
    queryKey: ["/api/public/interview", params.token],
    queryFn: async () => {
      const response = await fetch(`/api/public/interview/${params.token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load interview");
      }
      return response.json();
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      return fetch(`/api/public/interview/${params.token}/start`, { method: "POST" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (data: { questionId: string; type: string; videoPath?: string; text?: string }) => {
      return apiRequest("POST", `/api/public/interview/${params.token}/respond`, data);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      return fetch(`/api/public/interview/${params.token}/complete`, { method: "POST" });
    },
  });

  useEffect(() => {
    if (interviewData?.existingResponses) {
      const answered = new Set(interviewData.existingResponses.map(r => r.questionId));
      setCompletedQuestions(answered);
    }
  }, [interviewData]);

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionGranted(true);
    } catch (err) {
      console.error("Failed to get camera permissions:", err);
      toast({
        title: "Camera access required",
        description: "Please allow camera and microphone access to record your responses.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stopStream]);

  const handleStart = async () => {
    await startMutation.mutateAsync();
    setHasStarted(true);
    
    const currentQuestion = interviewData?.questions[currentQuestionIndex];
    if (currentQuestion?.responseType === "VIDEO") {
      await requestCameraPermission();
    }
  };

  const getSupportedMimeType = (): string => {
    const mimeTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return "";
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      await requestCameraPermission();
    }
    
    if (!streamRef.current) return;

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      toast({
        title: "Recording not supported",
        description: "Your browser does not support video recording. Please try a different browser like Chrome or Firefox.",
        variant: "destructive",
      });
      return;
    }

    chunksRef.current = [];
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      toast({
        title: "Recording failed",
        description: "Could not start video recording. Please try again or use a different browser.",
        variant: "destructive",
      });
      return;
    }

    const currentQuestion = interviewData?.questions[currentQuestionIndex];
    const timeLimit = currentQuestion?.timeLimitSeconds || 120;
    setTimeRemaining(timeLimit);

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleRetake = async () => {
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRetakeCount((prev) => prev + 1);
    setTimeRemaining(null);
  };

  const uploadVideoAndSubmit = async () => {
    if (!recordedBlob || !interviewData) return;

    setIsUploading(true);
    try {
      const urlResponse = await fetch(`/api/public/interview/${params.token}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await urlResponse.json();

      await fetch(uploadURL, {
        method: "PUT",
        body: recordedBlob,
        headers: { "Content-Type": "video/webm" },
      });

      const currentQuestion = interviewData.questions[currentQuestionIndex];
      await respondMutation.mutateAsync({
        questionId: currentQuestion.id,
        type: "VIDEO",
        videoPath: objectPath,
      });

      setCompletedQuestions((prev) => new Set([...prev, currentQuestion.id]));
      toast({ title: "Response submitted successfully" });
      moveToNextQuestion();
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const submitTextAnswer = async () => {
    if (!textAnswer.trim() || !interviewData) return;

    setIsUploading(true);
    try {
      const currentQuestion = interviewData.questions[currentQuestionIndex];
      await respondMutation.mutateAsync({
        questionId: currentQuestion.id,
        type: "TEXT",
        text: textAnswer,
      });

      setCompletedQuestions((prev) => new Set([...prev, currentQuestion.id]));
      toast({ title: "Response submitted successfully" });
      moveToNextQuestion();
    } catch (err) {
      console.error("Submit error:", err);
      toast({
        title: "Submit failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const moveToNextQuestion = () => {
    if (!interviewData) return;

    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setTextAnswer("");
    setRetakeCount(0);
    setTimeRemaining(null);

    if (currentQuestionIndex < interviewData.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      const nextQuestion = interviewData.questions[currentQuestionIndex + 1];
      if (nextQuestion?.responseType === "VIDEO" && !streamRef.current) {
        requestCameraPermission();
      }
    }
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync();
    stopStream();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your interview...</p>
        </div>
      </div>
    );
  }

  if (error || !interviewData) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Interview Not Found</h2>
            <p className="text-muted-foreground text-center">
              {error instanceof Error ? error.message : "This interview link may have expired or is invalid."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (interviewData.invite.status === "COMPLETED" || completeMutation.isSuccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Interview Complete!</h2>
            <p className="text-muted-foreground text-center">
              Thank you for completing your interview with {interviewData.organization}. 
              They will review your responses and get back to you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = interviewData.questions[currentQuestionIndex];
  const maxRetakes = currentQuestion?.maxRetakes || 3;
  const canRetake = retakeCount < maxRetakes;
  const progress = ((currentQuestionIndex + 1) / interviewData.questions.length) * 100;
  const allQuestionsAnswered = interviewData.questions.every(q => completedQuestions.has(q.id));

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-auto">
              <img src={logoUrl} alt="Logo" className="h-12 w-auto mx-auto" />
            </div>
            <CardTitle className="text-2xl">{interviewData.template.name}</CardTitle>
            <CardDescription>
              {interviewData.organization}
              {interviewData.template.role && ` • ${interviewData.template.role}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {interviewData.invite.candidateName && (
              <p className="text-center text-lg">
                Welcome, <span className="font-semibold">{interviewData.invite.candidateName}</span>!
              </p>
            )}
            
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h3 className="font-medium">Interview Details</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  {interviewData.questions.length} question{interviewData.questions.length !== 1 ? "s" : ""}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Approximately {Math.ceil(interviewData.questions.reduce((acc, q) => acc + (q.timeLimitSeconds || 120), 0) / 60)} minutes
                </li>
                {interviewData.invite.deadlineAt && (
                  <li className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Complete by {new Date(interviewData.invite.deadlineAt).toLocaleDateString()}
                  </li>
                )}
              </ul>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h3 className="font-medium">Before You Start</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Find a quiet, well-lit space</li>
                <li>• Ensure your camera and microphone work</li>
                <li>• Use a stable internet connection</li>
                <li>• You can retake answers up to {maxRetakes} times</li>
              </ul>
            </div>

            <Button 
              onClick={handleStart} 
              className="w-full gap-2"
              size="lg"
              disabled={startMutation.isPending}
              data-testid="button-start-interview"
            >
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Start Interview
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Logo" className="h-8 w-auto" />
            <div>
              <p className="font-medium">{interviewData.template.name}</p>
              <p className="text-sm text-muted-foreground">{interviewData.organization}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {interviewData.questions.length}
            </span>
            <Badge variant={allQuestionsAnswered ? "default" : "secondary"}>
              {completedQuestions.size}/{interviewData.questions.length} answered
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium">
                  {currentQuestionIndex + 1}
                </span>
                <Badge variant="outline">
                  {currentQuestion.responseType === "VIDEO" ? "Video Response" : "Text Response"}
                </Badge>
                {currentQuestion.timeLimitSeconds && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(currentQuestion.timeLimitSeconds / 60)}:{String(currentQuestion.timeLimitSeconds % 60).padStart(2, "0")}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg">{currentQuestion.promptText}</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {completedQuestions.has(currentQuestion.id) ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Check className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-lg font-medium">Response Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    You can move to the next question
                  </p>
                </div>
              ) : currentQuestion.responseType === "TEXT" ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your answer here..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    className="min-h-32 resize-none"
                    data-testid="input-text-answer"
                  />
                  <Button
                    onClick={submitTextAnswer}
                    disabled={!textAnswer.trim() || isUploading}
                    className="w-full gap-2"
                    data-testid="button-submit-text"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Answer
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {timeRemaining !== null && isRecording && (
                    <div className="flex items-center justify-center gap-2 text-lg font-mono">
                      <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                      {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")}
                    </div>
                  )}
                  
                  {!recordedBlob ? (
                    <div className="flex gap-2 justify-center">
                      {!isRecording ? (
                        <Button
                          onClick={startRecording}
                          disabled={!permissionGranted}
                          className="gap-2"
                          data-testid="button-start-recording"
                        >
                          <Play className="h-4 w-4" />
                          Start Recording
                        </Button>
                      ) : (
                        <Button
                          onClick={stopRecording}
                          variant="destructive"
                          className="gap-2"
                          data-testid="button-stop-recording"
                        >
                          <Square className="h-4 w-4" />
                          Stop Recording
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recordedUrl && (
                        <video
                          src={recordedUrl}
                          controls
                          className="w-full rounded-lg bg-black aspect-video"
                          data-testid="video-playback"
                        />
                      )}
                      <div className="flex gap-2">
                        {canRetake && (
                          <Button
                            onClick={handleRetake}
                            variant="outline"
                            className="flex-1 gap-2"
                            data-testid="button-retake"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Retake ({maxRetakes - retakeCount} left)
                          </Button>
                        )}
                        <Button
                          onClick={uploadVideoAndSubmit}
                          disabled={isUploading}
                          className="flex-1 gap-2"
                          data-testid="button-submit-video"
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Submit
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {currentQuestion.responseType === "VIDEO" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Camera Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      data-testid="video-preview"
                    />
                    {!permissionGranted && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90">
                        <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">Camera access required</p>
                        <Button onClick={requestCameraPermission} size="sm" data-testid="button-enable-camera">
                          Enable Camera
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant={cameraEnabled ? "secondary" : "outline"}
                      size="icon"
                      onClick={() => {
                        setCameraEnabled(!cameraEnabled);
                        streamRef.current?.getVideoTracks().forEach(track => {
                          track.enabled = !cameraEnabled;
                        });
                      }}
                      data-testid="button-toggle-camera"
                    >
                      {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant={micEnabled ? "secondary" : "outline"}
                      size="icon"
                      onClick={() => {
                        setMicEnabled(!micEnabled);
                        streamRef.current?.getAudioTracks().forEach(track => {
                          track.enabled = !micEnabled;
                        });
                      }}
                      data-testid="button-toggle-mic"
                    >
                      {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {interviewData.questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        setTextAnswer("");
                        setRecordedBlob(null);
                        if (recordedUrl) {
                          URL.revokeObjectURL(recordedUrl);
                          setRecordedUrl(null);
                        }
                        setRetakeCount(0);
                        setTimeRemaining(null);
                        if (q.responseType === "VIDEO" && !streamRef.current) {
                          requestCameraPermission();
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        idx === currentQuestionIndex
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      data-testid={`question-nav-${idx}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        completedQuestions.has(q.id)
                          ? "bg-green-500 text-white"
                          : idx === currentQuestionIndex
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {completedQuestions.has(q.id) ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="text-sm truncate flex-1">
                        {q.promptText.slice(0, 40)}{q.promptText.length > 40 ? "..." : ""}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {q.responseType === "VIDEO" ? "Video" : "Text"}
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {allQuestionsAnswered && (
              <Button
                onClick={handleComplete}
                disabled={completeMutation.isPending}
                className="w-full gap-2"
                size="lg"
                data-testid="button-complete-interview"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Complete Interview
                  </>
                )}
              </Button>
            )}

            {!allQuestionsAnswered && currentQuestionIndex < interviewData.questions.length - 1 && completedQuestions.has(currentQuestion.id) && (
              <Button
                onClick={moveToNextQuestion}
                variant="outline"
                className="w-full gap-2"
                data-testid="button-next-question"
              >
                Next Question
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
