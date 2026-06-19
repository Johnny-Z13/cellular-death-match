import { describe, expect, it } from 'vitest';
import {
  OBJECTIVE_POOL,
  canCrisisSurvivorResolve,
  crisisSurvivorResolvableForEpoch,
  drawObjectives,
} from '../../src/game/objectivePool';
import type { DrawContext } from '../../src/game/objectivePool';

const baseCtx: DrawContext = {
  epochIndex: 0,
  discoveredBreeds: new Set(),
  unlockedTools: ['nutrient', 'toxin', 'water', 'salt'],
  seed: 42,
};

describe('OBJECTIVE_POOL', () => {
  it('has at least 10 templates', () => {
    expect(OBJECTIVE_POOL.length).toBeGreaterThanOrEqual(10);
  });

  it('gives every pool objective required fields', () => {
    for (const obj of OBJECTIVE_POOL) {
      expect(typeof obj.kind).toBe('string');
      expect(obj.kind.length).toBeGreaterThan(0);
      expect(typeof obj.name).toBe('string');
      expect(obj.name.length).toBeGreaterThan(0);
      expect(typeof obj.description).toBe('string');
      expect(obj.description.length).toBeGreaterThan(0);
      expect(typeof obj.target).toBe('string');
      expect(obj.target.length).toBeGreaterThan(0);
      expect(typeof obj.available).toBe('function');
    }
  });

  it('keeps protector unavailable until fragile-culture survival is tracked', () => {
    const protector = OBJECTIVE_POOL.find((obj) => obj.kind === 'protector');
    expect(protector).toBeDefined();
    expect(protector?.available({
      ...baseCtx,
      epochIndex: 8,
      discoveredBreeds: new Set(['bloom_mass', 'needle_swarm']),
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt', 'acid'],
    })).toBe(false);
    expect(protector?.unavailableReason).toMatch(/fragile/i);
  });

  it('offers crisis_survivor only when a crisis can finish before the epoch deadline', () => {
    expect(canCrisisSurvivorResolve({
      epochTicks: 60 * 33,
      crisisIntervalTicks: 60 * 30,
      graceTicks: 60 * 25,
      maxDurationTicks: 60 * 9,
    })).toBe(false);
    expect(canCrisisSurvivorResolve({
      epochTicks: 60 * 40,
      crisisIntervalTicks: 60 * 30,
      graceTicks: 60 * 25,
      maxDurationTicks: 60 * 9,
    })).toBe(true);

    const crisis = OBJECTIVE_POOL.find((obj) => obj.kind === 'crisis_survivor');
    expect(crisis).toBeDefined();
    for (let epochIndex = 0; epochIndex < 20; epochIndex++) {
      expect(crisis?.available({
        ...baseCtx,
        epochIndex,
        discoveredBreeds: new Set(['bloom_mass', 'needle_swarm']),
      })).toBe(crisisSurvivorResolvableForEpoch(epochIndex));
    }
  });
});

describe('drawObjectives', () => {
  it('returns exactly 2 choices', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      discoveredBreeds: new Set(['bloom_mass', 'needle_swarm']),
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt', 'acid'],
      epochIndex: 6,
    };
    const choices = drawObjectives(ctx);
    expect(choices.length).toBe(2);
  });

  it('filters out cross_breed when no undiscovered hybrid can be bred', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      discoveredBreeds: new Set(),
      epochIndex: 6,
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt', 'acid'],
    };
    // Run many seeds to verify cross_breed never appears when < 2 breeds known
    for (let seed = 0; seed < 50; seed++) {
      const choices = drawObjectives({ ...ctx, seed });
      for (const choice of choices) {
        expect(choice.kind).not.toBe('cross_breed');
      }
    }

    const alreadyKnownHybrid: DrawContext = {
      ...ctx,
      discoveredBreeds: new Set(['needle_swarm', 'bloom_mass', 'quill_bloom']),
    };
    for (let seed = 0; seed < 50; seed++) {
      const choices = drawObjectives({ ...alreadyKnownHybrid, seed });
      for (const choice of choices) {
        expect(choice.kind).not.toBe('cross_breed');
      }
    }
  });

  it('allows cross_breed when discovered parents can create a new hybrid', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      discoveredBreeds: new Set(['needle_swarm', 'bloom_mass']),
      epochIndex: 6,
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt', 'acid'],
    };

    const crossBreed = OBJECTIVE_POOL.find((obj) => obj.kind === 'cross_breed');
    expect(crossBreed?.available(ctx)).toBe(true);
  });

  it('filters out acid_sculptor when acid is not in unlockedTools', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      discoveredBreeds: new Set(['bloom_mass', 'needle_swarm']),
      epochIndex: 6,
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt'], // no acid
    };
    for (let seed = 0; seed < 50; seed++) {
      const choices = drawObjectives({ ...ctx, seed });
      for (const choice of choices) {
        expect(choice.kind).not.toBe('acid_sculptor');
      }
    }
  });

  it('different seeds produce different choices (probabilistic)', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      discoveredBreeds: new Set(['bloom_mass', 'needle_swarm']),
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt', 'acid'],
      epochIndex: 6,
    };
    const results = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const choices = drawObjectives({ ...ctx, seed });
      results.add(choices.map((c) => c.kind).join(','));
    }
    // With 20 seeds across many available objectives, we should see more than 1 unique combination
    expect(results.size).toBeGreaterThan(1);
  });

  it('returns at most 2 even when many objectives are available', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      discoveredBreeds: new Set(['bloom_mass', 'needle_swarm', 'glass_antibody']),
      unlockedTools: ['nutrient', 'toxin', 'water', 'salt', 'acid'],
      epochIndex: 8,
    };
    const choices = drawObjectives(ctx);
    expect(choices.length).toBe(2);
  });

  it('returns choices from the available subset only', () => {
    const ctx: DrawContext = {
      ...baseCtx,
      epochIndex: 0,
      discoveredBreeds: new Set(), // no breeds
      unlockedTools: ['nutrient', 'toxin'], // only 2 tools, no acid
    };
    const kinds = OBJECTIVE_POOL.filter((o) => o.available(ctx)).map((o) => o.kind);
    const choices = drawObjectives(ctx);
    for (const choice of choices) {
      expect(kinds).toContain(choice.kind);
    }
  });
});
