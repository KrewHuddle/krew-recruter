import {
  tenants,
  tenantMemberships,
  locations,
  jobs,
  applications,
  gigPosts,
  gigAssignments,
  interviewTemplates,
  interviewQuestions,
  interviewInvites,
  interviewResponses,
  jobDistributionChannels,
  sponsoredCampaigns,
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
  type InterviewTemplate,
  type InsertInterviewTemplate,
  type InterviewQuestion,
  type InsertInterviewQuestion,
  type InterviewInvite,
  type InsertInterviewInvite,
  type JobDistributionChannel,
  type InsertJobDistributionChannel,
  type SponsoredCampaign,
  type InsertSponsoredCampaign,
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
  createGigAssignment(data: InsertGigAssignment): Promise<GigAssignment>;
  updateGigAssignment(id: string, data: Partial<InsertGigAssignment>): Promise<GigAssignment | undefined>;

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
  createInterviewInvite(data: InsertInterviewInvite): Promise<InterviewInvite>;
  updateInterviewInvite(id: string, data: Partial<InsertInterviewInvite>): Promise<InterviewInvite | undefined>;

  // Dashboard Stats
  getDashboardStats(tenantId: string): Promise<{
    totalJobs: number;
    activeJobs: number;
    totalApplicants: number;
    newApplicants: number;
    openGigs: number;
    pendingAssignments: number;
  }>;
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
}

export const storage = new DatabaseStorage();
