/**
 * @module crisisPathway
 * @description Crisis Mode Pathway for LoveRescue — immediate intervention system
 * for relationship emergencies. Synthesizes techniques from Gottman (repair attempts,
 * flooding protocol), Chris Voss (tactical empathy, labeling), Sue Johnson (Hold Me
 * Tight, A.R.E. framework), and Brené Brown (shame resilience, story rumble).
 *
 * SAFETY PRINCIPLES:
 * - All advice is directed at SELF-REGULATION, never "how to confront your partner"
 * - Mental health crisis resources included when severity warrants
 * - Never weaponizes therapy insights — always redirects to self-reflection
 *
 * @author SteveRogers / LoveRescue
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** @enum {string} Crisis types the system can handle */
const CRISIS_TYPE = Object.freeze({
  AFFAIR_DISCOVERY: 'AFFAIR_DISCOVERY',
  SEPARATION_THREAT: 'SEPARATION_THREAT',
  ESCALATED_CONFLICT: 'ESCALATED_CONFLICT',
  EMOTIONAL_FLOODING: 'EMOTIONAL_FLOODING',
  BETRAYAL_TRAUMA: 'BETRAYAL_TRAUMA',
});

/** @enum {number} Crisis severity levels */
const CRISIS_LEVEL = Object.freeze({
  ELEVATED: 1,   // Heightened distress, functional but struggling
  ACUTE: 2,      // Severe distress, decision-making impaired
  EMERGENCY: 3,  // Safety concerns, self-harm ideation, complete overwhelm
});

/**
 * Keyword patterns mapped to crisis types. Each pattern has a weight
 * contributing to severity detection.
 * @private
 */
