/**
 * Feature Gating (client-side hints)
 *
 * The real enforcement lives on the backend (`requireSubscription` / couple-
 * aware resolver → 402 SUBSCRIPTION_REQUIRED). These helpers mirror that model
 * in the UI so we can show upgrade prompts / lock badges before the user hits a
 * gated call. Never trust the client for entitlement — it only decides what to
 * *show*.
 *
 * Entitlement tiers (match backend status names): a user is entitled while on
 * an active `trial`, or `paid` / `premium` / `active`, or while covered by an
 * entitled partner (`coveredByPartner`). Anything else is treated as free.
 */

// Assessments available without a subscription (a taste of the product).
export const FREE_ASSESSMENT_TYPES = [
  'attachment',
  'love_language',
];

// All assessment types the app offers.
export const ALL_ASSESSMENT_TYPES = [
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
  SKILL_TREE: 'skill_tree',
  REPORTS_DETAILED: 'reports_detailed',
  RETAKES: 'retakes',
  PARTNER_FEATURES: 'partner_features',
  DASHBOARD_FULL: 'dashboard_full',
  COURSE: 'course',
};

// Free tier: basic daily logging + the two starter assessments. Enough to
// experience the loop; the relationship "intelligence" is the paid value.
export const FREE_FEATURES = new Set([
  FEATURES.ASSESSMENT_ATTACHMENT,
  FEATURES.ASSESSMENT_LOVE_LANGUAGE,
  FEATURES.DAILY_LOG_MOOD,
  FEATURES.DAILY_LOG_GRATITUDE,
  FEATURES.DAILY_LOG_JOURNAL,
]);

// Everything else requires an active entitlement (trial counts).
export const PREMIUM_FEATURES = new Set(
  Object.values(FEATURES).filter((f) => !FREE_FEATURES.has(f))
);

const ENTITLED_STATUSES = new Set([
  'trial', 'trialing', 'active', 'paid', 'premium',
]);

/**
 * Is this subscription/user entitled to premium features?
 * Accepts either a subscription snapshot (from getSubscription) or a user
 * object carrying subscriptionStatus.
 */
export function isPremiumUser(subjectOrUser) {
  if (!subjectOrUser) return false;
  const s = subjectOrUser;
  if (s.isPremium === true || s.isActive === true) return true;
  if (s.coveredByPartner === true) return true;
  const status = s.status || s.subscriptionStatus;
  if (status && ENTITLED_STATUSES.has(String(status).toLowerCase())) {
    // A trial only counts while it hasn't run out.
    if (String(status).toLowerCase().startsWith('trial')) {
      const left =
        s.trialDaysRemaining ?? s.trialDaysLeft ?? (s.trialEndsAt ? undefined : 0);
      if (left !== undefined) return left > 0;
      if (s.trialEndsAt) return new Date(s.trialEndsAt).getTime() > Date.now();
      return true;
    }
    return true;
  }
  return false;
}

/** Does a feature require premium? */
export function isPremiumFeature(feature) {
  return PREMIUM_FEATURES.has(feature);
}

/** Can this subject access a given feature? */
export function canAccess(feature, subjectOrUser) {
  if (!isPremiumFeature(feature)) return true;
  return isPremiumUser(subjectOrUser);
}

/** Is a raw assessment type free (no subscription needed)? */
export function isAssessmentFree(assessmentType) {
  return FREE_ASSESSMENT_TYPES.includes(assessmentType);
}

export function assessmentFeatureKey(assessmentType) {
  return `assessment_${assessmentType}`;
}

/** Can this subject take a given assessment type? */
export function canAccessAssessment(assessmentType, subjectOrUser) {
  if (isAssessmentFree(assessmentType)) return true;
  return isPremiumUser(subjectOrUser);
}
