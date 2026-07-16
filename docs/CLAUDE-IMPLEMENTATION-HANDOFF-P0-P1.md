# Claude Implementation Handoff — Love Rescue P0/P1 Trust Pack

**Prepared by:** Boss QA/QC + Product Design (Grok)  
**Date:** 2026-07-16  
**Source audit:** `docs/MASTER-QA-UX-AUDIT-2026-07-16.md`  
**Purpose:** Self-contained implementation brief for Claude. Implement exactly. Do not invent scope.  
**QA gate:** After implementation, Grok re-audits every ticket against **Acceptance Criteria** below. Incomplete = fail.

---

## How to use this document

1. Paste **Section A (System Prompt)** into Claude’s system/role or open with it.  
2. Give Claude **Section B (Mission)** as the user message.  
3. Claude implements tickets in order **P0 → P1**.  
4. Claude fills **Section G (Handoff Report)** when done.  
5. Grok runs **Section H (QA Scorecard)** and fails any red ticket.

---

# Section A — System Prompt for Claude

```
You are a senior full-stack engineer implementing a FIXED priority list for Love Rescue
(relationship wellness app: React/MUI client + Express/Prisma API + therapist console)
and Super Medical Billing (Next.js + Express monorepo at ../super-medical-billing).

Rules:
1. Implement ONLY tickets listed in the handoff. No drive-by refactors. No new features.
2. Match existing code style, patterns, and component libraries already in the repo.
3. Prefer minimal, correct diffs. Do not rewrite large files unless required.
4. After each ticket, verify acceptance criteria yourself (read code, run what you can).
5. If blocked (missing env, no credentials), document the blocker — do not fake the fix.
6. Do not push to remote unless the user explicitly asks.
7. Do not commit secrets. Do not weaken auth, consent, or billing-terms gates.
8. Brand tokens live in love-rescue/frontend/src/theme.js (couple dark + therapist light).
9. Medical billing lives at /Users/odinson/Projects/super-medical-billing (sibling repo).
10. When done, produce the Handoff Report (Section G) with file list + residual risk.

Product truth (do not contradict in UI copy):
- App is currently FREE ERA: all features unlocked (featureGating.js passthrough).
- Assessments catalog: 10 types in frontend assessmentFlow.js (attachment, personality,
  love_language, human_needs, gottman_checkup, emotional_intelligence, conflict_style,
  differentiation, hormonal_health, physical_vitality). Backend may have more types.
- Course is 16-Week Journey (/course).
- Plan unlocks after 3 assessments (PLAN_UNLOCK_COUNT = 3).
- Couple brand: night-violet #0d0221, pink #e91e63 → purple #9c27b0 gradient.
- Therapist brand: light clinical theme (therapistTheme).
- Billing: billing.loverescue.app, SSO via BILLING_SSO_SECRET, terms gate required.
```

---

# Section B — Mission (user message to Claude)

```
Implement the Love Rescue Trust Pack P0+P1 exactly as specified in:
docs/CLAUDE-IMPLEMENTATION-HANDOFF-P0-P1.md

Work ticket-by-ticket in listed order. Check off acceptance criteria.
When all P0 and P1 tickets are done (or blocked with notes), write Section G Handoff Report
at the bottom of that same file or as docs/CLAUDE-HANDOFF-REPORT.md.

Repos:
- love-rescue: /Users/odinson/Projects/love-rescue
- medical billing: /Users/odinson/Projects/super-medical-billing

Do not expand scope. Grok will QA every ticket against acceptance criteria.
```

---

# Section C — Non-negotiable product principles

1. **Truth over theater** — Never invent money, progress, or compatibility.  
2. **Marketing = product** — Landing claims must match live catalog.  
3. **Consent is product** — Do not weaken therapist/client consent or billing terms gates.  
4. **Clinical humility** — Mirror, not doctor; crisis routes out.  
5. **One next action** — Empty states teach; sections without data hide or explain.  
6. **Inclusive by default** — No “her” / “most men” defaults in a couples product.

---

# Section D — Ticket backlog (implement in order)

## P0 — Block demo / legal / trust

---

### TICKET P0-1 — Marketing truth: landing matches product

**Severity:** P0  
**Repos:** `love-rescue`  
**Why:** Landing sells “4 assessments” / “14-week course”; product has 10 assessments + 16-week journey.

