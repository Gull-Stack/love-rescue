/**
 * Skill Tree API (Improvement 16)
 * RPG-style skill tree with 3 parallel paths:
 * Communication Mastery, Emotional Regulation, Attachment Security
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Skill Tree Data ─────────────────────────────────────────────────────────

const SKILL_TREES = {
  communication_mastery: {
    id: 'communication_mastery',
    name: 'Communication Mastery',
    icon: 'chat',
    color: '#1976d2',
    levels: [
      {
        level: 1,
        name: 'Foundation',
        techniques: [
          {
            id: 'cm_gentle_startup',
            name: 'Gentle Startup',
            description: 'Begin difficult conversations softly — complain without blame.',
            why: 'Harsh startups predict conversation failure 96% of the time. Starting gently keeps your partner\'s defenses down so they can actually hear you.',
            expert: 'Dr. John Gottman',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Start with "I" instead of "You" (e.g., "I feel..." not "You always...")',
              'Describe the situation without judgment',
              'Express what you need positively (what you want, not what you don\'t want)',
              'Be polite — add "please" and appreciation',
            ],
          },
          {
            id: 'cm_active_listening',
            name: 'Active Listening',
            description: 'Listen to understand, not to respond. Reflect back what you hear.',
            why: 'When people feel heard, their physiological arousal decreases and they become more open to influence.',
            expert: 'Dr. John Gottman',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Put away distractions and make eye contact',
              'Let your partner finish before responding',
              'Summarize what you heard: "So what you\'re saying is..."',
              'Ask "Did I get that right?" before sharing your perspective',
            ],
          },
          {
            id: 'cm_labeling',
            name: 'Tactical Labeling',
            description: 'Name the emotion you observe in your partner to defuse tension.',
            why: 'Labeling emotions activates the prefrontal cortex and reduces amygdala activity — literally calming the brain.',
            expert: 'Chris Voss',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Observe your partner\'s body language and tone',
              'Use phrases like "It seems like..." or "It sounds like..."',
              'Wait after labeling — let silence do the work',
              'Don\'t follow up with "but..." — just label and listen',
            ],
          },
        ],
      },
      {
        level: 2,
        name: 'Intermediate',
        techniques: [
          {
            id: 'cm_repair_attempt',
            name: 'Repair Attempts',
            description: 'Use humor, affection, or de-escalation to prevent negativity from spiraling.',
            why: 'The success of repair attempts — not the absence of conflict — is the primary predictor of relationship stability.',
            expert: 'Dr. John Gottman',
            prereqs: ['cm_gentle_startup'],
            uses_required: 5,
            practice_steps: [
              'Recognize when tension is rising (heart rate above 100 BPM)',
              'Use a pre-agreed phrase or gesture to signal "let\'s pause"',
              'Try humor: "Can we rewind? I want a do-over on that"',
              'Accept your partner\'s repair attempts — don\'t dismiss them',
            ],
          },
          {
            id: 'cm_mirroring',
            name: 'Calibrated Mirroring',
            description: 'Repeat the last few words or key phrase your partner said to encourage elaboration.',
            why: 'Mirroring triggers a mirroring instinct in the speaker — they feel compelled to elaborate and explain, deepening understanding.',
            expert: 'Chris Voss',
            prereqs: ['cm_labeling'],
            uses_required: 5,
            practice_steps: [
              'Listen for the most emotionally charged phrase',
              'Repeat just those 2-3 words with a curious tone',
              'Stay silent after — let them fill the space',
              'Practice in low-stakes conversations first',
            ],
          },
        ],
      },
      {
        level: 3,
        name: 'Advanced',
        techniques: [
          {
            id: 'cm_dreams_within_conflict',
            name: 'Dreams Within Conflict',
            description: 'Explore the deeper dreams and values behind your partner\'s position on perpetual problems.',
            why: '69% of relationship problems are perpetual. They\'re not solvable — but understanding the dream behind the position transforms gridlock into dialogue.',
            expert: 'Dr. John Gottman',
            prereqs: ['cm_repair_attempt', 'cm_mirroring'],
            uses_required: 5,
            practice_steps: [
              'Ask "What does this mean to you?" about a recurring disagreement',
              'Listen for underlying values, history, or identity needs',
              'Share your own dream: "For me, this connects to..."',
              'Look for areas of flexibility vs. non-negotiable core needs',
            ],
          },
          {
            id: 'cm_accusations_audit',
            name: 'Accusations Audit',
            description: 'Proactively list every negative thing your partner might think about your position before they say it.',
            why: 'By voicing the accusations first, you defuse them. What isn\'t said holds more power than what is said.',
            expert: 'Chris Voss',
            prereqs: ['cm_labeling', 'cm_mirroring'],
            uses_required: 5,
            practice_steps: [
              'Before a hard conversation, list all possible criticisms of your position',
              'Open with: "You probably think I\'m being [selfish/unfair/dismissive]..."',
              'Don\'t argue against the accusations — just name them',
              'Watch your partner\'s reaction — often they\'ll say "No, it\'s not that bad"',
            ],
          },
        ],
      },
    ],
  },

  emotional_regulation: {
    id: 'emotional_regulation',
    name: 'Emotional Regulation',
    icon: 'psychology',
    color: '#9c27b0',
    levels: [
      {
        level: 1,
        name: 'Foundation',
        techniques: [
          {
            id: 'er_self_soothing',
            name: 'Self-Soothing',
            description: 'Take a 20-minute physiological break when flooded, then return to the conversation.',
            why: 'When heart rate exceeds 100 BPM (flooding), the prefrontal cortex shuts down. You literally cannot think clearly. A 20-minute break resets your nervous system.',
            expert: 'Dr. John Gottman',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Notice physical signs of flooding: racing heart, clenched jaw, tight chest',
              'Say "I need 20 minutes to calm down, then I want to continue this"',
              'Do NOT ruminate during the break — read, walk, or breathe',
              'Return and re-engage: "I\'m ready to talk about this now"',
            ],
          },
          {
            id: 'er_emotional_naming',
            name: 'Emotion Naming',
            description: 'Identify and name your own emotions with specificity rather than acting on them.',
            why: 'Research shows that simply naming an emotion ("I feel anxious" vs. feeling anxious) reduces its intensity by up to 50%. Name it to tame it.',
            expert: 'Dr. Brené Brown',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Pause when you notice a strong reaction',
              'Move beyond "fine/bad/angry" — get specific: frustrated, disappointed, scared',
              'Say it out loud or write it: "I am feeling [specific emotion]"',
              'Notice how naming it creates a small gap between you and the feeling',
            ],
          },
        ],
      },
      {
        level: 2,
        name: 'Intermediate',
        techniques: [
          {
            id: 'er_vulnerability_window',
            name: 'Vulnerability Window',
            description: 'Share what\'s underneath the anger — the hurt, fear, or sadness driving the protective emotion.',
            why: 'Anger is a secondary emotion. Underneath every anger is a more vulnerable feeling. Sharing that vulnerability invites connection instead of conflict.',
            expert: 'Dr. Brené Brown',
            prereqs: ['er_emotional_naming'],
            uses_required: 5,
            practice_steps: [
              'When angry, ask yourself: "What am I really afraid of here?"',
              'Practice the formula: "I\'m acting angry, but really I feel [scared/hurt/lonely]"',
              'Share with your partner when you feel safe enough',
              'Start small — vulnerability is a muscle that strengthens with use',
            ],
          },
          {
            id: 'er_softened_startup',
            name: 'Physiological Reset',
            description: 'Use breathing techniques to manually shift from sympathetic (fight/flight) to parasympathetic (calm) nervous system.',
            why: 'Box breathing activates the vagus nerve, which directly counter-acts the stress response. It\'s the fastest way to shift your physiology.',
            expert: 'Dr. John Gottman',
            prereqs: ['er_self_soothing'],
            uses_required: 5,
            practice_steps: [
              'Inhale for 4 counts through your nose',
              'Hold for 4 counts',
              'Exhale for 4 counts through your mouth',
              'Hold for 4 counts — repeat 4 cycles',
            ],
          },
        ],
      },
      {
        level: 3,
        name: 'Advanced',
        techniques: [
          {
            id: 'er_shame_resilience',
            name: 'Shame Resilience',
            description: 'Recognize shame triggers and practice the 4-step shame resilience process.',
            why: 'Shame corrodes relationships. People in shame either withdraw or attack. Shame resilience lets you stay connected through difficult moments.',
            expert: 'Dr. Brené Brown',
            prereqs: ['er_vulnerability_window'],
            uses_required: 5,
            practice_steps: [
              'Recognize shame: physical warmth, desire to hide, feeling "small"',
              'Reality check: "Is this shame speaking or is this actually true?"',
              'Reach out: share with someone who has earned the right to hear your story',
              'Speak shame: naming it out loud reduces its grip ("I\'m feeling shame about...")',
            ],
          },
          {
            id: 'er_emotional_coregulation',
            name: 'Emotional Co-regulation',
            description: 'Help your partner regulate their emotions through your own calm, steady presence.',
            why: 'Nervous systems are contagious. When one partner stays calm and present, the other partner\'s nervous system will naturally start to settle.',
            expert: 'Dr. John Gottman',
            prereqs: ['er_self_soothing', 'er_vulnerability_window'],
            uses_required: 5,
            practice_steps: [
              'When your partner is upset, slow your own breathing first',
              'Lower your voice and slow your speech',
              'Offer physical comfort if welcome: hand on shoulder, sitting close',
              'Validate without fixing: "That sounds really hard. I\'m here."',
            ],
          },
        ],
      },
    ],
  },

  attachment_security: {
    id: 'attachment_security',
    name: 'Attachment Security',
    icon: 'favorite',
    color: '#e91e63',
    levels: [
      {
        level: 1,
        name: 'Foundation',
        techniques: [
          {
            id: 'as_bids_for_connection',
            name: 'Turning Toward Bids',
            description: 'Recognize and respond to your partner\'s small bids for emotional connection.',
            why: 'Couples who turn toward bids 86% of the time stay together. Those who turn toward only 33% of the time divorce within 6 years.',
            expert: 'Dr. John Gottman',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Notice small bids: "Look at this sunset", a sigh, reaching for your hand',
              'Turn TOWARD: acknowledge, engage, show interest',
              'Avoid turning AWAY (ignoring) or turning AGAINST (dismissing)',
              'Track: aim for 5+ conscious turn-towards moments daily',
            ],
          },
          {
            id: 'as_protest_decoding',
            name: 'Protest Behavior Decoding',
            description: 'Recognize when withdrawal, anger, or clinginess is actually a cry for connection.',
            why: 'What looks like irrational behavior is often a protest against disconnection. Understanding this transforms fights into reconnection opportunities.',
            expert: 'Dr. Amir Levine',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'When your partner acts out, ask: "Are they protesting disconnection?"',
              'Common protests: excessive texting, silent treatment, picking fights',
              'Respond to the need underneath: "Are you needing reassurance from me?"',
              'Learn your own protest behaviors and name them to your partner',
            ],
          },
          {
            id: 'as_safe_haven',
            name: 'Safe Haven Rituals',
            description: 'Create daily rituals of connection that signal "I am here for you."',
            why: 'Rituals of connection build the secure base that attachment theory identifies as essential for healthy relationships.',
            expert: 'Dr. Sue Johnson',
            prereqs: [],
            uses_required: 5,
            practice_steps: [
              'Create a meaningful hello and goodbye ritual (6-second kiss, eye contact)',
              'Establish a daily "How was your day?" conversation (stress-reducing)',
              'Weekly date ritual — even 30 minutes of undivided attention',
              'Bedtime ritual: express one appreciation before sleep',
            ],
          },
        ],
      },
      {
        level: 2,
        name: 'Intermediate',
        techniques: [
          {
            id: 'as_hold_me_tight',
            name: 'Hold Me Tight Conversation',
            description: 'Follow the structured EFT conversation to reach the vulnerable emotions driving disconnection.',
            why: 'The Hold Me Tight conversation is the core change event in Emotionally Focused Therapy — the most researched couples therapy with 70-75% success rate.',
            expert: 'Dr. Sue Johnson',
            prereqs: ['as_safe_haven'],
            uses_required: 5,
            practice_steps: [
              'Identify the negative cycle: "When you [withdraw], I [pursue] because I feel [abandoned]"',
              'Share the deeper emotion: "Under my anger is a fear that I don\'t matter to you"',
              'Ask for what you need: "I need to know you\'re still here with me"',
              'Listen to your partner\'s deeper emotion without defending',
            ],
          },
          {
            id: 'as_wired_for_love',
            name: 'Couple Bubble',
            description: 'Create a mutual agreement to prioritize each other\'s safety and security above all else.',
            why: 'The couple bubble is a mutual pact of protection. When both partners commit to the bubble, threat vigilance decreases and trust deepens.',
            expert: 'Dr. Stan Tatkin',
            prereqs: ['as_bids_for_connection'],
            uses_required: 5,
            practice_steps: [
              'Agree: "We come first. We protect each other from the world."',
              'Handle transitions carefully — reunions after work, waking up, leaving',
              'Never threaten the relationship during fights ("Maybe we should break up")',
              'Make decisions as a team: "How does this affect us?"',
            ],
          },
        ],
      },
      {
        level: 3,
        name: 'Advanced',
        techniques: [
          {
            id: 'as_earned_security',
            name: 'Earned Secure Attachment',
            description: 'Actively work to shift insecure attachment patterns toward earned security through consistent practice.',
            why: 'Attachment style is not fixed. Through consistent positive experiences with a responsive partner, insecure attachment can shift to "earned security."',
            expert: 'Dr. Amir Levine',
            prereqs: ['as_hold_me_tight', 'as_wired_for_love'],
            uses_required: 5,
            practice_steps: [
              'Identify your attachment style (anxious, avoidant, or disorganized)',
              'Practice the opposite: if avoidant, lean into closeness; if anxious, practice self-soothing',
              'Choose secure behaviors even when they feel uncomfortable',
              'Track progress: notice when old patterns arise and consciously choose differently',
            ],
          },
          {
            id: 'as_forgiveness_ritual',
            name: 'Attachment Injury Repair',
            description: 'Heal deep attachment wounds through structured acknowledgment, empathy, and reconnection.',
            why: 'Unhealed attachment injuries become the raw spots that keep triggering the same fights. Repairing them removes the emotional charge.',
            expert: 'Dr. Sue Johnson',
            prereqs: ['as_hold_me_tight'],
            uses_required: 5,
            practice_steps: [
              'The hurt partner describes the injury and its impact fully',
              'The other partner listens without defending and acknowledges the pain',
              'Express genuine remorse: "I can see how that hurt you and I\'m sorry"',
              'Create a new narrative together: "What we learned from that experience"',
            ],
          },
        ],
      },
    ],
  },
};

/**
 * GET /api/skill-tree
 * Returns full tree with user progress
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's skill progress from metadata
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    const metadata = user?.metadata || {};
    const skillProgress = metadata.skillProgress || {};

    // Build tree with user progress overlaid
    const trees = Object.values(SKILL_TREES).map((tree) => ({
      ...tree,
      levels: tree.levels.map((level) => ({
        ...level,
        techniques: level.techniques.map((technique) => {
          const progress = skillProgress[technique.id] || { uses: 0, history: [] };
          const prereqsMet = technique.prereqs.every((prereqId) => {
            const prereqProgress = skillProgress[prereqId] || { uses: 0 };
            const prereqTechnique = findTechnique(prereqId);
            return prereqProgress.uses >= (prereqTechnique?.uses_required || 5);
          });

          let status = 'locked';
          if (technique.prereqs.length === 0 || prereqsMet) {
            status = progress.uses >= technique.uses_required ? 'mastered' : 'in_progress';
          }

          return {
            ...technique,
            status,
            uses: progress.uses,
            effectiveness: progress.effectiveness || null,
            history: progress.history || [],
          };
        }),
      })),
    }));

    res.json({ trees });
  } catch (error) {
    logger.error('Skill tree fetch error:', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/skill-tree/practice
 * Log a technique practice
 */
