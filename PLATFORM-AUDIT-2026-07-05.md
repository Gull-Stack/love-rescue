# Love Rescue — Full Platform Audit (2026-07-05)

**Scope:** Client mobile experience · Therapist portal (end-to-end practice workflow) · Billing (consumer + medical) · Security/Auth/HIPAA posture.
**Method:** Four parallel deep-dive audits over the actual code, with spot-verification of every critical finding. All citations are `file:line` in this repo.

---

## Executive summary

Love Rescue is a genuinely substantial product: a consumer couples app with strong clinical content engines, a therapist portal with the *right* consent architecture, HIPAA-minded schema (audit logs, access logs, consent tiers), and heavy unit-test investment (184 tests on the clinical engines alone). But the audit found a consistent pattern: **excellent engines that are never wired to production, and frontends that don't match their backends.** The platform is not yet safe to describe as "running a therapy practice," and several findings are compliance-grade.

### The 8 things that matter most (in order)

1. **Clients cannot revoke (or even see) therapist access — consent is permanent.** The Settings UI calls endpoints that don't exist, `GET /client/therapists` is hardcoded to return `[]`, and no code path anywhere sets `consentStatus: 'REVOKED'` on the live `TherapistClient` model. The consent screen's promise "You can change or revoke access anytime" is currently false. HIPAA-grade problem. (Therapist §CRIT-1)
2. **The crisis-detection and therapist-alert engines never run.** `crisisPathway.js` (suicide/DV detection, 988 escalation) and `therapistAlerts.js` (1,300+ lines) are imported by nothing; no scheduler invokes them. A client journaling suicidal ideation triggers zero response. (Therapist §CRIT-2)
3. **Marketing sells $49/$249 plans, but the product is free and checkout returns HTTP 410.** The landing page advertises two paid tiers, a 14-day trial, and a "See Progress or Pay Nothing Guarantee" (`landing/index.html:1572-1613`) while every purchase path is decommissioned and all users are force-premium (`backend/src/middleware/auth.js:46`). Zero revenue capability + deceptive-advertising exposure. (Billing §C1)
4. **Hardcoded, self-healing platform-admin accounts.** `backend/src/index.js:313-363` re-creates/re-promotes two hardcoded gullstack.com emails as platform admins on every boot — admin access is unrevocable by an operator and contradicts SECURITY-FIXES-BRIEF.md's claim that this was fixed. (Security §C-1)
5. **Sessions can't be revoked: 30-day JWTs survive logout and password change.** No logout endpoint, no blocklist, no token-version check. A stolen token stays valid for up to a month even after a password reset. (Security §C-2)
6. **Consent isn't enforced on several therapist read endpoints, and one partner's consent exposes the other partner's data.** A therapist can create a PENDING link to any user by email and immediately read names, emails, and assessment scores; couple endpoints require only one partner's consent to return both partners' clinical data. (Therapist §CRIT-4/5, Security §H-2)
7. **The therapist portal's flagship pages render empty due to frontend/backend shape mismatches, and treatment plans are silently discarded.** Session Prep, Client Progress, Couple View, dashboard tiles, and alerts all read keys the backend doesn't send; `PUT .../treatment-plan` echoes success without persisting anything. (Therapist §CRIT-3, §HIGH-3)
8. **The exact bug behind the Apple App Store rejection is still in the tree.** `@capacitor-community/apple-sign-in` was removed from `package.json` while `Login.js:359` still imports it — verified by running a production build: tapping "Sign in with Apple" surfaces a raw `Cannot find module` error. The entitlements file is gitignored and Signup still has no Apple button, so the Guideline 2.1/4.8 rejection will recur on resubmission. Also: text entry in Daily Check-in and Real Talk loses keyboard focus on every keystroke (inline component definitions), and enabling push notifications self-destructs on next app open. (Mobile §C1–C5)

### Medical billing: what actually exists

