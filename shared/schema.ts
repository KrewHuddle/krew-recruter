import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============ ENUMS ============

export const planTypeEnum = pgEnum("plan_type", ["FREE", "PRO", "ENTERPRISE"]);
export const memberRoleEnum = pgEnum("member_role", ["OWNER", "ADMIN", "HIRING_MANAGER", "LOCATION_MANAGER", "REVIEWER", "VIEWER"]);
export const jobStatusEnum = pgEnum("job_status", ["DRAFT", "PUBLISHED", "CLOSED"]);
export const jobTypeEnum = pgEnum("job_type", ["FULL_TIME", "PART_TIME"]);
export const applicationStageEnum = pgEnum("application_stage", ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]);
export const vettingStatusEnum = pgEnum("vetting_status", ["NONE", "BASIC", "VERIFIED", "PRO"]);
export const gigAcceptanceModeEnum = pgEnum("gig_acceptance_mode", ["INSTANT_BOOK", "APPROVAL_REQUIRED"]);
export const gigStatusEnum = pgEnum("gig_status", ["OPEN", "FILLED", "CANCELLED", "COMPLETED"]);
export const gigAssignmentStatusEnum = pgEnum("gig_assignment_status", ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "NO_SHOW", "CANCELLED"]);
export const interviewInviteStatusEnum = pgEnum("interview_invite_status", ["PENDING", "IN_PROGRESS", "COMPLETED", "EXPIRED"]);
export const interviewResponseTypeEnum = pgEnum("interview_response_type", ["VIDEO", "TEXT"]);
export const interviewDecisionEnum = pgEnum("interview_decision", ["YES", "MAYBE", "NO"]);
export const distributionProviderEnum = pgEnum("distribution_provider", ["KREW", "INDEED", "ZIPRECRUITER", "AGGREGATOR"]);
export const distributionStatusEnum = pgEnum("distribution_status", ["PENDING", "ACTIVE", "PAUSED", "FAILED", "CLOSED"]);
export const sponsoredModelEnum = pgEnum("sponsored_model", ["FLAT", "PPC"]);
export const sponsoredStatusEnum = pgEnum("sponsored_status", ["ACTIVE", "PAUSED", "ENDED"]);
export const sponsoredEventTypeEnum = pgEnum("sponsored_event_type", ["IMPRESSION", "CLICK"]);

// ============ FOH/BOH ROLES ============

export const FOH_ROLES = [
  "Server", "Cocktail Server", "Banquet Server", "Fine Dining Server", "Food Runner",
  "Busser / Server Assistant", "Host / Hostess", "Expo / Expeditor", "Bartender", "Barback",
  "Sommelier / Wine Steward", "Beverage Server", "Event Captain", "Banquet Captain",
  "Coat Check Attendant", "Concierge", "Cashier / Counter Staff", "Shift Lead",
  "Floor Manager", "Assistant Manager", "FOH Supervisor"
] as const;

export const BOH_ROLES = [
  "Line Cook", "Prep Cook", "Grill Cook", "Fry Cook", "Saute Cook",
  "Pantry / Garde Manger", "Pizza Cook", "Sushi Cook", "Breakfast Cook", "Short Order Cook",
  "Broiler Cook", "Pastry Cook", "Baker", "Dishwasher / Steward", "Kitchen Porter",
  "Butcher", "Catering Prep / Production Cook", "Sous Chef", "Kitchen Manager", "Lead Line Cook",
  "Other"
] as const;

export type FOHRole = typeof FOH_ROLES[number];
export type BOHRole = typeof BOH_ROLES[number];

// ============ TENANTS ============

export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  planType: planTypeEnum("plan_type").notNull().default("FREE"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(tenantMemberships),
  locations: many(locations),
  jobs: many(jobs),
  gigPosts: many(gigPosts),
  interviewTemplates: many(interviewTemplates),
  integrationConnections: many(integrationConnections),
  sponsoredCampaigns: many(sponsoredCampaigns),
}));

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ============ TENANT MEMBERSHIPS ============

export const tenantMemberships = pgTable("tenant_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  role: memberRoleEnum("role").notNull().default("VIEWER"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  inviteToken: text("invite_token"),
}, (table) => [
  index("idx_membership_tenant").on(table.tenantId),
  index("idx_membership_user").on(table.userId),
]);

export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMemberships.tenantId], references: [tenants.id] }),
}));

export const insertTenantMembershipSchema = createInsertSchema(tenantMemberships).omit({ id: true, invitedAt: true });
export type InsertTenantMembership = z.infer<typeof insertTenantMembershipSchema>;
export type TenantMembership = typeof tenantMemberships.$inferSelect;

// ============ LOCATIONS ============

export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  timezone: text("timezone").default("America/New_York"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_location_tenant").on(table.tenantId),
]);

