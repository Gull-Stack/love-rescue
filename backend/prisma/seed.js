const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Week 1: "Your Communication Toolkit" — Chris Voss Core Skills
const week1Insights = [
  {
    week: 1, day: 1,
    baseText: "Tactical Empathy — the #1 relationship skill. Understanding your partner's perspective doesn't mean agreeing with it. It means demonstrating that you see their world. Former FBI hostage negotiator Chris Voss calls this 'tactical empathy' — and it works even better in love than in hostage situations. Today's task: In your next conversation with your partner, focus entirely on understanding their viewpoint before sharing yours. Use the phrase 'It seems like...' to show you get where they're coming from. Don't problem-solve. Just demonstrate understanding.",
    personalizationTags: { attachment: { anxious: "Your natural attunement to your partner's emotions is a superpower here. Channel it into understanding rather than worrying about what their feelings mean for you.", avoidant: "Tactical empathy gives you a structured way to connect — it's understanding, not merging. You keep your boundaries while showing you see them.", secure: "You likely already practice empathy naturally. Today, go deeper — try to articulate something your partner feels but hasn't said out loud." }, personality: { introvert: "You're naturally reflective, which makes empathy easier. Use your inner processing to craft a precise 'It seems like...' statement.", extrovert: "The challenge today is listening longer before responding. Let silence do the heavy lifting after your empathy statement.", feeling: "Trust your emotional radar — you probably already sense what they feel. Today, put it into words.", thinking: "Think of tactical empathy as a hypothesis about their emotional state. Test it with 'It seems like...' and observe the result." } }
  },
  {
    week: 1, day: 2,
    baseText: "Mirroring — the simplest technique that feels like magic. Repeat your partner's last 1-3 words with a slight upward inflection, then go silent for at least 4 seconds. That's it. This tiny technique signals 'I'm listening, tell me more' without inserting your own agenda. FBI negotiators use mirroring to get people talking — in relationships, it helps your partner feel truly heard and often reveals what they're really thinking. Today's task: Mirror your partner at least 3 times today. Repeat their last few words as a gentle question, then wait. Notice how much more they share when you simply reflect their words back.",
    personalizationTags: { attachment: { anxious: "Mirroring helps you stay present instead of jumping ahead to 'what does this mean for us?' Just reflect their words and breathe.", avoidant: "Mirroring is low-vulnerability, high-impact. You don't have to share your feelings — just echo theirs. It's a safe on-ramp to connection.", secure: "Use mirroring to go deeper than your usual good communication. You'll be surprised what surfaces." }, personality: { introvert: "Mirroring suits you perfectly — it's quiet, minimal, and powerful. Your comfort with silence is an asset here.", extrovert: "The hard part is the 4-second silence after mirroring. Resist the urge to fill it. Let them expand.", feeling: "Mirroring might feel mechanical at first. Trust the process — it creates space for real emotion to emerge.", thinking: "Think of mirroring as a data-gathering technique. Each mirror gives you more information about what your partner really means." } }
  },
  {
    week: 1, day: 3,
    baseText: "Labeling Emotions — name it to tame it. When you label someone's emotion ('It seems like you're frustrated' or 'It sounds like that really hurt'), something powerful happens in their brain: amygdala activity actually decreases. The emotional intensity drops. They feel seen. The key rules: Always start with 'It seems like...' or 'It sounds like...' — never start with 'I' (that makes it about you). And after you label, pause. Let the label land. Today's task: Label 3 emotions you observe in your partner today. Use the formula: 'It seems like you're feeling [emotion].' Then pause and let them respond. Don't fix, don't advise — just label and listen.",
    personalizationTags: { attachment: { anxious: "Labeling helps you channel your emotional awareness productively. Instead of reacting to their emotions, you name them — which calms both of you.", avoidant: "Labeling gives you a concrete tool when emotions feel overwhelming. You don't have to feel the emotion — just accurately name what you observe.", secure: "You're probably already good at reading emotions. Labeling takes it further by making your understanding explicit." }, personality: { introvert: "You're likely observant enough to spot emotions easily. The challenge is speaking the label aloud — do it even if it feels awkward.", extrovert: "After you label, fight the urge to keep talking. The pause after a label is where the magic happens.", feeling: "Your emotional intelligence makes you a natural at this. Trust your reads and voice them.", thinking: "Think of labels as emotional diagnostics. You're identifying the feeling so it can be addressed, not ignored." } }
  },
  {
    week: 1, day: 4,
    baseText: "The Late Night FM DJ Voice — your secret de-escalation weapon. Chris Voss teaches that your tone of voice accounts for a huge portion of communication. The 'Late Night FM DJ Voice' is deep, slow, calm, and downward-inflecting. When you use it, something remarkable happens: your partner's mirror neurons fire, and they unconsciously match your calm. Their heart rate drops. The tension dissolves. It works because calm is contagious — but only if you go first. Today's task: Practice the FM DJ voice in at least one conversation today. Speak slower than feels natural. Drop your pitch slightly. Keep your tone warm and unhurried. Notice how the energy of the conversation shifts when you change nothing but your voice.",
    personalizationTags: { attachment: { anxious: "When anxiety spikes, your voice naturally speeds up and rises in pitch. The FM DJ voice is your reset button — it calms you as much as your partner.", avoidant: "The calm, measured tone of the FM DJ voice aligns with your natural reserve. Use it as a bridge — it's connecting without being overwhelming.", secure: "You may already have a calm presence. Today, be intentional about it — notice the precise moments your tone shifts the room." }, personality: { introvert: "Your natural speaking style may already lean calm and measured. Dial it up intentionally and notice the effect.", extrovert: "This is your growth edge today — slow down, lower your volume, and let your words carry more weight with less energy.", feeling: "The FM DJ voice isn't suppressing emotion — it's channeling it through a calm delivery. Your warmth will still come through.", thinking: "Think of this as a controlled experiment. Same words, different delivery. Observe how the variable of tone changes the outcome." } }
  },
  {
    week: 1, day: 5,
    baseText: "Calibrated Questions — replace 'why' with 'how' and 'what.' 'Why' questions make people defensive ('Why did you do that?' feels like an accusation). But 'How' and 'What' questions open doors: 'What made you decide to do that?' 'How can we solve this together?' These calibrated questions give your partner the illusion of control while guiding the conversation toward solutions. They eliminate accusation and invite collaboration. Today's task: For the entire day, replace every 'why' question with a 'how' or 'what' question. Instead of 'Why didn't you call?' try 'What happened with your day?' Instead of 'Why are you upset?' try 'What's going on for you right now?' Notice the difference in how your partner responds.",
    personalizationTags: { attachment: { anxious: "Calibrated questions help you get information without the panic-driven 'why' that can push partners away. 'What are you feeling?' beats 'Why won't you talk to me?'", avoidant: "Calibrated questions are emotionally safe — they're curious, not confrontational. They help you engage without feeling interrogated.", secure: "Use calibrated questions to model healthy communication. Your partner will start mirroring the pattern." }, personality: { introvert: "Calibrated questions buy you processing time. Ask, then listen — your preferred mode of engaging.", extrovert: "The discipline here is asking one question and then fully listening to the answer before asking the next.", feeling: "Frame your calibrated questions around emotions: 'How did that make you feel?' 'What do you need from me right now?'", thinking: "Frame your calibrated questions around solutions: 'How should we handle this?' 'What would work best for both of us?'" } }
  },
  {
    week: 1, day: 6,
    baseText: "The Accusation Audit — disarm tension before it starts. Before a difficult conversation, list every negative thing your partner might think about you — then say those things OUT LOUD first. 'You probably think I'm being selfish.' 'You might feel like I never listen.' 'This might seem like I don't care about your feelings.' This feels counterintuitive, but it's incredibly powerful. When you voice their accusations before they do, it takes the sting out. They often respond with 'No, it's not that bad' — moving toward you instead of away. Today's task: Before your next difficult conversation, write down 5 things your partner might be thinking about you. Then open the conversation by voicing 2-3 of them. Watch how the dynamic shifts.",
    personalizationTags: { attachment: { anxious: "The accusation audit might trigger your fear of rejection — you're voicing the very things you're afraid they think. But naming fears shrinks them. This builds trust, not distance.", avoidant: "The accusation audit is strategic vulnerability — you control what you reveal and when. It actually gives you more control over hard conversations, not less.", secure: "This technique may feel dramatic for your generally stable dynamic. Use it for those rare but important tough conversations." }, personality: { introvert: "Writing down the accusations first gives you preparation time. You'll walk in knowing exactly what to say.", extrovert: "Your natural openness makes accusation audits easier. Just make sure to pause after each statement — let it land.", feeling: "Voicing these accusations will feel emotionally intense. That's the point — you're processing the emotion pre-emptively.", thinking: "Think of the accusation audit as removing objections before a negotiation. It's strategic and evidence-based." } }
  },
  {
    week: 1, day: 7,
    baseText: "Getting to 'That's Right' — the two most powerful words in any relationship. When your partner says 'That's right,' it means you truly understand them — not just their words, but their feelings and perspective. It's completely different from 'You're right' (which often means 'I'll agree so you'll stop talking'). The formula: Label their emotions + Paraphrase their position + Summarize what it all means to them. When you nail this, your partner feels genuinely understood — maybe for the first time in a long time. Today's task: In one conversation today, summarize your partner's perspective so completely — their feelings, their reasoning, their experience — that they respond with 'That's right.' Don't argue. Don't insert your view. Just demonstrate total understanding. This is what it feels like to truly be heard.",
    personalizationTags: { attachment: { anxious: "Getting 'That's right' from your partner is reassurance earned through understanding, not through asking. It's the most secure form of connection.", avoidant: "Aiming for 'That's right' gives you a clear, measurable communication goal. It's not about being emotional — it's about being accurate.", secure: "Challenge yourself today — go for 'That's right' on a topic where you usually disagree. Understanding doesn't mean surrendering your position." }, personality: { introvert: "Your ability to listen deeply is your advantage. Use it to craft a summary that captures not just facts, but feelings.", extrovert: "The challenge is restraining yourself from adding your perspective. Today is purely about reflecting theirs so well it moves them.", feeling: "You intuitively understand emotions. Today, put that understanding into precise words that make your partner feel completely seen.", thinking: "This is a synthesis challenge: gather emotional data, organize it logically, and deliver it back as a coherent summary of their inner experience." } }
  }
];

