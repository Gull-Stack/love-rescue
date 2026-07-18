/**
 * Conversation analysis for Real Talk Live Sessions.
 *
 * Detects rhetorical fallacies, manipulative tactics, and Gottman "horsemen"
 * in a single spoken/typed utterance. Pure pattern logic — no external AI —
 * so it runs instantly per utterance and behaves deterministically.
 *
 * This is a mirror, not a judge: every flag carries an explanation and a
 * kinder reframe. Abuse/violence language is NOT a "flag" — it short-circuits
 * into the same safety response Real Talk uses (see containsAbuseKeywords).
 */

// Violence/abuse language triggers a safety response instead of coaching.
// Shared with routes/real-talk.js — single source of truth.
const ABUSE_KEYWORDS = [
  'hit', 'punch', 'slap', 'choke', 'force', 'threaten',
  'assault', 'rape', 'abuse', 'strangle', 'shove', 'kick',
];

function containsAbuseKeywords(text) {
  const lower = String(text || '').toLowerCase();
  return ABUSE_KEYWORDS.some(keyword => {
    // Match common verb forms, including e-drop ("shove" → "shoving").
    const base = keyword.replace(/e$/, '');
    const regex = new RegExp(`\\b${base}(?:e|es|ed|es|ing|s|d)?\\b`, 'i');
    return regex.test(lower);
  });
}

/**
 * Pattern library. Categories:
 *  - fallacy: reasoning errors that derail the argument itself
 *  - manipulation: tactics that pressure or destabilize the other person
 *  - horseman: Gottman's four horsemen (criticism, contempt, defensiveness, stonewalling)
 *
 * Each pattern may carry `suppress`: regexes tested against the WHOLE
 * utterance that veto a match (e.g. a factual "that never happened before the
 * renovation" is not reality-denial). A global reported-speech guard also
 * vetoes any match that is quoting someone else ("the kids said you never…").
 */
