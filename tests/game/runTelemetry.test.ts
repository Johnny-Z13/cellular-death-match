// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRunTelemetry } from '../../src/game/runTelemetry';

const mainSource = readFileSync('src/main.ts', 'utf8');

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

  it('wires grant-awarded breed discoveries through the same run-local recorder as arena discoveries', () => {
    expect(mainSource).toContain('function recordNewlyDiscoveredBreeds(');
    expect(mainSource).toContain('recordNewlyDiscoveredBreeds(previousProgression, discoveryProgression);');
    expect(mainSource).toContain('recordNewlyDiscoveredBreeds(previousProgression, nextProgression);');
    expect(mainSource).toContain('runTelemetry.recordDiscovery(breedId, Boolean(def?.parents));');
  });

  it('names won lab reports from classified final breed counts without banking biomes', () => {
    expect(mainSource).toContain("import { classifyBiome } from './game/homeostasis';");
    expect(mainSource).toContain('const finalBreedCounts = arena ? finalBreedCountsFor(arena) : new Map<string, number>();');
    expect(mainSource).toContain("biomeName: state.outcome === 'won' && finalBreedCounts.size > 0");
    expect(mainSource).toContain('classifyBiome(finalBreedCounts).name');
    expect(mainSource).toContain('newBiome: false');
  });

  it('samples the current arena before every run phase transition that can replace it', () => {
    expect(mainSource).toContain('function sampleRunTelemetryFromArena(ar: Arena): void');
    expect(appearsBefore(
      branchSource('coach.onOnboardingComplete = () => {', 'coach.beginRun();'),
      'sampleRunTelemetryFromArena(arena);',
      'run.completeEpoch();',
    )).toBe(true);
    expect(appearsBefore(
      branchSource('coach.onOnboardingComplete = () => {', 'coach.beginRun();'),
      'runTelemetry.recordEpochCompleted();',
      'run.completeEpoch();',
    )).toBe(true);
    expect(appearsBefore(
      branchSource("if (status === 'won')", "if (status === 'lost')"),
      'sampleRunTelemetryFromArena(arena);',
      'run.completeEpoch();',
    )).toBe(true);
    expect(appearsBefore(
      branchSource("if (status === 'lost')", 'return false;'),
      'sampleRunTelemetryFromArena(arena);',
      'run.skipEpoch();',
    )).toBe(true);
    expect(appearsBefore(
      branchSource("if (status === 'lost')", 'return false;'),
      'persistArenaDiscoveries(arena);',
      'sampleRunTelemetryFromArena(arena);',
    )).toBe(true);
    expect(appearsBefore(
      branchSource("if (status === 'lost')", 'return false;'),
      'persistArenaDiscoveries(arena);',
      'run.skipEpoch();',
    )).toBe(true);
    expect(appearsBefore(
      branchSource('arena.isHomeostasisAchieved()', 'arena.isEcosystemCollapsed()'),
      'sampleRunTelemetryFromArena(arena);',
      'bankRunStrains();',
    )).toBe(true);
    expect(appearsBefore(
      branchSource('arena.isEcosystemCollapsed()', '// Status check'),
      'sampleRunTelemetryFromArena(arena);',
      'bankRunStrains();',
    )).toBe(true);
  });
});

function branchSource(startNeedle: string, endNeedle: string): string {
  const start = mainSource.indexOf(startNeedle);
  const end = mainSource.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return mainSource.slice(start, end);
}

function appearsBefore(source: string, firstNeedle: string, secondNeedle: string): boolean {
  const first = source.indexOf(firstNeedle);
  const second = source.indexOf(secondNeedle);
  return first > -1 && second > -1 && first < second;
}
