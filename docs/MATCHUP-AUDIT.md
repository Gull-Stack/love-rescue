# Matchup Flow Audit: Quality Gaps vs Solo Flow

**Date:** 2025-02-11
**Author:** SteveRogers (Strategy Engine Review)
**File audited:** `backend/src/routes/strategies.js`

---

## Executive Summary

The solo flow is **significantly more mature** than the matchup flow. Solo was clearly written with therapeutic intentionality — it has progressive skill-building, deep personalization, and expert-backed specificity. The matchup flow feels like a first draft that got shipped: decent content, but missing the architecture that makes it transformative.

---

## Gap-by-Gap Comparison

### 1. **Relationship Profile / Personalization**

| Aspect | Solo | Matchup |
|--------|------|---------|
| Profile building | `generateRelationshipProfile()` builds a rich profile from ALL assessments — attachment style, love language, cycle position, dominant horseman, friendship/conflict/meaning/communication scores, priority focus areas | **None.** Matchup only checks `matchup.alignments.misses` — a flat list of miss areas |
| Personalization depth | Activities are customized to attachment style, communication score, specific focus areas. Conditional blocks for `attachment`, `communication` focus areas | Only checks if `missAreas` includes `'attachment'`, `'wellness'`, or `'patterns'` — 3 conditions total |
| Both partners' data | N/A (solo) | **Does NOT use individual assessment data from BOTH partners.** The matchup object has alignment data but individual profiles (attachment styles, love languages, cycle positions) are ignored |

**Impact:** Matchup activities are generic couple activities. They don't account for the specific dynamic between THIS couple — e.g., anxious-avoidant pairing gets the same activities as secure-secure.

---

### 2. **Week Theme / Progressive Difficulty**

| Aspect | Solo | Matchup |
|--------|------|---------|
| Week themes | Clear progression: Self-Awareness → Communication → Emotional Regulation → Understanding Patterns → Personal Growth → Integration | **No named themes.** Weeks are differentiated only by which extra activities get added |
| Difficulty curve | Week 1 = observation ("write down"), Week 3 = regulation ("pause 6 seconds"), Week 5 = vulnerability ("ask hard questions") | Week 1 = vulnerability right away ("Share a childhood memory"). No scaffolding. |
| Skill building | Each week builds on prior: you can't regulate (W3) until you're aware (W1), can't see patterns (W4) until you can regulate | Activities don't reference or build on previous weeks |

**Impact:** Couples hit vulnerability exercises before they've built safety. This is therapeutically backwards — Johnson and Gottman both insist safety precedes vulnerability.

---

### 3. **Activity Quality & Specificity**

| Aspect | Solo | Matchup |
|--------|------|---------|
| `why` explanations | Every activity has a rich, conversational `why` that explains the science AND motivates. e.g., "It takes 6 seconds for stress hormones to pass through your brain. Those 6 seconds are where you choose who you want to be." | `why` explanations exist and are decent but less varied — many just reference "Gottman found..." without the vivid translation |
| `expert` attribution | Every activity tagged with expert source | ✅ Present — this is one area matchup does well |
| `duration` field | ❌ **Missing from solo activities** | ✅ Present on matchup activities |
| `difficulty` rating | ❌ Missing from both | ❌ Missing from both |
| Step-by-step instructions | Some activities have implicit steps but most are single-sentence prompts | Same — single-sentence prompts, no step-by-step |
| Adaptation notes | Solo adapts via conditional blocks (attachment-aware, communication-aware) but doesn't explain the adaptation to the user | No adaptation notes at all |

---

### 4. **Base Activities (Daily Backbone)**

| Aspect | Solo | Matchup |
|--------|------|---------|
| Monday-Sunday backbone | Every day has a **unique** positive-lens activity, specifically tailored to the day of week with distinct instructions | Generic matchup activities that are solid but feel like a single template repeated |
| Non-negotiable daily habit | Positive lens training EVERY day — "every single day starts with seeing the good" | No consistent daily thread. Monday = log positives, but other days jump to different modalities |
| MIRROR principle | ✅ Strong — solo is inherently self-focused. "You work on YOU" is stated explicitly in Week 6 | ❌ **Weak.** Activities say "together" but don't structure individual reflection → sharing. Most are "do this as a couple" with no solo prep |

---

### 5. **Weekly Goals**

| Aspect | Solo | Matchup |
|--------|------|---------|
| Base goals | 2 consistent goals + week-specific additions | 2 consistent goals + week-specific additions (comparable) |
| Measurability | "Replace 5 'You always' statements", "Use 6-second pause 3 times" — specific numbers | "Learn 3 new things" is measurable, but "Complete daily prompts together" is vague |
| Progression | Goals escalate in difficulty and depth | Goals don't clearly build on each other |

---

### 6. **Expert Diversity**

| Aspect | Solo | Matchup |
|--------|------|---------|
| Experts used | Gottman, Johnson, Brown, Voss, Chapman, Robbins — 6 of 8 | Gottman, Tatkin, Brown, Johnson, Perel, Chapman, Robbins — 7 of 8 (actually better spread!) |
| Expert depth | Deep integration — Voss's mirroring technique, Brown's vulnerability research, Johnson's cycle work | More surface-level references — names are dropped but techniques aren't as specific |

---

### 7. **Structural / Code Issues**

1. **No couple profile building.** There's no `generateCoupleProfile()` equivalent that combines both partners' assessments into a joint dynamic profile (e.g., anxious + avoidant = pursue-withdraw).

2. **Matchup data underutilized.** The matchup object likely contains alignment scores, compatibility data, miss areas with details — but only `misses.map(m => m.area)` is extracted. The severity, specific scores, and alignment details are thrown away.

3. **No difficulty/phase metadata.** Activities lack `difficulty`, `phase`, or `week_theme` fields that the frontend could use for progressive disclosure and gamification.

4. **No per-person activities.** Matchup should generate slightly different activities for each partner based on their individual profiles (e.g., the anxious partner gets "notice when you're reaching for reassurance" while the avoidant partner gets "notice when you're pulling away").

5. **Week 1 safety gap.** Matchup Week 1 adds "Share a childhood memory" (vulnerability exercise) before establishing safety rituals. Solo correctly puts self-awareness first.

---

## Priority Fixes

### P0 — Therapeutically Critical
1. **Restructure week themes** to follow safety → awareness → skills → vulnerability → integration
2. **Build couple profile** from both partners' assessments to personalize activities
3. **Implement MIRROR principle** — each activity should have a solo component and a sharing component

### P1 — Quality Parity with Solo
4. **Add difficulty ratings** (1-5) to all activities
5. **Add step-by-step instructions** instead of single-sentence prompts
6. **Add adaptation notes** for different attachment style combinations
7. **Enrich `why` explanations** to match solo's vivid, motivational style

### P2 — Enhancement
8. **Per-person activity variants** based on individual profiles
9. **Week theme metadata** for frontend progressive disclosure
10. **Richer matchup data extraction** — use severity scores, not just area names

---

## Conclusion

The matchup flow has good bones — expert attribution, duration fields, and decent content. But it's missing the **therapeutic architecture** that makes the solo flow genuinely transformative: progressive difficulty, deep personalization, the MIRROR principle, and the kind of specificity that changes behavior. The enriched Week 1 activities in the companion doc address these gaps.