export const locationsRelations = relations(locations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [locations.tenantId], references: [tenants.id] }),
  jobs: many(jobs),
  gigPosts: many(gigPosts),
}));

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// ============ JOBS ============

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").references(() => locations.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  role: text("role").notNull(),
  description: text("description"),
  jobType: jobTypeEnum("job_type").notNull().default("FULL_TIME"),
  payRangeMin: integer("pay_range_min"),
  payRangeMax: integer("pay_range_max"),
  scheduleTags: text("schedule_tags").array(),
  status: jobStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("idx_job_tenant").on(table.tenantId),
  index("idx_job_status").on(table.status),
]);

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  tenant: one(tenants, { fields: [jobs.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [jobs.locationId], references: [locations.id] }),
  applications: many(applications),
  distributionChannels: many(jobDistributionChannels),
  sponsoredCampaigns: many(sponsoredCampaigns),
}));

export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true, updatedAt: true, publishedAt: true, closedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ============ USER TYPE ENUM ============

export const userTypeEnum = pgEnum("user_type", ["EMPLOYER", "JOB_SEEKER"]);

// ============ USER PROFILES (Global user preferences) ============

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  userType: userTypeEnum("user_type").notNull().default("JOB_SEEKER"),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  isSuperAdmin: boolean("is_super_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// ============ WORKER PROFILES (Global, not tenant-scoped) ============

export const workerProfiles = pgTable("worker_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  name: text("name"),
  headline: text("headline"),
  city: text("city"),
  state: text("state"),
  summary: text("summary"),
  experienceYears: integer("experience_years"),
  fohRoles: text("foh_roles").array(),
  bohRoles: text("boh_roles").array(),
  availabilityJson: jsonb("availability_json"),
  certificationsJson: jsonb("certifications_json"),
  resumeUrl: text("resume_url"),
  desiredPayMin: integer("desired_pay_min"),
  desiredPayMax: integer("desired_pay_max"),
  openToGigs: boolean("open_to_gigs").default(true),
  openToFullTime: boolean("open_to_full_time").default(true),
  openToPartTime: boolean("open_to_part_time").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkerProfileSchema = createInsertSchema(workerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkerProfile = z.infer<typeof insertWorkerProfileSchema>;
export type WorkerProfile = typeof workerProfiles.$inferSelect;

// ============ SAVED JOBS ============

export const savedJobs = pgTable("saved_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  savedAt: timestamp("saved_at").defaultNow(),
}, (table) => [
  index("idx_saved_jobs_user").on(table.userId),
  index("idx_saved_jobs_job").on(table.jobId),
]);

export const savedJobsRelations = relations(savedJobs, ({ one }) => ({
  job: one(jobs, { fields: [savedJobs.jobId], references: [jobs.id] }),
}));

export const insertSavedJobSchema = createInsertSchema(savedJobs).omit({ id: true, savedAt: true });
export type InsertSavedJob = z.infer<typeof insertSavedJobSchema>;
export type SavedJob = typeof savedJobs.$inferSelect;

// ============ APPLICATIONS ============

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  workerUserId: varchar("worker_user_id").notNull(),
  stage: applicationStageEnum("stage").notNull().default("APPLIED"),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  appliedAt: timestamp("applied_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_application_tenant").on(table.tenantId),
  index("idx_application_job").on(table.jobId),
  index("idx_application_worker").on(table.workerUserId),
]);

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  messageThread: many(messageThreads),
  interviewInvites: many(interviewInvites),
}));

export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, appliedAt: true, updatedAt: true });
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// ============ MESSAGE THREADS ============

export const messageThreads = pgTable("message_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_thread_application").on(table.applicationId),
]);

export const messageThreadsRelations = relations(messageThreads, ({ one, many }) => ({
  application: one(applications, { fields: [messageThreads.applicationId], references: [applications.id] }),
  messages: many(messages),
}));

export const insertMessageThreadSchema = createInsertSchema(messageThreads).omit({ id: true, createdAt: true });
export type InsertMessageThread = z.infer<typeof insertMessageThreadSchema>;
export type MessageThread = typeof messageThreads.$inferSelect;

// ============ MESSAGES ============

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => messageThreads.id, { onDelete: "cascade" }),
  senderUserId: varchar("sender_user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_message_thread").on(table.threadId),
]);

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(messageThreads, { fields: [messages.threadId], references: [messageThreads.id] }),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ============ GIG WORKER PROFILES ============

