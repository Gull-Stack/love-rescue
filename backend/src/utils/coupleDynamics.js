/**
 * ═══════════════════════════════════════════════════════════════════════
 * COUPLE DYNAMICS ENGINE — The Crown Jewel of LoveRescue
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * This is what makes therapists say "holy shit."
 * 
 * Cross-references BOTH partners' assessment data across all 13 assessments
 * to produce insights that would take a seasoned therapist 4-6 sessions to
 * develop manually. Every insight is expert-attributed. Every pattern is
 * actionable. Every narrative is clinically grounded.
 * 
 * Philosophy:
 * - Mirror, not weapon — insights illuminate, never blame
 * - Expert-attributed — every claim cites its source
 * - Actionable — every insight includes what to DO about it
 * - System-level — the couple is a system, not two individuals side-by-side
 * 
 * Experts integrated:
 *   Gottman (Sound Relationship House), Sue Johnson (EFT/Attachment),
 *   Brené Brown (Shame/Vulnerability), Chris Voss (Tactical Empathy),
 *   Gary Chapman (Love Languages), Tony Robbins (Human Needs),
 *   Esther Perel (Desire/Erotic Intelligence), Amir Levine (Attachment),
 *   Murray Bowen / Finlayson-Fife (Differentiation), Stan Tatkin (PACT)
 * 
 * @module coupleDynamics
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Safely extract a score from partner assessments by type
 */
function getScore(assessments, type) {
  if (!assessments) return null;
  // Support both array-of-objects [{type, score}] and plain object {type: score}
  if (Array.isArray(assessments)) {
    const found = assessments.find(a => a.type === type);
    return found ? found.score : null;
  }
  return assessments[type] || null;
}

/**
 * Format a label for display (snake_case → Title Case)
 */
function formatLabel(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}


// ═══════════════════════════════════════════════════════════════
// 1. GENERATE COUPLE PROFILE
// ═══════════════════════════════════════════════════════════════

/**
 * Cross-references BOTH partners' assessment data across all 13 assessments.
 * 
 * @param {Array|Object} partner1Assessments - Partner 1's scored assessments
 * @param {Array|Object} partner2Assessments - Partner 2's scored assessments
 * @param {Object} [options] - { partner1Name, partner2Name }
 * @returns {Object} Comprehensive couple profile
 */
function generateCoupleProfile(partner1Assessments, partner2Assessments, options = {}) {
  const p1Name = options.partner1Name || 'Partner A';
  const p2Name = options.partner2Name || 'Partner B';

  // Extract scores by assessment type
  const p1 = {
    attachment: getScore(partner1Assessments, 'attachment'),
    love_language: getScore(partner1Assessments, 'love_language'),
    conflict_style: getScore(partner1Assessments, 'conflict_style'),
    gottman_checkup: getScore(partner1Assessments, 'gottman_checkup'),
    emotional_intelligence: getScore(partner1Assessments, 'emotional_intelligence'),
    differentiation: getScore(partner1Assessments, 'differentiation'),
    shame_vulnerability: getScore(partner1Assessments, 'shame_vulnerability'),
    desire_aliveness: getScore(partner1Assessments, 'desire_aliveness'),
    tactical_empathy: getScore(partner1Assessments, 'tactical_empathy'),
    human_needs: getScore(partner1Assessments, 'human_needs'),
    personality: getScore(partner1Assessments, 'personality'),
    hormonal_health: getScore(partner1Assessments, 'hormonal_health'),
    physical_vitality: getScore(partner1Assessments, 'physical_vitality'),
  };

  const p2 = {
    attachment: getScore(partner2Assessments, 'attachment'),
    love_language: getScore(partner2Assessments, 'love_language'),
    conflict_style: getScore(partner2Assessments, 'conflict_style'),
    gottman_checkup: getScore(partner2Assessments, 'gottman_checkup'),
    emotional_intelligence: getScore(partner2Assessments, 'emotional_intelligence'),
    differentiation: getScore(partner2Assessments, 'differentiation'),
    shame_vulnerability: getScore(partner2Assessments, 'shame_vulnerability'),
    desire_aliveness: getScore(partner2Assessments, 'desire_aliveness'),
    tactical_empathy: getScore(partner2Assessments, 'tactical_empathy'),
    human_needs: getScore(partner2Assessments, 'human_needs'),
    personality: getScore(partner2Assessments, 'personality'),
    hormonal_health: getScore(partner2Assessments, 'hormonal_health'),
    physical_vitality: getScore(partner2Assessments, 'physical_vitality'),
  };

  const profile = {
    partner1Name: p1Name,
    partner2Name: p2Name,
    generatedAt: new Date().toISOString(),
    attachmentDynamic: _analyzeAttachmentDynamic(p1, p2, p1Name, p2Name),
    loveLanguageMismatch: _analyzeLoveLanguageMismatch(p1, p2, p1Name, p2Name),
    conflictInteraction: _analyzeConflictInteraction(p1, p2, p1Name, p2Name),
    soundRelationshipHouse: _analyzeSoundRelationshipHouse(p1, p2, p1Name, p2Name),
    sharedStrengths: _identifySharedStrengths(p1, p2, p1Name, p2Name),
    growthEdges: _identifyGrowthEdges(p1, p2, p1Name, p2Name),
    expertNarrative: null, // Built last, synthesizing all above
    crossAssessmentInsights: generateCrossAssessmentInsights({
      partner1: p1,
      partner2: p2,
      partner1Name: p1Name,
      partner2Name: p2Name,
    }),
  };

  // Build the synthesized expert narrative last
  profile.expertNarrative = _buildExpertNarrative(profile, p1, p2, p1Name, p2Name);

  return profile;
}


// ─────────────────────────────────────────────────────────────
// 1a. Attachment Dynamic Analysis
// ─────────────────────────────────────────────────────────────

/**
 * Maps the couple's attachment dance using Sue Johnson's EFT framework
 * and Amir Levine's attachment theory.
 */
function _analyzeAttachmentDynamic(p1, p2, p1Name, p2Name) {
  if (!p1.attachment || !p2.attachment) {
    return { available: false, reason: 'Both partners need to complete the Attachment Style assessment.' };
  }

  const s1 = p1.attachment.style;
  const s2 = p2.attachment.style;
  const sec1 = p1.attachment.secondary;
  const sec2 = p2.attachment.secondary;
  const anx1 = p1.attachment.dimensions?.anxiety || p1.attachment.anxietyScore || 0;
  const anx2 = p2.attachment.dimensions?.anxiety || p2.attachment.anxietyScore || 0;
  const avd1 = p1.attachment.dimensions?.avoidance || p1.attachment.avoidanceScore || 0;
  const avd2 = p2.attachment.dimensions?.avoidance || p2.attachment.avoidanceScore || 0;

  // Determine the couple's attachment dance
  const dynamic = _classifyAttachmentDance(s1, s2);

  // Determine pursue-withdraw positions
  const pursuerScore1 = anx1 - avd1; // positive = more pursuing
  const pursuerScore2 = anx2 - avd2;
  let pursuer, withdrawer, pursuerName, withdrawerName;

  if (pursuerScore1 > pursuerScore2) {
    pursuer = p1; withdrawer = p2;
    pursuerName = p1Name; withdrawerName = p2Name;
  } else {
    pursuer = p2; withdrawer = p1;
    pursuerName = p2Name; withdrawerName = p1Name;
  }

  return {
    available: true,
    partner1Style: s1,
    partner2Style: s2,
    partner1Secondary: sec1,
    partner2Secondary: sec2,
    dynamicType: dynamic.type,
    dynamicLabel: dynamic.label,
    severity: dynamic.severity,
    pursueWithdrawCycle: {
      pursuer: pursuerName,
      withdrawer: withdrawerName,
      pursuerAnxiety: pursuer === p1 ? anx1 : anx2,
      withdrawerAvoidance: withdrawer === p1 ? avd1 : avd2,
      cycleIntensity: Math.abs(pursuerScore1 - pursuerScore2),
    },
    expertInsight: dynamic.insight,
    johnsonFraming: dynamic.johnsonFraming,
    levineFraming: dynamic.levineFraming,
    actionSteps: dynamic.actionSteps,
    riskLevel: dynamic.severity === 'high' ? 'elevated' : dynamic.severity === 'moderate' ? 'moderate' : 'low',
  };
}

/**
 * Classifies the attachment dance between two styles
 */
function _classifyAttachmentDance(style1, style2) {
  const key = [style1, style2].sort().join('_');

  const dances = {
    // Secure-Secure: The gold standard
    'secure_secure': {
      type: 'secure_secure',
      label: 'Secure Base Partnership',
      severity: 'low',
      insight: 'Both partners operate from a secure base. This is the foundation every couple aspires to — you can express needs directly, tolerate disagreement, and repair quickly.',
      johnsonFraming: 'Johnson describes this as the "A.R.E." ideal — both partners are Accessible, Responsive, and Engaged. Your bond is your safe haven.',
      levineFraming: 'Levine\'s research shows that secure-secure couples have the highest relationship satisfaction and longevity. You naturally co-regulate each other\'s nervous systems.',
      actionSteps: [
        'Don\'t take this for granted — security requires ongoing investment (Gottman: fondness & admiration)',
        'Keep updating your Love Maps — keep learning about each other\'s evolving inner world',
        'Use your security as a platform for growth and adventure (Perel: security enables healthy risk-taking)',
      ],
    },

    // Anxious-Secure: Stabilizing dynamic
    'anxious_secure': {
      type: 'anxious_secure',
      label: 'Stabilizing Partnership',
      severity: 'low',
      insight: 'The secure partner provides a steady base that gradually calms the anxious partner\'s attachment system. This pairing has excellent growth potential.',
      johnsonFraming: 'Johnson notes that a secure partner can serve as a "corrective emotional experience" — consistently responding to bids builds earned security over time.',
      levineFraming: 'Levine calls the secure partner a "buffer" — their consistent availability gradually rewires the anxious partner\'s expectations about relationships.',
      actionSteps: [
        `Secure partner: Be patient with reassurance-seeking. It's not neediness — it's a wired response that your consistency is healing.`,
        `Anxious partner: Name your anxiety directly ("My attachment system is activated") instead of acting it out through protest behaviors.`,
        'Both: Develop a "signal" system for when anxiety spikes — a word or gesture that means "I need extra reassurance right now" (Tatkin)',
      ],
    },

    // Avoidant-Secure: Warming dynamic
    'avoidant_secure': {
      type: 'avoidant_secure',
      label: 'Warming Partnership',
      severity: 'low',
      insight: 'The secure partner\'s warmth and patience creates safety for the avoidant partner to gradually open up. This works — but requires patience.',
      johnsonFraming: 'Johnson emphasizes that avoidant partners need consistent emotional safety before they can risk vulnerability. The secure partner must not interpret withdrawal as rejection.',
      levineFraming: 'Levine notes that avoidant individuals can develop earned security through relationships with secure partners — but they must be willing to notice and challenge their deactivating strategies.',
      actionSteps: [
        'Secure partner: Don\'t chase when they withdraw. Offer presence without pressure: "I\'m here when you\'re ready."',
        'Avoidant partner: Practice staying 5 minutes longer in emotional conversations before retreating (Tatkin\'s gradual exposure)',
        'Both: Establish clear re-engagement rituals after space is taken — so withdrawal always has a "return" built in',
      ],
    },

    // Anxious-Avoidant: The protest polka
    'anxious_avoidant': {
      type: 'anxious_avoidant',
      label: 'The Anxious-Avoidant Trap',
      severity: 'high',
      insight: 'This is the most common — and most painful — attachment mismatch. The more one pursues, the more the other retreats, creating an escalating cycle.',
      johnsonFraming: 'Johnson calls this the "Protest Polka" — one of the three Demon Dialogues. Partner A reaches with increasing urgency ("Why won\'t you talk to me?!") while Partner B retreats to self-protect ("I need space!"). Both are expressing the SAME underlying fear: "Am I safe with you?"',
      levineFraming: 'Levine identifies this as the "anxious-avoidant trap" — the anxious partner\'s hyperactivation triggers the avoidant partner\'s deactivation, which triggers more hyperactivation. Without intervention, this cycle intensifies over time.',
      actionSteps: [
        'NAME THE CYCLE together: "We\'re doing the thing again. You\'re reaching, I\'m retreating. Let\'s pause." (Johnson)',
        'Anxious partner: Learn to self-soothe BEFORE reaching. 60 seconds of breath. Then reach with vulnerability, not protest.',
        'Avoidant partner: Learn to say "I need space AND I\'m coming back in 20 minutes." Never withdraw without a return time.',
        'Both: Study Tatkin\'s "couple bubble" — agree that you are each other\'s primary nervous system regulators',
        'Consider EFT couples therapy — this is exactly what Johnson\'s approach was designed for',
      ],
    },

    // Anxious-Anxious: The escalation spiral
    'anxious_anxious': {
      type: 'anxious_anxious',
      label: 'The Escalation Spiral',
      severity: 'moderate',
      insight: 'Two anxious partners can create an intense, passionate connection — but also an exhausting one. Both seek reassurance but neither can consistently provide it, leading to escalating emotional intensity.',
      johnsonFraming: 'Johnson would frame this as two pursuers in "Find the Bad Guy" mode — when both feel insecure, the temptation is to blame each other rather than acknowledge shared vulnerability.',
      levineFraming: 'Levine notes that anxious-anxious pairings often confuse emotional intensity for depth. The relationship feels meaningful because of the drama, but the drama is actually the problem.',
      actionSteps: [
        'Develop individual self-soothing practices — each of you needs to be able to regulate WITHOUT the other',
        'Create a "no escalation" pact: when emotions hit a 7/10, PAUSE. Take 20 minutes. Return. (Gottman: self-soothing)',
        'Both: Build independent identities — hobbies, friendships, goals that are yours alone (Finlayson-Fife: differentiation)',
      ],
    },

    // Avoidant-Avoidant: The parallel lives
    'avoidant_avoidant': {
      type: 'avoidant_avoidant',
      label: 'Parallel Lives',
      severity: 'moderate',
      insight: 'Two avoidant partners can create a comfortable, low-conflict relationship — but also one that lacks emotional depth. You co-exist peacefully but may struggle with genuine intimacy.',
      johnsonFraming: 'Johnson warns that avoidant-avoidant couples may look stable from the outside but are building on a "frozen lake" — the surface is smooth but there\'s no warmth underneath.',
      levineFraming: 'Levine notes these couples rarely seek therapy because they don\'t fight. But the absence of conflict is not the presence of connection.',
      actionSteps: [
        'Schedule deliberate emotional check-ins — neither of you will initiate spontaneously (Gottman: stress-reducing conversation)',
        'Practice one vulnerable disclosure per week — "Something I haven\'t told you is..."',
        'Study Perel: desire requires RISK. Safety without aliveness becomes flatline.',
      ],
    },

    // Fearful-Avoidant combinations
    'anxious_fearful_avoidant': {
      type: 'anxious_fearful_avoidant',
      label: 'The Intensity Vortex',
      severity: 'high',
      insight: 'This pairing creates extreme emotional intensity. The fearful-avoidant partner oscillates between pursuit and withdrawal, keeping the anxious partner in a constant state of uncertainty.',
      johnsonFraming: 'Johnson identifies this as one of the most challenging patterns in EFT. The fearful-avoidant partner\'s internal push-pull mirrors and amplifies the anxious partner\'s worst fears.',
      levineFraming: 'Levine emphasizes that this pairing often has roots in early relational trauma for both partners. Professional support is strongly recommended.',
      actionSteps: [
        'Strongly consider EFT couples therapy — this pattern is complex and benefits from professional guidance',
        'Both: Learn to name your current state — "I\'m in pursuit mode" or "I\'m in withdrawal mode" — without shame',
        'Build a daily grounding routine together — consistent nervous system regulation is essential (Tatkin)',
      ],
    },
    'avoidant_fearful_avoidant': {
      type: 'avoidant_fearful_avoidant',
      label: 'The Distance Dance',
      severity: 'moderate',
      insight: 'Both partners share avoidant tendencies but the fearful-avoidant partner also carries deep longing for connection. This creates a confusing dynamic where closeness is desired but terrifying for both.',
      johnsonFraming: 'Johnson would see the fearful-avoidant partner as holding both sides of the pursue-withdraw cycle within themselves, making the dance unpredictable.',
      levineFraming: 'Levine notes this pairing can work if both develop awareness of their deactivating strategies and consciously choose to stay engaged.',
      actionSteps: [
        'Name and track deactivating strategies — keep a shared journal of when each of you pulls away and what triggered it',
        'Practice Tatkin\'s "welcome home" and "goodbye" rituals — small moments of connection build neural pathways for safety',
        'Celebrate every moment of vulnerability — each one is a victory against deeply wired patterns',
      ],
    },
    'fearful_avoidant_fearful_avoidant': {
      type: 'fearful_avoidant_fearful_avoidant',
      label: 'The Storm',
      severity: 'high',
      insight: 'Two fearful-avoidant partners create the most unpredictable dynamic — intense closeness followed by intense withdrawal, often triggered by the very intimacy both crave.',
      johnsonFraming: 'Johnson would describe this as a relationship where both partners are simultaneously the pursuer and the withdrawer, alternating roles in rapid succession.',
      levineFraming: 'Levine strongly recommends professional support for this pairing — the complexity of two disorganized attachment systems interacting requires skilled guidance.',
      actionSteps: [
        'Seek EFT or PACT couples therapy — this is not a DIY situation',
        'Develop individual therapy alongside couples work — each partner needs their own secure base',
        'Build external support systems — friends, community, faith — don\'t put all attachment needs on one person',
      ],
    },
    'fearful_avoidant_secure': {
      type: 'fearful_avoidant_secure',
      label: 'The Healing Partnership',
      severity: 'moderate',
      insight: 'The secure partner provides the consistent safety that the fearful-avoidant partner has never had. This can be deeply healing — and deeply challenging for the secure partner who must weather unpredictable storms.',
      johnsonFraming: 'Johnson sees this as one of the most hopeful pairings — the secure partner can serve as a "corrective attachment figure" if they can tolerate the push-pull without personalizing it.',
      levineFraming: 'Levine emphasizes that earned security is possible, and a patient, secure partner is the best context for that healing.',
      actionSteps: [
        'Secure partner: This will test your security. Don\'t take the push-pull personally — it\'s their wiring, not your worth.',
        'Fearful-avoidant partner: Name it when it\'s happening: "I\'m pushing you away but I don\'t actually want you to go."',
        'Both: Study Brown\'s shame resilience — shame is the engine of fearful-avoidant patterns',
      ],
    },
  };

  // Handle symmetric pairs (anxious_secure = secure_anxious)
  const result = dances[key];
  if (result) return result;

  // Try reversed key
  const reverseKey = [style2, style1].sort().join('_');
  if (dances[reverseKey]) return dances[reverseKey];

  // Fallback
  return {
    type: 'unknown',
    label: `${formatLabel(style1)} × ${formatLabel(style2)}`,
    severity: 'moderate',
    insight: 'This attachment combination is uncommon in our models. Individual growth in attachment security will benefit the relationship.',
    johnsonFraming: 'Johnson\'s core principle applies to all attachment dynamics: identify the negative cycle, access the underlying emotions, and create new bonding events.',
    levineFraming: 'Levine\'s advice is universal: learn your own attachment style deeply, then learn your partner\'s.',
    actionSteps: [
      'Complete the Attachment Style assessment to get the full picture',
      'Study your own attachment patterns and share what you learn with your partner',
      'Consider EFT couples therapy for guided exploration of your attachment dance',
    ],
  };
}


