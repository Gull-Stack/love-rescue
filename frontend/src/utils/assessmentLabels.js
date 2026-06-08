// Human-readable names for assessment types. The API stores snake_case type
// keys (e.g. "gottman_checkup"); never show those to users.

export const ASSESSMENT_LABELS = {
  attachment: 'Attachment Style',
  personality: 'Personality Type',
  love_language: 'Love Language',
  human_needs: 'Human Needs Profile',
  gottman_checkup: 'Relationship Health Checkup',
  emotional_intelligence: 'Emotional Intelligence',
  conflict_style: 'Conflict Resolution Style',
  differentiation: 'Differentiation Level',
  hormonal_health: 'Hormonal Wellness',
  physical_vitality: 'Physical Vitality',
  shame_vulnerability: 'Shame & Vulnerability',
  desire_aliveness: 'Desire & Aliveness',
  tactical_empathy: 'Tactical Empathy',
  wellness_behavior: 'Wellness & Behavior',
  negative_patterns_closeness: 'Patterns & Closeness',
};

// Title-case a snake_case key as a safe fallback for any unmapped type.
function titleCase(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function assessmentLabel(type) {
  if (!type) return 'Assessment';
  return ASSESSMENT_LABELS[type] || titleCase(type);
}