export const gigWorkerProfiles = pgTable("gig_worker_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  gigReady: boolean("gig_ready").default(false),
  vettingStatus: vettingStatusEnum("vetting_status").notNull().default("NONE"),
  rolesFOH: text("roles_foh").array(),
  rolesBOH: text("roles_boh").array(),
  minRate: integer("min_rate"),
  maxDistance: integer("max_distance"),
  reliabilityScore: integer("reliability_score").default(100),
  availabilityJson: jsonb("availability_json"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGigWorkerProfileSchema = createInsertSchema(gigWorkerProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGigWorkerProfile = z.infer<typeof insertGigWorkerProfileSchema>;
export type GigWorkerProfile = typeof gigWorkerProfiles.$inferSelect;

// ============ GIG POSTS ============

export const gigPosts = pgTable("gig_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").references(() => locations.id, { onDelete: "set null" }),
  role: text("role").notNull(),
  description: text("description"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  payRate: integer("pay_rate").notNull(),
  requirementsJson: jsonb("requirements_json"),
  acceptanceMode: gigAcceptanceModeEnum("acceptance_mode").notNull().default("APPROVAL_REQUIRED"),
  emergency: boolean("emergency").default(false),
  status: gigStatusEnum("status").notNull().default("OPEN"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gig_tenant").on(table.tenantId),
  index("idx_gig_status").on(table.status),
]);

export const gigPostsRelations = relations(gigPosts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [gigPosts.tenantId], references: [tenants.id] }),
  location: one(locations, { fields: [gigPosts.locationId], references: [locations.id] }),
  assignments: many(gigAssignments),
}));

export const insertGigPostSchema = createInsertSchema(gigPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGigPost = z.infer<typeof insertGigPostSchema>;
export type GigPost = typeof gigPosts.$inferSelect;

// ============ GIG ASSIGNMENTS ============

export const gigAssignments = pgTable("gig_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  gigPostId: varchar("gig_post_id").notNull().references(() => gigPosts.id, { onDelete: "cascade" }),
  workerUserId: varchar("worker_user_id").notNull(),
  status: gigAssignmentStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_gig_assignment_gig").on(table.gigPostId),
  index("idx_gig_assignment_worker").on(table.workerUserId),
]);

export const gigAssignmentsRelations = relations(gigAssignments, ({ one }) => ({
  gigPost: one(gigPosts, { fields: [gigAssignments.gigPostId], references: [gigPosts.id] }),
}));

export const insertGigAssignmentSchema = createInsertSchema(gigAssignments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGigAssignment = z.infer<typeof insertGigAssignmentSchema>;
export type GigAssignment = typeof gigAssignments.$inferSelect;

// ============ INTERVIEW TEMPLATES ============

export const interviewTemplates = pgTable("interview_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  introVideoPath: text("intro_video_path"),
  introText: text("intro_text"),
  outroVideoPath: text("outro_video_path"),
  outroText: text("outro_text"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  reminderEmailSubject: text("reminder_email_subject"),
  reminderEmailBody: text("reminder_email_body"),
  brandLogoPath: text("brand_logo_path"),
  brandPrimaryColor: text("brand_primary_color"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_template_tenant").on(table.tenantId),
]);

export const interviewTemplatesRelations = relations(interviewTemplates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [interviewTemplates.tenantId], references: [tenants.id] }),
  questions: many(interviewQuestions),
  invites: many(interviewInvites),
}));

export const insertInterviewTemplateSchema = createInsertSchema(interviewTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInterviewTemplate = z.infer<typeof insertInterviewTemplateSchema>;
export type InterviewTemplate = typeof interviewTemplates.$inferSelect;

// ============ INTERVIEW QUESTIONS ============

export const interviewQuestions = pgTable("interview_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => interviewTemplates.id, { onDelete: "cascade" }),
  promptText: text("prompt_text").notNull(),
  videoPromptPath: text("video_prompt_path"),
  responseType: interviewResponseTypeEnum("response_type").notNull().default("TEXT"),
  timeLimitSeconds: integer("time_limit_seconds").default(120),
  thinkingTimeSeconds: integer("thinking_time_seconds").default(30),
  maxRetakes: integer("max_retakes").default(3),
  sortOrder: integer("sort_order").default(0),
}, (table) => [
  index("idx_question_template").on(table.templateId),
]);

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one }) => ({
  template: one(interviewTemplates, { fields: [interviewQuestions.templateId], references: [interviewTemplates.id] }),
}));

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({ id: true });
export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;

// ============ INTERVIEW INVITES ============

export const interviewInvites = pgTable("interview_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => interviewTemplates.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "cascade" }),
  workerUserId: varchar("worker_user_id"),
  inviteToken: varchar("invite_token").notNull().unique(),
  candidateName: text("candidate_name"),
  candidateEmail: text("candidate_email"),
  status: interviewInviteStatusEnum("status").notNull().default("PENDING"),
  deadlineAt: timestamp("deadline_at"),
  emailSentAt: timestamp("email_sent_at"),
  emailOpenedAt: timestamp("email_opened_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  startedAt: timestamp("started_at"),
  consentAcceptedAt: timestamp("consent_accepted_at"),
  systemCheckPassedAt: timestamp("system_check_passed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_invite_application").on(table.applicationId),
  index("idx_invite_token").on(table.inviteToken),
]);

export const interviewInvitesRelations = relations(interviewInvites, ({ one, many }) => ({
  template: one(interviewTemplates, { fields: [interviewInvites.templateId], references: [interviewTemplates.id] }),
  application: one(applications, { fields: [interviewInvites.applicationId], references: [applications.id] }),
  responses: many(interviewResponses),
  reviews: many(interviewReviews),
}));

