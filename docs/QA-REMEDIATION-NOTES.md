# QA remediation notes — corrections to the Phase 0–4 handoff

Date: 2026-07-27. Independent QA (Grok) reviewed branch `claude/love-rescue-couple-61mgyn` @ `63169e5` and returned a FAIL. This document retracts the prior handoff's over-claims, states what was actually true at `63169e5`, and records what the remediation commits changed. No mythology: the earlier claims below were **false when made**.

## Retractions

1. **"The fake 'send love' nudge now really sends" — FALSE at 63169e5.**
   The nudge endpoint wrote to `prisma.notification`, a model that did not exist in `schema.prisma`. Every write threw, every error was swallowed by `.catch(() => {})`, the response was unconditionally `success:true`, no push was ever attempted, and the rate limit failed open when its lookup threw. The client made a network call; the product still lied.
   *Remediated:* real `Notification` model + migration; awaited durable write; fail-closed rate limit; push attempted only after the DB write; honest copy ("Reminder saved…"). Regression-tested.

2. **"In-app Real Talk delivery" — FALSE at 63169e5.**
   Same dead-model + swallowed-error pattern: `POST /real-talk/:id/share` could return "Delivered." with zero partner-visible effect.
   *Remediated:* durable write awaited before any success response; push best-effort after; `pushed` reported honestly. Regression-tested.

3. **"Quick-logs no longer corrupt the ratio metric" — MISLEADING at 63169e5.**
   Phase 0 fixed the *field names* (the old silent 0/0 bug) but then **invented** counts from the mood tap (mood ≥ 5 → 3/0, else 1/2) and wrote them into ratio-bearing columns consumed by reports, weekly summary, and progress rings. Synthetic Gottman inputs are not integrity.
   *Remediated:* quick logs are mood-only (`quickLogOnly` column; counts 0, ratio null; full check-ins upgrade the day); every ratio aggregation excludes quick-only rows — including the recommendation engine, which was averaging `ratio || 0` over all rows. Regression-tested front and back.

4. **"Fabricated stats/testimonials removed from the landing page" — FALSE at 63169e5.**
   Four invented testimonials (fake names/locations/quotes/ratings) and unverifiable outcome stats ("94% of couples…", "10K+ couples", "5:1 average achieved") were still shipping. The Phase 0 commit narrowed other claims; the handoff overstated it.
   *Remediated:* testimonials removed; stats bar reduced to verifiable product facts.

5. **"Live check: `GET https://loverescue.app/api/health`" — WRONG URL.**
   The backend health route is `GET /health` on the Railway domain only; `/api/health` 404s everywhere. Verified 2026-07-27.

6. **Handoff attribution error:** the nudge endpoint lives in `routes/partner-activity.js`, not `routes/auth.js` (auth.js got partner *presence*). Minor, but the handoff said otherwise.

## Additional defects found and fixed during remediation (not in the original handoff at all)

- `partner-activity.js` `getStreak` queried `prisma.streak` — another non-existent model — so the partner-status streak silently read 0 forever. Now computed from real `DailyLog` dates.
- "Logged today" in `lib/journey.js`, `/auth/me` partner presence, and partner-activity's status/matchup endpoints filtered on `createdAt` instead of the domain `date` column (the check-in upsert key), so next-best-action and partner presence could disagree with the actual calendar day. All "today" checks now use the shared local-day policy in `lib/dates.js`.

## What was true and stands

- The Phase 0–4 UX work (nav spine, frozen tabs, consent-aware join page, tone pass, error honesty, destructive confirms, dead-code deletion, dunning banner, therapist nav, AdminRoute) is real and diff-verifiable.
- Suites were green at `63169e5` — but green suites that never exercised the new paths were presented with more confidence than they earned. The remediation adds tests that fail if any of the above bugs return.
- The invalid production `STRIPE_SECRET_KEY` remains an owner-only blocker (see `RELEASE-PHASE-REMEDIATION.md` §3) — unchanged, and never claimed fixed.
