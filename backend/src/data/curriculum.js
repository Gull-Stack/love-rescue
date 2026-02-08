/**
 * 16-Week Love Mastery Curriculum
 * Each week builds on the last, skills stack progressively
 */

const CURRICULUM = [
  // PHASE 1: FOUNDATION (Weeks 1-4)
  {
    week: 1,
    phase: 1,
    phaseName: 'Foundation',
    title: 'The Mirror',
    expert: 'Course Foundation',
    theme: 'You are 100% responsible for your experience',
    description: 'Before you can improve your relationship, you must understand one truth: you can only change yourself. This week we establish the Creator mindset that will guide your entire journey.',
    skills: [
      'Victim vs Creator mindset distinction',
      'The relationship is a mirror, not a window',
      'Taking radical ownership of your reactions'
    ],
    dailyPractice: 'Catch yourself blaming your partner → pause → reframe to "What is MY part in this?"',
    assessmentFocus: null, // Baseline week
    videoIds: [], // To be populated
  },
  {
    week: 2,
    phase: 1,
    phaseName: 'Foundation',
    title: 'Your Attachment Style',
    expert: 'Stan Tatkin & Amir Levine',
    theme: 'Your attachment patterns come from YOUR history',
    description: 'Your attachment style was formed before you could speak. It\'s not your fault, but it IS your responsibility to understand and work with it.',
    skills: [
      'Identify your attachment style (Secure, Anxious, Avoidant, Fearful)',
      'Recognize YOUR triggered reactions',
      'Begin self-regulation practices'
    ],
    dailyPractice: 'When triggered, pause and ask: "Is this my attachment pattern speaking?"',
    assessmentFocus: 'attachment',
    videoIds: [],
    // Personalization based on attachment result
    customInsights: {
      secure: 'Your secure base is a gift. This week, notice how you can help regulate your partner.',
      anxious: 'Your deep capacity for connection is a strength. This week, practice self-soothing when you feel the urge to seek reassurance.',
      avoidant: 'Your independence is valuable. This week, notice when you withdraw and practice staying present.',
      fearful: 'Your complexity means you understand both sides. This week, practice choosing connection over protection.'
    }
  },
  {
    week: 3,
    phase: 1,
    phaseName: 'Foundation',
    title: 'Your Love Languages',
    expert: 'Gary Chapman',
    theme: 'How YOU give and receive love',
    description: 'You\'ve been speaking your own love language, but your partner may speak a different one. Time to become bilingual.',
    skills: [
      'Identify YOUR primary and secondary love languages',
      'Learn to express needs clearly',
      'Recognize when you\'re speaking the wrong language'
    ],
    dailyPractice: 'Give love in your PARTNER\'S language today, not yours',
    assessmentFocus: 'love_language',
    videoIds: [],
    customInsights: {
      words: 'Words matter deeply to you. This week, notice if you\'re giving words but your partner needs something else.',
      acts: 'Actions speak loudest to you. This week, verbalize appreciation even when actions feel more natural.',
      gifts: 'Thoughtful symbols matter to you. This week, notice the non-gift ways your partner shows love.',
      time: 'Presence is everything to you. This week, make quality time even when life is busy.',
      touch: 'Physical connection grounds you. This week, notice if your partner needs emotional words too.'
    }
  },
  {
    week: 4,
    phase: 1,
    phaseName: 'Foundation',
    title: 'Your Human Needs',
    expert: 'Tony Robbins',
    theme: 'The 6 needs driving YOUR behavior',
    description: 'Every conflict, every reaction, every pattern traces back to an unmet need. When you understand YOUR needs, you stop outsourcing your happiness.',
    skills: [
      'Identify your top 2 driving needs',
      'See how needs drive conflict',
      'Meet your own needs first (not outsourcing)'
    ],
    dailyPractice: 'In each conflict, ask: "Which of my needs feels threatened right now?"',
    assessmentFocus: 'human_needs',
    videoIds: [],
    customInsights: {
      certainty: 'You need stability and predictability. This week, notice when your need for control creates conflict.',
      variety: 'You need excitement and change. This week, notice if your partner needs more stability than you.',
      significance: 'You need to feel important and unique. This week, practice giving significance to your partner.',
      connection: 'You need deep bonding. This week, notice if you sacrifice yourself for connection.',
      growth: 'You need progress and development. This week, balance growth with presence.',
      contribution: 'You need to give and matter. This week, notice if you give to receive.'
    }
  },

  // PHASE 2: COMMUNICATION (Weeks 5-8)
  {
    week: 5,
    phase: 2,
    phaseName: 'Communication',
    title: 'The Four Horsemen',
    expert: 'John Gottman',
    theme: 'YOUR destructive patterns in conflict',
    description: 'Gottman can predict divorce with 94% accuracy by watching for four behaviors. This week, you\'ll catch YOURSELF using them.',
    skills: [
      'Recognize Criticism, Contempt, Defensiveness, Stonewalling',
      'Catch YOURSELF deploying horsemen',
      'Apply the antidotes immediately'
    ],
    dailyPractice: 'Log every horseman YOU use today → immediately apply the antidote',
    assessmentFocus: 'gottman_checkup',
    videoIds: [],
    customInsights: {
      criticism: 'You tend toward criticism. This week, practice "I feel..." instead of "You always..."',
      contempt: 'Contempt is the most dangerous. This week, catch eye-rolls, sarcasm, and superiority.',
      defensiveness: 'Defensiveness blocks repair. This week, practice saying "You\'re right about that part."',
      stonewalling: 'Stonewalling feels protective but damages trust. This week, say "I need 20 minutes" instead of shutting down.'
    }
  },
  {
    week: 6,
    phase: 2,
    phaseName: 'Communication',
    title: 'Tactical Empathy',
    expert: 'Chris Voss',
    theme: 'Making others feel deeply understood',
    description: 'The FBI\'s top hostage negotiator knows: people don\'t care what you think until they feel understood. Master these tools.',
    skills: [
      'Labeling emotions ("It seems like you\'re feeling...")',
      'Mirroring (repeat last 3 words as question)',
      'Calibrated questions (How/What, never Why)'
    ],
    dailyPractice: 'Use 3 emotional labels in conversations today: "It sounds like...", "It seems like...", "It feels like..."',
    assessmentFocus: 'emotional_intelligence',
    videoIds: [],
    customInsights: {
      default: 'This week, your only goal is to make your partner feel HEARD. Not agreed with. HEARD.'
    }
  },
  {
    week: 7,
    phase: 2,
    phaseName: 'Communication',
    title: 'Bids for Connection',
    expert: 'John Gottman',
    theme: 'The small moments that make or break relationships',
    description: 'Relationships aren\'t made in grand gestures. They\'re made in tiny moments — bids for connection. Most people miss 80% of them.',
    skills: [
      'Recognize bids (often subtle: sighs, comments, looks)',
      'Turn toward instead of away or against',
      'Make YOUR bids clear and positive'
    ],
    dailyPractice: 'Track every bid you notice today. Turn toward EVERY one, even if busy.',
    assessmentFocus: null,
    videoIds: [],
    customInsights: {
      avoidant: 'Your tendency to miss bids isn\'t intentional, but it hurts your partner. This week, actively look for them.',
      anxious: 'You\'re great at noticing bids. This week, focus on making YOUR bids clear instead of testing.',
      default: 'Masters of relationships turn toward bids 86% of the time. Disasters turn toward only 33%.'
    }
  },
  {
    week: 8,
    phase: 2,
    phaseName: 'Communication',
    title: 'Flooding & Repair',
    expert: 'John Gottman & Stan Tatkin',
    theme: 'What to do when you\'re overwhelmed',
    description: 'When your heart rate exceeds 100 BPM, you literally cannot think straight. This week: master the pause and the repair.',
    skills: [
      'Recognize YOUR flooding signs (racing heart, tunnel vision)',
      'Self-soothing techniques (physiological reset)',
      'Repair attempts (de-escalation phrases that work)'
    ],
    dailyPractice: 'If you feel flooding coming, say: "I\'m getting flooded. I need 20 minutes, then I\'ll come back."',
    assessmentFocus: 'conflict_style',
    videoIds: [],
    customInsights: {
      anxious: 'You may fear that pausing means abandonment. It doesn\'t. It means you care enough to return regulated.',
      avoidant: 'Your pause is good, but you must RETURN. Set a timer. Come back and repair.',
      default: 'Repair attempts are the #1 predictor of relationship success. It\'s not about never fighting — it\'s about repairing.'
    }
  },

  // PHASE 3: EMOTIONAL DEPTH (Weeks 9-12)
  {
    week: 9,
    phase: 3,
    phaseName: 'Emotional Depth',
    title: 'The Demon Dialogues',
    expert: 'Susan Johnson',
    theme: 'The negative cycles YOU get stuck in',
    description: 'Every couple has a "dance" — a predictable cycle of attack and defend. Name it, and you can stop it.',
    skills: [
      'Identify your cycle: Find the Bad Guy, Protest Polka, or Freeze & Flee',
      'See YOUR role (pursuer or withdrawer)',
      'Name the cycle out loud together'
    ],
    dailyPractice: 'When conflict starts, say: "I think we\'re doing our cycle again. Can we pause?"',
    assessmentFocus: 'negative_patterns_closeness',
    videoIds: [],
    customInsights: {
      anxious: 'You likely pursue. This week, notice when your pursuit pushes your partner further away.',
      avoidant: 'You likely withdraw. This week, notice that your silence feels like rejection to your partner.',
      default: 'The cycle is the enemy, not your partner. Once you see it, you can fight it together.'
    }
  },
  {
    week: 10,
    phase: 3,
    phaseName: 'Emotional Depth',
    title: 'Raw Spots & Attachment Injuries',
    expert: 'Susan Johnson',
    theme: 'The old wounds that get triggered',
    description: 'You\'re not just reacting to today\'s fight. You\'re reacting to every time you felt abandoned, rejected, or not enough.',
    skills: [
      'Identify YOUR raw spots (abandonment, rejection, inadequacy)',
      'Trace them to origin (childhood, past relationships)',
      'Communicate vulnerability without blame'
    ],
    dailyPractice: 'Share with your partner: "When X happens, I feel Y, because of Z in my past."',
    assessmentFocus: 'attachment',
    videoIds: [],
    customInsights: {
      anxious: 'Your raw spot is likely abandonment. This week, share that fear without demanding reassurance.',
      avoidant: 'Your raw spot is likely being controlled or smothered. This week, share that need without shutting down.',
      default: 'Your partner isn\'t trying to hurt your raw spots. They don\'t even know where they are until you show them.'
    }
  },
  {
    week: 11,
    phase: 3,
    phaseName: 'Emotional Depth',
    title: 'Vulnerability as Strength',
    expert: 'Brené Brown',
    theme: 'The courage to be seen',
    description: 'Vulnerability is not weakness. It\'s the birthplace of connection, creativity, and change. Armor off.',
    skills: [
      'Distinguish shame from guilt',
      'Understand the vulnerability paradox',
      'Practice daring greatly in your relationship'
    ],
    dailyPractice: 'Share one vulnerable truth with your partner that you\'ve been holding back.',
    assessmentFocus: 'emotional_intelligence',
    videoIds: [],
    customInsights: {
      avoidant: 'Vulnerability feels dangerous to you. This week, take one small risk of being seen.',
      anxious: 'You may over-share seeking validation. This week, be vulnerable without needing a response.',
      default: 'Vulnerability is not oversharing. It\'s sharing appropriate things with people who\'ve earned the right to hear them.'
    }
  },
  {
    week: 12,
    phase: 3,
    phaseName: 'Emotional Depth',
    title: 'Differentiation',
    expert: 'Jennifer Finlayson-Fife',
    theme: 'Growing up in your relationship',
    description: 'Differentiation is the ability to hold onto yourself while staying connected to your partner. It\'s relationship maturity.',
    skills: [
      'Self-confrontation (looking at YOUR part honestly)',
      'Hold your position without needing agreement',
      'Source your worth from within, not from your partner'
    ],
    dailyPractice: 'Do something your best self would do, even if it\'s hard, even if your partner doesn\'t notice.',
    assessmentFocus: 'differentiation',
    videoIds: [],
    customInsights: {
      anxious: 'Your challenge is holding yourself when your partner is upset. This week, practice self-soothing without seeking reassurance.',
      avoidant: 'Your challenge is staying connected while holding yourself. This week, share your inner world while maintaining boundaries.',
      default: 'Differentiation isn\'t distance. It\'s being fully yourself AND fully connected.'
    }
  },

  // PHASE 4: INTIMACY & DESIRE (Weeks 13-14)
  {
    week: 13,
    phase: 4,
    phaseName: 'Intimacy & Desire',
    title: 'Erotic Intelligence',
    expert: 'Esther Perel & Jennifer Finlayson-Fife',
    theme: 'Desire in long-term relationships',
    description: 'Security and passion seem like opposites. They\'re not — but they require different things. Time to understand desire.',
    skills: [
      'The erotic vs. the domestic',
      'Maintaining mystery and novelty',
      'Desire as wanting, not just willingness'
    ],
    dailyPractice: 'Create anticipation today. Break one routine. Surprise your partner (or yourself).',
    assessmentFocus: null,
    videoIds: [],
    customInsights: {
      avoidant: 'You may feel desire when there\'s distance. This week, practice desire in closeness.',
      anxious: 'You may confuse anxiety for desire. This week, notice the difference between wanting and needing.',
      default: 'Desire requires a gap to cross. If there\'s no gap, there\'s no longing.'
    }
  },
  {
    week: 14,
    phase: 4,
    phaseName: 'Intimacy & Desire',
    title: 'The Couple Bubble',
    expert: 'Stan Tatkin',
    theme: 'Being each other\'s "go-to" person',
    description: 'In a secure-functioning relationship, you are each other\'s primary person. The couple bubble protects you both.',
    skills: [
      'Secure functioning (we protect each other first)',
      'Co-regulation of nervous systems',
      'Rituals of connection (hellos, goodbyes, reunions)'
    ],
    dailyPractice: 'Create a 2-minute ritual: eye contact, touch, and words at every hello and goodbye.',
    assessmentFocus: 'attachment',
    videoIds: [],
    customInsights: {
      avoidant: 'The couple bubble may feel suffocating. This week, see it as a safe base, not a cage.',
      anxious: 'The couple bubble gives you the security you crave. This week, trust it without testing it.',
      default: 'Your couple bubble should make both people feel safe AND free.'
    }
  },

  // PHASE 5: INTEGRATION (Weeks 15-16)
  {
    week: 15,
    phase: 5,
    phaseName: 'Integration',
    title: 'State Management & Influence',
    expert: 'Tony Robbins & Jordan Belfort',
    theme: 'Mastering YOUR state to lead the relationship',
    description: 'Your emotional state is contagious. When you master your state, you can lead your relationship to better places.',
    skills: [
      'Physiology drives psychology (posture, breath, movement)',
      'Certainty, enthusiasm, and rapport',
      'Leading by going first'
    ],
    dailyPractice: 'Before any important conversation, set your state: stand tall, breathe deep, choose your energy.',
    assessmentFocus: 'emotional_intelligence',
    videoIds: [],
    customInsights: {
      default: 'You can\'t control your partner\'s state. But you can control yours — and states are contagious.'
    }
  },
  {
    week: 16,
    phase: 5,
    phaseName: 'Integration',
    title: 'The Sound Relationship House',
    expert: 'John Gottman',
    theme: 'The complete architecture of lasting love',
    description: 'You\'ve learned the pieces. Now see how they fit together. The Sound Relationship House is your blueprint.',
    skills: [
      'Love Maps (know your partner\'s inner world)',
      'Fondness & Admiration (culture of appreciation)',
      'Shared Meaning (dreams, rituals, roles, goals)'
    ],
    dailyPractice: 'Review all 16 weeks. Which skills need more practice? Create your ongoing maintenance plan.',
    assessmentFocus: 'gottman_checkup',
    videoIds: [],
    customInsights: {
      default: 'You\'ve completed the course. But this isn\'t the end — it\'s the beginning of conscious partnership.'
    }
  }
];

