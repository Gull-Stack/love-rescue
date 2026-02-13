# SPY REPORT — STEP 4: THE BLUEPRINT
## LoveRescue Therapist Edition — Full Product Specification
**Date:** 2026-02-12 | **Classification:** Implementation-Ready | **Author:** Product Architecture Team

---

## Executive Summary

LoveRescue Therapist Edition is a HIPAA-compliant therapist portal that transforms LoveRescue from a consumer relationship app into a **clinical tool ecosystem**. Therapists get a dashboard to monitor client/couple progress, prepare for sessions, detect risk, assign interventions, and measure outcomes — all powered by the data clients are already generating in LoveRescue.

**Revenue model:** B2B SaaS ($49-299/mo) layered on top of existing B2C app.  
**Competitive moat:** No existing EHR has real-time between-session couple data. We're not replacing SimplePractice — we're the layer they can't build.

---

## 1. ACCESS MODEL

### 1.1 Account Types

| Role | Description | Permissions |
|------|-------------|-------------|
| **Therapist** | Licensed clinician | View consented client data, assign activities, message clients, generate reports |
| **Supervisor** | Licensed supervisor (V2) | Everything therapist can do + view supervisee dashboards |
| **Practice Admin** | Office manager | Manage therapist accounts, billing, no clinical data access |
| **Client** | LoveRescue user | Controls what therapist sees, links/unlinks at will |

### 1.2 Client Linking Flow

```
1. Therapist generates unique invite code (or shareable link) from dashboard
2. Client opens LoveRescue app → Settings → "Connect to Therapist"
3. Client enters code → sees therapist name + credentials
4. Client selects sharing level (see §1.3)
5. Client confirms → link is active
6. Either party can revoke at any time (immediate effect)
```

**Couple linking:** Each partner links independently. Therapist sees "Couple View" only when BOTH partners have linked AND both have consented to couple-level data sharing. If one partner revokes, Couple View deactivates — therapist retains individual views for the consenting partner only.

### 1.3 Privacy Levels (Client-Configurable)

| Level | What Therapist Sees |
|-------|-------------------|
| **Minimal** | Assessment scores, activity completion (yes/no), crisis alerts only |
| **Standard** (default) | Above + mood trends, streak data, module progress, session prep summaries |
| **Full** | Above + journal entries, free-text responses, detailed interaction logs |
| **Custom** | Client toggles individual data categories on/off |

**Hard rules:**
- Private journal entries marked "therapist-hidden" are NEVER shared regardless of level
- Partner's data is never visible to the other partner's therapist unless both consent
- Client can change privacy level at any time; changes are logged but not alerted to therapist

---

## 2. CORE FEATURES (MVP)

### 2.1 Client Roster

**What it is:** Single-page view of all linked clients and couples.

**UI Spec:**
- Card-based layout, sortable/filterable
- Each card shows: client name(s), last activity date, next session date (if synced), risk level indicator (green/yellow/red), overall trend arrow (improving/stable/declining)
- Filter by: individual/couple, risk level, last active, assessment score range
- Search by name
- Quick actions: open dashboard, send message, generate report

**Data model:**
```
TherapistClient {
  id: UUID
  therapist_id: UUID (FK → Therapist)
  client_id: UUID (FK → User)
  couple_id: UUID? (FK → Couple, nullable for individual clients)
  linked_at: timestamp
  unlinked_at: timestamp?
  privacy_level: enum (minimal, standard, full, custom)
  custom_permissions: jsonb (for custom level)
  status: enum (active, paused, archived)
  consent_version: string
  consent_signed_at: timestamp
}
```

### 2.2 Progress Dashboard

**What it is:** Per-client longitudinal view of all tracked metrics.

**Components:**
1. **Assessment Score Timeline** — Line chart showing all assessment scores over time (DAS, CSI, Gottman Sound Relationship House, custom scales). Each data point clickable for detail.
2. **Activity Completion Rate** — Weekly/monthly bar chart of assigned vs completed activities
3. **Streak Tracker** — Current streak, longest streak, streak history
4. **Module Progress** — Which LoveRescue modules started/completed, time spent
5. **Mood Trend** — Daily mood check-in data visualized as rolling average

**Technical notes:**
- All charts use relative timestamps ("2 weeks before Session 5") to anchor to therapy timeline
- Export any chart as PNG or CSV
- Date range selector defaults to "since last session"

### 2.3 Couple View

