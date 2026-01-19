import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant-context";
import { FOH_ROLES, BOH_ROLES, type Location } from "@shared/schema";
import { ArrowLeft, Clock } from "lucide-react";
import { Link } from "wouter";

const gigFormSchema = z.object({
  role: z.string().min(1, "Role is required"),
  description: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  payRate: z.coerce.number().min(1, "Pay rate is required"),
  acceptanceMode: z.enum(["INSTANT_BOOK", "APPROVAL_REQUIRED"]),
  emergency: z.boolean().default(false),
});

type GigFormValues = z.infer<typeof gigFormSchema>;

const allRoles = [...FOH_ROLES, ...BOH_ROLES];

export default function GigCreate() {
  const [, navigate] = useLocation();
  const { currentTenant } = useTenant();
  const { toast } = useToast();

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    enabled: !!currentTenant,
    refetchOnMount: "always",
  });

  const form = useForm<GigFormValues>({
    resolver: zodResolver(gigFormSchema),
    defaultValues: {
      role: "",
      description: "",
      locationId: "",
      startDate: "",
      startTime: "",
      endTime: "",
      payRate: 20,
      acceptanceMode: "APPROVAL_REQUIRED",
      emergency: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GigFormValues) => {
      const startAt = new Date(`${data.startDate}T${data.startTime}`);
      const endAt = new Date(`${data.startDate}T${data.endTime}`);
      if (endAt <= startAt) {
        endAt.setDate(endAt.getDate() + 1);
      }

      return apiRequest("POST", "/api/gigs", {
        tenantId: currentTenant?.id,
        role: data.role,
        description: data.description,
        locationId: data.locationId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        payRate: data.payRate,
        acceptanceMode: data.acceptanceMode,
        emergency: data.emergency,
      });
    },
    onSuccess: async (response) => {
      const gig = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/gigs"] });
      toast({ title: "Gig posted successfully" });
      navigate(`/app/gigs/${gig.id}`);
    },
    onError: () => {
      toast({ title: "Failed to post gig", variant: "destructive" });
    },
  });

  const onSubmit = (data: GigFormValues) => {
    createMutation.mutate(data);
  };

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to post a gig
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/app/gigs">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Gigs
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Post Gig Shift</h1>
          <p className="text-muted-foreground">
            Create a short-term gig shift for {currentTenant.name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Gig Details
            </CardTitle>
            <CardDescription>
              Fill in the shift details to post your gig
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gig-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gig-location">
                            <SelectValue placeholder="Select a location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {!locations?.length && (
                          <Link href="/app/locations" className="text-primary">
                            Add a location first
                          </Link>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements or notes for this shift..."
                          className="min-h-20 resize-none"
                          {...field}
                          data-testid="input-gig-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-gig-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-gig-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-gig-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="payRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Pay Rate ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="20"
                          {...field}
                          data-testid="input-gig-pay"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptanceMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Acceptance Mode</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-acceptance-mode">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="APPROVAL_REQUIRED">
                            Approval Required
                          </SelectItem>
                          <SelectItem value="INSTANT_BOOK">
                            Instant Book
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "INSTANT_BOOK"
                          ? "Verified workers can book immediately"
                          : "You'll review and approve each worker"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergency"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Urgent Shift</FormLabel>
                        <FormDescription>
                          Mark as urgent to prioritize in search results
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-emergency"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Link href="/app/gigs">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-post-gig"
                  >
                    {createMutation.isPending ? "Posting..." : "Post Gig"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
