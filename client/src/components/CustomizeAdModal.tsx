import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, X, Loader2 } from "lucide-react";

interface CustomizeAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAd: {
    headline: string;
    jobTitle: string;
    location: string;
    pay: string;
    requirements: string[];
    benefits: string[];
    companyName: string;
  };
  onRegenerate: (instructions: string) => Promise<void>;
}

const SUGGESTIONS = [
  "Make the tone more casual and friendly",
  "Emphasize experience required",
  "Hide the salary and say 'Competitive Pay'",
  "Highlight the benefits more",
  "Make it shorter and punchier",
  "Add urgency — we need someone ASAP",
];

export function CustomizeAdModal({
  isOpen,
  onClose,
  currentAd,
  onRegenerate,
}: CustomizeAdModalProps) {
  const [instructions, setInstructions] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  if (!isOpen) return null;

  const handleRegenerate = async () => {
    if (!instructions.trim()) return;
    setRegenerating(true);
    try {
      await onRegenerate(instructions);
      onClose();
    } finally {
      setRegenerating(false);
    }
  };

  const appendSuggestion = (text: string) => {
    setInstructions(prev => {
      if (prev.trim()) return prev + "\n" + text;
      return text;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 border">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">Customize your ad</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Describe the changes you want and we'll regenerate the ad for you.
          </p>

          {/* Current ad summary */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium">{currentAd.headline}</p>
            <p className="text-muted-foreground">
              {currentAd.companyName} &bull; {currentAd.location}
              {currentAd.pay ? ` &bull; ${currentAd.pay}` : ""}
            </p>
          </div>

          <Textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Describe the changes you want to make..."
            rows={4}
            className="mb-4"
          />

          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => appendSuggestion(suggestion)}
                className="px-2.5 py-1 rounded-full text-xs border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mb-5">
            Colors and logo are managed in{" "}
            <Link
              href="/campaign/team?tab=branding"
              className="text-primary underline"
              onClick={onClose}
            >
              organization settings
            </Link>
            .
          </p>

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleRegenerate}
              disabled={!instructions.trim() || regenerating}
            >
              {regenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
