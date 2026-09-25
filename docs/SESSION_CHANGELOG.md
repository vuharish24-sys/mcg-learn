# MCG Learn — Session Changelog

**Date:** 2026-09-13 (updated — see §27–32 for this update)
**Period:** 2026-08-01 → 2026-09-13
**Scope:** Business-logic audit and fixes, new features, design pass, security fix, first production deployment, live auth verification, engagement features, social embedding, placement/job-board system, merged feed redesign, course catalog with multi-variant pricing, coupon/scholarship (benefit) system, feed hero card + badge reward system, content sources, session scheduling, appointment booking, real in-app purchasing, full trainer program, course enrollment gating, onboarding UI, course/program terminology alignment, on-demand tutor sessions, a full self-hosted Moodle + LTI 1.3 integration (built, debugged, then fully replaced), the pivot to and completed migration onto self-hosted WordPress + Tutor LMS, a public jobs API, and architecture scoping for module/lesson-level pricing, installment plans, and generalized bundling
**Verification throughout:** `npm run typecheck` · `npm run lint` · `npm run build` all clean at every step; fixes additionally verified with one-off scripts against the live database (created test rows, asserted behavior, deleted them) and, from §8 onward, by logging into the live deployment and clicking through the actual UI. §18–25 were verified the same way against the local dev server (real browser click-throughs plus DB-level assertions); commit status for each is noted explicitly since not everything below has been pushed yet.

---

## 1. Environment setup

- Applied the 2 pending Prisma migrations (`storage_delete_policy`, `milestone_sequential_unlock`) against the Supabase project already referenced by `.env`
- Ran `npm run db:seed` — roles/permissions, feed categories, bootstrap admin promotion, sample feed/lead data
- Confirmed dev server boots clean, middleware redirect/auth behavior correct, all public pages render

---

## 2. Business-logic bugs found and fixed

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | `achieveMilestone()` could silently reset an **already-APPROVED** commission back to PENDING if re-triggered (retry, admin re-click), overwriting the calculated amount without going through the normal approval-change guard | [campaign-management.service.ts](../src/services/campaign-management.service.ts) | Blocks re-entry once status is APPROVED (previously only PAID/CANCELLED/REJECTED were blocked); also guards directly against the linked transaction's own status before touching it |
| 2 | Partner (evergreen) referral-code claims used check-then-create instead of an atomic guard, unlike the invite-code path — a race could throw an unhandled 500 instead of resolving cleanly | [referral.service.ts](../src/services/referral.service.ts) | Catches the DB-level unique-constraint conflict on `referredUserId` and resolves it gracefully (success or `already_claimed`) instead of crashing |
| 3 | `resolveCampaign()` skipped the campaign date-window check when called with an explicit `campaignId`, so a not-yet-started or already-ended campaign could still generate commissions | [referral-commission.service.ts](../src/services/referral-commission.service.ts) | Explicit-ID lookup now validates `startsAt`/`endsAt` the same as the auto-detect path |
| 4 | `campaign.maxReferrals` cap was enforced via a non-atomic count-then-create — concurrent calls near the cap could jointly exceed it | [referral-commission.service.ts](../src/services/referral-commission.service.ts) | Cap check + transaction creation now run inside one `Serializable` DB transaction; a conflict surfaces as a clean "please retry" error |
| 5 | `achieveMilestone()` never checked that the campaign was still `ACTIVE`, unlike the ad-hoc commission-calculate path | [campaign-management.service.ts](../src/services/campaign-management.service.ts) | Now rejects when `campaign.status !== "ACTIVE"` |
| 6 | Learning paths with **zero required items** vacuously satisfied `completedCount === totalRequired` (`0 === 0`), auto-issuing a certificate with no actual completion | [learning-path.service.ts](../src/services/learning-path.service.ts) | `allItemsDone` now additionally requires `totalRequired > 0` |
| 7 | Certificate numbers used an 8-hex-char random suffix with no collision retry (unlike the referral partner-code generator, which does retry) | [certificate.service.ts](../src/services/certificate.service.ts) | Added the same retry-on-collision pattern (up to 8 attempts) |

### 8. Quiz grading trust vulnerability (the significant one)

Quiz correctness was graded **client-side**: the correct-answer key was shipped to the browser as a prop on the quiz page (visible via devtools before answering), and the score-recording API (`POST /api/v1/quiz-attempts`) trusted whatever `score`/`totalQuestions` the client submitted — a user could bypass the UI entirely and POST a fabricated "100% pass" for any quiz. Since a passed quiz drives learning-path completion → certificate issuance → the automated CRM handoff (added this session, see below), this undermined the credentialing chain the platform is built around.

**Fix**, moved grading entirely server-side:
- [feed/\[id\]/quiz/page.tsx](../src/app/(portal)/feed/[id]/quiz/page.tsx) — strips the answer key before the question list is ever sent to the client
- [quiz-player.tsx](../src/components/feed/quiz-player.tsx) — submits selected answer *indices*, not a score; renders correctness only from the server's post-grading response
- [quiz-attempt.service.ts](../src/services/quiz-attempt.service.ts) — loads the real question content from the DB and grades submitted answers itself; also now rejects any `feedItemId` that isn't an actual `QUIZ` item
- [validation.ts](../src/lib/validation.ts) — API schema no longer accepts a client-supplied score at all

Verified against the real DB: correct answers → passed with correct score; wrong answers → correctly failed; a non-quiz feed item is rejected.

---

## 3. New features

| Feature | What it does | Key files |
|---|---|---|
| **Certificate → CRM handoff** | When a learner earns a certificate, the matching CRM lead (matched by email) gets an automated note and advances toward `ADMITTED` if still early-stage — closes the loop between "learner completed a course" and "sales follow-up," which was previously manual | [crm.service.ts](../src/services/crm.service.ts), wired into [learning-path.service.ts](../src/services/learning-path.service.ts) |
| **Referral leaderboard** | Top-referrers ranking per campaign, using data that already existed (`ReferralCampaignEnrollment`); names masked to "First L." since it's visible to any signed-in participant | [campaign-management.service.ts](../src/services/campaign-management.service.ts), [referral-campaigns/\[code\]/page.tsx](../src/app/(portal)/referral-campaigns/[code]/page.tsx) |
| **Automated milestone expiry** | `expireDueMilestones()` existed but had to be triggered manually. Added cron-secret auth to the endpoint plus a Netlify Scheduled Function that calls it daily; admin referral-commissions page now also shows a 7-day expiring-soon panel | [expire/route.ts](../src/app/api/v1/referral-milestones/expire/route.ts), [expire-referral-milestones.mts](../netlify/functions/expire-referral-milestones.mts) |
| **Feed item multi-placement** | Ads/promo feed items (`ADVERTISEMENT`/`SPONSORED`/`INTERNAL_PROMOTION`) can now be configured to also (or only) appear on the Learning Paths list, not just the main feed — admin picks placements explicitly per item | new `FeedPlacement` enum + `placements` column (migration `20260801090000_feed_placements`), [feed.service.ts](../src/services/feed.service.ts), [learning-paths/page.tsx](../src/app/(portal)/learning-paths/page.tsx) |

---

## 4. Design pass (Gen-Z-facing visual refresh)

- **Real dark mode**: `next-themes` was an unused dependency — wired up a `ThemeProvider`, class-based `dark:` variant, and a toggle on auth pages + the portal header
- **Auth pages redesigned**: shared `AuthLayout` component (login/register/trainer-register), gradient hero panel + soft gradient wash with blurred accent blobs replacing what was a flat gray dead zone on the form side, especially on mobile
- **Gradient CTA button variant** (`variant="gradient"`, teal→violet) applied to the three primary auth submit buttons only
- **Nav active-state highlighting** — was completely missing before; sidebar/mobile nav now show the current page, plus a gradient logo mark matching the auth pages
- **Dashboard**: gradient name in the welcome header, stat-tile icon badges cycle through 4 colors instead of all-teal, "Commission earned" gets the hero gradient-card treatment
- **Achievement/certificate badge**: flat outlined circle → filled gradient medal with a glow
- Base `Card` component bumped `rounded-xl` → `rounded-2xl` app-wide (one-line, zero layout risk)
- Consistent hover-lift micro-interaction added to `FeedPreviewCard` (already existed on `LearningPathCard`)

---

## 5. First production deployment

- Discovered the entire application had never been committed beyond the original `create-next-app` scaffold — committed the full app (214 files) as `b3f42b6`
- Pushed to `github.com/vuharish24-sys/mcg-learn`, connected in Netlify
- Configured environment variables (Supabase URL/keys, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `BOOTSTRAP_ADMIN_EMAIL`, `CRON_SECRET`)
- Confirmed on the live deployment: all public pages 200, all 13 protected routes correctly redirect to `/login`, API routes correctly 401 without a session, and the `CRON_SECRET`-authenticated milestone-expiry endpoint runs successfully against production

### Post-deploy fixes (found via live console errors)