- **In this repo: nothing.** Zero CPT/ICD/insurance/claims/superbill/NPI code anywhere in backend, frontend, or schema (verified by repo-wide search).
- The "Medical Billing" button on the therapist dashboard (`frontend/src/pages/Therapist/TherapistDashboard.js:98-153`) is an SSO redirect to a **separate application** at `billing.loverescue.app` (`backend/src/routes/billing-sso.js`). That app's code is not in this repository, so it could not be audited here. **To audit the actual medical-billing engine, that repo must be added to a session.**
- The SSO handoff itself has fixable weaknesses: token travels in a URL query string (lands in logs/history), no `aud` claim, no single-use `jti` — replayable for its 5-minute window. (Billing §H2)
- Groundwork that exists for future in-repo billing: therapist license fields (no NPI/EIN), a `Meeting` model (mediator-based, no charge/CPT linkage), and the consent/audit framework. Full superbill support would need patient insurance data, NPIs, ICD-10 (note: the app explicitly disclaims diagnosis), CPT + fee schedule, a billable-encounter model, superbill generation, and a BAA-eligible payment path (standard Stripe is not BAA-eligible).

---

## 1. Therapist portal audit

**Verdict:** a well-architected facade over a largely unwired core. The consent middleware and clinical engines are genuinely good; the wiring is not done. Nowhere near "run your whole practice": no scheduling, no session notes, no intake, no in-app client billing, no reminders, no messaging (despite the FULL permission tier promising it).

### Workflow trace

| Stage | Status |
|---|---|
| Registration | Two parallel systems (admin invite-token + API key at `therapist.js:50-172`; allowlist-gated JWT onboarding at `therapist.js:1451-1510`). Frontend uses only the latter. |
| Discovering onboarding | **Dead end** — `/therapist/onboarding` route exists (`App.js:227`) but nothing links to it; allowlist rejection only surfaces at the final step. |
| Credential verification | **None.** UI claims "We verify credentials" (`TherapistOnboarding.js:170`); license fields stored unvalidated; no admin review tooling exists. |
| Inviting clients | Works (JWT invite links, client accept with permission choice, stash-and-resume for logged-out visitors). But invite status list is a stub returning `[]` (`therapist.js:1565-1567`), decline does nothing (`:1717-1725`), no email delivery (mailto only), no accepted-notification. |
| Consent | Client consents explicitly at accept — good design — but revocation is impossible (CRIT-1) and the chosen level is silently clamped to BASIC (HIGH-2). |
| Couple view / session prep / progress | Backend real; frontend pages render empty (HIGH-3). |
| Treatment planning | Potemkin feature — silently discarded (CRIT-3). |
| Alerts | Engine never fires (CRIT-2). |

### CRITICAL

- **CRIT-1 — No client visibility or revocation of therapist access.** `GET /client/therapists` hardcoded empty (`backend/src/routes/client.js:21-28`); Settings revoke UI calls `PATCH/DELETE /client/therapists/:id...` which **don't exist** (`MyTherapistSection.js:108,126`); nothing ever sets `consentStatus: 'REVOKED'`; the one client revocation path (`POST /api/therapist/consent`, `therapist.js:619-624`) only touches the *legacy* `TherapistAssignment` model, not the live `TherapistClient` model every endpoint checks.
- **CRIT-2 — Alert/crisis system never invoked.** `utils/therapistAlerts.js` and `utils/crisisPathway.js` are required by no route and no scheduler (only daily reminders are scheduled, `index.js:248-272`). Suicide/DV regex detection with 988/DV-hotline escalation (`crisisPathway.js:104-142`) is dormant; `logs.js`/`real-talk.js` have no crisis hooks. Even if wired, alerts route via the legacy assignment model (`therapistAlerts.js:503-533`) and all push/email/SMS senders are stubs (`:625-645`).
- **CRIT-3 — Treatment plans silently discarded.** `PUT /clients/:id/treatment-plan` echoes the body without persisting ("columns not yet in schema", `therapist.js:1765-1775`); `GET` always returns `{plan: null}`. The frontend shows "Treatment plan saved!" (`TreatmentPlanner.js:101`). Module library endpoints return `[]` while a complete 1,398-line `utils/treatmentPlan.js` engine sits unimported.
- **CRIT-4 — Consent not enforced on detail endpoints.** `GET /couples/:id` (`therapist.js:1790-1793`), `GET /couples/:id/comparison` (`:1811-1814`), `GET /clients/:id` (`:1572-1587`) check only link *existence*, not `consentStatus: 'GRANTED'`. A therapist can create a PENDING link to any user by email (`:818-843`) and read names, emails, and assessment scores pre-consent (or post-revocation, once revocation exists).
- **CRIT-5 — One partner's consent exposes the other's data.** `requireCoupleAccess` grants on *at least one* granted link (`therapistAccess.js:196-226`); `GET /couples/:id/dynamics` then returns both partners' assessment histories and mood data (`therapist.js:1096-1173`); same in the integration API and `POST /tasks/add`.