**Files (primary)**
- `frontend/src/pages/Landing/Landing.js` — `programs` array (~L60), steps (~L111), checklist copy (~L1174), any “4 Scientific” / “14-Week” strings
- `landing/index.html` — mirror the same product facts (SEO static site)
- Optionally: other `landing/**/*.html` pages that claim “four assessments” or “14-week”

**Required copy contract (use consistently)**
| Claim | Correct value |
|-------|----------------|
| Assessments | **10 research-backed assessments** (progressive unlock; plan after 3) |
| Journey / course | **16-Week Journey** |
| Price | **Free to start — no card required** (FREE ERA) |
| Core promise | Plan built around **you** (patterns), not blaming partner |

**Implementation**
1. Update `programs` subtitles/descriptions:
   - Assessments: not “4 Scientific Assessments”
   - Course: not “14-Week Guided Course” → 16-Week Journey / daily practice language that matches product
   - Remove “wellness behaviors / closeness patterns” as the only four if outdated
2. Update `steps` and any marketing bullet lists to match.
3. Update static `landing/index.html` equivalent claims.
4. Grep both trees for `14-Week`, `14 week`, `four deep`, `4 Scientific`, `four assessments` and fix remaining product claims (do not change legal boilerplate casually).

**Acceptance criteria**
- [ ] No user-facing “4 Scientific Assessments” or “14-Week” course claims remain in app Landing or `landing/index.html`
- [ ] Copy states 10 assessments and 16-week journey (or “16-Week Journey” product name)
- [ ] Free / no-card promise preserved
- [ ] Grep clean for those false strings in the two primary surfaces

**Out of scope:** Full SEO rewrite of every blog post; OKRs docs; App Store listing (unless you touch them already).

---

### TICKET P0-2 — Never show fabricated revenue by default

**Severity:** P0  
**Repos:** `love-rescue`  
**Why:** When Super Medical Billing is unreachable, backend invents `$` from caseload × $150 × 0.8 with `source: 'demo'`. Demo-killer / trust-killer.

**Files (primary)**
- `backend/src/routes/therapist.js` — `computePracticeHeadline`, `GET /practice` revenue/demo fallback (~L1676–1982)
- `frontend/src/pages/Therapist/TherapistDashboard.js` — Flight Deck monetary KPIs
- `frontend/src/pages/Therapist/Practice.js` — Revenue / collected KPIs
- `frontend/src/components/therapist/flightdeck/*` — `Kpi`, `SourceBadge` if needed

**Implementation**
1. **Backend preferred:** When billing is not live, return monetary fields as `null` (or omit), keep `source: 'demo' | 'unavailable'`, keep non-monetary clinical counts (active clients, leads) if they come from Love Rescue DB.
2. **Frontend required regardless:** If `source !== 'live'` OR monetary values are null:
   - Do **not** render currency as real money (no `$0` pretending to be connected if demo-fabricated).
   - Show honest empty: “Connect Medical Billing to see collections” + CTA (terms-aware).
   - Optional: explicit “Sample data” mode only behind a clearly labeled toggle (default OFF). Prefer no sample data at all.
3. Preserve `SourceBadge` / as-of when live.
4. Clinical stats (total clients, alerts, activity) from LR DB remain fine.

**Acceptance criteria**
- [ ] With billing down / no `BILLING_SSO_SECRET` / fetch fail: **no fabricated positive or synthetic collection series** presented as practice finances
- [ ] UI copy clearly says billing not connected when `source !== 'live'`
- [ ] Live billing still shows real `$` and sessions
- [ ] No regression to billing-terms gate

**Test plan for implementer**
- Call or mock `/therapist/practice` and `/therapist/dashboard` with billing fetch returning null; confirm UI.

---

### TICKET P0-3 — Session Prep crash hardening

**Severity:** P0  
**Repos:** `love-rescue`  
**Why:** Production screenshot showed ErrorBoundary on Session Prep. Demo-killer.

**Files (primary)**
- `frontend/src/pages/Therapist/SessionPrep.js`
- `backend/src/utils/sessionPrep.js` and/or therapist session-prep route in `backend/src/routes/therapist.js`
- `frontend/src/components/common/ErrorBoundary.js` (see also P0-7 / P1)

