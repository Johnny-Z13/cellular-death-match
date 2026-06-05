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

export interface DiscoverySaveState {
  persistenceEnabled: boolean;
  discoveredBreedIds: BreedId[];
  discoveredNoteIds: DiscoveryNoteId[];
  revealAll: boolean;
}

export const DISCOVERY_SAVE_KEY = 'cellular-death-match.discovery.v1';

const EMPTY_SAVE: DiscoverySaveState = {
  persistenceEnabled: false,
  discoveredBreedIds: [],
  discoveredNoteIds: [],
  revealAll: false,
};

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
  if (!raw) return { ...EMPTY_SAVE };

  try {
    return sanitizeState(JSON.parse(raw));
  } catch {
    return { ...EMPTY_SAVE };
  }
}

export function saveDiscoveryState(
  storage: DiscoveryStorage,
  state: DiscoverySaveState,
): DiscoverySaveState {
  const sanitized = sanitizeState(state);
  const stateToStore = sanitized.persistenceEnabled
    ? sanitized
    : {
      ...sanitized,
      discoveredBreedIds: [],
      discoveredNoteIds: [],
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
    revealAll: false,
  });
}

export function revealAllDiscoveries(storage: DiscoveryStorage): DiscoverySaveState {
  const current = loadDiscoverySave(storage);
  return saveDiscoveryState(storage, {
    persistenceEnabled: current.persistenceEnabled,
    discoveredBreedIds: Object.keys(BREED_DEFS) as BreedId[],
    discoveredNoteIds: Object.keys(DISCOVERY_NOTES) as DiscoveryNoteId[],
    revealAll: true,
  });
}

function sanitizeState(value: unknown): DiscoverySaveState {
  if (!isObject(value)) return { ...EMPTY_SAVE };

  const persistenceEnabled = value.persistenceEnabled === true;
  if (!persistenceEnabled) return { ...EMPTY_SAVE };

  return {
    persistenceEnabled,
    discoveredBreedIds: uniqueValidIds(value.discoveredBreedIds, BREED_IDS) as BreedId[],
    discoveredNoteIds: uniqueValidIds(value.discoveredNoteIds, NOTE_IDS) as DiscoveryNoteId[],
    revealAll: value.revealAll === true,
  };
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
