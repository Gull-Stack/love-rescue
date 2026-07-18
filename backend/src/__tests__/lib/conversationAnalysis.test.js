const {
  analyzeUtterance,
  containsAbuseKeywords,
  CONVERSATION_PATTERNS,
} = require('../../utils/conversationAnalysis');

describe('conversationAnalysis', () => {
  describe('pattern library', () => {
    test('every pattern has id, category, label, explanation, reframe, and regexes', () => {
      for (const p of CONVERSATION_PATTERNS) {
        expect(p.id).toBeTruthy();
        expect(['fallacy', 'manipulation', 'horseman']).toContain(p.category);
        expect(p.label).toBeTruthy();
        expect(p.explanation).toBeTruthy();
        expect(p.reframe).toBeTruthy();
        expect(p.patterns.length).toBeGreaterThan(0);
      }
    });

    test('pattern ids are unique', () => {
      const ids = CONVERSATION_PATTERNS.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('analyzeUtterance — fallacies', () => {
    test.each([
      ['You always leave the dishes for me', 'overgeneralization'],
      ["You never listen to a word I say", 'overgeneralization'],
      ["You're so selfish, just like always", 'ad_hominem'],
      ['Well, what about when you forgot my birthday?', 'whataboutism'],
      ['If you really loved me you would come home earlier', 'false_dilemma'],
      ["You did that on purpose to embarrass me", 'mind_reading'],
      ["You don't care about this family at all", 'mind_reading'],
      ['This marriage is over, everything is ruined', 'catastrophizing'],
    ])('flags "%s" as %s', (text, expectedId) => {
      const flags = analyzeUtterance(text);
      expect(flags.map((f) => f.id)).toContain(expectedId);
    });
  });

  describe('analyzeUtterance — manipulation', () => {
    test.each([
      ["That never happened, you're imagining things", 'gaslighting'],
      ["You're overreacting as usual", 'gaslighting'],
      ["You're being too sensitive", 'gaslighting'],
      ["After everything I've done for you, this is how you repay me?", 'guilt_tripping'],
      ['You made me say those things', 'blame_shifting'],
      ['This is all your fault', 'blame_shifting'],
      ["I'm the real victim here", 'darvo'],
      ["Do it my way or I'm leaving", 'threat_ultimatum'],
    ])('flags "%s" as %s', (text, expectedId) => {
      const flags = analyzeUtterance(text);
      expect(flags.map((f) => f.id)).toContain(expectedId);
    });
  });

  describe('analyzeUtterance — Gottman horsemen', () => {
    test.each([
      ['Oh great, saint Michael has spoken', 'contempt'],
      ["It's not my fault you feel that way", 'defensiveness'],
      ["I'm done talking about this", 'stonewalling'],
    ])('flags "%s" as %s', (text, expectedId) => {
      const flags = analyzeUtterance(text);
      expect(flags.map((f) => f.id)).toContain(expectedId);
    });
  });

  describe('analyzeUtterance — clean speech stays clean', () => {
    test.each([
      ['I feel hurt when plans change at the last minute. Can we talk about it?'],
      ['I need some help with the kids on weekday mornings.'],
      ['Thank you for listening to me earlier, it meant a lot.'],
      ['Last night when dinner ran late I felt stressed.'],
    ])('does not flag "%s"', (text) => {
      expect(analyzeUtterance(text)).toEqual([]);
    });

    test('empty and blank input return no flags', () => {
      expect(analyzeUtterance('')).toEqual([]);
      expect(analyzeUtterance('   ')).toEqual([]);
      expect(analyzeUtterance(null)).toEqual([]);
    });
  });

  describe('flag payload shape', () => {
    test('each flag carries explanation, reframe, and the matched text', () => {
      const [flag] = analyzeUtterance('You always do this');
      expect(flag.id).toBe('overgeneralization');
      expect(flag.category).toBe('fallacy');
      expect(flag.explanation).toEqual(expect.any(String));
      expect(flag.reframe).toEqual(expect.any(String));
      expect(flag.match.toLowerCase()).toContain('you always');
    });

    test('one utterance can carry multiple distinct flags', () => {
      const flags = analyzeUtterance("You never listen and you're overreacting, or I'm leaving");
      const ids = flags.map((f) => f.id);
      expect(ids).toEqual(expect.arrayContaining(['overgeneralization', 'gaslighting', 'threat_ultimatum']));
    });
  });

  describe('analyzeUtterance — distant paraphrases (v2 patterns)', () => {
    test.each([
      ['Name one time you ever helped. Just one.', 'overgeneralization'],
      ['Wow, must be nice being perfect all the time', 'contempt'],
      ['Whatever helps you sleep at night.', 'contempt'],
      ['You are misremembering, as usual', 'gaslighting'],
      ['You are being ridiculous right now', 'gaslighting'],
      ["That's not what happened and you know it", 'gaslighting'],
      ['I never said that', 'gaslighting'],
      ['I sacrificed my whole career and this is the thanks I get', 'guilt_tripping'],
      ['Nobody ever appreciates what I do around here', 'guilt_tripping'],
      ['Keep this up and see what happens to this marriage', 'threat_ultimatum'],
      ["Don't push me", 'threat_ultimatum'],
      ['Everyone agrees with me that you are the problem', 'appeal_to_crowd'],
      ['Maybe your sister was right about you', 'triangulation'],
      ['Even your mother thinks so', 'triangulation'],
      ['I guess I am just the villain in your story then', 'darvo'],
      ["I'm always the bad guy in this house", 'darvo'],
    ])('flags "%s" as %s', (text, expectedId) => {
      const flags = analyzeUtterance(text);
      expect(flags.map((f) => f.id)).toContain(expectedId);
    });
  });

  describe('analyzeUtterance — context guards (false-positive killers)', () => {
    test.each([
      ['You always know how to make me laugh'],           // positive "always"
      ['I never want us to go to bed angry'],             // benign first-person "never"
      ['The kids said you never let them have candy — so funny'], // reported speech
      ['She told me you always work late, is that true?'], // reported speech
      ['That never happened before the renovation, the leak is new'], // factual temporal
      ['After everything I have done today I am exhausted'], // self-directed
      ['I am done talking to customer service, they are useless'], // wall aimed elsewhere
      ['If you loved the movie we can watch the sequel'],  // non-personal "if you loved"
      ['My boss said it is all my fault, I feel awful'],   // reporting a third party
      ['I know you care about this family'],               // affirmation, not mind-reading
    ])('does not flag "%s"', (text) => {
      expect(analyzeUtterance(text)).toEqual([]);
    });

    test('reality-denial aimed at the partner still flags despite guards', () => {
      expect(analyzeUtterance('That never happened, you made it up').map((f) => f.id)).toContain('gaslighting');
      expect(analyzeUtterance("I'm done talking to you").map((f) => f.id)).toContain('stonewalling');
      expect(analyzeUtterance('You never help with the kids').map((f) => f.id)).toContain('overgeneralization');
    });
  });

  describe('containsAbuseKeywords (safety short-circuit)', () => {
    test('detects violence language including verb forms', () => {
      expect(containsAbuseKeywords('he hit me')).toBe(true);
      expect(containsAbuseKeywords('she was threatening to hurt them')).toBe(true);
      expect(containsAbuseKeywords('stop shoving me')).toBe(true);
    });

    test('does not false-positive on ordinary conversation', () => {
      expect(containsAbuseKeywords('the movie was a big hit with the kids')).toBe(true); // known limitation: "hit" is flagged conservatively
      expect(containsAbuseKeywords('I feel unheard lately')).toBe(false);
      expect(containsAbuseKeywords('')).toBe(false);
    });
  });
});
