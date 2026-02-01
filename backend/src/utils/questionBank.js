/**
 * Comprehensive Question Bank for Love Rescue Assessments
 * 
 * Every question is framed as self-reflection. Mirror, not weapon.
 * "I tend to...", "When I feel...", "I notice that I..."
 * 
 * Research foundations:
 * - Attachment: Amir Levine ("Attached"), Bowlby, Ainsworth
 * - Personality: Myers-Briggs Type Indicator framework
 * - Love Language: Gary Chapman ("The 5 Love Languages")
 * - Human Needs: Tony Robbins' 6 Human Needs Psychology
 * - Gottman: John & Julie Gottman (Sound Relationship House)
 * - Emotional Intelligence: Daniel Goleman's EQ framework
 * - Conflict Style: Thomas-Kilmann Conflict Mode Instrument
 * - Differentiation: Murray Bowen, Jennifer Finlayson-Fife
 */

// ═══════════════════════════════════════════════════════════════
// 1. ATTACHMENT STYLE — 30 questions (Scale 1-7)
//    Based on "Attached" by Amir Levine & Rachel Heller
//    Categories: secure, anxious, avoidant, fearful_avoidant
// ═══════════════════════════════════════════════════════════════
const attachmentQuestions = [
  // --- SECURE (8 questions) ---
  { id: 'att_1', text: 'I find it relatively easy to get close to others and am comfortable depending on them.', category: 'secure', reverseScored: false },
  { id: 'att_2', text: 'I feel comfortable sharing my deepest feelings with people I trust.', category: 'secure', reverseScored: false },
  { id: 'att_3', text: 'When conflict arises, I believe we can work through it together without the relationship being at risk.', category: 'secure', reverseScored: false },
  { id: 'att_4', text: 'I can express my needs directly without feeling guilty or ashamed.', category: 'secure', reverseScored: false },
  { id: 'att_5', text: 'I feel confident that people who love me won\'t suddenly leave.', category: 'secure', reverseScored: false },
  { id: 'att_6', text: 'I am comfortable with emotional intimacy and don\'t feel the need to pull away when things get close.', category: 'secure', reverseScored: false },
  { id: 'att_7', text: 'I can hold space for my partner\'s emotions without feeling overwhelmed or needing to fix everything.', category: 'secure', reverseScored: false },
  { id: 'att_8', text: 'I believe that healthy relationships require both togetherness and individual space.', category: 'secure', reverseScored: false },

  // --- ANXIOUS (8 questions) ---
  { id: 'att_9', text: 'I often worry that my partner doesn\'t love me as much as I love them.', category: 'anxious', reverseScored: false },
  { id: 'att_10', text: 'When I don\'t hear from my partner for a while, I tend to imagine worst-case scenarios.', category: 'anxious', reverseScored: false },
  { id: 'att_11', text: 'I notice that I need a lot of reassurance to feel secure in my relationships.', category: 'anxious', reverseScored: false },
  { id: 'att_12', text: 'I tend to replay conversations in my head, analyzing what was really meant.', category: 'anxious', reverseScored: false },
  { id: 'att_13', text: 'When I sense distance from someone I love, I feel a strong urge to reconnect immediately.', category: 'anxious', reverseScored: false },
  { id: 'att_14', text: 'I sometimes act out (picking fights, withdrawing attention) to get a reaction from my partner.', category: 'anxious', reverseScored: false },
  { id: 'att_15', text: 'I find it hard to stop thinking about my relationship when things feel uncertain.', category: 'anxious', reverseScored: false },
  { id: 'att_16', text: 'I tend to give up my own interests and priorities to keep my partner happy.', category: 'anxious', reverseScored: false },

  // --- AVOIDANT (8 questions) ---
  { id: 'att_17', text: 'I feel uncomfortable when someone gets too emotionally close to me.', category: 'avoidant', reverseScored: false },
  { id: 'att_18', text: 'I tend to keep my deepest thoughts and feelings to myself, even with those closest to me.', category: 'avoidant', reverseScored: false },
  { id: 'att_19', text: 'I value my independence so much that I sometimes push people away to protect it.', category: 'avoidant', reverseScored: false },
  { id: 'att_20', text: 'When relationships start to feel too serious, I notice an urge to create distance.', category: 'avoidant', reverseScored: false },
  { id: 'att_21', text: 'I tend to focus on my partner\'s flaws as a way of maintaining emotional distance.', category: 'avoidant', reverseScored: false },
  { id: 'att_22', text: 'I often feel that I can handle things better on my own than with a partner\'s help.', category: 'avoidant', reverseScored: false },
  { id: 'att_23', text: 'I notice that I pull away or shut down when emotional conversations become intense.', category: 'avoidant', reverseScored: false },
  { id: 'att_24', text: 'I sometimes keep an emotional "exit strategy" even in committed relationships.', category: 'avoidant', reverseScored: false },

  // --- FEARFUL-AVOIDANT / DISORGANIZED (6 questions) ---
  { id: 'att_25', text: 'I desperately want closeness but find myself pushing people away when I get it.', category: 'fearful_avoidant', reverseScored: false },
  { id: 'att_26', text: 'I swing between wanting intense connection and feeling suffocated by it.', category: 'fearful_avoidant', reverseScored: false },
  { id: 'att_27', text: 'I notice that I sometimes test people to see if they\'ll stay, even though I fear their answer.', category: 'fearful_avoidant', reverseScored: false },
  { id: 'att_28', text: 'I find that the people I\'m drawn to are often the ones who seem least available.', category: 'fearful_avoidant', reverseScored: false },
  { id: 'att_29', text: 'I feel torn between a deep fear of abandonment and an equally deep fear of being trapped.', category: 'fearful_avoidant', reverseScored: false },
  { id: 'att_30', text: 'I tend to shut down emotionally when I feel vulnerable, even though I crave understanding.', category: 'fearful_avoidant', reverseScored: false },
];

