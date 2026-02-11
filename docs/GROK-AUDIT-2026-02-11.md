# LoveRescue Comprehensive Audit Report
## Date: 2026-02-11 | Auditor: External (Grok-class)
## Overall Grade: **B-**

---

## Executive Summary

LoveRescue has an impressively deep therapeutic content layer and a well-structured assessment engine. The codebase is functional and thoughtfully organized. However, several structural weaknesses prevent it from being production-grade at scale.

### 🔴 Top 3 Risks

1. **Strategy engine is static and doesn't use 10 of 13 assessments.** The `generateSoloWeekPlan` and `generateMatchupWeekPlan` functions are hardcoded 6-week plans that ignore shame/vulnerability, desire/aliveness, tactical empathy, emotional intelligence, conflict style, differentiation, hormonal health, physical vitality, personality type, and human needs scores. 13 assessments feed into scoring, but only ~3 drive strategy generation. Users complete 300+ questions and get a generic plan.

2. **No input validation on strategy routes.** The `update-progress` endpoint destructures `req.body` without any validation — `strategyId`, `completedActivities`, and `progress` are trusted blindly. No type checking, no bounds checking (beyond the post-hoc clamp), no sanitization. Combined with no rate limiting on strategy routes, this is exploitable.

3. **The matchup scoring doesn't include 5 of 13 assessments.** `calculateMatchupScore` handles 8 assessment types but completely ignores shame_vulnerability, desire_aliveness, tactical_empathy, hormonal_health, and physical_vitality — all of which have scorers and question banks. Partners who take these assessments get zero matchup value from them.

---

## Section 1: Backend Code Quality

### 🟢 Good
- **Clean error handling pattern**: All routes use try/catch with `next(error)` delegation. Consistent.
- **Auth middleware is solid**: JWT algorithm pinned to HS256, JWT_SECRET validated at startup, user lookup on every request. The critical security fixes from the prior audit appear implemented.
- **Scoring engine is comprehensive**: 15 scorers, universal dispatcher, reverse-scoring support, input validation function exists.
- **Separation of concerns**: Routes, middleware, utils cleanly separated. Question bank, scoring, and interpretations in distinct files.

### 🟡 Warning
- **`strategies.js` has 499 lines of business logic in the route file.** `generateWeekPlan`, `generateSoloWeekPlan`, `generateMatchupWeekPlan`, and `generateRelationshipProfile` should be in a utility module, not in a route handler. This makes testing impossible without spinning up Express.
- **No unit tests visible.** For a scoring engine with 15 scorers handling 300+ questions across 7-point Likert scales, forced-choice, and reverse-scoring — the absence of tests is a ticking time bomb. One scoring bug = thousands of wrong results served silently.
- **Hardcoded 6-week cycle.** The `for (let week = 1; week <= 6; week++)` loop and the switch statement per week are rigid. Adding week 7 or changing cycle length requires code changes, not configuration.
- **`generateRelationshipProfile` only uses 4 of 13 assessment types** (attachment, love_language, gottman, eft/prep). Nine assessments are ignored when building the profile that drives strategy generation.
- **`gottmanCheckupQuestions` header says "Scale 1-5" but `questionBank` defines scale as 1-7.** The Gottman scorer uses `scaleMax = 7`, which is correct per the bank definition, but the comment is misleading and suggests the scale may have been changed without updating documentation.
- **Legacy scorers (`scoreWellnessBehavior`, `scoreNegativePatterns`) are dead code** — no corresponding question bank entries, hardcoded question IDs (1-15), different scale (1-5). Should be removed or documented as deprecated.