export const insertInterviewInviteSchema = createInsertSchema(interviewInvites).omit({ id: true, createdAt: true, completedAt: true });
export type InsertInterviewInvite = z.infer<typeof insertInterviewInviteSchema>;
export type InterviewInvite = typeof interviewInvites.$inferSelect;

// ============ INTERVIEW RESPONSES ============

export const interviewResponses = pgTable("interview_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inviteId: varchar("invite_id").notNull().references(() => interviewInvites.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => interviewQuestions.id, { onDelete: "cascade" }),
  type: interviewResponseTypeEnum("type").notNull().default("TEXT"),
  videoPath: text("video_path"),
  videoThumbnailPath: text("video_thumbnail_path"),
  videoDurationSeconds: integer("video_duration_seconds"),
  videoFileSize: integer("video_file_size"),
  videoMimeType: text("video_mime_type"),
  text: text("text"),
  retakeCount: integer("retake_count").default(0),
  rating: integer("rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_response_invite").on(table.inviteId),
]);

export const interviewResponsesRelations = relations(interviewResponses, ({ one }) => ({
  invite: one(interviewInvites, { fields: [interviewResponses.inviteId], references: [interviewInvites.id] }),
  question: one(interviewQuestions, { fields: [interviewResponses.questionId], references: [interviewQuestions.id] }),
}));

export const insertInterviewResponseSchema = createInsertSchema(interviewResponses).omit({ id: true, createdAt: true });
export type InsertInterviewResponse = z.infer<typeof insertInterviewResponseSchema>;
export type InterviewResponse = typeof interviewResponses.$inferSelect;

// ============ INTERVIEW REVIEWS ============

export const interviewReviews = pgTable("interview_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  inviteId: varchar("invite_id").notNull().references(() => interviewInvites.id, { onDelete: "cascade" }),
  reviewerUserId: varchar("reviewer_user_id").notNull(),
  score: integer("score"),
  decision: interviewDecisionEnum("decision"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_review_invite").on(table.inviteId),
]);

export const interviewReviewsRelations = relations(interviewReviews, ({ one }) => ({
  invite: one(interviewInvites, { fields: [interviewReviews.inviteId], references: [interviewInvites.id] }),
}));

export const insertInterviewReviewSchema = createInsertSchema(interviewReviews).omit({ id: true, createdAt: true });
export type InsertInterviewReview = z.infer<typeof insertInterviewReviewSchema>;
export type InterviewReview = typeof interviewReviews.$inferSelect;

// ============ RESPONSE RATINGS ============

export const responseRatings = pgTable("response_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  responseId: varchar("response_id").notNull().references(() => interviewResponses.id, { onDelete: "cascade" }),
  reviewerUserId: varchar("reviewer_user_id").notNull(),
  rating: integer("rating").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rating_response").on(table.responseId),
]);

export const responseRatingsRelations = relations(responseRatings, ({ one }) => ({
  response: one(interviewResponses, { fields: [responseRatings.responseId], references: [interviewResponses.id] }),
}));

export const insertResponseRatingSchema = createInsertSchema(responseRatings).omit({ id: true, createdAt: true });
export type InsertResponseRating = z.infer<typeof insertResponseRatingSchema>;
export type ResponseRating = typeof responseRatings.$inferSelect;

// ============ RESPONSE COMMENTS ============

export const responseComments = pgTable("response_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  responseId: varchar("response_id").notNull().references(() => interviewResponses.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  userName: text("user_name"),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_comment_response").on(table.responseId),
]);

export const responseCommentsRelations = relations(responseComments, ({ one }) => ({
  response: one(interviewResponses, { fields: [responseComments.responseId], references: [interviewResponses.id] }),
}));

export const insertResponseCommentSchema = createInsertSchema(responseComments).omit({ id: true, createdAt: true });
export type InsertResponseComment = z.infer<typeof insertResponseCommentSchema>;
export type ResponseComment = typeof responseComments.$inferSelect;

// ============ INTERVIEW ANALYTICS ============

export const interviewAnalytics = pgTable("interview_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").notNull().references(() => interviewTemplates.id, { onDelete: "cascade" }),
  totalInvites: integer("total_invites").default(0),
  completedInvites: integer("completed_invites").default(0),
  expiredInvites: integer("expired_invites").default(0),
  avgCompletionTimeSeconds: integer("avg_completion_time_seconds"),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(),
}, (table) => [
  index("idx_analytics_template").on(table.templateId),
]);

export const interviewAnalyticsRelations = relations(interviewAnalytics, ({ one }) => ({
  template: one(interviewTemplates, { fields: [interviewAnalytics.templateId], references: [interviewTemplates.id] }),
}));

