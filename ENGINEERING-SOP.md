# LoveRescue Engineering Standard Operating Procedure (SOP)

This SOP establishes a rigorous, mandatory framework for all engineers contributing to LoveRescue, ensuring the delivery of reliable, high-quality updates with minimal defects. LoveRescue is a relationship wellness platform deployed as a web application via Vercel (frontend) and Railway (backend), with production at https://loverescue.app. It incorporates AI agents for personalized coaching, necessitating specialized protocols for the AI team. Our commitment: Achieve near-zero defects in production by enforcing multi-layered quality gates, automation, and accountability. No change ships without passing all checks—violations result in review and potential corrective action. Engineers must internalize this SOP and review it at the start of every session. Updates to this SOP require team consensus and documentation.

## Core Principles

- **Zero-Tolerance for Production Breaks:** All processes prioritize prevention over reaction.
- **Automation-First:** Manual steps are minimized; leverage tools for consistency.
- **Accountability:** Every engineer signs off on changes; logs are auditable.
- **Continuous Improvement:** Conduct post-mortems on any escaped defects; refine this SOP quarterly.
- **Compliance:** Adhere to security best practices (e.g., OWASP) and data privacy (relationship data is sensitive—treat it with HIPAA-level care even though not medical).

## Core Values for Relationship Data

LoveRescue handles intimate relationship data. Additional safeguards:
- **Privacy-first:** Never log sensitive user content (assessments, check-ins, journal entries)
- **Consent-driven:** Partner matching/sync requires explicit opt-in from both users
- **Data minimization:** Collect only what's necessary for therapy features
- **Anonymization:** Analytics and error logs must strip identifying information

---

## The 14-Step Pipeline

All changes (features, fixes, refactors) follow this without exception:

### 1. 📋 PLAN
- Define scope, requirements, acceptance criteria, and risks
- Create a design doc outlining impacted areas (e.g., frontend, backend, database, AI strategy engine, assessments, matchup logic)
- **Therapy framework check:** Does this change align with expert research (Gottman, Brown, Johnson, etc.)?

### 2. 🧠 THINK
- Analyze solutions, edge cases, performance, security, and scalability
- Identify dependencies and potential regressions
- Use dependency graphs to assess broader impact
- **Relationship impact:** Could this change affect assessment scoring, strategy generation, or partner data sync?

### 3. ✅ DESIGN REVIEW (Grok)
- Submit design artifacts (diagrams, pseudocode) to Grok for AI-assisted feedback
- Iterate until resolved
- **Grok question:** "What could this break in the existing app?"

### 4. 👥 PEER DESIGN REVIEW
- Share design with at least one peer (Josh, Bryce, or designated reviewer)
- Incorporate feedback
- **For therapy features:** Run by SteveRogers (therapy brain) for framework validation

### 5. 🔨 BUILD
- Code in a feature branch (e.g., `feature/[ticket-id]-description`)
- Adhere to standards: linting, modular code, comments
- Commit standards: `[ticket-id] type: description` (e.g., `feat`, `fix`, `refactor`)
- No force pushes; squash commits on merge

### 6. 🧪 AUTOMATED UNIT/INTEGRATION TESTS
- Write and run tests (e.g., Jest for frontend, Mocha/Jest for backend)
- Aim for >90% coverage on new/changed code
- Run full regression suite on touched areas
- **Therapy-specific:** Test assessment scoring logic, strategy generation, matchup alignment calculations

### 7. 🔍 CODE QA (Grok)
- Use Grok for static analysis, bug detection, and optimizations
- Fix all high-severity issues
- Ask specifically: *"What could this break in the existing app?"*
- **Grok question:** "Could this expose sensitive relationship data in logs or error messages?"

### 8. 🛠️ FIX FINDINGS
- Resolve all automated and Grok review feedback
- Re-run through Grok if changes were significant

