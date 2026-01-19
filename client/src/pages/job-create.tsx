import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useTenant } from "@/lib/tenant-context";
import { FOH_ROLES, BOH_ROLES, type Location } from "@shared/schema";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Link } from "wouter";

const jobFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  role: z.string().min(1, "Role is required"),
  description: z.string().optional(),
  jobType: z.enum(["FULL_TIME", "PART_TIME"]),
  locationId: z.string().optional(),
  payRangeMin: z.coerce.number().min(0).optional(),
  payRangeMax: z.coerce.number().min(0).optional(),
  scheduleTags: z.array(z.string()).default([]),
  distributionChannels: z.array(z.string()).default(["KREW"]),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

const scheduleOptions = [
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Weekdays",
  "Weekends",
  "Flexible",
];

const distributionOptions = [
  { id: "KREW", label: "Krew Recruiter", description: "Always included" },
  { id: "INDEED", label: "Indeed", description: "Requires PRO plan" },
  { id: "ZIPRECRUITER", label: "ZipRecruiter", description: "Requires PRO plan" },
  { id: "AGGREGATOR", label: "Other Job Boards", description: "Via aggregator" },
];

const allRoles = [...FOH_ROLES, ...BOH_ROLES];

export default function JobCreate() {
  const [, navigate] = useLocation();
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const { data: locations } = useQuery<Location[]>({
    queryKey: ["/api/locations", currentTenant?.id],
    enabled: !!currentTenant,
  });

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      role: "",
      description: "",
      jobType: "FULL_TIME",
      locationId: "",
      payRangeMin: undefined,
      payRangeMax: undefined,
      scheduleTags: [],
      distributionChannels: ["KREW"],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: JobFormValues) => {
      return apiRequest("POST", "/api/jobs", {
        ...data,
        tenantId: currentTenant?.id,
      });
    },
    onSuccess: async (response) => {
      const job = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", currentTenant?.id] });
      toast({ title: "Job created successfully" });
      navigate(`/app/jobs/${job.id}`);
    },
    onError: () => {
      toast({ title: "Failed to create job", variant: "destructive" });
    },
  });

  const onSubmit = (data: JobFormValues) => {
    createMutation.mutate(data);
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (!currentTenant) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-muted-foreground">
          Select an organization to create a job
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/app/jobs">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Jobs
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create Job Posting</h1>
          <p className="text-muted-foreground">
            Create a new job posting for {currentTenant.name}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`mx-2 h-0.5 w-12 sm:w-24 ${
                    s < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mb-6 flex justify-between text-sm text-muted-foreground">
          <span>Details</span>
          <span>Compensation</span>
          <span>Distribution</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Details */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Details
                  </CardTitle>
                  <CardDescription>
                    Basic information about the position
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Lead Bartender"
                            {...field}
                            data-testid="input-job-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-job-role">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="" disabled>
                              -- Front of House --
                            </SelectItem>
                            {FOH_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                            <SelectItem value="" disabled>
                              -- Back of House --
                            </SelectItem>
                            {BOH_ROLES.map((role) => (
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
                    name="jobType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-job-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FULL_TIME">Full Time</SelectItem>
                            <SelectItem value="PART_TIME">Part Time</SelectItem>
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
                            <SelectTrigger data-testid="select-job-location">
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
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the role, responsibilities, and ideal candidate..."
                            className="min-h-32 resize-none"
                            {...field}
                            data-testid="input-job-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={nextStep} data-testid="button-next-step">
                      Next: Compensation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Compensation */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Compensation & Schedule</CardTitle>
                  <CardDescription>
                    Pay range and working hours information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payRangeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Hourly Rate ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="15"
                              {...field}
                              data-testid="input-pay-min"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payRangeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Hourly Rate ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="25"
                              {...field}
                              data-testid="input-pay-max"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="scheduleTags"
                    render={() => (
                      <FormItem>
                        <FormLabel>Schedule Preferences</FormLabel>
                        <FormDescription>
                          Select all that apply
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {scheduleOptions.map((option) => (
                            <FormField
                              key={option}
                              control={form.control}
                              name="scheduleTags"
                              render={({ field }) => (
                                <FormItem
                                  key={option}
                                  className="flex items-center space-x-2 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, option]);
                                        } else {
                                          field.onChange(
                                            current.filter((v) => v !== option)
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {option}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                    <Button type="button" onClick={nextStep} data-testid="button-next-distribution">
                      Next: Distribution
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Distribution */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Job Distribution</CardTitle>
                  <CardDescription>
                    Choose where to publish your job posting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="distributionChannels"
                    render={() => (
                      <FormItem>
                        <div className="space-y-3">
                          {distributionOptions.map((option) => (
                            <FormField
                              key={option.id}
                              control={form.control}
                              name="distributionChannels"
                              render={({ field }) => (
                                <FormItem
                                  key={option.id}
                                  className="flex items-start space-x-3 space-y-0 rounded-lg border border-border p-4"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.id)}
                                      disabled={option.id === "KREW"}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, option.id]);
                                        } else {
                                          field.onChange(
                                            current.filter((v) => v !== option.id)
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="font-medium cursor-pointer">
                                      {option.label}
                                    </FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                      {option.description}
                                    </p>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={createMutation.isPending}
                        data-testid="button-save-draft"
                      >
                        Save as Draft
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        data-testid="button-create-job"
                      >
                        {createMutation.isPending ? "Creating..." : "Create Job"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
