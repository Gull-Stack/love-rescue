/**
 * Cross-Assessment Insights Engine
 * 
 * The competitive moat of LoveRescue. Generates personalized insights
 * by connecting results ACROSS multiple assessments. No other app does this.
 * 
 * Philosophy: Mirror, not weapon. Every insight points back at the individual.
 * 
 * Created by: Steve Rogers, CEO
 * Expert sources: Gottman, Johnson, Brown, Perel, Voss, Robbins, Chapman, Levine
 */

/**
 * Generate cross-assessment insights from all available assessment results
 * @param {Object} assessments - { type: scoredResult } for all completed assessments
 * @returns {Array<Object>} Array of insight objects
 */
function generateCrossInsights(assessments) {
  const insights = [];

  // ═══════════════════════════════════════════════════════════
  // ATTACHMENT + LOVE LANGUAGE
  // ═══════════════════════════════════════════════════════════
  if (assessments.attachment && assessments.love_language) {
    const att = assessments.attachment;
    const ll = assessments.love_language;
    const primary = ll.primary || ll.rankings?.[0]?.language;

    if (att.style === 'anxious' && primary === 'words_of_affirmation') {
      insights.push({
        id: 'att_anxious_ll_words',
        title: 'Your Reassurance Pattern',
        expert: 'Levine + Chapman',
        severity: 'high',
        insight: 'Your anxious attachment style combined with Words of Affirmation as your primary love language means verbal reassurance is your lifeline. When your partner goes quiet, your anxiety doesn\'t just notice — it SCREAMS. You\'re not "needy." Your nervous system is wired to seek verbal confirmation of safety.',
        action: 'Instead of escalating bids for reassurance, try saying directly: "I\'m feeling anxious right now. A simple \'I love you\' would really help me." Direct requests work better than protest behaviors.',
        framework: 'Levine identifies this as "hyperactivation of the attachment system." Chapman shows that your love language amplifies the need. Together, they explain why silence feels like abandonment.',
      });
    }

    if (att.style === 'avoidant' && primary === 'acts_of_service') {
      insights.push({
        id: 'att_avoidant_ll_acts',
        title: 'Love Through Doing (Not Feeling)',
        expert: 'Levine + Chapman',
        severity: 'moderate',
        insight: 'Your avoidant attachment style combined with Acts of Service as your love language creates a specific pattern: you show love through DOING — fixing things, helping, providing — because it lets you express care without emotional vulnerability. Your partner may feel served but not emotionally connected.',
        action: 'This week, pair one act of service with one vulnerable statement: "I fixed the sink AND I want you to know I was thinking about you all day." The action + the words together bridges the gap.',
        framework: 'Levine calls this a "deactivating strategy." Chapman shows that your love language is the vehicle. The insight: you\'re not cold — you\'re expressing love in the safest way you know.',
      });
    }

    if (att.style === 'avoidant' && primary === 'physical_touch') {
      insights.push({
        id: 'att_avoidant_ll_touch',
        title: 'The Touch Paradox',
        expert: 'Levine + Chapman + Gottman',
        severity: 'moderate',
        insight: 'You value physical closeness (Physical Touch is your language) but your avoidant attachment makes emotional closeness feel threatening. This creates a paradox: you crave touch but may pull away when it leads to deeper emotional intimacy.',
        action: 'Practice non-sexual touch without it "leading anywhere." A 20-second hug, holding hands during a movie. Train your nervous system that physical closeness doesn\'t always mean emotional demand.',
        framework: 'Gottman\'s research: 96% of non-cuddlers reported poor sex lives. Your avoidant system may be blocking the very thing your love language needs.',
      });
    }

    if (att.style === 'anxious' && primary === 'quality_time') {
      insights.push({
        id: 'att_anxious_ll_quality',
        title: 'Your Presence Hunger',
        expert: 'Levine + Chapman + Johnson',
        severity: 'moderate',
        insight: 'Your anxious attachment combined with Quality Time as your love language means your partner\'s distraction feels like abandonment. When they\'re on their phone during dinner, your nervous system reads it as rejection — not just inattention.',
        action: 'Create a ritual: 20 minutes of phone-free time together each evening. Frame it as something you BOTH benefit from, not a demand. "I feel so much more connected when it\'s just us."',
        framework: 'Johnson: "Are you there for me?" is the core question. For you, "there" literally means present, focused, and undistracted.',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ATTACHMENT + HUMAN NEEDS
  // ═══════════════════════════════════════════════════════════
  if (assessments.attachment && assessments.human_needs) {
    const att = assessments.attachment;
    const hn = assessments.human_needs;
    const topNeed = hn.rankings?.[0]?.need || hn.topNeed;

    if (att.style === 'anxious' && topNeed === 'certainty') {
      insights.push({
        id: 'att_anxious_hn_certainty',
        title: 'The Double Lock',
        expert: 'Levine + Robbins',
        severity: 'high',
        insight: 'Your anxious attachment AND your top human need being Certainty create a double lock: you need to know the relationship is safe, AND you need to know what\'s coming next. Surprise plans your partner makes with good intentions may trigger anxiety instead of joy.',
        action: 'Build internal certainty: each morning, write one sentence about what YOU can control today. The goal is to shift certainty from "my partner proves it" to "I trust myself to handle whatever comes."',
        framework: 'Robbins: "True certainty comes from within." Levine: anxious attachment outsources security to the partner. Both point to the same solution: build the safety inside.',
      });
    }

    if (att.style === 'avoidant' && topNeed === 'significance') {
      insights.push({
        id: 'att_avoidant_hn_significance',
        title: 'The Intellectual Armor',
        expert: 'Levine + Robbins + Brown',
        severity: 'moderate',
        insight: 'Your avoidant attachment combined with Significance as your top need may manifest as intellectual superiority in arguments. You maintain emotional distance through being "right" — which meets your significance need while protecting you from vulnerability.',
        action: 'Next disagreement, try this: before making your point, summarize your partner\'s position so well they say "That\'s right." Voss proves this builds MORE influence than winning the argument.',
        framework: 'Brown: contempt (the worst of Gottman\'s Four Horsemen) is often significance-seeking armor over shame. If you need to feel smarter than your partner, ask yourself what you\'re protecting.',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SHAME + GOTTMAN
  // ═══════════════════════════════════════════════════════════
  if (assessments.shame_vulnerability && assessments.gottman_checkup) {
    const sv = assessments.shame_vulnerability;
    const gc = assessments.gottman_checkup;

    if (sv.shameTriggers > 60 && gc.conflict && gc.conflict < 40) {
      insights.push({
        id: 'shame_high_conflict_low',
        title: 'Shame Is Driving Your Conflict Pattern',
        expert: 'Brown + Gottman',
        severity: 'high',
        insight: 'Your high shame triggers combined with low conflict scores reveal something important: you\'re not bad at conflict — you\'re terrified that conflict will expose your unworthiness. Defensiveness, stonewalling, or people-pleasing during arguments aren\'t communication failures. They\'re shame responses.',
        action: 'Before your next disagreement, tell your partner: "When we fight, sometimes I feel like I\'m not good enough — not just wrong about the issue, but wrong as a person. I\'m working on separating those." This is the most vulnerable and most powerful thing you can say.',
        framework: 'Brown: "Shame says \'I am bad.\' Guilt says \'I did something bad.\'" Gottman: defensiveness is one of the Four Horsemen. The connection: your defensiveness IS your shame response.',
      });
    }

    if (sv.primaryArmor === 'blame' && gc.conflict && gc.conflict < 50) {
      insights.push({
        id: 'armor_blame_conflict',
        title: 'Your Blame Pattern',
        expert: 'Brown + Gottman + Voss',
        severity: 'moderate',
        insight: 'Your primary armor pattern is blame, and your conflict scores reflect it. Brown found that blame is the discharge of discomfort — it feels powerful for 15 seconds but solves nothing. Gottman found that criticism (blame\'s cousin) predicts relationship failure.',
        action: 'Replace "Whose fault is this?" with "What am I feeling right now?" The shift from blame to self-awareness is the single most important habit change you can make.',
        framework: 'Brown: blame has an inverse relationship with accountability. Voss: labeling your OWN emotion ("I\'m feeling frustrated") is more powerful than naming someone else\'s fault.',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DESIRE + ATTACHMENT
  // ═══════════════════════════════════════════════════════════
  if (assessments.desire_aliveness && assessments.attachment) {
    const da = assessments.desire_aliveness;
    const att = assessments.attachment;

    if (da.relationshipState === 'flatline' && att.style === 'secure') {
      insights.push({
        id: 'desire_flatline_secure',
        title: 'Safe But Asleep',
        expert: 'Perel + Levine',
        severity: 'moderate',
        insight: 'You have a secure attachment — which is wonderful — but your relationship has flatlined. Perel\'s research shows this is common: you\'ve built such a safe harbor that there\'s no wind in the sails. Security without adventure leads to "roommate syndrome."',
        action: 'This week, do ONE thing your partner wouldn\'t expect. Break a pattern. Perel: "Whatever is going to just happen in a long-term relationship, already has. Committed passion is premeditated."',
        framework: 'Perel: "Fire needs air." Your secure attachment gives you the safest possible base to take erotic risks FROM. Use your security as a launchpad, not a resting place.',
      });
    }

    if (da.identityMergeRisk && att.style === 'anxious') {
      insights.push({
        id: 'desire_merged_anxious',
        title: 'You\'ve Disappeared Into the Relationship',
        expert: 'Perel + Levine + Finlayson-Fife',
        severity: 'high',
        insight: 'Your anxious attachment has led you to merge your identity with your partner\'s. Perel found that desire requires a SELF — someone to desire and be desired. When you lose yourself in the relationship, there\'s no one left to want.',
        action: 'Reclaim one thing this week that is entirely YOURS. A hobby. A friend. A goal. Not as rebellion — as an act of self-creation that ultimately serves your relationship.',
        framework: 'Perel: "The secret to desire is not to seek it in the other person, but to cultivate it in yourself." Finlayson-Fife: differentiation means holding your own position while staying emotionally present.',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TACTICAL EMPATHY + CONFLICT STYLE
  // ═══════════════════════════════════════════════════════════
  if (assessments.tactical_empathy && assessments.conflict_style) {
    const te = assessments.tactical_empathy;
    const cs = assessments.conflict_style;
    const primaryStyle = cs.primaryStyle || cs.style;

    if (te.empathyAccuracy < 40 && primaryStyle === 'competing') {
      insights.push({
        id: 'te_low_empathy_competing',
        title: 'Winning Arguments, Losing Connection',
        expert: 'Voss + Gottman',
        severity: 'high',
        insight: 'Your low empathy accuracy combined with a competing conflict style means you\'re optimized for winning arguments — and terrible at making your partner feel heard. Voss found that "the only way to be powerful in a negotiation is to accept influence." Gottman found the same in marriage.',
        action: 'In your next disagreement, your ONLY job is to get your partner to say "That\'s right." Summarize their position. Label their emotion. Don\'t make your point until they feel fully understood. This will feel like losing. It\'s actually winning.',
        framework: 'Gottman: accepting influence is the strongest predictor of relationship success. Voss: "That\'s right" creates a chemical change — epiphany + empathy simultaneously.',
      });
    }

    if (te.listeningQuality < 40 && primaryStyle === 'avoiding') {
      insights.push({
        id: 'te_low_listening_avoiding',
        title: 'The Silent Treatment Isn\'t Listening',
        expert: 'Voss + Johnson + Gottman',
        severity: 'moderate',
        insight: 'Your low listening quality combined with an avoiding conflict style means silence has become your default. But silence isn\'t peace — it\'s the absence of engagement. Johnson calls this "Freeze and Flee" — the most dangerous demon dialogue because neither partner is fighting FOR the relationship.',
        action: 'Practice one Voss mirror per day: when your partner says something, repeat their last 3 words with a questioning tone. That\'s it. You don\'t have to fix anything. Just mirror.',
        framework: 'Gottman: stonewalling (85% men) is the final horseman. Voss: mirroring is the simplest tool — repeat their words, and they feel heard. Johnson: the withdrawer\'s message is "I\'m afraid I\'ll make it worse" — name THAT.',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // EMOTIONAL INTELLIGENCE + SHAME
  // ═══════════════════════════════════════════════════════════
  if (assessments.emotional_intelligence && assessments.shame_vulnerability) {
    const ei = assessments.emotional_intelligence;
    const sv = assessments.shame_vulnerability;

    if (ei.selfAwareness && ei.selfAwareness > 70 && sv.vulnerabilityCapacity < 40) {
      insights.push({
        id: 'ei_aware_not_vulnerable',
        title: 'You See It But Can\'t Say It',
        expert: 'Brown + Goleman',
        severity: 'moderate',
        insight: 'You have high self-awareness but low vulnerability capacity. You KNOW what you\'re feeling — you just can\'t bring yourself to share it. This is the awareness-expression gap, and it\'s often driven by shame: "If I show them this, they\'ll think less of me."',
        action: 'Start small. Share one feeling per day that isn\'t anger or frustration. "I felt proud today." "I felt sad about something." Build the muscle of emotional disclosure in safe territory before bringing it into conflict.',
        framework: 'Brown: "Vulnerability is the birthplace of connection." Goleman: emotional intelligence without vulnerability is just emotional surveillance — you watch yourself but never let anyone in.',
      });
    }
  }

  return insights;
}


/**
 * Generate a prioritized action plan from cross-insights
 * @param {Array<Object>} insights - Output from generateCrossInsights
 * @returns {Object} Prioritized plan with immediate, weekly, and ongoing actions
 */
function generateActionPlan(insights) {
  const highSeverity = insights.filter(i => i.severity === 'high');
  const moderate = insights.filter(i => i.severity === 'moderate');

  return {
    immediate: highSeverity.map(i => ({
      title: i.title,
      action: i.action,
      expert: i.expert,
    })),
    weekly: moderate.slice(0, 3).map(i => ({
      title: i.title,
      action: i.action,
      expert: i.expert,
    })),
    totalInsights: insights.length,
    highPriority: highSeverity.length,
    summary: highSeverity.length > 0
      ? `We found ${highSeverity.length} high-priority pattern${highSeverity.length > 1 ? 's' : ''} that may be significantly impacting your relationship. Start here.`
      : moderate.length > 0
        ? `Your assessments reveal ${moderate.length} growth area${moderate.length > 1 ? 's' : ''} that can deepen your relationship. Here's your roadmap.`
        : 'Your assessment profile is strong. Keep doing what you\'re doing and watch for the growth edges below.',
  };
}


module.exports = {
  generateCrossInsights,
  generateActionPlan,
};