### 🔴 Critical
- **No input validation on `POST /strategies/update-progress`.** `strategyId` is used directly in a Prisma query. While Prisma parameterizes queries (preventing SQL injection), there's no check that `strategyId` is a valid UUID/string, that `progress` is a number, or that `completedActivities` is a positive integer. A malformed request could cause unexpected Prisma errors that leak schema details.
- **No rate limiting on strategy generation.** `POST /strategies/generate` creates 6 database records per call. An attacker with a valid token could hammer this endpoint to fill the database. Assessment routes have rate limiting; strategy routes don't.
- **Division by zero potential in `update-progress`.** If `strategy.dailyActivities` is empty or malformed (e.g., `{}`), `Object.values(strategy.dailyActivities).flat().length + strategy.weeklyGoals.length` could be 0, causing `completedActivities / 0 = Infinity`, which would then be clamped to 100. Not a crash, but semantically wrong.

---

## Section 2: Therapeutic Framework Quality

### 🟢 Good
- **UNIFIED-MODEL.md is genuinely excellent.** The 4-stage Assess→Learn→Practice→Transform model is logical, well-structured, and correctly maps experts to stages. The learning pathways by profile (anxious+pursuer+criticism, avoidant+withdrawer+stonewalling) show deep therapeutic understanding.
- **INSIGHTS.md identifies 7 real meta-patterns** that legitimately emerge across the expert corpus. The "Safety Before Everything" and "Presenting Emotion Is Never The Real One" patterns are clinically sound.
- **The "Surprising Tensions" section** (Johnson vs. Perel on security/desire) shows intellectual honesty and nuanced thinking. The resolutions proposed are correct.

### 🟡 Warning
- **GAPS.md is well-maintained but reveals that many "completed" items aren't actually integrated.** The doc says Shame & Vulnerability, Desire & Aliveness, and Tactical Empathy assessments are ✅ completed — and indeed the question banks and scorers exist — but the strategy engine doesn't use any of them. The gap between "assessment exists" and "assessment drives behavior" is the real gap.
- **No crisis detection.** GAPS.md identifies this, but it's worth flagging again: a user scoring extremely high on shame triggers + low on vulnerability capacity + high on contempt is in potential danger territory. The app has no mechanism to flag this or modify its approach. A cheerful "log 3 positive interactions!" to someone in acute shame spiral could feel dismissive or even harmful.
- **The framework assumes a willing, self-reflective user.** No accommodation for users who are taking assessments dishonestly (social desirability bias), under duress (partner forcing them), or in active crisis. The "mirror not weapon" philosophy is admirable but naive if the app is used as a weapon ("see, the app says YOU'RE the avoidant one").
- **Missing: trauma screening.** GAPS.md acknowledges this. Some questions (e.g., "I desperately want closeness but find myself pushing people away when I get it") could surface trauma responses. The app provides no referral pathway, no disclaimer about clinical limitations, and no escalation protocol.

### 🔴 Critical
- **Potential for harm: Hormonal Health assessment.** The app asks users about testosterone symptoms, estrogen fluctuations, thyroid issues, and libido changes — then provides interpretations and action steps that include specific medical recommendations ("Request comprehensive thyroid panel - TSH, Free T3, Free T4, TPO antibodies, reverse T3"). This crosses from self-awareness tool into pseudo-medical advice. A disclaimer at the assessment level is insufficient — the action steps read like a doctor's orders. **Liability risk.**

---

## Section 3: Assessment Quality

### 🟢 Good
- **Question framing is consistently self-reflective.** "I notice that I...", "I tend to...", "I feel...". This reduces defensiveness and supports the "mirror not weapon" philosophy.
- **Love language assessment uses proper forced-choice pairs** covering all 10 unique language combinations × 3 = 30 questions. Balanced coverage.
- **Attachment assessment has good category balance**: 8 secure, 8 anxious, 8 avoidant, 6 fearful-avoidant. The slight underrepresentation of fearful-avoidant is reasonable given it's less common.
- **Differentiation assessment correctly handles reverse scoring** — all emotional_reactivity, emotional_cutoff, and fusion questions are reverse-scored, while i_position is not. The scoring engine respects this.
- **`validateResponses()` exists and checks for missing questions, range validity, and forced-choice format.** Good hygiene.

