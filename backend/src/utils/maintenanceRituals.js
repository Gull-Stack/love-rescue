/**
 * maintenanceRituals.js — Post-Cycle Maintenance Rituals Engine
 * 
 * After a user completes a 6-week strategy cycle, they need ongoing micro-rituals
 * to lock in their gains. This module generates personalized daily/weekly rituals
 * that adapt to the user's profile and progressively deepen over 12 weeks.
 * 
 * Architecture:
 *   generateMaintenanceRituals(userProfile) → personalized ritual set
 *   generateMaintenancePlan(userProfile, weekNumber) → full week of rituals (weeks 1-12)
 * 
 * Expert Sources:
 *   - Gottman: Rituals of connection, Sound Relationship House
 *   - Perel: Maintaining desire, erotic intelligence, curiosity
 *   - Chapman: Love languages, specific expression vehicles
 *   - Johnson: EFT accessibility/responsiveness/engagement (A.R.E.)
 * 
 * @module maintenanceRituals
 */

const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════════
// RITUAL TEMPLATES — The 3 core rituals every couple gets
// ═══════════════════════════════════════════════════════════════════

/**
 * Base ritual templates. These are the scaffolding — each one gets
 * personalized by attachment style, love language, and conflict style
 * before being served to the user.
 */
const RITUAL_TEMPLATES = {
  morningCheckIn: {
    id: 'morning-check-in',
    title: 'Morning Check-In',
    duration: 2, // minutes
    frequency: 'daily',
    timeOfDay: 'morning',
    baseDifficulty: 1,
    expert: 'gottman',
    expertName: 'Dr. John Gottman',
    expertCredential: 'can predict divorce with 94% accuracy from 15 minutes of observation',
    baseInstructions: [
      'Before you leave each other (or before the day pulls you apart), pause for 2 minutes.',
      'Each person shares ONE thing they have going on today — not logistics, something real.',
      'The listener reflects back: "So today is a big day because ___."',
      'End with a 6-second kiss (yes, count — it triggers oxytocin release).'
    ],
    whyItWorks: 'Gottman found that couples who know what\'s happening in each other\'s inner world handle stress 40% better. This 2-minute ritual builds "Love Maps" — your mental model of your partner\'s world. The 6-second kiss bridges the gap between a perfunctory peck and genuine physical connection.',
  },

  eveningGratitude: {
    id: 'evening-gratitude',
    title: 'Evening Gratitude',
    duration: 3, // minutes
    frequency: 'daily',
    timeOfDay: 'evening',
    baseDifficulty: 1,
    expert: 'gottman',
    expertName: 'Dr. John Gottman',
    expertCredential: 'founder of the Gottman Institute, 40+ years of relationship research',
    baseInstructions: [
      'At the end of the day (dinner, bedtime, whenever you reconnect), each person shares:',
      '1. One specific thing your partner did today that you appreciated.',
      '2. One specific thing about your partner\'s CHARACTER you\'re grateful for.',
      'Be precise: "I appreciated that you texted to check on my meeting" — not "thanks for being nice."',
      'The receiver says "thank you" and nothing else. No deflecting, no "it was nothing."'
    ],
    whyItWorks: 'Gottman\'s research shows that a "culture of appreciation" is the #1 buffer against contempt — the single most destructive force in relationships. Specific gratitude rewires your brain\'s negativity bias. Receiving it without deflecting teaches you to let love in.',
  },

  weeklyStateOfUs: {
    id: 'weekly-state-of-us',
    title: 'Weekly State of Us',
    duration: 15, // minutes
    frequency: 'weekly',
    timeOfDay: 'flexible',
    preferredDay: 'sunday',
    baseDifficulty: 2,
    expert: 'perel',
    expertName: 'Esther Perel',
    expertCredential: 'world-renowned relationship therapist, author of Mating in Captivity',
    baseInstructions: [
      'Set aside 15 uninterrupted minutes. No phones. Sit facing each other.',
      'Each person takes turns answering these 3 questions:',
      '1. "What\'s one thing that went well for US this week?" (celebrate a win)',
      '2. "What\'s one thing I wish I\'d handled differently?" (own your part — no blaming)',
      '3. "What\'s one thing I\'d love more of next week?" (a specific, actionable request)',
      'While one person speaks, the other ONLY listens and reflects back.',
      'End by naming one thing you\'re looking forward to together next week.'
    ],
    whyItWorks: 'Perel teaches that relationships die not from big explosions but from slow erosion — the things left unsaid. This ritual prevents buildup. Owning your part (question 2) builds trust. Requesting more of what you want (question 3) replaces criticism with invitation. Gottman calls this a "ritual of connection" — a predictable moment of togetherness that anchors the relationship.',
  }
};

// ═══════════════════════════════════════════════════════════════════
// ADAPTATION LAYERS — How rituals personalize based on user profile
// ═══════════════════════════════════════════════════════════════════

/**
 * Attachment style adaptations.
 * Each style gets modified instructions that speak to their core fear
 * and leverage their natural strengths.
 */