// ═══════════════════════════════════════════════════════════════
// 2. PERSONALITY — 40 questions (Scale 1-7)
//    Expanded Myers-Briggs style
//    Dimensions: EI, SN, TF, JP — 10 per dimension, 5 per pole
// ═══════════════════════════════════════════════════════════════
const personalityQuestions = [
  // --- E/I Dimension (10) ---
  { id: 'per_1',  text: 'I feel energized after spending time with a group of people.', dimension: 'EI', direction: 'E' },
  { id: 'per_2',  text: 'I prefer to process my thoughts internally before sharing them out loud.', dimension: 'EI', direction: 'I' },
  { id: 'per_3',  text: 'I tend to think out loud and form my ideas through conversation.', dimension: 'EI', direction: 'E' },
  { id: 'per_4',  text: 'I need substantial alone time to recharge after social interactions.', dimension: 'EI', direction: 'I' },
  { id: 'per_5',  text: 'I naturally gravitate toward being the one who initiates social plans.', dimension: 'EI', direction: 'E' },
  { id: 'per_6',  text: 'I often feel drained by environments with a lot of external stimulation.', dimension: 'EI', direction: 'I' },
  { id: 'per_7',  text: 'I tend to have a wide circle of friends and enjoy meeting new people.', dimension: 'EI', direction: 'E' },
  { id: 'per_8',  text: 'I prefer deep one-on-one conversations over large group socializing.', dimension: 'EI', direction: 'I' },
  { id: 'per_9',  text: 'I enjoy being the center of attention and feel comfortable in the spotlight.', dimension: 'EI', direction: 'E' },
  { id: 'per_10', text: 'I tend to observe and listen more than I speak in group settings.', dimension: 'EI', direction: 'I' },

  // --- S/N Dimension (10) ---
  { id: 'per_11', text: 'I focus on concrete facts and details when making decisions.', dimension: 'SN', direction: 'S' },
  { id: 'per_12', text: 'I am drawn to exploring abstract ideas, patterns, and possibilities.', dimension: 'SN', direction: 'N' },
  { id: 'per_13', text: 'I trust my direct experience and what I can observe with my senses.', dimension: 'SN', direction: 'S' },
  { id: 'per_14', text: 'I often see connections and meanings that others seem to miss.', dimension: 'SN', direction: 'N' },
  { id: 'per_15', text: 'I prefer step-by-step instructions when learning something new.', dimension: 'SN', direction: 'S' },
  { id: 'per_16', text: 'I tend to focus on the big picture and future possibilities rather than present details.', dimension: 'SN', direction: 'N' },
  { id: 'per_17', text: 'I value practical, proven approaches over theoretical or experimental ones.', dimension: 'SN', direction: 'S' },
  { id: 'per_18', text: 'I often find myself imagining how things could be different or better.', dimension: 'SN', direction: 'N' },
  { id: 'per_19', text: 'I notice specific details in my environment that others tend to overlook.', dimension: 'SN', direction: 'S' },
  { id: 'per_20', text: 'I am energized by brainstorming new ideas, even if they seem impractical at first.', dimension: 'SN', direction: 'N' },

  // --- T/F Dimension (10) ---
  { id: 'per_21', text: 'I make important decisions based primarily on logic and objective analysis.', dimension: 'TF', direction: 'T' },
  { id: 'per_22', text: 'I consider how decisions will affect people\'s feelings before I act.', dimension: 'TF', direction: 'F' },
  { id: 'per_23', text: 'I believe the most fair decision is one that applies consistent standards regardless of circumstances.', dimension: 'TF', direction: 'T' },
  { id: 'per_24', text: 'I tend to prioritize harmony and want everyone to feel heard.', dimension: 'TF', direction: 'F' },
  { id: 'per_25', text: 'I would rather be truthful than tactful when the two conflict.', dimension: 'TF', direction: 'T' },
  { id: 'per_26', text: 'I am deeply affected by others\' emotions and can easily sense when something is wrong.', dimension: 'TF', direction: 'F' },
  { id: 'per_27', text: 'I find it easier to analyze a problem than to navigate the emotions around it.', dimension: 'TF', direction: 'T' },
  { id: 'per_28', text: 'I believe that compassion should play a central role in decision-making.', dimension: 'TF', direction: 'F' },
  { id: 'per_29', text: 'I tend to critique ideas based on their logical soundness before considering other factors.', dimension: 'TF', direction: 'T' },
  { id: 'per_30', text: 'I feel uncomfortable making decisions that could hurt someone, even if logically sound.', dimension: 'TF', direction: 'F' },

  // --- J/P Dimension (10) ---
  { id: 'per_31', text: 'I prefer to have a clear plan and feel unsettled when things are ambiguous.', dimension: 'JP', direction: 'J' },
  { id: 'per_32', text: 'I enjoy keeping my options open and dislike being locked into commitments too early.', dimension: 'JP', direction: 'P' },
  { id: 'per_33', text: 'I feel a strong sense of satisfaction when I complete tasks and cross them off my list.', dimension: 'JP', direction: 'J' },
  { id: 'per_34', text: 'I tend to work in bursts of energy, often doing my best work close to deadlines.', dimension: 'JP', direction: 'P' },
  { id: 'per_35', text: 'I like my environment to be organized and prefer routine over spontaneity.', dimension: 'JP', direction: 'J' },
  { id: 'per_36', text: 'I adapt easily to changes in plans and often find surprises exciting.', dimension: 'JP', direction: 'P' },
  { id: 'per_37', text: 'I tend to make decisions quickly and feel confident once I\'ve decided.', dimension: 'JP', direction: 'J' },
  { id: 'per_38', text: 'I notice that I sometimes struggle with follow-through because new possibilities distract me.', dimension: 'JP', direction: 'P' },
  { id: 'per_39', text: 'I feel responsible for keeping things on track and meeting expectations.', dimension: 'JP', direction: 'J' },
  { id: 'per_40', text: 'I prefer to explore and discover rather than plan and execute.', dimension: 'JP', direction: 'P' },
];