// Week 1 videos — Chris Voss communication toolkit
const week1Videos = [
  { week: 1, day: 1, youtubeId: 'tYv44wQYePg', title: 'How to Win a Negotiation — Chris Voss (Big Think)', description: 'Chris Voss explains tactical empathy and why understanding the other side\'s perspective is the foundation of every successful negotiation — and every healthy relationship.' },
  { week: 1, day: 2, youtubeId: 'TllU5IXAP40', title: 'Master the ART OF NEGOTIATION — Chris Voss (Impact Theory)', description: 'Full deep-dive with Chris Voss covering mirroring, labeling, calibrated questions, and the complete toolkit for transforming how you communicate.' },
  { week: 1, day: 3, youtubeId: 'pd7tjnVYMzY', title: 'THE SECRET To Negotiating — Chris Voss (Lewis Howes)', description: 'Chris Voss discusses how negotiation techniques apply to personal relationships, with a focus on labeling emotions and building trust.' },
  { week: 1, day: 4, youtubeId: 'TqO1Y1t2kgk', title: 'Late Night FM DJ Voice — Chris Voss Demo', description: 'Short demonstration of the Late Night FM DJ Voice technique — the calm, deep, slow vocal tone that de-escalates any tense conversation.' },
  { week: 1, day: 5, youtubeId: 'Tvg26AnyYBg', title: 'Everything in Life Is A Negotiation — Chris Voss', description: 'Voss reframes daily interactions as negotiations — every conversation with your partner is an opportunity to build trust through calibrated questions.' },
  { week: 1, day: 6, youtubeId: 'TaPy9QLI8jU', title: 'The Accusation Audit — How Communication Works', description: 'Detailed walkthrough of the Accusation Audit technique: how listing your partner\'s potential criticisms before a hard conversation disarms defensiveness.' },
  { week: 1, day: 7, youtubeId: 'B-VKIn_C41I', title: 'Everything You Don\'t Know About Negotiation — Chris Voss', description: 'Counter-intuitive negotiation principles including why getting to "That\'s right" (not "You\'re right") is the key to genuine understanding.' },
];

