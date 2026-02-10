/**
 * Upgrade prompt triggers and copy for high-intent moments.
 */

export const UPGRADE_TRIGGERS = {
  SECOND_ASSESSMENT_COMPLETE: 'second_assessment_complete',
  LOCKED_ASSESSMENT_TAP: 'locked_assessment_tap',
  THREE_DAYS_LOGGING: 'three_days_logging',
  MATCHUP_VIEW: 'matchup_view',
  STRATEGIES_VIEW: 'strategies_view',
};

export const UPGRADE_COPY = {
  [UPGRADE_TRIGGERS.SECOND_ASSESSMENT_COMPLETE]: {
    title: 'You\'re on a Roll! 🎉',
    subtitle: 'You\'ve discovered your attachment style and love language. Ready to go deeper?',
    body: 'Unlock all 12 assessments, matchup scores, daily journaling, and personalized strategies.',
    cta: 'Unlock Full Experience',
  },
  [UPGRADE_TRIGGERS.LOCKED_ASSESSMENT_TAP]: {
    title: 'This Assessment is Premium',
    subtitle: 'Get access to all 12 relationship assessments and discover every dimension of yourself.',
    body: 'Premium includes unlimited retakes, matchup scores with your partner, and AI-powered strategies.',
    cta: 'Unlock All Assessments',
  },
  [UPGRADE_TRIGGERS.THREE_DAYS_LOGGING]: {
    title: 'Great Streak! 🔥',
    subtitle: 'You\'ve logged 3 days in a row. Upgrade to unlock gratitude tracking and journal entries.',
    body: 'Premium daily logging includes gratitude, journaling, interaction tracking, and closeness scores — the full picture of your relationship health.',
    cta: 'Upgrade Your Daily Log',
  },
  [UPGRADE_TRIGGERS.MATCHUP_VIEW]: {
    title: 'Matchup Score — Premium Feature',
    subtitle: 'See how you and your partner complement each other across all dimensions.',
    body: 'Invite your partner and discover your compatibility score, strengths, and growth areas together.',
    cta: 'Unlock Matchup',
  },
  [UPGRADE_TRIGGERS.STRATEGIES_VIEW]: {
    title: 'Personalized Strategies — Premium Feature',
    subtitle: 'Get AI-powered relationship strategies tailored to your unique assessment results.',
    body: 'Weekly strategies based on your real data — not generic advice, but personalized action steps.',
    cta: 'Unlock Strategies',
  },
};

/**
 * Check if user should see the post-second-assessment prompt.
 * Call after any assessment completion.
 * @param {number} completedCount - how many assessments user has completed
 * @returns {object|null} - prompt copy if should show, null otherwise
 */
export function checkPostAssessmentPrompt(completedCount) {
  if (completedCount === 2) {
    return UPGRADE_COPY[UPGRADE_TRIGGERS.SECOND_ASSESSMENT_COMPLETE];
  }
  return null;
}

/**
 * Get upgrade copy for a given trigger.
 */
export function getUpgradeCopy(trigger) {
  return UPGRADE_COPY[trigger] || UPGRADE_COPY[UPGRADE_TRIGGERS.LOCKED_ASSESSMENT_TAP];
}