// ═══════════════════════════════════════════════════════════════
// 3. LOVE LANGUAGE — 30 forced-choice pairs
//    Based on Gary Chapman's "The 5 Love Languages"
//    Each question: two options from different languages
// ═══════════════════════════════════════════════════════════════
const loveLanguageQuestions = [
  // Pair every language combination (10 unique pairs × 3 = 30 questions)
  // WA=words_of_affirmation, AS=acts_of_service, RG=receiving_gifts, QT=quality_time, PT=physical_touch

  // --- Words of Affirmation vs Acts of Service ---
  { id: 'll_1',  optionA: { text: 'I feel most loved when someone tells me specific things they appreciate about me.', language: 'words_of_affirmation' }, optionB: { text: 'I feel most loved when someone does something practical to help me without being asked.', language: 'acts_of_service' } },
  { id: 'll_2',  optionA: { text: 'I feel valued when I receive a heartfelt note or message expressing love.', language: 'words_of_affirmation' }, optionB: { text: 'I feel valued when someone takes care of a chore or errand I\'ve been dreading.', language: 'acts_of_service' } },
  { id: 'll_3',  optionA: { text: 'I light up when someone verbally acknowledges my efforts and strengths.', language: 'words_of_affirmation' }, optionB: { text: 'I light up when someone makes my life easier by handling something for me.', language: 'acts_of_service' } },

  // --- Words of Affirmation vs Receiving Gifts ---
  { id: 'll_4',  optionA: { text: 'I feel most connected when my partner says "I love you" and tells me why.', language: 'words_of_affirmation' }, optionB: { text: 'I feel most connected when my partner surprises me with a thoughtful gift.', language: 'receiving_gifts' } },
  { id: 'll_5',  optionA: { text: 'I treasure words of encouragement during difficult times.', language: 'words_of_affirmation' }, optionB: { text: 'I treasure a meaningful gift that shows someone truly knows me.', language: 'receiving_gifts' } },
  { id: 'll_6',  optionA: { text: 'I feel deeply loved when someone compliments me publicly.', language: 'words_of_affirmation' }, optionB: { text: 'I feel deeply loved when someone brings me something from a trip, showing they thought of me.', language: 'receiving_gifts' } },

  // --- Words of Affirmation vs Quality Time ---
  { id: 'll_7',  optionA: { text: 'I would rather hear my partner express their feelings in words.', language: 'words_of_affirmation' }, optionB: { text: 'I would rather have my partner\'s complete, undivided attention.', language: 'quality_time' } },
  { id: 'll_8',  optionA: { text: 'I feel closest to someone when they speak affirming words over me.', language: 'words_of_affirmation' }, optionB: { text: 'I feel closest to someone when we spend uninterrupted time together.', language: 'quality_time' } },
  { id: 'll_9',  optionA: { text: 'I notice love most when my partner verbally supports my dreams and goals.', language: 'words_of_affirmation' }, optionB: { text: 'I notice love most when my partner sets aside everything to be fully present with me.', language: 'quality_time' } },

  // --- Words of Affirmation vs Physical Touch ---
  { id: 'll_10', optionA: { text: 'I feel most secure when my partner tells me how much I mean to them.', language: 'words_of_affirmation' }, optionB: { text: 'I feel most secure when my partner holds me or reaches for my hand.', language: 'physical_touch' } },
  { id: 'll_11', optionA: { text: 'A sincere "I\'m proud of you" means the world to me.', language: 'words_of_affirmation' }, optionB: { text: 'A warm, lingering hug means the world to me.', language: 'physical_touch' } },
  { id: 'll_12', optionA: { text: 'I feel cared for when someone texts me thoughtful, loving messages.', language: 'words_of_affirmation' }, optionB: { text: 'I feel cared for when someone gently touches my back or shoulder as they walk by.', language: 'physical_touch' } },

  // --- Acts of Service vs Receiving Gifts ---
  { id: 'll_13', optionA: { text: 'I feel loved when my partner cooks a meal or handles something around the house.', language: 'acts_of_service' }, optionB: { text: 'I feel loved when my partner picks out something special just for me.', language: 'receiving_gifts' } },
  { id: 'll_14', optionA: { text: 'I\'d rather my partner help me with a project than give me a present.', language: 'acts_of_service' }, optionB: { text: 'I\'d rather receive a meaningful present than help with a project.', language: 'receiving_gifts' } },
  { id: 'll_15', optionA: { text: 'When I\'m overwhelmed, the best thing someone can do is take something off my plate.', language: 'acts_of_service' }, optionB: { text: 'When I\'m overwhelmed, the best thing someone can do is bring me something that cheers me up.', language: 'receiving_gifts' } },

  // --- Acts of Service vs Quality Time ---
  { id: 'll_16', optionA: { text: 'I feel most appreciated when someone helps me without me having to ask.', language: 'acts_of_service' }, optionB: { text: 'I feel most appreciated when someone gives me their full, focused attention.', language: 'quality_time' } },
  { id: 'll_17', optionA: { text: 'I\'d rather my partner finish that home repair project than plan a date night.', language: 'acts_of_service' }, optionB: { text: 'I\'d rather my partner plan an intentional date night than fix something around the house.', language: 'quality_time' } },
  { id: 'll_18', optionA: { text: 'I feel cared for when my partner anticipates my needs and acts on them.', language: 'acts_of_service' }, optionB: { text: 'I feel cared for when my partner and I do an activity together we both enjoy.', language: 'quality_time' } },

  // --- Acts of Service vs Physical Touch ---
  { id: 'll_19', optionA: { text: 'I notice love most when my partner steps in to lighten my load.', language: 'acts_of_service' }, optionB: { text: 'I notice love most when my partner is physically affectionate throughout the day.', language: 'physical_touch' } },
  { id: 'll_20', optionA: { text: 'My ideal expression of love is having my partner take care of something important for me.', language: 'acts_of_service' }, optionB: { text: 'My ideal expression of love is cuddling on the couch together.', language: 'physical_touch' } },
  { id: 'll_21', optionA: { text: 'I feel connected when my partner goes out of their way to do something helpful.', language: 'acts_of_service' }, optionB: { text: 'I feel connected when my partner gives me a massage after a hard day.', language: 'physical_touch' } },

  // --- Receiving Gifts vs Quality Time ---
  { id: 'll_22', optionA: { text: 'I love receiving a surprise that shows my partner was thinking of me.', language: 'receiving_gifts' }, optionB: { text: 'I love when my partner carves out special time for just us.', language: 'quality_time' } },
  { id: 'll_23', optionA: { text: 'A perfect anniversary involves a meaningful, carefully chosen gift.', language: 'receiving_gifts' }, optionB: { text: 'A perfect anniversary involves a shared experience we\'ll always remember.', language: 'quality_time' } },
  { id: 'll_24', optionA: { text: 'I feel thought of when someone brings me something small — even a coffee.', language: 'receiving_gifts' }, optionB: { text: 'I feel thought of when someone puts their phone away and gives me their attention.', language: 'quality_time' } },

  // --- Receiving Gifts vs Physical Touch ---
  { id: 'll_25', optionA: { text: 'I\'d rather receive a heartfelt gift than a long embrace.', language: 'receiving_gifts' }, optionB: { text: 'I\'d rather receive a long embrace than a heartfelt gift.', language: 'physical_touch' } },
  { id: 'll_26', optionA: { text: 'I feel loved when someone remembers occasions with thoughtful presents.', language: 'receiving_gifts' }, optionB: { text: 'I feel loved when someone reaches for me — holding hands, an arm around me.', language: 'physical_touch' } },
  { id: 'll_27', optionA: { text: 'The gesture of giving something meaningful speaks volumes about love to me.', language: 'receiving_gifts' }, optionB: { text: 'Being physically close and intimate speaks volumes about love to me.', language: 'physical_touch' } },

  // --- Quality Time vs Physical Touch ---
  { id: 'll_28', optionA: { text: 'I feel most loved during deep, meaningful conversations with my partner.', language: 'quality_time' }, optionB: { text: 'I feel most loved when my partner is physically close and affectionate.', language: 'physical_touch' } },
  { id: 'll_29', optionA: { text: 'I\'d rather go on an adventure together than stay home and cuddle.', language: 'quality_time' }, optionB: { text: 'I\'d rather stay home and cuddle than go on an adventure.', language: 'physical_touch' } },
  { id: 'll_30', optionA: { text: 'I feel closest to my partner during long talks where we really connect.', language: 'quality_time' }, optionB: { text: 'I feel closest to my partner when we\'re physically touching — even just sitting close.', language: 'physical_touch' } },
];

// ═══════════════════════════════════════════════════════════════
// 4. HUMAN NEEDS — 36 questions (Scale 1-7)
//    Based on Tony Robbins' 6 Human Needs Psychology
//    6 questions per need
// ═══════════════════════════════════════════════════════════════
const humanNeedsQuestions = [
  // --- CERTAINTY ---
  { id: 'hn_1',  text: 'I feel most at ease when I know what to expect in my day-to-day life.', need: 'certainty' },
  { id: 'hn_2',  text: 'I tend to seek out stability and predictability in my relationships.', need: 'certainty' },
  { id: 'hn_3',  text: 'I feel anxious when I can\'t predict what\'s going to happen next.', need: 'certainty' },
  { id: 'hn_4',  text: 'I find comfort in routines, traditions, and knowing the plan ahead of time.', need: 'certainty' },
  { id: 'hn_5',  text: 'I notice that I work hard to create financial and emotional security for myself.', need: 'certainty' },
  { id: 'hn_6',  text: 'I feel unsettled when the future of my relationship feels uncertain.', need: 'certainty' },

  // --- VARIETY ---
  { id: 'hn_7',  text: 'I crave new experiences and feel stifled by too much routine.', need: 'variety' },
  { id: 'hn_8',  text: 'I feel most alive when I\'m doing something I\'ve never done before.', need: 'variety' },
  { id: 'hn_9',  text: 'I tend to get bored easily if life becomes too predictable.', need: 'variety' },
  { id: 'hn_10', text: 'I enjoy surprises and spontaneous changes to plans.', need: 'variety' },
  { id: 'hn_11', text: 'I notice that I seek excitement and novelty in my relationships.', need: 'variety' },
  { id: 'hn_12', text: 'I feel energized by challenges and situations that push me out of my comfort zone.', need: 'variety' },

  // --- SIGNIFICANCE ---
  { id: 'hn_13', text: 'I have a strong need to feel unique and special to the people I love.', need: 'significance' },
  { id: 'hn_14', text: 'I notice that I seek recognition and acknowledgment for my contributions.', need: 'significance' },
  { id: 'hn_15', text: 'I feel deeply fulfilled when I\'m seen as important or irreplaceable.', need: 'significance' },
  { id: 'hn_16', text: 'I tend to compare myself to others and feel affected by where I stand.', need: 'significance' },
  { id: 'hn_17', text: 'I feel hurt when my efforts go unnoticed or unappreciated.', need: 'significance' },
  { id: 'hn_18', text: 'I am driven by a desire to achieve things that set me apart.', need: 'significance' },

  // --- CONNECTION / LOVE ---
  { id: 'hn_19', text: 'I feel most alive when I have deep, meaningful connections with others.', need: 'connection' },
  { id: 'hn_20', text: 'I would sacrifice personal achievements for the sake of closeness and belonging.', need: 'connection' },
  { id: 'hn_21', text: 'I notice that I prioritize relationships above almost everything else.', need: 'connection' },
  { id: 'hn_22', text: 'I feel a deep sense of loss when I feel disconnected from the people I love.', need: 'connection' },
  { id: 'hn_23', text: 'I tend to merge with my partner and feel most fulfilled through emotional intimacy.', need: 'connection' },
  { id: 'hn_24', text: 'I feel whole when I\'m part of a loving community or partnership.', need: 'connection' },

  // --- GROWTH ---
  { id: 'hn_25', text: 'I feel stagnant and unhappy if I\'m not learning or developing in some way.', need: 'growth' },
  { id: 'hn_26', text: 'I am drawn to personal development, books, courses, and self-improvement.', need: 'growth' },
  { id: 'hn_27', text: 'I notice that I get restless in relationships where I feel like we\'re not evolving together.', need: 'growth' },
  { id: 'hn_28', text: 'I am willing to go through discomfort if it means becoming a better version of myself.', need: 'growth' },
  { id: 'hn_29', text: 'I feel most fulfilled when I\'m making progress toward meaningful goals.', need: 'growth' },
  { id: 'hn_30', text: 'I believe that relationships should be a vehicle for mutual growth and transformation.', need: 'growth' },

  // --- CONTRIBUTION ---
  { id: 'hn_31', text: 'I feel most fulfilled when I\'m making a positive difference in someone else\'s life.', need: 'contribution' },
  { id: 'hn_32', text: 'I tend to put others\' needs before my own and find meaning in service.', need: 'contribution' },
  { id: 'hn_33', text: 'I feel deeply satisfied when I can give to causes or people I care about.', need: 'contribution' },
  { id: 'hn_34', text: 'I notice that I feel most alive when I\'m helping my partner grow and succeed.', need: 'contribution' },
  { id: 'hn_35', text: 'I believe my life has meaning when it\'s in service to something greater than myself.', need: 'contribution' },
  { id: 'hn_36', text: 'I feel joy when I can use my strengths to benefit my relationship and community.', need: 'contribution' },
];

