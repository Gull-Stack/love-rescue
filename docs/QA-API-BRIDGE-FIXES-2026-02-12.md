# QA API Bridge Fixes — 2026-02-12

Fixes applied for all **Critical** and **High** severity issues from [QA-API-BRIDGE-2026-02-12.md](./QA-API-BRIDGE-2026-02-12.md).

---

## Critical Fixes

### C1: Webhook HMAC now computed on raw body bytes
**File:** `supertool-app/…/routes/loverescueWebhook.ts`
- Added `express.json({ verify })` middleware to capture raw `Buffer` before parsing
- Changed `verifyWebhookSignature` to accept `Buffer` instead of `string`
- Removed `JSON.stringify(req.body)` — HMAC is now computed on the exact bytes received

### C2: API secret encryption at rest
**Status:** Architecture decision required — flagged for follow-up. Requires envelope encryption (KMS/libsodium). Not a code-only fix.

### C3: INTEGRATION_JWT_SECRET is now mandatory
**Files:** `love-rescue/…/middleware/integrationAuth.js`, `love-rescue/…/routes/integration.js`
- Both files now **throw on startup** if `INTEGRATION_JWT_SECRET` is not set
- Removed all `|| process.env.JWT_SECRET` fallbacks
- Integration and user auth domains are now fully isolated

---

## High Fixes

### H1: In-memory rate limiter
**Status:** Noted — requires Redis-backed solution (`rate-limiter-flexible`). Tracked for infrastructure work.

### H2: Rate limit now runs before IP allowlist DB lookup
**File:** `love-rescue/…/middleware/integrationAuth.js`
- Middleware order changed: `authenticateIntegration → integrationRateLimit → checkIpAllowlist → auditIntegrationResponse`
- Cheap in-memory rate limit now shields the DB from abuse

### H3: IP allowlist fails closed
**File:** `love-rescue/…/middleware/integrationAuth.js`
- On DB error, returns `503` instead of calling `next()`
- Attackers can no longer bypass IP restrictions via DB connection exhaustion

### H4: Alerts endpoint now filters by active consent
**File:** `love-rescue/…/routes/integration.js`
- GET `/alerts` queries `therapistClient` for `consentStatus: 'GRANTED'` first
- Only returns alerts for clients with active consent
- Returns empty array if no consented clients

### H5: Webhook partner lookup by header
**File:** `supertool-app/…/routes/loverescueWebhook.ts`
- Reads `X-LoveRescue-Partner-Id` header for direct O(1) integration lookup
- Falls back to iterating all integrations for backward compatibility

### H6: `consent.revoked` webhook event handler added
**File:** `supertool-app/…/routes/loverescueWebhook.ts`
- New `case 'consent.revoked'` in the webhook switch
- Marks alerts as `consentRevoked: true` in DB
- Logs revocation for audit trail

**File:** `supertool-app/…/services/loverescueService.ts`
- Added `handleConsentRevoked(clientId)` method that purges all relevant cache entries (progress, dynamics, alerts, client list)

---

## Medium Fixes (addressed opportunistically)

### M3: Webhook errors now return 500 (not 200)
**File:** `supertool-app/…/routes/loverescueWebhook.ts`
- Catch block returns `500` so LoveRescue retries failed webhooks
- Prevents silent data loss

### M6: Webhook alert deduplication
**File:** `supertool-app/…/routes/loverescueWebhook.ts`
- Uses `upsert` with `externalAlertId` when `alertId` is present in payload
- Prevents duplicate storage on LoveRescue retries

---

## Remaining Items (not code-only fixes)

| Issue | Status | Owner |
|-------|--------|-------|
| C2 — Encrypt API secret at rest | Needs KMS/infra decision | Platform team |
| H1 — Redis-backed rate limiter | Needs Redis infra | Platform team |
| M4 — Request timeouts | Add `AbortSignal.timeout()` | Next sprint |
| M5 — Retry-After header mismatch | Coordinate with LoveRescue API team | Next sprint |
| M8 — TypeScript types incomplete | Low risk, improve incrementally | Backlog |

---

*All JS files pass `node -c` syntax check. TS files reviewed for type consistency.*
