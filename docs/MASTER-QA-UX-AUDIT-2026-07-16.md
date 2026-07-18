# Love Rescue — Master QA / QC / Product Design Audit

**Date:** 2026-07-16  
**Auditor:** Boss QA/QC + Product Design (UX/UI)  
**Scope:** Client (couple) experience · Therapist clinical console · Medical billing (Super Medical Billing) · Cross-cutting brand, trust, a11y, shipping bar  
**Overall grade:** **B− (ship-with-conditions)**  
**Demo readiness:** Therapist clinical path **conditionally demoable**; Medical Billing **not first-class branded / incomplete nav**; Consumer path **strong first minutes**, weaker product truth vs marketing.

---

## 1. Executive verdict

Love Rescue has **real product depth** most relationship apps never reach: progressive assessments, personalized strategy language, dual-sided consent, session prep, couple dynamics, RCM bridge, clickwrap billing terms + BAA language.

It is **not yet “boss ship quality”** across all three surfaces. The gaps are not “missing polish.” They are **truth, trust, and first-run failure modes**.

### Ship / Block matrix

| Surface | Demo | Private beta | Public claim |
|--------|------|--------------|--------------|
| **Couple app** (free era) | ✅ Yes | ✅ Yes | ⚠️ Only if marketing matches product (assessments, free, course length) |
| **Therapist clinical** | ⚠️ Yes, with scripted clients | ⚠️ Yes after empty-state + session-prep harden | ❌ Not yet as “complete practice OS” |
| **Medical billing** | ⚠️ Behind SSO, known tenants only | ⚠️ With onboarding + real claims | ❌ Not as Love Rescue–branded RCM without nav/brand fix |

### Top 10 things I would not let past me

1. **Marketing vs product lie** — Landing still sells “4 assessments” / “14-week course” while app has **10+ assessments** and a **16-week journey**.  
2. **Demo revenue can look real** — Practice Health / Flight Deck falls back to **fabricated** `$` figures when billing is offline; provenance exists in code but can still mislead in a live demo.  
3. **Session Prep crash history** — Error boundary screenshot on Session Prep (“Something went wrong”) is a **demo-killer**; Chart.js self-registration was patched — re-verify end-to-end on every client.  
4. **Couple View empty-state contradictions** — Assessment comparison empty + strengths empty while partners show real attachment labels.  
5. **Medical Billing nav links to missing routes** — Sidebar links to `/payers`, `/providers`, `/codes`, `/settings` with **no corresponding pages**.  
6. **Billing brand is “SMB”** — Therapist leaves Love Rescue into a generic Super Medical Billing chrome; trust drop at SSO handoff.  
7. **FREE ERA + dead Subscribe** — All feature gates open; Subscribe route commented out — OK strategically, but Admin still surfaces “premium,” OKRs still talk freemium. Product story is confused.  
8. **Gendered client copy** — “toward her,” “most men,” “Every man’s edge” in a couples product — alienates half the market and conflicts with inclusive signup gender options.  
9. **Crisis utilities exist but are not a client-facing product surface** — `crisisMode.js` / pathway code are not a clear in-app “I’m in crisis” flow for users.  
10. **ErrorBoundary “Go to Dashboard” always → `/dashboard`** — Therapists get dumped into the couple product after a crash.

---

## 2. Product map (what “good” looks like)

```
CLIENT JOURNEY
  Landing /start teaser → Signup → Disclaimer → Dashboard ActionCard
    → Assessments (unlock tiers) → Plan unlock at 3
    → Daily log / Gratitude / Real Talk / Strategies / Course
    → Partner invite → Matchup → Together mode
    → Optional therapist link + consent levels

THERAPIST JOURNEY
  Allowlisted signup / login → /therapist caseload
    → Invite client → Client accepts + consent
    → Client cards, alerts, session prep, couple view, treatment planner
    → Practice Health (clinical + business KPIs)
    → Billing Terms clickwrap → SSO → Medical Billing

MEDICAL BILLING (SMB)
  SSO provision practice lr-<email> → sessions → claims → ERA → A/R
  Server-to-server: practice-analytics + revenue-summary → LR Flight Deck
```

---

## 3. Client experience audit

### 3.1 Landing & acquisition — **C+**

**Strengths**
- Brand system is intentional: night-violet `#0d0221`, pink→purple CTA, emotional hero video, strong headline energy.
- Clear primary CTA: free path, no-card promise.
- Social proof strip exists.

**Issues**