**What it is:** Side-by-side partner comparison with interaction analysis.

**Components:**
1. **Dual Dashboard** — Partner A metrics on left, Partner B on right, same time axis
2. **Engagement Disparity** — Visual indicator when one partner is significantly more/less engaged
3. **Interaction Pattern Detection** — Algorithm flags:
   - **Pursue-Withdraw cycles** (one partner's engagement spikes while other's drops)
   - **Mutual avoidance** (both drop engagement simultaneously)
   - **Positive momentum** (both trending up)
   - **Conflict escalation signals** (rapid mood changes in both partners within same time window)
4. **Shared Activity Log** — Activities completed together vs individually
5. **Communication Pattern Summary** — Frequency/timing of in-app interactions between partners

**Algorithm: Pursue-Withdraw Detection**
```
Input: Partner A engagement score (daily), Partner B engagement score (daily)
Method:
  1. Compute 7-day rolling correlation between A and B engagement
  2. If correlation < -0.4 for > 14 days:
     - Identify pursuer (higher engagement variance) vs withdrawer (lower, declining)
     - Flag "Pursue-Withdraw Pattern Detected"
  3. Compute cross-correlation with lag to detect reactive patterns
  4. Output: pattern type, duration, severity (mild/moderate/severe), which partner is in which role
```

### 2.4 Session Prep Report

**What it is:** Auto-generated summary of everything that happened since the last session.

**Report structure:**
```markdown
# Session Prep Report
## Client: [Name] | Period: [Last Session Date] → [Today]

### ⚡ Alerts (if any)
- [Crisis flag triggered on DATE — details]
- [Risk score increased from X to Y]

### 📊 Assessment Changes
- DAS-7: 22 → 25 (+3, improving)
- Conflict Frequency: 4.2 → 3.8 (-0.4, improving)

### ✅ Activities Completed (X of Y assigned)
- Gottman Love Map exercise (completed Feb 8)
- Active Listening module (50% complete)
- Daily check-ins: 5/7 days

### 📈 Trends
- Mood: Stable with slight upward trend
- Engagement: Consistent (no drops)
- [Couple only] Interaction pattern: Moving from pursue-withdraw toward balanced

### 💬 Notable Entries (if Full sharing enabled)
- Journal entry Feb 7: "[First 50 chars]..." [click to expand]
- Free-text response Feb 9: "[First 50 chars]..."

### 🎯 Suggested Focus Areas
- Partner B hasn't completed any assigned activities (3 overdue)
- Conflict frequency still elevated despite improvement
- Consider: [AI-suggested module based on current data]
```

**Generation:** Triggered automatically 2 hours before scheduled session (if calendar synced) or on-demand via button.

### 2.5 Risk Alerts

**What it is:** Real-time notification system when crisis indicators trigger.

**Alert Levels:**

| Level | Trigger | Notification |
|-------|---------|-------------|
| 🟡 **Watch** | Mood drops >2 SD below baseline for 3+ days; engagement drops to zero for 5+ days | In-app badge, daily digest email |
| 🟠 **Elevated** | Crisis assessment score crosses threshold; free-text contains flagged keywords | Push notification + email within 1 hour |
| 🔴 **Critical** | Suicidal ideation detected; safety plan activated by client; domestic violence indicators | Immediate push + SMS + email; requires therapist acknowledgment within 4 hours |

**Therapist configuration:**
- Set custom thresholds per client
- Configure notification channels (push, email, SMS)
- Set "on-call" hours (outside hours, alerts queue unless Critical)
- Critical alerts always go through regardless of settings

**Compliance note:** Alert system is a clinical SUPPORT tool, not a substitute for safety planning. Terms of service explicitly state this. Therapist acknowledges this during onboarding.

### 2.6 Treatment Plan Builder

**What it is:** Therapist assigns specific LoveRescue content to clients, aligned with their therapeutic approach.

**Capabilities:**
1. **Module Assignment** — Browse LoveRescue content library, assign specific modules/activities to client
2. **Sequencing** — Set order and pacing ("Complete Module A before starting Module B")
3. **Due Dates** — Optional deadlines with reminder notifications to client
4. **Custom Activities** — Therapist creates custom homework assignments delivered through LoveRescue
5. **Therapeutic Framework Mapping** — Tag assignments by approach:
   - Gottman Method modules
   - EFT (Emotionally Focused Therapy) modules
   - CBT-based exercises
   - Attachment-focused activities
