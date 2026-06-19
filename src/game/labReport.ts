export interface LabReportInput {
  runNumber: number;
  outcome: 'won' | 'lost';
  biomeName?: string;
  epochCount: number;
  durationMs: number;
  discoveredBreeds: string[];
  discoveredHybrids: string[];
  reactionsTriggered: number;
  newBiome: boolean;
  finalBreedCounts: Map<string, number>;
  peakBiodiversity: number;
  longestStabilityStreak: number; // ticks
  newStrainsBanked: string[];
  totalStrainsDiscovered: number;
  totalStrainsAvailable: number;
  newNotebookEntries: number;
  notebookCompletion: number; // 0-1
}

export interface LabReport {
  header: {
    runNumber: number;
    outcome: 'won' | 'lost';
    biomeName?: string;
    epochCount: number;
    durationFormatted: string;
  };
  discoveries: {
    breeds: string[];
    hybrids: string[];
    reactionsTriggered: number;
    newBiome: boolean;
  };
  ecosystem: {
    finalBreedCounts: Map<string, number>;
    peakBiodiversity: number;
    longestStabilitySeconds: number;
  };
  strainBank: {
    newCount: number;
    newStrains: string[];
    totalProgress: string; // "5/13"
  };
  notebook: {
    newEntries: number;
    completion: number;
  };
}

export function assembleLabReport(input: LabReportInput): LabReport {
  const minutes = Math.floor(input.durationMs / 60_000);
  const seconds = Math.floor((input.durationMs % 60_000) / 1_000);
  const durationFormatted = `${minutes}m ${seconds}s`;

  return {
    header: {
      runNumber: input.runNumber,
      outcome: input.outcome,
      biomeName: input.biomeName,
      epochCount: input.epochCount,
      durationFormatted,
    },
    discoveries: {
      breeds: input.discoveredBreeds,
      hybrids: input.discoveredHybrids,
      reactionsTriggered: input.reactionsTriggered,
      newBiome: input.newBiome,
    },
    ecosystem: {
      finalBreedCounts: input.finalBreedCounts,
      peakBiodiversity: input.peakBiodiversity,
      longestStabilitySeconds: Math.round(input.longestStabilityStreak / 60),
    },
    strainBank: {
      newCount: input.newStrainsBanked.length,
      newStrains: input.newStrainsBanked,
      totalProgress: `${input.totalStrainsDiscovered}/${input.totalStrainsAvailable}`,
    },
    notebook: {
      newEntries: input.newNotebookEntries,
      completion: input.notebookCompletion,
    },
  };
}
