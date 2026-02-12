/**
 * Feature Gating for LoveRescue Free/Premium tiers.
 *
 * Free tier: attachment + love_language assessments, mood-only daily log, view-only dashboard.
 * Premium: all 12 assessments, full daily tracking, matchup, strategies, reports, retakes.
 */

// Assessments available for free
export const FREE_ASSESSMENT_TYPES = ['attachment', 'love_language'];

// All feature keys
export const FEATURES = {
  // Assessments (by type)
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
  // Daily log fields
  DAILY_LOG_MOOD: 'daily_log_mood',
  DAILY_LOG_GRATITUDE: 'daily_log_gratitude',
  DAILY_LOG_JOURNAL: 'daily_log_journal',
  DAILY_LOG_CLOSENESS: 'daily_log_closeness',
  DAILY_LOG_INTERACTIONS: 'daily_log_interactions',
  // Pages
  MATCHUP: 'matchup',
  STRATEGIES: 'strategies',
  REPORTS_DETAILED: 'reports_detailed',
  RETAKES: 'retakes',
  PARTNER_FEATURES: 'partner_features',
  DASHBOARD_FULL: 'dashboard_full',
};

export const FREE_FEATURES = new Set([
  FEATURES.ASSESSMENT_ATTACHMENT,
  FEATURES.ASSESSMENT_LOVE_LANGUAGE,
  FEATURES.DAILY_LOG_MOOD,
  FEATURES.DAILY_LOG_CLOSENESS,
  FEATURES.DAILY_LOG_INTERACTIONS,
  FEATURES.STRATEGIES,
  FEATURES.DASHBOARD_FULL,
]);

export const PREMIUM_FEATURES = new Set(
  Object.values(FEATURES).filter((f) => !FREE_FEATURES.has(f))
);

/**
 * Check if a user has an active premium subscription.
 */
export function isPremiumUser(user) {
  if (!user) return false;
  if (user.isPlatformAdmin) return true;
  return ['paid', 'premium'].includes(user.subscriptionStatus);
}

/**
 * Check if a specific feature requires premium.
 */
export function isPremiumFeature(feature) {
  return PREMIUM_FEATURES.has(feature);
}

/**
 * Check if user can access a feature.
 */
export function canAccess(feature, user) {
  if (FREE_FEATURES.has(feature)) return true;
  return isPremiumUser(user);
}

/**
 * Check if a specific assessment type is free.
 */
export function isAssessmentFree(assessmentType) {
  return FREE_ASSESSMENT_TYPES.includes(assessmentType);
}

/**
 * Get the feature key for an assessment type.
 */
export function assessmentFeatureKey(assessmentType) {
  return `assessment_${assessmentType}`;
}

/**
 * Check if user can access a specific assessment.
 */
export function canAccessAssessment(assessmentType, user) {
  return canAccess(assessmentFeatureKey(assessmentType), user);
}
