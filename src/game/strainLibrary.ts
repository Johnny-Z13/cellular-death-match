import type { DiscoveryStorage } from './discoverySave';

const STRAIN_LIBRARY_KEY = 'cellular-death-match.strains.v1';
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
  getLoadoutSlots(): number;
  getRunCount(): number;
  getBiomeCount(): number;
  bankStrain(breedId: string): void;
  addLoadoutSlot(): void;
  setLoadout(strains: string[]): void;
  incrementRunCount(): void;
  incrementBiomeCount(): void;
  save(): void;
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

function sanitize(value: unknown): StrainLibraryState {
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

export function createStrainLibrary(storage: DiscoveryStorage): StrainLibrary {
  let state: StrainLibraryState;

  const raw = storage.getItem(STRAIN_LIBRARY_KEY);
  if (raw === null) {
    state = defaultState();
  } else {
    try {
      state = sanitize(JSON.parse(raw));
    } catch {
      state = defaultState();
    }
  }

  return {
    getAvailableStrains(): string[] {
      return [...state.availableStrains];
    },

    getLoadout(): string[] {
      return [...state.loadout];
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

    save(): void {
      storage.setItem(STRAIN_LIBRARY_KEY, JSON.stringify(state));
    },
  };
}
