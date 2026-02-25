# SteveRogers — STRATEGY-IMPROVEMENTS.md
## Specific, Actionable Improvements for the LoveRescue Strategy Engine
*First Session: 2026-02-10*

---

## CRITICAL FINDINGS

The current strategy engine (`backend/src/routes/strategies.js`) has two flows:

1. **Solo flow** (`generateSoloWeekPlan`) — STRONG. Rich, specific daily activities with `why` explanations. Positive lens is baked in. Expert citations present. This is good work.

2. **Matchup flow** (`generateMatchupWeekPlan`) — WEAK. Generic activities, no `why` explanations, no expert citations, minimal personalization. Only uses `missAreas` from matchup alignments.

**Priority #1**: Bring the matchup flow up to the quality of the solo flow.

---

## IMPROVEMENT 1: Enrich the Matchup Flow

### Problem
`generateMatchupWeekPlan` produces flat strings like `'Log 3 positive interactions you had today'` while `generateSoloWeekPlan` produces rich objects with `{ text, why, type }`. The frontend likely handles both, but the matchup version loses all the educational depth.

### Solution
Refactor `generateMatchupWeekPlan` to use the same rich object format:

```javascript
// BEFORE (matchup flow)
baseActivities.monday = ['Log 3 positive interactions you had today'];

// AFTER (matchup flow)
baseActivities.monday = [{
  text: 'Log 3 positive interactions you had today — be specific about what they did and how it made you feel',
  why: 'Gottman\'s research: couples who maintain a 5:1 positive-to-negative ratio stay together 94% of the time. Logging positives trains your brain to notice them.',
  type: 'positive_lens',
  expert: 'gottman',
  duration: '2 min'
}];
```

### Implementation
Every activity in matchup flow should become a rich object. Add `expert` and `duration` fields to the schema.

---

## IMPROVEMENT 2: Profile-Driven Strategy Selection

### Problem
The solo flow checks `gottman?.score`, `eft?.score`, and `prep?.score` to identify focus areas, but it only uses broad categories (`friendship`, `conflict`, `attachment`, `communication`). It doesn't create a full relationship profile that drives hyper-personalized strategies.

### Solution
Build a `generateRelationshipProfile()` function that creates a comprehensive profile from ALL assessments:

```javascript
function generateRelationshipProfile(assessments) {
  const profile = {
    attachmentStyle: null,      // secure | anxious | avoidant | fearful_avoidant
    loveLanguage: null,         // words_of_affirmation | acts_of_service | etc.
    cyclePosition: null,        // pursuer | withdrawer | balanced
    dominantHorseman: null,     // criticism | contempt | defensiveness | stonewalling | none
    friendshipScore: null,      // 0-100
    conflictScore: null,        // 0-100
    meaningScore: null,         // 0-100
    communicationScore: null,   // 0-100
    focusAreas: []              // ordered by priority
  };

  const byType = {};
  for (const a of assessments) {
    if (!byType[a.type] || a.completedAt > byType[a.type].completedAt) {
      byType[a.type] = a;
    }
  }

  // Attachment
  if (byType.attachment) {
    profile.attachmentStyle = byType.attachment.score?.style || byType.attachment.result?.style;
  }

  // Love Language
  if (byType.love_language) {
    profile.loveLanguage = byType.love_language.score?.primary || byType.love_language.result?.primary;
  }

  // Gottman
  if (byType.gottman?.score) {
    const g = byType.gottman.score;
    profile.friendshipScore = g.friendship;
    profile.conflictScore = g.conflict;
    profile.meaningScore = g.meaning;
    
    // Determine dominant horseman from subscores if available
    if (g.horsemen) {
      const worst = Object.entries(g.horsemen)
        .sort(([,a], [,b]) => a - b)[0];
      if (worst && worst[1] < 60) profile.dominantHorseman = worst[0];
    }
  }

  // EFT / Cycle position
  if (byType.eft?.score) {
    profile.cyclePosition = byType.eft.score.cyclePosition || 
      (byType.eft.score.pursue > byType.eft.score.withdraw ? 'pursuer' : 'withdrawer');
  }

  // Derive cycle position from attachment if EFT not taken
  if (!profile.cyclePosition && profile.attachmentStyle) {
    if (profile.attachmentStyle === 'anxious') profile.cyclePosition = 'pursuer';
    if (profile.attachmentStyle === 'avoidant') profile.cyclePosition = 'withdrawer';
  }

  // Build priority focus areas
  const scores = [
    { area: 'friendship', score: profile.friendshipScore },
    { area: 'conflict', score: profile.conflictScore },
    { area: 'meaning', score: profile.meaningScore },
    { area: 'communication', score: profile.communicationScore },
  ].filter(s => s.score !== null && s.score < 70)
   .sort((a, b) => a.score - b.score);
  
  profile.focusAreas = scores.map(s => s.area);

  if (profile.attachmentStyle && profile.attachmentStyle !== 'secure') {
    profile.focusAreas.unshift('attachment');
  }

  return profile;
}
```

