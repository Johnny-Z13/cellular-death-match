import { describe, expect, it } from 'vitest';
import { createMemoryStorage, type DiscoveryStorage } from '../../src/game/discoverySave';
import { removeVerified, writeVerifiedJson } from '../../src/game/verifiedStorage';

function load(storage: Pick<DiscoveryStorage, 'getItem'>, key: string): { count: number } {
  return JSON.parse(storage.getItem(key) ?? '{"count":0}') as { count: number };
}

describe('verified storage', () => {
  it('accepts a canonical write that can be read back', () => {
    const storage = createMemoryStorage();
    expect(writeVerifiedJson(storage, 'x', { count: 2 }, () => load(storage, 'x'))).toEqual({
      status: 'saved',
      value: { count: 2 },
    });
  });

  it('rejects throwing and silent no-op writes', () => {
    const throwing: DiscoveryStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('denied'); },
      removeItem: () => undefined,
    };
    expect(writeVerifiedJson(throwing, 'x', { count: 2 }, () => load(throwing, 'x'))).toMatchObject({
      status: 'unavailable', reason: 'write-failed',
    });

    const noOp: DiscoveryStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(writeVerifiedJson(noOp, 'x', { count: 2 }, () => load(noOp, 'x'))).toMatchObject({
      status: 'unavailable', reason: 'readback-mismatch',
    });
  });

  it('verifies removal instead of assuming it', () => {
    const storage = createMemoryStorage();
    storage.setItem('x', 'value');
    expect(removeVerified(storage, 'x')).toEqual({ status: 'saved' });

    const noOp: DiscoveryStorage = {
      getItem: () => 'value',
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(removeVerified(noOp, 'x')).toMatchObject({
      status: 'unavailable', reason: 'readback-mismatch',
    });
  });
});
