import { describe, expect, it } from 'vitest';
import {
  createDiscoveryProgression,
  updateDiscoveryProgression,
} from '../../src/game/discoveryProgression';

describe('organic unlock cadence', () => {
  it('derives later capabilities from stabilized specimens and understood reactions', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });

    expect(progression.unlockedTools).toEqual([
      'egg', 'nutrient', 'toxin', 'water', 'paste', 'agitate',
    ]);
    expect(progression.unlockedLifeforms).toEqual(['swarmlet', 'bloom_mass']);

    progression = updateDiscoveryProgression(progression, {
      noteIds: ['recipe_bitter_bloom'],
    });
    expect(progression.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'bloom_mass']);

    progression = updateDiscoveryProgression(progression, {
      noteIds: ['recipe_nutrient_conduit'],
    });
    expect(progression.unlockedTools).toContain('salt');
    expect(progression.unlockedLifeforms).toEqual(['swarmlet', 'bruiser', 'splitter', 'bloom_mass']);

    progression = updateDiscoveryProgression(progression, {
      noteIds: ['recipe_salt_water_crystal'],
    });
    expect(progression.unlockedTools).toContain('acid');

    progression = updateDiscoveryProgression(progression, {
      noteIds: ['recipe_acid_toxin_flare', 'recipe_foam_lightning', 'recipe_brine_flash'],
    });
    expect(progression.unlockedLifeforms).toEqual(expect.arrayContaining(['sniper', 'mirror', 'boss']));
  });
});