const ATTACHMENT_ADAPTATIONS = {
  anxious: {
    morningCheckIn: {
      additionalInstructions: [
        'If you feel the urge to ask "Are we okay?" — notice it. Instead, share something vulnerable about YOUR day.',
        'Resist the pull to extend this beyond 2 minutes. Brevity builds trust that connection doesn\'t require intensity.'
      ],
      difficultyModifier: 0,
      expert: 'johnson',
      why: 'Johnson (EFT): Anxious attachment drives a need for constant reassurance. This ritual provides predictable connection WITHOUT requiring your partner to prove their love. Over time, the reliability of the ritual itself becomes a source of security.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Focus your gratitude on something SMALL your partner did — not grand gestures.',
        'When receiving gratitude, practice sitting with it for 5 seconds before responding. Let it land.'
      ],
      difficultyModifier: 0,
      expert: 'johnson',
      why: 'Anxious attachers often dismiss small gestures while craving dramatic ones. Training yourself to see and appreciate the small things rewires your "enough" threshold.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'When sharing what you\'d like more of, frame it as desire, not deficit: "I\'d love it if..." not "You never..."',
        'If anxiety spikes during this conversation, name it: "I\'m feeling anxious right now" — don\'t act on it.'
      ],
      difficultyModifier: 1,
      expert: 'johnson',
      why: 'For anxious attachers, structured check-ins reduce the need for unstructured reassurance-seeking. Knowing Sunday is "our time to talk about us" means you don\'t have to ambush your partner on Tuesday.'
    }
  },

  avoidant: {
    morningCheckIn: {
      additionalInstructions: [
        'Share something about your inner world, not just your schedule. "I\'m nervous about..." not just "I have a meeting."',
        'The 6-second kiss may feel uncomfortable at first. That discomfort is your growth edge — lean in.'
      ],
      difficultyModifier: 1,
      expert: 'johnson',
      why: 'Johnson (EFT): Avoidant attachment minimizes connection needs. This ritual is deliberately short (2 min) to stay within your comfort zone while gradually expanding your capacity for intimacy. The 6-second kiss bypasses your cognitive defenses and goes straight to the body.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Challenge yourself to express gratitude about an EMOTIONAL quality, not just a practical one.',
        'When you want to change the subject or make a joke, notice that impulse — it\'s your avoidance pattern. Stay.'
      ],
      difficultyModifier: 1,
      expert: 'johnson',
      why: 'Avoidant attachers are comfortable appreciating what partners DO but struggle to appreciate who they ARE. This distinction is the bridge from functional partnership to emotional intimacy.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'When your partner shares, resist the urge to problem-solve. Just reflect: "I hear you saying ___."',
        'For question 3, challenge yourself to request something EMOTIONAL, not logistical: "I\'d love more eye contact when we talk" not "I\'d like you to do dishes more."'
      ],
      difficultyModifier: 1,
      expert: 'johnson',
      why: 'This is the hardest ritual for avoidant attachers — it requires sustained emotional presence. But Johnson\'s research shows that avoidants who practice structured emotional engagement build secure attachment over time. The structure IS the safety.'
    }
  },

  'fearful-avoidant': {
    morningCheckIn: {
      additionalInstructions: [
        'If you feel pulled toward OR away from your partner this morning, simply notice it. No judgment.',
        'Keep to the structure exactly. Predictability is medicine for fearful-avoidant attachment.'
      ],
      difficultyModifier: 1,
      expert: 'johnson',
      why: 'Fearful-avoidant attachment alternates between craving and fearing closeness. Structured rituals provide the safety of predictability — you know exactly what\'s expected, which reduces the anxiety of improvised intimacy.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'If you notice yourself wanting to pull away after sharing something genuine, stay put. Breathe.',
        'It\'s okay if gratitude feels awkward. Awkward ≠ wrong. It\'s a sign you\'re doing something new.'
      ],
      difficultyModifier: 1,
      expert: 'johnson',
      why: 'Fearful-avoidant patterns create a push-pull in emotional expression. Gratitude practice provides a low-stakes way to practice vulnerability without the risk of full emotional exposure.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'If you feel overwhelmed during this conversation, say "I need a 2-minute pause" — then come BACK.',
        'The coming back part is everything. It rewires your nervous system to learn that rupture ≠ abandonment.'
      ],
      difficultyModifier: 2,
      expert: 'johnson',
      why: 'Johnson\'s EFT research shows that the repair cycle — disconnect, notice, reconnect — is how earned security is built. The State of Us gives you a safe container to practice this cycle weekly.'
    }
  },

  secure: {
    morningCheckIn: {
      additionalInstructions: [
        'You likely already do some version of this. The ritual adds intentionality — move from autopilot to presence.',
        'Challenge: share something you haven\'t told anyone else today. Keep deepening.'
      ],
      difficultyModifier: 0,
      expert: 'perel',
      why: 'Perel warns that security without curiosity becomes stagnation. Secure couples\' biggest risk isn\'t disconnection — it\'s taking each other for granted. This ritual fights complacency.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Go beyond the obvious. Find something surprising to appreciate — something you\'ve never mentioned.',
        'Ask yourself: "When did my partner surprise me today?" Surprise is where aliveness lives.'
      ],
      difficultyModifier: 0,
      expert: 'perel',
      why: 'Secure attachers can coast on good-enough. Perel\'s insight: desire requires a gap, something unknown. Finding the surprising in the familiar is how you keep desire alive in a secure relationship.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'Use this ritual to explore GROWTH, not just maintenance. "What new territory could we explore together?"',
        'Consider adding a fourth question: "What am I curious about in you right now?"'
      ],
      difficultyModifier: 0,
      expert: 'perel',
      why: 'Perel: "Love is a verb. Desire is a noun you must keep creating." For secure couples, the weekly check-in is less about repair and more about expansion — keeping the relationship dynamic rather than static.'
    }
  }
};