// Week 2: "Practice the Toolkit" — Voss Exercises + Gottman Measurement
const week2Insights = [
  {
    week: 2, day: 1,
    baseText: "Mirror Practice Exercise — structured connection through reflection. Today you'll do a formal exercise with your partner: sit facing each other. One person speaks for 5 minutes about anything on their mind. The listener's ONLY job is to mirror — repeat the last 1-3 words as a gentle question. No advice, no reactions, just mirrors. After 5 minutes, switch roles. Then debrief: What surprised you? What did you discover? Couples who do this exercise report learning things about their partner they never knew — because mirroring creates space for thoughts to unfold that normal conversation interrupts. Today's task: Complete the mirror exercise with your partner. If they're not available, practice mirroring in any conversation today — at work, with a friend — and journal what you notice.",
    personalizationTags: { attachment: { anxious: "This structured exercise has clear rules and timing, which reduces uncertainty. Trust the format — 5 minutes each, no more, no less.", avoidant: "The time-bounded nature of this exercise makes it safe. You know exactly when it ends. That predictability lets you go deeper.", secure: "Use this exercise to explore topics you haven't touched in a while. The structure might surface something new." }, personality: { introvert: "This exercise is built for you — deep listening with minimal performance pressure. You might find the speaker role harder; that's valuable data.", extrovert: "The listener role is your challenge. Five minutes of only mirroring, no input. It will feel constraining — that's the point.", feeling: "The debrief at the end is where the real connection happens. Let yourself be moved by what you discover.", thinking: "Treat this as data collection. What patterns do you notice in what your partner shares when given uninterrupted space?" } }
  },
  {
    week: 2, day: 2,
    baseText: "The Label Jar — building an emotional vocabulary for your relationship. Last week you learned to label emotions. This week, commit to making it a habit: 3 labels per day about your partner's emotional state. Start a small journal or note on your phone — track each label you make and how your partner responded. Did their shoulders drop? Did they open up more? Did they correct your label? (Corrections are great — they mean they're engaging.) Over time, this journal becomes a map of your partner's emotional landscape. You'll start noticing patterns you never saw before. Today's task: Begin your Label Jar journal. Make 3 labels today and write down: what you observed, the label you used, and your partner's response. Even if a label misses, write it down — the attempt matters more than accuracy.",
    personalizationTags: { attachment: { anxious: "Journaling labels helps externalize your emotional observations instead of spiraling on them internally. Put it on paper, not in your worry loop.", avoidant: "A journal gives you private space to process emotional observations before sharing them. You can be honest on paper even when speaking feels hard.", secure: "The journal will reveal blind spots — emotions you consistently miss or misread. Growth comes from seeing your patterns." }, personality: { introvert: "Journaling is your natural strength. Use it to refine your labeling accuracy over time.", extrovert: "The writing part may feel tedious — keep entries short. The goal is patterns over time, not perfect prose.", feeling: "You'll find this deeply rewarding. Your emotional sensitivity means your labels will often land perfectly.", thinking: "Track your labels like a scientist: observation, hypothesis (label), result (response). Look for correlations." } }
  },
  {
    week: 2, day: 3,
    baseText: "Gottman's Bids for Connection — now you have the tools to respond. Dr. John Gottman's research found that couples who stay together 'turn toward' each other's bids for connection 86% of the time. A bid is any attempt to connect — a question, a sigh, a touch, even 'Look at this sunset.' Now that you have Voss's toolkit, you can supercharge your responses to bids. When your partner makes a bid, try mirroring their words, or labeling the emotion behind the bid. 'It sounds like that sunset really moved you.' This transforms a simple bid into a genuine moment of connection. Today's task: Count your partner's bids for connection today. For at least 3 of them, respond using mirroring or labeling instead of a simple 'uh-huh' or 'cool.' Notice the difference in how the moment feels.",
    personalizationTags: { attachment: { anxious: "You're probably already hyper-aware of bids — especially when they decrease. Today, focus on your responses to bids rather than counting whether they're bidding enough.", avoidant: "Bids you dismiss as trivial ('Look at this article') are actually your partner reaching for you. Today, treat every bid as meaningful — because to them, it is.", secure: "You naturally turn toward bids. Today's challenge: respond with Voss tools instead of your usual response and see if the connection deepens." }, personality: { introvert: "Some bids will feel like interruptions. Reframe them: each one is your partner choosing you over silence. That's beautiful.", extrovert: "You're great at responding to bids with enthusiasm. Today, add depth — mirror or label instead of just matching energy.", feeling: "Bids for connection speak your language. Use your emotional attunement to respond to the feeling behind the bid, not just the content.", thinking: "Think of bids as connection requests in a network. Each one you respond to strengthens the bandwidth between you." } }
  },
  {
    week: 2, day: 4,
    baseText: "The 5:1 Ratio + Labeling Positive Emotions — amplify the good. Gottman's research shows that stable, happy relationships maintain a 5:1 ratio of positive to negative interactions. Here's the Voss twist: labeling POSITIVE emotions amplifies them. We usually label negative emotions to de-escalate — but labeling positive ones ('It seems like you're really proud of that' or 'You look genuinely happy right now') makes the good moments bigger, more felt, more memorable. Most couples focus on fixing the negative. Today, flip the script — amplify the positive. Today's task: Label 5 positive emotions in your partner today. When they laugh, say 'You seem really delighted by that.' When they accomplish something, say 'It sounds like that felt really satisfying.' Watch how labeling good feelings makes them last longer and brings you closer.",
    personalizationTags: { attachment: { anxious: "Focusing on positive emotions is a powerful antidote to the anxiety spiral. When you label joy, you anchor yourself in what's going right.", avoidant: "Labeling positive emotions is lower-risk than labeling negative ones. It's a comfortable way to practice emotional engagement.", secure: "You probably share positive moments naturally. Today, be explicit about it — label the exact emotion you see. Precision amplifies impact." }, personality: { introvert: "Noticing positive emotions in others is a quiet observation skill you already have. Today, voice those observations.", extrovert: "Your enthusiasm is an asset here. Be specific though — 'You seem proud' lands harder than 'That's awesome!'", feeling: "This is your superpower day. You naturally attune to emotions — today, put words to the good ones and watch them grow.", thinking: "There's fascinating neuroscience here: labeling positive emotions strengthens neural pathways associated with those feelings. You're literally rewiring your relationship's emotional baseline." } }
  },
  {
    week: 2, day: 5,
    baseText: "Calibrated Question Conflict Resolution — the 10-minute challenge. Today, you and your partner are going to try something bold: for the first 10 minutes of any disagreement, you can ONLY communicate through calibrated questions. No statements, no accusations, no defenses — only 'How' and 'What' questions. 'How do you see this situation?' 'What would make this feel resolved for you?' 'How can I help make this better?' This constraint forces both of you out of attack/defend mode and into collaborative problem-solving. It feels awkward at first, then something shifts — you start actually hearing each other. Today's task: Agree with your partner on the 10-minute calibrated question rule for today. If a disagreement arises (or bring up a mild ongoing issue), use only 'How' and 'What' questions for the first 10 minutes. Journal what happens.",
    personalizationTags: { attachment: { anxious: "Calibrated questions slow the conversation down, which is exactly what you need when anxiety wants to rush toward resolution. Trust the process.", avoidant: "Questions are safer than statements. You're gathering information, not exposing yourself. This format actually suits your style.", secure: "Use this exercise to model healthy conflict for your relationship. Your comfort with disagreement makes you the ideal one to suggest it." }, personality: { introvert: "The question-only format gives you a clear structure. You don't have to perform — just ask and listen.", extrovert: "This will be challenging — you naturally want to share your perspective. Channel that energy into crafting better questions instead.", feeling: "Your calibrated questions might naturally lean emotional: 'How are you feeling about this?' That's perfect.", thinking: "Your calibrated questions might lean toward problem-solving: 'What options do we have?' Also perfect. Both styles contribute." } }
  },
  {
    week: 2, day: 6,
    baseText: "The 'That's Right' Challenge — prove you understand. Last week you learned the theory. Today, put it into practice with intention. Your mission: during one meaningful conversation, get your partner to say 'That's right' through the power of your summary alone. Remember the formula: Label their emotions + Paraphrase their position + Summarize what it all means to them. This isn't about winning or being clever — it's about understanding someone so thoroughly that they feel completely seen. When they say 'That's right,' something shifts between you. A wall comes down. Trust builds. Today's task: Choose one conversation — ideally about something your partner cares deeply about. Listen fully. Then deliver your summary: their feelings, their reasoning, their perspective, packaged so accurately they can only say 'That's right.' If they say 'You're right' instead, you haven't gone deep enough. Try again.",
    personalizationTags: { attachment: { anxious: "Hearing 'That's right' from your partner provides genuine reassurance — earned through understanding, not through seeking validation. Notice how different it feels.", avoidant: "This is a concrete, achievable communication goal. You're not being asked to be emotional — you're being asked to be accurate. That's your lane.", secure: "Choose a challenging topic — maybe something you tend to disagree on. Getting 'That's right' on a difficult subject is a relationship breakthrough." }, personality: { introvert: "Your listening skills give you an advantage here. You've been absorbing information all week — now synthesize it into one powerful summary.", extrovert: "The temptation will be to summarize too quickly. Take your time. Ask a few more questions before attempting your summary.", feeling: "Lead with the emotional labels in your summary. Your partner needs to feel that you feel what they feel.", thinking: "Structure your summary logically: 'So what I'm hearing is... because of... and that means to you...' Completeness matters." } }
  },
  {
    week: 2, day: 7,
    baseText: "Weekly Review — what you've built in 14 days. This week you took the Voss communication toolkit from theory to practice. Now it's time to reflect honestly. Which tools felt most natural? Mirroring? Labeling? Calibrated questions? Which were hardest? The FM DJ voice? The accusation audit? There are no wrong answers — the tools that challenge you most are often the ones that will transform your relationship the most. Rate your communication this week on a scale of 1-10, and compare it to where you were two weeks ago. Today's task: Take 15 minutes alone to journal your answers: (1) Which Voss tool felt most natural? (2) Which was hardest? (3) What surprised you about your partner's responses? (4) What surprised you about yourself? (5) Rate your communication this week 1-10. Then share one insight from your reflection with your partner.",
    personalizationTags: { attachment: { anxious: "Be honest about which tools calmed your anxiety versus which triggered it. That awareness is incredibly valuable for your growth.", avoidant: "Reflection might surface emotions you've been avoiding. That's okay — you can write them down privately. Nobody has to see your journal.", secure: "Look for the areas where you were challenged most — that's where your biggest growth potential lies." }, personality: { introvert: "This reflection day is perfectly suited to your strengths. Give yourself plenty of quiet time to process everything you've experienced.", extrovert: "Consider doing part of this reflection out loud with your partner or a trusted friend. You process through conversation — use that.", feeling: "Let the emotional insights flow in your journal. How did each tool make you feel? What shifted in your emotional connection?", thinking: "Create a framework for your review: rate each tool 1-10 on naturalness, effectiveness, and difficulty. Identify which to prioritize going forward." } }
  }
];

