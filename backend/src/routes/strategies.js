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

// Generate week plan from matchup data (partnered flow)
function generateMatchupWeekPlan(week, matchup) {
  const misses = matchup.alignments?.misses || [];
  const missAreas = misses.map(m => m.area);

  const baseActivities = {
    monday: ['Log 3 positive interactions you had today'],
    tuesday: ['Ask one open-ended question about your partner\'s day'],
    wednesday: ['Express appreciation for something specific your partner did'],
    thursday: ['Log your interaction ratio for the week so far'],
    friday: ['Plan one meaningful activity together for the weekend'],
    saturday: ['Spend 20 minutes of uninterrupted time together'],
    sunday: ['Reflect on the week and discuss what went well']
  };

  const weeklyGoals = ['Complete daily prompts', 'Maintain 5:1 positive ratio'];

  switch (week) {
    case 1:
      weeklyGoals.push('Learn 3 new things about your partner');
      baseActivities.tuesday.push('Share a childhood memory');
      break;
    case 2:
      weeklyGoals.push('Express 7 genuine compliments this week');
      baseActivities.wednesday.push('Write a short note of appreciation');
      break;
    case 3:
      weeklyGoals.push('Track and respond to 10 bids for connection');
      baseActivities.thursday.push('Notice and turn towards one bid today');
      break;
    case 4:
      weeklyGoals.push('Practice one repair attempt during a disagreement');
      if (missAreas.includes('patterns')) {
        baseActivities.friday.push('Discuss your conflict styles calmly');
      }
      break;
    case 5:
      weeklyGoals.push('Discuss one personal dream or goal with your partner');
      baseActivities.saturday.push('Ask about your partner\'s hopes for the future');
      break;
    case 6:
      weeklyGoals.push('Establish or reinforce one relationship ritual');
      baseActivities.sunday.push('Discuss what you want your relationship to stand for');
      weeklyGoals.push('Prepare for reassessment next week');
      break;
  }

  if (missAreas.includes('attachment')) {
    baseActivities.monday.push('Practice a 6-second hug');
    weeklyGoals.push('Discuss attachment needs openly');
  }

  if (missAreas.includes('wellness')) {
    baseActivities.thursday.push('Practice a calming technique together');
    weeklyGoals.push('Support each other\'s self-care');
  }

  return { dailyActivities: baseActivities, weeklyGoals };
}