| ID | Sev | Finding | UX / product impact | Fix |
|----|-----|---------|---------------------|-----|
| C-L1 | **P0** | Programs still advertise **“4 Scientific Assessments”**, **“14-Week Guided Course”**, “wellness/closeness” framing | Trust break when user hits 10 assessments + 16-week Journey | Rewrite `programs` + steps to match live catalog; one source of truth |
| C-L2 | **P1** | Cookie banner sits on top of hero CTA (screenshot evidence) | Mobile conversion tax; accidental dismiss of intent | Banner bottom-sheet, delay until scroll, or accept below fold only |
| C-L3 | **P1** | Dual entry: in-app Landing vs static `landing/` SEO site | Drift risk (already present in product claims) | Single content contract; CI check for assessment counts |
| C-L4 | **P2** | Long page; value hierarchy competes with “YOU GET IN LIFE WHAT YOU TOLERATE” | Scroll fatigue before CTA repeat | Sticky mobile CTA; cut 30% of mid-page feature grid |

### 3.2 Quick Start (`/start`) — **A−**

**Strengths**
- Merlin-style: 3 questions → insight → signup. Correct activation psychology.
- Touch targets ≥52px; progress bar; brand gradient result card.
- Copy is clinically reasonable for a teaser (not overclaiming diagnosis).

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-Q1 | **P2** | Result not persisted into signup (curiosity discarded) | Pass result style via query/localStorage to personalize first dashboard line |
| C-Q2 | **P3** | “Save your marriage” framing excludes dating / non-married | Optional “relationship” language toggle by intent |

### 3.3 Auth (Login / Signup / Join) — **B+**

**Strengths**
- Role-aware redirect: therapist → `/therapist`, client → dashboard.
- Pending therapist invite resume via `lr_pending_invite`.
- Gender collected at signup (helps hormonal filtering).
- Google / Apple / biometric paths present.
- Password rules enforced client-side (8+).

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-A1 | **P1** | Gender UI is male/female/prefer-not — binary product model for hormonal content | Gate hormonal fully; never show wrong-sex items if gender unknown |
| C-A2 | **P2** | Login auto-prompts biometric on standalone — can feel aggressive | Soft prompt once, not every open |
| C-A3 | **P2** | Join relationship empty/error paths need parity with invite partner Settings | Unified “Partner” empty state component |
| C-A4 | **P3** | Signup subtitle generic (“improving your relationship”) after hard landing | Match landing voice: “Your plan starts with you.” |

### 3.4 Disclaimer — **C**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-D1 | **P1** | `bgcolor: 'grey.100'` box on dark theme = washed light blotch / contrast mess | Use `brand.surface` tokens |
| C-D2 | **P1** | No crisis resources in first-run legal dialog (DV/suicide) | Add short resources + 988 / DV hotline |
| C-D3 | **P2** | One-time localStorage accept — no re-prompt on major policy change | Versioned key `disclaimerAccepted:v2` |
| C-D4 | **P2** | “Not therapy” is correct but weak next to hormonal “request labs” style interpretations | Align clinical copy system-wide |

### 3.5 Dashboard & navigation — **B+**

**Strengths**
- Progressive state machine: BLANK → DISCOVERING → BUILDING → PRACTICING → TRANSFORMED.
- Bottom nav and drawer **collapse for blank users** — rare good judgment.
- ActionCard priority stack is correct: attachment first → unlock plan → daily → strategy → gratitude → Real Talk.
- Skeleton mirrors layout; max-width 600 mobile discipline.
- Roadmap card for first-run orientation.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-H1 | **P1** | Gendered roadmap: **“moves toward her”** | Neutral: “toward your partner” |
| C-H2 | **P1** | `totalAssessments = 13` hard-coded while catalog shows 10 in `assessmentFlow` | Single constant from catalog length |
| C-H3 | **P2** | State cached in `localStorage` for Layout — can desync until dashboard visit | Derive from API `/me` progress fields |
| C-H4 | **P2** | BUILDING+ exposes many features (Straight Talk, Skill Tree) via drawer — cognitive overload | Keep “More” progressive; hide Straight Talk until PRACTICING |
| C-H5 | **P3** | Dashboard fires **11+ parallel API** calls — fine on fiber, painful on LTE | Aggregate `/dashboard` endpoint |

### 3.6 Assessments — **B**

