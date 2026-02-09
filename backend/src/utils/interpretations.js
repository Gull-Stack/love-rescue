/**
 * Rich interpretation system for all assessment types
 * 
 * PHILOSOPHY: Every interpretation follows these rules:
 * 1. Focus on the INDIVIDUAL — "Here's what this means about YOUR patterns"
 * 2. NEVER blame or diagnose the partner
 * 3. Frame findings as growth opportunities, not deficits
 * 4. Include specific action steps the individual can take
 * 5. Connect to the "creator not victim" mindset
 * 6. Reference relevant experts
 */

// ============================================================
// ATTACHMENT STYLE INTERPRETATIONS
// ============================================================
const attachmentInterpretations = {
  secure: {
    title: 'Secure Attachment',
    emoji: '🏠',
    description: 'You have a secure attachment style — the foundation that allows love to flourish. You feel comfortable with emotional closeness and can maintain your independence without anxiety. When conflict arises, you can stay engaged rather than fleeing or escalating. You trust that your partner cares even during disagreements.',
    deeperMeaning: 'Secure attachment doesn\'t mean you never feel insecure — it means you have the tools to manage insecurity without it hijacking your behavior. You can reach for your partner when you need support and offer support when they reach for you. Dr. Sue Johnson calls this being Accessible, Responsive, and Engaged (A.R.E.).',
    strengths: [
      'Comfortable expressing needs directly without manipulation',
      'Can tolerate disagreement without catastrophizing',
      'Naturally respond to partner\'s bids for connection',
      'Able to self-soothe when stressed without shutting down',
      'Don\'t need constant reassurance to feel loved',
      'Can hold space for your partner\'s difficult emotions'
    ],
    growthEdges: [
      'May underestimate how insecure patterns can emerge under extreme stress',
      'Could become complacent about actively nurturing the relationship',
      'Might not fully understand a partner with anxious or avoidant tendencies'
    ],
    actionSteps: [
      'Continue building Love Maps — keep learning about your partner\'s inner world (Gottman)',
      'Practice the A.R.E. check-in daily: Am I Accessible, Responsive, Engaged? (Johnson)',
      'Use your security as a gift — when your partner is activated, YOUR calm calms them (Tatkin)',
      'Don\'t take your security for granted — keep investing in fondness and admiration',
      'Study insecure patterns so you can recognize and compassionately respond when your partner shows them'
    ],
    creatorReframe: 'Your secure attachment is a strength you\'ve cultivated — not everyone starts here, and maintaining it is an ongoing practice. You\'re not "lucky" — you\'re someone who naturally or intentionally developed healthy bonding patterns. Use this as a foundation to keep growing, not as a reason to stop.',
    connectedFrameworks: ['Sue Johnson (EFT)', 'Stan Tatkin (PACT)', 'Amir Levine (Attached)'],
    dailyPractice: 'Each evening, reflect: "Did I turn toward my partner today? Was I emotionally available when they needed me?"'
  },

  anxious: {
    title: 'Anxious Attachment',
    emoji: '🌊',
    description: 'You have an anxious attachment style, which means your attachment system is highly sensitive to perceived threats to the relationship. You\'re wired to detect disconnection quickly — sometimes before it actually exists. This isn\'t a flaw — it\'s a sensitivity that, when understood, becomes a superpower for emotional awareness.',
    deeperMeaning: 'Dr. Amir Levine explains that anxious attachment evolved as a survival mechanism. Your brain is exceptionally good at reading emotional signals and detecting when something feels "off." The challenge is that this sensitivity can trigger protest behaviors — excessive texting, seeking reassurance, becoming critical — that actually push your partner away. Dr. Johnson calls this the "Protest Polka."',
    strengths: [
      'Highly attuned to emotional undercurrents in relationships',
      'Deeply invested in connection — you don\'t take love for granted',
      'Willing to do the work to improve the relationship',
      'Emotionally expressive and passionate',
      'Quick to reach for your partner — you value closeness'
    ],
    growthEdges: [
      'Protest behaviors (excessive checking, reassurance-seeking) can push partners away',
      'May interpret ambiguous situations as threats',
      'Tendency to lose yourself in the relationship',
      'Difficulty self-soothing without partner\'s input',
      'May confuse anxiety for intuition'
    ],
    actionSteps: [
      'Learn to distinguish between genuine threat and activated attachment system',
      'Practice self-soothing: when anxiety spikes, take 5 deep breaths before acting on it',
      'Express needs directly: "I need reassurance right now" vs. picking a fight to test them',
      'Build your own identity — hobbies, friendships, goals that are YOURS (Finlayson-Fife)',
      'Study your protest behaviors — name them, catch them, choose a different response',
      'Journal prompt: "Is this anxiety telling me something real, or is my attachment system activated?"',
      'Practice Belfort\'s state management: change your physiology before reacting'
    ],
    creatorReframe: 'Your sensitivity is NOT a weakness — it\'s a gift that needs channeling. The goal isn\'t to become less sensitive. It\'s to develop the self-awareness and self-regulation to USE your sensitivity without being ruled by it. You don\'t need your partner to make you feel secure — you can build that security within yourself while ALSO enjoying the security they offer.',
    connectedFrameworks: ['Amir Levine (Attached)', 'Sue Johnson (Protest Polka)', 'Jennifer Finlayson-Fife (Self-Validation)', 'Jordan Belfort (State Management)'],
    dailyPractice: 'Each morning: "Today, when I feel anxious about the relationship, I will pause for 60 seconds, breathe, and ask: Is this a real concern or my attachment system? Then I will respond, not react."'
  },

  avoidant: {
    title: 'Avoidant Attachment',
    emoji: '🏔️',
    description: 'You have an avoidant attachment style, which means you\'ve developed a strong self-reliance that can sometimes come at the cost of emotional intimacy. You value independence highly, and when things feel too close or too intense, your instinct is to create distance. This isn\'t selfishness — it\'s a deeply wired protective mechanism.',
    deeperMeaning: 'Dr. Levine identifies "deactivating strategies" that avoidant individuals use to maintain emotional distance: focusing on partner\'s flaws, idealizing exes, pulling away after intimacy, valuing independence over connection. Stan Tatkin calls this the "Island" style — you process internally, recharge alone, and may appear self-sufficient to the point of seeming like you don\'t need anyone.',
    strengths: [
      'Strong sense of self and personal identity',
      'Calm under pressure — not easily destabilized by conflict',
      'Self-sufficient and resourceful',
      'Capable of giving others space without taking it personally',
      'Often grounded and rational in emotional situations'
    ],
    growthEdges: [
      'Deactivating strategies keep love at arm\'s length',
      'May dismiss or minimize partner\'s emotional needs',
      'Difficulty expressing vulnerability or asking for help',
      'Withdrawal under stress can trigger partner\'s anxiety spiral',
      'May confuse emotional independence with emotional health'
    ],
    actionSteps: [
      'Notice your deactivating strategies — when do you pull away? What triggers it?',
      'Practice one vulnerable disclosure per week: share something real with your partner',
      'When you feel the urge to withdraw, try staying 5 minutes longer before retreating',
      'Study Brené Brown\'s vulnerability work: courage is not the absence of fear',
      'Learn that needing someone is not weakness — it\'s biology (Johnson)',
      'Practice Tatkin\'s couple bubble: "I protect you, you protect me"',
      'Ask yourself: "Am I withdrawing because I need space, or because closeness feels threatening?"'
    ],
    creatorReframe: 'Your independence is a genuine strength — don\'t let anyone pathologize it. But also don\'t let it become a prison. The highest form of strength is the ability to be strong AND vulnerable, independent AND connected. Finlayson-Fife teaches that true differentiation means you can hold your own position WHILE staying emotionally present. That\'s your growth edge.',
    connectedFrameworks: ['Amir Levine (Deactivating Strategies)', 'Stan Tatkin (Island)', 'Brené Brown (Vulnerability)', 'Jennifer Finlayson-Fife (Differentiation)'],
    dailyPractice: 'Each day, reach for your partner once — a text, a touch, a question about their inner world. Not because they need it, but because YOU are choosing connection.'
  },

  'fearful_avoidant': {
    title: 'Fearful-Avoidant (Disorganized) Attachment',
    emoji: '🌪️',
    description: 'You have a fearful-avoidant attachment style, sometimes called disorganized attachment. This means you experience a push-pull dynamic: you deeply want connection but also fear it. You may swing between anxious pursuit and avoidant retreat, sometimes within the same conversation.',
    deeperMeaning: 'This style often develops when early relationships were sources of both comfort and threat. The very person you wanted to run TO was also someone you needed to run FROM. This creates an internal conflict that can feel bewildering in adult relationships. You\'re not "broken" — your system is doing exactly what it learned to do to keep you safe.',
    strengths: [
      'Deep capacity for empathy — you understand both the fear of abandonment AND the fear of engulfment',
      'When you find safety, your connections can be profoundly deep',
      'Highly perceptive about relational dynamics',
      'Your awareness of your own complexity is itself a form of self-knowledge'
    ],
    growthEdges: [
      'The push-pull pattern can be confusing and exhausting for both you and your partner',
      'May sabotage connection when things start feeling "too good"',
      'Difficulty trusting that safety is real and lasting',
      'May need professional support to work through early relational trauma'
    ],
    actionSteps: [
      'Consider working with an EFT therapist — Sue Johnson\'s approach is specifically designed for this',
      'Learn to name your current state: "I\'m in pursuit mode" or "I\'m in withdrawal mode"',
      'Practice the "pause and name" technique: when activated, say "My attachment system is activated right now"',
      'Build a daily grounding routine — your nervous system needs consistent signals of safety (Tatkin)',
      'Journal about the push-pull: "When I pursued, what was I really feeling? When I withdrew, what was I really feeling?"',
      'Study Brené Brown\'s shame resilience — shame often drives the fearful-avoidant cycle',
      'Remember: earned security is real. You can develop a secure attachment style over time.'
    ],
    creatorReframe: 'Your attachment style is the most complex — and that means your growth journey is the most transformative. Every expert in this course has something specific for you: Johnson\'s EFT heals the underlying wounds, Tatkin\'s nervous system work creates physical safety, Brown\'s vulnerability work addresses the shame, and Finlayson-Fife\'s self-confrontation helps you take radical ownership. You are not your past. You are what you choose to become.',
    connectedFrameworks: ['Sue Johnson (EFT - Attachment Injuries)', 'Stan Tatkin (Nervous System)', 'Brené Brown (Shame Resilience)', 'Jennifer Finlayson-Fife (Self-Confrontation)'],
    dailyPractice: 'Each day, notice the push-pull without judging it. Simply observe: "I\'m wanting to move closer" or "I\'m wanting to pull away." Awareness without action builds the muscle of choice.'
  },

  // Fallback for legacy 'dismissive-fearful' key
  'dismissive-fearful': null // Maps to fearful_avoidant
};
// Map legacy key
attachmentInterpretations['dismissive-fearful'] = attachmentInterpretations['fearful_avoidant'];

