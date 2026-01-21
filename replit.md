# Krew Recruiter - Hospitality Hiring Platform

## Overview
Krew Recruiter is a multi-tenant SaaS platform designed for the hospitality industry, streamlining the hiring process for both full-time/part-time positions and short-term gig workers. It integrates an Applicant Tracking System (ATS), a Gig Marketplace, and asynchronous video/text interviews. The platform aims to be a comprehensive solution for hospitality businesses to attract, manage, and hire talent efficiently, including robust job board distribution and sponsored campaign capabilities. It includes features for subscription billing and worker payouts to monetize its services.

## User Preferences
- Dark mode enabled by default (respects system preference)
- Sidebar collapsible for more workspace
- Hospitality-focused role selection (40+ predefined roles)

## System Architecture
The platform utilizes a modern web stack with **React + Vite + Tailwind CSS** for the frontend, **Express.js + TypeScript** for the backend, and **PostgreSQL with Drizzle ORM** for database management. Authentication is handled via a custom email/password system, and client-side routing uses Wouter.

Key architectural decisions include:
- **Multi-tenant RBAC**: A robust role-based access control system with 6 distinct roles (OWNER, ADMIN, HIRING_MANAGER, LOCATION_MANAGER, REVIEWER, VIEWER) to manage organizational access and permissions.
- **Dual Experience Architecture**: Separate user flows and dashboards for "Job Seekers" and "Employers," including role-based routing and protected routes.
- **Comprehensive Database Schema**: Over 20 tables covering core tenancy, hiring processes (jobs, applications), gig marketplace operations, and interview management.
- **Asynchronous Video Interview System**: Full one-way video interview capabilities, including candidate portals with GDPR consent, system checks, in-browser recording, configurable think time, and retake limits. Recruiter features include video prompt recording, deadline management, bulk invites, and analytics.
- **Design System**: A professional hospitality theme featuring a purple/magenta primary color, warm amber secondary accents, and consistent branding with logo integration across light and dark modes.
- **Monetization**: Integrated Stripe for subscription billing (Free/Pro/Enterprise tiers) and Stripe Connect Express for gig worker payouts, including onboarding flows.
- **Feature Flags System**: A super admin portal feature that allows control over feature rollouts, enabling/disabling features per subscription plan.
- **Business Intelligence Dashboard**: For super admins, providing MRR/ARR tracking, churn rate analysis, and tenant health scores.
- **API-First Approach**: All functionalities exposed through well-defined RESTful API endpoints.

## External Dependencies
- **Stripe**: For subscription billing (Stripe Checkout, Customer Portal) and worker payouts (Stripe Connect Express).
- **Indeed, ZipRecruiter**: For job board distribution and aggregation.
- **MediaRecorder API**: For in-browser video capture in the interview system.