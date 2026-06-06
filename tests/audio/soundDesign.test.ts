import { describe, expect, it } from 'vitest';
import { LIFEFORM_IDENTITIES } from '../../src/content/lifeformIdentity';
import {
  LIFEFORM_SOUND_IDENTITIES,
  SOUND_EVENT_DEFS,
  soundEventForDishSignal,
} from '../../src/audio/soundDesign';

describe('sound design', () => {
  it('defines playable event mappings with bounded voices and gain', () => {
    for (const def of Object.values(SOUND_EVENT_DEFS)) {
      expect(def.id.length).toBeGreaterThan(3);
      expect(['none', 'soft', 'medium', 'strong']).toContain(def.proceduralLayer);
      expect(def.maxVoices).toBeGreaterThan(0);
      expect(def.cooldownMs).toBeGreaterThanOrEqual(0);
      expect(def.gain).toBeGreaterThan(0);
      expect(def.gain).toBeLessThanOrEqual(1);
    }
  });

  it('covers every lifeform identity sound id', () => {
    for (const identity of Object.values(LIFEFORM_IDENTITIES)) {
      expect(LIFEFORM_SOUND_IDENTITIES[identity.soundId]).toBeDefined();
    }
  });

  it('maps dish event categories to sound event ids', () => {
    expect(soundEventForDishSignal('mutation', 'VISIBLE MUTATION')).toBe('visible_mutation');
    expect(soundEventForDishSignal('critical', 'CATALYTIC FLARE')).toBe('catalytic_flare');
    expect(soundEventForDishSignal('fold', 'FOLDING FAULT')).toBe('folding_fault');
    expect(soundEventForDishSignal('stabilize', 'WATER DILUTED ACID')).toBe('water_stabilize');
    expect(soundEventForDishSignal('caution', 'BRINE REACTION')).toBe('salt_crystal');
  });
});
