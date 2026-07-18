// Single source of truth for the client-facing assessment catalog.
// The backend accepts more types (legacy + not-yet-launched), but every
// user-facing count and progress denominator must come from this list so
// the UI never advertises assessments the catalog doesn't show.

export const assessmentTypes = [
  {
    type: 'attachment',
    title: 'Attachment Style',
    description:
      'Understand YOUR emotional bonding patterns — how you connect, what triggers you, and where your security comes from.',
    questions: 30,
    duration: '10 min',
    icon: '❤️',
    expert: 'Based on "Attached" by Dr. Amir Levine',
    category: 'Know Yourself',
  },
  {
    type: 'personality',
    title: 'Personality Type',
    description:
      'Discover YOUR cognitive wiring — how you process information, make decisions, and engage with the world.',
    questions: 40,
    duration: '12 min',
    icon: '🧠',
    expert: 'Based on Myers-Briggs Type Indicator',
    category: 'Know Yourself',
  },
  {
    type: 'love_language',
    title: 'Love Language',
    description:
      'Identify how YOU naturally give and receive love — your emotional currency.',
    questions: 30,
    duration: '8 min',
    icon: '💝',
    expert: 'Based on Dr. Gary Chapman',
    category: 'Know Yourself',
  },
  {
    type: 'human_needs',
    title: 'Human Needs Profile',
    description:
      'Discover which of the 6 core human needs drive YOUR behavior in relationships.',
    questions: 36,
    duration: '10 min',
    icon: '⚡',
    expert: "Based on Tony Robbins' Human Needs Psychology",
    category: 'Know Yourself',
  },
  {
    type: 'gottman_checkup',
    title: 'Relationship Health Checkup',
    description:
      'Assess YOUR relationship behaviors — horsemen, bids, repair attempts, and connection patterns.',
    questions: 40,
    duration: '12 min',
    icon: '🏠',
    expert: "Based on Dr. John Gottman's Research",
    category: 'Own Yourself',
  },
  {
    type: 'emotional_intelligence',
    title: 'Emotional Intelligence',
    description:
      "Measure YOUR ability to recognize, understand, and manage emotions — yours and others'.",
    questions: 25,
    duration: '8 min',
    icon: '🎯',
    expert: "Based on Daniel Goleman's EQ Framework",
    category: 'Own Yourself',
  },
  {
    type: 'conflict_style',
    title: 'Conflict Resolution Style',
    description:
      'Discover YOUR default approach to conflict — and when it helps vs. hurts.',
    questions: 30,
    duration: '10 min',
    icon: '⚔️',
    expert: 'Based on Thomas-Kilmann Conflict Model',
    category: 'Grow Yourself',
  },
  {
    type: 'differentiation',
    title: 'Differentiation Level',
    description:
      'Assess YOUR emotional maturity — can you hold your position while staying connected?',
    questions: 20,
    duration: '7 min',
    icon: '🌱',
    expert: 'Based on Dr. Jennifer Finlayson-Fife & Murray Bowen',
    category: 'Grow Yourself',
  },
  {
    type: 'hormonal_health',
    title: 'Hormonal Wellness',
    description:
      'Screen for hormonal symptoms that silently impact your energy, mood, libido, and relationship. Not a diagnosis — a mirror for your body.',
    questions: 30,
    duration: '8 min',
    icon: '🧬',
    expert: 'Wellness screener — consult a healthcare provider for diagnosis',
    category: 'Fuel Yourself',
  },
  {
    type: 'physical_vitality',
    title: 'Physical Vitality',
    description:
      'Evaluate YOUR fitness, nutrition, sleep, energy, and body confidence. Your physical health IS your relationship health.',
    questions: 25,
    duration: '7 min',
    icon: '💪',
    expert: 'Based on exercise science, sleep research & nutritional psychology',
    category: 'Fuel Yourself',
  },
];

export const ASSESSMENT_CATALOG_TYPES = assessmentTypes.map((a) => a.type);
export const ASSESSMENT_CATALOG_COUNT = assessmentTypes.length;