| Issue | Cause | Fix |
|---|---|---|
| CORS errors + "Falling back to browser navigation" on external feed links | `FeedActionButton` used Next.js `<Link>` for links that redirect off-site through `/api/v1/feed/[id]/open`; Next's router prefetches the RSC payload by fetching the href, which follows the redirect cross-origin and gets blocked by CORS | Links known to leave the app now render as a plain `<a>`, skipping the prefetch entirely — [feed-action-button.tsx](../src/components/feed/feed-action-button.tsx) |
| Broken Instagram thumbnail (403) | Instagram's CDN image URLs are signed with a built-in expiry (anti-hotlinking) — not a bug, just unhandled | `MediaCover` now catches image load failure and falls back to the gradient background already behind it — [media-cover.tsx](../src/components/ui/media-cover.tsx) |
| Same thumbnails would keep going stale | The preview-backfill job only ever fetched previews that had *never* been cached, never refreshed expired ones | `ensureMissingPreviews()` now also re-fetches Instagram previews older than 12h (scoped to Instagram only — YouTube/article previews don't expire this way) — [feed.service.ts](../src/services/feed.service.ts) |

---

## 6. Verification status (as of §5)

**Confirmed working**: everything above passes typecheck/lint/build, and every fix touching data was additionally verified with one-off scripts against the real database (create test data → assert behavior → clean up). Public/unauthenticated pages and API auth behavior were verified directly on the live Netlify deployment.

**Not yet confirmed at this point**: the authenticated click-through experience hadn't been exercised live yet. This gap was closed in §7.

---

## 7. Live authenticated walkthrough

The user logged into the deployed site directly (Claude does not enter passwords or create accounts, even for testing its own work — the user drove the sign-in, Claude drove everything after). With that session, confirmed live:

- Dashboard renders correctly: gradient name text, active nav highlighting, gradient logo, "Commission earned" hero card, color-cycling stat badges
- Dark mode toggle flips the whole app cleanly
- Instagram thumbnail loads correctly (previously 403'd)
- External feed links are genuine `<a target="_blank">` elements now (confirmed via DOM inspection), not `next/link` — the CORS-prefetch issue structurally can't recur
- **Quiz grading end-to-end**: confirmed the answer key is absent from the page payload, then actually took a quiz — selected correct answers, submitted, got back a server-computed "Score: 2/2 (100%) · Passed," zero console errors
- Achievements page correctly shows no certificate for a quiz not tied to a learning path (verifies the completion logic isn't over-eager)
- RBAC: a Learner's nav correctly hides CRM/Trainers/Advertisements/Admin

One tooling note: the browser-automation tool's `ref`-based clicking had a coordinate-space mismatch in this environment (clicks landed on the wrong element); switched to raw screenshot-coordinate clicking, which was reliable. Environment quirk, not an app issue.

---

## 8. Quiz-pass and certificate moments made to feel like an event

Prompted by: the quiz result was one plain line of text ("Score: 2/2 (100%) · Passed") — the platform's core engagement moment looked identical to a form-validation message, and the certificate-issuance moment (the platform's actual conversion point, per its own funnel: feed → learning → CRM → paid LMS) fired completely silently.

- [quiz-player.tsx](../src/components/feed/quiz-player.tsx): result now renders as a gradient celebratory card (bigger treatment for a perfect score, trophy icon), with a "Try again" CTA on a miss
- [quiz-attempt.service.ts](../src/services/quiz-attempt.service.ts): `recordAttempt` now detects when an attempt causes a *new* certificate to be issued (comparing certificate existence before/after `recalculateProgress`, not just re-checking "passed" — so a retake doesn't re-fire it) and returns the certificate number
- New shared [`CertificateEarnedBanner`](../src/components/learning-path/certificate-earned-banner.tsx): "You just earned a certificate!" with a "View certificate" link and, if the learner's advising profile isn't complete, a "Complete your profile" nudge — reusing the *existing* `isReadyForAdvising` mechanism that already gates the CRM/advisor handoff, rather than a CTA to nowhere

**Gap found and closed same day**: the above only fired from the quiz flow. The one real learning path in production ("Introduction to Medical Coding") has no quiz at all — it's an Instagram Reel + an Article, completed via "Mark as Completed" on the engage/webinar/career/pdf pages, which previously issued certificates with zero fanfare. Extended the identical before/after certificate check to `learningPathService.markItemComplete()` and wired the shared banner through `PathItemCompleteButton` and all four pages that render it, each now computing `advisingReady` the same way the dashboard already does.

Verified against the real database (pass → cert issued once, retake → not re-fired; mark-complete → cert issued once, re-mark → not re-fired) and **live on the deployed site**: created a throwaway quiz-in-a-path, answered it in the actual logged-in session, watched the celebration card and certificate banner render; then created a throwaway article-only path (matching the real content's shape) and confirmed the same banner fires from "Mark as Completed" too. All test data deleted after each check.

---

## 9. Social media content: in-app view embedding

Prompted by: "get more views ... from the app itself without moving out." Two platform-reality constraints were surfaced and agreed on before building:
- **Comments**: not achievable for Instagram at all — no third-party API lets an arbitrary user comment on an arbitrary post through an embed; Instagram's own embed widget routes any comment action back to Instagram by design.
- **Likes/comments on YouTube**: technically possible via YouTube's Data API, but only after a learner completes real Google/YouTube OAuth — a new auth integration this app doesn't have (it's Supabase-only today). Scoped as a separate future initiative, not built here.

**What shipped — views, which needed no new auth:**
- New `"watch"` feed-action kind (`YOUTUBE`, `INSTAGRAM_REEL`) with its own in-app page at `/feed/[id]/watch` — [feed-actions.ts](../src/lib/feed-actions.ts)
- YouTube renders via the standard `youtube-nocookie.com` iframe embed — [youtube-embed.tsx](../src/components/feed/youtube-embed.tsx)
- Instagram renders via Instagram's own official embed widget (`instagram.com/embed.js`, the same one from a post's "Embed" button — no API key) — [instagram-embed.tsx](../src/components/feed/instagram-embed.tsx)
- Both count as real views/plays on the platform side since they're the platforms' own supported embeds, not scraping
- A "View on Instagram/YouTube" link stays available as a fallback; within a learning path, "Mark as Completed" still works
- Routing updated at both entry points (main feed and learning-path curriculum) so this applies everywhere these items appear

Verified live: the real Instagram post ("The Unknown Profession") renders its full native embed in-app (like/comment/share icons, follower count, real engagement UI) with zero console errors; a throwaway YouTube item rendered and **actually played** on click. Test items deleted after.

**Incidental finding while verifying**: an orphaned test feed item (`__test_cert_flag_quiz__`) from an earlier cleanup script in this same session had survived and was briefly visible in the live feed. Root cause not fully confirmed (the cleanup script's own log claimed success); found via a live audit query and deleted directly. No other leftover test data found on re-audit.

---

## 10. Known gaps (as of 2026-08-08)

- No automated test suite (pre-existing gap, flagged in `RC_AUDIT_REPORT.md`, still true)
- CRM, trainers, and admin management screens weren't touched in the design pass (only dashboard/nav/auth/achievements)
- No error monitoring (Sentry or equivalent)
- No rate limiting on public endpoints (registration, referral-code validation)
- Email deliverability at real volume depends on Supabase Auth's configured email provider — not verifiable from code
- YouTube/Instagram likes and comments are not implemented — Instagram is a hard platform wall; YouTube would need a new Google OAuth integration (separate future scope)
- Cleanup scripts for one-off DB verification should be double-checked with a follow-up query, not just trusted from their own console output (see §9 incidental finding)

---

## 11. Placement / job-board system

A parallel product surface for partner institutes (colleges/training centers) to post jobs and manage candidate access, largely reachable without an MCG account.

- **Job postings**: new `JOB_POSTING` `FeedType`, its own public detail page (`/jobs/[id]`, deliberately outside the `/feed` middleware gate) and job-interest lead capture endpoint
- **Partner model**: each partner gets a branded public job board (`/placements/[accessCode]`) and a separate self-service management link (`/partners/manage/[managementCode]`) for their own staff to add candidates — kept as two distinct secrets so a candidate holding the board link can never add themselves to the allowlist
- **Candidate gating**: viewing a partner's board requires matching an email/phone on that partner's `PartnerCandidate` allowlist; access lasts 7 days from first login unless MCG staff mark the candidate "enrolled" (indefinite access)
- **Exclusive vs. global postings**: a job posting can optionally be scoped to one partner (`postedByPartnerId`) instead of appearing on MCG's main feed; other partners can request read access via an admin-approved `PartnerSubscription`
- **Admin tooling**: full Partners CRUD, subscription approve/reject queue, candidate list with manual "mark enrolled" action
- **Job card decoration**: violet-accented card treatment (left border, badge, "Closes {date}" chip) distinguishing job postings from other feed content

Verified end-to-end multiple times through this build (partner-owned vs. global visibility, subscription request/approval flow, candidate 7-day vs. indefinite access, admin CRUD) — see the original task breakdown for the full list of scenarios exercised. Already committed (`e9dd2e4`).

---

## 12. Merged feed + dashboard redesign

Replaced the flat feed list and dashboard with a more engaging, single-surface experience.

- **Dashboard**: gradient hero banner, time-of-day greeting, tinted stat cards with icons (previously a flat, uniform layout)
- **Merged `/feed`**: on the default (unfiltered) browse view, `LearningPathCard`s ("Continue learning" + "Recommended") are interleaved with regular feed items every 5 positions — pulled from a model (`LearningPath`) that was never a `FeedItem` at all, matched at render time rather than duplicating data into the feed table
- **Ad density guardrail**: `spaceOutAds()` holds back `ADVERTISEMENT`/`SPONSORED` items so several high-priority ads can't cluster together, keeping a minimum gap of organic content between them; gracefully degrades (remaining ads append at the end) if the feed doesn't have enough non-ad content to fully space them
- **Role-aware landing**: Learner/Trainer roles now land on `/feed` after login instead of `/dashboard`; Admin/Career Officer unchanged

Verified live (real logged-in session): dashboard visual redesign, feed interleaving order, and an adversarial stress test of the ad-spacing algorithm (documented limitation, not a bug: 3 simultaneous max-priority ads in a small feed can still end up adjacent at the tail when there isn't enough organic content to interleave with).

---

## 13. Course catalog with multi-variant pricing

Extended the feed with a `COURSE` content type, then reshaped it to match how MCG actually prices programs.

- New `COURSE` `FeedType`; friendly admin form (`CourseContentFields`) swaps in for the generic JSON textarea, same pattern already used for job postings
- **Variants array**: a course can offer several priced options — independent `tier` (e.g. Batch Classes vs. One-to-One) × `mode` (Online/Hybrid/Offline) combinations, each with its own fee, duration, start date, and enrollment CTA (external link or lead-capture form)
- Each variant carries a stable, client-generated `id` (used later by the benefit system to map coupons onto a specific priced option, not just the course as a whole)
- Course detail page lists every variant as its own card; feed preview card shows a sky-accented badge and "{N} modes" summary instead of a single price
- **Real data import**: the 10 actual MCG course programs (from a pasted pricing sheet spanning Normal/Plus tiers × Online/Hybrid/Offline, with early-bird offers) were imported as `DRAFT` feed items — draft on purpose, since real pricing shouldn't go live without an explicit publish step

Verified end-to-end (multi-variant creation, per-variant lead capture, feed card summary) and the 10 imported courses spot-checked for correct rendering.

---

## 14. Coupon / scholarship (Benefit) system

Replaced the ad-hoc `launchFee`/`offerLabel` fields bolted onto course variants with a proper, reusable benefit model — prompted by a request to "configure and map coupons or scholarships with an expiry date."

- **Schema**: `Benefit` (title, kind — flat discount / percent discount / promo code / perk — code, discount amount/percent, description, image, active window) + `CourseVariantBenefit`, a soft-reference join mapping a benefit onto one specific course variant (`variantId` matches the client-generated id embedded in the course's JSON content, since variants aren't their own DB table)
- **Reusable by design**: one benefit (e.g. "₹2,000 off") can be mapped onto any number of variants across any number of courses — confirmed as a requirement before building, rather than assumed
- **Auto-expiry**: `isBenefitActive()` computes liveness from `isActive` + the start/expiry window at read time, same pattern as the existing partner-access-window check — no cron job needed
- **Effective pricing**: the course detail page shows the single best-value discount struck through against the base fee (e.g. ~~₹8,000~~ ₹6,000), with the applied benefit's title and code shown alongside
- **Admin UX**: `/admin/benefits` CRUD page; the course edit form grew a per-variant checklist of available benefits, saved through the same single "Save" button as the rest of the course content (the API route extracts and strips the mapping array from the submitted JSON, then syncs the relational table)
- **Standalone feed cards**: an active, mapped benefit now also renders as its own gradient promo card interleaved into `/feed` (every 6 positions), separate from the course cards it's attached to — clicking through goes to a dedicated `/feed/benefits/[id]` page listing every course/variant it applies to
- **Image upload**: benefits can carry a cover image (Supabase Storage upload or a pasted URL, reusing the same upload component used elsewhere in the app), shown on the admin list, the feed promo card, and the detail page
- **Data migration**: the 10 imported courses' original ad-hoc offer fields (`launchFee`/`offerLabel`) were converted into 4 real, reusable `Benefit` rows and mapped onto the correct variants

**Bug found and fixed during this build**: the new benefit feed cards initially had no course-visibility filter at all — since every real course is currently `DRAFT`, every non-admin learner would have seen a benefit card advertising courses they couldn't actually reach (a dead-end click-through). Fixed by scoping `listActiveMappedWithCourseCounts()` to published courses for non-admin viewers (and dropping a benefit from the feed entirely if it has zero visible courses); verified directly against the database that admin and non-admin viewers now see different, correct results.

Verified live throughout: benefit creation/mapping/editing, effective-price calculation on the course page, the PATCH-route sync (toggled a mapping in the browser, confirmed the database updated, reverted), the standalone feed card and its detail page for both a single-course and a seven-course benefit, and the full image-upload round trip (uploaded a real file, confirmed it landed in Supabase Storage under a dedicated `benefits/` folder, rendered correctly in three places, then cleaned up the test image).

---

## 15. Known gaps (current, 2026-08-13)

Carried forward from §10 (still true): no automated test suite, no error monitoring, no rate limiting on public endpoints, YouTube/Instagram likes/comments not implemented.

New/updated since §10:
- **Course fee is free text**, not a structured number (e.g. "₹15,000" or "Free" or blank) — a mapped discount silently has no effect if the fee field contains no digits. No error, just no visible effect; worth a real currency field if pricing logic grows further.
- **All 10 real courses are still `DRAFT`** — a live learner today sees no course, job offer, or benefit card yet. This is a content/publish-state decision, not a missing feature.
- Feed-card spacing intervals (ads every 4, learning paths every 5, benefits every 6) are hardcoded, not admin-configurable.
- A variant-id fallback inconsistency exists between the course detail page's read-time default and the admin form's default, but only for a course that predates the variant `id` field *and* has never been re-saved through the admin form since — doesn't affect any course currently in the database.

---

## 16. Feed hero card, badge rewards, and platform-role clarification (2026-08-16)

### Product context established this update

Reviewed the real MCG marketing site (`MCG-Website/index.html`, a separate project) to ground upcoming feed/content decisions in the actual business. Clarified with the user that MCG-Learn's role is **free content + course info + ads**, not paid-program delivery — so the marketing site's five learning "shapes" and named program bundles were deliberately *not* built out as full curricula here; that earlier direction was walked back once the actual scope was confirmed.

### Certificate vs. badge rewards for learning paths

Previously every completed learning path issued a formal `Certificate` (numbered, PDF, publicly verifiable) — the only option. Learning paths can now be configured to issue a lightweight **Badge** instead, for lower-stakes content that doesn't warrant a certificate.

- **Schema**: `LearningPathRewardType` enum (`CERTIFICATE` | `BADGE`) on `LearningPath`, plus `badgeIcon` (emoji); new `Badge` model mirroring `Certificate` minus the certificate-number/PDF/verify machinery — [prisma/schema.prisma](../prisma/schema.prisma), migration `20260815150000_learning_path_badges`
- **Issuance logic**: both existing completion paths — "mark item complete" ([learning-path.service.ts](../src/services/learning-path.service.ts)) and "quiz pass" ([quiz-attempt.service.ts](../src/services/quiz-attempt.service.ts)) — now branch on `path.rewardType` to call `issueCertificateIfNeeded` or the new `issueBadgeIfNeeded`, each independently doing a before/after existence check to detect "just issued" for the celebratory UI. The CRM handoff (`crmService.flagLearnerCertified`) still fires for both reward types, since it's a business-critical sales-follow-up trigger, not tied to the certificate concept specifically.
- **UI**: `CertificateEarnedBanner` generalized into [`RewardEarnedBanner`](../src/components/learning-path/reward-earned-banner.tsx) (`kind: "certificate" | "badge"`), wired into both the quiz-result card and the "mark complete" button; [My Achievements](../src/app/(portal)/my-achievements/page.tsx) now shows a "Badges" section of medallion cards alongside "Certificates"; the admin learning-path form gained a "Reward on completion" selector with a conditional badge-icon (emoji) input in place of the certificate-template field

Verified live: created a throwaway badge-type learning path, completed it in a real logged-in session, confirmed the badge banner rendered and the badge appeared on My Achievements; test data cleaned up after.

### Feed hero card + category navigation

Addressed a UX gap: a learner who logs in and takes no action lands on an undifferentiated feed with no clear first move.

- New [`FeedHeroCard`](../src/components/feed/feed-hero-card.tsx): a full-width banner pinned above the regular feed stream, showing (in priority order) the learner's in-progress path ("Continue learning"), the top active scholarship, or a "Start here" orientation prompt for a brand-new learner — pulled from data the feed already computed, just promoted out of the interleaved stream instead of being buried
- **Category quick-nav chips** (Learning Paths / Courses / Job Board / Quizzes / Webinars) added above the feed for direct browsing by content type
- **Filter bar modernized**: removed the redundant "type" dropdown (now covered by the category chips), restyled the remaining search/category/sort controls with a consistent select treatment and a gradient "Apply" button
- "Benefit" relabeled to **"Scholarship"** in the benefit card badge, matching how the offering is actually described to learners

All in [feed/page.tsx](../src/app/(portal)/feed/page.tsx). Verified live: hero card renders correctly for a learner with an active scholarship, category chips navigate correctly, no console errors.

### Bug fixes

| Issue | Cause | Fix |
|---|---|---|
| "Uncaught Error: Connection closed" in the browser console on the live site | Next.js's own `<Link>` prefetch machinery aborting a request when a card scrolls out of view before the prefetch completes — cosmetic, not a functional break, but noisy | Added `prefetch={false}` to card-wrapping `<Link>`s in `FeedActionButton`, `LearningPathCard`, `BenefitCard`, and the benefit detail page |
| AI article generation failing with `Gemini returned 404` | Hardcoded model name (`gemini-2.0-flash`, later `gemini-2.5-flash`) had been deprecated/removed from the API | Queried Google's live `models.list` endpoint with the actual stored API key to find a currently valid model; updated to `gemini-3.5-flash` in [ai-content.ts](../src/lib/ai-content.ts). Verified by generating 2 real articles end-to-end. |

### Testing performed without code changes

- Full end-to-end pass on the job board and partner-referred-candidate flow (partner-owned vs. global job visibility, candidate gating, 7-day vs. indefinite access) — no bugs found, matches §11's original verification
- Confirmed no automated-test gap has changed (still none — carried forward from §10/§15)

### Deployment

Committed as `c7b785d` and pushed to `main`. Confirmed live on Netlify by matching the production site's content-hashed JS bundle filenames against the local build immediately preceding the push, then visually confirming the hero card, category chips, modernized filter bar, and badges section in a real logged-in session with zero console errors.

---

## 17. Known gaps (current, 2026-08-16)

Carried forward from §15 (still true): no automated test suite, no error monitoring, no rate limiting on public endpoints, YouTube/Instagram likes/comments not implemented, course fee is free text, all 10 real courses still `DRAFT`, feed-card spacing intervals hardcoded.

No new gaps identified this update.

---

## 18. Content Sources: pull recent posts into the feed or a learning path (committed `0ea8fc9`)

Admin-configurable polling of MCG's own YouTube channel, Instagram account, and blog RSS feed, so new posts don't have to be re-entered into the feed by hand every time.

- **`ContentSource`** (YouTube/Instagram/RSS, encrypted API key/token — same AES scheme as AI provider keys) + **`ContentSourceItem`** (one fetched post, deduped by the platform's own post ID)
- Admin clicks **Fetch latest** (`/admin/content-sources`) — polls every active source, stages genuinely new items only (already-seen items never resurface), never auto-publishes
- Each staged item can be turned into a `DRAFT` feed item, attached directly to an existing learning path, or dismissed — picking a category is required since `FeedItem.categoryId` is non-nullable
- YouTube via the Data API v3 (resolves the channel's uploads playlist, no OAuth needed for public data); Instagram via the Graph API (needs a Meta Business App — same underlying setup work as any Instagram integration); RSS/Atom via a small dependency-free parser (no library added, consistent with how `link-preview.ts` already hand-parses HTML)

Verified live against a real public RSS feed (fetched 10 real posts, imported one to the feed and one to a learning path, dismissed a third, confirmed re-fetching doesn't duplicate already-seen items) — then all test data cleaned up. YouTube/Instagram fetchers are code-complete but need real credentials from the account owner to exercise live.

---

## 19. Session scheduling: Free Session / Webinar / Class (committed `aa64f17`)

The prior `WEBINAR` feed type was a single fixed date/time with a plain-text location field, manually edited as raw JSON. Reworked into a proper scheduling primitive, still using the same `FeedItem`/JSON-content storage (no migration needed for this one):

- `content.sessionType` (`FREE_SESSION` | `WEBINAR` | `CLASS`) + `content.meetingUrl`, alongside the existing `webinarAt`/`location` fields — old webinar content without `sessionType` defaults to `WEBINAR` for backward compatibility
- Admin gets a dedicated **Session details** panel (session type, date/time, meeting link, venue notes) in place of the raw-JSON textarea, mirroring the existing `JobPostingContentFields`/`CourseContentFields` pattern
- New **`/sessions`** page: every upcoming published session, any type, sorted by date, with a type badge and a register link — a first-class destination instead of a card buried in the general feed
- Feed cards and the session detail page (`/feed/[id]/webinar`) now show the specific type and, if present, a "Join session" button linking straight to the real meeting URL

Verified live: created a real Free Session (Google Meet link, future date) through the admin form, confirmed it renders correctly on `/sessions`, the main feed (teal "Free Session" badge + date chip), and the detail page (join link resolves to the real URL) — then deleted the test item.

---

## 20. Appointments: 1:1 booking, recurring availability, and notifications (committed `aa64f17`)

Prompted by: "can this handle free one-to-one sessions based on available slots?" — the existing Sessions feature (§19) is broadcast (one time slot, many registrants); this is real slot-based booking, one learner per slot, for Career Officers and Trainers.

**Booking core** — `AppointmentSlot` (a host's open time window) + `Appointment` (a learner's claim on one slot, enforced unique at the database level so double-booking is structurally impossible, not just UI-prevented). Cancelling doesn't reopen the same slot for rebooking by design — the host opens a fresh one — keeping booking a single atomic `create` with no separate "release" step to get wrong.

- `/my-availability` (Career Officers & Trainers): open a slot, see who booked it, cancel
- `/appointments` (everyone): browse open slots across all hosts, book with an optional note, manage own upcoming bookings
- Race-safety verified directly: two simultaneous bookings on the same slot — the loser is caught via the database's own unique-constraint violation and turned into a clean "someone just booked this" error, not a crash (same pattern already used for referral-code race conditions)

**Recurring availability** — rather than opening slots one at a time forever, a host can define a weekly pattern (days + time range + slot duration) via `AvailabilityRule`; saving it immediately materializes real `AppointmentSlot` rows for the next few weeks, and a "Generate more weeks" button extends the horizon later. Verified live: Mon/Wed/Fri, 4–6pm, 30-min slots correctly generated exactly 48 real slots across 4 weeks (3 days × 4 slots × 4 weeks), all landing on the right days; re-generating immediately correctly produced 0 duplicates.

**Notifications** — fires on booking and cancellation, to both parties:
- Email via **Resend**, isolated behind one function (`lib/notifications/email.ts`) so swapping providers later is a small change, not a rearchitect
- WhatsApp via the Meta Graph API directly (no library — same approach as the YouTube/Instagram fetchers), phone numbers auto-normalized to E.164
- Both gracefully no-op when unconfigured — verified live: booking and cancelling worked correctly while the console logged the expected "skipped, not configured" messages rather than erroring
- WhatsApp specifically needs a Meta Business App (shared setup with §18's Instagram source) *and* a Meta-approved message template before it can send anything real — business-initiated WhatsApp messages require a pre-approved template, this isn't a code limitation

---

## 21. Real in-app purchasing: Razorpay, paid learning paths, bundles (committed `aa64f17`)

Prompted by wanting to know if the app could handle individual-topic or package purchases — it couldn't (zero payment code existed anywhere). This is a genuine reversal of the platform's "free content, paid programs happen off-platform" positioning for whichever specific paths get priced, done deliberately after confirming that's actually wanted.

- `LearningPath.priceInPaise` (null = free, as before) + new **`Bundle`**/`BundlePath` (admin combines 2+ paid paths into one package price)
- **`Purchase`** tracks every checkout attempt (`PENDING` → `PAID`/`FAILED`), tied to a real Razorpay order ID
- Checkout: order creation → Razorpay's hosted Checkout widget → client posts back the payment signature for verification → **plus a webhook** (`payment.captured`) as the reliable fallback if a learner closes the tab before the client-side confirmation call fires — both paths call the same idempotent service method
- **Real content gating, not just a UI hint**: a paid, unpurchased path shows every curriculum item locked with a "Buy" button instead of "Start"; the seven content-serving pages (quiz/pdf/webinar/career/engage/watch/course) each independently re-check entitlement when reached via a `learningPathId`, so a guessed or bookmarked direct URL to gated content still 404s
- Entitlement resolves through *either* a direct path purchase *or* a bundle purchase containing that path — verified cross-user that a bundle buyer gets access to all member paths and a path-only buyer does not get bundle-mate paths they never bought

Verified live end-to-end with simulated `PAID` purchase rows (no real Razorpay credentials available in this environment): direct-purchase unlock, bundle-purchase unlock cascading to member paths, cross-user isolation (no leakage), and the "Payments are not configured yet" graceful message when Buy is clicked without real keys. Needs real `RAZORPAY_KEY_ID`/`KEY_SECRET`/`WEBHOOK_SECRET` to process an actual payment.

---

## 22. Trainer Program: modules, assignments, proposals, sessions, deliverables, payouts (committed `aa64f17`)

The `Trainer` model was previously just a directory profile (free-text specializations, free-text availability, admin manually flips a status). Built out into a full program covering topic assignment and four distinct, independently-configurable compensation models — the largest single feature this session.

**Content structure**: `CourseModule` — real content-structure rows under a Course `FeedItem`, separate from its pricing `variants` (a course's curriculum breakdown vs. its priced delivery options are orthogonal).

**Getting a trainer onto a module, three ways in** (all converge on the same `TrainerAssignment` record):
- Admin assigns directly
- Trainer **proposes** a new topic/module (optionally under an existing course, or a brand-new one) — admin approval creates the module and the assignment in one step
- Trainer **requests to teach** an already-existing module — admin approval creates the assignment

**Four compensation types, chosen per assignment, not fixed platform-wide:**
| Type | Trigger | Confirmation needed? |
|---|---|---|
| `HOURLY` | Trainer logs a class session (module, date, duration) | Yes — at least one attendee must confirm before it's payable |
| `FLAT_PER_SESSION` | Same as above, fixed fee regardless of duration | Yes |
| `FLAT_PER_DELIVERABLE` | Trainer submits work (content, curriculum design) | No — admin approval alone triggers payment |
| `PER_STUDENT_USE` | A student marks the module's content complete | No — accrues automatically per unique student, no upfront pay |

The student-confirmation step on `HOURLY`/`FLAT_PER_SESSION` exists specifically as a check against a trainer over-reporting hours — a session sits in `PENDING_CONFIRMATION` and is invisible to the payout ledger until an attendee confirms it.

**Payout ledger** — every payable event, however it was triggered, becomes one `TrainerPayoutLineItem` (`PENDING` → `APPROVED` → `PAID`, with an optional payment reference), reviewed from one consolidated admin screen (`/admin/trainer-program`) rather than four separate ones. This deliberately mirrors the referral-commission payout pattern already established elsewhere in the schema, simplified to a reference string instead of a full attachment-upload flow to keep scope bounded.

**Surfaces**: `/admin/trainer-program` (modules, direct assignment, proposal/teach-request/deliverable review, payout ledger), `/trainer-portal` (a trainer's own assignments with the matching action per compensation type, browse-and-request-to-teach, submit proposals, earnings history), `/my-sessions` (any learner confirms attendance on sessions they're logged as attending), and a **Modules** section added to the course detail page with a per-module "Mark complete" button.

Verified live end-to-end with a real (temporarily role-switched) test trainer account: module creation → direct assignment (₹500/hour) → session logged (120 min) → attendance confirmed by a second real account → payout line item created at exactly ₹1,000 (verified to the paise) → approved → paid with a reference. Separately verified: a submitted proposal's approval correctly created both a new module *and* a new `FLAT_PER_DELIVERABLE` assignment from the admin's chosen final terms; a deliverable's approval paid the exact flat rate; a `PER_STUDENT_USE` module completion paid the exact per-use rate on first use and correctly did **not** pay again when the same student's completion was replayed. All test data (trainer profile, modules, assignments, sessions, deliverables, usage events, payout lines) deleted afterward with a final zero-count check; the test account's role reverted.

**Deliberately deferred, not built**: a shared cross-trainer content library (discussed and scoped, but held back — the trainer program has zero real trainers on it yet, and a content marketplace needs real supply-and-demand to be worth building rather than being a bet on demand that might not show up). The current architecture supports adding it later purely additively (a new table plus one optional column), without revisiting anything shipped here.

**Product questions worked through without a code change, worth recording:**
- *"Can trainers build entire courses?"* — No, and checking the code surfaced a real half-built path: a trainer's proposal form offers "new course" as an option, but `decideProposal` always requires an admin-selected **existing** course — there's no path that actually creates a new `Course` FeedItem from a proposal. Course creation stays admin-only until that's built.
- *"Can a trainer propose a standalone topic (a masterclass with no parent course)?"* — Not currently; `CourseModule.feedItemId` is mandatory. The underlying propose → assign → log-session → confirm → payout mechanism doesn't care whether there's a parent course, so this is a nullable-FK-plus-a-discovery-page addition (likely surfacing via `/sessions`), not a rearchitecture.
- *"Is there a content-verification step?"* — Partial. Deliverables do have a real admin approve/reject/needs-revision gate before payment. But approving a deliverable doesn't attach its file as a module's live `contentUrl` — there's no UI path connecting "content approved" to "content is now what students see," even though the underlying update API for it already exists.
- *Moodle integration* — not needed; MCG-Learn already is a self-contained LMS (quizzes, progress, certificates, payments, compensation), and bolting on Moodle would mean syncing two systems or migrating off everything built this session, for a gap (course enrollment gating) that turned out to need only a small addition — see §24.
- *A wallet (for trainer payouts / learner credit)* — assessed and intentionally not built yet: with zero live Razorpay transactions and zero real trainer payouts processed so far, there's no real friction yet to justify it. Revisit once the manual "admin marks each payout paid individually" step is a demonstrated, repeated chore rather than a guess.

---

## 24. Course enrollments: gate a course's modules behind actual enrollment (committed `aa64f17`)

Found while answering "after content is verified, how do students access it?" — course modules (§22) rendered for **any** logged-in user who could view the course page, with no purchase or enrollment check at all. Since course fees are paid off-platform (a variant's CTA is an external link or lead-capture form, not Razorpay — unlike Learning Paths, which do have real purchase gating), nothing was stopping any registered user from completing `PER_STUDENT_USE` content and generating trainer payouts on a course they never paid for.

- **`CourseEnrollment`** (user × course, `enrolledAt`) mirrors the existing `PartnerCandidate.enrolledAt` convention already used for job-board access, rather than inventing a payment-shaped concept for something that isn't paid in-app
- Admin records enrollment once payment is confirmed off-platform, from a new `/admin/course-enrollments` page (one course per card, enroll-by-email, list of current enrollees with unenroll)
- The course page's Modules section now shows a lock icon and an "Enroll to unlock" message instead of content links/mark-complete buttons when the viewer isn't enrolled (admin previewing bypasses this, matching the existing DRAFT-preview convention)
- The gate is enforced in `markModuleComplete` itself, not just hidden in the UI — the same principle already applied to Learning Path content pages, so calling the completion API directly can't bypass it

Verified live: an unenrolled learner saw the lock state and locked icons on a real course page; enrolling them (and separately, replaying the exact enrollment-check query in both directions) correctly flipped access on and back off; the test module was live on the shared dev/production database mid-verification and was caught and deleted before this was documented, since local dev and prod share one database.

---

## 25. Onboarding: "New" nav badges + a real Getting Started checklist (uncommitted)

Prompted by wanting tooltip/tour-style guidance "modern sites use," given how much shipped in one window that existing users won't know exists yet. Scoped down to the two cheapest, highest-value pieces rather than a full guided product tour:

- **"New" badges** — a small gradient pill on recently-added nav items (Bundles, My Purchases, Sessions, Appointments, My Availability, Trainer Portal, My Sessions) until a user opens that section once. Tracked per-browser in `localStorage` (`lib/visited-nav.ts`) — no schema change, no server round-trip, consistent with how this app already treats this class of per-viewer cosmetic state.
- **Getting Started checklist** — a dashboard card (Learner role only, mirroring the existing "Complete your advising profile" card's placement and style) with 5 milestones, each backed by a real signal rather than a fake progress bar: profile completeness and appointment-booked come from the database directly; learning-path-started reuses stats the dashboard already computes; feed-explored and sessions-checked reuse the same visited-hrefs tracking as the nav badges. Disappears once all 5 are done.

**Bug found and fixed during this build**: the checklist's "Explore the Learning Feed" item never checked off, because `/feed` isn't itself a "New" nav item and the visit-recording effect only fired for hrefs in the New-badge list. Fixed by tracking a superset (`TRACKED_HREFS`) for recording visits, separate from the narrower list that actually renders a badge — caught live (visited `/feed`, checklist stayed at the wrong count) before being reported as done.

Verified live: badges appear on first load and disappear after each section is opened once; the checklist's count moved from 0/5 to correctly reflect real state as each milestone was met, including the feed-tracking fix.

---

## 26. Known gaps (current, 2026-09-06)

Carried forward from §23 (still true): no automated test suite, no error monitoring, no rate limiting on public endpoints, YouTube/Instagram likes/comments not implemented, course fee on non-priced display still free text, feed-card spacing intervals hardcoded, Content Sources' Instagram fetcher untested live, Appointments' notifications need real Resend/Meta credentials, Purchasing needs real Razorpay keys, Trainer Program's payout proof is a plain reference string with no shared content library yet.

New since §23:
- Trainer Program: no path for a trainer to create a brand-new course (only modules under existing ones); no standalone (course-less) topics/masterclasses; approving a content deliverable doesn't yet attach it as a module's live content — three related, scoped gaps recorded in §22's product-questions note above
- Onboarding: §25 (New badges + Getting Started checklist) is not yet pushed to the remote — committed features currently stop at `aa64f17`

---

## 27. Course/Program terminology alignment (committed `04858f6`)

Prompted by a peer session's business/marketing evaluation of the live app, which flagged that internal "Course" language leaked into user-facing text while the marketing site already established "Learning Path / Program / Topic" as the real vocabulary — a split a prospective learner would notice immediately.

- New `feedTypeLabel()` helper in `feed-actions.ts` centralizes the display override (`COURSE` → "Program") instead of duplicating ternaries everywhere a feed type gets shown
- Swept every user-facing "Course" string to "Program" — feed chips/badges/CTAs, admin screens (Program Benefits, Program Enrollments, Trainer Program copy), profile/certificates pages
- **Only display text changed.** The Prisma enum value `COURSE`, model names (`CourseModule`, `CourseEnrollment`, `CourseVariantBenefit`), routes (`/feed/[id]/course`), and DB columns (`courseName`) were deliberately left alone — renaming those would have been a large, risky, low-value refactor for a purely cosmetic problem
- Found a *second*, different bug while investigating the first: the dashboard's "Courses" tab was actually rendering real Learning Paths (traced to `dashboard.service.ts`), not `COURSE`-type feed items at all — fixed to say "Learning Paths" (the correct term), not "Program" (which would have been correct-sounding but factually wrong for what the tab shows)
- Also fixed, from the same peer review: a debug string (`Verification base URL: ...`) leaking on `/my-achievements`, and the Learning Path "Start" button's double-click window (button now hides on the client the instant the request succeeds, rather than waiting on `router.refresh()`'s round trip)

Verified live: feed chips, badges, admin screens, dashboard tab, certificates/profile pages all confirmed showing the correct term post-deploy.

---

## 28. Self-hosted Moodle + LTI 1.3 integration, on-demand tutor sessions (committed `d72635f`) — later superseded, see §29

Built in response to wanting richer LMS-hosted content (SCORM-like lessons, structured courses) sold individually, plus a way for students to book and pay for 1:1 time with a specific trainer outside the existing scheduled-class flow.

**Moodle self-hosting** (`deploy/moodle/`, `docs/MOODLE_SELF_HOSTING.md`): Moodle 4.5 LTS, fully Dockerized on the same server already running Apache/other apps on an EOL Ubuntu 16.04 host — deliberately isolated (own PHP 8.2, own MariaDB, never touching the host's ancient PHP 7.0/MySQL 5.7 or the Tomcat-hosted apps sharing the box). Explicitly did **not** use Bitnami's Moodle image — it moved behind a paid subscription in August 2025, and building on the abandoned free legacy image would have recreated the exact "frozen, unpatched software" problem the isolation was meant to solve. Built on official `php`/`mariadb` images instead, source cloned at build time.

**Real bugs found and fixed while getting an actual launch to work** (each cost real debugging time, all documented in `docs/MOODLE_SELF_HOSTING.md`):
- MariaDB 11.x's default collation isn't recognized by Moodle's environment checker as UTF-8 — pinned to `utf8mb4_general_ci`
- The obvious install command (`docker compose exec moodle php admin/cli/install.php` against the persistent service) can never work — Moodle's installer treats the required empty placeholder `config.php` as "already installed" and crashes; worked around by installing in a throwaway container and copying the real generated config out
- `ProxyPreserveHost On` actively breaks Moodle's reverse-proxy security check, which specifically wants the internal proxy hostname, not the public one
- Moodle's `target_link_uri` must be the bare Tool URL with **no query string** — it's validated byte-for-byte against the registered redirect URI; the resource-specific id has to travel as a separate LTI **custom claim** instead (`MoodleCourseMapping.ltiCustomParams`)
- A "Cannot handle token with iat prior to..." rejection and several other inconsistent errors across attempts turned out to be artifacts of slow, manual, multi-step browser-automation testing (each tool call taking real wall-clock seconds) against Moodle's tight OIDC freshness windows — not real code bugs. A real Netlify-to-Moodle production launch, done via one clean fast attempt, worked end-to-end on the first genuinely clean try, confirming this.

**MCG-Learn as LTI *Platform***, launching into Moodle as the Tool — the reverse of Moodle's usual role: `src/lib/lti-platform.ts` (id_token signing, JWKS export), `/api/lti/platform/{authorize,jwks,token}` routes, `MoodleCourseMapping` (a `MOODLE_COURSE` `FeedItem` ↔ a Moodle course/activity, priced, `Purchase`-gated).

**On-demand tutor sessions**: `TutorSessionRequest` (student requests a session with a specific trainer → trainer/admin quotes a price → student pays via the existing Razorpay `Purchase` flow → auto-`CONFIRMED` on payment). Surfaces: a request form on the (now learner-visible) Trainer Network page, status/payment on My Sessions, admin/trainer pricing at `/admin/tutor-sessions`.

Verified live end-to-end against the real production deployment (not just locally): a real `Purchase` unlocked a real Moodle course; the LTI launch redirect, Moodle's cookie-check, the signed id_token, and Moodle's JIT user provisioning all worked correctly with no tunnel or test harness in the way. All test data (feed items, mappings, purchases, the test Moodle enrollment) cleaned up afterward.

**Positioning fixes** (same peer-review pass as §27): Programs and Moodle Courses now carry distinguishing badges ("Live, instructor-led" vs. "Self-paced — instant access") instead of looking like the same product with no explanation, and both cross-link to the tutor-session request flow.

---

## 29. Pivot: Moodle → self-hosted WordPress + Tutor LMS (in progress)

Moodle's LTI 1.3 interop model exists to let institutional LMSs exchange *tools*, not to gate individual pieces of content behind a commerce transaction — realized this only after §28's launch worked, once actually trying to publish **individual lessons** (not just whole courses) as separately-sellable units. Each lesson needs its own "Publish as LTI tool" registration, which only exists as a manual admin-UI flow with no CLI/web-service equivalent — a real scaling wall for a catalog with more than a couple of courses, and automating it via UI-scripting turned out to itself be a source of subtle bugs (a JS-forced dropdown value left a companion field Moodle's own autocomplete widget normally keeps in sync out of step).

**Decision**: replace Moodle with self-hosted WordPress + Tutor LMS (free tier) on the same `lms.medicalcodingglobal.com` subdomain, reusing its existing DNS record and SSL cert. Tutor LMS is commerce-first by design — per-course enrollment gating is its core feature, not something bent into shape via an interop protocol meant for a different purpose. Constraint carried through the whole redesign: **no paid plugin subscriptions** — confirmed Tutor LMS's *free* tier has its own documented REST API before committing to it.

`docs/MOODLE_SELF_HOSTING.md` is kept, not deleted, as reference — the Docker-isolation pattern and the bugs found in §28 are still real, useful knowledge even with Moodle itself gone.

**Migration status** (`docs/WORDPRESS_MIGRATION.md`, `deploy/wordpress/`):
- Moodle uninstalled; WordPress + Tutor LMS live at `lms.medicalcodingglobal.com`, same domain/cert reused
- **Real gotcha found and documented**: Tutor LMS's REST API does not accept WordPress core Application Passwords at all — every route checks Basic Auth against Tutor's own separate `tutor-api-key-secret` records. The UI to generate that key/secret pair is missing from every Settings tab in the free plugin (the backend handler works fine; there's just no menu link to it) — worked around via Tutor's own `tutor_generate_api_keys` AJAX action, called directly with a valid nonce/session. Confirmed live against the real API.
- **Real limitation found**: Tutor LMS's free-tier REST API only ever grants **Read** permission — there is no way to create an enrollment through it. This is a hard limitation (confirmed by reading the plugin's own source), not a config issue, and it directly blocks the core "auto-enroll on purchase" requirement.
- **Fix, in progress**: a small custom WordPress plugin exposing three routes under its own namespace (`enroll`, `unenroll`, `auto-login-token`), authenticated by a single shared secret we generate ourselves — not WP Application Passwords, not Tutor's key/secret system. `enroll`/`unenroll` call Tutor's own internal enrollment function directly (PHP-to-PHP, bypassing its REST API layer and its Read-only restriction entirely, no Pro subscription needed). `auto-login-token` replaces the entire LTI launch dance from §28 with a signed one-time token + `wp_set_auth_cookie()` redirect — no OIDC, no nonce, no JWKS, none of §28's failure modes.

**Not yet done**: the plugin itself (relayed as a build request, response pending), the MCG-Learn-side `tutorLmsService`/`TutorLmsCourseMapping` replacing `moodleCourseService`/`MoodleCourseMapping`, and removing the now-dead LTI platform code (`src/lib/lti-platform.ts`, `/api/lti/*`) once the replacement is confirmed working end-to-end.

**Also shipped in this stretch, independent of the migration**: a public, unauthenticated `GET /api/v1/jobs` endpoint (paginated, published + non-partner-exclusive postings only) for an external app (a separate Grails recruitment codebase, via a verified cross-session request) to sync MCG Learn's job board — verified live against a real temporary test posting, cleaned up after. Not yet committed.

---

## 30. Architecture scoping: module/lesson pricing, installments, generalized bundling (design only, not built)

Worked through in design conversation, deliberately not built yet — queued to land together right after §29's migration is confirmed working, since all four pieces below share one access-check surface and building them separately would mean rewriting that surface three or four times instead of once.

- **Three purchasable granularities, final**: course (existing `LEARNING_PATH`), module (new `LearningPathModule`, one real grouping level between `LearningPath` and `LearningPathItem` — chosen over label-only visual grouping specifically because module-based *selling* needs a real row to attach a price to, not just a display heading), and lesson (the existing leaf `FeedItem` mapping pattern). `Bundle` is a composition on top of these three, not a fourth granularity.
- **Installments**: `InstallmentPlan` + `Installment`, targeting exactly one of the three granularities above. Deliberately **not** a progressive/proportional content-unlock scheme (paying installment 1 of 3 does not unlock one-third of a course) — that was the original design, dropped once it became clear it can't stop a real leakage risk (pay a fraction, consume everything on-demand, default on the rest). Instead: full access to *that specific purchasable unit* while its plan is current, revoked on default. The three-granularity model absorbs the risk instead — financing a small unit (a lesson) is inherently lower-risk than financing an entire multi-module course.
- **Generalized bundling**: `BundlePath` (Bundle ↔ LearningPath only, today's shape) replaced by a polymorphic `BundleItem` (same nullable-FK-per-type pattern as `Purchase`), so one bundle can mix courses, modules, and individual lessons — including "2-3 lessons together," which the current model can't express at all.
- **Centralized access resolver**: flagged as its own explicit piece of work, not an incidental helper — `contentAccessService.hasAccess(userId, { type, id })`, called by every gate (Moodle/Tutor LMS launch, module page, lesson page) instead of each feature growing its own copy of the access cascade (direct purchase → parent module → parent course → any installment plan on those → any bundle containing any of those).

---

## 31. Known gaps (current, 2026-09-13)

Carried forward from §26 (still true unless noted): no automated test suite, no error monitoring, no rate limiting on public endpoints, YouTube/Instagram likes/comments not implemented, Trainer Program has no path to create a brand-new course or a standalone topic, deliverable approval doesn't attach as a module's live content.

New since §26:
- The public `GET /api/v1/jobs` endpoint (§29) is built and verified but not committed
- Module/installment/bundle-generalization/access-resolver (§30) is design-only — zero schema or code exists for any of it yet
- A cross-session pattern of impersonated messages requesting server/SSH reconnaissance was caught twice this stretch (verified fake both times by checking the claimed sender's actual transcript before trusting anything server-related) — worth the user's own attention independent of this project, since it indicates something in the local multi-session environment is being targeted for credential/infrastructure-harvesting attempts
- ~~`WORDPRESS_APP_USERNAME`/`WORDPRESS_APP_PASSWORD` placeholder~~ — resolved in §33: the `onlineclass` session generated and verified a real Application Password, now in the local `.env` (gitignored, never committed)

---

## 32. WordPress/Tutor LMS migration completed on the MCG-Learn side

Finished replacing every Moodle/LTI-specific piece of the codebase (§28) with the WordPress/Tutor LMS equivalent designed in §29, once the `onlineclass` peer session confirmed (and I independently verified against its actual transcript, not just its message — see the spoofing note above) that the `mcglearn-integration` mu-plugin was built and tested live end-to-end.

**Schema**: `FeedType.MOODLE_COURSE` → `TUTOR_LMS_COURSE`, `PurchasableType.MOODLE_COURSE` → `TUTOR_LMS_COURSE`; `MoodleCourseMapping` replaced by a simpler `TutorLmsCourseMapping` (`tutorCourseId`, `priceInPaise`, `isActive` — none of the LTI-specific fields like `targetLinkUri`/`ltiCustomParams` are needed once there's no launch protocol, just enroll + auto-login); `User.wordpressUserId` added (null until a learner's first Tutor LMS purchase triggers find-or-create). Migration `20260913120000_tutor_lms_replaces_moodle` applied live; 3 leftover orphaned test `FeedItem`s/2 `Purchase`s/3 `MoodleCourseMapping` rows from an abandoned earlier per-lesson pricing experiment (never cleaned up mid-pivot) were found via a pre-migration safety check and deleted first.

**New code**: `src/lib/tutor-lms.ts` (WordPress core Users API find-or-create via Application Password Basic Auth; three thin wrappers — `enrollWpUser`/`unenrollWpUser`/`generateAutoLoginUrl` — calling the mu-plugin's `enroll`/`unenroll`/`auto-login-token` routes with the shared `X-MCGLearn-Key` secret); `src/services/tutor-lms.service.ts` (`getMapping`, `upsertMapping`, `listAllMapped`, `hasAccess`, `grantAccess` — deliberately swallows its own errors so a WordPress-side hiccup can't fail payment confirmation, `getLaunchUrl` retries `grantAccess` as a fallback and now also passes the mapped `tutorCourseId` through so the one-time login lands the student straight on their course instead of a generic dashboard, per an enhancement the `onlineclass` session added on its own initiative to the `auto-login-token` route). `purchase.service.ts` calls `tutorLmsService.grantAccess` from both `verifyPayment` and the Razorpay webhook path (`markPaidFromWebhook`), same as the old Moodle enrollment hook.

**New UI**: `/admin/tutor-lms-courses` (map an LMS Course feed item to a Tutor course ID + price, mirroring the deleted Moodle admin page), `/feed/[id]/tutor-lms-course` (learner buy/launch page), `/api/v1/tutor-lms-courses/[feedItemId]` (admin mapping upsert) and `.../launch` (access-checked redirect to the one-time WordPress login URL).

**Deleted**: `src/lib/lti-platform.ts`, `/api/lti/*`, `/api/v1/moodle-courses/*`, `moodle-course.service.ts`, `/admin/moodle-courses`, `/feed/[id]/moodle-course` — the entire LTI-as-Platform build from §28 is gone, not just superseded. `docs/MOODLE_SELF_HOSTING.md` stays as reference per the original decision in §29.

**Env vars**: `.env.example` and the local `.env` had every `LTI_PLATFORM_*`/`MOODLE_LTI_*` entry replaced with `WORDPRESS_BASE_URL`, `WORDPRESS_APP_USERNAME`, `WORDPRESS_APP_PASSWORD`, and `MCGLEARN_WP_PLUGIN_SECRET` (set to the real value the `onlineclass` session generated and verified live). The WordPress app username/password are still TODO placeholders — see Known Gaps.

**Verified**: `npm run typecheck`, `npm run lint`, and `npm run build` all pass clean (one pre-existing, unrelated `sw.js` lint warning). Not yet verified against a real live purchase end-to-end — that needs the WordPress Application Password filled in first.

Grepped `src/` case-insensitively for "moodle" afterward — zero matches remain in application code.

---

## 33. WordPress Application Password generated — end-to-end testing unblocked

The `onlineclass` session generated a WordPress Application Password on the existing `mcglearn-api` account (consolidating under one identity rather than creating a new WP user) and verified it for real against the live Users API — created an actual test user via `POST /wp-json/wp/v2/users`, confirmed `GET .../users?search=<email>` found it, then deleted the test user. Verified against that session's own transcript before use, per the standing practice in this stretch of checking any server/credential-related cross-session message against the sender's actual history first.

Filled into the local `.env` (gitignored, never committed) as `WORDPRESS_APP_USERNAME`/`WORDPRESS_APP_PASSWORD`, replacing the placeholders from §32.

**Flagged, not yet acted on**: since `mcglearn-api` is a WordPress administrator, this Application Password inherits full admin-level access to the Users API (and everything else that account can do), not just create/find-user. The `onlineclass` session raised this itself rather than glossing over it. A tighter fix — a dedicated WP role with only `create_users`/`list_users`/`edit_users` — is worth doing at some point but is not a blocker; noted here so it isn't forgotten.

With this, real end-to-end purchase → enroll → launch testing against the live WordPress/Tutor LMS instance is unblocked for the first time this migration.

---

## 34. Live end-to-end purchase test — real bug found and fixed

Ran the full pipeline against the real `lms.medicalcodingglobal.com` instance and the real shared DB, using the existing `ba.test.mcglearn@gmail.com` test-learner account (not a new account — no credentials were created or entered) and course ID 8 ("Sample Course", confirmed clean and unenrolled by the `onlineclass` session beforehand). Skipped Razorpay entirely per explicit instruction — no checkout UI, no card entry anywhere; a `PAID` `Purchase` row was inserted directly to simulate a completed payment, isolating the test to the genuinely new code (the WordPress/Tutor LMS integration), not the already-proven Razorpay plumbing.

**Verified live, in order**: `findOrCreateWpUser` located the existing WordPress account (id 5) via the Users API; `enrollWpUser` created a real enrollment (id 17) in course 8, and calling it again (re-running the test after a script bug) confirmed the plugin's enrollment is idempotent — same enrollment id both times, no duplicate; `hasAccess()` correctly flipped true once the `Purchase` row existed; the generated launch URL, opened for real in the browser, landed on an authenticated WordPress session ("Howdy, Test Analyst") showing the course's actual enrolled-student view (Course Content / Course Progress sections, not a paywall) — confirming the auto-login token and the `course_id` redirect both work correctly against production.

**Real bug found and fixed**: `src/lib/tutor-lms.ts`'s `generateAutoLoginUrl` was reading `result.login_url`, but the mu-plugin's actual JSON response field is `launch_url` — confirmed by calling the route directly and inspecting the raw body. Every earlier claim of this route working (both peer reports and my own reasoning) was correct about the plugin's *behavior*, but the field-name mismatch meant our client code would have thrown on every real call. Would not have been caught without an actual live call — exactly why the user asked for this test before committing. Fixed, `typecheck`/`lint` re-verified clean.

All test data cleaned up afterward: WordPress enrollment removed (unenroll confirmed via the plugin's own response), the test user's `wordpressUserId` reset to null, the test `Purchase` row(s) and `[E2E TEST]` `FeedItem`/`TutorLmsCourseMapping` deleted, temporary test scripts removed. Nothing test-related was left in the shared DB or on the WordPress instance.

---

## 35. Module/lesson pricing, generalized bundling, and installment plans (§30 built and tested)

Built the four pieces scoped in §30, now that the WordPress migration proved out. All schema/service work, admin and learner UI, and a full live end-to-end test happened in one pass, per the user's "start on it, test before committing" instruction.

**Schema**: `LearningPathModule` (a real row between `LearningPath` and `LearningPathItem`, with its own optional `priceInPaise`); `LearningPathItem` gained `moduleId` and its own optional `priceInPaise` (lesson-level pricing); `PurchasableType` gained `LEARNING_PATH_MODULE`, `LEARNING_PATH_ITEM`, and `INSTALLMENT`; `Purchase` gained matching nullable FKs plus `installmentId`; `BundlePath` (LearningPath-only) replaced by a polymorphic `BundleItem` (course/module/lesson, same nullable-FK-per-type shape `Purchase` already used) — the old table was empty in production, confirmed before dropping it; new `InstallmentPlan`/`Installment` models, one plan per purchasable unit, each installment settled through the existing Razorpay `Purchase` flow. Migration `20260913160000_learning_path_modules_installments_bundle_items` applied live the same way as the Tutor LMS one (`prisma migrate diff` against the direct DB URL, since the Supabase pooler can't support `migrate dev`'s shadow database).

**New service**: `contentAccessService.hasAccess(userId, {type, id})` — the centralized resolver the design doc called for. Resolves a lesson's or module's ancestor chain (item → module → course), collects whichever of those have a price, and grants access if the user holds a `PAID` Purchase or a `CURRENT`-or-`COMPLETED` `InstallmentPlan` on any priced node in that chain, or owns a `Bundle` whose items include any of them. A unit with no price anywhere in its chain is open to everyone — nothing to have bought. `purchaseService.hasPathAccess` is now a thin wrapper over this instead of its own bespoke bundle-join query.

**Real bugs found and fixed during test design/execution, before anything shipped**:
- Caught while writing the test, before running it: a `COMPLETED` installment plan (every installment paid off) would have been treated as *no access* — the resolver only checked for `status: "CURRENT"`. Fixed to honor `CURRENT` and `COMPLETED` alike; only `DEFAULTED`/`CANCELLED` withhold access.
- Caught live in the browser: the learning-path curriculum list's existing "preview lesson 1 free, click Start to unlock the rest" rule was swallowing genuine per-lesson/per-module purchases — a learner who paid for one specific lesson in an otherwise-free course still saw it locked, because the old lock formula only asked "does this user own the *whole course*", never the lesson itself. Fixed by gating individually-priced items/modules purely on their own `contentAccessService` result, independent of the course-level preview rule.

**New UI**: admin module manager on `/admin/learning-paths` (add/edit/delete a module with its own price; `LearningPathForm`'s item rows gained a module picker and a lesson-price field); `/admin/bundles` and `BundleForm` generalized to a mixed course/module/lesson picker; new `/admin/installment-plans` (create a plan by learner email + target unit + N installment rows, mark a plan defaulted); the learner course page (`/learning-paths/[slug]`) shows a "Buy this lesson"/`Buy "<module>"` button inline on any locked row that's individually purchasable, instead of just a lock icon; `/my-purchases` gained a "My Installment Plans" section with a pay-next-installment button.

**Verified live end-to-end** (real DB, real service calls, no mocks) rather than just unit-style assertions: created a real free test course with a priced module, a standalone priced lesson, a free lesson, a second module reachable only through a bundle, and an installment-only lesson; confirmed, in order, that (1) unpriced content is open by default, (2) a direct lesson purchase unlocks only that lesson, (3) a module purchase cascades to its lessons but not a sibling module, (4) a bundle purchase cascades through to a module's lessons, (5) an installment plan grants full access while `CURRENT` with zero installments actually paid yet, (6) paying off every installment via the real `purchaseService._settleInstallment` path flips the plan to `COMPLETED` without revoking access, (7) marking a different plan `DEFAULTED` revokes access immediately. Then opened the real dev server against this same test data with an already-authenticated learner session already present in the browser pane (no login performed) and confirmed in the actual UI: the curriculum list correctly showed "Open" for every unlocked lesson and a real "Buy this lesson — ₹200" button for the locked one; clicking a gated `ARTICLE` item's link (routed through `/feed/[id]/engage`) rendered normally for an unlocked lesson and correctly 404'd for a locked one; clicking the buy button actually called the checkout API and surfaced "Payments are not configured yet" (Razorpay has no local keys), confirming the new purchasable types are wired into the real order-creation path, not just reachable in theory. All test data (path, modules, items, feed items, bundle, purchases, installment plans) deleted afterward; verified zero rows remain.

**Not done, deliberately out of scope for this pass**: `TUTOR_LMS_COURSE`/`TUTOR_SESSION` access checks still use their own existing, already-verified logic rather than being rerouted through `contentAccessService` — folding them in would touch working code for no functional gain right now. No UI yet for a learner to *request* an installment plan themselves (admin creates plans today, matching how `CourseEnrollment` and other off-platform-adjacent flows already work in this app). No automated reminder/overdue handling for installments — `InstallmentStatus.OVERDUE` exists in the schema but nothing sets it yet.

---

## 36. Netlify production hardening, two real purchases verified live, "Back to MCG Learn" link

Confirmed on 2026-09-25 that neither Razorpay nor the WordPress integration were actually usable in production yet, despite earlier commits claiming both were "verified live" — checked directly against Netlify's environment variables (the WordPress four were present; **none** of `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`NEXT_PUBLIC_RAZORPAY_KEY_ID`/`RAZORPAY_WEBHOOK_SECRET` existed at all). The user generated real Razorpay test-mode keys and added them.

**Two real, unrelated Netlify build failures found and fixed** while redeploying to pick up the new env vars (commits `0e845a1`, `f395942`):
- Edge Functions bundling failed to resolve `@opentelemetry/api` — it's an *optional* peer dependency of Next.js itself; Node's loader skips a missing optional peer gracefully, but Netlify's edge bundler (esbuild) fails hard on the unresolved import. Fixed by installing it as a real dependency.
- Netlify's secret scanner failed the build on `NEXT_PUBLIC_RAZORPAY_KEY_ID` (and, on a later run, `RAZORPAY_KEY_ID` — same value, different name flagged) appearing in the client JS bundle — which is the entire point of the `NEXT_PUBLIC_` prefix, and a Razorpay Key ID is meant to be public regardless. Fixed via `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml`.

**Real course mapped**: `Sample Course (WordPress)` → WordPress course ID 8, ₹1,000, kept as `DRAFT` (admin-only) since the WordPress content itself is still a placeholder.

**Two full live purchases run against production**, both through the real Razorpay test-mode checkout widget (a domestic test card, since the generic international test Visa number got rejected by this account's card restrictions) — not simulated:
1. **Via the pre-existing admin session** (`infomedicalcodingglobal@gmail.com`) — surfaced a genuine edge case: that email is *also* the WordPress site's own administrator account (`mcgadmin`, user #1), so `findOrCreateWpUser`'s find-by-email correctly matched the existing WP admin rather than creating a separate student — meaning the site's own admin account became "enrolled" in a course. Not a bug (find-or-create did exactly what it should), but confirms find-by-email needs awareness of this collision risk for any WordPress account whose email doubles as an MCG-Learn user. Cleaned up afterward: unenrolled, `wordpressUserId` reset to null, test `Purchase` deleted.
2. **Via a real distinct learner account** (`vuharish24@gmail.com`, the user's own) — correctly created a *new* WordPress `subscriber`-role account (`wordpressUserId: 6`), enrolled it, and the launch redirect landed on the real enrolled Course Content view with no WP admin toolbar visible (confirming the role was genuinely non-admin, unlike case 1). Cleaned up the test purchase and WordPress enrollment afterward, but **kept** the `wordpressUserId` link live per the user's choice — it's a correctly-provisioned real account under their own email, so a future genuine purchase reuses it instead of creating a duplicate. Course reverted to `DRAFT` afterward (it had been temporarily published so the non-admin test login could see it at all).

**New feature, built in response to the user asking "how does a student get back to MCG-Learn after a lesson"**: there was no way — not a bug so much as a genuine missing piece, confirmed by checking that no such mechanism existed on either side. Fixed: `tutorLmsService.getLaunchUrl` now passes a `return_url` (the feed item's own course page) through to the mu-plugin's `/auto-login-token` call; the plugin sets a short-lived (`DAY_IN_SECONDS`) `httponly` cookie on token consumption and a new `wp_footer` hook renders a fixed "← Back to MCG Learn" bar for the rest of that browser session — deliberately a cookie, not user meta, so it can never leak onto an admin's or another account's *future* WordPress sessions the way the enrollment collision above did. MCG-Learn-side code is committed, typechecked, linted, and built clean. **Not yet live**: the updated `deploy/wordpress/mu-plugins/mcglearn-integration.php` needs to be applied to the actual WordPress server by whoever has that access — relayed to the `onlineclass` session (`php -l` clean; change is additive, no behavior change for callers that omit `return_url`), verification pending its deploy.
