import {
  tenants,
  tenantMemberships,
  locations,
  jobs,
  applications,
  gigPosts,
  gigAssignments,
  gigPayouts,
  gigRatings,
  interviewTemplates,
  interviewQuestions,
  interviewInvites,
  interviewResponses,
  integrationConnections,
  jobDistributionChannels,
  sponsoredCampaigns,
  workerProfiles,
  userProfiles,
  savedJobs,
  tenantBilling,
  workerPayoutAccounts,
  subscriptionEvents,
  featureFlags,
  coupons,
  couponRedemptions,
  smsMessages,
  interviewSlots,
  interviewBookings,
  jobTemplates,
  messageTemplates,
  backgroundCheckRequests,
  onboardingDocuments,
  onboardingChecklists,
  impersonationSessions,
  tenantUsageMetrics,
  type Tenant,
  type InsertTenant,
  type TenantMembership,
  type InsertTenantMembership,
  type Location,
  type InsertLocation,
  type Job,
  type InsertJob,
  type Application,
  type InsertApplication,
  type GigPost,
  type InsertGigPost,
  type GigAssignment,
  type InsertGigAssignment,
  type GigPayout,
  type InsertGigPayout,
  type GigRating,
  type InsertGigRating,
  type InterviewTemplate,
  type InsertInterviewTemplate,
  type InterviewQuestion,
  type InsertInterviewQuestion,
  type InterviewInvite,
  type InsertInterviewInvite,
  type IntegrationConnection,
  type InsertIntegrationConnection,
  type JobDistributionChannel,
  type InsertJobDistributionChannel,
  type SponsoredCampaign,
  type InsertSponsoredCampaign,
  type WorkerProfile,
  type InsertWorkerProfile,
  type UserProfile,
  type InsertUserProfile,
  type SavedJob,
  type InsertSavedJob,
  type TenantBilling,
  type InsertTenantBilling,
  type WorkerPayoutAccount,
  type InsertWorkerPayoutAccount,
  type InterviewResponse,
  type InsertInterviewResponse,
  type SubscriptionEvent,
  type InsertSubscriptionEvent,
  type FeatureFlag,
  type InsertFeatureFlag,
  type Coupon,
  type InsertCoupon,
  type CouponRedemption,
  type InsertCouponRedemption,
  type SmsMessage,
  type InsertSmsMessage,
  type InterviewSlot,
  type InsertInterviewSlot,
  type InterviewBooking,
  type InsertInterviewBooking,
  type JobTemplate,
  type InsertJobTemplate,
  type MessageTemplate,
  type InsertMessageTemplate,
  type BackgroundCheckRequest,
  type InsertBackgroundCheckRequest,
  type OnboardingDocument,
  type InsertOnboardingDocument,
  type OnboardingChecklist,
  type InsertOnboardingChecklist,
  type ImpersonationSession,
  type InsertImpersonationSession,
  type TenantUsageMetrics,
  type InsertTenantUsageMetrics,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, isNull } from "drizzle-orm";