export const insertInterviewAnalyticsSchema = createInsertSchema(interviewAnalytics).omit({ id: true, lastUpdatedAt: true });
export type InsertInterviewAnalytics = z.infer<typeof insertInterviewAnalyticsSchema>;
export type InterviewAnalytics = typeof interviewAnalytics.$inferSelect;

// ============ INTEGRATION CONNECTIONS ============

export const integrationConnections = pgTable("integration_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  provider: distributionProviderEnum("provider").notNull(),
  credentialsEncryptedJson: text("credentials_encrypted_json"),
  status: text("status").default("inactive"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_connection_tenant").on(table.tenantId),
]);

export const integrationConnectionsRelations = relations(integrationConnections, ({ one }) => ({
  tenant: one(tenants, { fields: [integrationConnections.tenantId], references: [tenants.id] }),
}));

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections).omit({ id: true, createdAt: true });
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;

// ============ JOB DISTRIBUTION CHANNELS ============

export const jobDistributionChannels = pgTable("job_distribution_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  provider: distributionProviderEnum("provider").notNull(),
  externalJobId: text("external_job_id"),
  status: distributionStatusEnum("status").notNull().default("PENDING"),
  lastError: text("last_error"),
  postedAt: timestamp("posted_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_distribution_job").on(table.jobId),
]);

export const jobDistributionChannelsRelations = relations(jobDistributionChannels, ({ one }) => ({
  job: one(jobs, { fields: [jobDistributionChannels.jobId], references: [jobs.id] }),
}));

export const insertJobDistributionChannelSchema = createInsertSchema(jobDistributionChannels).omit({ id: true, updatedAt: true });
export type InsertJobDistributionChannel = z.infer<typeof insertJobDistributionChannelSchema>;
export type JobDistributionChannel = typeof jobDistributionChannels.$inferSelect;

// ============ SPONSORED CAMPAIGNS ============

export const sponsoredCampaigns = pgTable("sponsored_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  model: sponsoredModelEnum("model").notNull().default("FLAT"),
  budgetCents: integer("budget_cents").notNull(),
  spendCents: integer("spend_cents").default(0),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: sponsoredStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_job").on(table.jobId),
]);

export const sponsoredCampaignsRelations = relations(sponsoredCampaigns, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sponsoredCampaigns.tenantId], references: [tenants.id] }),
  job: one(jobs, { fields: [sponsoredCampaigns.jobId], references: [jobs.id] }),
  events: many(sponsoredEvents),
}));

export const insertSponsoredCampaignSchema = createInsertSchema(sponsoredCampaigns).omit({ id: true, createdAt: true, spendCents: true });
export type InsertSponsoredCampaign = z.infer<typeof insertSponsoredCampaignSchema>;
export type SponsoredCampaign = typeof sponsoredCampaigns.$inferSelect;

// ============ SPONSORED EVENTS ============

export const sponsoredEvents = pgTable("sponsored_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  campaignId: varchar("campaign_id").notNull().references(() => sponsoredCampaigns.id, { onDelete: "cascade" }),
  type: sponsoredEventTypeEnum("type").notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_event_campaign").on(table.campaignId),
]);

export const sponsoredEventsRelations = relations(sponsoredEvents, ({ one }) => ({
  campaign: one(sponsoredCampaigns, { fields: [sponsoredEvents.campaignId], references: [sponsoredCampaigns.id] }),
}));

export const insertSponsoredEventSchema = createInsertSchema(sponsoredEvents).omit({ id: true, createdAt: true });
export type InsertSponsoredEvent = z.infer<typeof insertSponsoredEventSchema>;
export type SponsoredEvent = typeof sponsoredEvents.$inferSelect;

// ============ NOTIFICATIONS ============

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  dataJson: jsonb("data_json"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notification_user").on(table.userId),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============ AUDIT EVENTS ============

export const auditEvents = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_tenant").on(table.tenantId),
  index("idx_audit_created").on(table.createdAt),
]);

export const insertAuditEventSchema = createInsertSchema(auditEvents).omit({ id: true, createdAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEvents.$inferSelect;

// ============ BILLING ENUMS ============

export const subscriptionStatusEnum = pgEnum("subscription_status", ["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING", "UNPAID"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]);
export const payoutStatusEnum = pgEnum("payout_status", ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);
export const jobImportStatusEnum = pgEnum("job_import_status", ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

// ============ TENANT BILLING ============

export const tenantBilling = pgTable("tenant_billing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().unique().references(() => tenants.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_billing_tenant").on(table.tenantId),
  index("idx_billing_stripe_customer").on(table.stripeCustomerId),
]);

export const tenantBillingRelations = relations(tenantBilling, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantBilling.tenantId], references: [tenants.id] }),
}));

export const insertTenantBillingSchema = createInsertSchema(tenantBilling).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenantBilling = z.infer<typeof insertTenantBillingSchema>;
export type TenantBilling = typeof tenantBilling.$inferSelect;

// ============ PAYMENT HISTORY ============

