export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageBackend = 'crazygames' | 'localStorage' | 'memory';

export interface GameStorage {
  readonly backend: StorageBackend;
  getRaw(key: string): string | null;
  setRaw(key: string, value: string): boolean;
  remove(key: string): boolean;
  getJson<T>(key: string, fallback: T, sanitize?: (value: unknown) => T): T;
  setJson<T>(key: string, value: T): boolean;
}

export interface StorageAdapterOptions {
  namespace: string;
  crazyGamesData?: KeyValueStorage | null;
  localStorage?: KeyValueStorage | null;
}

export function createMemoryKeyValueStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

export function createStorageAdapter(options: StorageAdapterOptions): GameStorage {
  const memory = createMemoryKeyValueStorage();
  const selected = usableStorage(options.crazyGamesData)
    ? { backend: 'crazygames' as const, storage: options.crazyGamesData! }
    : usableStorage(options.localStorage)
      ? { backend: 'localStorage' as const, storage: options.localStorage! }
      : { backend: 'memory' as const, storage: memory };

  const scopedKey = (key: string) => `${options.namespace}.${key}`;

  return {
    backend: selected.backend,
    getRaw(key) {
      try {
        return selected.storage.getItem(scopedKey(key));
      } catch {
        return null;
      }
    },
    setRaw(key, value) {
      try {
        selected.storage.setItem(scopedKey(key), value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        selected.storage.removeItem(scopedKey(key));
        return true;
      } catch {
        return false;
      }
    },
    getJson<T>(key: string, fallback: T, sanitize?: (value: unknown) => T): T {
      const raw = this.getRaw(key);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(raw) as unknown;
        return sanitize ? sanitize(parsed) : parsed as T;
      } catch {
        return fallback;
      }
    },
    setJson<T>(key: string, value: T): boolean {
      return this.setRaw(key, JSON.stringify(value));
    },
  };
}

function usableStorage(storage: KeyValueStorage | null | undefined): boolean {
  if (!storage) return false;
  const probe = '__cdm_storage_probe__';
  try {
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