const CONVERSATION_PATTERNS = [
  // ── Fallacies ──────────────────────────────────────────────────────────
  {
    id: 'overgeneralization',
    category: 'fallacy',
    label: 'Overgeneralization',
    explanation: '"Always" and "never" turn one behavior into a character verdict — and invite the other person to hunt for the one exception instead of hearing you.',
    reframe: 'Name the specific time it happened: "Last night when…"',
    patterns: [
      /\byou (?:always|never)\b/i,
      /\bevery (?:single )?time\b/i,
      /\bnot (?:even )?once\b/i,
      /\bname (?:me )?one (?:single )?time\b/i,
      /\bjust one time\. ?$/i,
    ],
    // Positive "always/never" is a compliment, not a verdict.
    suppress: [
      /\byou (?:always|never) [^.!?]{0,40}\b(?:know how|make me (?:laugh|smile|happy)|the best|amazing|love|great|cheer)\b/i,
      /\bi never want\b/i,
    ],
  },
  {
    id: 'ad_hominem',
    category: 'fallacy',
    label: 'Character attack (ad hominem)',
    explanation: 'Attacking who they are instead of what happened moves the fight from the problem to the person.',
    reframe: 'Describe the behavior and its impact: "When X happened, I felt Y."',
    patterns: [
      /\byou(?:'re| are) (?:so |such an? )?(?:selfish|lazy|stupid|worthless|pathetic|terrible|horrible|useless|disgusting|crazy|a liar|an idiot)\b/i,
      /\bjust like your (?:mother|father|mom|dad)\b/i,
    ],
  },
  {
    id: 'whataboutism',
    category: 'fallacy',
    label: 'Whataboutism',
    explanation: 'Countering a complaint with their past mistakes dodges the issue on the table. Both things can be true — but only one is being discussed right now.',
    reframe: 'Finish this topic first: "I hear you. Can we resolve this one, then talk about that?"',
    patterns: [/\b(?:well,? )?what about (?:you|when you|that time)\b/i, /\byou(?:'re| are) one to talk\b/i, /\byou do (?:it|the same|that) too\b/i],
  },
  {
    id: 'false_dilemma',
    category: 'fallacy',
    label: 'False dilemma / conditional love',
    explanation: '"If you loved me you would…" frames a preference as a loyalty test with only two outcomes. Most disagreements have more than two options.',
    reframe: 'Ask for what you want directly: "It would mean a lot to me if…"',
    patterns: [/\bif you (?:really )?loved me\b/i, /\bif you cared\b/i, /\beither .{3,40} or (?:else|i)\b/i],
  },
  {
    id: 'mind_reading',
    category: 'fallacy',
    label: 'Mind-reading',
    explanation: 'Asserting their motive ("you did that on purpose", "you don\'t care") states your fear as their fact. It usually triggers defense, not insight.',
    reframe: 'Share the story you\'re telling yourself: "The story in my head is that… is that right?"',
    patterns: [/\byou did (?:that|it) on purpose\b/i, /\byou don'?t (?:even )?care\b/i, /\byou (?:meant|wanted) to hurt\b/i, /\bi know (?:exactly )?what you(?:'re| are) thinking\b/i],
  },
  {
    id: 'catastrophizing',
    category: 'fallacy',
    label: 'Catastrophizing',
    explanation: 'Jumping from one incident to "this relationship is doomed" floods both nervous systems and makes repair feel pointless.',
    reframe: 'Right-size it: "This moment is hard" is different from "everything is ruined."',
    patterns: [/\bthis (?:marriage|relationship) is (?:over|doomed|dead)\b/i, /\beverything is ruined\b/i, /\bwhat'?s the point of (?:us|this|anything)\b/i],
  },
  {
    id: 'appeal_to_crowd',
    category: 'fallacy',
    label: 'Appeal to the crowd',
    explanation: '"Everyone agrees with me" recruits an invisible jury. Even if true, the disagreement is between the two of you — outside votes don\'t resolve it, they gang up.',
    reframe: 'Speak for yourself: "I think…" carries more weight than a crowd that isn\'t in the room.',
    patterns: [
      /\beveryone (?:agrees|thinks|knows|says|can see)\b/i,
      /\ball (?:my|our) friends (?:think|say|agree)\b/i,
      /\banybody (?:can see|would agree)\b/i,
    ],
  },

  // ── Manipulation tactics ───────────────────────────────────────────────
  {
    id: 'gaslighting',
    category: 'manipulation',
    label: 'Reality-denial (gaslighting language)',
    explanation: 'Telling someone their memory or feelings are wrong ("that never happened", "you\'re imagining it", "you\'re too sensitive") erodes their trust in their own perception.',
    reframe: 'You can disagree about facts without denying their experience: "I remember it differently — walk me through what you saw."',
    patterns: [
      /\bthat never happened\b/i,
      /\byou(?:'re| are) (?:just )?imagining (?:it|things)\b/i,
      /\byou(?:'re| are) (?:being )?(?:too |over)?sensitive\b/i,
      /\byou(?:'re| are) overreacting\b/i,
      /\byou(?:'re| are) (?:being )?(?:crazy|hysterical|paranoid|dramatic|ridiculous|absurd|irrational|impossible|insane)\b/i,
      /\bit(?:'s| is) all in your head\b/i,
      /\byou(?:'re| are) misremembering\b/i,
      /\byou remember (?:it|things) wrong\b/i,
      /\bthat(?:'s| is) not (?:what|how) (?:it |that )?happened\b/i,
      /\bi never said that\b/i,
    ],
    // Factual/temporal "that never happened before X" is a claim about events,
    // not about the other person's grip on reality.
    suppress: [/\bthat never happened (?:before|until|since|when|back|prior|last)\b/i],
  },
  {
    id: 'guilt_tripping',
    category: 'manipulation',
    label: 'Guilt-tripping',
    explanation: '"After everything I\'ve done for you" converts generosity into debt. Gifts with invoices attached breed resentment on both sides.',
    reframe: 'Ask for appreciation directly: "I\'m feeling unseen for what I contribute."',
    patterns: [
      /\bafter (?:everything|all) i(?:'ve| have)? (?:done|sacrificed|given)\b/i,
      /\byou owe me\b/i,
      /\bi gave up .{3,40} for you\b/i,
      /\bi sacrificed .{3,50}\b(?:and this is|for (?:you|us|this))\b/i,
      /\bthis is the thanks i get\b/i,
      /\bnobody (?:ever )?appreciates\b/i,
    ],
    // Self-directed exhaustion ("after everything I've done today, I'm beat")
    // is venting, not invoicing the partner.
    suppress: [/\bafter (?:everything|all) i(?:'ve| have)? (?:done|sacrificed|given) (?:today|this (?:week|month|morning)|at work|lately)\b/i],
  },
  {
    id: 'blame_shifting',
    category: 'manipulation',
    label: 'Blame-shifting',
    explanation: '"You made me do it" hands your choices to the other person. Their behavior may be a trigger; your response is still yours.',
    reframe: 'Own your side: "When X happened, I chose badly. Here\'s what I\'ll do differently."',
    patterns: [/\byou (?:made|forced) me (?:do|say|act)\b/i, /\bthis is (?:all )?your fault\b/i, /\bif you hadn'?t .{3,40} i wouldn'?t have\b/i],
  },
  {
    id: 'darvo',
    category: 'manipulation',
    label: 'Victim-reversal (DARVO)',
    explanation: 'Deny, Attack, Reverse Victim and Offender: the person raising a hurt suddenly finds themselves accused. The original issue vanishes.',
    reframe: 'Both hurts can be heard — in turn: "Let\'s finish what you raised, then I want to share mine."',
    patterns: [
      /\bi'?m the (?:real )?victim\b/i,
      /\bnow (?:i'?m|you(?:'ve| have) made me) the bad guy\b/i,
      /\bhow dare you accuse me\b/i,
      /\bi(?:'m| am) (?:always|just) the (?:bad guy|villain|problem)\b/i,
      /\bi guess i(?:'m| am) (?:just )?the (?:bad guy|villain|problem)\b/i,
      /\bthe villain in your story\b/i,
    ],
  },
  {
    id: 'threat_ultimatum',
    category: 'manipulation',
    label: 'Threat / ultimatum',
    explanation: 'Threatening the relationship ("or I\'m leaving") wins compliance through fear, not agreement — and each use devalues the threat and the trust.',
    reframe: 'State the stakes without the trigger: "This pattern is serious for me. I need us to work on it."',
    patterns: [
      /\bor i'?m (?:leaving|gone|done|out)\b/i,
      /\bi(?:'ll| will) take the kids\b/i,
      /\byou(?:'ll| will) regret (?:this|it)\b/i,
      /\bi want a divorce\b/i,
      /\bkeep (?:this|that|it) up and (?:see|watch|you'?ll)\b/i,
      /\b(?:and |then )?see what happens\b/i,
      /\byou(?:'ll| will) be sorry\b/i,
      /\bdon'?t push me\b/i,
    ],
  },
  {
    id: 'triangulation',
    category: 'manipulation',
    label: 'Triangulation',
    explanation: 'Recruiting a third person as evidence against your partner ("your sister was right about you") turns a two-person disagreement into an ambush.',
    reframe: 'Keep it between you: "Here\'s what I\'m seeing…" — other people\'s verdicts don\'t belong in the room.',
    patterns: [
      /\b(?:was|is|were) right about you\b/i,
      /\bwarned me about you\b/i,
      /\beven (?:your|the) (?:mother|mom|dad|father|sister|brother|kids|family|friends) (?:thinks?|says?|agrees?|sees? it)\b/i,
    ],
  },

  // ── Gottman horsemen ───────────────────────────────────────────────────
  {
    id: 'contempt',
    category: 'horseman',
    label: 'Contempt',
    explanation: 'Mockery, sarcasm, and name-calling signal disgust — the single strongest predictor of relationship breakdown in Gottman\'s research.',
    reframe: 'Find the wish under the sneer and say that instead: "I want to be able to rely on you for…"',
    patterns: [
      /\b(?:oh,? )?(?:great|nice|perfect),? (?:saint|mr|mrs|miss)\b/i,
      /\bwhatever you say\b/i,
      /\byou call (?:that|yourself)\b/i,
      /\bpathetic\b/i,
      /\bgrow up\b/i,
      /\bmust be nice\b/i,
      /\bwhatever helps you sleep\b/i,
      /\bmust be (?:so )?(?:hard|exhausting) being (?:so )?perfect\b/i,
      /\bwow,? [^.!?]{0,40}\bperfect\b/i,
    ],
  },
  {
    id: 'defensiveness',
    category: 'horseman',
    label: 'Defensiveness',
    explanation: 'Meeting a complaint with "it\'s not my fault" or an instant counter-complaint tells your partner their concern won\'t land.',
    reframe: 'Find your 2%: "You have a point about the part where I…"',
    patterns: [/\bit'?s not my fault\b/i, /\bi (?:did|do) nothing wrong\b/i, /\bwhy is (?:this|it) always (?:on|about) me\b/i],
  },
  {
    id: 'stonewalling',
    category: 'horseman',
    label: 'Stonewalling',
    explanation: 'Shutting the conversation down ("I\'m done talking") usually means flooding — a nervous system past its limit. A break helps; a wall doesn\'t.',
    reframe: 'Take a structured break with a return time: "I\'m flooded. Give me 30 minutes and I\'ll come back to this."',
    patterns: [
      /\bi'?m done talking\b/i,
      /\btalk to the (?:hand|wall)\b/i,
      /\bconversation(?:'s| is) over\b/i,
      /\bi (?:have|'?ve got) nothing (?:more |else )?to say\b/i,
    ],
    // "Done talking to customer service" — the wall is aimed elsewhere.
    suppress: [/\bdone talking (?:to|with) (?!you\b)/i],
  },
];

// Reported speech: a match immediately downstream of "she said…", "the kids
// told me…", "he texted…" is quoting someone else, not saying it.
const REPORTED_SPEECH = /\b(?:said|says|saying|told (?:me|us|him|her|them)|texted|wrote|heard(?: that)?|claims?|claimed)\b[^.!?]{0,45}$/i;

function isReportedSpeech(input, matchIndex) {
  const before = input.slice(Math.max(0, matchIndex - 60), matchIndex);
  return REPORTED_SPEECH.test(before);
}

/**
 * Analyze a single utterance.
 * @param {string} text
 * @returns {Array<{id, category, label, explanation, reframe, match}>} flags
 */
function analyzeUtterance(text) {
  const flags = [];
  const input = String(text || '');
  if (!input.trim()) return flags;

  for (const pattern of CONVERSATION_PATTERNS) {
    if (pattern.suppress && pattern.suppress.some((s) => s.test(input))) continue;
    for (const regex of pattern.patterns) {
      const match = input.match(regex);
      if (match) {
        if (isReportedSpeech(input, match.index)) break; // quoting, not saying
        flags.push({
          id: pattern.id,
          category: pattern.category,
          label: pattern.label,
          explanation: pattern.explanation,
          reframe: pattern.reframe,
          match: match[0],
        });
        break; // one flag per pattern id per utterance
      }
    }
  }
  return flags;
}

module.exports = {
  ABUSE_KEYWORDS,
  containsAbuseKeywords,
  CONVERSATION_PATTERNS,
  analyzeUtterance,
};