6. **Template Plans** — Save and reuse common treatment plans across clients

**Data model:**
```
TreatmentPlan {
  id: UUID
  therapist_id: UUID
  client_id: UUID
  name: string
  status: enum (draft, active, completed, archived)
  created_at: timestamp
  updated_at: timestamp
}

TreatmentPlanItem {
  id: UUID
  plan_id: UUID (FK → TreatmentPlan)
  module_id: UUID? (FK → LoveRescue Module)
  custom_content: jsonb? (for therapist-created activities)
  sequence_order: integer
  due_date: date?
  status: enum (pending, in_progress, completed, skipped)
  assigned_to: enum (partner_a, partner_b, both)
  therapeutic_tags: text[] (e.g., ['gottman', 'conflict-resolution'])
}
```

### 2.7 Outcome Measurement

**What it is:** Longitudinal tracking with exportable clinical reports.

**Supported Assessments:**
- DAS (Dyadic Adjustment Scale)
- CSI-16 / CSI-4 (Couples Satisfaction Index)
- PHQ-9 (depression screening)
- GAD-7 (anxiety screening)
- ORS (Outcome Rating Scale) / SRS (Session Rating Scale)
- Custom therapist-defined measures

**Report Types:**
1. **Progress Report** — Assessment scores over time with clinical significance indicators (Reliable Change Index, clinical cutoff lines)
2. **Treatment Summary** — Start-to-current or start-to-end summary for case closure
3. **Insurance/Managed Care Report** — Standardized format showing medical necessity, treatment progress, measurable outcomes
4. **Supervision Report** — Anonymized case summary for clinical supervision

**Export formats:** PDF, CSV, integration-ready JSON

### 2.8 Secure Messaging

**What it is:** HIPAA-compliant in-app messaging between therapist and client.

**Features:**
- Text messages with read receipts
- Therapist can share links to LoveRescue activities
- Canned responses / quick replies for common check-ins
- Auto-reply when therapist is unavailable (configurable)
- Message retention policy (configurable, default 1 year)
- NO video/voice in MVP (use existing telehealth tools)

**Technical requirements:**
- End-to-end encryption (Signal protocol or equivalent)
- Messages stored encrypted at rest (AES-256)
- Audit log for all message access
- Client can export their own message history
- Therapist can export for clinical record

---

## 3. ADVANCED FEATURES (V2)

### 3.1 AI Session Notes

**Flow:**
1. Therapist records session audio (in-app or uploads recording)
2. AI transcribes → generates structured progress note
3. Therapist reviews/edits → saves to record

**Note format (SOAP-compatible):**
```
Subjective: Client-reported concerns, mood, events since last session
Objective: Assessment scores, app engagement data, observable behavioral data
Assessment: Clinical formulation, pattern analysis, risk factors
Plan: Next steps, assigned activities, follow-up timeline
```

**Integration:** Export to SimplePractice, TherapyNotes, or any EHR via PDF or structured data.

### 3.2 Cross-Client Insights

**What it is:** Anonymized aggregate analytics across a therapist's caseload.

**Examples:**
- "72% of your couples showing pursue-withdraw patterns improve within 8 sessions"
- "Clients who complete >80% of assigned activities show 2x faster DAS improvement"
- "Your average treatment length: 14 sessions (field average: 12-20)"
- Module effectiveness ranking (which modules correlate with most improvement)

**Privacy:** All data fully anonymized, computed server-side, no individual client data exposed in aggregate views.

### 3.3 Supervision Mode

**Permissions model:**
- Supervisor invites supervisee therapist
- Supervisee grants access to specific cases (not blanket access)
- Supervisor sees read-only view of supervisee's dashboards for granted cases
- All access logged for compliance
- Client is notified that a supervisor has access (regulatory requirement in most states)

### 3.4 Insurance/Billing Integration

**Strategy:** Don't build billing. Integrate with existing EHRs.

**Integration targets (priority order):**
1. SimplePractice (250K+ users, dominant market share)
2. TherapyNotes (popular, strong documentation focus)
3. Jane App (growing, especially in physical therapy crossover)
4. Generic: PDF export + FHIR-compatible data for any EHR

**Integration scope:**
- Push: Treatment plans, progress notes, outcome reports → EHR
- Pull: Session dates, client demographics (for timeline anchoring)
- OAuth2-based authorization

### 3.5 Continuing Education