Then use this profile to drive activity selection:

```javascript
function generateSoloWeekPlan(week, assessments) {
  const profile = generateRelationshipProfile(assessments);
  // ... use profile.attachmentStyle, profile.cyclePosition, etc.
  // to select from technique libraries
}
```

---

## IMPROVEMENT 3: Technique Libraries (Not Inline Hardcoding)

### Problem
All strategies are hardcoded inline in the switch statements. This makes it impossible to:
- A/B test different techniques
- Add new expert techniques without code changes
- Personalize beyond the current if/else branching

### Solution
Create a technique library data file:

```javascript
// backend/src/data/techniques.js

const techniques = {
  // Key: unique ID, used for tracking completion and effectiveness
  'gottman-6-second-kiss': {
    text: 'Before leaving the house, give your partner a kiss that lasts at least 6 seconds',
    why: 'Gottman research: a 6-second kiss is long enough to feel romantic and creates a moment of genuine connection. It takes your kiss from autopilot to intentional.',
    expert: 'gottman',
    framework: 'rituals_of_connection',
    type: 'connection_ritual',
    duration: '10 seconds',
    stage: 'practice',
    targetProfiles: {
      loveLanguage: ['physical_touch'],  // primary match
      anyProfile: true                    // but good for everyone
    },
    difficulty: 1,  // 1-5
    researchBacking: 5  // 1-5
  },

  'voss-mirror-technique': {
    text: 'In your next conversation, repeat your partner\'s last 1-3 words back to them as a question before responding',
    why: 'Chris Voss (FBI negotiation): mirroring makes people feel deeply heard and encourages them to elaborate. It\'s the fastest trust-building technique known.',
    expert: 'voss',
    framework: 'tactical_empathy',
    type: 'communication_skill',
    duration: '30 seconds per use',
    stage: 'practice',
    targetProfiles: {
      dominantHorseman: ['criticism', 'defensiveness'],
      cyclePosition: ['pursuer'],
      focusAreas: ['communication', 'conflict']
    },
    difficulty: 2,
    researchBacking: 4
  },

  'brown-story-telling-myself': {
    text: 'When you feel triggered, say to your partner: "The story I\'m telling myself right now is..." and share your worst-case interpretation',
    why: 'Brené Brown: naming the narrative takes away its power. It signals vulnerability without blame, and invites your partner into your inner world instead of hitting them with your reaction.',
    expert: 'brown',
    framework: 'shame_resilience',
    type: 'emotional_regulation',
    duration: '1 minute',
    stage: 'practice',
    targetProfiles: {
      attachmentStyle: ['anxious', 'fearful_avoidant'],
      dominantHorseman: ['criticism', 'contempt'],
      focusAreas: ['conflict']
    },
    difficulty: 4,
    researchBacking: 4
  },

  // ... 50-100 more techniques from all 8 experts
};
```

Then the strategy generator SELECTS from this library based on profile matching:

```javascript
function selectTechniques(profile, week, count = 2) {
  return Object.values(techniques)
    .filter(t => matchesProfile(t.targetProfiles, profile))
    .filter(t => t.difficulty <= week + 1) // harder techniques in later weeks
    .sort((a, b) => scoreRelevance(b, profile) - scoreRelevance(a, profile))
    .slice(0, count);
}
```

