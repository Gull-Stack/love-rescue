# SuperTool Engineering Standard Operating Procedure (SOP)

This SOP establishes a rigorous, mandatory framework for all engineers contributing to SuperTool, ensuring the delivery of reliable, high-quality updates with minimal defects. SuperTool is a customer engagement platform deployed as a web application via Vercel, with staging at https://supertool-staging.vercel.app and production at mysupertool.app. It incorporates AI agents, necessitating specialized protocols for the AI team. Our commitment: Achieve near-zero defects in production by enforcing multi-layered quality gates, automation, and accountability. No change ships without passing all checks—violations result in review and potential corrective action. Engineers must internalize this SOP and review it at the start of every session. Updates to this SOP require team consensus and documentation.

## Core Principles

- **Zero-Tolerance for Production Breaks:** All processes prioritize prevention over reaction.
- **Automation-First:** Manual steps are minimized; leverage tools for consistency.
- **Accountability:** Every engineer signs off on changes; logs are auditable.
- **Continuous Improvement:** Conduct post-mortems on any escaped defects; refine this SOP quarterly.
- **Compliance:** Adhere to security best practices (e.g., OWASP) and data privacy (e.g., GDPR for customer data).

## The 14-Step Pipeline

All changes (features, fixes, refactors) follow this without exception:

### 1. 📋 PLAN
- Define scope, requirements, acceptance criteria, and risks
- Create a design doc outlining impacted areas (e.g., frontend, backend, database, AI integrations)

### 2. 🧠 THINK
- Analyze solutions, edge cases, performance, security, and scalability
- Identify dependencies and potential regressions
- Use dependency graphs to assess broader impact

### 3. ✅ DESIGN REVIEW (Grok)
- Submit design artifacts (diagrams, pseudocode) to Grok for AI-assisted feedback
- Iterate until resolved

### 4. 👥 PEER DESIGN REVIEW
- Share design with at least one peer (e.g., via PR or meeting)
- Incorporate feedback

### 5. 🔨 BUILD
- Code in a feature branch (e.g., `feature/[ticket-id]-description`)
- Adhere to standards: linting, modular code, comments
- Commit standards: `[ticket-id] type: description` (e.g., `feat`, `fix`, `refactor`)
- No force pushes; squash commits on merge

### 6. 🧪 AUTOMATED UNIT/INTEGRATION TESTS
- Write and run tests (e.g., Jest for frontend, Pytest for backend/AI)
- Aim for >90% coverage on new/changed code
- Run full regression suite on touched areas

### 7. 🔍 CODE QA (Grok)
- Use Grok for static analysis, bug detection, and optimizations
- Fix all high-severity issues
- Ask specifically: *"What could this break in the existing app?"*

### 8. 🛠️ FIX FINDINGS
- Resolve all automated and Grok review feedback
- Re-run through Grok if changes were significant

### 9. 🧪 LOCAL BUILD AND TEST VERIFICATION
- `cd frontend && npx next build` — must compile with zero errors
- `cd backend && npx tsc --noEmit` — must pass type checking
- Run full test suite locally
- Verify functionality and check console for errors

### 10. ⚙️ CI/CD PIPELINE RUN
- Push to staging branch; trigger automated CI (e.g., GitHub Actions/Vercel): lint, tests, security scans (Snyk/OWASP)
- Must pass 100%

### 11. 👀 HUMAN QA ON STAGING
- Test end-to-end on https://supertool-staging.vercel.app (self + Bryce/Josh/designated QA)
- Include performance checks (page load <2s, API responses <500ms)
- Include mobile/responsive checks (emulate devices, touch events, layout shifts)

### 12. 🔧 FIX ISSUES AND RETEST
- Iterate on staging until defect-free
- Re-run Grok QA on fixes
- Get explicit approval: **"Good to merge"**

### 13. ✅ MERGE TO MAIN
- Merge only after all gates pass
- Triggers production deployment to mysupertool.app

### 14. 📊 POST-DEPLOYMENT MONITORING
- Monitor for 30 minutes post-deploy (e.g., Vercel Analytics, Sentry)
- Roll back if anomalies detected; notify team immediately

---

## 🚫 Hard Rules

Non-negotiable enforcements, automated where possible (e.g., via GitHub branch protection):

| Rule | Why | Enforcement |
|------|-----|-------------|
| **Never push directly to `main`** | Production is sacred | Branch protection rules |
| **Never skip Grok QA** | Second-AI review catches what you miss | PR checklist requirement |
| **Never deploy without a build check** | If it doesn't compile, it doesn't ship | CI/CD gate |
| **Never say "it's just a small change"** | Small changes break big things | Same pipeline for all changes |
| **Never leave silent failures** | If an API call can fail, show the user an error | Code review enforcement |
| **Always check what else uses the code you're changing** | Regressions come from not checking dependencies | Design review step |
| **Always test the happy path AND the error path** | Users will find every edge case you didn't | QA checklist |
| **All tests must pass before merge** | Automated quality gate | CI required status checks |
| **Security vulnerabilities block deployment** | Customer data protection | Automated security scanning |
| **No hardcoded secrets** | Use Vercel env vars; scan for leaks | Automated secret scanning |
| **No force pushes** | Preserve git history integrity | Branch protection rules |

