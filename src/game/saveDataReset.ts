export interface SaveDataStorage {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
}

export const MERGE_LAB_LOCAL_SAVE_KEY = 'cellular-death-match.cg.v1.save';

export const ONBOARDING_SAVE_KEYS = [
  'cdm.coach.seen',
  'cdm.coach.seen.v2',
  'cdm.coach.seen.v3',
  MERGE_LAB_LOCAL_SAVE_KEY,
] as const;

const GAME_SAVE_PREFIXES = [
  'cellular-death-match.',
  'cdm.',
] as const;

export function resetOnboardingSaveData(storage: SaveDataStorage): number {
  return removeKeys(storage, ONBOARDING_SAVE_KEYS);
}

export function deleteAllGameSaveData(storage: SaveDataStorage): number {
  return removeKeys(storage, gameSaveKeys(storage));
}

export function shouldResetOnboardingFromLocation(location: Pick<Location, 'search'>): boolean {
  const params = new URLSearchParams(location.search);
  return truthy(params.get('resetOnboarding')) || truthy(params.get('resetSave'));
}

export function stripOnboardingResetParamsFromUrl(url: URL): URL {
  const next = new URL(url.href);
  next.searchParams.delete('resetOnboarding');
  next.searchParams.delete('resetSave');
  return next;
}

function removeKeys(storage: SaveDataStorage, keys: readonly string[]): number {
  let removed = 0;
  for (const key of keys) {
    try {
      if (storage.getItem(key) !== null) removed += 1;
      storage.removeItem(key);
    } catch {
      // Storage access can fail in private browsing. Reset controls must not crash.
    }
  }
  return removed;
}

function gameSaveKeys(storage: SaveDataStorage): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && GAME_SAVE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }
  return keys;
}

function truthy(value: string | null): boolean {
  return value === '1' || value === 'true' || value === 'yes';
}