**Model:**
- Partner with CE accreditation bodies (APA, NBCC, ASWB)
- Therapists earn CE credits for completing training modules on evidence-based use of digital tools in therapy
- Content: "Integrating Digital Interventions in Couple Therapy" curriculum
- Credits validated through quiz completion + documented case application

---

## 4. COMPLIANCE & SECURITY

### 4.1 HIPAA Requirements

| Requirement | Implementation |
|-------------|---------------|
| **BAA** | Signed Business Associate Agreement with every therapist account. Template vetted by healthcare attorney. |
| **Encryption in transit** | TLS 1.3 for all API communication. Certificate pinning in mobile apps. |
| **Encryption at rest** | AES-256 encryption for all PHI in database. Encrypted backups. |
| **Access controls** | Unique user IDs, MFA required for therapist accounts, role-based permissions, automatic session timeout (15 min). |
| **Audit logging** | Every data access logged: who, what, when, from where. Logs retained 6 years (HIPAA minimum). Immutable append-only log store. |
| **Minimum necessary** | Therapist only accesses data for their linked clients at the consented privacy level. No blanket data access. |
| **Breach notification** | Automated breach detection. 60-day notification window (state laws may require faster). Incident response playbook documented. |
| **Data retention** | Configurable per therapist (default: 7 years after last activity, per state medical record retention laws). Client can request deletion (processed within 30 days, with exceptions for legal holds). |
| **Risk analysis** | Annual security risk assessment. Documented remediation plan. |

### 4.2 Consent Management

```
ConsentRecord {
  id: UUID
  client_id: UUID
  therapist_id: UUID
  consent_type: enum (data_sharing, messaging, crisis_alerts, couple_view)
  privacy_level: enum (minimal, standard, full, custom)
  custom_permissions: jsonb
  granted_at: timestamp
  revoked_at: timestamp?
  consent_version: string (tracks TOS version)
  ip_address: string
  device_info: string
  signature: string (digital signature hash)
}
```

**Client-facing consent flow:**
1. Plain-language explanation of what each privacy level shares
2. Examples of what therapist will/won't see
3. Explicit opt-in (no pre-checked boxes)
4. Confirmation screen with summary
5. Digital signature capture
6. Copy of consent emailed to client
7. Revocable at any time from Settings

### 4.3 Data Isolation

- **Multi-tenant architecture** with strict row-level security (RLS) in PostgreSQL
- Therapist A can NEVER access Therapist B's clients, even at the database level
- All API queries filtered by `therapist_id` at the middleware layer AND database layer (defense in depth)
- Supervisor access is a separate permission grant, not a bypass of isolation

### 4.4 Infrastructure

- **Cloud:** AWS (HIPAA-eligible services only) or GCP (Healthcare API)
- **Database:** PostgreSQL with RLS + pgcrypto for column-level encryption of sensitive fields
- **File storage:** S3 with server-side encryption (SSE-KMS), bucket policies restricting access
- **Messaging:** Dedicated encrypted message queue, not shared with consumer app infrastructure
- **Penetration testing:** Annual third-party pentest, results documented
- **SOC 2 Type II:** Target within 18 months of launch

---

## 5. TECHNICAL ARCHITECTURE

### 5.1 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
├──────────────┬──────────────┬───────────────────────────┤
│ LoveRescue   │ LoveRescue   │ Therapist Dashboard      │
│ Mobile App   │ Partner App  │ (React SPA)              │
│ (existing)   │ (existing)   │ [NEW]                    │
└──────┬───────┴──────┬───────┴────────────┬──────────────┘
       │              │                    │
       ▼              ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                           │
│         (Kong / AWS API Gateway + WAF)                  │
│         Rate limiting, auth, request routing            │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
│ Consumer API │ │ Therapist API│ │ Shared Services      │
│ (existing)   │ │ [NEW]        │ │                      │
│              │ │              │ │ • Auth (Therapist     │
│ • User data  │ │ • Dashboard  │ │   accounts + MFA)    │
│ • Activities │ │ • Reports    │ │ • Consent Manager    │
│ • Assessments│ │ • Messaging  │ │ • Audit Logger       │
│ • Crisis     │ │ • Treatment  │ │ • Notification Hub   │
│   detection  │ │   Plans      │ │ • Encryption Service │
└──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘
       │               │                     │
       ▼               ▼                     ▼