---

## IMPROVEMENT 4: The Weekly Arc Should Follow the Unified Model

### Problem
Current 6-week structure is solid but doesn't map cleanly to Assess → Learn → Practice → Transform stages.

### Solution
Restructure the 6 weeks:

| Week | Stage | Theme | Primary Experts |
|------|-------|-------|----------------|
| 1 | ASSESS | Self-Awareness: See your patterns | Attachment + Brown |
| 2 | LEARN | Understanding: Why you do what you do | Johnson + Robbins |
| 3 | PRACTICE | Communication: New tools for old patterns | Voss + Gottman |
| 4 | PRACTICE | Emotional Regulation: Control your reaction | Gottman + Brown |
| 5 | PRACTICE | Connection: Build new rituals | Chapman + Gottman + Tatkin |
| 6 | TRANSFORM | Integration: This is who you are now | Robbins + Perel |

Each week should have a clear expert attribution so users feel like they're learning from the world's best, not just "the app."

---

## IMPROVEMENT 5: Add Horseman-Specific Interventions

### Problem
The solo flow checks for `focusAreas` like `friendship` and `conflict` but doesn't specifically target which of the Four Horsemen the user exhibits. Criticism needs different interventions than stonewalling.

### Solution
Add horseman-specific strategy branches:

```javascript
if (profile.dominantHorseman === 'criticism') {
  // Antidote: Gentle startup (Gottman) + Labeling (Voss)
  baseActivities.wednesday.push({
    text: 'Take your biggest current complaint and rewrite it as a gentle startup: "I feel ___ about ___ and I need ___" — no "you" statements allowed',
    why: 'Gottman\'s antidote to criticism is the gentle startup. It expresses the same need without attacking character. 96% of conversations end the way they begin.',
    type: 'horseman_antidote',
    expert: 'gottman'
  });
}

if (profile.dominantHorseman === 'contempt') {
  // Antidote: Build culture of appreciation (Gottman) + Fondness & Admiration
  baseActivities.monday.push({
    text: 'Write down 5 qualities you genuinely admire about your partner. Not what they do — who they ARE.',
    why: 'Gottman: contempt is the #1 predictor of divorce. Its antidote is a culture of respect and appreciation. You can\'t feel contempt and admiration simultaneously.',
    type: 'horseman_antidote',
    expert: 'gottman'
  });
}

if (profile.dominantHorseman === 'defensiveness') {
  // Antidote: Accept responsibility (Gottman) + Accusation audit (Voss)
  baseActivities.tuesday.push({
    text: 'Think of a recent complaint your partner had. Find the 2% that\'s valid and say: "You\'re right about [specific thing]. I can do better at that."',
    why: 'Gottman: defensiveness is really counter-attack. Accepting even partial responsibility disarms the cycle. Voss calls this the accusation audit — owning the negatives before they\'re weaponized.',
    type: 'horseman_antidote',
    expert: 'gottman+voss'
  });
}

if (profile.dominantHorseman === 'stonewalling') {
  // Antidote: Physiological self-soothing (Gottman) + Announced breaks
  baseActivities.thursday.push({
    text: 'Practice this script for your next flood moment: "I\'m feeling overwhelmed and I need 20 minutes to calm down. I\'m not leaving — I\'m regulating. I\'ll be back."',
    why: 'Gottman: stonewalling happens when heart rate exceeds 100 BPM. The antidote isn\'t "don\'t leave" — it\'s "leave WITH a promise to return." The announcement transforms abandonment into self-care.',
    type: 'horseman_antidote',
    expert: 'gottman'
  });
}
```

---

## IMPROVEMENT 6: Love Language Integration into Daily Activities

### Problem
Current strategy engine doesn't use love language results to personalize the connection ritual layer of daily activities.

### Solution
Add a `connectionRitual` to each day based on the user's partner's love language (if known from matchup) or the user's own language (for self-awareness):