// ============================================================
// LOVE LANGUAGE INTERPRETATIONS
// ============================================================
const loveLanguageInterpretations = {
  words_of_affirmation: {
    title: 'Words of Affirmation',
    emoji: '💬',
    description: 'Your primary love language is Words of Affirmation. You feel most loved when you hear genuine, specific expressions of appreciation, encouragement, and verbal affection. A sincere "I\'m proud of you" or "I love who you are" fills your emotional tank in ways that gifts or favors simply can\'t.',
    whatItMeans: 'You process love through language. Compliments aren\'t vanity — they\'re your emotional lifeline. Harsh words wound you more deeply than most people realize.',
    howToExpress: 'Tell your partner specifically what you appreciate about them. Not just "you\'re great" but "the way you handled that meeting today showed real courage, and I admire that about you."',
    howToReceive: 'Learn to actually receive compliments instead of deflecting them. When your partner affirms you, let it land.',
    creatorReframe: 'YOUR need for verbal affirmation is valid — AND it\'s YOUR job to communicate this need clearly. Don\'t wait for your partner to guess. Say: "It means the world to me when you notice what I do and tell me."'
  },
  acts_of_service: {
    title: 'Acts of Service',
    emoji: '🛠️',
    description: 'Your primary love language is Acts of Service. You feel most loved when your partner demonstrates care through actions — helping with tasks, anticipating needs, taking things off your plate. For you, love is a verb, and it\'s spelled D-O.',
    whatItMeans: 'Actions speak louder than words for you. When your partner does something helpful without being asked, it communicates: "I see you, I care about your burden, and I want to lighten it."',
    howToExpress: 'Look for what would genuinely help your partner and do it without being asked or expecting recognition.',
    howToReceive: 'Notice the small acts your partner already does. They may be expressing love in ways you haven\'t recognized.',
    creatorReframe: 'YOUR need for acts of service is valid — AND you must express it directly rather than resenting unmet expectations. Also examine: are you serving your partner in THEIR language, or in yours?'
  },
  receiving_gifts: {
    title: 'Receiving Gifts',
    emoji: '🎁',
    description: 'Your primary love language is Receiving Gifts. You feel most loved when your partner gives you thoughtful, meaningful gifts — not necessarily expensive ones, but ones that show they were thinking about you and know you.',
    whatItMeans: 'For you, a gift is a tangible symbol of love. It\'s not materialism — it\'s the thought, effort, and intentionality behind the gift that fills your heart. The gift says: "I was thinking about you even when you weren\'t here."',
    howToExpress: 'Give gifts that show you truly know your partner. It could be their favorite snack, a book they mentioned, or something that references an inside joke.',
    howToReceive: 'Let yourself feel the love behind the gift. Don\'t deflect with "you didn\'t have to." They wanted to.',
    creatorReframe: 'YOUR need for gifts is valid — AND it\'s your responsibility to communicate what kinds of gifts feel meaningful (not just expect your partner to know). Also explore: is the gift the point, or is it the evidence that they think about you?'
  },
  quality_time: {
    title: 'Quality Time',
    emoji: '⏰',
    description: 'Your primary love language is Quality Time. You feel most loved when your partner gives you their undivided attention — no phones, no distractions, just presence. For you, the greatest gift someone can give is their TIME.',
    whatItMeans: 'Being in the same room isn\'t enough. You need your partner to be truly PRESENT — eyes engaged, actively listening, focused on you and the moment you\'re sharing.',
    howToExpress: 'Put everything down. Look at your partner. Be HERE. Schedule dedicated time that\'s protected from interruptions.',
    howToReceive: 'Notice when your partner IS present and acknowledge it: "I love that you\'re fully here right now."',
    creatorReframe: 'YOUR need for quality time is valid — AND it\'s your job to create the conditions for it, not just wait for it to happen. Initiate dates. Put YOUR phone down first. Model the presence you want to receive.'
  },
  physical_touch: {
    title: 'Physical Touch',
    emoji: '🤗',
    description: 'Your primary love language is Physical Touch. You feel most loved through physical affection — hugs, hand-holding, a hand on the back, cuddling, kisses, and yes, sexual intimacy. Physical closeness is how you feel emotionally connected.',
    whatItMeans: 'For you, physical touch is not just about pleasure — it\'s about emotional connection. A hug communicates safety. Holding hands communicates solidarity. Physical distance feels like emotional distance.',
    howToExpress: 'Reach for your partner physically throughout the day. Not just in the bedroom — casual, affectionate, reassuring touch.',
    howToReceive: 'When your partner reaches for you physically, receive it fully. Don\'t pull away or stiffen.',
    creatorReframe: 'YOUR need for touch is valid — AND you must communicate about it openly and respect your partner\'s boundaries. If touch is lacking, say so directly: "Physical affection is really important to me. Can we be more intentional about it?"'
  }
};