┌─────────────────────────────────────────────────────────┐
│                   DATA LAYER                             │
├──────────────────┬──────────────────────────────────────┤
│ Consumer DB      │ Therapist DB                         │
│ (existing PG)    │ [NEW — separate PG instance]         │
│                  │                                      │
│ • users          │ • therapists                         │
│ • couples        │ • therapist_clients (links)          │
│ • assessments    │ • consent_records                    │
│ • activities     │ • treatment_plans                    │
│ • mood_logs      │ • treatment_plan_items               │
│ • journals       │ • messages (encrypted)               │
│ • crisis_events  │ • session_prep_reports               │
│                  │ • audit_logs                         │
│                  │ • alert_configs                      │
│                  │ • outcome_reports                    │
└──────────────────┴──────────────────────────────────────┘
```

### 5.2 Key Design Decisions

1. **Separate Therapist DB:** PHI lives in its own database instance with stricter access controls, separate backups, and independent encryption keys. Consumer app DB is NOT HIPAA-scoped.

2. **Data Sync (not duplication):** Therapist API reads from Consumer DB through an internal service layer with consent-filtering middleware. No PHI is copied wholesale — only consented data points are materialized into therapist-readable views.

3. **Consent-Aware Data Access Layer:**
```python
class ConsentFilterMiddleware:
    def filter_client_data(self, therapist_id, client_id, data_request):
        consent = get_active_consent(therapist_id, client_id)
        if not consent:
            raise AccessDenied("No active consent")
        
        allowed_fields = PRIVACY_LEVEL_FIELDS[consent.privacy_level]
        if consent.privacy_level == 'custom':
            allowed_fields = consent.custom_permissions
        
        # Filter requested data to only allowed fields
        filtered = {k: v for k, v in data_request.items() if k in allowed_fields}
        
        # Log access
        audit_log.record(therapist_id, client_id, data_request.keys(), filtered.keys())
        
        return filtered
```

### 5.3 New API Endpoints

**Authentication & Account Management:**
```
POST   /therapist/auth/register       — Create therapist account
POST   /therapist/auth/login          — Login (returns JWT + MFA challenge)
POST   /therapist/auth/mfa/verify     — Complete MFA
POST   /therapist/auth/mfa/setup      — Configure MFA method
GET    /therapist/profile              — Get therapist profile
PUT    /therapist/profile              — Update profile
```

**Client Management:**
```
POST   /therapist/clients/invite       — Generate invite code
GET    /therapist/clients               — List linked clients
GET    /therapist/clients/:id           — Get client dashboard data
GET    /therapist/clients/:id/consent   — Get current consent status
DELETE /therapist/clients/:id/link      — Unlink client (therapist-initiated)
```

**Client-Side (in existing consumer API):**
```
POST   /user/therapist/link            — Link to therapist via code
DELETE /user/therapist/link/:id        — Revoke therapist access
PUT    /user/therapist/consent/:id     — Update privacy level
GET    /user/therapist/linked          — List linked therapists
```

**Dashboard & Reports:**
```
GET    /therapist/clients/:id/assessments     — Assessment timeline
GET    /therapist/clients/:id/activities      — Activity completion data
GET    /therapist/clients/:id/mood            — Mood trend data
GET    /therapist/clients/:id/streaks         — Streak data
GET    /therapist/couples/:id/view            — Couple comparison view
GET    /therapist/couples/:id/patterns        — Interaction pattern analysis
GET    /therapist/clients/:id/session-prep    — Generate session prep report
GET    /therapist/clients/:id/risk            — Current risk assessment
```

**Treatment Plans:**
```
POST   /therapist/plans                — Create treatment plan
GET    /therapist/plans                — List plans
GET    /therapist/plans/:id            — Get plan detail
PUT    /therapist/plans/:id            — Update plan
POST   /therapist/plans/:id/items      — Add item to plan
PUT    /therapist/plans/:id/items/:iid — Update item
DELETE /therapist/plans/:id/items/:iid — Remove item
POST   /therapist/plans/templates      — Save as template
GET    /therapist/plans/templates      — List templates
```

**Messaging:**
```
GET    /therapist/messages/:client_id           — Get message thread
POST   /therapist/messages/:client_id           — Send message
PUT    /therapist/messages/:client_id/:msg_id   — Edit message (within 5 min)
GET    /therapist/messages/unread                — Unread count
```

**Alerts:**
```
GET    /therapist/alerts                — List all alerts
GET    /therapist/alerts/:id            — Alert detail
PUT    /therapist/alerts/:id/ack        — Acknowledge alert
PUT    /therapist/clients/:id/alert-config — Configure alert thresholds
```

**Outcome Reports:**
```
POST   /therapist/reports/progress      — Generate progress report
POST   /therapist/reports/treatment     — Generate treatment summary
POST   /therapist/reports/insurance     — Generate insurance report
GET    /therapist/reports/:id           — Get generated report
GET    /therapist/reports/:id/export    — Export (PDF/CSV/JSON)
```

**Admin:**
```
GET    /therapist/audit-log             — View own audit log
GET    /admin/therapists                — Practice admin: list therapists
POST   /admin/therapists/invite         — Practice admin: invite therapist
```

### 5.4 Role-Based Access Control (RBAC)

```
Roles:
  therapist:
    - read: own linked clients (consent-filtered)
    - write: treatment plans, messages, alert configs
    - generate: reports for own clients
    - manage: own profile, own alert preferences
  
  supervisor (V2):
    - inherits: therapist
    - read: supervisee's granted client dashboards (read-only)
    - generate: supervision reports
  
  practice_admin:
    - manage: therapist accounts in practice
    - read: billing data, aggregate usage stats
    - NO access: clinical data
  
  system_admin:
    - manage: platform configuration
    - NO access: clinical data (enforced at DB level)
    - read: system audit logs, performance metrics