router.post('/practice', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { techniqueId, notes, effectivenessRating } = req.body;

    if (!techniqueId) {
      return res.status(400).json({ error: 'techniqueId is required' });
    }

    // Validate technique exists
    const technique = findTechnique(techniqueId);
    if (!technique) {
      return res.status(400).json({ error: 'Invalid technique ID' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    const metadata = user?.metadata || {};
    const skillProgress = metadata.skillProgress || {};
    const progress = skillProgress[techniqueId] || { uses: 0, history: [], totalEffectiveness: 0 };

    // Check prereqs are met
    const prereqsMet = technique.prereqs.every((prereqId) => {
      const prereqProgress = skillProgress[prereqId] || { uses: 0 };
      const prereqTechnique = findTechnique(prereqId);
      return prereqProgress.uses >= (prereqTechnique?.uses_required || 5);
    });

    if (technique.prereqs.length > 0 && !prereqsMet) {
      return res.status(400).json({ error: 'Prerequisites not met' });
    }

    // Update progress
    progress.uses += 1;
    progress.history.push({
      date: new Date().toISOString(),
      notes: notes || null,
      effectiveness: effectivenessRating || null,
    });

    // Keep only last 20 history entries
    if (progress.history.length > 20) {
      progress.history = progress.history.slice(-20);
    }

    // Calculate average effectiveness
    if (effectivenessRating) {
      progress.totalEffectiveness = (progress.totalEffectiveness || 0) + effectivenessRating;
      const ratedCount = progress.history.filter((h) => h.effectiveness).length;
      progress.effectiveness = Math.round(progress.totalEffectiveness / ratedCount);
    }

    skillProgress[techniqueId] = progress;

    await req.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...metadata,
          skillProgress,
        },
      },
    });

    // Determine new status
    const mastered = progress.uses >= technique.uses_required;
    const justMastered = mastered && progress.uses === technique.uses_required;

    res.json({
      message: justMastered ? `New capability installed: ${technique.name}` : 'Practice logged',
      techniqueId,
      uses: progress.uses,
      uses_required: technique.uses_required,
      mastered,
      justMastered,
      effectiveness: progress.effectiveness,
    });
  } catch (error) {
    logger.error('Skill tree practice error:', { error: error.message });
    next(error);
  }
});

// Helper to find a technique across all trees
function findTechnique(id) {
  for (const tree of Object.values(SKILL_TREES)) {
    for (const level of tree.levels) {
      for (const technique of level.techniques) {
        if (technique.id === id) return technique;
      }
    }
  }
  return null;
}

module.exports = router;