export interface IStorage {
  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(data: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;

  // Memberships
  getMembershipsByUser(userId: string): Promise<(TenantMembership & { tenant: Tenant })[]>;
  getMembershipsByTenant(tenantId: string): Promise<TenantMembership[]>;
  getMembership(tenantId: string, userId: string): Promise<TenantMembership | undefined>;
  createMembership(data: InsertTenantMembership): Promise<TenantMembership>;
  updateMembership(id: string, data: Partial<InsertTenantMembership>): Promise<TenantMembership | undefined>;

  // Locations
  getLocationsByTenant(tenantId: string): Promise<Location[]>;
  getLocation(id: string): Promise<Location | undefined>;
  createLocation(data: InsertLocation): Promise<Location>;
  updateLocation(id: string, data: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: string): Promise<boolean>;

  // Jobs
  getJobsByTenant(tenantId: string): Promise<Job[]>;
  getJob(id: string): Promise<Job | undefined>;
  createJob(data: InsertJob): Promise<Job>;
  updateJob(id: string, data: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;

  // Applications
  getApplicationsByTenant(tenantId: string): Promise<Application[]>;
  getApplicationsByJob(jobId: string): Promise<Application[]>;
  getApplication(id: string): Promise<Application | undefined>;
  createApplication(data: InsertApplication): Promise<Application>;
  updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application | undefined>;

  // Gig Posts
  getGigPostsByTenant(tenantId: string): Promise<GigPost[]>;
  getPublicGigPosts(): Promise<GigPost[]>;
  getGigPost(id: string): Promise<GigPost | undefined>;
  createGigPost(data: InsertGigPost): Promise<GigPost>;
  updateGigPost(id: string, data: Partial<InsertGigPost>): Promise<GigPost | undefined>;
  deleteGigPost(id: string): Promise<boolean>;

  // Gig Assignments
  getGigAssignmentsByGig(gigPostId: string): Promise<GigAssignment[]>;
  getGigAssignmentsByWorker(workerUserId: string): Promise<GigAssignment[]>;
  getGigAssignment(id: string): Promise<GigAssignment | undefined>;
  getGigAssignmentByGigAndWorker(gigPostId: string, workerUserId: string): Promise<GigAssignment | undefined>;
  createGigAssignment(data: InsertGigAssignment): Promise<GigAssignment>;
  updateGigAssignment(id: string, data: Partial<InsertGigAssignment>): Promise<GigAssignment | undefined>;
  
  // Gig Payouts
  getGigPayoutsByTenant(tenantId: string): Promise<GigPayout[]>;
  getGigPayoutsByWorker(workerUserId: string): Promise<GigPayout[]>;
  getGigPayoutByAssignment(gigAssignmentId: string): Promise<GigPayout | undefined>;
  getAllGigPayouts(): Promise<GigPayout[]>;
  getPlatformRevenue(): Promise<{ totalRevenue: number; totalPayouts: number; platformFees: number; completedPayouts: number; pendingPayouts: number }>;
  createGigPayout(data: InsertGigPayout): Promise<GigPayout>;
  updateGigPayout(id: string, data: Partial<InsertGigPayout>): Promise<GigPayout | undefined>;
  
  // Gig Ratings
  getGigRatingsByAssignment(gigAssignmentId: string): Promise<GigRating[]>;
  getGigRatingsByUser(userId: string): Promise<GigRating[]>;
  getAverageRatingForUser(userId: string): Promise<number | null>;
  createGigRating(data: InsertGigRating): Promise<GigRating>;
  hasUserRatedAssignment(gigAssignmentId: string, raterUserId: string): Promise<boolean>;

  // Interview Templates
  getInterviewTemplatesByTenant(tenantId: string): Promise<InterviewTemplate[]>;
  getInterviewTemplate(id: string): Promise<InterviewTemplate | undefined>;
  createInterviewTemplate(data: InsertInterviewTemplate): Promise<InterviewTemplate>;
  updateInterviewTemplate(id: string, data: Partial<InsertInterviewTemplate>): Promise<InterviewTemplate | undefined>;
  deleteInterviewTemplate(id: string): Promise<boolean>;

  // Interview Questions
  getQuestionsByTemplate(templateId: string): Promise<InterviewQuestion[]>;
  createInterviewQuestion(data: InsertInterviewQuestion): Promise<InterviewQuestion>;
  deleteInterviewQuestion(id: string): Promise<boolean>;

  // Interview Invites
  getInterviewInvitesByTenant(tenantId: string): Promise<InterviewInvite[]>;
  getInterviewInvite(id: string): Promise<InterviewInvite | undefined>;
  getInterviewInviteByToken(token: string): Promise<InterviewInvite | undefined>;
  createInterviewInvite(data: InsertInterviewInvite): Promise<InterviewInvite>;
  updateInterviewInvite(id: string, data: Partial<InsertInterviewInvite>): Promise<InterviewInvite | undefined>;

  // Interview Responses
  getInterviewResponsesByInvite(inviteId: string): Promise<InterviewResponse[]>;
  getInterviewResponse(inviteId: string, questionId: string): Promise<InterviewResponse | undefined>;
  createInterviewResponse(data: InsertInterviewResponse): Promise<InterviewResponse>;
  updateInterviewResponse(id: string, data: Partial<InsertInterviewResponse>): Promise<InterviewResponse | undefined>;

  // Dashboard Stats
  getDashboardStats(tenantId: string): Promise<{
    totalJobs: number;
    activeJobs: number;
    totalApplicants: number;
    newApplicants: number;
    openGigs: number;
    pendingAssignments: number;
  }>;

  // Public Jobs
  getPublishedJobs(): Promise<Job[]>;

  // Worker Profiles
  getWorkerProfile(userId: string): Promise<WorkerProfile | undefined>;
  createWorkerProfile(data: InsertWorkerProfile): Promise<WorkerProfile>;
  updateWorkerProfile(userId: string, data: Partial<InsertWorkerProfile>): Promise<WorkerProfile | undefined>;

  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(data: InsertUserProfile): Promise<UserProfile>;

  // Applications for workers
  getApplicationsByWorker(userId: string): Promise<Application[]>;

  // Saved Jobs
  getSavedJobsByUser(userId: string): Promise<SavedJob[]>;
  saveJob(data: InsertSavedJob): Promise<SavedJob>;
  unsaveJob(userId: string, jobId: string): Promise<boolean>;

  // Integration Connections
  getIntegrationConnectionsByTenant(tenantId: string): Promise<IntegrationConnection[]>;
  getIntegrationConnection(id: string): Promise<IntegrationConnection | undefined>;
  createIntegrationConnection(data: InsertIntegrationConnection): Promise<IntegrationConnection>;
  updateIntegrationConnection(id: string, data: Partial<InsertIntegrationConnection>): Promise<IntegrationConnection | undefined>;
  deleteIntegrationConnection(id: string): Promise<boolean>;

  // Job Distribution Channels
  getDistributionChannelsByJob(jobId: string): Promise<JobDistributionChannel[]>;
  getDistributionChannelsByTenant(tenantId: string): Promise<JobDistributionChannel[]>;
  createDistributionChannel(data: InsertJobDistributionChannel): Promise<JobDistributionChannel>;
  updateDistributionChannel(id: string, data: Partial<InsertJobDistributionChannel>): Promise<JobDistributionChannel | undefined>;
  deleteDistributionChannel(id: string): Promise<boolean>;

  // Admin - Platform-wide operations
  getAllTenants(): Promise<Tenant[]>;
  getAllUserProfiles(): Promise<UserProfile[]>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  getAdminStats(): Promise<{
    totalTenants: number;
    totalUsers: number;
    totalJobs: number;
    totalApplications: number;
    totalGigs: number;
  }>;

  // Billing
  getTenantBilling(tenantId: string): Promise<TenantBilling | undefined>;
  createTenantBilling(data: InsertTenantBilling): Promise<TenantBilling>;
  updateTenantBilling(tenantId: string, data: Partial<InsertTenantBilling>): Promise<TenantBilling | undefined>;

  // Worker Payout Accounts
  getWorkerPayoutAccount(userId: string): Promise<WorkerPayoutAccount | undefined>;
  createWorkerPayoutAccount(data: InsertWorkerPayoutAccount): Promise<WorkerPayoutAccount>;
  updateWorkerPayoutAccount(userId: string, data: Partial<InsertWorkerPayoutAccount>): Promise<WorkerPayoutAccount | undefined>;

  // Subscription Events
  createSubscriptionEvent(data: InsertSubscriptionEvent): Promise<SubscriptionEvent>;
  getSubscriptionEventsByTenant(tenantId: string): Promise<SubscriptionEvent[]>;
  getAllSubscriptionEvents(): Promise<SubscriptionEvent[]>;
  getMrrByMonth(): Promise<{ month: string; mrr: number; arr: number }[]>;
  getChurnRate(): Promise<{ rate: number; churned: number; total: number }>;

  // Feature Flags
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(id: string): Promise<FeatureFlag | undefined>;
  getFeatureFlagByName(name: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(data: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined>;
  deleteFeatureFlag(id: string): Promise<boolean>;
  isFeatureEnabled(name: string, tenantId?: string, planType?: string): Promise<boolean>;

  // Coupons
  getAllCoupons(): Promise<Coupon[]>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(data: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<InsertCoupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;
  validateCoupon(code: string): Promise<{ valid: boolean; coupon?: Coupon; error?: string }>;
  redeemCoupon(couponId: string, tenantId: string): Promise<CouponRedemption>;
  getCouponRedemptionsByTenant(tenantId: string): Promise<CouponRedemption[]>;

  // SMS Messages
  createSmsMessage(data: InsertSmsMessage): Promise<SmsMessage>;
  getSmsMessagesByTenant(tenantId: string): Promise<SmsMessage[]>;
  getSmsMessage(id: string): Promise<SmsMessage | undefined>;
  updateSmsMessage(id: string, data: Partial<InsertSmsMessage>): Promise<SmsMessage | undefined>;

  // Interview Slots
  getInterviewSlotsByTenant(tenantId: string): Promise<InterviewSlot[]>;
  getInterviewSlot(id: string): Promise<InterviewSlot | undefined>;
  createInterviewSlot(data: InsertInterviewSlot): Promise<InterviewSlot>;
  updateInterviewSlot(id: string, data: Partial<InsertInterviewSlot>): Promise<InterviewSlot | undefined>;
  deleteInterviewSlot(id: string): Promise<boolean>;

  // Interview Bookings
  getInterviewBookingsBySlot(slotId: string): Promise<InterviewBooking[]>;
  getInterviewBooking(id: string): Promise<InterviewBooking | undefined>;
  createInterviewBooking(data: InsertInterviewBooking): Promise<InterviewBooking>;
  updateInterviewBooking(id: string, data: Partial<InsertInterviewBooking>): Promise<InterviewBooking | undefined>;

  // Job Templates
  getJobTemplates(tenantId?: string): Promise<JobTemplate[]>;
  getSystemJobTemplates(): Promise<JobTemplate[]>;
  getJobTemplate(id: string): Promise<JobTemplate | undefined>;
  createJobTemplate(data: InsertJobTemplate): Promise<JobTemplate>;
  updateJobTemplate(id: string, data: Partial<InsertJobTemplate>): Promise<JobTemplate | undefined>;
  deleteJobTemplate(id: string): Promise<boolean>;

  // Message Templates
  getMessageTemplates(tenantId?: string): Promise<MessageTemplate[]>;
  getSystemMessageTemplates(): Promise<MessageTemplate[]>;
  getMessageTemplate(id: string): Promise<MessageTemplate | undefined>;
  createMessageTemplate(data: InsertMessageTemplate): Promise<MessageTemplate>;
  updateMessageTemplate(id: string, data: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined>;
  deleteMessageTemplate(id: string): Promise<boolean>;

  // Background Check Requests
  getBackgroundChecksByTenant(tenantId: string): Promise<BackgroundCheckRequest[]>;
  getBackgroundCheck(id: string): Promise<BackgroundCheckRequest | undefined>;
  createBackgroundCheck(data: InsertBackgroundCheckRequest): Promise<BackgroundCheckRequest>;
  updateBackgroundCheck(id: string, data: Partial<InsertBackgroundCheckRequest>): Promise<BackgroundCheckRequest | undefined>;

  // Onboarding Documents
  getOnboardingDocumentsByTenant(tenantId: string): Promise<OnboardingDocument[]>;
  getOnboardingDocumentsByApplication(applicationId: string): Promise<OnboardingDocument[]>;
  getOnboardingDocument(id: string): Promise<OnboardingDocument | undefined>;
  createOnboardingDocument(data: InsertOnboardingDocument): Promise<OnboardingDocument>;
  updateOnboardingDocument(id: string, data: Partial<InsertOnboardingDocument>): Promise<OnboardingDocument | undefined>;

  // Onboarding Checklists
  getOnboardingChecklistsByTenant(tenantId: string): Promise<OnboardingChecklist[]>;
  getOnboardingChecklistsByApplication(applicationId: string): Promise<OnboardingChecklist[]>;
  getOnboardingChecklist(id: string): Promise<OnboardingChecklist | undefined>;
  createOnboardingChecklist(data: InsertOnboardingChecklist): Promise<OnboardingChecklist>;
  updateOnboardingChecklist(id: string, data: Partial<InsertOnboardingChecklist>): Promise<OnboardingChecklist | undefined>;

  // Impersonation Sessions
  createImpersonationSession(data: InsertImpersonationSession): Promise<ImpersonationSession>;
  getActiveImpersonationSession(adminUserId: string): Promise<ImpersonationSession | undefined>;
  endImpersonationSession(id: string): Promise<ImpersonationSession | undefined>;

  // Tenant Usage Metrics
  getTenantUsageMetrics(tenantId: string): Promise<TenantUsageMetrics[]>;
  upsertTenantUsageMetrics(data: InsertTenantUsageMetrics): Promise<TenantUsageMetrics>;
  getTenantHealthScores(): Promise<{ tenantId: string; tenantName: string; healthScore: number; metrics: TenantUsageMetrics | null }[]>;
}

export class DatabaseStorage implements IStorage {
  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async createTenant(data: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(data).returning();
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant || undefined;
  }

  // Memberships
  async getMembershipsByUser(userId: string): Promise<(TenantMembership & { tenant: Tenant })[]> {
    const rows = await db
      .select()
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
      .where(eq(tenantMemberships.userId, userId));
    return rows.map((row) => ({
      ...row.tenant_memberships,
      tenant: row.tenants,
    }));
  }

  async getMembershipsByTenant(tenantId: string): Promise<TenantMembership[]> {
    return db.select().from(tenantMemberships).where(eq(tenantMemberships.tenantId, tenantId));
  }

  async getMembership(tenantId: string, userId: string): Promise<TenantMembership | undefined> {
    const [membership] = await db
      .select()
      .from(tenantMemberships)
      .where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.userId, userId)));
    return membership || undefined;
  }

  async createMembership(data: InsertTenantMembership): Promise<TenantMembership> {
    const [membership] = await db.insert(tenantMemberships).values(data).returning();
    return membership;
  }

  async updateMembership(id: string, data: Partial<InsertTenantMembership>): Promise<TenantMembership | undefined> {
    const [membership] = await db
      .update(tenantMemberships)
      .set(data)
      .where(eq(tenantMemberships.id, id))
      .returning();
    return membership || undefined;
  }

  // Locations
  async getLocationsByTenant(tenantId: string): Promise<Location[]> {
    return db.select().from(locations).where(eq(locations.tenantId, tenantId));
  }

  async getLocation(id: string): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async createLocation(data: InsertLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(data).returning();
    return location;
  }

  async updateLocation(id: string, data: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return location || undefined;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  // Jobs
  async getJobsByTenant(tenantId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.tenantId, tenantId)).orderBy(desc(jobs.createdAt));
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(data: InsertJob): Promise<Job> {
    const [job] = await db.insert(jobs).values(data).returning();
    return job;
  }

  async updateJob(id: string, data: Partial<InsertJob>): Promise<Job | undefined> {
    const [job] = await db
      .update(jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return job || undefined;
  }

  async deleteJob(id: string): Promise<boolean> {
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
  }

  // Applications
  async getApplicationsByTenant(tenantId: string): Promise<Application[]> {
    return db
      .select()
      .from(applications)
      .where(eq(applications.tenantId, tenantId))
      .orderBy(desc(applications.appliedAt));
  }

  async getApplicationsByJob(jobId: string): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.jobId, jobId));
  }

  async getApplication(id: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async createApplication(data: InsertApplication): Promise<Application> {
    const [application] = await db.insert(applications).values(data).returning();
    return application;
  }

  async updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application || undefined;
  }

  // Gig Posts
  async getGigPostsByTenant(tenantId: string): Promise<GigPost[]> {
    return db.select().from(gigPosts).where(eq(gigPosts.tenantId, tenantId)).orderBy(desc(gigPosts.createdAt));
  }

  async getPublicGigPosts(): Promise<GigPost[]> {
    return db
      .select()
      .from(gigPosts)
      .where(eq(gigPosts.status, "OPEN"))
      .orderBy(desc(gigPosts.emergency), gigPosts.startAt);
  }

  async getGigPost(id: string): Promise<GigPost | undefined> {
    const [gig] = await db.select().from(gigPosts).where(eq(gigPosts.id, id));
    return gig || undefined;
  }

  async createGigPost(data: InsertGigPost): Promise<GigPost> {
    const [gig] = await db.insert(gigPosts).values(data).returning();
    return gig;
  }

  async updateGigPost(id: string, data: Partial<InsertGigPost>): Promise<GigPost | undefined> {
    const [gig] = await db
      .update(gigPosts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gigPosts.id, id))
      .returning();
    return gig || undefined;
  }

