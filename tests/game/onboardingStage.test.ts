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
  ONBOARDING_BEATS,
  isOnboardingEpoch,
  isFixedEpoch,
  isMidGameEpoch,
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

  it('reveals one authored tool layer per early Case Trial', () => {
    const bloomed = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });
    const starter = createDiscoveryProgression();

    expect(toolUnlocksForCurrentStage(bloomed, 0, false)).toEqual(['egg', 'nutrient']);
    expect(lifeformUnlocksForCurrentStage(bloomed, 0, false)).toEqual(['swarmlet']);
    expect(shouldUseOnboardingDishForCurrentStage(0, false)).toBe(true);
    expect(toolUnlocksForCurrentStage(bloomed, 0, true)).toEqual(['egg', 'nutrient']);
    expect(lifeformUnlocksForCurrentStage(bloomed, 0, true)).toEqual(['swarmlet', 'bruiser', 'splitter', 'bloom_mass']);
    expect(shouldUseOnboardingDishForCurrentStage(0, true)).toBe(false);
    expect(toolUnlocksForCurrentStage(starter, 1)).toEqual(['egg', 'nutrient', 'toxin']);
    expect(toolUnlocksForCurrentStage(starter, 2)).toEqual(['egg', 'nutrient', 'toxin', 'water']);
    expect(toolUnlocksForCurrentStage(starter, 3)).toEqual(['egg', 'nutrient', 'toxin', 'water', 'paste']);
    expect(toolUnlocksForCurrentStage(starter, 4)).toEqual(['egg', 'nutrient', 'toxin', 'water', 'paste', 'salt']);
    expect(lifeformUnlocksForCurrentStage(starter, 1)).toEqual(starter.unlockedLifeforms);
    expect(shouldUseOnboardingDishForCurrentStage(1, false)).toBe(false);
  });
});

describe('onboarding beats', () => {
  it('defines exactly 2 player-action beats', () => {
    expect(ONBOARDING_BEATS).toHaveLength(2);
  });

  it('beat 1 is place-egg', () => {
    expect(ONBOARDING_BEATS[0]!.id).toBe('place-egg');
  });

  it('beat 2 is feed-colony', () => {
    expect(ONBOARDING_BEATS[1]!.id).toBe('feed-colony');
  });

  it('each beat has Professor copy and a trigger event', () => {
    for (const beat of ONBOARDING_BEATS) {
      expect(beat.title.length).toBeGreaterThan(0);
      expect(beat.body.length).toBeGreaterThan(0);
      expect(beat.trigger.length).toBeGreaterThan(0);
    }
  });
});

describe('epoch classification helpers', () => {
  it('epoch 0 is onboarding', () => {
    expect(isOnboardingEpoch(0)).toBe(true);
    expect(isOnboardingEpoch(1)).toBe(false);
  });

  it('Trials 0-4 are fixed for Case 01', () => {
    expect(isFixedEpoch(0)).toBe(true);
    expect(isFixedEpoch(2)).toBe(true);
    expect(isFixedEpoch(4)).toBe(true);
    expect(isFixedEpoch(5)).toBe(false);
  });

  it('Trial 5+ is the open-ended mid-game', () => {
    expect(isMidGameEpoch(4)).toBe(false);
    expect(isMidGameEpoch(5)).toBe(true);
    expect(isMidGameEpoch(10)).toBe(true);
  });
});
