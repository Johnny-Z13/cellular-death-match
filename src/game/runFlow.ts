import { classifyBiome } from './homeostasis';
import type { LabReportInput } from './labReport';
import type { RunTelemetry } from './runTelemetry';

export interface RunEndReportInputArgs {
  telemetry: Pick<RunTelemetry, 'toLabReportInput'>;
  endedAtMs: number;
  outcome: 'won' | 'lost';
  fightIndex: number;
  epochResults: ReadonlyArray<'completed' | 'lapsed'>;
  finalBreedCounts: ReadonlyMap<string, number>;
  finalBreedVolumes: ReadonlyMap<string, number>;
  peakBiodiversity: number;
  longestStabilityStreak: number;
  newStrainsBanked: readonly string[];
  totalStrainsDiscovered: number;
  totalStrainsAvailable: number;
  notebookDiscoveredCount: number;
  notebookTotalCount: number;
  notebookEntryCountAtRunStart: number;
  newBiome?: boolean;
  equilibriumBiomeName?: string | null;
}

export function createRunEndReportInput(args: RunEndReportInputArgs): LabReportInput {
  const biomeName = args.outcome === 'won'
    ? args.equilibriumBiomeName
      ?? (args.finalBreedVolumes.size > 0 ? classifyBiome(new Map(args.finalBreedVolumes)).name : undefined)
    : undefined;
  const notebookCompletion = args.notebookTotalCount === 0
    ? 0
    : args.notebookDiscoveredCount / args.notebookTotalCount;
  return args.telemetry.toLabReportInput({
    endedAtMs: args.endedAtMs,
    outcome: args.outcome,
    biomeName,
    epochCount: Math.max(1, args.fightIndex + 1, args.epochResults.length),
    newBiome: args.newBiome ?? false,
    finalBreedCounts: new Map(args.finalBreedCounts),
    peakBiodiversity: args.peakBiodiversity,
    longestStabilityStreak: args.longestStabilityStreak,
    newStrainsBanked: [...args.newStrainsBanked],
    totalStrainsDiscovered: args.totalStrainsDiscovered,
    totalStrainsAvailable: args.totalStrainsAvailable,
    newNotebookEntries: Math.max(0, args.notebookDiscoveredCount - args.notebookEntryCountAtRunStart),
    notebookCompletion,
  });
}