// ============================================================
// HUMAN NEEDS INTERPRETATIONS
// ============================================================
const humanNeedsInterpretations = {
  certainty: {
    title: 'Certainty / Security',
    emoji: '🏛️',
    description: 'Your top need is Certainty — the need to feel safe, stable, and in control. You thrive when you know what to expect and feel anxious when things are unpredictable.',
    healthyExpression: 'Creating reliable routines, financial planning, clear communication, consistency in actions and words.',
    unhealthyExpression: 'Controlling behavior, rigidity, resistance to change, jealousy, excessive monitoring.',
    relationshipImpact: 'You bring stability and reliability to your relationship. Your partner can count on you. But if unchecked, your need for certainty can make you resistant to growth and change.',
    actionSteps: ['Practice tolerating small uncertainties daily', 'Ask: "Am I being reliable or controlling right now?"', 'Build certainty internally (self-trust) rather than externally (controlling environment)'],
    creatorReframe: 'True certainty comes from within — from knowing YOU can handle whatever comes. Stop trying to control the uncontrollable and start building unshakeable self-trust.'
  },
  variety: {
    title: 'Variety / Uncertainty',
    emoji: '🎲',
    description: 'Your top need is Variety — the need for novelty, change, stimulation, and surprise. You feel alive when things are fresh and stagnant when they\'re routine.',
    healthyExpression: 'Initiating adventures, creative problem-solving, bringing spontaneity to the relationship, embracing change.',
    unhealthyExpression: 'Infidelity, drama-creation, inability to commit, reckless decisions, boredom-driven conflict.',
    relationshipImpact: 'You bring excitement and energy. But your partner may feel destabilized by constant change. The key is channeling variety constructively — within the relationship, not outside it.',
    actionSteps: ['Find variety WITHIN commitment (new experiences together)', 'Channel restlessness into growth activities', 'Ask: "Am I seeking variety or avoiding depth?"'],
    creatorReframe: 'The deepest variety comes from going DEEPER with one person, not wider with many. There is infinite novelty in truly knowing another human being.'
  },
  significance: {
    title: 'Significance',
    emoji: '👑',
    description: 'Your top need is Significance — the need to feel important, unique, special, and valued. You thrive when you feel like you matter and are recognized for your contributions.',
    healthyExpression: 'Achieving goals, developing unique skills, contributing meaningfully, earning respect through excellence.',
    unhealthyExpression: 'Competing with your partner, one-upping, needing to be right, tearing others down to feel elevated, attention-seeking.',
    relationshipImpact: 'You bring ambition and drive. But the need to feel significant can create competition rather than partnership. In relationships, significance must be mutual — you both matter equally.',
    actionSteps: ['Find significance through contribution, not comparison', 'Practice making your PARTNER feel significant', 'Ask: "Am I trying to be important, or am I trying to be loving?"'],
    creatorReframe: 'The highest form of significance is being the kind of partner people aspire to be. Not significant because of status — significant because of character.'
  },
  connection: {
    title: 'Love / Connection',
    emoji: '💞',
    description: 'Your top need is Love/Connection — the deep need to feel bonded, close, understood, and loved. You thrive in intimacy and feel empty when disconnected.',
    healthyExpression: 'Deep conversations, vulnerability, physical affection, genuine interest in others, emotional availability.',
    unhealthyExpression: 'People-pleasing, losing yourself in relationships, codependency, accepting poor treatment for the sake of connection.',
    relationshipImpact: 'You bring warmth and depth. Your partner feels deeply loved by you. But if unchecked, you may sacrifice yourself for connection — which paradoxically destroys genuine intimacy.',
    actionSteps: ['Practice connecting while maintaining your own identity (Finlayson-Fife)', 'Ask: "Am I connecting from fullness or from need?"', 'Build connection with yourself first — self-love precedes genuine other-love'],
    creatorReframe: 'Connection from overflow is magnetic. Connection from desperation is repellent. Fill your own cup first — then share the overflow.'
  },
  growth: {
    title: 'Growth',
    emoji: '🌱',
    description: 'Your top need is Growth — the need to constantly develop, learn, expand, and become more. You feel alive when you\'re progressing and restless when you plateau.',
    healthyExpression: 'Reading, learning new skills, personal development, spiritual growth, embracing challenges.',
    unhealthyExpression: 'Never being satisfied, perpetual self-improvement that avoids present-moment acceptance, using growth as avoidance.',
    relationshipImpact: 'You bring evolution and depth. Your partner benefits from your commitment to becoming better. But be careful not to outgrow your partner by leaving them behind — grow TOGETHER.',
    actionSteps: ['Channel growth into the relationship, not just yourself', 'Share what you\'re learning with your partner', 'Ask: "Am I growing to become better, or to avoid being present?"'],
    creatorReframe: 'Growth is beautiful — AND acceptance is essential. You can be committed to becoming more while also being grateful for who you are today.'
  },
  contribution: {
    title: 'Contribution',
    emoji: '🌍',
    description: 'Your top need is Contribution — the need to give, serve, and make a difference beyond yourself. You feel most fulfilled when your life matters to others.',
    healthyExpression: 'Generosity, service, mentoring, giving without expectation, making your partner\'s life better.',
    unhealthyExpression: 'Martyrdom, giving to control, self-neglect disguised as service, expecting reciprocation.',
    relationshipImpact: 'You bring generosity and selflessness. Your partner feels cared for. But ensure your giving is genuine — not a strategy to feel needed or to create obligation.',
    actionSteps: ['Give without keeping score', 'Ensure you\'re also receiving — contribution isn\'t sustainable without self-care', 'Ask: "Am I giving from love or from a need to be needed?"'],
    creatorReframe: 'The greatest contribution to any relationship is becoming the best version of yourself. Then your presence itself is a gift.'
  }
};

