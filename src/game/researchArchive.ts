import type { DiscoveryStorage } from './discoverySave';
import { writeVerifiedJson, type VerifiedWriteResult } from './verifiedStorage';

export type ResearchSealId =
  | 'first_specimen'
  | 'repeatable_result'
  | 'case_sealed'
  | 'hybrid_theory'
  | 'chain_reaction'
  | 'menagerie'
  | 'living_clock'
  | 'strange_attractor';

export interface ResearchSealDef {
  id: ResearchSealId;
  title: string;
  description: string;
  professorNote: string;
  color: [number, number, number];
}

export const RESEARCH_SEALS: readonly ResearchSealDef[] = [
  {
    id: 'first_specimen',
    title: 'First Specimen',
    description: 'Stabilize a derived lifeform and bank its egg.',
    professorNote: 'Observation becomes science when the specimen survives.',
    color: [180, 255, 96],
  },
  {
    id: 'repeatable_result',
    title: 'Repeatable Result',
    description: 'Reproduce a reaction until its protocol is understood.',
    professorNote: 'Once is an accident. Twice is a method.',
    color: [95, 238, 242],
  },
  {
    id: 'case_sealed',
    title: 'Case 01 Sealed',
    description: 'Complete all five Common Cold Case Trials.',
    professorNote: 'The patient may still be sneezing. The research is immaculate.',
    color: [255, 210, 104],
  },
  {
    id: 'hybrid_theory',
    title: 'Hybrid Theory',
    description: 'Stabilize a lifeform bred from two discovered parents.',
    professorNote: 'Two answers met and produced a better question.',
    color: [222, 112, 255],
  },
  {
    id: 'chain_reaction',
    title: 'Chain Reaction',
    description: 'Trigger three reactions in one laboratory run.',
    professorNote: 'One spark is chemistry. Three is choreography.',
    color: [255, 126, 72],
  },
  {
    id: 'menagerie',
    title: 'Menagerie',
    description: 'Keep six distinct lifeform families alive in one dish.',
    professorNote: 'Untidy, crowded and—against all probability—alive.',
    color: [98, 229, 150],
  },
  {
    id: 'living_clock',
    title: 'Living Clock',
    description: 'Hold a diverse ecosystem stable for twenty seconds.',
    professorNote: 'It is no longer merely surviving. It is keeping time.',
    color: [106, 180, 255],
  },
  {
    id: 'strange_attractor',
    title: 'Strange Attractor',
    description: 'Record a self-sustaining biome.',
    professorNote: 'The dish has developed a geography of its own.',
    color: [255, 106, 184],
  },
];

export interface BiomeArchiveRecord {
  name: string;
  recordedAt: string;
}

export interface ResearchArchiveState {
  earnedSealIds: ResearchSealId[];
  biomeRecords: BiomeArchiveRecord[];
  records: {
    peakBiodiversity: number;
    maxReactions: number;
    longestStabilitySeconds: number;
  };
}

export interface ResearchEvidence {
  caseComplete?: boolean;
  stabilizedBreedCount?: number;
  understoodRecipeCount?: number;
  stabilizedHybridCount?: number;
  reactions?: number;
  peakBiodiversity?: number;
  stabilitySeconds?: number;
  biomeName?: string | null;
}

export interface ResearchArchiveUpdate {
  state: ResearchArchiveState;
  newSealIds: ResearchSealId[];
  newBiome: boolean;
}

export const RESEARCH_ARCHIVE_KEY = 'cellular-death-match.research-archive.v1';
export const MAX_BIOME_ARCHIVE_RECORDS = 256;
export const MAX_BIOME_NAME_CHARS = 80;
export const MAX_RESEARCH_RECORD_VALUE = 1_000_000_000;

const VALID_SEALS = new Set<ResearchSealId>(RESEARCH_SEALS.map((seal) => seal.id));

export function emptyResearchArchive(): ResearchArchiveState {
  return {
    earnedSealIds: [],
    biomeRecords: [],
    records: {
      peakBiodiversity: 0,
      maxReactions: 0,
      longestStabilitySeconds: 0,
    },
  };
}

export function loadResearchArchive(storage: Pick<DiscoveryStorage, 'getItem'>): ResearchArchiveState {
  try {
    const raw = storage.getItem(RESEARCH_ARCHIVE_KEY);
    return raw ? canonicalResearchArchive(JSON.parse(raw)) : emptyResearchArchive();
  } catch {
    return emptyResearchArchive();
  }
}

export function saveResearchArchive(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  state: ResearchArchiveState,
): ResearchArchiveState {
  return saveResearchArchiveVerified(storage, state).value;
}

export function saveResearchArchiveVerified(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  state: ResearchArchiveState,
): VerifiedWriteResult<ResearchArchiveState> {
  const canonical = canonicalResearchArchive(state);
  return writeVerifiedJson(
    storage,
    RESEARCH_ARCHIVE_KEY,
    canonical,
    () => loadResearchArchive(storage),
  );
}

