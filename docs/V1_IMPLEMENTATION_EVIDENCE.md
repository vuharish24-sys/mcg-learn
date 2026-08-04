# MCG Learn V1 — Implementation Evidence

Do not treat this as a product summary. This file lists exact files, APIs, tables, and gaps as verified from the repository.

---

## Recent changes (2026-07-25)

### Feed link previews + management
- Open Graph / YouTube oEmbed / Instagram HTML preview fetch in `src/lib/link-preview.ts`
- Cached on `FeedItem`: `previewTitle`, `previewDescription`, `previewImageUrl`, `previewSiteName`, `previewFetchedAt`
- Migration: `prisma/migrations/20260725100000_feed_link_previews/migration.sql`
- Auto-fetch on create/update (URL change); `ensureMissingPreviews` backfills on feed/dashboard/path pages
- `POST /api/v1/feed/preview` (admin refresh / URL preview)
- `GET|PATCH|DELETE /api/v1/feed/:id` — edit/delete feed items
- Admin UI: `/admin/feed` (+ link from `/admin` and `/feed`)
- Cards: `src/components/feed/feed-preview-card.tsx`, `src/components/ui/media-cover.tsx` (`referrerPolicy="no-referrer"`, `object-contain` square frame, overlay copy uses curated title/description)

### Learning paths (courses) UI
- Path covers use path thumbnail or first item preview image (`src/lib/learning-path-media.ts`)
- Cards/curriculum: `learning-path-card.tsx`, `path-curriculum-row.tsx`
- Pages: `/learning-paths`, `/learning-paths/[slug]`, `/my-learning`, `/admin/learning-paths` show preview media

### Dashboard
- Tabs: **Courses** then **Learning Feed** — `src/components/dashboard/dashboard-learning-tabs.tsx`
- Loads published courses + recent feed with preview cards
- Learners see continue-learning paths in the Courses tab

### Referrals → CRM
- Submit referral lead requires **name + email + phone**
- Columns: `referrals.referred_phone` (`20260725120000_referral_phone`), `referrals.referred_name` (`20260725130000_referral_name`)
- `POST /api/v1/referrals` creates both a `Referral` row **and** a CRM `Lead` (+ note with invite code / partner)
- Lead `source` format: `Referral — {Partner Name} ({CODE})`
- Shown in `/referrals` Lead History and `/crm`

### Trainer registration + login
- Learner register: `/register` (`RegisterForm`)
- Trainer register: `/register/trainer` (`TrainerRegisterForm`)
- Shared login: `/login` — syncs profile via `POST /api/v1/auth/register` after sign-in
- Trainer signup stores `account_type: "trainer"` in Supabase user metadata; sync promotes `users.role` → **TRAINER** and upserts `trainers` row (`userId` linked, status **PENDING**)
- Admin activates trainers on `/trainers` via existing status control
- Middleware treats `/register/*` as auth pages

### Advising profile (lightweight)
- Self-service page: `/profile` (`ProfileForm`)
- Fields on `users`: `date_of_birth`, `qualification`, `field_of_study`, `years_experience`, `career_goal`, `preferred_learning_mode`, `city`, `country`, `advising_notes` (+ existing `full_name`, `phone`)
- Migration: `prisma/migrations/20260725140000_user_advising_profile/migration.sql`
- `GET|PATCH /api/v1/profile` — authenticated user updates own advising profile
- Completeness / advising readiness % on `/profile`; dashboard nudge when incomplete
- Nav: **Profile** for all roles; middleware protects `/profile`

### Referral Commission Engine
- Configurable campaigns (flat / % / hybrid), milestones, triggers, transactions, payouts, audit
- Tables: `referral_campaigns`, `referral_campaign_courses`, `referral_campaign_milestones`, `referral_commission_transactions`, `referral_commission_payments`, `referral_commission_audit_events`
- Migration: `prisma/migrations/20260725150000_referral_commission_engine/migration.sql`
- Admin: `/admin/referral-commissions` (+ approvals, payments, reports)
- Docs: `docs/REFERRAL_COMMISSION_ENGINE.md`
- Existing referral status `REWARDED` / APIs unchanged (parallel engine)

### Referral Campaign Management (full system)
- Additive upgrade: assets, terms, FAQs, participants, referral milestones, expiry, payment proofs, feed publish, clone/archive
- Migration: `prisma/migrations/20260725160000_referral_campaign_management/migration.sql`
- User: `/referral-campaigns`, `/referral-campaigns/[code]`
- Docs: `docs/REFERRAL_CAMPAIGN_MANAGEMENT.md` (ER, APIs, workflows, migration, compatibility)

---

## Authentication

