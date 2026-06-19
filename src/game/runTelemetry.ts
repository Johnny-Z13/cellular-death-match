import type { LabReportInput } from './labReport';

export interface RunTelemetryOpts {
  startedAtMs: number;
  runNumber: number;
}

export interface LabReportSnapshot {
  endedAtMs: number;
  outcome: 'won' | 'lost';
  biomeName?: string;
  epochCount: number;
  newBiome: boolean;
  finalBreedCounts: Map<string, number>;
  peakBiodiversity?: number;
  longestStabilityStreak: number;
  newStrainsBanked: string[];
  totalStrainsDiscovered: number;
  totalStrainsAvailable: number;
  newNotebookEntries: number;
  notebookCompletion: number;
}

export interface RunTelemetry {
  recordEpochCompleted(): void;
  recordEpochLapsed(): void;
  recordDiscovery(id: string, hybrid: boolean): void;
  recordReactionCount(count: number): void;
  recordPeakBiodiversity(count: number): void;
  toLabReportInput(snapshot: LabReportSnapshot): LabReportInput;
}

export function createRunTelemetry(opts: RunTelemetryOpts): RunTelemetry {
  const discoveredBreeds: string[] = [];
  const discoveredHybrids: string[] = [];
  let epochCount = 0;
  let reactionsTriggered = 0;
  let peakBiodiversity = 0;

  function recordEpoch(): void {
    epochCount += 1;
  }

  return {
    recordEpochCompleted: recordEpoch,
    recordEpochLapsed: recordEpoch,
    recordDiscovery(id, hybrid): void {
      if (!discoveredBreeds.includes(id)) discoveredBreeds.push(id);
      if (hybrid && !discoveredHybrids.includes(id)) discoveredHybrids.push(id);
    },
    recordReactionCount(count): void {
      reactionsTriggered = Math.max(reactionsTriggered, Math.max(0, Math.floor(count)));
    },
    recordPeakBiodiversity(count): void {
      peakBiodiversity = Math.max(peakBiodiversity, Math.max(0, Math.floor(count)));
    },
    toLabReportInput(snapshot): LabReportInput {
      return {
        runNumber: opts.runNumber,
        outcome: snapshot.outcome,
        biomeName: snapshot.biomeName,
        epochCount: snapshot.epochCount > 0 ? snapshot.epochCount : epochCount,
        durationMs: Math.max(0, snapshot.endedAtMs - opts.startedAtMs),
        discoveredBreeds: [...discoveredBreeds],
        discoveredHybrids: [...discoveredHybrids],
        reactionsTriggered,
        newBiome: snapshot.newBiome,
        finalBreedCounts: new Map(snapshot.finalBreedCounts),
        peakBiodiversity: snapshot.peakBiodiversity ?? peakBiodiversity,
        longestStabilityStreak: snapshot.longestStabilityStreak,
        newStrainsBanked: [...snapshot.newStrainsBanked],
        totalStrainsDiscovered: snapshot.totalStrainsDiscovered,
        totalStrainsAvailable: snapshot.totalStrainsAvailable,
        newNotebookEntries: snapshot.newNotebookEntries,
        notebookCompletion: snapshot.notebookCompletion,
      };
    },
  };
}
