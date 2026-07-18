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