/**
 * Get curriculum week by number
 */
function getWeek(weekNumber) {
  return CURRICULUM.find(w => w.week === weekNumber) || null;
}

/**
 * Get all weeks
 */
function getAllWeeks() {
  return CURRICULUM;
}

/**
 * Get personalized insight based on assessment results
 */
function getPersonalizedInsight(weekNumber, assessmentResults) {
  const week = getWeek(weekNumber);
  if (!week || !week.customInsights) return null;

  // Check attachment style first (most common personalization)
  if (assessmentResults.attachment) {
    const style = assessmentResults.attachment.toLowerCase();
    if (week.customInsights[style]) {
      return week.customInsights[style];
    }
  }

  // Check specific assessment for this week
  if (week.assessmentFocus && assessmentResults[week.assessmentFocus]) {
    const result = assessmentResults[week.assessmentFocus];
    if (typeof result === 'string' && week.customInsights[result.toLowerCase()]) {
      return week.customInsights[result.toLowerCase()];
    }
  }

  // Return default if available
  return week.customInsights.default || null;
}

/**
 * Get focus areas based on assessment results
 */
function getFocusAreas(assessmentResults) {
  const focusAreas = [];

  if (assessmentResults.attachment === 'anxious') {
    focusAreas.push('self-soothing', 'managing anxiety', 'secure base building');
  } else if (assessmentResults.attachment === 'avoidant') {
    focusAreas.push('staying present', 'emotional expression', 'turning toward bids');
  } else if (assessmentResults.attachment === 'fearful') {
    focusAreas.push('trust building', 'emotion regulation', 'choosing connection');
  }

  if (assessmentResults.gottman_checkup) {
    const horsemen = assessmentResults.gottman_checkup;
    if (horsemen.criticism > 2) focusAreas.push('gentle startup');
    if (horsemen.contempt > 1) focusAreas.push('building appreciation');
    if (horsemen.defensiveness > 2) focusAreas.push('taking responsibility');
    if (horsemen.stonewalling > 2) focusAreas.push('self-soothing techniques');
  }

  return focusAreas;
}

module.exports = {
  CURRICULUM,
  getWeek,
  getAllWeeks,
  getPersonalizedInsight,
  getFocusAreas
};
