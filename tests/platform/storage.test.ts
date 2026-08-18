import { describe, expect, it } from 'vitest';
import {
  createMemoryKeyValueStorage,
  createStorageAdapter,
  type KeyValueStorage,
} from '../../src/platform/storage';

describe('platform storage adapter', () => {
  it('scopes keys and stores JSON through localStorage fallback', () => {
    const localStorage = createMemoryKeyValueStorage();
    const storage = createStorageAdapter({ namespace: 'cellular-death-match.cg.v1', localStorage });

    expect(storage.backend).toBe('localStorage');
    expect(storage.setJson('save', { dna: 70 })).toBe(true);
    expect(localStorage.getItem('cellular-death-match.cg.v1.save')).toBe('{"dna":70}');
    expect(storage.getJson('save', { dna: 0 })).toEqual({ dna: 70 });
  });

  it('prefers CrazyGames data storage when available', () => {
    const crazyGamesData = createMemoryKeyValueStorage();
    const localStorage = createMemoryKeyValueStorage();
    const storage = createStorageAdapter({ namespace: 'cellular-death-match.cg.v1', crazyGamesData, localStorage });

    expect(storage.backend).toBe('crazygames');
    storage.setRaw('save', 'cloud');
    expect(crazyGamesData.getItem('cellular-death-match.cg.v1.save')).toBe('cloud');
    expect(localStorage.getItem('cellular-death-match.cg.v1.save')).toBeNull();
  });

  it('falls back to memory if persistent storage throws', () => {
    const throwingStorage: KeyValueStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const storage = createStorageAdapter({ namespace: 'cellular-death-match.cg.v1', localStorage: throwingStorage });

    expect(storage.backend).toBe('memory');
    expect(storage.setRaw('save', 'ok')).toBe(true);
    expect(storage.getRaw('save')).toBe('ok');
  });
});