// ═══════════════════════════════════════════════════════════════
// 5. GOTTMAN CHECKUP — 40 questions (Scale 1-5: Never to Always)
//    Based on the Sound Relationship House (Gottman Institute)
// ═══════════════════════════════════════════════════════════════
const gottmanCheckupQuestions = [
  // --- FOUR HORSEMEN: Criticism (5) ---
  { id: 'gc_1',  text: 'I notice that I frame complaints as attacks on my partner\'s character rather than addressing specific behaviors.', category: 'four_horsemen', subcategory: 'criticism', reverseScored: false },
  { id: 'gc_2',  text: 'I tend to use words like "you always" or "you never" when I\'m upset.', category: 'four_horsemen', subcategory: 'criticism', reverseScored: false },
  { id: 'gc_3',  text: 'When something bothers me, I focus on what\'s wrong with my partner rather than what I need.', category: 'four_horsemen', subcategory: 'criticism', reverseScored: false },
  { id: 'gc_4',  text: 'I find myself bringing up past grievances when discussing current issues.', category: 'four_horsemen', subcategory: 'criticism', reverseScored: false },
  { id: 'gc_5',  text: 'I notice that my complaints sometimes feel like a global indictment rather than a specific request.', category: 'four_horsemen', subcategory: 'criticism', reverseScored: false },

  // --- FOUR HORSEMEN: Contempt (5) ---
  { id: 'gc_6',  text: 'I sometimes feel or express superiority over my partner during disagreements.', category: 'four_horsemen', subcategory: 'contempt', reverseScored: false },
  { id: 'gc_7',  text: 'I notice that I use sarcasm, eye-rolling, or mockery when frustrated with my partner.', category: 'four_horsemen', subcategory: 'contempt', reverseScored: false },
  { id: 'gc_8',  text: 'I find myself thinking that I\'m better or more competent than my partner in important areas.', category: 'four_horsemen', subcategory: 'contempt', reverseScored: false },
  { id: 'gc_9',  text: 'I sometimes feel disgust or disrespect toward my partner during conflict.', category: 'four_horsemen', subcategory: 'contempt', reverseScored: false },
  { id: 'gc_10', text: 'I notice that I belittle my partner\'s feelings or perspective, even if only in my head.', category: 'four_horsemen', subcategory: 'contempt', reverseScored: false },

  // --- FOUR HORSEMEN: Defensiveness (5) ---
  { id: 'gc_11', text: 'When my partner raises a concern, I tend to explain why it\'s not my fault.', category: 'four_horsemen', subcategory: 'defensiveness', reverseScored: false },
  { id: 'gc_12', text: 'I notice that I respond to complaints with my own counter-complaints.', category: 'four_horsemen', subcategory: 'defensiveness', reverseScored: false },
  { id: 'gc_13', text: 'I tend to play the victim or the innocent one during arguments.', category: 'four_horsemen', subcategory: 'defensiveness', reverseScored: false },
  { id: 'gc_14', text: 'I find it hard to take responsibility for my part in relationship problems.', category: 'four_horsemen', subcategory: 'defensiveness', reverseScored: false },
  { id: 'gc_15', text: 'When criticized, I immediately think of ways to defend myself rather than understand the concern.', category: 'four_horsemen', subcategory: 'defensiveness', reverseScored: false },

  // --- FOUR HORSEMEN: Stonewalling (5) ---
  { id: 'gc_16', text: 'I tend to shut down, go silent, or emotionally withdraw during heated discussions.', category: 'four_horsemen', subcategory: 'stonewalling', reverseScored: false },
  { id: 'gc_17', text: 'I notice that I physically leave or tune out when conversations become too intense.', category: 'four_horsemen', subcategory: 'stonewalling', reverseScored: false },
  { id: 'gc_18', text: 'I feel flooded and overwhelmed during conflict and find it hard to stay engaged.', category: 'four_horsemen', subcategory: 'stonewalling', reverseScored: false },
  { id: 'gc_19', text: 'I sometimes give my partner the silent treatment when I\'m upset.', category: 'four_horsemen', subcategory: 'stonewalling', reverseScored: false },
  { id: 'gc_20', text: 'I notice that I build internal walls during conflict rather than expressing what I feel.', category: 'four_horsemen', subcategory: 'stonewalling', reverseScored: false },

  // --- TURNING TOWARD (5) ---
  { id: 'gc_21', text: 'I notice and respond to my partner\'s small bids for attention and connection.', category: 'turning_toward', subcategory: 'bids', reverseScored: false },
  { id: 'gc_22', text: 'I make an effort to show interest when my partner shares something about their day.', category: 'turning_toward', subcategory: 'bids', reverseScored: false },
  { id: 'gc_23', text: 'I prioritize responding warmly to my partner, even when I\'m busy or stressed.', category: 'turning_toward', subcategory: 'responsiveness', reverseScored: false },
  { id: 'gc_24', text: 'I notice small moments where my partner reaches out, and I try to meet them there.', category: 'turning_toward', subcategory: 'awareness', reverseScored: false },
  { id: 'gc_25', text: 'I actively look for opportunities to connect with my partner throughout the day.', category: 'turning_toward', subcategory: 'initiative', reverseScored: false },

  // --- FONDNESS & ADMIRATION (5) ---
  { id: 'gc_26', text: 'I regularly think about qualities I admire and appreciate in my partner.', category: 'fondness_admiration', subcategory: 'appreciation', reverseScored: false },
  { id: 'gc_27', text: 'I express gratitude and affection toward my partner frequently.', category: 'fondness_admiration', subcategory: 'expression', reverseScored: false },
  { id: 'gc_28', text: 'I feel a sense of warmth and fondness when I think about my partner.', category: 'fondness_admiration', subcategory: 'warmth', reverseScored: false },
  { id: 'gc_29', text: 'I tend to focus on what my partner does well rather than what they do wrong.', category: 'fondness_admiration', subcategory: 'positive_perspective', reverseScored: false },
  { id: 'gc_30', text: 'I feel proud of my partner and enjoy telling others about their strengths.', category: 'fondness_admiration', subcategory: 'pride', reverseScored: false },

  // --- LOVE MAPS (5) ---
  { id: 'gc_31', text: 'I know my partner\'s current worries, stresses, and hopes for the future.', category: 'love_maps', subcategory: 'knowledge', reverseScored: false },
  { id: 'gc_32', text: 'I am aware of my partner\'s life dreams, even the ones they haven\'t fully shared.', category: 'love_maps', subcategory: 'dreams', reverseScored: false },
  { id: 'gc_33', text: 'I know my partner\'s favorite things — music, food, people — and what makes them light up.', category: 'love_maps', subcategory: 'preferences', reverseScored: false },
  { id: 'gc_34', text: 'I ask my partner questions about their inner world and what they\'re experiencing.', category: 'love_maps', subcategory: 'curiosity', reverseScored: false },
  { id: 'gc_35', text: 'I feel that I truly know who my partner is at their core.', category: 'love_maps', subcategory: 'depth', reverseScored: false },

  // --- SHARED MEANING (3) ---
  { id: 'gc_36', text: 'I feel that my partner and I share a sense of purpose and direction in life.', category: 'shared_meaning', subcategory: 'purpose', reverseScored: false },
  { id: 'gc_37', text: 'We have rituals, traditions, or shared practices that feel meaningful to us.', category: 'shared_meaning', subcategory: 'rituals', reverseScored: false },
  { id: 'gc_38', text: 'I feel that our relationship has a deeper "story" or mission that we\'re building together.', category: 'shared_meaning', subcategory: 'narrative', reverseScored: false },

  // --- REPAIR ATTEMPTS (2) ---
  { id: 'gc_39', text: 'When things go wrong between us, I actively try to de-escalate and reconnect.', category: 'repair_attempts', subcategory: 'de_escalation', reverseScored: false },
  { id: 'gc_40', text: 'I can recognize and respond positively when my partner attempts to repair after conflict.', category: 'repair_attempts', subcategory: 'receptivity', reverseScored: false },
];

