import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Mic,
  Monitor,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface SystemCheckProps {
  onComplete: () => void;
  onCancel?: () => void;
}

interface CheckResult {
  status: "pending" | "checking" | "passed" | "failed";
  message?: string;
}

export function SystemCheck({ onComplete, onCancel }: SystemCheckProps) {
  const [cameraCheck, setCameraCheck] = useState<CheckResult>({ status: "pending" });
  const [micCheck, setMicCheck] = useState<CheckResult>({ status: "pending" });
  const [browserCheck, setBrowserCheck] = useState<CheckResult>({ status: "pending" });
  const [isChecking, setIsChecking] = useState(false);
  const [allPassed, setAllPassed] = useState(false);

  const checkBrowserSupport = async () => {
    setBrowserCheck({ status: "checking" });
    
    const hasMediaDevices = !!navigator.mediaDevices;
    const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
    const hasMediaRecorder = typeof MediaRecorder !== "undefined";
    
    if (hasMediaDevices && hasGetUserMedia && hasMediaRecorder) {
      setBrowserCheck({ status: "passed", message: "Browser supports video recording" });
      return true;
    } else {
      setBrowserCheck({ 
        status: "failed", 
        message: "Browser doesn't support video recording. Please use Chrome, Firefox, or Safari."
      });
      return false;
    }
  };

  const checkCamera = async () => {
    setCameraCheck({ status: "checking" });
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(d => d.kind === "videoinput");
      
      if (!hasCamera) {
        setCameraCheck({ status: "failed", message: "No camera detected" });
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      setCameraCheck({ status: "passed", message: "Camera access granted" });
      return true;
    } catch (err) {
      const error = err as Error;
      if (error.name === "NotAllowedError") {
        setCameraCheck({ status: "failed", message: "Camera access denied. Please allow access." });
      } else if (error.name === "NotFoundError") {
        setCameraCheck({ status: "failed", message: "No camera found" });
      } else {
        setCameraCheck({ status: "failed", message: error.message });
      }
      return false;
    }
  };

  const checkMicrophone = async () => {
    setMicCheck({ status: "checking" });
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some(d => d.kind === "audioinput");
      
      if (!hasMic) {
        setMicCheck({ status: "failed", message: "No microphone detected" });
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setMicCheck({ status: "passed", message: "Microphone access granted" });
      return true;
    } catch (err) {
      const error = err as Error;
      if (error.name === "NotAllowedError") {
        setMicCheck({ status: "failed", message: "Microphone access denied. Please allow access." });
      } else if (error.name === "NotFoundError") {
        setMicCheck({ status: "failed", message: "No microphone found" });
      } else {
        setMicCheck({ status: "failed", message: error.message });
      }
      return false;
    }
  };

  const runAllChecks = async () => {
    setIsChecking(true);
    setAllPassed(false);
    
    setCameraCheck({ status: "pending" });
    setMicCheck({ status: "pending" });
    setBrowserCheck({ status: "pending" });

    const browserOk = await checkBrowserSupport();
    if (!browserOk) {
      setIsChecking(false);
      return;
    }

    const cameraOk = await checkCamera();
    const micOk = await checkMicrophone();

    setAllPassed(browserOk && cameraOk && micOk);
    setIsChecking(false);
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  const getStatusIcon = (status: CheckResult["status"]) => {
    switch (status) {
      case "pending":
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
      case "checking":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: CheckResult["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Waiting</Badge>;
      case "checking":
        return <Badge variant="secondary">Checking...</Badge>;
      case "passed":
        return <Badge className="bg-green-500">Passed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Monitor className="h-6 w-6" />
          System Check
        </CardTitle>
        <CardDescription>
          We'll check your camera and microphone before starting the interview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(browserCheck.status)}
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Browser Support
                </p>
                {browserCheck.message && (
                  <p className="text-sm text-muted-foreground">{browserCheck.message}</p>
                )}
              </div>
            </div>
            {getStatusBadge(browserCheck.status)}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(cameraCheck.status)}
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Camera Access
                </p>
                {cameraCheck.message && (
                  <p className="text-sm text-muted-foreground">{cameraCheck.message}</p>
                )}
              </div>
            </div>
            {getStatusBadge(cameraCheck.status)}
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(micCheck.status)}
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Microphone Access
                </p>
                {micCheck.message && (
                  <p className="text-sm text-muted-foreground">{micCheck.message}</p>
                )}
              </div>
            </div>
            {getStatusBadge(micCheck.status)}
          </div>
        </div>

        <div className="flex gap-3 justify-center pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          
          {!allPassed && !isChecking && (
            <Button variant="outline" onClick={runAllChecks} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Run Checks Again
            </Button>
          )}

          <Button 
            onClick={onComplete} 
            disabled={!allPassed || isChecking}
            className="gap-2"
            data-testid="button-continue-interview"
          >
            Continue to Interview
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {!allPassed && !isChecking && (
          <p className="text-center text-sm text-muted-foreground">
            Please resolve the issues above before continuing
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SystemCheck;