// ─────────────────────────────────────────────────────────────
// 1b. Love Language Mismatch Analysis
// ─────────────────────────────────────────────────────────────

function _analyzeLoveLanguageMismatch(p1, p2, p1Name, p2Name) {
  if (!p1.love_language || !p2.love_language) {
    return { available: false, reason: 'Both partners need to complete the Love Language assessment.' };
  }

  const ll1 = p1.love_language;
  const ll2 = p2.love_language;
  const primary1 = ll1.primary;
  const primary2 = ll2.primary;
  const secondary1 = ll1.secondary;
  const secondary2 = ll2.secondary;

  const match = primary1 === primary2;
  const crossMatch = primary1 === secondary2 || primary2 === secondary1;

  // Build the mismatch analysis
  const languageLabels = {
    words_of_affirmation: 'Words of Affirmation',
    acts_of_service: 'Acts of Service',
    receiving_gifts: 'Receiving Gifts',
    quality_time: 'Quality Time',
    physical_touch: 'Physical Touch',
  };

  // Chapman's key insight: we tend to GIVE love in our own language, not our partner's
  const translationGap = !match && !crossMatch;

  let mismatchInsight;
  if (match) {
    mismatchInsight = `You both speak ${languageLabels[primary1]} as your primary love language. Chapman calls this a natural advantage — you instinctively give love the way your partner receives it.`;
  } else if (crossMatch) {
    mismatchInsight = `Your languages are close — one partner's primary is the other's secondary. With minimal translation effort, you can meet each other well.`;
  } else {
    mismatchInsight = `${p1Name} speaks ${languageLabels[primary1]} while ${p2Name} speaks ${languageLabels[primary2]}. Chapman's central insight: you're both "speaking love" — but in different languages. Without deliberate translation, you'll each feel unloved despite the other's genuine efforts.`;
  }

  // Generate specific translation tips
  const translationTips = [];
  if (!match) {
    translationTips.push({
      from: p1Name,
      to: p2Name,
      tip: _getLoveLanguageTranslation(primary1, primary2, p1Name, p2Name),
    });
    translationTips.push({
      from: p2Name,
      to: p1Name,
      tip: _getLoveLanguageTranslation(primary2, primary1, p2Name, p1Name),
    });
  }

  return {
    available: true,
    partner1Primary: primary1,
    partner1PrimaryLabel: languageLabels[primary1],
    partner2Primary: primary2,
    partner2PrimaryLabel: languageLabels[primary2],
    partner1Secondary: secondary1,
    partner2Secondary: secondary2,
    isMatch: match,
    isCrossMatch: crossMatch,
    translationGap,
    mismatchInsight,
    translationTips,
    chapmanQuote: match
      ? '"When you speak your partner\'s love language, you fill their emotional love tank." — Gary Chapman'
      : '"We tend to speak our own love language — to give love the way WE want to receive it. But that\'s not love — that\'s projection." — Gary Chapman',
    actionSteps: match
      ? ['Keep doing what you\'re doing — your natural instinct is working', 'Don\'t forget the secondary languages — variety strengthens the bond']
      : [
        `${p1Name}: Practice giving ${languageLabels[primary2]} deliberately — even when it feels unnatural`,
        `${p2Name}: Practice giving ${languageLabels[primary1]} deliberately — even when it feels unnatural`,
        'Both: Don\'t judge your partner for "not getting it" — they\'re showing love in THEIR language, not yours',
        'Create a shared "love language cheat sheet" — specific examples of what fills each of your tanks',
      ],
  };
}

/**
 * Generates specific translation advice from one love language to another
 */
function _getLoveLanguageTranslation(fromLang, toLang, fromName, toName) {
  const tips = {
    words_of_affirmation: {
      acts_of_service: `${fromName} naturally expresses love through words. ${toName} receives love through actions. Tip: After affirming ${toName} verbally, follow through with a concrete act. "I appreciate you" + actually doing the dishes = love in both languages.`,
      receiving_gifts: `${fromName} speaks with words; ${toName} feels it through gifts. Tip: Write the words in a card attached to a small, thoughtful gift. The words amplify the gift.`,
      quality_time: `${fromName} leads with words; ${toName} craves presence. Tip: Put the phone down, look them in the eyes, and THEN say the affirming words. Presence first, words second.`,
      physical_touch: `${fromName} speaks love verbally; ${toName} needs physical connection. Tip: Hold ${toName}'s hand while you say the affirming words. Touch is the delivery vehicle.`,
    },
    acts_of_service: {
      words_of_affirmation: `${fromName} shows love by doing; ${toName} needs to hear it. Tip: When you do something for ${toName}, also say WHY: "I cleaned the kitchen because I know you've had a hard week and I wanted to take care of you."`,
      receiving_gifts: `${fromName} serves; ${toName} appreciates symbols. Tip: Your acts of service ARE gifts. Frame them that way: "I made this for you."`,
      quality_time: `${fromName} shows love through help; ${toName} wants togetherness. Tip: Do the acts of service TOGETHER. Cook the meal side by side. Quality time + service = both tanks full.`,
      physical_touch: `${fromName} serves; ${toName} craves touch. Tip: Add touch to your service. A shoulder squeeze while making dinner. A kiss when you bring them coffee.`,
    },
    receiving_gifts: {
      words_of_affirmation: `${fromName} gives tangible gifts; ${toName} needs verbal love. Tip: Include a note with every gift explaining what it means and why you chose it. The note might matter more than the gift.`,
      acts_of_service: `${fromName} gives gifts; ${toName} values practical help. Tip: Give "gifts of service" — a coupon book for household tasks, booking an appointment they've been avoiding.`,
      quality_time: `${fromName} gives objects; ${toName} wants presence. Tip: Gift experiences instead of things. Tickets, adventures, a planned evening together.`,
      physical_touch: `${fromName} gives gifts; ${toName} needs physical closeness. Tip: Give your gifts in person, with a hug. The moment of giving is the touch opportunity.`,
    },
    quality_time: {
      words_of_affirmation: `${fromName} gives time; ${toName} needs words. Tip: During your quality time together, use it to verbally affirm ${toName}. "I love being here with you because..."`,
      acts_of_service: `${fromName} gives presence; ${toName} values practical help. Tip: Spend your quality time being helpful. Tackle a project together. Your presence + productivity = love squared.`,
      receiving_gifts: `${fromName} gives time; ${toName} appreciates tokens. Tip: Bring a small token to your quality time — their favorite drink, a flower, something that says "I thought about this."`,
      physical_touch: `${fromName} gives focused attention; ${toName} craves touch. Tip: Make your quality time physically connected. Side by side on the couch, holding hands on a walk.`,
    },
    physical_touch: {
      words_of_affirmation: `${fromName} reaches out physically; ${toName} needs to hear love. Tip: Add words to your touch. While holding them: "I love you." While hugging: "You mean everything to me."`,
      acts_of_service: `${fromName} shows love through touch; ${toName} values practical help. Tip: Give a massage after a hard day — it's touch AND service. Run a bath for them — service meets physical comfort.`,
      receiving_gifts: `${fromName} is physical; ${toName} appreciates gifts. Tip: Pair physical affection with small gifts. Bring flowers AND a hug. The combination fills both tanks.`,
      quality_time: `${fromName} connects through touch; ${toName} wants focused time. Tip: Create quality time that's physically connected. Cook together and keep touching. Walk and hold hands.`,
    },
  };

  return tips[fromLang]?.[toLang] || `${fromName}'s primary language is ${formatLabel(fromLang)}. Practice expressing love in ${toName}'s language: ${formatLabel(toLang)}.`;
}


// ─────────────────────────────────────────────────────────────
// 1c. Conflict Style Interaction
// ─────────────────────────────────────────────────────────────

function _analyzeConflictInteraction(p1, p2, p1Name, p2Name) {
  if (!p1.conflict_style || !p2.conflict_style) {
    return { available: false, reason: 'Both partners need to complete the Conflict Style assessment.' };
  }

  const cs1 = p1.conflict_style.primary;
  const cs2 = p2.conflict_style.primary;
  const assert1 = p1.conflict_style.dimensions?.assertiveness || 50;
  const assert2 = p2.conflict_style.dimensions?.assertiveness || 50;
  const coop1 = p1.conflict_style.dimensions?.cooperativeness || 50;
  const coop2 = p2.conflict_style.dimensions?.cooperativeness || 50;

  // Map to Gottman's couple types
  const interaction = _classifyConflictDynamic(cs1, cs2, p1Name, p2Name);

  // Power balance analysis
  const powerDiff = Math.abs(assert1 - assert2);
  let powerBalance;
  if (powerDiff < 15) {
    powerBalance = 'balanced';
  } else if (assert1 > assert2) {
    powerBalance = `tilted toward ${p1Name}`;
  } else {
    powerBalance = `tilted toward ${p2Name}`;
  }

  return {
    available: true,
    partner1Style: cs1,
    partner2Style: cs2,
    partner1StyleLabel: formatLabel(cs1),
    partner2StyleLabel: formatLabel(cs2),
    interactionType: interaction.type,
    interactionLabel: interaction.label,
    severity: interaction.severity,
    insight: interaction.insight,
    gottmanFraming: interaction.gottmanFraming,
    powerBalance,
    powerDifference: powerDiff,
    averageCooperativeness: Math.round((coop1 + coop2) / 2),
    averageAssertiveness: Math.round((assert1 + assert2) / 2),
    actionSteps: interaction.actionSteps,
  };
}