---

## 🔄 Comprehensive Regression Checklist

Run before any push or merge. Automate as much as possible. **All must pass:**

### Authentication
- [ ] Login flows (OAuth, email) work
- [ ] Session management correct
- [ ] Edge cases handled (expired tokens, revoked access)

### Core UI
- [ ] Project/account switcher works (switch between tenants, data isolation)
- [ ] Sidebar navigation works (no scroll issues, links work, permissions respected)
- [ ] Dashboard loads without errors, all visualizations render

### Quality
- [ ] Zero console errors/warnings on page load
- [ ] Network requests return expected data
- [ ] Mobile/responsive layout correct (emulate devices, touch events, no layout shifts)

### Performance
- [ ] Page load < 2 seconds
- [ ] API responses < 500ms

### Security
- [ ] Input sanitization in place
- [ ] No XSS/SQLi vectors introduced

### Integrations
- [ ] Stripe checkout/billing flows unaffected (if applicable)
- [ ] Email sending still works (if applicable)
- [ ] Third-party APIs respond correctly; error handling in place

### AI Agents (if applicable)
- [ ] Prompt validation passes
- [ ] Response accuracy acceptable (use benchmarks)
- [ ] Hallucination detection checks pass

### Data Integrity
- [ ] Database queries return correct results
- [ ] No data corruption on CRUD operations

### Accessibility
- [ ] Basic WCAG compliance (alt text, keyboard nav)

> If automated, require >95% pass rate; manual overrides need documented justification.

---

## 📁 Branch Strategy

```
main (production — mysupertool.app)
  └── staging (testing — supertool-staging.vercel.app)
        └── feature/[ticket-id]-description (individual work)
        └── hotfix/[ticket-id]-description (urgent production fixes)
```

- **`main`** = production, only receives tested code from staging via PR
- **`staging`** = integration branch, always deployable to staging environment
- **`feature/*`** = individual feature/fix branches, merge into staging via PR
- **`hotfix/*`** = urgent production fixes, merge into both main AND staging
- Delete feature/hotfix branches after merge
- No force pushes; squash commits on merge

---

## 🤖 AI Agent-Specific Rules

### For All AI Agents (Tony, Vision, Melvin, Bogey, Donald)
- Read this SOP at the start of every session when working on SuperTool
- Always read existing code before generating new code
- Never assume a file exists — check first
- Never install new packages without checking if an alternative already exists
- Always run the build verification step before reporting success
- If you're unsure about something, ASK — don't guess
- Log all changes made in the PR description
- Enforce rate limiting/throttling to prevent overload

### For Subagents
- Include full file paths in your prompt (not "find the file")
- Specify the tech stack and conventions to follow
- Include "DO NOT" guardrails for common mistakes
- Verify output compiles before reporting success
- Reference existing patterns in the codebase

### AI Agent Accountability
- Every AI-generated change must be traceable to a specific agent
- Commit messages must include the agent name: `feat(donald): add dashboard command center`
- If an AI agent introduces a regression, document it in `tasks/lessons.md` with the pattern to avoid
- Never deploy unversioned model changes; require A/B testing on staging for agent updates

### AI-Specific Testing
- Use mocks for inputs; simulate production traffic
- Track model versions in a separate repo; tag releases
- Ethical checks: scan for biases; ensure safe outputs
- Metrics: response time, accuracy (>95%), relevance — include in CI
- Always have non-AI fallback paths for critical features

---

## 🏗️ Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, Tailwind CSS, Recharts, Lucide icons |
| Backend | Express, Prisma ORM, PostgreSQL |
| Auth | Google SSO (unified profile+email+Gmail+Calendar) |
| Payments | Stripe Connect (Destination Charges) |
| Hosting | Vercel (frontend), Railway (backend) |
| CI/CD | GitHub Actions, Vercel auto-deploy |
| Code Quality | SonarQube (TBD), ESLint, TypeScript strict |
| Monitoring | Vercel Analytics, Sentry (TBD) |
| Security | Snyk/OWASP scanning, secret scanning |

---

## 📞 Escalation & Incident Response

### If You're Stuck
1. **Stop pushing code** — don't make it worse
2. **Document what happened** in `tasks/todo.md` (what broke, what you tried, error logs)
3. **Notify the SuperTool group chat** immediately
4. **Wait for guidance** — don't keep hacking at it

### Incident Response (Production Issues)
1. **Detect** — monitoring alerts (Vercel Analytics, Sentry, user reports)
2. **Contain** — immediate rollback to last known good state
3. **Analyze** — full post-mortem with root cause
4. **Prevent** — update this SOP and `tasks/lessons.md` with learnings