### HIGH

- **HIGH-1 — Therapist can pair any two clients into a "couple"** without either confirming (`therapist.js:1845-1883`), possibly creating a second `Relationship` for a user and corrupting `findFirst` queries app-wide.
- **HIGH-2 — Client's permission-level choice silently ignored.** Invite ceiling defaults to BASIC (`therapist.js:1621`), frontend never sends a level, accept clamps to ceiling (`:1674-1680`) — a client selecting "Full Access" gets BASIC; the consent record ≠ what the client believes they agreed to.
- **HIGH-3 — Seven frontend/backend response-shape mismatches** leave Session Prep, Client Progress, Couple View, three of four dashboard tiles, alert cards, and the alert type filter (500s on lowercase enum, `AlertsPage.js:11` vs `schema.prisma:92-97`) empty or broken. Backend data is real in each case.
- **HIGH-4 — Legacy invite-code accept lets any authenticated user hijack a pending invite** — the link's `clientId` is overwritten with whoever presents the code (`therapist.js:747-771`).

### MEDIUM / LOW (abridged)

- Fake settings surfaces: notification prefs hardcoded + PATCH no-op (`therapist.js:1541-1547`); therapist audit-log UI gets `{logs: []}` despite real `AccessLog` rows; export returns "coming soon" JSON downloaded as a fake PDF.
- Global `auditLogger` records `req.user?.id` only — null for API-key therapist requests (`auditLogger.js:19`); several read endpoints write no `AccessLog` at all.
- API-key auth is O(n) bcrypt across all therapists per request (`auth.js:216-226`); `limit` ignored on alerts; session-prep persists a new report row per page view; therapist `approach` from onboarding is accepted then dropped.

### Missing for "run an entire therapy practice"