// ============================================================
// GOTTMAN CHECKUP INTERPRETATIONS
// ============================================================
const gottmanInterpretations = {
  horsemen: {
    criticism: {
      title: 'Criticism',
      low: 'You rarely attack your partner\'s character. You\'ve learned to express complaints without making it about who they ARE.',
      moderate: 'You sometimes slip from complaints ("I feel hurt when...") into criticism ("You always..." / "You never..."). The antidote is the Gentle Startup.',
      high: 'Criticism is a frequent pattern. Remember: a complaint addresses behavior; criticism attacks character. Practice: "I feel ___ about ___ and I need ___."',
      antidote: 'Gentle Startup: Express your feelings and needs without blaming. "I feel [emotion] about [specific situation] and I need [specific request]."'
    },
    contempt: {
      title: 'Contempt',
      low: 'You treat your partner with respect even in conflict. This is a major strength — contempt is the #1 predictor of divorce.',
      moderate: 'Eye-rolling, sarcasm, or superiority creeps in during conflict. This is the most corrosive horseman. Build a Culture of Appreciation.',
      high: 'Contempt is present in your interactions. This is the single strongest predictor of relationship failure. The antidote is deliberately building fondness and admiration.',
      antidote: 'Build a Culture of Appreciation: Each day, find something specific you respect or admire about your partner and tell them.'
    },
    defensiveness: {
      title: 'Defensiveness',
      low: 'You can hear feedback without counter-attacking. You take responsibility for your part.',
      moderate: 'You sometimes deflect blame or make excuses. Practice taking even PARTIAL responsibility.',
      high: 'Defensiveness is blocking repair. When your partner raises a concern, you counter-attack or play victim. The antidote is accepting responsibility.',
      antidote: 'Take Responsibility: Accept even a small part of the complaint. "You\'re right, I did forget. I\'m sorry. What can I do to fix this?"'
    },
    stonewalling: {
      title: 'Stonewalling',
      low: 'You stay engaged during difficult conversations. You don\'t shut down or check out.',
      moderate: 'You sometimes withdraw or go silent during conflict. Learn to take physiological breaks and RETURN.',
      high: 'Shutting down is a frequent response. Your nervous system is flooding. The antidote is physiological self-soothing — take a 20-minute break, calm your body, then re-engage.',
      antidote: 'Physiological Self-Soothing: When overwhelmed, say "I need a 20-minute break. I will come back." Calm your body (deep breathing, walking). Then return to the conversation.'
    }
  },
  strengths: {
    love_maps: {
      title: 'Love Maps',
      high: 'You know your partner\'s inner world well — their dreams, fears, hopes, and history.',
      low: 'Your Love Map needs updating. Set aside time each week to ask open-ended questions about your partner\'s inner world.'
    },
    fondness_admiration: {
      title: 'Fondness & Admiration',
      high: 'You regularly express appreciation and respect. This is the antidote to contempt.',
      low: 'The fondness and admiration system needs feeding. Start a daily practice of noticing and expressing one thing you appreciate.'
    },
    turning_toward: {
      title: 'Turning Toward',
      high: 'You respond to your partner\'s bids for connection. Masters of relationships turn toward 86% of the time.',
      low: 'You may be missing your partner\'s bids for connection. A bid can be as small as a sigh, a question, or a look. Practice noticing and responding.'
    },
    shared_meaning: {
      title: 'Shared Meaning',
      high: 'You and your partner have rituals, shared goals, and a sense of "we." Your relationship has purpose beyond just the two of you.',
      low: 'Creating shared meaning deepens the bond. Develop rituals (weekly date, morning coffee together), shared goals, and a shared narrative of your relationship.'
    },
    repair_attempts: {
      title: 'Repair Attempts',
      high: 'You\'re good at de-escalating conflict. Humor, affection, or a simple "can we start over?" prevents spirals.',
      low: 'Repair attempts are the secret weapon of happy couples. Practice: when things escalate, try "I\'m sorry, that came out wrong" or "Can we take a breath and start over?"'
    }
  }
};

// ============================================================
// EMOTIONAL INTELLIGENCE INTERPRETATIONS
// ============================================================
const eqInterpretations = {
  self_awareness: {
    title: 'Self-Awareness',
    description: 'Your ability to recognize your own emotions, triggers, and patterns as they happen.',
    high: 'You have strong emotional self-awareness. You can name what you\'re feeling and understand why.',
    moderate: 'Your self-awareness is developing. Practice the "name it to tame it" technique — labeling emotions reduces their intensity.',
    low: 'Building self-awareness is your primary growth edge. Start with a daily emotion check-in: 3 times a day, pause and ask "What am I feeling right now?"'
  },
  self_regulation: {
    title: 'Self-Regulation',
    description: 'Your ability to manage your emotional responses rather than being controlled by them.',
    high: 'You manage your emotions well. You can feel strongly without acting destructively.',
    moderate: 'You sometimes get hijacked by emotions. Practice Belfort\'s state management: change your physiology, focus, and language.',
    low: 'Emotional regulation is your critical growth area. Start with the basics: when activated, PAUSE. Take 5 breaths. Then choose your response.'
  },
  motivation: {
    title: 'Intrinsic Motivation',
    description: 'Your ability to drive yourself toward goals from internal desire rather than external pressure.',
    high: 'You\'re internally motivated and growth-oriented. This serves your relationship well.',
    moderate: 'Your motivation fluctuates. Connect your relationship goals to your deepest values.',
    low: 'Finding your internal "why" for relationship growth will transform your effort level.'
  },
  empathy: {
    title: 'Empathy',
    description: 'Your ability to understand and share the feelings of your partner.',
    high: 'Strong empathy — you naturally attune to others\' emotional states. This is Chris Voss\'s "tactical empathy" in action.',
    moderate: 'Your empathy is developing. Practice mirroring and labeling: "It sounds like you\'re feeling..."',
    low: 'Empathy is a learnable skill. Start with active listening: when your partner speaks, focus entirely on understanding their experience, not preparing your response.'
  },
  social_skills: {
    title: 'Social/Relational Skills',
    description: 'Your ability to navigate relationships, communicate effectively, and build connection.',
    high: 'Strong relational skills. You communicate clearly and build rapport naturally.',
    moderate: 'Good foundation with room for growth. Study Voss\'s communication techniques and Gottman\'s gentle startup.',
    low: 'Communication skills are learnable. Start with one technique: use "I feel" statements instead of "You always/never" statements.'
  }
};

// ============================================================
// CONFLICT STYLE INTERPRETATIONS
// ============================================================
const conflictStyleInterpretations = {
  competing: {
    title: 'Competing',
    emoji: '🦁',
    description: 'You tend to assert your position firmly in conflict, prioritizing your needs and outcomes.',
    strengths: 'Decisive, clear about what you want, willing to stand your ground.',
    blindSpots: 'Can damage the relationship by "winning" arguments. Your partner may feel unheard or bulldozed.',
    inRelationships: 'Useful in rare situations requiring firm boundaries. Destructive as a default mode.',
    growthPath: 'Practice Voss\'s tactical empathy: seek to understand before seeking to be understood. Winning the argument often means losing the relationship.'
  },
  collaborating: {
    title: 'Collaborating',
    emoji: '🤝',
    description: 'You seek solutions that fully satisfy both parties. You\'re willing to invest time and energy in finding win-win outcomes.',
    strengths: 'Creates the best outcomes, builds trust, respects both partners\' needs.',
    blindSpots: 'Can be time-consuming, may avoid necessary quick decisions, can be exhausting for simpler issues.',
    inRelationships: 'The gold standard for important issues. Not every disagreement needs full collaboration — some just need a quick compromise.',
    growthPath: 'Learn to calibrate: collaborate on big issues, compromise on small ones. Not every hill needs this level of investment.'
  },
  compromising: {
    title: 'Compromising',
    emoji: '⚖️',
    description: 'You seek middle ground where both parties give something up. Quick, practical, and fair.',
    strengths: 'Efficient, fair, maintains goodwill, works for many everyday disagreements.',
    blindSpots: 'Can lead to mediocre solutions where nobody is truly satisfied. Voss says "never split the difference."',
    inRelationships: 'Good for low-stakes decisions. For important issues, push toward collaboration instead.',
    growthPath: 'On issues that truly matter, don\'t settle for compromise. Dig deeper to find creative solutions that honor both partners fully.'
  },
  avoiding: {
    title: 'Avoiding',
    emoji: '🕊️',
    description: 'You tend to sidestep conflict, either by withdrawing, changing the subject, or simply not engaging.',
    strengths: 'Can prevent unnecessary escalation, gives space for emotions to cool.',
    blindSpots: 'Unresolved issues accumulate. Your partner may feel dismissed, ignored, or that their concerns don\'t matter. This IS Gottman\'s stonewalling.',
    inRelationships: 'A short tactical pause is healthy. Chronic avoidance is relationship poison.',
    growthPath: 'Distinguish between "I need a break" (healthy) and "I refuse to engage" (destructive). Always come back to the conversation.'
  },
  accommodating: {
    title: 'Accommodating',
    emoji: '🕊️',
    description: 'You tend to yield to your partner\'s position, prioritizing their satisfaction and the relationship\'s harmony.',
    strengths: 'Generous, peace-keeping, maintains goodwill.',
    blindSpots: 'You may build resentment, lose yourself, and eventually explode. Finlayson-Fife calls this "under-functioning" disguised as kindness.',
    inRelationships: 'Healthy when the issue matters more to your partner. Toxic when it\'s your default — you abandon yourself.',
    growthPath: 'Practice expressing your needs even when it\'s uncomfortable. "Keeping the peace" at the cost of your truth is not peace — it\'s suppression.'
  }
};

