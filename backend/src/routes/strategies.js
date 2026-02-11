const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/strategies/current
 * Get the current active strategy for the relationship
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
 * Generate a new 6-week strategy based on matchup score
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
      weeks: 6
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
        weeklyGoals: s.weeklyGoals
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/strategies/update-progress
 * Update strategy progress
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

    // Verify user is part of the relationship
    if (strategy.relationship.user1Id !== req.user.id &&
        strategy.relationship.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate progress if not provided
    let calculatedProgress = progress;
    if (completedActivities !== undefined && !progress) {
      const totalActivities = Object.values(strategy.dailyActivities).flat().length +
                             strategy.weeklyGoals.length;
      calculatedProgress = Math.round((completedActivities / totalActivities) * 100);
    }

    // LOW-12: Clamp progress to 0-100 range
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
 * Get strategy history
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

    // Group by cycle
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

// Helper function to generate week plan based on matchup or individual assessments
function generateWeekPlan(week, { matchup, assessments }) {
  if (matchup) {
    return generateMatchupWeekPlan(week, matchup);
  }
  return generateSoloWeekPlan(week, assessments);
}

// Build a comprehensive relationship profile from all assessments
function generateRelationshipProfile(assessments) {
  const profile = {
    attachmentStyle: null,
    loveLanguage: null,
    cyclePosition: null,
    dominantHorseman: null,
    friendshipScore: null,
    conflictScore: null,
    meaningScore: null,
    communicationScore: null,
    focusAreas: []
  };

  if (!assessments || assessments.length === 0) return profile;

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

    if (g.horsemen) {
      const worst = Object.entries(g.horsemen)
        .sort(([, a], [, b]) => a - b)[0];
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

  // PREP communication
  if (byType.prep?.score?.communication) {
    profile.communicationScore = byType.prep.score.communication;
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

// Generate week plan from matchup data (partnered flow)
function generateMatchupWeekPlan(week, matchup) {
  const misses = matchup.alignments?.misses || [];
  const missAreas = misses.map(m => m.area);

  const baseActivities = {
    monday: [{ text: 'Log 3 positive interactions you had today — be specific about what they did and how it made you feel', why: 'Gottman\'s research: couples who maintain a 5:1 positive-to-negative ratio stay together 94% of the time. Logging positives trains your brain to notice them.', type: 'positive_lens', expert: 'gottman', duration: '2 min' }],
    tuesday: [{ text: 'Ask one open-ended question about your partner\'s inner world — not logistics, something real ("What\'s been on your mind lately?")', why: 'Gottman\'s Love Maps: couples who know each other\'s inner world handle stress better. Open-ended questions signal genuine curiosity.', type: 'connection', expert: 'gottman', duration: '5 min' }],
    wednesday: [{ text: 'Express appreciation for something specific your partner did — name the action AND how it made you feel', why: 'Generic "thanks" doesn\'t land. Specific appreciation ("I noticed you made coffee before I woke up — that made me feel cared for") builds a culture of fondness.', type: 'positive_lens', expert: 'gottman', duration: '1 min' }],
    thursday: [{ text: 'Log your positive-to-negative interaction ratio for the week so far — aim for 5:1 or higher', why: 'What gets measured gets managed. Gottman found the 5:1 ratio is the single strongest predictor of relationship stability.', type: 'tracking', expert: 'gottman', duration: '3 min' }],
    friday: [{ text: 'Plan one meaningful activity together for the weekend — something that creates a shared experience, not just proximity', why: 'Tatkin\'s research: shared novel experiences release oxytocin and dopamine together, strengthening your pair bond.', type: 'connection_ritual', expert: 'tatkin', duration: '5 min' }],
    saturday: [{ text: 'Spend 20 minutes of uninterrupted, device-free time together — use Gottman\'s stress-reducing conversation format', why: 'Gottman: daily stress-reducing conversations are non-negotiable for lasting relationships. The key: listen to understand, not to fix.', type: 'connection_ritual', expert: 'gottman', duration: '20 min' }],
    sunday: [{ text: 'Reflect on the week together: each share one highlight, one challenge, and one thing you appreciate about the other', why: 'Weekly reflection creates a ritual of connection and prevents small issues from becoming resentments. Perel: "The quality of your relationship is the quality of your conversations."', type: 'reflection', expert: 'perel', duration: '10 min' }]
  };

  const weeklyGoals = [
    { text: 'Complete daily prompts together', why: 'Consistency builds trust. Showing up daily signals commitment.' },
    { text: 'Maintain a 5:1 positive-to-negative interaction ratio', why: 'Gottman\'s "magic ratio" — the strongest predictor of relationship longevity.' }
  ];

  switch (week) {
    case 1:
      weeklyGoals.push({ text: 'Learn 3 new things about your partner\'s inner world this week', why: 'Gottman: strong Love Maps are the foundation of friendship. You can\'t love someone you don\'t know.' });
      baseActivities.tuesday.push({ text: 'Share a childhood memory that shaped who you are — and ask your partner to do the same', why: 'Vulnerability builds intimacy. Brené Brown: "Connection is the result of being seen and valued."', type: 'vulnerability', expert: 'brown', duration: '15 min' });
      break;
    case 2:
      weeklyGoals.push({ text: 'Express 7 genuine, specific compliments this week — one per day', why: 'Gottman\'s Fondness & Admiration system: deliberately scanning for what\'s right rewires your perception of your partner.' });
      baseActivities.wednesday.push({ text: 'Write a short note of appreciation and leave it where your partner will find it', why: 'Chapman: for Words of Affirmation speakers, written words carry extra weight because they can be re-read. Even if it\'s not their primary language, surprise notes delight everyone.', type: 'appreciation', expert: 'chapman', duration: '5 min' });
      break;
    case 3:
      weeklyGoals.push({ text: 'Track and respond to 10 bids for connection this week', why: 'Gottman: couples who "turn toward" bids 86% of the time stay together. Couples who turn toward only 33% of the time divorce.' });
      baseActivities.thursday.push({ text: 'Notice and turn towards one bid for connection today — even small ones (a sigh, a comment about their day, a touch)', why: 'Gottman: bids are the atoms of connection. Most are tiny and easy to miss. The masters of relationships catch them; the disasters let them pass.', type: 'connection', expert: 'gottman', duration: '1 min' });
      break;
    case 4:
      weeklyGoals.push({ text: 'Practice one repair attempt during a disagreement — use humor, touch, or an agreed-upon signal', why: 'Gottman: the #1 skill of happy couples isn\'t avoiding conflict — it\'s repairing after ruptures. The speed of repair matters more than the severity of the fight.' });
      if (missAreas.includes('patterns')) {
        baseActivities.friday.push({ text: 'Discuss your conflict styles calmly: who tends to pursue, who tends to withdraw? Map the cycle together without blame.', why: 'Sue Johnson (EFT): 80% of couples have a pursue-withdraw cycle. Naming it together transforms "you vs. me" into "us vs. the cycle."', type: 'pattern_awareness', expert: 'johnson', duration: '15 min' });
      }
      break;
    case 5:
      weeklyGoals.push({ text: 'Share one personal dream or goal with your partner and ask about theirs', why: 'Gottman\'s Sound Relationship House: supporting each other\'s life dreams prevents gridlocked conflict and builds shared meaning.' });
      baseActivities.saturday.push({ text: 'Ask your partner: "What\'s a dream you\'ve been quietly holding? How can I support it?"', why: 'Gottman: couples who support each other\'s dreams have deeper friendship and less resentment. Perel: "In good relationships, each person nurtures the other\'s becoming."', type: 'shared_meaning', expert: 'gottman+perel', duration: '15 min' });
      break;
    case 6:
      weeklyGoals.push({ text: 'Establish or reinforce one relationship ritual — a weekly date, morning routine, or bedtime check-in', why: 'Gottman: rituals of connection create predictable moments of togetherness. They\'re the scaffolding of a lasting relationship.' });
      baseActivities.sunday.push({ text: 'Together, write your relationship mission statement: what do you want your partnership to stand for?', why: 'Gottman\'s Shared Meaning system: couples with a shared narrative and purpose weather storms better. Robbins: "Where focus goes, energy flows."', type: 'shared_meaning', expert: 'gottman+robbins', duration: '20 min' });
      weeklyGoals.push({ text: 'Retake assessments together and compare growth — celebrate wins', why: 'Data-driven progress builds confidence. Seeing growth together reinforces the partnership.' });
      break;
  }

  if (missAreas.includes('attachment')) {
    baseActivities.monday.push({ text: 'Practice a 6-second hug when you reunite today — hold on until you both relax into it', why: 'Tatkin: a 6-second embrace triggers oxytocin release and signals safety to the nervous system. It takes attachment from concept to felt experience.', type: 'attachment', expert: 'tatkin', duration: '10 sec' });
    weeklyGoals.push({ text: 'Discuss attachment needs openly — what makes each of you feel secure?', why: 'Johnson (EFT): unspoken attachment needs become protest behaviors. Naming them transforms demand into vulnerability.' });
  }

  if (missAreas.includes('wellness')) {
    baseActivities.thursday.push({ text: 'Practice a calming technique together — 4-7-8 breathing, progressive muscle relaxation, or a guided meditation', why: 'Co-regulation: when partners calm down together, their nervous systems sync. Tatkin: "Your partner is your psychobiological regulator."', type: 'wellness', expert: 'tatkin', duration: '5 min' });
    weeklyGoals.push({ text: 'Support each other\'s self-care — ask "What do you need today?" at least 3 times this week', why: 'Gottman: turning toward your partner\'s needs is the foundation of trust. Small gestures compound.' });
  }

  return { dailyActivities: baseActivities, weeklyGoals };
}

// Generate week plan from individual assessments (solo flow)
function generateSoloWeekPlan(week, assessments) {
  const profile = generateRelationshipProfile(assessments);
  const focusAreas = profile.focusAreas;

  // ═══ POSITIVE LENS TRAINING (every week, non-negotiable) ═══
  // Every single day starts with seeing the good. This rewires the brain.
  const positiveHabits = {
    monday: { task: 'Write down 3 specific things your partner did right this weekend — be detailed, not generic', why: 'Training your brain to scan for positives instead of negatives. The more you look for good, the more you find.', expert: 'gottman' },
    tuesday: { task: 'Send your partner a text right now appreciating something specific they did recently', why: 'Gottman research: couples who express 5 positive interactions for every 1 negative have lasting relationships.', expert: 'gottman' },
    wednesday: { task: 'Catch yourself in one negative thought about your partner today — pause and find what\'s true AND good about them in that moment', why: 'You can\'t control your first thought, but you can control your second. This is the reframe muscle.', expert: 'brown' },
    thursday: { task: 'At dinner, share one thing your partner does that makes your life easier — something you usually take for granted', why: 'Gratitude spoken out loud is 10x more powerful than gratitude kept inside. Let them hear it.', expert: 'gottman' },
    friday: { task: 'Look back at your week and write down your partner\'s best moment — the time they showed up, even in a small way', why: 'Your memory is biased toward negatives. This exercise corrects the record.', expert: 'gottman' },
    saturday: { task: 'Give one genuine, unexpected compliment before noon — not about appearance, about character', why: 'Character compliments ("I admire how patient you are") build deeper connection than surface ones.', expert: 'chapman' },
    sunday: { task: 'Write a 3-sentence "gratitude snapshot" of your partner this week and share it with them', why: 'Weekly reflection cements the positive lens habit. Sharing it creates a virtuous cycle.', expert: 'gottman' },
  };

  const baseActivities = {};
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  for (const day of days) {
    baseActivities[day] = [{ text: positiveHabits[day].task, why: positiveHabits[day].why, type: 'positive_lens' }];
  }

  // ═══ WEEKLY GOALS — specific & measurable ═══
  const weeklyGoals = [
    { text: 'Complete your daily log every day this week (7/7)', why: 'Consistency builds self-awareness. You can\'t improve what you don\'t measure.' },
    { text: 'Hit a 5:1 positive-to-negative interaction ratio by Friday', why: 'Gottman\'s "magic ratio" — couples who maintain 5:1 during conflict stay together 94% of the time.' },
  ];

  switch (week) {
    case 1: // Focus: Self-Awareness — Know YOUR patterns
      weeklyGoals.push({ text: 'Write down 3 moments this week where you felt triggered — name the emotion underneath the reaction (anger usually hides hurt or fear)', why: 'Self-awareness is step 1. You can\'t change a pattern you can\'t see.' });
      baseActivities.tuesday.push({ text: 'After your next emotional reaction, write: "I felt ___ because ___ and what I actually needed was ___"', why: 'Most arguments aren\'t about what they\'re about. This exercise finds the real need underneath.', type: 'self_awareness', expert: 'johnson' });
      baseActivities.thursday.push({ text: 'Ask yourself: "Am I reacting to what\'s happening NOW, or to an old wound?" Write the honest answer.', why: 'We often bring old pain into new moments. Separating past from present is emotional maturity.', type: 'self_awareness', expert: 'johnson' });
      break;
    case 2: // Focus: Communication — Say what you mean without blame
      weeklyGoals.push({ text: 'Replace 5 "You always/never..." statements with "I feel ___ when ___ because I need ___"', why: '"You" statements trigger defensiveness. "I" statements invite understanding. Same message, completely different reception.' });
      baseActivities.wednesday.push({ text: 'Take one complaint you have and rewrite it: "Instead of ___ I wish you would ___ because it would make me feel ___"', why: 'Complaints attack character. Requests invite change. People resist demands but respond to vulnerability.', type: 'communication', expert: 'gottman' });
      baseActivities.friday.push({ text: 'In your next disagreement, repeat back what your partner said BEFORE responding. Say "What I hear you saying is..."', why: 'Chris Voss calls this "mirroring" — it makes people feel heard and drops their defenses immediately.', type: 'communication', expert: 'voss' });
      break;
    case 3: // Focus: Emotional Regulation — Control YOUR reaction
      weeklyGoals.push({ text: 'Use the 6-second pause technique 3 times this week: feel the trigger → breathe for 6 seconds → THEN respond', why: 'It takes 6 seconds for stress hormones to pass through your brain. Those 6 seconds are where you choose who you want to be.' });
      baseActivities.tuesday.push({ text: 'When you feel flooded (heart racing, wanting to yell or shut down), say "I need 20 minutes" and walk away to self-soothe', why: 'Gottman research: when heart rate exceeds 100 BPM, your IQ drops 30 points. You literally can\'t think straight. Taking a break isn\'t weakness — it\'s wisdom.', type: 'emotional_regulation', expert: 'gottman' });
      baseActivities.thursday.push({ text: 'Write down your go-to defense mechanism (stonewalling, sarcasm, deflecting, blaming) and one thing to do instead', why: 'Everyone has a default. Naming it takes away its power. The replacement habit is what you\'re actually building.', type: 'emotional_regulation', expert: 'brown' });
      break;
    case 4: // Focus: Understanding Patterns — See the cycle
      weeklyGoals.push({ text: 'Map one recurring argument: What triggers it → What you each do → How it ends → What you both actually needed', why: 'Most couples have the same 3-5 fights on repeat. Once you see the cycle, you can interrupt it.' });
      baseActivities.wednesday.push({ text: 'Write about a fight from your PARTNER\'S perspective. What were THEY feeling? What did THEY need?', why: 'Empathy isn\'t agreeing — it\'s understanding. This exercise builds the muscle of seeing through their eyes.', type: 'empathy', expert: 'voss' });
      baseActivities.friday.push({ text: 'Identify your "pursue-withdraw" dynamic: who chases and who retreats? Write how it feels from YOUR side.', why: 'Sue Johnson (EFT): 80% of couples have this pattern. The pursuer feels abandoned, the withdrawer feels overwhelmed. Neither is wrong.', type: 'pattern_awareness', expert: 'johnson' });
      break;
    case 5: // Focus: Personal Growth — Become the partner you want to be
      weeklyGoals.push({ text: 'Write a 1-paragraph description of the partner you want to be in 1 year — specific behaviors, not vague aspirations', why: 'Vision precedes change. If you can\'t describe it clearly, you can\'t build toward it.' });
      baseActivities.saturday.push({ text: 'Ask your partner: "What\'s one thing I could do differently that would mean the world to you?" — listen without defending', why: 'This question takes courage. Receiving the answer without defensiveness takes more. Both are growth.', type: 'vulnerability', expert: 'brown' });
      break;
    case 6: // Focus: Integration — Lock in the habits
      weeklyGoals.push({ text: 'Write a "relationship contract with yourself" — 3 commitments YOU will keep regardless of what your partner does', why: 'This is the core: you work on YOU. Not as leverage, not to earn something — because you decided who you want to be.' });
      baseActivities.sunday.push({ text: 'Write a letter to yourself from 6 weeks ago. What do you know now that you didn\'t then? What habit has stuck?', why: 'Reflection cements growth. Seeing your own progress builds confidence to keep going.', type: 'integration', expert: 'robbins' });
      weeklyGoals.push({ text: 'Retake your initial assessments and compare scores — celebrate progress, identify next focus area', why: 'Data doesn\'t lie. Seeing your growth quantified is deeply motivating.' });
      break;
    default:
      break;
  }

  if (focusAreas.includes('attachment')) {
    baseActivities.monday.push({ text: 'When you feel anxious about your relationship today, write down: "The story I\'m telling myself is ___ but the evidence says ___"', why: 'Anxious attachment creates catastrophic narratives. Checking them against reality is how you build security from within.', type: 'attachment', expert: 'brown+johnson' });
    weeklyGoals.push({ text: 'Identify 3 times your attachment style drove your behavior this week — anxious reaching or avoidant pulling away', why: 'Awareness of your attachment patterns is the first step to earning secure attachment.' });
  }

  if (focusAreas.includes('communication')) {
    baseActivities.thursday.push({ text: 'In one conversation today, only ask questions for 5 minutes straight. No statements, no advice, just curious questions.', why: 'Most people listen to respond, not to understand. Pure curiosity is the most powerful communication tool.', type: 'communication', expert: 'voss' });
    weeklyGoals.push({ text: 'Go 3 conversations this week without interrupting — let them finish completely before you speak', why: 'Interrupting says "my thoughts matter more." Waiting says "I respect your voice." Small shift, massive impact.' });
  }

  return { dailyActivities: baseActivities, weeklyGoals };
}

module.exports = router;
