import type { DiscoveryStorage } from './discoverySave';

export type VerifiedWriteResult<T> =
  | { status: 'saved'; value: T }
  | { status: 'unavailable'; value: T; reason: 'write-failed' | 'read-failed' | 'readback-mismatch' };

export type VerifiedRemoveResult =
  | { status: 'saved' }
  | { status: 'unavailable'; reason: 'remove-failed' | 'read-failed' | 'readback-mismatch' };

/**
 * Write canonical JSON, then verify through the owning module's canonical
 * loader. This detects throwing, denied, and silent/no-op storage adapters.
 */
export function writeVerifiedJson<T>(
  storage: Pick<DiscoveryStorage, 'getItem' | 'setItem'>,
  key: string,
  value: T,
  loadCanonical: () => T,
): VerifiedWriteResult<T> {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    return { status: 'unavailable', value, reason: 'write-failed' };
  }

  let actual: T;
  try {
    actual = loadCanonical();
  } catch {
    return { status: 'unavailable', value, reason: 'read-failed' };
  }
  if (stableJson(actual) !== stableJson(value)) {
    return { status: 'unavailable', value, reason: 'readback-mismatch' };
  }
  return { status: 'saved', value: actual };
}

export function removeVerified(
  storage: Pick<DiscoveryStorage, 'getItem' | 'removeItem'>,
  key: string,
): VerifiedRemoveResult {
  try {
    storage.removeItem(key);
  } catch {
    return { status: 'unavailable', reason: 'remove-failed' };
  }
  try {
    return storage.getItem(key) === null
      ? { status: 'saved' }
      : { status: 'unavailable', reason: 'readback-mismatch' };
  } catch {
    return { status: 'unavailable', reason: 'read-failed' };
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, sortValue(item)]),
  );
}