**Strengths**
- Progressive unlock tiers (attachment/love/personality first) — excellent pacing.
- Self-awareness meter reframes completion as growth (good gamification).
- Results rendering is type-aware (attachment, MBTI-style, love language, etc.).
- Backend passes gender into hormonal question filter.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-AS1 | **P0** | Hormonal / physical assessments risk **pseudo-clinical** action language | Hard disclaimer + “talk to your clinician” only; strip lab-order tone |
| C-AS2 | **P1** | Self-awareness blurbs: **“most men” / “Every man’s edge”** | Inclusive or segment by self-ID |
| C-AS3 | **P1** | Catalog lists 10; backend VALID_TYPES includes shame/desire/tactical empathy not in UI flow | Either surface or stop scoring orphan types for matchup |
| C-AS4 | **P2** | 300+ questions potential — plan unlock at 3 is good; post-plan wall of locked assessments can still feel exam-like | “Optional deep dives” framing only |
| C-AS5 | **P2** | MBTI-style personality as compatibility input is psychometrically weak | Demote weight in matchup; prefer attachment/Gottman/EQ |

### 3.7 Strategies / Course / Daily loops — **B**

**Strengths**
- Strategy generator personalizes from attachment, love language, Gottman horsemen, cycle (profile builder improved — gottman_checkup key fix noted in code).
- Positive lens + skill + ritual layers are product-distinctive.
- Daily log, gratitude, Real Talk (Gottman soft startup) are strong habit loops.
- Straight Talk integrity listener is a bold differentiator (needs careful ethics review).

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-S1 | **P1** | Many assessments still **underused** in profile vs scored (shame, desire, tactical empathy, hormonal, vitality) | Wire into technique selector or don’t collect |
| C-S2 | **P1** | Client crisis mode utilities not wired as visible “I’m flooded / affair discovery” entry | Entry from daily log + dashboard emergency |
| C-S3 | **P2** | Free-era removes monetization path — OKRs still freemium | Update OKRs or reintroduce soft paywall later deliberately |
| C-S4 | **P2** | Real Talk / Straight Talk can be weaponized without partner context | Mirror framing: “for your words, not to prove them wrong” |

### 3.8 Partner / Matchup — **B**

**Strengths**
- Empty state for no partner is warm and clear.
- Generate matchup + strategy together is correct.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-M1 | **P1** | Asymmetric completion UX — one partner done, other stalled | Nudge templates + progress clarity |
| C-M2 | **P2** | Score can feel like a grade / weapon | Lead with “dynamics map” not “score out of 100” |
| C-M3 | **P2** | Invite buried in Settings from Matchup empty CTA | Deep-link invite generator |

### 3.9 Client ↔ Therapist link (client side) — **B+**

**Strengths**
- Permission tiers Basic / Standard / Full with plain-language descriptions.
- Consent philosophy correct: client controls share level.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| C-T1 | **P1** | Clients may not understand what “crisis alerts” means for Standard | Examples + sample alert |
| C-T2 | **P2** | Revoke UX must be obvious and instant | Settings primary action “Stop sharing” with confirmation |

---

## 4. Therapist experience audit

### 4.1 Identity & first run — **B**

**Strengths**
- Dedicated light `therapistTheme` — correct for long clinical sessions.
- Bottom nav: Dashboard / Clients / Practice / Alerts — thumb-zone correct.
- Allowlisted self-signup path for providers.
- Empty roster CTA: “Invite Your First Client.”

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| T-F1 | **P1** | First login with zero clients + zero alerts can feel “broken product” without a 3-step onboarding checklist | Force thin onboarding: Invite → Wait → Prep |
| T-F2 | **P2** | Billing Terms always in drawer — good for compliance, clutter for pure clinical users | Show badge “Action needed” only if not accepted |
| T-F3 | **P2** | TherapistOnboarding vs dashboard entry path not obviously sequential | Auto-route incomplete onboarding |

### 4.2 Caseload dashboard — **B+**

**Strengths**
- Clinical-first framing: “Where each client stands…” (recent reframes good).
- Client health dials, activity, trend, Prepare-for-meeting.
- Link couple dialog; invite client.
- Flight Deck strip with source-aware KPIs when headline present.
- Connect billing nudge when headline absent.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| T-D1 | **P1** | Medical Billing button on caseload — **clinical home polluted by RCM** | Secondary only; primary CTA remains Invite / Alerts |
| T-D2 | **P1** | `openBilling` error path doesn’t route to Billing Terms on `BILLING_TERMS_NOT_ACCEPTED` (Practice page does; Dashboard does not) | Share `openBilling` helper |
| T-D3 | **P2** | Stats cards (Total / Active / Alerts / Avg Progress) then Flight Deck KPIs = **double KPI bands** | One band: clinical top, business collapsible |
| T-D4 | **P2** | “No unread alerts 🎉” is fine empty; zero clients should hide alerts section or reframe | Context-aware empty |
| T-D5 | **P3** | Card/list toggle good; missing sort (risk, last active, next session) | Sort + filter chips |

