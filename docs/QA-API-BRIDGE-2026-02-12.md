# QA Audit: LoveRescue ↔ SuperTool API Bridge

**Date:** 2026-02-12  
**Auditor:** QA Subagent  
**Verdict:** **CONDITIONALLY READY** — Several critical and high-severity issues must be resolved before production.

---

## Executive Summary

The integration is well-architected overall. Auth flow, consent checks, audit logging, and retry logic are solid foundations. However, there are **3 critical**, **6 high**, and **8 medium** issues that need attention — mostly around security edge cases, race conditions, and gaps between docs and implementation.

---

## CRITICAL Issues

### C1: Webhook HMAC computed on re-serialized body, not raw body
**File:** `loverescueWebhook.ts:56`  
**Issue:** `const rawBody = JSON.stringify(req.body)` re-serializes the parsed body. If Express's JSON parser normalizes whitespace, key ordering, or unicode escapes differently than the sender, the HMAC will **never match**. This is a classic webhook verification bug.  
**Fix:** Use `express.raw()` or `express.json({ verify: (req, res, buf) => req.rawBody = buf })` to capture the actual raw bytes before parsing, then HMAC that.  
**Impact:** Webhooks are effectively broken in production. Every signature check could fail depending on serialization differences.

### C2: API secret stored in plaintext on SuperTool side
**File:** `loverescueService.ts` factory + SuperTool DB  
**Issue:** `integration.apiSecret` is read from the DB and sent in plaintext to LoveRescue's `/auth` endpoint. The LoveRescue side bcrypt-hashes the secret (good), but SuperTool must store the **plaintext** secret to send it. This is stored in `loveRescueIntegration.apiSecret` — if SuperTool's DB is compromised, all LoveRescue API keys are exposed.  
**Fix:** Encrypt at rest using application-level envelope encryption (e.g., AWS KMS / libsodium secretbox). Document this in the BAA requirements.

### C3: `INTEGRATION_JWT_SECRET` falls back to `JWT_SECRET`
**File:** `integration.js:16`, `integrationAuth.js:76`  
**Issue:** If `INTEGRATION_JWT_SECRET` is not set, it falls back to the main app's `JWT_SECRET`. This means a regular user JWT could potentially be crafted to have `type: 'integration'` and pass the integration auth check, or an integration token could be used against user-auth endpoints if they don't check the `type` field. Shared secrets across trust boundaries is a critical auth flaw.  
**Fix:** Require `INTEGRATION_JWT_SECRET` to be set (fail startup if missing). Never share signing keys across auth domains.

---

## HIGH Issues

### H1: Rate limiter is in-memory, per-process, non-sliding
**File:** `integrationAuth.js:20-38`  
**Issue:** The rate limiter uses a simple fixed-window counter in a `Map`. Problems:
1. **Multi-process/container:** Each Node.js process has its own counter. With 4 workers, effective limit is 400/min, not 100.
2. **Fixed window burst:** An attacker can send 100 requests at 0:59, then 100 more at 1:01 — 200 requests in 2 seconds.
3. **No persistence:** Restarts reset all counters.  
**Fix:** Use Redis-backed sliding window (e.g., `rate-limiter-flexible` with Redis store).

