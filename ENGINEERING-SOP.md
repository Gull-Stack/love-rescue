# LoveRescue Engineering Standard Operating Procedure (SOP)

This SOP establishes a rigorous, mandatory framework for all engineers contributing to LoveRescue, ensuring the delivery of reliable, high-quality updates with minimal defects. LoveRescue is a relationship wellness platform deployed as a web application via Vercel (frontend) and Railway (backend), serving users dealing with sensitive emotional and relationship data. Our commitment: Achieve near-zero defects in production by enforcing multi-layered quality gates, automation, and accountability. No change ships without passing all checks—violations result in review and potential corrective action. Engineers must internalize this SOP and review it at the start of every session. Updates to this SOP require team consensus and documentation.

## Core Principles

- **Zero-Tolerance for Production Breaks:** All processes prioritize prevention over reaction.
- **Privacy-First:** User relationship data is sacred; never log, expose, or leak sensitive information.
- **Automation-First:** Manual steps are minimized; leverage tools for consistency.
- **Accountability:** Every engineer signs off on changes; logs are auditable.
- **Continuous Improvement:** Conduct post-mortems on any escaped defects; refine this SOP quarterly.
- **Compliance:** Adhere to security best practices (OWASP), data privacy (GDPR/CCPA), and ethical AI guidelines for therapy content.

## The 14-Step Pipeline

All changes (features, fixes, refactors) follow this without exception:

### 1. 📋 PLAN
- Define scope, requirements, acceptance criteria, and risks
- Create a design doc outlining impacted areas (e.g., frontend, backend, database, assessments, therapy content)
- **Therapy check:** If touching assessment logic or expert frameworks, validate against research (Gottman, Johnson, Brown, etc.)

### 2. 🧠 THINK
- Analyze solutions, edge cases, performance, security, and scalability
- Identify dependencies and potential regressions
- Use dependency graphs to assess broader impact
- **Privacy check:** Will this expose user data anywhere it shouldn't?

### 3. ✅ DESIGN REVIEW (Grok)
- Submit design artifacts (diagrams, pseudocode) to Grok for AI-assisted feedback
- Iterate until resolved
- Ask specifically: *"What could this break in the existing app?"*

### 4. 👥 PEER DESIGN REVIEW
- Share design with at least one peer (e.g., via PR or meeting)
- Incorporate feedback
- **For therapy features:** Get SteveRogers or Donald validation on framework accuracy

### 5. 🔨 BUILD
- Code in a feature branch (e.g., `feature/[ticket-id]-description`)
- Adhere to standards: linting, modular code, comments
- Commit standards: `[ticket-id] type: description` (e.g., `feat`, `fix`, `refactor`)
- No force pushes; squash commits on merge
- **Privacy check:** No `console.log` of sensitive data (assessment results, journal entries, partner messages)

### 6. 🧪 AUTOMATED UNIT/INTEGRATION TESTS
- Write and run tests (e.g., Jest for frontend, Mocha/Chai for backend)
- Aim for >90% coverage on new/changed code
- Run full regression suite on touched areas
- **Therapy content tests:** Validate assessment scoring logic, strategy generation, expert attribution

### 7. 🔍 CODE QA (Grok)
- Use Grok for static analysis, bug detection, and optimizations
- Fix all high-severity issues
- Ask specifically: *"What could this break? Are there privacy leaks?"*

### 8. 🛠️ FIX FINDINGS
- Resolve all automated and Grok review feedback
- Re-run through Grok if changes were significant

### 9. 🧪 LOCAL BUILD AND TEST VERIFICATION
- **Frontend:** `cd frontend && npm run build` — must compile with zero errors
- **Backend:** `cd backend && npx tsc --noEmit` (if TypeScript) OR `npm test` — must pass
- Run full test suite locally
- Verify functionality and check console for errors
- **Privacy check:** Open dev tools → Network tab → verify no sensitive data in request/response bodies (blur screenshots if sharing)

### 10. ⚙️ CI/CD PIPELINE RUN
- Push to staging branch; trigger automated CI (GitHub Actions): lint, tests, security scans (Snyk/OWASP)
- Must pass 100%
- **If no staging environment:** Use Vercel preview deployment (auto-generated URL per branch)

