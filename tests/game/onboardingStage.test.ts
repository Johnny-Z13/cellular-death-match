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
  FIRST_CASE_STAGE_LIFEFORMS,
  ONBOARDING_BEATS,
  TRIAL_ONBOARDING_BEATS,
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
    expect(lifeformUnlocksForCurrentStage(bloomed, 0, true)).toEqual(['swarmlet']);
    expect(shouldUseOnboardingDishForCurrentStage(0, true)).toBe(false);
    expect(toolUnlocksForCurrentStage(starter, 1)).toEqual(['egg', 'nutrient', 'toxin']);
    expect(toolUnlocksForCurrentStage(starter, 2)).toEqual(['egg', 'nutrient', 'toxin', 'water']);
    expect(toolUnlocksForCurrentStage(starter, 3)).toEqual(['egg', 'nutrient', 'toxin', 'water', 'paste', 'agitate']);
    expect(toolUnlocksForCurrentStage(starter, 4)).toEqual(['egg', 'nutrient', 'toxin', 'water', 'paste', 'salt', 'agitate']);
    expect(lifeformUnlocksForCurrentStage(bloomed, 1)).toEqual(['swarmlet', 'bloom_mass']);
    expect(shouldUseOnboardingDishForCurrentStage(1, false)).toBe(false);
  });

  it('reveals each earned organism on the next authored Case Trial', () => {
    let progression = updateDiscoveryProgression(createDiscoveryProgression(), {
      breedIds: ['bloom_mass'],
      noteIds: ['breed_bloom_mass'],
    });

    expect(lifeformUnlocksForCurrentStage(progression, 1)).toEqual(['swarmlet', 'bloom_mass']);
    expect(lifeformUnlocksForCurrentStage(progression, 2)).toEqual(['swarmlet', 'bloom_mass']);

    progression = updateDiscoveryProgression(progression, { noteIds: ['recipe_bitter_bloom'] });
    expect(lifeformUnlocksForCurrentStage(progression, 2)).toEqual([
      'swarmlet', 'bruiser', 'bloom_mass',
    ]);

    progression = updateDiscoveryProgression(progression, { noteIds: ['recipe_nutrient_conduit'] });
    expect(lifeformUnlocksForCurrentStage(progression, 3)).toEqual([
      'swarmlet', 'bruiser', 'splitter', 'bloom_mass',
    ]);

    progression = updateDiscoveryProgression(progression, { noteIds: ['recipe_foam_lightning'] });
    expect(lifeformUnlocksForCurrentStage(progression, 4)).toEqual([
      'swarmlet', 'bruiser', 'splitter', 'mirror', 'bloom_mass',
    ]);

    FIRST_CASE_STAGE_LIFEFORMS.forEach((allowed, trialIndex) => {
      for (const lifeform of lifeformUnlocksForCurrentStage(progression, trialIndex)) {
        expect(allowed).toContain(lifeform);
      }
    });
  });
});

describe('onboarding beats', () => {
  it('defines four precise press-then-place actions for Trial 1', () => {
    expect(ONBOARDING_BEATS).toHaveLength(4);
    expect(ONBOARDING_BEATS.map((beat) => beat.trigger)).toEqual([
      'egg-selected',
      'egg-used',
      'nutrient-selected',
      'nutrient-used',
    ]);
  });

  it('starts by pointing at Egg before pointing into the dish', () => {
    expect(ONBOARDING_BEATS[0]!.id).toBe('select-egg');
    expect(ONBOARDING_BEATS[0]!.pointerTarget).toBe('tool:egg');
    expect(ONBOARDING_BEATS[1]!.id).toBe('place-egg');
    expect(ONBOARDING_BEATS[1]!.pointerTarget).toBe('dish');
  });

  it('points at Nutrient before asking the player to feed the colony', () => {
    expect(ONBOARDING_BEATS[2]!.id).toBe('select-nutrient');
    expect(ONBOARDING_BEATS[2]!.pointerTarget).toBe('tool:nutrient');
    expect(ONBOARDING_BEATS[3]!.id).toBe('feed-colony');
    expect(ONBOARDING_BEATS[3]!.pointerTarget).toBe('dish');
  });

  it('guides all five authored trials with Professor copy and an exact target', () => {
    expect(TRIAL_ONBOARDING_BEATS).toHaveLength(5);
    for (const trial of TRIAL_ONBOARDING_BEATS) {
      expect(trial.length).toBeGreaterThanOrEqual(4);
      for (const beat of trial) {
        expect(beat.title.length).toBeGreaterThan(0);
        expect(beat.body.length).toBeGreaterThan(0);
        expect(beat.trigger.length).toBeGreaterThan(0);
        expect(beat.action.length).toBeGreaterThan(0);
        expect(beat.pointerTarget.length).toBeGreaterThan(0);
      }
    }
  });

  it('teaches reagent-rack drag with a tappable reveal alternative', () => {
    const revealBeat = TRIAL_ONBOARDING_BEATS[2]!.find((beat) => beat.id === 'reveal-water');
    expect(revealBeat?.trigger).toBe('toolbox-scrolled');
    expect(revealBeat?.pointerTarget).toBe('rack:more');
    expect(revealBeat?.body).toContain('press the arrow');
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