1. Scheduling/appointments (calendar.js is consumer Google-sync; meetings.js books *Mediators*, not therapists — no availability, booking, reminders, or no-show handling)
2. Session notes (no SOAP/progress-note model at all)
3. Client intake forms
4. In-app client billing (only the external SSO handoff exists)
5. Caseload management (no discharge/archive/unlink, search, or capacity view)
6. Therapist notifications (email/push/SMS all stubs; digest never scheduled)
7. Messaging (promised by the FULL tier; doesn't exist)
8. Reporting (backend `/outcomes` aggregation exists at `therapist.js:1331-1408` but no frontend calls it)
9. Telehealth/video sessions
10. Practice/organization layer (multi-therapist, supervision, BAA e-signature)

### Strengths

Consent middleware architecture (tiered BASIC/STANDARD/FULL, deny-by-default, grant/deny audit logging); the session-prep generator is a real, clinically literate, data-driven standout; registration hardening (invite tokens, rate limits, hashed API keys); every therapist query checked honors `therapistVisible` and never exposes journal text; 184 unit tests over the clinical engines.

---

## 2. Billing audit

### How billing works today (plain English)

**There is no functioning billing — the app was deliberately converted to fully free.**

1. Checkout, cancel, portal, and upgrade endpoints all return HTTP 410 `APP_IS_FREE` (`payments.js:13-15,181-191`; `upgrade.js:19-35`). The historical flow was hosted Stripe Checkout with server-side price IDs (visible only in skipped tests).
2. Entitlement is unconditional: `authenticate` overwrites every user to premium (`middleware/auth.js:46`); `requireSubscription`/`requirePremium` are no-ops still wired on ~15 routes.
3. Status endpoints hardcode premium (`payments.js:164-171`, `subscriptions.js:18-31`, `auth.js:857-859`).
4. **The Stripe webhook is the one live piece** — signature-verified, raw-body handling correct (`payments.js:21-123`, `index.js:143-149,177-181`) — and it still mutates `users.subscription_status`.
5. Apple IAP fully disabled server- and client-side; verify endpoints return fabricated success; App Store server notifications were never handled.
6. No `Payment`/`Subscription`/`Invoice`/`WebhookEvent` models — subscription state lives on `User` (`schema.prisma:142-149`).
7. `billing-sso.js` is a therapist-only SSO handoff to the separate `billing.loverescue.app` app (not in this repo).
8. Refunds, dunning, proration, trials: none. `trialEndsAt` is never written anywhere; every user is a perpetual "trial" in the DB while the API says premium.

### Findings

- **C1 (CRITICAL) — Marketing/product contradiction.** Landing sells "$49/month," "$249/month," "Start Free — 14 Days, No Card," "See Progress or Pay Nothing Guarantee," "cancel anytime" (`landing/index.html:1562-1613,1692`; React landing repeats trial claims) while checkout is 410 and Settings says "no subscriptions, paywalls, or in-app purchases." Zero revenue capability; the trial/guarantee/cancel claims are false in both directions.
- **H1 (HIGH) — The live webhook has latent entitlement bugs.** Every non-`active` Stripe status (incl. `trialing`, `past_due`) maps to `expired` (`payments.js:67-75`); no event-ID idempotency or out-of-order handling; user resolution depends on `customer.metadata.userId` that only deleted checkout code ever set. Masked today by the premium override; will corrupt state the moment billing returns.
- **H2 (HIGH) — Billing SSO token in URL query string** (`billing-sso.js:41`), no `aud`, no `jti`/single-use — replayable within its 5-minute window from browser history/proxy logs. (Role gate and fail-closed secret handling are good.)
- **M1** Stripe env vars not validated at startup — missing webhook secret means silent 400s on every real webhook.
- **M2** Trial logic is dead code with impossible admin query (`admin.js:590-598` requires `gte: now` AND `lte: sevenDaysAgo` — always 0).
- **M3** Webhook sits behind the general per-IP rate limiter (`index.js:125`) — a Stripe retry burst can 429 into Stripe's failure cycle.
- **M4** Legacy IAP verify endpoints return fabricated `premium` success — a ready-made entitlement bypass if billing returns and these are forgotten (`iap.js:20-30`, `subscriptions.js:37-44`).
- **M5** Couple/shared subscription was never modeled — entitlement is per-`User`; nothing propagates to a partner. Must be designed before re-enabling billing.
- **M6** Admin can write arbitrary `subscriptionStatus` strings straight to Prisma (`admin.js:367-380`) — operator-error 500s (properly admin-gated and audit-logged).
- **LOW:** hardcoded $9.99 MRR placeholder in admin (`admin.js:631-632`) vs $49/$249 advertised; entire payments test suite skipped — the one live billing surface has zero active coverage; stale `appleReceiptData` column; stale Stripe CSP allowance; dead `?payment=cancelled` handler.

### Strengths

Webhook signature verification and raw-body plumbing are correct (spoofing not possible without the secret); no client-controlled pricing surface exists anywhere; all billing endpoints require auth; admin billing surfaces are behind `requirePlatformAdmin` with audit logging.

### Medical-billing readiness gap analysis

Confirmed: **zero** CPT/ICD/insurance/claims/superbill/NPI code in this repo. Existing groundwork: therapist license fields (`schema.prisma:185-193` — no NPI, taxonomy, EIN, or practice address), a mediator-based `Meeting` model with no charge linkage, HIPAA scaffolding (audit/access/consent logs), and the SSO handoff indicating billing intentionally lives in a separate system. Building superbill support here would require: patient demographics + insurance policy data; rendering/billing NPIs + taxonomy; ICD-10 diagnoses (the app currently *disclaims* diagnosis — `coupleDynamics.js:2168`); CPT codes + fee schedule (e.g., 90847, with the payer caveat that couples counseling is generally reimbursable only when one partner has a diagnosed condition); place-of-service/telehealth modifiers; a billable-encounter model; superbill PDF generation; optionally 837P claims/ERA; and a BAA-eligible payment path — **standard Stripe is not BAA-eligible; PHI must never enter Stripe metadata.**

**→ Action: the actual medical-billing application at `billing.loverescue.app` is a separate repo and must be audited separately.**

---

## 3. Security, auth & HIPAA audit

### CRITICAL

- **C-1 — Hardcoded, self-healing platform admins.** `PLATFORM_ADMIN_EMAILS = ['josh@gullstack.com','bryce@gullstack.com']` with `bootstrapPlatformAdmins()` creating/re-promoting them on every boot (`index.js:313-363`). Contradicts SECURITY-FIXES-BRIEF.md item #2 (fixed in `middleware/auth.js`, re-introduced here). Admin routes expose every user's email, relationship, assessments, and daily logs (`admin.js:240-359,872-1013`). An operator cannot revoke these admins; a compromised mailbox = full-PHI access.
- **C-2 — No session revocation.** Stateless 30-day HS256 access tokens (`auth.js:29,143-148`); no logout endpoint, blocklist, or token-version/`passwordChangedAt` check. Password change (`auth.js:921-958`) and reset (`:1201-1267`) leave all previously issued tokens valid for up to 30 days. (Refresh tokens are correctly hashed + rotated; the access token is the exposure.)

### HIGH

- **H-1 — Integration partner can act for ANY therapist.** `POST /api/integration/auth` accepts arbitrary `therapistId` with no partner↔therapist binding (`integration.js:38-119`; `IntegrationPartner` has no therapist relation, `schema.prisma:791-810`). One leaked partner secret = PHI across the entire therapist base.
- **H-2 — Consent boundary broken on therapist detail reads** (same as Therapist CRIT-4; independently confirmed).
- **H-3 — Audit-log coverage gaps (HIPAA §164.312(b)).** Global `auditLogger` keys off `req.user?.id` — null on therapist-token requests; `GET /clients/:id`, `/clients/:id/assessments`, `/couples/:id`, `/couples/:id/comparison` write no `AccessLog`; integration reads use fire-and-forget logging only. Therapist PHI reads can occur with no durable record.
- **H-4 — Brute-force lockout degrades to per-instance memory** when `REDIS_URL` is unset (`auth.js:37-131`); the general limiter was loosened to 1000/15min (`index.js:120`).

### MEDIUM

- **M-1 — HIPAA right-of-access export is broken.** `GET /api/auth/export-data` includes non-existent `goals`/`strategies` relations (`auth.js:1044-1075` vs `schema.prisma:154-171`) → Prisma validation error → 500. Also omits Real Talk entries even if fixed.
- **M-2 — Encryption-at-rest off by default.** Content encryption requires `CONTENT_ENCRYPTION==='true'` + valid `ENCRYPTION_KEY` (`lib/contentEncryption.js:67-70`); Google Calendar OAuth tokens fall back to plaintext (`utils/encryption.js:20-22`). Sensitive free-text is plaintext at rest absent explicit prod config.
- **M-3 — Weak password-reset codes.** 6-digit numeric, looked up globally by value not scoped to email (`auth.js:1152-1221`), no per-code attempt lockout — meaningfully brute-forceable.
- **M-4 — Account enumeration** via biometric login options endpoint (distinct error, not rate-limited — `auth.js:505-515`), inconsistent with the hardened password path.
- **M-5 — OAuth authorization codes written into audit logs** (`auditLogger.js:33-37` captures `req.query`; `/api/calendar/callback` carries the Google `code`).
- **M-6 — CSP allows `'unsafe-inline'` scripts** (`index.js:94`), weakening the XSS protection the fixes brief claims.

### LOW

Prisma schema errors leaked in production error responses; `uncaughtException` keeps serving before shutdown; hardcoded (public) Google iOS client-ID fallback; integration rate limiter is per-process memory.

### Verified strengths

JWT secret fail-fast + algorithm pinned to HS256; bcrypt cost 12; refresh tokens SHA-256-hashed, rotated, single-use; therapist API keys and integration secrets bcrypt-hashed (no plaintext legacy path); enumeration-safe password login; proper Google/Apple token verification (audience allowlists, JWKS); therapist elevation gated by env allowlist + invite tokens; no raw SQL anywhere; no live secrets committed (verified repo-wide); admin routes uniformly gated; integration IP allowlist fails closed; calendar OAuth uses single-use CSRF state.

### SECURITY-FIXES-BRIEF.md cross-check

| Claim | Status |
|---|---|
| #1 JWT algorithm pinned | ✅ Fixed |
| #2 Hardcoded admin emails removed | ⚠️ Removed from `auth.js`, **re-hardcoded + auto-provisioned in `index.js:313-363`** |
| #3 API-key timing/plaintext | ✅ Fixed |
| #4 JWT_SECRET startup validation | ✅ Fixed |
| #5 Submit rate limiting | ✅ Present |
| #10 Google client ID env-only | ⚠️ Backend keeps a hardcoded iOS client-ID fallback (public ID; low risk) |

---

## 4. Client mobile experience audit

**Verdict:** the React app itself has genuinely good mobile fundamentals (safe areas, touch targets, reduced motion, skeletons, token-refresh queue), but the Capacitor/iOS integration layer is broken in ways that guarantee another App Store rejection, and two core daily flows are effectively unusable for text entry. One finding was verified by running an actual production build.

### CRITICAL

- **C1 — "Sign in with Apple" throws `Cannot find module`.** `Login.js:359` dynamically imports `@capacitor-community/apple-sign-in`, which appears **zero times** in `frontend/package.json`/`package-lock.json`. A production build compiles with a "Module not found" warning and webpack emits a runtime stub; tapping the Apple button surfaces the raw error via `setFormError` (`Login.js:374-377`). FIX-PLAN-APPLE-REJECTION.md claimed the plugin was in package.json — no longer true. The Guideline 2.1 rejection will recur. Fix: reinstall the plugin + `cap sync`; treat module-not-found as a build failure.
- **C2 — Apple-rejection Fix Plan items 1 & 2 never landed.** No `*.entitlements` file exists (`frontend/ios/App/App/App.entitlements` is gitignored; the Xcode project isn't committed) so the Sign In with Apple capability can't survive a fresh checkout. `Signup.js:17,272` still uses the web `<GoogleLogin>` with no Apple button; on native, the tree renders **without** `GoogleOAuthProvider` (`index.js:31-37`), so with `REACT_APP_GOOGLE_CLIENT_ID` set the Signup page full-screens the ErrorBoundary — matching Apple's rejection notes. (Fix 3, pricing copy on Signup, did land.)
- **C3 — Keyboard focus lost on every keystroke in Daily Check-in and Real Talk.** Card/step components are defined *inside* the parent component body (`DailyLog.js:531,577`; `RealTalk.js:319,348,392`) and rendered as `<CurrentCardComponent />` — every keystroke recreates the component type, React remounts the subtree, the input loses focus, and the iOS keyboard dismisses. Journaling is effectively unusable. Fix: hoist the components to module scope.
- **C4 — Push notifications self-destruct; Settings toggle hangs forever.** `index.js:43` unregisters whatever service worker owns scope `/` on every startup — including the `/push-sw.js` that push subscription registered (`usePushNotifications.js:113-116`), silently killing reminders on next app open. `NotificationSettings.js:137` awaits `navigator.serviceWorker.ready` without ever registering a SW, so the "Enable notifications" switch hangs in `saving` forever.
- **C5 — Global swipe navigation fires inside multi-step flows.** `useSwipeNavigation.js:6,12` includes `/daily` and `/real-talk` in tab routes with no exclusion; a horizontal swipe on a check-in card both advances the card and navigates to another tab, destroying in-progress answers.

### HIGH

- **H1 — `initCapacitor()` is never called** (`utils/capacitor-init.js:7`, zero call sites): keyboard-resize handling, deep-link routing (`appUrlOpen` is also an empty TODO), and app-lifecycle handlers are all dead code. Partner invites (`/join/:code`), therapist invites, and reset-password links cannot route inside the native app; Info.plist has no associated domains/URL types.
- **H2 — Native Google Sign-In return path missing from the committed project.** No `CFBundleURLTypes` in the only committed Info.plist; the required GoogleSignIn patch (`patches/`) has no automated application (no patch-package/postinstall), so every `cap sync` overwrites it.
- **H3 — Face ID login can't work in the iOS app it's marketed for.** The feature is WebAuthn (`AuthContext.js:32-44`), unavailable in WKWebView; the Security section always shows "not available on this device" natively while Login advertises "Use Face ID or Touch ID" (`Login.js:188-190`). Native path needs `capacitor-native-biometric`/Keychain unlock.
- **H4 — In-app Landing page still sells $9.99/$19.99 subscriptions and a 14-day trial** (`Landing.js:301,1162,1256,1389`) inside an app with no purchase path — misleading copy and a fresh Guideline 2.1/3.1.1 review risk, reachable natively via the catch-all → `/welcome`.
- **H5 — Unauthenticated `/` lands on Login, not the acquisition funnel** (`App.js:76-78,197-205`); on native first launch users see a login form, and the QuickStart teaser is unreachable except via (broken) deep links.
- **H6 — Google Calendar OAuth navigates the WKWebView to accounts.google.com** (`Settings.js:164`, `Strategies.js:109`) — Google blocks embedded webviews (`403 disallowed_useragent`), and even success strands the user outside the bundled app. Same pattern on the therapist billing redirect (`TherapistDashboard.js:102`). Use `@capacitor/browser`.
- **H7 — Offline dashboard renders silently empty; the Retry banner is unreachable.** All 11 parallel calls have individual catches (`Dashboard.js:117-127`), so the surrounding try/catch for network failure can never fire.
- **H8 — No request timeouts anywhere** (`services/api.js:21-26`, axios default = infinite) — a stalled mobile connection hangs every spinner forever.
- **H9 — Native push is uncontrollable and mis-prompted.** The Settings push card is web-only (UA sniffing, `NotificationSettings.js:68-71`) and shows "not supported" or Safari instructions inside the native app, while native APNs registration happens silently at login (`AuthContext.js:95-107`) — permission requested with zero context, and no way to see or disable it.

### MEDIUM (abridged)

Notification settings bypass the shared API client and 401 when "Remember me" is unchecked (`NotificationSettings.js:65`); dashboard hardcodes 13 assessments vs 10 real ones (`Dashboard.js:219`); partner auto-join executes on link-open with no consent tap (`JoinRelationship.js:23-28`); therapist-invite accept dead-ends with no CTA (`ClientLinking.js:354-366`); blocking disclaimer modal fires pre-auth on the marketing pages (`App.js:130`); `backgroundAttachment: 'fixed'` jank in the main layout (`Layout.js:401`); duplicate push listeners per login + push-tap navigation is an empty TODO; two chart libraries shipped (chart.js + recharts); stale `lr_user_state` localStorage briefly leaks the previous user's nav state; `capacitor.config.ts` ships `cleartext: true` in production.

### LOW (abridged)

Legacy pink splash/theme-color vs the new slate brand; contradictory hardcoded Google client IDs; full-bleed headers clipped ~12px on phones; `service-worker.js` is 100% dead code (never registered); 16 dead `href="#"` links on the static landing.

### Genuinely good

Safe-area handling is correct and thorough (viewport-fit, StatusBar overlay, env() insets across AppBar/drawer/bottom nav); 52-56px touch targets with aria-labels; `100dvh` fallback; reduced-motion respected globally; ErrorBoundary with stale-chunk auto-reload; skeleton loading + consistent EmptyStates; a correctly implemented single-flight token-refresh queue; the QuickStart → signup handoff and therapist-invite stash/resume flows; the Real Talk DV-hotline safety escalation.

### QA cross-check

`QA-REPORT.md` and `QA-GROK-AUDIT-2026-02-09.md` are almost entirely backend-focused; none of C1–C5/H1–H9 appears in either. The iOS/Capacitor layer has effectively never been QA'd in writing, and FIX-PLAN-APPLE-REJECTION.md's verification checklist is unchecked and unmet.

---

## 5. Prioritized remediation roadmap

### P0 — Safety & compliance (do before anything else)
1. Build client-side therapist-link visibility + revocation (`GET/PATCH/DELETE /client/therapists*`), flip `consentStatus: 'REVOKED'`, and add `consentStatus: 'GRANTED'` to every therapist read (`therapist.js:1572,1755,1767,1791,1812`).
2. Wire `crisisPathway.detectCrisisLevel` into journal/Real-Talk writes; schedule `generateRiskAlerts`/`generateMilestoneAlerts`; point `_findLinkedTherapists` at `TherapistClient`; implement at least one real notification channel.
3. Remove the hardcoded admin bootstrap (env-driven allowlist, no auto-promotion); add token revocation (token-version claim checked in `authenticate`, bumped on password change/logout).
4. Bind integration partners to specific therapists; audit-log every therapist PHI read.
5. Fix the broken HIPAA data export; turn on content encryption in production.

### P0.5 — Before the next TestFlight build
6. Reinstall `@capacitor-community/apple-sign-in`, commit the entitlements + Xcode project, add the Apple button to Signup (Mobile C1/C2).
7. Hoist the DailyLog/RealTalk inline components to fix keystroke focus loss (Mobile C3); exclude `/daily` and `/real-talk` from global swipe navigation (Mobile C5).
8. Fix the service-worker unregister/push lifecycle and the hanging Settings toggle (Mobile C4); call `initCapacitor()` and implement deep-link routing (Mobile H1).
9. Strip the $9.99/$19.99 subscription pricing from the in-app Landing page (Mobile H4).

### P1 — Make the therapist product real
6. Persist treatment plans (add the schema model); expose the module library; fix the 7 API shape mismatches (shared DTOs + a contract test per endpoint).
7. Require both-partner consent (or partner-level scoping) for couple data; fix the BASIC-ceiling invite bug; implement invite status list, decline, and accepted-notifications.
8. Decide the business model: either re-enable billing (design per-couple entitlement, webhook idempotency, correct status mapping, trial semantics first) or fix the landing page's $49/$249/trial/guarantee claims immediately.

### P2 — Practice automation buildout
9. Therapist scheduling (availability, booking, reminders, no-shows) — extend or replace the mediator-only `Meeting` model.
10. Session notes (SOAP), client intake forms, caseload management (discharge/archive/search), outcomes reporting frontend.
11. Audit the external `billing.loverescue.app` app (separate repo); harden the SSO handoff (POST/fragment transport, `aud`, single-use `jti`, shorter expiry).
12. Medical-billing groundwork if superbills are in scope: NPI/taxonomy fields, billable-encounter model, superbill generation, BAA-eligible payment path.