**Implementation**
1. Defensive rendering: every nested field assumed optional (`?.`, arrays default `[]`).
2. Chart sections: if series empty or invalid, show empty state — never pass undefined into Chart.js.
3. Chart.js registration already partially fixed — ensure **cold direct navigation** to `/therapist/clients/:id/session-prep` works without visiting another chart page first.
4. Wrap chart blocks in a local try/error UI or small boundary so one chart failure doesn’t kill the page.
5. Loading / error / empty states already exist — keep them; fix data shape mismatches (`res.data.report` vs flat).

**Acceptance criteria**
- [ ] Page does not white-screen or full-page ErrorBoundary on:
  - brand-new client (no logs, no assessments)
  - client with partial data
  - client with full data
- [ ] Cold load of session-prep route works
- [ ] Crisis flags / empty arrays don’t throw
- [ ] Manual smoke: navigate from client card “Prepare for meeting”

---

### TICKET P0-4 — Couple View empty-state honesty

**Severity:** P0  
**Repos:** `love-rescue`  
**Why:** UI showed partner attachment labels while “Assessment Comparison” / strengths empty and contradictory.

**Files (primary)**
- `frontend/src/pages/Therapist/CoupleView.js`
- Backend couple endpoints in `backend/src/routes/therapist.js` / `coupleDynamics.js` if data missing

**Implementation**
1. **Single empty-state rule:** If a section has no data, either:
   - Hide the section entirely, OR
   - Show one clear empty message with next action (“Both partners need Gottman checkup for comparison”)
2. Do **not** show empty comparison **and** filled partner summary that implies comparison data exists without explaining the gap.
3. Wire assessment comparison / radar when both partners share completed assessment types; if only attachment is present, show attachment comparison only.
4. Align “Shared Strengths” / “Growth Edges” with the same data as expert synthesis (no “no strengths” under a card that lists Secure Attachment as protective factor without reconciliation).

**Acceptance criteria**
- [ ] No contradictory empties on couple with partial assessments
- [ ] Sections without data hidden or single honest empty
- [ ] Couple with both partners having attachment + love language shows meaningful comparison for those types
- [ ] No crash on couple with only one partner linked

---

### TICKET P0-5 — Medical Billing: dead nav routes

**Severity:** P0  
**Repos:** `super-medical-billing`  
**Why:** Sidebar links to routes with no pages → 404.

**Files (primary)**
- `apps/web/src/app/layout.tsx` — nav links for `/payers`, `/providers`, `/codes`, `/settings`

**Implementation (choose one approach; prefer A)**
- **A (fast):** Remove dead links from sidebar until pages exist.
- **B:** Add minimal placeholder pages (“Coming soon”) — only if product wants them visible.

**Also audit** any other href in layout that has no `app/**/page.tsx`.

**Acceptance criteria**
- [ ] Every sidebar link resolves to an existing page or is removed
- [ ] No 404 from primary nav
- [ ] List of removed/added routes noted in handoff report

---

### TICKET P0-6 — Medical Billing Love Rescue brand shell (SSO entry)

**Severity:** P0  
**Repos:** `super-medical-billing`  
**Why:** SSO lands on “SMB” generic chrome — trust drop from Love Rescue therapist product.

**Files (primary)**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css` / tailwind theme tokens if needed
- Optional: top banner component

**Implementation (minimum viable — do not rebuild entire RCM UI)**
1. Header brand: **Love Rescue Billing** (not only “SMB”).
2. Accent color aligned with Love Rescue pink/purple (can keep clinical neutrals for tables).
3. Persistent bar after SSO: practice context + **“← Back to Love Rescue”** linking to `https://loverescue.app/therapist/practice` (or env `LOVE_RESCUE_APP_URL`).
4. Document title / metadata: Love Rescue Billing.

**Acceptance criteria**
- [ ] “Love Rescue” visible in chrome without hunting
- [ ] Back link to therapist practice exists
- [ ] Not a full redesign — nav structure can remain, branding + return path required

---

### TICKET P0-7 — Hormonal / clinical disclaimer pass (liability)

**Severity:** P0  
**Repos:** `love-rescue`  
**Why:** Hormonal wellness can read like medical orders.

**Files (primary)**
- `frontend/src/pages/Assessments/Assessments.js` / `AssessmentQuiz.js` (hormonal_health result UI)
- `backend/src/utils/interpretations.js` — `hormonal_health` case
- `frontend/src/components/common/Disclaimer.js`
- Question bank / scoring only if action-step strings live there

