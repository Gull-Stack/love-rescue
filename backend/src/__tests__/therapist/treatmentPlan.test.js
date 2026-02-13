/**
 * Tests for treatmentPlan.js — Treatment Plan Builder
 */

'use strict';

const {
  generateTreatmentPlanOptions,
  createTreatmentPlan,
  getTreatmentPlanProgress,
  MODULE_LIBRARY,
  APPROACH_MAPPINGS,
} = require('../../utils/treatmentPlan');

// ═══════════════════════════════════════════════════════════════
// generateTreatmentPlanOptions
// ═══════════════════════════════════════════════════════════════

describe('generateTreatmentPlanOptions', () => {
  const mockProfile = {
    attachmentStyle: 'anxious',
    dominantHorseman: 'criticism',
    conflictScore: 35,
    friendshipScore: 40,
    communicationScore: 30,
    focusAreas: ['attachment', 'conflict', 'communication'],
  };

  describe('therapeutic approaches', () => {
    it('should generate options for EFT approach', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'eft');

      expect(options).toBeDefined();
      expect(options.therapistApproach).toContain('EFT');
      expect(options.primaryExperts).toContain('johnson');
      expect(options.recommended).toBeDefined();
      expect(options.suggested).toBeDefined();
      expect(options.available).toBeDefined();
      expect(options.crisisModules).toBeDefined();
      expect(options.crisisModules.length).toBeGreaterThan(0);
    });

    it('should generate options for Gottman approach', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'gottman');

      expect(options.therapistApproach).toContain('Gottman');
      expect(options.primaryExperts).toContain('gottman');
    });

    it('should generate options for CBT approach', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'cbt');

      expect(options).toBeDefined();
      expect(options.recommended).toBeDefined();
    });

    it('should default to integrative for unknown approach', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'unknown_approach');

      expect(options).toBeDefined();
      // Should fall back to integrative
      expect(options.recommended.length + options.suggested.length + options.available.length).toBeGreaterThan(0);
    });

    it('should default to integrative for null approach', () => {
      const options = generateTreatmentPlanOptions(mockProfile, null);

      expect(options).toBeDefined();
    });
  });

  describe('recommendation scoring', () => {
    it('should prioritize attachment modules for anxious attachment profiles', () => {
      const profile = { attachmentStyle: 'anxious', focusAreas: ['attachment'] };
      const options = generateTreatmentPlanOptions(profile, 'eft');

      // Recommended should have high-relevance modules
      if (options.recommended.length > 0) {
        expect(options.recommended[0].relevanceScore).toBeGreaterThanOrEqual(40);
      }
    });

    it('should sort recommendations by relevance score descending', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'integrative');

      for (const category of ['recommended', 'suggested', 'available']) {
        const items = options[category];
        for (let i = 1; i < items.length; i++) {
          expect(items[i].relevanceScore).toBeLessThanOrEqual(items[i - 1].relevanceScore);
        }
      }
    });

    it('should include rationale for each recommendation', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'eft');

      for (const mod of [...options.recommended, ...options.suggested]) {
        expect(mod.rationale).toBeDefined();
        expect(typeof mod.rationale).toBe('string');
        expect(mod.rationale.length).toBeGreaterThan(0);
      }
    });

    it('should include approach alignment label', () => {
      const options = generateTreatmentPlanOptions(mockProfile, 'eft');

      for (const mod of options.recommended) {
        expect(['core', 'aligned', 'complementary', 'supplementary']).toContain(mod.approachAlignment);
      }
    });
  });

  describe('crisis modules', () => {
    it('should always include crisis modules regardless of approach', () => {
      const approaches = ['eft', 'gottman', 'cbt', 'integrative'];

      for (const approach of approaches) {
        const options = generateTreatmentPlanOptions({}, approach);
        expect(options.crisisModules.length).toBeGreaterThan(0);

        // Each crisis module should have a rationale
        for (const mod of options.crisisModules) {
          expect(mod.category).toBe('crisis');
          expect(mod.rationale).toBeDefined();
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined coupleProfile', () => {
      const options = generateTreatmentPlanOptions(null, 'eft');
      expect(options).toBeDefined();
      expect(options.recommended).toBeDefined();
    });

    it('should handle empty profile', () => {
      const options = generateTreatmentPlanOptions({}, 'integrative');
      expect(options).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// createTreatmentPlan
// ═══════════════════════════════════════════════════════════════

describe('createTreatmentPlan', () => {
  const validModuleIds = ['week-1-self-awareness', 'week-2-communication', 'week-3-emotional-regulation'];

  it('should create a plan with valid modules', () => {
    const plan = createTreatmentPlan('therapist-1', 'couple-1', validModuleIds);

    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(plan.id).toMatch(/^tp_/);
    expect(plan.therapistId).toBe('therapist-1');
    expect(plan.coupleId).toBe('couple-1');
    expect(plan.status).toBe('draft');
    expect(plan.weeklyPlan).toBeDefined();
    expect(plan.weeklyPlan.length).toBe(3);
    expect(plan.checkpoints).toBeDefined();
    expect(plan.checkpoints.length).toBeGreaterThanOrEqual(2); // baseline + completion
    expect(plan.milestones).toBeDefined();
    expect(plan.summary).toBeDefined();
  });

  it('should respect pace multiplier', () => {
    const normalPlan = createTreatmentPlan('t1', 'c1', validModuleIds);
    const fastPlan = createTreatmentPlan('t1', 'c1', validModuleIds, { paceMultiplier: 1.5 });
    const slowPlan = createTreatmentPlan('t1', 'c1', validModuleIds, { paceMultiplier: 0.5 });

    expect(fastPlan.totalDays).toBeLessThan(normalPlan.totalDays);
    expect(slowPlan.totalDays).toBeGreaterThan(normalPlan.totalDays);
  });

  it('should skip modules marked in overrides', () => {
    const plan = createTreatmentPlan('t1', 'c1', validModuleIds, {
      moduleOverrides: {
        'week-2-communication': { skip: true },
      },
    });

    expect(plan.weeklyPlan.length).toBe(2);
    expect(plan.weeklyPlan.find(w => w.moduleId === 'week-2-communication')).toBeUndefined();
  });

  it('should apply custom plan name and notes', () => {
    const plan = createTreatmentPlan('t1', 'c1', validModuleIds, {
      planName: 'Anxiety-Focused Treatment',
      planNotes: 'Couple presenting with anxious-avoidant cycle',
    });

    expect(plan.name).toBe('Anxiety-Focused Treatment');
    expect(plan.notes).toBe('Couple presenting with anxious-avoidant cycle');
  });

  it('should include difficulty progression', () => {
    const plan = createTreatmentPlan('t1', 'c1', validModuleIds);

    expect(plan.difficultyProgression).toBeDefined();
    expect(plan.difficultyProgression.length).toBe(3);
    // Week 1 difficulty should be lower than week 3
    expect(plan.difficultyProgression[0].difficulty).toBeLessThanOrEqual(
      plan.difficultyProgression[2].difficulty
    );
  });

  it('should include summary with experts and skills', () => {
    const plan = createTreatmentPlan('t1', 'c1', validModuleIds);

    expect(plan.summary.stages.length).toBeGreaterThan(0);
    expect(plan.summary.expertsCovered.length).toBeGreaterThan(0);
    expect(plan.summary.skillsCovered.length).toBeGreaterThan(0);
    expect(plan.summary.assessmentsTracked.length).toBeGreaterThan(0);
  });

  describe('edge cases', () => {
    it('should handle empty module list', () => {
      const plan = createTreatmentPlan('t1', 'c1', []);

      expect(plan).toBeDefined();
      expect(plan.weeklyPlan.length).toBe(0);
      expect(plan.totalDays).toBe(0);
    });

    it('should filter out invalid module IDs', () => {
      const plan = createTreatmentPlan('t1', 'c1', ['nonexistent-module', 'week-1-self-awareness']);

      expect(plan.weeklyPlan.length).toBe(1);
      expect(plan.weeklyPlan[0].moduleId).toBe('week-1-self-awareness');
    });

    it('should handle missing customizations', () => {
      const plan = createTreatmentPlan('t1', 'c1', validModuleIds, undefined);
      expect(plan).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// getTreatmentPlanProgress
// ═══════════════════════════════════════════════════════════════

describe('getTreatmentPlanProgress', () => {
  let testPlan;

  beforeEach(() => {
    testPlan = createTreatmentPlan('t1', 'c1', [
      'week-1-self-awareness',
      'week-2-communication',
    ]);
  });

  it('should compute progress at day 0', () => {
    const progress = getTreatmentPlanProgress(testPlan, { currentDay: 0 });

    expect(progress).toBeDefined();
    expect(progress.planId).toBe(testPlan.id);
    expect(progress.currentDay).toBe(0);
    expect(progress.percentComplete).toBe(0);
    expect(progress.overallModuleCompletion).toBe(0);
    expect(progress.moduleProgress).toBeDefined();
    expect(progress.progressNote).toBeDefined();
  });

  it('should compute progress midway through plan', () => {
    const midDay = Math.ceil(testPlan.totalDays / 2);
    const progress = getTreatmentPlanProgress(testPlan, {
      currentDay: midDay,
      completedActivities: [
        { moduleId: 'week-1-self-awareness', activityId: 'a1', completedAt: new Date() },
        { moduleId: 'week-1-self-awareness', activityId: 'a2', completedAt: new Date() },
      ],
    });

    expect(progress.currentDay).toBe(midDay);
    expect(progress.percentComplete).toBeGreaterThan(0);
    expect(progress.activitiesCompleted).toBe(2);
  });

  it('should track milestone achievements', () => {
    const progress = getTreatmentPlanProgress(testPlan, {
      currentDay: testPlan.totalDays,
      milestoneAchievements: [
        { moduleId: 'week-1-self-awareness', name: 'Attachment Style Identified', achievedAt: new Date() },
      ],
    });

    expect(progress.milestonesAchieved).toBe(1);
    expect(progress.milestoneStatus.find(
      m => m.name === 'Attachment Style Identified'
    )?.status).toBe('achieved');
  });

  it('should compute score changes from assessment data', () => {
    const progress = getTreatmentPlanProgress(testPlan, {
      currentDay: testPlan.totalDays,
      assessmentScores: [
        { type: 'attachment', score: { total: 50 }, completedAt: new Date(Date.now() - 30 * 86400000) },
        { type: 'attachment', score: { total: 70 }, completedAt: new Date() },
      ],
    });

    expect(progress.scoreChanges).toBeDefined();
  });

  it('should generate auto progress note', () => {
    const progress = getTreatmentPlanProgress(testPlan, {
      currentDay: 7,
      completedActivities: [
        { moduleId: 'week-1-self-awareness', activityId: 'a1', completedAt: new Date() },
      ],
    });

    expect(progress.progressNote).toBeDefined();
    expect(typeof progress.progressNote).toBe('string');
    expect(progress.progressNote.length).toBeGreaterThan(0);
  });

  it('should identify next checkpoint', () => {
    const progress = getTreatmentPlanProgress(testPlan, { currentDay: 1 });

    if (testPlan.checkpoints.length > 1) {
      expect(progress.nextCheckpoint).toBeDefined();
      expect(progress.nextCheckpoint.weeksAway).toBeGreaterThanOrEqual(0);
    }
  });

  describe('edge cases', () => {
    it('should handle empty completionData', () => {
      const progress = getTreatmentPlanProgress(testPlan);

      expect(progress).toBeDefined();
      expect(progress.activitiesCompleted).toBe(0);
      expect(progress.milestonesAchieved).toBe(0);
    });

    it('should handle day beyond plan length', () => {
      const progress = getTreatmentPlanProgress(testPlan, {
        currentDay: testPlan.totalDays + 10,
      });

      expect(progress.percentComplete).toBeGreaterThanOrEqual(100);
    });
  });
});