### 9. 🧪 LOCAL BUILD AND TEST VERIFICATION
- `cd frontend && npm run build` — must compile with zero errors
- `cd backend && npx tsc --noEmit` — must pass type checking
- Run full test suite locally: `npm test`
- Verify functionality and check console for errors
- **Database migration check:** If schema changed, test migration rollback

### 10. ⚙️ CI/CD PIPELINE RUN
- Push to `staging` branch; trigger automated CI (GitHub Actions if configured, or manual Vercel/Railway staging deploys)
- Lint, tests, security scans (Snyk/OWASP) must pass 100%

### 11. 👀 HUMAN QA ON STAGING
- Test end-to-end on staging environment (self + Josh/Bryce/designated QA)
- Include performance checks (page load <2s, API responses <500ms)
- Include mobile/responsive checks (emulate devices, touch events, layout shifts)
- **Relationship feature testing:**
  - [ ] Assessments calculate correct scores
  - [ ] Strategies generate personalized content
  - [ ] Check-ins save and display properly
  - [ ] Partner matchup/sync works (if applicable)
  - [ ] Coaching integration flows work
  - [ ] No sensitive data leaks in UI (e.g., partner's private journal entries)

### 12. 🔧 FIX ISSUES AND RETEST
- Iterate on staging until defect-free
- Re-run Grok QA on fixes
- Get explicit approval: **"Good to merge"** from Josh or Bryce

### 13. ✅ MERGE TO MAIN
- Merge only after all gates pass
- Triggers production deployment:
  - **Vercel:** Frontend + landing pages → loverescue.app
  - **Railway:** Backend API → api endpoint

### 14. 📊 POST-DEPLOYMENT MONITORING
- Monitor for 30 minutes post-deploy (Railway logs, Vercel Analytics, Sentry if configured)
- Roll back if anomalies detected; notify team immediately
- **User impact check:** Monitor for support tickets or user reports in first 24 hours

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
| **Security vulnerabilities block deployment** | Relationship data protection | Automated security scanning |
| **No hardcoded secrets** | Use Vercel/Railway env vars; scan for leaks | Automated secret scanning |
| **No force pushes** | Preserve git history integrity | Branch protection rules |
| **Never log sensitive user data** | Privacy violations destroy trust | Code review + log audits |

---

## 🔄 Comprehensive Regression Checklist

Run before any push or merge. Automate as much as possible. **All must pass:**

### Authentication
- [ ] Email/password login works
- [ ] OAuth login works (Google if implemented)
- [ ] Session management correct (token refresh, logout)
- [ ] Edge cases handled (expired tokens, revoked access, password reset)

### Core UI
- [ ] Dashboard loads without errors
- [ ] Navigation works (sidebar, tabs, back buttons)
- [ ] User profile displays correct data
- [ ] Progress rings/charts render properly
- [ ] Mobile/responsive layout correct (emulate devices, touch events, no layout shifts)

### Assessments
- [ ] All assessment types load (Gottman, EFT, Attachment, Love Language, etc.)
- [ ] Questions display in correct order
- [ ] Scoring calculations are accurate
- [ ] Results display with expert citations
- [ ] Assessment history persists correctly

### Weekly Strategies
- [ ] Solo strategy generation works (personalized daily activities)
- [ ] Matchup strategy generation works (if partner synced)
- [ ] Activities display with "why" explanations
- [ ] Expert citations are accurate
- [ ] Week progression works (Week 1 → Week 2, etc.)

### Check-Ins
- [ ] Daily/weekly check-ins save properly
- [ ] Progress tracking updates correctly
- [ ] Partner sync status displays accurately
- [ ] Historical check-ins display

### Partner Features (Matchup)
- [ ] Partner invite/sync flow works
- [ ] Both partners see correct shared data
- [ ] Privacy controls work (what partner can/cannot see)
- [ ] Notifications work (partner completed activity, etc.)

### Coaching Integration
- [ ] Coaching subscription flow works (Stripe if implemented)
- [ ] Coach assignment/messaging works
- [ ] Data sharing with coach follows privacy settings

### Quality
- [ ] Zero console errors/warnings on page load
- [ ] Network requests return expected data
- [ ] No sensitive data in console logs (e.g., assessment answers, journal entries)

### Performance
- [ ] Page load < 2 seconds
- [ ] API responses < 500ms
- [ ] Strategy generation < 1 second

### Security
- [ ] Input sanitization in place (prevent XSS, SQLi)
- [ ] User can only access their own data (no partner data leaks)
- [ ] API endpoints require authentication
- [ ] Sensitive endpoints (e.g., assessment results) require authorization

### Integrations
- [ ] Stripe checkout/billing flows work (if applicable)
- [ ] Email sending works (welcome, reset password, notifications)
- [ ] Third-party APIs respond correctly; error handling in place

### AI Strategy Engine
- [ ] Strategies are personalized (not generic)
- [ ] Expert citations are accurate (Gottman, Brown, Johnson, etc.)
- [ ] No hallucinations in generated content
- [ ] Fallback content works if AI unavailable

### Data Integrity
- [ ] Database queries return correct results
- [ ] No data corruption on CRUD operations
- [ ] Relationship data isolated per user (no cross-contamination)

### Accessibility
- [ ] Basic WCAG compliance (alt text, keyboard nav, screen reader support)

> If automated, require >95% pass rate; manual overrides need documented justification.

---

## 📁 Branch Strategy

```
main (production — loverescue.app)
  └── staging (testing — staging environment)
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

### For All AI Agents (SteveRogers, Vision, Donald, Bogey, etc.)
- Read this SOP at the start of every session when working on LoveRescue
- Always read existing code before generating new code
- Never assume a file exists — check first
- Never install new packages without checking if an alternative already exists
- Always run the build verification step before reporting success
- If you're unsure about something, ASK — don't guess
- Log all changes made in the PR description
- **Therapy framework compliance:** For features touching assessments, strategies, or expert content, verify alignment with research

### For SteveRogers (Therapy Brain)
- All therapy content (assessments, strategies, expert insights) must cite sources
- Cross-check new strategies against the 8-expert framework (Gottman, Brown, Johnson, Voss, Perel, Robbins, Chapman, Levine)
- Flag any content that could be misinterpreted as clinical advice
- Ensure "gentle startup" framing for any user-facing communication features

### For Subagents
- Include full file paths in your prompt (not "find the file")
- Specify the tech stack and conventions to follow
- Include "DO NOT" guardrails for common mistakes
- Verify output compiles before reporting success
- Reference existing patterns in the codebase

### AI Agent Accountability
- Every AI-generated change must be traceable to a specific agent
- Commit messages must include the agent name: `feat(steverogers): add real talk mode`
- If an AI agent introduces a regression, document it in `tasks/lessons.md` with the pattern to avoid
- Never deploy unversioned model changes; require A/B testing on staging for agent updates

### AI-Specific Testing
- Use mocks for inputs; simulate production traffic
- Track model versions in a separate repo; tag releases
- Ethical checks: scan for biases; ensure safe outputs
- Metrics: response time, accuracy (>95%), relevance — include in CI
- Always have non-AI fallback paths for critical features (e.g., if strategy generation fails, show default content)

---

## 🏗️ Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | React (Create React App), Tailwind CSS, Recharts, Lucide icons |
| Backend | Express, Prisma ORM, PostgreSQL |
| Auth | Email/password (bcrypt), Google OAuth (if implemented) |
| Payments | Stripe Checkout/Subscriptions (for coaching) |
| Hosting | Vercel (frontend + landing), Railway (backend + database) |
| CI/CD | GitHub Actions (if configured), Vercel auto-deploy, Railway auto-deploy |
| Code Quality | ESLint, Prettier, TypeScript (partial) |
| Monitoring | Railway logs, Vercel Analytics, Sentry (if configured) |
| Security | Snyk/OWASP scanning (if configured), secret scanning |

---

## 📞 Escalation & Incident Response

### If You're Stuck
1. **Stop pushing code** — don't make it worse
2. **Document what happened** (what broke, what you tried, error logs)
3. **Notify Josh or Bryce in the LoveRescue group chat** immediately
4. **Wait for guidance** — don't keep hacking at it

### Incident Response (Production Issues)
1. **Detect** — monitoring alerts (Railway logs, user reports)
2. **Contain** — immediate rollback to last known good state
3. **Analyze** — full post-mortem with root cause
4. **Prevent** — update this SOP with learnings

### Rollback Procedure

**Frontend (Vercel):**
```bash
# Via Vercel dashboard:
# Deployments → Find last known good → Promote to Production
# OR via CLI:
cd frontend && vercel --prod --yes
```

**Backend (Railway):**
```bash
# Via Railway dashboard:
# Deployments → Find last known good → Rollback
# OR redeploy from git:
git log --oneline main -10
git reset --hard <good-commit-hash>
git push --force origin main  # (only in emergency)
```

**Database Migration Rollback:**
```bash
cd backend
npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 📊 Metrics & Accountability

Track monthly:
- **Defect escape rate:** Target < 1% (bugs reaching production)
- **Staging rejection rate:** Track to identify training needs
- **Mean time to recovery (MTTR):** Target < 15 minutes
- **Deployment frequency:** Track velocity
- **Test coverage on new code:** Target > 90%
- **User impact:** # of users affected by defects, support ticket volume

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
- **Therapy content citations:** If adding/modifying expert content, include sources in `steve-rogers/INSIGHTS.md` or relevant files

---

## 🔄 SOP Review Cadence

- **Quarterly:** Full team review and update of this SOP + workshops
- **After any production incident:** Immediate post-mortem and SOP amendment
- **After any new tool/process adoption:** Update relevant sections
- **New team members:** Shadow deployments before solo work

---

## 🧑‍⚕️ Therapy Feature-Specific Guidelines

### Assessment Changes
- **Scoring logic:** Never change without validating against research
- **Question wording:** Run by SteveRogers for clinical accuracy
- **New assessments:** Must cite expert source (e.g., "Based on Gottman's Sound Relationship House")

### Strategy Generation
- **Expert attribution:** Every strategy must cite an expert (Gottman, Brown, Johnson, etc.)
- **Personalization:** Strategies should adapt to user's assessment results
- **Fallback content:** Always have generic strategies if personalization fails

### Partner Matchup
- **Privacy:** Default to private; explicit opt-in for sharing
- **Data isolation:** Partner A cannot see Partner B's private data without consent
- **Sync logic:** Test both sides of matchup (what each partner sees)

### Coaching Features
- **Data sharing:** Coach can only see what user explicitly permits
- **Billing:** Test full Stripe flow (subscribe, cancel, refund)
- **Communication:** Messages between user and coach must be encrypted/private

---

## ⚠️ Common Pitfalls (Learn from Past Mistakes)

Document these in `tasks/lessons.md` as they occur:

- **"It's just a copy change"** → Copy changes can break layout, translations, or SEO
- **"I only touched the frontend"** → Frontend changes can break API contracts
- **"I tested on my machine"** → Always test on staging with real data
- **"No one uses that feature"** → Every feature has at least one power user who will notice
- **"The tests pass"** → Tests can be wrong or incomplete; manual QA is required
- **"I added console.log for debugging"** → Never commit debug logs; they expose data in production

---

## 🎯 Definition of Done

A change is NOT done until:
- [ ] All 14 pipeline steps completed
- [ ] All regression tests pass
- [ ] Peer review approved
- [ ] Staging QA approved ("Good to merge")
- [ ] Merged to `main`
- [ ] Production deployment successful
- [ ] 30-minute monitoring period complete with no anomalies
- [ ] Documentation updated

---

*Last updated: 2026-02-25*  
*Approved by: Josh Cohen, Bryce Morgan*  
*Enforced by: Everyone. No exceptions.*  
*"It's just a small change" is the most dangerous sentence in software engineering.*