// Week 2 videos — Voss practice + Gottman measurement
const week2Videos = [
  { week: 2, day: 1, youtubeId: 'ioR7GKRSOS0', title: 'Making Marriage Work — Dr. John Gottman', description: 'Dr. Gottman presents decades of research on bids for connection, the 5:1 ratio, and what actually predicts relationship success.' },
  { week: 2, day: 2, youtubeId: 'ak5JKjCnFoI', title: 'The Power of Vulnerability — Brené Brown', description: 'Brené Brown on the courage to be vulnerable, the foundation of genuine emotional connection and the Label Jar practice.' },
  { week: 2, day: 3, youtubeId: 'tYv44wQYePg', title: 'How to Win a Negotiation — Chris Voss (Revisit)', description: 'Revisit this Voss talk with fresh eyes. Now that you\'ve practiced the basics, you\'ll notice deeper layers on the second watch.' },
  { week: 2, day: 4, youtubeId: 'gkONHNXGfaM', title: 'Emotional First Aid — Guy Winch', description: 'Guy Winch makes the case for caring for our emotional health — essential context for why labeling positive emotions matters so much.' },
  { week: 2, day: 5, youtubeId: 'TllU5IXAP40', title: 'Master the ART OF NEGOTIATION — Chris Voss (Revisit)', description: 'Revisit the full Voss Impact Theory interview. This time, focus on practical application of calibrated questions in conflict.' },
  { week: 2, day: 6, youtubeId: 'xNGVOJXbiTs', title: 'What Makes a Good Life? — Robert Waldinger', description: 'Robert Waldinger shares findings from a 75-year Harvard study: relationships are the #1 predictor of happiness and health.' },
  { week: 2, day: 7, youtubeId: '1Evwgu369Jw', title: 'Self-Esteem vs Self Compassion — Kristin Neff', description: 'Kristin Neff on treating yourself with the same compassion you\'re learning to show your partner. Essential for sustainable growth.' },
];

