/**
 * treatmentPlan.js — Treatment Plan Builder for LoveRescue Therapist Edition
 *
 * Enables therapists to assign LoveRescue modules aligned with their therapeutic
 * approach (EFT, Gottman, CBT, psychodynamic, integrative). Maps therapist language
 * to our expert frameworks so every clinician feels like LoveRescue speaks THEIR language.
 *
 * Core API:
 *   generateTreatmentPlanOptions(coupleProfile, therapistApproach) → module recommendations
 *   createTreatmentPlan(therapistId, coupleId, selectedModules, customizations) → structured plan
 *   getTreatmentPlanProgress(planId) → execution tracking + auto-generated progress notes
 *
 * @module treatmentPlan
 */

'use strict';

const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE LIBRARY — Every assignable unit in LoveRescue
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The complete module library. Each module maps to curriculum content, expert
 * frameworks, and target assessments. Therapists browse and assign from this.
 */
const MODULE_LIBRARY = {

  // ─── CURRICULUM MODULES (Weeks 1-6) ───────────────────────────────────────

  'week-1-self-awareness': {
    id: 'week-1-self-awareness',
    name: 'Self-Awareness & Pattern Recognition',
    description: 'Clients identify their attachment style, emotional triggers, and default reaction patterns. Builds the foundation of self-observation without judgment.',
    category: 'curriculum',
    curriculumWeek: 1,
    stage: 'assess',
    expertFrameworks: ['levine', 'johnson', 'brown'],
    primaryExpert: 'levine',
    targetAssessments: ['attachment', 'eft'],
    estimatedDuration: { days: 7, activitiesPerDay: 2 },
    difficulty: 1,
    skills: ['emotional-awareness', 'trigger-identification', 'attachment-recognition'],
    prerequisites: [],
    milestones: [
      { name: 'Attachment Style Identified', metric: 'assessment_completed', target: 'attachment' },
      { name: 'Trigger Journal Started', metric: 'activities_completed', target: 3 },
      { name: 'Pattern Named', metric: 'reflection_submitted', target: 1 },
    ],
  },

  'week-2-communication': {
    id: 'week-2-communication',
    name: 'Communication Foundations',
    description: 'Replace blame-based language with needs-based expression. Learn gentle startup, tactical empathy, and the art of listening without fixing.',
    category: 'curriculum',
    curriculumWeek: 2,
    stage: 'learn',
    expertFrameworks: ['gottman', 'voss', 'johnson'],
    primaryExpert: 'gottman',
    targetAssessments: ['prep', 'gottman'],
    estimatedDuration: { days: 7, activitiesPerDay: 2 },
    difficulty: 2,
    skills: ['gentle-startup', 'tactical-empathy', 'i-statements', 'active-listening'],
    prerequisites: ['week-1-self-awareness'],
    milestones: [
      { name: '5 "You" → "I" Conversions', metric: 'activities_completed', target: 5 },
      { name: 'Communication Score Improved', metric: 'assessment_delta', target: { assessment: 'prep', minDelta: 5 } },
      { name: 'Gentle Startup Practiced', metric: 'technique_used', target: 'gottman-gentle-startup' },
    ],
  },

  'week-3-emotional-regulation': {
    id: 'week-3-emotional-regulation',
    name: 'Emotional Regulation & Horsemen Antidotes',
    description: 'Master the 6-second pause, identify your dominant horseman, and learn its specific antidote. Build the muscle between trigger and response.',
    category: 'curriculum',
    curriculumWeek: 3,
    stage: 'practice',
    expertFrameworks: ['gottman', 'johnson', 'brown'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 7, activitiesPerDay: 3 },
    difficulty: 3,
    skills: ['six-second-pause', 'horseman-antidotes', 'self-soothing', 'flooding-protocol'],
    prerequisites: ['week-2-communication'],
    milestones: [
      { name: '6-Second Pause Used 3x', metric: 'technique_used_count', target: { technique: 'six-second-pause', count: 3 } },
      { name: 'Dominant Horseman Antidote Practiced', metric: 'activities_completed', target: 3 },
      { name: 'Conflict Score Improved', metric: 'assessment_delta', target: { assessment: 'gottman', subscale: 'conflict', minDelta: 5 } },
    ],
  },

  'week-4-cycle-mapping': {
    id: 'week-4-cycle-mapping',
    name: 'Understanding Your Cycle',
    description: 'Map the pursue-withdraw pattern in your relationship. Name each step without blame. Once you see the cycle, you can interrupt it.',
    category: 'curriculum',
    curriculumWeek: 4,
    stage: 'practice',
    expertFrameworks: ['johnson', 'gottman', 'levine'],
    primaryExpert: 'johnson',
    targetAssessments: ['eft', 'attachment'],
    estimatedDuration: { days: 7, activitiesPerDay: 2 },
    difficulty: 3,
    skills: ['cycle-identification', 'de-escalation', 'softening', 'emotional-accessibility'],
    prerequisites: ['week-3-emotional-regulation'],
    milestones: [
      { name: 'Cycle Mapped on Paper', metric: 'reflection_submitted', target: 1 },
      { name: 'One Cycle Interrupted', metric: 'technique_used', target: 'cycle-interruption' },
      { name: 'Attachment Needs Expressed', metric: 'activities_completed', target: 3 },
    ],
  },

  'week-5-connection-growth': {
    id: 'week-5-connection-growth',
    name: 'Connection Rituals & Personal Growth',
    description: 'Build daily rituals that speak your love language. Reclaim individual identity and desire. Bridge Gottman\'s connection science with Perel\'s aliveness.',
    category: 'curriculum',
    curriculumWeek: 5,
    stage: 'practice',
    expertFrameworks: ['gottman', 'perel', 'chapman', 'robbins'],
    primaryExpert: 'chapman',
    targetAssessments: ['love_language', 'gottman'],
    estimatedDuration: { days: 7, activitiesPerDay: 3 },
    difficulty: 3,
    skills: ['ritual-building', 'love-language-translation', 'desire-maintenance', 'identity-growth'],
    prerequisites: ['week-4-cycle-mapping'],
    milestones: [
      { name: 'Connection Ritual Established', metric: 'ritual_created', target: 1 },
      { name: 'Partner Love Language Practiced', metric: 'activities_completed', target: 5 },
      { name: 'Friendship Score Improved', metric: 'assessment_delta', target: { assessment: 'gottman', subscale: 'friendship', minDelta: 5 } },
    ],
  },

  'week-6-integration': {
    id: 'week-6-integration',
    name: 'Integration & Identity Transformation',
    description: 'Lock in new patterns as identity. Write your relationship manifesto. Retake assessments and celebrate measurable growth.',
    category: 'curriculum',
    curriculumWeek: 6,
    stage: 'transform',
    expertFrameworks: ['robbins', 'gottman', 'perel', 'johnson'],
    primaryExpert: 'robbins',
    targetAssessments: ['attachment', 'gottman', 'eft', 'prep', 'love_language'],
    estimatedDuration: { days: 7, activitiesPerDay: 2 },
    difficulty: 4,
    skills: ['identity-shift', 'manifesto-writing', 'shared-meaning', 'progress-measurement'],
    prerequisites: ['week-5-connection-growth'],
    milestones: [
      { name: 'Identity Manifesto Written', metric: 'reflection_submitted', target: 1 },
      { name: 'Assessments Retaken', metric: 'assessment_completed', target: 'all' },
      { name: 'Overall Score Improvement', metric: 'assessment_delta', target: { assessment: 'gottman', minDelta: 10 } },
    ],
  },

  // ─── CRISIS INTERVENTION MODULES ──────────────────────────────────────────

  'crisis-affair-discovery': {
    id: 'crisis-affair-discovery',
    name: 'Affair Discovery Protocol',
    description: 'Immediate stabilization after discovery of infidelity. Self-regulation first, then structured processing. No decisions in acute distress.',
    category: 'crisis',
    stage: 'assess',
    expertFrameworks: ['johnson', 'brown', 'gottman'],
    primaryExpert: 'johnson',
    targetAssessments: ['eft', 'attachment'],
    estimatedDuration: { days: 14, activitiesPerDay: 2 },
    difficulty: 5,
    skills: ['crisis-stabilization', 'shame-resilience', 'trauma-processing', 'boundary-setting'],
    prerequisites: [],
    milestones: [
      { name: 'Nervous System Stabilized', metric: 'mood_stability', target: 'three_consecutive_stable_days' },
      { name: 'Story Named Without Blame', metric: 'reflection_submitted', target: 1 },
      { name: 'Support System Activated', metric: 'activities_completed', target: 3 },
    ],
  },

  'crisis-separation-threat': {
    id: 'crisis-separation-threat',
    name: 'Separation Threat Response',
    description: 'When divorce/separation is on the table. De-escalation, creating safety, making space for the fear underneath the threat.',
    category: 'crisis',
    stage: 'assess',
    expertFrameworks: ['johnson', 'gottman', 'voss'],
    primaryExpert: 'johnson',
    targetAssessments: ['eft', 'gottman'],
    estimatedDuration: { days: 14, activitiesPerDay: 2 },
    difficulty: 5,
    skills: ['de-escalation', 'needs-expression', 'safety-building', 'tactical-empathy'],
    prerequisites: [],
    milestones: [
      { name: 'Immediate Crisis De-escalated', metric: 'crisis_level_decreased', target: true },
      { name: 'Underlying Fear Named', metric: 'reflection_submitted', target: 1 },
      { name: 'Temporary Agreement Reached', metric: 'activities_completed', target: 3 },
    ],
  },

  'crisis-escalated-conflict': {
    id: 'crisis-escalated-conflict',
    name: 'Conflict Escalation Protocol',
    description: 'After a fight spirals out of control. Flooding recovery, repair attempts, and rebuilding safety after rupture.',
    category: 'crisis',
    stage: 'assess',
    expertFrameworks: ['gottman', 'voss', 'johnson'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 7, activitiesPerDay: 2 },
    difficulty: 4,
    skills: ['flooding-recovery', 'repair-attempts', 'self-soothing', 'announced-breaks'],
    prerequisites: [],
    milestones: [
      { name: 'Self-Soothing Practiced', metric: 'technique_used', target: 'self-soothing' },
      { name: 'Repair Attempted', metric: 'technique_used', target: 'repair-attempt' },
      { name: 'Safety Restored', metric: 'mood_stability', target: 'two_consecutive_stable_days' },
    ],
  },

  'crisis-emotional-flooding': {
    id: 'crisis-emotional-flooding',
    name: 'Emotional Flooding Recovery',
    description: 'When the nervous system is overwhelmed and rational thinking goes offline. Body-first regulation, then gradual re-engagement.',
    category: 'crisis',
    stage: 'assess',
    expertFrameworks: ['gottman', 'johnson', 'brown'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman', 'eft'],
    estimatedDuration: { days: 5, activitiesPerDay: 2 },
    difficulty: 3,
    skills: ['physiological-soothing', 'grounding', 'announced-breaks', 'co-regulation'],
    prerequisites: [],
    milestones: [
      { name: 'Heart Rate Below 100 BPM Protocol Used', metric: 'technique_used', target: 'flooding-protocol' },
      { name: 'Announced Break Script Practiced', metric: 'activities_completed', target: 2 },
      { name: 'Re-engagement Successful', metric: 'activities_completed', target: 3 },
    ],
  },

  // ─── MAINTENANCE / POST-COMPLETION MODULES ────────────────────────────────

  'maintenance-morning-evening': {
    id: 'maintenance-morning-evening',
    name: 'Daily Connection Rituals',
    description: 'Morning check-in (2 min) + evening gratitude (3 min). The daily scaffolding that maintains gains after the curriculum ends.',
    category: 'maintenance',
    stage: 'transform',
    expertFrameworks: ['gottman', 'chapman', 'johnson'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 84, activitiesPerDay: 2 },
    difficulty: 1,
    skills: ['love-maps', 'fondness-admiration', 'gratitude-practice'],
    prerequisites: ['week-6-integration'],
    milestones: [
      { name: '7-Day Streak', metric: 'streak', target: 7 },
      { name: '30-Day Streak', metric: 'streak', target: 30 },
      { name: 'Ritual Feels Natural', metric: 'self_report', target: 'habitual' },
    ],
  },

  'maintenance-weekly-state-of-us': {
    id: 'maintenance-weekly-state-of-us',
    name: 'Weekly State of Us',
    description: '15-minute weekly check-in: what went well, what to own, what to request. Prevents erosion by keeping the conversation alive.',
    category: 'maintenance',
    stage: 'transform',
    expertFrameworks: ['perel', 'gottman', 'brown'],
    primaryExpert: 'perel',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 84, activitiesPerDay: 0, weeklyActivities: 1 },
    difficulty: 2,
    skills: ['structured-check-in', 'ownership', 'request-making', 'repair'],
    prerequisites: ['week-6-integration'],
    milestones: [
      { name: '4 Consecutive Weeks', metric: 'weekly_completion_streak', target: 4 },
      { name: 'Both Partners Participating', metric: 'couple_participation', target: true },
      { name: 'Proactive Repair Happening', metric: 'self_report', target: 'proactive' },
    ],
  },

  'maintenance-progressive-deepening': {
    id: 'maintenance-progressive-deepening',
    name: '12-Week Progressive Deepening',
    description: 'The full 12-week maintenance program: building habits → adding vulnerability → stretching comfort zones → becoming the expert. Rituals evolve each week.',
    category: 'maintenance',
    stage: 'transform',
    expertFrameworks: ['gottman', 'perel', 'johnson', 'brown', 'chapman'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman', 'eft', 'attachment'],
    estimatedDuration: { days: 84, activitiesPerDay: 2, weeklyActivities: 1 },
    difficulty: 3,
    skills: ['vulnerability', 'repair', 'novelty', 'curiosity', 'earned-security'],
    prerequisites: ['week-6-integration'],
    milestones: [
      { name: 'Vulnerability Introduced (Week 4)', metric: 'week_reached', target: 4 },
      { name: 'Repair Mastered (Week 6)', metric: 'week_reached', target: 6 },
      { name: 'Self-Designed Ritual (Week 12)', metric: 'ritual_created', target: 1 },
    ],
  },

  // ─── TARGETED SKILL MODULES ───────────────────────────────────────────────

  'skill-four-horsemen': {
    id: 'skill-four-horsemen',
    name: 'Four Horsemen Detox',
    description: 'Intensive focus on identifying and replacing criticism, contempt, defensiveness, and stonewalling with their research-backed antidotes.',
    category: 'skill',
    stage: 'practice',
    expertFrameworks: ['gottman'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 14, activitiesPerDay: 2 },
    difficulty: 3,
    skills: ['horseman-identification', 'complaint-vs-criticism', 'appreciation-culture', 'responsibility-taking', 'self-soothing'],
    prerequisites: ['week-1-self-awareness'],
    milestones: [
      { name: 'All Four Horsemen Identified', metric: 'activities_completed', target: 4 },
      { name: 'Dominant Horseman Antidote Score Improved', metric: 'assessment_delta', target: { assessment: 'gottman', subscale: 'horsemen', minDelta: 10 } },
      { name: '5:1 Ratio Achieved for 3 Days', metric: 'ratio_tracked', target: { ratio: 5, days: 3 } },
    ],
  },

  'skill-attachment-security': {
    id: 'skill-attachment-security',
    name: 'Earned Security Building',
    description: 'For insecure attachment styles: build earned security through structured vulnerability, consistent responsiveness, and A.R.E. (Accessibility, Responsiveness, Engagement).',
    category: 'skill',
    stage: 'practice',
    expertFrameworks: ['johnson', 'levine', 'brown'],
    primaryExpert: 'johnson',
    targetAssessments: ['attachment', 'eft'],
    estimatedDuration: { days: 21, activitiesPerDay: 2 },
    difficulty: 4,
    skills: ['accessibility', 'responsiveness', 'engagement', 'protest-behavior-recognition', 'vulnerability'],
    prerequisites: ['week-1-self-awareness'],
    milestones: [
      { name: 'Attachment Needs Articulated', metric: 'reflection_submitted', target: 1 },
      { name: 'A.R.E. Conversation Completed', metric: 'technique_used', target: 'are-conversation' },
      { name: 'Attachment Security Increased', metric: 'assessment_delta', target: { assessment: 'attachment', direction: 'toward_secure' } },
    ],
  },

  'skill-love-language-fluency': {
    id: 'skill-love-language-fluency',
    name: 'Love Language Fluency',
    description: 'Learn to express love in your partner\'s primary language, not just your own. Daily practice translating intention into their felt experience.',
    category: 'skill',
    stage: 'practice',
    expertFrameworks: ['chapman', 'gottman'],
    primaryExpert: 'chapman',
    targetAssessments: ['love_language', 'gottman'],
    estimatedDuration: { days: 14, activitiesPerDay: 2 },
    difficulty: 2,
    skills: ['language-identification', 'cross-language-expression', 'partner-attunement'],
    prerequisites: [],
    milestones: [
      { name: 'Partner Language Identified', metric: 'assessment_completed', target: 'love_language' },
      { name: '7 Days of Partner-Language Expression', metric: 'streak', target: 7 },
      { name: 'Partner Reports Feeling Loved', metric: 'self_report', target: 'felt_loved' },
    ],
  },

  'skill-cognitive-restructuring': {
    id: 'skill-cognitive-restructuring',
    name: 'Cognitive Restructuring for Couples',
    description: 'Identify and challenge negative thought patterns about your partner and relationship. Replace cognitive distortions with evidence-based reframes.',
    category: 'skill',
    stage: 'learn',
    expertFrameworks: ['gottman', 'robbins', 'brown'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman', 'prep'],
    estimatedDuration: { days: 14, activitiesPerDay: 2 },
    difficulty: 3,
    skills: ['thought-record', 'cognitive-distortion-identification', 'reframing', 'positive-sentiment-override'],
    prerequisites: ['week-1-self-awareness'],
    milestones: [
      { name: 'Thought Record Completed 5x', metric: 'activities_completed', target: 5 },
      { name: 'Top 3 Distortions Identified', metric: 'reflection_submitted', target: 1 },
      { name: 'Positive Sentiment Override Active', metric: 'assessment_delta', target: { assessment: 'gottman', subscale: 'friendship', minDelta: 5 } },
    ],
  },

  'skill-desire-maintenance': {
    id: 'skill-desire-maintenance',
    name: 'Desire & Erotic Intelligence',
    description: 'Perel\'s framework for maintaining desire in committed relationships. Balance security and novelty. Rediscover your partner as a separate, fascinating person.',
    category: 'skill',
    stage: 'practice',
    expertFrameworks: ['perel', 'robbins'],
    primaryExpert: 'perel',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 14, activitiesPerDay: 1 },
    difficulty: 4,
    skills: ['curiosity', 'novelty-creation', 'mystery-maintenance', 'individual-identity'],
    prerequisites: ['week-4-cycle-mapping'],
    milestones: [
      { name: 'Curiosity Conversation Held', metric: 'technique_used', target: 'curiosity-question' },
      { name: 'Novel Experience Shared', metric: 'activities_completed', target: 2 },
      { name: 'Desire Check-In Practiced', metric: 'activities_completed', target: 3 },
    ],
  },

  'skill-repair-mastery': {
    id: 'skill-repair-mastery',
    name: 'Repair Attempt Mastery',
    description: 'The speed and success of repair predicts relationship health better than the absence of conflict. Master 12 repair moves and learn to accept your partner\'s.',
    category: 'skill',
    stage: 'practice',
    expertFrameworks: ['gottman', 'voss', 'johnson'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 14, activitiesPerDay: 2 },
    difficulty: 3,
    skills: ['repair-initiation', 'repair-acceptance', 'humor', 'de-escalation', 'ownership'],
    prerequisites: ['week-3-emotional-regulation'],
    milestones: [
      { name: 'Repair Inventory Completed', metric: 'activities_completed', target: 1 },
      { name: 'Same-Day Repair 5x', metric: 'technique_used_count', target: { technique: 'repair-attempt', count: 5 } },
      { name: 'Repair Acceptance Rate >70%', metric: 'self_report', target: 'repair_accepted_70pct' },
    ],
  },

  'skill-shared-meaning': {
    id: 'skill-shared-meaning',
    name: 'Shared Meaning & Legacy',
    description: 'Build a shared narrative: rituals, roles, goals, and symbols that define who you are as a couple. The top of Gottman\'s Sound Relationship House.',
    category: 'skill',
    stage: 'transform',
    expertFrameworks: ['gottman', 'robbins', 'perel'],
    primaryExpert: 'gottman',
    targetAssessments: ['gottman'],
    estimatedDuration: { days: 14, activitiesPerDay: 1 },
    difficulty: 4,
    skills: ['ritual-creation', 'role-negotiation', 'goal-alignment', 'legacy-building'],
    prerequisites: ['week-5-connection-growth'],
    milestones: [
      { name: 'Shared Rituals Defined', metric: 'activities_completed', target: 3 },
      { name: 'Mission Statement Written', metric: 'reflection_submitted', target: 1 },
      { name: 'Meaning Score Improved', metric: 'assessment_delta', target: { assessment: 'gottman', subscale: 'meaning', minDelta: 5 } },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH MAPPING — Therapeutic orientation → LoveRescue framework mapping
// ═══════════════════════════════════════════════════════════════════════════════

const APPROACH_MAPPINGS = {

  eft: {
    name: 'Emotionally Focused Therapy (EFT)',
    description: 'Attachment-based approach focused on identifying and transforming negative interaction cycles by accessing underlying emotions and attachment needs.',
    primaryExperts: ['johnson', 'levine'],
    secondaryExperts: ['brown', 'gottman'],
    priorityModules: [
      'week-1-self-awareness',
      'week-4-cycle-mapping',
      'skill-attachment-security',
      'week-3-emotional-regulation',
      'skill-repair-mastery',
    ],
    deprioritizedModules: ['skill-cognitive-restructuring', 'skill-desire-maintenance'],
    moduleRationale: {
      'week-1-self-awareness': 'EFT Stage 1 (De-escalation) begins with identifying attachment patterns. Levine\'s attachment framework maps directly to your assessment of each partner\'s attachment style and protest behaviors.',
      'week-4-cycle-mapping': 'The core of EFT — mapping the pursue-withdraw cycle. This module uses Johnson\'s cycle identification framework to help clients see "the dance" from above, moving from "you vs. me" to "us vs. the cycle."',
      'skill-attachment-security': 'A.R.E. (Accessibility, Responsiveness, Engagement) is the EFT therapist\'s primary change mechanism. This module structures daily A.R.E. practice between sessions.',
      'week-3-emotional-regulation': 'EFT Stage 1 requires clients to regulate enough to access primary emotions. This module builds the physiological self-soothing capacity that makes softening events possible.',
      'skill-repair-mastery': 'EFT Stage 2 restructuring requires repair skills. This module teaches clients to make and receive bids for reconnection — the behavioral expression of reaching in EFT terms.',
      'week-2-communication': 'While EFT prioritizes emotion over technique, clients still need expressive skills. Gentle startup and tactical empathy complement EFT\'s focus on emotional accessibility.',
      'week-5-connection-growth': 'EFT Stage 3 (Consolidation) focuses on creating new positive interaction cycles. Connection rituals provide the between-session structure for new bonding events.',
    },
    assessmentFocus: ['attachment', 'eft'],
    keyConceptsMapping: {
      'negative interaction cycle': 'week-4-cycle-mapping',
      'primary emotions': 'week-3-emotional-regulation',
      'attachment needs': 'skill-attachment-security',
      'softening': 'skill-repair-mastery',
      'de-escalation': 'week-3-emotional-regulation',
      'bonding events': 'week-5-connection-growth',
    },
  },

  gottman: {
    name: 'Gottman Method Couples Therapy',
    description: 'Research-based approach built on the Sound Relationship House theory. Focuses on friendship, conflict management, and shared meaning.',
    primaryExperts: ['gottman'],
    secondaryExperts: ['chapman', 'voss', 'johnson'],
    priorityModules: [
      'skill-four-horsemen',
      'week-2-communication',
      'week-5-connection-growth',
      'skill-repair-mastery',
      'skill-shared-meaning',
    ],
    deprioritizedModules: ['skill-desire-maintenance'],
    moduleRationale: {
      'skill-four-horsemen': 'Gottman\'s Four Horsemen are your assessment language — this module gives clients structured practice replacing criticism, contempt, defensiveness, and stonewalling with their specific antidotes between sessions.',
      'week-2-communication': 'The "Dreams Within Conflict" and gentle startup techniques map directly to your work on gridlocked vs. solvable problems. Clients practice daily what you teach in session.',
      'week-5-connection-growth': 'Love Maps, Fondness & Admiration, and Turning Toward — the friendship foundation of the Sound Relationship House. This module builds the rituals that strengthen floors 1-3.',
      'skill-repair-mastery': 'Gottman\'s repair checklist is the backbone of this module. Clients inventory their repair attempts and practice accepting their partner\'s bids to de-escalate.',
      'skill-shared-meaning': 'The top of the Sound Relationship House. Clients build shared rituals, roles, goals, and symbols — creating the "culture of us" that gives the relationship purpose.',
      'week-1-self-awareness': 'Supports the assessment phase — clients identify their attachment style and dominant horseman before therapy work begins.',
      'week-3-emotional-regulation': 'Flooding recovery is central to Gottman work. When heart rate exceeds 100 BPM, no productive conversation is possible. This module teaches the physiological self-soothing Gottman prescribes.',
    },
    assessmentFocus: ['gottman', 'love_language'],
    keyConceptsMapping: {
      'Sound Relationship House': 'week-5-connection-growth',
      'Four Horsemen': 'skill-four-horsemen',
      'repair attempts': 'skill-repair-mastery',
      'Love Maps': 'week-5-connection-growth',
      'flooding': 'week-3-emotional-regulation',
      'shared meaning': 'skill-shared-meaning',
      'dreams within conflict': 'skill-shared-meaning',
      'gentle startup': 'week-2-communication',
    },
  },

  cbt: {
    name: 'Cognitive Behavioral Therapy for Couples',
    description: 'Focuses on identifying and modifying cognitive distortions, maladaptive behavioral patterns, and communication deficits that maintain relationship distress.',
    primaryExperts: ['gottman', 'robbins'],
    secondaryExperts: ['voss', 'brown'],
    priorityModules: [
      'skill-cognitive-restructuring',
      'week-2-communication',
      'week-1-self-awareness',
      'week-3-emotional-regulation',
      'skill-four-horsemen',
    ],
    deprioritizedModules: ['skill-desire-maintenance', 'skill-attachment-security'],
    moduleRationale: {
      'skill-cognitive-restructuring': 'The core CBT intervention: identifying automatic negative thoughts about the partner, testing them against evidence, and replacing distortions with balanced cognitions. Thought records and behavioral experiments map directly to your session work.',
      'week-2-communication': 'CBT communication skills training — replacing aggressive/passive patterns with assertive expression. The gentle startup formula gives clients a behavioral template for each interaction.',
      'week-1-self-awareness': 'CBT begins with psychoeducation and self-monitoring. This module teaches clients to observe their triggers, automatic thoughts, and behavioral responses without judgment.',
      'week-3-emotional-regulation': 'Emotional regulation through cognitive reappraisal and behavioral strategies. The 6-second pause creates space for the thought-feeling-behavior chain you teach in session.',
      'skill-four-horsemen': 'Maps to behavioral pattern identification. Each horseman is a maladaptive behavior pattern with a specific, learnable replacement behavior — exactly how CBT conceptualizes change.',
      'week-4-cycle-mapping': 'Behavioral pattern analysis: mapping the trigger → thought → emotion → behavior → consequence chain for recurring conflicts.',
      'skill-repair-mastery': 'Behavioral skill building for conflict resolution. Each repair technique is a specific, practicable behavior with clear success criteria.',
    },
    assessmentFocus: ['gottman', 'prep'],
    keyConceptsMapping: {
      'automatic thoughts': 'skill-cognitive-restructuring',
      'cognitive distortions': 'skill-cognitive-restructuring',
      'behavioral activation': 'week-5-connection-growth',
      'communication skills': 'week-2-communication',
      'behavioral pattern': 'week-4-cycle-mapping',
      'thought records': 'skill-cognitive-restructuring',
      'assertiveness training': 'week-2-communication',
    },
  },

  psychodynamic: {
    name: 'Psychodynamic Couples Therapy',
    description: 'Explores how unconscious patterns from early relationships shape current couple dynamics. Focuses on transference, attachment history, and making the unconscious conscious.',
    primaryExperts: ['johnson', 'levine'],
    secondaryExperts: ['brown', 'perel'],
    priorityModules: [
      'week-1-self-awareness',
      'skill-attachment-security',
      'week-4-cycle-mapping',
      'skill-desire-maintenance',
      'week-3-emotional-regulation',
    ],
    deprioritizedModules: ['skill-cognitive-restructuring', 'skill-four-horsemen'],
    moduleRationale: {
      'week-1-self-awareness': 'Psychodynamic work begins with making the unconscious conscious. This module guides clients through attachment history exploration and pattern recognition — connecting present triggers to early relational templates.',
      'skill-attachment-security': 'Attachment theory is the bridge between psychodynamic and modern relational work. This module helps clients identify how their attachment style — formed in early relationships — plays out in their current partnership.',
      'week-4-cycle-mapping': 'The pursue-withdraw cycle often recapitulates early attachment dynamics. Mapping the cycle helps clients see how they project early relational patterns onto their partner — core psychodynamic insight.',
      'skill-desire-maintenance': 'Perel\'s work on erotic intelligence connects to psychodynamic themes of separation-individuation. Desire requires maintaining the partner as a separate object — not a projected extension of self.',
      'week-3-emotional-regulation': 'Managing affect is essential for psychodynamic work. Clients need enough regulation to tolerate the anxiety of exploring unconscious material without acting out in the relationship.',
      'week-5-connection-growth': 'Building new relational patterns that aren\'t repetitions of the past. Creating rituals of connection that emerge from choice rather than compulsion.',
      'week-6-integration': 'Integration of insight into identity — the psychodynamic goal of lasting structural change rather than symptom management.',
    },
    assessmentFocus: ['attachment', 'eft'],
    keyConceptsMapping: {
      'transference': 'week-4-cycle-mapping',
      'attachment history': 'skill-attachment-security',
      'unconscious patterns': 'week-1-self-awareness',
      'object relations': 'skill-desire-maintenance',
      'separation-individuation': 'skill-desire-maintenance',
      'defense mechanisms': 'week-3-emotional-regulation',
      'working through': 'week-6-integration',
    },
  },

  integrative: {
    name: 'Integrative Approach',
    description: 'Draws from multiple therapeutic orientations based on the couple\'s unique presentation. Flexibility to blend techniques as clinically indicated.',
    primaryExperts: ['gottman', 'johnson', 'levine'],
    secondaryExperts: ['perel', 'brown', 'chapman', 'voss', 'robbins'],
    priorityModules: [
      'week-1-self-awareness',
      'week-2-communication',
      'week-3-emotional-regulation',
      'week-4-cycle-mapping',
      'week-5-connection-growth',
    ],
    deprioritizedModules: [],
    moduleRationale: {
      'week-1-self-awareness': 'Regardless of orientation, change starts with awareness. This module provides a comprehensive assessment that gives you data to inform your integrative formulation.',
      'week-2-communication': 'Communication skills are orientation-agnostic. Whether you conceptualize the problem through CBT, EFT, or Gottman lenses, clients need these foundational skills.',
      'week-3-emotional-regulation': 'Regulation capacity is a prerequisite for deeper work in ANY orientation. This module builds the baseline clients need for whatever direction therapy takes.',
      'week-4-cycle-mapping': 'Understanding interaction patterns is universal. This module draws from both Johnson\'s EFT and Gottman\'s behavioral observation — giving you data from both frameworks.',
      'week-5-connection-growth': 'Building positive experiences counterbalances the excavation work of therapy. Love language fluency and rituals of connection work across all orientations.',
      'week-6-integration': 'Every approach aims for lasting change. This module helps clients consolidate gains into identity — preventing relapse regardless of the therapeutic model used.',
    },
    assessmentFocus: ['attachment', 'gottman', 'eft', 'prep', 'love_language'],
    keyConceptsMapping: {
      'presenting problem': 'week-1-self-awareness',
      'skill building': 'week-2-communication',
      'affect regulation': 'week-3-emotional-regulation',
      'pattern interruption': 'week-4-cycle-mapping',
      'positive interaction': 'week-5-connection-growth',
      'relapse prevention': 'week-6-integration',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE API: generateTreatmentPlanOptions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Suggests LoveRescue modules based on couple's profile and therapist's orientation.
 *
 * @param {Object} coupleProfile - From generateRelationshipProfile() in strategies.js
 * @param {string} coupleProfile.attachmentStyle - 'secure'|'anxious'|'avoidant'|'fearful_avoidant'
 * @param {string} coupleProfile.loveLanguage - Primary love language
 * @param {string} coupleProfile.cyclePosition - 'pursuer'|'withdrawer'|'balanced'
 * @param {string} coupleProfile.dominantHorseman - Most prominent horseman or null
 * @param {Object} coupleProfile.horsemenScores - { criticism, contempt, defensiveness, stonewalling }
 * @param {number} coupleProfile.friendshipScore - 0-100
 * @param {number} coupleProfile.conflictScore - 0-100
 * @param {number} coupleProfile.meaningScore - 0-100
 * @param {number} coupleProfile.communicationScore - 0-100
 * @param {string[]} coupleProfile.focusAreas - Ordered priority areas
 * @param {string[]} coupleProfile.strengths - Areas scoring well
 * @param {string} therapistApproach - 'eft'|'gottman'|'cbt'|'psychodynamic'|'integrative'
 * @returns {Object} Categorized module recommendations with rationale
 */
function generateTreatmentPlanOptions(coupleProfile, therapistApproach) {
  const profile = coupleProfile || {};
  const approach = (therapistApproach || 'integrative').toLowerCase();
  const mapping = APPROACH_MAPPINGS[approach] || APPROACH_MAPPINGS.integrative;

  const recommendations = {
    therapistApproach: mapping.name,
    approachDescription: mapping.description,
    primaryExperts: mapping.primaryExperts,
    assessmentFocus: mapping.assessmentFocus,

    // Categorized recommendations
    recommended: [],    // Strongly recommended based on profile + approach
    suggested: [],      // Good fit but not critical
    available: [],      // Available but not prioritized for this approach
    crisisModules: [],  // Always available, flagged separately
  };

  const allModules = Object.values(MODULE_LIBRARY);

  for (const mod of allModules) {
    // Crisis modules always go in their own category
    if (mod.category === 'crisis') {
      recommendations.crisisModules.push({
        ...mod,
        rationale: `Available as-needed for ${mod.name.toLowerCase()} situations. Assign immediately when indicated — no prerequisites required.`,
      });
      continue;
    }

    const score = scoreModuleForPlan(mod, profile, mapping);
    const rationale = mapping.moduleRationale[mod.id] ||
      generateAutoRationale(mod, profile, mapping);

    const entry = {
      ...mod,
      relevanceScore: score,
      rationale,
      approachAlignment: getApproachAlignment(mod, mapping),
    };

    if (score >= 70) {
      recommendations.recommended.push(entry);
    } else if (score >= 40) {
      recommendations.suggested.push(entry);
    } else {
      recommendations.available.push(entry);
    }
  }

  // Sort each category by relevance
  recommendations.recommended.sort((a, b) => b.relevanceScore - a.relevanceScore);
  recommendations.suggested.sort((a, b) => b.relevanceScore - a.relevanceScore);
  recommendations.available.sort((a, b) => b.relevanceScore - a.relevanceScore);

  logger.info('Treatment plan options generated', {
    approach,
    recommended: recommendations.recommended.length,
    suggested: recommendations.suggested.length,
    available: recommendations.available.length,
    crisis: recommendations.crisisModules.length,
  });

  return recommendations;
}

/**
 * Score a module's relevance for a specific couple + therapist approach.
 * @private
 */
function scoreModuleForPlan(mod, profile, mapping) {
  let score = 30; // baseline

  // Approach priority boost
  if (mapping.priorityModules.includes(mod.id)) {
    score += 40;
  }
  if (mapping.deprioritizedModules.includes(mod.id)) {
    score -= 25;
  }

  // Expert alignment
  if (mapping.primaryExperts.includes(mod.primaryExpert)) {
    score += 15;
  }
  if (mod.expertFrameworks.some(e => mapping.primaryExperts.includes(e))) {
    score += 5;
  }

  // Profile-driven relevance
  if (profile.attachmentStyle && profile.attachmentStyle !== 'secure') {
    if (mod.skills?.includes('attachment-recognition') || mod.skills?.includes('earned-security') || mod.skills?.includes('accessibility')) {
      score += 10;
    }
  }

  if (profile.dominantHorseman && mod.skills?.includes('horseman-antidotes')) {
    score += 15;
  }

  if (profile.focusAreas?.length > 0) {
    const focusToSkill = {
      attachment: ['attachment-recognition', 'earned-security', 'accessibility'],
      conflict: ['horseman-antidotes', 'de-escalation', 'repair-initiation', 'self-soothing'],
      friendship: ['love-maps', 'fondness-admiration', 'ritual-building'],
      communication: ['gentle-startup', 'i-statements', 'active-listening', 'tactical-empathy'],
      meaning: ['shared-meaning', 'ritual-creation', 'legacy-building'],
    };
    for (const area of profile.focusAreas) {
      const relevantSkills = focusToSkill[area] || [];
      if (mod.skills?.some(s => relevantSkills.includes(s))) {
        score += 10;
      }
    }
  }

  // Low scores in specific areas boost relevant modules
  if (profile.conflictScore != null && profile.conflictScore < 50 && mod.targetAssessments?.includes('gottman')) {
    score += 5;
  }
  if (profile.friendshipScore != null && profile.friendshipScore < 50 && mod.skills?.includes('love-maps')) {
    score += 5;
  }
  if (profile.communicationScore != null && profile.communicationScore < 50 && mod.targetAssessments?.includes('prep')) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Get approach alignment label for a module.
 * @private
 */
function getApproachAlignment(mod, mapping) {
  if (mapping.priorityModules.includes(mod.id)) return 'core';
  if (mapping.deprioritizedModules.includes(mod.id)) return 'supplementary';
  if (mod.expertFrameworks.some(e => mapping.primaryExperts.includes(e))) return 'aligned';
  return 'complementary';
}

/**
 * Auto-generate rationale when a specific one isn't defined in the mapping.
 * @private
 */
function generateAutoRationale(mod, profile, mapping) {
  const parts = [];

  const expertOverlap = mod.expertFrameworks.filter(e =>
    [...mapping.primaryExperts, ...mapping.secondaryExperts].includes(e)
  );

  if (expertOverlap.length > 0) {
    const names = expertOverlap.map(e => EXPERT_DISPLAY_NAMES[e] || e).join(' and ');
    parts.push(`Draws from ${names}, whose work aligns with your ${mapping.name} approach.`);
  }

  if (profile.focusAreas?.length > 0) {
    const areaNames = profile.focusAreas.slice(0, 2).join(' and ');
    parts.push(`Relevant to this couple's identified focus areas: ${areaNames}.`);
  }

  if (mod.category === 'maintenance') {
    parts.push('Post-completion module to maintain gains achieved during active treatment.');
  }

  return parts.join(' ') || `Available ${mod.category} module covering ${mod.skills?.slice(0, 3).join(', ')}.`;
}

const EXPERT_DISPLAY_NAMES = {
  gottman: 'Dr. John Gottman',
  johnson: 'Dr. Sue Johnson',
  levine: 'Dr. Amir Levine',
  perel: 'Esther Perel',
  brown: 'Dr. Brené Brown',
  chapman: 'Dr. Gary Chapman',
  voss: 'Chris Voss',
  robbins: 'Tony Robbins',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CORE API: createTreatmentPlan
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a structured treatment plan from selected modules with therapist customizations.
 *
 * @param {string} therapistId - Therapist's user ID
 * @param {string} coupleId - Couple's ID
 * @param {string[]} selectedModuleIds - Array of module IDs from the library
 * @param {Object} customizations - Therapist's customizations
 * @param {number} [customizations.paceMultiplier=1] - 0.5 (slower), 1 (normal), 1.5 (faster)
 * @param {Object} [customizations.moduleOverrides] - Per-module overrides { [moduleId]: { skip, reorder, homeworkNotes } }
 * @param {string} [customizations.planName] - Custom plan name
 * @param {string} [customizations.planNotes] - Therapist's private notes about the plan
 * @param {number} [customizations.checkpointIntervalWeeks=2] - Weeks between assessment checkpoints
 * @param {string[]} [customizations.additionalAssessments] - Extra assessments to track
 * @returns {Object} Complete structured treatment plan
 */
function createTreatmentPlan(therapistId, coupleId, selectedModuleIds, customizations = {}) {
  const {
    paceMultiplier = 1,
    moduleOverrides = {},
    planName,
    planNotes,
    checkpointIntervalWeeks = 2,
    additionalAssessments = [],
  } = customizations;

  // Resolve and order modules
  const modules = selectedModuleIds
    .map(id => MODULE_LIBRARY[id])
    .filter(Boolean)
    .filter(m => !moduleOverrides[m.id]?.skip);

  // Apply reordering
  const reorderedModules = applyReordering(modules, moduleOverrides);

  // Build weekly sequence
  const weeklyPlan = [];
  let currentDay = 0;

  for (const mod of reorderedModules) {
    const baseDays = mod.estimatedDuration.days;
    const adjustedDays = Math.round(baseDays / paceMultiplier);
    const startDay = currentDay + 1;
    const endDay = currentDay + adjustedDays;

    const weekEntry = {
      moduleId: mod.id,
      moduleName: mod.name,
      category: mod.category,
      stage: mod.stage,
      difficulty: mod.difficulty,
      startDay,
      endDay,
      durationDays: adjustedDays,
      startWeek: Math.ceil(startDay / 7),
      endWeek: Math.ceil(endDay / 7),
      activitiesPerDay: mod.estimatedDuration.activitiesPerDay,
      weeklyActivities: mod.estimatedDuration.weeklyActivities || 0,
      milestones: mod.milestones,
      skills: mod.skills,
      expertFrameworks: mod.expertFrameworks,
      therapistNotes: moduleOverrides[mod.id]?.homeworkNotes || null,
      customHomework: moduleOverrides[mod.id]?.customHomework || null,
    };

    weeklyPlan.push(weekEntry);
    currentDay = endDay;
  }

  // Build assessment checkpoints
  const totalWeeks = Math.ceil(currentDay / 7);
  const checkpoints = buildCheckpoints(reorderedModules, totalWeeks, checkpointIntervalWeeks, additionalAssessments);

  // Build milestone map
  const allMilestones = reorderedModules.flatMap((mod, idx) => {
    return mod.milestones.map(m => ({
      ...m,
      moduleId: mod.id,
      moduleName: mod.name,
      moduleIndex: idx,
      status: 'pending',
    }));
  });

  // Calculate difficulty progression
  const difficultyProgression = weeklyPlan.map(w => ({
    moduleId: w.moduleId,
    difficulty: w.difficulty,
    startWeek: w.startWeek,
    endWeek: w.endWeek,
  }));

  const plan = {
    id: generatePlanId(),
    therapistId,
    coupleId,
    name: planName || `Treatment Plan — ${new Date().toISOString().split('T')[0]}`,
    notes: planNotes || null,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Plan structure
    paceMultiplier,
    totalDays: currentDay,
    totalWeeks,
    moduleCount: reorderedModules.length,

    // Weekly sequence
    weeklyPlan,

    // Assessment checkpoints
    checkpoints,

    // All milestones
    milestones: allMilestones,

    // Difficulty progression
    difficultyProgression,

    // Summary
    summary: {
      stages: [...new Set(reorderedModules.map(m => m.stage))],
      expertsCovered: [...new Set(reorderedModules.flatMap(m => m.expertFrameworks))],
      skillsCovered: [...new Set(reorderedModules.flatMap(m => m.skills))],
      assessmentsTracked: [...new Set([
        ...reorderedModules.flatMap(m => m.targetAssessments),
        ...additionalAssessments,
      ])],
    },
  };

  logger.info('Treatment plan created', {
    planId: plan.id,
    therapistId,
    coupleId,
    modules: plan.moduleCount,
    totalWeeks: plan.totalWeeks,
    pace: paceMultiplier,
  });

  return plan;
}

/**
 * Apply therapist's module reordering.
 * @private
 */
function applyReordering(modules, overrides) {
  const withOrder = modules.map(m => ({
    module: m,
    order: overrides[m.id]?.reorder ?? null,
  }));

  // Separate explicitly ordered and unordered
  const ordered = withOrder.filter(w => w.order !== null).sort((a, b) => a.order - b.order);
  const unordered = withOrder.filter(w => w.order === null);

  // Merge: ordered modules go first in their specified positions, unordered fill remaining slots
  const result = [];
  let orderedIdx = 0;
  let unorderedIdx = 0;

  for (let i = 0; i < withOrder.length; i++) {
    if (orderedIdx < ordered.length && ordered[orderedIdx].order === i) {
      result.push(ordered[orderedIdx].module);
      orderedIdx++;
    } else if (unorderedIdx < unordered.length) {
      result.push(unordered[unorderedIdx].module);
      unorderedIdx++;
    }
  }

  // Append any remaining
  while (orderedIdx < ordered.length) {
    result.push(ordered[orderedIdx++].module);
  }
  while (unorderedIdx < unordered.length) {
    result.push(unordered[unorderedIdx++].module);
  }

  return result;
}

/**
 * Build assessment checkpoints throughout the plan.
 * @private
 */
function buildCheckpoints(modules, totalWeeks, intervalWeeks, additionalAssessments) {
  const checkpoints = [];
  const allAssessments = [...new Set([
    ...modules.flatMap(m => m.targetAssessments),
    ...additionalAssessments,
  ])];

  // Initial checkpoint at start
  checkpoints.push({
    week: 0,
    type: 'baseline',
    label: 'Baseline Assessment',
    assessments: allAssessments,
    description: 'Pre-treatment baseline scores. All targeted assessments administered before module work begins.',
  });

  // Regular interval checkpoints
  for (let week = intervalWeeks; week < totalWeeks; week += intervalWeeks) {
    const activeModule = modules.find(m => {
      const startWeek = Math.ceil(m.estimatedDuration.days > 0 ? 1 : 0); // simplified
      return true; // will be refined by weekly plan lookup
    });

    checkpoints.push({
      week,
      type: 'progress',
      label: `Week ${week} Progress Check`,
      assessments: allAssessments,
      description: `Re-administer assessments to measure change. Compare against baseline and previous checkpoint.`,
    });
  }

  // Final checkpoint
  checkpoints.push({
    week: totalWeeks,
    type: 'completion',
    label: 'Treatment Completion Assessment',
    assessments: allAssessments,
    description: 'Post-treatment assessment. Full comparison against baseline. Determines maintenance plan recommendations.',
  });

  return checkpoints;
}

/**
 * Generate a unique plan ID.
 * @private
 */
function generatePlanId() {
  return `tp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE API: getTreatmentPlanProgress
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track execution of a treatment plan and auto-generate progress notes.
 *
 * In production, this would query the database for actual completion data.
 * This implementation defines the computation logic and expected data shape.
 *
 * @param {Object} plan - The treatment plan (from createTreatmentPlan)
 * @param {Object} completionData - Actual client progress data
 * @param {Object[]} completionData.completedActivities - Array of { moduleId, activityId, completedAt }
 * @param {Object[]} completionData.assessmentScores - Array of { type, score, completedAt }
 * @param {Object[]} completionData.milestoneAchievements - Array of { milestoneId, achievedAt }
 * @param {number} completionData.currentDay - Day number in the plan
 * @returns {Object} Progress report with metrics and auto-generated progress note
 */
function getTreatmentPlanProgress(plan, completionData = {}) {
  const {
    completedActivities = [],
    assessmentScores = [],
    milestoneAchievements = [],
    currentDay = 0,
  } = completionData;

  const currentWeek = Math.ceil(currentDay / 7) || 1;

  // ── Module Completion ──
  const moduleProgress = plan.weeklyPlan.map(entry => {
    const moduleActivities = completedActivities.filter(a => a.moduleId === entry.moduleId);
    const expectedActivities = entry.activitiesPerDay * entry.durationDays +
      entry.weeklyActivities * Math.ceil(entry.durationDays / 7);
    const completionPct = expectedActivities > 0
      ? Math.round((moduleActivities.length / expectedActivities) * 100)
      : 0;

    let status = 'pending';
    if (currentDay >= entry.endDay) {
      status = completionPct >= 80 ? 'completed' : 'incomplete';
    } else if (currentDay >= entry.startDay) {
      status = 'in_progress';
    }

    return {
      moduleId: entry.moduleId,
      moduleName: entry.moduleName,
      status,
      completionPercentage: Math.min(100, completionPct),
      activitiesCompleted: moduleActivities.length,
      activitiesExpected: expectedActivities,
      therapistNotes: entry.therapistNotes,
    };
  });

  const overallCompletion = moduleProgress.length > 0
    ? Math.round(moduleProgress.reduce((sum, m) => sum + m.completionPercentage, 0) / moduleProgress.length)
    : 0;

  // ── Assessment Score Changes ──
  const scoreChanges = computeScoreChanges(plan, assessmentScores);

  // ── Activity Adherence Rate ──
  const currentModule = plan.weeklyPlan.find(
    e => currentDay >= e.startDay && currentDay <= e.endDay
  );
  const daysInPlan = Math.min(currentDay, plan.totalDays);
  const expectedTotal = plan.weeklyPlan
    .filter(e => e.startDay <= currentDay)
    .reduce((sum, e) => {
      const activeDays = Math.min(currentDay, e.endDay) - e.startDay + 1;
      return sum + (e.activitiesPerDay * activeDays) +
        (e.weeklyActivities * Math.ceil(activeDays / 7));
    }, 0);
  const adherenceRate = expectedTotal > 0
    ? Math.round((completedActivities.length / expectedTotal) * 100)
    : 0;

  // ── Time to Next Checkpoint ──
  const nextCheckpoint = plan.checkpoints.find(c => c.week > currentWeek) || null;
  const weeksToCheckpoint = nextCheckpoint ? nextCheckpoint.week - currentWeek : 0;

  // ── Milestone Tracking ──
  const milestoneStatus = plan.milestones.map(m => {
    const achieved = milestoneAchievements.find(a =>
      a.moduleId === m.moduleId && a.name === m.name
    );
    return {
      ...m,
      status: achieved ? 'achieved' : (currentDay >= plan.weeklyPlan.find(e => e.moduleId === m.moduleId)?.endDay ? 'missed' : 'pending'),
      achievedAt: achieved?.achievedAt || null,
    };
  });

  const milestonesAchieved = milestoneStatus.filter(m => m.status === 'achieved').length;
  const milestonesTotal = milestoneStatus.length;

  // ── Auto-Generated Progress Note ──
  const progressNote = generateProgressNote({
    plan,
    currentWeek,
    currentDay,
    moduleProgress,
    overallCompletion,
    scoreChanges,
    adherenceRate,
    milestoneStatus,
    milestonesAchieved,
    milestonesTotal,
    nextCheckpoint,
    currentModule,
  });

  const result = {
    planId: plan.id,
    coupleId: plan.coupleId,
    currentDay,
    currentWeek,
    totalWeeks: plan.totalWeeks,
    percentComplete: Math.round((currentDay / plan.totalDays) * 100),

    // Module progress
    moduleProgress,
    overallModuleCompletion: overallCompletion,

    // Assessment changes
    scoreChanges,

    // Adherence
    adherenceRate,
    activitiesCompleted: completedActivities.length,
    activitiesExpected: expectedTotal,

    // Milestones
    milestonesAchieved,
    milestonesTotal,
    milestoneStatus,

    // Checkpoints
    nextCheckpoint: nextCheckpoint ? {
      ...nextCheckpoint,
      weeksAway: weeksToCheckpoint,
      daysAway: weeksToCheckpoint * 7,
    } : null,

    // Current module
    currentModule: currentModule ? {
      moduleId: currentModule.moduleId,
      moduleName: currentModule.moduleName,
      dayInModule: currentDay - currentModule.startDay + 1,
      totalModuleDays: currentModule.durationDays,
    } : null,

    // Auto-generated note for therapist records
    progressNote,
  };

  logger.info('Treatment plan progress computed', {
    planId: plan.id,
    currentWeek,
    overallCompletion,
    adherenceRate,
    milestonesAchieved,
  });

  return result;
}

/**
 * Compute assessment score changes relative to baseline.
 * @private
 */
function computeScoreChanges(plan, assessmentScores) {
  if (!assessmentScores.length) return [];

  const byType = {};
  for (const score of assessmentScores) {
    if (!byType[score.type]) byType[score.type] = [];
    byType[score.type].push(score);
  }

  return Object.entries(byType).map(([type, scores]) => {
    const sorted = scores.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    const baseline = sorted[0];
    const latest = sorted[sorted.length - 1];
    const delta = typeof latest.score === 'number' && typeof baseline.score === 'number'
      ? latest.score - baseline.score
      : null;

    return {
      assessmentType: type,
      baselineScore: baseline.score,
      baselineDate: baseline.completedAt,
      latestScore: latest.score,
      latestDate: latest.completedAt,
      delta,
      trend: delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable',
      measurementCount: scores.length,
    };
  });
}

/**
 * Auto-generate a SOAP-style progress note for therapist records.
 * @private
 */
function generateProgressNote(data) {
  const {
    plan,
    currentWeek,
    currentDay,
    moduleProgress,
    overallCompletion,
    scoreChanges,
    adherenceRate,
    milestoneStatus,
    milestonesAchieved,
    milestonesTotal,
    nextCheckpoint,
    currentModule,
  } = data;

  const lines = [];

  // Header
  lines.push(`TREATMENT PLAN PROGRESS NOTE`);
  lines.push(`Plan: ${plan.name}`);
  lines.push(`Date: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Week ${currentWeek} of ${plan.totalWeeks} (Day ${currentDay}/${plan.totalDays})`);
  lines.push('');

  // Current Status
  lines.push('CURRENT STATUS:');
  if (currentModule) {
    lines.push(`• Active module: ${currentModule.moduleName} (Day ${currentDay - currentModule.startDay + 1}/${currentModule.durationDays})`);
  }
  lines.push(`• Overall plan completion: ${overallCompletion}%`);
  lines.push(`• Activity adherence rate: ${adherenceRate}%`);
  lines.push(`• Milestones achieved: ${milestonesAchieved}/${milestonesTotal}`);
  lines.push('');

  // Module Progress
  lines.push('MODULE PROGRESS:');
  for (const mod of moduleProgress) {
    const statusEmoji = { completed: '✅', in_progress: '🔄', pending: '⏳', incomplete: '⚠️' }[mod.status] || '•';
    lines.push(`${statusEmoji} ${mod.moduleName}: ${mod.completionPercentage}% (${mod.activitiesCompleted}/${mod.activitiesExpected} activities) — ${mod.status}`);
    if (mod.therapistNotes) {
      lines.push(`  📝 Therapist note: ${mod.therapistNotes}`);
    }
  }
  lines.push('');

  // Assessment Changes
  if (scoreChanges.length > 0) {
    lines.push('ASSESSMENT CHANGES (since baseline):');
    for (const sc of scoreChanges) {
      const arrow = sc.trend === 'improving' ? '↑' : sc.trend === 'declining' ? '↓' : '→';
      const deltaStr = sc.delta != null ? ` (${sc.delta > 0 ? '+' : ''}${sc.delta})` : '';
      lines.push(`• ${sc.assessmentType}: ${sc.baselineScore} → ${sc.latestScore}${deltaStr} ${arrow} ${sc.trend}`);
    }
    lines.push('');
  }

  // Milestones
  const achieved = milestoneStatus.filter(m => m.status === 'achieved');
  const missed = milestoneStatus.filter(m => m.status === 'missed');
  if (achieved.length > 0) {
    lines.push('MILESTONES ACHIEVED:');
    for (const m of achieved) {
      lines.push(`✅ ${m.name} (${m.moduleName})`);
    }
    lines.push('');
  }
  if (missed.length > 0) {
    lines.push('MILESTONES NOT MET:');
    for (const m of missed) {
      lines.push(`⚠️ ${m.name} (${m.moduleName}) — may need additional support or module revisit`);
    }
    lines.push('');
  }

  // Clinical Observations (auto-generated)
  lines.push('CLINICAL OBSERVATIONS (auto-generated):');
  if (adherenceRate >= 80) {
    lines.push('• Client demonstrating strong engagement with between-session activities.');
  } else if (adherenceRate >= 50) {
    lines.push('• Moderate engagement with activities. Consider exploring barriers to completion in session.');
  } else {
    lines.push('• Low activity adherence. Recommend discussing treatment plan fit, motivation, or practical barriers.');
  }

  const improving = scoreChanges.filter(s => s.trend === 'improving');
  const declining = scoreChanges.filter(s => s.trend === 'declining');
  if (improving.length > 0) {
    lines.push(`• Positive trends in: ${improving.map(s => s.assessmentType).join(', ')}.`);
  }
  if (declining.length > 0) {
    lines.push(`• Declining scores in: ${declining.map(s => s.assessmentType).join(', ')}. Consider treatment plan adjustment.`);
  }
  lines.push('');

  // Next Steps
  lines.push('NEXT STEPS:');
  if (nextCheckpoint) {
    lines.push(`• Next assessment checkpoint: Week ${nextCheckpoint.week} (${nextCheckpoint.weeksAway} weeks)`);
    lines.push(`  Assessments due: ${nextCheckpoint.assessments.join(', ')}`);
  }
  const pendingMilestones = milestoneStatus.filter(m => m.status === 'pending').slice(0, 3);
  if (pendingMilestones.length > 0) {
    lines.push('• Upcoming milestones:');
    for (const m of pendingMilestones) {
      lines.push(`  - ${m.name} (${m.moduleName})`);
    }
  }

  return lines.join('\n');
}


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core API
  generateTreatmentPlanOptions,
  createTreatmentPlan,
  getTreatmentPlanProgress,

  // Library (for browsing/display)
  MODULE_LIBRARY,
  APPROACH_MAPPINGS,
  EXPERT_DISPLAY_NAMES,
};