### 🟡 Warning
- **No reverse-scored items in most assessments.** Only differentiation (15/20 reverse-scored), desire_aliveness (1 reverse-scored item: da_8), and tactical_empathy (1 reverse-scored item: te_6) use reverse scoring. Assessments like attachment, emotional intelligence, conflict style, and human needs have ZERO reverse-scored items. This means acquiescence bias (tendency to agree with everything) inflates all scores uniformly. A user who answers 6 to everything gets a meaningful-looking but meaningless profile.
- **Gottman checkup has unbalanced categories**: Four Horsemen get 20 questions (5 each), but Shared Meaning gets 3 and Repair Attempts gets 2. This means the horsemen have 4x the statistical reliability of repair attempts. The weighting in the scorer doesn't account for this.
- **Shame & Vulnerability has unbalanced categories**: 8 shame triggers, 8 armor patterns, 8 vulnerability capacity, but only 4 story awareness. Story awareness is undersampled.
- **Cultural bias**: Questions assume Western relationship norms — individual identity as desirable (Perel's framework), verbal expression of feelings as healthy (EQ assessment), direct need-expression as the goal. In many cultures, indirect communication, family-embedded identity, and emotional restraint are healthy norms, not deficits. The app would pathologize healthy collectivist relationship styles.
- **Social desirability bias**: Many questions have obviously "correct" answers. "I can pause between feeling a strong emotion and acting on it" — everyone knows they should say yes. No validity scales, no lie detection, no consistency checks. The Gottman horsemen questions are especially transparent — "I sometimes feel disgust toward my partner" is clearly the "wrong" answer, so users will underreport.
- **MBTI-style personality assessment is psychometrically weak.** The MBTI has poor test-retest reliability and limited predictive validity. Using it as a relationship compatibility tool (in matchup scoring, worth 15 points) is scientifically questionable. The Big Five would be a stronger foundation.

### 🔴 Critical
- **Hormonal health questions include gender-specific items but no gender gate in the assessment flow.** The `getQuestions()` function accepts an optional `userGender` parameter, but if it's not provided, ALL questions (male + female + universal) are shown to everyone. A man could be asked about menstrual cycles. The question bank relies on the frontend to pass gender, with no enforcement.

---

## Section 4: Strategy Engine

### 🟢 Good
- **Solo flow has genuine therapeutic progression**: Week 1 (self-awareness) → Week 2 (communication) → Week 3 (emotional regulation) → Week 4 (pattern awareness) → Week 5 (personal growth) → Week 6 (integration). This maps well to the UNIFIED-MODEL stages.
- **Every activity has a `why` field** explaining the therapeutic rationale. This is excellent for user buy-in and psychoeducation.
- **Expert attribution exists in activities** (`expert: 'gottman'`, `expert: 'johnson'`, etc.). The GAPS.md item about missing attribution has been addressed in the solo flow.
- **Positive lens training is non-negotiable and daily** — aligns with the 5:1 ratio meta-pattern identified in INSIGHTS.md.

### 🟡 Warning
- **Matchup flow is significantly less personalized than solo flow.** Matchup uses only `misses` from matchup scoring to customize (attachment, patterns, wellness). Solo flow uses attachment style, love language, cycle position, communication score, and focus areas. The matchup flow — which serves couples who've both taken assessments — ironically delivers a MORE generic experience.
- **No difficulty progression within weeks.** Monday's task is often as demanding as Friday's. GAPS.md identifies this and it remains unaddressed.
- **Week content is identical regardless of scores.** Whether your friendship score is 20 or 80, you get the same Week 1. The `focusAreas` array influences add-on activities but doesn't change the core curriculum. A user who scores 95% on communication still gets Week 2's communication exercises.
- **`generateRelationshipProfile` has a fragile attachment-to-cycle mapping**: anxious → pursuer, avoidant → withdrawer. This is a reasonable heuristic but ignores that some anxious individuals withdraw (anxious-avoidant) and some avoidant individuals pursue (when they're the one being left). It's an oversimplification.

### 🔴 Critical
- **Extreme scores produce no different behavior.** A user with contempt at 95%, stonewalling at 90%, and friendship at 10% gets the same Week 1 as someone at 50/50/50. No crisis detection, no severity-adjusted pacing, no "you need a therapist" recommendation. The engine treats a relationship in ICU the same as one getting a checkup.
- **10 of 13 assessments are completely unused by the strategy engine.** Shame/vulnerability, desire/aliveness, tactical empathy, emotional intelligence, conflict style, differentiation, hormonal health, physical vitality, personality, and human needs assessments have scorers and question banks but generate ZERO strategy personalization. Users invest 60+ minutes in these assessments for no strategy-level return.

---

## Section 5: Security

### 🟢 Good
- **Critical fixes from SECURITY-FIXES-BRIEF.md appear implemented**: JWT algorithm pinned, JWT_SECRET validated at startup. The auth middleware is solid.
- **Helmet and CORS are configured** in the main index.js.
- **Rate limiting exists** on assessment submission and therapist routes.
- **Prisma ORM** prevents SQL injection by default through parameterized queries.
- **Auth middleware checks user existence** on every request (not just token validity).

### 🟡 Warning
- **No rate limiting on strategy routes.** `/strategies/generate` creates 6 DB records per call. `/strategies/update-progress` accepts arbitrary progress values.
- **No input validation on strategy routes.** `strategyId` and `progress` from `req.body` are used without type checking.
- **CORS configuration not audited** — it's in index.js but I didn't read the full config. If `origin: '*'` is set, credentials could leak.
- **Audit logger exists** (`auditLogger.js`) but unclear if it's applied to sensitive routes (strategy generation, assessment submission, progress updates).
- **No IDOR protection on strategy history.** `GET /strategies/history` returns all strategies for a relationship, but the relationship lookup uses `OR [user1Id, user2Id]` — which is correct, but there's no check that the relationship itself is valid or active. A user who was removed from a relationship might still access old strategies.

### 🔴 Critical  
- **No new critical security issues found beyond what SECURITY-FIXES-BRIEF.md identified.** The critical items appear fixed. Remaining issues are medium-severity.

---

## Section 6: Content & Extraction Pipeline

### 🟢 Good
- **27 extracted framework files across 8 experts.** Coverage:
  - Gottman: 11 files (most comprehensive) — four horsemen, bids, love maps, flooding, repair, rituals, ratio, sex/intimacy, perpetual problems, accepting influence, sound relationship house
  - Brené Brown: 4 files — vulnerability, shame resilience, empathy vs sympathy, blame vs accountability
  - Chris Voss: 3 files — tactical empathy, calibrated questions, power of no
  - Esther Perel: 3 files — erotic intelligence, desire in long-term, rethinking infidelity
  - Sue Johnson: 2 files — EFT, A.R.E.
  - Attachment Theory: 1 file — attachment styles
  - Gary Chapman: 1 file — five love languages
  - Tony Robbins: 1 file — six human needs
- **Expert attribution in assessments and interpretations is accurate.** I found no misattributed content — Gottman concepts are credited to Gottman, Brown's to Brown, etc.

### 🟡 Warning
- **Extraction depth is uneven.** Gottman has 11 files; Sue Johnson, Chapman, Robbins, and Attachment Theory each have 1-2. Johnson's EFT has far more content available (Hold Me Tight conversations, attachment injuries, Demon Dialogues beyond pursue-withdraw). Robbins' framework extends beyond 6 needs (state management, identity, polarity). The current extractions are surface-level for these experts.
- **No Tatkin or Finlayson-Fife extractions.** Both are referenced extensively in INSIGHTS.md and strategy activities, but have no extracted framework files. Their concepts are used but not sourced.
- **Jordan Belfort is referenced in interpretations** ("Practice Belfort's state management") but has no extraction file and is not one of the 8 core experts. Random attribution.

---

## Recommendations (Ranked by Impact)

### Tier 1: Do This Week
1. **Wire existing assessments into strategy generation.** You have 13 scorers producing rich profiles. The strategy engine uses 3. This is the single highest-leverage improvement — it transforms the user experience from "generic self-help" to "personalized therapy."
2. **Add input validation to strategy routes.** Use a schema validator (Joi, Zod, or similar) on `update-progress` and `generate`. 2 hours of work, prevents a class of bugs.
3. **Add rate limiting to strategy routes.** Copy the pattern from assessment routes. 30 minutes.
4. **Move strategy generation logic out of route file.** Extract to `utils/strategyEngine.js`. Enables unit testing.

### Tier 2: This Sprint
5. **Add reverse-scored items to all assessments.** At minimum, add 2-3 reverse-scored questions per assessment to detect acquiescence bias. Recalibrate scoring accordingly.
6. **Add extreme score detection.** If any horseman > 80% or overall health < 30%, surface a recommendation to seek professional help. This is both ethical and a liability shield.
7. **Add medical disclaimer to hormonal health.** Move from general disclaimer to per-question-level: "This is not medical advice. Consult a healthcare provider."
8. **Write unit tests for all 15 scorers.** Test edge cases: all 1s, all 7s, all same answer, missing responses, extra responses.

### Tier 3: Next Sprint
9. **Replace MBTI with Big Five** for personality assessment. Better psychometric validity, better cross-cultural reliability.
10. **Add cultural context options** to assessments. Even a simple "relationship context" selector (individualist/collectivist, religious/secular) could adjust interpretation framing.
11. **Build post-cycle maintenance rituals** (identified in GAPS.md, still unbuilt).
12. **Build crisis pathway** (identified in GAPS.md, still unbuilt).

---

## "If I Were a Competitor, Here's How I'd Beat You"

1. **I'd build what you claim to have.** LoveRescue has 13 assessments and 300+ questions but uses ~3 of them to generate strategies. I'd build 5 assessments that ALL drive personalized daily activities. Depth over breadth. Your users will notice when their shame resilience score changes nothing about their plan.

2. **I'd add AI-powered personalization.** Your strategy engine is a switch statement. I'd use an LLM to generate truly personalized daily activities based on the full assessment profile, relationship context, and progress history. "Based on your anxious attachment, high shame triggers, and words-of-affirmation love language, here's today's practice..." — this is the experience users expect in 2026.

3. **I'd nail the mobile experience.** You have 13 assessments averaging 8 minutes each = 104 minutes of assessment. That's absurd for mobile. I'd build a progressive assessment flow: 1 quick assessment → immediate value → unlock deeper assessments as the user engages. You front-load ALL the work before delivering ANY value.

4. **I'd add outcome tracking.** You generate strategies but don't measure if they work. I'd add weekly mood/satisfaction check-ins, track which activities get completed vs. skipped, and use that data to improve recommendations. Your app is write-only — it gives advice but never learns if it helped.

5. **I'd partner with licensed therapists.** Your disclaimer says "not a licensed practitioner" but your hormonal health section gives specific lab test recommendations. I'd either go all-in on clinical partnerships (therapist-in-the-loop) or pull back hard from medical advice. You're in the uncanny valley of "too specific to be general advice, too unqualified to be clinical."

6. **I'd ship faster.** Your GAPS.md has 15 identified gaps from Day 1. Your framework docs are beautiful. Your code works. But the gap between "identified" and "shipped" is where competitors live. Stop documenting what you'll build and build it.

---

*Audit complete. The foundation is genuinely strong — the therapeutic content is better than most apps in this space. But the engineering hasn't caught up to the vision. The assessments promise personalization; the strategy engine delivers a pamphlet. Close that gap and you have something real.*
