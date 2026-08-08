# MCG Learn — Session Changelog

**Date:** 2026-08-08 (updated — see §8–10 for this update)
**Period:** 2026-08-01 → 2026-08-08
**Scope:** Business-logic audit and fixes, new features, design pass, security fix, first production deployment, live auth verification, engagement features, social embedding
**Verification throughout:** `npm run typecheck` · `npm run lint` · `npm run build` all clean at every step; fixes additionally verified with one-off scripts against the live database (created test rows, asserted behavior, deleted them) and, from §8 onward, by logging into the live deployment and clicking through the actual UI

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

## 10. Known gaps (current)

- No automated test suite (pre-existing gap, flagged in `RC_AUDIT_REPORT.md`, still true)
- CRM, trainers, and admin management screens weren't touched in the design pass (only dashboard/nav/auth/achievements)
- No error monitoring (Sentry or equivalent)
- No rate limiting on public endpoints (registration, referral-code validation)
- Email deliverability at real volume depends on Supabase Auth's configured email provider — not verifiable from code
- YouTube/Instagram likes and comments are not implemented — Instagram is a hard platform wall; YouTube would need a new Google OAuth integration (separate future scope)
- Cleanup scripts for one-off DB verification should be double-checked with a follow-up query, not just trusted from their own console output (see §9 incidental finding)
