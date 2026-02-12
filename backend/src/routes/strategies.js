const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');
const techniques = require('../data/techniques');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: Defensive JSON Parser (handles Prisma double-serialization)
// ═══════════════════════════════════════════════════════════════════════════

function safeParse(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      // Handle double-serialization: '"{\"key\":\"val\"}"'
      if (typeof parsed === 'string') {
        try { return JSON.parse(parsed); } catch {
          logger.info('safeParse: inner string not JSON, returning as-is', { snippet: val.substring(0, 80) });
          return parsed;
        }
      }
      return parsed;
    } catch {
      logger.info('safeParse: value not valid JSON, returning raw', { type: typeof val, snippet: val.substring(0, 80) });
      return val;
    }
  }
  return val;
}

function safeGet(obj, ...paths) {
  for (const path of paths) {
    const keys = path.split('.');
    let val = obj;
    for (const k of keys) {
      if (val === null || val === undefined) { val = null; break; }
      val = typeof val === 'object' ? val[k] : null;
    }
    if (val !== null && val !== undefined) return val;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED PROFILE BUILDER
// Extracts EVERYTHING from assessments into a unified relationship profile
// ═══════════════════════════════════════════════════════════════════════════

function generateRelationshipProfile(assessments) {
  const profile = {
    attachmentStyle: null,        // secure | anxious | avoidant | fearful_avoidant
    loveLanguage: null,           // words_of_affirmation | acts_of_service | quality_time | physical_touch | receiving_gifts
    loveLanguageSecondary: null,  // secondary love language
    cyclePosition: null,          // pursuer | withdrawer | balanced
    dominantHorseman: null,       // criticism | contempt | defensiveness | stonewalling | none
    horsemenScores: null,         // { criticism: X, contempt: X, defensiveness: X, stonewalling: X }
    friendshipScore: null,        // 0-100
    conflictScore: null,          // 0-100
    meaningScore: null,           // 0-100
    communicationScore: null,     // 0-100
    mbtiType: null,               // e.g. "INFJ"
    personalityDimensions: null,  // { extraversion, agreeableness, etc. }
    focusAreas: [],               // ordered by priority
    strengths: [],                // areas scoring well
  };

  if (!assessments || assessments.length === 0) return profile;

  // Group by type, keeping most recent
  const byType = {};
  for (const a of assessments) {
    const type = a.type;
    if (!byType[type] || new Date(a.completedAt) > new Date(byType[type].completedAt)) {
      byType[type] = a;
    }
  }

  // === ATTACHMENT STYLE ===
  if (byType.attachment) {
    const score = safeParse(byType.attachment.score);
    const result = safeParse(byType.attachment.result);
    profile.attachmentStyle = safeGet(score, 'style', 'attachmentStyle', 'primary') ||
                              safeGet(result, 'style', 'attachmentStyle', 'primary') ||
                              safeGet(score, 'result.style') ||
                              null;
    // Normalize + validate against known enum
    if (profile.attachmentStyle) {
      profile.attachmentStyle = profile.attachmentStyle.toLowerCase().replace(/[-\s]/g, '_');
      const styleMap = { 'anxious_preoccupied': 'anxious', 'dismissive_avoidant': 'avoidant', 'fearful': 'fearful_avoidant', 'disorganized': 'fearful_avoidant' };
      if (styleMap[profile.attachmentStyle]) profile.attachmentStyle = styleMap[profile.attachmentStyle];
      const validStyles = ['secure', 'anxious', 'avoidant', 'fearful_avoidant'];
      if (!validStyles.includes(profile.attachmentStyle)) {
        logger.info('generateRelationshipProfile: unknown attachment style, defaulting to null', { raw: profile.attachmentStyle });
        profile.attachmentStyle = null;
      }
    }
  }

  // === LOVE LANGUAGE ===
  if (byType.love_language) {
    const score = safeParse(byType.love_language.score);
    const result = safeParse(byType.love_language.result);
    profile.loveLanguage = safeGet(score, 'primary', 'topLanguage', 'language') ||
                           safeGet(result, 'primary', 'topLanguage', 'language') ||
                           null;
    profile.loveLanguageSecondary = safeGet(score, 'secondary', 'secondLanguage') ||
                                    safeGet(result, 'secondary', 'secondLanguage') ||
                                    null;
    // Normalize + validate
    const validLanguages = ['words_of_affirmation', 'acts_of_service', 'quality_time', 'physical_touch', 'receiving_gifts'];
    if (profile.loveLanguage) {
      profile.loveLanguage = profile.loveLanguage.toLowerCase().replace(/[\s-]/g, '_');
      if (!validLanguages.includes(profile.loveLanguage)) {
        logger.info('generateRelationshipProfile: unknown love language, defaulting to null', { raw: profile.loveLanguage });
        profile.loveLanguage = null;
      }
    }
    if (profile.loveLanguageSecondary) {
      profile.loveLanguageSecondary = profile.loveLanguageSecondary.toLowerCase().replace(/[\s-]/g, '_');
      if (!validLanguages.includes(profile.loveLanguageSecondary)) {
        profile.loveLanguageSecondary = null;
      }
    }
  }

  // === GOTTMAN (Friendship, Conflict, Meaning, Horsemen) ===
  if (byType.gottman) {
    const score = safeParse(byType.gottman.score);
    if (score) {
      profile.friendshipScore = safeGet(score, 'friendship', 'friendshipAndIntimacy', 'friendship_score');
      profile.conflictScore = safeGet(score, 'conflict', 'conflictManagement', 'conflict_score');
      profile.meaningScore = safeGet(score, 'meaning', 'sharedMeaning', 'meaning_score');

      // Horsemen extraction
      const horsemen = safeGet(score, 'horsemen', 'fourHorsemen');
      if (horsemen && typeof horsemen === 'object') {
        profile.horsemenScores = {
          criticism: safeGet(horsemen, 'criticism') ?? null,
          contempt: safeGet(horsemen, 'contempt') ?? null,
          defensiveness: safeGet(horsemen, 'defensiveness') ?? null,
          stonewalling: safeGet(horsemen, 'stonewalling') ?? null,
        };
        // Lower score = worse (more of the horseman present)
        const entries = Object.entries(profile.horsemenScores).filter(([, v]) => v !== null);
        if (entries.length > 0) {
          const worst = entries.sort(([, a], [, b]) => a - b)[0];
          if (worst[1] < 60) profile.dominantHorseman = worst[0];
        }
      }
    }
  }

  // === EFT / Cycle Position ===
  if (byType.eft) {
    const score = safeParse(byType.eft.score);
    if (score) {
      profile.cyclePosition = safeGet(score, 'cyclePosition', 'cycle_position', 'position');
      if (!profile.cyclePosition) {
        const pursue = safeGet(score, 'pursue', 'pursuing', 'pursuer_score');
        const withdraw = safeGet(score, 'withdraw', 'withdrawing', 'withdrawer_score');
        if (pursue != null && withdraw != null) {
          profile.cyclePosition = Number(pursue) > Number(withdraw) ? 'pursuer' : 'withdrawer';
        }
      }
    }
  }

  // Derive cycle position from attachment if EFT not available
  if (!profile.cyclePosition && profile.attachmentStyle) {
    const cycleMap = { anxious: 'pursuer', avoidant: 'withdrawer', fearful_avoidant: 'pursuer', secure: 'balanced' };
    profile.cyclePosition = cycleMap[profile.attachmentStyle] || null;
  }

  // === PREP / Communication ===
  if (byType.prep) {
    const score = safeParse(byType.prep.score);
    if (score) {
      profile.communicationScore = safeGet(score, 'communication', 'communicationScore', 'overall');
    }
  }

  // === MBTI / Personality ===
  if (byType.personality || byType.mbti) {
    const a = byType.personality || byType.mbti;
    const score = safeParse(a.score);
    const result = safeParse(a.result);
    profile.mbtiType = safeGet(score, 'type', 'mbti', 'personalityType') ||
                       safeGet(result, 'type', 'mbti', 'personalityType') || null;
    profile.personalityDimensions = safeGet(score, 'dimensions', 'traits') ||
                                    safeGet(result, 'dimensions', 'traits') || null;
  }

  // === BUILD FOCUS AREAS (sorted by priority — lowest score first) ===
  const scoreChecks = [
    { area: 'friendship', score: profile.friendshipScore },
    { area: 'conflict', score: profile.conflictScore },
    { area: 'meaning', score: profile.meaningScore },
    { area: 'communication', score: profile.communicationScore },
  ];

  const weakAreas = scoreChecks
    .filter(s => s.score !== null && Number(s.score) < 70)
    .sort((a, b) => Number(a.score) - Number(b.score));

  profile.focusAreas = weakAreas.map(s => s.area);

  // Add attachment as a focus area if insecure
  if (profile.attachmentStyle && profile.attachmentStyle !== 'secure') {
    if (!profile.focusAreas.includes('attachment')) {
      profile.focusAreas.unshift('attachment');
    }
  }

  // Build strengths
  const strongAreas = scoreChecks
    .filter(s => s.score !== null && Number(s.score) >= 70)
    .sort((a, b) => Number(b.score) - Number(a.score));
  profile.strengths = strongAreas.map(s => s.area);

  return profile;
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART TECHNIQUE SELECTOR
// Profile-driven, difficulty-progressive, variety-ensuring selection
// ═══════════════════════════════════════════════════════════════════════════

function scoreTechnique(technique, profile, week) {
  let score = 0;
  const tp = technique.targetProfiles;
  if (!tp) return 0;

  // Week specificity bonus (only for exact week matches — 'any' is neutral since everything passes filter)
  if (Array.isArray(technique.week) && technique.week.includes(week)) {
    score += 12; // Week-specific techniques get priority over 'any'
  }

  // Difficulty appropriateness — prefer techniques at current difficulty level
  const idealDifficulty = Math.min(5, Math.ceil(week * 0.85));
  const diffDelta = Math.abs(technique.difficulty - idealDifficulty);
  score += Math.max(0, 10 - diffDelta * 3);

  // Profile matching
  if (tp.anyProfile) score += 2;

  if (profile.attachmentStyle && tp.attachmentStyles?.includes(profile.attachmentStyle)) {
    score += 12;
  }

  if (profile.loveLanguage && tp.loveLanguages?.includes(profile.loveLanguage)) {
    score += 10;
  }

  if (profile.loveLanguageSecondary && tp.loveLanguages?.includes(profile.loveLanguageSecondary)) {
    score += 5;
  }

  if (profile.cyclePosition && tp.cyclePositions?.includes(profile.cyclePosition)) {
    score += 10;
  }

  if (profile.dominantHorseman && tp.horsemen?.includes(profile.dominantHorseman)) {
    score += 14;
  }

  // Focus area matching (cap at 2 matches to prevent over-weighting)
  if (profile.focusAreas?.length > 0 && tp.focusAreas?.length > 0) {
    let focusMatches = 0;
    for (const fa of profile.focusAreas) {
      if (tp.focusAreas.includes(fa)) {
        focusMatches++;
        if (focusMatches >= 2) break;
      }
    }
    score += focusMatches * 8;
  }

  // Cap total score to prevent extreme outliers
  return Math.min(score, 60);
}

function isWeekAppropriate(technique, week) {
  if (technique.week === 'any') return true;
  if (Array.isArray(technique.week)) return technique.week.includes(week);
  return technique.week === week;
}

function isDifficultyAppropriate(technique, week) {
  const maxDifficulty = Math.min(5, week + 1);
  return technique.difficulty <= maxDifficulty;
}

function selectTechniques(profile, week, count = 5, options = {}) {
  const {
    requiredTypes = [],
    excludeIds = [],
    preferStage = null,
    isMatchup = false,
  } = options;

  // Filter to week-appropriate + difficulty-appropriate techniques
  let candidates = techniques.filter(t => {
    if (!isWeekAppropriate(t, week)) return false;
    if (!isDifficultyAppropriate(t, week)) return false;
    if (excludeIds.includes(t.id)) return false;
    return true;
  });

  // Fallback: if too few candidates, relax filters progressively
  if (candidates.length < count) {
    logger.info('selectTechniques: relaxing week filter', { week, candidatesBefore: candidates.length, needed: count });
    candidates = techniques.filter(t => {
      if (!isDifficultyAppropriate(t, week)) return false;
      if (excludeIds.includes(t.id)) return false;
      return true;
    });
  }
  if (candidates.length < count) {
    logger.info('selectTechniques: relaxing all filters', { week, candidatesBefore: candidates.length, needed: count });
    candidates = techniques.filter(t => !excludeIds.includes(t.id));
  }

  // Score and sort
  let scored = candidates.map(t => ({
    technique: t,
    score: scoreTechnique(t, profile, week) + (preferStage && t.stage === preferStage ? 5 : 0),
  })).sort((a, b) => b.score - a.score);

  const selected = [];
  const usedExperts = {};
  const usedTypes = new Set();

  // First, fulfill required types
  for (const reqType of requiredTypes) {
    const match = scored.find(s =>
      s.technique.type === reqType &&
      !selected.includes(s.technique)
    );
    if (match) {
      selected.push(match.technique);
      usedTypes.add(match.technique.type);
      const experts = match.technique.expert.split('+');
      experts.forEach(e => usedExperts[e] = (usedExperts[e] || 0) + 1);
      scored = scored.filter(s => s !== match);
    }
  }

  // Then fill remaining slots with diversity constraints
  for (const s of scored) {
    if (selected.length >= count) break;
    if (selected.find(sel => sel.id === s.technique.id)) continue;

    // Expert diversity: max 2 techniques from same primary expert per selection
    const primaryExpert = s.technique.expert.split('+')[0];
    if ((usedExperts[primaryExpert] || 0) >= 2) continue;

    // Type diversity: prefer unused types (but don't hard block)
    if (usedTypes.has(s.technique.type) && selected.length < count - 1) {
      // Skip if we haven't used enough diversity yet and still have room
      const unusedTypeAvailable = scored.some(s2 =>
        !usedTypes.has(s2.technique.type) &&
        !selected.find(sel => sel.id === s2.technique.id) &&
        s2.score > s.score * 0.5
      );
      if (unusedTypeAvailable) continue;
    }

    selected.push(s.technique);
    usedTypes.add(s.technique.type);
    const experts = s.technique.expert.split('+');
    experts.forEach(e => usedExperts[e] = (usedExperts[e] || 0) + 1);
  }

  return selected;
}

// Select a love-language-specific connection ritual
function selectConnectionRitual(profile, week) {
  if (!profile.loveLanguage) return null;

  const rituals = techniques.filter(t =>
    t.type === 'connection_ritual' &&
    t.targetProfiles?.loveLanguages?.includes(profile.loveLanguage) &&
    isWeekAppropriate(t, week) &&
    isDifficultyAppropriate(t, week)
  );

  if (rituals.length === 0) {
    // Fallback to any connection ritual
    const fallbacks = techniques.filter(t =>
      t.type === 'connection_ritual' &&
      t.targetProfiles?.anyProfile &&
      isWeekAppropriate(t, week) &&
      isDifficultyAppropriate(t, week)
    );
    return fallbacks[Math.floor(Math.random() * fallbacks.length)] || null;
  }

  return rituals[Math.floor(Math.random() * rituals.length)];
}

// Select horseman-specific antidote
function selectHorsemanAntidote(profile, week) {
  if (!profile.dominantHorseman) return null;

  const antidotes = techniques.filter(t =>
    (t.type === 'horseman_antidote' || t.targetProfiles?.horsemen?.includes(profile.dominantHorseman)) &&
    isWeekAppropriate(t, week) &&
    isDifficultyAppropriate(t, week)
  );

  // Prefer actual horseman_antidote type, then fallback to targeted techniques
  const primary = antidotes.filter(t => t.type === 'horseman_antidote');
  if (primary.length > 0) return primary[Math.floor(Math.random() * primary.length)];
  if (antidotes.length > 0) return antidotes[Math.floor(Math.random() * antidotes.length)];
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSONALIZED INTRODUCTION GENERATOR
// Creates a raw, personal message citing specific experts for the user's profile
// ═══════════════════════════════════════════════════════════════════════════

const weekThemes = {
  1: { name: 'Self-Awareness', stage: 'assess', description: 'seeing your patterns clearly' },
  2: { name: 'Communication', stage: 'learn', description: 'learning to say what you mean without blame' },
  3: { name: 'Emotional Regulation', stage: 'practice', description: 'controlling your reactions instead of letting them control you' },
  4: { name: 'Understanding Patterns', stage: 'practice', description: 'mapping the cycles that keep you stuck' },
  5: { name: 'Connection & Growth', stage: 'practice', description: 'building new rituals and reclaiming who you are' },
  6: { name: 'Integration & Identity', stage: 'transform', description: 'becoming the partner you want to be — permanently' },
};

function generatePersonalizedIntro(profile, week) {
  const theme = weekThemes[week] || weekThemes[1];
  const parts = [];

  // Opening — always specific to their profile
  const attachmentName = {
    anxious: 'anxious', avoidant: 'avoidant', fearful_avoidant: 'fearful-avoidant', secure: 'secure',
  };
  const langName = {
    words_of_affirmation: 'Words of Affirmation', acts_of_service: 'Acts of Service',
    quality_time: 'Quality Time', physical_touch: 'Physical Touch', receiving_gifts: 'Receiving Gifts',
  };
  const cycleName = { pursuer: 'pursuer', withdrawer: 'withdrawer', balanced: 'balanced' };

  // Build the personalized header
  if (profile.attachmentStyle && profile.loveLanguage) {
    parts.push(`Based on your ${attachmentName[profile.attachmentStyle] || profile.attachmentStyle} attachment style and ${langName[profile.loveLanguage] || profile.loveLanguage} love language`);
  } else if (profile.attachmentStyle) {
    parts.push(`Based on your ${attachmentName[profile.attachmentStyle] || profile.attachmentStyle} attachment style`);
  } else if (profile.loveLanguage) {
    parts.push(`Based on your ${langName[profile.loveLanguage] || profile.loveLanguage} love language`);
  } else {
    parts.push('Based on your assessment results');
  }

  // Week theme
  parts[0] += `, this week focuses on ${theme.description}.`;

  // Expert-backed personalization
  const expertInsights = [];

  if (week === 1) {
    if (profile.attachmentStyle === 'anxious') {
      expertInsights.push('Amir Levine\'s research shows that anxious attachment isn\'t a flaw — it\'s a nervous system wired for connection. This week you\'ll learn to SEE your patterns without judging them.');
    } else if (profile.attachmentStyle === 'avoidant') {
      expertInsights.push('Amir Levine found that avoidant attachment often looks like independence, but underneath it\'s a learned strategy to avoid the pain of needing someone. This week, we start by just noticing — no changing yet.');
    } else if (profile.attachmentStyle === 'fearful_avoidant') {
      expertInsights.push('Your fearful-avoidant style means you experience the push-pull of wanting closeness AND fearing it simultaneously. Levine and Johnson both say this is the most complex style — and it\'s absolutely workable. Awareness is your first superpower.');
    } else {
      expertInsights.push('This week is about honest self-observation. Brené Brown says "you can\'t get to courage without walking through vulnerability" — and self-awareness is the first vulnerable step.');
    }
  }

  if (week === 2) {
    if (profile.cyclePosition === 'pursuer') {
      expertInsights.push('As a pursuer, Gottman\'s research says your #1 communication upgrade is the "gentle startup" — expressing needs without attacking character. 96% of conversations end the way they begin.');
    } else if (profile.cyclePosition === 'withdrawer') {
      expertInsights.push('As someone who tends to withdraw, Chris Voss\'s tactical empathy and Gottman\'s research both point to the same skill: staying present 5 minutes longer than your comfort zone allows.');
    } else {
      expertInsights.push('Chris Voss — the FBI\'s top hostage negotiator — says the same skills that de-escalate hostage crises work at the dinner table. This week you learn those skills.');
    }
  }

  if (week === 3) {
    if (profile.dominantHorseman) {
      const horsemanInsight = {
        criticism: 'Your Gottman results show criticism as your default — the antidote is learning to complain without attacking character.',
        contempt: 'Gottman\'s data is clear: contempt is the #1 predictor of divorce. This week\'s antidote — building genuine appreciation — literally rewires which neural pathways fire.',
        defensiveness: 'Defensiveness feels like self-protection but Gottman calls it counter-attack in disguise. This week you\'ll learn the power of accepting the 2% that\'s valid.',
        stonewalling: 'Stonewalling happens when your nervous system is overwhelmed — heart rate over 100 BPM, rational brain offline. This week is about learning to announce breaks instead of disappearing.',
      };
      expertInsights.push(horsemanInsight[profile.dominantHorseman] || '');
    } else {
      expertInsights.push('Gottman measured it: when heart rate exceeds 100 BPM during conflict, your IQ drops 30 points. This week is about building the pause between trigger and response.');
    }
  }

  if (week === 4) {
    expertInsights.push('Sue Johnson (EFT) found that 80% of couples are stuck in the same pursue-withdraw cycle without knowing it. This week, you map YOUR cycle — and once you can see it, you can interrupt it.');
  }

  if (week === 5) {
    if (profile.loveLanguage) {
      expertInsights.push(`Gary Chapman's research shows that ${langName[profile.loveLanguage] || profile.loveLanguage} speakers have specific connection needs. This week you\'ll build rituals that speak directly to your language — and your partner\'s.`);
    }
    expertInsights.push('Esther Perel says desire needs mystery and Tony Robbins says identity needs purpose. This week bridges both — building connection while maintaining the individual self that makes you interesting.');
  }

  if (week === 6) {
    expertInsights.push('Tony Robbins: "Identity is the strongest force in human psychology." This final week isn\'t about doing exercises — it\'s about becoming someone who naturally does these things. The practices become permanent. The person you\'ve been building IS who you are now.');
  }

  return {
    weekNumber: week,
    weekName: `Week ${week}: ${theme.name}`,
    stage: theme.stage,
    personalizedMessage: parts.join(' ') + '\n\n' + expertInsights.filter(Boolean).join(' '),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// POSITIVE LENS — Non-negotiable daily foundation (7 unique per week)
// ═══════════════════════════════════════════════════════════════════════════

const positiveLensByWeek = {
  1: {
    monday: { text: 'Write down 3 specific things your partner did right this weekend — be detailed, not generic. What exactly did they do and how did it make you feel?', why: 'Training your brain to scan for positives instead of negatives. Gottman\'s 5:1 ratio starts with deliberately looking for the good. The more you look, the more you find.', expert: 'gottman' },
    tuesday: { text: 'Send your partner a text RIGHT NOW appreciating something specific they did recently. Not "love you" — something real like "I noticed you [specific action] and it meant a lot."', why: 'Gottman found couples who maintain 5:1 positive-to-negative ratio stay together 94% of the time. One specific text is a deposit in that account.', expert: 'gottman' },
    wednesday: { text: 'Catch yourself in one negative thought about your partner today. Pause. Find what\'s true AND good about them in that exact moment. Write both the negative thought and the reframe.', why: 'You can\'t control your first thought, but you can choose your second. This is the reframe muscle — the foundation of Gottman\'s "positive sentiment override."', expert: 'gottman+robbins' },
    thursday: { text: 'At dinner or before bed, share one thing your partner does that makes your life easier — something you usually take for granted. Say it out loud to them.', why: 'Gratitude spoken is 10x more powerful than gratitude kept inside. Chapman: spoken appreciation is a love deposit regardless of their primary language.', expert: 'gottman+chapman' },
    friday: { text: 'Look back at your week and write down your partner\'s best moment — the time they showed up, even in a small way. If you can\'t find one, look harder.', why: 'Your memory is biased toward negatives — it\'s a survival mechanism that hurts relationships. This exercise corrects the record. Robbins: where focus goes, energy flows.', expert: 'gottman+robbins' },
    saturday: { text: 'Give one genuine, unexpected compliment before noon — not about appearance, about CHARACTER. "I admire your [patience/kindness/determination/humor]."', why: 'Character compliments build deeper connection than surface ones. "You\'re pretty" fades. "I admire your integrity" endures. That\'s the Gottman fondness & admiration system in action.', expert: 'gottman+chapman' },
    sunday: { text: 'Write a 3-sentence "gratitude snapshot" of your partner this week. Then share it with them — read it aloud or text it. Let them hear how you see them.', why: 'Weekly reflection cements the positive lens habit. Sharing it creates a virtuous cycle — expressed appreciation makes both people feel better and want to do more.', expert: 'gottman' },
  },
  2: {
    monday: { text: 'Before any conversation today, mentally note one thing you appreciate about this person. Let that color the interaction before you open your mouth.', why: 'Gottman\'s "positive sentiment override" — when your default view is positive, ambiguous behaviors get charitable interpretations. This 5-second mental shift changes the whole conversation.', expert: 'gottman' },
    tuesday: { text: 'Text your partner a specific memory of when they made you laugh. Not "you\'re funny" — the actual moment. "Remember when you [specific moment]? That still makes me smile."', why: 'Shared humor is one of Gottman\'s strongest repair mechanisms. Recalling it together activates the same bonding chemicals as the original experience.', expert: 'gottman' },
    wednesday: { text: 'Notice one thing your partner does for others — kids, friends, coworkers, strangers — and tell them you noticed. "I saw how you handled [situation] with [person]. That was really kind."', why: 'Watching your partner be good to others reminds you why you chose them. Gottman\'s fondness & admiration: deliberately scanning for strengths rewires your perception.', expert: 'gottman' },
    thursday: { text: 'Replace one criticism with curiosity today. Instead of "Why didn\'t you..." try "What was going on for you when...?" Assume the best intent before assuming the worst.', why: 'Gottman: criticism (attacking character) is the first horseman. Curiosity is its antidote. Same information gathered, completely different emotional impact.', expert: 'gottman+voss' },
    friday: { text: 'Write down: "3 reasons I\'m glad I chose this person." Be specific. Not "they\'re nice" but "they remember my coffee order" or "they stayed up with me when I was sick."', why: 'Deliberate gratitude practice physically changes brain structure — the gratitude regions grow with use. It\'s neuroscience, not wishful thinking.', expert: 'gottman+robbins' },
    saturday: { text: 'Do something small that shows you were paying attention — bring their favorite drink, play a song they mentioned, reference something from a recent conversation. Show you LISTEN.', why: 'Gottman\'s Love Maps: the quality of your relationship depends on how well you know each other\'s world. Small acts of attentiveness prove you\'re still curious.', expert: 'gottman+chapman' },
    sunday: { text: 'Write and share your weekly gratitude snapshot. This week\'s twist: include one way your partner CHALLENGED you to grow, and thank them for it.', why: 'Growth gratitude is the highest form — thanking someone for pushing you, not just pleasing you. It reframes friction as partnership. Perel: the best relationships nurture each other\'s becoming.', expert: 'gottman+perel' },
  },
  3: {
    monday: { text: 'Before reacting to anything your partner says today, take one breath and think: "What\'s the most generous interpretation of what they just said?" Choose that interpretation first.', why: 'Gottman calls this "positive sentiment override." When your default assumption is generous, 90% of minor irritations dissolve before they become conflicts.', expert: 'gottman' },
    tuesday: { text: 'Write a 2-sentence note and put it where your partner will find it — in their jacket, on their steering wheel, next to their toothbrush: "I appreciate [specific thing]. You make my life better by [how]."', why: 'Chapman: for Words of Affirmation speakers, written words carry extra weight because they can be re-read. But surprise notes delight EVERYONE because they prove you were thinking of them when they weren\'t watching.', expert: 'chapman' },
    wednesday: { text: 'Track your positive-to-negative ratio today. Every interaction — mark it + or -. By evening, count. Are you above 5:1? If not, add positives before bed.', why: 'What gets measured gets managed. Gottman\'s 5:1 ratio isn\'t just for conflict — it\'s the DAILY emotional bank balance. Most struggling couples are shocked to find they\'re below 1:1.', expert: 'gottman' },
    thursday: { text: 'Recall a time your partner failed at something and showed resilience. Tell them: "I remember when [challenge happened] and you [how they handled it]. That showed real strength."', why: 'Acknowledging someone\'s resilience is one of the deepest forms of respect. Brown: it says "I see your struggle AND your strength." It builds the kind of trust that survives hard times.', expert: 'brown+gottman' },
    friday: { text: 'Think about your partner\'s love language. Express appreciation TODAY in THEIR language, not yours. Physical touch? Hug them longer. Quality time? Put down the phone for 15 minutes.', why: 'Chapman: most people express love in their OWN language. Translating to theirs takes intentional effort — and it lands 10x harder because they FEEL it instead of just hearing it.', expert: 'chapman' },
    saturday: { text: 'Share one thing that scared you this week — a worry, an insecurity, a vulnerable moment — and thank your partner for being someone you can share it with.', why: 'Brown: vulnerability shared is vulnerability halved. Thanking someone for receiving your vulnerability reinforces the safety cycle — making it easier to be honest next time.', expert: 'brown' },
    sunday: { text: 'Weekly gratitude snapshot time. This week: include one specific way your partner has grown since you\'ve been together. Show them you notice their evolution, not just their current state.', why: 'Acknowledging growth is more powerful than acknowledging traits. It says "I\'m paying attention to your journey." Robbins: progress = happiness. Let them know you see their progress.', expert: 'robbins+gottman' },
  },
};

// Weeks 4-6 cycle patterns from weeks 1-3 with increasing sophistication
function getPositiveLens(week, day) {
  const weekData = positiveLensByWeek[week] || positiveLensByWeek[((week - 1) % 3) + 1];
  return weekData[day] || weekData.monday;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLO WEEK PLAN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateSoloWeekPlan(week, assessments) {
  const profile = generateRelationshipProfile(assessments);
  const intro = generatePersonalizedIntro(profile, week);
  const theme = weekThemes[week] || weekThemes[1];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const baseActivities = {};

  // Layer 1: POSITIVE LENS — non-negotiable, every day
  for (const day of days) {
    const pl = getPositiveLens(week, day);
    baseActivities[day] = [{
      text: pl.text,
      why: pl.why,
      type: 'positive_lens',
      expert: pl.expert,
      duration: '2 min',
    }];
  }

  // Layer 2: SKILL PRACTICE — personalized to profile via technique selector
  const weekStage = theme.stage;
  const requiredTypes = [];

  // Always include horseman antidote if applicable
  if (profile.dominantHorseman) requiredTypes.push('horseman_antidote');

  // Select 7 techniques for the week (one per day, roughly)
  const usedIds = [];
  const weekTechniques = selectTechniques(profile, week, 7, {
    requiredTypes,
    excludeIds: usedIds,
    preferStage: weekStage,
  });

  // Distribute techniques across the week
  const skillDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  weekTechniques.forEach((t, i) => {
    const day = skillDays[i % skillDays.length];
    baseActivities[day].push({
      text: t.text,
      why: t.why,
      type: t.type,
      expert: t.expert,
      duration: t.duration || '5 min',
    });
    usedIds.push(t.id);
  });

  // Layer 3: CONNECTION RITUAL — personalized to love language
  const ritualDays = ['monday', 'thursday', 'saturday', 'sunday'];
  for (const day of ritualDays) {
    const ritual = selectConnectionRitual(profile, week);
    if (ritual && !usedIds.includes(ritual.id)) {
      baseActivities[day].push({
        text: ritual.text,
        why: ritual.why,
        type: 'connection_ritual',
        expert: ritual.expert,
        duration: ritual.duration || '5 min',
      });
      usedIds.push(ritual.id);
    }
  }

  // Layer 4: WEEKLY IDENTITY QUESTION (Meta-pattern #6: Identity > Behavior)
  baseActivities.sunday.push({
    text: `Reflect and write: "Through this week's practice of ${theme.description}, I am becoming someone who ___." Fill in the blank with WHO you're becoming, not just what you did.`,
    why: 'Robbins: "Identity is the strongest force in human psychology." Every week should connect daily actions to the person you\'re becoming. This isn\'t a check-box — it\'s the bridge from behavior to identity.',
    type: 'identity',
    expert: 'robbins',
    duration: '3 min',
  });

  // ═══ WEEKLY GOALS ═══
  const weeklyGoals = [
    {
      text: 'Complete your daily positive lens exercise every day this week (7/7)',
      why: 'Consistency builds the neural pathway. Skipping a day doesn\'t reset progress, but 7/7 builds momentum that 5/7 doesn\'t.',
    },
    {
      text: `Maintain a 5:1 positive-to-negative interaction ratio all week`,
      why: 'Gottman\'s "magic ratio" — the single strongest predictor of relationship longevity, with 94% accuracy.',
    },
  ];

  // Week-specific goals
  switch (week) {
    case 1:
      weeklyGoals.push({
        text: 'Write down 3 moments where you felt emotionally triggered this week — name the emotion underneath the reaction',
        why: 'Self-awareness is step 1. Johnson (EFT): the presenting emotion is never the real one. Your triggers are data.',
      });
      if (profile.attachmentStyle && profile.attachmentStyle !== 'secure') {
        weeklyGoals.push({
          text: `Identify 3 times your ${profile.attachmentStyle} attachment style drove your behavior this week`,
          why: `Levine: awareness of your ${profile.attachmentStyle} patterns is the first step to earned security. Not judging — just seeing.`,
        });
      }
      break;

    case 2:
      weeklyGoals.push({
        text: 'Replace 5 "You always/never..." statements with "I feel ___ when ___ because I need ___"',
        why: '"You" statements trigger defensiveness. "I" statements invite understanding. Same message, completely different reception. Gottman: 96% of conversations end the way they begin.',
      });
      break;

    case 3:
      weeklyGoals.push({
        text: 'Use the 6-second pause technique 3 times this week: feel the trigger → breathe for 6 seconds → THEN respond',
        why: 'It takes 6 seconds for stress hormones to pass through your brain. Those 6 seconds are where you choose who you want to be. Gottman: at 100+ BPM your IQ drops 30 points.',
      });
      if (profile.dominantHorseman) {
        const horsemanGoals = {
          criticism: 'Convert one criticism into a complaint using the formula: "I feel ___ about ___ and I need ___"',
          contempt: 'Write 3 genuine appreciations about your partner every day this week — build a culture of respect',
          defensiveness: 'Accept responsibility for 2% of one complaint without adding "but..." — just own it',
          stonewalling: 'Practice the announced break script 3 times: "I need 20 min. I\'m not leaving — I\'m regulating. I\'ll be back at [time]."',
        };
        weeklyGoals.push({
          text: horsemanGoals[profile.dominantHorseman],
          why: `Gottman: ${profile.dominantHorseman} is your dominant horseman. Its antidote is specific and learnable. This is your highest-leverage practice this week.`,
        });
      }
      break;

    case 4:
      weeklyGoals.push({
        text: 'Map one recurring argument completely: trigger → your reaction → their reaction → escalation → end → what you both actually needed',
        why: 'Johnson (EFT) + Gottman: most couples have the same 3-5 fights on repeat. Once you see the cycle on paper, you can interrupt it.',
      });
      break;

    case 5:
      weeklyGoals.push({
        text: 'Build or strengthen one connection ritual with your partner — something you commit to doing weekly',
        why: 'Gottman: rituals of connection are the scaffolding of lasting relationships. They create predictable moments of togetherness.',
      });
      weeklyGoals.push({
        text: 'Do one thing this week purely for YOUR growth — a class, a hobby, a personal goal. Bring back the aliveness.',
        why: 'Perel: "Desire needs mystery. When you stop growing, you stop being interesting — to yourself and your partner." Finlayson-Fife: your partner\'s attraction is linked to your willingness to develop.',
      });
      break;

    case 6:
      weeklyGoals.push({
        text: 'Write your "relationship identity manifesto" — 5 "I am someone who..." statements that capture who you\'ve become',
        why: 'Robbins: you will never consistently outperform your self-image. Locking in the identity is how 6 weeks of practice becomes a permanent way of being.',
      });
      weeklyGoals.push({
        text: 'Retake your initial assessments and compare scores — celebrate progress, identify your next growth edge',
        why: 'Data doesn\'t lie. Seeing your growth quantified is deeply motivating. And knowing where to go next keeps the momentum alive.',
      });
      break;
  }

  return {
    introduction: intro,
    dailyActivities: baseActivities,
    weeklyGoals,
    profile: {
      attachmentStyle: profile.attachmentStyle,
      loveLanguage: profile.loveLanguage,
      cyclePosition: profile.cyclePosition,
      dominantHorseman: profile.dominantHorseman,
      focusAreas: profile.focusAreas,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHUP WEEK PLAN GENERATOR
// Addresses DYNAMICS between two profiles
// ═══════════════════════════════════════════════════════════════════════════

function generateMatchupWeekPlan(week, matchup) {
  // Extract misses and alignments
  const alignments = safeParse(matchup.alignments) || {};
  const misses = alignments.misses || [];
  const missAreas = misses.map(m => m.area || m);

  // Build profiles for both users from matchup data
  const profile1 = buildProfileFromMatchup(matchup, 'user1');
  const profile2 = buildProfileFromMatchup(matchup, 'user2');
  // Use combined profile for technique selection
  const combinedProfile = mergeProfiles(profile1, profile2);

  const intro = generateMatchupIntro(profile1, profile2, week, missAreas);
  const theme = weekThemes[week] || weekThemes[1];

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const baseActivities = {};

  // Layer 1: POSITIVE LENS — non-negotiable, every day (same as solo)
  for (const day of days) {
    const pl = getPositiveLens(week, day);
    baseActivities[day] = [{
      text: pl.text,
      why: pl.why,
      type: 'positive_lens',
      expert: pl.expert,
      duration: '2 min',
    }];
  }

  // Layer 2: SKILL PRACTICE — selected for the couple's combined profile
  const usedIds = [];
  const weekTechniques = selectTechniques(combinedProfile, week, 5, {
    excludeIds: usedIds,
    preferStage: theme.stage,
    isMatchup: true,
  });

  const skillDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  weekTechniques.forEach((t, i) => {
    const day = skillDays[i % skillDays.length];
    baseActivities[day].push({
      text: t.text,
      why: t.why,
      type: t.type,
      expert: t.expert,
      duration: t.duration || '5 min',
    });
    usedIds.push(t.id);
  });

  // Layer 3: DYNAMIC-SPECIFIC activities (the power feature)
  const dynamics = getMatchupDynamics(profile1, profile2, week);
  if (dynamics.length > 0) {
    const dynamicDay = 'wednesday';
    for (const d of dynamics.slice(0, 2)) {
      if (d.activity) {
        baseActivities[dynamicDay].push(d.activity);
      }
    }
  }

  // Layer 4: CONNECTION RITUALS (based on PARTNER's love language, not own)
  const partnerRitualProfile = { ...combinedProfile };
  // Swap love languages for partner-focused rituals
  if (profile1.loveLanguage && profile2.loveLanguage) {
    partnerRitualProfile.loveLanguage = profile2.loveLanguage;
  }
  const ritualDays = ['monday', 'friday', 'sunday'];
  for (const day of ritualDays) {
    const ritual = selectConnectionRitual(partnerRitualProfile, week);
    if (ritual && !usedIds.includes(ritual.id)) {
      baseActivities[day].push({
        text: ritual.text,
        why: ritual.why,
        type: 'connection_ritual',
        expert: ritual.expert,
        duration: ritual.duration || '5 min',
      });
      usedIds.push(ritual.id);
    }
  }

  // Layer 5: SUNDAY REFLECTION
  baseActivities.sunday.push({
    text: 'Reflect together: Each share one highlight from this week, one challenge, and one thing you appreciate about the other. End with: "The story I\'m telling myself about US this week is..."',
    why: 'Weekly reflection prevents small issues from becoming resentments. Perel: "The quality of your relationship is the quality of your conversations." Brown: naming the narrative creates transparency.',
    type: 'connection_ritual',
    expert: 'perel+brown',
    duration: '10 min',
  });

  // ═══ WEEKLY GOALS ═══
  const weeklyGoals = [
    {
      text: 'Complete daily positive lens exercises together — both partners',
      why: 'Gottman: mutual positive scanning creates a shared atmosphere of appreciation. One person doing it helps; both doing it transforms.',
    },
    {
      text: 'Maintain a 5:1 positive-to-negative interaction ratio as a couple',
      why: 'Gottman\'s "magic ratio" — the strongest predictor of relationship longevity, validated across thousands of couples.',
    },
  ];

  // Week-specific matchup goals
  switch (week) {
    case 1:
      weeklyGoals.push({
        text: 'Learn 3 new things about your partner\'s inner world this week — not logistics, their real thoughts and feelings',
        why: 'Gottman: strong Love Maps are the foundation. You can\'t love someone you don\'t know. Curiosity is the currency of connection.',
      });
      break;
    case 2:
      weeklyGoals.push({
        text: 'Express 7 genuine, specific appreciations this week — one per day, each naming a specific action and how it made you feel',
        why: 'Gottman\'s Fondness & Admiration system: deliberately scanning for what\'s right rewires your perception of your partner.',
      });
      break;
    case 3:
      weeklyGoals.push({
        text: 'Track and respond to 10 bids for connection this week — even small ones like a sigh or a shared link',
        why: 'Gottman: couples who turn toward bids 86% of the time stay together. Those who turn toward only 33% divorce. These micro-moments are everything.',
      });
      break;
    case 4:
      weeklyGoals.push({
        text: 'Together, map your pursue-withdraw cycle on paper — name each step without blame. Tape it somewhere visible.',
        why: 'Johnson (EFT): naming the cycle together transforms "you vs. me" into "us vs. the cycle." 80% of couples have this pattern. Seeing it is the first step to breaking it.',
      });
      break;
    case 5:
      weeklyGoals.push({
        text: 'Share one personal dream or goal with your partner and ask: "How can I support this?"',
        why: 'Gottman: supporting each other\'s life dreams prevents gridlocked conflict. Perel: "In good relationships, each person nurtures the other\'s becoming."',
      });
      break;
    case 6:
      weeklyGoals.push({
        text: 'Together, write your relationship mission statement: What do you stand for as a couple? What legacy do you want to build?',
        why: 'Gottman\'s Shared Meaning + Robbins\' Identity: couples with a shared narrative weather every storm because they have an anchor beyond the day-to-day.',
      });
      weeklyGoals.push({
        text: 'Retake assessments together and compare growth — celebrate wins',
        why: 'Seeing shared growth quantified reinforces the partnership. You didn\'t just survive 6 weeks — you BUILT something together.',
      });
      break;
  }

  // Dynamic-specific goals
  if (dynamics.length > 0) {
    for (const d of dynamics) {
      if (d.weeklyGoal) weeklyGoals.push(d.weeklyGoal);
    }
  }

  // Miss-area-specific goals
  if (missAreas.includes('attachment')) {
    weeklyGoals.push({
      text: 'Discuss attachment needs openly this week — what makes each of you feel secure?',
      why: 'Johnson (EFT): unspoken attachment needs become protest behaviors. Naming them transforms demand into vulnerability.',
    });
  }
  if (missAreas.includes('wellness')) {
    weeklyGoals.push({
      text: 'Practice co-regulation: sit together for 5 minutes doing synchronized breathing. Match breaths, then slow down together.',
      why: 'Tatkin: "Your partner is your psychobiological regulator." Co-regulation physically syncs your nervous systems, building the safety that everything else depends on.',
    });
  }

  return {
    introduction: intro,
    dailyActivities: baseActivities,
    weeklyGoals,
    dynamics: dynamics.map(d => ({ name: d.name, insight: d.insight })),
    profiles: {
      user1: {
        attachmentStyle: profile1.attachmentStyle,
        loveLanguage: profile1.loveLanguage,
        cyclePosition: profile1.cyclePosition,
        dominantHorseman: profile1.dominantHorseman,
      },
      user2: {
        attachmentStyle: profile2.attachmentStyle,
        loveLanguage: profile2.loveLanguage,
        cyclePosition: profile2.cyclePosition,
        dominantHorseman: profile2.dominantHorseman,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHUP HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function buildProfileFromMatchup(matchup, userKey) {
  // Try to extract per-user data from matchup structure
  const data = safeParse(matchup[userKey]) || safeParse(matchup[`${userKey}Data`]) || {};
  const scores = safeParse(data.scores) || safeParse(matchup[`${userKey}Scores`]) || {};
  const profile = {
    attachmentStyle: safeGet(scores, 'attachment.style', 'attachmentStyle') ||
                     safeGet(data, 'attachmentStyle', 'attachment.style') || null,
    loveLanguage: safeGet(scores, 'love_language.primary', 'loveLanguage') ||
                  safeGet(data, 'loveLanguage', 'love_language.primary') || null,
    cyclePosition: safeGet(scores, 'eft.cyclePosition', 'cyclePosition') ||
                   safeGet(data, 'cyclePosition') || null,
    dominantHorseman: safeGet(scores, 'gottman.dominantHorseman') ||
                      safeGet(data, 'dominantHorseman') || null,
    loveLanguageSecondary: null,
    friendshipScore: null,
    conflictScore: null,
    meaningScore: null,
    communicationScore: null,
    horsemenScores: null,
    mbtiType: null,
    personalityDimensions: null,
    focusAreas: [],
    strengths: [],
  };

  // Normalize
  if (profile.attachmentStyle) {
    profile.attachmentStyle = profile.attachmentStyle.toLowerCase().replace(/[-\s]/g, '_');
  }
  if (profile.loveLanguage) {
    profile.loveLanguage = profile.loveLanguage.toLowerCase().replace(/[\s-]/g, '_');
  }

  // Derive cycle position from attachment if needed
  if (!profile.cyclePosition && profile.attachmentStyle) {
    const cycleMap = { anxious: 'pursuer', avoidant: 'withdrawer', fearful_avoidant: 'pursuer', secure: 'balanced' };
    profile.cyclePosition = cycleMap[profile.attachmentStyle] || null;
  }

  return profile;
}

function mergeProfiles(p1, p2) {
  // Create a combined profile that captures the DYNAMIC between both users
  return {
    attachmentStyle: p1.attachmentStyle || p2.attachmentStyle,
    loveLanguage: p1.loveLanguage || p2.loveLanguage,
    loveLanguageSecondary: p2.loveLanguage || p1.loveLanguageSecondary,
    cyclePosition: p1.cyclePosition || p2.cyclePosition,
    dominantHorseman: p1.dominantHorseman || p2.dominantHorseman,
    horsemenScores: p1.horsemenScores || p2.horsemenScores,
    friendshipScore: minNotNull(p1.friendshipScore, p2.friendshipScore),
    conflictScore: minNotNull(p1.conflictScore, p2.conflictScore),
    meaningScore: minNotNull(p1.meaningScore, p2.meaningScore),
    communicationScore: minNotNull(p1.communicationScore, p2.communicationScore),
    focusAreas: [...new Set([...(p1.focusAreas || []), ...(p2.focusAreas || [])])],
    strengths: [...new Set([...(p1.strengths || []), ...(p2.strengths || [])])],
  };
}

function minNotNull(a, b) {
  if (a === null && b === null) return null;
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(Number(a), Number(b));
}

function generateMatchupIntro(p1, p2, week, missAreas) {
  const theme = weekThemes[week] || weekThemes[1];
  const langName = {
    words_of_affirmation: 'Words of Affirmation', acts_of_service: 'Acts of Service',
    quality_time: 'Quality Time', physical_touch: 'Physical Touch', receiving_gifts: 'Receiving Gifts',
  };
  const attachName = { anxious: 'anxious', avoidant: 'avoidant', fearful_avoidant: 'fearful-avoidant', secure: 'secure' };

  const parts = [];

  // Describe the dynamic
  if (p1.attachmentStyle && p2.attachmentStyle) {
    if (p1.attachmentStyle === 'anxious' && p2.attachmentStyle === 'avoidant' ||
        p1.attachmentStyle === 'avoidant' && p2.attachmentStyle === 'anxious') {
      parts.push('Your relationship has the classic anxious-avoidant dynamic — one partner reaches while the other retreats. Levine calls this "the trap," and Johnson says it\'s the most common cycle she sees. The good news: it\'s the most well-studied pattern in relationship science, and the strategies to break it are proven.');
    } else if (p1.attachmentStyle === p2.attachmentStyle) {
      parts.push(`You both have ${attachName[p1.attachmentStyle] || p1.attachmentStyle} attachment styles — which means you understand each other's triggers intuitively, but you may also reinforce each other's patterns.`);
    } else {
      parts.push(`With ${attachName[p1.attachmentStyle] || 'your'} and ${attachName[p2.attachmentStyle] || 'your partner\'s'} attachment styles, your dynamic has unique strengths and specific friction points.`);
    }
  }

  // Love language dynamic
  if (p1.loveLanguage && p2.loveLanguage) {
    if (p1.loveLanguage === p2.loveLanguage) {
      parts.push(`You both speak ${langName[p1.loveLanguage] || p1.loveLanguage} — that's a superpower. You naturally understand what makes each other feel loved. Chapman's warning: don't let this become autopilot. Intentionality matters even when the language matches.`);
    } else {
      parts.push(`You speak ${langName[p1.loveLanguage] || p1.loveLanguage} but your partner speaks ${langName[p2.loveLanguage] || p2.loveLanguage}. Chapman: you're probably loving each other in your OWN languages. This week, translate — express love in THEIR language, not yours.`);
    }
  }

  parts.push(`\nWeek ${week}: ${theme.name} — ${theme.description}.`);

  return {
    weekNumber: week,
    weekName: `Week ${week}: ${theme.name}`,
    stage: theme.stage,
    personalizedMessage: parts.join(' '),
  };
}

function getMatchupDynamics(p1, p2, week) {
  const dynamics = [];

  // Anxious-Avoidant Trap
  if ((p1.attachmentStyle === 'anxious' && p2.attachmentStyle === 'avoidant') ||
      (p1.attachmentStyle === 'avoidant' && p2.attachmentStyle === 'anxious')) {
    const anxiousLabel = p1.attachmentStyle === 'anxious' ? 'you' : 'your partner';
    const avoidantLabel = p1.attachmentStyle === 'avoidant' ? 'you' : 'your partner';

    dynamics.push({
      name: 'The Anxious-Avoidant Dance',
      insight: `When ${anxiousLabel} reaches for reassurance, ${avoidantLabel} feels overwhelmed and pulls away — which triggers more reaching. Levine: one clear, direct request is 10x more effective than 10 subtle bids.`,
      activity: {
        text: `Today's dynamic practice: The anxious partner (${anxiousLabel}) expresses ONE need directly and specifically. The avoidant partner (${avoidantLabel}) initiates ONE moment of connection before being asked. Both track how it felt.`,
        why: 'Levine: in the anxious-avoidant trap, the anxious partner\'s repeated bids trigger avoidant withdrawal, creating the exact outcome both fear. Breaking the pattern requires BOTH sides to move: one toward clarity, one toward initiative.',
        type: 'attachment',
        expert: 'levine+johnson',
        duration: '5 min',
      },
      weeklyGoal: {
        text: 'The anxious partner practices one clear request per day; the avoidant partner initiates one unprompted connection per day',
        why: 'Levine: when avoidants initiate, it short-circuits the anxious alarm. When anxious partners make one clear request instead of ten hints, avoidants can actually respond. Both moves break the cycle.',
      },
    });
  }

  // Same-Style Dynamics (Grok feedback: handle anxious-anxious, avoidant-avoidant)
  if (p1.attachmentStyle && p2.attachmentStyle && p1.attachmentStyle === p2.attachmentStyle && p1.attachmentStyle !== 'secure') {
    if (p1.attachmentStyle === 'anxious') {
      dynamics.push({
        name: 'The Anxious-Anxious Amplifier',
        insight: 'Levine: when both partners are anxious, anxiety spirals can amplify — one person\'s worry triggers the other\'s, creating a feedback loop. The key: one of you needs to practice being the "secure base" in any given moment. Take turns.',
        activity: {
          text: 'Today, designate one partner as the "grounding anchor." When anxiety spikes for either of you, that person says: "I\'m here. We\'re okay. Let\'s breathe together for 60 seconds." Tomorrow, switch roles.',
          why: 'Levine + Tatkin: anxious-anxious pairs need to deliberately practice co-regulation instead of co-escalation. Taking turns being the anchor builds earned security for both.',
          type: 'attachment',
          expert: 'levine+tatkin',
          duration: '5 min',
        },
      });
    } else if (p1.attachmentStyle === 'avoidant') {
      dynamics.push({
        name: 'The Avoidant-Avoidant Distance',
        insight: 'Levine: two avoidant partners may feel "easy" together — no drama, no demands. But the risk is emotional starvation. Without someone pushing for closeness, connection quietly atrophies.',
        activity: {
          text: 'Today, BOTH partners share one vulnerability they\'d normally keep to themselves. It can be small: "I worry about..." or "I actually need..." The goal isn\'t comfort — it\'s practice tolerating closeness.',
          why: 'Levine: avoidant-avoidant pairs need deliberate intimacy injection. Neither partner naturally initiates depth, so both must consciously choose it or the relationship becomes roommates.',
          type: 'vulnerability',
          expert: 'levine+brown',
          duration: '10 min',
        },
      });
    }
  }

  // Pursuer-Withdrawer Cycle
  if (p1.cyclePosition === 'pursuer' && p2.cyclePosition === 'withdrawer' ||
      p1.cyclePosition === 'withdrawer' && p2.cyclePosition === 'pursuer') {
    dynamics.push({
      name: 'The Pursue-Withdraw Cycle',
      insight: 'Johnson (EFT): this is THE central destructive pattern in relationships. Neither person is wrong — the pursuer feels abandoned, the withdrawer feels overwhelmed. The enemy is the CYCLE, not each other.',
      activity: week >= 4 ? {
        text: 'Together, draw your cycle on paper with arrows: "When I [pursue/demand], you [withdraw/defend]. That makes me feel [emotion], so I [escalate]. That makes you feel [emotion], so you [retreat further]." Tape it to the fridge.',
        why: 'Johnson: naming the cycle together is the single most powerful EFT intervention. Once you both SEE the pattern, you stop blaming each other and start fighting the real enemy: the cycle itself.',
        type: 'pattern_awareness',
        expert: 'johnson',
        duration: '20 min',
      } : null,
    });
  }

  // Love Language Mismatch
  if (p1.loveLanguage && p2.loveLanguage && p1.loveLanguage !== p2.loveLanguage) {
    dynamics.push({
      name: 'Love Language Translation',
      insight: `Chapman: you speak different love languages. This isn't a problem — it's a translation challenge. The effort of speaking their language instead of yours IS the love.`,
      activity: {
        text: `This week, express love ONLY in your partner's language. If they speak ${p2.loveLanguage?.replace(/_/g, ' ')}, learn what that looks like in specific, daily actions. Ask them: "What makes you feel most loved?" — their answer is your curriculum.`,
        why: 'Chapman: most couples send love in their OWN language and wonder why it doesn\'t land. Translating takes effort — and that effort IS the message. Your partner doesn\'t just receive the gesture — they receive the proof that you cared enough to learn their language.',
        type: 'connection_ritual',
        expert: 'chapman',
        duration: 'ongoing',
      },
    });
  }

  // Same love language — easy wins but complacency risk
  if (p1.loveLanguage && p2.loveLanguage && p1.loveLanguage === p2.loveLanguage) {
    dynamics.push({
      name: 'Shared Language Advantage',
      insight: 'You both speak the same love language — that\'s a natural advantage. Chapman\'s warning: shared language can breed complacency. When it feels automatic, you stop being intentional. Keep showing up on purpose.',
    });
  }

  return dynamics;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/strategies/current
 */
router.get('/current', authenticate, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const strategy = await req.prisma.strategy.findFirst({
      where: {
        relationshipId: relationship.id,
        isActive: true
      },
      orderBy: { week: 'desc' }
    });

    if (!strategy) {
      return res.status(404).json({
        error: 'No active strategy',
        code: 'NO_STRATEGY'
      });
    }

    res.json({
      strategy: {
        id: strategy.id,
        cycleNumber: strategy.cycleNumber,
        week: strategy.week,
        dailyActivities: strategy.dailyActivities,
        weeklyGoals: strategy.weeklyGoals,
        introduction: strategy.introduction || null,
        progress: strategy.progress,
        startDate: strategy.startDate,
        endDate: strategy.endDate
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/strategies/generate
 */
router.post('/generate', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Get latest matchup
    const matchup = await req.prisma.matchup.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { generatedAt: 'desc' }
    });

    // If no matchup, fall back to individual assessments
    let assessments = null;
    if (!matchup) {
      assessments = await req.prisma.assessment.findMany({
        where: { userId: req.user.id },
        orderBy: { completedAt: 'desc' }
      });

      if (!assessments || assessments.length === 0) {
        return res.status(400).json({
          error: 'Complete at least one assessment first',
          code: 'NO_ASSESSMENTS'
        });
      }
    }

    // Deactivate old strategies
    await req.prisma.strategy.updateMany({
      where: {
        relationshipId: relationship.id,
        isActive: true
      },
      data: { isActive: false }
    });

    // Get current cycle number
    const lastStrategy = await req.prisma.strategy.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { cycleNumber: 'desc' }
    });
    const cycleNumber = (lastStrategy?.cycleNumber || 0) + 1;

    // Generate 6 weeks of strategies
    const strategies = [];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    for (let week = 1; week <= 6; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekPlan = generateWeekPlan(week, { matchup, assessments });

      const strategy = await req.prisma.strategy.create({
        data: {
          relationshipId: relationship.id,
          cycleNumber,
          week,
          dailyActivities: weekPlan.dailyActivities,
          weeklyGoals: weekPlan.weeklyGoals,
          introduction: weekPlan.introduction || null,
          progress: 0,
          isActive: true,
          startDate: weekStart,
          endDate: weekEnd
        }
      });

      strategies.push(strategy);
    }

    logger.info('Strategies generated', {
      relationshipId: relationship.id,
      cycleNumber,
      weeks: 6,
      hasMatchup: !!matchup,
    });

    res.json({
      message: '6-week strategy plan generated',
      cycleNumber,
      strategies: strategies.map(s => ({
        id: s.id,
        week: s.week,
        startDate: s.startDate,
        endDate: s.endDate,
        dailyActivities: s.dailyActivities,
        weeklyGoals: s.weeklyGoals,
        introduction: s.introduction,
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/strategies/update-progress
 */
router.post('/update-progress', authenticate, async (req, res, next) => {
  try {
    const { strategyId, completedActivities, progress } = req.body;

    const strategy = await req.prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { relationship: true }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    if (strategy.relationship.user1Id !== req.user.id &&
        strategy.relationship.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    let calculatedProgress = progress;
    if (completedActivities !== undefined && !progress) {
      const totalActivities = Object.values(strategy.dailyActivities).flat().length +
                             strategy.weeklyGoals.length;
      calculatedProgress = Math.round((completedActivities / totalActivities) * 100);
    }

    calculatedProgress = Math.min(100, Math.max(0, calculatedProgress || 0));

    const updated = await req.prisma.strategy.update({
      where: { id: strategyId },
      data: { progress: calculatedProgress }
    });

    res.json({
      message: 'Progress updated',
      strategy: {
        id: updated.id,
        week: updated.week,
        progress: updated.progress
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/strategies/history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const strategies = await req.prisma.strategy.findMany({
      where: { relationshipId: relationship.id },
      orderBy: [
        { cycleNumber: 'desc' },
        { week: 'asc' }
      ]
    });

    const cycles = {};
    for (const s of strategies) {
      if (!cycles[s.cycleNumber]) {
        cycles[s.cycleNumber] = [];
      }
      cycles[s.cycleNumber].push({
        id: s.id,
        week: s.week,
        progress: s.progress,
        isActive: s.isActive,
        startDate: s.startDate,
        endDate: s.endDate
      });
    }

    res.json({ cycles });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════

function generateWeekPlan(week, { matchup, assessments }) {
  if (matchup) {
    return generateMatchupWeekPlan(week, matchup);
  }
  if (assessments && assessments.length > 0) {
    return generateSoloWeekPlan(week, assessments);
  }
  // Fallback: generate a generic plan with empty profile (uses anyProfile techniques)
  logger.info('generateWeekPlan: no matchup or assessments, generating default plan', { week });
  return generateSoloWeekPlan(week, []);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS (for testing)
// ═══════════════════════════════════════════════════════════════════════════

// Export internals for unit testing
router._internals = {
  generateRelationshipProfile,
  selectTechniques,
  selectConnectionRitual,
  selectHorsemanAntidote,
  generatePersonalizedIntro,
  generateSoloWeekPlan,
  generateMatchupWeekPlan,
  scoreTechnique,
  safeParse,
  safeGet,
};

module.exports = router;
