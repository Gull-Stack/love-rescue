# Federal Grant Landscape for Love Rescue

Researched July 2026. Two honest framing notes up front:

1. **"Medical grants" reality-check.** Love Rescue's mission (relationship restoration for
   underserved communities) maps to *family-strengthening* and *behavioral-health* funding,
   not clinical/medical funding. Most HRSA/NIH "medical" money requires being a licensed
   clinical provider (FQHC, clinic, university). The winnable federal lanes for Love Rescue
   are **ACF family-strengthening programs** and, with clinical partnerships, **SAMHSA
   behavioral-health programs**.
2. **Brand-new orgs rarely win federal grants in year one.** Federal review criteria weight
   organizational capacity, audited financials, and past performance. The standard path:
   incorporate → 501(c)(3) → run programs on donations/foundation money for 1–2 years →
   then compete federally, or **subcontract under an existing grantee now** (fastest money).

---

## Tier 1 — Best mission fit (ACF, Administration for Children & Families)

### Healthy Marriage & Responsible Fatherhood (HMRF) — ~$150M/year
- The flagship federal program for exactly Love Rescue's mission: marriage/relationship
  education targeting underserved communities. Nonprofits (including faith-based) are eligible.
  ([ACF HMRF](https://acf.gov/ofa/programs/healthy-marriage-responsible-fatherhood))
- Three tracks: **HEART** (adult healthy relationships, 32 grantees), **FORGE Fatherhood**
  (50 grantees), **READY4Life** (youth 14–24 relationship education, 27 grantees;
  [opportunity listing](https://simpler.grants.gov/opportunity/355695)).
- **Timing problem:** the current 5-year cohort was awarded **Sept 29, 2025 (runs to 2030)**.
  The next full competition is likely **~2029–2030**.
- **What to do now:**
  - Find the HEART/READY4Life grantees serving your region on the
    [grantee map](https://acf.gov/ofa/map/healthy-marriage-responsible-fatherhood-grantee-locations)
    and pitch Love Rescue as a **subrecipient/partner** (curriculum + app platform). This is
    the realistic near-term federal revenue path.
  - Subscribe to the opportunity on Grants.gov so any supplemental or replacement NOFO
    (grantees do drop out mid-cycle) alerts you immediately.

### ED/HHS Family Engagement and School Support partnership (FY 2026, active)
- New FY2026 competitions (Ready to Learn, Promise Neighborhoods, more "later this spring")
  around family engagement and community-based student support
  ([ED press release](https://www.ed.gov/about/news/press-release/us-department-of-education-and-us-department-of-health-and-human-services-announce-first-grant-competitions-under-family-engagement-and-school)).
  Watch for the follow-on competitions — a relationship-skills curriculum for underserved
  families is adjacent enough to partner into.

## Tier 2 — Behavioral health (SAMHSA) — requires clinical capacity or partners

- FY2026: SAMHSA + HRSA + CDC + NIH administer **$13B+** in mental-health grants. In June
  2026 SAMHSA announced **$40M across 8 programs** (addiction prevention, child trauma,
  suicide prevention, mental illness)
  ([HHS announcement](https://www.hhs.gov/press-room/samhsa-announces-funding-opportunities-prevent-addiction-child-trauma-suicide-mental-illness.html)).
- Track open + forecasted NOFOs on the
  [SAMHSA grants dashboard](https://www.samhsa.gov/grants/grants-dashboard) and
  [FY2026 forecast](https://www.samhsa.gov/grants/grants-dashboard/forecasts).
- Example: [CCBHC planning/development grants](https://www.samhsa.gov/grants/grant-announcements/sm-26-014)
  (up to $1M/yr) — requires being/partnering with a behavioral-health clinic. Love Rescue's
  therapist-practice features (see `PHYSIO-INTEGRATION-PLAN.md`, therapist suite work) make a
  **technology-partner** role plausible with a community mental-health center as lead applicant.

## Tier 3 — HRSA (only with licensed-provider partnerships)

- HRSA funds behavioral-health workforce (BHWET, up to $1.5M, universities) and community
  health centers (Section 330 FQHCs; behavioral-health supplements $250–500k). Love Rescue
  can't be a lead applicant but can be a services/technology partner to an FQHC serving
  underserved patients. Browse at [HRSA Find Grant Funding](https://www.hrsa.gov/grants/find-funding).

## Tier 4 — Non-federal money to bridge years 1–2

Federal grants won't fund the startup phase. Fastest viable funding for a new 501(c)(3):
community foundations in your metro, United Way chapters, marriage/family-focused private
funders, donated services (Google Ad Grants gives 501(c)(3)s $10k/mo in free ads — natural
fit with the marketing tooling already in this repo), and individual giving through the app.

---

## Live open & forecasted opportunities (queried from the Grants.gov API, July 18, 2026)

Pulled directly from `api.grants.gov/v1/api/search2`. The re-runnable query script is in
`tools/grants-search.md`. Best-fit rows first:

| Opportunity | Program | Agency | Status | Close date | Fit |
|---|---|---|---|---|---|
| HHS-2026-ACF-ACYF-SR-0012 | General Departmental Sexual Risk Avoidance Education (SRAE) — includes **healthy relationship education for youth** | ACF/FYSB | **Posted** | **08/17/2026** | High — nonprofits eligible, mission-adjacent (youth relationship skills) |
| HHS-2026-ACF-ACYF-AK-0014 | Competitive Personal Responsibility Education Program (PREP) | ACF/FYSB | **Posted** | **08/17/2026** | High — youth relationship/life-skills education |
| HHS-2026-ACF-ACYF-AP-0003 | PREP Innovative Strategies (PREIS) | ACF/FYSB | **Posted** | **08/18/2026** | High — innovation track suits an app-based model |
| HHS-2026-ACF-ACYF-TS-0013 | Title V Competitive SRAE | ACF/FYSB | Posted | 08/17/2026 | Medium-high |
| SM-26-014 | CCBHC Planning, Development & Implementation (≤$1M/yr) | SAMHSA | Posted | 08/17/2026 | Medium — needs clinical partner as lead |
| SM-26-015 | CCBHC Improvement & Advancement | SAMHSA | Posted | 08/17/2026 | Medium — partner role only |
| HHS-2026-ACF-OFA-PG-0059 | National Research Center for Promoting Work and **Strong Families** | ACF/OFA | Forecasted | opens ~05/2026 | Medium — research-center scale |
| HHS-2026-ACF-ACYF-CF-0004 | Kinship Navigator Programs: Evaluations | ACF/CB | Posted | 08/07/2026 | Low-medium |
| HHS-2026-ACF-OFVPS-EV-0010 | National Resource Centers (family violence prevention) | ACF/OFVPS | Forecasted | ~05/13/2026 | Low-medium |
| PA-FPH-27-001 | Title X Family Planning Services | HHS/OPHS | Posted | 01/11/2027 | Low — clinical services required |

**Read on the August 17–18 cluster:** the ACF youth programs (SRAE/PREP/PREIS) are the only
posted, mission-fit opportunities a nonprofit Love Rescue could pursue this cycle — but the
501(c)(3) + SAM.gov pipeline takes ~6–10 weeks, which lands almost exactly on the deadline.
Realistic play: partner as a subrecipient/curriculum-tech provider with an established
applicant this cycle, and be registration-ready to apply directly next cycle.

## Registration pipeline (start the day the EIN arrives)

Required before ANY federal application, all free
([Grants.gov registration](https://www.grants.gov/applicants/applicant-registration),
[organization registration](https://www.grants.gov/applicants/applicant-registration/organization-registration)):

1. **SAM.gov entity registration** — needs EIN, exact IRS legal name, physical street
   address, and bank info. Issues the **Unique Entity ID (UEI)**. Allow **up to 10 business
   days** to activate; **renew annually** or applications are blocked.
2. Designate the **EBiz POC** (Electronic Business Point of Contact) in SAM.gov.
3. **Grants.gov account** — the EBiz POC authorizes users to submit for the org.
4. Optional but wise: set saved searches/alerts on Grants.gov for "healthy marriage,"
   "relationship education," "family strengthening," "behavioral health."

## Recommended application strategy (in order)

1. **Now:** finish 501(c)(3); contact 2–3 current HMRF grantees in-state about subawards.
2. **EIN + determination letter in hand:** SAM.gov + Grants.gov registration; Google Ad
   Grants; community-foundation letters of inquiry.
3. **Next 12 months:** partner (as tech/curriculum provider) into one SAMHSA or ED
   application led by an established clinic/school partner; build the evaluation data
   (the app's analytics are an asset — federal reviewers want measurable outcomes).
4. **2029–2030:** compete directly for the next HMRF cohort with 3+ years of track record.

## Sources

- [ACF — Healthy Marriage & Responsible Fatherhood](https://acf.gov/ofa/programs/healthy-marriage-responsible-fatherhood) · [About](https://acf.gov/ofa/programs/healthy-marriage-responsible-fatherhood/about) · [Grantee map](https://acf.gov/ofa/map/healthy-marriage-responsible-fatherhood-grantee-locations)
- [Grants.gov — READY4Life listing](https://simpler.grants.gov/opportunity/355695) · [HMRF CFDA 93.086](https://taggs.hhs.gov/Detail/CFDADetail?arg_CFDA_NUM=93086)
- [SAMHSA — Grants dashboard](https://www.samhsa.gov/grants/grants-dashboard) · [FY2026 forecasts](https://www.samhsa.gov/grants/grants-dashboard/forecasts) · [CCBHC NOFO](https://www.samhsa.gov/grants/grant-announcements/sm-26-014)
- [HHS — June 2026 SAMHSA $40M announcement](https://www.hhs.gov/press-room/samhsa-announces-funding-opportunities-prevent-addiction-child-trauma-suicide-mental-illness.html)
- [ED — Family Engagement and School Support FY2026](https://www.ed.gov/about/news/press-release/us-department-of-education-and-us-department-of-health-and-human-services-announce-first-grant-competitions-under-family-engagement-and-school)
- [Grants.gov — Applicant registration](https://www.grants.gov/applicants/applicant-registration) · [Organization registration](https://www.grants.gov/applicants/applicant-registration/organization-registration)