// ============================================================
// DIFFERENTIATION INTERPRETATIONS
// ============================================================
const differentiationInterpretations = {
  high: {
    title: 'Strong Differentiation',
    description: 'You have a solid sense of self. You can hold your position while staying emotionally connected to your partner. You don\'t need agreement to feel okay. You can tolerate your partner\'s negative emotions without crumbling, fixing, or fleeing.',
    growthEdge: 'Continue refining. Even highly differentiated people can regress under extreme stress. Maintain your growth practices.',
    finlaysonFifeInsight: 'You\'re approaching what Finlayson-Fife describes as a "solid sense of self" — your identity comes from within, not from your partner\'s reflection of you. This is where genuine desire lives.'
  },
  moderate: {
    title: 'Moderate Differentiation',
    description: 'You have a developing sense of self but still get pulled into emotional fusion under stress. You may lose your position to keep the peace, or become rigid to protect yourself.',
    growthEdge: 'Practice holding your truth while staying connected. The goal isn\'t winning OR giving in — it\'s being authentically you while remaining present.',
    finlaysonFifeInsight: 'You\'re in the "earning" stage of differentiation. Each time you choose honesty over peace-keeping, or connection over withdrawal, you strengthen your solid self.'
  },
  low: {
    title: 'Low Differentiation — Your Primary Growth Area',
    description: 'Your sense of self is significantly influenced by your partner\'s reactions. You may lose yourself in the relationship, react intensely to their moods, or shut down to avoid conflict. This isn\'t weakness — it\'s a pattern that can be changed.',
    growthEdge: 'This is where the biggest transformation awaits. Building differentiation will improve literally every aspect of your relationship — including desire.',
    finlaysonFifeInsight: 'Finlayson-Fife teaches that low differentiation leads to emotional fusion, which kills desire. You can\'t genuinely want someone you\'re merged with. Growing up in your marriage — by developing YOUR solid self — is the single most powerful thing you can do for your relationship.'
  }
};

// ============================================================
// HORMONAL HEALTH INTERPRETATIONS
// ============================================================
const hormonalHealthInterpretations = {
  testosterone_symptoms: {
    title: 'Testosterone-Related Symptoms',
    description: 'These symptoms may suggest low or declining testosterone levels — which affects both men and women.',
    low: 'Minimal testosterone-related symptoms. Your energy, motivation, and physical resilience appear strong in this area.',
    moderate: 'Some testosterone-related symptoms present. You may be experiencing gradual changes in energy, motivation, body composition, or confidence that could have a hormonal component.',
    high: 'Significant testosterone-related symptoms. Loss of drive, muscle mass, confidence, and emotional resilience can all point to testosterone changes. Consider getting your levels checked — a simple blood test can provide clarity.',
    relationshipImpact: 'Testosterone affects desire, confidence, assertiveness, and physical vitality — all of which directly impact how you show up in your relationship. Low T can make you withdraw, feel less interested in intimacy, or lose the "edge" your partner fell in love with.',
    actionSteps: ['Consider comprehensive bloodwork (total T, free T, SHBG)', 'Prioritize strength training — resistance exercise is the #1 natural testosterone booster', 'Optimize sleep — testosterone is primarily produced during deep sleep', 'Reduce chronic stress — cortisol directly suppresses testosterone production', 'Review medications that may affect hormone levels with your doctor']
  },
  estrogen_progesterone: {
    title: 'Estrogen/Progesterone Symptoms',
    description: 'These symptoms may relate to estrogen and progesterone fluctuations — affecting mood, body, and emotional regulation.',
    low: 'Minimal estrogen/progesterone-related symptoms. Your hormonal rhythms appear relatively stable.',
    moderate: 'Some symptoms suggesting estrogen/progesterone fluctuations. Cyclical mood shifts, physical changes, and emotional reactivity may have a hormonal component worth exploring.',
    high: 'Significant estrogen/progesterone-related symptoms. Hot flashes, mood swings, and physical changes can be deeply disruptive. These are real physiological experiences, not "all in your head."',
    relationshipImpact: 'Hormonal fluctuations directly affect emotional reactivity, patience, desire, and physical comfort. When your partner seems "different" at certain times, hormones may be a major factor. Understanding this reduces blame and increases compassion — for yourself and from your partner.',
    actionSteps: ['Track symptoms alongside your cycle to identify patterns', 'Consider hormone panel testing (estradiol, progesterone, FSH, LH)', 'Discuss findings with a hormone-literate healthcare provider', 'Communicate with your partner about cyclical patterns — awareness reduces conflict', 'Explore lifestyle factors: sleep, stress management, nutrition, and exercise all influence hormonal balance']
  },
  cortisol_stress: {
    title: 'Cortisol/Stress Symptoms',
    description: 'These symptoms may indicate cortisol dysregulation — your stress response system running too hot for too long.',
    low: 'Your stress response appears well-regulated. You seem to manage stress without it dominating your physiology.',
    moderate: 'Some signs of cortisol dysregulation. The "wired but tired" pattern, afternoon crashes, and belly fat accumulation suggest your stress response may need attention.',
    high: 'Significant cortisol-related symptoms. Chronic stress has likely shifted your body into survival mode — affecting sleep, weight, energy, cravings, and your ability to be emotionally present.',
    relationshipImpact: 'Cortisol is the relationship killer hiding in plain sight. When your body is in chronic stress mode, you have LESS capacity for patience, empathy, intimacy, and emotional availability. You\'re literally running on survival brain — and relationships require thriving brain.',
    actionSteps: ['Consider a 4-point cortisol saliva test (morning, noon, evening, night)', 'Implement a daily nervous system regulation practice (breathwork, meditation, cold exposure)', 'Audit your stress load — what can be eliminated, delegated, or reduced?', 'Protect your sleep — cortisol disruption and sleep disruption form a vicious cycle', 'Reduce stimulant intake — excessive caffeine keeps cortisol elevated']
  },
  thyroid_energy: {
    title: 'Thyroid/Energy Symptoms',
    description: 'These symptoms may suggest thyroid dysfunction — the "master regulator" of metabolism, energy, and mood.',
    low: 'Minimal thyroid-related symptoms. Your metabolic energy appears healthy.',
    moderate: 'Some thyroid-related symptoms present. Persistent fatigue, temperature sensitivity, weight resistance, and low mood can all indicate thyroid changes worth investigating.',
    high: 'Significant thyroid-related symptoms. If you\'re doing "everything right" but still feel sluggish, cold, foggy, and heavy — your thyroid may need attention. This is one of the most commonly missed and undertreated hormonal issues.',
    relationshipImpact: 'Thyroid dysfunction drains the energy you need to invest in your relationship. It\'s hard to be an engaged, present, passionate partner when your body feels like it\'s running on 50% power. Getting this checked could be transformative.',
    actionSteps: ['Request comprehensive thyroid panel (TSH, Free T3, Free T4, TPO antibodies, reverse T3)', 'Don\'t accept "normal" TSH alone — optimal and "normal range" are not the same thing', 'Review diet for thyroid-supporting nutrients (selenium, zinc, iodine)', 'Address gut health — a significant portion of T4-to-T3 conversion happens in the gut', 'Consider working with a functional medicine practitioner if standard tests seem "normal" but symptoms persist']
  },
  libido_drive: {
    title: 'Libido & Drive',
    description: 'These symptoms relate to sexual desire, physical responsiveness, and intimate connection — the intersection of hormones and relationship.',
    low: 'Your libido and drive appear healthy. You maintain desire and physical responsiveness.',
    moderate: 'Some libido-related changes. Decreased desire, slower arousal, or feeling disconnected from your body may reflect hormonal shifts, stress, or relational factors.',
    high: 'Significant libido and drive symptoms. Loss of desire is one of the most relationship-impacting hormonal symptoms — and one of the least discussed. This is NOT a character flaw. It often has a physiological root.',
    relationshipImpact: 'Desire is the spark of romantic connection. When it fades, both partners feel it — one feels rejected, the other feels pressured. Understanding that libido has PHYSIOLOGICAL drivers (not just emotional ones) changes the entire conversation from blame to problem-solving.',
    actionSteps: ['Get hormone levels tested — low testosterone, estrogen imbalance, and high cortisol all suppress desire', 'Address the "desire killers": poor sleep, chronic stress, medication side effects, and body image', 'Have an honest conversation with your partner about what you\'re experiencing — vulnerability builds connection', 'Explore whether responsive desire (vs. spontaneous) is your natural pattern — this is normal and healthy', 'Consider whether relationship dynamics are also contributing — desire is both physical AND emotional']
  }
};

