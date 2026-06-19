import { describe, expect, it } from 'vitest';
import { createRunEndReportInput } from '../../src/game/runFlow';
import { createRunTelemetry } from '../../src/game/runTelemetry';

function report(overrides: Partial<Parameters<typeof createRunEndReportInput>[0]> = {}) {
  const telemetry = createRunTelemetry({ startedAtMs: 10_000, runNumber: 3 });
  telemetry.recordReactionCount(2);
  return createRunEndReportInput({
    telemetry,
    endedAtMs: 100_000,
    outcome: 'won',
    fightIndex: 3,
    epochResults: ['completed', 'lapsed'],
    finalBreedCounts: new Map([['bloom_mass', 2]]),
    finalBreedVolumes: new Map([
      ['bloom_mass', 900],
      ['needle_swarm', 80],
      ['glass_antibody', 20],
    ]),
    peakBiodiversity: 3,
    longestStabilityStreak: 120,
    newStrainsBanked: [],
    totalStrainsDiscovered: 4,
    totalStrainsAvailable: 13,
    notebookDiscoveredCount: 6,
    notebookTotalCount: 24,
    notebookEntryCountAtRunStart: 5,
    ...overrides,
  });
}

describe('createRunEndReportInput', () => {
  it('prefers the equilibrium biome name for homeostasis wins', () => {
    const input = report({
      equilibriumBiomeName: 'Glass Reef',
    });

    expect(input.biomeName).toBe('Glass Reef');
  });

  it('classifies won reports from final breed volumes when no equilibrium biome exists', () => {
    const input = report();

    expect(input.biomeName).toBe('Coral Basin');
    expect(input.finalBreedCounts).toEqual(new Map([['bloom_mass', 2]]));
  });

  it('does not name a biome for lost reports', () => {
    const input = report({
      outcome: 'lost',
      equilibriumBiomeName: 'Glass Reef',
      finalBreedVolumes: new Map([['glass_antibody', 900]]),
    });

    expect(input.biomeName).toBeUndefined();
  });

  it('computes epoch count, notebook progress, and duration outside main', () => {
    const input = report({
      fightIndex: 1,
      epochResults: ['completed', 'lapsed', 'completed'],
      endedAtMs: 70_000,
      notebookDiscoveredCount: 9,
      notebookTotalCount: 30,
      notebookEntryCountAtRunStart: 4,
    });

    expect(input.epochCount).toBe(3);
    expect(input.durationMs).toBe(60_000);
    expect(input.newNotebookEntries).toBe(5);
    expect(input.notebookCompletion).toBe(0.3);
  });
});
