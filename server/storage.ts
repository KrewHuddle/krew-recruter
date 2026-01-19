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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