### Rollback Procedure
```bash
# Find the last good commit
git log --oneline main -10

# Reset to it
git reset --hard <good-commit-hash>
git push --force origin main

# Redeploy
cd frontend && vercel --prod --yes
```

---

## 📊 Metrics & Accountability

Track monthly:
- **Defect escape rate:** Target < 1% (bugs reaching production)
- **Staging rejection rate:** Track to identify training needs
- **Mean time to recovery (MTTR):** Target < 15 minutes
- **Deployment frequency:** Track velocity
- **Test coverage on new code:** Target > 90%

### Enforcement
- **Weekly:** Review PRs/deployments for SOP compliance
- **Violations:** Documented in tickets; repeated issues trigger training or access restrictions

---

## 📚 Documentation Requirements

With every PR, update as applicable:
- README and API specs
- Changelogs
- Inline code comments for complex logic
- This SOP (if process changes are needed)

---

---

## 🛡️ Guardian Protocol – Data Integrity Addendum v1.0

*Enacted: 2026-03-03. Zero tolerance for hardcoded business metrics in production paths.*

**Goal:** Dashboard trust score 100%. Hardcoded metric incidents = 0. Measured by CI pass rate + quarterly audit.

**Golden Rule:** *"If it shows a number that influences a money decision, it ships from the DB or it doesn't ship."*

### Core Rules (Data Edition)

1. **User-First Data Fidelity:** Every KPI/trend/card starts with "Does this number drive revenue/user decisions?" If yes → API only. PR template field: "Data source: [API endpoint or N/A]".

2. **Trace Before Touch:** Full data flow trace (component → hook → API → DB). Mermaid diagram required for any new stat card.

3. **Verify Every Commit:** Local grep for numeric literals near `trend|%|$|kpi`. CI action must pass. Include screenshot of clean grep in PR.

4. **Atomic Data Fixes:** One hardcoded removal per PR. Verify local → staging → canary (5-min smoke). Ticket closes only after prod check + telemetry confirmation.

5. **Root-Cause Mandate:** Repeat offender (same file twice)? 5-why + architecture review. Auto-flag via Git blame overlap in review bot.

6. **Pre-Flight Checklist (Data Edition):**
   - [ ] No hardcoded %/numbers in JSX (grep passed)
   - [ ] All trends from API or feature-flagged
   - [ ] Verified on Chrome + Safari + mobile viewport
   - [ ] Telemetry added for this metric
   - [ ] Security scan on new endpoints

7. **QA Gate:** Automated data audit + Vision/Grok human sign-off on branch BEFORE merge. No skips without Thor's override (logged).

8. **Ask, Don't Assume:** "Is this number real?" in every standup touching dashboard. Escalate missing endpoints within 30 mins.

9. **Failure Logging:** Immediate `lessons.md` entry tagged `#hardcoded #dashboard #data-purity`. Standup review. Track "repeat rate" monthly.

10. **Architecture Fidelity:** Reuse KpiCard pattern only. Linter rule: ban numeric literals in dashboard `*.tsx` except constants from API responses.

### Enforcement Stack

- **CI/CD Rule:** GitHub Action `data-purity-scan` on every dashboard PR. Fail build on hits.
- **Rollback Rule:** All metric changes include instant revert via feature flag.
- **Automation Rule:** Quarterly full audit via Vision + grep/AST scan.
- **Scope Expansion:** Apply to entire frontend within 30 days (start with forms & reports).

### v1.2 – Phase 2 Complete (2026-03-03)

- Real `/api/tenant/contracts/trends` endpoint live with all 6 metrics (total, pending, accepted, declined, avgValue, acceptanceRate)
- All quotes stat cards now show real period-over-period deltas from DB
- Zero hardcoded metrics remain in dashboard
- **Success metric hit:** Dashboard trust = 100%. Hardcoded incidents = 0.
- **Next audit:** 2026-04-01
- **Note:** LoveRescue module pages still use mock data (separate backlog, not dashboard-critical)

### v1.3 – Command Center Fortress Complete (2026-03-03)

- All zero-value fakes deleted from backend (`commandCenter.ts` + `insights.ts`)
- Success insights live: `critical → success → warning → info` sort order
- Conditional renders everywhere — no more `$0 of $0 budget` or `0% click rate`
- Revenue progress bar with API-driven threshold coloring
- atRisk thresholds now from API, not hardcoded 10/25
- Email engagement subtitle shows real sent count instead of fake click rate
- **Success metric:** Zero misleading metrics across entire dashboard. CI gate blocks future violations.
- **Next:** Phase 4 integrations backlog (Google Ads, click tracking, reviews, GA4, retention trend)

---

## 🔄 SOP Review Cadence

- **Quarterly:** Full team review and update of this SOP + workshops
- **After any production incident:** Immediate post-mortem and SOP amendment
- **After any new tool/process adoption:** Update relevant sections
- **New team members:** Shadow deployments before solo work

---

*Last updated: 2026-02-25*
*Approved by: Josh Cohen, Bryce Morgan*
*Enforced by: Everyone. No exceptions.*