export const paymentHistory = pgTable("payment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeInvoiceId: text("stripe_invoice_id"),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("usd"),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_tenant").on(table.tenantId),
]);

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  tenant: one(tenants, { fields: [paymentHistory.tenantId], references: [tenants.id] }),
}));

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({ id: true, createdAt: true });
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;

// ============ WORKER PAYOUT ACCOUNTS (Stripe Connect) ============

export const workerPayoutAccounts = pgTable("worker_payout_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status"),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  chargesEnabled: boolean("charges_enabled").default(false),
  detailsSubmitted: boolean("details_submitted").default(false),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_payout_account_user").on(table.userId),
  index("idx_payout_account_stripe").on(table.stripeAccountId),
]);

export const insertWorkerPayoutAccountSchema = createInsertSchema(workerPayoutAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorkerPayoutAccount = z.infer<typeof insertWorkerPayoutAccountSchema>;
export type WorkerPayoutAccount = typeof workerPayoutAccounts.$inferSelect;

// ============ GIG PAYOUTS ============

export const gigPayouts = pgTable("gig_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  gigAssignmentId: varchar("gig_assignment_id").notNull().references(() => gigAssignments.id, { onDelete: "cascade" }),
  workerUserId: varchar("worker_user_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").default(0),
  netAmountCents: integer("net_amount_cents").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  status: payoutStatusEnum("status").notNull().default("PENDING"),
  approvedByUserId: varchar("approved_by_user_id"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payout_tenant").on(table.tenantId),
  index("idx_payout_assignment").on(table.gigAssignmentId),
  index("idx_payout_worker").on(table.workerUserId),
]);

export const gigPayoutsRelations = relations(gigPayouts, ({ one }) => ({
  tenant: one(tenants, { fields: [gigPayouts.tenantId], references: [tenants.id] }),
  gigAssignment: one(gigAssignments, { fields: [gigPayouts.gigAssignmentId], references: [gigAssignments.id] }),
}));

export const insertGigPayoutSchema = createInsertSchema(gigPayouts).omit({ id: true, createdAt: true });
export type InsertGigPayout = z.infer<typeof insertGigPayoutSchema>;
export type GigPayout = typeof gigPayouts.$inferSelect;

// ============ GIG RATINGS ============

export const gigRatings = pgTable("gig_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gigAssignmentId: varchar("gig_assignment_id").notNull().references(() => gigAssignments.id, { onDelete: "cascade" }),
  raterUserId: varchar("rater_user_id").notNull(),
  ratedUserId: varchar("rated_user_id").notNull(),
  raterType: text("rater_type").notNull(), // 'EMPLOYER' or 'WORKER'
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rating_assignment").on(table.gigAssignmentId),
  index("idx_rating_rater").on(table.raterUserId),
  index("idx_rating_rated").on(table.ratedUserId),
]);

export const gigRatingsRelations = relations(gigRatings, ({ one }) => ({
  gigAssignment: one(gigAssignments, { fields: [gigRatings.gigAssignmentId], references: [gigAssignments.id] }),
}));

export const insertGigRatingSchema = createInsertSchema(gigRatings).omit({ id: true, createdAt: true });
export type InsertGigRating = z.infer<typeof insertGigRatingSchema>;
export type GigRating = typeof gigRatings.$inferSelect;

// ============ JOB IMPORTS ============

export const jobImports = pgTable("job_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fileName: text("file_name"),
  source: text("source").default("CSV"),
  totalRows: integer("total_rows").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  status: jobImportStatusEnum("status").notNull().default("PENDING"),
  errorLog: jsonb("error_log"),
  importedByUserId: varchar("imported_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_import_tenant").on(table.tenantId),
]);

export const jobImportsRelations = relations(jobImports, ({ one }) => ({
  tenant: one(tenants, { fields: [jobImports.tenantId], references: [tenants.id] }),
}));

export const insertJobImportSchema = createInsertSchema(jobImports).omit({ id: true, createdAt: true });
export type InsertJobImport = z.infer<typeof insertJobImportSchema>;
export type JobImport = typeof jobImports.$inferSelect;

// ============ SUBSCRIPTION EVENTS (for MRR/churn tracking) ============

export const subscriptionEventTypeEnum = pgEnum("subscription_event_type", ["CREATED", "UPGRADED", "DOWNGRADED", "CANCELED", "REACTIVATED", "TRIAL_STARTED", "TRIAL_ENDED"]);

export const subscriptionEvents = pgTable("subscription_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  eventType: subscriptionEventTypeEnum("event_type").notNull(),
  fromPlan: planTypeEnum("from_plan"),
  toPlan: planTypeEnum("to_plan"),
  mrrChangeCents: integer("mrr_change_cents").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sub_event_tenant").on(table.tenantId),
  index("idx_sub_event_created").on(table.createdAt),
]);

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({ id: true, createdAt: true });
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;

// ============ FEATURE FLAGS ============