```

---

## 6. PRICING MODEL

### 6.1 Competitive Landscape

| Platform | Price | What It Does |
|----------|-------|-------------|
| SimplePractice | $49-$99/mo per clinician | Full EHR: scheduling, billing, notes, telehealth |
| TherapyNotes | $49-$59/mo per clinician | EHR: notes, billing, scheduling |
| Gottman Connect | ~$149/yr per couple (therapist assigns) | Assessment + exercises for couples |
| Mentalyc | $30-$50/mo | AI progress notes only |
| Blueprint (formerly Practice) | $0 (free for therapists) | Outcome measurement + assessments |

### 6.2 Our Positioning

We are NOT an EHR. We are a **clinical intelligence layer** for couple therapy. We complement SimplePractice/TherapyNotes, not compete.

### 6.3 Pricing Tiers

| Tier | Price | Includes |
|------|-------|---------|
| **Starter** (solo therapist) | **$0/mo** | Up to 5 linked clients, progress dashboard, basic assessments, session prep reports. No messaging, no risk alerts, no custom activities. |
| **Professional** | **$49/mo** | Unlimited clients, all MVP features, risk alerts, secure messaging, treatment plan builder, outcome reports, PDF export. |
| **Practice** | **$39/mo per clinician** (min 3) | Everything in Professional + practice admin dashboard, shared templates, cross-clinician aggregate insights, priority support. |
| **Enterprise** | **Custom pricing** | Everything in Practice + supervision mode, SSO/SAML, custom integrations, dedicated CSM, SLA, on-premise option. Training programs, university clinics. |

**Why free tier matters:**
- Gets therapists IN the ecosystem with zero friction
- 5-client limit creates natural upgrade path
- Every free therapist is a channel for acquiring consumer users ("ask your therapist about LoveRescue")
- Free therapists still drive client acquisition for the consumer app

**Client-side pricing impact:**
- Clients use LoveRescue free or paid tier as normal
- Therapist linking is available on ALL client tiers (including free)
- Premium client features (advanced assessments, detailed journals) naturally upsell when therapist requests more data

### 6.4 Revenue Projections (Conservative)

| Metric | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| Free therapists | 2,000 | 8,000 | 20,000 |
| Paid therapists | 200 | 1,200 | 5,000 |
| Avg revenue/paid therapist/mo | $47 | $45 | $43 |
| Monthly recurring revenue | $9,400 | $54,000 | $215,000 |
| Annual revenue | $113K | $648K | $2.58M |

---

## 7. MVP BUILD PLAN

### 7.1 Phase 1: Foundation (Weeks 1-6)

- [ ] Therapist auth system (registration, login, MFA)
- [ ] Therapist DB schema + migration
- [ ] Consent management system (client-side UI + API)
- [ ] Client linking flow (invite code generation + redemption)
- [ ] Privacy level configuration UI
- [ ] Audit logging infrastructure
- [ ] HIPAA-compliant hosting setup (AWS HIPAA-eligible)
- [ ] BAA template + digital signing flow

### 7.2 Phase 2: Core Dashboard (Weeks 7-12)

- [ ] Client roster UI
- [ ] Progress dashboard (assessment charts, activity completion)
- [ ] Consent-aware data access layer
- [ ] Basic couple view (side-by-side metrics)
- [ ] Session prep report generator
- [ ] PDF export for reports

### 7.3 Phase 3: Clinical Tools (Weeks 13-18)

- [ ] Treatment plan builder
- [ ] Module assignment + client notification
- [ ] Risk alert system (detection + notification pipeline)
- [ ] Secure messaging (encrypted, HIPAA-compliant)
- [ ] Outcome measurement + report generation

### 7.4 Phase 4: Polish & Launch (Weeks 19-22)

- [ ] Pursue-withdraw detection algorithm
- [ ] Interaction pattern analysis
- [ ] Therapist onboarding flow
- [ ] Beta testing with 10-20 therapists
- [ ] Security audit + penetration test
- [ ] Documentation + help center
- [ ] Launch to waitlist

**Total MVP timeline: ~5.5 months**

### 7.5 V2 Roadmap (Post-Launch)

| Feature | Target |
|---------|--------|
| AI Session Notes | Q3 2026 |
| SimplePractice integration | Q3 2026 |
| Supervision Mode | Q4 2026 |
| Cross-Client Insights | Q4 2026 |
| TherapyNotes integration | Q1 2027 |
| CE Credit program | Q2 2027 |

---

## 8. GO-TO-MARKET

### 8.1 Launch Strategy

1. **Waitlist + Beta** — Recruit 20 couple therapists for private beta. Target Gottman-certified therapists (they already value data-driven approaches).
2. **Free tier as wedge** — Launch free tier publicly. Therapist signs up in 2 minutes, links first client in 5.
3. **Conference presence** — APA Convention, AAMFT Conference, Gottman Roadshow events.
4. **Content marketing** — "How Digital Tools Are Transforming Couple Therapy" whitepaper series. CE-eligible webinars.
5. **Referral loop** — Client says "my therapist uses LoveRescue" → new client acquisition. Therapist says "try LoveRescue between sessions" → consumer growth.

### 8.2 Key Metrics

- Therapist sign-up rate
- Free → paid conversion rate (target: 10-15%)
- Clients linked per therapist (target: 8-12 average for paid)
- Session prep report generation frequency (proxy for clinical value)
- Therapist retention at 3/6/12 months (target: >85% at 12mo)
- NPS from therapists (target: >50)

---

## 9. RISK REGISTER

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| HIPAA breach | Low | Critical | SOC 2, annual pentests, encryption everywhere, breach insurance |
| Therapists don't adopt | Medium | High | Free tier removes friction; beta-test value prop; iterate on session prep report (highest-value feature) |
| Client privacy backlash | Medium | High | Client controls everything; transparent consent; "therapist-hidden" journal option |
| Liability for crisis alerts | Medium | High | Clear ToS: tool is clinical support, not clinical judgment. Legal review of alert language. |
| SimplePractice builds this | Low | Medium | Our moat: real-time between-session couple interaction data. They'd need to build a consumer app. |
| Regulatory changes | Low | Medium | Stay current with state telehealth/digital health laws. Legal counsel on retainer. |

---

## 10. OPEN QUESTIONS FOR STAKEHOLDER REVIEW

1. **Licensing verification:** Do we verify therapist credentials at signup, or honor system? (Recommendation: Verify — adds trust, creates moat, required for CE credits)
2. **International expansion:** HIPAA is US-only. Do we plan for GDPR/PIPEDA from the start? (Recommendation: Design for it, implement US-first)
3. **Individual therapy:** MVP focuses on couples. Do we support individual clients seeing a therapist? (Recommendation: Yes, it's simpler — just disable Couple View)
4. **White-labeling:** Do large practices/clinics want their own branded version? (Recommendation: Defer to Enterprise tier, evaluate demand)
5. **AI liability:** Who owns AI-generated session notes? What's the disclaimer? (Recommendation: "AI-assisted draft — therapist is solely responsible for clinical content")

---

*This spec is implementation-ready. Each section maps to specific engineering work. The data models are starter schemas — expect iteration during build. The API endpoints are the contract between frontend and backend teams. The timeline assumes a team of 3-4 engineers + 1 designer.*

**Next step:** Technical design review with engineering team → break Phase 1 into sprint-level tickets.

---
*Generated 2026-02-12 | LoveRescue Product Architecture*