// ═══════════════════════════════════════════════════════════════
// 6. EMOTIONAL INTELLIGENCE — 25 questions (Scale 1-7)
//    Based on Daniel Goleman's EQ framework
//    5 questions per domain
// ═══════════════════════════════════════════════════════════════
const emotionalIntelligenceQuestions = [
  // --- SELF-AWARENESS ---
  { id: 'ei_1',  text: 'I can accurately identify what I\'m feeling in the moment and name the specific emotion.', category: 'self_awareness' },
  { id: 'ei_2',  text: 'I notice how my emotions influence my thoughts and decisions.', category: 'self_awareness' },
  { id: 'ei_3',  text: 'I am aware of my emotional triggers and understand where they come from.', category: 'self_awareness' },
  { id: 'ei_4',  text: 'I can recognize when I\'m being driven by ego rather than genuine values.', category: 'self_awareness' },
  { id: 'ei_5',  text: 'I understand the difference between what I\'m feeling and the story I\'m telling myself about it.', category: 'self_awareness' },

  // --- SELF-REGULATION ---
  { id: 'ei_6',  text: 'I can pause between feeling a strong emotion and acting on it.', category: 'self_regulation' },
  { id: 'ei_7',  text: 'I rarely say things I regret in the heat of the moment.', category: 'self_regulation' },
  { id: 'ei_8',  text: 'I can calm myself down when I notice I\'m becoming overwhelmed or flooded.', category: 'self_regulation' },
  { id: 'ei_9',  text: 'I manage stress and frustration in healthy ways rather than taking it out on others.', category: 'self_regulation' },
  { id: 'ei_10', text: 'I can sit with uncomfortable emotions without immediately trying to escape or numb them.', category: 'self_regulation' },

  // --- MOTIVATION ---
  { id: 'ei_11', text: 'I am driven by internal values and purpose rather than external rewards.', category: 'motivation' },
  { id: 'ei_12', text: 'I maintain optimism and motivation even when facing setbacks in my relationship.', category: 'motivation' },
  { id: 'ei_13', text: 'I am committed to growing and improving, even when it\'s uncomfortable.', category: 'motivation' },
  { id: 'ei_14', text: 'I hold a standard for myself that isn\'t dependent on my partner\'s behavior.', category: 'motivation' },
  { id: 'ei_15', text: 'I can delay gratification in service of long-term relationship goals.', category: 'motivation' },

  // --- EMPATHY ---
  { id: 'ei_16', text: 'I can sense what another person is feeling, even when they haven\'t said it.', category: 'empathy' },
  { id: 'ei_17', text: 'I genuinely try to see situations from my partner\'s perspective before responding.', category: 'empathy' },
  { id: 'ei_18', text: 'I validate others\' emotions even when I don\'t understand or agree with them.', category: 'empathy' },
  { id: 'ei_19', text: 'I notice subtle shifts in other people\'s moods and body language.', category: 'empathy' },
  { id: 'ei_20', text: 'I can hold space for someone\'s pain without trying to fix it or make it go away.', category: 'empathy' },

  // --- SOCIAL SKILLS ---
  { id: 'ei_21', text: 'I navigate disagreements in a way that strengthens rather than damages relationships.', category: 'social_skills' },
  { id: 'ei_22', text: 'I can express difficult truths with both honesty and compassion.', category: 'social_skills' },
  { id: 'ei_23', text: 'I build trust by being consistent in what I say and what I do.', category: 'social_skills' },
  { id: 'ei_24', text: 'I can influence and inspire others without being manipulative or coercive.', category: 'social_skills' },
  { id: 'ei_25', text: 'I repair relationships proactively when I notice I\'ve caused hurt or distance.', category: 'social_skills' },
];

