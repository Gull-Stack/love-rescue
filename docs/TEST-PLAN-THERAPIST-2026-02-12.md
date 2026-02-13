# Test Plan — LoveRescue Therapist Edition

**Date:** 2026-02-12  
**Author:** Test Engineering (subagent)  
**Framework:** Jest 29  
**Location:** `backend/src/__tests__/therapist/`

---

## Overview

Comprehensive test suite covering the Therapist Edition features: utility engines (pure logic), alert system (DB-dependent), middleware (auth + consent), and integration API. Tests use mocked Prisma client for DB isolation.

## Test Files

| # | File | Module Under Test | Tests | Focus |
|---|------|-------------------|-------|-------|
| 1 | `coupleDynamics.test.js` | `utils/coupleDynamics.js` | ~20 | `generateCoupleProfile` with anxious-avoidant, secure-secure, fearful-avoidant combos; love language mismatch; conflict interactions; `generateCrossAssessmentInsights` with full, partial, null data |
| 2 | `crisisPathway.test.js` | `utils/crisisPathway.js` | ~30 | `detectCrisisLevel` — affair, separation, flooding, benign, self-harm (L3 auto-escalation), multi-type, intensity amplifiers, edge cases (null/empty/non-string); `generateCrisisResponse` — all 5 crisis types × 3 levels, personalization, anti-weaponization boundaries |
| 3 | `treatmentPlan.test.js` | `utils/treatmentPlan.js` | ~25 | `generateTreatmentPlanOptions` — EFT, Gottman, CBT, integrative; scoring; crisis modules; `createTreatmentPlan` — valid/invalid IDs, pace multiplier, skip overrides, difficulty progression; `getTreatmentPlanProgress` — day 0, midway, milestones, score changes |
| 4 | `therapistAlerts.test.js` | `utils/therapistAlerts.js` | ~20 | `triggerTherapistAlert` — linked therapists, no therapists, severity→channels routing, validation, graceful DB failure; `generateRiskAlerts` — score drops, disengagement; `generateMilestoneAlerts` — improvements, first secure score; `handleCrisisDetection` — level→severity mapping; `getAlertDigest` — grouping, unacknowledged filtering |
| 5 | `maintenanceRituals.test.js` | `utils/maintenanceRituals.js` | ~20 | `generateMaintenanceRituals` — all 4 attachment styles, love language + conflict adaptations, edge cases; `generateMaintenancePlan` — weeks 1/6/12 difficulty progression, clamping |
| 6 | `sessionPrep.test.js` | `utils/sessionPrep.js` | ~15 | `generateSessionPrepReport` with mock activity data, no activity, missing client; `EXPERT_INSIGHTS` template functions (ratio, mood, engagement, crisis, attachment) |
| 7 | `integration.test.js` | `middleware/integrationAuth.js` + `middleware/therapistAccess.js` | ~25 | Auth: valid/invalid/expired tokens, missing header; Rate limiting: within/exceeding limit; IP allowlist: pass/reject/fail-closed; Audit logging: success + failure; `hasPermission` + `filterByPermission` — BASIC/STANDARD/FULL levels, nested object filtering |
| 8 | `pursueWithdrawDetector.test.js` | `utils/pursueWithdrawDetector.js` | ~12 | Balanced engagement, one-sided engagement, no data, single-user, inactive relationship, minimum window enforcement, clinical notes |

**Shared fixtures:** `testFixtures.js` — mock users, assessments (all attachment styles, love languages, conflict styles, Gottman scores), daily log generators, Prisma mock factory.

## Total: ~167 test cases across 8 files

## Test Strategy

- **Pure functions** (coupleDynamics, crisisPathway, treatmentPlan, maintenanceRituals): tested directly, no mocks needed
- **DB-dependent functions** (therapistAlerts, sessionPrep, pursueWithdrawDetector): Prisma client mocked via `createMockPrisma()` factory
- **Middleware** (integrationAuth, therapistAccess): Express req/res/next mocked, JWT mocked
- **Edge cases**: null, undefined, empty string, empty array, invalid types, boundary values
- **Error handling**: DB failures → graceful degradation (no throw), invalid input → proper error messages

## Running

```bash
cd backend
npm test                          # Run all
npm test -- --testPathPattern=therapist  # Run this suite only
npm run test:coverage             # With coverage
```

## Coverage Goals

| Area | Target |
|------|--------|
| Crisis detection keywords | High — safety-critical |
| Alert severity routing | High — notification correctness |
| Permission filtering | High — HIPAA compliance |
| Couple profile generation | Medium — complex branching |
| Treatment plan builder | Medium — module scoring |
| Maintenance rituals | Medium — adaptation layers |

## Not Covered (Out of Scope)

- E2E route tests (would need supertest + full Express app setup)
- Actual notification delivery (push/email/SMS stubs only)
- Prisma schema validation
- Frontend integration