// ============================================================
// PHYSICAL VITALITY INTERPRETATIONS
// ============================================================
const physicalVitalityInterpretations = {
  fitness_activity: {
    title: 'Fitness & Activity',
    description: 'Your engagement with structured exercise and daily physical movement.',
    high: 'You maintain a strong fitness practice. Regular exercise is one of the most powerful things you can do for your relationship — it boosts mood, confidence, energy, and desire.',
    moderate: 'Your fitness is developing but inconsistent. Building a sustainable exercise habit will create a positive cascade across every other area of vitality.',
    low: 'Physical fitness is a significant growth area. Starting a movement practice — even 20 minutes, 3 times a week — can transform your energy, mood, and how you show up in your relationship.',
    relationshipImpact: 'Physical fitness directly affects attraction, energy for connection, stress resilience, and sexual vitality. Partners who exercise together report higher relationship satisfaction.',
    actionSteps: ['Start with consistency over intensity — 3 sessions per week, any movement you enjoy', 'Include resistance training — it\'s the #1 anti-aging, hormone-optimizing exercise', 'Find an activity you can do with your partner — shared physical activity builds connection', 'Track your progress — visible results fuel motivation']
  },
  weight_body_composition: {
    title: 'Weight & Body Confidence',
    description: 'Your satisfaction with your body and physical confidence, especially in intimate contexts.',
    high: 'You feel confident and comfortable in your body. This confidence radiates into your relationship and intimate life.',
    moderate: 'Mixed feelings about your body. Some dissatisfaction is normal, but it may be affecting your willingness to be vulnerable and present during intimacy.',
    low: 'Body image is significantly impacting your confidence and likely your relationship. Remember: your partner chose YOU. And you have the power to change what you want to change.',
    relationshipImpact: 'How you feel about your body directly affects how present and confident you are during intimacy. Body shame causes withdrawal, avoidance, and disconnection. Taking action on your physical health is an act of love — for yourself AND your partner.',
    actionSteps: ['Focus on body composition (muscle + fat ratio), not just the scale', 'Set process goals (exercise 3x/week) rather than just outcome goals (lose X pounds)', 'Practice body gratitude — your body does incredible things for you daily', 'Have an honest conversation with your partner about body image — vulnerability builds connection']
  },
  nutrition_diet: {
    title: 'Nutrition & Diet',
    description: 'The quality of fuel you give your body — and how it affects everything else.',
    high: 'Strong nutritional habits. You understand that what you eat directly powers your energy, mood, hormones, and vitality.',
    moderate: 'Room for improvement in nutrition. Inconsistent eating patterns or reliance on processed food may be quietly undermining your energy and mood.',
    low: 'Nutrition is a critical growth area. Poor nutrition is the silent saboteur of energy, hormones, mood, and desire. Small changes here create outsized results everywhere else.',
    relationshipImpact: 'You can\'t pour from an empty cup — and nutrition fills the cup. Blood sugar crashes cause irritability. Nutrient deficiencies cause fatigue and low mood. Eating well isn\'t vanity — it\'s the foundation of having energy for your partner.',
    actionSteps: ['Prioritize protein at every meal — it stabilizes energy and supports hormone production', 'Hydrate intentionally — aim for half your body weight in ounces of water daily', 'Reduce processed food gradually — swap one thing per week', 'Cook together with your partner — shared meal prep is quality time AND better nutrition']
  },
  sleep_recovery: {
    title: 'Sleep & Recovery',
    description: 'The quality and consistency of your sleep — the foundation of all other vitality.',
    high: 'Excellent sleep habits. You\'re giving your body the recovery it needs, which pays dividends in every area of life and love.',
    moderate: 'Sleep is inconsistent. You may be functional but not optimal. Even small improvements in sleep quality can dramatically improve mood, patience, and desire.',
    low: 'Sleep is a critical issue. Poor sleep affects EVERYTHING — hormones, mood, patience, weight, desire, and your ability to be emotionally present. This may be your highest-leverage improvement area.',
    relationshipImpact: 'Sleep-deprived partners are more reactive, less empathetic, more critical, and less interested in intimacy. Gottman\'s research shows that sleep quality predicts relationship quality. Fixing your sleep might be the single best thing you can do for your relationship.',
    actionSteps: ['Set a consistent bedtime and wake time — even on weekends', 'Create a screen-free wind-down routine 60 minutes before bed', 'Optimize your sleep environment: cool (65-68°F), dark, and quiet', 'Consider a sleep study if you snore heavily or never feel rested despite adequate hours', 'Share a bedtime ritual with your partner — this builds connection AND better sleep']
  },
  energy_stamina: {
    title: 'Energy & Stamina',
    description: 'Your sustained physical and mental energy throughout the day — the fuel for relationship investment.',
    high: 'Strong energy levels. You have the physical and mental reserves to be fully present in your relationship after the demands of daily life.',
    moderate: 'Energy is adequate but not abundant. You may be "surviving" your days rather than thriving — leaving little reserves for your partner by evening.',
    low: 'Low energy is significantly impacting your life and relationship. When you\'re running on empty, your partner gets the worst version of you. Addressing the root cause (sleep, nutrition, hormones, stress) is essential.',
    relationshipImpact: 'Your partner deserves more than your leftovers. If you\'re giving your best energy to work and responsibilities and coming home depleted, your relationship slowly starves. Energy management is relationship management.',
    actionSteps: ['Identify your energy drains — what can be eliminated or reduced?', 'Structure your day to protect energy for your partner (not just your work)', 'Address root causes: sleep, nutrition, exercise, and stress all feed energy', 'Consider a comprehensive health checkup if fatigue persists despite lifestyle changes', 'Build in micro-recovery throughout the day — short walks, breathwork, brief rest']
  }
};

