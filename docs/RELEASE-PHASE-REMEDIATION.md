# Release checklist — Phases 0–4 + QA remediation

Branch: `claude/love-rescue-couple-61mgyn`. Everything below must happen at (or immediately after) the merge/deploy of this branch.

## 1. Database migrations that MUST run before/with this deploy

Run `npx prisma migrate deploy` against production. New migrations on this branch:

| Migration | Why the deploy breaks without it |
|---|---|
| `20260727050000_add_daily_log_emotions` | `POST /api/logs/daily` now persists `emotions`; without the column every full check-in 500s |
| `20260727120000_add_in_app_notifications` | Nudge (`POST /api/partner/nudge-partner`) and Real Talk share (`POST /api/real-talk/:id/share`) now **await** writes to `in_app_notifications` and fail closed — without the table both endpoints 500 |
| `20260727121000_add_daily_log_quick_log_only` | Quick logs are flagged `quick_log_only`; logs route writes the column on every upsert — missing column 500s all check-ins |

(Older phase migrations `20260720160000_add_user_last_active_at` and `20260720161000_backfill_partner_shared_consent` are already applied in production via PR #9.)

Railway runs migrations per the service's deploy command — confirm it includes `prisma migrate deploy`; if not, run it manually before routing traffic.

## 2. Health-check URLs (the truth)

- Backend liveness: `GET https://backend-production-76f0e.up.railway.app/health` → `{"status":"healthy", ...}`.
  **There is no `/api/health`** — it 404s on both the Railway domain and loverescue.app. (An earlier handoff claimed otherwise; corrected in `docs/QA-REMEDIATION-NOTES.md`.)
- Billing probe: `GET https://loverescue.app/api/payments/health` → `{billing, keyConfigured, priceConfigured, stripeReachable, stripeAuthFailed}`.

## 3. Still an OWNER action (not fixed by this branch — do not pretend otherwise)

- Production `STRIPE_SECRET_KEY` in Railway is invalid (`stripeAuthFailed:true`). Checkout cannot complete anywhere until the account owner (Bryce Morgan) replaces it in Railway → love-rescue project → backend service → Variables. Success signal: the billing probe flips to `"billing":"healthy"`.
- `THERAPIST_ALLOWLIST` env (therapist onboarding allowlist) is unset — owner action in the same Railway Variables screen.
- `PLATFORM_ADMIN_EMAILS` env on the backend is the only admin allowlist now (the frontend no longer carries a hardcoded copy) — confirm it's set in Railway or admin access is limited to users with the DB `isPlatformAdmin` flag.

## 4. Post-deploy smoke (5 minutes, demo account `alex@demo.loverescue.app` / `DemoCouple2026!`)

1. Login via `POST /api/auth/login`; `GET /api/auth/me` → response includes `journey` (state, nextAction, hasLoggedToday) and `relationship`.
2. Quick log: `POST /api/logs/daily` with `{"mood":7,"quickLog":true}` → 201; the created/updated row has `quickLogOnly:true`, counts 0, ratio null (verify via `GET /api/reports/weekly` — quick day appears in `daysLogged` but its `dailyBreakdown` entry has null counts).
3. Full check-in: `POST /api/logs/daily` with real `positiveCount`/`negativeCount` → ratio math reflects it.
4. With a linked pair: `POST /api/partner/nudge-partner` → 200 with `pushed` boolean and a row in `in_app_notifications`; immediate repeat → 429 `NUDGE_LIMIT`.
5. Real Talk: create one, `POST /api/real-talk/:id/share` → 200 only if a `REAL_TALK_SHARED` row landed for the partner.
6. `GET /api/auth/join/<inviteCode>/preview` (no auth) → `{valid:true, inviterFirstName}` and nothing else.
7. Free/expired user: `GET /api/meetings/upcoming` → 200 (never 402); `/dashboard` loads.
8. Billing probe (§2) — expect `unavailable` until the Stripe key swap; `healthy` after.
