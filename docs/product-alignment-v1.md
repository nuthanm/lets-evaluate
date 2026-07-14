# Let's Evaluate

## Organization-Wide Product Alignment & Acceptance Document

| Field | Value |
|-------|-------|
| **Product** | Let's Evaluate |
| **Document type** | Organization-wide acceptance & alignment brief |
| **Version** | 1.0 |
| **Status** | Draft for team review |
| **Audience** | TA team, interviewers, engineering, leadership |
| **Date** | July 2026 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Vision & Objectives](#3-vision--objectives)
4. [Users & Personas](#4-users--personas)
5. [Product Scope — Feature Inventory](#5-product-scope--feature-inventory)
6. [Target Workflow](#6-target-workflow)
7. [Gap Analysis & Recommendations](#7-gap-analysis--recommendations)
8. [Technical Architecture](#8-technical-architecture)
9. [Phased Delivery Plan](#9-phased-delivery-plan)
10. [Success Metrics](#10-success-metrics)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Team Acceptance Checklist](#12-team-acceptance-checklist)
13. [Appendix — Codebase Mapping](#13-appendix--codebase-mapping)

---

## 1. Executive Summary

**Let's Evaluate** is an end-to-end technical hiring platform that keeps recruiters, interviewers, and (later) administrators in a single portal — from resume screening through structured interviews to candidate communication and reporting.

**Core promise:** Reduce wasted recruiter and interviewer time by aligning project requirements, role expectations, interview content, and outcomes *before* and *during* interviews — not after.

**Strategic direction:** Build and validate internally first. Once proven to save time and improve hiring quality, package as a white-label SaaS product (similar to Zoho) with per-organization branding, domains, and configuration.

**Current state:** A working prototype exists (Streamlit/Python) and an active Next.js rewrite with organization tenancy, role-based access, white-label branding, TA→interviewer workflow, and AI-powered resume analysis. Several features from this ideation are partially built; others are planned but not yet implemented.

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Area | Impact |
|-----------|--------|
| **Misaligned screening** | TA screens without full project context → unsuitable candidates reach the panel |
| **Panel mismatch** | Interviewers assigned without clear role/project fit |
| **High rejection rate post-interview** | Time lost for recruiters, interviewers, and candidates |
| **Fragmented tooling** | Resume review, evaluation, assignment, and email happen across multiple tools |
| **Template mismatch** | Emails describe Lead/Developer/Architect roles inconsistently vs. the actual interview |
| **No single source of truth** | No shared timeline, status, or audit trail across the hiring flow |
| **Slow closure** | Long cycles from screen → interview → decision → candidate communication |

### 2.2 Root Causes

1. Requirements (project + role) are not enforced at screening time.
2. Interview preparation is ad hoc — no structured question bank or draft workflow.
3. Communication is disconnected from evaluation state.
4. No visibility into panel availability, ETAs, or pipeline health.

---

## 3. Vision & Objectives

### 3.1 Vision

One configurable portal where hiring teams run the full technical evaluation lifecycle — with AI assistance where it saves time, and human judgment where it matters.

### 3.2 Objectives

| # | Objective | Success Indicator |
|---|-----------|-------------------|
| O1 | **Unified workflow** | No context switching for resume, evaluation, assignment, and mail |
| O2 | **Requirement alignment** | Screening and interview content tied to project + role configuration |
| O3 | **Time savings** | Measurable reduction in unsuitable interviews and cycle time |
| O4 | **Configurable product** | Branding, domain, templates, and flows configurable per deployment |
| O5 | **Auditability** | Full candidate timeline and decision history |
| O6 | **Commercial readiness** | Multi-tenant / resale path documented and validated |

### 3.3 Non-Goals (Initial Validation Phase)

- Full ATS replacement (Greenhouse, Lever, etc.)
- Built-in video conferencing (integrate instead)
- Fully autonomous hiring decisions without human review
- Multi-org SaaS billing in MVP (single org per deployment first)

---

## 4. Users & Personas

| Persona | Primary Needs | Module |
|---------|---------------|--------|
| **Recruiter (TA)** | Pipeline visibility, project/role setup, screening, assignment, candidate communication | Recruiter |
| **Interviewer (Panel)** | Schedule visibility, preparation, structured evaluation, submit report | Interviewer |
| **Admin** (future) | Users, org settings, projects, roles, policies | Admin |
| **Candidate** (indirect) | Clear, accurate communication; timely updates | Email triggers only |

### Role-Based Access (Target)

| Role | Permissions |
|------|-------------|
| `ta` | Full recruiter workflow; cannot override org configuration |
| `interviewer` | Assigned cases only; question bank; submit evaluations |
| `admin` | Users, org config, mail templates, hierarchy, reporting |

*Status: `admin`, `ta`, and `interviewer` RBAC already implemented in the Next.js application.*

---

## 5. Product Scope — Feature Inventory

### 5.1 Platform & Authentication

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Sign up / Sign in | Domain-restricted email registration | P0 | **Built** |
| Two-factor authentication | TOTP or email OTP | P1 | **Not built** |
| Org-wide SSO | Microsoft Entra ID / Azure AD | P1 | **Partial** — provider scaffolded |
| Session security | JWT, bcrypt, rate limits | P0 | **Built** |
| White-label branding | Name, tagline, colors, logo, favicon | P0 | **Built** |

### 5.2 Recruiter Module

| # | Feature | Priority | Status | Notes |
|---|---------|----------|--------|-------|
| R1 | Dashboard — ongoing interviews, panel availability, ETA | P0 | **Partial** | Stats exist; panel calendar and ETA missing |
| R2 | Project configuration | P0 | **Built** | Tech stack, CRUD |
| R3 | Role configuration | P0 | **Built** | Requirements per role |
| R4 | Panel timeline & slot booking | P1 | **Not built** | Critical for scheduling alignment |
| R5 | Mail templates (schedule, receive, shortlist, reject) | P0 | **Not built** | Required for candidate communication |
| R6 | Candidate-triggered status emails | P1 | **Not built** | Configurable deployment triggers |
| R7 | Interview hierarchy flow configuration | P1 | **Partial** | Status enum exists; UI-driven stages pending |
| R8 | AI resume evaluation + cross-project suggestion | P0 | **Partial** | Analysis built; cross-project routing pending |
| R9 | Assign interviewer | P0 | **Built** | Assignment workflow exists |
| R10 | Pipeline / kanban view | P1 | **Built** | Needs main navigation placement |

### 5.3 Interviewer Module

| # | Feature | Priority | Status | Notes |
|---|---------|----------|--------|-------|
| I1 | Dashboard — schedules & assignments | P0 | **Partial** | Assignment list exists |
| I2 | View TA screening report (reuse AI output) | P0 | **Built** | Saves duplicate AI cost |
| I3 | Question generation (resume, role, scenario, coding, analytical) | P0 | **Partial** | Standard + resume-based built |
| I4 | Custom prompt for questions | P1 | **Not in web** | Exists in Streamlit legacy app |
| I5 | Question bank with categories | P1 | **Partial** | CRUD exists; taxonomy pending |
| I6 | Per-question rating + comments | P0 | **Partial** | Review schema exists |
| I7 | Draft / prepare before interview | P0 | **Built** | Draft save and resume |
| I8 | AI-refined final evaluation comments | P1 | **Partial** | Code exists; not wired to UI |
| I9 | Submit → PDF report to recruiter | P0 | **Partial** | Streamlit has PDF; web is placeholder |
| I10 | Close case on interviewer side | P0 | **Built** | Assignment completion flow |

### 5.4 Reporting (Both Parties)

| Feature | Priority | Status |
|---------|----------|--------|
| Interview counts by status | P1 | **Partial** — basic stats only |
| Visual charts (org dashboard) | P2 | **Not built** |
| Exportable reports | P2 | **Not built** |

### 5.5 Admin Module (Future)

| Feature | Phase |
|---------|-------|
| User management (invite, deactivate, role change) | Phase 2 |
| Org-wide settings UI (replace env-only config) | Phase 2 |
| Audit log viewer | Phase 2 |
| Template & flow management UI | Phase 2 |

---

## 6. Target Workflow

### 6.1 End-to-End Flow

```
TA uploads resume
    → AI resume analysis (vs. project + role)
        → TA decision: Proceed / Hold / Reject
            → [Reject] Send reject template email
            → [Hold] Hold with notes
            → [Proceed] Assign interviewer + book slot
                → Interviewer views screening report (no re-analysis)
                    → Generate or reuse questions from bank
                        → Optional: save draft and prepare
                            → Conduct interview (rate each question + comments)
                                → AI refine final evaluation comments
                                    → Submit PDF report to recruiter
                                        → Recruiter reviews + sends candidate email
                                            → Archive + reporting metrics

    [If mismatch] AI suggests alternate project → TA confirms reassignment
```

### 6.2 Candidate Status Lifecycle

```
draft → screening → screened_hold / screened_rejected
    → ready_for_interview → assigned → interview_in_progress
        → interview_complete → selected / rejected / hold
```

*Status: Candidate status enum already defined in the database schema.*

---

## 7. Gap Analysis & Recommendations

### 7.1 Strengths of Current Ideation

- **Single-portal workflow** — primary differentiator and correct focus
- **Reuse TA AI analysis for interviewers** — smart cost control
- **Draft preparation before live interview** — reduces interviewer stress
- **Configurable branding for resale** — already started in codebase
- **Structured question bank with categories** — reduces repeat AI calls
- **Interview hierarchy configuration** — supports Lead / Developer / Architect flows

### 7.2 Scope Refinements

| Feature | Recommendation |
|---------|----------------|
| **Panel timeline & booking** | Phase 1: manual availability windows + slot pick. Phase 2: Outlook/Google calendar sync |
| **Candidate mail triggers** | Start with recruiter-initiated + status-change auto-send; add reply parsing later |
| **Cross-project AI routing** | Suggestions only — TA must confirm reassignment |

### 7.3 Recommended Additions

| Gap | Why It Matters | Priority |
|-----|----------------|----------|
| **Candidate record** | Name, email, phone, source, consent | P0 |
| **Interview calendar / ICS** | Send calendar invites with correct role context | P1 |
| **Notification system** | In-app + email when assigned, submitted, overdue | P1 |
| **SLA / ETA tracking** | Dashboard promises ETAs — needs due dates and reminders | P1 |
| **Template variables** | `{{candidate_name}}`, `{{role}}`, `{{project}}`, `{{interview_date}}` | P0 |
| **Evaluation rubric / scorecard** | Weighted criteria per role level (Lead vs. Architect) | P1 |
| **Bias & compliance** | PII handling, data retention, export/delete | P1 |
| **Activity audit log** | Who changed what, when | P1 |
| **Bulk import/export** | Projects, roles, questions | P2 |
| **Legal pages** | Privacy policy, terms and conditions | P2 |
| **Forgot password** | Self-service reset for web app | P1 |
| **AI cost controls** | Per-org budgets, caching, question bank reuse metrics | P1 |
| **Multi-interviewer rounds** | Round 1 screen → Round 2 tech → Round 3 architecture | P2 |

### 7.4 AI Model Strategy

| Use Case | Recommended Model | Rationale |
|----------|-------------------|-----------|
| Resume analysis (scoring, tech match, concerns) | **GPT-4o** or **GPT-4.1** | Structured reasoning; higher accuracy for hiring decisions |
| Cross-project fit suggestion | Same as above + project index in DB | One additional prompt with all active projects |
| Question generation (standard, resume-based) | **GPT-4o-mini** | Fast, cost-effective for question lists |
| Coding / scenario questions | **GPT-4o** | Stronger reasoning for technical scenarios |
| Evaluation comment refinement | **GPT-4o-mini** | Summarization task; code already exists |
| Question deduplication (future) | **text-embedding-3-small** | Avoid regenerating similar questions |

### 7.5 AI Cost Control Strategy

1. Run full resume AI **once** at TA screening — interviewers read cached result.
2. Check question bank before calling AI.
3. Cache analysis by resume hash + project + role version.
4. Rate limit per user (currently: 30 requests per window).
5. Track token usage per organization in audit or dedicated usage table.

---

## 8. Technical Architecture

### 8.1 Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | Next.js 16, React 19, TypeScript | App Router |
| **Styling** | Tailwind CSS 4, design tokens | White-label via CSS variables |
| **API** | Next.js API routes / Server Actions | No separate backend for MVP |
| **Database** | PostgreSQL | Neon (dev) → Azure Postgres (prod) |
| **ORM** | Drizzle ORM | Schema-driven migrations |
| **Auth** | Auth.js (next-auth v5) | Credentials + Microsoft Entra ID |
| **File storage** | Local dev / S3-compatible | Resumes, generated PDFs |
| **Email** | Resend, SendGrid, or Azure Communication Services | Transactional templates |
| **PDF generation** | `@react-pdf/renderer` or Puppeteer | Server-side report generation |
| **AI** | OpenAI API (direct SDK) | No LangChain in web stack |
| **Hosting** | Vercel (app) + Neon/Azure (DB) + S3 (files) | Documented deployment path |
| **Observability** | Sentry, Vercel Analytics | Add before production |
| **CI/CD** | GitHub Actions | Lint, typecheck, migrate, deploy |

### 8.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Browser (Recruiter / Interviewer)               │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│           Next.js Application (Vercel / Azure)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Auth.js  │ │ API      │ │ Branding │ │ PDF / Email    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└───────┬──────────────┬──────────────┬──────────────┬────────┘
        │              │              │              │
   PostgreSQL      OpenAI API      S3 Storage     Email Provider
   (Drizzle)       (GPT-4o/mini)   (resumes/PDF)  (Resend/etc.)
```

### 8.3 External Services

| Service | Purpose | Phase |
|---------|---------|-------|
| **OpenAI** | Resume analysis, questions, comment refinement | P0 |
| **PostgreSQL (Neon/Azure)** | Primary data store | P0 |
| **S3 / R2 / Azure Blob** | Resume and report storage | P1 |
| **Resend / SendGrid** | Transactional email | P0 |
| **Microsoft Entra ID** | Enterprise SSO | P1 |
| **Sentry** | Error monitoring | P1 |
| **Cloudflare / Vercel** | CDN, TLS, custom domains | P1 |

### 8.4 Security Baseline

- Domain-restricted registration with verified email
- Two-factor authentication (TOTP) for users handling candidate PII
- RBAC enforced server-side on every API route
- Resume files: signed URLs, org-scoped paths, encryption at rest
- Audit log for status changes and AI invocations
- `AUTH_SECRET` rotation policy
- No PII in AI logs; resume text truncated in prompts (4,000 character cap)

---

## 9. Phased Delivery Plan

### Phase 0 — Validate Core Loop (4–6 weeks)

**Goal:** TA screens → assigns → interviewer evaluates → recruiter receives PDF → archive

| Deliverable | Acceptance Criteria |
|-------------|---------------------|
| Wire evaluation comment refinement to UI | Interviewer can refine comments before submit |
| PDF report generation | Downloadable PDF from archive |
| Candidate entity with basic fields | Name, email stored with each case |
| Pipeline in main navigation | TA sees all candidates by status |
| Forgot password | Email-based reset for web app |

### Phase 1 — Recruiter Completeness (6–10 weeks)

| Deliverable | Acceptance Criteria |
|-------------|---------------------|
| Mail templates (4 types) | CRUD, preview, send with variables |
| Status-triggered emails | Correct template fires on reject/shortlist/schedule |
| Cross-project AI suggestion | TA sees alternate project when mismatch detected |
| Question bank categories | Project / Role / Experience; reuse without AI |
| Custom question prompt | Port from Streamlit legacy |
| In-app notifications | Assignment and submission alerts |

### Phase 2 — Scheduling & Enterprise (10–16 weeks)

| Deliverable | Acceptance Criteria |
|-------------|---------------------|
| Panel availability & slot booking | Interviewer sets windows; TA books slot |
| Calendar invites (ICS) | Candidate receives invite with correct role context |
| Microsoft Entra SSO | Production-ready with group → role mapping |
| Two-factor authentication | TOTP enrollment and enforcement |
| Admin module v1 | User invite, role assignment, template management |
| Reporting dashboard | Charts: interviews by status, time-to-hire, panel utilization |

### Phase 3 — Commercial / Multi-Tenant SaaS (Future)

- Multi-org per deployment (true tenancy)
- Billing (Stripe)
- Self-service org onboarding
- Custom domains per customer
- API webhooks for ATS integration

---

## 10. Success Metrics

| Metric | Baseline | Target (Post Phase 1) |
|--------|----------|------------------------|
| % interviews resulting in reject after panel | Measure for 30 days | −30% |
| Avg. days from resume to decision | TBD | −25% |
| Recruiter tool switches per candidate | Multiple tools | 1 portal |
| AI cost per candidate | TBD | ≤ 1 analysis + ≤ 1 question gen (with bank reuse) |
| Interviewer prep time | TBD | −40% with drafts + question bank |
| Template mismatch incidents | Qualitative | Zero reported in pilot |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI hallucination in screening | Human-in-the-loop; show resume evidence; never auto-reject |
| Over-reliance on AI questions | Interviewer can edit; bank stores human-approved sets |
| Email deliverability | Reputable provider; SPF/DKIM configured |
| PII exposure | Org-scoped data; encryption; retention policy |
| Scope creep | Strict phase gates; MVP = one complete happy path |
| Dual codebase confusion | Deprecate Streamlit after Phase 0 parity |

---

## 12. Team Acceptance Checklist

### Problem & Vision

- [ ] Team agrees the problem statement reflects daily pain
- [ ] Objectives O1–O6 are accepted as north star
- [ ] Non-goals are understood (not building full ATS in MVP)

### Scope

- [ ] Phase 0 deliverables are the immediate priority
- [ ] Mail templates + PDF are P0 for Phase 0/1
- [ ] Panel scheduling deferred to Phase 2 is acceptable
- [ ] Admin module deferred to Phase 2 is acceptable

### Architecture

- [ ] Next.js + PostgreSQL + OpenAI stack is approved
- [ ] Single org per deployment for validation is acceptable
- [ ] White-label via env config is sufficient for first external customer

### AI Strategy

- [ ] GPT-4o for analysis, GPT-4o-mini for questions approved
- [ ] One-time TA analysis reused by interviewers approved
- [ ] Question bank reuse to control AI cost approved

### Roles & Users

- [ ] TA / Interviewer / Admin RBAC model accepted
- [ ] Domain-restricted signup for pilot; SSO in Phase 2

### Open Questions (Resolve in Meeting)

1. **Email provider** — Resend vs. SendGrid vs. corporate SMTP?
2. **Calendar** — Build native scheduling or integrate Outlook first?
3. **2FA method** — TOTP app vs. email OTP?
4. **Pilot size** — How many recruiters and interviewers for Phase 0?
5. **Streamlit sunset** — Target date to stop maintaining legacy app?

### Sign-Off

| Name | Role | Date | Approved (Y/N) | Comments |
|------|------|------|----------------|----------|
| | TA Lead | | | |
| | Engineering Lead | | | |
| | Interviewer Representative | | | |
| | Product / Management | | | |

---

## 13. Appendix — Codebase Mapping

| Feature Area | Implementation Location |
|--------------|-------------------------|
| Branding / white-label | `web/src/lib/brand.ts`, `BrandTheme.tsx`, `web/.env.example` |
| Auth + domain restriction | `web/src/app/login/`, `web/src/app/register/` |
| Projects / Roles / Questions | `web/src/app/setup/`, API routes |
| AI resume analysis | `web/src/lib/ai/index.ts` (`analyzeResume`, GPT-4o) |
| Question generation | `web/src/lib/ai/index.ts` (GPT-4o-mini) |
| TA → Interviewer workflow | `web/src/lib/db/schema.ts`, `/assignments`, `/evaluate` |
| Drafts | `/api/drafts` |
| Audit events | `evaluation_events` table |
| Legacy reference | Root Streamlit app (`pages/`, `utils/ai_utils.py`) |
| Cloud migration guide | `web/docs/cloud-migration.md` |

---

*Document generated for internal team alignment. Version 1.0 — July 2026.*

**Regenerate PDF:** `python docs/generate-alignment-pdf.py` (requires `reportlab`)