Files:
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/register/trainer/page.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/register-form.tsx`
- `src/components/auth/trainer-register-form.tsx`
- `src/components/auth/logout-button.tsx`
- `src/app/api/v1/auth/register/route.ts` (learner/trainer profile sync)
- `src/lib/auth.ts`
- `src/lib/env.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts` (`/login`, `/register`, `/register/*` are auth pages; `/profile` protected)
- `prisma/schema.prisma` (models `Role`, `Permission`, `RolePermission`, `User`, `Trainer`)
- `prisma/seed.ts` (roles include LEARNER, TRAINER, ADMIN, CAREER_OFFICER)
- `prisma/migrations/20260721184000_initial/migration.sql`
- `prisma/migrations/20260721184500_supabase_integration/migration.sql` (auth.users → users trigger; defaults LEARNER)
- `prisma/migrations/20260725140000_user_advising_profile/migration.sql` (advising columns on `users`)
- `src/app/api/v1/users/[id]/route.ts` (role assignment)
- `src/app/(portal)/admin/page.tsx` (role management UI)
- `src/components/forms/property-select.tsx` (role selector)
- `.env.example`

APIs:
- `POST /api/v1/auth/register` — syncs public profile after signup/login; if `accountType`/`account_type` is trainer, assigns TRAINER role + trainer profile
- login/logout via Supabase Auth client (`signInWithPassword` / `signOut` / `signUp`)
- `PATCH /api/v1/users/:id` (role / active status; Admin only)
- `GET|PATCH /api/v1/profile` — self-service advising profile (see Profile section)

Database Tables:
- `roles`
- `permissions`
- `role_permissions`
- `users` (created as LEARNER by trigger; may be promoted to TRAINER on sync; advising profile columns)
- `trainers` (linked via `user_id` for self-registered trainers)
- Supabase `auth.users` (external; provisioned via trigger)

Pages:
- `/login` (learners and trainers)
- `/register` (learner)
- `/register/trainer` (trainer)
- `/profile` (advising profile)
- `/` → redirects to `/dashboard`
- `/admin` (user role management)

---

## Profile (course advising)

Files:
- `src/app/(portal)/profile/page.tsx`
- `src/components/profile/profile-form.tsx`
- `src/app/api/v1/profile/route.ts`
- `src/services/profile.service.ts`
- `src/lib/profile.ts` (`profileUpdateSchema`, `LEARNING_MODES`)
- `prisma/migrations/20260725140000_user_advising_profile/migration.sql`
- `src/components/layout/portal-nav.tsx` (Profile nav item)
- `src/middleware.ts` (`/profile` protected)
- `src/app/(portal)/dashboard/page.tsx` (incomplete-profile nudge)

APIs:
- `GET /api/v1/profile` — current user advising profile + completeness
- `PATCH /api/v1/profile` — update own advising fields (not email; not role)

Database Tables:
- `users` columns: `date_of_birth`, `qualification`, `field_of_study`, `years_experience`, `career_goal`, `preferred_learning_mode` (`ONLINE`|`HYBRID`|`IN_PERSON`|`SELF_PACED`), `city`, `country`, `advising_notes`

Pages:
- `/profile` — form + advising readiness %
- `/dashboard` — nudge CTA when completeness < advising-ready threshold

Notes:
- Self-service only; Career Officers / Admins do not yet have a dedicated “view learner advising profile” UI.
- No automated course recommendation engine yet — fields are collected for advising workflows.

---

## Dashboard

Files:
- `src/app/(portal)/dashboard/page.tsx`
- `src/services/dashboard.service.ts`
- `src/components/dashboard/dashboard-learning-tabs.tsx`
- `src/components/feed/feed-preview-card.tsx`
- `src/components/learning-path/learning-path-card.tsx`
- `src/app/(portal)/layout.tsx`
- `src/components/layout/portal-nav.tsx`

APIs:
- none (server component + Prisma service; tabs are client UI)

Database Tables:
- reads `leads`, `feed_items`, `learning_paths`, `trainers`, `referrals`, `certificates`, `users` (advising completeness nudge)

Pages:
- `/dashboard` — stats + Courses / Learning Feed tabs; advising profile nudge when incomplete

---

## Feed

Files:
- `src/app/(portal)/feed/page.tsx`
- `src/app/(portal)/admin/feed/page.tsx`
- `src/services/feed.service.ts`
- `src/lib/link-preview.ts`
- `src/lib/feed-form.ts`
- `src/components/feed/feed-preview-card.tsx`
- `src/components/ui/media-cover.tsx`
- `src/app/api/v1/feed/route.ts`
- `src/app/api/v1/feed/[id]/route.ts`
- `src/app/api/v1/feed/[id]/open/route.ts`
- `src/app/api/v1/feed/preview/route.ts`
- `src/app/api/v1/categories/route.ts`
- `src/lib/validation.ts` (`feedItemSchema`)
- `src/components/forms/resource-create-form.tsx` (create + edit/delete)
- `prisma/schema.prisma` (`FeedCategory`, `FeedItem` + preview fields, `FeedType`, `PublishStatus`)
- `prisma/migrations/20260725100000_feed_link_previews/migration.sql`
- `prisma/seed.ts` (default categories)

APIs:
- `GET /api/v1/feed`
- `POST /api/v1/feed` (fetches link preview when `externalUrl` set)
- `GET /api/v1/feed/:id`
- `PATCH /api/v1/feed/:id`
- `DELETE /api/v1/feed/:id`
- `POST /api/v1/feed/preview`
- `GET /api/v1/feed/:id/open`
- `GET /api/v1/categories`
- `POST /api/v1/categories`

Database Tables:
- `feed_categories`
- `feed_items` (includes preview_* columns)

Pages:
- `/feed`
- `/admin/feed` (create / edit / delete)
- `/admin` (category management + link to feed management)

---

## Learning Paths (Courses)

Files:
- `src/app/(portal)/learning-paths/page.tsx`
- `src/app/(portal)/learning-paths/[slug]/page.tsx`
- `src/app/(portal)/my-learning/page.tsx`
- `src/app/(portal)/admin/learning-paths/page.tsx`
- `src/services/learning-path.service.ts`
- `src/lib/learning-path-media.ts`
- `src/components/learning-path/learning-path-card.tsx`
- `src/components/learning-path/path-curriculum-row.tsx`
- `src/components/learning-path/learning-path-form.tsx`
- `src/components/learning-path/learning-path-start-button.tsx`
- `src/app/api/v1/learning-paths/route.ts`
- `src/app/api/v1/learning-paths/[id]/route.ts`
- `prisma/migrations/20260722120000_learning_paths/migration.sql`

APIs:
- `GET|POST /api/v1/learning-paths`
- `GET|PATCH|DELETE /api/v1/learning-paths/:id`
- related: start / complete / quiz attempt routes under learning-paths

Pages:
- `/learning-paths`
- `/learning-paths/[slug]`
- `/my-learning`
- `/admin/learning-paths`

---

## CRM

Files:
- `src/app/(portal)/crm/page.tsx`
- `src/app/(portal)/crm/[id]/page.tsx`
- `src/services/crm.service.ts`
- `src/app/api/v1/leads/route.ts`
- `src/app/api/v1/leads/[id]/route.ts`
- `src/app/api/v1/leads/[id]/notes/route.ts` (and note update route if present)
- `src/components/crm/lead-notes-panel.tsx`
- `src/lib/validation.ts` (`leadSchema`, `leadNoteSchema`)
- `src/components/forms/resource-create-form.tsx`
- `src/components/forms/status-select.tsx`
- `prisma/schema.prisma` (`Lead`, `LeadNote`, `LeadStatus`)
- Referral create path also writes leads: `src/services/referral.service.ts`

APIs:
- `GET /api/v1/leads`
- `POST /api/v1/leads`
- `GET /api/v1/leads/:id`
- `PATCH /api/v1/leads/:id`
- Lead notes create/update under `/api/v1/leads/:id/notes`
- Indirect: `POST /api/v1/referrals` creates a NEW lead with source `Referral — …`

Database Tables:
- `leads`
- `lead_notes`

Pages:
- `/crm`
- `/crm/[id]`

---

## Trainer Network

Files:
- `src/app/(portal)/trainers/page.tsx`
- `src/app/register/trainer/page.tsx`
- `src/components/auth/trainer-register-form.tsx`
- `src/services/trainer.service.ts`
- `src/app/api/v1/trainers/route.ts`
- `src/app/api/v1/trainers/[id]/route.ts`
- `src/app/api/v1/auth/register/route.ts` (self-serve trainer sync)
- `src/lib/validation.ts` (`trainerSchema`)
- `src/components/forms/resource-create-form.tsx` (admin create)
- `src/components/forms/status-select.tsx` (admin activate PENDING → ACTIVE)
- `prisma/schema.prisma` (`Trainer`, `TrainerStatus`, `Trainer.userId`)

APIs:
- `GET /api/v1/trainers`
- `POST /api/v1/trainers` (admin)
- `PATCH /api/v1/trainers/:id` (status / fields)
- `POST /api/v1/auth/register` with `accountType: "trainer"` (self-registration sync)

Database Tables:
- `trainers` (`user_id` unique nullable; self-registered trainers set this)
- `users.role_id` → TRAINER after sync

Pages:
- `/trainers` (ADMIN / TRAINER / CAREER_OFFICER)
- `/register/trainer`
- `/login` (shared sign-in)

Notes:
- Self-registered trainers start as **PENDING** until an Admin sets ACTIVE on `/trainers`.
- Auth trigger still inserts `users` as LEARNER; trainer sync upgrades role.

---

## Referrals

Files:
- `src/app/(portal)/referrals/page.tsx`
- `src/app/(portal)/referrals/join/page.tsx`
- `src/services/referral.service.ts` (creates Referral + CRM Lead + LeadNote)
- `src/services/referral-profile.service.ts`
- `src/app/api/v1/referrals/route.ts`
- `src/app/api/v1/referrals/[id]/route.ts`
- `src/app/api/v1/referrals/join/route.ts`
- `src/app/api/v1/referrals/claim/route.ts`
- `src/app/api/v1/referrals/validate/route.ts`
- `src/lib/validation.ts` (`referralSchema` — name + email + phone)
- `src/lib/env.ts` (`appUrl` for referral links)
- `src/components/forms/resource-create-form.tsx`
- `prisma/schema.prisma` (`Referral`, `ReferralProfile`, `ReferralStatus`)
- `prisma/migrations/20260723100000_referral_profiles/migration.sql`
- `prisma/migrations/20260725120000_referral_phone/migration.sql`
- `prisma/migrations/20260725130000_referral_name/migration.sql`

APIs:
- `GET /api/v1/referrals`
- `POST /api/v1/referrals` (body: `referredName`, `referredEmail`, `referredPhone` → also creates CRM lead)
- `PATCH /api/v1/referrals/:id` (status)
- `POST /api/v1/referrals/join`
- `POST /api/v1/referrals/claim`
- `GET /api/v1/referrals/validate`

Database Tables:
- `referrals` (`referred_name`, `referred_email`, `referred_phone`)
- `referral_profiles`
- writes to `leads` / `lead_notes` on submit

Pages:
- `/referrals`
- `/referrals/join`

---

## Certificates

Files:
- `src/app/(portal)/certificates/page.tsx`
- `src/services/certificate.service.ts`
- `src/app/api/v1/certificates/route.ts`
- `src/app/api/v1/certificates/[id]/pdf/route.ts`
- `src/lib/validation.ts` (`certificateSchema`)
- `src/components/forms/resource-create-form.tsx`
- `prisma/schema.prisma` (`Certificate`)

APIs:
- `GET /api/v1/certificates`
- `POST /api/v1/certificates`
- `GET /api/v1/certificates/:id/pdf`

Database Tables:
- `certificates`

Pages:
- `/certificates`

---

## Monetization

Files:
- `src/app/(portal)/advertisements/page.tsx`
- `src/services/advertisement.service.ts`
- `src/app/api/v1/advertisements/route.ts`
- `src/lib/validation.ts` (`advertisementSchema`)
- `src/components/forms/resource-create-form.tsx`
- `prisma/schema.prisma` (`Advertisement`, `AdvertisementStatus`; feed types `ADVERTISEMENT`, `SPONSORED`, `INTERNAL_PROMOTION`)
- `src/app/(portal)/feed/page.tsx` (ads appear as feed items)

APIs:
- `GET /api/v1/advertisements`
- `POST /api/v1/advertisements`

Database Tables:
- `advertisements`
- uses `feed_items` for rendered sponsored/ad/promotion content

Pages:
- `/advertisements`
- `/feed` (delivery surface)

---

## Admin / Settings (supporting module)

Files:
- `src/app/(portal)/admin/page.tsx`
- `src/app/api/v1/settings/route.ts`
- `src/app/api/v1/categories/route.ts`
- `src/app/api/v1/users/[id]/route.ts`
- `prisma/schema.prisma` (`Setting`)

APIs:
- `GET /api/v1/settings`
- `POST /api/v1/settings`
- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `PATCH /api/v1/users/:id`

Database Tables:
- `settings`
- `users`
- `feed_categories`

Pages:
- `/admin`
- `/admin/feed`
- `/admin/learning-paths`

---

## Shared infrastructure files

- `src/lib/api.ts`
- `src/lib/prisma.ts`
- `src/lib/utils.ts`
- `src/lib/validation.ts`
- `src/lib/profile.ts`
- `src/types/resource.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/badge.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `netlify.toml`
- `README.md`
- `package.json`
- `package-lock.json`

---

## 1. Complete project tree

```
.
|-- .cursor
|   `-- rules.md
|-- docs
|   |-- 01_Product_Vision.md
|   |-- 01_Vision.md
|   |-- 02_Architecture.md
|   |-- 02_Product_Requirements.md
|   |-- 03_Coding_Standards.md
|   |-- 03_Technical_Architecture.md
|   |-- 04_Backlog.md
|   |-- 04_Database_Design.md
|   |-- 05_API_Specification.md
|   |-- 06_UI_UX_Guidelines.md
|   |-- 07_Coding_Standards.md
|   |-- 08_Implementation_Roadmap.md
|   |-- 09_Backlog.md
|   `-- V1_IMPLEMENTATION_EVIDENCE.md
|-- prisma
|   |-- migrations
|   |   |-- 20260721184000_initial
|   |   |   `-- migration.sql
|   |   `-- 20260721184500_supabase_integration
|   |       `-- migration.sql
|   |-- schema.prisma
|   `-- seed.ts
|-- prompts
|   |-- master_prompt.md
|   `-- module_prompt.md
|-- public
|   |-- file.svg
|   |-- globe.svg
|   |-- next.svg
|   |-- vercel.svg
|   `-- window.svg
|-- src
|   |-- app
|   |   |-- (portal)
|   |   |   |-- admin
|   |   |   |   `-- page.tsx
|   |   |   |-- advertisements
|   |   |   |   `-- page.tsx
|   |   |   |-- certificates
|   |   |   |   `-- page.tsx
|   |   |   |-- crm
|   |   |   |   `-- page.tsx
|   |   |   |-- dashboard
|   |   |   |   `-- page.tsx
|   |   |   |-- feed
|   |   |   |   `-- page.tsx
|   |   |   |-- referrals
|   |   |   |   `-- page.tsx
|   |   |   |-- trainers
|   |   |   |   `-- page.tsx
|   |   |   `-- layout.tsx
|   |   |-- api
|   |   |   `-- v1
|   |   |       |-- advertisements
|   |   |       |   `-- route.ts
|   |   |       |-- categories
|   |   |       |   `-- route.ts
|   |   |       |-- certificates
|   |   |       |   |-- [id]
|   |   |       |   |   `-- pdf
|   |   |       |   |       `-- route.ts
|   |   |       |   `-- route.ts
|   |   |       |-- feed
|   |   |       |   |-- [id]
|   |   |       |   |   `-- open
|   |   |       |   |       `-- route.ts
|   |   |       |   `-- route.ts
|   |   |       |-- leads
|   |   |       |   |-- [id]
|   |   |       |   |   `-- route.ts
|   |   |       |   `-- route.ts
|   |   |       |-- referrals
|   |   |       |   `-- route.ts
|   |   |       |-- settings
|   |   |       |   `-- route.ts
|   |   |       |-- trainers
|   |   |       |   |-- [id]
|   |   |       |   |   `-- route.ts
|   |   |       |   `-- route.ts
|   |   |       `-- users
|   |   |           `-- [id]
|   |   |               `-- route.ts
|   |   |-- login
|   |   |   `-- page.tsx
|   |   |-- favicon.ico
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components
|   |   |-- auth
|   |   |   |-- login-form.tsx
|   |   |   `-- logout-button.tsx
|   |   |-- forms
|   |   |   |-- property-select.tsx
|   |   |   |-- resource-create-form.tsx
|   |   |   `-- status-select.tsx
|   |   |-- layout
|   |   |   `-- portal-nav.tsx
|   |   `-- ui
|   |       |-- badge.tsx
|   |       |-- button.tsx
|   |       |-- card.tsx
|   |       `-- input.tsx
|   |-- lib
|   |   |-- supabase
|   |   |   |-- client.ts
|   |   |   `-- server.ts
|   |   |-- api.ts
|   |   |-- auth.ts
|   |   |-- env.ts
|   |   |-- prisma.ts
|   |   |-- utils.ts
|   |   `-- validation.ts
|   |-- services
|   |   |-- advertisement.service.ts
|   |   |-- certificate.service.ts
|   |   |-- crm.service.ts
|   |   |-- dashboard.service.ts
|   |   |-- feed.service.ts
|   |   |-- referral.service.ts
|   |   `-- trainer.service.ts
|   |-- types
|   |   `-- resource.ts
|   `-- middleware.ts
|-- templates
|   |-- api_contract.md
|   |-- module_spec.md
|   `-- sprint_plan.md
|-- .env.example
|-- .gitignore
|-- CURSOR_INSTRUCTIONS.md
|-- eslint.config.mjs
|-- netlify.toml
|-- next.config.ts
|-- next-env.d.ts
|-- package.json
|-- package-lock.json
|-- postcss.config.mjs
|-- README.md
|-- tsconfig.json
`-- tsconfig.tsbuildinfo
```

Absent directories from the requested architecture: `src/hooks/` does not exist.

---

## 2. Prisma schema

Full contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum FeedType {
  ARTICLE
  YOUTUBE
  INSTAGRAM_REEL
  PDF
  QUIZ
  CAREER_TIP
  ANNOUNCEMENT
  WEBINAR
  ADVERTISEMENT
  SPONSORED
  INTERNAL_PROMOTION
}

enum PublishStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum LeadStatus {
  NEW
  CONTACTED
  INTERESTED
  FOLLOW_UP
  ADMITTED
  CLOSED
}

enum TrainerStatus {
  ACTIVE
  INACTIVE
  PENDING
}

enum ReferralStatus {
  PENDING
  QUALIFIED
  REWARDED
  REJECTED
}

enum AdvertisementStatus {
  DRAFT
  ACTIVE
  PAUSED
  ENDED
}

model Role {
  id          String           @id @default(cuid())
  key         String           @unique
  name        String
  users       User[]
  permissions RolePermission[]
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")

  @@map("roles")
}

model Permission {
  id          String           @id @default(cuid())
  key         String           @unique
  description String?
  roles       RolePermission[]
  createdAt   DateTime         @default(now()) @map("created_at")

  @@map("permissions")
}

model RolePermission {
  roleId       String     @map("role_id")
  permissionId String     @map("permission_id")
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model User {
  id            String        @id @db.Uuid
  email         String        @unique
  fullName      String        @map("full_name")
  avatarUrl     String?       @map("avatar_url")
  phone         String?
  dateOfBirth   DateTime?     @map("date_of_birth") @db.Date
  qualification String?
  fieldOfStudy  String?       @map("field_of_study")
  yearsExperience Int?        @map("years_experience")
  careerGoal    String?       @map("career_goal")
  preferredLearningMode String? @map("preferred_learning_mode")
  city          String?
  country       String?
  advisingNotes String?       @map("advising_notes")
  roleId        String        @map("role_id")
  role          Role          @relation(fields: [roleId], references: [id])
  isActive      Boolean       @default(true) @map("is_active")
  assignedLeads Lead[]        @relation("AssignedOfficer")
  trainer       Trainer?
  referralsMade Referral[]    @relation("Referrer")
  referredBy    Referral?     @relation("ReferredUser")
  referralProfile ReferralProfile?
  certificates       Certificate[]
  leadNotes          LeadNote[]
  learningProgress   UserLearningProgress[]
  pathItemCompletions UserPathItemCompletion[]
  quizAttempts       QuizAttempt[]
  createdAt          DateTime      @default(now()) @map("created_at")
  updatedAt          DateTime      @updatedAt @map("updated_at")

  @@index([roleId])
  @@map("users")
}

model FeedCategory {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  description String?
  isActive    Boolean    @default(true) @map("is_active")
  feedItems   FeedItem[]
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  @@map("feed_categories")
}

model FeedItem {
  id            String         @id @default(cuid())
  title         String
  description   String
  thumbnailUrl  String?        @map("thumbnail_url")
  categoryId    String         @map("category_id")
  category      FeedCategory   @relation(fields: [categoryId], references: [id])
  type          FeedType
  externalUrl   String?        @map("external_url")
  content       Json?
  publishedAt   DateTime?      @map("published_at")
  status        PublishStatus  @default(DRAFT)
  priority      Int            @default(0)
  isFeatured    Boolean        @default(false) @map("is_featured")
  viewCount     Int            @default(0) @map("view_count")
  advertisement Advertisement?
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  @@index([status, publishedAt])
  @@index([categoryId])
  @@index([type])
  @@map("feed_items")
}

model Lead {
  id                String     @id @default(cuid())
  fullName          String     @map("full_name")
  email             String?
  phone             String
  status            LeadStatus @default(NEW)
  assignedOfficerId String?    @map("assigned_officer_id")
  assignedOfficer   User?      @relation("AssignedOfficer", fields: [assignedOfficerId], references: [id])
  followUpAt        DateTime?  @map("follow_up_at")
  source            String
  notes             LeadNote[]
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  @@index([status])
  @@index([assignedOfficerId])
  @@index([followUpAt])
  @@map("leads")
}

model LeadNote {
  id        String   @id @default(cuid())
  leadId    String   @map("lead_id")
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  authorId  String   @map("author_id")
  author    User     @relation(fields: [authorId], references: [id])
  body      String
  createdAt DateTime @default(now()) @map("created_at")

  @@index([leadId])
  @@map("lead_notes")
}

model Trainer {
  id              String        @id @default(cuid())
  userId          String?       @unique @map("user_id")
  user            User?         @relation(fields: [userId], references: [id])
  fullName        String        @map("full_name")
  email           String        @unique
  phone           String?
  bio             String?
  experienceYears Int           @default(0) @map("experience_years")
  specializations String[]
  availability    String
  status          TrainerStatus @default(PENDING)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([status])
  @@map("trainers")
}

model Referral {
  id             String         @id @default(cuid())
  referrerId     String         @map("referrer_id")
  referrer       User           @relation("Referrer", fields: [referrerId], references: [id])
  referredUserId String?        @unique @map("referred_user_id")
  referredUser   User?          @relation("ReferredUser", fields: [referredUserId], references: [id])
  code           String         @unique
  referredEmail  String?        @map("referred_email")
  status         ReferralStatus @default(PENDING)
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  @@index([referrerId])
  @@map("referrals")
}

model Certificate {
  id                String   @id @default(cuid())
  certificateNumber String   @unique @map("certificate_number")
  learnerId         String   @map("learner_id")
  learner           User     @relation(fields: [learnerId], references: [id])
  courseName        String   @map("course_name")
  learnerName       String   @map("learner_name")
  issueDate         DateTime @map("issue_date")
  createdAt         DateTime @default(now()) @map("created_at")

  @@index([learnerId])
  @@map("certificates")
}

model Advertisement {
  id          String              @id @default(cuid())
  name        String
  feedItemId  String              @unique @map("feed_item_id")
  feedItem    FeedItem            @relation(fields: [feedItemId], references: [id], onDelete: Cascade)
  advertiser  String?
  startsAt    DateTime            @map("starts_at")
  endsAt      DateTime            @map("ends_at")
  status      AdvertisementStatus @default(DRAFT)
  impressions Int                 @default(0)
  clicks      Int                 @default(0)
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  @@index([status, startsAt, endsAt])
  @@map("advertisements")
}

model Setting {
  key       String   @id
  value     Json
  isPublic  Boolean  @default(false) @map("is_public")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("settings")
}
```

---

## 3. Database migration list

1. `prisma/migrations/20260721184000_initial/migration.sql`  
   Creates enums and tables: `roles`, `permissions`, `role_permissions`, `users`, `feed_categories`, `feed_items`, `leads`, `lead_notes`, `trainers`, `referrals`, `certificates`, `advertisements`, `settings`.

2. `prisma/migrations/20260721184500_supabase_integration/migration.sql`  
   Creates `public.handle_new_auth_user()` trigger on `auth.users`, creates Storage bucket `learning-content`, creates public read storage policy.

3. `prisma/migrations/20260722120000_learning_paths/migration.sql` — learning paths, progress, quiz attempts, certificates linkage.

4. `prisma/migrations/20260723100000_referral_profiles/migration.sql` — referral partner profiles / terms acceptance.

5. `prisma/migrations/20260725100000_feed_link_previews/migration.sql` — `feed_items` preview_* columns.

6. `prisma/migrations/20260725120000_referral_phone/migration.sql` — `referrals.referred_phone`.

7. `prisma/migrations/20260725130000_referral_name/migration.sql` — `referrals.referred_name`.

8. `prisma/migrations/20260725140000_user_advising_profile/migration.sql` — advising profile columns on `users` (`date_of_birth`, `qualification`, `field_of_study`, `years_experience`, `career_goal`, `preferred_learning_mode`, `city`, `country`, `advising_notes`).

9. `prisma/migrations/20260725150000_referral_commission_engine/migration.sql` — referral commission campaigns, milestones, transactions, payments, audit.

10. `prisma/migrations/20260725160000_referral_campaign_management/migration.sql` — campaign assets, terms, FAQs, participants, referral milestones, payment proofs, feed links, campaign audit.

Seed (not a migration): `prisma/seed.ts` — roles, permissions, admin role permissions, feed categories, optional `BOOTSTRAP_ADMIN_EMAIL` promotion.

---

## 4. API endpoint list

| Method | Path | File |
|--------|------|------|
| POST | `/api/v1/auth/register` | `src/app/api/v1/auth/register/route.ts` |
| GET | `/api/v1/feed` | `src/app/api/v1/feed/route.ts` |
| POST | `/api/v1/feed` | `src/app/api/v1/feed/route.ts` |
| GET | `/api/v1/feed/:id` | `src/app/api/v1/feed/[id]/route.ts` |
| PATCH | `/api/v1/feed/:id` | `src/app/api/v1/feed/[id]/route.ts` |
| DELETE | `/api/v1/feed/:id` | `src/app/api/v1/feed/[id]/route.ts` |
| POST | `/api/v1/feed/preview` | `src/app/api/v1/feed/preview/route.ts` |
| GET | `/api/v1/feed/:id/open` | `src/app/api/v1/feed/[id]/open/route.ts` |
| GET | `/api/v1/categories` | `src/app/api/v1/categories/route.ts` |
| POST | `/api/v1/categories` | `src/app/api/v1/categories/route.ts` |
| GET | `/api/v1/leads` | `src/app/api/v1/leads/route.ts` |
| POST | `/api/v1/leads` | `src/app/api/v1/leads/route.ts` |
| GET | `/api/v1/leads/:id` | `src/app/api/v1/leads/[id]/route.ts` |
| PATCH | `/api/v1/leads/:id` | `src/app/api/v1/leads/[id]/route.ts` |
| GET | `/api/v1/trainers` | `src/app/api/v1/trainers/route.ts` |
| POST | `/api/v1/trainers` | `src/app/api/v1/trainers/route.ts` |
| PATCH | `/api/v1/trainers/:id` | `src/app/api/v1/trainers/[id]/route.ts` |
| GET | `/api/v1/referrals` | `src/app/api/v1/referrals/route.ts` |
| POST | `/api/v1/referrals` | `src/app/api/v1/referrals/route.ts` |
| PATCH | `/api/v1/referrals/:id` | `src/app/api/v1/referrals/[id]/route.ts` |
| POST | `/api/v1/referrals/join` | `src/app/api/v1/referrals/join/route.ts` |
| POST | `/api/v1/referrals/claim` | `src/app/api/v1/referrals/claim/route.ts` |
| GET | `/api/v1/referrals/validate` | `src/app/api/v1/referrals/validate/route.ts` |
| GET | `/api/v1/certificates` | `src/app/api/v1/certificates/route.ts` |
| POST | `/api/v1/certificates` | `src/app/api/v1/certificates/route.ts` |
| GET | `/api/v1/certificates/:id/pdf` | `src/app/api/v1/certificates/[id]/pdf/route.ts` |
| GET | `/api/v1/advertisements` | `src/app/api/v1/advertisements/route.ts` |
| POST | `/api/v1/advertisements` | `src/app/api/v1/advertisements/route.ts` |
| GET | `/api/v1/settings` | `src/app/api/v1/settings/route.ts` |
| POST | `/api/v1/settings` | `src/app/api/v1/settings/route.ts` |
| PATCH | `/api/v1/users/:id` | `src/app/api/v1/users/[id]/route.ts` |
| GET | `/api/v1/profile` | `src/app/api/v1/profile/route.ts` |
| PATCH | `/api/v1/profile` | `src/app/api/v1/profile/route.ts` |
| GET/POST | `/api/v1/learning-paths` | `src/app/api/v1/learning-paths/route.ts` |
| GET/PATCH/DELETE | `/api/v1/learning-paths/:id` | `src/app/api/v1/learning-paths/[id]/route.ts` |

---

## 5. Environment variables required

From `.env.example` and code usage:

| Variable | Required by | Used in code? |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth / middleware | Yes (`env.ts`, middleware, browser client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth / middleware | Yes |
| `DATABASE_URL` | Prisma | Yes (`schema.prisma`) |
| `DIRECT_URL` | Prisma migrations | Yes (`schema.prisma`) |
| `NEXT_PUBLIC_APP_URL` | Referral links | Optional; defaults to `http://localhost:3000` |
| `BOOTSTRAP_ADMIN_EMAIL` | Seed admin promotion | Optional; seed only |
| `SUPABASE_SERVICE_ROLE_KEY` | Listed in `.env.example` | **Not referenced in application source** |

---

## 6. Commands to run locally

```bash
cp .env.example .env.local
# fill values in .env.local

npm install
npm run db:generate
npm run db:migrate
npm run db:seed

# create matching user in Supabase Auth, then:
npm run db:seed

npm run dev
```

Quality commands:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

---

## 7. Commands to deploy

```bash
# against production DB (secure machine / CI):
npm run db:migrate
npm run db:seed

# Netlify
# 1. Set all env vars from .env.example (production NEXT_PUBLIC_APP_URL)
# 2. Connect repo; netlify.toml runs:
#    npm run db:generate && npm run build
# 3. Deploy via Netlify UI or:
netlify deploy --prod
```

`netlify.toml`:
- build: `npm run db:generate && npm run build`
- publish: `.next`
- Node: `22`
- plugin: `@netlify/plugin-nextjs`

---

## 8. Incomplete or not fully implemented features

Evidence-based gaps (not mocked with fake data; schema/UI exists without full behavior). Items marked **resolved (2026-07-25)** were closed in recent work; kept here for audit trail.

1. **No `src/hooks/` directory** — architecture requirement unmet.
2. **Signup/register** — **resolved (2026-07-25)** for learners (`/register`) and trainers (`/register/trainer`); email delivery depends on Supabase SMTP / Confirm email settings.
3. **Feed type-specific flows** — quiz/PDF/webinar/career routes exist under `/feed/[id]/*`; still evolve with product needs.
4. **`FeedItem.content` JSON field** — used for quiz/webinar payloads; not a rich CMS editor.
5. **Featured filter** — feed UI includes Featured control + API `?featured=true`.
6. **Feed filter form** — has Apply submit button.
7. **CRM lead detail** — `/crm/[id]` + notes panel exist; referral submit also creates CRM leads.
8. **Referral `?ref=` / claim** — register + login claim flow + partner codes exist.
9. **Referral status transitions** — `PATCH /api/v1/referrals/:id` + StatusSelect on `/referrals` for Admin/Career Officer.
10. **Advertisement impressions/clicks** — impression tracker exists for active ads; click accounting may still be partial.
11. **No separate Banner Management** — only Advertisement campaigns linked to feed items.
12. **Storage bucket `learning-content`** — created in migration; no upload UI; thumbnails/previews use URL strings / OG images.
13. **`SUPABASE_SERVICE_ROLE_KEY`** — documented; limited server usage depending on branch.
14. **Dark mode** — Tailwind `dark:` classes present; no theme toggle wired.
15. **Dashboard** — role-scoped stats; shared Courses / Learning Feed tabs; advising-profile nudge (2026-07-25).
16. **Middleware** — protects portal routes including `/profile`; `/login` and `/register/*` are public auth pages.
17. **No automated tests** — no Vitest/Playwright/Jest suite.
18. **Feed item update/delete** — **resolved (2026-07-25)** via `/api/v1/feed/:id` + `/admin/feed`.
19. **Trainer ↔ User linking** — **resolved (2026-07-25)** for self-registration (`Trainer.userId` set on sync). Admin “Add trainer” form may still omit `userId` for manually added profiles.
20. **Permissions table** — seeded; runtime checks primarily use `user.role.key`.
21. **Link preview gaps** — some sites omit `og:image` (gradient fallback); Instagram CDN requires `referrerPolicy=no-referrer`.
22. **Referral phone + name + CRM sync** — **resolved (2026-07-25)**; submit creates Referral + Lead.
23. **Trainer pending approval** — self-registered trainers remain PENDING until Admin activation (intentional product gate, not a bug).
24. **Advising profile self-update** — **resolved (2026-07-25)** via `/profile` + `GET|PATCH /api/v1/profile`.
25. **Officer view of learner advising profile** — not built; officers cannot yet open a learner’s advising fields from CRM/admin.
26. **Automated course recommendations** — advising fields are collected only; no recommendation engine / path matching yet.
