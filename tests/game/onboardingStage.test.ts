import { describe, expect, it } from 'vitest';
import {
  createDiscoveryProgression,
  updateDiscoveryProgression,
  type DiscoveryProgressionState,
} from '../../src/game/discoveryProgression';
import {
  lifeformUnlocksForCurrentStage,
  toolUnlocksForCurrentStage,
  shouldUseOnboardingDishForCurrentStage,
} from '../../src/game/onboardingStage';

describe('onboarding stage gates', () => {
  it('keeps the first pre-Bloom dish on Egg and Nutrient even if stale progress exposed later tools', () => {
    const staleProgression: DiscoveryProgressionState = {
      ...createDiscoveryProgression(),
      unlockedTools: ['egg', 'nutrient', 'toxin', 'paste'],
    };

    expect(toolUnlocksForCurrentStage(staleProgression, 0)).toEqual(['egg', 'nutrient']);
    expect(lifeformUnlocksForCurrentStage(staleProgression, 0)).toEqual(['swarmlet']);
    expect(shouldUseOnboardingDishForCurrentStage(0, false)).toBe(true);
  });

  it('releases the normal unlock set after Bloom or after the opening dish', () => {
    const bloomed = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });
    const starter = createDiscoveryProgression();

    expect(toolUnlocksForCurrentStage(bloomed, 0, false)).toEqual(['egg', 'nutrient']);
    expect(lifeformUnlocksForCurrentStage(bloomed, 0, false)).toEqual(['swarmlet']);
    expect(shouldUseOnboardingDishForCurrentStage(0, false)).toBe(true);
    expect(toolUnlocksForCurrentStage(bloomed, 0, true)).toEqual(['egg', 'nutrient', 'toxin', 'water', 'paste']);
    expect(lifeformUnlocksForCurrentStage(bloomed, 0, true)).toEqual(['swarmlet', 'bruiser', 'splitter', 'bloom_mass']);
    expect(shouldUseOnboardingDishForCurrentStage(0, true)).toBe(false);
    expect(toolUnlocksForCurrentStage(starter, 1)).toEqual(starter.unlockedTools);
    expect(lifeformUnlocksForCurrentStage(starter, 1)).toEqual(starter.unlockedLifeforms);
    expect(shouldUseOnboardingDishForCurrentStage(1, false)).toBe(false);
  });
});