**Implementation**
1. Prepend / enforce assessment-level banner: **Not a diagnosis. Not medical advice. Consult a licensed clinician.**
2. Strip or rewrite action steps that sound like lab orders (“Request comprehensive thyroid panel…”) → educational “Discuss with your healthcare provider if you notice…”
3. Disclaimer dialog: add crisis resources (988, DV hotline 1-800-799-7233 / text START to 88788).
4. Fix disclaimer visual: replace `grey.100` box with dark-theme surface tokens (`brand.surface` or theme paper).
5. Version disclaimer accept key: e.g. `disclaimerAccepted:v2` so users re-ack once.

**Acceptance criteria**
- [ ] Hormonal results never instruct specific lab panels as directives
- [ ] Visible non-diagnosis disclaimer on hormonal assessment start and result
- [ ] Global disclaimer includes crisis resources + readable on dark theme
- [ ] Re-prompt once for users who accepted old disclaimer

---

## P1 — Before broad therapist rollout

---

### TICKET P1-1 — Inclusive copy sweep

**Severity:** P1  
**Repos:** `love-rescue`

**Files**
- `frontend/src/pages/Dashboard/Dashboard.js` — “toward her”
- `frontend/src/utils/assessmentFlow.js` — “Every man’s edge”, “most men”
- Grep: `\bher\b`, `most men`, `man's`, `yourself first` partner assumptions

**Implementation**
- Neutral partner language: “your partner”, “them”
- Self-awareness blurbs: “most people” / “your edge starts with knowing yourself”

**Acceptance criteria**
- [ ] Grep shows no “toward her” / “most men” / “Every man’s edge” in client UX strings
- [ ] No accidental grammar breakage

---

### TICKET P1-2 — Shared `openBilling` helper (terms-aware)

**Severity:** P1  
**Repos:** `love-rescue`

**Files**
- Create e.g. `frontend/src/utils/openBilling.js` or method on `therapistService`
- `frontend/src/pages/Therapist/TherapistDashboard.js`
- `frontend/src/pages/Therapist/Practice.js`
- Any other Medical Billing buttons

**Implementation**
```js
// Pseudocode
async function openBilling() {
  try {
    const res = await therapistService.getBillingSsoUrl();
    window.location.href = res.data.url;
  } catch (e) {
    if (e.response?.data?.error === 'BILLING_TERMS_NOT_ACCEPTED') {
      navigate('/therapist/billing-terms'); // or window.location
      return;
    }
    // surface error toast/alert
  }
}
```

**Acceptance criteria**
- [ ] Dashboard and Practice behave identically on terms-not-accepted
- [ ] No silent fail on Dashboard
- [ ] Loading state still disables double-click

---

### TICKET P1-3 — Role-aware ErrorBoundary home

**Severity:** P1  
**Repos:** `love-rescue`

**File:** `frontend/src/components/common/ErrorBoundary.js`

**Implementation**
- “Go to Dashboard” → if therapist session, `/therapist`, else `/dashboard`
- Detect via JWT payload, `/auth/me` cache, or `localStorage` user role if already stored — match existing Auth patterns without breaking public routes
- Prefer reading stored user from the same place AuthContext uses

**Acceptance criteria**
- [ ] Therapist crash recovery does not land on couple dashboard as the only option
- [ ] Client still goes to `/dashboard`

---

### TICKET P1-4 — Medical Billing mobile layout

**Severity:** P1  
**Repos:** `super-medical-billing`

**File:** `apps/web/src/app/layout.tsx` (+ CSS)

**Implementation**
- Below `md`: collapsible drawer / hamburger; content full width (no permanent `ml-64`)
- Touch-friendly nav targets

**Acceptance criteria**
- [ ] 390px width: content usable, nav accessible
- [ ] Desktop layout preserved

---

### TICKET P1-5 — Therapist first-run checklist (empty caseload)

**Severity:** P1  
**Repos:** `love-rescue`

**File:** `frontend/src/pages/Therapist/TherapistDashboard.js` (and optionally onboarding)

**Implementation**
When `clients.length === 0`, replace sparse empty with a **3-step checklist**:
1. Invite your first client  
2. Wait for them to accept & share data  
3. Open Session Prep before next meeting  

Keep Invite CTA primary. Billing secondary.

