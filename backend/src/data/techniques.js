/**
 * LoveRescue Technique Library
 * 
 * 100+ evidence-based techniques from 11 world-class relationship experts.
 * Each technique is SPECIFIC — exact words, exact timing, exact triggers.
 * No generic self-help fluff. Raw, real, actionable.
 * 
 * Experts: Gottman, Sue Johnson, Chris Voss, Brené Brown, Tony Robbins,
 *          Esther Perel, Stan Tatkin, Gary Chapman, Amir Levine,
 *          Jordan Belfort, Jennifer Finlayson-Fife
 * 
 * 7 Meta-Patterns woven throughout:
 *   1. Safety Before Everything
 *   2. The Presenting Emotion Is Never the Real One
 *   3. The Pursue-Withdraw Cycle Is Universal
 *   4. The 5:1 Ratio Is Universal Law
 *   5. Specificity Is the Mechanism of Change
 *   6. Identity > Behavior
 *   7. Rituals Are the Architecture of Lasting Change
 */

const techniques = [

  // ═══════════════════════════════════════════════════════════════
  // JOHN GOTTMAN — The Science of Relationships
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'gottman-6-second-kiss',
    text: 'Before leaving the house today, kiss your partner for a full 6 seconds. Count in your head. No peck — a real, lingering kiss.',
    why: 'Gottman found that a 6-second kiss is long enough to trigger a romantic feeling and short enough to fit into any morning. It takes your goodbye from autopilot to intentional. Couples who maintain physical affection rituals report 67% higher relationship satisfaction.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['physical_touch'],
      attachmentStyles: ['anxious', 'secure', 'avoidant', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '10 seconds'
  },

  {
    id: 'gottman-love-map-question',
    text: 'Ask your partner one Love Map question tonight: "What are you most worried about right now?" Listen for 5 minutes without offering solutions.',
    why: 'Gottman\'s Love Maps research: couples who keep updating their knowledge of each other\'s inner world are the ones who last. Your partner is changing every day — if you stop being curious, you start living with a stranger.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 1,
    week: [1, 2],
    stage: 'learn',
    duration: '5 min'
  },

  {
    id: 'gottman-turn-toward-bids',
    text: 'Today, catch 3 "bids for connection" from your partner — a sigh, a comment about their day, showing you something on their phone — and turn TOWARD each one. Stop what you\'re doing, make eye contact, and engage for at least 30 seconds.',
    why: 'Gottman tracked couples for 6 years: those who turned toward bids 86% of the time were still together. Those who turned toward only 33% divorced. Bids are the atoms of love — tiny, easy to miss, and everything depends on them.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time', 'words_of_affirmation'],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '2 min total'
  },

  {
    id: 'gottman-fondness-admiration',
    text: 'Write down 5 qualities you genuinely admire about your partner — not what they DO, but who they ARE. Then tell them one tonight, with a specific example: "I admire your patience — like when you [specific moment]."',
    why: 'Gottman: the Fondness & Admiration system is the antidote to contempt, which is the #1 predictor of divorce. You cannot feel contempt and admiration at the same time. This exercise literally rewires which neural pathways fire when you think of your partner.',
    expert: 'gottman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: ['words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt'],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2, 3],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'gottman-gentle-startup',
    text: 'Take your biggest current complaint and rewrite it using this formula: "I feel [emotion] about [specific situation] and I need [specific request]." No "you always" or "you never." Practice saying it out loud 3 times before the conversation.',
    why: 'Gottman proved that 96% of conversations end the way they begin. A harsh startup guarantees a harsh ending. The gentle startup isn\'t weak — it\'s strategic. It gives your partner room to hear you instead of defend themselves.',
    expert: 'gottman',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['conflict', 'communication'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'gottman-repair-attempt',
    text: 'Create a repair attempt with your partner NOW, before your next fight. Agree on a word, phrase, or gesture (like "pause" or a hand signal) that means "I love you AND I need us to slow down." Practice using it in a calm moment first.',
    why: 'Gottman\'s most powerful finding: the #1 factor in relationship success isn\'t avoiding fights — it\'s the ability to repair during them. Happy couples aren\'t conflict-free; they\'re repair-attempt-rich. Having a pre-agreed signal removes the shame of calling a timeout mid-fight.',
    expert: 'gottman',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt', 'defensiveness', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '10 min setup'
  },

  {
    id: 'gottman-flooding-timeout',
    text: 'When your heart rate spikes during a disagreement (racing heart, tight chest, wanting to yell or shut down), say this exact script: "I\'m feeling flooded right now. I need 20 minutes to calm down. I\'m not leaving you — I\'m regulating. I\'ll be back at [specific time]." Then go do box breathing: 4 counts in, 4 hold, 4 out, 4 hold.',
    why: 'Gottman measured it: when heart rate exceeds 100 BPM during conflict, your IQ drops 30 points. You literally cannot access your prefrontal cortex. Taking a break isn\'t weakness — it\'s neuroscience. The key is ANNOUNCING the break with a return time so it doesn\'t become stonewalling.',
    expert: 'gottman',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant', 'fearful_avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: false
    },
    difficulty: 3,
    week: [3, 4],
    stage: 'practice',
    duration: '20 min'
  },

  {
    id: 'gottman-5-1-ratio-tracker',
    text: 'Carry a small note or use your phone. Every interaction with your partner today, mark it + (positive) or - (negative). At the end of the day, count. You need at least 5:1. If you\'re below, add positives tomorrow — don\'t just reduce negatives.',
    why: 'Gottman can predict divorce with 94% accuracy using one number: the ratio of positive to negative interactions. During conflict it\'s 5:1; in daily life it\'s 20:1. Most struggling couples are at 0.8:1 — more negative than positive. You can\'t manage what you don\'t measure.',
    expert: 'gottman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt'],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2, 3],
    stage: 'practice',
    duration: '3 min'
  },

  {
    id: 'gottman-stress-reducing-conversation',
    text: 'Tonight, have a 20-minute "stress-reducing conversation." Rules: talk about stress OUTSIDE the relationship (work, family, health). Your only job is to listen, validate, and say "that makes sense" — do NOT try to fix anything. Take turns.',
    why: 'Gottman: this is the single most important daily ritual for lasting relationships. Couples who do this daily have a buffer against external stress infecting the relationship. The magic is in NOT fixing — just being present.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time', 'words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship', 'communication'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3, 4, 5],
    stage: 'practice',
    duration: '20 min'
  },

  {
    id: 'gottman-dreams-within-conflict',
    text: 'Think of your most recurring argument. Now ask yourself: "What dream or deep need is underneath my position?" Write it down. Then ask your partner the same question about THEIR position. Listen without debating.',
    why: 'Gottman found that 69% of relationship problems are PERPETUAL — they never get solved. The couples who thrive don\'t resolve them; they understand the dream behind each person\'s position and honor it. When you stop trying to win and start trying to understand, gridlock breaks.',
    expert: 'gottman',
    type: 'pattern_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['conflict', 'meaning'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'practice',
    duration: '15 min'
  },

  {
    id: 'gottman-shared-meaning-ritual',
    text: 'Together, create or name one ritual that\'s YOURS as a couple — a Sunday morning tradition, a way you say goodnight, a weekly date format. Write it down and commit to it for the next 4 weeks.',
    why: 'Gottman\'s Sound Relationship House has "Shared Meaning" at the top for a reason. Couples who build rituals of connection create predictable moments of togetherness that become the scaffolding of identity. It\'s not what you do once that matters — it\'s what you do every week.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning', 'friendship'],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'transform',
    duration: '15 min'
  },

  {
    id: 'gottman-positive-perspective',
    text: 'Before your next interaction with your partner, spend 30 seconds remembering why you fell in love with them. Picture a specific moment — the first time they made you laugh, a time they showed up for you. Hold that image, THEN engage.',
    why: 'Gottman calls this "positive sentiment override" — when your default view of your partner is positive, you interpret ambiguous behavior charitably. When it\'s negative, even neutral actions feel like attacks. This 30-second reset changes the lens you see through.',
    expert: 'gottman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '30 sec'
  },

  {
    id: 'gottman-four-horsemen-awareness',
    text: 'Today, be a detective of your own behavior. Notice if you use any of the Four Horsemen: Criticism ("You always..."), Contempt (eye-rolling, sarcasm), Defensiveness ("That\'s not true, because..."), or Stonewalling (shutting down, walking away without a word). Write down which one showed up and what triggered it.',
    why: 'Gottman can predict divorce from a 15-minute conversation by spotting these four patterns. The first step isn\'t stopping them — it\'s SEEING them. Most people don\'t know they\'re doing it. Awareness precedes change.',
    expert: 'gottman',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt', 'defensiveness', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: 'ongoing'
  },

  {
    id: 'gottman-accept-influence',
    text: 'In your next disagreement, before stating your position, ask: "Help me understand your perspective better. What am I missing?" Then genuinely listen. Find one point you can agree with and say: "You\'re right about [specific thing]."',
    why: 'Gottman: men who don\'t accept influence from their partners have an 81% chance of divorce. But this applies to everyone. Accepting influence isn\'t losing — it\'s saying "your reality matters." It\'s the fastest way to de-escalate.',
    expert: 'gottman',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['defensiveness'],
      focusAreas: ['conflict', 'communication'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'gottman-aftermath-conversation',
    text: 'After your last fight has cooled (wait at least 24 hours), have an "aftermath conversation." Take turns completing: 1) "During that fight, I felt..." 2) "What triggered me was..." 3) "What I needed from you was..." 4) "One thing I could do differently next time is..." No interrupting during their turn.',
    why: 'Gottman: most couples never process their fights — they just avoid the topic until the next explosion. The aftermath conversation heals the wound AND teaches you both for next time. Processing is not rehashing — it\'s structured understanding.',
    expert: 'gottman',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt', 'defensiveness', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5, 6],
    stage: 'practice',
    duration: '20 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // SUE JOHNSON — Emotionally Focused Therapy (EFT)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'johnson-are-check-in',
    text: 'Tonight, ask your partner these 3 questions (Sue Johnson\'s A.R.E. check): 1) "Are you accessible to me right now?" 2) "Can I reach you when I need you?" 3) "Will you respond when I call?" Listen to their honest answers without defending.',
    why: 'Sue Johnson boiled 30 years of attachment research into 3 questions. These ARE the relationship. When the answer to all three is "yes," you feel safe. When any is "no," the alarm system fires. Asking them openly is an act of courage that invites real connection.',
    expert: 'johnson',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'practice',
    duration: '15 min'
  },

  {
    id: 'johnson-primary-emotion-dig',
    text: 'Next time you feel angry at your partner, PAUSE. Ask yourself: "What\'s underneath the anger?" Write down: "I\'m angry because... but underneath that, I\'m actually feeling [scared/sad/lonely/hurt] because I need [safety/closeness/reassurance/respect]."',
    why: 'Sue Johnson\'s core EFT principle: the presenting emotion is NEVER the real one. Anger is a secondary, reactive emotion. Underneath is always something more vulnerable — fear, sadness, longing. When you can access and share the primary emotion, your partner can actually respond to the real you.',
    expert: 'johnson',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'contempt'],
      focusAreas: ['conflict'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'learn',
    duration: '5 min'
  },

  {
    id: 'johnson-demon-dialogue-map',
    text: 'Draw your "demon dialogue" cycle on paper: "When I [pursue/criticize/demand], you [withdraw/defend/shut down]. When you do that, I feel [afraid/alone/rejected], so I [pursue harder/get louder]. And when I do that, you feel [overwhelmed/attacked/inadequate], so you [withdraw more]." Show it to your partner.',
    why: 'Sue Johnson: 80% of couples are stuck in a pursue-withdraw cycle and don\'t even know it. Drawing it on paper transforms "you vs. me" into "us vs. the cycle." When both people can see the pattern, they stop blaming each other and start fighting the real enemy.',
    expert: 'johnson',
    type: 'pattern_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant', 'fearful_avoidant'],
      cyclePositions: ['pursuer', 'withdrawer'],
      horsemen: ['criticism', 'stonewalling'],
      focusAreas: ['conflict', 'attachment'],
      anyProfile: false
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'learn',
    duration: '20 min'
  },

  {
    id: 'johnson-softened-startup-reframe',
    text: 'Before bringing up a complaint, reframe it as an attachment need: Instead of "You never listen to me," try "I feel disconnected from you and I need to know you\'re still here with me. Can we talk for 10 minutes with no phones?"',
    why: 'Johnson: every complaint is a disguised attachment cry. "You never help" = "I feel alone." "You\'re always on your phone" = "I can\'t reach you." When you translate the complaint into the need, your partner hears vulnerability instead of attack — and vulnerability invites closeness.',
    expert: 'johnson',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['communication', 'attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3],
    stage: 'practice',
    duration: '3 min'
  },

  {
    id: 'johnson-hold-me-tight',
    text: 'Sit facing your partner. Take their hands. Say: "Sometimes I get scared that [your deepest relationship fear]. What I need from you in those moments is [specific comfort]." Then ask them: "What\'s your version?" Hold space for their answer.',
    why: 'This is the core of Johnson\'s "Hold Me Tight" conversation — the most powerful exercise in EFT. It bypasses all the surface arguments and goes straight to the attachment bond. It takes enormous courage. It also creates more connection in 10 minutes than months of tiptoeing around the real issue.',
    expert: 'johnson',
    type: 'vulnerability',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant', 'secure'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 5,
    week: [5, 6],
    stage: 'transform',
    duration: '15 min'
  },

  {
    id: 'johnson-catch-the-bullet',
    text: 'When your partner says something hurtful, resist the urge to fire back. Instead, look for the hurt BEHIND their words. Say: "I hear that you\'re upset. What I think you\'re really telling me is that you feel [lonely/unseen/overwhelmed]. Am I close?"',
    why: 'Johnson calls this "catching the bullet" — instead of reacting to the shrapnel (harsh words), you reach for the pain that launched it. This is the move that transforms arguments into connection. It takes practice, and it feels impossible when you\'re hurt. But it\'s the master skill.',
    expert: 'johnson',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['secure', 'avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['defensiveness', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: false
    },
    difficulty: 5,
    week: [5, 6],
    stage: 'transform',
    duration: '1 min per use'
  },

  {
    id: 'johnson-attachment-injury-repair',
    text: 'If there\'s an old wound that still stings (a time your partner wasn\'t there when you needed them), share it using this structure: "When [specific event happened], I needed you to [specific action], and when you didn\'t, I felt [specific feeling]. I still carry that. I need to know it mattered to you."',
    why: 'Johnson: unresolved attachment injuries are relationship cancer. They don\'t go away — they get triggered again and again. The only cure is having the injured partner fully express the pain AND the other partner fully receive it. Not defend. Not explain. Just hear it and say "I\'m sorry. That matters."',
    expert: 'johnson',
    type: 'vulnerability',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment', 'conflict'],
      anyProfile: false
    },
    difficulty: 5,
    week: [5, 6],
    stage: 'transform',
    duration: '20 min'
  },

  {
    id: 'johnson-protest-behavior-log',
    text: 'Today, notice if you engage in any protest behaviors: repeatedly texting when they don\'t respond, bringing up old issues to get a reaction, keeping score, threatening to leave, sulking. Write down: "I did [behavior] because I was feeling [real emotion underneath]."',
    why: 'Johnson & Levine: protest behaviors are the anxious attachment system\'s alarm bells. They\'re not manipulation — they\'re panic. But they push your partner away, creating the exact abandonment you fear. Logging them builds the awareness muscle needed to choose differently.',
    expert: 'johnson',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: 'ongoing'
  },

  // ═══════════════════════════════════════════════════════════════
  // CHRIS VOSS — Tactical Empathy & Communication
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'voss-mirror-technique',
    text: 'In your next conversation with your partner, mirror their last 1-3 words back as a question. They say "I had a terrible day at work" → you say "A terrible day?" Then be silent. Let them fill the space. Do this 3 times today.',
    why: 'Chris Voss used this to negotiate with hostage takers. Mirroring makes people feel profoundly heard and encourages them to elaborate without you asking probing questions. It\'s the fastest trust-building tool ever discovered — and it works just as well in your kitchen as in a crisis.',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'defensiveness'],
      focusAreas: ['communication', 'conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '30 sec per use'
  },

  {
    id: 'voss-emotion-labeling',
    text: 'When your partner is upset, use this exact phrase: "It seems like you\'re feeling [frustrated/overwhelmed/hurt/unheard]." Don\'t say "I think you feel" — say "It seems like." Don\'t follow with advice. Just label and wait.',
    why: 'Voss: labeling an emotion activates the prefrontal cortex and deactivates the amygdala. Literally — brain scans show it. When someone hears their emotion accurately named by another person, the intensity drops. It\'s neurological magic. The "it seems like" framing feels less presumptuous than "you feel."',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer', 'withdrawer'],
      horsemen: ['criticism', 'defensiveness'],
      focusAreas: ['communication', 'conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '30 sec per use'
  },

  {
    id: 'voss-accusation-audit',
    text: 'Before raising a sensitive topic, do an "accusation audit." List every negative thing your partner might think about you in this situation, then say them FIRST: "You probably think I\'m being controlling. You might feel like I don\'t trust you. You might even think I\'m trying to start a fight." Then pause. Let them respond.',
    why: 'Voss: when you front-load the negatives, you defuse them. The other person\'s brain was ready to launch those accusations — by saying them yourself, you take the ammunition away. People almost always respond with "No, I don\'t think that" and their defenses drop. It\'s counterintuitive genius.',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'contempt'],
      focusAreas: ['conflict', 'communication'],
      anyProfile: false
    },
    difficulty: 3,
    week: [3, 4],
    stage: 'practice',
    duration: '2 min'
  },

  {
    id: 'voss-calibrated-questions',
    text: 'Replace demands and "why" questions with calibrated "how" and "what" questions. Instead of "Why didn\'t you call?" try "What happened that made it hard to reach out?" Instead of "You need to help more" try "How can we divide this so we both feel good?"',
    why: 'Voss: "why" questions trigger defensiveness because they feel like accusations. "How" and "what" questions make your partner feel like a collaborator, not a defendant. Same information gathered, completely different emotional response. FBI negotiators NEVER ask "why."',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['communication', 'conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3, 4],
    stage: 'practice',
    duration: 'ongoing'
  },

  {
    id: 'voss-thats-right-technique',
    text: 'In your next emotional conversation, your goal is NOT to win or convince — it\'s to get your partner to say "That\'s right." Summarize their perspective so accurately that they say those two words. Use labels + paraphrasing: "So it sounds like you feel overwhelmed because [summary], and what you really need is [need]."',
    why: 'Voss: "That\'s right" is the most powerful phrase in negotiation. It means they feel completely understood. "You\'re right" is dangerous — it means they\'re agreeing to shut you up. The difference is everything. When your partner says "That\'s right," the wall comes down.',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['defensiveness', 'criticism'],
      focusAreas: ['communication', 'conflict'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'voss-tactical-silence',
    text: 'Today, practice "tactical silence" in one conversation. After your partner says something, wait 3 full seconds before responding. Count "one Mississippi, two Mississippi, three Mississippi." Let the silence work. Most people fill it with something more honest and vulnerable than what they said first.',
    why: 'Voss: silence is the cheapest and most powerful negotiation tool. Most people are so uncomfortable with it that they fill it with truth. In relationships, tactical silence replaces the urge to interrupt, fix, or defend. It says "I\'m listening" louder than any words.',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['communication'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '3 sec per use'
  },

  {
    id: 'voss-perspective-taking',
    text: 'Before your next disagreement, write a 5-sentence summary of your partner\'s perspective — their feelings, their needs, their fears. Make it so accurate they would read it and say "That\'s right." If you can\'t do it, you don\'t understand their position well enough to argue about it.',
    why: 'Voss built his career on one skill: understanding the other side better than they understand themselves. This exercise forces you to leave your own echo chamber. Most fights happen because both people feel misunderstood — this is how you break the cycle.',
    expert: 'voss',
    type: 'empathy',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4],
    stage: 'practice',
    duration: '5 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // BRENÉ BROWN — Vulnerability & Shame Resilience
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'brown-story-telling-myself',
    text: 'When you feel triggered today, say this out loud to your partner: "The story I\'m telling myself right now is [your worst-case interpretation]." Example: "The story I\'m telling myself is that you forgot about our plans because I\'m not a priority."',
    why: 'Brené Brown: naming the narrative takes away its power. It signals vulnerability without blame. It invites your partner into your inner world instead of hitting them with your reaction. And here\'s the kicker — the story is almost never the whole truth. Saying it out loud lets both of you examine it together.',
    expert: 'brown',
    type: 'vulnerability',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'contempt'],
      focusAreas: ['conflict', 'communication'],
      anyProfile: false
    },
    difficulty: 4,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '1 min'
  },

  {
    id: 'brown-shame-trigger-map',
    text: 'Write down your top 3 shame triggers in your relationship: the things that make you feel "not enough." For each one, complete: "I feel shame about [topic] because I believe it means [worst interpretation]. When this gets triggered, I usually [defend/attack/withdraw/perform]."',
    why: 'Brown: shame is the master emotion that drives all destructive relationship behavior. It hides behind anger, perfectionism, and numbing. You can\'t fight what you can\'t see. Mapping your shame triggers is like turning on the lights in a dark room — the monsters get smaller.',
    expert: 'brown',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: ['contempt', 'defensiveness'],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 3,
    week: [1, 2],
    stage: 'assess',
    duration: '10 min'
  },

  {
    id: 'brown-armor-check',
    text: 'Today, notice what "armor" you wear in your relationship. Brown identifies 3 main types: (1) Perfectionism — "If I do everything right, I can\'t be criticized." (2) Numbing — "If I don\'t feel, I can\'t be hurt." (3) Foreboding joy — "Something bad is coming, so I won\'t enjoy this." Which one is yours? Write it down with a specific example from this week.',
    why: 'Brown: armor protects you from vulnerability, but vulnerability is the birthplace of love, belonging, and connection. Your armor is keeping out the pain AND the joy. You can\'t selectively numb — when you shut down the hard feelings, the good ones go too.',
    expert: 'brown',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant', 'fearful_avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: '5 min'
  },

  {
    id: 'brown-rumble-with-vulnerability',
    text: 'Share one thing with your partner that you\'ve been holding back because you\'re afraid of their reaction. Preface it with: "I want to share something vulnerable with you. I\'m not looking for you to fix it — I just need you to hear it." Be specific. Be honest. Be brief.',
    why: 'Brown: "Vulnerability is not winning or losing. It\'s having the courage to show up when you can\'t control the outcome." Most relationship stagnation comes from both people hiding behind curated versions of themselves. One authentic disclosure can break through months of distance.',
    expert: 'brown',
    type: 'vulnerability',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant', 'fearful_avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['attachment', 'friendship'],
      anyProfile: false
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'brown-empathy-vs-sympathy',
    text: 'Next time your partner shares something painful, resist every urge to fix, minimize, or silver-lining it. Do NOT say "at least..." or "have you tried..." Instead say: "Thank you for telling me that. That sounds really hard. I\'m here." Full stop.',
    why: 'Brown: empathy fuels connection, sympathy drives disconnection. "At least it wasn\'t worse" makes people feel dismissed. "I\'m here" makes people feel held. The difference between empathy and sympathy is the difference between "I see you" and "I\'m uncomfortable with your pain."',
    expert: 'brown',
    type: 'communication',
    targetProfiles: {
      loveLanguages: ['words_of_affirmation', 'quality_time'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['communication', 'friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '1 min per use'
  },

  {
    id: 'brown-wholehearted-living-checkin',
    text: 'End today with this journaling exercise. Write 3 sentences: 1) "Today I showed up authentically when I..." 2) "Today I hid behind armor when I..." 3) "Tomorrow, I choose to..."',
    why: 'Brown: wholehearted living is a daily practice, not a destination. This 2-minute check-in builds the awareness of when you\'re being real vs. performing. Over time, the "showed up authentically" column grows and the armor column shrinks. That\'s transformation.',
    expert: 'brown',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2, 3],
    stage: 'learn',
    duration: '2 min'
  },

  {
    id: 'brown-boundaries-are-love',
    text: 'Identify one area where you\'ve been resentful because you didn\'t set a boundary. Write down the boundary you need: "I am willing to [X] but I am not willing to [Y]." Practice saying it out loud. Then share it with your partner using the frame: "I care about us enough to be honest about what I need."',
    why: 'Brown: "Daring to set boundaries is about having the courage to love ourselves, even when we risk disappointing others." Resentment is the #1 sign of missing boundaries. People think boundaries push partners away — but unclear boundaries create the distance. Clear ones create safety.',
    expert: 'brown',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '10 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // TONY ROBBINS — State, Identity & Human Needs
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'robbins-state-change',
    text: 'Before your next difficult conversation, change your physiology FIRST. Stand up straight, roll your shoulders back, take 5 deep power breaths (in for 4, out for 8), and say to yourself: "I am someone who handles hard conversations with grace." Then — and only then — engage.',
    why: 'Robbins: emotion is created by motion. Your physiology drives your psychology, not the other way around. You cannot feel defeated in a powerful posture. This 60-second reset gives you access to your best self instead of your reactive self. Do this BEFORE the conversation, not during.',
    expert: 'robbins',
    type: 'state_management',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'contempt'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '60 sec'
  },

  {
    id: 'robbins-identity-statement',
    text: 'Write your relationship identity statement: "I am the kind of partner who ___." Make it specific. Not "I am a good partner" but "I am the kind of partner who listens without defending, who notices the good, and who shows up even when it\'s uncomfortable." Read it every morning for 7 days.',
    why: 'Robbins: "Identity is the strongest force in human psychology." You will never consistently outperform your self-image. If you see yourself as someone who loses their temper, you\'ll keep losing it. When you upgrade the identity, the behaviors follow automatically. This is the deepest level of change.',
    expert: 'robbins',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [5, 6],
    stage: 'transform',
    duration: '5 min once, 30 sec daily'
  },

  {
    id: 'robbins-six-needs-audit',
    text: 'Write down which of Robbins\' 6 Human Needs your relationship is currently meeting and how: (1) Certainty/Security, (2) Variety/Surprise, (3) Significance/Feeling special, (4) Connection/Love, (5) Growth, (6) Contribution. Which 2 are lowest? Those are your growth edges.',
    why: 'Robbins: every behavior is driven by the need to meet one of 6 needs. When your relationship meets your top 2 needs, you\'re fulfilled. When it doesn\'t, you start meeting them outside the relationship — through work, social media, or worse. Knowing your needs isn\'t selfish — it\'s essential.',
    expert: 'robbins',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: '10 min'
  },

  {
    id: 'robbins-pattern-interrupt',
    text: 'Identify your #1 destructive pattern in arguments (yelling, sarcasm, shutting down, leaving). Create a physical pattern interrupt: the INSTANT you feel it starting, do something physically different — stand up, walk to the window, splash cold water on your face, hold an ice cube. Break the pattern with your body.',
    why: 'Robbins: you can\'t change a pattern while you\'re IN the pattern. A physical interrupt breaks the neurological sequence. It sounds weird, but holding an ice cube during a rising anger response literally redirects your nervous system. The goal isn\'t to suppress — it\'s to create a gap where you can CHOOSE.',
    expert: 'robbins',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt', 'defensiveness', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [3, 4],
    stage: 'practice',
    duration: '10 sec per use'
  },

  {
    id: 'robbins-morning-priming',
    text: 'Start tomorrow with a 5-minute "priming" ritual: 90 seconds of gratitude (think of 3 moments you\'re grateful for — visualize them vividly), 90 seconds of connection (send love to 3 people including your partner), 90 seconds of intention (visualize yourself being your best in your relationship today).',
    why: 'Robbins: most people start their day reacting — checking their phone, running through their to-do list, already stressed. Priming puts YOU in control of your state before the world dictates it. When you start the day in gratitude and intention, you show up differently in every interaction.',
    expert: 'robbins',
    type: 'state_management',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'robbins-needs-vehicle-upgrade',
    text: 'Pick one unmet need in your relationship (certainty, variety, significance, connection, growth, or contribution). Write down the CURRENT vehicle you use to meet it (scrolling Instagram for significance? Working late for certainty?). Then design a BETTER vehicle that meets the same need INSIDE your relationship.',
    why: 'Robbins: the need is never the problem — the vehicle is. If you need significance and you\'re getting it from work instead of your partner, the relationship suffers. The fix isn\'t to kill the need — it\'s to find a healthier vehicle. Most relationship problems are actually needs being met in the wrong place.',
    expert: 'robbins',
    type: 'pattern_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 3,
    week: [4, 5],
    stage: 'learn',
    duration: '10 min'
  },

  {
    id: 'robbins-incantation',
    text: 'Create a 1-sentence incantation about your relationship identity. Not an affirmation you whisper — an incantation you FEEL. Say it with your whole body, with conviction, with energy: "I am a powerful, present, compassionate partner and I bring my best to this relationship every single day." Say it 10 times with increasing intensity.',
    why: 'Robbins: "An affirmation without emotion is a lie. An incantation with emotion is a command to your nervous system." The difference between people who change and people who don\'t is embodiment. Saying it with your whole body wires it into your physiology, not just your thoughts.',
    expert: 'robbins',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [5, 6],
    stage: 'transform',
    duration: '2 min'
  },

  {
    id: 'robbins-focus-equals-feeling',
    text: 'For the next 24 hours, every time you think about your partner, deliberately shift your focus to something you LOVE about them. Not just "they\'re nice" — a specific memory, a specific quality, a specific moment. Set 3 phone alarms labeled "What do I love about [partner name]?" as reminders.',
    why: 'Robbins: "Where focus goes, energy flows." Your emotional experience of your relationship is determined by what you focus on. If you focus on what\'s wrong, you\'ll feel frustrated. Same relationship, different focus, completely different experience. This isn\'t delusion — it\'s direction.',
    expert: 'robbins',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: 'ongoing'
  },

  // ═══════════════════════════════════════════════════════════════
  // ESTHER PEREL — Desire, Eroticism & Modern Love
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'perel-curiosity-over-familiarity',
    text: 'Today, pretend you\'re meeting your partner for the first time. Watch them as if you\'re discovering a new person. Notice one thing about them — a gesture, a laugh, a way they talk to others — that you\'ve stopped seeing because familiarity made it invisible. Tell them what you noticed.',
    why: 'Perel: "Desire needs mystery. When we know everything about our partner, we stop being curious — and when curiosity dies, desire follows." The antidote isn\'t creating artificial mystery. It\'s remembering that your partner is a separate, complex person you\'ll never fully know. That realization IS the spark.',
    expert: 'perel',
    type: 'desire',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['secure'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning', 'friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [5, 6],
    stage: 'transform',
    duration: 'ongoing'
  },

  {
    id: 'perel-separate-togetherness',
    text: 'Schedule one activity this week that is YOURS alone — not shared, not couple-related. A hobby, a class, time with your own friends. When you come back, share what you experienced and how it made you feel. Don\'t apologize for taking the time.',
    why: 'Perel: "The grand illusion of committed love is that we think familiarity and closeness breed desire. But desire needs distance. Desire needs otherness." You cannot long for someone who is always there. Maintaining your individual self isn\'t selfishness — it\'s the fuel of attraction.',
    expert: 'perel',
    type: 'desire',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'transform',
    duration: '1-2 hours'
  },

  {
    id: 'perel-quality-of-conversations',
    text: 'Tonight, ask your partner a question you\'ve never asked before. Not about logistics or kids or plans. Something real: "What do you miss about your life before us?" or "When do you feel most alive?" or "Is there something you\'ve always wanted to tell me but haven\'t?"',
    why: 'Perel: "The quality of your relationships is determined by the quality of your conversations." Most long-term couples run on autopilot conversations — schedules, complaints, surface updates. One genuinely curious question can crack open intimacy that\'s been dormant for months.',
    expert: 'perel',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship', 'meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [4, 5],
    stage: 'practice',
    duration: '15 min'
  },

  {
    id: 'perel-erotic-vs-domestic',
    text: 'Write down: "In my relationship, I am mostly [domestic partner / erotic being / both]." Then: "My partner mostly sees me as [caretaker / lover / friend / roommate]." Be honest about the gap between who you want to be and who you\'ve become in this role.',
    why: 'Perel: most couples slowly shift from lovers to roommates without realizing it. The domestic self and the erotic self need different things — security vs. adventure, comfort vs. edge. Both are valid. The couples who thrive make room for BOTH identities, not just the safe one.',
    expert: 'perel',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'learn',
    duration: '10 min'
  },

  {
    id: 'perel-anticipation-over-routine',
    text: 'Plan a surprise for your partner — but here\'s the rule: tell them SOMETHING is coming without telling them WHAT. Say "I have something planned for us Saturday. Dress nice." The anticipation IS the gift. Let them wonder.',
    why: 'Perel: "Desire is about wanting, not having. The moment of highest desire is the moment before." Anticipation activates the dopamine system more than the experience itself. When everything in a relationship is predictable, desire atrophies. Strategic mystery reignites it.',
    expert: 'perel',
    type: 'desire',
    targetProfiles: {
      loveLanguages: ['receiving_gifts', 'quality_time'],
      attachmentStyles: ['secure'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 2,
    week: [5, 6],
    stage: 'transform',
    duration: '5 min planning'
  },

  {
    id: 'perel-third-self',
    text: 'Together with your partner, discuss: "Who are WE as a couple? Not who are you and who am I — who is the third entity that exists between us?" Give your relationship a personality. What does it value? What does it need? What would it say if it could talk?',
    why: 'Perel: the relationship is its own entity — the "third self." When couples stop nurturing this third entity, they become two individuals sharing a space. Naming and tending the relationship-as-entity creates a shared project that transcends both individuals.',
    expert: 'perel',
    type: 'shared_meaning',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 4,
    week: [6],
    stage: 'transform',
    duration: '15 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // STAN TATKIN — Psychobiological Approach to Couple Therapy
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'tatkin-couple-bubble',
    text: 'With your partner, make the "couple bubble" agreement: "We are each other\'s safe zone. I will protect you from others and from myself. I will not use your vulnerabilities against you. What we share stays between us." Write it down. Sign it. Post it somewhere you both see it.',
    why: 'Tatkin: the couple bubble is a mutual agreement to be each other\'s primary security system. It\'s not about being codependent — it\'s about making the relationship a fortress both people can retreat to. When this agreement is explicit, both people\'s nervous systems relax. Safety IS the relationship.',
    expert: 'tatkin',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [3, 4],
    stage: 'practice',
    duration: '15 min'
  },

  {
    id: 'tatkin-morning-launch',
    text: 'Create a 2-minute morning launch ritual: Before you part for the day, make eye contact, give a real hug (not a side squeeze), and each share one thing about your day — "I\'m looking forward to..." or "I\'m nervous about..." End with "I love you" or your own version.',
    why: 'Tatkin: how you launch and land your day together programs your nervous system. Couples who have a brief morning ritual report feeling more connected all day. It\'s 2 minutes that sets the emotional thermostat for the next 12 hours. Your nervous system remembers the last interaction.',
    expert: 'tatkin',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['physical_touch', 'quality_time'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '2 min'
  },

  {
    id: 'tatkin-evening-reunion',
    text: 'Create an evening reunion ritual: When you first see each other after the day, stop everything. No phones. Walk to them. Full embrace for 20 seconds (count it). Ask: "What was the highlight of your day?" and "What was the hardest part?" Listen completely.',
    why: 'Tatkin: the reunion is the most important moment of the day. Most couples greet each other while distracted — scrolling, cooking, half-listening. A 20-second hug releases oxytocin and cortisol drops. You\'re literally chemically telling each other "you\'re safe now."',
    expert: 'tatkin',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['physical_touch', 'quality_time'],
      attachmentStyles: ['anxious'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'tatkin-co-regulation',
    text: 'Next time your partner is stressed or upset, don\'t try to talk them out of it. Instead, sit next to them. Match your breathing to theirs, then slowly lengthen your exhale. Place a hand on their back or hold their hand. Let your calm nervous system regulate theirs. No words needed for the first 2 minutes.',
    why: 'Tatkin: "Your partner is your psychobiological regulator." Humans co-regulate — our nervous systems sync with those closest to us. When one person is calm, it physiologically calms the other. This isn\'t just metaphor — it\'s measurable. Heart rate, cortisol, breathing all synchronize.',
    expert: 'tatkin',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: ['physical_touch'],
      attachmentStyles: ['secure'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'tatkin-face-reading',
    text: 'Spend 2 minutes looking at your partner\'s face today — really looking. Notice their expression. Before asking "are you okay?", try to read what they\'re feeling first. Then check: "It looks like you might be feeling [tired/worried/happy/annoyed]. Am I reading you right?"',
    why: 'Tatkin: secure-functioning couples become experts at reading each other\'s faces. This isn\'t mind-reading — it\'s paying attention. Most couples stop looking at each other closely after the first year. Relearning to read your partner\'s face builds the rapid-response empathy that prevents escalation.',
    expert: 'tatkin',
    type: 'empathy',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['communication'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '2 min'
  },

  {
    id: 'tatkin-secure-functioning-agreement',
    text: 'Discuss and write down 3 "secure functioning" agreements with your partner: (1) We deal with problems immediately — no collecting grievances. (2) When one of us is distressed, the other drops everything for 5 minutes. (3) We never threaten the relationship during fights — "I\'m leaving" is off the table.',
    why: 'Tatkin: secure-functioning couples operate as a two-person system with explicit rules of engagement. Most couples have implicit rules that were never discussed. Making them explicit removes ambiguity — and ambiguity is where anxiety and avoidance breed.',
    expert: 'tatkin',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment', 'conflict'],
      anyProfile: false
    },
    difficulty: 4,
    week: [5, 6],
    stage: 'transform',
    duration: '20 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // GARY CHAPMAN — The 5 Love Languages
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'chapman-words-affirmation-specific',
    text: 'Write and deliver one SPECIFIC verbal appreciation today. Not "you\'re great" but "I noticed how you handled that situation with [specific context] — your patience there really impressed me. That\'s who you are." Character, not appearance. Action, not vague praise.',
    why: 'Chapman: for Words of Affirmation speakers, SPECIFIC praise lands 10x harder than generic compliments. "You\'re great" barely registers. "I watched you stay calm with the kids when you were exhausted — that takes real strength" — THAT fills the love tank. Specificity is the delivery mechanism.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: false
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '1 min'
  },

  {
    id: 'chapman-acts-service-unrequested',
    text: 'Do one meaningful task your partner usually handles — without being asked, without announcing it, without expecting credit. Fold their laundry. Handle the errand they\'ve been putting off. Make their lunch. Let them discover it done.',
    why: 'Chapman: for Acts of Service speakers, an unrequested act of service says "I see you, I know what weighs on you, and I care enough to lighten it." The unrequested part is crucial — it proves you were PAYING ATTENTION. Doing it for credit defeats the purpose.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['acts_of_service'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: false
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '15-30 min'
  },

  {
    id: 'chapman-quality-time-undivided',
    text: 'Tonight, give your partner 15 minutes of UNDIVIDED attention. Phones in another room. TV off. Face each other. Ask open-ended questions and actually listen. If you catch yourself thinking about what to say next, stop — focus back on their words.',
    why: 'Chapman: Quality Time speakers don\'t just want you in the room — they want you PRESENT. A distracted hour together feels lonelier than being alone. 15 minutes of genuine presence creates more connection than a whole evening of parallel phone-scrolling on the couch.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: false
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '15 min'
  },

  {
    id: 'chapman-physical-touch-throughout-day',
    text: 'Today, incorporate 5 non-sexual touches throughout the day: a hand on their back walking by, holding hands for 30 seconds, a forehead kiss, playing with their hair, a shoulder squeeze. Small, natural, frequent — not one big gesture.',
    why: 'Chapman: for Physical Touch speakers, casual affection throughout the day matters MORE than one big romantic gesture. Each touch releases a micro-dose of oxytocin and says "I\'m here, I choose you." The frequency matters more than the intensity.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['physical_touch'],
      attachmentStyles: ['anxious'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship', 'attachment'],
      anyProfile: false
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: 'ongoing'
  },

  {
    id: 'chapman-gifts-thoughtful-free',
    text: 'Give your partner one small, thoughtful gift today. It doesn\'t have to cost anything: a handwritten note in their jacket pocket, a flower from the yard, their favorite snack, a screenshot of something that reminded you of them. The thought is the gift.',
    why: 'Chapman: for Receiving Gifts speakers, the gift is a tangible symbol of "you were thinking about me." The cost is irrelevant — a $2 candy bar that\'s their specific favorite says more than an expensive gift chosen without thought. The symbol of being thought of IS the love language.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['receiving_gifts'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: false
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'chapman-learn-partner-dialect',
    text: 'Even within the same love language, everyone has a "dialect." Ask your partner directly: "When do you feel MOST loved by me? Give me a specific example." Write down their answer. That\'s their dialect. Then ask: "When do you feel LEAST loved?" Write that too.',
    why: 'Chapman: knowing someone\'s love language is step 1. Knowing their DIALECT is mastery. "Quality time" could mean adventure dates or cozy Netflix evenings. "Words of affirmation" could mean public praise or private whispers. The only way to know is to ask — and most people never do.',
    expert: 'chapman',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: '10 min'
  },

  {
    id: 'chapman-bilingual-love',
    text: 'Today, express love in YOUR partner\'s language, not yours. If you\'re a Words person but they\'re an Acts person, do something helpful instead of saying something nice. It might feel awkward — that\'s normal. You\'re speaking a foreign language. Fluency comes with practice.',
    why: 'Chapman: most people love in their OWN language and wonder why it doesn\'t land. You\'re sending love letters in French to someone who speaks Japanese. This isn\'t about effort — it\'s about translation. The same amount of energy in the RIGHT language creates 10x the impact.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3, 4],
    stage: 'practice',
    duration: 'varies'
  },

  // ═══════════════════════════════════════════════════════════════
  // AMIR LEVINE — Attachment Theory in Adult Relationships
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'levine-attachment-awareness',
    text: 'Today, notice your attachment system activating. When your partner doesn\'t text back quickly, when they seem distant, when plans change — notice what happens in your body. Write: "My attachment system activated when [trigger]. I felt [sensation in body]. My urge was to [protest behavior]. What I actually needed was [real need]."',
    why: 'Levine: your attachment style isn\'t a personality flaw — it\'s your nervous system\'s early warning system for relationship threats. The key isn\'t to STOP the activation — it\'s to NOTICE it and choose your response. Awareness is the gap between trigger and reaction where growth lives.',
    expert: 'levine',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: 'ongoing'
  },

  {
    id: 'levine-deactivating-strategy-log',
    text: 'If you tend toward avoidant attachment, notice your deactivating strategies today: mentally checking out during conversations, focusing on your partner\'s flaws to justify distance, thinking "I don\'t need anyone," keeping busy to avoid emotional intimacy. Write down one instance and what you were actually feeling underneath the withdrawal.',
    why: 'Levine: deactivating strategies are the avoidant\'s version of protest behaviors. They LOOK like independence, but they\'re actually fear wearing a mask. "I don\'t need anyone" is the avoidant\'s way of saying "I\'m terrified of needing someone and being disappointed." Seeing through your own defense is the first step.',
    expert: 'levine',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant', 'fearful_avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: 'ongoing'
  },

  {
    id: 'levine-effective-communication',
    text: 'Express one need today using Levine\'s effective communication formula: (1) State the specific trigger, not a generalization. (2) Express how it made you feel without blaming. (3) State your specific need. Example: "When you checked your phone during dinner [trigger], I felt unimportant [feeling]. I need us to have phone-free meals [need]."',
    why: 'Levine: people with insecure attachment either suppress their needs (avoidant) or express them through protest (anxious). Neither works. Effective communication is the middle path — clear, non-blaming, specific. It gives your partner an actual chance to meet your needs instead of defending against attacks.',
    expert: 'levine',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant'],
      cyclePositions: ['pursuer', 'withdrawer'],
      horsemen: ['criticism'],
      focusAreas: ['communication', 'attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'levine-anxious-self-soothing',
    text: 'When you feel the anxious urge to reach out for the 3rd time (checking if they got your text, calling again, asking "are we okay?"), STOP. Set a 60-second timer. Breathe. Write down: "Right now I feel [emotion]. The story I\'m telling myself is [fear]. The evidence says [facts]." If after 60 seconds you still need to reach out, do it ONCE, directly.',
    why: 'Levine: the anxious attachment system creates a "protest behavior" cascade — each unanswered bid escalates the alarm. But each escalation pushes your partner further away. The 60-second pause isn\'t suppression — it\'s giving your prefrontal cortex time to catch up with your amygdala.',
    expert: 'levine',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '60 sec'
  },

  {
    id: 'levine-avoidant-stay-5-more',
    text: 'Today, when you feel the urge to withdraw from an emotional conversation — to change the subject, check your phone, or leave the room — stay for 5 more minutes. Just 5. Say: "This is hard for me, but I want to stay." You don\'t have to have the answer. Just being present is the practice.',
    why: 'Levine: the avoidant\'s deactivating strategy says "leave before you get hurt." But leaving reinforces the belief that closeness is dangerous. Staying 5 extra minutes — tolerating the discomfort — gradually rewires the nervous system. You\'re teaching your brain that closeness is survivable.',
    expert: 'levine',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant', 'fearful_avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'levine-earned-security-practice',
    text: 'Practice one "earned security" behavior today: (1) If anxious: self-soothe before seeking reassurance. (2) If avoidant: initiate closeness without being asked. (3) If fearful-avoidant: notice the push-pull urge and choose one direction. Write down what happened when you chose the secure response.',
    why: 'Levine: "earned secure attachment" is real — you can literally change your attachment style through consistent practice. It\'s not about faking security. It\'s about choosing the secure response enough times that it becomes your default. Every time you choose differently, you\'re rewiring your nervous system.',
    expert: 'levine',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: 'varies'
  },

  {
    id: 'levine-relationship-needs-inventory',
    text: 'Write a list of your top 5 relationship needs (security, independence, affection, intellectual stimulation, shared activities, etc.). Rank them. Now ask your partner to do the same. Compare lists. The gaps between your lists aren\'t problems — they\'re a map for how to love each other better.',
    why: 'Levine: most relationship dissatisfaction comes from unidentified, unspoken needs. You can\'t meet a need you don\'t know about. Most people have never sat down and clearly defined what they actually need from a partner. This exercise turns vague frustration into specific, actionable information.',
    expert: 'levine',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment', 'communication'],
      anyProfile: true
    },
    difficulty: 2,
    week: [1, 2],
    stage: 'assess',
    duration: '15 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // JORDAN BELFORT — Confidence, State & Inner Game
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'belfort-certainty-anchor',
    text: 'Create a "certainty anchor" for your relationship: Close your eyes. Recall the moment you were MOST in love — the exact scene, the smells, the feelings. When the feeling peaks, press your thumb and forefinger together. Hold for 10 seconds. Do this 5 times. Now you have a physical anchor you can fire any time you need to reconnect with WHY you chose this person.',
    why: 'Belfort teaches that certainty is a STATE you can access on demand. Most relationship doubt isn\'t logical — it\'s emotional. When anxiety distorts your view, firing this anchor bypasses the doubt and reconnects you with the truth your body already knows. NLP anchoring is a real technique used by top performers.',
    expert: 'belfort',
    type: 'state_management',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 2,
    week: [3, 4],
    stage: 'practice',
    duration: '5 min setup, 5 sec to fire'
  },

  {
    id: 'belfort-tonality-awareness',
    text: 'Record yourself during a phone call with your partner today (with their knowledge). Listen back. Notice your tonality: Do you sound warm? Rushed? Annoyed? Flat? Tomorrow, consciously add warmth — speak slightly slower, let your pitch rise at the end of their name, smile while you talk (it changes your voice).',
    why: 'Belfort: 45% of communication is tonality. You can say the right words in a tone that says the opposite. Most people have no idea what they actually sound like. Recording yourself is uncomfortable — and transformative. Your partner responds to HOW you say things before they process WHAT you say.',
    expert: 'belfort',
    type: 'communication',
    targetProfiles: {
      loveLanguages: ['words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt'],
      focusAreas: ['communication'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'belfort-confidence-body-language',
    text: 'For the next 24 hours, consciously manage your body language with your partner: open posture (no crossed arms), lean in when they speak, maintain 60% eye contact, keep your hands visible and relaxed. Notice how their behavior changes when yours does.',
    why: 'Belfort: body language is the first channel of communication your partner reads. Before you open your mouth, your body has already told them whether you\'re open or closed, interested or checked out. Changing your body language changes the conversation before it starts.',
    expert: 'belfort',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['communication'],
      anyProfile: true
    },
    difficulty: 1,
    week: [2, 3],
    stage: 'practice',
    duration: 'ongoing'
  },

  {
    id: 'belfort-inner-game-rewrite',
    text: 'Write down your 3 most limiting beliefs about relationships: "I always ruin good things," "I\'m not enough," "Love always ends in pain." For each one, write the counter-evidence — 3 specific moments that DISPROVE the belief. Read the counter-evidence out loud, with conviction.',
    why: 'Belfort: your inner game determines your outer results. If you believe you\'re not worthy of love at a deep level, you\'ll unconsciously sabotage every relationship. The beliefs were installed by old experiences — they can be uninstalled by newer evidence. But you have to actively confront them.',
    expert: 'belfort',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [4, 5],
    stage: 'learn',
    duration: '10 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // JENNIFER FINLAYSON-FIFE — Desire, Differentiation & Growth
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'finlayson-fife-self-validated-intimacy',
    text: 'Today, do something loving for your partner NOT because they asked, NOT to get something back, and NOT out of guilt. Do it purely because you want to be the kind of person who loves generously. Notice the difference in how it feels when love comes from choice, not obligation.',
    why: 'Finlayson-Fife: "Self-validated intimacy is the highest form of love." Most people give to get — and then resent when the return doesn\'t match the investment. When you give from overflow instead of deficit, there\'s no scorecard. That\'s the love that transforms relationships.',
    expert: 'finlayson-fife',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'transform',
    duration: 'varies'
  },

  {
    id: 'finlayson-fife-differentiation',
    text: 'Identify one area where you\'ve been giving up your authentic self to avoid rocking the boat. What opinion have you suppressed? What need have you swallowed? Write: "I\'ve been pretending [X] because I\'m afraid that being honest would [consequence]." Today, speak that truth with respect but without apology.',
    why: 'Finlayson-Fife: differentiation — holding onto yourself while staying connected — is the core of adult love. Most people sacrifice authenticity for acceptance. But a relationship built on a false self will always feel hollow. Speaking your truth risks conflict but creates the possibility of REAL intimacy.',
    expert: 'finlayson-fife',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 4,
    week: [5, 6],
    stage: 'transform',
    duration: '10 min'
  },

  {
    id: 'finlayson-fife-desire-from-growth',
    text: 'Ask yourself honestly: "Am I growing as a person, or have I stagnated?" Write down one area where you\'ve stopped challenging yourself. Commit to one growth action this week — not for your relationship, for YOU. Take a class, read something challenging, set a personal goal.',
    why: 'Finlayson-Fife: "Your partner\'s desire for you is directly linked to your willingness to develop yourself. People are drawn to growth." Stagnation kills attraction more than conflict does. When you stop growing, you stop being interesting — to yourself and to your partner.',
    expert: 'finlayson-fife',
    type: 'desire',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'transform',
    duration: '15 min'
  },

  {
    id: 'finlayson-fife-self-confrontation',
    text: 'Write an honest answer to this question: "What is the thing my partner has been asking me to change that I know, deep down, they\'re right about?" Don\'t defend. Don\'t justify. Just sit with the truth of it. Then write: "I resist changing this because I\'m afraid of [honest fear]."',
    why: 'Finlayson-Fife: self-confrontation is the engine of personal growth. Most people spend enormous energy defending their current self instead of evolving it. The thing your partner keeps bringing up isn\'t nagging — it\'s feedback. The question is whether you have the courage to hear it.',
    expert: 'finlayson-fife',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['defensiveness'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'learn',
    duration: '10 min'
  },

  {
    id: 'finlayson-fife-stop-outsourcing-validation',
    text: 'Today, notice every time you seek validation from your partner — asking "Do I look okay?", fishing for compliments, needing reassurance about the relationship. For each instance, pause and validate YOURSELF first: "I know I\'m [specific quality] because [evidence]." Then, if you still want their input, ask from a place of curiosity, not need.',
    why: 'Finlayson-Fife: outsourcing your self-worth to your partner puts impossible pressure on them AND makes you less attractive. Confidence isn\'t arrogance — it\'s not needing external confirmation for what you already know about yourself. Partners are drawn to people who bring their own light.',
    expert: 'finlayson-fife',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [4, 5, 6],
    stage: 'transform',
    duration: 'ongoing'
  },

  // ═══════════════════════════════════════════════════════════════
  // CROSS-EXPERT SUPER-TECHNIQUES (Meta-pattern convergence)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'super-emotional-labeling',
    text: 'In your next emotional conversation, combine mirroring + labeling: (1) Mirror their last 3 words as a question. (2) When they elaborate, label: "It seems like you\'re feeling [emotion]." (3) If they confirm, go deeper: "And the story underneath that is...?" Use all 3 steps before responding with your own perspective.',
    why: 'This is THE super-technique — it appears in Voss (mirroring + labeling), Johnson (accessing primary emotions), Brown (naming the narrative), and Gottman (active listening). Five frameworks point to the same skill. It\'s the Swiss Army knife of relationship communication.',
    expert: 'voss+johnson+brown+gottman',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer', 'withdrawer'],
      horsemen: ['criticism', 'contempt', 'defensiveness'],
      focusAreas: ['communication', 'conflict'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5, 6],
    stage: 'practice',
    duration: '3 min per use'
  },

  {
    id: 'super-regulate-then-connect',
    text: 'Before any important relationship conversation: (1) Change your physiology — stand tall, breathe deeply for 60 seconds (Robbins). (2) Set your intention: "I want to understand, not to win" (Voss). (3) Begin with a positive — one genuine thing you appreciate (Gottman). THEN talk about the hard thing.',
    why: 'Robbins says regulate your state first. Gottman says start softly. Voss says set the emotional temperature. They\'re all saying the same thing: the conversation starts BEFORE the first word. If you enter regulated, intentional, and positive, the conversation goes 10x better. This sequence is the cheat code.',
    expert: 'robbins+gottman+voss',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'contempt'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '2 min before conversation'
  },

  {
    id: 'super-safety-first-protocol',
    text: 'Before addressing any sensitive topic, establish safety with this sequence: (1) Physical: sit side-by-side, not facing (Tatkin — reduces confrontation). (2) Verbal: "I want to talk about something because I care about us, not to attack you" (Brown). (3) Agreement: "Can we agree that if either of us gets flooded, we pause for 20 min?" (Gottman). THEN begin.',
    why: 'Meta-pattern #1: Safety Before Everything. Every expert converges here — nothing works until the nervous system feels safe. Tatkin\'s body positioning, Brown\'s framing, and Gottman\'s flooding agreement create a triple safety net. When both people feel safe, they can hear ANYTHING.',
    expert: 'tatkin+brown+gottman',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: ['criticism', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '3 min setup'
  },

  {
    id: 'super-daily-deposit',
    text: 'Make 5 "love deposits" today — one from each love language, regardless of your partner\'s primary: (1) Say something specific and kind (Words). (2) Do something helpful without being asked (Acts). (3) Give 15 minutes of undivided attention (Time). (4) Give a meaningful touch — 6-second kiss or 20-second hug (Touch). (5) Leave a small surprise — a note, a treat, a text screenshot (Gifts).',
    why: 'Meta-pattern #4: the 5:1 ratio is universal law. Chapman gives us 5 currencies. Gottman gives us the ratio. Combined: 5 deposits across 5 languages creates an overwhelming positive experience. Even if some don\'t match your partner\'s primary language, the sheer volume of intentional love is transformative.',
    expert: 'chapman+gottman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '30 min total'
  },

  {
    id: 'super-identity-integration',
    text: 'Write your "relationship identity manifesto" — 5 sentences that start with "I am someone who..." covering: (1) How you handle conflict (Gottman). (2) How you show vulnerability (Brown). (3) How you love (Chapman). (4) How you show up (Robbins). (5) Who you\'re becoming (Finlayson-Fife). Read it daily for the rest of the program.',
    why: 'Meta-pattern #6: Identity > Behavior. Robbins, Brown, Finlayson-Fife, and Gottman all converge: lasting change happens at the identity level. When you become someone who naturally does these things, you stop needing reminders. This manifesto is your north star — the partner you\'re becoming.',
    expert: 'robbins+brown+gottman+finlayson-fife',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 3,
    week: [6],
    stage: 'transform',
    duration: '15 min once, 1 min daily'
  },

  {
    id: 'super-ritual-stack',
    text: 'Build your permanent "relationship ritual stack" (10 min/day): Morning: "Today I choose to be [identity statement]" (Robbins, 30 sec). Midday: One appreciation in partner\'s love language (Chapman, 1 min). Evening reunion: 6-second kiss + "How was your day?" with full presence (Gottman/Tatkin, 5 min). Before bed: "The story I\'m telling myself about us is..." journal (Brown, 3 min).',
    why: 'Meta-pattern #7: Rituals Are the Architecture of Lasting Change. This stack combines the best daily practices from Robbins, Chapman, Gottman, Tatkin, and Brown into a 10-minute daily ritual. After 6 weeks of practice, these become automatic — not exercises you do, but who you ARE.',
    expert: 'robbins+chapman+gottman+tatkin+brown',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [6],
    stage: 'transform',
    duration: '10 min daily'
  },

  // ═══════════════════════════════════════════════════════════════
  // HORSEMAN-SPECIFIC ANTIDOTES (Gottman + complementary experts)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'antidote-criticism-to-complaint',
    text: 'Take your current biggest resentment and convert it from criticism to complaint. Criticism: "You\'re so selfish, you never think about anyone but yourself." Complaint: "I felt hurt when you made plans without checking with me. I need to feel considered in decisions that affect us both." Practice the complaint version 3 times out loud.',
    why: 'Gottman: criticism attacks CHARACTER; complaints address BEHAVIOR. Same issue, completely different impact. Criticism triggers defensiveness 100% of the time. Complaints can be heard. The formula is: "I feel [emotion] about [specific situation] and I need [specific request]." Not "You are [character flaw]."',
    expert: 'gottman',
    type: 'horseman_antidote',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['conflict'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'antidote-contempt-appreciation-flood',
    text: 'For the next 7 days, write down 3 things you GENUINELY appreciate about your partner each morning. Not forced. Not sarcastic. Genuinely search for what\'s good. On day 7, share all 21 items with them. Watch how this exercise changes what you notice.',
    why: 'Gottman: contempt is the #1 predictor of divorce, and its antidote is building a "culture of appreciation." You can\'t feel contempt and genuine appreciation simultaneously — they use the same neural circuitry. This 7-day flood rewires your default perception from "what\'s wrong" to "what\'s right."',
    expert: 'gottman',
    type: 'horseman_antidote',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt'],
      focusAreas: ['friendship'],
      anyProfile: false
    },
    difficulty: 2,
    week: [1, 2, 3],
    stage: 'practice',
    duration: '3 min daily'
  },

  {
    id: 'antidote-defensiveness-accept-2percent',
    text: 'Think of the last complaint your partner made about you. Instead of building your case for why they\'re wrong, find the 2% that\'s valid. Then say: "You\'re right that I [specific valid point]. I can do better at that." Don\'t add a "but." Full stop.',
    why: 'Gottman: defensiveness is a form of counter-attack that says "the problem is YOU, not me." Accepting even 2% responsibility transforms the conversation. Voss calls this the accusation audit — owning the valid part disarms the entire attack. The 2% is real — find it, own it, and watch the walls come down.',
    expert: 'gottman+voss',
    type: 'horseman_antidote',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['defensiveness'],
      focusAreas: ['conflict'],
      anyProfile: false
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '2 min'
  },

  {
    id: 'antidote-stonewalling-announced-break',
    text: 'Memorize and practice this script for your next flooding moment: "I want to work this out with you, but I\'m feeling overwhelmed right now. I need [15-30] minutes to calm down. I promise I\'ll come back and we\'ll finish this. I\'m not leaving you — I\'m taking care of myself so I can show up better." Then go do box breathing (4-4-4-4) for 5 minutes.',
    why: 'Gottman: stonewalling is flooding disguised as control. The antidote isn\'t "don\'t leave" — it\'s "leave WITH a promise to return." The announcement transforms what feels like abandonment (to your partner) into self-regulation. The return proves the promise. This one skill can break years of the withdraw pattern.',
    expert: 'gottman',
    type: 'horseman_antidote',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: false
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '20 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // MATCHUP-SPECIFIC (Dynamics between two profiles)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'matchup-anxious-avoidant-for-anxious',
    text: 'When you feel the urge to reach out for reassurance for the 3rd time today, pause. Write down what you ACTUALLY need. Then express it ONCE, directly: "I\'m feeling disconnected and I need [specific thing — a 5-minute check-in, a hug, confirmation about Saturday\'s plans]." One clear request. No hints. No repetition.',
    why: 'Levine: in the anxious-avoidant trap, the anxious partner\'s repeated bids feel like pursuit to the avoidant, triggering more withdrawal, creating more anxiety — a perfect destructive loop. One clear, direct request is 10x more effective than 10 subtle bids. It gives your avoidant partner a specific thing to DO instead of a general sense of failure.',
    expert: 'levine+johnson',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'matchup-anxious-avoidant-for-avoidant',
    text: 'Today, initiate ONE moment of connection before your partner asks for it. A text that says "thinking about you," a touch on the shoulder, asking about their day with genuine interest. Do it FIRST — don\'t wait for them to request it.',
    why: 'Levine: when an avoidant partner initiates connection, it short-circuits the anxious partner\'s alarm system. One proactive reach equals hours of reduced anxiety for them. It\'s not about grand gestures — it\'s about unprompted bids. Your partner\'s nervous system is always scanning for evidence that you\'re there. GIVE them that evidence.',
    expert: 'levine+johnson',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 3,
    week: [2, 3, 4],
    stage: 'practice',
    duration: '1 min'
  },

  {
    id: 'matchup-pursuer-withdrawer-cycle-break',
    text: 'Together, sit down and draw your pursue-withdraw cycle on paper. Use arrows: "When I [pursue/demand], you [withdraw/defend]. That makes me feel [scared/alone], so I [escalate]. That makes you feel [overwhelmed/attacked], so you [shut down further]." Label each step together. Tape it to the fridge.',
    why: 'Johnson: naming the cycle together is the single most powerful intervention in EFT. Once you can both SEE it, you stop blaming each other and start fighting the PATTERN. "There\'s our cycle again" becomes a collaborative observation instead of "why do you always do this?" Externalizing the enemy unites the team.',
    expert: 'johnson',
    type: 'pattern_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant'],
      cyclePositions: ['pursuer', 'withdrawer'],
      horsemen: ['criticism', 'stonewalling'],
      focusAreas: ['conflict', 'attachment'],
      anyProfile: false
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'learn',
    duration: '20 min'
  },

  {
    id: 'matchup-love-language-translation',
    text: 'This week, express love ONLY in your partner\'s language, not yours. If you\'re a Words person and they\'re Acts, stop complimenting and start DOING. If they\'re Touch and you\'re Quality Time, stop talking and start holding. It will feel unnatural — that\'s the point. You\'re learning a foreign language.',
    why: 'Chapman: most couples are sending love in their OWN language and wondering why it doesn\'t land. You\'re writing love letters in French to someone who reads Japanese. The effort isn\'t the issue — the TRANSLATION is. This exercise breaks the illusion that your way of loving is the only way.',
    expert: 'chapman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: 'ongoing'
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL POSITIVE LENS TECHNIQUES (Non-negotiable foundation)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'positive-lens-gratitude-snapshot',
    text: 'Write a 3-sentence "gratitude snapshot" about your partner right now. Sentence 1: Something they did this week that made life better. Sentence 2: A quality of theirs you\'re grateful for. Sentence 3: A moment this week when you felt glad they\'re your person. Share it with them.',
    why: 'The gratitude snapshot combines Gottman\'s fondness/admiration system with Chapman\'s words of affirmation. It forces SPECIFICITY — not "I\'m grateful for you" but "I\'m grateful for the way you..." Sharing it out loud creates a virtuous cycle: expressed gratitude makes both people feel better.',
    expert: 'gottman+chapman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: ['words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '3 min'
  },

  {
    id: 'positive-lens-reframe-negative',
    text: 'Catch yourself in one negative thought about your partner today. Write it down. Now find the POSITIVE intent behind the behavior you\'re criticizing. "They never plan dates" → "They show love differently than I do." "They\'re always on their phone" → "They\'re dealing with stress in their way." The reframe isn\'t denial — it\'s adding perspective.',
    why: 'Gottman\'s "negative sentiment override" means that when your default view of your partner is negative, even NEUTRAL behaviors get interpreted as hostile. This reframe exercise slowly shifts your filter. It\'s not about pretending everything is fine — it\'s about seeing the full picture instead of just the ugly part.',
    expert: 'gottman+robbins',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: 'any',
    stage: 'practice',
    duration: '2 min'
  },

  {
    id: 'positive-lens-character-compliment',
    text: 'Give your partner one compliment today about their CHARACTER, not their appearance or actions. Not "you look nice" or "thanks for doing the dishes" — but "I admire your resilience" or "Your kindness with [specific person] inspires me." Make it about WHO they are.',
    why: 'Chapman + Gottman: character compliments build a deeper foundation than surface praise. "You\'re pretty" fades; "I admire your integrity" endures. Character compliments say "I see the REAL you, and I like what I see." That\'s the kind of affirmation that builds lasting security.',
    expert: 'chapman+gottman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: ['words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt'],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '1 min'
  },

  {
    id: 'positive-lens-best-moment-recall',
    text: 'Before going to sleep tonight, replay the best moment with your partner from today. If you can\'t think of one, think of the most neutral moment and find something good in it — a shared laugh, a quiet moment, even just being in the same room. Write one sentence about it.',
    why: 'Robbins: "Where focus goes, energy flows." Your brain consolidates memories during sleep. If the last thing you think about is a positive partner moment, you\'re literally training your brain to file today under "good day with my partner." Over time, this reshapes your emotional history of the relationship.',
    expert: 'robbins+gottman',
    type: 'positive_lens',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '1 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL WEEK-SPECIFIC TECHNIQUES
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'week1-emotional-journal',
    text: 'Start an "emotional reaction journal" this week. Each time you feel a strong emotion about your partner (positive OR negative), write: Time, Trigger, Emotion, Body sensation, What I did, What I wish I\'d done. Don\'t judge — just observe and record.',
    why: 'Johnson + Brown: self-awareness is the foundation of all change. You can\'t change what you can\'t see. This journal creates a data set of YOUR patterns. After 7 days, you\'ll see themes — specific triggers, default reactions, recurring body signals. This data is pure gold for weeks 2-6.',
    expert: 'johnson+brown',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: [1],
    stage: 'assess',
    duration: '2 min per entry'
  },

  {
    id: 'week1-attachment-style-reflection',
    text: 'Based on your assessment results, write a letter to yourself about your attachment style: "I have a [style] attachment style, which means I tend to [specific behaviors]. I developed this because [childhood/past context]. When my attachment system activates, I [specific reaction]. The person I want to become handles this by [desired response]."',
    why: 'Levine: naming your attachment style isn\'t a label — it\'s liberation. When you understand WHY you do what you do, you stop feeling broken and start feeling informed. This letter connects the dots between your past and your present, creating the self-compassion needed for change.',
    expert: 'levine',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: false
    },
    difficulty: 2,
    week: [1],
    stage: 'assess',
    duration: '15 min'
  },

  {
    id: 'week2-complaint-formula-practice',
    text: 'Write down 3 current grievances about your partner. Convert each one from criticism to complaint using the formula: "When [specific behavior happens], I feel [emotion], and what I need is [specific request]." Do NOT use "you always" or "you never." Practice each one out loud until it sounds natural, not rehearsed.',
    why: 'Gottman: 96% of conversations end the way they start. Mastering the complaint formula (vs. criticism) is THE communication upgrade that changes everything. It takes practice because your brain defaults to blame. Writing and rehearsing builds the neural pathway so it\'s available when emotions run hot.',
    expert: 'gottman',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism'],
      focusAreas: ['communication', 'conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2],
    stage: 'learn',
    duration: '10 min'
  },

  {
    id: 'week3-flooding-recognition',
    text: 'Learn your flooding signals. When heart rate spikes, face gets hot, jaw clenches, or you want to yell or run — that\'s flooding. Practice recognizing it by checking in 3 times today during stressful moments: "Am I flooded right now? What\'s my body telling me?" Rate your emotional intensity 1-10.',
    why: 'Gottman: at 100+ BPM, you literally cannot think clearly. Most people don\'t recognize flooding until they\'re already past the point of no return. Learning to catch it at a 6/10 instead of a 9/10 gives you the window to use your tools. The body signals ALWAYS come before the explosion.',
    expert: 'gottman',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [3],
    stage: 'practice',
    duration: '1 min per check'
  },

  {
    id: 'week4-pattern-map',
    text: 'Map your top 3 recurring arguments on paper. For each one: (1) What triggers it? (2) What does Person A say/do? (3) What does Person B say/do? (4) How does it escalate? (5) How does it end? (6) What does each person ACTUALLY need? Seeing the pattern on paper makes it easier to interrupt.',
    why: 'Johnson + Gottman: most couples have the same 3-5 arguments on repeat. They feel different each time but follow the exact same structure. Mapping the pattern externalizes it — turns "why do you always do this" into "there\'s our pattern again." The map IS the intervention.',
    expert: 'johnson+gottman',
    type: 'pattern_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [4],
    stage: 'learn',
    duration: '20 min'
  },

  {
    id: 'week5-connection-experiment',
    text: 'This week, try one NEW way of connecting that you\'ve never done before: cook together, take a walk without phones, read to each other, learn something together, create something together. After, discuss: "What surprised us? What felt different? Do we want to make this a regular thing?"',
    why: 'Perel + Gottman: novelty is the antidote to stagnation. When couples only do what they\'ve always done, the relationship runs on autopilot. New shared experiences release dopamine AND create fresh stories to tell. The goal isn\'t the activity — it\'s the aliveness that comes from doing something different TOGETHER.',
    expert: 'perel+gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning', 'friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [5],
    stage: 'practice',
    duration: '30-60 min'
  },

  {
    id: 'week6-relationship-mission-statement',
    text: 'Together, write your relationship mission statement. Answer: "What do we stand for? What kind of couple do we want to be? What values guide our decisions? What legacy do we want to create?" Distill it to 3 sentences. Post it somewhere you both see daily.',
    why: 'Gottman\'s Shared Meaning + Robbins\' Identity: couples with a shared narrative and purpose weather storms better because they have an anchor. When you know WHAT you stand for, individual decisions become easier. This isn\'t corporate — it\'s clarifying why you chose each other and what you\'re building.',
    expert: 'gottman+robbins',
    type: 'shared_meaning',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [6],
    stage: 'transform',
    duration: '20 min'
  },

  {
    id: 'week6-letter-to-past-self',
    text: 'Write a letter from today\'s you to 6-weeks-ago you. What did you learn? What changed? What surprised you? What habit stuck? What still needs work? Then write one paragraph about who you\'re BECOMING. Read it out loud to yourself. This is your new baseline.',
    why: 'Robbins: "Progress equals happiness." Seeing your own growth is deeply motivating and cements the identity shift. Most people don\'t take time to acknowledge how far they\'ve come. This letter creates a before/after snapshot that proves change is possible — because you already did it.',
    expert: 'robbins',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 2,
    week: [6],
    stage: 'transform',
    duration: '15 min'
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL TECHNIQUES — Rounding out to 100+
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'gottman-bid-detection-training',
    text: 'For the next 2 hours, actively watch for "bids for connection" from your partner. A bid can be: a comment about something they saw, a sigh, showing you something on their phone, a question that seems casual, a touch as they walk by. Each time you spot one, TURN TOWARD it — stop, make eye contact, engage for at least 30 seconds.',
    why: 'Gottman: bids are so small that most people miss them entirely. "Look at this dog video" isn\'t about the dog — it\'s "will you share a moment with me?" Masters of relationships catch 86% of bids. Disasters catch 33%. The difference between staying together and divorce is literally in these micro-moments.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time'],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3],
    stage: 'practice',
    duration: '2 hours active awareness'
  },

  {
    id: 'voss-late-night-fm-dj',
    text: 'Practice the "late night FM DJ voice" in your next tense conversation. Slow down. Drop your voice to a lower pitch. Speak at 70% of your normal speed. Keep your tone warm and calm. Even if the words are about something difficult, the voice signals safety.',
    why: 'Voss: "The late night FM DJ voice is the single most effective tool for calming a situation." Your tone communicates safety or threat before your words even register. A slow, warm, low voice deactivates the amygdala. FBI negotiators are trained to use this voice before anything else.',
    expert: 'voss',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: ['pursuer'],
      horsemen: ['criticism', 'contempt'],
      focusAreas: ['conflict', 'communication'],
      anyProfile: true
    },
    difficulty: 2,
    week: [2, 3, 4],
    stage: 'practice',
    duration: 'ongoing'
  },

  {
    id: 'robbins-triad-change',
    text: 'When you notice yourself in a negative state about your relationship, change all 3 elements of the "triad" simultaneously: (1) PHYSIOLOGY — stand up, change your posture, move. (2) FOCUS — ask "What am I grateful for about my partner right now?" (3) LANGUAGE — replace "I have to deal with this" with "I get to work on this with someone I love." Do all 3 in 30 seconds.',
    why: 'Robbins: your emotional state is created by 3 things — how you use your body, what you focus on, and the language you use. Change all 3 and your state MUST change. It\'s not positive thinking — it\'s neurological override. You can\'t feel depressed in a powerful posture while focusing on gratitude.',
    expert: 'robbins',
    type: 'state_management',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [3, 4],
    stage: 'practice',
    duration: '30 sec'
  },

  {
    id: 'johnson-reach-underneath',
    text: 'Next time your partner snaps at you, instead of reacting to the shrapnel, say: "I can see you\'re upset. I don\'t think this is really about [surface topic]. What\'s happening underneath? I want to understand the real thing." Then wait. Don\'t fill the silence.',
    why: 'Johnson (EFT): reactive emotions are like the tip of the iceberg. Anger, sarcasm, and criticism are secondary emotions covering primary ones — fear, loneliness, shame. When you reach past the surface, you access the real person. This is the move that turns fights into connection.',
    expert: 'johnson',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['secure'],
      cyclePositions: ['withdrawer'],
      horsemen: ['defensiveness'],
      focusAreas: ['conflict', 'communication'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5],
    stage: 'practice',
    duration: '5 min'
  },

  {
    id: 'tatkin-no-thirds',
    text: 'This week, commit to "no thirds" in conflict: no bringing up past arguments, no invoking other people\'s opinions ("My mom thinks so too"), no comparing to exes, no using kids as leverage. Keep the conversation between the two of you, about THIS issue, in THIS moment.',
    why: 'Tatkin: "thirds" are anything brought into a conflict that isn\'t the two of you and the present issue. They dilute the conversation, trigger defensiveness, and prevent resolution. Secure-functioning couples keep the arena small: you, me, now, this. Everything else is a distraction.',
    expert: 'tatkin',
    type: 'communication',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['contempt', 'criticism'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 3,
    week: [3, 4, 5],
    stage: 'practice',
    duration: 'ongoing'
  },

  {
    id: 'perel-what-do-you-miss',
    text: 'Ask yourself: "What part of myself have I given up since being in this relationship?" Not because your partner demanded it — but because you slowly stopped tending to it. A hobby, a friendship, a dream, a part of your personality. Write it down. Make a plan to reclaim ONE piece of it this week.',
    why: 'Perel: "Many people leave relationships not because they want someone else, but because they want to find themselves again." The slow erosion of individual identity is the silent killer. Reclaiming a piece of yourself isn\'t selfish — it\'s essential for desire and respect to survive.',
    expert: 'perel',
    type: 'identity',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious'],
      cyclePositions: ['pursuer'],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'transform',
    duration: '15 min reflection + action'
  },

  {
    id: 'levine-secure-base-script',
    text: 'Memorize this secure-base script for when your partner is distressed: "I\'m here. I\'m not going anywhere. You don\'t have to handle this alone. Tell me what you need and I\'ll do my best." Say it with calm conviction. Mean it. Even if you can\'t fix the problem, your presence IS the solution.',
    why: 'Levine: in attachment theory, the "secure base" is the person you can return to when the world is overwhelming. When your partner hears "I\'m here, I\'m not going anywhere," their nervous system downregulates. You don\'t have to solve anything — your steady presence IS the regulation.',
    expert: 'levine',
    type: 'attachment',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['secure', 'avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: [],
      focusAreas: ['attachment'],
      anyProfile: true
    },
    difficulty: 2,
    week: [3, 4, 5],
    stage: 'practice',
    duration: '1 min'
  },

  {
    id: 'brown-permission-slip',
    text: 'Write yourself a "permission slip" today. On a piece of paper, write: "Today I give myself permission to [be imperfect / ask for what I need / say no without guilt / feel my feelings without judging them]." Carry it in your pocket. Look at it once during the day.',
    why: 'Brown: most people hold themselves to impossible standards in relationships — perfect patience, perfect words, perfect love. Permission slips are a Brené Brown research-backed tool for self-compassion. They don\'t lower the bar — they remove the shame that prevents real effort.',
    expert: 'brown',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'fearful_avoidant'],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: [1, 2],
    stage: 'learn',
    duration: '2 min'
  },

  {
    id: 'gottman-repair-checklist',
    text: 'With your partner, create a "repair attempt menu" — a list of 5 things either of you can say/do mid-conflict to de-escalate: (1) "Can we start over?" (2) "I\'m getting defensive, let me try again." (3) A silly code word that means "timeout." (4) Physical reach — extend your hand. (5) "I love you even when this is hard." Post the list on your fridge.',
    why: 'Gottman: happy couples aren\'t better at avoiding fights — they\'re better at REPAIRING during them. Having a pre-made list removes the cognitive burden of inventing repairs in the heat of the moment. When you\'re flooded, you can\'t think — but you CAN read a list.',
    expert: 'gottman',
    type: 'emotional_regulation',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: ['criticism', 'contempt', 'defensiveness', 'stonewalling'],
      focusAreas: ['conflict'],
      anyProfile: true
    },
    difficulty: 2,
    week: [3, 4],
    stage: 'practice',
    duration: '10 min setup'
  },

  {
    id: 'finlayson-fife-own-your-desire',
    text: 'Instead of waiting for your partner to initiate emotional or physical intimacy, own it yourself today. Don\'t hint. Don\'t test. Directly say what you want: "I want to spend time with you tonight" or "I\'d love to be close to you right now." Own the wanting without making them responsible for filling it.',
    why: 'Finlayson-Fife: "People who own their desire are more attractive than people who demand to be desired." When you take ownership of what you want instead of waiting to be pursued, you shift from passive to active. That shift changes the entire energy of the relationship.',
    expert: 'finlayson-fife',
    type: 'desire',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['anxious', 'avoidant'],
      cyclePositions: ['pursuer', 'withdrawer'],
      horsemen: [],
      focusAreas: ['meaning'],
      anyProfile: true
    },
    difficulty: 3,
    week: [5, 6],
    stage: 'transform',
    duration: '1 min'
  },

  {
    id: 'super-weekly-review',
    text: 'Sunday evening, do a 10-minute weekly relationship review: (1) Rate your week 1-10. (2) What went well? Name 2 specific moments. (3) What was hard? Name 1 without blame. (4) What do you want more of next week? (5) One thing you appreciate about your partner from this week. Share with your partner or journal it solo.',
    why: 'Gottman (rituals of connection) + Robbins (review = growth): unreviewed weeks blur together into vague dissatisfaction. A 10-minute review turns vague feelings into specific data. It celebrates wins (maintaining 5:1), identifies patterns (always fight on Wednesdays?), and sets intention for the next week.',
    expert: 'gottman+robbins',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: [],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '10 min'
  },

  {
    id: 'johnson-safe-haven-check',
    text: 'Ask yourself honestly: "Does my partner feel emotionally safe with me?" Think of the last 3 times they were upset — did you move toward them or away? Did you listen or fix? Did you validate or minimize? Write one specific thing you can do to be a safer landing place.',
    why: 'Johnson: being a "safe haven" means your partner can bring their worst moments to you without fear of judgment, dismissal, or punishment. Most people THINK they\'re safe but unconsciously punish vulnerability — changing the subject, getting annoyed, one-upping their pain. Honest self-assessment is the first step.',
    expert: 'johnson',
    type: 'self_awareness',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling', 'defensiveness'],
      focusAreas: ['attachment'],
      anyProfile: true
    },
    difficulty: 3,
    week: [2, 3],
    stage: 'learn',
    duration: '5 min'
  },

  {
    id: 'belfort-peak-state-relationship',
    text: 'Before seeing your partner today, spend 60 seconds getting into "peak state": jump up and down 10 times, smile wide (even if forced — your brain can\'t tell the difference), and think of 3 reasons you\'re lucky to have them. Then walk through the door. Notice how they respond to THIS version of you vs. the tired, distracted version.',
    why: 'Belfort + Robbins: the version of you that walks through the door sets the emotional tone for the entire evening. Most people bring their worst self home — exhausted, drained, irritable. 60 seconds of intentional state change means your partner gets your BEST, not your leftovers.',
    expert: 'belfort+robbins',
    type: 'state_management',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['friendship'],
      anyProfile: true
    },
    difficulty: 1,
    week: 'any',
    stage: 'practice',
    duration: '60 sec'
  },

  {
    id: 'gottman-dreams-interview',
    text: 'Ask your partner: "What\'s something you dream about for your life that you haven\'t told me — or haven\'t told me in a while?" Listen without analyzing feasibility. Don\'t say "but how would we afford that?" Just say "Tell me more." Your job is to be their biggest fan, not their financial advisor.',
    why: 'Gottman: gridlocked conflicts often hide unfulfilled dreams. When partners feel their dreams are heard and honored (not necessarily fulfilled, just HEARD), 65% of gridlocked problems become solvable. The dream doesn\'t have to be practical. It has to be respected.',
    expert: 'gottman',
    type: 'connection_ritual',
    targetProfiles: {
      loveLanguages: ['quality_time', 'words_of_affirmation'],
      attachmentStyles: [],
      cyclePositions: [],
      horsemen: [],
      focusAreas: ['meaning', 'friendship'],
      anyProfile: true
    },
    difficulty: 2,
    week: [5, 6],
    stage: 'practice',
    duration: '15 min'
  },

  {
    id: 'brown-courage-over-comfort',
    text: 'Today, choose courage over comfort ONE time with your partner. Say the thing you\'ve been holding back. Ask for what you need. Apologize for something you\'ve been avoiding. Share a fear. It doesn\'t have to be huge — it has to be honest. Preface with: "This is hard for me to say, but I care about us enough to say it."',
    why: 'Brown: "You can choose courage or you can choose comfort, but you cannot choose both." Every relationship has a growing edge — the place where the next level of intimacy lives behind a door marked "uncomfortable." This exercise takes you through that door, one honest sentence at a time.',
    expert: 'brown',
    type: 'vulnerability',
    targetProfiles: {
      loveLanguages: [],
      attachmentStyles: ['avoidant', 'fearful_avoidant'],
      cyclePositions: ['withdrawer'],
      horsemen: ['stonewalling'],
      focusAreas: ['communication', 'attachment'],
      anyProfile: true
    },
    difficulty: 4,
    week: [4, 5, 6],
    stage: 'practice',
    duration: '5 min'
  }

];

module.exports = techniques;