// Weekly themes for placeholder content (weeks 2-14)
const weeklyThemes = [
  null, // week 0 placeholder
  'Your Communication Toolkit', // week 1 — Chris Voss core skills
  'Practice the Toolkit', // week 2 — Voss exercises + Gottman measurement
  'Emotional Intelligence',
  'Conflict Resolution',
  'Trust Building',
  'Intimacy and Vulnerability',
  'Shared Values and Goals',
  'Family Dynamics',
  'Stress Management Together',
  'Rebuilding After Ruptures',
  'Deepening Appreciation',
  'Future Planning Together',
  'Growth Mindset in Love',
  'Sustaining Your Progress',
];

const dayFocus = ['Awareness', 'Practice', 'Deepening', 'Application', 'Challenge', 'Connection', 'Reflection'];

function generatePlaceholderInsights() {
  const insights = [...week1Insights, ...week2Insights];
  for (let week = 3; week <= 14; week++) {
    for (let day = 1; day <= 7; day++) {
      insights.push({
        week,
        day,
        baseText: `Week ${week} — ${weeklyThemes[week]}: ${dayFocus[day - 1]}. Today's focus is on developing your ${weeklyThemes[week].toLowerCase()} skills through ${dayFocus[day - 1].toLowerCase()}. Take time to reflect on how this theme shows up in your daily interactions and what small step you can take today.`,
        personalizationTags: {
          attachment: {
            anxious: `As someone with an anxious attachment style, ${weeklyThemes[week].toLowerCase()} may bring up fears of rejection. Remember that growth happens at the edge of comfort.`,
            avoidant: `As someone with an avoidant attachment style, ${weeklyThemes[week].toLowerCase()} may feel overwhelming. Take it at your own pace.`,
            secure: `Your secure base allows you to explore ${weeklyThemes[week].toLowerCase()} with curiosity and openness.`
          }
        }
      });
    }
  }
  return insights;
}