/**
 * Love language adaptations.
 * Modifies ritual content to speak the user's primary love language.
 */
const LOVE_LANGUAGE_ADAPTATIONS = {
  words_of_affirmation: {
    morningCheckIn: {
      additionalInstructions: [
        'Add a verbal affirmation before you part: "I believe in you today" or "I\'m proud of who you are."'
      ],
      expert: 'chapman',
      why: 'Chapman: For Words of Affirmation speakers, verbal encouragement fills the emotional tank faster than any other gesture. Starting the day with spoken belief is rocket fuel.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Be extra specific with your words — "I love how you handled that difficult call with patience" hits harder than "good job today."'
      ],
      expert: 'chapman',
      why: 'Chapman: Specific verbal appreciation is 5x more powerful than generic praise for this love language. The detail proves you were paying attention.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'During the check-in, verbally affirm your commitment: "I choose us. I choose you. Here\'s why this week..."'
      ],
      expert: 'chapman',
      why: 'Words of Affirmation speakers need to HEAR the commitment, not just see it in actions. Explicit verbal recommitment prevents the "Do they still love me?" spiral.'
    }
  },

  acts_of_service: {
    morningCheckIn: {
      additionalInstructions: [
        'Ask: "What\'s one thing on your plate today I could take off it?" — then actually do it.'
      ],
      expert: 'chapman',
      why: 'Chapman: For Acts of Service speakers, "How can I help?" is the most loving sentence in any language. It shows love through action, which is how they receive it.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Notice and name one act of service your partner did today — especially the invisible ones (laundry, planning, remembering).'
      ],
      expert: 'chapman',
      why: 'Acts of Service speakers often feel their efforts go unnoticed. Naming the invisible labor validates their love expression and encourages more of it.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'For "what I\'d love more of" — request a specific action, not a feeling: "Could you handle dinner Tuesday so I can rest?" is clearer than "I need more support."'
      ],
      expert: 'chapman',
      why: 'Acts of Service speakers think in concrete terms. Specific, actionable requests are easier to fulfill and feel more loving than vague emotional appeals.'
    }
  },

  receiving_gifts: {
    morningCheckIn: {
      additionalInstructions: [
        'Leave a small token — a note, a favorite snack, a flower — where your partner will find it during their day.'
      ],
      expert: 'chapman',
      why: 'Chapman: Gifts aren\'t about materialism — they\'re tangible symbols of "I was thinking about you." For this love language, a $2 note card can outweigh a $200 dinner.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'If your partner gave or got you something today (even small), acknowledge the THOUGHT behind it, not the thing itself.'
      ],
      expert: 'chapman',
      why: 'Gift-language speakers invest meaning in objects. Appreciating the thought validates their way of loving.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'Consider bringing something small to the check-in — a photo, a memento from the week, something that represents a shared moment.'
      ],
      expert: 'chapman',
      why: 'Physical tokens anchor emotional conversations for gift-language speakers. They make abstract feelings concrete and keepable.'
    }
  },

  quality_time: {
    morningCheckIn: {
      additionalInstructions: [
        'Put phones in another room for these 2 minutes. FULL presence. Eye contact. This isn\'t a drive-by — it\'s your moment.'
      ],
      expert: 'chapman',
      why: 'Chapman: Quality Time speakers don\'t measure love in hours — they measure it in presence. 2 minutes of full attention beats 2 hours of divided attention.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Share your gratitude while sitting together, not shouting it across the room. Physical proximity amplifies emotional proximity.'
      ],
      expert: 'chapman',
      why: 'For Quality Time speakers, HOW you share matters as much as WHAT you share. Side-by-side presence transforms words into felt experience.'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'This is YOUR ritual. Protect it fiercely. No rescheduling unless absolutely necessary — consistency IS the love expression.'
      ],
      expert: 'chapman',
      why: 'Quality Time speakers experience canceled plans as rejection. The reliability of this weekly ritual becomes a primary love expression in itself.'
    }
  },

  physical_touch: {
    morningCheckIn: {
      additionalInstructions: [
        'Hold hands or maintain physical contact throughout the 2 minutes. Let the words travel through touch.'
      ],
      expert: 'chapman',
      why: 'Chapman: Physical Touch speakers process emotional connection through the body. Words without touch feel incomplete. Touch without words feels shallow. Together, they\'re complete.'
    },
    eveningGratitude: {
      additionalInstructions: [
        'Deliver your gratitude while in physical contact — hand on their back, arm around them, holding hands.',
        'End with a 20-second hug. Count silently. It takes 20 seconds for oxytocin to release.'
      ],
      expert: 'chapman',
      why: 'For Physical Touch speakers, gratitude delivered through the body registers at a deeper level than words alone. The 20-second hug is Chapman\'s "emotional reset button."'
    },
    weeklyStateOfUs: {
      additionalInstructions: [
        'Sit close enough to touch throughout the conversation. If things get tense, reach for their hand — it de-escalates through the nervous system.'
      ],
      expert: 'chapman',
      why: 'Physical Touch speakers experience emotional safety through the body. Touch during difficult conversations regulates the nervous system (Tatkin) and communicates "I\'m here even when this is hard."'
    }
  }
};

/**
 * Conflict style adaptations.
 * Modifies the Weekly State of Us based on dominant conflict pattern.
 */
