/**
 * Crisis Mode — Emergency Intervention Pathway
 * 
 * For couples in active crisis: affair discovery, major fight, separation threat.
 * Deploys immediate de-escalation tools from multiple experts.
 * 
 * Created by: Steve Rogers, CEO
 * Sources: Gottman (repair), Voss (de-escalation), Johnson (Hold Me Tight),
 *          Brown (narrative checking), Tatkin (nervous system co-regulation)
 */

/**
 * Determine crisis level from user input
 * @param {Object} signals - { recentFight, separationThreat, infidelity, emotionalShutdown, physicalSafety }
 * @returns {Object} Crisis assessment with level and recommended pathway
 */
function assessCrisis(signals) {
  const { recentFight, separationThreat, infidelity, emotionalShutdown, physicalSafety } = signals;

  // Physical safety ALWAYS takes priority
  if (physicalSafety === false) {
    return {
      level: 'safety',
      message: 'Your safety is the most important thing right now. If you are in danger, please contact the National Domestic Violence Hotline: 1-800-799-7233 or text START to 88788.',
      pathway: 'safety_first',
      resources: [
        { name: 'National Domestic Violence Hotline', phone: '1-800-799-7233', text: 'START to 88788' },
        { name: 'Crisis Text Line', text: 'HOME to 741741' },
        { name: '988 Suicide & Crisis Lifeline', phone: '988' },
      ],
    };
  }

  if (infidelity) {
    return {
      level: 'acute',
      message: 'Discovering infidelity is one of the most painful experiences in a relationship. What you\'re feeling right now — shock, rage, grief, disbelief — is completely normal. You don\'t have to decide anything right now.',
      pathway: 'infidelity_response',
    };
  }

  if (separationThreat) {
    return {
      level: 'acute',
      message: 'When separation feels like the only option, everything hurts. Before making any permanent decisions, let\'s create some space for your nervous system to calm down. Major decisions made during flooding are almost always regretted.',
      pathway: 'separation_prevention',
    };
  }

  if (recentFight && emotionalShutdown) {
    return {
      level: 'elevated',
      message: 'After a big fight where someone has shut down, the most important thing is NOT to resolve the argument right now. It\'s to re-establish safety. Gottman\'s research: when heart rate exceeds 100 BPM, you literally cannot hear each other.',
      pathway: 'post_fight_repair',
    };
  }

  if (recentFight) {
    return {
      level: 'moderate',
      message: 'Arguments happen in every relationship. What matters isn\'t that you fought — it\'s what you do next. Let\'s walk through a repair process.',
      pathway: 'standard_repair',
    };
  }

  return {
    level: 'low',
    message: 'It sounds like things are difficult right now. Let\'s work through this together.',
    pathway: 'general_support',
  };
}


/**
 * Get the crisis intervention steps for a given pathway
 * @param {string} pathway - Crisis pathway type
 * @returns {Object} Structured intervention with steps, tools, and expert attribution
 */
