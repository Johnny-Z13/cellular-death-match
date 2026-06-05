import { describe, expect, it } from 'vitest';
import {
  AGITATION_TUNING,
  ARENA_TIMING,
  ECOSYSTEM_LIMITS,
  OBJECTIVE_TUNING,
  TOOL_TUNING,
} from '../../src/content/ecologyTuning';

describe('ecology tuning', () => {
  it('defines positive timing intervals', () => {
    expect(ARENA_TIMING.defaultEpochTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.mutationIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.reseedIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.outbreakIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.resupplyIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.accidentIntervalTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.emergencyEggRefillTicks).toBeGreaterThan(0);
    expect(ARENA_TIMING.crisisIntervalTicks).toBeGreaterThan(0);
  });

  it('keeps ecosystem population caps coherent', () => {
    expect(ECOSYSTEM_LIMITS.minPopulation).toBeGreaterThan(0);
    expect(ECOSYSTEM_LIMITS.maxPopulation).toBeGreaterThan(ECOSYSTEM_LIMITS.minPopulation);
    expect(ECOSYSTEM_LIMITS.quietEggRefillPopulation).toBeLessThan(ECOSYSTEM_LIMITS.minPopulation);
    expect(ECOSYSTEM_LIMITS.maxToolEffects).toBeGreaterThan(0);
  });

  it('defines each reagent tool radius and ttl', () => {
    for (const tool of ['nutrient', 'toxin', 'water', 'salt', 'acid'] as const) {
      expect(TOOL_TUNING[tool].charges).toBeGreaterThan(0);
      expect(TOOL_TUNING[tool].radius).toBeGreaterThan(0);
      expect(TOOL_TUNING[tool].ttl).toBeGreaterThan(0);
    }
  });

  it('defines egg charge and hatch pulse tuning', () => {
    expect(TOOL_TUNING.egg.charges).toBeGreaterThan(0);
    expect(TOOL_TUNING.egg.hatchRadius).toBeGreaterThan(0);
    expect(TOOL_TUNING.egg.hatchTtl).toBeGreaterThan(0);
  });

  it('keeps objective thresholds in playable ranges', () => {
    expect(OBJECTIVE_TUNING.preserveGrazerMin).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.breedTargetCount).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.controlledReactionMinCount).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.controlledReactionMinCoverage).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.controlledReactionMinCoverage).toBeLessThan(1);
    expect(OBJECTIVE_TUNING.dominantMinCoverage).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.dominantMinCoverage).toBeLessThan(1);
    expect(OBJECTIVE_TUNING.bloomMinCoverage).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.bloomMinCoverage).toBeLessThan(1);
    expect(OBJECTIVE_TUNING.sterilizeMaxCoverage).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.sterilizeMaxCoverage).toBeLessThan(OBJECTIVE_TUNING.bloomMinCoverage);
    expect(OBJECTIVE_TUNING.balanceMaxDominance).toBeGreaterThan(0);
    expect(OBJECTIVE_TUNING.balanceMaxDominance).toBeLessThan(1);
    expect(OBJECTIVE_TUNING.balanceMinLifeforms).toBeGreaterThan(0);
  });

  it('defines agitation tuning without hidden zero values', () => {
    expect(AGITATION_TUNING.defaultCharges).toBeGreaterThan(0);
    expect(AGITATION_TUNING.durationTicks).toBeGreaterThan(0);
    expect(AGITATION_TUNING.minSpeed).toBeGreaterThan(0);
    expect(AGITATION_TUNING.extraSpeed).toBeGreaterThan(0);
  });
});