  async deleteGigPost(id: string): Promise<boolean> {
    await db.delete(gigPosts).where(eq(gigPosts.id, id));
    return true;
  }

  // Gig Assignments
  async getGigAssignmentsByGig(gigPostId: string): Promise<GigAssignment[]> {
    return db.select().from(gigAssignments).where(eq(gigAssignments.gigPostId, gigPostId));
  }

  async createGigAssignment(data: InsertGigAssignment): Promise<GigAssignment> {
    const [assignment] = await db.insert(gigAssignments).values(data).returning();
    return assignment;
  }

  async updateGigAssignment(id: string, data: Partial<InsertGigAssignment>): Promise<GigAssignment | undefined> {
    const [assignment] = await db
      .update(gigAssignments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gigAssignments.id, id))
      .returning();
    return assignment || undefined;
  }

  async getGigAssignmentsByWorker(workerUserId: string): Promise<GigAssignment[]> {
    return db.select().from(gigAssignments).where(eq(gigAssignments.workerUserId, workerUserId)).orderBy(desc(gigAssignments.createdAt));
  }

  async getGigAssignment(id: string): Promise<GigAssignment | undefined> {
    const [assignment] = await db.select().from(gigAssignments).where(eq(gigAssignments.id, id));
    return assignment || undefined;
  }

  async getGigAssignmentByGigAndWorker(gigPostId: string, workerUserId: string): Promise<GigAssignment | undefined> {
    const [assignment] = await db.select().from(gigAssignments).where(
      and(eq(gigAssignments.gigPostId, gigPostId), eq(gigAssignments.workerUserId, workerUserId))
    );
    return assignment || undefined;
  }

  // Gig Payouts
  async getGigPayoutsByTenant(tenantId: string): Promise<GigPayout[]> {
    return db.select().from(gigPayouts).where(eq(gigPayouts.tenantId, tenantId)).orderBy(desc(gigPayouts.createdAt));
  }

  async getGigPayoutsByWorker(workerUserId: string): Promise<GigPayout[]> {
    return db.select().from(gigPayouts).where(eq(gigPayouts.workerUserId, workerUserId)).orderBy(desc(gigPayouts.createdAt));
  }

  async getGigPayoutByAssignment(gigAssignmentId: string): Promise<GigPayout | undefined> {
    const [payout] = await db.select().from(gigPayouts).where(eq(gigPayouts.gigAssignmentId, gigAssignmentId));
    return payout || undefined;
  }

  async getAllGigPayouts(): Promise<GigPayout[]> {
    return db.select().from(gigPayouts).orderBy(desc(gigPayouts.createdAt)).limit(100);
  }

  async getPlatformRevenue(): Promise<{ totalRevenue: number; totalPayouts: number; platformFees: number; completedPayouts: number; pendingPayouts: number }> {
    const allPayouts = await db.select().from(gigPayouts);
    
    let totalRevenue = 0;
    let totalPayouts = 0;
    let platformFees = 0;
    let completedPayouts = 0;
    let pendingPayouts = 0;
    
    for (const payout of allPayouts) {
      totalRevenue += payout.amountCents;
      platformFees += payout.platformFeeCents;
      totalPayouts += payout.netAmountCents;
      
      if (payout.status === "COMPLETED") {
        completedPayouts++;
      } else if (payout.status === "PENDING" || payout.status === "PROCESSING") {
        pendingPayouts++;
      }
    }
    
    return {
      totalRevenue: totalRevenue / 100,
      totalPayouts: totalPayouts / 100,
      platformFees: platformFees / 100,
      completedPayouts,
      pendingPayouts,
    };
  }

  async createGigPayout(data: InsertGigPayout): Promise<GigPayout> {
    const [payout] = await db.insert(gigPayouts).values(data).returning();
    return payout;
  }

  async updateGigPayout(id: string, data: Partial<InsertGigPayout>): Promise<GigPayout | undefined> {
    const [payout] = await db
      .update(gigPayouts)
      .set(data)
      .where(eq(gigPayouts.id, id))
      .returning();
    return payout || undefined;
  }

  // Gig Ratings
  async getGigRatingsByAssignment(gigAssignmentId: string): Promise<GigRating[]> {
    return db.select().from(gigRatings).where(eq(gigRatings.gigAssignmentId, gigAssignmentId));
  }

  async getGigRatingsByUser(userId: string): Promise<GigRating[]> {
    return db.select().from(gigRatings).where(eq(gigRatings.ratedUserId, userId)).orderBy(desc(gigRatings.createdAt));
  }

  async getAverageRatingForUser(userId: string): Promise<number | null> {
    const result = await db
      .select({ avgRating: sql<number>`avg(${gigRatings.rating})` })
      .from(gigRatings)
      .where(eq(gigRatings.ratedUserId, userId));
    return result[0]?.avgRating || null;
  }

  async createGigRating(data: InsertGigRating): Promise<GigRating> {
    const [rating] = await db.insert(gigRatings).values(data).returning();
    return rating;
  }

  async hasUserRatedAssignment(gigAssignmentId: string, raterUserId: string): Promise<boolean> {
    const [existing] = await db.select().from(gigRatings).where(
      and(eq(gigRatings.gigAssignmentId, gigAssignmentId), eq(gigRatings.raterUserId, raterUserId))
    );
    return !!existing;
  }

  // Interview Templates
  async getInterviewTemplatesByTenant(tenantId: string): Promise<InterviewTemplate[]> {
    return db
      .select()
      .from(interviewTemplates)
      .where(eq(interviewTemplates.tenantId, tenantId))
      .orderBy(desc(interviewTemplates.createdAt));
  }

  async getInterviewTemplate(id: string): Promise<InterviewTemplate | undefined> {
    const [template] = await db.select().from(interviewTemplates).where(eq(interviewTemplates.id, id));
    return template || undefined;
  }

  async createInterviewTemplate(data: InsertInterviewTemplate): Promise<InterviewTemplate> {
    const [template] = await db.insert(interviewTemplates).values(data).returning();
    return template;
  }

  async updateInterviewTemplate(
    id: string,
    data: Partial<InsertInterviewTemplate>
  ): Promise<InterviewTemplate | undefined> {
    const [template] = await db
      .update(interviewTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(interviewTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteInterviewTemplate(id: string): Promise<boolean> {
    await db.delete(interviewTemplates).where(eq(interviewTemplates.id, id));
    return true;
  }

  // Interview Questions
  async getQuestionsByTemplate(templateId: string): Promise<InterviewQuestion[]> {
    return db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.templateId, templateId))
      .orderBy(interviewQuestions.sortOrder);
  }

  async createInterviewQuestion(data: InsertInterviewQuestion): Promise<InterviewQuestion> {
    const [question] = await db.insert(interviewQuestions).values(data).returning();
    return question;
  }

  async deleteInterviewQuestion(id: string): Promise<boolean> {
    await db.delete(interviewQuestions).where(eq(interviewQuestions.id, id));
    return true;
  }

  // Interview Invites
  async getInterviewInvitesByTenant(tenantId: string): Promise<InterviewInvite[]> {
    return db
      .select()
      .from(interviewInvites)
      .where(eq(interviewInvites.tenantId, tenantId))
      .orderBy(desc(interviewInvites.createdAt));
  }

  async getInterviewInvite(id: string): Promise<InterviewInvite | undefined> {
    const [invite] = await db
      .select()
      .from(interviewInvites)
      .where(eq(interviewInvites.id, id));
    return invite || undefined;
  }

  async getInterviewInviteByToken(token: string): Promise<InterviewInvite | undefined> {
    const [invite] = await db
      .select()
      .from(interviewInvites)
      .where(eq(interviewInvites.inviteToken, token));
    return invite || undefined;
  }

  async createInterviewInvite(data: InsertInterviewInvite): Promise<InterviewInvite> {
    const [invite] = await db.insert(interviewInvites).values(data).returning();
    return invite;
  }

  async updateInterviewInvite(id: string, data: Partial<InsertInterviewInvite>): Promise<InterviewInvite | undefined> {
    const [invite] = await db
      .update(interviewInvites)
      .set(data)
      .where(eq(interviewInvites.id, id))
      .returning();
    return invite || undefined;
  }

  // Interview Responses
  async getInterviewResponsesByInvite(inviteId: string): Promise<InterviewResponse[]> {
    return db
      .select()
      .from(interviewResponses)
      .where(eq(interviewResponses.inviteId, inviteId))
      .orderBy(interviewResponses.createdAt);
  }

  async getInterviewResponse(inviteId: string, questionId: string): Promise<InterviewResponse | undefined> {
    const [response] = await db
      .select()
      .from(interviewResponses)
      .where(and(
        eq(interviewResponses.inviteId, inviteId),
        eq(interviewResponses.questionId, questionId)
      ));
    return response || undefined;
  }

  async createInterviewResponse(data: InsertInterviewResponse): Promise<InterviewResponse> {
    const [response] = await db.insert(interviewResponses).values(data).returning();
    return response;
  }

  async updateInterviewResponse(id: string, data: Partial<InsertInterviewResponse>): Promise<InterviewResponse | undefined> {
    const [response] = await db
      .update(interviewResponses)
      .set(data)
      .where(eq(interviewResponses.id, id))
      .returning();
    return response || undefined;
  }

  // Dashboard Stats
  async getDashboardStats(tenantId: string): Promise<{
    totalJobs: number;
    activeJobs: number;
    totalApplicants: number;
    newApplicants: number;
    openGigs: number;
    pendingAssignments: number;
  }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalJobsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(eq(jobs.tenantId, tenantId));

    const [activeJobsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(and(eq(jobs.tenantId, tenantId), eq(jobs.status, "PUBLISHED")));

    const [totalApplicantsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.tenantId, tenantId));

    const [newApplicantsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(and(eq(applications.tenantId, tenantId), gte(applications.appliedAt, oneWeekAgo)));

    const [openGigsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gigPosts)
      .where(and(eq(gigPosts.tenantId, tenantId), eq(gigPosts.status, "OPEN")));

    const [pendingAssignmentsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gigAssignments)
      .where(and(eq(gigAssignments.tenantId, tenantId), eq(gigAssignments.status, "PENDING")));

    return {
      totalJobs: totalJobsResult?.count || 0,
      activeJobs: activeJobsResult?.count || 0,
      totalApplicants: totalApplicantsResult?.count || 0,
      newApplicants: newApplicantsResult?.count || 0,
      openGigs: openGigsResult?.count || 0,
      pendingAssignments: pendingAssignmentsResult?.count || 0,
    };
  }

  // Public Jobs
  async getPublishedJobs(): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.status, "PUBLISHED")).orderBy(desc(jobs.createdAt));
  }

  // Worker Profiles
  async getWorkerProfile(userId: string): Promise<WorkerProfile | undefined> {
    const [profile] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId));
    return profile || undefined;
  }

  async createWorkerProfile(data: InsertWorkerProfile): Promise<WorkerProfile> {
    const [profile] = await db.insert(workerProfiles).values(data).returning();
    return profile;
  }

  async updateWorkerProfile(userId: string, data: Partial<InsertWorkerProfile>): Promise<WorkerProfile | undefined> {
    const [profile] = await db
      .update(workerProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workerProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  // User Profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(data).returning();
    return profile;
  }

  // Applications for workers
  async getApplicationsByWorker(userId: string): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.workerUserId, userId)).orderBy(desc(applications.appliedAt));
  }

  // Saved Jobs
  async getSavedJobsByUser(userId: string): Promise<SavedJob[]> {
    return db.select().from(savedJobs).where(eq(savedJobs.userId, userId)).orderBy(desc(savedJobs.savedAt));
  }

  async saveJob(data: InsertSavedJob): Promise<SavedJob> {
    const [saved] = await db.insert(savedJobs).values(data).returning();
    return saved;
  }

  async unsaveJob(userId: string, jobId: string): Promise<boolean> {
    await db.delete(savedJobs).where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
    return true;
  }

  // Integration Connections
  async getIntegrationConnectionsByTenant(tenantId: string): Promise<IntegrationConnection[]> {
    return db.select().from(integrationConnections).where(eq(integrationConnections.tenantId, tenantId));
  }

  async getIntegrationConnection(id: string): Promise<IntegrationConnection | undefined> {
    const [conn] = await db.select().from(integrationConnections).where(eq(integrationConnections.id, id));
    return conn || undefined;
  }

  async createIntegrationConnection(data: InsertIntegrationConnection): Promise<IntegrationConnection> {
    const [conn] = await db.insert(integrationConnections).values(data).returning();
    return conn;
  }

  async updateIntegrationConnection(id: string, data: Partial<InsertIntegrationConnection>): Promise<IntegrationConnection | undefined> {
    const [conn] = await db
      .update(integrationConnections)
      .set(data)
      .where(eq(integrationConnections.id, id))
      .returning();
    return conn || undefined;
  }

  async deleteIntegrationConnection(id: string): Promise<boolean> {
    await db.delete(integrationConnections).where(eq(integrationConnections.id, id));
    return true;
  }

  // Job Distribution Channels
  async getDistributionChannelsByJob(jobId: string): Promise<JobDistributionChannel[]> {
    return db.select().from(jobDistributionChannels).where(eq(jobDistributionChannels.jobId, jobId));
  }

  async getDistributionChannelsByTenant(tenantId: string): Promise<JobDistributionChannel[]> {
    return db.select().from(jobDistributionChannels).where(eq(jobDistributionChannels.tenantId, tenantId));
  }

  async createDistributionChannel(data: InsertJobDistributionChannel): Promise<JobDistributionChannel> {
    const [channel] = await db.insert(jobDistributionChannels).values(data).returning();
    return channel;
  }

  async updateDistributionChannel(id: string, data: Partial<InsertJobDistributionChannel>): Promise<JobDistributionChannel | undefined> {
    const [channel] = await db
      .update(jobDistributionChannels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobDistributionChannels.id, id))
      .returning();
    return channel || undefined;
  }

  async deleteDistributionChannel(id: string): Promise<boolean> {
    await db.delete(jobDistributionChannels).where(eq(jobDistributionChannels.id, id));
    return true;
  }

  // Admin - Platform-wide operations
  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfiles).orderBy(desc(userProfiles.createdAt));
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  async getAdminStats(): Promise<{
    totalTenants: number;
    totalUsers: number;
    totalJobs: number;
    totalApplications: number;
    totalGigs: number;
  }> {
    const [tenantCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tenants);
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(userProfiles);
    const [jobCount] = await db.select({ count: sql<number>`count(*)::int` }).from(jobs);
    const [appCount] = await db.select({ count: sql<number>`count(*)::int` }).from(applications);
    const [gigCount] = await db.select({ count: sql<number>`count(*)::int` }).from(gigPosts);

    return {
      totalTenants: tenantCount?.count || 0,
      totalUsers: userCount?.count || 0,
      totalJobs: jobCount?.count || 0,
      totalApplications: appCount?.count || 0,
      totalGigs: gigCount?.count || 0,
    };
  }

  // Billing
  async getTenantBilling(tenantId: string): Promise<TenantBilling | undefined> {
    const [billing] = await db.select().from(tenantBilling).where(eq(tenantBilling.tenantId, tenantId));
    return billing || undefined;
  }

  async createTenantBilling(data: InsertTenantBilling): Promise<TenantBilling> {
    const [billing] = await db.insert(tenantBilling).values(data).returning();
    return billing;
  }

  async updateTenantBilling(tenantId: string, data: Partial<InsertTenantBilling>): Promise<TenantBilling | undefined> {
    const [billing] = await db
      .update(tenantBilling)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenantBilling.tenantId, tenantId))
      .returning();
    return billing || undefined;
  }

  // Worker Payout Accounts
  async getWorkerPayoutAccount(userId: string): Promise<WorkerPayoutAccount | undefined> {
    const [account] = await db.select().from(workerPayoutAccounts).where(eq(workerPayoutAccounts.userId, userId));
    return account || undefined;
  }

  async createWorkerPayoutAccount(data: InsertWorkerPayoutAccount): Promise<WorkerPayoutAccount> {
    const [account] = await db.insert(workerPayoutAccounts).values(data).returning();
    return account;
  }

  async updateWorkerPayoutAccount(userId: string, data: Partial<InsertWorkerPayoutAccount>): Promise<WorkerPayoutAccount | undefined> {
    const [account] = await db
      .update(workerPayoutAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workerPayoutAccounts.userId, userId))
      .returning();
    return account || undefined;
  }

  // Subscription Events
  async createSubscriptionEvent(data: InsertSubscriptionEvent): Promise<SubscriptionEvent> {
    const [event] = await db.insert(subscriptionEvents).values(data).returning();
    return event;
  }

  async getSubscriptionEventsByTenant(tenantId: string): Promise<SubscriptionEvent[]> {
    return db.select().from(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId)).orderBy(desc(subscriptionEvents.createdAt));
  }

  async getAllSubscriptionEvents(): Promise<SubscriptionEvent[]> {
    return db.select().from(subscriptionEvents).orderBy(desc(subscriptionEvents.createdAt));
  }

  async getMrrByMonth(): Promise<{ month: string; mrr: number; arr: number }[]> {
    const events = await db.select().from(subscriptionEvents).orderBy(subscriptionEvents.createdAt);
    const monthlyMrr: Map<string, number> = new Map();
    let runningMrr = 0;

    for (const event of events) {
      runningMrr += event.mrrChangeCents || 0;
      const month = event.createdAt ? new Date(event.createdAt).toISOString().slice(0, 7) : '';
      if (month) {
        monthlyMrr.set(month, runningMrr);
      }
    }

    return Array.from(monthlyMrr.entries()).map(([month, mrr]) => ({
      month,
      mrr: mrr / 100,
      arr: (mrr * 12) / 100,
    }));
  }

  async getChurnRate(): Promise<{ rate: number; churned: number; total: number }> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.eventType, "CREATED"));

    const [churnedResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(subscriptionEvents)
      .where(and(
        eq(subscriptionEvents.eventType, "CANCELED"),
        gte(subscriptionEvents.createdAt, threeMonthsAgo)
      ));

    const total = totalResult?.count || 0;
    const churned = churnedResult?.count || 0;
    const rate = total > 0 ? (churned / total) * 100 : 0;

    return { rate, churned, total };
  }

  // Feature Flags
  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(featureFlags.name);
  }

  async getFeatureFlag(id: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.id, id));
    return flag || undefined;
  }

  async getFeatureFlagByName(name: string): Promise<FeatureFlag | undefined> {
    const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, name));
    return flag || undefined;
  }

  async createFeatureFlag(data: InsertFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db.insert(featureFlags).values(data).returning();
    return flag;
  }

  async updateFeatureFlag(id: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined> {
    const [flag] = await db
      .update(featureFlags)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(featureFlags.id, id))
      .returning();
    return flag || undefined;
  }

  async deleteFeatureFlag(id: string): Promise<boolean> {
    await db.delete(featureFlags).where(eq(featureFlags.id, id));
    return true;
  }

  async isFeatureEnabled(name: string, tenantId?: string, planType?: string): Promise<boolean> {
    const flag = await this.getFeatureFlagByName(name);
    if (!flag) return false;
    if (!flag.enabled) return false;
    if (tenantId && flag.enabledForTenants?.includes(tenantId)) return true;
    if (planType && flag.enabledForPlans?.includes(planType)) return true;
    if (!flag.enabledForTenants?.length && !flag.enabledForPlans?.length) return true;
    return false;
  }

  // Coupons
  async getAllCoupons(): Promise<Coupon[]> {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon || undefined;
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon || undefined;
  }

  async createCoupon(data: InsertCoupon): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values({ ...data, code: data.code.toUpperCase() }).returning();
    return coupon;
  }

  async updateCoupon(id: string, data: Partial<InsertCoupon>): Promise<Coupon | undefined> {
    const updateData = { ...data };
    if (updateData.code) updateData.code = updateData.code.toUpperCase();
    const [coupon] = await db.update(coupons).set(updateData).where(eq(coupons.id, id)).returning();
    return coupon || undefined;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    await db.delete(coupons).where(eq(coupons.id, id));
    return true;
  }

  async validateCoupon(code: string): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
    const coupon = await this.getCouponByCode(code);
    if (!coupon) return { valid: false, error: "Coupon not found" };
    if (!coupon.active) return { valid: false, error: "Coupon is inactive" };
    if (coupon.validFrom && new Date(coupon.validFrom) > new Date()) return { valid: false, error: "Coupon not yet valid" };
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) return { valid: false, error: "Coupon has expired" };
    if (coupon.maxRedemptions && (coupon.currentRedemptions || 0) >= coupon.maxRedemptions) return { valid: false, error: "Coupon redemption limit reached" };
    return { valid: true, coupon };
  }

  async redeemCoupon(couponId: string, tenantId: string): Promise<CouponRedemption> {
    await db.update(coupons).set({ currentRedemptions: sql`${coupons.currentRedemptions} + 1` }).where(eq(coupons.id, couponId));
    const [redemption] = await db.insert(couponRedemptions).values({ couponId, tenantId }).returning();
    return redemption;
  }

  async getCouponRedemptionsByTenant(tenantId: string): Promise<CouponRedemption[]> {
    return db.select().from(couponRedemptions).where(eq(couponRedemptions.tenantId, tenantId));
  }

  // SMS Messages
  async createSmsMessage(data: InsertSmsMessage): Promise<SmsMessage> {
    const [msg] = await db.insert(smsMessages).values(data).returning();
    return msg;
  }

  async getSmsMessagesByTenant(tenantId: string): Promise<SmsMessage[]> {
    return db.select().from(smsMessages).where(eq(smsMessages.tenantId, tenantId)).orderBy(desc(smsMessages.createdAt));
  }

  async getSmsMessage(id: string): Promise<SmsMessage | undefined> {
    const [msg] = await db.select().from(smsMessages).where(eq(smsMessages.id, id));
    return msg || undefined;
  }

  async updateSmsMessage(id: string, data: Partial<InsertSmsMessage>): Promise<SmsMessage | undefined> {
    const [msg] = await db.update(smsMessages).set(data).where(eq(smsMessages.id, id)).returning();
    return msg || undefined;
  }

  // Interview Slots
  async getInterviewSlotsByTenant(tenantId: string): Promise<InterviewSlot[]> {
    return db.select().from(interviewSlots).where(eq(interviewSlots.tenantId, tenantId)).orderBy(interviewSlots.startAt);
  }

  async getInterviewSlot(id: string): Promise<InterviewSlot | undefined> {
    const [slot] = await db.select().from(interviewSlots).where(eq(interviewSlots.id, id));
    return slot || undefined;
  }

  async createInterviewSlot(data: InsertInterviewSlot): Promise<InterviewSlot> {
    const [slot] = await db.insert(interviewSlots).values(data).returning();
    return slot;
  }

  async updateInterviewSlot(id: string, data: Partial<InsertInterviewSlot>): Promise<InterviewSlot | undefined> {
    const [slot] = await db.update(interviewSlots).set(data).where(eq(interviewSlots.id, id)).returning();
    return slot || undefined;
  }

  async deleteInterviewSlot(id: string): Promise<boolean> {
    await db.delete(interviewSlots).where(eq(interviewSlots.id, id));
    return true;
  }

  // Interview Bookings
  async getInterviewBookingsBySlot(slotId: string): Promise<InterviewBooking[]> {
    return db.select().from(interviewBookings).where(eq(interviewBookings.slotId, slotId));
  }

  async getInterviewBooking(id: string): Promise<InterviewBooking | undefined> {
    const [booking] = await db.select().from(interviewBookings).where(eq(interviewBookings.id, id));
    return booking || undefined;
  }

  async createInterviewBooking(data: InsertInterviewBooking): Promise<InterviewBooking> {
    const [booking] = await db.insert(interviewBookings).values(data).returning();
    await db.update(interviewSlots).set({ currentBookings: sql`${interviewSlots.currentBookings} + 1` }).where(eq(interviewSlots.id, data.slotId));
    return booking;
  }

  async updateInterviewBooking(id: string, data: Partial<InsertInterviewBooking>): Promise<InterviewBooking | undefined> {
    const [booking] = await db.update(interviewBookings).set({ ...data, updatedAt: new Date() }).where(eq(interviewBookings.id, id)).returning();
    return booking || undefined;
  }

  // Job Templates
  async getJobTemplates(tenantId?: string): Promise<JobTemplate[]> {
    if (tenantId) {
      return db.select().from(jobTemplates).where(
        sql`${jobTemplates.tenantId} = ${tenantId} OR ${jobTemplates.isSystem} = true`
      ).orderBy(jobTemplates.name);
    }
    return db.select().from(jobTemplates).orderBy(jobTemplates.name);
  }

  async getSystemJobTemplates(): Promise<JobTemplate[]> {
    return db.select().from(jobTemplates).where(eq(jobTemplates.isSystem, true)).orderBy(jobTemplates.name);
  }

  async getJobTemplate(id: string): Promise<JobTemplate | undefined> {
    const [template] = await db.select().from(jobTemplates).where(eq(jobTemplates.id, id));
    return template || undefined;
  }

  async createJobTemplate(data: InsertJobTemplate): Promise<JobTemplate> {
    const [template] = await db.insert(jobTemplates).values(data).returning();
    return template;
  }

  async updateJobTemplate(id: string, data: Partial<InsertJobTemplate>): Promise<JobTemplate | undefined> {
    const [template] = await db.update(jobTemplates).set({ ...data, updatedAt: new Date() }).where(eq(jobTemplates.id, id)).returning();
    return template || undefined;
  }

  async deleteJobTemplate(id: string): Promise<boolean> {
    await db.delete(jobTemplates).where(eq(jobTemplates.id, id));
    return true;
  }

  // Message Templates
  async getMessageTemplates(tenantId?: string): Promise<MessageTemplate[]> {
    if (tenantId) {
      return db.select().from(messageTemplates).where(
        sql`${messageTemplates.tenantId} = ${tenantId} OR ${messageTemplates.isSystem} = true`
      ).orderBy(messageTemplates.name);
    }
    return db.select().from(messageTemplates).orderBy(messageTemplates.name);
  }

  async getSystemMessageTemplates(): Promise<MessageTemplate[]> {
    return db.select().from(messageTemplates).where(eq(messageTemplates.isSystem, true)).orderBy(messageTemplates.name);
  }

  async getMessageTemplate(id: string): Promise<MessageTemplate | undefined> {
    const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id));
    return template || undefined;
  }

  async createMessageTemplate(data: InsertMessageTemplate): Promise<MessageTemplate> {
    const [template] = await db.insert(messageTemplates).values(data).returning();
    return template;
  }

  async updateMessageTemplate(id: string, data: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined> {
    const [template] = await db.update(messageTemplates).set({ ...data, updatedAt: new Date() }).where(eq(messageTemplates.id, id)).returning();
    return template || undefined;
  }

  async deleteMessageTemplate(id: string): Promise<boolean> {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    return true;
  }

  // Background Check Requests
  async getBackgroundChecksByTenant(tenantId: string): Promise<BackgroundCheckRequest[]> {
    return db.select().from(backgroundCheckRequests).where(eq(backgroundCheckRequests.tenantId, tenantId)).orderBy(desc(backgroundCheckRequests.createdAt));
  }

  async getBackgroundCheck(id: string): Promise<BackgroundCheckRequest | undefined> {
    const [check] = await db.select().from(backgroundCheckRequests).where(eq(backgroundCheckRequests.id, id));
    return check || undefined;
  }

  async createBackgroundCheck(data: InsertBackgroundCheckRequest): Promise<BackgroundCheckRequest> {
    const [check] = await db.insert(backgroundCheckRequests).values(data).returning();
    return check;
  }

  async updateBackgroundCheck(id: string, data: Partial<InsertBackgroundCheckRequest>): Promise<BackgroundCheckRequest | undefined> {
    const [check] = await db.update(backgroundCheckRequests).set(data).where(eq(backgroundCheckRequests.id, id)).returning();
    return check || undefined;
  }

  // Onboarding Documents
  async getOnboardingDocumentsByTenant(tenantId: string): Promise<OnboardingDocument[]> {
    return db.select().from(onboardingDocuments).where(eq(onboardingDocuments.tenantId, tenantId)).orderBy(desc(onboardingDocuments.createdAt));
  }

  async getOnboardingDocumentsByApplication(applicationId: string): Promise<OnboardingDocument[]> {
    return db.select().from(onboardingDocuments).where(eq(onboardingDocuments.applicationId, applicationId));
  }

  async getOnboardingDocument(id: string): Promise<OnboardingDocument | undefined> {
    const [doc] = await db.select().from(onboardingDocuments).where(eq(onboardingDocuments.id, id));
    return doc || undefined;
  }

  async createOnboardingDocument(data: InsertOnboardingDocument): Promise<OnboardingDocument> {
    const [doc] = await db.insert(onboardingDocuments).values(data).returning();
    return doc;
  }

  async updateOnboardingDocument(id: string, data: Partial<InsertOnboardingDocument>): Promise<OnboardingDocument | undefined> {
    const [doc] = await db.update(onboardingDocuments).set(data).where(eq(onboardingDocuments.id, id)).returning();
    return doc || undefined;
  }

  // Onboarding Checklists
  async getOnboardingChecklistsByTenant(tenantId: string): Promise<OnboardingChecklist[]> {
    return db.select().from(onboardingChecklists).where(eq(onboardingChecklists.tenantId, tenantId)).orderBy(desc(onboardingChecklists.createdAt));
  }

  async getOnboardingChecklistsByApplication(applicationId: string): Promise<OnboardingChecklist[]> {
    return db.select().from(onboardingChecklists).where(eq(onboardingChecklists.applicationId, applicationId));
  }

  async getOnboardingChecklist(id: string): Promise<OnboardingChecklist | undefined> {
    const [checklist] = await db.select().from(onboardingChecklists).where(eq(onboardingChecklists.id, id));
    return checklist || undefined;
  }

  async createOnboardingChecklist(data: InsertOnboardingChecklist): Promise<OnboardingChecklist> {
    const [checklist] = await db.insert(onboardingChecklists).values(data).returning();
    return checklist;
  }

  async updateOnboardingChecklist(id: string, data: Partial<InsertOnboardingChecklist>): Promise<OnboardingChecklist | undefined> {
    const [checklist] = await db.update(onboardingChecklists).set(data).where(eq(onboardingChecklists.id, id)).returning();
    return checklist || undefined;
  }

  // Impersonation Sessions
  async createImpersonationSession(data: InsertImpersonationSession): Promise<ImpersonationSession> {
    const [session] = await db.insert(impersonationSessions).values(data).returning();
    return session;
  }

  async getActiveImpersonationSession(adminUserId: string): Promise<ImpersonationSession | undefined> {
    const [session] = await db.select().from(impersonationSessions)
      .where(and(eq(impersonationSessions.adminUserId, adminUserId), isNull(impersonationSessions.endedAt)))
      .orderBy(desc(impersonationSessions.startedAt));
    return session || undefined;
  }

  async endImpersonationSession(id: string): Promise<ImpersonationSession | undefined> {
    const [session] = await db.update(impersonationSessions).set({ endedAt: new Date() }).where(eq(impersonationSessions.id, id)).returning();
    return session || undefined;
  }

  // Tenant Usage Metrics
  async getTenantUsageMetrics(tenantId: string): Promise<TenantUsageMetrics[]> {
    return db.select().from(tenantUsageMetrics).where(eq(tenantUsageMetrics.tenantId, tenantId)).orderBy(desc(tenantUsageMetrics.periodStart));
  }

  async upsertTenantUsageMetrics(data: InsertTenantUsageMetrics): Promise<TenantUsageMetrics> {
    const [existing] = await db.select().from(tenantUsageMetrics)
      .where(and(
        eq(tenantUsageMetrics.tenantId, data.tenantId),
        eq(tenantUsageMetrics.periodStart, data.periodStart)
      ));
    
    if (existing) {
      const [updated] = await db.update(tenantUsageMetrics).set(data).where(eq(tenantUsageMetrics.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(tenantUsageMetrics).values(data).returning();
    return created;
  }

  async getTenantHealthScores(): Promise<{ tenantId: string; tenantName: string; healthScore: number; metrics: TenantUsageMetrics | null }[]> {
    const allTenants = await this.getAllTenants();
    const results = [];

    for (const tenant of allTenants) {
      const metrics = await this.getTenantUsageMetrics(tenant.id);
      const latestMetrics = metrics[0] || null;
      
      let healthScore = 50;
      if (latestMetrics) {
        if ((latestMetrics.jobsPosted || 0) > 0) healthScore += 10;
        if ((latestMetrics.applicationsReceived || 0) > 0) healthScore += 10;
        if ((latestMetrics.hiresMade || 0) > 0) healthScore += 15;
        if ((latestMetrics.activeUsers || 0) > 1) healthScore += 10;
        if ((latestMetrics.interviewsSent || 0) > 0) healthScore += 5;
      }
      healthScore = Math.min(100, healthScore);

      results.push({ tenantId: tenant.id, tenantName: tenant.name, healthScore, metrics: latestMetrics });
    }

    return results.sort((a, b) => b.healthScore - a.healthScore);
  }
}

export const storage = new DatabaseStorage();
