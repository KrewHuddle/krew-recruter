import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Zap, MapPin, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GigOptInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GigOptInModal({ open, onOpenChange }: GigOptInModalProps) {
  const [opted, setOpted] = useState(false);

  const optInMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/talent/me/gig-opt-in");
    },
    onSuccess: () => {
      setOpted(true);
      setTimeout(() => onOpenChange(false), 2000);
    },
  });

  if (opted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="py-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">You're in!</h3>
            <p className="text-sm text-muted-foreground">
              You'll get notified when restaurants near you need help.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Want to pick up extra shifts?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Join Krew Recruiter's Gig Portal and get notified when restaurants
            near you need last-minute help.
          </p>

          <div className="space-y-2">
            {[
              { icon: MapPin, text: "Get matched with shifts near you" },
              { icon: DollarSign, text: "Get paid same day via direct deposit" },
              { icon: Clock, text: "Work on your own schedule" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => optInMutation.mutate()}
            disabled={optInMutation.isPending}
          >
            Yes, add me to the gig portal
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            No thanks
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
