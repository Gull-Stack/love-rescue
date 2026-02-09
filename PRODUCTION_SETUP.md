# Production Setup Checklist

## 1. Stripe Configuration
The app uses Stripe for subscriptions with three tiers: standard, annual, premium.

**Required env vars (backend):**
- `STRIPE_SECRET_KEY` — Use `sk_live_...` (NOT `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` — From Stripe dashboard → Webhooks → Signing secret
- `STRIPE_PRICE_ID` — Standard monthly price ID (create in Stripe Products)
- `STRIPE_ANNUAL_PRICE_ID` — Annual subscription price ID
- `STRIPE_PREMIUM_PRICE_ID` — Premium tier price ID

**Required env vars (frontend):**
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` — Use `pk_live_...` (NOT `pk_test_...`)

**Stripe Webhook endpoint:** `https://api.loverescue.app/api/payments/webhook`
Events to subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

## 2. Google OAuth Configuration
The app uses popup-based Google Sign-In via `@react-oauth/google` (no server-side redirect).

**In Google Cloud Console (https://console.cloud.google.com/apis/credentials):**
1. Create OAuth 2.0 Client ID (Web application type)
2. Add **Authorized JavaScript Origins**:
   - `https://loverescue.app`
   - `https://www.loverescue.app`
   - `http://localhost:3000` (for development)
3. Set `GOOGLE_CLIENT_ID` in both backend and frontend env
4. Set `REACT_APP_GOOGLE_CLIENT_ID` in frontend env

**Note:** There is NO redirect URI needed for the login flow (it uses popup mode). The `GOOGLE_REDIRECT_URI` env var is only for Google Calendar OAuth, not login.

## 3. Encryption (HIPAA)
- `ENCRYPTION_KEY` — Must be a 64-character hex string (32 bytes). Generate with: `openssl rand -hex 32`
- Used for AES-256-GCM encryption of Google Calendar tokens
- Journal entries and assessment data are NOT encrypted at rest in the database — consider PostgreSQL TDE or application-level encryption for full HIPAA compliance

## 4. Domain & CORS
- `FRONTEND_URL` — `https://loverescue.app`
- `ALLOWED_ORIGINS` — `https://loverescue.app,https://www.loverescue.app`
- `WEBAUTHN_RP_ID` — `loverescue.app`
- `WEBAUTHN_ORIGIN` — `https://loverescue.app`

## 5. HIPAA Compliance Gaps
Current state:
- ✅ AES-256-GCM encryption for calendar tokens
- ✅ Account deletion with cascade (user data purged)
- ✅ Audit logging middleware
- ⚠️ **Journal entries & assessment scores stored unencrypted** in PostgreSQL
- ⚠️ **No automated data retention policy** — old logs are kept indefinitely
- ⚠️ **No BAA with hosting provider** — needed for HIPAA if storing PHI

**Recommendations:**
1. Enable PostgreSQL Transparent Data Encryption (TDE) or use pgcrypto for column-level encryption on `journalEntry`, `assessment.score`, and `dailyLog` fields
2. Add a cron job to purge data older than a configurable retention period (e.g., 7 years for health data)
3. Sign a BAA with your hosting provider (Vercel, Railway, etc.)
4. Add data export endpoint for HIPAA right-of-access requests
