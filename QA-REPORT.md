# Love Rescue App — Complete QA Audit Report

**Auditor:** Automated Code Audit  
**Date:** February 1, 2026  
**Commit:** `9267c90`  
**Scope:** Full-stack audit — backend, frontend, security, HIPAA, schema, tests, architecture

---

## Table of Contents
1. [Critical Issues](#1-critical-issues)
2. [High Priority](#2-high-priority)
3. [Medium Priority](#3-medium-priority)
4. [Low Priority](#4-low-priority)
5. [Positive Findings](#5-positive-findings)

---

## 1. Critical Issues

### CRIT-01: Vercel OIDC Token Committed to Repository
- **File:** `frontend/.env.local` (line 2)
- **Severity:** 🔴 CRITICAL
- **Description:** A Vercel OIDC JWT token is stored in `.env.local`. While `.env.local` is in `.gitignore`, the file exists on disk and the `.gitignore` entry `.env.local` only covers root level — `frontend/.env.local` may or may not be properly excluded depending on git behavior. The token contains Vercel team ID, project ID, user ID, and is signed. Even though it has an expiry, it reveals infrastructure metadata.
- **Suggested Fix:** Delete `frontend/.env.local` from the repo. Add `**/.env.local` to `.gitignore` explicitly. Rotate any Vercel tokens if this was ever committed. Run `git log --all --full-history -- frontend/.env.local` to verify it was never pushed.

### CRIT-02: Stripe Webhook Endpoint Receives `express.json()` Parsed Body
- **File:** `backend/src/routes/payments.js` (line ~66-73) + `backend/src/index.js` (line ~44)
- **Severity:** 🔴 CRITICAL
- **Description:** The Stripe webhook endpoint at `POST /api/payments/webhook` uses `express.raw({ type: 'application/json' })` middleware, but `express.json()` is applied globally in `index.js` *before* routes are mounted. Express will parse the body as JSON before the route's `express.raw()` middleware runs, meaning `req.body` will be an object, not a Buffer. `stripe.webhooks.constructEvent()` requires the **raw body** buffer, so signature verification will always fail in production.
- **Suggested Fix:** Move the webhook route *before* `express.json()` in `index.js`, or use a middleware that conditionally skips JSON parsing for the webhook path:
  ```js
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/payments/webhook') {
      next(); // skip json parsing
    } else {
      express.json({ limit: '10kb' })(req, res, next);
    }
  });
  ```

### CRIT-03: Calendar OAuth Callback Has No Authentication
- **File:** `backend/src/routes/calendar.js` (line ~56-80)
- **Severity:** 🔴 CRITICAL
- **Description:** `GET /api/calendar/callback` has no `authenticate` middleware. It trusts the `state` query parameter (which contains a user ID) without verification. An attacker could craft a callback URL with any userId to link a malicious Google account to any user's profile, hijacking their calendar integration.
- **Suggested Fix:** The `state` parameter should be a signed, time-limited CSRF token (stored in the Token table) that maps to a userId, not the raw userId itself. Verify the token before proceeding.

### CRIT-04: Google Calendar Tokens Stored Unencrypted
- **File:** `backend/src/routes/calendar.js` (line ~68-74)
- **Severity:** 🔴 CRITICAL
- **Description:** Google OAuth tokens (access_token, refresh_token) are stored as `JSON.stringify(tokens)` in the Token table without encryption. The code even has a comment: `// In production, encrypt these`. These tokens grant access to users' Google Calendars. For a HIPAA-adjacent app, storing OAuth tokens in plaintext in the database is a significant security gap.
- **Suggested Fix:** Encrypt tokens using `ENCRYPTION_KEY` from env vars before storage. Decrypt on retrieval. The env example already has an `ENCRYPTION_KEY` placeholder.

### CRIT-05: Therapist Registration Endpoint is Unauthenticated and Public
- **File:** `backend/src/routes/therapist.js` (line ~17)
- **Severity:** 🔴 CRITICAL
- **Description:** `POST /api/therapist/register` has no authentication or authorization middleware. Anyone can register as a "therapist" and receive an API key. While the assignment requires consent, an attacker could create unlimited therapist accounts, and if combined with social engineering (getting a user to consent), could access couple data.
- **Suggested Fix:** Require admin approval or an invitation token for therapist registration. At minimum, add rate limiting specific to this endpoint and email verification.

---

## 2. High Priority

### HIGH-01: JWT Stored in localStorage — Vulnerable to XSS
- **File:** `frontend/src/contexts/AuthContext.js` (lines 30, 43, 53, 66)
- **Severity:** 🟠 HIGH
- **Description:** JWT tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page. If an XSS vulnerability exists anywhere (e.g., journal entries rendered without sanitization), an attacker can steal the token.
- **Suggested Fix:** Use `httpOnly` cookies for JWT storage. This requires backend changes (set cookies in auth responses, cookie parser middleware, adjust CORS credentials). At minimum, implement CSP headers to mitigate XSS.

### HIGH-02: No CSRF Protection
- **File:** `backend/src/index.js`
- **Severity:** 🟠 HIGH
- **Description:** The API uses Bearer token auth (which provides implicit CSRF protection for API calls), but the Google Calendar callback and Stripe webhook don't use Bearer tokens. The calendar callback in particular accepts a GET request that modifies state, which is vulnerable to CSRF.
- **Suggested Fix:** Use a CSRF token for the calendar OAuth flow. The webhook is protected by Stripe signature verification (though see CRIT-02 about it being broken).

### HIGH-03: IDOR Vulnerability in Reports Couple Dashboard
- **File:** `backend/src/routes/reports.js` (line ~161, `couple-dashboard`)
- **Severity:** 🟠 HIGH
- **Description:** The couple dashboard fetches both partners' logs based on the relationship. While users are authenticated, there's no check for `sharedConsent` before showing partner data. A user could see their partner's mood/closeness data even if the partner hasn't consented to sharing.
- **Suggested Fix:** Add a consent check: if `sharedConsent` is false, only return the requesting user's data, not the partner's.

### HIGH-04: No Rate Limiting on Auth Endpoints
- **File:** `backend/src/index.js` (line ~38)
- **Severity:** 🟠 HIGH
- **Description:** The global rate limiter allows 100 requests per 15 minutes per IP. Login and signup endpoints have no stricter rate limiting. An attacker could attempt ~100 password guesses per 15 minutes per IP, and use multiple IPs for credential stuffing.
- **Suggested Fix:** Add a stricter rate limiter for auth routes (e.g., 5 failed login attempts per 15 minutes per IP, or per email):
  ```js
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
  ```

### HIGH-05: No Account Lockout After Failed Login Attempts
- **File:** `backend/src/routes/auth.js` (login endpoint)
- **Severity:** 🟠 HIGH
- **Description:** Failed login attempts are not tracked. There's no mechanism to lock accounts or delay responses after repeated failures.
- **Suggested Fix:** Track failed attempts per email in Redis/DB. After N failures, require a CAPTCHA or temporarily lock the account.

### HIGH-06: Password Reset Flow Missing
- **File:** `backend/src/routes/auth.js`
- **Severity:** 🟠 HIGH
- **Description:** There is no "Forgot Password" endpoint. The Token model supports `password_reset` type, but no route implements it. Users who forget their password have no recovery path.
- **Suggested Fix:** Implement `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` endpoints with email-based token flow.

### HIGH-07: WebAuthn Counter Not Persisted
- **File:** `backend/src/routes/auth.js` (line ~216)
- **Severity:** 🟠 HIGH
- **Description:** In `webauthn/login/verify`, the authenticator counter is hardcoded to `0`. The WebAuthn spec requires the counter to be persisted and verified on each login to detect cloned authenticators. A cloned authenticator would not be detected.
- **Suggested Fix:** Store the counter in the User model. After each successful login, update it with `verification.authenticationInfo.newCounter`.

### HIGH-08: No Input Validation on Daily Log Numeric Fields
- **File:** `backend/src/routes/logs.js` (line ~12-26)
- **Severity:** 🟠 HIGH
- **Description:** `positiveCount`, `negativeCount`, `closenessScore`, and `mood` have no validation for type, range, or bounds. A user could submit `closenessScore: 999999`, `mood: -100`, or non-numeric values. The schema uses `SmallInt` which would cause a Prisma error, but those are caught generically.
- **Suggested Fix:** Validate:
  ```js
  if (typeof positiveCount !== 'number' || positiveCount < 0 || positiveCount > 1000) { ... }
  if (closenessScore && (closenessScore < 1 || closenessScore > 10)) { ... }
  if (mood && (mood < 1 || mood > 10)) { ... }
  ```

### HIGH-09: No Email Sending Implemented
- **File:** `backend/src/routes/auth.js` (line ~282)
- **Severity:** 🟠 HIGH
- **Description:** Partner invite has `// TODO: Send invite email via nodemailer`. Email sending is not implemented despite SendGrid being listed as an integration. Partners must manually share invite links.
- **Suggested Fix:** Implement email sending via SendGrid/nodemailer for partner invites, password resets, and payment notifications.

### HIGH-10: Matchup Uses Stale/Legacy Assessment Types
- **File:** `backend/src/routes/matchup.js` (lines ~35-36)
- **Severity:** 🟠 HIGH
- **Description:** The matchup generation requires `wellness_behavior` and `negative_patterns_closeness` assessment types, but the assessments page now shows 10 different assessments with a newer set (attachment, personality, love_language, etc.). The required types for matchup are legacy types that may not be presented to new users. The frontend Matchup page also shows these legacy types.
- **Suggested Fix:** Update matchup required types to match the current core assessment list. Consider requiring a subset of the new assessments (e.g., attachment, personality, love_language, gottman_checkup).

### HIGH-11: Frontend "View Unified Profile" Links to Non-Existent Route
- **File:** `frontend/src/pages/Assessments/Assessments.js` (line ~690)
- **Severity:** 🟠 HIGH
- **Description:** When all assessments are complete, the CTA button navigates to `/profile`, but there is no `/profile` route defined in `App.js`. This will hit the catch-all and redirect to `/dashboard`.
- **Suggested Fix:** Either create a Profile page component and route, or change the link to navigate to an existing page (e.g., `/assessments` or `/matchup`).

---

## 3. Medium Priority

### MED-01: No Data Encryption at Rest (HIPAA Gap)
- **File:** `backend/prisma/schema.prisma`
- **Severity:** 🟡 MEDIUM
- **Description:** Journal entries (`journalEntry` in DailyLog), assessment responses, and gratitude text are stored as plaintext in the database. For a relationship health app that claims HIPAA compliance, sensitive data should be encrypted at rest. The `.env.example` has an `ENCRYPTION_KEY` but it's never used in the code.
- **Suggested Fix:** Implement application-level encryption for sensitive fields (journalEntry, responses, gratitude text) using AES-256 with the `ENCRYPTION_KEY`. Alternatively, rely on PostgreSQL's native encryption features or encrypted disk storage.

### MED-02: Audit Logger Runs After Response — Potential Data Loss
- **File:** `backend/src/middleware/auditLogger.js` (line ~23-47)
- **Severity:** 🟡 MEDIUM
- **Description:** The audit log is saved to the database in a `res.on('finish')` callback with try/catch that silently logs errors. If the database is down or slow, audit logs can be silently lost. For HIPAA compliance, audit logs should be reliably persisted.
- **Suggested Fix:** Consider a message queue (e.g., Redis, SQS) for audit log ingestion with retry logic. At minimum, the error handling should alert/flag when audit logs fail to persist.

### MED-03: AccessLog `resourceId` Type Mismatch
- **File:** `backend/src/routes/reports.js` (line ~194) + `backend/prisma/schema.prisma` (AccessLog model)
- **Severity:** 🟡 MEDIUM
- **Description:** In the couple-dashboard route, `accessLog.create()` passes `resourceOwnerId: relationship.id` (a UUID) but no `resourceId`. In `backend/src/routes/therapist.js`, `resourceId: relationshipId` is passed. The `resourceId` field is `@db.Uuid` in the schema, but in the audit logger middleware, it tries to store path segments which may not be UUIDs. This type mismatch will cause silent failures.
- **Suggested Fix:** Make `resourceId` a `String` type or ensure all callers pass valid UUIDs.

### MED-04: CORS Allows Hardcoded Development IP
- **File:** `backend/src/index.js` (line ~34)
- **Severity:** 🟡 MEDIUM
- **Description:** CORS allows `http://10.0.0.219:3000` in production. This is a local network IP address that shouldn't be in production config.
- **Suggested Fix:** Remove the hardcoded IP. Use environment variables for all allowed origins:
  ```js
  origin: (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL).split(',')
  ```

### MED-05: No Data Retention Policy Implementation
- **File:** Backend (general)
- **Severity:** 🟡 MEDIUM
- **Description:** The privacy policy states "data is retained as long as your account is active" and "permanently removed within 30 days" of deletion, but there's no automated cleanup process. Deleted user data relies on Prisma cascade deletes, and audit/access logs use `SetNull` for userId — meaning orphaned logs remain indefinitely. HIPAA requires defined data retention schedules.
- **Suggested Fix:** Implement a periodic cleanup job that purges orphaned audit logs and expired tokens. Add a `deletedAt` column for soft deletes with a 30-day hard-delete cron job.

### MED-06: Token Table Not Cleaned Up
- **File:** `backend/prisma/schema.prisma` (Token model)
- **Severity:** 🟡 MEDIUM
- **Description:** WebAuthn challenges, calendar tokens, and other tokens accumulate in the Token table. Expired tokens are never deleted. Over time this table will grow unbounded.
- **Suggested Fix:** Add a scheduled job or middleware that deletes tokens where `expiresAt < NOW()`.

### MED-07: Strategies Completed Tasks Not Persisted
- **File:** `frontend/src/pages/Strategies/Strategies.js` (lines ~97-110)
- **Severity:** 🟡 MEDIUM
- **Description:** Completed tasks are stored in React state (`completedTasks = new Set()`). When the user refreshes the page, all task completions are lost. The progress percentage is sent to the API, but the individual task IDs are not.
- **Suggested Fix:** Either persist completed task IDs in the strategy record on the backend, or use localStorage as a fallback.

### MED-08: No Pagination on List Endpoints
- **File:** Multiple backend routes
- **Severity:** 🟡 MEDIUM
- **Description:** Several endpoints return unbounded result sets: `GET /api/goals` (all goals), `GET /api/strategies/history` (all strategies), `GET /api/assessments/results` (all assessments). For long-term users, these queries will grow.
- **Suggested Fix:** Add `take` and `skip` parameters to Prisma queries. Accept `limit` and `offset` query params.

### MED-09: Gratitude Streak Calculation Has Timezone Bug
- **File:** `backend/src/routes/gratitude.js` (streak endpoint)
- **Severity:** 🟡 MEDIUM
- **Description:** The streak calculation uses `new Date()` for "today" on the server (UTC timezone), but dates are stored using local timezone parsing in the POST endpoint. This mismatch means the streak may break incorrectly for users in timezones far from UTC.
- **Suggested Fix:** Consistently use UTC for date comparisons, or accept and store the user's timezone.

### MED-10: Duplicate Streak Logic in Gratitude Routes
- **File:** `backend/src/routes/gratitude.js` (lines ~90-140 and ~180-230)
- **Severity:** 🟡 MEDIUM
- **Description:** The streak calculation logic is duplicated almost verbatim between `/streak` and `/stats` endpoints. This violates DRY and creates maintenance risk.
- **Suggested Fix:** Extract streak calculation into a shared utility function.

### MED-11: `reports/couple-dashboard` AccessLog Missing `resourceId`
- **File:** `backend/src/routes/reports.js` (line ~194)
- **Severity:** 🟡 MEDIUM
- **Description:** The AccessLog create call passes `resourceOwnerId` but not `resourceId`, so a required audit field is null. The `resourceType` is `couple_dashboard` but there's no clear resource ID to audit.
- **Suggested Fix:** Pass `resourceId: relationship.id`.

### MED-12: No Helmet CSP Configuration
- **File:** `backend/src/index.js`
- **Severity:** 🟡 MEDIUM
- **Description:** Helmet is used with default settings, which sets some headers but doesn't configure Content Security Policy. A strict CSP would mitigate XSS risks, especially important since JWT is in localStorage.
- **Suggested Fix:** Configure helmet with a custom CSP:
  ```js
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com"],
        // ...
      }
    }
  }));
  ```

### MED-13: Terms of Service Shows Wrong Price
- **File:** `frontend/src/pages/Settings/Settings.js` (ToS dialog)
- **Severity:** 🟡 MEDIUM
- **Description:** The Terms of Service states "$9.99/month per couple", but the Settings pricing cards show Standard at $29.99/mo, Premium at $249/mo, and Annual at $200/mo. The pricing is inconsistent.
- **Suggested Fix:** Update the ToS text to reflect actual pricing, or make the pricing dynamic.

### MED-14: Google OAuth2Client Initialized Even When Not Configured
- **File:** `backend/src/routes/calendar.js` (line ~22-26)
- **Severity:** 🟡 MEDIUM
- **Description:** `new google.auth.OAuth2(...)` is called at module load time with potentially placeholder values. While `isCalendarConfigured()` guards the routes, the OAuth2 client is still created with invalid credentials.
- **Suggested Fix:** Initialize the OAuth2 client lazily inside the route handlers, only after checking `isCalendarConfigured()`.

### MED-15: 404 Handler After Error Handler
- **File:** `backend/src/index.js` (lines ~76-80)
- **Severity:** 🟡 MEDIUM
- **Description:** The 404 handler is placed *after* the error handler. Express error handlers must be the last middleware. If a route throws and the error handler calls `next()`, the 404 handler would not behave as expected. The current order means unhandled errors hit the error handler correctly, but the 404 handler is technically a regular middleware placed after an error handler, which is unusual.
- **Suggested Fix:** Move the 404 handler before the error handler:
  ```js
  app.use((req, res, next) => { ... 404 ... });
  app.use(errorHandler);
  ```

---

## 4. Low Priority

### LOW-01: Console.error Statements in Frontend Production Code
- **Files:**
  - `frontend/src/pages/Dashboard/Dashboard.js` (lines 100, 111)
  - `frontend/src/pages/Settings/Settings.js` (line 82)
  - `frontend/src/pages/Assessments/Assessments.js` (line 722)
  - `frontend/src/pages/Strategies/Strategies.js` (line 110)
- **Severity:** 🟢 LOW
- **Description:** `console.error()` calls in production code leak error details to the browser console. While not as bad as `console.log`, they're visible to users with devtools open.
- **Suggested Fix:** Replace with a proper error reporting service (e.g., Sentry) or remove entirely. Errors are already shown to users via Alert components.

### LOW-02: Assessments Page Uses Hardcoded Count of 8 on Dashboard
- **File:** `frontend/src/pages/Dashboard/Dashboard.js` (line ~113)
- **Severity:** 🟢 LOW
- **Description:** `const totalAssessments = 8;` is hardcoded, but the assessments page now lists 10 types (including hormonal_health and physical_vitality). The progress bar will show incorrect completion percentage.
- **Suggested Fix:** Derive the count from the backend response or use the same constant as the Assessments page.

### LOW-03: Missing `aria-label` on Icon Buttons
- **Files:** Multiple frontend components
- **Severity:** 🟢 LOW
- **Description:** Icon buttons throughout the app (copy link, toggle share, edit) lack `aria-label` attributes. Screen readers will not be able to identify these buttons.
- **Suggested Fix:** Add `aria-label` to all `<IconButton>` components.

### LOW-04: No `<title>` or Meta Tags Per Page
- **File:** `frontend/src/App.js`
- **Severity:** 🟢 LOW
- **Description:** All pages use the same document title. No dynamic title or meta description is set per route. This impacts SEO for the landing page and accessibility.
- **Suggested Fix:** Use `react-helmet` or the document title API to set page-specific titles.

### LOW-05: Landing Page is Static HTML (Separate from React App)
- **File:** `landing/index.html` + `frontend/src/pages/Landing/Landing.js`
- **Severity:** 🟢 LOW
- **Description:** There are two landing pages: a static HTML one at `landing/index.html` (served via root `vercel.json`) and a React component at `pages/Landing/Landing.js` (served at `/welcome`). The static one is the actual production landing page. This creates maintenance duplication.
- **Suggested Fix:** Consolidate to one landing page. Either serve the React app at root with the Landing component, or maintain only the static version.

### LOW-06: `useEffect` Missing Dependencies in Multiple Components
- **Files:** Multiple frontend pages (with `// eslint-disable-next-line react-hooks/exhaustive-deps`)
- **Severity:** 🟢 LOW
- **Description:** Several components disable the exhaustive-deps ESLint rule. While this is intentional for "run once" patterns, it can mask bugs if dependencies change.
- **Suggested Fix:** Use empty dependency arrays intentionally and document why, or restructure to satisfy the linter.

### LOW-07: Prisma Schema Missing Index on `GratitudeEntry.isShared`
- **File:** `backend/prisma/schema.prisma` (GratitudeEntry model)
- **Severity:** 🟢 LOW
- **Description:** The `GET /api/gratitude/shared` and `GET /api/gratitude/love-note` endpoints query by `isShared: true`. There's no index on `isShared`, so this is a full table scan filtered by userId.
- **Suggested Fix:** Add `@@index([userId, isShared])` to the GratitudeEntry model.

### LOW-08: Meeting Model Missing `onDelete` for Mediator Relation
- **File:** `backend/prisma/schema.prisma` (Meeting model, line ~for mediator relation)
- **Severity:** 🟢 LOW
- **Description:** The Meeting → Mediator relation has no `onDelete` clause. If a mediator is deleted, all their meetings would cause a foreign key violation. Other relations properly use `onDelete: Cascade` or `onDelete: SetNull`.
- **Suggested Fix:** Add `onDelete: SetNull` to the mediator relation in Meeting, or prevent mediator deletion while active meetings exist.

### LOW-09: Error Handler Leaks Stack Traces in Development
- **File:** `backend/src/middleware/errorHandler.js` (line ~38)
- **Severity:** 🟢 LOW
- **Description:** In non-production mode, the raw error message is sent to the client. This is intentional for development, but if `NODE_ENV` is accidentally not set in production, stack traces would leak.
- **Suggested Fix:** Default to production behavior:
  ```js
  const message = process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred';
  ```

### LOW-10: Missing `frontend/.env.example` for Google Client ID
- **File:** `frontend/.env.example`
- **Severity:** 🟢 LOW
- **Description:** The frontend `.env.example` doesn't include `REACT_APP_GOOGLE_CLIENT_ID`, but the Login/Signup pages use `@react-oauth/google` which needs it. New developers won't know this is required.
- **Suggested Fix:** Add `REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id` to the example.

### LOW-11: AssessmentQuiz Keyboard Shortcut Conflicts
- **File:** `frontend/src/pages/Assessments/AssessmentQuiz.js` (keyboard handler)
- **Severity:** 🟢 LOW
- **Description:** The keyboard handler uses `Enter` to advance, but if a user tabs to a radio button and presses Enter, it could cause double navigation. Arrow keys are also used, which conflicts with screen reader navigation.
- **Suggested Fix:** Only enable keyboard shortcuts when the quiz area is focused. Add a focus trap or use `role="application"` to communicate custom keyboard behavior.

### LOW-12: Strategy Progress Can Exceed 100%
- **File:** `backend/src/routes/strategies.js` (line ~127)
- **Severity:** 🟢 LOW
- **Description:** The `progress` field accepts any value without clamping. A client could send `progress: 500`. The schema allows `Float` with no constraint.
- **Suggested Fix:** Clamp: `Math.min(100, Math.max(0, calculatedProgress))`.

---

## 5. Positive Findings

### ✅ Excellent Consent Architecture
The therapist integration has a well-designed consent model:
- Per-user consent (both partners must independently consent)
- Consent audit trail via `ConsentLog` table
- Automatic therapist assignment revocation on consent withdrawal
- `requireBothConsent` middleware for data access
- AccessLog records for denied access attempts
- Private journal entries excluded from therapist view

### ✅ Comprehensive Audit Logging
- Every API request is logged to both the database and file system
- Separate `AuditLog` and `AccessLog` tables for different purposes
- Structured logging via Winston with JSON format in production
- User agent, IP address, request duration captured

### ✅ Strong Auth Middleware Design
- `authenticate`, `requireSubscription`, `requirePremium`, `requireRole` are well-layered
- Therapist authentication uses bcrypt-hashed API keys (not plaintext comparison)
- `requireTherapistAssignment` properly verifies therapist-couple relationship
- `loadRelationship` middleware reduces code duplication

### ✅ Prisma Schema is Well-Structured
- UUID primary keys throughout (good for distributed systems)
- Appropriate use of enums for constrained values
- Composite unique constraints where needed (userId_date, week_day, etc.)
- Cascade deletes on user-owned data, SetNull on optional relations
- Comprehensive indexing on foreign keys and frequently queried fields
- JSONB for flexible assessment data

### ✅ Good Error Handling Patterns
- Backend routes consistently use `try/catch` with `next(error)` for centralized error handling
- Frontend API calls use `.catch()` with fallback data on dashboard
- Global error handler in Express handles Prisma errors, JWT errors, and validation errors
- Frontend shows user-friendly Alert components for errors

### ✅ Security Headers & Rate Limiting
- Helmet middleware for security headers
- Global rate limiting (100 req/15min)
- Request body size limited to 10kb
- CORS configured with credentials
- `trust proxy` set correctly for production reverse proxy

### ✅ Well-Designed Frontend Architecture
- React.lazy + Suspense for code splitting
- Protected/Public route wrappers
- Consistent loading states with CircularProgress
- Mobile-responsive layout with bottom navigation
- Catch-all route handling for auth-based redirects

### ✅ Graceful Shutdown
- `SIGTERM` and `SIGINT` handlers disconnect Prisma before exit
- Prevents connection leaks on deployment

### ✅ WebAuthn Implementation
- Full registration and authentication flows
- Challenge stored in database with expiry
- Challenges marked as used after verification
- Supports credential recovery via email/password fallback

### ✅ Stripe Integration is Solid
- Customer portal integration for self-service billing
- Webhook handles multiple event types (checkout, subscription update/delete, payment failure)
- Cancel-at-period-end (users keep access until billing cycle ends)
- Tiered pricing (standard, premium, annual)

### ✅ Thoughtful UX Details
- Disclaimer dialog on first visit
- Keyboard shortcuts in quiz (1-7 for Likert scale)
- Question map for quiz navigation
- Partner invite flow with copy-to-clipboard
- Streak mechanics for engagement (gratitude, video)
- Weekly Love Note feature

### ✅ Good Test Coverage Structure
- Jest tests for all 13 backend route files
- Jest tests for middleware (auth, auditLogger, errorHandler)
- Jest tests for utils (coursePosition, scoring)
- Cypress E2E tests for 7 user flows
- Frontend component tests for pages and services
- Test helpers with fixtures, mocks, and token generation

### ✅ Privacy-Aware Design
- Daily logs have `isPrivate` and `therapistVisible` flags
- Gratitude entries have explicit `isShared` toggle
- Assessment responses are never exposed to partners (only interpretations)
- Journal entries excluded from therapist data views
- Consent change history is auditable

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟠 High | 11 |
| 🟡 Medium | 15 |
| 🟢 Low | 12 |
| ✅ Positive | 15 |
| **Total Issues** | **43** |

### Top 3 Actions:
1. **Fix the Stripe webhook body parsing** (CRIT-02) — webhooks are broken right now
2. **Secure the calendar OAuth callback** (CRIT-03) and **encrypt stored tokens** (CRIT-04)
3. **Add authentication to therapist registration** (CRIT-05) and **move JWT to httpOnly cookies** (HIGH-01)

### HIPAA Status: ⚠️ Partial
The app has good foundations (audit logging, consent management, access controls) but falls short on:
- Data encryption at rest (MED-01)
- Reliable audit log persistence (MED-02)
- Data retention policy enforcement (MED-05)
- Token/credential encryption (CRIT-04)
- No BAA (Business Associate Agreement) framework for therapist access