**Acceptance criteria**
- [ ] Zero-client state teaches next actions
- [ ] Does not look like a broken dashboard

---

### TICKET P1-6 — Assessment count single source of truth

**Severity:** P1  
**Repos:** `love-rescue`

**Files**
- `frontend/src/utils/assessmentFlow.js` — `assessmentTypes.length`
- `frontend/src/pages/Dashboard/Dashboard.js` — hard-coded `totalAssessments = 13`
- Any other hard-coded 13/10 mismatches in UI

**Implementation**
- Export `ASSESSMENT_CATALOG_COUNT = assessmentTypes.length`
- Dashboard and Assessments hub use it

**Acceptance criteria**
- [ ] No hard-coded 13 that disagrees with catalog
- [ ] Progress denominators match visible catalog

---

### TICKET P1-7 — Cookie banner must not block hero CTA

**Severity:** P1  
**Repos:** `love-rescue` (and static landing if same pattern)

**Files**
- `frontend/src/pages/Landing/Landing.js` cookie UI
- `landing/index.html` if applicable

**Implementation**
- Bottom sheet / bottom bar only; never cover primary hero CTA and headline on first paint
- Or delay until scroll / 3s — but must not trap “Start Free”

**Acceptance criteria**
- [ ] On 390×844, primary CTA tappable without dismissing cookies first (or banner is below CTA)

---

### TICKET P1-8 — Billing Terms post-accept CTA

**Severity:** P1  
**Repos:** `love-rescue`

**File:** `frontend/src/pages/Therapist/BillingTerms.js`

**Implementation**
After accepted: dual CTA — “Open Medical Billing” (shared openBilling) + “Practice Health”

**Acceptance criteria**
- [ ] Therapist can go straight to billing after accept without hunting

---

## P2 — Do NOT implement unless P0+P1 done and user asks

Listed only for awareness (from master audit):

- Persist Quick Start result into signup  
- Aggregate dashboard API  
- Matchup “dynamics” framing vs score  
- Treatment planner DnD honesty  
- Admin premium UI cleanup for free era  
- Progressive therapist drawer “Billing Terms” badge only when unaccepted  
- Separate integration JWT secret from human SSO  
- Full BAA PDF hosting  

**Do not start these in this handoff.**

---

# Section E — Suggested implementation order (one PR or stacked commits)

```
1. P0-1  Marketing truth
2. P1-1  Inclusive copy (same pass as landing often)
3. P1-6  Assessment count constant
4. P0-7  Disclaimer + hormonal liability
5. P0-2  Demo revenue kill
6. P1-2  openBilling helper
7. P1-8  Billing terms dual CTA
8. P0-3  Session Prep harden
9. P0-4  Couple View empty honesty
10. P1-3 ErrorBoundary role home
11. P1-5 Therapist empty checklist
12. P1-7 Cookie banner
13. P0-5 Billing dead nav
14. P0-6 Billing brand shell
15. P1-4 Billing mobile layout
```

Commit style (if user asks for commits): conventional commits per ticket, e.g.  
`fix(landing): align assessment and course claims with product (P0-1)`

---

# Section F — Verification commands (run what you can)

```bash
# love-rescue
cd /Users/odinson/Projects/love-rescue
# False marketing strings
rg -n "14-Week|14 week|4 Scientific|four deep behavioral|four assessments" frontend/src/pages/Landing landing/index.html || true
# Gendered copy
rg -n "toward her|most men|Every man's edge" frontend/src || true
# Frontend tests (if env works)
cd frontend && npm test -- --watchAll=false 2>/dev/null | tail -40

# billing dead routes
cd /Users/odinson/Projects/super-medical-billing
# list app routes vs layout hrefs
ls apps/web/src/app
rg -n 'href="/' apps/web/src/app/layout.tsx
```

Manual therapist smoke (local or staging):
1. Login therapist → empty caseload checklist  
2. Seeded client → Session Prep cold load  
3. Couple → no contradictory empties  
4. Practice Health with billing down → no fake $  
5. Billing terms → accept → Open Billing → Love Rescue branded shell + back link  

---

# Section G — Handoff Report template (Claude fills this)