### 11. 👀 HUMAN QA ON STAGING
- Test end-to-end on staging URL or Vercel preview (self + Josh/Bryce/designated QA)
- Include performance checks (page load <2s, API responses <500ms)
- Include mobile/responsive checks (emulate devices, touch events, layout shifts)
- **Therapy content check:** If touching assessments, run through full flow and verify scoring matches research
- **Privacy check:** Ensure partner data isolation (User A cannot see User B's data even if synced)

### 12. 🔧 FIX ISSUES AND RETEST
- Iterate on staging until defect-free
- Re-run Grok QA on fixes
- Get explicit approval: **"Good to merge"**

### 13. ✅ MERGE TO MAIN
- Merge only after all gates pass
- Triggers production deployment:
  - Vercel → https://loverescue.app
  - Railway → backend API

### 14. 📊 POST-DEPLOYMENT MONITORING
- Monitor for 30 minutes post-deploy (Vercel Analytics, Railway logs, user reports)
- Roll back if anomalies detected; notify team immediately
- **Therapy-specific:** Watch for assessment failures, strategy generation errors, expert citation bugs

---

## 🚫 Hard Rules

Non-negotiable enforcements, automated where possible (e.g., via GitHub branch protection):

| Rule | Why | Enforcement |
|------|-----|-------------|
| **Never push directly to `main`** | Production is sacred | Branch protection rules |
| **Never skip Grok QA** | Second-AI review catches what you miss | PR checklist requirement |
| **Never deploy without a build check** | If it doesn't compile, it doesn't ship | CI/CD gate |
| **Never say "it's just a small change"** | Small changes break big things | Same pipeline for all changes |
| **Never log sensitive data** | Assessment results, journal entries, partner messages are private | Code review + automated log scanning |
| **Never leave silent failures** | If an API call can fail, show the user an error | Code review enforcement |
| **Always check what else uses the code you're changing** | Regressions come from not checking dependencies | Design review step |
| **Always test the happy path AND the error path** | Users will find every edge case you didn't | QA checklist |
| **All tests must pass before merge** | Automated quality gate | CI required status checks |
| **Security vulnerabilities block deployment** | Customer data protection | Automated security scanning |
| **No hardcoded secrets** | Use Vercel/Railway env vars; scan for leaks | Automated secret scanning |
| **No force pushes** | Preserve git history integrity | Branch protection rules |
| **Expert citations must be accurate** | Therapy content credibility depends on research | SteveRogers/Donald review |

---

## 🔄 Comprehensive Regression Checklist

Run before any push or merge. Automate as much as possible. **All must pass:**

### Authentication & Security
- [ ] Login flows (Google OAuth, email) work
- [ ] Session management correct
- [ ] Edge cases handled (expired tokens, revoked access)
- [ ] Password reset flows work
- [ ] Partner invite/sync flows work without leaking data

### Core UI
- [ ] Dashboard loads without errors, all visualizations render
- [ ] Sidebar/navigation works (no scroll issues, links work)
- [ ] Assessment flows complete without errors
- [ ] Check-in forms submit successfully
- [ ] Strategy/lesson cards display correctly

### Therapy Content
- [ ] Assessment scoring matches research (Gottman, Johnson, etc.)
- [ ] Strategy generation produces valid activities
- [ ] Expert attributions are accurate ("Gottman found..." cites correct research)
- [ ] Progress tracking calculates correctly
- [ ] Ring/badge logic works (if using progress rings feature)

### Privacy & Data Isolation
- [ ] User A cannot see User B's data
- [ ] Partner sync respects privacy settings
- [ ] Journal entries are private
- [ ] Assessment results only visible to owner (or explicitly shared partner)
- [ ] No sensitive data in console logs or network tab

### Quality
- [ ] Zero console errors/warnings on page load
- [ ] Network requests return expected data
- [ ] Mobile/responsive layout correct (emulate devices, touch events, no layout shifts)

### Performance
- [ ] Page load < 2 seconds
- [ ] API responses < 500ms
- [ ] Database queries optimized (no N+1 queries)

### Security
- [ ] Input sanitization in place
- [ ] No XSS/SQLi vectors introduced
- [ ] CSRF tokens present on forms (if applicable)

### Integrations
- [ ] Stripe checkout/billing flows unaffected (if applicable)
- [ ] Email sending still works (reminders, notifications)
- [ ] Third-party APIs respond correctly; error handling in place

### Data Integrity
- [ ] Database queries return correct results
- [ ] No data corruption on CRUD operations
- [ ] Assessment scores persist correctly
- [ ] Strategy weeks generate consistently

### Accessibility
- [ ] Basic WCAG compliance (alt text, keyboard nav)
- [ ] Forms are keyboard-navigable
- [ ] Color contrast meets standards (therapy users may be stressed/fatigued)

> If automated, require >95% pass rate; manual overrides need documented justification.

---

## 📁 Branch Strategy

```
main (production — loverescue.app)
  └── staging (testing — staging URL or Vercel preview)
        └── feature/[ticket-id]-description (individual work)
        └── hotfix/[ticket-id]-description (urgent production fixes)
```

- **`main`** = production, only receives tested code from staging via PR
- **`staging`** = integration branch, always deployable to staging environment (or Vercel preview)
- **`feature/*`** = individual feature/fix branches, merge into staging via PR
- **`hotfix/*`** = urgent production fixes, merge into both main AND staging
- Delete feature/hotfix branches after merge
- No force pushes; squash commits on merge

---

## 🤖 AI Agent-Specific Rules

### For All AI Agents (SteveRogers, Donald, Vision, Grok)
- Read this SOP at the start of every session when working on LoveRescue
- Always read existing code before generating new code
- Never assume a file exists — check first
- Never install new packages without checking if an alternative already exists
- Always run the build verification step before reporting success
- If you're unsure about something, ASK — don't guess
- Log all changes made in the PR description
- **Never log sensitive relationship data** (assessments, check-ins, journal entries)

### For SteveRogers (Therapy Brain)
- Validate all expert citations before suggesting changes to therapy content
- Cross-reference framework improvements against research in `steve-rogers/` directory
- Never suggest clinical diagnoses — reframe as "patterns" or "dynamics"
- When suggesting strategy improvements, cite specific expert research
- Privacy-first: never expose user data in examples or logs

### For Subagents
- Include full file paths in your prompt (not "find the file")
- Specify the tech stack and conventions to follow
- Include "DO NOT" guardrails for common mistakes
- Verify output compiles before reporting success
- Reference existing patterns in the codebase

### AI Agent Accountability
- Every AI-generated change must be traceable to a specific agent
- Commit messages must include the agent name: `feat(steverogers): add Real Talk Mode`
- If an AI agent introduces a regression, document it in `tasks/lessons.md` with the pattern to avoid
- Never deploy unversioned therapy content changes; require review for assessment scoring logic

### AI-Specific Testing for Therapy Content
- Use test cases for assessment scoring (known inputs → expected outputs)
- Validate strategy generation produces expert-backed activities
- Ethical checks: scan for biases, gendered assumptions, heteronormative language
- Metrics: content accuracy (>95% expert alignment), user satisfaction (track effectiveness ratings)
- Always have non-AI fallback paths for critical features (e.g., generic strategies if AI generation fails)

---

## 🏗️ Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | React, Tailwind CSS, Recharts, Lucide icons |
| Backend | Express, Prisma ORM, PostgreSQL |
| Auth | Google OAuth, JWT tokens |
| Payments | Stripe (if applicable) |
| Email | SendGrid or Gmail API (TBD based on EMAIL-AUDIT-SENDGRID-VS-GMAIL.md) |
| Hosting | Vercel (frontend), Railway (backend) |
| CI/CD | GitHub Actions, Vercel auto-deploy, Railway auto-deploy |
| Code Quality | ESLint, Prettier (frontend), ESLint (backend) |
| Monitoring | Vercel Analytics, Railway logs (Sentry TBD) |
| Security | Snyk/OWASP scanning, secret scanning |
| Therapy Content | Expert research files in `steve-rogers/`, `knowledge-base/`, `marketing-supercomputer/` |

---

## 📞 Escalation & Incident Response

### If You're Stuck
1. **Stop pushing code** — don't make it worse
2. **Document what happened** in `tasks/todo.md` (what broke, what you tried, error logs)
3. **Notify the LoveRescue group chat** immediately
4. **Wait for guidance** — don't keep hacking at it

### Incident Response (Production Issues)
1. **Detect** — monitoring alerts (Vercel Analytics, Railway logs, user reports)
2. **Contain** — immediate rollback to last known good state
3. **Analyze** — full post-mortem with root cause
4. **Prevent** — update this SOP and `tasks/lessons.md` with learnings
5. **User communication:** If therapy data affected, notify users transparently (via Josh/Bryce approval)

### Rollback Procedure

**Frontend (Vercel):**
```bash
# Option 1: Revert via Vercel dashboard
# Go to loverescue.app project → Deployments → find last good one → Promote to Production

# Option 2: Git rollback
git log --oneline main -10
git reset --hard <good-commit-hash>
git push --force origin main
# Vercel auto-deploys
```

**Backend (Railway):**
```bash
# Option 1: Redeploy via Railway dashboard
# Go to project → Deployments → find last good one → Redeploy

# Option 2: Git rollback
git log --oneline main -10
git reset --hard <good-commit-hash>
git push --force origin main
# Railway auto-deploys
```

**Database Rollback (if migration broke prod):**
```bash
cd backend
# Identify migration to revert
npx prisma migrate resolve --rolled-back <migration-name>
# If data corruption, restore from Railway backup (contact Josh/Bryce)
```

---

## 📊 Metrics & Accountability

Track monthly:
- **Defect escape rate:** Target < 1% (bugs reaching production)
- **Staging rejection rate:** Track to identify training needs
- **Mean time to recovery (MTTR):** Target < 15 minutes
- **Deployment frequency:** Track velocity
- **Test coverage on new code:** Target > 90%
- **Therapy content accuracy:** Expert citation correctness (target 100%)
- **User satisfaction:** Track "effectiveness" ratings on strategies, Real Talk Mode, etc.

### Enforcement
- **Weekly:** Review PRs/deployments for SOP compliance
- **Violations:** Documented in tickets; repeated issues trigger training or access restrictions
- **Privacy violations:** Immediate escalation to Josh/Bryce; potential access revocation

---

## 📚 Documentation Requirements

With every PR, update as applicable:
- README and API specs
- Changelogs
- Inline code comments for complex logic
- Therapy content references (cite expert research in code comments)
- This SOP (if process changes are needed)

---

## 🔒 Privacy & Ethical Guidelines (LoveRescue-Specific)

### What NEVER Gets Logged or Exposed
- Assessment results (Gottman scores, attachment styles, etc.)
- Check-in responses (emotional state, daily reflections)
- Journal entries (conflict logs, appreciations, vulnerable sharing)
- Partner messages (if using in-app messaging)
- Real Talk Mode drafts (gentle startups are private until sent)

### What CAN Be Logged (Anonymized Only)
- Feature usage metrics (e.g., "User completed assessment" — no scores)
- Error tracking (e.g., "API call failed" — no user data in error message)
- Performance metrics (page load times, API response times)

### Code Review Privacy Checklist
Before approving any PR, verify:
- [ ] No `console.log` with user data
- [ ] No sensitive data in error messages
- [ ] API responses don't leak other users' data
- [ ] Database queries have proper WHERE clauses (user_id, partner_id checks)
- [ ] Screenshots in PRs have sensitive data blurred

### Therapy Content Ethics
- No gendered assumptions (use "partner" not "husband/wife")
- No heteronormative language (inclusive of all relationship structures)
- No blame language (positive lens: "you can grow" not "you're broken")
- Cite research accurately (no misrepresentation of expert findings)
- If therapy content changes could affect user wellbeing, get Josh/SteveRogers approval

---

## 🔄 SOP Review Cadence

- **Quarterly:** Full team review and update of this SOP + workshops
- **After any production incident:** Immediate post-mortem and SOP amendment
- **After any new tool/process adoption:** Update relevant sections
- **After any therapy content audit:** Update privacy/ethics sections if needed
- **New team members:** Shadow deployments before solo work

---

## 🎯 Success Criteria

LoveRescue is successful when:
1. **Users trust us with their relationship data** (zero privacy breaches)
2. **Therapy content is accurate** (100% expert-backed, properly cited)
3. **The app works reliably** (<1% defect escape rate)
4. **Users see real progress** (track effectiveness ratings, retention)
5. **The team moves fast without breaking things** (high deployment frequency + low MTTR)

This SOP exists to protect that trust.

---

*Last updated: 2026-02-25*
*Approved by: Josh Cohen (Thor), Bryce Morgan (Tony Stark)*
*Enforced by: Everyone. No exceptions.*

---

## Quick Reference Card (Print & Post)

```
🚨 BEFORE YOU PUSH TO LOVERESCUE:

1. ✅ Read ENGINEERING-SOP.md
2. ✅ Run `npm run build` (frontend) or `npm test` (backend) — must pass
3. ✅ Zero console errors
4. ✅ Zero sensitive data in logs
5. ✅ Grok QA: "What could this break?"
6. ✅ Human QA on staging/preview
7. ✅ All regression tests pass
8. ✅ Get "Good to merge" approval

❌ NEVER:
- Push to main directly
- Skip Grok QA
- Log user data
- Say "it's just a small change"
- Deploy without build verification

💡 IF STUCK: Stop. Document. Notify chat. Wait.

🔥 IF PRODUCTION BREAKS: Rollback. Post-mortem. Update SOP.
```