### 4.3 Alerts — **B+**

**Strengths**
- Types: crisis / risk / milestone / stagnation.
- Filter + bulk patterns exist (prior audit).

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| T-A1 | **P1** | Alert → client deep link must land on actionable panel (not generic progress) | Deep-link with alertId highlight |
| T-A2 | **P2** | Silent catches on mark-read | Surface toast on failure |

### 4.4 Client Progress / Session Prep / Couple View / Treatment Plan — **B−**

**Strengths**
- Session Prep structure is clinically useful: crisis flags, changes, engagement, focus.
- Couple View shows partners, dynamics, patterns, recommendations — differentiated.
- Treatment planner exists with modules.
- Chart registration comments show real production debugging discipline.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| T-C1 | **P0** | Session Prep **has crashed in production UI** (ErrorBoundary screenshot) | Regression test: cold-load `/therapist/clients/:id/session-prep` with sparse data; wrap charts in local error boundary |
| T-C2 | **P0** | Couple View **empty Assessment Comparison** while both partners have attachment labels | Wire radar from shared assessment types or hide section until ≥2 shared completed |
| T-C3 | **P1** | Shared Strengths empty + “No shared assessment data” contradicts filled partner columns | Single empty-state rule; don’t show section until data |
| T-C4 | **P1** | ErrorBoundary home → `/dashboard` for therapists | Role-aware: `/therapist` |
| T-C5 | **P2** | TreatmentPlanner DnD icon without DnD | Remove icon or implement reorder |
| T-C6 | **P2** | Print Session Prep — verify dark/light and empty sections | Print stylesheet QA |

### 4.5 Practice Health — **B**

**Strengths**
- Flight-deck tokens, SourceBadge, as-of timestamps — **excellent data-honesty design**.
- KPIs: clients, collected, sessions, leads, funnel.
- Open Medical Billing CTA after terms.
- Lead feed with concern labels.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| T-P1 | **P0** | When billing offline, **demo $ figures** still render (source=`demo`) — easy to present as real money in a sales call | Default hide monetary KPIs unless `source==='live'`; demo only behind “Sample data” toggle |
| T-P2 | **P1** | Mix of Love Rescue caseload truth + billing truth without unified narrative | Label sections “Clinical activity” vs “Billing (live)” |
| T-P3 | **P2** | Dense charts + many cards on mobile | Priority stack: money → A/R → funnel → rest |

### 4.6 Billing Terms clickwrap — **A−**

**Strengths**
- Versioned terms, IP capture, BAA summary, 4.5% + $300 min transparent.
- Blocks SSO until accepted (backend + Practice path).

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| T-B1 | **P1** | Full BAA is summarized not linked as full legal PDF | Host full TERMS + BAA URL; clickwrap references URL hash |
| T-B2 | **P2** | After accept, only “Go to Practice Health” — should offer “Open Medical Billing” | Dual CTA |
| T-B3 | **P2** | Frontend `TERMS_VERSION = '1.0'` duplicated vs backend constant | Single API `currentVersion` only |

---

## 5. Medical billing audit (Super Medical Billing)

### 5.1 Architecture — **B+**

**Strengths**
- Separate monorepo: claims, sessions, eligibility, ERA, A/R, denials, appeals, credentialing.
- SSO: short-lived JWT, practiceId **derived** as `lr-<email>` (no tenant claim injection).
- Won’t hijack local password accounts (409).
- Integration endpoints for revenue-summary + practice-analytics with same trust model.
- Meta-refresh SSO response (smart workaround for Vercel rewrite cookie issues).
- Default role **BILLER** (least privilege).

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| B-A1 | **P0** | Sidebar links **Payers / Providers / CPT-ICD / Settings** with **no app routes** | Remove links or ship stubs; 404 is unprofessional |
| B-A2 | **P0** | Brand chrome is **“SMB Medical Billing”** — not Love Rescue | Rebrand SSO landing: “Love Rescue Billing”, pink/purple accents, return-to-app link |
| B-A3 | **P1** | Fixed left sidebar `w-64` + `ml-64` — **no mobile layout** | Collapse drawer; therapists open billing on phones from LR |
| B-A4 | **P1** | Dense IA (20+ nav items) for first-time therapist | Role-based progressive IA: Onboarding → Sessions → Claims → Money |
| B-A5 | **P1** | SSO opens full billing without contextual “you came from Love Rescue” banner | Top bar: practice name + “Back to Love Rescue” |
| B-A6 | **P2** | Integration JWT uses same `BILLING_SSO_SECRET` as human SSO | Acceptable short-term; prefer separate integration secret later |
| B-A7 | **P2** | Prior SuperTool bridge audit (HMAC raw body, consent on alerts) may still apply to any EMR bridge — re-verify if still live | Track as dependency |