// ═══════════════════════════════════════════════════════════════
// 7. CONFLICT STYLE — 30 questions (Scale 1-7)
//    Based on Thomas-Kilmann Conflict Mode Instrument
//    5 styles × 6 questions each
// ═══════════════════════════════════════════════════════════════
const conflictStyleQuestions = [
  // --- COMPETING ---
  { id: 'cs_1',  text: 'When I believe I\'m right, I stand firm and push for my position.', style: 'competing' },
  { id: 'cs_2',  text: 'I tend to prioritize getting the outcome I want, even if it means overriding my partner\'s preferences.', style: 'competing' },
  { id: 'cs_3',  text: 'I feel that yielding on important issues is a sign of weakness.', style: 'competing' },
  { id: 'cs_4',  text: 'I use my knowledge, logic, or authority to win arguments.', style: 'competing' },
  { id: 'cs_5',  text: 'I notice that I can be forceful in asserting my viewpoint during disagreements.', style: 'competing' },
  { id: 'cs_6',  text: 'I believe that sometimes you need to fight for what\'s right, regardless of how it makes others feel.', style: 'competing' },

  // --- COLLABORATING ---
  { id: 'cs_7',  text: 'I actively look for solutions where both of us get our core needs met.', style: 'collaborating' },
  { id: 'cs_8',  text: 'I believe the best outcomes come from fully exploring both perspectives together.', style: 'collaborating' },
  { id: 'cs_9',  text: 'I\'m willing to invest significant time and effort to find a win-win solution.', style: 'collaborating' },
  { id: 'cs_10', text: 'I try to integrate my partner\'s concerns with my own to find a creative resolution.', style: 'collaborating' },
  { id: 'cs_11', text: 'I openly share my needs and invite my partner to share theirs during conflict.', style: 'collaborating' },
  { id: 'cs_12', text: 'I see conflict as an opportunity to deepen understanding and build trust.', style: 'collaborating' },

  // --- COMPROMISING ---
  { id: 'cs_13', text: 'I tend to look for a middle ground where both of us give up something.', style: 'compromising' },
  { id: 'cs_14', text: 'I believe that splitting the difference is usually the fairest way to resolve disagreements.', style: 'compromising' },
  { id: 'cs_15', text: 'I\'m willing to give a little to get a little during conflicts.', style: 'compromising' },
  { id: 'cs_16', text: 'I seek quick, practical solutions that are "good enough" for both of us.', style: 'compromising' },
  { id: 'cs_17', text: 'I notice that I often suggest "meeting in the middle" as a way to resolve things.', style: 'compromising' },
  { id: 'cs_18', text: 'I prefer a partially satisfying solution now over a perfect solution later.', style: 'compromising' },

  // --- AVOIDING ---
  { id: 'cs_19', text: 'I tend to sidestep or postpone dealing with conflict whenever possible.', style: 'avoiding' },
  { id: 'cs_20', text: 'I often choose to keep the peace rather than address something that bothers me.', style: 'avoiding' },
  { id: 'cs_21', text: 'I notice that I withdraw or change the subject when tensions arise.', style: 'avoiding' },
  { id: 'cs_22', text: 'I often feel that raising issues will make things worse, so I stay quiet.', style: 'avoiding' },
  { id: 'cs_23', text: 'I let certain disagreements pass without saying anything, hoping they\'ll resolve on their own.', style: 'avoiding' },
  { id: 'cs_24', text: 'I find myself avoiding people or situations where conflict might occur.', style: 'avoiding' },

  // --- ACCOMMODATING ---
  { id: 'cs_25', text: 'I tend to give in to my partner\'s wishes to maintain the relationship.', style: 'accommodating' },
  { id: 'cs_26', text: 'I often put my partner\'s needs above my own during disagreements.', style: 'accommodating' },
  { id: 'cs_27', text: 'I\'d rather sacrifice my own position than see my partner upset.', style: 'accommodating' },
  { id: 'cs_28', text: 'I notice that I agree with my partner even when I secretly disagree, just to avoid tension.', style: 'accommodating' },
  { id: 'cs_29', text: 'I feel that preserving harmony is more important than getting my way.', style: 'accommodating' },
  { id: 'cs_30', text: 'I tend to let others have their way because their needs seem more important than mine.', style: 'accommodating' },
];

// ═══════════════════════════════════════════════════════════════
// 8. DIFFERENTIATION OF SELF — 20 questions (Scale 1-7)
//    Based on Bowen Family Systems & Jennifer Finlayson-Fife
//    Categories: emotional_reactivity, i_position, emotional_cutoff, fusion
// ═══════════════════════════════════════════════════════════════
const differentiationQuestions = [
  // --- EMOTIONAL REACTIVITY (5) --- (reverse scored = higher score means LESS differentiated)
  { id: 'diff_1',  text: 'I notice that my partner\'s mood heavily dictates my own emotional state.', category: 'emotional_reactivity', reverseScored: true },
  { id: 'diff_2',  text: 'When someone criticizes me, I feel it deeply and it disrupts my sense of self.', category: 'emotional_reactivity', reverseScored: true },
  { id: 'diff_3',  text: 'I tend to have intense emotional reactions that feel disproportionate to the situation.', category: 'emotional_reactivity', reverseScored: true },
  { id: 'diff_4',  text: 'I find it hard to think clearly when I\'m in the grip of strong emotions.', category: 'emotional_reactivity', reverseScored: true },
  { id: 'diff_5',  text: 'I notice that I take things personally even when they\'re not about me.', category: 'emotional_reactivity', reverseScored: true },

  // --- I-POSITION (5) --- (higher score = MORE differentiated)
  { id: 'diff_6',  text: 'I can hold onto my own values and beliefs even when others disagree with me.', category: 'i_position', reverseScored: false },
  { id: 'diff_7',  text: 'I can say what I think and feel without needing others to agree or validate me.', category: 'i_position', reverseScored: false },
  { id: 'diff_8',  text: 'I maintain a clear sense of who I am regardless of the relationship I\'m in.', category: 'i_position', reverseScored: false },
  { id: 'diff_9',  text: 'I can tolerate my partner\'s disapproval without abandoning my own position.', category: 'i_position', reverseScored: false },
  { id: 'diff_10', text: 'I take responsibility for my own happiness and don\'t expect my partner to make me whole.', category: 'i_position', reverseScored: false },

  // --- EMOTIONAL CUTOFF (5) --- (reverse scored = higher score means LESS differentiated)
  { id: 'diff_11', text: 'When I feel hurt, I tend to completely withdraw and cut off emotionally.', category: 'emotional_cutoff', reverseScored: true },
  { id: 'diff_12', text: 'I have significant relationships in my life that I\'ve distanced from or severed.', category: 'emotional_cutoff', reverseScored: true },
  { id: 'diff_13', text: 'I cope with emotional pain by shutting down and going numb.', category: 'emotional_cutoff', reverseScored: true },
  { id: 'diff_14', text: 'I tend to pretend things don\'t bother me rather than dealing with the discomfort.', category: 'emotional_cutoff', reverseScored: true },
  { id: 'diff_15', text: 'I notice that I distance myself from anyone who gets too close to my vulnerabilities.', category: 'emotional_cutoff', reverseScored: true },

  // --- FUSION (5) --- (reverse scored = higher score means LESS differentiated)
  { id: 'diff_16', text: 'I tend to lose myself in relationships, adopting my partner\'s interests, opinions, and identity.', category: 'fusion', reverseScored: true },
  { id: 'diff_17', text: 'I feel responsible for my partner\'s emotions and believe I should be able to make them happy.', category: 'fusion', reverseScored: true },
  { id: 'diff_18', text: 'I notice that I need constant closeness and togetherness to feel okay.', category: 'fusion', reverseScored: true },
  { id: 'diff_19', text: 'I tend to feel anxious or guilty when I do things independently from my partner.', category: 'fusion', reverseScored: true },
  { id: 'diff_20', text: 'I often sacrifice my own needs or boundaries because I fear conflict or rejection.', category: 'fusion', reverseScored: true },
];


