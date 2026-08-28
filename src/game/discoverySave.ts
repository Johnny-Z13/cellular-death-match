import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  type BreedId,
  type DiscoveryNoteId,
} from '../content/catalysis';
import { writeVerifiedJson, type VerifiedWriteResult } from './verifiedStorage';

export interface DiscoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type ResearchStage = 'observed' | 'understood' | 'stabilized';
export type LifeformResearchStage = 'observed' | 'stabilized';
export type ProtocolResearchStage = 'observed' | 'understood';

export interface DiscoverySaveRecord<
  Id extends string,
  Stage extends ResearchStage = ResearchStage,
> {
  id: Id;
  discoveredAt: string;
  fresh: boolean;
  stage: Stage;
}

export interface DiscoverySaveState {
  persistenceEnabled: boolean;
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  breedDiscoveryRecords: DiscoverySaveRecord<BreedId, LifeformResearchStage>[];
  noteDiscoveryRecords: DiscoverySaveRecord<DiscoveryNoteId, ProtocolResearchStage>[];
  revealAll: boolean;
}

export type DiscoverySaveInput = Omit<
  DiscoverySaveState,
  'breedDiscoveryRecords' | 'noteDiscoveryRecords'
> & Partial<Pick<DiscoverySaveState, 'breedDiscoveryRecords' | 'noteDiscoveryRecords'>>;

export const DISCOVERY_SAVE_KEY = 'cellular-death-match.discovery.v2';

const BREED_IDS = new Set(Object.keys(BREED_DEFS));
const NOTE_IDS = new Set(Object.keys(DISCOVERY_NOTES));

export function createMemoryStorage(): DiscoveryStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

export function loadDiscoverySave(storage: DiscoveryStorage): DiscoverySaveState {
  const raw = storage.getItem(DISCOVERY_SAVE_KEY);
  if (!raw) return emptySave();

  try {
    return canonicalDiscoveryState(JSON.parse(raw));
  } catch {
    return emptySave();
  }
}

export function saveDiscoveryState(
  storage: DiscoveryStorage,
  state: DiscoverySaveInput,
): DiscoverySaveState {
  return saveDiscoveryStateVerified(storage, state).value;
}

export function saveDiscoveryStateVerified(
  storage: DiscoveryStorage,
  state: DiscoverySaveInput,
): VerifiedWriteResult<DiscoverySaveState> {
  const sanitized = canonicalDiscoveryState(state);
  return writeVerifiedJson(
    storage,
    DISCOVERY_SAVE_KEY,
    sanitized,
    () => loadDiscoverySave(storage),
  );
}

export function clearDiscoverySave(storage: DiscoveryStorage): DiscoverySaveState {
  const current = loadDiscoverySave(storage);
  return saveDiscoveryState(storage, {
    persistenceEnabled: current.persistenceEnabled,
    discoveredBreedIds: [],
    discoveredNoteIds: [],
    breedDiscoveryRecords: [],
    noteDiscoveryRecords: [],
    revealAll: false,
  });
}

export function revealAllDiscoveries(storage: DiscoveryStorage): DiscoverySaveState {
  const current = loadDiscoverySave(storage);
  const discoveredAt = new Date().toISOString();
  const discoveredBreedIds = Object.keys(BREED_DEFS) as BreedId[];
  const discoveredNoteIds = Object.keys(DISCOVERY_NOTES) as DiscoveryNoteId[];
  return saveDiscoveryState(storage, {
    persistenceEnabled: current.persistenceEnabled,
    discoveredBreedIds,
    discoveredNoteIds,
    breedDiscoveryRecords: discoveredBreedIds.map((id) => ({
      id,
      discoveredAt,
      fresh: true,
      stage: 'stabilized' as const,
    })),
    noteDiscoveryRecords: discoveredNoteIds.map((id) => ({
      id,
      discoveredAt,
      fresh: true,
      stage: 'understood' as const,
    })),
    revealAll: true,
  });
}

export function canonicalDiscoveryState(value: unknown): DiscoverySaveState {
  if (!isObject(value)) return emptySave();

  // Research is a collection game, so discoveries persist by default. Older
  // saves that explicitly disabled the prototype-only toggle are upgraded to
  // the durable model instead of silently discarding future findings.
  const persistenceEnabled = true;

  const discoveredBreedIds = uniqueValidIds(value.discoveredBreedIds, BREED_IDS) as BreedId[];
  const discoveredNoteIds = uniqueValidIds(value.discoveredNoteIds, NOTE_IDS) as DiscoveryNoteId[];

  return {
    persistenceEnabled,
    discoveredBreedIds,
    discoveredNoteIds,
    breedDiscoveryRecords: sanitizeRecords(
      value.breedDiscoveryRecords,
      discoveredBreedIds,
      BREED_IDS,
      false,
      'stabilized',
      'breed',
    ),
    noteDiscoveryRecords: sanitizeRecords(
      value.noteDiscoveryRecords,
      discoveredNoteIds,
      NOTE_IDS,
      false,
      'understood',
      'note',
    ),
    revealAll: value.revealAll === true,
  };
}

function emptySave(): DiscoverySaveState {
  return {
    persistenceEnabled: true,
    discoveredBreedIds: [],
    discoveredNoteIds: [],
    breedDiscoveryRecords: [],
    noteDiscoveryRecords: [],
    revealAll: false,
  };
}

function sanitizeRecords<Id extends string, Stage extends ResearchStage>(
  value: unknown,
  ids: readonly Id[],
  allowed: Set<string>,
  fallbackFresh: boolean,
  fallbackStage: Stage,
  category: 'breed' | 'note',
): DiscoverySaveRecord<Id, Stage>[] {
  const allowedIds = new Set<string>(ids);
  const records = new Map<string, DiscoverySaveRecord<Id, Stage>>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isObject(item) || typeof item.id !== 'string') continue;
      if (!allowed.has(item.id) || !allowedIds.has(item.id)) continue;
      records.set(item.id, {
        id: item.id as Id,
        discoveredAt: validDateString(item.discoveredAt),
        fresh: item.fresh === true,
        stage: validResearchStage(item.stage, fallbackStage, category) as Stage,
      });
    }
  }

  for (const id of ids) {
    if (records.has(id)) continue;
    records.set(id, {
      id,
      discoveredAt: new Date().toISOString(),
      fresh: fallbackFresh,
      stage: fallbackStage,
    });
  }

  return ids.map((id) => records.get(id)!);
}

function validResearchStage(
  value: unknown,
  fallback: ResearchStage,
  category: 'breed' | 'note',
): ResearchStage {
  if (category === 'breed') {
    if (value === 'stabilized') return value;
    if (value === 'observed' || value === 'understood') return 'observed';
    return fallback;
  }
  if (value === 'understood' || value === 'stabilized') return 'understood';
  return value === 'observed' ? value : fallback;
}

function uniqueValidIds(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => (
    typeof id === 'string' && allowed.has(id)
  ))));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validDateString(value: unknown): string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 64
    && Number.isFinite(Date.parse(value))
    ? value
    : new Date().toISOString();
}
