# Referral Commission Engine

Configurable commission campaigns, milestones, transactions, payouts, and audit trail. Extends referrals without replacing existing status-based reward tracking (`PENDING` / `QUALIFIED` / `REWARDED`).

## Database

Migration: `prisma/migrations/20260725150000_referral_commission_engine/migration.sql`

| Table | Purpose |
|-------|---------|
| `referral_campaigns` | Campaign name, dates, status, priority, max referrals, terms version, commission type, commission basis |
| `referral_campaign_courses` | Eligible learning paths (empty = all courses) |
| `referral_campaign_milestones` | Named sequenced milestones with trigger + flat/% value |
| `referral_commission_transactions` | Calculated commission rows per referral × milestone |
| `referral_commission_payments` | Date-wise payouts (UPI / bank / cash) |
| `referral_commission_audit_events` | Complete audit trail |

## Commission calculation flow

1. Admin configures campaign + milestones (no hardcoded amounts).
2. Officer/Admin fires a **trigger** with a **payment basis amount** via `POST /api/v1/referral-commissions/calculate`.
3. Engine resolves campaign (explicit id or highest-priority ACTIVE in date window matching course).
4. Matching active milestones for that trigger create `PENDING` transactions:
   - Flat → amount = milestone value
   - Percentage → amount = basis × value / 100
5. Duplicate `(referralId, milestoneId)` rows are skipped.
6. Approvals set status to `APPROVED` / `REJECTED` / `CANCELLED`.
7. Payment API records payout and sets transaction to `PAID`.

## Payment flow

1. Approve transaction on `/admin/referral-commissions/approvals`
2. Pay on `/admin/referral-commissions/payments` (date, amount, method, reference, remarks, paidBy)
3. History + reports show date-wise payment ledger

## APIs

| Method | Path | Access |
|--------|------|--------|
| GET/POST | `/api/v1/referral-campaigns` | Officer list / Admin create |
| GET/PATCH | `/api/v1/referral-campaigns/:id` | Officer get / Admin update |
| POST | `/api/v1/referral-campaigns/:id/milestones` | Admin |
| PATCH/DELETE | `/api/v1/referral-campaigns/milestones/:milestoneId` | Admin |
| GET | `/api/v1/referral-commissions` | Self or admin filters |
| POST | `/api/v1/referral-commissions/calculate` | Admin / Officer |
| PATCH | `/api/v1/referral-commissions/:id` | Approve / reject |
| POST | `/api/v1/referral-commissions/payments` | Admin |
| GET | `/api/v1/referral-commissions/summary` | Self or admin totals |
| GET | `/api/v1/referral-commissions/reports` | Charts + ledgers |

## Admin screens

- `/admin/referral-commissions` — campaign builder hub
- `/admin/referral-commissions/campaigns/[id]` — edit campaign + milestones
- `/admin/referral-commissions/approvals` — calculate + approve
- `/admin/referral-commissions/payments` — payout processing
- `/admin/referral-commissions/reports` — date/campaign/course/referrer/officer + audit

## Partner / dashboard extensions (additive)

- `/referrals` — commission earned / pending / approved / paid + history table
- `/dashboard` — commission summary strip
- Existing referral Lead History + `REWARDED` status unchanged

## Backward compatibility

- Existing `/api/v1/referrals*` routes untouched
- CRM, Auth, Learning, Certificates modules not refactored
- Legacy Pending/Paid Rewards counts (QUALIFIED / REWARDED) still displayed
- New engine runs in parallel via new tables/APIs only