// ═══════════════════════════════════════════════════════════════
// 9. HORMONAL HEALTH — 30 questions (Scale 1-7)
//    Wellness screener for hormonal factors impacting relationships
//    Categories: testosterone_symptoms, estrogen_progesterone,
//                cortisol_stress, thyroid_energy, libido_drive
//    NOT medical advice — a self-awareness mirror for your body.
// ═══════════════════════════════════════════════════════════════
const hormonalHealthQuestions = [
  // --- TESTOSTERONE SYMPTOMS — primarily male-focused, some universal ---
  { id: 'hh_1',  text: 'I notice that my muscle mass and physical strength have decreased over time, even without changes to my activity level.', category: 'testosterone_symptoms', gender: 'all' },
  { id: 'hh_2',  text: 'I tend to feel less motivated and driven than I used to — a general loss of ambition or competitive fire.', category: 'testosterone_symptoms', gender: 'all' },
  { id: 'hh_3',  text: 'I notice that I carry more body fat than I\'d like, especially around my midsection and chest.', category: 'testosterone_symptoms', gender: 'male' },
  { id: 'hh_4',  text: 'I tend to feel mentally foggy or have difficulty concentrating, especially in the afternoon.', category: 'testosterone_symptoms', gender: 'all' },
  { id: 'hh_5',  text: 'I notice that my confidence and assertiveness have declined compared to earlier in my life.', category: 'testosterone_symptoms', gender: 'all' },
  { id: 'hh_6',  text: 'I tend to feel emotionally flat or less resilient — things that didn\'t bother me before now get under my skin.', category: 'testosterone_symptoms', gender: 'all' },
  // Male-specific testosterone questions
  { id: 'hh_m1', text: 'I notice difficulty achieving or maintaining erections, or a significant decline in sexual performance.', category: 'testosterone_symptoms', gender: 'male' },
  { id: 'hh_m2', text: 'I tend to feel like I\'ve lost my edge — less competitive, less assertive, less willing to take risks or lead.', category: 'testosterone_symptoms', gender: 'male' },
  { id: 'hh_m3', text: 'I notice increased body fat around my chest area that seems out of proportion to my overall fitness.', category: 'testosterone_symptoms', gender: 'male' },

  // --- ESTROGEN / PROGESTERONE — primarily female-focused ---
  { id: 'hh_7',  text: 'I notice significant mood shifts that seem to follow a cyclical pattern throughout the month.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_8',  text: 'I tend to experience bloating, water retention, or breast tenderness that fluctuates over time.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_9',  text: 'I notice that I feel more anxious, irritable, or emotionally reactive during certain times of the month or certain life phases.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_10', text: 'I tend to experience hot flashes, night sweats, or sudden temperature changes that disrupt my comfort or sleep.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_11', text: 'I notice that my skin, hair, or nails have changed in quality — dryness, thinning, or breakouts that seem hormonally driven.', category: 'estrogen_progesterone', gender: 'all' },
  { id: 'hh_12', text: 'I tend to feel like my emotional reactions are disproportionate to the situation, and I can\'t always explain why.', category: 'estrogen_progesterone', gender: 'all' },
  // Female-specific estrogen/progesterone questions
  { id: 'hh_f1', text: 'I notice changes in my menstrual cycle — irregular periods, heavier flow, or missed periods that weren\'t typical for me before.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_f2', text: 'I feel like I\'m experiencing perimenopause or menopause symptoms — brain fog, dryness, weight changes, or mood swings that feel hormonally driven.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_f3', text: 'I tend to feel depressed, anxious, or emotionally overwhelmed from comparing myself to others on social media or in my social circles.', category: 'estrogen_progesterone', gender: 'female' },
  { id: 'hh_f4', text: 'I notice a significant loss of desire or libido that doesn\'t match how I feel emotionally about my partner.', category: 'estrogen_progesterone', gender: 'female' },

  // --- CORTISOL / STRESS — universal ---
  { id: 'hh_13', text: 'I notice that I feel "wired but tired" — exhausted yet unable to fully relax or fall asleep.', category: 'cortisol_stress', gender: 'all' },
  { id: 'hh_14', text: 'I tend to carry tension in my body — tight shoulders, clenched jaw, or a knotted stomach — even when nothing specific is wrong.', category: 'cortisol_stress', gender: 'all' },
  { id: 'hh_15', text: 'I notice that I crave sugar, caffeine, or comfort food, especially in the afternoon or evening.', category: 'cortisol_stress', gender: 'all' },
  { id: 'hh_16', text: 'I tend to feel overwhelmed by tasks that I used to handle easily — my stress threshold feels lower.', category: 'cortisol_stress', gender: 'all' },
  { id: 'hh_17', text: 'I notice that I gain weight around my belly even when my eating and exercise habits haven\'t changed much.', category: 'cortisol_stress', gender: 'all' },
  { id: 'hh_18', text: 'I tend to feel a crash in energy between 2-4pm that makes me want to nap or reach for stimulants.', category: 'cortisol_stress', gender: 'all' },

  // --- THYROID / ENERGY — universal ---
  { id: 'hh_19', text: 'I notice that I feel cold more often than others around me, especially in my hands and feet.', category: 'thyroid_energy', gender: 'all' },
  { id: 'hh_20', text: 'I tend to feel sluggish and fatigued in the morning, regardless of how much sleep I get.', category: 'thyroid_energy', gender: 'all' },
  { id: 'hh_21', text: 'I notice that my weight fluctuates or is difficult to manage despite consistent eating and exercise.', category: 'thyroid_energy', gender: 'all' },
  { id: 'hh_22', text: 'I tend to experience constipation, dry skin, or hair thinning that doesn\'t respond well to typical remedies.', category: 'thyroid_energy', gender: 'all' },
  { id: 'hh_23', text: 'I notice that my mood feels heavy or low — a persistent low-grade sadness or apathy that\'s hard to shake.', category: 'thyroid_energy', gender: 'all' },
  { id: 'hh_24', text: 'I tend to feel mentally slow — processing information takes more effort than it used to.', category: 'thyroid_energy', gender: 'all' },

  // --- LIBIDO / DRIVE — universal ---
  { id: 'hh_25', text: 'I notice that my desire for physical intimacy has significantly decreased compared to earlier in my life or relationship.', category: 'libido_drive', gender: 'all' },
  { id: 'hh_26', text: 'I tend to feel disconnected from my body — less aware of or responsive to physical sensations and pleasure.', category: 'libido_drive', gender: 'all' },
  { id: 'hh_27', text: 'I notice that I rarely initiate physical intimacy, even when I know it would benefit my relationship.', category: 'libido_drive', gender: 'all' },
  { id: 'hh_28', text: 'I tend to feel like physical intimacy is more of an obligation than something I genuinely look forward to.', category: 'libido_drive', gender: 'all' },
  { id: 'hh_29', text: 'I notice that my physical arousal response is weaker or slower than it used to be.', category: 'libido_drive', gender: 'all' },
  { id: 'hh_30', text: 'I tend to feel that stress, fatigue, or body image concerns significantly dampen my desire for intimacy.', category: 'libido_drive', gender: 'all' },
];

// ═══════════════════════════════════════════════════════════════
// 10. PHYSICAL VITALITY — 25 questions (Scale 1-7)
//     Wellness assessment for physical factors impacting relationships
//     Categories: fitness_activity, weight_body_composition,
//                 nutrition_diet, sleep_recovery, energy_stamina
// ═══════════════════════════════════════════════════════════════
const physicalVitalityQuestions = [
  // --- FITNESS / ACTIVITY (5) ---
  { id: 'pv_1',  text: 'I engage in structured physical exercise — strength training, cardio, or sports — at least three times per week.', category: 'fitness_activity' },
  { id: 'pv_2',  text: 'I tend to move my body throughout the day — walking, stretching, taking stairs — rather than sitting for long unbroken periods.', category: 'fitness_activity' },
  { id: 'pv_3',  text: 'I notice that I feel physically capable and strong in my daily activities — lifting, moving, and keeping up with life\'s demands.', category: 'fitness_activity' },
  { id: 'pv_4',  text: 'I make physical activity a non-negotiable part of my routine, even when life gets busy or stressful.', category: 'fitness_activity' },
  { id: 'pv_5',  text: 'I notice that my cardiovascular fitness allows me to climb stairs, play with kids, or be active without getting winded quickly.', category: 'fitness_activity' },

  // --- WEIGHT / BODY COMPOSITION (5) ---
  { id: 'pv_6',  text: 'I feel generally satisfied with my body composition and how I look and feel physically.', category: 'weight_body_composition' },
  { id: 'pv_7',  text: 'I notice that I feel physically confident and comfortable in intimate situations with my partner.', category: 'weight_body_composition' },
  { id: 'pv_8',  text: 'I tend to maintain a stable, healthy weight without extreme dieting or frequent fluctuations.', category: 'weight_body_composition' },
  { id: 'pv_9',  text: 'I notice that my physical appearance reflects the effort I put into taking care of myself.', category: 'weight_body_composition' },
  { id: 'pv_10', text: 'I feel that my body serves me well — I\'m not limited by physical discomfort, pain, or excess weight in daily life.', category: 'weight_body_composition' },

  // --- NUTRITION / DIET (5) ---
  { id: 'pv_11', text: 'I tend to eat whole, nutritious foods as the foundation of my diet rather than relying on processed or fast food.', category: 'nutrition_diet' },
  { id: 'pv_12', text: 'I notice that I drink enough water throughout the day and rarely feel dehydrated.', category: 'nutrition_diet' },
  { id: 'pv_13', text: 'I tend to eat adequate protein and balanced meals that sustain my energy rather than causing crashes.', category: 'nutrition_diet' },
  { id: 'pv_14', text: 'I notice that I have a healthy relationship with food — I eat mindfully rather than emotionally or compulsively.', category: 'nutrition_diet' },
  { id: 'pv_15', text: 'I tend to limit alcohol, excessive sugar, and other substances that I know undermine my health and energy.', category: 'nutrition_diet' },

  // --- SLEEP / RECOVERY (5) ---
  { id: 'pv_16', text: 'I consistently get 7-9 hours of quality sleep most nights of the week.', category: 'sleep_recovery' },
  { id: 'pv_17', text: 'I notice that I fall asleep relatively easily and wake up feeling genuinely rested.', category: 'sleep_recovery' },
  { id: 'pv_18', text: 'I tend to have a consistent sleep schedule — going to bed and waking up at roughly the same time each day.', category: 'sleep_recovery' },
  { id: 'pv_19', text: 'I notice that I allow my body adequate recovery time after intense physical activity or stressful periods.', category: 'sleep_recovery' },
  { id: 'pv_20', text: 'I tend to wind down before bed with healthy habits rather than screens, stimulants, or work.', category: 'sleep_recovery' },

  // --- ENERGY / STAMINA (5) ---
  { id: 'pv_21', text: 'I notice that I have consistent, sustained energy throughout the day without major crashes or reliance on caffeine.', category: 'energy_stamina' },
  { id: 'pv_22', text: 'I tend to feel physically energized enough to be present and engaged with my partner at the end of the day.', category: 'energy_stamina' },
  { id: 'pv_23', text: 'I notice that my physical stamina allows me to enjoy activities, travel, and adventures without being held back by fatigue.', category: 'energy_stamina' },
  { id: 'pv_24', text: 'I tend to recover quickly from physical exertion — I bounce back rather than being wiped out for days.', category: 'energy_stamina' },
  { id: 'pv_25', text: 'I notice that I have enough physical and mental energy to invest in my relationship, not just survive my daily responsibilities.', category: 'energy_stamina' },
];


