# SteveRogers — GAPS.md
## What's Missing, What Needs Research, What to Add
*First Session: 2026-02-10*

---

## MISSING ASSESSMENTS (High Priority)

### 1. 🛡️ Shame & Vulnerability Assessment (Brené Brown)
**Why it's critical**: Shame is the hidden driver behind most relationship dysfunction — defensiveness, perfectionism, numbing, contempt. Without measuring it, we're treating symptoms.
**What to assess**:
- Armor patterns: perfectionism, numbing, foreboding joy
- Shame triggers in relationship context
- Vulnerability capacity (can you say "I'm scared" to your partner?)
- "The story I'm telling myself" awareness level
**Expert**: Brown's shame resilience framework

### 2. 🎯 Six Human Needs Assessment (Tony Robbins)
**Why it's critical**: Every conflict traces to unmet needs. If we know someone's dominant need is significance and their partner's is certainty, we can predict AND prevent their fights.
**What to assess**:
- Rank of 6 needs (certainty, variety, significance, connection, growth, contribution)
- Current vehicles for meeting each need (healthy vs. unhealthy)
- Which needs they seek from relationship vs. elsewhere
**Expert**: Robbins' needs framework

### 3. 🔥 Desire & Aliveness Assessment (Esther Perel)
**Why it's critical**: Many couples who come to LoveRescue aren't in crisis — they're in flatline. Safe but dead. Perel's lens is the only one that addresses this.
**What to assess**:
- Security vs. desire balance
- Individual identity vs. merged identity
- Erotic vs. domestic self-perception
- "When do you feel most drawn to your partner?" (Perel's key question)
- Novelty and adventure in the relationship
**Expert**: Perel's erotic intelligence framework

### 4. 🗣️ Communication Style Assessment (Chris Voss)
**Why it's critical**: PREP assessment covers some communication, but doesn't measure the specific Voss skills: listening quality, empathy accuracy, ability to make someone feel heard.
**What to assess**:
- Listening mode: listening to respond vs. listening to understand
- Empathy accuracy: can you name your partner's emotion correctly?
- Default conflict style: demand, accommodate, avoid, collaborate
- "That's right" vs. "You're right" awareness
**Expert**: Voss' tactical empathy framework

---

## MISSING FROM STRATEGY ENGINE

### 5. No Post-Cycle Architecture
**The gap**: After 6 weeks... what? The engine generates cycles but has no maintenance mode. Users who complete a cycle need ongoing micro-rituals, not just "retake assessments."
**What to build**: A `generateMaintenanceRituals()` function that creates a permanent daily stack based on what worked in the cycle.

### 6. No Emergency/Crisis Mode
**The gap**: When a couple is in active crisis (just discovered an affair, massive fight, someone is considering leaving), the generic Week 1 "log 3 positive interactions" is tone-deaf.
**What to build**: A crisis pathway that deploys:
- Gottman's repair attempts immediately
- Voss's de-escalation techniques
- Johnson's "Hold Me Tight" softened startup
- Brown's "the story I'm telling myself" to prevent narrative spiraling
- Tatkin's nervous system co-regulation

### 7. No Difficulty Progression
**The gap**: Week 1 and Week 6 techniques require the same emotional skill level. In reality, "write down something positive" (Week 1) is vastly easier than "say 'the story I'm telling myself is...' during a fight" (should be Week 4-5).
**What to build**: Difficulty scoring (1-5) on every technique. Weeks 1-2 = difficulty 1-2. Weeks 5-6 = difficulty 3-5.

### 8. No Expert Attribution in Activities
**The gap**: Users don't know they're learning from Gottman, Voss, Brown, etc. This is a massive missed opportunity for credibility and engagement.
**What to build**: Every activity should include the expert name and a one-line bio on first encounter. "This technique comes from Dr. John Gottman, who can predict divorce with 94% accuracy."

---

## MISSING FROM INTERPRETATIONS

### 9. No Cross-Assessment Insights
**The gap**: Interpretations exist per-assessment but don't connect results across assessments. The REAL insights are in the intersections:
- "Your anxious attachment + words of affirmation love language means you probably seek reassurance through verbal confirmation. When it's missing, your anxiety spikes."
- "Your avoidant attachment + acts of service language means you show love through DOING, which lets you stay emotionally distant while still feeling like you're contributing."
**What to build**: A `generateCrossInsights(allAssessments)` function that finds meaningful intersections.

### 10. No Matchup Interpretations
**The gap**: When both partners complete assessments, we generate a matchup score but don't explain the DYNAMIC deeply enough.
**What to build**: Dynamic-specific interpretations:
- "You're anxious, they're avoidant. Here's exactly how your dance works and how to interrupt it."
- "You both speak different love languages. Here's why you both feel unloved despite both trying."
- "Your Gottman scores show you default to criticism, they default to stonewalling. This is the classic pursue-withdraw cycle Sue Johnson identified."

---

## NEEDS MORE RESEARCH

### 11. Technique Effectiveness Data
**The gap**: We don't know which techniques actually work best for which profiles. We're prescribing based on theory, not outcomes.
**What to build**: Track which activities get completed, which get skipped, and (via weekly check-ins) which users report as most helpful. Use this data to improve technique selection over time.

### 12. Cultural Lens
**The gap**: Perel's cultural lens is absent from the app. Relationship expectations vary enormously by culture, religion, generation, and socioeconomic background.
**What to research**: How to adapt assessments and strategies for different cultural contexts without stereotyping.

### 13. Neurodivergence & Relationships
**The gap**: None of the 8 experts deeply address how ADHD, autism spectrum, or other neurodivergent traits affect relationship patterns. These are HUGE factors in communication breakdowns that look like "not caring" but are actually processing differences.
**What to research**: Neurodivergent-specific relationship strategies. Could be a future expert addition.

### 14. Trauma-Informed Approach
**The gap**: Johnson (EFT) addresses attachment injury, and Brown addresses shame, but neither goes deep on complex trauma (C-PTSD, childhood abuse) and how it manifests in adult relationships.
**What to research**: Trauma-informed adaptations for all strategies. Some techniques (like "stay in the discomfort") could be harmful for trauma survivors without modification.

### 15. Same-Sex & Non-Traditional Relationship Dynamics
**The gap**: Most expert frameworks default to heterosexual, monogamous assumptions. Gottman has done same-sex research, but Robbins' polarity framework assumes masculine/feminine dynamics that need careful adaptation.
**What to research**: Ensure all assessments and strategies are inclusive without losing the valid insights about polarity and complementarity.

---

## ASSESSMENTS TO ADD (Future Roadmap)

| Assessment | Expert Source | What It Measures | Priority |
|-----------|-------------|-----------------|----------|
| Shame Resilience | Brown | Armor patterns, shame triggers, vulnerability capacity | HIGH |
| Six Human Needs | Robbins | Dominant needs, healthy/unhealthy vehicles | HIGH |
| Desire & Aliveness | Perel | Security-desire balance, individual identity | MEDIUM |
| Communication Style | Voss | Listening quality, empathy accuracy, conflict style | MEDIUM |
| Repair Attempt Inventory | Gottman | How well you de-escalate, what repair styles you use | MEDIUM |
| Polarity Assessment | Robbins/Perel | Masculine/feminine energy balance, desire dynamics | LOW |
| Shared Meaning | Gottman | Rituals, roles, goals, symbols in the relationship | LOW |
| Apology Languages | Chapman | How you apologize and how you need to be apologized to | LOW |

---

## QUICK WINS (Can Be Done This Week)

1. **Add `expert` and `why` fields to matchup flow activities** — 2 hours of work, massive quality improvement
2. **Add love language to daily connection ritual** — already have the data, just need to use it
3. **Add expert attribution to all strategy activities** — "This comes from [Expert]'s research"
4. **Cross-assessment insight for attachment + love language combo** — 16 combinations, write them once, serve forever

---

*Every gap is an opportunity. Every missing piece is a future feature. The foundation is solid — now we deepen.*
*Version 1.0 — First Session — 2026-02-10*