// ============================================================
// PERSONALITY TYPE INTERPRETATIONS (brief)
// ============================================================
const personalityInterpretations = {
  dimensions: {
    EI: {
      E: { title: 'Extraversion', inRelationships: 'You energize through connection and may need more social activity and verbal processing than your partner.' },
      I: { title: 'Introversion', inRelationships: 'You energize through solitude and may need more alone time and internal processing than your partner.' }
    },
    SN: {
      S: { title: 'Sensing', inRelationships: 'You focus on concrete details and present realities. You communicate in specifics.' },
      N: { title: 'Intuition', inRelationships: 'You focus on patterns and possibilities. You communicate in concepts and may skip details.' }
    },
    TF: {
      T: { title: 'Thinking', inRelationships: 'You approach decisions logically. You may need to practice leading with empathy before analysis.' },
      F: { title: 'Feeling', inRelationships: 'You approach decisions through values and empathy. You may need to practice logical detachment in conflict.' }
    },
    JP: {
      J: { title: 'Judging', inRelationships: 'You prefer structure and plans. You may need to practice flexibility and spontaneity.' },
      P: { title: 'Perceiving', inRelationships: 'You prefer flexibility and openness. You may need to practice follow-through and structure.' }
    }
  }
};

// ============================================================
// MASTER INTERPRETATION FUNCTION
// ============================================================
function getInterpretation(type, score, options = {}) {
  switch (type) {
    case 'attachment': {
      const style = score.style || 'secure';
      const interp = attachmentInterpretations[style] || attachmentInterpretations.secure;
      return {
        ...interp,
        scores: {
          anxietyScore: score.anxietyScore,
          avoidanceScore: score.avoidanceScore,
          secureScore: score.secureScore
        }
      };
    }

    case 'love_language': {
      const primary = score.primary || 'quality_time';
      const secondary = score.secondary;
      return {
        primary: loveLanguageInterpretations[primary] || loveLanguageInterpretations.quality_time,
        secondary: secondary ? loveLanguageInterpretations[secondary] : null,
        allScores: score.allScores || score.ranking,
        overallInsight: 'Understanding YOUR love language helps you communicate your needs clearly. Understanding your partner\'s helps you love them in the way THEY receive it. Both are your responsibility.'
      };
    }

    case 'human_needs': {
      const topTwo = score.topTwo || [];
      return {
        topNeeds: topTwo.map(need => humanNeedsInterpretations[need] || null).filter(Boolean),
        allNeeds: score.allNeeds || score.ranking,
        profileType: score.profile,
        overallInsight: 'Your top two needs drive 80% of your relationship behavior. When they\'re met, you feel alive. When they\'re threatened, you react. Knowing this gives you the power to meet your own needs rather than demanding your partner do it for you.',
        creatorReframe: 'YOUR needs are YOUR responsibility. Express them clearly. Meet them yourself first. Share the overflow.'
      };
    }

    case 'gottman_checkup': {
      const horsemenResults = {};
      const horsemenByType = score.horsemen?.byType || score.horsemen || {};
      for (const [horseman, levels] of Object.entries(gottmanInterpretations.horsemen)) {
        const horsemanData = horsemenByType[horseman];
        const horsemanScore = typeof horsemanData === 'object' ? (horsemanData.percentage ?? 0) : (typeof horsemanData === 'number' ? horsemanData : 0);
        let level;
        if (horsemanScore < 30) level = 'low';
        else if (horsemanScore < 60) level = 'moderate';
        else level = 'high';

        horsemenResults[horseman] = {
          ...levels,
          level,
          score: horsemanScore,
          interpretation: levels[level]
        };
      }

      const strengthResults = {};
      const strengthsByType = score.strengths?.byType || score.strengths || {};
      for (const [strength, levels] of Object.entries(gottmanInterpretations.strengths)) {
        const strengthData = strengthsByType[strength];
        const strengthScore = typeof strengthData === 'object' ? (strengthData.percentage ?? 50) : (typeof strengthData === 'number' ? strengthData : 50);
        strengthResults[strength] = {
          ...levels,
          score: strengthScore,
          interpretation: strengthScore >= 60 ? levels.high : levels.low
        };
      }

      return {
        overallHealth: score.overallHealth || score.overall,
        horsemen: horsemenResults,
        strengths: strengthResults,
        creatorReframe: 'These are YOUR horsemen, YOUR bids, YOUR repair attempts. You cannot control what your partner does. You CAN control whether YOU deploy criticism or gentle startup, contempt or appreciation, defensiveness or responsibility, stonewalling or self-soothing.'
      };
    }

    case 'emotional_intelligence': {
      const results = {};
      for (const [domain, info] of Object.entries(eqInterpretations)) {
        const domainData = score.subscores ? score.subscores[domain] : null;
        const domainScore = typeof domainData === 'object' ? (domainData?.percentage ?? 50) : (typeof domainData === 'number' ? domainData : 50);
        let level;
        if (domainScore >= 70) level = 'high';
        else if (domainScore >= 40) level = 'moderate';
        else level = 'low';

        results[domain] = {
          ...info,
          score: domainScore,
          level,
          interpretation: info[level]
        };
      }

      return {
        overall: score.overall,
        domains: results,
        creatorReframe: 'Emotional intelligence is not fixed — it\'s a set of skills you can develop. Every expert in this course teaches EQ from a different angle: Voss teaches empathy, Belfort teaches self-regulation, Brown teaches self-awareness through vulnerability, Gottman teaches social skills through repair attempts.'
      };
    }

    case 'conflict_style': {
      const primary = score.primary || 'compromising';
      const secondary = score.secondary;
      return {
        primary: conflictStyleInterpretations[primary] || conflictStyleInterpretations.compromising,
        secondary: secondary ? conflictStyleInterpretations[secondary] : null,
        allStyles: score.allStyles || score.ranking,
        creatorReframe: 'No conflict style is universally "right" — each has a time and place. The key is CHOOSING your style intentionally rather than defaulting to the same one every time. Awareness gives you options.'
      };
    }

    case 'differentiation': {
      let level;
      const diffScore = score.overallScore ?? score.overall ?? 50;
      if (diffScore >= 70) level = 'high';
      else if (diffScore >= 40) level = 'moderate';
      else level = 'low';

      return {
        ...differentiationInterpretations[level],
        score: diffScore,
        subscores: score.subscores,
        creatorReframe: 'Differentiation is the master skill of mature love. It\'s the ability to be fully yourself while being fully connected. Every other skill in this course becomes easier as your differentiation grows.',
        connectedFrameworks: ['Jennifer Finlayson-Fife (Core framework)', 'Murray Bowen (Family Systems)', 'Stan Tatkin (Anchor attachment)', 'Sue Johnson (Earned security)']
      };
    }

    case 'personality': {
      const typeStr = score.type || 'INFJ';
      return {
        type: typeStr,
        description: score.description,
        dimensions: Object.entries(score.dimensions || {}).map(([dim, dimData]) => {
          // dimData has keys like E, I, preference, clarity, clarityLabel
          const preference = dimData?.preference;
          if (!preference) return null;
          const dimInfo = personalityInterpretations.dimensions?.[dim];
          return dimInfo ? { dimension: dim, dominant: preference, ...dimInfo[preference] } : { dimension: dim, dominant: preference };
        }).filter(Boolean),
        creatorReframe: 'Your personality type is not destiny — it\'s a tendency. Understanding YOUR type helps you see your blind spots and play to your strengths. Don\'t use it to label or limit yourself or your partner.'
      };
    }

    case 'hormonal_health': {
      const hhResults = {};
      for (const [domain, info] of Object.entries(hormonalHealthInterpretations)) {
        const domainData = score.subscores ? score.subscores[domain] : null;
        const domainScore = domainData ? domainData.percentage : 50;
        let level;
        if (domainScore >= 60) level = 'high';
        else if (domainScore >= 40) level = 'moderate';
        else level = 'low';

        hhResults[domain] = {
          ...info,
          score: domainScore,
          level,
          interpretation: info[level]
        };
      }

      // Identify top areas of concern
      const hhSorted = Object.entries(hhResults).sort((a, b) => b[1].score - a[1].score);
      const topConcerns = hhSorted.filter(([_, data]) => data.score >= 50).slice(0, 3);

      return {
        title: 'Hormonal Wellness Assessment',
        description: score.level === 'high_concern'
          ? 'Your responses suggest significant hormonal symptoms across multiple areas. This is valuable self-awareness — and a strong signal to get comprehensive bloodwork done.'
          : score.level === 'moderate_concern'
            ? 'Your responses suggest moderate hormonal symptoms. Some areas are more affected than others. Targeted investigation could uncover easy wins.'
            : score.level === 'mild_symptoms'
              ? 'Your responses suggest mild hormonal symptoms. Your body is functioning reasonably well, with some areas worth monitoring.'
              : 'Your responses suggest minimal hormonal symptoms. Your hormonal health appears to be supporting you well.',
        disclaimer: '⚕️ This is a wellness self-screener, NOT medical advice. It identifies patterns worth exploring with a qualified healthcare provider. Always get proper bloodwork and professional evaluation before making health decisions.',
        overall: score.overallSymptomLoad || score.overall,
        level: score.level,
        domains: hhResults,
        topConcerns: topConcerns.map(([domain, data]) => ({
          domain,
          title: data.title,
          score: data.score,
          interpretation: data.interpretation,
          relationshipImpact: data.relationshipImpact,
          actionSteps: data.actionSteps
        })),
        subscores: score.subscores,
        strengths: (score.strengths || []).map(s => hormonalHealthInterpretations[s]?.title || s),
        growthEdges: (score.areasOfConcern || []).map(a => hormonalHealthInterpretations[a]?.title || a),
        actionSteps: [
          'Schedule comprehensive bloodwork — hormone panel, thyroid panel, metabolic panel',
          'Track your symptoms for 30 days to identify patterns',
          'Optimize the foundations: sleep, stress, exercise, and nutrition',
          'Discuss results with a hormone-literate healthcare provider',
          'Communicate with your partner about what you\'re learning — this is a team effort'
        ],
        creatorReframe: 'Your body is not betraying you — it\'s communicating. Hormonal symptoms are signals, not sentences. The same way you invest in understanding your emotional patterns, investing in understanding your physiology is an act of love for yourself and your relationship. You can\'t be the partner you want to be if your body is working against you. Get the data. Take ownership. This is what creators do.',
        connectedFrameworks: ['Andrew Huberman (Hormones & Neuroscience)', 'Dr. Peter Attia (Longevity & Metabolic Health)', 'Dr. Sara Gottfried (Hormone Cure)']
      };
    }

    case 'physical_vitality': {
      const pvResults = {};
      for (const [domain, info] of Object.entries(physicalVitalityInterpretations)) {
        const domainData = score.subscores ? score.subscores[domain] : null;
        const domainScore = domainData ? domainData.percentage : 50;
        let level;
        if (domainScore >= 65) level = 'high';
        else if (domainScore >= 40) level = 'moderate';
        else level = 'low';

        pvResults[domain] = {
          ...info,
          score: domainScore,
          level,
          interpretation: info[level]
        };
      }

      // Best and worst areas
      const pvSorted = Object.entries(pvResults).sort((a, b) => b[1].score - a[1].score);
      const pvStrengths = pvSorted.filter(([_, data]) => data.score >= 65);
      const pvGrowth = pvSorted.filter(([_, data]) => data.score < 50);

      return {
        title: 'Physical Vitality Assessment',
        description: score.level === 'thriving'
          ? 'Your physical vitality is exceptional. You\'re investing in your body, and it\'s paying dividends in your energy, confidence, and capacity for connection.'
          : score.level === 'strong'
            ? 'Your physical vitality is strong with room to optimize. You have a solid foundation — now fine-tune the areas that could elevate your energy and presence even further.'
            : score.level === 'developing'
              ? 'Your physical vitality is developing. You have strengths to build on and clear areas where investment will yield significant returns for your energy and relationship.'
              : score.level === 'struggling'
                ? 'Your physical vitality needs attention. Low vitality affects everything — mood, patience, desire, and the energy you bring home to your partner. The good news: small changes create big results.'
                : 'Your physical vitality is critically low. Your body is asking for help. Addressing this isn\'t optional — it\'s the foundation everything else is built on.',
        overall: score.overall,
        level: score.level,
        domains: pvResults,
        subscores: score.subscores,
        strengths: pvStrengths.map(([domain, data]) => `${data.title}: ${data.interpretation}`),
        growthEdges: pvGrowth.map(([domain, data]) => `${data.title}: ${data.interpretation}`),
        actionSteps: [
          'Pick your lowest-scoring area and commit to ONE small change this week',
          'Build a daily "vitality stack": move, eat well, sleep well, recover',
          'Make your physical health a shared goal with your partner — accountability accelerates results',
          'Schedule a comprehensive health checkup if you haven\'t had one recently',
          'Remember: your partner deserves your best energy, not your leftovers'
        ],
        creatorReframe: 'Your body is the vehicle for your love. Every hug, every conversation, every intimate moment, every adventure — it all happens through your physical body. Neglecting it isn\'t "no big deal" — it\'s slowly withdrawing from the relationship\'s energy bank. Taking radical ownership of your physical health is one of the most loving things you can do. Not because your partner demands it — because you respect yourself and your relationship enough to show up at your best.',
        connectedFrameworks: ['Andrew Huberman (Neuroscience of Performance)', 'Peter Attia (Longevity)', 'Kelly Starrett (Movement & Mobility)', 'Matthew Walker (Sleep Science)'],
        dailyPractice: 'Each morning ask: "What am I doing today for my body that will make me a better partner tonight?" Then do it.'
      };
    }

    // Legacy types
    case 'wellness_behavior': {
      let level;
      if (score.score >= 70) level = 'high';
      else if (score.score >= 40) level = 'medium';
      else level = 'low';

      const levels = {
        high: { title: 'Strong Coping Skills', description: 'You handle disappointment and frustration in generally healthy ways.' },
        medium: { title: 'Mixed Coping Patterns', description: 'You have healthy strategies but may fall into unhelpful patterns under stress.' },
        low: { title: 'Growth Opportunity', description: 'Developing healthier coping strategies is your key growth area.' }
      };

      return { ...levels[level], score: score.score, level };
    }

    case 'negative_patterns_closeness': {
      return {
        title: 'Relationship Patterns Analysis',
        patterns: score.patterns,
        closeness: score.closeness,
        overallRisk: score.overallRisk,
        creatorReframe: 'These patterns are YOUR patterns. You cannot control your partner\'s horsemen — only your own. Focus on reducing YOUR criticism, YOUR defensiveness, YOUR contempt, YOUR withdrawal.'
      };
    }

    default:
      return { title: 'Assessment Complete', description: 'Results processed.', creatorReframe: 'You are the creator of your relationship experience.' };
  }
}

module.exports = {
  getInterpretation,
  attachmentInterpretations,
  loveLanguageInterpretations,
  humanNeedsInterpretations,
  gottmanInterpretations,
  eqInterpretations,
  conflictStyleInterpretations,
  differentiationInterpretations,
  personalityInterpretations,
  hormonalHealthInterpretations,
  physicalVitalityInterpretations
};
