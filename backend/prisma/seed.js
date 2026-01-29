const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Week 1 fully written insights with personalization tags
const week1Insights = [
  {
    week: 1, day: 1,
    baseText: "Today, notice one moment when your partner reaches out for connection — a question, a touch, a glance. This is what researchers call a 'bid for attention.' Your response to these small moments shapes the foundation of your relationship more than any grand gesture ever could.",
    personalizationTags: { attachment: { anxious: "Pay extra attention to bids you might interpret as neediness — they're actually invitations to connect.", secure: "You likely already notice many bids. Today, try to catch the subtle ones you might overlook." }, personality: { introvert: "Bids from your partner may feel interrupting. Reframe them as moments of trust.", extrovert: "Your natural responsiveness is a strength. Notice quieter bids too." } }
  },
  {
    week: 1, day: 2,
    baseText: "Reflect on how you typically start conversations with your partner. Research shows that the first three minutes of any interaction predict how the entire conversation will go. Today, begin at least one conversation with genuine curiosity rather than a complaint or request.",
    personalizationTags: { attachment: { avoidant: "Starting conversations can feel vulnerable. Begin with something low-stakes but genuine.", anxious: "Resist the urge to start with checking in on the relationship itself. Ask about their world." }, personality: { thinking: "Try leading with feelings rather than logic today.", feeling: "Your natural warmth in conversation openings is a gift. Lean into it." } }
  },
  {
    week: 1, day: 3,
    baseText: "The '5:1 ratio' is one of the most reliable predictors of relationship success: five positive interactions for every negative one. Today, consciously create positive micro-moments — a compliment, a laugh shared, a helping hand, a moment of eye contact.",
    personalizationTags: { attachment: { anxious: "Focus on giving positives rather than counting whether you receive enough.", secure: "Challenge yourself to reach a 7:1 ratio today." }, personality: { introvert: "Positive moments don't have to be verbal. A gentle touch or making their coffee counts.", extrovert: "Share your enthusiasm openly — your energy is contagious." } }
  },
  {
    week: 1, day: 4,
    baseText: "Today, practice what psychologists call 'active constructive responding.' When your partner shares good news — no matter how small — respond with enthusiastic engagement. Ask follow-up questions. Show you care about what lights them up.",
    personalizationTags: { attachment: { avoidant: "Enthusiasm might not come naturally. Even a simple 'Tell me more about that' goes a long way.", anxious: "Focus on their joy without comparing it to whether they respond the same way to your news." }, personality: { thinking: "Ask detailed questions about how they achieved their good news.", feeling: "Let your genuine happiness for them show freely." } }
  },
  {
    week: 1, day: 5,
    baseText: "Conflict isn't the enemy of a good relationship — contempt is. Today, if frustration arises, notice whether you're tempted to use sarcasm, eye-rolling, or dismissiveness. These are the most corrosive behaviors in relationships. Replace them with 'I feel...' statements.",
    personalizationTags: { attachment: { anxious: "When frustrated, you might escalate to get a response. Try pausing before reacting.", avoidant: "Your instinct to withdraw is a form of contempt too. Stay present even when uncomfortable." }, personality: { thinking: "Express the emotion behind the logic. 'I feel unheard' is more connecting than proving a point.", feeling: "Your emotional awareness is valuable here. Name the feeling precisely." } }
  },
  {
    week: 1, day: 6,
    baseText: "Create a shared moment of stillness today. Put phones away, sit together, and simply be present for five minutes. No agenda, no problem-solving. Research shows that couples who create regular rituals of connection report significantly higher satisfaction.",
    personalizationTags: { attachment: { avoidant: "Five minutes of closeness won't swallow you up. It's actually a safe, boundaried way to connect.", anxious: "Resist the urge to fill silence with words. Quiet togetherness is powerful." }, personality: { introvert: "This kind of quiet connection is likely your comfort zone. Invite your partner into it.", extrovert: "Stillness may feel uncomfortable. That's okay — lean into it." } }
  },
  {
    week: 1, day: 7,
    baseText: "End your first week by writing down three specific things you appreciate about your partner. Not generic praise — specific moments from this week. Share at least one with them today. Gratitude expressed is the simplest and most powerful relationship tool we have.",
    personalizationTags: { attachment: { anxious: "Expressing gratitude without expecting reciprocation is a practice of secure love.", avoidant: "Vulnerability in appreciation builds the safety you need to feel comfortable." }, personality: { thinking: "Be specific about actions and their impact on you.", feeling: "Let the emotion flow naturally — your partner will feel the sincerity." } }
  }
];

// Week 1 videos — real educational YouTube content
const week1Videos = [
  { week: 1, day: 1, youtubeId: 'AKTyPgwfPgg', title: 'The Secret to Desire in Long-Term Relationships', description: 'Esther Perel explores the tension between the need for security and the need for surprise in romantic relationships.' },
  { week: 1, day: 2, youtubeId: 'ak5JKjCnFoI', title: 'The Power of Vulnerability', description: 'Brené Brown shares insights about human connection and the courage to be vulnerable with those we love.' },
  { week: 1, day: 3, youtubeId: 'ioR7GKRSOS0', title: 'Making Marriage Work', description: 'Dr. John Gottman presents decades of research on what makes relationships succeed or fail.' },
  { week: 1, day: 4, youtubeId: 'gkONHNXGfaM', title: 'Why We All Need to Practice Emotional First Aid', description: 'Guy Winch makes a compelling case for practicing emotional hygiene and taking care of our emotions.' },
  { week: 1, day: 5, youtubeId: 'Jv6BnEDtNaI', title: 'Rethinking Infidelity', description: 'Esther Perel examines why people cheat and offers a nuanced look at relationship challenges.' },
  { week: 1, day: 6, youtubeId: '1Evwgu369Jw', title: 'The Space Between Self-Esteem and Self Compassion', description: 'Kristin Neff explores how self-compassion improves our capacity for healthy relationships.' },
  { week: 1, day: 7, youtubeId: 'xNGVOJXbiTs', title: 'What Makes a Good Life? Lessons from the Longest Study on Happiness', description: 'Robert Waldinger shares findings from a 75-year Harvard study showing relationships are key to happiness.' },
];

// Weekly themes for placeholder content (weeks 2-14)
const weeklyThemes = [
  null, // week 0 placeholder
  'Connection Foundations', // week 1 (already written)
  'Communication Patterns',
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
  const insights = [...week1Insights];
  for (let week = 2; week <= 14; week++) {
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
  const videos = [...week1Videos];
  // Placeholder YouTube IDs for weeks 2-14 using well-known relationship/psychology TED Talks
  const placeholderIds = ['AKTyPgwfPgg', 'ak5JKjCnFoI', 'ioR7GKRSOS0', 'gkONHNXGfaM', 'Jv6BnEDtNaI', '1Evwgu369Jw', 'xNGVOJXbiTs'];
  for (let week = 2; week <= 14; week++) {
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
