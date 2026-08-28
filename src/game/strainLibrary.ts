import type { DiscoveryStorage } from './discoverySave';
import { writeVerifiedJson, type VerifiedWriteResult } from './verifiedStorage';

export const STRAIN_LIBRARY_KEY = 'cellular-death-match.strains.v1';
const MAX_LOADOUT_SLOTS = 6;
const DEFAULT_STRAIN = 'swarmlet';

export interface StrainLibraryState {
  availableStrains: string[];
  loadout: string[];
  loadoutSlots: number;
  runCount: number;
  biomeCount: number;
}

export interface StrainLibrary {
  getAvailableStrains(): string[];
  getLoadout(): string[];
  getPlayableLoadout(): string[];
  getLoadoutSlots(): number;
  getRunCount(): number;
  getBiomeCount(): number;
  getState(): StrainLibraryState;
  replaceState(next: StrainLibraryState): void;
  bankStrain(breedId: string): void;
  addLoadoutSlot(): void;
  setLoadout(strains: string[]): void;
  incrementRunCount(): void;
  incrementBiomeCount(): void;
  save(): VerifiedWriteResult<StrainLibraryState>;
}

function defaultState(): StrainLibraryState {
  return {
    availableStrains: [DEFAULT_STRAIN],
    loadout: [DEFAULT_STRAIN],
    loadoutSlots: 2,
    runCount: 0,
    biomeCount: 0,
  };
}

export function canonicalStrainLibraryState(value: unknown): StrainLibraryState {
  const defaults = defaultState();

  if (typeof value !== 'object' || value === null) return defaults;

  const obj = value as Record<string, unknown>;

  const availableStrains = Array.isArray(obj.availableStrains)
    ? [...new Set(obj.availableStrains.filter((s): s is string => typeof s === 'string'))]
    : [DEFAULT_STRAIN];

  // Ensure the default strain is always present
  if (!availableStrains.includes(DEFAULT_STRAIN)) {
    availableStrains.unshift(DEFAULT_STRAIN);
  }

  const loadoutSlots =
    typeof obj.loadoutSlots === 'number' &&
    Number.isInteger(obj.loadoutSlots) &&
    obj.loadoutSlots >= 1 &&
    obj.loadoutSlots <= MAX_LOADOUT_SLOTS
      ? obj.loadoutSlots
      : defaults.loadoutSlots;

  const availableSet = new Set(availableStrains);
  const rawLoadout = Array.isArray(obj.loadout)
    ? obj.loadout.filter((s): s is string => typeof s === 'string' && availableSet.has(s))
    : [];
  // Deduplicate and cap to slot count
  const loadout = [...new Set(rawLoadout)].slice(0, loadoutSlots);

  const runCount =
    typeof obj.runCount === 'number' && Number.isInteger(obj.runCount) && obj.runCount >= 0
      ? obj.runCount
      : 0;

  const biomeCount =
    typeof obj.biomeCount === 'number' && Number.isInteger(obj.biomeCount) && obj.biomeCount >= 0
      ? obj.biomeCount
      : 0;

  return { availableStrains, loadout, loadoutSlots, runCount, biomeCount };
}

function playableLoadoutFor(state: StrainLibraryState): string[] {
  const availableSet = new Set(state.availableStrains);
  const loadout = [...new Set(state.loadout)]
    .filter((strain) => availableSet.has(strain))
    .slice(0, state.loadoutSlots);
  return loadout.length > 0 ? loadout : [DEFAULT_STRAIN];
}

export function createStrainLibrary(storage: DiscoveryStorage): StrainLibrary {
  let state = loadStrainLibraryState(storage);

  return {
    getAvailableStrains(): string[] {
      return [...state.availableStrains];
    },

    getLoadout(): string[] {
      return [...state.loadout];
    },

    getPlayableLoadout(): string[] {
      return playableLoadoutFor(state);
    },

    getLoadoutSlots(): number {
      return state.loadoutSlots;
    },

    getRunCount(): number {
      return state.runCount;
    },

    getBiomeCount(): number {
      return state.biomeCount;
    },

    getState(): StrainLibraryState {
      return cloneState(state);
    },

    replaceState(next: StrainLibraryState): void {
      state = canonicalStrainLibraryState(next);
    },

    bankStrain(breedId: string): void {
      if (!state.availableStrains.includes(breedId)) {
        state.availableStrains = [...state.availableStrains, breedId];
      }
    },

    addLoadoutSlot(): void {
      if (state.loadoutSlots < MAX_LOADOUT_SLOTS) {
        state.loadoutSlots += 1;
      }
    },

    setLoadout(strains: string[]): void {
      if (strains.length > state.loadoutSlots) {
        throw new Error(
          `Loadout has ${strains.length} strains but only ${state.loadoutSlots} slots are available`,
        );
      }
      const availableSet = new Set(state.availableStrains);
      for (const strain of strains) {
        if (!availableSet.has(strain)) {
          throw new Error(`Strain "${strain}" is not available in the strain library`);
        }
      }
      state.loadout = [...strains];
    },

    incrementRunCount(): void {
      state.runCount += 1;
    },

    incrementBiomeCount(): void {
      state.biomeCount += 1;
    },

    save(): VerifiedWriteResult<StrainLibraryState> {
      const result = saveStrainLibraryStateVerified(storage, state);
      state = result.value;
      return result;
    },
  };
}

export function loadStrainLibraryState(
  storage: Pick<DiscoveryStorage, 'getItem'>,
): StrainLibraryState {
  try {
    const raw = storage.getItem(STRAIN_LIBRARY_KEY);
    return raw === null ? defaultState() : canonicalStrainLibraryState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveStrainLibraryStateVerified(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  state: StrainLibraryState,
): VerifiedWriteResult<StrainLibraryState> {
  const canonical = canonicalStrainLibraryState(state);
  return writeVerifiedJson(
    storage,
    STRAIN_LIBRARY_KEY,
    canonical,
    () => loadStrainLibraryState(storage),
  );
}

function cloneState(state: StrainLibraryState): StrainLibraryState {
  return {
    ...state,
    availableStrains: [...state.availableStrains],
    loadout: [...state.loadout],
  };
}