export function recordResearchEvidence(
  state: ResearchArchiveState,
  evidence: ResearchEvidence,
  recordedAt = new Date().toISOString(),
): ResearchArchiveUpdate {
  const next = canonicalResearchArchive(state);
  next.records.peakBiodiversity = Math.max(next.records.peakBiodiversity, whole(evidence.peakBiodiversity));
  next.records.maxReactions = Math.max(next.records.maxReactions, whole(evidence.reactions));
  next.records.longestStabilitySeconds = Math.max(
    next.records.longestStabilitySeconds,
    whole(evidence.stabilitySeconds),
  );

  let newBiome = false;
  const biomeName = normalizedBiomeName(evidence.biomeName);
  if (biomeName && !next.biomeRecords.some((record) => record.name === biomeName)) {
    next.biomeRecords.push({ name: biomeName, recordedAt });
    // Current content has fewer than 200 possible biome names. Keep generous
    // expansion headroom while bounding an archive forever: at the boundary,
    // compact the oldest entry and preserve the newly observed biome.
    if (next.biomeRecords.length > MAX_BIOME_ARCHIVE_RECORDS) {
      next.biomeRecords = next.biomeRecords.slice(-MAX_BIOME_ARCHIVE_RECORDS);
    }
    newBiome = true;
  }

  const earned = new Set(next.earnedSealIds);
  const candidates: Array<[ResearchSealId, boolean]> = [
    ['first_specimen', whole(evidence.stabilizedBreedCount) >= 1],
    ['repeatable_result', whole(evidence.understoodRecipeCount) >= 1],
    ['case_sealed', evidence.caseComplete === true],
    ['hybrid_theory', whole(evidence.stabilizedHybridCount) >= 1],
    ['chain_reaction', next.records.maxReactions >= 3],
    ['menagerie', next.records.peakBiodiversity >= 6],
    ['living_clock', next.records.longestStabilitySeconds >= 20],
    ['strange_attractor', next.biomeRecords.length >= 1],
  ];
  const newSealIds: ResearchSealId[] = [];
  for (const [id, achieved] of candidates) {
    if (!achieved || earned.has(id)) continue;
    earned.add(id);
    newSealIds.push(id);
  }
  next.earnedSealIds = RESEARCH_SEALS.map((seal) => seal.id).filter((id) => earned.has(id));

  return { state: next, newSealIds, newBiome };
}

export function revealAllResearchArchive(
  state: ResearchArchiveState,
  recordedAt = new Date().toISOString(),
): ResearchArchiveState {
  return {
    earnedSealIds: RESEARCH_SEALS.map((seal) => seal.id),
    biomeRecords: state.biomeRecords.length > 0
      ? [...state.biomeRecords]
      : [{ name: 'Coral Basin', recordedAt }],
    records: {
      peakBiodiversity: Math.max(6, state.records.peakBiodiversity),
      maxReactions: Math.max(3, state.records.maxReactions),
      longestStabilitySeconds: Math.max(20, state.records.longestStabilitySeconds),
    },
  };
}

export function researchSealById(id: ResearchSealId): ResearchSealDef {
  return RESEARCH_SEALS.find((seal) => seal.id === id)!;
}

export function canonicalResearchArchive(value: unknown): ResearchArchiveState {
  if (!isObject(value)) return emptyResearchArchive();
  const rawSealIds = Array.isArray(value.earnedSealIds) ? value.earnedSealIds : [];
  const earnedSealIds = rawSealIds.length > 0
    ? RESEARCH_SEALS.map((seal) => seal.id).filter((id) => rawSealIds.includes(id) && VALID_SEALS.has(id))
    : [];
  const biomeRecords = Array.isArray(value.biomeRecords)
    ? value.biomeRecords.flatMap((record): BiomeArchiveRecord[] => {
      if (!isObject(record)) return [];
      const name = normalizedBiomeName(record.name);
      if (!name) return [];
      return [{
        name,
        recordedAt: validTimestamp(record.recordedAt),
      }];
    })
      .filter((record, index, records) => records.findIndex((candidate) => candidate.name === record.name) === index)
      .slice(-MAX_BIOME_ARCHIVE_RECORDS)
    : [];
  const records = isObject(value.records) ? value.records : {};
  return {
    earnedSealIds,
    biomeRecords,
    records: {
      peakBiodiversity: whole(records.peakBiodiversity),
      maxReactions: whole(records.maxReactions),
      longestStabilitySeconds: whole(records.longestStabilitySeconds),
    },
  };
}

function whole(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_RESEARCH_RECORD_VALUE, Math.max(0, Math.floor(value)))
    : 0;
}

function normalizedBiomeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (name.length === 0) return null;
  return name.slice(0, MAX_BIOME_NAME_CHARS);
}

function validTimestamp(value: unknown): string {
  return typeof value === 'string'
    && value.length <= 64
    && Number.isFinite(Date.parse(value))
    ? value
    : new Date().toISOString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
