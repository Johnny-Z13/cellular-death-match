import { describe, expect, it } from 'vitest';
import { assembleLabReport } from '../../src/game/labReport';
import type { LabReportInput } from '../../src/game/labReport';

const baseInput: LabReportInput = {
  runNumber: 3,
  outcome: 'won',
  biomeName: 'Thermal Vent',
  epochCount: 5,
  durationMs: 720_000,
  discoveredBreeds: ['Sniper', 'Swarmlet'],
  discoveredHybrids: ['Apex Bloom'],
  reactionsTriggered: 42,
  newBiome: true,
  finalBreedCounts: new Map([['Sniper', 10], ['Swarmlet', 7]]),
  peakBiodiversity: 9,
  longestStabilityStreak: 300, // ticks → 5 seconds
  newStrainsBanked: ['mirror', 'spike'],
  totalStrainsDiscovered: 5,
  totalStrainsAvailable: 13,
  newNotebookEntries: 3,
  notebookCompletion: 0.38,
};

describe('assembleLabReport', () => {
  it('assembles a report with all sections populated correctly', () => {
    const report = assembleLabReport(baseInput);

    expect(report.header.runNumber).toBe(3);
    expect(report.header.outcome).toBe('won');
    expect(report.header.biomeName).toBe('Thermal Vent');
    expect(report.header.epochCount).toBe(5);

    expect(report.discoveries.breeds).toEqual(['Sniper', 'Swarmlet']);
    expect(report.discoveries.hybrids).toEqual(['Apex Bloom']);
    expect(report.discoveries.reactionsTriggered).toBe(42);
    expect(report.discoveries.newBiome).toBe(true);

    expect(report.ecosystem.finalBreedCounts).toEqual(new Map([['Sniper', 10], ['Swarmlet', 7]]));
    expect(report.ecosystem.peakBiodiversity).toBe(9);

    expect(report.strainBank.newCount).toBe(2);
    expect(report.strainBank.newStrains).toEqual(['mirror', 'spike']);

    expect(report.notebook.newEntries).toBe(3);
    expect(report.notebook.completion).toBe(0.38);
  });

  it('formats duration 720000ms as "12m 0s"', () => {
    const report = assembleLabReport({ ...baseInput, durationMs: 720_000 });
    expect(report.header.durationFormatted).toBe('12m 0s');
  });

  it('formats duration with non-zero seconds', () => {
    const report = assembleLabReport({ ...baseInput, durationMs: 125_500 });
    // 125500ms → 2m 5s
    expect(report.header.durationFormatted).toBe('2m 5s');
  });

  it('omits biome name when not provided (collapse report)', () => {
    const report = assembleLabReport({ ...baseInput, biomeName: undefined });
    expect(report.header.biomeName).toBeUndefined();
  });

  it('strain bank newCount matches input array length', () => {
    const report = assembleLabReport({ ...baseInput, newStrainsBanked: ['alpha', 'beta', 'gamma'] });
    expect(report.strainBank.newCount).toBe(3);
    expect(report.strainBank.newStrains).toHaveLength(3);
  });

  it('formats total progress as "discovered/available"', () => {
    const report = assembleLabReport({ ...baseInput, totalStrainsDiscovered: 5, totalStrainsAvailable: 13 });
    expect(report.strainBank.totalProgress).toBe('5/13');
  });

  it('converts stability streak from ticks to seconds by dividing by 60', () => {
    const report = assembleLabReport({ ...baseInput, longestStabilityStreak: 300 });
    expect(report.ecosystem.longestStabilitySeconds).toBe(5);
  });

  it('rounds stability seconds correctly', () => {
    // 90 ticks / 60 = 1.5 → rounds to 2
    const report = assembleLabReport({ ...baseInput, longestStabilityStreak: 90 });
    expect(report.ecosystem.longestStabilitySeconds).toBe(2);
  });

  it('handles zero duration edge case', () => {
    const report = assembleLabReport({ ...baseInput, durationMs: 0 });
    expect(report.header.durationFormatted).toBe('0m 0s');
  });

  it('handles zero stability streak', () => {
    const report = assembleLabReport({ ...baseInput, longestStabilityStreak: 0 });
    expect(report.ecosystem.longestStabilitySeconds).toBe(0);
  });

  it('handles empty discoveries', () => {
    const report = assembleLabReport({
      ...baseInput,
      discoveredBreeds: [],
      discoveredHybrids: [],
      newStrainsBanked: [],
    });
    expect(report.discoveries.breeds).toEqual([]);
    expect(report.discoveries.hybrids).toEqual([]);
    expect(report.strainBank.newCount).toBe(0);
    expect(report.strainBank.totalProgress).toBe('5/13');
  });

  it('assembles a lost run correctly', () => {
    const report = assembleLabReport({ ...baseInput, outcome: 'lost', newBiome: false });
    expect(report.header.outcome).toBe('lost');
    expect(report.discoveries.newBiome).toBe(false);
  });
});
