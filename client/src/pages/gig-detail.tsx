import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/lib/tenant-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Star,
  User,
  Loader2,
  Phone,
  Mail,
} from "lucide-react";
import { useState } from "react";
import type { GigPost, Location, GigAssignment, GigWorkerProfile, UserProfile } from "@shared/schema";

type GigPostWithRelations = GigPost & {
  location?: Location;
};

type GigApplicant = GigAssignment & {
  workerProfile?: GigWorkerProfile;
  userProfile?: UserProfile;
  avgRating?: string | null;
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  CHECKED_IN: { label: "Checked In", variant: "default" },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  NO_SHOW: { label: "No Show", variant: "destructive" },
};

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<GigApplicant | null>(null);
  const [hoursWorked, setHoursWorked] = useState("");

  const { data: gig, isLoading: loadingGig } = useQuery<GigPostWithRelations>({
    queryKey: ["/api/gigs", id],
    enabled: !!currentTenant && !!id,
  });

  const { data: applicants, isLoading: loadingApplicants } = useQuery<GigApplicant[]>({
    queryKey: ["/api/gigs", id, "applicants"],
    enabled: !!currentTenant && !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/gigs/assignments/${assignmentId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gigs", id, "applicants"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ assignmentId, hoursWorked }: { assignmentId: string; hoursWorked: number }) => {
      const res = await apiRequest("POST", `/api/gigs/assignments/${assignmentId}/complete`, { hoursWorked });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gigs", id, "applicants"] });
      setShowCompleteDialog(false);
      setSelectedAssignment(null);
      setHoursWorked("");
      toast({ title: "Gig marked as completed", description: "Payout has been calculated" });
    },
    onError: (error: any) => {
      toast({
        title: "Completion failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (assignment: GigApplicant) => {
    updateStatusMutation.mutate({ assignmentId: assignment.id, status: "CONFIRMED" });
  };

  const handleReject = (assignment: GigApplicant) => {
    updateStatusMutation.mutate({ assignmentId: assignment.id, status: "CANCELLED" });
  };

  const handleCheckIn = (assignment: GigApplicant) => {
    updateStatusMutation.mutate({ assignmentId: assignment.id, status: "CHECKED_IN" });
  };

  const handleComplete = (assignment: GigApplicant) => {
    setSelectedAssignment(assignment);
    if (gig?.startAt && gig?.endAt) {
      const hours = (new Date(gig.endAt).getTime() - new Date(gig.startAt).getTime()) / (1000 * 60 * 60);
      setHoursWorked(hours.toFixed(1));
    }
    setShowCompleteDialog(true);
  };

  const handleNoShow = (assignment: GigApplicant) => {
    updateStatusMutation.mutate({ assignmentId: assignment.id, status: "NO_SHOW" });
  };

  const pendingApplicants = applicants?.filter((a) => a.status === "PENDING") || [];
  const confirmedApplicants = applicants?.filter((a) => a.status === "CONFIRMED" || a.status === "CHECKED_IN") || [];
  const completedApplicants = applicants?.filter((a) => a.status === "COMPLETED") || [];
  const cancelledApplicants = applicants?.filter((a) => a.status === "CANCELLED" || a.status === "NO_SHOW") || [];

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Select an organization to view gig details</p>
      </div>
    );
  }

  if (loadingGig) {
    return (
      <div className="flex-1 space-y-6 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">Gig not found</p>
        <Link href="/app/gigs">
          <Button variant="outline" className="mt-4">Back to Gigs</Button>
        </Link>
      </div>
    );
  }

  const renderApplicantCard = (applicant: GigApplicant) => {
    const statusInfo = statusConfig[applicant.status] || statusConfig.PENDING;
    const initials = applicant.userProfile
      ? `${applicant.userProfile.firstName?.[0] || ""}${applicant.userProfile.lastName?.[0] || ""}`.toUpperCase() || "?"
      : "?";

    return (
      <Card key={applicant.id} className="hover-elevate" data-testid={`applicant-card-${applicant.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {applicant.userProfile
                      ? `${applicant.userProfile.firstName} ${applicant.userProfile.lastName}`
                      : "Unknown Worker"}
                  </h3>
                  {applicant.avgRating && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {applicant.avgRating}/5 rating
                    </div>
                  )}
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>

              {applicant.userProfile && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {applicant.userProfile.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {applicant.userProfile.email}
                    </div>
                  )}
                  {applicant.userProfile.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {applicant.userProfile.phone}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {applicant.status === "PENDING" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(applicant)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-approve-${applicant.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(applicant)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-reject-${applicant.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}
                {applicant.status === "CONFIRMED" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(applicant)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-checkin-${applicant.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNoShow(applicant)}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-noshow-${applicant.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      No Show
                    </Button>
                  </>
                )}
                {applicant.status === "CHECKED_IN" && (
                  <Button
                    size="sm"
                    onClick={() => handleComplete(applicant)}
                    disabled={updateStatusMutation.isPending}
                    data-testid={`button-complete-${applicant.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete & Pay
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/gigs")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{gig.role}</h1>
          <p className="text-muted-foreground">{gig.location?.name || "No location"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Gig Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={gig.status === "OPEN" ? "default" : "secondary"}>{gig.status}</Badge>
            </div>
            {gig.emergency && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Urgent Fill</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {gig.startAt
                ? new Date(gig.startAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "TBD"}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {gig.startAt && gig.endAt
                ? `${new Date(gig.startAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })} - ${new Date(gig.endAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "Time TBD"}
            </div>
            {gig.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {gig.location.city ? `${gig.location.name}, ${gig.location.city}` : gig.location.name}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">${gig.payRate}/hr</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>1 slot available</span>
            </div>
            {gig.description && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">{gig.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Applicants ({applicants?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingApplicants ? (
              <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : applicants && applicants.length > 0 ? (
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-4" data-testid="tabs-applicants">
                  <TabsTrigger value="pending">Pending ({pendingApplicants.length})</TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmed ({confirmedApplicants.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedApplicants.length})</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled ({cancelledApplicants.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4 space-y-4">
                  {pendingApplicants.length > 0 ? (
                    pendingApplicants.map(renderApplicantCard)
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No pending applicants</p>
                  )}
                </TabsContent>

                <TabsContent value="confirmed" className="mt-4 space-y-4">
                  {confirmedApplicants.length > 0 ? (
                    confirmedApplicants.map(renderApplicantCard)
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No confirmed workers</p>
                  )}
                </TabsContent>

                <TabsContent value="completed" className="mt-4 space-y-4">
                  {completedApplicants.length > 0 ? (
                    completedApplicants.map(renderApplicantCard)
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No completed workers</p>
                  )}
                </TabsContent>

                <TabsContent value="cancelled" className="mt-4 space-y-4">
                  {cancelledApplicants.length > 0 ? (
                    cancelledApplicants.map(renderApplicantCard)
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No cancelled applicants</p>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">No applicants yet</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Workers will appear here when they apply for this gig.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Gig & Calculate Payout</DialogTitle>
            <DialogDescription>
              Enter the hours worked to calculate the payout for{" "}
              {selectedAssignment?.userProfile
                ? `${selectedAssignment.userProfile.firstName} ${selectedAssignment.userProfile.lastName}`
                : "this worker"}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours Worked</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(e.target.value)}
                placeholder="Enter hours worked"
                data-testid="input-hours-worked"
              />
            </div>
            {hoursWorked && gig.payRate && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span>Pay Rate</span>
                  <span>${gig.payRate}/hr</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Hours</span>
                  <span>{hoursWorked} hrs</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Subtotal</span>
                  <span>${(parseFloat(hoursWorked) * parseFloat(String(gig.payRate))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 text-muted-foreground">
                  <span>Platform Fee (10%)</span>
                  <span>-${(parseFloat(hoursWorked) * parseFloat(String(gig.payRate)) * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                  <span>Worker Payout</span>
                  <span className="text-primary">
                    ${(parseFloat(hoursWorked) * parseFloat(String(gig.payRate)) * 0.9).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAssignment && hoursWorked) {
                  completeMutation.mutate({
                    assignmentId: selectedAssignment.id,
                    hoursWorked: parseFloat(hoursWorked),
                  });
                }
              }}
              disabled={!hoursWorked || completeMutation.isPending}
              data-testid="button-confirm-complete"
            >
              {completeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Complete & Calculate Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