### 5.2 RCM workflow UX — **B**

**Strengths**
- Claims list with status filters, money formatting, days-open logic.
- Dashboard aggregates metrics, aging, eligibility, auths.
- Clearinghouse (Stedi) path exists in API.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| B-W1 | **P1** | No guided “first claim” wizard from zero state | Empty states that start Onboarding → Patient → Session → Claim |
| B-W2 | **P1** | PHI-heavy product: audit logging / session timeout / idle lock not validated in this pass | Security checklist for HIPAA demo |
| B-W3 | **P2** | Inconsistent empty/error patterns across pages | Shared components |
| B-W4 | **P2** | “Super Medical Billing” naming vs product promise “Love Rescue billing agent” | Naming consistency in terms + UI |

### 5.3 Bridge Love Rescue ↔ Billing — **B+**

**Strengths**
- Terms gate before SSO.
- Practice analytics fetch with timeout + fail soft.
- Source badges (`live` vs `demo`) in flightdeck design system.

**Issues**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| B-X1 | **P0** | Demo financials on LR when billing down (see T-P1) | Hide money unless live |
| B-X2 | **P1** | Therapist dashboard billing error does not handle terms gate | Shared helper |
| B-X3 | **P2** | No in-app status of “billing connected / last sync” | Practice Health header: Connected · last pull |

---

## 6. Cross-cutting systems

### 6.1 Brand & design system — **B**

| Area | Grade | Notes |
|------|-------|-------|
| Couple dark theme | **A−** | Coherent night-violet; tokens in `theme.js` |
| Therapist light theme | **A−** | Correct professional split |
| Landing | **B** | Strong look, stale product facts |
| Medical billing | **D** | Generic gray SaaS; breaks brand story |
| Iconography | **B** | MUI heavy; emoji still used in places |
| Motion | **B+** | Framer on Real Talk; FAB/confetti on daily |

### 6.2 Accessibility — **C+**

- Touch targets often ≥44px (good discipline on therapist).
- Charts frequently missing full ARIA narratives.
- No skip-to-content.
- Focus management after route change not implemented.
- Disclaimer contrast issues on dark.
- Color-only status in places (ratio greens/reds) — need text labels (often present).

### 6.3 Security / trust / clinical — **B−**

| Topic | Status |
|-------|--------|
| JWT HS256, secret validation | Improved vs early audits |
| Therapist consent model | Sound |
| Billing terms + BAA language | Present; full BAA hosting TBD |
| Crisis pathway code | Exists; client surface weak |
| Hormonal pseudo-medicine | **Still a liability risk** |
| No Sentry wired (ErrorBoundary TODO) | Blind in production |
| Integration secret separation | Partial |

### 6.4 Testing posture — **C+**

- Cypress e2e suite exists (auth, assessments, daily, matchup, reports, settings, full-journey).
- Frontend unit tests for major pages.
- Therapist crisis pathway unit tests exist.
- **Missing:** Session Prep sparse-data e2e, billing SSO e2e, couple view empty-state e2e, demo-vs-live KPI assertion.

### 6.5 Release hygiene

- `main` was **38 commits ahead of origin** at audit time — do not demo from unpushed state without knowing what’s live.
- FREE ERA comments vs Admin premium chips = product confusion.

---

## 7. Severity-ranked punch list

### P0 — Block demo / legal / trust

1. Align landing + SEO pages to **real** assessment count, course length, free era.  
2. **Never show fabricated revenue as default** on Practice / Flight Deck.  
3. Session Prep: harden crash paths; chart error boundaries; e2e cold load.  
4. Couple View: fix empty comparison / strengths contradiction.  
5. Medical Billing: remove or implement dead nav routes.  
6. Rebrand billing shell for Love Rescue SSO entry (minimum viable).  
7. Clinical liability pass on hormonal/physical interpretations.

