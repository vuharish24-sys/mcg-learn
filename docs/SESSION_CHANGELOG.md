# MCG Learn — Session Changelog

**Date:** 2026-08-07
**Period:** 2026-08-01 → 2026-08-07
**Scope:** Business-logic audit and fixes, new features, design pass, security fix, first production deployment
**Verification throughout:** `npm run typecheck` · `npm run lint` · `npm run build` all clean at every step; fixes additionally verified with one-off scripts against the live database (created test rows, asserted behavior, deleted them)

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

## 6. Verification status

**Confirmed working**: everything above passes typecheck/lint/build, and every fix touching data was additionally verified with one-off scripts against the real database (create test data → assert behavior → clean up). Public/unauthenticated pages and API auth behavior were verified directly on the live Netlify deployment.

**Not yet confirmed**: the authenticated click-through experience (feed, quiz-taking UX, dashboard, CRM, admin, referral claim end-to-end) has not been exercised live by a human or by Claude — Claude cannot enter passwords or create accounts, even for testing its own work. This is the next thing to do: log in on the deployed site and walk the core flows.

---

## 7. Known gaps (not addressed this session)

- No automated test suite (pre-existing gap, flagged in `RC_AUDIT_REPORT.md`, still true)
- CRM, trainers, and admin management screens weren't touched in the design pass (only dashboard/nav/auth/achievements)
- No error monitoring (Sentry or equivalent)
- No rate limiting on public endpoints (registration, referral-code validation)
- Email deliverability at real volume depends on Supabase Auth's configured email provider — not verifiable from code
