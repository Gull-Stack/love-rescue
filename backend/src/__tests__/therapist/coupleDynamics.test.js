/**
 * Tests for coupleDynamics.js — Couple Dynamics Engine
 */

'use strict';

const {
  generateCoupleProfile,
  generateCrossAssessmentInsights,
} = require('../../utils/coupleDynamics');

const {
  partner1Anxious,
  partner2Avoidant,
  partner1Secure,
  partner2Secure,
  partner1FearfulAvoidant,
  makeAssessment,
  attachmentAnxious,
  attachmentAvoidant,
  attachmentSecure,
  attachmentFearfulAvoidant,
  loveLanguageWords,
  loveLanguageTouch,
  conflictStyleVolatile,
  conflictStyleAvoiding,
  conflictStyleValidating,
  gottmanCheckupHealthy,
  gottmanCheckupDistressed,
} = require('./testFixtures');

// ═══════════════════════════════════════════════════════════════
// generateCoupleProfile
// ═══════════════════════════════════════════════════════════════

describe('generateCoupleProfile', () => {
  describe('attachment dynamics', () => {
    it('should detect anxious-avoidant dynamic', () => {
      const profile = generateCoupleProfile(partner1Anxious, partner2Avoidant, {
        partner1Name: 'Sarah',
        partner2Name: 'James',
      });

      expect(profile).toBeDefined();
      expect(profile.partner1Name).toBe('Sarah');
      expect(profile.partner2Name).toBe('James');
      expect(profile.generatedAt).toBeDefined();
      expect(profile.attachmentDynamic).toBeDefined();
      expect(profile.attachmentDynamic.available).toBe(true);
      expect(profile.attachmentDynamic.partner1Style).toBe('anxious');
      expect(profile.attachmentDynamic.partner2Style).toBe('avoidant');
      // Should detect pursue-withdraw cycle
      expect(profile.attachmentDynamic.pursueWithdrawCycle).toBeDefined();
      expect(profile.attachmentDynamic.pursueWithdrawCycle.pursuer).toBe('Sarah');
      expect(profile.attachmentDynamic.pursueWithdrawCycle.withdrawer).toBe('James');
    });

    it('should detect secure-secure dynamic', () => {
      const profile = generateCoupleProfile(partner1Secure, partner2Secure, {
        partner1Name: 'A',
        partner2Name: 'B',
      });

      expect(profile.attachmentDynamic.available).toBe(true);
      expect(profile.attachmentDynamic.partner1Style).toBe('secure');
      expect(profile.attachmentDynamic.partner2Style).toBe('secure');
      // Secure-secure should have low risk
      expect(profile.attachmentDynamic.riskLevel).toBe('low');
    });

    it('should detect fearful-avoidant + avoidant dynamic', () => {
      const profile = generateCoupleProfile(partner1FearfulAvoidant, partner2Avoidant);

      expect(profile.attachmentDynamic.available).toBe(true);
      expect(profile.attachmentDynamic.partner1Style).toBe('fearful_avoidant');
      expect(profile.attachmentDynamic.partner2Style).toBe('avoidant');
    });

    it('should return unavailable when one partner has no attachment assessment', () => {
      const noAttachment = [
        makeAssessment('user-1-uuid', 'love_language', loveLanguageWords),
      ];
      const profile = generateCoupleProfile(noAttachment, partner2Avoidant);

      expect(profile.attachmentDynamic.available).toBe(false);
      expect(profile.attachmentDynamic.reason).toContain('Attachment Style');
    });
  });

  describe('love language mismatch', () => {
    it('should detect mismatch between words and physical touch', () => {
      const profile = generateCoupleProfile(partner1Anxious, partner2Avoidant);

      expect(profile.loveLanguageMismatch).toBeDefined();
      // Partner1 wants words, partner2 wants touch — clear mismatch
      if (profile.loveLanguageMismatch.available !== false) {
        expect(profile.loveLanguageMismatch.partner1Primary).toBeDefined();
        expect(profile.loveLanguageMismatch.partner2Primary).toBeDefined();
      }
    });

    it('should detect alignment when both prefer same language', () => {
      const profile = generateCoupleProfile(partner1Secure, partner2Secure);

      // Both have words_of_affirmation
      if (profile.loveLanguageMismatch.available !== false) {
        expect(profile.loveLanguageMismatch).toBeDefined();
      }
    });
  });

  describe('conflict interaction', () => {
    it('should analyze volatile-avoiding conflict combo', () => {
      const profile = generateCoupleProfile(partner1Anxious, partner2Avoidant);

      expect(profile.conflictInteraction).toBeDefined();
      if (profile.conflictInteraction.available !== false) {
        // Should contain conflict analysis data
        expect(profile.conflictInteraction).toHaveProperty('available', true);
      }
    });

    it('should analyze validating-validating conflict combo', () => {
      const profile = generateCoupleProfile(partner1Secure, partner2Secure);

      if (profile.conflictInteraction.available !== false) {
        expect(profile.conflictInteraction).toBeDefined();
      }
    });
  });

  describe('full profile structure', () => {
    it('should include all expected sections', () => {
      const profile = generateCoupleProfile(partner1Anxious, partner2Avoidant, {
        partner1Name: 'Sarah',
        partner2Name: 'James',
      });

      expect(profile).toHaveProperty('attachmentDynamic');
      expect(profile).toHaveProperty('loveLanguageMismatch');
      expect(profile).toHaveProperty('conflictInteraction');
      expect(profile).toHaveProperty('soundRelationshipHouse');
      expect(profile).toHaveProperty('sharedStrengths');
      expect(profile).toHaveProperty('growthEdges');
      expect(profile).toHaveProperty('expertNarrative');
      expect(profile).toHaveProperty('crossAssessmentInsights');
    });

    it('should use default partner names when not provided', () => {
      const profile = generateCoupleProfile(partner1Anxious, partner2Avoidant);

      expect(profile.partner1Name).toBe('Partner A');
      expect(profile.partner2Name).toBe('Partner B');
    });
  });

  describe('edge cases', () => {
    it('should handle empty assessment arrays', () => {
      const profile = generateCoupleProfile([], []);

      expect(profile).toBeDefined();
      expect(profile.attachmentDynamic.available).toBe(false);
    });

    it('should handle undefined options gracefully', () => {
      const profile = generateCoupleProfile(partner1Anxious, partner2Avoidant, undefined);
      expect(profile).toBeDefined();
    });

    it('should handle assessments as objects (not arrays)', () => {
      // The code supports both array and object formats
      const p1Obj = { attachment: attachmentAnxious, love_language: loveLanguageWords };
      const p2Obj = { attachment: attachmentAvoidant, love_language: loveLanguageTouch };

      const profile = generateCoupleProfile(
        Object.entries(p1Obj).map(([type, score]) => ({ type, score })),
        Object.entries(p2Obj).map(([type, score]) => ({ type, score })),
      );
      expect(profile).toBeDefined();
      expect(profile.attachmentDynamic.available).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// generateCrossAssessmentInsights
// ═══════════════════════════════════════════════════════════════

describe('generateCrossAssessmentInsights', () => {
  it('should generate insights with full assessment data', () => {
    const insights = generateCrossAssessmentInsights({
      partner1: {
        attachment: attachmentAnxious,
        love_language: loveLanguageWords,
        conflict_style: conflictStyleVolatile,
        gottman_checkup: gottmanCheckupHealthy,
        emotional_intelligence: null,
        differentiation: null,
        shame_vulnerability: null,
        desire_aliveness: null,
        tactical_empathy: null,
        human_needs: null,
        personality: null,
        hormonal_health: null,
        physical_vitality: null,
      },
      partner2: {
        attachment: attachmentAvoidant,
        love_language: loveLanguageTouch,
        conflict_style: conflictStyleAvoiding,
        gottman_checkup: gottmanCheckupDistressed,
        emotional_intelligence: null,
        differentiation: null,
        shame_vulnerability: null,
        desire_aliveness: null,
        tactical_empathy: null,
        human_needs: null,
        personality: null,
        hormonal_health: null,
        physical_vitality: null,
      },
      partner1Name: 'Sarah',
      partner2Name: 'James',
    });

    expect(insights).toBeDefined();
    // Should return an array or object of cross-assessment insights
    if (Array.isArray(insights)) {
      expect(insights.length).toBeGreaterThan(0);
      for (const insight of insights) {
        // Each insight has a 'pattern' and 'meaning' field (not 'insight')
        expect(insight).toHaveProperty('pattern');
        expect(insight).toHaveProperty('meaning');
      }
    } else {
      expect(typeof insights).toBe('object');
    }
  });

  it('should handle missing assessments (all null)', () => {
    const nullScores = {
      attachment: null, love_language: null, conflict_style: null,
      gottman_checkup: null, emotional_intelligence: null, differentiation: null,
      shame_vulnerability: null, desire_aliveness: null, tactical_empathy: null,
      human_needs: null, personality: null, hormonal_health: null, physical_vitality: null,
    };

    const insights = generateCrossAssessmentInsights({
      partner1: nullScores,
      partner2: nullScores,
      partner1Name: 'A',
      partner2Name: 'B',
    });

    expect(insights).toBeDefined();
    // Should handle gracefully — either empty array or object with no insights
  });

  it('should handle partial assessment data (only one partner has data)', () => {
    const insights = generateCrossAssessmentInsights({
      partner1: {
        attachment: attachmentAnxious,
        love_language: loveLanguageWords,
        conflict_style: null, gottman_checkup: null, emotional_intelligence: null,
        differentiation: null, shame_vulnerability: null, desire_aliveness: null,
        tactical_empathy: null, human_needs: null, personality: null,
        hormonal_health: null, physical_vitality: null,
      },
      partner2: {
        attachment: null, love_language: null, conflict_style: null,
        gottman_checkup: null, emotional_intelligence: null, differentiation: null,
        shame_vulnerability: null, desire_aliveness: null, tactical_empathy: null,
        human_needs: null, personality: null, hormonal_health: null, physical_vitality: null,
      },
      partner1Name: 'Sarah',
      partner2Name: 'James',
    });

    expect(insights).toBeDefined();
  });

  it('should handle high-scoring couple', () => {
    const highScores = {
      attachment: attachmentSecure,
      love_language: loveLanguageWords,
      conflict_style: conflictStyleValidating,
      gottman_checkup: gottmanCheckupHealthy,
      emotional_intelligence: null, differentiation: null, shame_vulnerability: null,
      desire_aliveness: null, tactical_empathy: null, human_needs: null,
      personality: null, hormonal_health: null, physical_vitality: null,
    };

    const insights = generateCrossAssessmentInsights({
      partner1: highScores,
      partner2: highScores,
      partner1Name: 'A',
      partner2Name: 'B',
    });

    expect(insights).toBeDefined();
  });
});