### P1 — Fix before broad therapist rollout

8. Inclusive copy (remove “her” / “men” defaults).  
9. Shared `openBilling` with terms redirect everywhere.  
10. Role-aware ErrorBoundary home.  
11. Mobile billing layout.  
12. Progressive therapist onboarding checklist.  
13. Crisis resources in disclaimer + client entry point.  
14. Assessment catalog vs backend type parity.  
15. Cookie banner not covering primary CTA.

### P2 — Quality / conversion / polish

16. Persist Quick Start result into signup.  
17. Aggregate dashboard API.  
18. Matchup “dynamics” framing vs score weaponization.  
19. Treatment planner DnD honesty.  
20. Versioned disclaimer.  
21. Billing “Back to Love Rescue” + connected status.  
22. Sort/filter caseload.  
23. Straight Talk ethics copy.  
24. Admin premium UI cleanup for free era.

### P3 — Nice

25. Skip links, focus management.  
26. Chart ARIA pass.  
27. Reduce emoji reliance in clinical UI.  
28. Celebrate partner join with shared ritual.

---

## 8. UX principles — Love Rescue bar (adopt as SOP)

1. **Truth over theater** — Never invent money, progress, or compatibility.  
2. **One next action** — Every screen answers “what do I do now?”  
3. **Consent is product** — Client always knows what’s shared.  
4. **Clinical humility** — Mirror, not doctor; crisis routes out.  
5. **Dual brand, one family** — Dark couple / light clinical / branded billing.  
6. **Empty states teach** — Never leave a section empty without a job.  
7. **Mobile is primary** for couples; **desktop primary** for therapists; billing must still work on phone.  
8. **Marketing = product** — Landing claims are QA-owned.

---

## 9. Recommended 2-week war plan

### Week 1 — Trust & demo hard-blockers
- Day 1–2: Landing/product truth + inclusive copy sweep  
- Day 2–3: Hide demo revenue; live-only money; SourceBadge mandatory  
- Day 3–4: Session Prep + Couple View empty/crash QA  
- Day 4–5: Billing nav 404s + SSO branding banner + mobile drawer  

### Week 2 — Activation & therapist polish
- Shared openBilling + terms CTA  
- Therapist first-run checklist  
- Disclaimer crisis resources  
- Assessment/type parity decision  
- Cypress: session-prep, couple-view empty, billing SSO smoke  
- Push origin only after P0 closed  

---

## 10. Scorecard

| Domain | Score | Notes |
|--------|-------|-------|
| Couple activation (0–10 min) | **8/10** | Quick Start + ActionCard excellent |
| Couple depth / retention | **7.5/10** | Content rich; personalization incomplete |
| Couple marketing truth | **4/10** | Stale claims |
| Therapist clinical UX | **7/10** | Strong direction; empty/crash debt |
| Therapist business UX | **6/10** | Flight deck good; demo $ risk |
| Medical billing UX | **5/10** | Feature-wide, brand/IA weak |
| Brand cohesion (3 surfaces) | **5.5/10** | Couple+therapist OK; billing breaks it |
| Clinical safety posture | **5.5/10** | Disclaimer weak; crisis under-surfaced |
| Accessibility | **6/10** | Touch OK; charts/focus lag |
| Ship confidence | **6/10** | Conditional |

**Composite: B−**

---

## 11. Boss bottom line

You built something **harder and more ambitious** than a vibey couples app: a therapy-adjacent client system **plus** a clinical console **plus** a real RCM product. That ambition is the moat — and the reason QA must be ruthless.

**What is excellent**
- Night-violet brand + ActionCard first-run psychology  
- Progressive assessment unlock  
- Therapist light theme + caseload intelligence direction  
- Billing terms clickwrap + derived-tenant SSO design  
- Source-aware flightdeck thinking (when live)

**What will get you embarrassed in a live demo**
- Fake money  
- Crashed session prep  
- Empty couple comparison  
- Landing that describes a different product  
- Billing sidebar 404s and “SMB” chrome  

**My call:**  
- **Client free product** — shipable after marketing truth + copy inclusivity + clinical disclaimer pass.  
- **Therapist** — demo with seeded clients only until P0 couple/session prep fixed.  
- **Billing** — SSO-only private; do not lead with it until brand + nav + live-only KPIs are fixed.

---

*End of master audit. Next action: pick a war-plan track and I will execute fixes in priority order.*