const CRISIS_INDICATORS = {
  [CRISIS_TYPE.AFFAIR_DISCOVERY]: {
    patterns: [
      { regex: /\b(cheating|cheated|affair|unfaithful|infidelity)\b/i, weight: 3 },
      { regex: /\b(found (messages?|texts?|emails?|photos?))\b/i, weight: 3 },
      { regex: /\b(sexting|dating app|tinder|bumble|hinge)\b/i, weight: 2 },
      { regex: /\b(other (wo)?man|someone else|sleeping with)\b/i, weight: 3 },
      { regex: /\b(betrayed|betrayal|lied about .*(seeing|meeting|talking))\b/i, weight: 2 },
      { regex: /\b(just (found|discovered|realized))\b/i, weight: 1 },
    ],
    baseLevel: CRISIS_LEVEL.ACUTE,
  },
  [CRISIS_TYPE.SEPARATION_THREAT]: {
    patterns: [
      { regex: /\b(divorce|separation|leaving( me)?|moving out)\b/i, weight: 3 },
      { regex: /\b(it'?s over|we'?re done|i'?m done|ending (this|it|us))\b/i, weight: 3 },
      { regex: /\b(lawyer|attorney|custody|papers)\b/i, weight: 3 },
      { regex: /\b(packed (bags?|things)|staying (at|with) (a friend|my (mom|parent)))\b/i, weight: 2 },
      { regex: /\b(trial separation|taking a break|need space)\b/i, weight: 1 },
      { regex: /\b(can'?t do this anymore|i give up)\b/i, weight: 2 },
    ],
    baseLevel: CRISIS_LEVEL.ACUTE,
  },
  [CRISIS_TYPE.ESCALATED_CONFLICT]: {
    patterns: [
      { regex: /\b(screaming|yelling|throwing things|slammed)\b/i, weight: 3 },
      { regex: /\b(huge fight|worst fight|explosive|blow[- ]?up)\b/i, weight: 2 },
      { regex: /\b(said (horrible|terrible|unforgivable) things)\b/i, weight: 2 },
      { regex: /\b(in front of (the )?kids|children (heard|saw|were there))\b/i, weight: 3 },
      { regex: /\b(threatening|threatened|scared of (him|her|them))\b/i, weight: 3 },
      { regex: /\b(police|cops|called 911)\b/i, weight: 3 },
      { regex: /\b(hit|pushed|grabbed|shoved|physical)\b/i, weight: 3 },
    ],
    baseLevel: CRISIS_LEVEL.ELEVATED,
  },
  [CRISIS_TYPE.EMOTIONAL_FLOODING]: {
    patterns: [
      { regex: /\b(can'?t (breathe|think|stop crying|function|sleep|eat))\b/i, weight: 2 },
      { regex: /\b(panic attack|anxiety attack|shaking|trembling)\b/i, weight: 2 },
      { regex: /\b(heart (racing|pounding)|chest (tight|hurts))\b/i, weight: 2 },
      { regex: /\b(spiraling|losing (it|my mind)|falling apart|breaking down)\b/i, weight: 2 },
      { regex: /\b(numb|can'?t feel anything|dissociat(ing|ed))\b/i, weight: 2 },
      { regex: /\b(haven'?t (slept|eaten) in)\b/i, weight: 2 },
    ],
    baseLevel: CRISIS_LEVEL.ELEVATED,
  },
  [CRISIS_TYPE.BETRAYAL_TRAUMA]: {
    patterns: [
      { regex: /\b(gaslighting|gaslit|manipulated|lied for (months|years|weeks))\b/i, weight: 3 },
      { regex: /\b(double life|secret (family|relationship|account))\b/i, weight: 3 },
      { regex: /\b(everything was a lie|whole (life|marriage|relationship) was)\b/i, weight: 3 },
      { regex: /\b(financial (infidelity|betrayal|secret)|hidden (money|debt|accounts))\b/i, weight: 2 },
      { regex: /\b(porn addiction|sex addiction|compulsive)\b/i, weight: 2 },
      { regex: /\b(don'?t know what'?s real|can'?t trust (my own|myself))\b/i, weight: 2 },
    ],
    baseLevel: CRISIS_LEVEL.ACUTE,
  },
};

/** Escalation indicators that bump severity up regardless of crisis type */
const SEVERITY_ESCALATORS = [
  { regex: /\b(suicid(e|al)|kill (myself|me)|want to die|end (it all|my life))\b/i, escalateTo: CRISIS_LEVEL.EMERGENCY },
  { regex: /\b(self[- ]?harm|cutting|hurt(ing)? myself)\b/i, escalateTo: CRISIS_LEVEL.EMERGENCY },
  { regex: /\b(don'?t want to (live|be here|go on|wake up))\b/i, escalateTo: CRISIS_LEVEL.EMERGENCY },
  { regex: /\b(weapon|gun|knife)\b/i, escalateTo: CRISIS_LEVEL.EMERGENCY },
  { regex: /\b(children (in danger|at risk|being hurt)|hurting (the )?kids)\b/i, escalateTo: CRISIS_LEVEL.EMERGENCY },
  { regex: /\b(no (one|body) (cares|would (miss|notice)))\b/i, escalateTo: CRISIS_LEVEL.EMERGENCY },
];

/** Intensity amplifiers that bump level by +1 */
const INTENSITY_AMPLIFIERS = [
  /\b(just (happened|found out|discovered)|right now|happening now)\b/i,
  /\b(i don'?t know what to do)\b/i,
  /\b(please help|desperate|emergency)\b/i,
  /\b(worst (day|moment|thing) (of|in) my life)\b/i,
  /\b(completely (lost|broken|destroyed|shattered))\b/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// MENTAL HEALTH SAFETY RESOURCES
// ═══════════════════════════════════════════════════════════════════════════════

const SAFETY_RESOURCES = Object.freeze({
  suicideAndCrisis: {
    name: '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    available: '24/7',
    url: 'https://988lifeline.org',
  },
  crisisTextLine: {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    available: '24/7',
    url: 'https://www.crisistextline.org',
  },
  domesticViolence: {
    name: 'National Domestic Violence Hotline',
    contact: 'Call 1-800-799-7233 or text START to 88788',
    available: '24/7',
    url: 'https://www.thehotline.org',
  },
  samhsa: {
    name: 'SAMHSA National Helpline',
    contact: 'Call 1-800-662-4357',
    available: '24/7, free, confidential',
    url: 'https://www.samhsa.gov/find-help/national-helpline',
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLOODING FIRST AID — always accessible
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Physiological self-soothing module. Based on Gottman's flooding research:
 * when heart rate exceeds 100 BPM, cognitive capacity drops ~30%.
 * Always available regardless of crisis type.
 */
const FLOODING_FIRST_AID = Object.freeze({
  title: 'Flooding First Aid — Your Body Hit the Panic Button',
  explanation:
    'Right now your nervous system is in fight-or-flight. Gottman\'s research shows that ' +
    'when your heart rate exceeds 100 BPM, you literally cannot think clearly, listen, or ' +
    'problem-solve. This is biology, not weakness. Step one is calming your body.',

  immediateGrounding: {
    name: '5-4-3-2-1 Grounding Exercise',
    expert: 'Clinical standard, supported by Gottman flooding research',
    timeRequired: '2 minutes',
    steps: [
      'Name 5 things you can SEE right now — say them out loud',
      'Name 4 things you can TOUCH — reach out and feel them',
      'Name 3 things you can HEAR — close your eyes and listen',
      'Name 2 things you can SMELL — breathe deeply',
      'Name 1 thing you can TASTE',
    ],
  },

  breathingExercise: {
    name: '4-7-8 Breathing',
    expert: 'Supported by Gottman physiological soothing research',
    timeRequired: '3 minutes',
    steps: [
      'Breathe IN through your nose for 4 seconds',
      'HOLD for 7 seconds',
      'Breathe OUT slowly through your mouth for 8 seconds',
      'Repeat 4 times',
      'Your heart rate will drop measurably — this is vagus nerve activation',
    ],
  },

  twentyMinuteRule: {
    name: 'The 20-Minute Rule',
    expert: 'Gottman',
    explanation:
      'It takes a minimum of 20 minutes for stress hormones to clear your system. ' +
      'During this time, do NOT think about the conflict, rehearse arguments, or plan ' +
      'what you\'ll say. Your brain cannot process relationship problems while flooded.',
    doInstead: [
      'Go for a walk — movement helps metabolize stress hormones',
      'Read something unrelated — shifts brain activity to prefrontal cortex',
      'Listen to calming music — proven to lower cortisol',
      'Splash cold water on your face — triggers the dive reflex, instantly lowers heart rate',
      'Do light stretching or progressive muscle relaxation',
    ],
    doNot: [
      'Do NOT replay the argument in your head',
      'Do NOT plan your rebuttal',
      'Do NOT watch anything violent or stressful',
      'Do NOT text/call your partner while still flooded',
      'Do NOT make any major decisions',
    ],
  },

  bodySignals: {
    name: 'Know Your Flooding Signals',
    signs: [
      'Heart racing or pounding',
      'Jaw clenching or teeth grinding',
      'Fists tightening',
      'Stomach dropping or churning',
      'Voice rising in pitch or volume',
      'Wanting to yell, run, or shut down completely',
      'Tunnel vision — can\'t see anything but the threat',
      'Feeling "hot" — face flushing, ears burning',
    ],
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPERT TECHNIQUE LIBRARIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @private
 * Expert-attributed intervention techniques organized by application context.
 */
const EXPERT_TECHNIQUES = {
  /**
   * Gottman: Repair Attempts — the single greatest predictor of marital success.
   * Emotion-focused, not logic-focused.
   */
  gottmanRepair: {
    expert: 'John Gottman',
    source: 'The Seven Principles for Making Marriage Work',
    techniques: [
      {
        name: 'Softened Startup',
        instruction: 'When you\'re ready to talk (NOT while flooded), start with "I feel..." not "You always..."',
        example: '"I feel scared when I think about what happened" — NOT "You destroyed our marriage"',
        why: 'Gottman found that conversations end the way they start 96% of the time. A harsh startup guarantees a harsh ending.',
      },
      {
        name: 'The Repair Phrase',
        instruction: 'Memorize and use: "I\'m sorry I said that. Let me try again."',
        example: 'Mid-argument, stop yourself: "Wait — that came out wrong. What I\'m actually feeling is..."',
        why: 'Repair attempts are the #1 predictor of marital success. Not avoiding conflict — repairing it.',
      },
      {
        name: 'The Regrettable Incident Method',
        instruction: 'After things calm down — (1) Name your emotions, (2) Share your perspective using "I felt/saw/heard", (3) Identify old triggers, (4) Take responsibility, (5) One constructive step forward.',
        why: 'The apology comes LATE because you need to understand the full impact first. This method prevents surface-level "sorry" that doesn\'t heal.',
        timing: 'Use 24-48 hours after the crisis, not during',
      },
      {
        name: 'The Notebook Method',
        instruction: 'When your partner needs to talk, pull out a notebook and take notes on what they say.',
        why: 'Writing moves processing from the amygdala to the prefrontal cortex — it calms YOU down while making your partner feel valued.',
        timing: 'Use when re-engaging after the initial crisis stabilizes',
      },
    ],
  },

  /**
   * Chris Voss: Tactical Empathy — understanding the other's perspective
   * and reflecting it back. Deactivates fight-or-flight.
   */
  vossTacticalEmpathy: {
    expert: 'Chris Voss',
    source: 'Never Split the Difference',
    techniques: [
      {
        name: 'Tactical Pause',
        instruction: 'Before responding to ANYTHING, pause for 6 full seconds. Let silence work.',
        why: 'The pause breaks the reactive cycle. Your brain needs 6 seconds for the amygdala hijack to release. Silence is more powerful than any words right now.',
        timing: 'Immediate — use right now',
      },
      {
        name: 'Labeling Your Own Emotions',
        instruction: 'Say out loud: "What I\'m feeling right now is..." — name it precisely. Anger? Underneath that: hurt, fear, or betrayal?',
        example: '"What I\'m feeling is terrified that my world just changed" or "What I\'m feeling is grief for what I thought was real"',
        why: 'Voss found that labeling emotions — even your own — activates the rational brain and deactivates the amygdala. Naming it tames it.',
        timing: 'Immediate — use right now',
      },
      {
        name: 'Labeling (for later conversation)',
        instruction: 'When you eventually talk, reflect their emotion: "It seems like you\'re feeling..." — never start with "I"',
        example: '"It sounds like this has been weighing on you" / "It seems like you\'re scared too"',
        why: 'People need to feel SEEN before they\'ll cooperate. Labeling creates that feeling without you having to agree or disagree.',
        timing: 'Use when re-engaging in conversation, not during acute crisis',
      },
      {
        name: 'Calibrated Questions (for later)',
        instruction: 'Ask "How" and "What" questions — never "Why" (it triggers defensiveness).',
        example: '"What do you need from me right now?" / "How can we figure this out together?"',
        why: '"Why" sounds like an accusation. "How/What" invites collaboration and gives the other person a sense of control.',
        timing: 'Use during stabilization phase, not during acute crisis',
      },
    ],
  },

  /**
   * Sue Johnson: Hold Me Tight — attachment-focused intervention.
   * The core question of every crisis: "Are you there for me?"
   */
  johnsonHoldMeTight: {
    expert: 'Sue Johnson',
    source: 'Hold Me Tight / Emotionally Focused Therapy',
    techniques: [
      {
        name: 'Name the Cycle, Not the Villain',
        instruction: 'Recognize that the PATTERN is the enemy, not your partner. Name what\'s happening: "We\'re in the cycle again."',
        why: 'Johnson found that 80% of couples have a pursue-withdraw cycle. When you externalize the pattern, it becomes "us vs. the cycle" instead of "you vs. me."',
        timing: 'Use once initial flooding subsides',
      },
      {
        name: 'Find the Attachment Need Underneath',
        instruction: 'Ask yourself: "What am I REALLY feeling under the anger/numbness? What do I need from my partner right now?"',
        example: 'Under anger → fear of abandonment. Under numbness → overwhelm from feeling inadequate. Under rage → grief for the relationship you thought you had.',
        why: 'The presenting emotion is NEVER the real one. Every crisis is ultimately asking: "Are you there for me? Do I matter to you?"',
        timing: 'Reflective exercise — do this in writing when you have a quiet moment',
      },
      {
        name: 'Softened Vulnerability (The Breakthrough)',
        instruction: 'When ready, express the NEED, not the accusation: "I\'m scared that..." instead of "You did..."',
        example: '"I\'m terrified that I don\'t matter to you" / "I need to know if we can get through this together"',
        why: 'Johnson\'s research: when the pursuer stops attacking and says "I push because I\'m scared of losing you," and the withdrawer says "I go quiet because I\'m afraid of making it worse" — that\'s the turning point. Raw vulnerability breaks the cycle.',
        timing: 'Only when BOTH partners are regulated. Not during flooding.',
      },
      {
        name: 'A.R.E. Self-Check',
        instruction: 'Ask yourself the three attachment questions: Am I Accessible to my partner? Am I Responsive to their needs? Am I Engaged in this relationship?',
        why: 'Before asking "are they there for me," check if YOU are there for THEM. This isn\'t blame — it\'s the foundation of repair.',
        timing: 'Reflective exercise during stabilization phase',
      },
    ],
  },

  /**
   * Brené Brown: Shame Resilience & Story Rumble — preventing
   * shame spirals from hijacking the crisis response.
   */
  brownStoryRumble: {
    expert: 'Brené Brown',
    source: 'Rising Strong / Daring Greatly',
    techniques: [
      {
        name: 'The Story I\'m Telling Myself',
        instruction: 'Say or write: "The story I\'m telling myself right now is..." — then question it. Is it the whole truth?',
        example: '"The story I\'m telling myself is that I\'m unlovable and this proves it." → Reality check: this is shame talking, not truth.',
        why: 'Brown\'s research: we make up stories to fill in gaps, and those stories are almost always worst-case. Naming the story creates distance from it.',
        timing: 'Immediate — use right now to prevent shame spiral',
      },
      {
        name: 'Shame vs. Guilt Check',
        instruction: 'Ask: "Am I feeling \'I AM bad\' (shame) or \'I DID something bad / something bad happened TO me\' (guilt/grief)?"',
        why: 'Shame says "I am unworthy of connection." Guilt says "I made a mistake." One destroys, the other can lead to growth. Knowing which you\'re feeling changes everything.',
        timing: 'Immediate self-assessment',
      },
      {
        name: 'Identify Your Armor',
        instruction: 'Notice if you\'re reaching for: perfectionism ("I should have known"), numbing (alcohol, overwork, scrolling), blame ("this is all their fault"), or foreboding joy ("I knew this would happen").',
        why: 'These are shame armor patterns. They feel protective but they block healing. Name the armor to take it off.',
        timing: 'Ongoing awareness during the entire crisis period',
      },
      {
        name: 'The Rumble',
        instruction: 'Write the FULL messy story — all the emotions, all the ugly thoughts. Then identify: What do I actually know vs. what am I making up? What\'s my part in this?',
        why: 'Brown: "The most dangerous stories we make up are the narratives that diminish our inherent worthiness." The rumble separates fact from fiction and shame from grief.',
        timing: 'Journaling exercise within 24-48 hours',
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// THERAPIST ALERT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lazy-loaded reference to therapist alert system.
 * Avoids circular dependency — loaded on first use.
 * @private
 */
let _therapistAlerts = null;

/**
 * Gets the therapist alerts module (lazy-loaded).
 * @private
 * @returns {Object|null}
 */
function _getTherapistAlerts() {
  if (_therapistAlerts === null) {
    try {
      _therapistAlerts = require('./therapistAlerts');
    } catch (err) {
      console.warn('[CrisisPathway] therapistAlerts module not available:', err.message);
      _therapistAlerts = false; // Mark as unavailable, don't retry
    }
  }
  return _therapistAlerts || null;
}

/**
 * Notifies linked therapists when a crisis is detected for a client.
 * Called automatically by detectCrisisLevel when used with a clientId.
 * Level 2-3 crises trigger immediate push notifications.
 *
 * @param {string} clientId - UUID of the client in crisis
 * @param {CrisisDetectionResult} crisisResult - Detection result
 * @returns {Promise<void>}
 * @private
 */
async function _notifyTherapists(clientId, crisisResult) {
  const alerts = _getTherapistAlerts();
  if (!alerts || !crisisResult.isCrisis) return;

  try {
    await alerts.handleCrisisDetection(clientId, crisisResult);
  } catch (err) {
    // Never let alert failure break the crisis response flow
    console.error('[CrisisPathway] Failed to notify therapists:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRISIS DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} CrisisDetectionResult
 * @property {boolean} isCrisis - Whether crisis indicators were detected
 * @property {number} level - Crisis level (1=elevated, 2=acute, 3=emergency)
 * @property {string} primaryType - The dominant crisis type detected
 * @property {string[]} allTypes - All crisis types detected (may overlap)
 * @property {boolean} safetyRisk - Whether self-harm/safety indicators were found
 * @property {Object[]} safetyResources - Applicable safety resources (always included at level 3)
 * @property {number} confidence - Detection confidence 0-1
 */

/**
 * Analyzes user input text for crisis indicators. Detects crisis type and
 * severity level using pattern matching against known crisis language.
 *
 * @param {string} userInput - Raw text from user (free-form or assessment answers)
 * @param {string} [clientId] - Optional client UUID. When provided and crisis is detected,
 *   automatically notifies linked therapists. Level 2-3 crises get immediate push notification.
 * @returns {CrisisDetectionResult} Detection result with type, level, and safety info
 *
 * @example
 * const result = detectCrisisLevel("I just found out my wife has been cheating", "user-uuid");
 * // { isCrisis: true, level: 2, primaryType: 'AFFAIR_DISCOVERY', ... }
 * // → Linked therapists receive immediate push notification
 *
 * @example
 * const result = detectCrisisLevel("We had a nice dinner last night");
 * // { isCrisis: false, level: 0, primaryType: null, ... }
 */
function detectCrisisLevel(userInput, clientId) {
  if (!userInput || typeof userInput !== 'string') {
    return {
      isCrisis: false,
      level: 0,
      primaryType: null,
      allTypes: [],
      safetyRisk: false,
      safetyResources: [],
      confidence: 0,
    };
  }

  const text = userInput.trim();
  if (text.length === 0) {
    return {
      isCrisis: false,
      level: 0,
      primaryType: null,
      allTypes: [],
      safetyRisk: false,
      safetyResources: [],
      confidence: 0,
    };
  }

  // 1. Check for safety escalators first (self-harm, violence, etc.)
  let safetyRisk = false;
  let maxLevel = 0;

  for (const escalator of SEVERITY_ESCALATORS) {
    if (escalator.regex.test(text)) {
      safetyRisk = true;
      maxLevel = Math.max(maxLevel, escalator.escalateTo);
    }
  }

  // 2. Score each crisis type
  const typeScores = {};
  const detectedTypes = [];

  for (const [crisisType, config] of Object.entries(CRISIS_INDICATORS)) {
    let score = 0;
    let matchCount = 0;

    for (const pattern of config.patterns) {
      if (pattern.regex.test(text)) {
        score += pattern.weight;
        matchCount++;
      }
    }

    if (matchCount > 0) {
      typeScores[crisisType] = { score, matchCount, baseLevel: config.baseLevel };
      detectedTypes.push(crisisType);
    }
  }

  // 3. No crisis detected
  if (detectedTypes.length === 0 && !safetyRisk) {
    return {
      isCrisis: false,
      level: 0,
      primaryType: null,
      allTypes: [],
      safetyRisk: false,
      safetyResources: [],
      confidence: 0,
    };
  }

  // 4. Determine primary type (highest score)
  let primaryType = null;
  let highestScore = 0;

  for (const [type, data] of Object.entries(typeScores)) {
    if (data.score > highestScore) {
      highestScore = data.score;
      primaryType = type;
    }
  }

  // 5. Calculate level from base + amplifiers
  let level = primaryType ? typeScores[primaryType].baseLevel : CRISIS_LEVEL.ELEVATED;

  // Check intensity amplifiers
  let amplifierCount = 0;
  for (const amp of INTENSITY_AMPLIFIERS) {
    if (amp.test(text)) amplifierCount++;
  }
  if (amplifierCount >= 2) {
    level = Math.min(CRISIS_LEVEL.EMERGENCY, level + 1);
  }

  // Safety escalation overrides
  level = Math.max(level, maxLevel);

  // 6. Confidence score (0-1 based on match density)
  const totalPatterns = Object.values(CRISIS_INDICATORS)
    .reduce((sum, c) => sum + c.patterns.length, 0);
  const totalMatches = Object.values(typeScores).reduce((sum, d) => sum + d.matchCount, 0);
  const confidence = Math.min(1, (totalMatches / 3) * 0.5 + (highestScore / 6) * 0.5);

  // 7. Determine safety resources
  const safetyResources = [];
  if (safetyRisk || level >= CRISIS_LEVEL.EMERGENCY) {
    safetyResources.push(SAFETY_RESOURCES.suicideAndCrisis);
    safetyResources.push(SAFETY_RESOURCES.crisisTextLine);
  }
  if (detectedTypes.includes(CRISIS_TYPE.ESCALATED_CONFLICT)) {
    // Check for DV indicators
    if (/\b(hit|push|grab|shov|physical|weapon|scared of (him|her|them)|threaten)/i.test(text)) {
      safetyResources.push(SAFETY_RESOURCES.domesticViolence);
    }
  }
  // Always include SAMHSA for level 3
  if (level >= CRISIS_LEVEL.EMERGENCY) {
    safetyResources.push(SAFETY_RESOURCES.samhsa);
  }

  const result = {
    isCrisis: true,
    level,
    primaryType: primaryType || CRISIS_TYPE.EMOTIONAL_FLOODING,
    allTypes: detectedTypes,
    safetyRisk,
    safetyResources,
    confidence: Math.round(confidence * 100) / 100,
  };

  // Notify linked therapists (async, non-blocking — never breaks client flow)
  if (clientId) {
    _notifyTherapists(clientId, result).catch(() => {});
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRISIS RESPONSE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} CrisisAction
 * @property {string} title - Action title
 * @property {string} instruction - What to do
 * @property {string} why - Expert-backed reasoning
 * @property {string} expert - Attribution (e.g., "Gottman", "Voss")
 * @property {string} timeRequired - Estimated time
 */

/**
 * @typedef {Object} CrisisResponse
 * @property {string} crisisType - The crisis type being addressed
 * @property {number} crisisLevel - Severity level (1-3)
 * @property {string} levelLabel - Human-readable level label
 * @property {string} openingMessage - Compassionate, grounding first message
 * @property {Object} floodingFirstAid - Always-accessible flooding module
 * @property {Object} immediateActions - What to do in the next 5 minutes
 * @property {Object} shortTermPlan - Next 24 hours
 * @property {Object} stabilizationPlan - Next 7 days
 * @property {Object[]} expertTechniques - Relevant expert techniques
 * @property {Object[]} safetyResources - Crisis hotlines/resources (when warranted)
 * @property {string[]} boundaries - Things NOT to do (anti-weaponization)
 */

/**
 * Generates a structured crisis intervention response based on crisis type,
 * severity level, and optional user profile data.
 *
 * All advice is directed at SELF-REGULATION. The system never suggests
 * confronting, investigating, or retaliating against a partner.
 *
 * @param {number} crisisLevel - 1 (elevated), 2 (acute), or 3 (emergency)
 * @param {string} crisisType - One of CRISIS_TYPE enum values
 * @param {Object} [userProfile={}] - Optional user context
 * @param {string} [userProfile.attachmentStyle] - 'anxious', 'avoidant', 'secure', 'disorganized'
 * @param {string} [userProfile.cyclePosition] - 'pursuer' or 'withdrawer'
 * @param {string} [userProfile.name] - User's first name for personalization
 * @returns {CrisisResponse} Complete crisis intervention plan
 *
 * @example
 * const response = generateCrisisResponse(
 *   2,
 *   'AFFAIR_DISCOVERY',
 *   { attachmentStyle: 'anxious', name: 'Sarah' }
 * );
 */
function generateCrisisResponse(crisisLevel, crisisType, userProfile = {}) {
  const level = Math.max(1, Math.min(3, crisisLevel));
  const name = userProfile.name || 'friend';
  const type = CRISIS_TYPE[crisisType] ? crisisType : CRISIS_TYPE.EMOTIONAL_FLOODING;

  const levelLabels = {
    1: 'Elevated — You\'re in distress but you can get through this',
    2: 'Acute — This is overwhelming, and that\'s a valid response',
    3: 'Emergency — Your safety matters most right now',
  };

  // Build opening message
  const openingMessage = _buildOpeningMessage(level, type, name);

  // Build immediate actions (next 5 minutes)
  const immediateActions = _buildImmediateActions(level, type, userProfile);

  // Build short-term plan (next 24 hours)
  const shortTermPlan = _buildShortTermPlan(level, type, userProfile);

  // Build stabilization plan (next 7 days)
  const stabilizationPlan = _buildStabilizationPlan(level, type, userProfile);

  // Select relevant expert techniques
  const expertTechniques = _selectExpertTechniques(type, level);

  // Safety resources
  const safetyResources = [];
  if (level >= CRISIS_LEVEL.EMERGENCY) {
    safetyResources.push(SAFETY_RESOURCES.suicideAndCrisis);
    safetyResources.push(SAFETY_RESOURCES.crisisTextLine);
    safetyResources.push(SAFETY_RESOURCES.samhsa);
  }
  if (type === CRISIS_TYPE.ESCALATED_CONFLICT) {
    safetyResources.push(SAFETY_RESOURCES.domesticViolence);
  }
  // Always include at level 2+
  if (level >= CRISIS_LEVEL.ACUTE && safetyResources.length === 0) {
    safetyResources.push(SAFETY_RESOURCES.suicideAndCrisis);
    safetyResources.push(SAFETY_RESOURCES.crisisTextLine);
  }

  // Anti-weaponization boundaries
  const boundaries = _buildBoundaries(type);

  return {
    crisisType: type,
    crisisLevel: level,
    levelLabel: levelLabels[level],
    openingMessage,
    floodingFirstAid: FLOODING_FIRST_AID,
    immediateActions,
    shortTermPlan,
    stabilizationPlan,
    expertTechniques,
    safetyResources,
    boundaries,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @private
 * Builds a compassionate, grounding opening message.
 */
function _buildOpeningMessage(level, type, name) {
  const openers = {
    [CRISIS_TYPE.AFFAIR_DISCOVERY]: {
      1: `${name}, what you're feeling right now is valid. Discovering this is one of the most painful experiences a person can go through. You don't have to figure everything out right now. Right now, we focus on YOU — on getting you steady.`,
      2: `${name}, I know your world just got turned upside down. The pain you're feeling is real, and it's enormous. You don't need to make any decisions right now. Not today. Right now, the only job is to breathe and get through the next few minutes.`,
      3: `${name}, I hear you, and I'm taking this seriously. Before anything else — you matter. Your life matters. If you're having thoughts of hurting yourself, please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) right now. I'm here with you, but a trained crisis counselor can help in ways I can't.`,
    },
    [CRISIS_TYPE.SEPARATION_THREAT]: {
      1: `${name}, the fear of losing your relationship is hitting hard right now. That fear is telling you something important — this relationship matters to you. Let's slow everything down and focus on what you can control: your own next steps.`,
      2: `${name}, hearing those words — "it's over" or "I'm leaving" — triggers a primal fear. Your attachment system is in full alarm mode right now. That's biology, not weakness. You don't have to solve this in the next hour. Let's stabilize first.`,
      3: `${name}, I hear you, and this is serious. If you're feeling like you can't go on, please contact the 988 Suicide & Crisis Lifeline (call or text 988) immediately. You are not alone, even if it feels that way right now. Your safety comes first — before the relationship, before everything.`,
    },
    [CRISIS_TYPE.ESCALATED_CONFLICT]: {
      1: `${name}, that was intense. When conflict escalates like that, both people's nervous systems go into survival mode. Nobody thinks clearly in that state. The most important thing right now is creating safety — physical and emotional — for you.`,
      2: `${name}, when fights reach this level, your body is running on pure adrenaline. You cannot think straight right now — that's not a character flaw, it's neuroscience. Step one is getting to a safe, calm space. Everything else comes after.`,
      3: `${name}, your safety is the priority right now. If you feel physically unsafe, please call 911 or the National Domestic Violence Hotline (1-800-799-7233). No relationship issue is worth risking your safety. Please get to a safe location first.`,
    },
    [CRISIS_TYPE.EMOTIONAL_FLOODING]: {
      1: `${name}, your body just hit the panic button. The racing heart, the inability to think — that's your nervous system doing exactly what it was designed to do under threat. It doesn't mean you're broken. Let's get your body calmed down first.`,
      2: `${name}, what you're experiencing right now — the overwhelm, the inability to function — this is your nervous system in full crisis mode. Gottman's research shows your IQ literally drops when you're this flooded. That's why nothing makes sense right now. First: breathe.`,
      3: `${name}, I hear how overwhelmed you are. If you're having thoughts of hurting yourself, please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) or text HOME to 741741. You deserve support right now. Let me also help you calm your body.`,
    },
    [CRISIS_TYPE.BETRAYAL_TRAUMA]: {
      1: `${name}, discovering that your reality wasn't what you thought — that's one of the deepest wounds a person can experience. What you're feeling isn't overreacting. It's your mind trying to reconcile two different versions of your life.`,
      2: `${name}, betrayal trauma literally rewires your sense of reality. If you feel like you can't trust your own perception right now, that's a normal response to an abnormal situation. You are not crazy. Your world shifted under your feet, and your mind is scrambling to find solid ground.`,
      3: `${name}, the level of pain you're in right now is serious, and I want you to have real support. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) if you're having thoughts of self-harm. You don't have to carry this alone. A trained counselor can be with you right now.`,
    },
  };

  return openers[type]?.[level] || openers[CRISIS_TYPE.EMOTIONAL_FLOODING][level];
}

/**
 * @private
 * Builds immediate action plan (next 5 minutes).
 */
function _buildImmediateActions(level, type, userProfile) {
  const actions = {
    title: 'Right Now — The Next 5 Minutes',
    timeframe: '5 minutes',
    steps: [],
  };

  // Step 1 (all crises): Physical grounding
  actions.steps.push({
    title: 'Ground Your Body',
    instruction: 'Do the 5-4-3-2-1 grounding exercise right now. Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Say them OUT LOUD.',
    why: 'Your nervous system is in fight-or-flight. Engaging your senses forces your brain back into the present moment.',
    expert: 'Gottman flooding research',
    timeRequired: '2 minutes',
  });

  // Step 2 (all crises): Breathing
  actions.steps.push({
    title: 'Regulate Your Breathing',
    instruction: 'Breathe in for 4 seconds, hold for 7, out for 8. Repeat 4 times.',
    why: 'This activates your vagus nerve, which tells your brain the threat isn\'t physical. Heart rate drops within 60 seconds.',
    expert: 'Gottman physiological soothing',
    timeRequired: '2 minutes',
  });

  // Step 3: Type-specific immediate action
  const typeActions = {
    [CRISIS_TYPE.AFFAIR_DISCOVERY]: {
      title: 'Name What You\'re Feeling — Don\'t Act on It',
      instruction: 'Say out loud or write: "The story I\'m telling myself right now is ___." Then: "What I\'m actually feeling underneath the rage is ___." Don\'t contact your partner, don\'t look at more evidence, don\'t tell anyone else yet.',
      why: 'Brown: the stories we make up when in pain are almost always worst-case. Naming the story creates distance from it. Voss: labeling your emotion deactivates the amygdala. Acting from flooding ALWAYS makes things worse.',
      expert: 'Brown (Story Rumble) + Voss (Labeling)',
      timeRequired: '1 minute',
    },
    [CRISIS_TYPE.SEPARATION_THREAT]: {
      title: 'Pause — Do Not Chase or Withdraw',
      instruction: 'Whether you want to beg them to stay or slam the door behind them — pause. Say to yourself: "I don\'t have to respond to this right now." If they\'re in front of you, say: "I hear you, and I need a moment to process this."',
      why: 'Johnson: your attachment system is screaming right now. Pursuers will chase, withdrawers will shut down — BOTH make it worse. The pause is the single most powerful thing you can do.',
      expert: 'Johnson (EFT) + Voss (Tactical Pause)',
      timeRequired: '1 minute',
    },
    [CRISIS_TYPE.ESCALATED_CONFLICT]: {
      title: 'Create Physical Distance',
      instruction: 'Go to a different room, or leave the house for a walk. Say: "I need 30 minutes to calm down. I\'ll come back and we can talk then." Do NOT engage further right now.',
      why: 'Gottman\'s structured break protocol: when flooded, you cannot listen, empathize, or problem-solve. Continuing guarantees escalation. The 20-minute minimum is neuroscience, not avoidance.',
      expert: 'Gottman (Flooding Protocol)',
      timeRequired: '1 minute to initiate, 20-30 min break',
    },
    [CRISIS_TYPE.EMOTIONAL_FLOODING]: {
      title: 'Splash Cold Water on Your Face',
      instruction: 'Go to the nearest sink. Splash cold water on your face and hold it there for 10 seconds. This isn\'t a metaphor — actually do it.',
      why: 'This triggers the mammalian dive reflex, which immediately lowers heart rate and calms the nervous system. It\'s the fastest physiological reset available.',
      expert: 'Physiological research, supported by Gottman flooding protocol',
      timeRequired: '30 seconds',
    },
    [CRISIS_TYPE.BETRAYAL_TRAUMA]: {
      title: 'Anchor to What\'s Real Right Now',
      instruction: 'Write down 3 things that are TRUE right now: "I am sitting in [location]. It is [day/time]. I am safe in this moment." Then write: "The story I\'m telling myself is ___. What I know for certain is ___."',
      why: 'Betrayal trauma distorts your sense of reality. Brown\'s "story I\'m telling myself" technique separates the facts from the catastrophic narrative. You need to rebuild your ground before anything else.',
      expert: 'Brown (Story Rumble) + Johnson (EFT)',
      timeRequired: '2 minutes',
    },
  };

  actions.steps.push(typeActions[type] || typeActions[CRISIS_TYPE.EMOTIONAL_FLOODING]);

  // Level 3: Always prepend safety resources
  if (level >= CRISIS_LEVEL.EMERGENCY) {
    actions.steps.unshift({
      title: '⚠️ REACH OUT FOR SUPPORT NOW',
      instruction: 'If you are having thoughts of hurting yourself or someone else, please contact: 988 Suicide & Crisis Lifeline (call or text 988) or Crisis Text Line (text HOME to 741741). If you\'re in physical danger, call 911.',
      why: 'You deserve professional crisis support right now. These are trained counselors available 24/7 who can help in ways an app cannot.',
      expert: 'Safety first — always',
      timeRequired: 'Immediate',
    });
  }

  return actions;
}

/**
 * @private
 * Builds short-term plan (next 24 hours).
 */
function _buildShortTermPlan(level, type, userProfile) {
  const plan = {
    title: 'The Next 24 Hours',
    timeframe: '24 hours',
    principles: [
      'No major decisions. Your brain is not in a state to make life-altering choices.',
      'Basic self-care is non-negotiable: eat something, drink water, rest if you can.',
      'You don\'t owe anyone a response on any timeline but your own.',
    ],
    steps: [],
  };

  // Universal: Sleep/rest
  plan.steps.push({
    title: 'Prioritize Sleep Tonight',
    instruction: 'Gottman debunked "never go to bed angry." If it\'s late, go to sleep. A rested brain tomorrow is infinitely more capable than a flooded brain at midnight. If you can\'t sleep, listen to a body scan meditation or do progressive muscle relaxation.',
    why: 'Sleep deprivation amplifies emotional reactivity by 60%. Your brain NEEDS rest to process what\'s happened.',
    expert: 'Gottman',
    timing: 'Tonight',
  });

  // Type-specific 24-hour actions
  const typeSteps = {
    [CRISIS_TYPE.AFFAIR_DISCOVERY]: [
      {
        title: 'Write — Don\'t Talk (Yet)',
        instruction: 'Get a notebook or open a document. Write everything you\'re feeling — rage, grief, confusion, all of it. Don\'t edit. Don\'t filter. This is for YOUR eyes only. Brown calls this "the shitty first draft" of your story.',
        why: 'The notebook method (Gottman) moves processing from amygdala to prefrontal cortex. Brown\'s rumble process requires getting the messy story out before you can find the truth in it. Writing is processing.',
        expert: 'Gottman (Notebook Method) + Brown (Story Rumble)',
        timing: 'Within a few hours',
      },
      {
        title: 'Choose ONE Safe Person',
        instruction: 'Tell ONE trusted person what happened. Not social media, not your mother-in-law, not 10 friends. One person who can listen without escalating. Say: "I need you to just listen right now. I don\'t need advice yet."',
        why: 'Isolation amplifies trauma. But broadcasting it creates damage that can\'t be undone. One safe witness is enough.',
        expert: 'Brown (Vulnerability)',
        timing: 'When ready today',
      },
      {
        title: 'Do NOT Investigate Further',
        instruction: 'Stop looking at their phone, emails, social media. Stop searching for more evidence. You have enough information to know you\'re in pain. More details right now will only deepen the wound without helping you heal.',
        why: 'The urge to know everything is your brain trying to regain control. But each new detail re-traumatizes. Healing happens in stages, not in one devastating download.',
        expert: 'Trauma-informed practice',
        timing: 'Starting now — this is the hardest one',
      },
    ],
    [CRISIS_TYPE.SEPARATION_THREAT]: [
      {
        title: 'Ask Yourself the Attachment Question',
        instruction: 'Write your answer to: "What am I most afraid of right now? Not the logistics — the feeling. Am I afraid of being alone? Of being unlovable? Of failing?" Johnson says every separation fear is an attachment fear.',
        why: 'Understanding YOUR attachment need is the key to responding wisely rather than reactively. Pursuers need to resist chasing; withdrawers need to resist retreating into numbness.',
        expert: 'Johnson (EFT / A.R.E.)',
        timing: 'Within a few hours',
      },
      {
        title: 'Don\'t Negotiate from Panic',
        instruction: 'Do not make promises you can\'t keep ("I\'ll change everything!"), issue ultimatums ("Fine, then I\'m leaving too!"), or beg. All of these come from flooding, not from your best self. Say: "I need time to process this. Can we talk tomorrow?"',
        why: 'Voss: the worst negotiations happen when one party is desperate. Give yourself time to get to a place where you can think clearly.',
        expert: 'Voss (Tactical Pause)',
        timing: 'If conversation is initiated today',
      },
      {
        title: 'Write Your Story Rumble',
        instruction: 'Write: "The story I\'m telling myself about why this is happening is ___." Then write: "What I know is true is ___. What I\'m making up is ___. What my part in this might be is ___."',
        why: 'Brown: our first story is always about self-protection. The rumble helps you find what\'s real, take responsibility for your part, and let go of the fiction.',
        expert: 'Brown (Rising Strong)',
        timing: 'Within a few hours',
      },
    ],
    [CRISIS_TYPE.ESCALATED_CONFLICT]: [
      {
        title: 'Complete the Structured Break',
        instruction: 'Stay apart for at least 30 minutes, up to 24 hours. During the break: walk, read, listen to music. Do NOT rehearse your argument or plan your rebuttal. When you return, start with: "I\'m sorry things got so heated. Can we try again more gently?"',
        why: 'Gottman\'s break protocol: the break only works if you actually soothe during it. Mentally replaying the fight keeps you flooded.',
        expert: 'Gottman (Flooding Protocol + Repair Attempts)',
        timing: '30 min to 24 hours',
      },
      {
        title: 'Check for Horsemen',
        instruction: 'Write down what happened in the fight. Circle any instances of: Criticism ("You always..."), Contempt (mockery, eye-rolling), Defensiveness ("That\'s not true, YOU..."), Stonewalling (shutting down completely). These are Gottman\'s Four Horsemen — the four behaviors that predict divorce with 93% accuracy.',
        why: 'You can\'t fix what you can\'t see. Identifying which horsemen showed up — in YOUR behavior, not just theirs — is the first step to repair.',
        expert: 'Gottman (Four Horsemen)',
        timing: 'After the break',
      },
      {
        title: 'Prepare a Repair Attempt',
        instruction: 'Before re-engaging, prepare ONE repair phrase: "I\'m sorry I [specific thing you did/said]. I was flooded. What I actually meant was [the need underneath]."',
        why: 'Gottman: repair attempts are the #1 predictor of relationship success. The key is leading with emotion and ownership, not logic and defense.',
        expert: 'Gottman (Repair Attempts)',
        timing: 'Before your next conversation',
      },
    ],
    [CRISIS_TYPE.EMOTIONAL_FLOODING]: [
      {
        title: 'Honor the 20-Minute Rule — Then Extend It',
        instruction: 'Give yourself at least 20 minutes of complete disengagement from whatever triggered the flooding. If after 20 minutes you\'re still activated, take another 20. There is no rush. Your body sets the timeline, not your mind.',
        why: 'Gottman: stress hormones take a minimum of 20 minutes to metabolize. Most people don\'t wait long enough and re-engage still flooded.',
        expert: 'Gottman (Flooding Research)',
        timing: 'Starting now',
      },
      {
        title: 'Identify Your Flooding Signature',
        instruction: 'Write: "My body signals that I\'m flooding are: ___. The thought patterns that loop when I\'m flooded are: ___. My default behavior when flooded is: ___ (fight/flee/freeze)."',
        why: 'Self-knowledge is the foundation of regulation. Once you know YOUR specific flooding signature, you can catch it earlier next time.',
        expert: 'Gottman + Johnson',
        timing: 'Once the flooding subsides',
      },
    ],
    [CRISIS_TYPE.BETRAYAL_TRAUMA]: [
      {
        title: 'Separate Fact from Narrative',
        instruction: 'Draw a line down a page. Left side: "What I KNOW (facts)." Right side: "What I\'m ASSUMING (stories)." Be brutally honest about which column each thought belongs in.',
        why: 'Brown: betrayal trauma generates narratives that feel absolutely true but may be partly fiction. Separating fact from story is the first step to reclaiming your reality.',
        expert: 'Brown (Story Rumble)',
        timing: 'Within a few hours',
      },
      {
        title: 'Name the Shame — It\'s Not Yours',
        instruction: 'If you\'re feeling "I should have known" or "What\'s wrong with me?" — that\'s shame talking. Write: "The shame message I\'m hearing is: ___. The truth is: someone else\'s choices are not a reflection of my worth."',
        why: 'Brown: shame tells you "I AM bad." Betrayal victims internalize the betrayer\'s choices. The antidote is speaking the shame out loud — "the less you talk about it, the more you have it."',
        expert: 'Brown (Shame Resilience)',
        timing: 'As soon as shame surfaces',
      },
      {
        title: 'Find One Anchor Person',
        instruction: 'Reach out to ONE person who can be a reality anchor. Say: "I\'m going through something and I need someone to help me tell what\'s real from what I\'m spiraling about. Can you just be here?"',
        why: 'Betrayal trauma isolates because it makes you question your own judgment. One grounded person who can reflect reality back to you is essential.',
        expert: 'Johnson (Attachment) + Brown (Vulnerability)',
        timing: 'Today',
      },
    ],
  };

  plan.steps = typeSteps[type] || typeSteps[CRISIS_TYPE.EMOTIONAL_FLOODING];

  // Attachment-aware modifications
  if (userProfile.attachmentStyle === 'anxious') {
    plan.steps.push({
      title: 'Watch for Anxious Spiraling',
      instruction: 'Your attachment style means your brain will generate catastrophic scenarios on repeat. Each time you catch yourself spiraling, write: "That\'s my anxious attachment talking. What do I actually know right now?" Repeat as needed.',
      why: 'Johnson: anxious attachment amplifies the threat signal. Recognizing it as a PATTERN (not truth) reduces its power.',
      expert: 'Johnson (EFT) + Amir Levine (Attached)',
      timing: 'Ongoing',
    });
  }

  if (userProfile.attachmentStyle === 'avoidant') {
    plan.steps.push({
      title: 'Don\'t Numb Out',
      instruction: 'Your natural response is to shut down and "be fine." That\'s your avoidant system protecting you. But stuffing this down will make it explode later. Stay with the discomfort — even 5 minutes of letting yourself feel it is progress.',
      why: 'Johnson: avoidant deactivation feels like strength but it\'s actually disconnection from your own needs. Healing requires feeling.',
      expert: 'Johnson (EFT)',
      timing: 'Ongoing',
    });
  }

  return plan;
}

/**
 * @private
 * Builds 7-day stabilization plan.
 */
function _buildStabilizationPlan(level, type, userProfile) {
  const plan = {
    title: 'The Next 7 Days — Stabilization',
    timeframe: '7 days',
    principles: [
      'This week is about STABILIZING, not resolving. Don\'t pressure yourself to have answers.',
      'Daily self-care is medicine, not luxury: sleep, nutrition, movement, connection.',
      'Journal daily — even 3 sentences. You\'re building the record of your own recovery.',
    ],
    daily: [],
    milestones: [],
  };

  // Universal daily structure
  plan.daily = [
    {
      day: 'Day 1-2',
      focus: 'Survival Mode',
      tasks: [
        'Continue grounding exercises morning and night',
        'Eat at least 2 real meals (your body needs fuel to process)',
        'Write for 10 minutes — stream of consciousness, no editing',
        'One conversation with your safe person',
      ],
    },
    {
      day: 'Day 3-4',
      focus: 'Begin Processing',
      tasks: [
        'Start Brown\'s rumble: write the full messy story, then identify fact vs. fiction',
        'Practice Voss labeling on yourself 3x daily: "What I\'m feeling right now is..."',
        'Take a 20-minute walk daily — movement metabolizes stress hormones',
        'Begin considering professional support (therapist, counselor)',
      ],
    },
    {
      day: 'Day 5-6',
      focus: 'Early Stabilization',
      tasks: [
        'Review what you\'ve written. Look for patterns. Johnson: what\'s the attachment need underneath?',
        'If ready: one calm, structured conversation with partner using Gottman softened startup',
        'Practice the A.R.E. self-check: Am I accessible, responsive, engaged — to MYSELF?',
        'Identify one small positive action you can take for your own wellbeing',
      ],
    },
    {
      day: 'Day 7',
      focus: 'Assessment & Direction',
      tasks: [
        'Write: "One week ago I was ___. Today I am ___. What I\'ve learned about myself is ___."',
        'Decide on next step: individual therapy, couples therapy, or continued self-work',
        'Set one intention for the next week — something small and specific',
        'Acknowledge that you survived the worst of it. That took courage.',
      ],
    },
  ];

  // Type-specific milestones
  const typeMilestones = {
    [CRISIS_TYPE.AFFAIR_DISCOVERY]: [
      { by: 'Day 3', milestone: 'Schedule an appointment with a therapist who specializes in infidelity recovery — for YOU, not couples work yet' },
      { by: 'Day 5', milestone: 'Complete Brown\'s full story rumble in writing — separate fact from fiction, identify what you need' },
      { by: 'Day 7', milestone: 'If ready: one conversation with partner using Gottman\'s softened startup. No interrogation — one "I feel" statement and one question.' },
    ],
    [CRISIS_TYPE.SEPARATION_THREAT]: [
      { by: 'Day 3', milestone: 'Write your A.R.E. letter (for yourself): what you need to feel Accessible, Responsive, and Engaged in this relationship' },
      { by: 'Day 5', milestone: 'If partner is willing: one 20-minute conversation using Voss calibrated questions ("What would it take for you to feel heard?")' },
      { by: 'Day 7', milestone: 'Decide: individual therapy, couples therapy, or both. Action > rumination.' },
    ],
    [CRISIS_TYPE.ESCALATED_CONFLICT]: [
      { by: 'Day 2', milestone: 'Complete Gottman\'s Regrettable Incident method (5 steps) for the conflict that happened' },
      { by: 'Day 4', milestone: 'Identify your Horseman pattern and practice the antidote: Criticism → Gentle startup. Contempt → Build fondness. Defensiveness → Take responsibility. Stonewalling → Self-soothe.' },
      { by: 'Day 7', milestone: 'Establish a conflict protocol with your partner: a safe word, a break agreement, and a repair ritual' },
    ],
    [CRISIS_TYPE.EMOTIONAL_FLOODING]: [
      { by: 'Day 3', milestone: 'Create your personal flooding first-aid card: your specific body signals, your go-to soothing technique, your break phrase' },
      { by: 'Day 5', milestone: 'Practice identifying the REAL emotion underneath the flooding 3 times: "I was flooded because underneath I felt ___"' },
      { by: 'Day 7', milestone: 'Teach your partner your flooding signals and agree on a mutual de-escalation protocol' },
    ],
    [CRISIS_TYPE.BETRAYAL_TRAUMA]: [
      { by: 'Day 3', milestone: 'Find a therapist experienced in betrayal trauma — EMDR or trauma-focused CBT recommended' },
      { by: 'Day 5', milestone: 'Complete Brown\'s full rumble: first draft (messy), second draft (fact vs. fiction), third draft (your actual truth)' },
      { by: 'Day 7', milestone: 'Write: "My worth is not determined by someone else\'s choices." Read it aloud. Mean it or keep working on it.' },
    ],
  };

  plan.milestones = typeMilestones[type] || typeMilestones[CRISIS_TYPE.EMOTIONAL_FLOODING];

  return plan;
}

/**
 * @private
 * Selects the most relevant expert techniques for the given crisis type and level.
 */
function _selectExpertTechniques(type, level) {
  const techniques = [];

  // Always include: Voss tactical pause + labeling (immediate regulation)
  techniques.push({
    ...EXPERT_TECHNIQUES.vossTacticalEmpathy,
    techniques: EXPERT_TECHNIQUES.vossTacticalEmpathy.techniques.filter(t =>
      level >= CRISIS_LEVEL.ACUTE
        ? ['Tactical Pause', 'Labeling Your Own Emotions'].includes(t.name)
        : true
    ),
    relevance: 'Immediate emotional regulation and de-escalation',
  });

  // Always include: Brown story rumble (narrative management)
  techniques.push({
    ...EXPERT_TECHNIQUES.brownStoryRumble,
    relevance: 'Preventing shame spirals and catastrophic narratives',
  });

  // Type-specific additions
  if ([CRISIS_TYPE.ESCALATED_CONFLICT].includes(type)) {
    techniques.push({
      ...EXPERT_TECHNIQUES.gottmanRepair,
      relevance: 'Repair and de-escalation after conflict',
    });
  }

  if ([CRISIS_TYPE.AFFAIR_DISCOVERY, CRISIS_TYPE.SEPARATION_THREAT, CRISIS_TYPE.BETRAYAL_TRAUMA].includes(type)) {
    techniques.push({
      ...EXPERT_TECHNIQUES.johnsonHoldMeTight,
      relevance: 'Understanding attachment needs and breaking destructive cycles',
    });
  }

  // Gottman repair is always relevant for stabilization
  if (!techniques.some(t => t.expert === 'John Gottman')) {
    techniques.push({
      ...EXPERT_TECHNIQUES.gottmanRepair,
      relevance: 'Repair and reconnection during stabilization phase',
    });
  }

  return techniques;
}

/**
 * @private
 * Builds anti-weaponization boundaries. All advice is self-directed.
 */
function _buildBoundaries(type) {
  const universal = [
    'All guidance here is about regulating YOUR emotions and YOUR behavior. This is not ammunition against your partner.',
    'Do NOT share these techniques as evidence of what your partner "should" be doing.',
    'If you catch yourself thinking "they need to read this" — that\'s the signal to re-focus on yourself.',
    'Your partner\'s behavior is their responsibility. Your response is yours.',
  ];

  const typeSpecific = {
    [CRISIS_TYPE.AFFAIR_DISCOVERY]: [
      'Do NOT use this information to plan a confrontation or "catch" your partner.',
      'Investigation and surveillance will not heal you — they will re-traumatize you.',
      'Telling everyone you know is not justice — it\'s flooding behavior. Choose ONE safe person.',
    ],
    [CRISIS_TYPE.SEPARATION_THREAT]: [
      'Do NOT use these techniques to manipulate your partner into staying.',
      'Begging, threatening, or guilt-tripping are flooding behaviors, not love.',
      'A healthy relationship requires two willing people. You can only control your half.',
    ],
    [CRISIS_TYPE.ESCALATED_CONFLICT]: [
      'This is NOT about winning the argument or proving you were right.',
      'If there is any physical violence or threat of violence, your only job is to get safe. Call 911 if needed.',
      'De-escalation starts with YOU, not with getting your partner to calm down.',
    ],
    [CRISIS_TYPE.EMOTIONAL_FLOODING]: [
      'Flooding is not your partner\'s fault. It\'s a physiological response.',
      'Do NOT use "I\'m flooded" as a way to avoid accountability.',
      'Self-soothing is YOUR job. Your partner can support it, but they can\'t do it for you.',
    ],
    [CRISIS_TYPE.BETRAYAL_TRAUMA]: [
      'Do NOT use these insights to build a case or plan revenge.',
      'Healing from betrayal is about reclaiming YOUR reality, not punishing theirs.',
      'The shame is not yours to carry. But the healing IS yours to do.',
    ],
  };

  return [...universal, ...(typeSpecific[type] || [])];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core functions
  detectCrisisLevel,
  generateCrisisResponse,

  // Constants (for external reference)
  CRISIS_TYPE,
  CRISIS_LEVEL,

  // Always-accessible module
  FLOODING_FIRST_AID,

  // Safety resources
  SAFETY_RESOURCES,

  // Expert techniques (for direct access if needed)
  EXPERT_TECHNIQUES,
};
