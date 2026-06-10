import {
  BREED_DEFS,
  DISCOVERY_NOTES,
  type BreedId,
  type DiscoveryNoteId,
} from '../content/catalysis';

export interface DiscoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DiscoverySaveRecord<Id extends string> {
  id: Id;
  discoveredAt: string;
  fresh: boolean;
}

export interface DiscoverySaveState {
  persistenceEnabled: boolean;
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  breedDiscoveryRecords: DiscoverySaveRecord<BreedId>[];
  noteDiscoveryRecords: DiscoverySaveRecord<DiscoveryNoteId>[];
  revealAll: boolean;
}

export type DiscoverySaveInput = Omit<
  DiscoverySaveState,
  'breedDiscoveryRecords' | 'noteDiscoveryRecords'
> & Partial<Pick<DiscoverySaveState, 'breedDiscoveryRecords' | 'noteDiscoveryRecords'>>;

export const DISCOVERY_SAVE_KEY = 'cellular-death-match.discovery.v1';

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
    return sanitizeState(JSON.parse(raw));
  } catch {
    return emptySave();
  }
}

export function saveDiscoveryState(
  storage: DiscoveryStorage,
  state: DiscoverySaveInput,
): DiscoverySaveState {
  const sanitized = sanitizeState(state);
  const stateToStore = sanitized.persistenceEnabled
    ? sanitized
    : {
      ...sanitized,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
      breedDiscoveryRecords: [],
      noteDiscoveryRecords: [],
      revealAll: false,
    };
  storage.setItem(DISCOVERY_SAVE_KEY, JSON.stringify(stateToStore));
  return stateToStore;
}

export function setDiscoveryPersistence(
  storage: DiscoveryStorage,
  persistenceEnabled: boolean,
): DiscoverySaveState {
  const current = loadDiscoverySave(storage);
  return saveDiscoveryState(storage, {
    ...current,
    persistenceEnabled,
  });
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
    breedDiscoveryRecords: discoveredBreedIds.map((id) => ({ id, discoveredAt, fresh: true })),
    noteDiscoveryRecords: discoveredNoteIds.map((id) => ({ id, discoveredAt, fresh: true })),
    revealAll: true,
  });
}

function sanitizeState(value: unknown): DiscoverySaveState {
  if (!isObject(value)) return emptySave();

  const persistenceEnabled = value.persistenceEnabled === true;
  if (!persistenceEnabled) return emptySave();

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
    ),
    noteDiscoveryRecords: sanitizeRecords(
      value.noteDiscoveryRecords,
      discoveredNoteIds,
      NOTE_IDS,
      false,
    ),
    revealAll: value.revealAll === true,
  };
}

function emptySave(): DiscoverySaveState {
  return {
    persistenceEnabled: false,
    discoveredBreedIds: [],
    discoveredNoteIds: [],
    breedDiscoveryRecords: [],
    noteDiscoveryRecords: [],
    revealAll: false,
  };
}

function sanitizeRecords<Id extends string>(
  value: unknown,
  ids: readonly Id[],
  allowed: Set<string>,
  fallbackFresh: boolean,
): DiscoverySaveRecord<Id>[] {
  const allowedIds = new Set<string>(ids);
  const records = new Map<string, DiscoverySaveRecord<Id>>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isObject(item) || typeof item.id !== 'string') continue;
      if (!allowed.has(item.id) || !allowedIds.has(item.id)) continue;
      records.set(item.id, {
        id: item.id as Id,
        discoveredAt: validDateString(item.discoveredAt),
        fresh: item.fresh === true,
      });
    }
  }

  for (const id of ids) {
    if (records.has(id)) continue;
    records.set(id, {
      id,
      discoveredAt: new Date().toISOString(),
      fresh: fallbackFresh,
    });
  }

  return ids.map((id) => records.get(id)!);
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
  return typeof value === 'string' && value.length > 0
    ? value
    : new Date().toISOString();
}
