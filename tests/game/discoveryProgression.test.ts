import { describe, expect, it } from 'vitest';
import {
  ALL_PROGRESSION_LIFEFORMS,
  ALL_PROGRESSION_TOOLS,
  clearDiscoveryProgression,
  createDiscoveryProgression,
  revealAllDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';

describe('discovery progression', () => {
  it('starts with the onboarding kit only', () => {
    const progression = createDiscoveryProgression();

    expect(progression.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'splitter']);
    expect(progression.unlockedTools).toEqual(['egg', 'nutrient', 'toxin']);
    expect(progression.discoveredBreedIds).toEqual([]);
    expect(progression.discoveredNoteIds).toEqual([]);
  });

  it('unlocks Bloom Mass and Water when Bloom Mass is discovered', () => {
    const progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });

    expect(progression.unlockedLifeforms).toContain('bloom_mass');
    expect(progression.unlockedTools).toContain('water');
  });

  it('reveals and clears all runtime unlocks without requiring persistence', () => {
    const revealed = revealAllDiscoveryProgression(createDiscoveryProgression());

    expect(revealed.revealAll).toBe(true);
    expect(revealed.unlockedTools).toEqual(ALL_PROGRESSION_TOOLS);
    expect(revealed.unlockedLifeforms).toEqual(ALL_PROGRESSION_LIFEFORMS);

    const cleared = clearDiscoveryProgression(revealed);
    expect(cleared.revealAll).toBe(false);
    expect(cleared.unlockedTools).toEqual(['egg', 'nutrient', 'toxin']);
    expect(cleared.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'splitter']);
  });
});