```javascript
function getConnectionRitual(loveLanguage, day) {
  const rituals = {
    words_of_affirmation: {
      monday: { text: 'Text your partner one specific thing you admire about their character (not appearance)', why: 'Chapman: words of affirmation speakers need SPECIFIC, genuine verbal love. Generic "love you" doesn\'t land like "I admire how you stayed calm with the kids today."' },
      // ... one per day
    },
    physical_touch: {
      monday: { text: 'Gottman\'s 6-second kiss when you greet or say goodbye today', why: 'For physical touch speakers, casual affection throughout the day matters more than one big gesture. 6 seconds takes a kiss from routine to romantic.' },
      // ... one per day
    },
    // ... all 5 languages × 7 days = 35 rituals
  };
  return rituals[loveLanguage]?.[day];
}
```

---

## IMPROVEMENT 7: Matchup-Specific Strategies (The Power Feature)

### Problem
When both partners' data exists (matchup), the strategy engine should create strategies that address the DYNAMIC between them, not just individual patterns.

### Solution
Add dynamic-specific strategies for common pairings:

```javascript
function getMatchupDynamicStrategies(user1Profile, user2Profile) {
  const dynamics = [];

  // Anxious-Avoidant Trap
  if ((user1Profile.attachmentStyle === 'anxious' && user2Profile.attachmentStyle === 'avoidant') ||
      (user1Profile.attachmentStyle === 'avoidant' && user2Profile.attachmentStyle === 'anxious')) {
    dynamics.push({
      name: 'The Anxious-Avoidant Dance',
      forAnxious: [
        { text: 'When you feel the urge to reach out for the 3rd time today, pause. Write down what you actually need. Then express it ONCE, directly.', why: 'Levine: anxious protest behaviors (repeated calling, checking) trigger avoidant withdrawal. One clear request is 10x more effective than 10 subtle bids.' }
      ],
      forAvoidant: [
        { text: 'Initiate ONE moment of connection today before your partner asks for it. A text, a touch, a question about their day.', why: 'Levine: when avoidants initiate connection, it short-circuits the anxious partner\'s alarm system. One proactive reach = hours of reduced anxiety for them.' }
      ]
    });
  }

  // Same love language (easy wins)
  if (user1Profile.loveLanguage === user2Profile.loveLanguage) {
    dynamics.push({
      name: 'Shared Language Advantage',
      tip: 'You both speak the same love language! This is a superpower — you naturally understand what makes each other feel loved. The risk: you might assume it\'s automatic and stop being intentional.'
    });
  }

  // Different love languages (common disconnect)
  if (user1Profile.loveLanguage !== user2Profile.loveLanguage) {
    dynamics.push({
      name: 'Love Language Translation',
      tip: `You speak ${user1Profile.loveLanguage} but your partner speaks ${user2Profile.loveLanguage}. Chapman: you're probably loving them in YOUR language, not theirs. This week, express love ONLY in their language.`
    });
  }

  return dynamics;
}
```

---

## IMPROVEMENT 8: Progress Tracking Should Measure Transformation, Not Just Completion

### Problem
Current progress is a simple percentage of completed activities. This measures compliance, not change.

### Solution
Add weekly self-assessment micro-surveys:

```javascript
const weeklyCheckIn = {
  week1: [
    { q: 'How many times did you catch yourself in a negative thought about your partner this week?', type: 'number' },
    { q: 'On a scale of 1-10, how aware are you of your emotional patterns?', type: 'scale' },
  ],
  week3: [
    { q: 'How many times did you use the 6-second pause this week?', type: 'number' },
    { q: 'On a scale of 1-10, how well did you communicate needs without blame?', type: 'scale' },
  ],
  week6: [
    { q: 'Complete this sentence: "6 weeks ago I would have ___, but now I ___"', type: 'text' },
    { q: 'On a scale of 1-10, how confident are you in your ability to handle conflict?', type: 'scale' },
  ]
};
```

Track subjective improvement alongside activity completion to show users their REAL growth.

---

## PRIORITY ORDER

1. **Technique library data file** (Improvement 3) — unlocks everything else
2. **Relationship profile function** (Improvement 2) — drives personalization
3. **Enrich matchup flow** (Improvement 1) — biggest quality gap
4. **Horseman-specific interventions** (Improvement 5) — high-impact personalization
5. **Love language daily rituals** (Improvement 6) — easy win, high user satisfaction
6. **Weekly arc restructure** (Improvement 4) — framework alignment
7. **Matchup dynamics** (Improvement 7) — premium differentiator
8. **Transformation tracking** (Improvement 8) — retention driver

---

*Each improvement includes code-level suggestions ready for implementation.*
*Version 1.0 — First Session — 2026-02-10*

---

## Improvement 9: Standalone Assessment Quiz Funnel (Web) — Added 2026-02-12
*Source: Ad spy report — every top competitor uses quiz-to-app funnels but none have our assessment depth*

### The Problem
LoveRescue has 10+ assessments (more than Paired, Lasting, Coral, Flamme, or any competitor) — but they're ALL locked behind app download. Zero top-of-funnel web presence.

### What Competitors Do
- **Paired:** Sunday quiz → in-app engagement loop
- **Lasting:** Onboarding assessment → "94% report new strengths" proof point → subscription
- **SYMBIS:** Full pre-marriage assessment → church facilitator network
- **Standalone sites** (myattachmentstylequiz.com): SEO-optimized quizzes capturing organic traffic with zero app

### The Fix
Build `loverescue.app/quiz` — a standalone web-based Attachment Style Quiz that:

1. **5-7 questions** (subset of full in-app assessment, based on Amir Levine's "Attached")
2. **No app download required** — runs in mobile browser
3. **Email capture gate** before showing results
4. **Results page shows:**
   - Attachment style (Secure/Anxious/Avoidant/Disorganized)
   - 2-sentence explanation
   - "You scored X/100 on attachment security"
   - Teaser: "Your full relationship profile covers 11 more dimensions"
   - CTA: "Download LoveRescue to unlock your complete profile"
5. **Meta Pixel + retargeting:** Quiz completers become warm audience for paid ads
6. **SEO play:** Target "attachment style quiz" (high-volume keyword) for organic traffic
7. **Shareability:** "I got Anxious-Preoccupied — what are you?" social share button on results

### Code-Level Suggestions
- New route: `/quiz` in React frontend (or standalone Next.js page for SEO)
- Reuse existing assessment logic from `/assessments` but simplified
- New API endpoint: `POST /api/quiz/submit` (email + answers → store lead)
- Prisma model: `QuizLead { email, attachmentStyle, score, createdAt, convertedToUser }`
- Email drip: Day 1 (results), Day 3 ("Did you know your love language affects..."), Day 7 ("Your partner's attachment style matters too")

### Why This Wins
- **Lowest friction entry point** in the entire relationship app market
- **Data moat:** Every quiz-taker = lead with known attachment style for targeting
- **Content engine:** Quiz results fuel social proof ("47% of our users are Anxious-Preoccupied")
- **SEO + Paid synergy:** Organic quiz traffic + paid retargeting = compounding acquisition

### Priority: 🔴 CRITICAL — This should be built BEFORE spending any paid ad budget

---

## Improvement 10: "No Judgment" AI Positioning — Added 2026-02-15
*Source: Ad spy report — CoupleWork AI has run the same "no judgment" ad for 7+ months (longest-running competitor ad)*

### The Problem
Couples hesitate to use relationship apps because they fear judgment — the same reason many avoid therapy. LoveRescue's AI therapist feature is undersold as a feature rather than a positioning statement.

### What CoupleWork AI Does
Their 7-month running ad copy (word for word):
> "Getting relationship help shouldn't feel like a debate. You don't need someone taking sides. You don't need assumptions about your situation. You need real, unbiased support. That's exactly what CoupleWork.AI provides: ✅ AI-driven coaching that stays fair and balanced. ✅ Science-backed techniques that actually work. ✅ No judgment, just clear strategies for growth."

This ad has run since **June 30, 2025** — indicating strong conversion performance.

### The Fix
1. **Onboarding copy:** Add to welcome flow: "Your AI guide never takes sides. It focuses on solutions, not blame."
2. **Marketing positioning:** "The only couples app that doesn't pick favorites"
3. **App Store description:** Lead with "Judgment-free relationship support"
4. **Ad creative:** Steal the pattern: "Getting help shouldn't feel like [negative]. You need [positive]."

### Why This Wins
- Addresses the #1 objection to any relationship intervention: fear of blame
- AI as "neutral arbiter" is a unique advantage over human therapists
- Proven by 7+ months of continuous ad spend by competitor

### Priority: 🟡 HIGH — Easy copy change, high impact on conversion

---

## Improvement 11: Male-Specific Onboarding & Marketing — Added 2026-02-15
*Source: Ad spy report — Relatio is crushing it with male-focused "get your ex back" ads*

### The Problem
The relationship app market is 70%+ female. Most apps speak to female pain points. Relatio has found a massive arbitrage opportunity by targeting men specifically.

### What Relatio Does
- Long-form story ads written from male POV ("I was sitting in my car at 3 AM...")
- Hooks: "If you want her to come back and never leave again, THIS is what you need to do"
- Framing: "psychological triggers", "day-by-day plan", "she responded in 9 minutes"
- Their entire positioning is male-first

### The Fix
1. **Male-specific assessment questions:** Frame questions with male-resonant language
2. **Marketing copy for male audiences:**
   - "Finally, relationship help that gets where you're coming from"
   - "Practical strategies. No fluff. Just what works."
   - "Your partner isn't the only one who gets to have tools."
3. **Feature framing:** Position assessments as "diagnostic tools" not "emotional work"
4. **Separate ad creative:** Create male-specific video ads with male voiceover/protagonist
5. **Landing page:** /for-men with male-specific testimonials and copy

### Why This Wins
- Untapped audience with lower CAC (less competition for male relationship keywords)
- Men who engage with relationship content are HIGHLY committed (survived social stigma)
- Relatio proving the market exists with aggressive ad spend

### Priority: 🟡 HIGH — Market expansion opportunity

---

## Improvement 12: Post-Valentine's Timing Strategy — Added 2026-02-15
*Source: Ad spy report timing analysis*

### The Insight
Valentine's Day (Feb 14) creates a unique window:
- **Feb 12-15:** CPMs spike 20-40%, everyone competing
- **Feb 16-28:** CPMs DROP, but relationship intent stays HIGH (post-V-Day reflection)

### The Fix
- **Feb 12-15:** Organic content only (social posts, no paid ads)
- **Feb 16-28:** Launch paid ads with post-Valentine's messaging:
  - "Flowers die in a week. Your communication patterns last forever."
  - "Valentine's Day is over. The real work starts now."
  - "Valentine's Day revealed the cracks. We help you fill them."
- **Calendar in app:** Add annual "Post-Valentine's Week" push notification campaign

### Why This Wins
- Lower CPMs = better unit economics
- Counter-cyclical messaging stands out ("everyone else is done talking about V-Day")
- Captures the reflection/regret audience ("that dinner was awkward...")

### Priority: 🔴 TIME-SENSITIVE — Deploy Feb 16-17

---

## NEW COMPETITOR ALERT: Relatio — Added 2026-02-15

| App | Model | Positioning | Threat Level |
|-----|-------|-------------|--------------|
| Relatio | Quiz funnel → app download | "Get your ex back" via psychological triggers, male-focused | 🔴 CRITICAL |

### What They Do
- 3,000+ word long-form Facebook ads (story format)
- Quiz funnel at quiz.getrelatio.com
- Male-focused messaging
- "Psychological triggers" framing (borderline manipulative)
- Running since Feb 13, 2026 with aggressive spend

### Why They're Dangerous
- They're positioning in the "rescue" space — directly overlapping LoveRescue's name
- They have a WORKING quiz funnel that we don't
- They target an audience (men) that most competitors ignore

### Counter-Strategy
- Accelerate our own quiz funnel (Improvement 9)
- Create male-specific messaging (Improvement 11)
- Monitor their ad creative weekly for new angles