### H2: Rate limit applied AFTER IP allowlist and DB lookup
**File:** `integrationAuth.js` middleware order  
**Issue:** `checkIpAllowlist` runs before `integrationRateLimit`, and it makes a DB query. A rate-limited attacker can still cause DB load from the IP allowlist check on every request. The rate limit check should come first (it's in-memory and cheap).  
**Fix:** Reorder: `authenticateIntegration → integrationRateLimit → checkIpAllowlist → auditIntegrationResponse`.

### H3: IP allowlist fails open
**File:** `integrationAuth.js:130`  
**Issue:** `catch (err) { ... next(); // Fail open for availability }` — If the DB query to fetch the IP allowlist fails, the request is allowed through. An attacker who can cause DB errors (e.g., connection exhaustion) bypasses IP restrictions.  
**Fix:** Fail closed. Return 503. IP allowlisting is a security control, not a convenience feature.

### H4: Alerts endpoint has no consent check for individual clients
**File:** `integration.js` GET `/alerts`  
**Issue:** The alerts endpoint filters by `therapistId` but does NOT verify that each alert's `clientId` still has active consent. If a client revokes consent, their historical alerts (including message text and metadata) continue to be returned.  
**Fix:** Join against `therapistClient` with `consentStatus: 'GRANTED'` or filter results post-query.

### H5: Webhook signature verification iterates ALL integrations
**File:** `loverescueWebhook.ts:52-60`  
**Issue:** On each webhook, SuperTool loads ALL enabled integrations and tries each secret until one matches. This is O(n) per webhook and leaks timing information about how many integrations exist. With many partners, this becomes a performance problem and potential DoS vector.  
**Fix:** Include a `partnerId` or `tenantId` header in webhook payloads so SuperTool can look up the correct secret directly.

### H6: No `consent.revoked` webhook event handler
**File:** `loverescueWebhook.ts:69-94`  
**Issue:** The docs (§7, Consent Revocation) promise a `consent.revoked` webhook event, but the webhook handler's switch statement only handles `alert.created`, `alert.critical`, and `milestone.achieved`. Revoked consent events are silently dropped (hit the `default` branch and log only). SuperTool never purges cached data for revoked clients.  
**Fix:** Add `case 'consent.revoked':` handler that invalidates caches and marks client data as inaccessible.

---

## MEDIUM Issues

### M1: Cache not invalidated on consent revocation
**File:** `loverescueService.ts` cache  
**Issue:** If consent is revoked, cached client lists, progress data, and alerts remain served from cache until TTL expires (up to 5 minutes). Stale consent = data leak window.  
**Fix:** Tie cache invalidation to `consent.revoked` webhook (see H6). Also consider shorter TTLs for client list.

### M2: `rateLimitPerMin` not actually used from DB
**File:** `integrationAuth.js:109`  
**Issue:** `req.integrationPartner.rateLimitPerMin` is set in `checkIpAllowlist`, but `integrationRateLimit` runs AFTER `checkIpAllowlist` in the stack. However, `integrationRateLimit` reads `partner.rateLimitPerMin` which was set by `checkIpAllowlist`. This works by accident due to middleware ordering, but is fragile. If ordering changes, the default 100/min always applies.  
**Fix:** Fetch `rateLimitPerMin` in the rate limit middleware itself, or explicitly document the ordering dependency.

### M3: Webhook processing errors return 200
**File:** `loverescueWebhook.ts:101`  
**Issue:** The catch block returns `200` to "prevent retries." But if the DB write fails, the alert is lost forever. The docs say non-2xx triggers retries — returning 200 on failure means data loss.  
**Fix:** Return 500 on processing errors. Let LoveRescue retry. Idempotency should be handled via alert ID deduplication.

### M4: No request timeout on SuperTool → LoveRescue calls
**File:** `loverescueService.ts` `request()` method  
**Issue:** `fetch()` is called without an `AbortSignal` timeout. If LoveRescue hangs, the SuperTool request hangs indefinitely.  
**Fix:** Add `signal: AbortSignal.timeout(10000)` or similar.

### M5: `Retry-After` header not read correctly from rate limit response
**File:** `loverescueService.ts:152`  
**Issue:** LoveRescue sets `retryAfter` in the JSON body, but the service reads `res.headers.get('Retry-After')`. LoveRescue does NOT set a `Retry-After` HTTP header — it sets `X-RateLimit-Reset`. The parsed value will always be `'5'` (the fallback).  
**Fix:** Read `retryAfter` from the response body, or have LoveRescue set the standard `Retry-After` header.

### M6: No idempotency on webhook alert storage
**File:** `loverescueWebhook.ts:73`  
**Issue:** If LoveRescue retries a webhook (per docs: up to 5 retries), the same alert gets stored multiple times. No dedup on `alertId`.  
**Fix:** Use `upsert` with `alertId` as unique key, or check existence before insert.

### M7: Outcomes endpoint returns `Set` in JSON
**File:** `integration.js` GET `/outcomes`  
**Issue:** `assessmentTypes: new Set(clientAssessments.map(...)).size` — this is fine (it's `.size`, a number). But worth noting: no consent-level filtering is applied to outcomes data. A BASIC-level client's crisis alert count is still returned.  
**Impact:** Low — it's aggregate counts, not PII. But document this.

### M8: TypeScript types are incomplete
**File:** `loverescueService.ts`  
**Issue:** `getProgress`, `getSessionPrep`, `getCouplesDynamics`, `getOutcomes` all return `Record<string, unknown>`. The actual response shapes are well-defined. Missing proper types means no compile-time safety on data mapping in routes.  
**Fix:** Define interfaces for all response types matching the API docs.

---

## Security Questions Answered

### Can a therapist access data for a client they're NOT linked to?
**No.** `requireIntegrationClientAccess()` checks `therapistClient` with `consentStatus: 'GRANTED'` for every client-specific endpoint. The `/clients` list also filters by consent. **This is solid.**

### Can a revoked consent still leak data?
**Yes, for up to 5 minutes** via SuperTool's cache (M1). Also **yes indefinitely** via the alerts endpoint (H4) which doesn't re-check consent per alert. Also, the `consent.revoked` webhook is not handled (H6), so SuperTool has no mechanism to proactively purge.

### What happens if LoveRescue is down?
**Handled reasonably.** The service retries up to 2 times with backoff for 5xx/network errors, then throws `LoveRescueApiError` with `CONNECTION_ERROR`. The route layer maps this to 502. **Missing:** no request timeout (M4), so a hanging connection blocks forever.

### What happens with concurrent requests exceeding rate limits?
**Rate limiter works but is per-process** (H1). Excess requests get 429 with `retryAfter`. SuperTool reads the 429 and throws `LoveRescueApiError` with `RATE_LIMITED`. The route returns this to the client. **However**, SuperTool does NOT auto-retry on 429 — it just surfaces the error. This is probably fine (let the UI/caller decide).

---

## Docs vs. Implementation Discrepancies

| Doc Claim | Reality | Severity |
|-----------|---------|----------|
| `consent.revoked` webhook event | Not handled by SuperTool | HIGH |
| `Retry-After` header on 429 | Not set by LoveRescue (only in JSON body) | MEDIUM |
| "Logs retained for 6 years" | No retention policy in code | LOW (ops concern) |
| Webhook retries "exponential backoff, max 5" | No retry logic exists in LoveRescue code (not in scope of files reviewed) | UNKNOWN |
| `FULL` permission includes "individual responses, journal entries" | Not implemented in progress endpoint — only mood/ratio added at STANDARD+ | LOW |

---

## What Works Well

1. **Consent model** — enforced at every data endpoint, permission levels correctly tiered
2. **Audit logging** — every request logged via middleware wrapper, including failed auth
3. **Token refresh** — SuperTool correctly handles 401 → re-auth → retry
4. **Retry logic** — exponential backoff on 5xx and network errors, max 2 retries
5. **HMAC webhook signing** — uses `timingSafeEqual`, constant-time comparison ✓
6. **Error propagation** — `LoveRescueApiError` class carries status codes and app codes cleanly across the bridge
7. **Permission filtering** — `filterByPermission` + per-endpoint checks for STANDARD/FULL
8. **Cache invalidation on writes** — `assignModule` correctly invalidates client and progress caches

---

## Priority Fix Order

1. **C1** — Webhook raw body (webhooks are broken without this)
2. **C3** — Separate JWT secrets (auth boundary violation)
3. **C2** — Encrypt API secret at rest
4. **H4** — Alerts consent check
5. **H6** — Handle `consent.revoked` webhook
6. **M3** — Don't return 200 on webhook processing errors
7. **H1** — Redis-backed rate limiter
8. **M4** — Request timeouts
9. **H3** — Fail closed on IP allowlist errors
10. Everything else

---

*Audit complete. This integration is 80% of the way to production-ready. The critical issues are fixable in 1-2 days. Don't ship without fixing C1-C3 and H4-H6.*