// Generate week plan from individual assessments (solo flow)
function generateSoloWeekPlan(week, assessments) {
  const assessmentsByType = {};
  for (const a of assessments) {
    if (!assessmentsByType[a.type] || a.completedAt > assessmentsByType[a.type].completedAt) {
      assessmentsByType[a.type] = a;
    }
  }

  const focusAreas = [];
  const gottman = assessmentsByType.gottman;
  const eft = assessmentsByType.eft;
  const prep = assessmentsByType.prep;

  if (gottman?.score) {
    const scores = gottman.score;
    if (scores.friendship < 70) focusAreas.push('friendship');
    if (scores.conflict < 70) focusAreas.push('conflict');
    if (scores.meaning < 70) focusAreas.push('meaning');
  }
  if (eft?.score?.attachment) {
    focusAreas.push('attachment');
  }
  if (prep?.score?.communication && prep.score.communication < 70) {
    focusAreas.push('communication');
  }

  // ═══ POSITIVE LENS TRAINING (every week, non-negotiable) ═══
  // Every single day starts with seeing the good. This rewires the brain.
  const positiveHabits = {
    monday: { task: 'Write down 3 specific things your partner did right this weekend — be detailed, not generic', why: 'Training your brain to scan for positives instead of negatives. The more you look for good, the more you find.' },
    tuesday: { task: 'Send your partner a text right now appreciating something specific they did recently', why: 'Gottman research: couples who express 5 positive interactions for every 1 negative have lasting relationships.' },
    wednesday: { task: 'Catch yourself in one negative thought about your partner today — pause and find what\'s true AND good about them in that moment', why: 'You can\'t control your first thought, but you can control your second. This is the reframe muscle.' },
    thursday: { task: 'At dinner, share one thing your partner does that makes your life easier — something you usually take for granted', why: 'Gratitude spoken out loud is 10x more powerful than gratitude kept inside. Let them hear it.' },
    friday: { task: 'Look back at your week and write down your partner\'s best moment — the time they showed up, even in a small way', why: 'Your memory is biased toward negatives. This exercise corrects the record.' },
    saturday: { task: 'Give one genuine, unexpected compliment before noon — not about appearance, about character', why: 'Character compliments ("I admire how patient you are") build deeper connection than surface ones.' },
    sunday: { task: 'Write a 3-sentence "gratitude snapshot" of your partner this week and share it with them', why: 'Weekly reflection cements the positive lens habit. Sharing it creates a virtuous cycle.' },
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
      baseActivities.tuesday.push({ text: 'After your next emotional reaction, write: "I felt ___ because ___ and what I actually needed was ___"', why: 'Most arguments aren\'t about what they\'re about. This exercise finds the real need underneath.' });
      baseActivities.thursday.push({ text: 'Ask yourself: "Am I reacting to what\'s happening NOW, or to an old wound?" Write the honest answer.', why: 'We often bring old pain into new moments. Separating past from present is emotional maturity.' });
      break;
    case 2: // Focus: Communication — Say what you mean without blame
      weeklyGoals.push({ text: 'Replace 5 "You always/never..." statements with "I feel ___ when ___ because I need ___"', why: '"You" statements trigger defensiveness. "I" statements invite understanding. Same message, completely different reception.' });
      baseActivities.wednesday.push({ text: 'Take one complaint you have and rewrite it: "Instead of ___ I wish you would ___ because it would make me feel ___"', why: 'Complaints attack character. Requests invite change. People resist demands but respond to vulnerability.' });
      baseActivities.friday.push({ text: 'In your next disagreement, repeat back what your partner said BEFORE responding. Say "What I hear you saying is..."', why: 'Chris Voss calls this "mirroring" — it makes people feel heard and drops their defenses immediately.' });
      break;
    case 3: // Focus: Emotional Regulation — Control YOUR reaction
      weeklyGoals.push({ text: 'Use the 6-second pause technique 3 times this week: feel the trigger → breathe for 6 seconds → THEN respond', why: 'It takes 6 seconds for stress hormones to pass through your brain. Those 6 seconds are where you choose who you want to be.' });
      baseActivities.tuesday.push({ text: 'When you feel flooded (heart racing, wanting to yell or shut down), say "I need 20 minutes" and walk away to self-soothe', why: 'Gottman research: when heart rate exceeds 100 BPM, your IQ drops 30 points. You literally can\'t think straight. Taking a break isn\'t weakness — it\'s wisdom.' });
      baseActivities.thursday.push({ text: 'Write down your go-to defense mechanism (stonewalling, sarcasm, deflecting, blaming) and one thing to do instead', why: 'Everyone has a default. Naming it takes away its power. The replacement habit is what you\'re actually building.' });
      break;
    case 4: // Focus: Understanding Patterns — See the cycle
      weeklyGoals.push({ text: 'Map one recurring argument: What triggers it → What you each do → How it ends → What you both actually needed', why: 'Most couples have the same 3-5 fights on repeat. Once you see the cycle, you can interrupt it.' });
      baseActivities.wednesday.push({ text: 'Write about a fight from your PARTNER\'S perspective. What were THEY feeling? What did THEY need?', why: 'Empathy isn\'t agreeing — it\'s understanding. This exercise builds the muscle of seeing through their eyes.' });
      baseActivities.friday.push({ text: 'Identify your "pursue-withdraw" dynamic: who chases and who retreats? Write how it feels from YOUR side.', why: 'Sue Johnson (EFT): 80% of couples have this pattern. The pursuer feels abandoned, the withdrawer feels overwhelmed. Neither is wrong.' });
      break;
    case 5: // Focus: Personal Growth — Become the partner you want to be
      weeklyGoals.push({ text: 'Write a 1-paragraph description of the partner you want to be in 1 year — specific behaviors, not vague aspirations', why: 'Vision precedes change. If you can\'t describe it clearly, you can\'t build toward it.' });
      baseActivities.saturday.push({ text: 'Ask your partner: "What\'s one thing I could do differently that would mean the world to you?" — listen without defending', why: 'This question takes courage. Receiving the answer without defensiveness takes more. Both are growth.' });
      break;
    case 6: // Focus: Integration — Lock in the habits
      weeklyGoals.push({ text: 'Write a "relationship contract with yourself" — 3 commitments YOU will keep regardless of what your partner does', why: 'This is the core: you work on YOU. Not as leverage, not to earn something — because you decided who you want to be.' });
      baseActivities.sunday.push({ text: 'Write a letter to yourself from 6 weeks ago. What do you know now that you didn\'t then? What habit has stuck?', why: 'Reflection cements growth. Seeing your own progress builds confidence to keep going.' });
      weeklyGoals.push({ text: 'Retake your initial assessments and compare scores — celebrate progress, identify next focus area', why: 'Data doesn\'t lie. Seeing your growth quantified is deeply motivating.' });
      break;
    default:
      break;
  }

  if (focusAreas.includes('attachment')) {
    baseActivities.monday.push({ text: 'When you feel anxious about your relationship today, write down: "The story I\'m telling myself is ___ but the evidence says ___"', why: 'Anxious attachment creates catastrophic narratives. Checking them against reality is how you build security from within.' });
    weeklyGoals.push({ text: 'Identify 3 times your attachment style drove your behavior this week — anxious reaching or avoidant pulling away', why: 'Awareness of your attachment patterns is the first step to earning secure attachment.' });
  }

  if (focusAreas.includes('communication')) {
    baseActivities.thursday.push({ text: 'In one conversation today, only ask questions for 5 minutes straight. No statements, no advice, just curious questions.', why: 'Most people listen to respond, not to understand. Pure curiosity is the most powerful communication tool.' });
    weeklyGoals.push({ text: 'Go 3 conversations this week without interrupting — let them finish completely before you speak', why: 'Interrupting says "my thoughts matter more." Waiting says "I respect your voice." Small shift, massive impact.' });
  }

  return { dailyActivities: baseActivities, weeklyGoals };
}

module.exports = router;
