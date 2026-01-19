# Krew Recruiter - Hospitality Hiring Platform

## Overview
Krew Recruiter is a comprehensive multi-tenant SaaS hospitality hiring platform featuring:
- **ATS (Applicant Tracking System)** for full-time/part-time job management
- **Gig Marketplace** for short-term shift workers (Krew Gigs)
- **Async Video/Text Interviews** with reusable templates
- **Job Board Distribution** to Indeed, ZipRecruiter, and aggregators
- **Sponsored Job Campaigns** with flat/PPC pricing models
- **Multi-tenant RBAC** with 6 role types

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **Routing**: Wouter (client-side)

## Project Structure
```
├── client/src/
│   ├── components/          # Reusable UI components
│   │   ├── app-sidebar.tsx  # Main navigation sidebar
│   │   ├── theme-toggle.tsx # Dark/light mode toggle
│   │   └── ui/              # shadcn components
│   ├── hooks/               # React hooks (use-auth, use-toast)
│   ├── lib/                 # Utilities (queryClient, tenant-context)
│   ├── pages/               # Route pages
│   │   ├── landing.tsx      # Public landing page
│   │   ├── dashboard.tsx    # Main dashboard
│   │   ├── locations.tsx    # Location CRUD
│   │   ├── jobs.tsx         # Jobs list
│   │   ├── job-create.tsx   # Job creation wizard
│   │   ├── applicants.tsx   # ATS pipeline view
│   │   ├── gigs.tsx         # Employer gig management
│   │   ├── gig-create.tsx   # Gig posting form
│   │   ├── gig-board.tsx    # Public gig marketplace
│   │   ├── interviews.tsx   # Interview templates/invites
│   │   └── settings.tsx     # Org/team/billing settings
│   └── App.tsx              # Router and layout
├── server/
│   ├── routes.ts            # API endpoints
│   ├── storage.ts           # Database operations (IStorage)
│   ├── db.ts                # Drizzle database connection
│   └── replit_integrations/ # Replit Auth module
├── shared/
│   ├── schema.ts            # Drizzle schemas + types
│   └── models/auth.ts       # Auth-related schemas
└── drizzle.config.ts        # Drizzle Kit configuration
```

## Database Schema
20+ tables organized by domain:

### Core Tenancy
- `tenants` - Organizations (name, slug, planType)
- `tenant_memberships` - User-tenant relationships with RBAC roles

### Hiring
- `locations` - Venue locations for each tenant
- `jobs` - Job postings (title, role, pay, status, scheduleTags)
- `applications` - Job applications with ATS stages

### Gig Marketplace
- `gig_posts` - Short-term shift postings
- `gig_assignments` - Worker-to-gig assignments
- `gig_worker_profiles` - Worker vetting and preferences

### Interviews
- `interview_templates` - Reusable question sets
- `interview_questions` - Individual prompts with time limits
- `interview_invites` - Candidate interview sessions
- `interview_responses` - Text/video answers

### Distribution & Sponsored
- `integration_connections` - Job board API credentials
- `job_distribution_channels` - Posted job tracking
- `sponsored_campaigns` - Paid promotion campaigns

## RBAC Role Hierarchy
1. **OWNER** - Full access, billing, delete org
2. **ADMIN** - Manage team, all features
3. **HIRING_MANAGER** - Create/edit jobs, gigs, interviews
4. **LOCATION_MANAGER** - Manage assigned location's gigs
5. **REVIEWER** - Review applications, score interviews
6. **VIEWER** - Read-only access

## FOH/BOH Hospitality Roles
Pre-configured roles for hospitality:
- **FOH**: Server, Bartender, Host, Busser, Cocktail Server, etc.
- **BOH**: Line Cook, Prep Cook, Dishwasher, Sous Chef, etc.

## API Endpoints
All routes prefixed with `/api`

### Auth
- `GET /api/auth/user` - Current user info
- `GET /api/login` - Initiate OAuth flow
- `GET /api/logout` - End session

### Tenants
- `GET /api/tenants/memberships` - User's organizations
- `POST /api/tenants` - Create organization
- `POST /api/tenants/:id/invite` - Invite team member

### Dashboard
- `GET /api/dashboard/stats` - Overview statistics

### Locations (require tenant context)
- `GET /api/locations` - List locations
- `POST /api/locations` - Create location
- `PATCH /api/locations/:id` - Update location
- `DELETE /api/locations/:id` - Delete location

### Jobs (require tenant context)
- `GET /api/jobs` - List jobs with location info
- `GET /api/jobs/:id` - Job details with applications
- `POST /api/jobs` - Create job
- `PATCH /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Applications
- `GET /api/applications` - List with job info
- `PATCH /api/applications/:id` - Update stage

### Gigs
- `GET /api/gigs/public` - Public marketplace (no auth)
- `GET /api/gigs` - Tenant's gig posts
- `POST /api/gigs` - Create gig
- `PATCH /api/gigs/:id` - Update gig
- `DELETE /api/gigs/:id` - Delete gig

### Interviews
- `GET /api/interviews/templates` - List templates with questions
- `POST /api/interviews/templates` - Create template
- `DELETE /api/interviews/templates/:id` - Delete template
- `POST /api/interviews/questions` - Add question
- `GET /api/interviews/invites` - List interview invites

## Design System
Professional hospitality theme with:
- **Primary**: Teal (173 58% 39%)
- **Secondary**: Warm Amber (35 90% 55%)
- Dark mode support with carefully tuned colors
- Custom elevation utilities (hover-elevate, active-elevate-2)

## Development
```bash
npm run dev          # Start development server
npm run db:push      # Push schema to database
npm run build        # Build for production
```

## Recent Changes
- Initial MVP implementation with complete schema
- Multi-tenant architecture with cookie-based tenant selection
- Full RBAC with 6 role types
- Professional landing page with hospitality theme
- Dashboard with stats and recent activity
- Location CRUD with timezone support
- Job creation wizard with 3 steps (fixed SelectGroup/SelectLabel for role categories)
- Applicant pipeline view (Kanban-style)
- Gig marketplace (public board + employer management)
- Interview templates with question management
- Settings with org/team/billing/integrations tabs

### Dual Experience Architecture (Latest)
- **Onboarding Flow**: New users at /onboarding choose between "Job Seeker" or "Employer"
- **Job Seeker Experience**: 
  - Profile builder at /seeker/profile (skills, experience, availability)
  - Dashboard at /seeker with application tracking
  - Saved jobs at /seeker/saved (API-backed with POST/DELETE /api/saved-jobs)
  - Job search at /jobs with filters and save functionality
- **Employer Experience**:
  - Dashboard at /app with hiring stats
  - Job posting at /app/jobs/new (multi-step wizard)
  - Applicant management at /app/applicants (pipeline view)
  - Gig management at /app/gigs
- **Role-based Routing**: Protected routes check userType and redirect to correct dashboard
  - Job seekers trying to access /app/* are redirected to /seeker
  - Employers trying to access /seeker/* are redirected to /app
  - Users without profiles are redirected to /onboarding

## User Preferences
- Dark mode enabled by default (respects system preference)
- Sidebar collapsible for more workspace
- Hospitality-focused role selection (40+ predefined roles)