const CONFLICT_ADAPTATIONS = {
  pursuer: {
    weeklyStateOfUs: {
      additionalInstructions: [
        'When sharing what you want more of, limit yourself to ONE request. Pursuers tend to pile up — one is more powerful.',
        'If your partner goes quiet, give them 10 seconds of silence. Silence ≠ rejection. They may be processing.'
      ],
      expert: 'johnson',
      why: 'Johnson (EFT): Pursuers escalate because silence feels like abandonment. The State of Us gives you a guaranteed space to be heard, which reduces the urgency to pursue during the week. One clear request lands better than five urgent ones.'
    }
  },
  withdrawer: {
    weeklyStateOfUs: {
      additionalInstructions: [
        'Challenge yourself to share FIRST in at least one of the three questions. Going first is a gift to your partner.',
        'When you feel the urge to say "I don\'t know" — pause. The answer is usually underneath. Give yourself 10 seconds.'
      ],
      expert: 'johnson',
      why: 'Johnson (EFT): Withdrawers retreat because emotional engagement feels overwhelming. This structured format makes it manageable — you know exactly what\'s expected. Going first signals "I\'m choosing to be here" which is profoundly reassuring to a pursuing partner.'
    }
  },
  volatile: {
    weeklyStateOfUs: {
      additionalInstructions: [
        'Use the "speaker-listener" technique: one person holds an object (pen, mug) — only the holder speaks.',
        'If intensity rises above a 6/10, take a 5-minute break. Come back. The coming back is the skill.'
      ],
      expert: 'gottman',
      why: 'Gottman found that volatile couples can thrive IF they maintain the 5:1 ratio even during conflict. The speaker-listener technique channels intensity into structure. The break-and-return teaches your nervous system that high emotion doesn\'t have to mean high damage.'
    }
  },
  avoidant_conflict: {
    weeklyStateOfUs: {
      additionalInstructions: [
        'The fact that you\'re sitting down for this is the win. Don\'t skip question 2 (what you\'d do differently) — that\'s where growth lives.',
        'If "everything\'s fine" comes up, dig one layer deeper: "It IS fine, AND one thing I noticed was..."'
      ],
      expert: 'gottman',
      why: 'Gottman: Conflict-avoidant couples suppress small issues until they become big ones. This weekly ritual is a pressure-release valve. It gives you permission to say "something small bothered me" before it becomes "I can\'t do this anymore."'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// PROGRESSIVE DIFFICULTY — 12-week deepening schedule
// ═══════════════════════════════════════════════════════════════════

/**
 * Week-by-week enhancements that layer onto the base rituals.
 * Weeks 1-3: Foundation (difficulty 1-2) — build the habit
 * Weeks 4-6: Deepening (difficulty 2-3) — add vulnerability
 * Weeks 7-9: Stretching (difficulty 3-4) — practice during friction
 * Weeks 10-12: Mastery (difficulty 4-5) — internalize and lead
 */
const WEEKLY_ENHANCEMENTS = {
  1: {
    theme: 'Building the Habit',
    difficultyRange: [1, 2],
    morningEnhancement: null, // Week 1: just do the base ritual
    eveningEnhancement: null,
    weeklyEnhancement: null,
    bonusRitual: null,
  },
  2: {
    theme: 'Finding Your Rhythm',
    difficultyRange: [1, 2],
    morningEnhancement: {
      instruction: 'Add a "departure ritual" — wave from the window, text "thinking of you" 1 hour after parting.',
      expert: 'gottman',
      why: 'Gottman: Departure and reunion rituals are the bookends of daily connection. Most couples just... leave. A deliberate departure says "You matter to me even when I\'m not here."'
    },
    eveningEnhancement: null,
    weeklyEnhancement: null,
    bonusRitual: null,
  },
  3: {
    theme: 'Noticing Patterns',
    difficultyRange: [1, 2],
    morningEnhancement: null,
    eveningEnhancement: {
      instruction: 'Add a third element to your gratitude: name one thing about yourself you\'re proud of today in the relationship.',
      expert: 'brown',
      why: 'Brown: Self-compassion fuels other-compassion. If you can\'t appreciate yourself, your gratitude for others becomes performative. Naming your own growth grounds you.'
    },
    weeklyEnhancement: {
      instruction: 'After the 3 standard questions, spend 2 extra minutes discussing: "What pattern did we repeat this week, and do we want to keep it?"',
      expert: 'johnson',
      why: 'Johnson (EFT): Pattern awareness is the gateway to change. You can\'t interrupt a cycle you can\'t see. This question trains you to observe your dance from above.'
    },
    bonusRitual: null,
  },
  4: {
    theme: 'Adding Vulnerability',
    difficultyRange: [2, 3],
    morningEnhancement: {
      instruction: 'Share one thing you\'re worried about today — not just busy with, but genuinely anxious about.',
      expert: 'johnson',
      why: 'Johnson: Accessibility means letting your partner see your soft underbelly. Sharing worry is harder than sharing schedules. It says "I trust you with my fear."'
    },
    eveningEnhancement: {
      instruction: 'Replace one character gratitude with a vulnerability: "Something that scared me today was ___."',
      expert: 'brown',
      why: 'Brown: Vulnerability is not weakness — it\'s the birthplace of connection. Sharing fear at the end of the day invites your partner into your real experience.'
    },
    weeklyEnhancement: null,
    bonusRitual: {
      id: 'mid-week-pulse',
      title: 'Mid-Week Pulse Check',
      duration: 5,
      frequency: 'weekly',
      preferredDay: 'wednesday',
      difficulty: 2,
      expert: 'gottman',
      expertName: 'Dr. John Gottman',
      instructions: [
        'On Wednesday, take 5 minutes to check in: "How are WE doing this week? Scale of 1-10."',
        'If either person says below 7, ask: "What would move it up one point?"',
        'Don\'t try to fix it in 5 minutes. Just know where you stand.'
      ],
      whyItWorks: 'Gottman: couples who check in mid-week catch small drifts before they become large distances. The 1-10 scale gives language to the inarticulate "something feels off."'
    }
  },
  5: {
    theme: 'Deepening Curiosity',
    difficultyRange: [2, 3],
    morningEnhancement: {
      instruction: 'Ask one question you don\'t know the answer to: "What\'s something you\'ve been thinking about that you haven\'t told me?"',
      expert: 'perel',
      why: 'Perel: "Mystery is not the enemy of intimacy — it\'s the precondition for desire." Asking what you don\'t know keeps your partner as a separate, fascinating person — not a fully-mapped territory.'
    },
    eveningEnhancement: null,
    weeklyEnhancement: {
      instruction: 'Add a "desire check-in" to the State of Us: "When did you feel most drawn to me this week? When did you feel most distant?"',
      expert: 'perel',
      why: 'Perel: Most couples track conflict but never track desire. Naming the moments of pull and push makes the invisible visible — and gives you data on what actually creates attraction in YOUR relationship.'
    },
    bonusRitual: null,
  },
  6: {
    theme: 'Practicing Repair',
    difficultyRange: [2, 3],
    morningEnhancement: null,
    eveningEnhancement: {
      instruction: 'If there was friction today, add a micro-repair before gratitude: "Earlier when I ___, I wish I had ___ instead."',
      expert: 'gottman',
      why: 'Gottman: The speed of repair predicts relationship success better than the absence of conflict. Same-day repair prevents emotional debt from compounding overnight.'
    },
    weeklyEnhancement: null,
    bonusRitual: {
      id: 'repair-inventory',
      title: 'Repair Attempt Inventory',
      duration: 10,
      frequency: 'weekly',
      preferredDay: 'saturday',
      difficulty: 3,
      expert: 'gottman',
      expertName: 'Dr. John Gottman',
      instructions: [
        'Together, review the week: identify every repair attempt made by either person.',
        'A repair attempt is ANY effort to de-escalate: humor, touch, apology, changing the subject, saying "I\'m sorry."',
        'For each one: did the other person ACCEPT the repair? If not, what got in the way?',
        'Choose one repair style to practice intentionally next week.'
      ],
      whyItWorks: 'Gottman: In happy relationships, 86% of repair attempts are accepted. In unhappy ones, 81% are rejected. The issue isn\'t whether you fight — it\'s whether you let each other back in.'
    }
  },
  7: {
    theme: 'Stretching Comfort Zones',
    difficultyRange: [3, 4],
    morningEnhancement: {
      instruction: 'Share a need you\'ve been holding back: "Something I haven\'t asked for but actually need is ___."',
      expert: 'johnson',
      why: 'Johnson: Unspoken needs become protest behaviors — the pursuer demands, the withdrawer retreats. Speaking the raw need ("I need to know I matter to you") is the bravest and most connecting thing you can do.'
    },
    eveningEnhancement: null,
    weeklyEnhancement: {
      instruction: 'During the State of Us, each person completes: "The story I tell myself when we disconnect is ___. What I actually need in that moment is ___."',
      expert: 'brown',
      why: 'Brown\'s "the story I\'m telling myself" technique interrupts the shame/blame narrative. Pairing it with the actual need transforms accusation into invitation. This is PhD-level emotional communication.'
    },
    bonusRitual: null,
  },
  8: {
    theme: 'Navigating Friction Skillfully',
    difficultyRange: [3, 4],
    morningEnhancement: null,
    eveningEnhancement: {
      instruction: 'If you had a disagreement today, add: "My part in that was ___. What I admire about how YOU handled it was ___."',
      expert: 'gottman',
      why: 'Taking ownership AND finding something to admire in your partner during conflict is the integration of Gottman\'s repair research and his Fondness & Admiration system. It\'s brutally hard and transformatively powerful.'
    },
    weeklyEnhancement: null,
    bonusRitual: {
      id: 'dreams-within-conflict',
      title: 'Dreams Within Conflict',
      duration: 15,
      frequency: 'weekly',
      preferredDay: 'saturday',
      difficulty: 4,
      expert: 'gottman',
      expertName: 'Dr. John Gottman',
      instructions: [
        'Pick a recurring disagreement you can\'t seem to resolve.',
        'Instead of debating it, each person answers: "What does this issue mean to me? What dream or value is underneath my position?"',
        'Listen to understand the DREAM, not to win the argument.',
        'You don\'t have to agree. You DO have to understand what this symbolizes for your partner.'
      ],
      whyItWorks: 'Gottman: 69% of relationship conflicts are perpetual — they never get "solved." But they can be navigated with honor. Understanding the dream beneath the position transforms gridlock into dialogue. This is the difference between "we fight about money" and "money represents security to me because I grew up without it."'
    }
  },
  9: {
    theme: 'Creating Novelty',
    difficultyRange: [3, 4],
    morningEnhancement: {
      instruction: 'Surprise your partner with something unexpected in the check-in: a new question, a poem, a song lyric, a memory they\'ve forgotten.',
      expert: 'perel',
      why: 'Perel: "Desire needs space and novelty. When you can still surprise your partner, you remind them that you are not fully known — and THAT is what desire feeds on."'
    },
    eveningEnhancement: null,
    weeklyEnhancement: {
      instruction: 'Replace the standard State of Us with an "adventure planning session" — plan something neither of you has done before.',
      expert: 'perel',
      why: 'Perel: Shared novelty creates a "third space" between you — not yours, not mine, but ours. Novel experiences release dopamine, which the brain associates with your partner. You\'re literally hacking your own neurochemistry.'
    },
    bonusRitual: null,
  },
  10: {
    theme: 'Becoming the Expert',
    difficultyRange: [4, 5],
    morningEnhancement: {
      instruction: 'Lead the morning check-in entirely from your partner\'s perspective: guess what their day holds, what they\'re feeling, what they need. Then ask: "How close was I?"',
      expert: 'gottman',
      why: 'Gottman: A deep Love Map means you can predict your partner\'s inner world. Testing your accuracy is how you know you\'ve truly learned them — not as they were, but as they ARE.'
    },
    eveningEnhancement: {
      instruction: 'Express gratitude for something your partner doesn\'t even know they do — an unconscious habit that makes your life better.',
      expert: 'gottman',
      why: 'Noticing the unconscious gifts means you\'re seeing your partner at a level most people never reach. This is intimacy\'s final form: knowing someone better than they know themselves.'
    },
    weeklyEnhancement: null,
    bonusRitual: null,
  },
  11: {
    theme: 'Teaching What You\'ve Learned',
    difficultyRange: [4, 5],
    morningEnhancement: null,
    eveningEnhancement: null,
    weeklyEnhancement: {
      instruction: 'During the State of Us, discuss: "What have we learned about us in these 11 weeks that we didn\'t know before? What would we tell ourselves at Week 1?"',
      expert: 'perel',
      why: 'Perel: "The quality of your life is the quality of your relationships, and the quality of your relationships is the quality of your conversations about them." This meta-conversation cements your growth narrative as a couple.'
    },
    bonusRitual: {
      id: 'relationship-letter',
      title: 'Letter to Your Relationship',
      duration: 15,
      frequency: 'once',
      difficulty: 5,
      expert: 'johnson',
      expertName: 'Dr. Sue Johnson',
      instructions: [
        'Each person writes a 1-page letter to the RELATIONSHIP (not to each other, to "us").',
        'Include: what I\'ve learned, what I\'m proud of, what I commit to going forward.',
        'Read them aloud to each other.',
        'Keep them somewhere safe. Re-read on your anniversary.'
      ],
      whyItWorks: 'Johnson (EFT): Addressing the relationship as an entity shifts from "you and me" to "us." Writing creates permanence. Reading aloud creates witnessing. This ritual becomes an anchor you can return to when storms hit.'
    }
  },
  12: {
    theme: 'Sustaining the Practice',
    difficultyRange: [4, 5],
    morningEnhancement: {
      instruction: 'By now, this ritual should feel natural. If it does — you\'ve rewired your attachment system. If it still feels hard — that\'s exactly why you keep going.',
      expert: 'johnson',
      why: 'Johnson: Earned secure attachment is built through repeated experiences of reaching and being met. 12 weeks of daily connection rituals is how "I hope they\'ll be there" becomes "I know they\'ll be there."'
    },
    eveningEnhancement: {
      instruction: 'Expand your gratitude to include your partner\'s growth: "Something I\'ve watched you grow in is ___."',
      expert: 'gottman',
      why: 'Acknowledging growth is the ultimate form of "I see you." It tells your partner: I\'m paying attention, not just to today, but to your journey.'
    },
    weeklyEnhancement: {
      instruction: 'Design your OWN ritual together. You\'ve practiced the template — now make it yours. What questions matter most to YOUR relationship?',
      expert: 'perel',
      why: 'Perel: "Every couple must create their own language." The ultimate success of this program is when you don\'t need the script anymore — you\'ve internalized the practice and made it your own.'
    },
    bonusRitual: {
      id: 'renewal-ceremony',
      title: 'Renewal Ceremony',
      duration: 20,
      frequency: 'once',
      difficulty: 5,
      expert: 'gottman',
      expertName: 'Dr. John Gottman',
      instructions: [
        'Create a small ceremony for just the two of you — it can be anywhere meaningful.',
        'Each person shares: one thing they\'re grateful for from the past 12 weeks, one commitment for the future.',
        'Exchange a symbolic gift (can be as simple as a written promise or a meaningful object).',
        'Decide together: which rituals do you want to keep? What becomes your permanent practice?'
      ],
      whyItWorks: 'Gottman: Rituals create shared meaning — the highest level of the Sound Relationship House. A renewal ceremony transforms 12 weeks of practice into a story you tell about who you are as a couple. Stories sustain us when habits falter.'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// CORE API
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate personalized maintenance rituals based on user profile.
 * 
 * Takes a user's completed assessment data and returns the 3 core rituals
 * adapted to their attachment style, love language, and conflict style.
 * 
 * @param {Object} userProfile - The user's relationship profile
 * @param {string} [userProfile.attachmentStyle] - 'anxious'|'avoidant'|'fearful-avoidant'|'secure'
 * @param {string} [userProfile.loveLanguage] - 'words_of_affirmation'|'acts_of_service'|'receiving_gifts'|'quality_time'|'physical_touch'
 * @param {string} [userProfile.cyclePosition] - 'pursuer'|'withdrawer' (conflict style)
 * @param {string} [userProfile.conflictStyle] - 'volatile'|'avoidant_conflict' (optional override)
 * @param {string[]} [userProfile.focusAreas] - Areas needing work from assessments
 * @returns {Object} Personalized rituals object with morningCheckIn, eveningGratitude, weeklyStateOfUs
 */
function generateMaintenanceRituals(userProfile) {
  const profile = userProfile || {};
  const attachmentStyle = profile.attachmentStyle || 'secure';
  const loveLanguage = normalizeLoveLanguage(profile.loveLanguage);
  const conflictStyle = profile.conflictStyle || profile.cyclePosition;

  const rituals = {};

  // Build each ritual by layering: base → attachment → love language → conflict
  for (const [key, template] of Object.entries(RITUAL_TEMPLATES)) {
    const ritual = {
      id: template.id,
      title: template.title,
      duration: template.duration,
      frequency: template.frequency,
      timeOfDay: template.timeOfDay,
      preferredDay: template.preferredDay || null,
      difficulty: template.baseDifficulty,
      expert: template.expert,
      expertName: template.expertName,
      expertCredential: template.expertCredential,
      instructions: [...template.baseInstructions],
      whyItWorks: template.whyItWorks,
      adaptations: [],
    };

    // Layer 1: Attachment style
    const attachmentLayer = ATTACHMENT_ADAPTATIONS[attachmentStyle]?.[key];
    if (attachmentLayer) {
      ritual.instructions.push(...attachmentLayer.additionalInstructions);
      ritual.difficulty += attachmentLayer.difficultyModifier;
      ritual.adaptations.push({
        source: 'attachment_style',
        style: attachmentStyle,
        expert: attachmentLayer.expert,
        insight: attachmentLayer.why,
      });
    }

    // Layer 2: Love language
    const languageLayer = LOVE_LANGUAGE_ADAPTATIONS[loveLanguage]?.[key];
    if (languageLayer) {
      ritual.instructions.push(...languageLayer.additionalInstructions);
      ritual.adaptations.push({
        source: 'love_language',
        language: loveLanguage,
        expert: languageLayer.expert,
        insight: languageLayer.why,
      });
    }

    // Layer 3: Conflict style (Weekly State of Us only)
    if (key === 'weeklyStateOfUs' && conflictStyle) {
      const conflictKey = mapConflictKey(conflictStyle);
      const conflictLayer = CONFLICT_ADAPTATIONS[conflictKey]?.[key];
      if (conflictLayer) {
        ritual.instructions.push(...conflictLayer.additionalInstructions);
        ritual.adaptations.push({
          source: 'conflict_style',
          style: conflictKey,
          expert: conflictLayer.expert,
          insight: conflictLayer.why,
        });
      }
    }

    // Clamp difficulty to 1-5
    ritual.difficulty = Math.min(5, Math.max(1, ritual.difficulty));

    rituals[key] = ritual;
  }

  logger.info('Maintenance rituals generated', {
    attachmentStyle,
    loveLanguage,
    conflictStyle,
    ritualCount: Object.keys(rituals).length,
  });

  return rituals;
}

/**
 * Generate a full week of maintenance rituals for a specific week number (1-12).
 * 
 * Returns a structured weekly plan with daily rituals and any bonus rituals
 * for that week. Difficulty and depth increase progressively.
 * 
 * @param {Object} userProfile - The user's relationship profile (same as generateMaintenanceRituals)
 * @param {number} weekNumber - Week number in the maintenance cycle (1-12)
 * @returns {Object} Weekly plan with dailyRituals, weeklyRituals, bonusRituals, theme, difficulty
 */
function generateMaintenancePlan(userProfile, weekNumber) {
  // Clamp week to 1-12
  const week = Math.min(12, Math.max(1, weekNumber || 1));

  // Get personalized base rituals
  const baseRituals = generateMaintenanceRituals(userProfile);

  // Get this week's enhancements
  const enhancements = WEEKLY_ENHANCEMENTS[week] || WEEKLY_ENHANCEMENTS[12];

  // Apply enhancements to base rituals
  const enhancedMorning = applyEnhancement(
    baseRituals.morningCheckIn,
    enhancements.morningEnhancement,
    enhancements.difficultyRange
  );

  const enhancedEvening = applyEnhancement(
    baseRituals.eveningGratitude,
    enhancements.eveningEnhancement,
    enhancements.difficultyRange
  );

  const enhancedWeekly = applyEnhancement(
    baseRituals.weeklyStateOfUs,
    enhancements.weeklyEnhancement,
    enhancements.difficultyRange
  );

  // Build the daily schedule
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dailyRituals = {};

  for (const day of days) {
    dailyRituals[day] = [
      { ...enhancedMorning, scheduledFor: 'morning' },
      { ...enhancedEvening, scheduledFor: 'evening' },
    ];
  }

  // Weekly rituals (State of Us on preferred day)
  const weeklyRituals = [enhancedWeekly];

  // Bonus ritual if this week has one
  const bonusRituals = [];
  if (enhancements.bonusRitual) {
    bonusRituals.push({
      ...enhancements.bonusRitual,
      expertCredential: getExpertCredential(enhancements.bonusRitual.expert),
    });
  }

  const plan = {
    weekNumber: week,
    theme: enhancements.theme,
    difficultyRange: enhancements.difficultyRange,
    totalDailyMinutes: enhancedMorning.duration + enhancedEvening.duration,
    totalWeeklyMinutes: enhancedWeekly.duration + bonusRituals.reduce((sum, r) => sum + r.duration, 0),
    dailyRituals,
    weeklyRituals,
    bonusRituals,
    weekSummary: generateWeekSummary(week, enhancements),
    nextWeekPreview: week < 12 ? WEEKLY_ENHANCEMENTS[week + 1]?.theme : 'You\'ve completed the maintenance program! Your rituals are now self-sustaining.',
  };

  logger.info('Maintenance plan generated', {
    weekNumber: week,
    theme: enhancements.theme,
    bonusRituals: bonusRituals.length,
  });

  return plan;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Normalize love language strings to our internal key format.
 */
function normalizeLoveLanguage(language) {
  if (!language) return null;
  const normalized = language.toLowerCase().replace(/[\s-]+/g, '_');
  const validLanguages = [
    'words_of_affirmation',
    'acts_of_service',
    'receiving_gifts',
    'quality_time',
    'physical_touch',
  ];
  return validLanguages.includes(normalized) ? normalized : null;
}

/**
 * Map conflict style / cycle position to our internal keys.
 */
function mapConflictKey(style) {
  if (!style) return null;
  const map = {
    pursuer: 'pursuer',
    pursuing: 'pursuer',
    anxious: 'pursuer',
    withdrawer: 'withdrawer',
    withdrawing: 'withdrawer',
    avoidant: 'withdrawer',
    volatile: 'volatile',
    'conflict-avoidant': 'avoidant_conflict',
    avoidant_conflict: 'avoidant_conflict',
    validating: 'pursuer', // validating couples lean toward structured engagement
  };
  return map[style.toLowerCase()] || null;
}

/**
 * Apply a weekly enhancement to a base ritual.
 */
function applyEnhancement(ritual, enhancement, difficultyRange) {
  const enhanced = { ...ritual };

  if (enhancement) {
    enhanced.instructions = [
      ...ritual.instructions,
      `📈 WEEK ENHANCEMENT: ${enhancement.instruction}`
    ];
    enhanced.weekEnhancement = {
      instruction: enhancement.instruction,
      expert: enhancement.expert,
      why: enhancement.why,
    };
  }

  // Adjust difficulty to be within the week's range
  enhanced.difficulty = Math.max(
    difficultyRange[0],
    Math.min(difficultyRange[1], enhanced.difficulty)
  );

  return enhanced;
}

/**
 * Get expert credential string by key.
 */
function getExpertCredential(expertKey) {
  const credentials = {
    gottman: 'founder of the Gottman Institute, 40+ years of relationship research',
    perel: 'world-renowned relationship therapist, author of Mating in Captivity',
    chapman: 'author of The 5 Love Languages, 50+ years of couples counseling',
    johnson: 'creator of Emotionally Focused Therapy (EFT), with 75% recovery rate for distressed couples',
    brown: 'research professor who spent 20 years studying vulnerability, courage, and shame',
    voss: 'former FBI lead hostage negotiator, author of Never Split the Difference',
    robbins: 'peak performance coach, has worked with 50+ million people across 100 countries',
  };
  return credentials[expertKey] || '';
}

/**
 * Generate a human-readable summary for the week.
 */
function generateWeekSummary(week, enhancements) {
  const summaries = {
    1: 'This week is about ONE thing: showing up. Do the rituals even if they feel awkward. Awkward is the price of admission to something new.',
    2: 'You survived Week 1. Now add small touches — a departure ritual, a text during the day. Connection is built in the margins.',
    3: 'Start noticing patterns. What triggers you? What soothes you? Self-awareness is the skill underneath all other skills.',
    4: 'Time to go deeper. Share something real. Vulnerability isn\'t weakness — it\'s the only path to genuine connection.',
    5: 'This week, get curious. Ask what you don\'t know. Your partner is not a solved puzzle — they\'re a living, changing person.',
    6: 'Repair is the skill. Not avoiding conflict, not winning arguments — the ability to find your way back to each other after a rupture.',
    7: 'You\'re in the stretch zone now. Speak needs you\'ve been holding back. Name the stories you tell yourself. This is where real change happens.',
    8: 'Navigate friction with grace. Own your part, admire your partner\'s effort, and learn to see the dream beneath the disagreement.',
    9: 'Surprise each other. Do something neither of you has done. Desire lives in the space between the known and the unknown.',
    10: 'You\'re becoming the expert on YOUR relationship. Test your knowledge. Push past "good enough" into genuine mastery.',
    11: 'Reflect on how far you\'ve come. Write it down. Share it. The story you tell about your growth BECOMES your growth.',
    12: 'The final week. But not the end — the beginning of your self-sustaining practice. Design rituals that are YOURS. You don\'t need the script anymore.',
  };
  return summaries[week] || summaries[12];
}

module.exports = {
  generateMaintenanceRituals,
  generateMaintenancePlan,
  // Exported for testing
  RITUAL_TEMPLATES,
  WEEKLY_ENHANCEMENTS,
};