function _classifyConflictDynamic(style1, style2, name1, name2) {
  // Key volatile pairings
  const both = [style1, style2].sort().join('_');

  // Both collaborative — dream team
  if (style1 === 'collaborating' && style2 === 'collaborating') {
    return {
      type: 'collaborative_synergy',
      label: 'Collaborative Synergy',
      severity: 'low',
      insight: 'Both partners naturally seek win-win solutions. This is the gold standard of conflict management.',
      gottmanFraming: 'Gottman identifies "masters" of relationships as those who accept influence from each other and collaborate toward solutions. You do this naturally.',
      actionSteps: [
        'Not every issue needs full collaboration — learn to triage (Voss: "Some fights are about the principle, some about the parking spot")',
        'Use your collaborative strength to tackle bigger issues — shared meaning, life dreams, legacy goals',
      ],
    };
  }

  // Competing × Avoiding — the bulldozer and the ghost
  if (both === 'avoiding_competing') {
    const competitor = style1 === 'competing' ? name1 : name2;
    const avoider = style1 === 'avoiding' ? name1 : name2;
    return {
      type: 'bulldozer_ghost',
      label: 'The Bulldozer and The Ghost',
      severity: 'high',
      insight: `${competitor} pushes hard for outcomes while ${avoider} disappears. This creates a cycle where important issues never get resolved — ${competitor} escalates and ${avoider} shuts down.`,
      gottmanFraming: 'This maps directly to Gottman\'s most dangerous pattern: one partner escalating (criticism/contempt) while the other stonewalls. Contempt + stonewalling = maximum divorce prediction.',
      actionSteps: [
        `${competitor}: Your intensity is shutting ${avoider} down. Lower your volume, slow your pace. Use Voss's mirroring: repeat their last 3 words instead of pushing your point.`,
        `${avoider}: Your silence is escalating ${competitor}'s intensity. Practice the "20-minute rule" — take a break but COMMIT to returning.`,
        'Both: Agree on a signal that means "I\'m flooding and need a break" — honor it EVERY time (Gottman)',
      ],
    };
  }

  // Competing × Accommodating — the steamroller dynamic
  if (both === 'accommodating_competing') {
    const competitor = style1 === 'competing' ? name1 : name2;
    const accommodator = style1 === 'accommodating' ? name1 : name2;
    return {
      type: 'steamroller',
      label: 'The Steamroller Dynamic',
      severity: 'high',
      insight: `${competitor} "wins" every conflict while ${accommodator} yields — but this isn't harmony, it's suppression. ${accommodator} is building resentment. ${competitor} doesn't know their partner has given up.`,
      gottmanFraming: 'Gottman warns that when one partner stops bringing up issues, it doesn\'t mean the issues are gone — it means they\'ve lost hope that their voice matters. This is the path to emotional disengagement.',
      actionSteps: [
        `${accommodator}: Your voice MATTERS. Practice Finlayson-Fife's I-Position: "I feel ___ and I need ___." You're not keeping the peace — you're abandoning yourself.`,
        `${competitor}: Deliberately ask for ${accommodator}'s opinion and WAIT. Don't fill their silence with your solution.`,
        'Both: Institute a "speaker-listener" technique — one person speaks for 2 minutes, the other mirrors back. Then switch. No interruptions. (Gottman)',
      ],
    };
  }

  // Competing × Competing — the war zone
  if (both === 'competing_competing') {
    return {
      type: 'war_zone',
      label: 'Two Warriors',
      severity: 'high',
      insight: 'Both partners fight to win, creating escalating battles where the relationship itself becomes collateral damage.',
      gottmanFraming: 'Gottman calls this the "volatile" couple type. It CAN work if the ratio stays above 5:1 — five positives for every negative. Below that, it\'s corrosive.',
      actionSteps: [
        'Channel the intensity productively — passionate debate is fine if respect is maintained (Gottman: no contempt, ever)',
        'Both: Learn Voss\'s accusation audit before raising any issue — front-load the negative to disarm',
        'Practice repair attempts — humor is your best friend in volatile relationships (Gottman)',
        'Critical rule: NO character attacks. Fight about issues, NEVER about identity.',
      ],
    };
  }

  // Avoiding × Avoiding — the cold peace
  if (both === 'avoiding_avoiding') {
    return {
      type: 'cold_peace',
      label: 'The Cold Peace',
      severity: 'moderate',
      insight: 'Neither partner raises issues. The relationship looks peaceful but important needs go chronically unmet. Problems don\'t resolve — they calcify.',
      gottmanFraming: 'Gottman identifies "conflict-avoiding" couples as viable IF they genuinely agree on most things. If they\'re avoiding because they fear conflict, it\'s a ticking time bomb.',
      actionSteps: [
        'Schedule weekly "state of the union" meetings — make conflict a RITUAL, not an emergency (Gottman)',
        'Start small — raise a minor concern this week. Build the muscle.',
        'Practice Brown\'s vulnerability: "Something I\'ve been holding back is..."',
      ],
    };
  }

  // Accommodating × Accommodating — the nice trap
  if (both === 'accommodating_accommodating') {
    return {
      type: 'nice_trap',
      label: 'The Nice Trap',
      severity: 'moderate',
      insight: 'Both partners prioritize the other\'s needs over their own. It looks selfless but leads to mutual self-abandonment. Neither partner\'s true needs get met.',
      gottmanFraming: 'Gottman might see this as two people who\'ve lost their "I" in the "we." Without clear self-advocacy, the relationship loses its individual voices.',
      actionSteps: [
        'Both: Practice Finlayson-Fife\'s I-Position — express your truth even when it differs from your partner\'s',
        'Ask each other: "What do YOU actually want?" — not what you think the other wants',
        'Study differentiation — the healthiest relationships have two strong individuals (Bowen)',
      ],
    };
  }

  // Default: moderate mismatch
  return {
    type: 'mixed',
    label: `${formatLabel(style1)} × ${formatLabel(style2)}`,
    severity: 'moderate',
    insight: `${name1} leans toward ${formatLabel(style1)} while ${name2} leans toward ${formatLabel(style2)}. This mismatch can create friction but also balance — you each bring a different strength to conflict.`,
    gottmanFraming: 'Gottman\'s research shows that HOW you fight matters more than how much. Any conflict style pairing can thrive if the 5:1 ratio is maintained and the Four Horsemen are absent.',
    actionSteps: [
      'Understand your partner\'s style as a STRENGTH, not a flaw',
      'Both: Move toward collaboration for big issues, compromise for small ones',
      'Practice Voss\'s tactical empathy: "It seems like this issue is important to you because..."',
    ],
  };
}


// ─────────────────────────────────────────────────────────────
// 1d. Sound Relationship House Status
// ─────────────────────────────────────────────────────────────

function _analyzeSoundRelationshipHouse(p1, p2, p1Name, p2Name) {
  if (!p1.gottman_checkup || !p2.gottman_checkup) {
    return { available: false, reason: 'Both partners need to complete the Gottman Checkup.' };
  }

  const g1 = p1.gottman_checkup;
  const g2 = p2.gottman_checkup;

  // Combine both partners' views of the relationship
  const avgHealth = Math.round((g1.overallHealth + g2.overallHealth) / 2);
  const healthGap = Math.abs(g1.overallHealth - g2.overallHealth);

  // Perception gap analysis — when partners see the relationship very differently
  let perceptionInsight = null;
  if (healthGap > 25) {
    const healthier = g1.overallHealth > g2.overallHealth ? p1Name : p2Name;
    const struggling = g1.overallHealth > g2.overallHealth ? p2Name : p1Name;
    perceptionInsight = `🚨 Perception Gap: ${healthier} rates the relationship ${healthGap} points higher than ${struggling}. This disconnect itself is a risk factor — ${struggling} may be carrying pain that ${healthier} doesn't see. Gottman's research shows that the LESS satisfied partner's perception is the better predictor of outcomes.`;
  }

  // Combine horsemen scores (average both partners' perceptions)
  const horsemen = {};
  const horsemenTypes = ['criticism', 'contempt', 'defensiveness', 'stonewalling'];
  for (const h of horsemenTypes) {
    const score1 = g1.horsemen?.byType?.[h]?.percentage || 0;
    const score2 = g2.horsemen?.byType?.[h]?.percentage || 0;
    horsemen[h] = {
      average: Math.round((score1 + score2) / 2),
      partner1: score1,
      partner2: score2,
      gap: Math.abs(score1 - score2),
    };
  }

  // Find most dangerous horseman
  const sortedHorsemen = Object.entries(horsemen).sort((a, b) => b[1].average - a[1].average);
  const mostDangerous = sortedHorsemen[0];

  // Combine strength scores
  const strengths = {};
  const strengthTypes = ['love_maps', 'fondness_admiration', 'turning_toward', 'shared_meaning', 'repair_attempts'];
  for (const s of strengthTypes) {
    const score1 = g1.strengths?.byType?.[s]?.percentage || 0;
    const score2 = g2.strengths?.byType?.[s]?.percentage || 0;
    strengths[s] = {
      average: Math.round((score1 + score2) / 2),
      partner1: score1,
      partner2: score2,
      gap: Math.abs(score1 - score2),
    };
  }

  // Find weakest floor of the house
  const sortedStrengths = Object.entries(strengths).sort((a, b) => a[1].average - b[1].average);
  const weakestFloor = sortedStrengths[0];

  // Build the "house" visualization data
  const houseStatus = {
    foundation: {
      loveMaps: strengths.love_maps?.average || 0,
      fondnessAdmiration: strengths.fondness_admiration?.average || 0,
    },
    walls: {
      turningToward: strengths.turning_toward?.average || 0,
    },
    management: {
      repairAttempts: strengths.repair_attempts?.average || 0,
      horsemenSeverity: Math.round(avg(Object.values(horsemen).map(h => h.average))),
    },
    roof: {
      sharedMeaning: strengths.shared_meaning?.average || 0,
    },
  };

  // Overall house integrity
  let houseLevel;
  if (avgHealth >= 75) houseLevel = 'solid';
  else if (avgHealth >= 55) houseLevel = 'standing';
  else if (avgHealth >= 35) houseLevel = 'cracking';
  else houseLevel = 'at_risk';

  return {
    available: true,
    overallHealth: avgHealth,
    healthGap,
    houseLevel,
    houseLevelDescription: houseLevel === 'solid'
      ? 'Your Sound Relationship House is solid — all floors are strong. Focus on maintenance and deepening.'
      : houseLevel === 'standing'
        ? 'Your house is standing but some floors need reinforcement. Target the weakest area first.'
        : houseLevel === 'cracking'
          ? 'Your house has structural issues. The Four Horsemen may be undermining your foundation. Prioritize removing them.'
          : 'Your house is at risk. Multiple floors need urgent attention. Consider professional couples therapy alongside LoveRescue work.',
    perceptionInsight,
    horsemen,
    mostDangerousHorseman: mostDangerous ? {
      name: mostDangerous[0],
      label: formatLabel(mostDangerous[0]),
      score: mostDangerous[1].average,
      insight: _getHorsemanInsight(mostDangerous[0], mostDangerous[1], p1Name, p2Name),
    } : null,
    strengths,
    weakestFloor: weakestFloor ? {
      name: weakestFloor[0],
      label: formatLabel(weakestFloor[0]),
      score: weakestFloor[1].average,
    } : null,
    houseStatus,
    estimatedRatio: _estimateCoupleRatio(horsemen, strengths),
    actionSteps: _getSoundRelationshipHouseActions(houseStatus, horsemen, strengths, p1Name, p2Name),
  };
}

function _getHorsemanInsight(horseman, scores, p1Name, p2Name) {
  const insights = {
    criticism: scores.gap > 20
      ? `Criticism perception gap: one partner feels more criticized than the other sees. This disconnect needs attention — Gottman's antidote: Gentle Startup.`
      : `Criticism is present in your dynamic. The antidote isn't silence — it's learning to complain without blame: "I feel ___ about ___ and I need ___."`,
    contempt: `⚠️ Contempt detected. Gottman identifies this as the #1 predictor of divorce, with 93% accuracy. The antidote: deliberately build a Culture of Appreciation. Daily. Starting today.`,
    defensiveness: `Defensiveness blocks repair. When both partners deflect responsibility, problems become permanent. The antidote: own your 2%. Even if you're 98% right, lead with the 2%.`,
    stonewalling: `Stonewalling indicates nervous system flooding — the body goes into fight/flight and the rational brain goes offline. The antidote: structured breaks with committed return times.`,
  };
  return insights[horseman] || '';
}

function _estimateCoupleRatio(horsemen, strengths) {
  const avgHorsemen = avg(Object.values(horsemen).map(h => h.average));
  const avgStrengths = avg(Object.values(strengths).map(s => s.average));
  if (avgHorsemen === 0) return avgStrengths > 0 ? 'excellent' : 'unknown';
  const ratio = Math.round((avgStrengths / avgHorsemen) * 100) / 100;
  if (ratio >= 5) return 'healthy (5:1+)';
  if (ratio >= 3) return 'caution (3:1-5:1)';
  if (ratio >= 1) return 'at risk (<3:1)';
  return 'critical (<1:1)';
}

function _getSoundRelationshipHouseActions(house, horsemen, strengths, p1Name, p2Name) {
  const actions = [];

  // Address horsemen first (safety before everything)
  if (horsemen.contempt?.average > 40) {
    actions.push({
      priority: 'critical',
      area: 'contempt',
      action: 'IMMEDIATE: Build a Culture of Appreciation. Each partner names 3 specific things they appreciate about the other DAILY. Contempt is relationship poison — the antidote is deliberate admiration. (Gottman)',
    });
  }

  if (horsemen.stonewalling?.average > 50) {
    actions.push({
      priority: 'high',
      area: 'stonewalling',
      action: 'Develop a structured time-out protocol: "I\'m flooding. I need 20 minutes. I WILL come back." Practice self-soothing during breaks — deep breathing, walking, NOT ruminating. (Gottman)',
    });
  }

  // Strengthen weakest floor
  if (strengths.love_maps?.average < 50) {
    actions.push({
      priority: 'high',
      area: 'love_maps',
      action: 'Your knowledge of each other\'s inner world needs updating. This week: ask one open-ended question per day about your partner\'s current world — fears, hopes, stresses. (Gottman: Love Maps exercise)',
    });
  }

  if (strengths.fondness_admiration?.average < 50) {
    actions.push({
      priority: 'high',
      area: 'fondness_admiration',
      action: 'The fondness system needs feeding. Start the "I appreciate you because..." ritual — one specific appreciation each morning. This is Gottman\'s strongest antidote to contempt.',
    });
  }

  if (strengths.turning_toward?.average < 50) {
    actions.push({
      priority: 'medium',
      area: 'turning_toward',
      action: 'You\'re missing each other\'s bids for connection. This week, practice "bid awareness" — when your partner says something, does something, or reaches out in ANY way, respond with attention. Masters turn toward 86% of the time. (Gottman)',
    });
  }

  if (strengths.repair_attempts?.average < 50) {
    actions.push({
      priority: 'medium',
      area: 'repair_attempts',
      action: 'Your repair skills need strengthening. Develop 3 go-to repair phrases: "Can we start over?" / "That came out wrong." / "I hear you, and I\'m sorry." Practice using them this week. (Gottman)',
    });
  }

  if (strengths.shared_meaning?.average < 50) {
    actions.push({
      priority: 'medium',
      area: 'shared_meaning',
      action: 'Your shared meaning system needs attention. Discuss: What are our rituals? What are we building together? What legacy do we want to create? (Gottman: Shared Meaning exercises)',
    });
  }

  return actions;
}


// ─────────────────────────────────────────────────────────────
// 1e. Shared Strengths
// ─────────────────────────────────────────────────────────────

