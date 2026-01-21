import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Circle,
  Square,
  RefreshCw,
  Check,
  AlertTriangle,
  Camera,
  Loader2,
} from "lucide-react";

interface VideoRecorderProps {
  maxDurationSeconds: number;
  thinkingTimeSeconds?: number;
  maxRetakes?: number;
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel?: () => void;
  questionText?: string;
  questionNumber?: number;
  totalQuestions?: number;
  disabled?: boolean;
}

type RecorderState = 
  | "idle" 
  | "requesting_permissions" 
  | "ready" 
  | "thinking" 
  | "recording" 
  | "recorded" 
  | "error";

export function VideoRecorder({
  maxDurationSeconds,
  thinkingTimeSeconds = 0,
  maxRetakes = 3,
  onRecordingComplete,
  onCancel,
  questionText,
  questionNumber,
  totalQuestions,
  disabled = false,
}: VideoRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(maxDurationSeconds);
  const [thinkingRemaining, setThinkingRemaining] = useState(thinkingTimeSeconds);
  const [retakeCount, setRetakeCount] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestPermissions = useCallback(async () => {
    setState("requesting_permissions");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: true
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      setHasCamera(videoTracks.length > 0 && videoTracks[0].enabled);
      setHasMicrophone(audioTracks.length > 0 && audioTracks[0].enabled);
      
      setState("ready");
    } catch (err) {
      console.error("Permission error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera and microphone access denied. Please allow access in your browser settings.");
        } else if (err.name === "NotFoundError") {
          setError("No camera or microphone found. Please connect a device and try again.");
        } else {
          setError(`Error accessing camera: ${err.message}`);
        }
      }
      setState("error");
    }
  }, []);

  const startThinkingCountdown = useCallback(() => {
    if (thinkingTimeSeconds <= 0) {
      startRecording();
      return;
    }

    setState("thinking");
    setThinkingRemaining(thinkingTimeSeconds);

    timerRef.current = setInterval(() => {
      setThinkingRemaining(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [thinkingTimeSeconds]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    setState("recording");
    setTimeRemaining(maxDurationSeconds);
    chunksRef.current = [];
    startTimeRef.current = Date.now();

    const options = { mimeType: "video/webm;codecs=vp9,opus" };
    let mediaRecorder: MediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch {
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      } catch {
        mediaRecorder = new MediaRecorder(streamRef.current);
      }
    }

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      setRecordedBlob(blob);
      setRecordedDuration(duration);
      setState("recorded");
    };

    mediaRecorder.start(1000);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [maxDurationSeconds]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleRetake = useCallback(() => {
    if (retakeCount >= maxRetakes) return;
    
    setRetakeCount(prev => prev + 1);
    setRecordedBlob(null);
    setRecordedDuration(0);
    setState("ready");
    setTimeRemaining(maxDurationSeconds);

    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play();
    }
  }, [retakeCount, maxRetakes, maxDurationSeconds]);

  const handleSubmit = useCallback(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, recordedDuration);
    }
  }, [recordedBlob, recordedDuration, onRecordingComplete]);

  const playRecording = useCallback(() => {
    if (recordedBlob && videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = URL.createObjectURL(recordedBlob);
      videoRef.current.muted = false;
      videoRef.current.play();
    }
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    if (state === "idle" && !disabled) {
      requestPermissions();
    }
  }, [state, disabled, requestPermissions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = state === "recording" 
    ? ((maxDurationSeconds - timeRemaining) / maxDurationSeconds) * 100
    : state === "thinking"
    ? ((thinkingTimeSeconds - thinkingRemaining) / thinkingTimeSeconds) * 100
    : 0;

  const canRetake = retakeCount < maxRetakes;
  const retakesRemaining = maxRetakes - retakeCount;

  return (
    <Card className="w-full max-w-2xl mx-auto overflow-hidden">
      <CardContent className="p-0">
        {questionText && (
          <div className="p-4 bg-muted/50 border-b">
            {questionNumber && totalQuestions && (
              <Badge variant="secondary" className="mb-2">
                Question {questionNumber} of {totalQuestions}
              </Badge>
            )}
            <p className="text-lg font-medium">{questionText}</p>
          </div>
        )}

        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay={state !== "recorded"}
            data-testid="video-preview"
          />

          {state === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Initializing camera...</p>
              </div>
            </div>
          )}

          {state === "requesting_permissions" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                <p>Requesting camera access...</p>
                <p className="text-sm text-white/60 mt-2">Please allow camera and microphone access</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white p-4">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={requestPermissions}
                  data-testid="button-retry-permissions"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {state === "thinking" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-white">
                <div className="text-6xl font-bold mb-4">{thinkingRemaining}</div>
                <p className="text-lg">Get ready to answer...</p>
                <Progress value={progressPercent} className="w-48 mx-auto mt-4" />
              </div>
            </div>
          )}

          {state === "recording" && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">
                <Circle className="h-3 w-3 mr-1 fill-current" />
                REC
              </Badge>
              <Badge variant="secondary">{formatTime(timeRemaining)}</Badge>
            </div>
          )}

          {state === "recorded" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={playRecording}
                data-testid="button-play-recording"
              >
                <Video className="h-5 w-5 mr-2" />
                Play Recording
              </Button>
            </div>
          )}

          {(state === "ready" || state === "recording") && (
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Badge variant={hasCamera ? "default" : "destructive"}>
                {hasCamera ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
              </Badge>
              <Badge variant={hasMicrophone ? "default" : "destructive"}>
                {hasMicrophone ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              </Badge>
            </div>
          )}
        </div>

        {state === "recording" && (
          <Progress value={progressPercent} className="h-1 rounded-none" />
        )}

        <div className="p-4 space-y-4">
          {state === "ready" && (
            <div className="flex flex-col items-center gap-4">
              <Button 
                size="lg" 
                onClick={thinkingTimeSeconds > 0 ? startThinkingCountdown : startRecording}
                className="gap-2"
                data-testid="button-start-recording"
              >
                <Circle className="h-5 w-5 fill-current" />
                Start Recording
              </Button>
              <p className="text-sm text-muted-foreground">
                Max duration: {formatTime(maxDurationSeconds)}
                {thinkingTimeSeconds > 0 && ` • ${thinkingTimeSeconds}s prep time`}
              </p>
            </div>
          )}

          {state === "recording" && (
            <div className="flex justify-center">
              <Button 
                size="lg" 
                variant="destructive"
                onClick={stopRecording}
                className="gap-2"
                data-testid="button-stop-recording"
              >
                <Square className="h-5 w-5 fill-current" />
                Stop Recording
              </Button>
            </div>
          )}

          {state === "recorded" && (
            <div className="space-y-4">
              <div className="flex justify-center gap-3">
                {canRetake && (
                  <Button 
                    variant="outline"
                    onClick={handleRetake}
                    className="gap-2"
                    data-testid="button-retake"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retake ({retakesRemaining} left)
                  </Button>
                )}
                <Button 
                  onClick={handleSubmit}
                  className="gap-2"
                  data-testid="button-submit-recording"
                >
                  <Check className="h-4 w-4" />
                  Submit Answer
                </Button>
              </div>
              {onCancel && (
                <div className="text-center">
                  <Button variant="ghost" size="sm" onClick={onCancel}>
                    Cancel
                  </Button>
                </div>
              )}
              <p className="text-center text-sm text-muted-foreground">
                Recording duration: {formatTime(recordedDuration)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default VideoRecorder;
