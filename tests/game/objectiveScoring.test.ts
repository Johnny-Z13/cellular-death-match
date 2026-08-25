import { describe, expect, it } from 'vitest';
import type { ObjectiveDef } from '../../src/content/objectives';
import type { EnemyArchetype } from '../../src/content/enemies';
import {
  createObjectiveRuntime,
  evaluateObjective,
  type ObjectiveMetrics,
  type ObjectiveEvaluationContext,
  type ObjectiveRuntime,
} from '../../src/game/objectiveScoring';

function metrics(overrides: Partial<ObjectiveMetrics> = {}): ObjectiveMetrics {
  return {
    controlSampleVol: 0,
    livingLifeforms: 3,
    protectedCultureCount: 0,
    archetypeCounts: new Map<EnemyArchetype, number>(),
    livingVol: 900,
    lifeformVol: 900,
    dominantVol: 320,
    dominantArchetype: 'swarmlet',
    coverage: 0.2,
    maxLifeformVolume: 320,
    maxBreedDominance: 0.36,
    nearbyDifferentBreedPair: false,
    livingBreedIds: new Set(),
    ...overrides,
  };
}

function context(runtime: ObjectiveRuntime = createObjectiveRuntime()): ObjectiveEvaluationContext {
  return {
    tickNo: 60,
    epochTicks: 60 * 80,
    reactions: 0,
    discoveredBreedTicks: new Map(),
    triggeredRecipeIds: new Set(),
    runtime,
  };
}

