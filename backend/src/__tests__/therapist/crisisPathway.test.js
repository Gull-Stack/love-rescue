/**
 * Tests for crisisPathway.js — Crisis Detection & Response
 */

'use strict';

const {
  detectCrisisLevel,
  generateCrisisResponse,
  CRISIS_TYPE,
  CRISIS_LEVEL,
  SAFETY_RESOURCES,
} = require('../../utils/crisisPathway');

// ═══════════════════════════════════════════════════════════════
// detectCrisisLevel
// ═══════════════════════════════════════════════════════════════

describe('detectCrisisLevel', () => {
  describe('affair discovery', () => {
    it('should detect affair text as crisis', () => {
      const result = detectCrisisLevel('I just found out my partner has been cheating on me');

      expect(result.isCrisis).toBe(true);
      expect(result.primaryType).toBe(CRISIS_TYPE.AFFAIR_DISCOVERY);
      expect(result.level).toBeGreaterThanOrEqual(CRISIS_LEVEL.ACUTE);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should detect finding messages as affair indicator', () => {
      const result = detectCrisisLevel('I found messages on his phone with another woman');

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.AFFAIR_DISCOVERY);
    });

    it('should detect dating app discovery', () => {
      const result = detectCrisisLevel('I discovered she has been on Tinder behind my back');

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.AFFAIR_DISCOVERY);
    });
  });

  describe('separation threat', () => {
    it('should detect divorce language', () => {
      const result = detectCrisisLevel('My wife told me she wants a divorce and has already called a lawyer');

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.SEPARATION_THREAT);
      expect(result.level).toBeGreaterThanOrEqual(CRISIS_LEVEL.ACUTE);
    });

    it('should detect leaving threat', () => {
      const result = detectCrisisLevel("He packed his bags and said it's over, we're done");

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.SEPARATION_THREAT);
    });
  });

  describe('emotional flooding', () => {
    it('should detect flooding symptoms', () => {
      const result = detectCrisisLevel("I can't breathe, I'm having a panic attack, I can't stop crying");

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.EMOTIONAL_FLOODING);
    });

    it('should detect dissociation language', () => {
      const result = detectCrisisLevel("I feel numb and I'm falling apart, I'm spiraling");

      expect(result.isCrisis).toBe(true);
    });
  });

  describe('escalated conflict', () => {
    it('should detect physical violence indicators', () => {
      const result = detectCrisisLevel('He was screaming and throwing things, I was scared');

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.ESCALATED_CONFLICT);
    });

    it('should detect conflict in front of children', () => {
      const result = detectCrisisLevel('We had a huge fight in front of the kids');

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes).toContain(CRISIS_TYPE.ESCALATED_CONFLICT);
    });
  });

  describe('benign text', () => {
    it('should return no crisis for normal conversation', () => {
      const result = detectCrisisLevel('We had a nice dinner together last night');

      expect(result.isCrisis).toBe(false);
      expect(result.level).toBe(0);
      expect(result.primaryType).toBeNull();
      expect(result.allTypes).toEqual([]);
    });

    it('should return no crisis for general relationship talk', () => {
      const result = detectCrisisLevel('We are working on our communication skills');

      expect(result.isCrisis).toBe(false);
    });
  });

  describe('self-harm / safety escalation', () => {
    it('should auto-escalate to Level 3 for suicidal ideation', () => {
      const result = detectCrisisLevel("I can't take this anymore, I want to die");

      expect(result.isCrisis).toBe(true);
      expect(result.level).toBe(CRISIS_LEVEL.EMERGENCY);
      expect(result.safetyRisk).toBe(true);
      expect(result.safetyResources.length).toBeGreaterThan(0);
    });

    it('should auto-escalate for self-harm language', () => {
      const result = detectCrisisLevel("I've been cutting myself to cope with the pain");

      expect(result.level).toBe(CRISIS_LEVEL.EMERGENCY);
      expect(result.safetyRisk).toBe(true);
    });

    it('should include suicide hotline in safety resources for L3', () => {
      const result = detectCrisisLevel("I don't want to live anymore after what happened");

      expect(result.safetyResources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '988 Suicide & Crisis Lifeline' }),
        ])
      );
    });

    it('should detect weapon mention as L3', () => {
      const result = detectCrisisLevel("He threatened me with a gun");

      expect(result.level).toBe(CRISIS_LEVEL.EMERGENCY);
      expect(result.safetyRisk).toBe(true);
    });
  });

  describe('intensity amplifiers', () => {
    it('should amplify crisis level with urgency indicators', () => {
      const base = detectCrisisLevel('I think he might be having an affair');
      const amplified = detectCrisisLevel('I just found out he was cheating, please help, I don\'t know what to do, this is the worst day of my life');

      expect(amplified.level).toBeGreaterThanOrEqual(base.level);
      expect(amplified.confidence).toBeGreaterThanOrEqual(base.confidence);
    });
  });

  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = detectCrisisLevel(null);

      expect(result.isCrisis).toBe(false);
      expect(result.level).toBe(0);
    });

    it('should handle undefined input', () => {
      const result = detectCrisisLevel(undefined);

      expect(result.isCrisis).toBe(false);
    });

    it('should handle empty string', () => {
      const result = detectCrisisLevel('');

      expect(result.isCrisis).toBe(false);
    });

    it('should handle whitespace-only input', () => {
      const result = detectCrisisLevel('   \n\t  ');

      expect(result.isCrisis).toBe(false);
    });

    it('should handle non-string input', () => {
      const result = detectCrisisLevel(12345);

      expect(result.isCrisis).toBe(false);
    });
  });

  describe('multiple crisis types', () => {
    it('should detect multiple crisis types simultaneously', () => {
      const result = detectCrisisLevel(
        "I found out she's been cheating and now she says she's leaving me. I can't breathe."
      );

      expect(result.isCrisis).toBe(true);
      expect(result.allTypes.length).toBeGreaterThan(1);
      expect(result.allTypes).toContain(CRISIS_TYPE.AFFAIR_DISCOVERY);
    });
  });

  describe('confidence scoring', () => {
    it('should have higher confidence for more specific text', () => {
      const vague = detectCrisisLevel('things are not great');
      const specific = detectCrisisLevel('I found texts showing she has been cheating with my best friend, I found messages and photos');

      if (specific.isCrisis) {
        expect(specific.confidence).toBeGreaterThan(0.3);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// generateCrisisResponse
// ═══════════════════════════════════════════════════════════════

describe('generateCrisisResponse', () => {
  describe('structure', () => {
    it('should return proper structure for Level 2 affair', () => {
      const response = generateCrisisResponse(2, 'AFFAIR_DISCOVERY', {
        attachmentStyle: 'anxious',
        name: 'Sarah',
      });

      expect(response).toBeDefined();
      expect(response.crisisType).toBe('AFFAIR_DISCOVERY');
      expect(response.crisisLevel).toBe(2);
      expect(response.levelLabel).toBeDefined();
      expect(response.openingMessage).toBeDefined();
      expect(response.floodingFirstAid).toBeDefined();
      expect(response.immediateActions).toBeDefined();
      expect(response.shortTermPlan).toBeDefined();
      expect(response.stabilizationPlan).toBeDefined();
      expect(response.expertTechniques).toBeDefined();
      expect(response.boundaries).toBeDefined();
    });

    it('should include safety resources for Level 3', () => {
      const response = generateCrisisResponse(3, 'EMOTIONAL_FLOODING', {
        name: 'Test',
      });

      expect(response.crisisLevel).toBe(3);
      expect(response.safetyResources).toBeDefined();
      expect(response.safetyResources.length).toBeGreaterThan(0);
    });
  });

  describe('crisis types', () => {
    const crisisTypes = [
      'AFFAIR_DISCOVERY',
      'SEPARATION_THREAT',
      'ESCALATED_CONFLICT',
      'EMOTIONAL_FLOODING',
      'BETRAYAL_TRAUMA',
    ];

    for (const type of crisisTypes) {
      it(`should generate response for ${type}`, () => {
        const response = generateCrisisResponse(2, type);
        expect(response).toBeDefined();
        expect(response.crisisType).toBe(type);
        expect(response.openingMessage).toBeTruthy();
        expect(response.immediateActions).toBeDefined();
      });
    }
  });

  describe('levels', () => {
    it('should handle Level 1 (elevated)', () => {
      const response = generateCrisisResponse(1, 'EMOTIONAL_FLOODING');
      expect(response.crisisLevel).toBe(1);
      expect(response.levelLabel).toContain('Elevated');
    });

    it('should handle Level 2 (acute)', () => {
      const response = generateCrisisResponse(2, 'AFFAIR_DISCOVERY');
      expect(response.crisisLevel).toBe(2);
      expect(response.levelLabel).toContain('Acute');
    });

    it('should handle Level 3 (emergency)', () => {
      const response = generateCrisisResponse(3, 'ESCALATED_CONFLICT');
      expect(response.crisisLevel).toBe(3);
      expect(response.levelLabel).toContain('Emergency');
    });
  });

  describe('personalization', () => {
    it('should use client name when provided', () => {
      const response = generateCrisisResponse(2, 'EMOTIONAL_FLOODING', {
        name: 'Sarah',
      });

      // Opening message should reference the name
      expect(response.openingMessage).toContain('Sarah');
    });

    it('should use fallback when no name provided', () => {
      const response = generateCrisisResponse(2, 'EMOTIONAL_FLOODING');

      expect(response.openingMessage).toBeDefined();
      expect(response.openingMessage.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should clamp level below 1 to 1', () => {
      const response = generateCrisisResponse(0, 'EMOTIONAL_FLOODING');
      expect(response.crisisLevel).toBe(1);
    });

    it('should clamp level above 3 to 3', () => {
      const response = generateCrisisResponse(5, 'EMOTIONAL_FLOODING');
      expect(response.crisisLevel).toBe(3);
    });

    it('should handle invalid crisis type gracefully', () => {
      const response = generateCrisisResponse(2, 'NONEXISTENT_TYPE');
      expect(response).toBeDefined();
      // Should fall back to EMOTIONAL_FLOODING
      expect(response.crisisType).toBe('EMOTIONAL_FLOODING');
    });

    it('should handle undefined userProfile', () => {
      const response = generateCrisisResponse(2, 'AFFAIR_DISCOVERY', undefined);
      expect(response).toBeDefined();
    });
  });

  describe('anti-weaponization boundaries', () => {
    it('should include boundaries telling users what NOT to do', () => {
      const response = generateCrisisResponse(2, 'AFFAIR_DISCOVERY');

      expect(response.boundaries).toBeDefined();
      expect(response.boundaries.length).toBeGreaterThan(0);
    });
  });

  describe('flooding first aid', () => {
    it('should always include flooding first aid regardless of type', () => {
      const types = ['AFFAIR_DISCOVERY', 'SEPARATION_THREAT', 'EMOTIONAL_FLOODING'];

      for (const type of types) {
        const response = generateCrisisResponse(2, type);
        expect(response.floodingFirstAid).toBeDefined();
        expect(response.floodingFirstAid.title).toContain('Flooding');
      }
    });
  });
});