function getCrisisIntervention(pathway) {
  const interventions = {

    // ═══════════════════════════════════════════════════════
    // POST-FIGHT REPAIR (Gottman's 5-Step Method)
    // ═══════════════════════════════════════════════════════
    post_fight_repair: {
      title: 'After the Storm — Post-Fight Repair',
      expert: 'Gottman + Voss + Johnson',
      timeframe: 'Do this within 24 hours of the fight',
      prerequisite: 'Both partners must be calm (heart rate below 100 BPM). If either person is still flooded, use the Flooding First Aid protocol first.',
      steps: [
        {
          step: 1,
          title: 'Name Your Emotions',
          instruction: 'Each person identifies which emotions they felt during the fight. Don\'t explain or justify — just name them.',
          options: ['Hurt', 'Angry', 'Scared', 'Sad', 'Ashamed', 'Lonely', 'Overwhelmed', 'Defensive', 'Misunderstood', 'Rejected', 'Attacked', 'Shut down'],
          expert: 'Gottman: "The first step is naming what you actually felt — not what you thought."',
        },
        {
          step: 2,
          title: 'Share Your Perspective (Partner Takes Notes)',
          instruction: 'Each person describes what happened from THEIR point of view using "I felt... I saw... I heard... I imagined..." The other person TAKES NOTES — does not respond, defend, or correct.',
          format: '"I felt [emotion] when [situation]. I saw [behavior]. I heard [words]. I imagined [interpretation]."',
          expert: 'Gottman: "I one time filled up an entire yellow pad." The notebook method calms the prefrontal cortex and makes the speaker feel valued.',
        },
        {
          step: 3,
          title: 'Summarize and Validate',
          instruction: 'After listening, summarize what you heard. Then say: "From your point of view, I can see why you felt that way." You don\'t have to AGREE — just validate their experience.',
          script: '"What I heard you say is [summary]. From your perspective, that makes sense because [reason]."',
          expert: 'Voss: Getting someone to say "That\'s right" creates a chemical change — epiphany + empathy simultaneously.',
        },
        {
          step: 4,
          title: 'Identify Triggers (Enduring Vulnerabilities)',
          instruction: 'Ask: "Did any feelings from BEFORE this relationship get triggered?" Share where the pain originally started — childhood, past relationships, old wounds.',
          expert: 'Johnson: Attachment injuries from the past get reactivated in present conflicts. Naming them reduces their power.',
        },
        {
          step: 5,
          title: 'Take Responsibility and Apologize',
          instruction: 'Each person names what THEY contributed to the fight. State your regret specifically. Then say one thing you\'ll do differently next time.',
          format: '"I was [state of mind]. I regret [specific thing I said/did]. Next time, I will [specific change]."',
          expert: 'Gottman: "Note how late the apology comes. You can\'t apologize effectively if you haven\'t first understood the impact."',
          important: 'The apology comes LAST because you need to understand the full impact before you can meaningfully say sorry.',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════
    // INFIDELITY RESPONSE (Perel + Gottman)
    // ═══════════════════════════════════════════════════════
    infidelity_response: {
      title: 'After Discovery — Infidelity Response',
      expert: 'Perel + Gottman + Brown',
      timeframe: 'Immediate (first 48 hours) and ongoing',
      steps: [
        {
          step: 1,
          title: 'Breathe. You Don\'t Have to Decide Anything Right Now.',
          instruction: 'Your nervous system is in shock. This is trauma. You cannot make good decisions in this state. The ONLY job right now is to take care of yourself.',
          actions: ['Call someone you trust', 'Don\'t make permanent decisions today', 'Eat something, drink water, try to sleep', 'It\'s okay to feel everything and nothing at once'],
          expert: 'Brown: "When your heart is broken, you cannot trust what your mind is telling you." Your brain is flooding you with narratives. Not all of them are true.',
        },
        {
          step: 2,
          title: 'Resist the Sordid Details',
          instruction: 'Your mind will DEMAND details: Where? How often? Was she/he better? These questions only deepen the wound. They are your addiction to pain disguised as a search for truth.',
          instead: 'Ask the MEANING questions: "What did this mean for you? What were you seeking? What about us do you value? Are you glad it\'s over?"',
          expert: 'Perel: "Investigative questions mine meaning and motive. Sordid details only inflict more pain and keep you awake at night."',
        },
        {
          step: 3,
          title: 'For the One Who Strayed',
          instruction: 'End the affair completely. Express genuine remorse for the PAIN you caused (the impact on your partner). Become the protector of the boundaries. Bring it up proactively — don\'t make your partner police the memory.',
          expert: 'Perel: "The perpetrator must hold vigil for the relationship." Gottman: trust is rebuilt through consistent, transparent action over time — not a single apology.',
        },
        {
          step: 4,
          title: 'The Reframe',
          instruction: 'When you\'re ready (not today, maybe not this month): "Your first marriage is over. Would you like to create a second one together?" This isn\'t about forgetting — it\'s about choosing what comes next.',
          expert: 'Perel: "The majority of couples who experience affairs stay together. Some merely survive. Others turn a crisis into a generative experience."',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════
    // SEPARATION PREVENTION
    // ═══════════════════════════════════════════════════════
    separation_prevention: {
      title: 'Before You Walk Away',
      expert: 'Gottman + Johnson + Robbins',
      steps: [
        {
          step: 1,
          title: '72-Hour Rule',
          instruction: 'Make no permanent decisions for 72 hours. Gottman\'s research: major relationship decisions made during physiological flooding are almost always regretted. Your brain is in survival mode — it cannot evaluate a 10-year relationship in this state.',
          expert: 'Gottman: "Go to bed angry. A rested brain tomorrow beats a flooded brain at midnight."',
        },
        {
          step: 2,
          title: 'Ask the Real Question',
          instruction: 'Johnson says every conflict asks: "Are you there for me?" Before leaving, ask yourself: "Have I truly told my partner what I need? Not what\'s wrong with them — what I NEED from them?"',
          script: '"I need to feel [specific need]. When [specific situation], I feel [emotion]. What I\'m really asking is: are you still here for me?"',
          expert: 'Johnson: "Under every criticism is a cry for connection." Have you made that cry clearly?',
        },
        {
          step: 3,
          title: 'Separate the Person from the Pattern',
          instruction: 'You may be leaving the PATTERN, not the person. The pursue-withdraw cycle, the criticism loop, the emotional distance — those are PATTERNS that can be changed. The person underneath those patterns may be exactly who you need.',
          expert: 'Johnson: "The cycle is the enemy, not your partner." Gottman: "69% of problems are perpetual. If you leave this person, you\'ll inherit a new set of unsolvable problems with the next one."',
        },
      ],
    },

    // ═══════════════════════════════════════════════════════
    // STANDARD REPAIR
    // ═══════════════════════════════════════════════════════
    standard_repair: {
      title: 'Quick Repair After a Disagreement',
      expert: 'Gottman + Voss',
      steps: [
        {
          step: 1,
          title: 'Cool Down (if needed)',
          instruction: 'If either person\'s heart rate is elevated, take 20-30 minutes apart. Do something soothing — NOT replaying the argument.',
        },
        {
          step: 2,
          title: 'Lead with Ownership',
          instruction: 'The person who can move first says: "I think I contributed to that. Can we talk about it?"',
          expert: 'Gottman: "The earlier repair attempts are made, the more effective they are."',
        },
        {
          step: 3,
          title: 'Label, Don\'t Blame',
          instruction: 'Use Voss\'s labeling: "It seems like that conversation made you feel [emotion]." Then listen.',
          expert: 'Voss: labeling deactivates the amygdala. It\'s the fastest de-escalation tool there is.',
        },
      ],
    },
  };

  return interventions[pathway] || interventions.standard_repair;
}


/**
 * Flooding First Aid — immediate physiological de-escalation
 * Available at ALL times, not buried in a weekly module
 */
const floodingFirstAid = {
  title: 'Flooding First Aid — When Your Body Hits the Panic Button',
  expert: 'Gottman + Johnson + Tatkin',
  description: 'When your heart is racing, your palms are sweating, and you can\'t think straight — you\'re flooded. Your nervous system has hijacked your brain. You CANNOT listen, problem-solve, or empathize in this state. Here\'s what to do.',

  signals: [
    'Heart racing or pounding',
    'Sweaty palms or hot face',
    'Tunnel vision — can only see the threat',
    'Urge to yell, run, or shut down completely',
    'Repeating the same point louder',
    'Feeling like you might say something you\'ll regret',
    'Body is tense — jaw clenched, fists tight',
  ],

  protocol: [
    {
      step: 1,
      title: 'NAME IT',
      instruction: 'Say out loud: "I\'m flooding right now. I need a break."',
      important: 'Say "I need a break" — NOT "You need to stop."',
      expert: 'Gottman: the word "I" keeps it about YOUR state. The word "you" escalates.',
    },
    {
      step: 2,
      title: 'SET A TIME',
      instruction: 'Say: "I\'ll be back in [20-30 minutes]." Give a specific time.',
      important: 'This prevents your partner from feeling abandoned. They know you\'re coming back.',
      expert: 'Johnson: abandonment fear is the core wound. Stating when you\'ll return addresses it directly.',
    },
    {
      step: 3,
      title: 'SEPARATE',
      instruction: 'Go to a different room or outside. Do NOT continue the conversation from another room.',
    },
    {
      step: 4,
      title: 'CALM YOUR BODY (not your mind)',
      do: ['Deep breathing (4 counts in, 7 counts hold, 8 counts out)', 'Walk or light exercise', 'Cold water on wrists or face', 'Listen to music', 'Read something unrelated'],
      doNot: ['Do NOT replay the argument', 'Do NOT plan your rebuttal', 'Do NOT text/call anyone to vent about your partner', 'Do NOT watch anything violent or stressful'],
      expert: 'Gottman: "Thinking about the fight keeps you flooded." The goal is to bring your heart rate below 100 BPM.',
    },
    {
      step: 5,
      title: 'RETURN',
      instruction: 'Come back at the time you promised. Start with: "I\'m calmer now. I want to understand what you were saying."',
      expert: 'Gottman: returning when promised rebuilds trust. Not returning is a form of stonewalling.',
    },
  ],

  myth: {
    title: '"Never Go to Bed Angry" — MYTH',
    truth: 'Gottman says: St. Paul started this advice — "and he wasn\'t married." If it\'s late and you\'re flooded, go to bed. Give a quick kiss, say "I love you, we\'ll figure this out tomorrow." A rested brain always wins.',
  },
};


/**
 * Ritual Builder — progressive daily/weekly rituals based on Gottman research
 */
const ritualBuilder = {
  title: 'Rituals of Connection — The Architecture of Love',
  expert: 'Gottman + Tatkin',
  description: 'Small daily rituals beat grand gestures. Gottman found that couples who maintain rituals of connection have dramatically better outcomes. These are non-negotiable building blocks.',

  starterRituals: [
    {
      name: 'The 6-Second Kiss',
      frequency: 'daily',
      when: 'Parting (morning) and reunion (evening)',
      instruction: 'Kiss your partner for a full 6 seconds when you leave and when you reunite. Not a peck — 6 seconds.',
      why: 'Triggers oxytocin release. Creates bonding and psychological safety. German study: men who kiss their wives goodbye live 4 years longer.',
      difficulty: 1,
      week: 1,
    },
    {
      name: 'The Morning Check-In',
      frequency: 'daily',
      when: 'Morning, before the day begins',
      instruction: 'Ask: "What\'s on your plate today? Anything I should know about?" Listen. Don\'t fix.',
      why: 'Gottman: "We kind of check in with each other... in that way you don\'t lose touch, you don\'t make assumptions."',
      difficulty: 1,
      week: 1,
    },
    {
      name: 'The 20-Second Hug',
      frequency: 'daily',
      when: 'At least once per day',
      instruction: 'Hold your partner for a full 20 seconds. Not a pat-on-the-back hug — a real, full-body embrace.',
      why: '20 seconds triggers oxytocin release, same as the 6-second kiss. Creates physical safety and emotional bonding.',
      difficulty: 1,
      week: 1,
    },
    {
      name: 'Stress-Reducing Conversation',
      frequency: 'daily',
      when: 'End of day (before screens/dinner)',
      instruction: '20 minutes of uninterrupted talking about what happened today OUTSIDE the relationship. No problem-solving — just listen, empathize, take your partner\'s side.',
      why: 'Gottman: this is the single most powerful daily ritual. It builds Love Maps and shows your partner you\'re interested in their world.',
      difficulty: 2,
      week: 2,
    },
    {
      name: 'Weekly "What Do You Need?" Check-In',
      frequency: 'weekly',
      when: 'Sunday evening or whenever works',
      instruction: 'Ask: "What is one thing I can do next week to make you feel more loved?" Listen. Do it.',
      why: 'Gottman\'s card deck approach: "Rather than leaving it to chance... she can tell you what two things you can do to make her happy this week."',
      difficulty: 2,
      week: 3,
    },
    {
      name: 'The Date Night',
      frequency: 'weekly',
      when: 'Any evening you protect from other obligations',
      instruction: 'Planned, intentional time together. Alternate who plans. No phones. No kids talk. No logistics. Just be together.',
      why: 'Perel: "Committed sex is premeditated sex." The same applies to connection — it doesn\'t happen by accident in a long-term relationship.',
      difficulty: 2,
      week: 4,
    },
    {
      name: 'The Repair Phrase',
      frequency: 'as needed',
      when: 'During or after any conflict',
      instruction: 'Memorize ONE repair phrase. Use it when things get heated: "I\'m sorry. Let me try that again." or "I\'m starting to feel defensive. Can you say that differently?"',
      why: 'Gottman: repair attempts are the #1 predictor of relationship success. The earlier, the better.',
      difficulty: 3,
      week: 4,
    },
    {
      name: 'Annual State of the Union',
      frequency: 'yearly',
      when: 'Anniversary, New Year, or any meaningful date',
      instruction: 'Three questions (Gottman\'s honeymoon tradition): 1) What sucked this year? 2) What did we love? 3) What do we want next year to be like?',
      why: 'Gottman and Julie have done this for 23 years: "we can really take a hard look at our lives and see what needs to change."',
      difficulty: 3,
      week: 6,
    },
  ],

  /**
   * Get rituals appropriate for a given week in the program
   * @param {number} week - Current week (1-6)
   * @returns {Array} Rituals unlocked up to this week
   */
  getRitualsForWeek(week) {
    return this.starterRituals.filter(r => r.week <= week);
  },
};


module.exports = {
  assessCrisis,
  getCrisisIntervention,
  floodingFirstAid,
  ritualBuilder,
};