function generatePlaceholderVideos() {
  const videos = [...week1Videos, ...week2Videos];
  // Placeholder YouTube IDs for weeks 3-14 using well-known relationship/psychology TED Talks
  const placeholderIds = ['AKTyPgwfPgg', 'ak5JKjCnFoI', 'ioR7GKRSOS0', 'gkONHNXGfaM', 'Jv6BnEDtNaI', '1Evwgu369Jw', 'xNGVOJXbiTs'];
  for (let week = 3; week <= 14; week++) {
    for (let day = 1; day <= 7; day++) {
      videos.push({
        week,
        day,
        youtubeId: placeholderIds[(week + day) % placeholderIds.length],
        title: `${weeklyThemes[week]} — Day ${day}: ${dayFocus[day - 1]}`,
        description: `Educational video for week ${week}, day ${day} focused on ${weeklyThemes[week].toLowerCase()} through the lens of ${dayFocus[day - 1].toLowerCase()}.`,
      });
    }
  }
  return videos;
}

const mediators = [
  {
    name: 'Dr. Sarah Mitchell',
    bio: 'Licensed marriage and family therapist with 15 years of experience facilitating couple discussions. Specializes in communication patterns and conflict resolution.',
    googleCalendarId: 'mediator.sarah@marriagerescue.app',
    availabilityRules: { monday: [{ start: '09:00', end: '17:00' }], wednesday: [{ start: '09:00', end: '17:00' }], friday: [{ start: '09:00', end: '13:00' }] },
    rate: 0,
    status: 'active',
  },
  {
    name: 'James Rodriguez, LMFT',
    bio: 'Bilingual (English/Spanish) family therapist specializing in intercultural relationships and blended family dynamics.',
    googleCalendarId: 'mediator.james@marriagerescue.app',
    availabilityRules: { tuesday: [{ start: '10:00', end: '18:00' }], thursday: [{ start: '10:00', end: '18:00' }], saturday: [{ start: '09:00', end: '12:00' }] },
    rate: 0,
    status: 'active',
  },
  {
    name: 'Dr. Amira Patel',
    bio: 'Clinical psychologist focused on attachment theory and emotionally focused therapy. Warm, structured approach to guided conversations.',
    googleCalendarId: 'mediator.amira@marriagerescue.app',
    availabilityRules: { monday: [{ start: '11:00', end: '19:00' }], wednesday: [{ start: '11:00', end: '19:00' }], friday: [{ start: '11:00', end: '16:00' }] },
    rate: 0,
    status: 'active',
  },
  {
    name: 'Lisa Chen, MSW',
    bio: 'Social worker and relationship coach with expertise in stress management, work-life balance, and rebuilding trust after conflict.',
    googleCalendarId: 'mediator.lisa@marriagerescue.app',
    availabilityRules: { tuesday: [{ start: '08:00', end: '16:00' }], thursday: [{ start: '08:00', end: '16:00' }] },
    rate: 0,
    status: 'active',
  },
  {
    name: 'Dr. Marcus Thompson',
    bio: 'Gottman-certified therapist with a focus on helping couples build shared meaning systems and navigate major life transitions.',
    googleCalendarId: 'mediator.marcus@marriagerescue.app',
    availabilityRules: { monday: [{ start: '13:00', end: '20:00' }], wednesday: [{ start: '13:00', end: '20:00' }], saturday: [{ start: '10:00', end: '14:00' }] },
    rate: 0,
    status: 'active',
  },
  {
    name: 'Rachel Goldstein, LCSW',
    bio: 'Licensed clinical social worker specializing in interfaith and intergenerational relationship challenges. Compassionate, nonjudgmental style.',
    googleCalendarId: 'mediator.rachel@marriagerescue.app',
    availabilityRules: { tuesday: [{ start: '09:00', end: '17:00' }], friday: [{ start: '09:00', end: '17:00' }] },
    rate: 0,
    status: 'active',
  },
  {
    name: 'David Kim, PhD',
    bio: 'Relationship researcher and facilitator. Expert in mindfulness-based relationship enhancement and positive psychology interventions for couples.',
    googleCalendarId: 'mediator.david@marriagerescue.app',
    availabilityRules: { thursday: [{ start: '10:00', end: '18:00' }], saturday: [{ start: '09:00', end: '15:00' }] },
    rate: 0,
    status: 'active',
  },
];

async function main() {
  console.log('Seeding database...');

  // Seed daily insights
  const insights = generatePlaceholderInsights();
  console.log(`Seeding ${insights.length} daily insights...`);
  for (const insight of insights) {
    await prisma.dailyInsight.upsert({
      where: { week_day: { week: insight.week, day: insight.day } },
      update: { baseText: insight.baseText, personalizationTags: insight.personalizationTags },
      create: insight,
    });
  }

  // Seed daily videos
  const videos = generatePlaceholderVideos();
  console.log(`Seeding ${videos.length} daily videos...`);
  for (const video of videos) {
    await prisma.dailyVideo.upsert({
      where: { week_day: { week: video.week, day: video.day } },
      update: { youtubeId: video.youtubeId, title: video.title, description: video.description },
      create: video,
    });
  }

  // Seed mediators
  console.log(`Seeding ${mediators.length} mediators...`);
  for (const mediator of mediators) {
    await prisma.mediator.upsert({
      where: { googleCalendarId: mediator.googleCalendarId },
      update: { name: mediator.name, bio: mediator.bio, availabilityRules: mediator.availabilityRules, rate: mediator.rate, status: mediator.status },
      create: mediator,
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