// ═══════════════════════════════════════════════════════════════
// QUESTION BANK API
// ═══════════════════════════════════════════════════════════════

const questionBank = {
  attachment: {
    questions: attachmentQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Attachment Style Assessment — Based on "Attached" by Amir Levine. Identifies your attachment patterns: Secure, Anxious, Avoidant, or Fearful-Avoidant.',
    estimatedMinutes: 8,
  },
  personality: {
    questions: personalityQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Personality Type Assessment — Explores your preferences across four dimensions: Energy (E/I), Information (S/N), Decisions (T/F), and Structure (J/P).',
    estimatedMinutes: 10,
  },
  love_language: {
    questions: loveLanguageQuestions,
    scale: null, // forced-choice, not a scale
    description: 'Love Language Assessment — Based on Gary Chapman\'s framework. Identifies how you prefer to give and receive love.',
    estimatedMinutes: 8,
  },
  human_needs: {
    questions: humanNeedsQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Human Needs Assessment — Based on Tony Robbins\' 6 Human Needs. Reveals your core driving needs: Certainty, Variety, Significance, Connection, Growth, Contribution.',
    estimatedMinutes: 10,
  },
  gottman_checkup: {
    questions: gottmanCheckupQuestions,
    scale: { min: 1, max: 5, labels: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] },
    description: 'Gottman Relationship Checkup — Based on the Sound Relationship House. Evaluates relationship health across key dimensions.',
    estimatedMinutes: 12,
  },
  emotional_intelligence: {
    questions: emotionalIntelligenceQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Emotional Intelligence Assessment — Based on Daniel Goleman\'s EQ framework. Measures self-awareness, self-regulation, motivation, empathy, and social skills.',
    estimatedMinutes: 7,
  },
  conflict_style: {
    questions: conflictStyleQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Conflict Style Assessment — Based on the Thomas-Kilmann model. Identifies your primary approach to conflict: Competing, Collaborating, Compromising, Avoiding, or Accommodating.',
    estimatedMinutes: 8,
  },
  differentiation: {
    questions: differentiationQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Differentiation of Self Assessment — Based on Bowen Family Systems and Finlayson-Fife. Measures your ability to maintain a solid sense of self while staying emotionally connected.',
    estimatedMinutes: 6,
  },
  hormonal_health: {
    questions: hormonalHealthQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Hormonal Wellness Assessment — A self-awareness screener for hormonal factors that may impact your energy, mood, libido, and relationship. Not medical advice — a mirror for your body.',
    estimatedMinutes: 8,
  },
  physical_vitality: {
    questions: physicalVitalityQuestions,
    scale: { min: 1, max: 7, labels: ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'] },
    description: 'Physical Vitality Assessment — Evaluates your fitness, nutrition, sleep, energy, and body confidence. Your physical health IS your relationship health.',
    estimatedMinutes: 7,
  },
};

/**
 * Get questions for a given assessment type
 * @param {string} type - Assessment type key
 * @param {string} [userGender] - Optional gender to filter gender-specific questions ('male', 'female')
 * @returns {Object} - { questions, scale, description, estimatedMinutes }
 */
function getQuestions(type, userGender) {
  const assessment = questionBank[type];
  if (!assessment) {
    throw new Error(`Unknown assessment type: "${type}". Valid types: ${Object.keys(questionBank).join(', ')}`);
  }

  let questions = assessment.questions;

  // Filter hormonal_health questions by gender if provided
  if (type === 'hormonal_health' && userGender) {
    const normalizedGender = userGender.toLowerCase();
    if (normalizedGender === 'male' || normalizedGender === 'female') {
      questions = questions.filter(q => {
        if (!q.gender || q.gender === 'all') return true;
        return q.gender === normalizedGender;
      });
    }
    // If gender is 'other', 'prefer_not_to_say', or unset — show all questions
  }

  return {
    type,
    ...assessment,
    questions,
  };
}

/**
 * Get all available assessment types with metadata (no questions)
 * @returns {Array} - [{ type, description, questionCount, estimatedMinutes }]
 */
function getAvailableAssessments() {
  return Object.entries(questionBank).map(([type, data]) => ({
    type,
    description: data.description,
    questionCount: data.questions.length,
    estimatedMinutes: data.estimatedMinutes,
    hasScale: !!data.scale,
  }));
}

/**
 * Validate responses against a question bank
 * @param {string} type - Assessment type
 * @param {Object} responses - User responses
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateResponses(type, responses) {
  const assessment = questionBank[type];
  if (!assessment) return { valid: false, errors: [`Unknown type: ${type}`] };

  const errors = [];
  const questionIds = new Set(assessment.questions.map(q => q.id));

  // Check for missing questions
  for (const id of questionIds) {
    if (!(id in responses)) {
      errors.push(`Missing response for question ${id}`);
    }
  }

  // Validate response values
  if (assessment.scale) {
    for (const [id, value] of Object.entries(responses)) {
      if (!questionIds.has(id)) continue;
      const num = Number(value);
      if (isNaN(num) || num < assessment.scale.min || num > assessment.scale.max) {
        errors.push(`Invalid value for ${id}: ${value} (expected ${assessment.scale.min}-${assessment.scale.max})`);
      }
    }
  } else {
    // Forced choice (love_language) — expect 'A' or 'B'
    for (const [id, value] of Object.entries(responses)) {
      if (!questionIds.has(id)) continue;
      if (value !== 'A' && value !== 'B') {
        errors.push(`Invalid choice for ${id}: ${value} (expected 'A' or 'B')`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  getQuestions,
  getAvailableAssessments,
  validateResponses,
  questionBank,
};
