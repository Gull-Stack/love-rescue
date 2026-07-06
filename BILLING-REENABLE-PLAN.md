# Billing Re-Enablement — Scope & Spec

Goal: turn consumer subscriptions back on, fully functional, and merge to `main`.
The app was deliberately set to free (checkout stubbed 410, all users force-premium).
This restores paid subscriptions with a **couple-aware entitlement model**, a **free
trial**, **web Stripe Checkout**, and **iOS Apple IAP**, and reverses the "free"
marketing.

## Architecture decisions (defaults — all config-driven, change without code)

- **Two tiers**, keyed to Stripe Price IDs from env (the webhook already reads these):
  - `premium` → `STRIPE_PREMIUM_PRICE_ID` (monthly). Default display: **$49/mo**.
  - `annual` → `STRIPE_ANNUAL_PRICE_ID` (yearly, ~2 months free). Default display: **$490/yr**.
  - Dollar amounts live in **Stripe**; the app fetches them via `stripe.prices.retrieve`
    with an env/display fallback. **Set your real prices in the Stripe dashboard.**
- **Free trial**: 14 days, set at signup (`trialEndsAt = now + 14d`, status `trial`).
- **Couple-aware entitlement** (the key rule): a user is entitled if
  `own status active (paid|premium)` **OR** `own trial not expired` **OR**
  `their partner in the active relationship is entitled`. One paid seat covers the couple.
  Resolved at read-time (no mirror-writes → no races).
- **Platform split (Apple compliance)**: web browser → **Stripe Checkout**; iOS native →
  **Apple IAP** (StoreKit). The same entitlement lands on the User either way
  (`subscriptionSource` STRIPE|APPLE).

## Backend contract (source of truth for the frontend)

- `GET /api/payments/plans` → `{ plans: [{ id:'premium'|'annual', name, interval,
  amount, currency, priceDisplay, priceId }], trialDays }`. Reads Stripe; falls back to env.
- `POST /api/payments/create-checkout` (auth) `{ tier }` → `{ url }` (Stripe Checkout
  session; metadata `{userId, tier}`; sets customer `metadata.userId`; success/cancel URLs;
  `subscription_data.trial_period_days` when the user still has trial left).
- `POST /api/payments/portal` (auth) → `{ url }` (Stripe billing portal).
- `POST /api/payments/cancel` (auth) → cancels at period end.
- `GET /api/payments/subscription` (auth) → real `{ status, isPremium, tier,
  currentPeriodEnd, cancelAtPeriodEnd, trialEndsAt, trialDaysRemaining, coveredByPartner }`.
- `GET /api/subscriptions/status` (auth) → real `{ status, source, isActive, isTrial,
  trialDaysLeft }`.
- `POST /api/subscriptions/verify-apple` & `POST /api/iap/verify` (auth) `{ receipt }` →
  **real** Apple receipt validation (prod endpoint, fall back to sandbox on 21007),
  sets entitlement + `subscriptionSource:'APPLE'`; supports restore.
- Webhook (already hardened) stays the entitlement writer for Stripe; unchanged contract.
- `requireSubscription`/`requirePremium` become **real gates** using the couple-aware
  resolver. Remove the force-premium override in `middleware/auth.js`.

## Work tracks (disjoint file ownership)

1. **Backend billing core** — `middleware/auth.js`, `routes/payments.js`,
   `routes/subscriptions.js`, `routes/iap.js`, `routes/upgrade.js`, `routes/auth.js`
   (signup trial only), `routes/admin.js` (real MRR), `prisma/schema.prisma` (+migration),
   backend tests.
2. **Frontend billing** — `pages/Subscribe/*`, `components/common/PremiumGate.js`,
   `utils/featureGating.js`, `utils/platform.js`, `services/iapService.js`,
   `services/api.js` (billing methods), `pages/Settings` (manage-subscription section),
   `App.js` (restore `/subscribe` route), `package.json` (IAP plugin), frontend tests.
3. **Marketing** — `landing/**`, `pages/Landing/Landing.js` (restore pricing to the
   two tiers, config-driven where feasible).

## Verification & manual steps

- Unit tests cover: entitlement resolution (self/trial/partner/expired), checkout session
  creation + metadata, gate enforcement, Apple receipt validation (mocked), webhook still green.
- **Requires live credentials / device (documented, not code-blockable here):** real Stripe
  keys + Price IDs + webhook secret; Apple App Store Connect products + a StoreKit plugin
  device test; setting the dollar amounts in Stripe.
