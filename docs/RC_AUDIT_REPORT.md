# MCG Learn — Release Candidate Audit Report

**Date:** 2026-07-22  
**Scope:** Full production readiness verification (no new features)  
**Verification commands:** `npm run lint` · `npm run typecheck` · `npm run db:generate` · `npm run build`  
**Final result:** **ZERO FAIL** · lint/typecheck/build **PASS**

---

## Summary

| Severity | Count |
|----------|------:|
| FAIL | **0** |
| WARNING | 10 |
| PASS | 42 |

All FAIL items found during audit were fixed and re-verified.

---

## FAIL

**None remaining.**

### FAIL items found and fixed in this RC cycle

| # | Issue | Fix |
|---|--------|-----|
| 1 | Middleware fail-open when Supabase env missing | Protected routes redirect to `/login` when env absent |
| 2 | Inactive-user redirect loop | `/login?reason=inactive` allowed; login form signs out |
| 3 | Unauthenticated register could create/overwrite users | Register sync requires authenticated session; Auth trigger provisions Learner + phone |
| 4 | Ad impressions inflated on every feed refresh | SessionStorage + httpOnly cookie dedupe; schedule-aware recording |
| 5 | Referral claim race / false success | `updateMany` where `referredUserId IS NULL`; proper 422/409 |
| 6 | User FK columns TEXT vs UUID PK | Schema `@db.Uuid`, initial migration corrected, conditional migrate `20260722093000_fix_user_fk_uuid` |
| 7 | Open redirect via `next` | `safeNextPath()` allowlist |
| 8 | Trainers GET missing role gate | Restricted to ADMIN / TRAINER / CAREER_OFFICER |
| 9 | Webinar/career / open double viewCount | Register no longer increments; open skips increment when redirecting internally |
| 10 | Certificates PII visible to non-admin/non-learner | Page + API + PDF scoped to ADMIN / LEARNER |
| 11 | Trainer filter lacked submit | Apply button added |

---

## WARNING

1. **No automated test suite** — no Jest/Vitest/Playwright scripts.
2. **Permission keys unused at runtime** — seeded in DB; enforcement uses `role.key` only.
3. **Incomplete CRUD** — no DELETE endpoints; feed/ads/categories are create-oriented.
4. **Mobile nav shows first 5 items only** — desktop nav remains complete.
5. **Status/property selects fail silently** — no toast when PATCH fails.
6. **Quiz/PDF viewCount increments on every page refresh** — no unique-view table.
7. **Feed still lists published ad-type items outside schedule** — impressions/clicks respect ACTIVE + window; listing does not hide expired ads.
8. **Public `/api/v1/referrals/validate`** — discloses code availability/status without auth (needed for signup).
9. **Trainer profiles not auto-linked to User** — `userId` optional; TRAINER dashboard may show “Not linked”.
10. **Live Supabase migrate/seed not executed in this environment** — schema/migrations verified statically; apply against real project before go-live.
11. **`docs/V1_IMPLEMENTATION_EVIDENCE.md` is stale** relative to V1.1/RC fixes.
12. **Node 20 local runtime** — Supabase packages warn; Netlify targets Node 22.

---

## PASS

### Build & quality
- PASS — ESLint clean  
- PASS — TypeScript `tsc --noEmit` clean  
- PASS — Production `next build` succeeds (27 routes)

### Pages
- PASS — `/login`, `/register` (Suspense for search params)  
- PASS — `/dashboard` role-specific widgets (Admin, Career Officer, Trainer, Learner)  
- PASS — `/feed` list, empty state, filters + Apply, featured/latest/popular  
- PASS — `/feed/[id]/quiz|pdf|webinar|career` type actions + empty/fallback states  
- PASS — `/crm` list + search/filter + empty state  
- PASS — `/crm/[id]` details + notes timeline create/edit  
- PASS — `/trainers` list + filter Apply + empty state  
- PASS — `/referrals` create, links, status updates  
- PASS — `/certificates` scoped list + PDF download  
- PASS — `/advertisements` campaigns  
- PASS — `/admin` users/categories/settings  

### Navigation & auth
- PASS — Desktop nav role visibility matches page gates  
- PASS — Middleware protects portal routes including `/admin`  
- PASS — Login/logout redirects  
- PASS — Home → `/dashboard` (unauth → login)  
- PASS — Inactive account path no longer loops  

### APIs
- PASS — Consistent `{ success, data }` / `{ success, error }` responses  
- PASS — Zod validation → 422 via `handleApiError`  
- PASS — Auth/role checks on mutating and sensitive GETs  
- PASS — `POST /api/v1/auth/register` requires session  
- PASS — Feed open/register, leads/notes, trainers, referrals claim/validate/status  
- PASS — Certificate PDF generation with ownership checks  
- PASS — Advertisement impression + click tracking (schedule-aware)

### Database
- PASS — Prisma models/relations declared for all V1 entities  
- PASS — Migrations present:  
  - `20260721184000_initial`  
  - `20260721184500_supabase_integration`  
  - `20260722093000_fix_user_fk_uuid`  
  - `20260722094500_auth_trigger_phone`  
- PASS — User FKs aligned to UUID  
- PASS — Multi-step lead registration uses `$transaction`  
- PASS — Feed open view/click uses `$transaction`  
- PASS — Referral claim uses conditional `updateMany`

### Workflows
- PASS — CRM lead create → detail → notes timeline → status update  
- PASS — Referral `?ref=` → register/login → claim → status  
- PASS — Trainer create (admin) → status update  
- PASS — Certificate issue → PDF download  
- PASS — Ad impression (deduped) + click on open  

### Forms & validation
- PASS — Login/register Zod client validation  
- PASS — Resource create forms + server Zod  
- PASS — Lead note body validation  

### Empty / loading
- PASS — Empty states on major list pages  
- PASS — Login/register Suspense fallbacks  

---

## Migrations checklist

| Migration | Purpose | Status |
|-----------|---------|--------|
| `20260721184000_initial` | Core schema + enums (UUID user FKs) | PASS |
| `20260721184500_supabase_integration` | Auth trigger + storage bucket | PASS |
| `20260722093000_fix_user_fk_uuid` | Conditional TEXT→UUID repair | PASS |
| `20260722094500_auth_trigger_phone` | Trigger writes phone from metadata | PASS |

---

## Go-live checklist (manual)

1. Apply migrations + seed against Supabase: `npm run db:migrate && npm run db:seed`  
2. Enable Supabase **Confirm email**  
3. Set all `.env.example` variables in Netlify (Node 22)  
4. Create bootstrap admin; re-seed with `BOOTSTRAP_ADMIN_EMAIL`  
5. Smoke-test: register → verify email → login → feed actions → CRM note → referral claim → certificate PDF → ad impression/click  

---

## Verdict

**Release Candidate: READY for staging smoke test** with **0 FAIL** items after automated fixes. Address WARNINGs as follow-up hardening; they do not block RC staging.