export const featureFlags = pgTable("feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").default(false),
  enabledForPlans: text("enabled_for_plans").array(),
  enabledForTenants: text("enabled_for_tenants").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;

// ============ COUPONS ============

export const couponTypeEnum = pgEnum("coupon_type", ["PERCENT_OFF", "AMOUNT_OFF", "FREE_TRIAL_DAYS"]);

export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  type: couponTypeEnum("type").notNull(),
  value: integer("value").notNull(),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  applicablePlans: text("applicable_plans").array(),
  stripeCouponId: text("stripe_coupon_id"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_coupon_code").on(table.code),
]);

export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true, currentRedemptions: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

// ============ COUPON REDEMPTIONS ============

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at").defaultNow(),
}, (table) => [
  index("idx_redemption_coupon").on(table.couponId),
  index("idx_redemption_tenant").on(table.tenantId),
]);

export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptions).omit({ id: true, redeemedAt: true });
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;

// ============ SMS MESSAGES ============

export const smsStatusEnum = pgEnum("sms_status", ["PENDING", "SENT", "DELIVERED", "FAILED"]);

export const smsMessages = pgTable("sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  senderUserId: varchar("sender_user_id").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  recipientUserId: varchar("recipient_user_id"),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "set null" }),
  message: text("message").notNull(),
  status: smsStatusEnum("status").notNull().default("PENDING"),
  twilioMessageSid: text("twilio_message_sid"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sms_tenant").on(table.tenantId),
  index("idx_sms_application").on(table.applicationId),
]);

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({ id: true, createdAt: true, sentAt: true, deliveredAt: true });
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;

// ============ INTERVIEW SCHEDULING (Self-Scheduling) ============

export const interviewSlots = pgTable("interview_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  createdByUserId: varchar("created_by_user_id").notNull(),
  title: text("title"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  durationMinutes: integer("duration_minutes").default(30),
  locationId: varchar("location_id").references(() => locations.id, { onDelete: "set null" }),
  maxBookings: integer("max_bookings").default(1),
  currentBookings: integer("current_bookings").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_slot_tenant").on(table.tenantId),
  index("idx_slot_start").on(table.startAt),
]);

export const insertInterviewSlotSchema = createInsertSchema(interviewSlots).omit({ id: true, createdAt: true, currentBookings: true });
export type InsertInterviewSlot = z.infer<typeof insertInterviewSlotSchema>;
export type InterviewSlot = typeof interviewSlots.$inferSelect;

// ============ INTERVIEW BOOKINGS ============

export const interviewBookingStatusEnum = pgEnum("interview_booking_status", ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

export const interviewBookings = pgTable("interview_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slotId: varchar("slot_id").notNull().references(() => interviewSlots.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "set null" }),
  candidateUserId: varchar("candidate_user_id"),
  candidateName: text("candidate_name"),
  candidateEmail: text("candidate_email"),
  candidatePhone: text("candidate_phone"),
  status: interviewBookingStatusEnum("status").notNull().default("SCHEDULED"),
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_booking_slot").on(table.slotId),
  index("idx_booking_application").on(table.applicationId),
]);

export const insertInterviewBookingSchema = createInsertSchema(interviewBookings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInterviewBooking = z.infer<typeof insertInterviewBookingSchema>;
export type InterviewBooking = typeof interviewBookings.$inferSelect;

// ============ JOB TEMPLATES ============

export const jobTemplates = pgTable("job_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  isSystem: boolean("is_system").default(false),
  name: text("name").notNull(),
  role: text("role").notNull(),
  category: text("category"),
  title: text("title").notNull(),
  description: text("description"),
  requirements: text("requirements").array(),
  responsibilities: text("responsibilities").array(),
  benefits: text("benefits").array(),
  jobType: jobTypeEnum("job_type").default("FULL_TIME"),
  payRangeMin: integer("pay_range_min"),
  payRangeMax: integer("pay_range_max"),
  scheduleTags: text("schedule_tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_template_tenant_job").on(table.tenantId),
  index("idx_template_role").on(table.role),
]);

export const insertJobTemplateSchema = createInsertSchema(jobTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobTemplate = z.infer<typeof insertJobTemplateSchema>;
export type JobTemplate = typeof jobTemplates.$inferSelect;

// ============ MESSAGE TEMPLATES ============

export const messageTemplateTypeEnum = pgEnum("message_template_type", ["EMAIL", "SMS", "IN_APP"]);

export const messageTemplates = pgTable("message_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  isSystem: boolean("is_system").default(false),
  name: text("name").notNull(),
  category: text("category"),
  type: messageTemplateTypeEnum("type").notNull().default("EMAIL"),
  subject: text("subject"),
  body: text("body").notNull(),
  variables: text("variables").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_msg_template_tenant").on(table.tenantId),
]);

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMessageTemplate = z.infer<typeof insertMessageTemplateSchema>;
export type MessageTemplate = typeof messageTemplates.$inferSelect;