function _identifySharedStrengths(p1, p2, p1Name, p2Name) {
  const strengths = [];

  // High EQ in both
  if (p1.emotional_intelligence?.overall >= 65 && p2.emotional_intelligence?.overall >= 65) {
    strengths.push({
      area: 'Emotional Intelligence',
      insight: 'Both partners have strong emotional intelligence. This is your superpower — you can navigate difficult conversations with skill and compassion.',
      expertSource: 'Goleman: EQ is the strongest predictor of relationship success beyond attachment security.',
    });
  }

  // Both collaborative conflict style
  if (p1.conflict_style?.primary === 'collaborating' && p2.conflict_style?.primary === 'collaborating') {
    strengths.push({
      area: 'Conflict Resolution',
      insight: 'Both partners default to collaboration in conflict. You seek win-win outcomes naturally.',
      expertSource: 'Thomas-Kilmann: Collaborating is the most effective style for important issues that require both parties\' commitment.',
    });
  }

  // Both well-differentiated
  if (p1.differentiation?.overallScore >= 65 && p2.differentiation?.overallScore >= 65) {
    strengths.push({
      area: 'Differentiation of Self',
      insight: 'Both partners maintain a solid sense of self. You can disagree without it threatening the relationship.',
      expertSource: 'Finlayson-Fife: Differentiation is the foundation of mature love — the ability to hold your own truth while staying connected.',
    });
  }

  // Both shame-resilient
  if (p1.shame_vulnerability?.level === 'shame-resilient' && p2.shame_vulnerability?.level === 'shame-resilient') {
    strengths.push({
      area: 'Vulnerability & Shame Resilience',
      insight: 'Both partners can practice vulnerability without collapsing into shame. This allows deep, authentic connection.',
      expertSource: 'Brown: Shame resilience in both partners creates a "shame-free zone" — the prerequisite for wholehearted love.',
    });
  }

  // Both secure attachment
  if (p1.attachment?.style === 'secure' && p2.attachment?.style === 'secure') {
    strengths.push({
      area: 'Secure Attachment',
      insight: 'Both partners operate from a secure base. You can express needs directly and tolerate difference without threat.',
      expertSource: 'Johnson (A.R.E.): Both partners are Accessible, Responsive, and Engaged — the hallmark of secure bonding.',
    });
  }

  // Same love language
  if (p1.love_language?.primary && p1.love_language.primary === p2.love_language?.primary) {
    strengths.push({
      area: 'Love Language Alignment',
      insight: `You both speak ${formatLabel(p1.love_language.primary)} as your primary love language. You naturally "get" how to make each other feel loved.`,
      expertSource: 'Chapman: When partners share a love language, expressions of love are received as intended without translation loss.',
    });
  }

  // High tactical empathy in both
  if (p1.tactical_empathy?.overall >= 65 && p2.tactical_empathy?.overall >= 65) {
    strengths.push({
      area: 'Communication & Empathy',
      insight: 'Both partners are skilled communicators who make each other feel deeply understood.',
      expertSource: 'Voss: When both partners master tactical empathy, every conversation becomes a bonding event. "That\'s right" flows naturally.',
    });
  }

  // Strong Gottman scores in both
  if (p1.gottman_checkup?.overallHealth >= 70 && p2.gottman_checkup?.overallHealth >= 70) {
    strengths.push({
      area: 'Relationship Health',
      insight: 'Both partners report strong relationship health across Gottman dimensions. The Sound Relationship House has a solid foundation.',
      expertSource: 'Gottman: Couples above the 70th percentile on relationship health metrics have a 94% five-year stability rate.',
    });
  }

  // Strong physical vitality
  if (p1.physical_vitality?.overall >= 65 && p2.physical_vitality?.overall >= 65) {
    strengths.push({
      area: 'Physical Vitality',
      insight: 'Both partners invest in physical health. This energy shows up in emotional availability, desire, and resilience.',
      expertSource: 'Robbins: Physical vitality is the foundation of emotional energy. You can\'t pour from an empty cup.',
    });
  }

  return strengths;
}


// ─────────────────────────────────────────────────────────────
// 1f. Growth Edges
// ─────────────────────────────────────────────────────────────

function _identifyGrowthEdges(p1, p2, p1Name, p2Name) {
  const edges = [];

  // Both low EQ
  if (p1.emotional_intelligence?.overall < 45 && p2.emotional_intelligence?.overall < 45) {
    edges.push({
      area: 'Emotional Intelligence',
      type: 'both_low',
      insight: 'Both partners are developing their emotional intelligence. This is your highest-leverage growth area — improvement here cascades into every other dimension.',
      expertSource: 'Goleman: EQ is learnable. Start with "name it to tame it" — labeling emotions reduces their intensity by up to 50%.',
      actionStep: 'Daily practice: Three times today, pause and name what you\'re feeling. Share one with your partner tonight.',
    });
  }

  // Big EQ gap
  if (p1.emotional_intelligence && p2.emotional_intelligence) {
    const eqGap = Math.abs((p1.emotional_intelligence.overall || 0) - (p2.emotional_intelligence.overall || 0));
    if (eqGap > 25) {
      const higher = (p1.emotional_intelligence.overall || 0) > (p2.emotional_intelligence.overall || 0) ? p1Name : p2Name;
      const lower = higher === p1Name ? p2Name : p1Name;
      edges.push({
        area: 'EQ Gap',
        type: 'mismatch',
        insight: `${higher} scores significantly higher in emotional intelligence than ${lower}. This can create a dynamic where ${higher} does the emotional heavy-lifting while ${lower} disengages or feels inadequate.`,
        expertSource: 'Johnson: When one partner is more emotionally skilled, they can become the "therapist" in the relationship — which kills desire (Perel) and creates resentment.',
        actionStep: `${lower}: Invest in your EQ — this is the best gift you can give the relationship. ${higher}: Be patient, but don't do the emotional work for them.`,
      });
    }
  }

  // Differentiation gap or both low
  if (p1.differentiation && p2.differentiation) {
    const d1 = p1.differentiation.overallScore || 0;
    const d2 = p2.differentiation.overallScore || 0;
    if (d1 < 45 && d2 < 45) {
      edges.push({
        area: 'Differentiation',
        type: 'both_low',
        insight: 'Both partners struggle with differentiation — maintaining a solid self while staying connected. This often creates fusion (merging identities) or cut-off (emotional withdrawal).',
        expertSource: 'Finlayson-Fife: Low differentiation kills desire. You can\'t want someone you\'re merged with. Growing up in your relationship means developing YOUR solid self.',
        actionStep: 'Each partner: Identify one opinion, preference, or boundary you\'ve been suppressing. Express it this week.',
      });
    }
  }

  // Desire/aliveness concerns
  if (p1.desire_aliveness && p2.desire_aliveness) {
    const da1 = p1.desire_aliveness.overall || 0;
    const da2 = p2.desire_aliveness.overall || 0;
    if (da1 < 40 || da2 < 40) {
      const desireGap = Math.abs(da1 - da2);
      if (desireGap > 20) {
        const higher = da1 > da2 ? p1Name : p2Name;
        const lower = da1 > da2 ? p2Name : p1Name;
        edges.push({
          area: 'Desire Gap',
          type: 'mismatch',
          insight: `${higher} reports higher desire and aliveness than ${lower}. This gap often creates a pursuer-withdrawer dynamic around intimacy.`,
          expertSource: 'Perel: Desire discrepancy is normal — but unaddressed, it becomes the breeding ground for resentment, shame, and rejection sensitivity.',
          actionStep: 'Have a non-blaming conversation about desire: "What helps you feel alive and connected? What dampens it?" Use Voss\'s labeling technique.',
        });
      } else if (da1 < 40 && da2 < 40) {
        edges.push({
          area: 'Desire & Aliveness',
          type: 'both_low',
          insight: 'Both partners report low desire and erotic aliveness. The relationship may have tipped too far toward security at the expense of passion.',
          expertSource: 'Perel: "Love seeks closeness; desire needs distance." You need to reintroduce mystery, novelty, and separateness.',
          actionStep: 'Each partner: Do something THIS WEEK that\'s entirely for yourself — a passion, hobby, or experience that has nothing to do with the relationship. Then share it.',
        });
      }
    }
  }

  // Shame vulnerability concerns
  if (p1.shame_vulnerability && p2.shame_vulnerability) {
    const sv1 = p1.shame_vulnerability;
    const sv2 = p2.shame_vulnerability;
    if ((sv1.shameTriggers || 0) > 60 && (sv2.shameTriggers || 0) > 60) {
      edges.push({
        area: 'Shared Shame Sensitivity',
        type: 'both_high',
        insight: 'Both partners have high shame triggers. This means conflict easily becomes identity-threatening for both — "I made a mistake" becomes "I AM the mistake."',
        expertSource: 'Brown: When both partners are shame-prone, arguments escalate fast because both feel existentially threatened. The antidote is shared vulnerability practice.',
        actionStep: 'Start using "The story I\'m telling myself is..." during conflict. This externalizes shame and creates space for compassion.',
      });
    }
  }

  // Tactical empathy gap
  if (p1.tactical_empathy && p2.tactical_empathy) {
    const te1 = p1.tactical_empathy.overall || 0;
    const te2 = p2.tactical_empathy.overall || 0;
    if (te1 < 45 && te2 < 45) {
      edges.push({
        area: 'Communication Skills',
        type: 'both_low',
        insight: 'Both partners are developing their communication skills. Conversations may frequently escalate because neither feels fully heard.',
        expertSource: 'Voss: The most powerful communication skill is making the other person feel understood. "That\'s right" is the goal of every conversation.',
        actionStep: 'This week, practice ONE Voss technique: mirror your partner\'s last 3 words before responding. Do it 3 times per day.',
      });
    }
  }

  return edges;
}


// ─────────────────────────────────────────────────────────────
// 1g. Expert Narrative
// ─────────────────────────────────────────────────────────────

function _buildExpertNarrative(profile, p1, p2, p1Name, p2Name) {
  const sections = [];

  // Attachment narrative
  const ad = profile.attachmentDynamic;
  if (ad?.available) {
    let attachNarrative = '';
    if (ad.dynamicType === 'anxious_avoidant') {
      attachNarrative = `Johnson calls this the "Protest Polka" — ${ad.pursueWithdrawCycle.pursuer} reaches with increasing urgency while ${ad.pursueWithdrawCycle.withdrawer} retreats to self-protect. Levine identifies this as the most magnetically attractive AND most painful pairing. The good news: awareness of this pattern is the first step to breaking it.`;
    } else if (ad.dynamicType === 'secure_secure') {
      attachNarrative = `This couple has what Johnson calls an "A.R.E." bond — Accessible, Responsive, Engaged. Both partners can serve as each other's safe haven. The work here is maintenance and deepening, not crisis management.`;
    } else if (ad.dynamicType.includes('fearful_avoidant')) {
      attachNarrative = `The presence of fearful-avoidant attachment adds complexity. Johnson notes that this style often emerges from early relational trauma — the person who was supposed to provide safety was also the source of threat. Patience, consistency, and potentially professional EFT therapy are recommended.`;
    } else {
      attachNarrative = `${ad.johnsonFraming}`;
    }
    sections.push({
      title: 'Attachment Dynamic',
      narrative: attachNarrative,
      source: 'Sue Johnson (EFT), Amir Levine (Attached)',
    });
  }

  // Love Language narrative
  const ll = profile.loveLanguageMismatch;
  if (ll?.available && ll.translationGap) {
    sections.push({
      title: 'Love Language Mismatch',
      narrative: `${p1Name} expresses love through ${ll.partner1PrimaryLabel} while ${p2Name} needs ${ll.partner2PrimaryLabel}. Chapman's key insight: they're both TRYING to love each other — they're just speaking different languages. This mismatch alone explains many moments where one feels unloved despite the other's genuine effort.`,
      source: 'Gary Chapman (5 Love Languages)',
    });
  }

  // Conflict narrative
  const ci = profile.conflictInteraction;
  if (ci?.available) {
    sections.push({
      title: 'Conflict Dynamic',
      narrative: `${ci.insight} ${ci.gottmanFraming}`,
      source: 'Gottman (Sound Relationship House), Thomas-Kilmann (Conflict Modes)',
    });
  }

  // Sound Relationship House narrative
  const srh = profile.soundRelationshipHouse;
  if (srh?.available) {
    let srhNarrative = srh.houseLevelDescription;
    if (srh.perceptionInsight) {
      srhNarrative += ` ${srh.perceptionInsight}`;
    }
    if (srh.mostDangerousHorseman?.score > 40) {
      srhNarrative += ` Priority: Address ${formatLabel(srh.mostDangerousHorseman.name)} — ${srh.mostDangerousHorseman.insight}`;
    }
    sections.push({
      title: 'Sound Relationship House',
      narrative: srhNarrative,
      source: 'John & Julie Gottman',
    });
  }

  // Synthesis
  const riskFactors = [];
  if (ad?.severity === 'high') riskFactors.push('high-conflict attachment dynamic');
  if (srh?.houseLevel === 'at_risk' || srh?.houseLevel === 'cracking') riskFactors.push('compromised relationship house');
  if (ci?.severity === 'high') riskFactors.push('destructive conflict pattern');
  if (profile.growthEdges?.some(e => e.area === 'Desire Gap')) riskFactors.push('significant desire discrepancy');

  const protectiveFactors = profile.sharedStrengths?.map(s => s.area) || [];

  return {
    sections,
    riskFactors,
    protectiveFactors,
    overallAssessment: riskFactors.length === 0 && protectiveFactors.length >= 3
      ? 'This couple has a strong foundation with multiple protective factors. Focus on deepening and growth.'
      : riskFactors.length > 2
        ? 'This couple has multiple risk factors that require immediate attention. Prioritize safety-building and cycle de-escalation.'
        : 'This couple has a mixed profile with both strengths and growth areas. Targeted intervention on specific dynamics can yield significant improvement.',
    recommendedFocus: riskFactors.length > 0 ? riskFactors[0] : (protectiveFactors.length > 0 ? `Build on ${protectiveFactors[0]}` : 'Complete more assessments for a full picture'),
  };
}


// ═══════════════════════════════════════════════════════════════
// 2. GENERATE CROSS-ASSESSMENT INSIGHTS — THE COMPETITIVE MOAT
// ═══════════════════════════════════════════════════════════════

/**
 * THE crown jewel function. Maps cross-assessment patterns that NO other
 * platform generates. Each insight combines two or more assessment dimensions
 * with expert-attributed meaning and specific technique recommendations.
 * 
 * @param {Object} data - { partner1, partner2, partner1Name, partner2Name }
 *   OR for single-person: { attachment, love_language, conflict_style, ... }
 * @returns {Array} Array of cross-assessment insight objects
 */