describe('evaluateObjective procedural objectives', () => {
  it('stabilizes a discovered breed only while a specimen is still alive', () => {
    const objective: ObjectiveDef = {
      kind: 'stabilize_breed',
      name: 'Culture Shock',
      description: 'Stabilize Bloom Mass.',
      target: 'Bloom Mass stabilized',
      breedId: 'bloom_mass',
    };
    const observed = { ...context(), discoveredBreedTicks: new Map([['bloom_mass' as const, 20]]) };

    expect(evaluateObjective(objective, metrics(), observed).complete).toBe(false);
    expect(evaluateObjective(objective, metrics({ livingBreedIds: new Set(['bloom_mass']) }), observed).complete).toBe(true);
  });

  it('understands a named recipe when that exact reaction is reproduced', () => {
    const objective: ObjectiveDef = {
      kind: 'understand_recipe',
      name: 'Bitter Medicine',
      description: 'Reproduce Bitter Bloom.',
      target: 'Protocol understood',
      recipeId: 'bitter_bloom',
    };

    expect(evaluateObjective(objective, metrics(), context()).complete).toBe(false);
    expect(evaluateObjective(objective, metrics(), {
      ...context(),
      triggeredRecipeIds: new Set(['bitter_bloom']),
    }).complete).toBe(true);
  });

  it('requires both recipe application and a balanced living dish', () => {
    const objective: ObjectiveDef = {
      kind: 'apply_recipe',
      name: 'The Cure-ish',
      description: 'Apply Brine Channel.',
      target: 'Applied in a diverse dish',
      recipeId: 'brine_channel',
      minCount: 3,
      maxDominance: 0.6,
    };
    const applied = { ...context(), triggeredRecipeIds: new Set(['brine_channel' as const]) };

    expect(evaluateObjective(objective, metrics({ livingLifeforms: 2 }), applied).complete).toBe(false);
    expect(evaluateObjective(objective, metrics({ livingLifeforms: 3, maxBreedDominance: 0.59 }), applied).complete).toBe(true);
  });

  it('satisfies mega_culture when any lifeform volume exceeds 800', () => {
    const objective: ObjectiveDef = {
      kind: 'mega_culture',
      name: 'Mega-Culture',
      description: 'Grow one culture large.',
      target: 'Culture volume > 800',
    };

    expect(evaluateObjective(objective, metrics({ maxLifeformVolume: 800 }), context()).complete).toBe(false);
    expect(evaluateObjective(objective, metrics({ maxLifeformVolume: 801 }), context()).complete).toBe(true);
  });

  it('satisfies reaction_chain after 3 reactions in the epoch', () => {
    const objective: ObjectiveDef = {
      kind: 'reaction_chain',
      name: 'Reaction Chain',
      description: 'Trigger reactions.',
      target: '3 reactions triggered',
      targetCount: 3,
    };

    expect(evaluateObjective(objective, metrics(), { ...context(), reactions: 2 }).complete).toBe(false);
    expect(evaluateObjective(objective, metrics(), { ...context(), reactions: 3 }).complete).toBe(true);
  });

  it('requires balance_keeper dominance to hold for its sustain threshold', () => {
    const objective: ObjectiveDef = {
      kind: 'balance_keeper',
      name: 'Balance Keeper',
      description: 'No breed dominates.',
      target: 'No breed > 40% for 30s',
      maxDominance: 0.4,
      sustainTicks: 3,
    };
    const runtime = createObjectiveRuntime();

    runtime.balanceTicks = 2;
    expect(evaluateObjective(objective, metrics({ maxBreedDominance: 0.39 }), context(runtime)).complete).toBe(false);
    runtime.balanceTicks = 3;
    expect(evaluateObjective(objective, metrics({ maxBreedDominance: 0.39 }), context(runtime)).complete).toBe(true);
  });

  it('satisfies colony_founder with 5 cultures of one archetype', () => {
    const objective: ObjectiveDef = {
      kind: 'colony_founder',
      name: 'Colony Founder',
      description: 'Grow matching cultures.',
      target: '5+ of one archetype',
      targetCount: 5,
    };

    expect(evaluateObjective(objective, metrics({
      archetypeCounts: new Map<EnemyArchetype, number>([['swarmlet', 4], ['splitter', 1]]),
    }), context()).complete).toBe(false);
    expect(evaluateObjective(objective, metrics({
      archetypeCounts: new Map<EnemyArchetype, number>([['swarmlet', 5]]),
    }), context()).complete).toBe(true);
  });

  it('satisfies cross_breed only after a hybrid discovery signal', () => {
    const objective: ObjectiveDef = {
      kind: 'cross_breed',
      name: 'Cross-Breed',
      description: 'Create a hybrid.',
      target: '1 hybrid breed created',
    };
    const runtime = createObjectiveRuntime();

    expect(evaluateObjective(objective, metrics(), context(runtime)).complete).toBe(false);
    runtime.hybridDiscovered = true;
    expect(evaluateObjective(objective, metrics(), context(runtime)).complete).toBe(true);
  });

  it('satisfies extinction_reversal after a low point recovers to 4 cultures', () => {
    const objective: ObjectiveDef = {
      kind: 'extinction_reversal',
      name: 'Extinction Reversal',
      description: 'Recover from collapse.',
      target: 'Recover to 4+ cultures',
      targetCount: 4,
    };
    const runtime = createObjectiveRuntime();

    runtime.sawExtinctionLow = true;
    expect(evaluateObjective(objective, metrics({ livingLifeforms: 3 }), context(runtime)).complete).toBe(false);
    expect(evaluateObjective(objective, metrics({ livingLifeforms: 4 }), context(runtime)).complete).toBe(true);
  });

  it('scores offered symbiosis, crisis, and acid objectives from real runtime signals', () => {
    const runtime = createObjectiveRuntime();
    runtime.symbiosisTicks = 60 * 30;
    runtime.survivedCrisis = true;
    runtime.acidReactionTriggered = true;

    expect(evaluateObjective({
      kind: 'symbiosis',
      name: 'Symbiosis',
      description: 'Keep two breeds close.',
      target: '2 breeds coexisting for 30s',
    }, metrics(), context(runtime)).complete).toBe(true);

    expect(evaluateObjective({
      kind: 'crisis_survivor',
      name: 'Crisis Survivor',
      description: 'Survive a crisis.',
      target: '3+ cultures alive through crisis',
    }, metrics({ livingLifeforms: 3 }), context(runtime)).complete).toBe(true);

    expect(evaluateObjective({
      kind: 'acid_sculptor',
      name: 'Acid Sculptor',
      description: 'Use acid to make a reaction.',
      target: '1 acid reaction',
    }, metrics(), context(runtime)).complete).toBe(true);
  });
});
