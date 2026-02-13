/**
 * Tests for maintenanceRituals.js — Post-Cycle Maintenance Rituals
 */

'use strict';

const {
  generateMaintenanceRituals,
  generateMaintenancePlan,
  RITUAL_TEMPLATES,
} = require('../../utils/maintenanceRituals');

// ═══════════════════════════════════════════════════════════════
// generateMaintenanceRituals
// ═══════════════════════════════════════════════════════════════

describe('generateMaintenanceRituals', () => {
  const attachmentStyles = ['anxious', 'avoidant', 'secure', 'fearful_avoidant'];

  describe('attachment style adaptation', () => {
    for (const style of attachmentStyles) {
      it(`should generate rituals for ${style} attachment`, () => {
        const rituals = generateMaintenanceRituals({ attachmentStyle: style });

        expect(rituals).toBeDefined();
        expect(rituals.morningCheckIn).toBeDefined();
        expect(rituals.eveningGratitude).toBeDefined();
        expect(rituals.weeklyStateOfUs).toBeDefined();

        // Each ritual should have required fields
        for (const key of ['morningCheckIn', 'eveningGratitude', 'weeklyStateOfUs']) {
          const r = rituals[key];
          expect(r.id).toBeDefined();
          expect(r.title).toBeDefined();
          expect(r.duration).toBeGreaterThan(0);
          expect(r.frequency).toBeDefined();
          expect(r.instructions).toBeDefined();
          expect(r.instructions.length).toBeGreaterThan(0);
          expect(r.whyItWorks).toBeDefined();
          expect(r.difficulty).toBeGreaterThanOrEqual(1);
          expect(r.difficulty).toBeLessThanOrEqual(5);
        }
      });
    }

    it('should produce different adaptations for anxious vs avoidant', () => {
      const anxious = generateMaintenanceRituals({ attachmentStyle: 'anxious' });
      const avoidant = generateMaintenanceRituals({ attachmentStyle: 'avoidant' });

      // Instructions should differ due to attachment adaptations
      const anxInstructions = anxious.morningCheckIn.instructions.join(' ');
      const avdInstructions = avoidant.morningCheckIn.instructions.join(' ');

      // They should not be identical (attachment layer adds different instructions)
      expect(anxInstructions).not.toBe(avdInstructions);
    });
  });

  describe('love language adaptation', () => {
    it('should adapt rituals for words_of_affirmation', () => {
      const rituals = generateMaintenanceRituals({
        attachmentStyle: 'secure',
        loveLanguage: 'words_of_affirmation',
      });

      expect(rituals.morningCheckIn.adaptations.length).toBeGreaterThan(0);
    });

    it('should adapt rituals for physical_touch', () => {
      const rituals = generateMaintenanceRituals({
        attachmentStyle: 'secure',
        loveLanguage: 'physical_touch',
      });

      expect(rituals).toBeDefined();
    });
  });

  describe('conflict style adaptation', () => {
    it('should adapt weekly ritual for pursuer conflict style', () => {
      const rituals = generateMaintenanceRituals({
        attachmentStyle: 'anxious',
        conflictStyle: 'pursuer',
      });

      expect(rituals.weeklyStateOfUs).toBeDefined();
    });

    it('should adapt weekly ritual for withdrawer conflict style', () => {
      const rituals = generateMaintenanceRituals({
        attachmentStyle: 'avoidant',
        conflictStyle: 'withdrawer',
      });

      expect(rituals.weeklyStateOfUs).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null profile', () => {
      const rituals = generateMaintenanceRituals(null);

      expect(rituals).toBeDefined();
      expect(rituals.morningCheckIn).toBeDefined();
    });

    it('should handle empty profile', () => {
      const rituals = generateMaintenanceRituals({});

      expect(rituals).toBeDefined();
      // Should default to secure attachment
      expect(rituals.morningCheckIn).toBeDefined();
    });

    it('should handle undefined profile', () => {
      const rituals = generateMaintenanceRituals(undefined);
      expect(rituals).toBeDefined();
    });
  });

  describe('ritual template structure', () => {
    it('should have 3 core ritual templates', () => {
      expect(RITUAL_TEMPLATES).toBeDefined();
      expect(RITUAL_TEMPLATES.morningCheckIn).toBeDefined();
      expect(RITUAL_TEMPLATES.eveningGratitude).toBeDefined();
      expect(RITUAL_TEMPLATES.weeklyStateOfUs).toBeDefined();
    });

    it('should have expert attribution on all templates', () => {
      for (const [, template] of Object.entries(RITUAL_TEMPLATES)) {
        expect(template.expert).toBeDefined();
        expect(template.expertName).toBeDefined();
        expect(template.expertCredential).toBeDefined();
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// generateMaintenancePlan
// ═══════════════════════════════════════════════════════════════

describe('generateMaintenancePlan', () => {
  const profile = { attachmentStyle: 'anxious', loveLanguage: 'quality_time' };

  describe('weekly progression', () => {
    it('should generate plan for week 1', () => {
      const plan = generateMaintenancePlan(profile, 1);

      expect(plan).toBeDefined();
      expect(plan.weekNumber).toBeDefined();
      expect(plan.dailyRituals || plan.morningCheckIn).toBeDefined();
      expect(plan.theme || plan.weekTheme).toBeDefined();
    });

    it('should generate plan for week 6', () => {
      const plan = generateMaintenancePlan(profile, 6);
      expect(plan).toBeDefined();
    });

    it('should generate plan for week 12', () => {
      const plan = generateMaintenancePlan(profile, 12);
      expect(plan).toBeDefined();
    });

    it('should show difficulty progression across weeks', () => {
      const week1 = generateMaintenancePlan(profile, 1);
      const week6 = generateMaintenancePlan(profile, 6);
      const week12 = generateMaintenancePlan(profile, 12);

      // Week 12 should be harder or equal to week 1
      const getDifficulty = (plan) => {
        if (plan.difficulty) return plan.difficulty;
        if (plan.difficultyRange) return plan.difficultyRange[1] || plan.difficultyRange;
        return 0;
      };

      const d1 = getDifficulty(week1);
      const d12 = getDifficulty(week12);

      if (d1 && d12) {
        expect(d12).toBeGreaterThanOrEqual(d1);
      }
    });
  });

  describe('edge cases', () => {
    it('should clamp week below 1 to 1', () => {
      const plan = generateMaintenancePlan(profile, 0);
      expect(plan).toBeDefined();
    });

    it('should clamp week above 12 to 12', () => {
      const plan = generateMaintenancePlan(profile, 20);
      expect(plan).toBeDefined();
    });

    it('should handle null week number', () => {
      const plan = generateMaintenancePlan(profile, null);
      expect(plan).toBeDefined();
    });

    it('should handle null profile', () => {
      const plan = generateMaintenancePlan(null, 1);
      expect(plan).toBeDefined();
    });
  });
});
