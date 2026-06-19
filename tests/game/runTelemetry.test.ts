import { describe, expect, it } from 'vitest';
import { createRunTelemetry } from '../../src/game/runTelemetry';

describe('run telemetry', () => {
  it('records discoveries, hybrids, reactions, duration, and final report counts', () => {
    const telemetry = createRunTelemetry({ startedAtMs: 1_000, runNumber: 4 });

    telemetry.recordEpochCompleted();
    telemetry.recordEpochLapsed();
    telemetry.recordDiscovery('bloom_mass', false);
    telemetry.recordDiscovery('quill_bloom', true);
    telemetry.recordDiscovery('quill_bloom', true);
    telemetry.recordReactionCount(3);
    telemetry.recordReactionCount(2);
    telemetry.recordReactionCount(8);
    telemetry.recordPeakBiodiversity(5);
    telemetry.recordPeakBiodiversity(4);

    const input = telemetry.toLabReportInput({
      endedAtMs: 62_500,
      outcome: 'lost',
      biomeName: undefined,
      epochCount: 0,
      newBiome: false,
      finalBreedCounts: new Map([
        ['swarmlet', 3],
        ['bloom_mass', 1],
      ]),
      longestStabilityStreak: 180,
      newStrainsBanked: ['bloom_mass', 'quill_bloom'],
      totalStrainsDiscovered: 3,
      totalStrainsAvailable: 14,
      newNotebookEntries: 2,
      notebookCompletion: 0.21,
    });

    expect(input.runNumber).toBe(4);
    expect(input.outcome).toBe('lost');
    expect(input.epochCount).toBe(2);
    expect(input.durationMs).toBe(61_500);
    expect(input.discoveredBreeds).toEqual(['bloom_mass', 'quill_bloom']);
    expect(input.discoveredHybrids).toEqual(['quill_bloom']);
    expect(input.reactionsTriggered).toBe(8);
    expect(input.peakBiodiversity).toBe(5);
    expect(input.finalBreedCounts.get('swarmlet')).toBe(3);
    expect(input.finalBreedCounts.get('bloom_mass')).toBe(1);
    expect(input.newStrainsBanked).toEqual(['bloom_mass', 'quill_bloom']);
    expect(input.totalStrainsDiscovered).toBe(3);
    expect(input.totalStrainsAvailable).toBe(14);
    expect(input.newNotebookEntries).toBe(2);
    expect(input.notebookCompletion).toBe(0.21);
  });
});