function generateCrossAssessmentInsights(data) {
  const insights = [];

  // Support both couple and individual analysis
  const isCoupleMode = !!(data.partner1 && data.partner2);
  const subjects = isCoupleMode
    ? [
        { scores: data.partner1, name: data.partner1Name || 'Partner A' },
        { scores: data.partner2, name: data.partner2Name || 'Partner B' },
      ]
    : [{ scores: data, name: 'You' }];

  // ═══════════════════════════════════════════════════════════
  // PATTERN 1: Attachment × Love Language (16+ combinations)
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const att = subject.scores.attachment;
    const ll = subject.scores.love_language;
    if (!att || !ll) continue;

    const style = att.style;
    const lang = ll.primary;
    const name = subject.name;

    const attachLoveInsight = _getAttachmentLoveLanguageInsight(style, lang, name);
    if (attachLoveInsight) {
      insights.push({
        type: 'attachment_x_love_language',
        subject: name,
        pattern: `${formatLabel(style)} attachment × ${formatLabel(lang)}`,
        ...attachLoveInsight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN 2: Conflict Style × Attachment Style
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const att = subject.scores.attachment;
    const cs = subject.scores.conflict_style;
    if (!att || !cs) continue;

    const insight = _getConflictAttachmentInsight(att.style, cs.primary, subject.name);
    if (insight) {
      insights.push({
        type: 'conflict_x_attachment',
        subject: subject.name,
        pattern: `${formatLabel(cs.primary)} conflict × ${formatLabel(att.style)} attachment`,
        ...insight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN 3: Shame Resilience × Vulnerability Capacity
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const sv = subject.scores.shame_vulnerability;
    const diff = subject.scores.differentiation;
    if (!sv || !diff) continue;

    const insight = _getShameVulnerabilityInsight(sv, diff, subject.name);
    if (insight) {
      insights.push({
        type: 'shame_x_vulnerability',
        subject: subject.name,
        pattern: `${sv.level} × ${diff.level} differentiation`,
        ...insight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN 4: Tactical Empathy × Conflict Style
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const te = subject.scores.tactical_empathy;
    const cs = subject.scores.conflict_style;
    if (!te || !cs) continue;

    const insight = _getTacticalEmpathyConflictInsight(te, cs, subject.name);
    if (insight) {
      insights.push({
        type: 'empathy_x_conflict',
        subject: subject.name,
        pattern: `${te.level} empathy × ${formatLabel(cs.primary)} conflict`,
        ...insight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN 5: Attachment × Shame (the hidden driver)
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const att = subject.scores.attachment;
    const sv = subject.scores.shame_vulnerability;
    if (!att || !sv) continue;

    const insight = _getAttachmentShameInsight(att, sv, subject.name);
    if (insight) {
      insights.push({
        type: 'attachment_x_shame',
        subject: subject.name,
        pattern: `${formatLabel(att.style)} attachment × ${sv.level} shame`,
        ...insight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN 6: Human Needs × Attachment (motivational drivers)
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const att = subject.scores.attachment;
    const hn = subject.scores.human_needs;
    if (!att || !hn) continue;

    const insight = _getHumanNeedsAttachmentInsight(att.style, hn.topTwo, subject.name);
    if (insight) {
      insights.push({
        type: 'needs_x_attachment',
        subject: subject.name,
        pattern: `${formatLabel(att.style)} attachment × ${hn.topTwo?.map(formatLabel).join(' + ')} needs`,
        ...insight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATTERN 7: Desire × Differentiation (the Perel-Fife axis)
  // ═══════════════════════════════════════════════════════════

  for (const subject of subjects) {
    const da = subject.scores.desire_aliveness;
    const diff = subject.scores.differentiation;
    if (!da || !diff) continue;

    const insight = _getDesireDifferentiationInsight(da, diff, subject.name);
    if (insight) {
      insights.push({
        type: 'desire_x_differentiation',
        subject: subject.name,
        pattern: `${da.level} desire × ${diff.level} differentiation`,
        ...insight,
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // COUPLE-LEVEL CROSS PATTERNS (only in couple mode)
  // ═══════════════════════════════════════════════════════════

  if (isCoupleMode) {
    const p1 = data.partner1;
    const p2 = data.partner2;
    const n1 = data.partner1Name || 'Partner A';
    const n2 = data.partner2Name || 'Partner B';

    // Attachment mismatch × Love language mismatch (compound effect)
    if (p1.attachment && p2.attachment && p1.love_language && p2.love_language) {
      const attMismatch = p1.attachment.style !== p2.attachment.style;
      const llMismatch = p1.love_language.primary !== p2.love_language.primary;
      if (attMismatch && llMismatch) {
        insights.push({
          type: 'couple_compound_mismatch',
          subject: 'Couple',
          pattern: 'Attachment mismatch + Love language mismatch',
          meaning: `Double mismatch: Your attachment styles AND love languages differ. This means not only do you have different safety needs (Johnson), but you express love in ways the other doesn't naturally receive (Chapman). This compounds the disconnection.`,
          whyItMatters: 'Each mismatch alone is manageable. Together, they create a situation where Partner A gives love in their language (which Partner B doesn\'t register), AND their attachment bids are misread as threat rather than need.',
          expertAttribution: 'Johnson (EFT) + Chapman (Love Languages): This is the intersection where "I\'m reaching for you" gets lost in translation twice — once through attachment filters, once through love language filters.',
          technique: `Step 1: Learn each other's attachment style — so you recognize bids for connection even when they look like criticism or withdrawal. Step 2: Learn each other's love language — so your bids land in the right channel. Step 3: When activated, use Voss's labeling: "It seems like you're reaching for me and I'm not responding in the way you need."`,
          priority: 'high',
        });
      }
    }

    // Shame × Gottman horsemen (the shame-horseman feedback loop)
    if (p1.shame_vulnerability && p2.shame_vulnerability && p1.gottman_checkup && p2.gottman_checkup) {
      const highShame1 = (p1.shame_vulnerability.shameTriggers || 0) > 55;
      const highShame2 = (p2.shame_vulnerability.shameTriggers || 0) > 55;
      const highHorsemen = Math.max(
        p1.gottman_checkup.horsemen?.severity || 0,
        p2.gottman_checkup.horsemen?.severity || 0
      ) > 45;

      if ((highShame1 || highShame2) && highHorsemen) {
        insights.push({
          type: 'couple_shame_horsemen',
          subject: 'Couple',
          pattern: 'High shame + Active horsemen',
          meaning: 'Shame and the Four Horsemen create a feedback loop: criticism triggers shame, shame triggers defensiveness, defensiveness triggers contempt, contempt triggers more shame. This is the cycle that destroys relationships.',
          whyItMatters: 'Brown identifies shame as the engine beneath the horsemen. Gottman treats the horsemen behaviorally; Brown treats the root emotion. You need both.',
          expertAttribution: 'Brown (Shame Resilience) + Gottman (Four Horsemen): "Shame is the intensifier that turns a complaint into an attack and a mistake into a character flaw."',
          technique: 'When a horseman appears, PAUSE and check for shame: "Am I attacking because I feel ashamed? Am I defending because I feel worthless?" Use Brown\'s SFD: "The story I\'m telling myself is that I\'m not enough."',
          priority: 'high',
        });
      }
    }
  }

  return insights;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight generators (attachment × love language)
// ─────────────────────────────────────────────────────────────

function _getAttachmentLoveLanguageInsight(attachStyle, loveLang, name) {
  const map = {
    // ANXIOUS × all 5 love languages
    anxious_words_of_affirmation: {
      meaning: `${name} needs verbal reassurance during conflict, but anxiety makes them unable to ASK for it clearly — instead they may escalate, criticize, or test.`,
      whyItMatters: 'The anxious partner\'s hyperactivated attachment system creates a paradox: the more they need words of affirmation, the more their protest behaviors push the partner into silence.',
      expertAttribution: 'Levine (Attached): Anxious attachment + Words of Affirmation = the "reassurance seeker" who protest-tests instead of directly asking. Johnson (EFT): This is the pursuer whose real message is "Tell me I matter."',
      technique: 'Voss technique: Label the unspoken need before they escalate. "It seems like you need to hear that I\'m still here and I still love you." This bypasses the protest behavior and speaks directly to the attachment need.',
    },
    anxious_physical_touch: {
      meaning: `${name}'s anxiety drives them to seek physical proximity as reassurance. When touch is withdrawn, their attachment alarm goes to maximum.`,
      whyItMatters: 'Physical touch IS the nervous system regulator for this person. Without it, they can\'t self-soothe, and protest behaviors activate.',
      expertAttribution: 'Tatkin (PACT): The nervous system seeks co-regulation through physical contact. For anxious + physical touch, separation literally feels like danger.',
      technique: 'During conflict, maintain minimal physical contact — a hand on the knee, sitting close. This keeps the nervous system regulated enough for rational conversation. Tatkin calls this "tethering."',
    },
    anxious_quality_time: {
      meaning: `${name} equates presence with safety. When their partner is distracted, multitasking, or unavailable, it triggers attachment anxiety — not just disappointment.`,
      whyItMatters: 'For this combination, a partner checking their phone during dinner isn\'t just annoying — it\'s an attachment threat. The anxiety reads it as "I\'m not important enough."',
      expertAttribution: 'Gottman (Bids): Every moment of divided attention is a "turning away" from a bid. For anxious + quality time, each turned-away bid activates the protest system.',
      technique: 'Schedule daily "phone-free presence" — even 15 minutes of fully undivided attention. Communicate it explicitly: "This is our time. You have my full attention." The predictability calms the anxious system.',
    },
    anxious_acts_of_service: {
      meaning: `${name} interprets helpful actions as proof of love and commitment. When their partner doesn't help or forgets a task, it triggers "they don't care about me."`,
      whyItMatters: 'The anxious system reads inaction as rejection. Missing an act of service becomes evidence for the catastrophic narrative: "They\'re pulling away."',
      expertAttribution: 'Levine (Attached): Anxious individuals are hypersensitive to any signal of withdrawal. Chapman: When acts of service IS the language, a forgotten chore = an unspoken "I don\'t love you."',
      technique: 'The partner should make acts of service visible and verbal: "I did this because I was thinking about you." The verbal framing transforms a silent act into an attachment reassurance.',
    },
    anxious_receiving_gifts: {
      meaning: `${name} uses gifts as tangible evidence of being thought about. Between gifts, anxiety fills the gap with doubt.`,
      whyItMatters: 'Gifts serve as "transitional objects" (Winnicott) — physical proof that love exists even when the partner is absent. Without them, the anxious system has nothing to hold onto.',
      expertAttribution: 'Levine (Attached): Anxious attachment craves evidence of love. Chapman: Gifts ARE that evidence. The combination means small, frequent tokens matter more than grand gestures.',
      technique: 'Small, frequent gifts or tokens > occasional big ones. A "thinking of you" text with a photo, a picked flower, a saved article. Frequency regulates the anxious system more than magnitude.',
    },

    // AVOIDANT × all 5 love languages
    avoidant_words_of_affirmation: {
      meaning: `${name} values verbal affirmation but struggles to reciprocate or accept it deeply. They may deflect compliments or feel uncomfortable with emotional verbal exchanges.`,
      whyItMatters: 'The avoidant system deactivates emotional intensity — even positive intensity. Hearing "I love you" can trigger the urge to withdraw because it increases intimacy pressure.',
      expertAttribution: 'Levine (Deactivating Strategies): Avoidant individuals may minimize the importance of verbal affirmation even though it\'s their love language. Johnson: The avoidant partner hears "I love you" and their system whispers "trap."',
      technique: 'Affirm through action-oriented language rather than pure emotion. Instead of "I love you so much," try "I respect how you handled that." Achievement-framed affirmation feels safer to the avoidant system.',
    },
    avoidant_physical_touch: {
      meaning: `${name} craves physical closeness but their avoidant wiring creates a push-pull with it — they want touch on THEIR terms and may feel trapped by unsolicited physical affection.`,
      whyItMatters: 'Touch without control feels engulfing to the avoidant system. They need to be the one to initiate, or at least have the option to modulate.',
      expertAttribution: 'Tatkin (PACT): The avoidant partner needs to control proximity. Their love language is touch but their attachment system needs autonomy over when and how.',
      technique: 'Offer touch without expectation: "Would you like a hug?" rather than ambushing with one. Let them set the pace. When they DO initiate, receive it warmly — this is them overriding their deactivation system.',
    },
    avoidant_quality_time: {
      meaning: `${name} values presence but needs it to be low-pressure. Intense emotional conversations during "quality time" can trigger withdrawal.`,
      whyItMatters: 'Parallel activities (walking, cooking, driving) work better than face-to-face emotional processing for this combination.',
      expertAttribution: 'Tatkin: Avoidant partners process better side-by-side than face-to-face. Perel: Some of the best intimacy happens in shared DOING, not shared talking.',
      technique: 'Design quality time around parallel activities — hiking, cooking, building something. The togetherness satisfies the love language while the activity focus reduces the intimacy pressure.',
    },
    avoidant_acts_of_service: {
      meaning: `${name} expresses love through doing rather than saying. This works well with their avoidant wiring — they can show love without the vulnerability of emotional expression.`,
      whyItMatters: 'This is actually one of the most congruent combinations. The risk: the partner may not FEEL loved because the avoidant never says it, only does it.',
      expertAttribution: 'Chapman: Acts of service is the "quiet" love language. Levine: Avoidant partners default to showing rather than telling. The gap: their partner may need to HEAR it too.',
      technique: 'Partner of the avoidant: learn to READ their acts of service as love declarations. When they fix something, cook something, handle something — that IS their "I love you." Acknowledge it.',
    },
    avoidant_receiving_gifts: {
      meaning: `${name} appreciates thoughtful gifts but may struggle to show enthusiasm or receive them openly. The vulnerability of receiving can trigger deactivation.`,
      whyItMatters: 'Receiving requires acknowledgment of dependency — which the avoidant system resists. They may minimize gifts ("You didn\'t have to") as a deactivating strategy.',
      expertAttribution: 'Levine: Deactivating strategies include minimizing the importance of romantic gestures. Chapman: If receiving gifts is the language, this minimization starves the relationship.',
      technique: 'Give gifts casually — don\'t make it a big emotional moment. "I saw this and thought of you." Low emotional intensity + high thoughtfulness = the sweet spot for this combination.',
    },

    // SECURE × love languages (briefer — less pathology to address)
    secure_words_of_affirmation: {
      meaning: `${name} can both give and receive verbal affirmation naturally. Their secure base allows them to express love verbally without fear of rejection.`,
      whyItMatters: 'This is one of the healthiest combinations. The main growth edge is ensuring they also learn to speak their PARTNER\'s language, not just their own.',
      expertAttribution: 'Johnson (A.R.E.): A secure partner who speaks Words of Affirmation is naturally Accessible and Responsive. The key is ensuring they\'re also Engaged with their partner\'s language.',
      technique: 'Keep doing what you\'re doing — AND learn your partner\'s language with the same fluency.',
    },
    secure_physical_touch: {
      meaning: `${name}'s security allows them to give and receive physical affection freely, without it being loaded with anxiety or avoidance.`,
      whyItMatters: 'Secure + physical touch creates a naturally regulating presence in the relationship. Their touch calms their partner\'s nervous system.',
      expertAttribution: 'Tatkin: A secure partner\'s touch literally regulates the other\'s cortisol and oxytocin levels. This is biological co-regulation at its finest.',
      technique: 'Use your natural touch as a relationship tool — especially during moments of stress. Your calm, affectionate presence is medicine for an anxious or avoidant partner.',
    },
    secure_quality_time: {
      meaning: `${name} gives focused, present attention naturally. They don't need their partner to earn their presence.`,
      whyItMatters: 'This creates a reliable sense of "being seen" that benefits any partner, regardless of their attachment style.',
      expertAttribution: 'Gottman: Turning toward bids is the #1 predictor of relationship longevity. Secure + quality time = someone who naturally turns toward.',
      technique: 'Ensure your quality time includes emotional depth, not just pleasant presence. Ask deeper questions: "What\'s alive in you right now?"',
    },
    secure_acts_of_service: {
      meaning: `${name} expresses love through reliable, consistent helpfulness. Their secure base means service comes from genuine care, not obligation or anxiety.`,
      whyItMatters: 'This is love expressed through dependability — and it builds trust over time.',
      expertAttribution: 'Robbins: When service comes from contribution rather than obligation, it fulfills both the giver and the receiver.',
      technique: 'Continue serving — but also practice verbalizing WHY you do it. "I picked this up because I know you\'ve had a hard week" doubles the impact.',
    },
    secure_receiving_gifts: {
      meaning: `${name} can receive gifts with genuine joy and appreciation. Their security means they don't read hidden agendas into gestures.`,
      whyItMatters: 'Being a good receiver is a gift to the giver. This combination creates a healthy receiving-giving loop.',
      expertAttribution: 'Brown: The ability to receive without deflecting is a vulnerability practice. Secure + receiving gifts = someone who can fully receive love.',
      technique: 'When you receive, let it SHOW. Your authentic appreciation teaches your partner that their effort matters and encourages more giving.',
    },

    // FEARFUL-AVOIDANT × all 5 love languages
    fearful_avoidant_words_of_affirmation: {
      meaning: `${name} deeply craves verbal reassurance but may not trust it when it arrives — they may question sincerity or wait for the "but."`,
      whyItMatters: 'The fearful-avoidant system wants to believe the words but has learned that love can be followed by pain. Verbal affirmation needs to be paired with consistent action over time.',
      expertAttribution: 'Johnson: Fearful-avoidant attachment creates a "reach then flinch" pattern. They reach for words of love and then flinch from them. Healing requires patience and repetition.',
      technique: 'Affirm consistently AND specifically. Not just "I love you" but "I love you, and I\'m not going anywhere, and here\'s what I mean by that: [specific evidence]." Over time, repetition rewires expectation.',
    },
    fearful_avoidant_physical_touch: {
      meaning: `${name} oscillates between craving touch and finding it overwhelming. The same embrace that feels comforting one moment can feel suffocating the next.`,
      whyItMatters: 'Touch is both the medicine and the trigger. The partner must learn to read the signals and give touch with an open hand — easy to receive, easy to release.',
      expertAttribution: 'Tatkin: Fearful-avoidant individuals need touch that comes with visible "exits" — not full envelopment. Offer contact that the person can modulate.',
      technique: 'Start with low-intensity touch (a hand on the shoulder, sitting close) and let them escalate if they want. Never trap. Always leave space. Consistency over intensity.',
    },
    fearful_avoidant_quality_time: {
      meaning: `${name} wants togetherness but may feel anxious during it — monitoring for signs of danger even in safe moments.`,
      whyItMatters: 'Quality time with a fearful-avoidant partner requires creating safety within the moment itself. Predictability and routine help.',
      expertAttribution: 'Johnson: The fearful-avoidant partner is constantly scanning for threat even in positive moments. Brown: This is "foreboding joy" — the fear that good things will be snatched away.',
      technique: 'Create reliable, recurring quality time rituals. Same time, same place, same vibe. The predictability builds the neural pathways for safety that were never established.',
    },
    fearful_avoidant_acts_of_service: {
      meaning: `${name} may feel indebted by acts of service — as if receiving help creates vulnerability to future disappointment or strings attached.`,
      whyItMatters: 'For fearful-avoidant, receiving creates obligation, and obligation creates vulnerability. They need service given freely with no strings.',
      expertAttribution: 'Levine: The fearful-avoidant system reads generosity as potential trap. Chapman: Service must be unconditional to land.',
      technique: 'Serve without expectation. If they say "you didn\'t have to," respond with "I know. I wanted to." Don\'t keep score. Let the consistency speak.',
    },
    fearful_avoidant_receiving_gifts: {
      meaning: `${name} may struggle with gifts — the joy of receiving collides with the fear that the gift implies dependency or will be taken away.`,
      whyItMatters: 'Gifts can trigger foreboding joy — "This is too nice, something bad will follow."',
      expertAttribution: 'Brown: Foreboding joy is the hallmark of people who\'ve been hurt after moments of happiness. Gifts trigger this pattern.',
      technique: 'Give small, consistent tokens with no fanfare. Normalize receiving. Don\'t make it a big emotional event. Let the gift just BE, without requiring a performance of gratitude.',
    },
  };

  const key = `${attachStyle}_${loveLang}`;
  return map[key] || null;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight: Conflict Style × Attachment
// ─────────────────────────────────────────────────────────────

function _getConflictAttachmentInsight(attachStyle, conflictStyle, name) {
  // Map key combinations
  const patterns = {
    anxious_competing: {
      meaning: `${name} pursues connection through escalation — fighting IS their way of maintaining contact. The angrier they get, the more terrified they are underneath.`,
      whyItMatters: 'Johnson: Every criticism from an anxious partner is a disguised bid for connection. The competing style amplifies this into full-volume protest behavior.',
      expertAttribution: 'Johnson (Demon Dialogues) + Thomas-Kilmann: This is the pursuer who fights BECAUSE withdrawal feels like death. Levine: Protest behaviors at maximum volume.',
      technique: 'Voss: "It seems like you\'re fighting this hard because this really matters to you — and maybe because you\'re scared we won\'t be okay." Labeling the fear beneath the fury de-escalates instantly.',
    },
    anxious_avoiding: {
      meaning: `${name} has a paradox: anxious attachment drives them TOWARD connection, but their conflict style drives them AWAY from it. They want to engage but shut down when it gets real.`,
      whyItMatters: 'This creates a freeze response — they want to fight for the relationship but can\'t access the words or emotions needed. Partners may misread this as indifference.',
      expertAttribution: 'Levine: This is the anxious partner who "goes quiet" — not because they don\'t care, but because the intensity has overwhelmed their system. Gottman: This looks like stonewalling but is actually flooding.',
      technique: 'Before difficult conversations, agree on a signal: "I\'m overwhelmed but I\'m still here." Take a physiological break (20 min, deep breathing) then return. Tatkin: The return is everything.',
    },
    avoidant_competing: {
      meaning: `${name} competes in conflict to MAINTAIN distance — they fight to win so they can end the conversation faster. Winning = escape.`,
      whyItMatters: 'This isn\'t about the issue — it\'s about controlling the emotional space. The harder they win, the faster the discomfort ends.',
      expertAttribution: 'Levine: Deactivating through dominance. Gottman: This can look like contempt but is actually avoidance wearing a mask of aggression.',
      technique: 'The partner should use Voss\'s calibrated questions: "How would you like to solve this?" This invites collaboration without forcing emotional depth, giving the avoidant a sense of control.',
    },
    avoidant_avoiding: {
      meaning: `${name} avoids both emotional closeness AND conflict. Important issues never surface. Resentment builds silently.`,
      whyItMatters: 'This is the most dangerous combination for relationship stagnation. Nothing ever gets resolved because nothing ever gets raised.',
      expertAttribution: 'Levine: Double avoidance = the "island" living alone on their island. Gottman: This couple looks peaceful but is slowly dying from emotional neglect.',
      technique: 'Structured check-ins: Once a week, use Gottman\'s "State of the Union" format. Written prompts help bypass the avoidance of both attachment and conflict.',
    },
    fearful_avoidant_competing: {
      meaning: `${name} oscillates between aggressive pursuit and complete withdrawal during conflict — sometimes within the same argument.`,
      whyItMatters: 'The partner never knows which version they\'re getting. This unpredictability is itself destabilizing for the relationship.',
      expertAttribution: 'Johnson: The fearful-avoidant in competition mode is fighting from a place of terror, not strength. The aggression is armor over intense vulnerability.',
      technique: 'When the aggression appears, label the underlying emotion: "It seems like something really important is at stake for you right now." This validates without engaging the aggression.',
    },
  };

  const key = `${attachStyle}_${conflictStyle}`;
  return patterns[key] || null;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight: Shame × Differentiation
// ─────────────────────────────────────────────────────────────

function _getShameVulnerabilityInsight(shameData, diffData, name) {
  const highShame = (shameData.shameTriggers || 0) > 55;
  const lowResilience = (shameData.resilienceScore || 0) < 45;
  const lowDiff = (diffData.overallScore || 0) < 50;
  const highDiff = (diffData.overallScore || 0) >= 65;

  if (highShame && lowDiff) {
    return {
      meaning: `${name} has high shame sensitivity AND low differentiation. This means their partner's reactions directly determine their sense of self-worth. Criticism doesn't just hurt — it annihilates.`,
      whyItMatters: 'This combination creates maximum emotional reactivity. Every conflict becomes an identity crisis.',
      expertAttribution: 'Brown (Shame) + Finlayson-Fife (Differentiation): When your self-worth is fused with your partner\'s opinion of you, and shame is your default response to disapproval, you have zero emotional ground to stand on during conflict.',
      technique: 'Build differentiation FIRST — develop an internal sense of worth that doesn\'t depend on your partner\'s current mood. Daily practice: "My worth is not determined by my partner\'s reaction." Then tackle shame with Brown\'s SFD technique.',
    };
  }

  if (highShame && highDiff) {
    return {
      meaning: `${name} experiences shame but has strong differentiation — they can feel the shame without being consumed by it. This is shame resilience in action.`,
      whyItMatters: 'This person has done significant inner work. They feel the pain but don\'t lose themselves in it.',
      expertAttribution: 'Brown: This IS shame resilience — recognizing shame, speaking about it, and not letting it define you. Finlayson-Fife: Differentiation is the container that holds shame without being shattered by it.',
      technique: 'Continue strengthening this foundation. When shame appears, practice naming it out loud: "I\'m feeling shame right now." The differentiation gives them the ground to stand on while they process it.',
    };
  }

  if (lowResilience && lowDiff) {
    return {
      meaning: `${name} has both low shame resilience and low differentiation — the double vulnerability. They're likely to either collapse (accommodate everything) or armor up completely (withdraw/attack).`,
      whyItMatters: 'This is the profile most at risk for relationship-damaging reactive behavior. The person isn\'t "difficult" — they\'re terrified.',
      expertAttribution: 'Brown + Bowen: Low resilience + low differentiation = someone operating from survival brain in most relationship interactions. The first priority is building safety, not skills.',
      technique: 'Individual therapy recommended. In the relationship: create explicit safety agreements — "We will not use past mistakes as weapons. We will take breaks when flooding. We will always come back." (Tatkin: Couple Bubble agreements)',
    };
  }

  return null;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight: Tactical Empathy × Conflict Style
// ─────────────────────────────────────────────────────────────

function _getTacticalEmpathyConflictInsight(empathyData, conflictData, name) {
  const highEmpathy = (empathyData.overall || 0) >= 65;
  const lowEmpathy = (empathyData.overall || 0) < 40;
  const style = conflictData.primary;

  if (highEmpathy && style === 'competing') {
    return {
      meaning: `${name} has high empathy paired with a competing conflict style — they understand exactly what their partner feels but still push for their own outcome. This can feel manipulative to the partner.`,
      whyItMatters: 'Empathy without cooperation is tactical manipulation. The partner feels "seen but not heard."',
      expertAttribution: 'Voss: Tactical empathy must serve connection, not control. When empathy is used to WIN rather than UNDERSTAND, it becomes a weapon disguised as compassion.',
      technique: `${name}: Ask yourself before every conflict — "Am I using my understanding of their feelings to help US, or to help ME win?" Redirect empathy toward collaboration: "I can see this is important to you because [label]. How can we solve this together?"`,
    };
  }

  if (lowEmpathy && style === 'competing') {
    return {
      meaning: `${name} pushes hard for outcomes without understanding their partner's emotional experience. Conflicts feel steamrolling to the other person.`,
      whyItMatters: 'Low empathy + high assertiveness = the partner feels bulldozed. They stop bringing up issues, which leads to emotional disengagement (Gottman).',
      expertAttribution: 'Voss: "Negotiation is not about winning. It\'s about gathering information and building rapport." Gottman: Accepting influence from your partner is one of the strongest predictors of relationship success.',
      technique: 'Before stating your position, summarize your partner\'s position until they say "That\'s right" (Voss). This single skill will transform your conflicts from battles into conversations.',
    };
  }

  if (lowEmpathy && style === 'avoiding') {
    return {
      meaning: `${name} neither engages with conflict NOR with their partner's emotions. This creates a profound sense of being alone in the relationship for the other person.`,
      whyItMatters: 'Johnson: The most damaging relational experience is feeling like your partner doesn\'t care enough to even try to understand you. Avoidance + low empathy = emotional abandonment.',
      expertAttribution: 'Johnson (EFT): This is the withdrawer who not only leaves the room but leaves the emotional building entirely. Gottman: This combination predicts the highest levels of relationship dissatisfaction in the OTHER partner.',
      technique: 'Start with ONE empathy practice: Each evening, ask "What was your day like?" Then mirror one thing back: "It sounds like [x] was really hard." Don\'t fix. Don\'t advise. Just reflect. Build the muscle.',
    };
  }

  if (highEmpathy && style === 'accommodating') {
    return {
      meaning: `${name} deeply understands their partner's needs AND habitually prioritizes them over their own. This is self-abandonment disguised as empathy.`,
      whyItMatters: 'Finlayson-Fife: This person confuses self-sacrifice with love. They understand their partner perfectly but have no relationship with their OWN needs.',
      expertAttribution: 'Brown: People-pleasing is not generosity — it\'s armor. Finlayson-Fife: Chronic accommodation destroys desire because there\'s no "self" to desire. The partner eventually loses respect.',
      technique: `${name}: Your empathy is real. Now apply it to YOURSELF. What do YOU need in this situation? Practice one "I need" statement per day. Your partner doesn't need you to disappear — they need you to show up.`,
    };
  }

  return null;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight: Attachment × Shame
// ─────────────────────────────────────────────────────────────

function _getAttachmentShameInsight(attachment, shame, name) {
  const style = attachment.style;
  const highShame = (shame.shameTriggers || 0) > 55;
  const primaryArmor = shame.primaryArmor;

  if (!highShame) return null; // Only generate insights for elevated shame

  const patterns = {
    anxious: {
      meaning: `${name}'s anxious attachment is intensified by shame. When their partner pulls away, it doesn't just trigger anxiety — it triggers "I'm not worthy of love." This makes their protest behaviors more desperate.`,
      whyItMatters: 'Shame turns attachment anxiety from "Are you there?" to "I must not deserve you being there." The cascade: distance → shame → protest → more distance → more shame.',
      expertAttribution: 'Johnson: The anxious partner\'s raw spot is "Am I enough?" Brown: Shame says "No." Together, they create the most intense pursuing behavior — not from neediness, but from existential terror.',
      technique: 'When the pursuit impulse hits, pause and check for shame first. Ask: "Am I reaching because I need connection, or because I feel unworthy?" Use Brown\'s SFD: "The story I\'m telling myself is that I\'m not enough for you."',
    },
    avoidant: {
      meaning: `${name}'s avoidance is driven by shame. They don't withdraw because they don't care — they withdraw because engagement risks exposure of the parts they're most ashamed of.`,
      whyItMatters: 'This rewrites the avoidant narrative entirely. What looks like "doesn\'t care" is actually "cares too much and is terrified of being seen."',
      expertAttribution: 'Brown: Shame drives armor. The avoidant\'s withdrawal IS their armor — it protects them from the vulnerability of being truly known. Johnson: Under every wall is a tender spot.',
      technique: 'The partner should NOT chase when they withdraw. Instead, create safety for return: "I see you need space. I\'m here when you\'re ready. I\'m not going anywhere." Let the consistency erode the shame wall.',
    },
    fearful_avoidant: {
      meaning: `${name} carries the most complex shame pattern: they feel unworthy of love AND afraid of it. Shame fuels both the reaching AND the retreating.`,
      whyItMatters: 'This is the deepest layer of the fearful-avoidant pattern. Every push-pull cycle has shame at its core: "I want you but I don\'t deserve you, and if you knew the real me, you\'d leave."',
      expertAttribution: 'Brown: This is shame in its most pervasive form — it has corrupted the entire attachment system. Johnson: Healing requires accessing the primary emotion (worthlessness fear) beneath both the pursuit and the withdrawal.',
      technique: 'Individual therapy strongly recommended alongside couples work. In the relationship: Build micro-moments of vulnerability — small truths shared safely. Each one that doesn\'t result in rejection rewrites the shame narrative.',
    },
    secure: {
      meaning: `${name} has secure attachment but elevated shame. Their security may be tested under extreme stress when shame activates and temporarily disrupts their normally healthy patterns.`,
      whyItMatters: 'Even secure individuals have shame triggers. Under enough stress, shame can cause a temporarily insecure response — unusual withdrawal, uncharacteristic criticism, or sudden vulnerability collapse.',
      expertAttribution: 'Brown: No one is immune to shame. Even securely attached individuals carry shame in specific domains (body, career, parenting). Knowing WHERE their shame lives helps predict WHEN their security might falter.',
      technique: `Map ${name}'s specific shame triggers: Is it about competence? Appearance? Being a good partner? When those domains are activated, extra care is needed.`,
    },
  };

  return patterns[style] || null;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight: Human Needs × Attachment
// ─────────────────────────────────────────────────────────────

function _getHumanNeedsAttachmentInsight(attachStyle, topNeeds, name) {
  if (!topNeeds || !topNeeds.length) return null;

  const primaryNeed = topNeeds[0];

  const map = {
    anxious_certainty: {
      meaning: `${name} is driven by both anxious attachment AND certainty needs — a double dose of "I need to know everything is okay." They may seek constant reassurance about BOTH the relationship AND life logistics.`,
      whyItMatters: 'Robbins: When certainty is the top need AND the attachment system is anxious, unpredictability in any domain feels threatening to the relationship.',
      expertAttribution: 'Robbins (6 Human Needs) + Levine (Attached): This person\'s nervous system has one volume setting: "Am I safe?" Address safety comprehensively — emotional AND practical.',
      technique: 'Create predictability rituals: same morning greeting, regular check-ins, shared calendar, weekly relationship reviews. The structure calms both the attachment system and the certainty need.',
    },
    anxious_connection: {
      meaning: `${name}'s #1 need AND attachment style both drive toward closeness. This is the most intensely connection-seeking profile in our system.`,
      whyItMatters: 'The risk: this person may sacrifice everything else — independence, boundaries, self-respect — for the sake of connection. They need to learn that the deepest connection comes from two whole people.',
      expertAttribution: 'Robbins: Connection-driven + anxious attachment = someone who fills ALL their needs through the relationship. Finlayson-Fife: This is fusion, not love.',
      technique: 'Build connection OUTSIDE the relationship — friendships, community, purpose. Diversify the connection portfolio. This actually deepens the romantic connection by reducing its pressure.',
    },
    avoidant_significance: {
      meaning: `${name} needs to feel uniquely valued (significance) but distances from the very relationships where significance lives. They may seek recognition through achievement rather than intimacy.`,
      whyItMatters: 'Robbins: Significance through achievement works in career but fails in relationships. The avoidant partner gets praise at work and withdrawal at home.',
      expertAttribution: 'Robbins + Levine: This person needs to learn that being significant to their partner doesn\'t require vulnerability — but receiving that significance fully DOES.',
      technique: 'Partner should express significance through specific, achievement-oriented appreciation: "The way you handle [x] is remarkable. No one else could do that." This meets the need in the avoidant\'s comfort zone.',
    },
    avoidant_variety: {
      meaning: `${name} craves novelty AND distances from deep emotional connection. The risk: they may seek variety OUTSIDE the relationship rather than deepening variety WITHIN it.`,
      whyItMatters: 'Perel: This profile is the most at-risk for seeking excitement through emotional affairs, new relationships, or chronic dissatisfaction with "boring" stability.',
      expertAttribution: 'Perel + Levine: Desire needs distance AND novelty. The avoidant partner has distance built in — they need to learn to create novelty within the relationship rather than seeking it outside.',
      technique: 'Channel variety into shared adventures: new restaurants, travel, classes, challenges. The avoidant gets novelty without needing to leave; the relationship gets the energy.',
    },
  };

  const key = `${attachStyle}_${primaryNeed}`;
  return map[key] || null;
}


// ─────────────────────────────────────────────────────────────
// Cross-insight: Desire × Differentiation (Perel-Fife axis)
// ─────────────────────────────────────────────────────────────

function _getDesireDifferentiationInsight(desire, diff, name) {
  const lowDesire = (desire.overall || 0) < 40;
  const highDesire = (desire.overall || 0) >= 65;
  const lowDiff = (diff.overallScore || 0) < 45;
  const highDiff = (diff.overallScore || 0) >= 65;

  if (lowDesire && lowDiff) {
    return {
      meaning: `${name} has low desire AND low differentiation — Perel and Finlayson-Fife would both point to the same root cause: you've lost yourself in the relationship, and desire dies without a self to desire FROM.`,
      whyItMatters: 'This is arguably the most important cross-pattern in our entire system. Desire doesn\'t just require attraction — it requires OTHERNESS. When you merge with your partner, there\'s no space for desire.',
      expertAttribution: 'Perel: "Fire needs air. You can\'t desire what you already have, and you can\'t desire when there\'s no \'you\' to do the desiring." Finlayson-Fife: "The quality of your sex life is a function of the quality of your relationship with yourself."',
      technique: 'PRIORITY ONE: Build your individual self back. Not as a relationship strategy — as a human necessity. What did you love before this relationship? What would you pursue if you had no fear of your partner\'s reaction? Start there. Desire follows identity.',
    };
  }

  if (highDesire && highDiff) {
    return {
      meaning: `${name} maintains strong individual identity AND healthy desire. This is the Perel-Fife ideal — a fully differentiated person who brings their complete self to the intimate encounter.`,
      whyItMatters: 'This person has cracked the paradox: they can be deeply connected AND maintain enough separateness for desire to flourish.',
      expertAttribution: 'Perel: "Erotic intelligence requires two separate beings bridging the gap." Finlayson-Fife: "You bring your best self to your relationship when you have a self to bring."',
      technique: 'Continue investing in your individual identity. Share your growth with your partner — let them see you becoming, not just being. This IS the cultivation of long-term desire.',
    };
  }

  if (highDesire && lowDiff) {
    return {
      meaning: `${name} reports high desire but low differentiation — this suggests desire may be anxiety-driven rather than identity-driven. The "desire" might actually be hyperactivation.`,
      whyItMatters: 'Perel distinguishes between genuine erotic desire and anxiety-driven pursuit of connection. If desire exists only because of anxiety about losing the partner, it\'s not sustainable.',
      expertAttribution: 'Perel: True desire comes from a place of fullness, not emptiness. Finlayson-Fife: If your "desire" disappears the moment you feel secure, it was never desire — it was anxiety wearing desire\'s mask.',
      technique: 'Test it: When you feel desire, check — is this wanting or needing? Wanting comes from abundance ("I choose you"). Needing comes from scarcity ("I\'ll die without you"). Build differentiation to shift from need to want.',
    };
  }

  if (lowDesire && highDiff) {
    return {
      meaning: `${name} is well-differentiated but desire has waned. This may be a physiological issue, a novelty issue, or a signal that the relationship has become a partnership without passion.`,
      whyItMatters: 'Since differentiation is strong, the usual Perel prescription (build your self) is already in place. The issue is elsewhere — possibly hormonal, possibly relational boredom, possibly unprocessed resentment.',
      expertAttribution: 'Perel: For differentiated people, low desire is a signal — not a character flaw. Check the body (hormones), check the heart (resentment), check the relationship (novelty).',
      technique: 'Rule out: 1) Hormonal factors (check testosterone, thyroid, cortisol). 2) Suppressed resentment (journal: "What am I angry about that I haven\'t said?"). 3) Novelty deficit (when did you last do something new together?)',
    };
  }

  return null;
}


// ═══════════════════════════════════════════════════════════════
// 3. GENERATE COUPLE TIMELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Generates a temporal view of both partners' assessment trajectories,
 * activity completion, and key relationship events.
 * 
 * NOTE: This function requires database access and is designed to be called
 * with pre-fetched data from the application layer.
 * 
 * @param {Object} data - Pre-fetched timeline data
 * @param {string} data.coupleId - Couple identifier
 * @param {Date|string} data.startDate - Timeline start
 * @param {Date|string} data.endDate - Timeline end
 * @param {Array} data.partner1History - Array of { date, type, score } for partner 1
 * @param {Array} data.partner2History - Array of { date, type, score } for partner 2
 * @param {Array} data.partner1Activities - Array of { date, completed, type }
 * @param {Array} data.partner2Activities - Array of { date, completed, type }
 * @param {Array} data.events - Array of { date, type, description }
 * @param {Object} [options] - { partner1Name, partner2Name }
 * @returns {Object} Comprehensive timeline analysis
 */
function generateCoupleTimeline(data, options = {}) {
  const {
    coupleId,
    startDate,
    endDate,
    partner1History = [],
    partner2History = [],
    partner1Activities = [],
    partner2Activities = [],
    events = [],
  } = data;

  const p1Name = options.partner1Name || 'Partner A';
  const p2Name = options.partner2Name || 'Partner B';

  // ── Score Trajectories ──
  const trajectories = _computeTrajectories(partner1History, partner2History, p1Name, p2Name);

  // ── Activity Completion ──
  const activityComparison = _computeActivityComparison(
    partner1Activities, partner2Activities, p1Name, p2Name
  );

  // ── Key Events ──
  const keyEvents = _categorizeEvents(events);

  // ── Convergence/Divergence Trends ──
  const trends = _computeTrends(partner1History, partner2History, p1Name, p2Name);

  return {
    coupleId,
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    trajectories,
    activityComparison,
    keyEvents,
    trends,
    summary: _buildTimelineSummary(trajectories, activityComparison, keyEvents, trends, p1Name, p2Name),
  };
}

function _computeTrajectories(p1History, p2History, p1Name, p2Name) {
  // Group by assessment type
  const types = new Set([
    ...p1History.map(h => h.type),
    ...p2History.map(h => h.type),
  ]);

  const trajectories = {};

  for (const type of types) {
    const p1Points = p1History
      .filter(h => h.type === type)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const p2Points = p2History
      .filter(h => h.type === type)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate deltas
    const p1Delta = p1Points.length >= 2
      ? _getOverallScore(p1Points[p1Points.length - 1].score, type) - _getOverallScore(p1Points[0].score, type)
      : 0;
    const p2Delta = p2Points.length >= 2
      ? _getOverallScore(p2Points[p2Points.length - 1].score, type) - _getOverallScore(p2Points[0].score, type)
      : 0;

    trajectories[type] = {
      label: formatLabel(type),
      partner1: {
        name: p1Name,
        dataPoints: p1Points,
        delta: p1Delta,
        direction: p1Delta > 5 ? 'improving' : p1Delta < -5 ? 'declining' : 'stable',
      },
      partner2: {
        name: p2Name,
        dataPoints: p2Points,
        delta: p2Delta,
        direction: p2Delta > 5 ? 'improving' : p2Delta < -5 ? 'declining' : 'stable',
      },
      convergence: _assessConvergence(p1Points, p2Points, type),
    };
  }

  return trajectories;
}

/**
 * Extract the primary "overall" score from a scored assessment result
 */
function _getOverallScore(scoreObj, type) {
  if (typeof scoreObj === 'number') return scoreObj;
  if (!scoreObj) return 0;
  // Each scorer returns different keys for "overall"
  return scoreObj.overall
    || scoreObj.overallHealth
    || scoreObj.overallScore
    || scoreObj.scores?.secure
    || 0;
}

function _assessConvergence(p1Points, p2Points, type) {
  if (p1Points.length < 2 || p2Points.length < 2) return 'insufficient_data';

  const earlyGap = Math.abs(
    _getOverallScore(p1Points[0].score, type) - _getOverallScore(p2Points[0].score, type)
  );
  const lateGap = Math.abs(
    _getOverallScore(p1Points[p1Points.length - 1].score, type) -
    _getOverallScore(p2Points[p2Points.length - 1].score, type)
  );

  if (lateGap < earlyGap - 5) return 'converging';
  if (lateGap > earlyGap + 5) return 'diverging';
  return 'parallel';
}

function _computeActivityComparison(p1Activities, p2Activities, p1Name, p2Name) {
  const p1Completed = p1Activities.filter(a => a.completed).length;
  const p2Completed = p2Activities.filter(a => a.completed).length;
  const p1Total = p1Activities.length;
  const p2Total = p2Activities.length;

  const p1Rate = p1Total > 0 ? Math.round((p1Completed / p1Total) * 100) : 0;
  const p2Rate = p2Total > 0 ? Math.round((p2Completed / p2Total) * 100) : 0;

  const engagementGap = Math.abs(p1Rate - p2Rate);

  let engagementInsight;
  if (engagementGap < 15) {
    engagementInsight = 'Both partners are showing similar engagement with activities — a positive sign of mutual investment.';
  } else if (engagementGap < 35) {
    engagementInsight = `There's a moderate engagement gap (${engagementGap}%). ${p1Rate > p2Rate ? p1Name : p2Name} is more actively completing activities. This asymmetry often signals different levels of urgency or hope about the relationship.`;
  } else {
    engagementInsight = `Significant engagement gap (${engagementGap}%). ${p1Rate > p2Rate ? p1Name : p2Name} is doing most of the work. Gottman warns: when one partner over-functions and the other under-functions, resentment builds. This gap itself should be a conversation topic.`;
  }

  // Break down by activity type
  const typeBreakdown = {};
  const allTypes = new Set([
    ...p1Activities.map(a => a.type),
    ...p2Activities.map(a => a.type),
  ]);

  for (const type of allTypes) {
    const p1OfType = p1Activities.filter(a => a.type === type);
    const p2OfType = p2Activities.filter(a => a.type === type);
    typeBreakdown[type] = {
      partner1: {
        completed: p1OfType.filter(a => a.completed).length,
        total: p1OfType.length,
      },
      partner2: {
        completed: p2OfType.filter(a => a.completed).length,
        total: p2OfType.length,
      },
    };
  }

  return {
    partner1: { name: p1Name, completed: p1Completed, total: p1Total, rate: p1Rate },
    partner2: { name: p2Name, completed: p2Completed, total: p2Total, rate: p2Rate },
    engagementGap,
    engagementInsight,
    typeBreakdown,
  };
}

function _categorizeEvents(events) {
  const categories = {
    milestones: [],
    conflicts: [],
    breakthroughs: [],
    external: [],
    other: [],
  };

  for (const event of events) {
    const cat = categories[event.type] || categories.other;
    cat.push({
      date: event.date,
      description: event.description,
      type: event.type,
    });
  }

  // Sort each category chronologically
  for (const cat of Object.values(categories)) {
    cat.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return categories;
}

function _computeTrends(p1History, p2History, p1Name, p2Name) {
  // Group all history by month and compute average gap
  const allDates = [...p1History, ...p2History].map(h => new Date(h.date));
  if (allDates.length < 2) return { trend: 'insufficient_data', details: [] };

  // Bucket by type, compute monthly averages
  const types = new Set([...p1History.map(h => h.type), ...p2History.map(h => h.type)]);
  const trendDetails = [];

  for (const type of types) {
    const p1 = p1History.filter(h => h.type === type).sort((a, b) => new Date(a.date) - new Date(b.date));
    const p2 = p2History.filter(h => h.type === type).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (p1.length < 2 || p2.length < 2) continue;

    const earlyP1 = _getOverallScore(p1[0].score, type);
    const lateP1 = _getOverallScore(p1[p1.length - 1].score, type);
    const earlyP2 = _getOverallScore(p2[0].score, type);
    const lateP2 = _getOverallScore(p2[p2.length - 1].score, type);

    const earlyGap = Math.abs(earlyP1 - earlyP2);
    const lateGap = Math.abs(lateP1 - lateP2);

    trendDetails.push({
      type,
      label: formatLabel(type),
      earlyGap,
      lateGap,
      direction: lateGap < earlyGap - 5 ? 'converging' : lateGap > earlyGap + 5 ? 'diverging' : 'stable',
      partner1Delta: lateP1 - earlyP1,
      partner2Delta: lateP2 - earlyP2,
    });
  }

  const converging = trendDetails.filter(t => t.direction === 'converging').length;
  const diverging = trendDetails.filter(t => t.direction === 'diverging').length;

  let overallTrend = 'mixed';
  if (converging > diverging && converging > 0) overallTrend = 'converging';
  else if (diverging > converging && diverging > 0) overallTrend = 'diverging';
  else if (trendDetails.length > 0 && converging === 0 && diverging === 0) overallTrend = 'stable';

  return { trend: overallTrend, details: trendDetails };
}

function _buildTimelineSummary(trajectories, activityComparison, keyEvents, trends, p1Name, p2Name) {
  const parts = [];

  // Trajectory summary
  const typeKeys = Object.keys(trajectories);
  const improving = typeKeys.filter(k =>
    trajectories[k].partner1.direction === 'improving' || trajectories[k].partner2.direction === 'improving'
  );
  const declining = typeKeys.filter(k =>
    trajectories[k].partner1.direction === 'declining' || trajectories[k].partner2.direction === 'declining'
  );

  if (improving.length > 0) {
    parts.push(`Positive movement in: ${improving.map(k => trajectories[k].label).join(', ')}.`);
  }
  if (declining.length > 0) {
    parts.push(`Areas needing attention: ${declining.map(k => trajectories[k].label).join(', ')}.`);
  }

  // Activity summary
  if (activityComparison.engagementGap > 20) {
    parts.push(activityComparison.engagementInsight);
  }

  // Trend summary
  if (trends.trend === 'converging') {
    parts.push(`Overall trend is convergence — ${p1Name} and ${p2Name} are growing closer in their scores over time. This is a strong positive signal.`);
  } else if (trends.trend === 'diverging') {
    parts.push(`Scores are diverging over time — one partner may be growing while the other stalls or regresses. This warrants direct conversation about what's happening.`);
  }

  // Key events
  const breakthroughs = keyEvents.breakthroughs || [];
  const conflicts = keyEvents.conflicts || [];
  if (breakthroughs.length > 0) {
    parts.push(`${breakthroughs.length} breakthrough moment(s) recorded — these are anchors to revisit during difficult times.`);
  }
  if (conflicts.length > 0) {
    parts.push(`${conflicts.length} conflict event(s) logged — examine whether scores shifted after these.`);
  }

  return parts.join(' ');
}


// ═══════════════════════════════════════════════════════════════
// 4. GENERATE THERAPIST NARRATIVE
// ═══════════════════════════════════════════════════════════════

/**
 * Produces a human-readable clinical summary for therapists, combining
 * couple profile data with recent activity patterns. Includes expert-backed
 * observations and suggested session focus areas.
 *
 * @param {Object} coupleProfile - Output from generateCoupleProfile()
 * @param {Object} recentActivity - Recent engagement data
 * @param {Array} recentActivity.partner1Activities - Recent activities for partner 1
 * @param {Array} recentActivity.partner2Activities - Recent activities for partner 2
 * @param {Array} [recentActivity.recentAssessments] - Any new assessment results
 * @param {string} [recentActivity.partner1Name] - Partner 1 display name
 * @param {string} [recentActivity.partner2Name] - Partner 2 display name
 * @returns {Object} Therapist-facing narrative with sections and focus areas
 */
function generateTherapistNarrative(coupleProfile, recentActivity = {}) {
  const p1Name = recentActivity.partner1Name || coupleProfile.partner1Name || 'Partner A';
  const p2Name = recentActivity.partner2Name || coupleProfile.partner2Name || 'Partner B';

  const sections = [];

  // ── Section 1: Relationship Snapshot ──
  sections.push({
    title: 'Relationship Snapshot',
    content: _buildRelationshipSnapshot(coupleProfile, p1Name, p2Name),
  });

  // ── Section 2: Key Dynamics ──
  sections.push({
    title: 'Key Dynamics & Patterns',
    content: _buildDynamicsSection(coupleProfile, p1Name, p2Name),
  });

  // ── Section 3: Recent Engagement ──
  sections.push({
    title: 'Recent Engagement & Activity',
    content: _buildEngagementSection(recentActivity, p1Name, p2Name),
  });

  // ── Section 4: Expert-Backed Observations ──
  sections.push({
    title: 'Expert-Backed Observations',
    content: _buildExpertObservations(coupleProfile, p1Name, p2Name),
  });

  // ── Section 5: Suggested Session Focus Areas ──
  const focusAreas = _buildSessionFocusAreas(coupleProfile, recentActivity, p1Name, p2Name);

  sections.push({
    title: 'Suggested Session Focus Areas',
    content: focusAreas.map((f, i) => `${i + 1}. **${f.area}** — ${f.rationale}`).join('\n'),
  });

  return {
    generatedAt: new Date().toISOString(),
    coupleId: coupleProfile.coupleId,
    partner1Name: p1Name,
    partner2Name: p2Name,
    sections,
    focusAreas,
    disclaimer: 'This narrative is generated from assessment data and activity patterns. It is intended as a clinical aid, not a diagnosis. Professional judgment should always supersede algorithmic observations.',
  };
}

function _buildRelationshipSnapshot(profile, p1Name, p2Name) {
  const parts = [];

  if (profile.sharedStrengths && profile.sharedStrengths.length > 0) {
    const strengthLabels = profile.sharedStrengths.map(s => s.area || s.label || s).slice(0, 3);
    parts.push(`Shared strengths: ${strengthLabels.join(', ')}. These are the foundation this couple can build on.`);
  }

  if (profile.growthEdges && profile.growthEdges.length > 0) {
    const edgeLabels = profile.growthEdges.map(e => e.area || e.label || e).slice(0, 3);
    parts.push(`Primary growth edges: ${edgeLabels.join(', ')}. These represent the highest-leverage areas for therapeutic intervention.`);
  }

  if (profile.attachmentDynamic) {
    const ad = profile.attachmentDynamic;
    parts.push(`Attachment dynamic: ${ad.label || ad.classification || 'unclassified'}. ${ad.insight || ''}`);
  }

  return parts.join('\n\n') || 'Insufficient profile data for a full snapshot.';
}

function _buildDynamicsSection(profile, p1Name, p2Name) {
  const parts = [];

  if (profile.conflictDynamic) {
    const cd = profile.conflictDynamic;
    parts.push(`**Conflict pattern:** ${cd.classification || cd.label || 'unclassified'}. ${cd.insight || ''}`);
  }

  if (profile.loveLanguageDynamic) {
    const ll = profile.loveLanguageDynamic;
    parts.push(`**Love language alignment:** ${ll.mismatchLevel || 'unknown'}. ${ll.insight || ''}`);
  }

  if (profile.soundRelationshipHouse) {
    const srh = profile.soundRelationshipHouse;
    if (srh.horsemen && srh.horsemen.length > 0) {
      parts.push(`**Gottman horsemen present:** ${srh.horsemen.map(h => h.name || h).join(', ')}. These are corrosive patterns that predict relationship failure at 93% accuracy per Gottman's research.`);
    }
  }

  return parts.join('\n\n') || 'No dynamic patterns available yet.';
}

function _buildEngagementSection(recentActivity, p1Name, p2Name) {
  const p1Acts = recentActivity.partner1Activities || [];
  const p2Acts = recentActivity.partner2Activities || [];

  if (p1Acts.length === 0 && p2Acts.length === 0) {
    return 'No recent activity data available. Consider discussing engagement barriers in session.';
  }

  const p1Completed = p1Acts.filter(a => a.completed).length;
  const p2Completed = p2Acts.filter(a => a.completed).length;
  const parts = [];

  parts.push(`${p1Name}: ${p1Completed}/${p1Acts.length} activities completed. ${p2Name}: ${p2Completed}/${p2Acts.length} activities completed.`);

  const gap = Math.abs(p1Completed - p2Completed);
  if (gap > 3) {
    const more = p1Completed > p2Completed ? p1Name : p2Name;
    const less = p1Completed > p2Completed ? p2Name : p1Name;
    parts.push(`Notable engagement asymmetry: ${more} is significantly more active. Per Gottman, asymmetric effort often correlates with pursuer-distancer dynamics. Explore whether ${less}'s lower engagement reflects avoidance, hopelessness, or simply a different processing style.`);
  }

  // Check for recent assessments
  const recentAssessments = recentActivity.recentAssessments || [];
  if (recentAssessments.length > 0) {
    parts.push(`${recentAssessments.length} new assessment(s) completed since last session — review for score changes.`);
  }

  return parts.join('\n\n');
}

function _buildExpertObservations(profile, p1Name, p2Name) {
  const observations = [];

  // Gottman-based
  if (profile.soundRelationshipHouse) {
    const ratio = profile.soundRelationshipHouse.positiveToNegativeRatio;
    if (ratio !== undefined && ratio < 5) {
      observations.push(`**Gottman ratio alert:** Positive-to-negative interaction ratio estimated at ${ratio}:1 (healthy threshold is 5:1). This couple needs deliberate positive interaction flooding — not as performance, but as genuine reconnection.`);
    }
  }

  // Attachment-based (Johnson/Levine)
  if (profile.attachmentDynamic?.classification === 'anxious-avoidant') {
    observations.push(`**Johnson (EFT):** Classic anxious-avoidant trap detected. The pursue-withdraw cycle is likely the presenting problem beneath most surface conflicts. EFT Stage 2 work (restructuring interactions) is indicated — help each partner see the cycle as the enemy, not each other.`);
  }

  // Perel-based
  if (profile.desireDynamic) {
    const dd = profile.desireDynamic;
    if (dd.bothLow) {
      observations.push(`**Perel:** Both partners report low desire. Explore whether safety has extinguished eroticism. Perel's core thesis: "Love enjoys knowing everything about you; desire needs mystery." Consider prescribing structured novelty and individual identity work.`);
    }
  }

  // Finlayson-Fife differentiation
  if (profile.differentiationGap && profile.differentiationGap > 20) {
    observations.push(`**Finlayson-Fife:** Significant differentiation gap (${profile.differentiationGap} points). The higher-differentiated partner likely feels constrained; the lower-differentiated partner likely feels abandoned when the other individuates. Address this gap directly — it underlies many surface-level complaints.`);
  }

  // Brené Brown vulnerability
  if (profile.shamePatterns) {
    const sp = profile.shamePatterns;
    if (sp.bothHighShame) {
      observations.push(`**Brown:** Both partners carry high shame loads. Vulnerability is the birthplace of connection (Brown), but shame makes vulnerability feel life-threatening. Before asking this couple to "be more vulnerable," address the shame shields first. What would each partner need to feel safe enough to be seen?`);
    }
  }

  return observations.join('\n\n') || 'Deeper expert-backed observations require additional assessment data.';
}

function _buildSessionFocusAreas(profile, recentActivity, p1Name, p2Name) {
  const areas = [];

  // Priority 1: Safety issues (Gottman horsemen)
  if (profile.soundRelationshipHouse?.horsemen?.length > 0) {
    areas.push({
      area: 'Corrosive Pattern Intervention',
      rationale: `Active Gottman horsemen detected (${profile.soundRelationshipHouse.horsemen.map(h => h.name || h).join(', ')}). These patterns predict relationship dissolution and should be addressed before deeper work can hold.`,
      priority: 'high',
      expertBasis: 'Gottman',
    });
  }

  // Priority 2: Attachment cycle
  if (profile.attachmentDynamic?.classification === 'anxious-avoidant') {
    areas.push({
      area: 'Identify and De-Escalate the Pursue-Withdraw Cycle',
      rationale: `This couple is caught in the classic anxious-avoidant dance. Name the cycle explicitly in session and help both partners see their role in maintaining it.`,
      priority: 'high',
      expertBasis: 'Johnson (EFT) / Levine',
    });
  }

  // Priority 3: Engagement asymmetry
  const p1Acts = recentActivity.partner1Activities || [];
  const p2Acts = recentActivity.partner2Activities || [];
  const p1Rate = p1Acts.length > 0 ? p1Acts.filter(a => a.completed).length / p1Acts.length : 0;
  const p2Rate = p2Acts.length > 0 ? p2Acts.filter(a => a.completed).length / p2Acts.length : 0;
  if (Math.abs(p1Rate - p2Rate) > 0.3) {
    const less = p1Rate < p2Rate ? p1Name : p2Name;
    areas.push({
      area: 'Engagement Asymmetry',
      rationale: `${less} is significantly less engaged with between-session activities. Explore barriers without blame — is it avoidance, overwhelm, or a different way of processing?`,
      priority: 'medium',
      expertBasis: 'Gottman / General',
    });
  }

  // Priority 4: Love language mismatch
  if (profile.loveLanguageDynamic?.mismatchLevel === 'high') {
    areas.push({
      area: 'Love Language Translation',
      rationale: `High love language mismatch — each partner is likely expressing love in ways the other doesn't register. Teach explicit translation: "When I do X, I'm saying I love you in my language."`,
      priority: 'medium',
      expertBasis: 'Chapman / Gottman',
    });
  }

  // Priority 5: Differentiation work
  if (profile.differentiationGap && profile.differentiationGap > 20) {
    areas.push({
      area: 'Differentiation & Self-Confrontation',
      rationale: `Significant differentiation gap. The lower-differentiated partner needs support in building individual identity without it feeling like abandonment of the relationship.`,
      priority: 'medium',
      expertBasis: 'Finlayson-Fife / Perel',
    });
  }

  // Priority 6: Shared strengths reinforcement
  if (profile.sharedStrengths?.length > 0) {
    areas.push({
      area: 'Strengths Reinforcement',
      rationale: `This couple has real strengths (${profile.sharedStrengths.slice(0, 2).map(s => s.area || s.label || s).join(', ')}). Acknowledge these in session — couples in distress often forget what works. Anchoring in strengths builds resilience for harder work.`,
      priority: 'standard',
      expertBasis: 'Gottman / General',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, standard: 2 };
  areas.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  return areas;
}


// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  generateCoupleProfile,
  generateCrossAssessmentInsights,
  generateCoupleTimeline,
  generateTherapistNarrative,
};
