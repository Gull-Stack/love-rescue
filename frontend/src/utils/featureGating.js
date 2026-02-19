/**
 * Feature Gating — ALL FEATURES UNLOCKED
 *
 * The app is now fully free. All gating functions return "unlocked" by default.
 * These exports are kept for API compatibility but no longer gate anything.
 */

export const FREE_ASSESSMENT_TYPES = [
  'attachment', 'love_language', 'personality', 'human_needs',
  'gottman_checkup', 'emotional_intelligence', 'conflict_style',
  'differentiation', 'hormonal_health', 'physical_vitality',
];

export const FEATURES = {
  ASSESSMENT_ATTACHMENT: 'assessment_attachment',
  ASSESSMENT_LOVE_LANGUAGE: 'assessment_love_language',
  ASSESSMENT_PERSONALITY: 'assessment_personality',
  ASSESSMENT_HUMAN_NEEDS: 'assessment_human_needs',
  ASSESSMENT_GOTTMAN_CHECKUP: 'assessment_gottman_checkup',
  ASSESSMENT_EMOTIONAL_INTELLIGENCE: 'assessment_emotional_intelligence',
  ASSESSMENT_CONFLICT_STYLE: 'assessment_conflict_style',
  ASSESSMENT_DIFFERENTIATION: 'assessment_differentiation',
  ASSESSMENT_HORMONAL_HEALTH: 'assessment_hormonal_health',
  ASSESSMENT_PHYSICAL_VITALITY: 'assessment_physical_vitality',
  DAILY_LOG_MOOD: 'daily_log_mood',
  DAILY_LOG_GRATITUDE: 'daily_log_gratitude',
  DAILY_LOG_JOURNAL: 'daily_log_journal',
  DAILY_LOG_CLOSENESS: 'daily_log_closeness',
  DAILY_LOG_INTERACTIONS: 'daily_log_interactions',
  MATCHUP: 'matchup',
  STRATEGIES: 'strategies',
  REPORTS_DETAILED: 'reports_detailed',
  RETAKES: 'retakes',
  PARTNER_FEATURES: 'partner_features',
  DASHBOARD_FULL: 'dashboard_full',
};

export const FREE_FEATURES = new Set(Object.values(FEATURES));
export const PREMIUM_FEATURES = new Set();

/** All users are treated as premium — app is free. */
export function isPremiumUser(_user) {
  return true;
}

/** No features require premium — all are free. */
export function isPremiumFeature(_feature) {
  return false;
}

/** All features are accessible to all users. */
export function canAccess(_feature, _user) {
  return true;
}

/** All assessments are free. */
export function isAssessmentFree(_assessmentType) {
  return true;
}

export function assessmentFeatureKey(assessmentType) {
  return `assessment_${assessmentType}`;
}

/** All assessment types are accessible. */
export function canAccessAssessment(_assessmentType, _user) {
  return true;
}