```markdown
# Claude Handoff Report — Trust Pack

Date:
Branch / commits:

## Ticket status
| Ticket | Status (done/blocked/partial) | Key files | Notes |
|--------|-------------------------------|-----------|-------|
| P0-1 | | | |
| P0-2 | | | |
| P0-3 | | | |
| P0-4 | | | |
| P0-5 | | | |
| P0-6 | | | |
| P0-7 | | | |
| P1-1 | | | |
| P1-2 | | | |
| P1-3 | | | |
| P1-4 | | | |
| P1-5 | | | |
| P1-6 | | | |
| P1-7 | | | |
| P1-8 | | | |

## Acceptance criteria self-check
- Paste any AC still unchecked and why.

## How to QA
- Env vars needed:
- Test accounts:
- Commands run:

## Residual risk / known gaps
-

## Explicitly NOT done (P2+)
-
```

Save as: `docs/CLAUDE-HANDOFF-REPORT.md`

---

# Section H — QA Scorecard (Grok uses this after Claude)

For each ticket: **PASS / FAIL / BLOCKED**

| Ticket | PASS criteria (summary) | Result | Evidence |
|--------|-------------------------|--------|----------|
| P0-1 | No false 4/14 claims; 10 + 16 correct | | |
| P0-2 | No fabricated $ when billing offline | | |
| P0-3 | Session Prep no crash sparse/full/cold | | |
| P0-4 | Couple View no contradictory empties | | |
| P0-5 | Billing nav no 404s | | |
| P0-6 | Love Rescue billing chrome + back link | | |
| P0-7 | Hormonal non-medical + crisis disclaimer | | |
| P1-1 | Inclusive copy | | |
| P1-2 | openBilling terms redirect everywhere | | |
| P1-3 | ErrorBoundary role home | | |
| P1-4 | Billing mobile usable | | |
| P1-5 | Therapist zero-client checklist | | |
| P1-6 | Catalog count single source | | |
| P1-7 | Cookie not blocking CTA | | |
| P1-8 | Dual CTA after terms | | |

**Ship rule:** Any P0 FAIL = do not demo that surface. Any P1 FAIL = do not expand therapist beta.

**Regression watchlist**
- Billing terms still gate SSO  
- Consent levels unchanged  
- FREE ERA gating still open  
- Therapist light theme still applied under `/therapist`  
- Couple dark theme intact  

---

# Section I — Ready-to-paste single prompt for Claude

Copy everything between the markers:

```
=== BEGIN CLAUDE PROMPT ===

You are implementing the Love Rescue Trust Pack (P0 + P1 only).

Read and follow exactly:
/Users/odinson/Projects/love-rescue/docs/CLAUDE-IMPLEMENTATION-HANDOFF-P0-P1.md

Repos:
- Love Rescue: /Users/odinson/Projects/love-rescue
- Super Medical Billing: /Users/odinson/Projects/super-medical-billing

Source audit (context only, do not expand scope beyond the handoff tickets):
/Users/odinson/Projects/love-rescue/docs/MASTER-QA-UX-AUDIT-2026-07-16.md

Rules:
- Implement tickets P0-1 through P0-7 and P1-1 through P1-8 in the order given in Section E.
- Do not implement P2+ items.
- Minimal diffs. Match existing patterns.
- Do not push. Commit only if I ask.
- Do not weaken auth, consent, or billing-terms gates.
- When finished, write docs/CLAUDE-HANDOFF-REPORT.md using Section G template, with every ticket status and unchecked AC called out.

Product truth:
- FREE ERA (all features unlocked)
- 10 assessments in frontend catalog; plan unlocks at 3
- 16-Week Journey
- Never invent revenue when billing is offline

Start with P0-1 now. Work sequentially. After each ticket, briefly confirm acceptance criteria.

=== END CLAUDE PROMPT ===
```

---

# Section J — How Grok holds Claude accountable (operating mode after this)

When implementation returns:

1. Diff review against each ticket’s **Files** and **Acceptance criteria**.  
2. Grep for leftover false marketing / gendered copy / demo revenue paths.  
3. Manual or automated smoke on Session Prep, Couple View, Practice KPIs, Billing nav.  
4. Mark Section H PASS/FAIL with evidence.  
5. Open **rework tickets** only for FAILs — no new scope.  
6. Final sign-off only when **all P0 PASS** and P1 PASS or explicitly waived by product owner.

---

*End of handoff. Owner: Boss QA. Implementer: Claude. Gate: Grok re-audit.*