// ============ BACKGROUND CHECK REQUESTS ============

export const backgroundCheckStatusEnum = pgEnum("background_check_status", ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "EXPIRED"]);

export const backgroundCheckRequests = pgTable("background_check_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "set null" }),
  candidateUserId: varchar("candidate_user_id"),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  checkType: text("check_type").default("standard"),
  status: backgroundCheckStatusEnum("status").notNull().default("PENDING"),
  providerReferenceId: text("provider_reference_id"),
  resultJson: jsonb("result_json"),
  requestedByUserId: varchar("requested_by_user_id").notNull(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bgcheck_tenant").on(table.tenantId),
  index("idx_bgcheck_application").on(table.applicationId),
]);

export const insertBackgroundCheckRequestSchema = createInsertSchema(backgroundCheckRequests).omit({ id: true, createdAt: true, completedAt: true });
export type InsertBackgroundCheckRequest = z.infer<typeof insertBackgroundCheckRequestSchema>;
export type BackgroundCheckRequest = typeof backgroundCheckRequests.$inferSelect;

// ============ ONBOARDING DOCUMENTS ============

export const onboardingDocTypeEnum = pgEnum("onboarding_doc_type", ["OFFER_LETTER", "W4", "I9", "DIRECT_DEPOSIT", "HANDBOOK_ACK", "NDA", "CUSTOM"]);
export const onboardingDocStatusEnum = pgEnum("onboarding_doc_status", ["PENDING", "SENT", "VIEWED", "SIGNED", "REJECTED"]);

export const onboardingDocuments = pgTable("onboarding_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "set null" }),
  recipientUserId: varchar("recipient_user_id"),
  recipientEmail: text("recipient_email").notNull(),
  docType: onboardingDocTypeEnum("doc_type").notNull(),
  title: text("title").notNull(),
  templateUrl: text("template_url"),
  signedUrl: text("signed_url"),
  status: onboardingDocStatusEnum("status").notNull().default("PENDING"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_onboarding_tenant").on(table.tenantId),
  index("idx_onboarding_application").on(table.applicationId),
]);

export const insertOnboardingDocumentSchema = createInsertSchema(onboardingDocuments).omit({ id: true, createdAt: true, sentAt: true, viewedAt: true, signedAt: true });
export type InsertOnboardingDocument = z.infer<typeof insertOnboardingDocumentSchema>;
export type OnboardingDocument = typeof onboardingDocuments.$inferSelect;

// ============ ONBOARDING CHECKLISTS ============

export const onboardingChecklists = pgTable("onboarding_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  applicationId: varchar("application_id").references(() => applications.id, { onDelete: "set null" }),
  recipientUserId: varchar("recipient_user_id"),
  title: text("title").notNull(),
  items: jsonb("items").notNull(),
  completedItems: integer("completed_items").default(0),
  totalItems: integer("total_items").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_checklist_tenant").on(table.tenantId),
  index("idx_checklist_application").on(table.applicationId),
]);

export const insertOnboardingChecklistSchema = createInsertSchema(onboardingChecklists).omit({ id: true, createdAt: true, completedAt: true, completedItems: true });
export type InsertOnboardingChecklist = z.infer<typeof insertOnboardingChecklistSchema>;
export type OnboardingChecklist = typeof onboardingChecklists.$inferSelect;

// ============ ADMIN IMPERSONATION SESSIONS ============

export const impersonationSessions = pgTable("impersonation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull(),
  targetUserId: varchar("target_user_id").notNull(),
  reason: text("reason"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
}, (table) => [
  index("idx_impersonation_admin").on(table.adminUserId),
  index("idx_impersonation_target").on(table.targetUserId),
]);

export const insertImpersonationSessionSchema = createInsertSchema(impersonationSessions).omit({ id: true, startedAt: true, endedAt: true });
export type InsertImpersonationSession = z.infer<typeof insertImpersonationSessionSchema>;
export type ImpersonationSession = typeof impersonationSessions.$inferSelect;

// ============ TENANT USAGE METRICS ============

export const tenantUsageMetrics = pgTable("tenant_usage_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  jobsPosted: integer("jobs_posted").default(0),
  gigsPosted: integer("gigs_posted").default(0),
  applicationsReceived: integer("applications_received").default(0),
  hiresMade: integer("hires_made").default(0),
  interviewsSent: integer("interviews_sent").default(0),
  gigsCompleted: integer("gigs_completed").default(0),
  activeUsers: integer("active_users").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_usage_tenant").on(table.tenantId),
  index("idx_usage_period").on(table.periodStart),
]);

export const insertTenantUsageMetricsSchema = createInsertSchema(tenantUsageMetrics).omit({ id: true, createdAt: true });
export type InsertTenantUsageMetrics = z.infer<typeof insertTenantUsageMetricsSchema>;
export type TenantUsageMetrics = typeof tenantUsageMetrics.$inferSelect;
