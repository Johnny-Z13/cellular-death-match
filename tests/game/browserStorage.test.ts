import { describe, expect, it } from 'vitest';
import { acquireBrowserStorage } from '../../src/game/browserStorage';

function memory(): Storage {
  return acquireBrowserStorage(() => { throw new Error('denied'); }).storage;
}

describe('browser storage startup', () => {
  it('provides a complete temporary store when the browser getter throws', () => {
    const result = acquireBrowserStorage(() => { throw new Error('denied'); });
    expect(result.temporary).toBe(true);
    result.storage.setItem('trial', '2');
    expect(result.storage.getItem('trial')).toBe('2');
    expect(result.storage.key(0)).toBe('trial');
    expect(result.storage.length).toBe(1);
    result.storage.clear();
    expect(result.storage.length).toBe(0);
  });

  it('keeps persistent storage and propagates later write failures for retry', () => {
    const persistent = memory();
    persistent.setItem('trial', '2');
    const result = acquireBrowserStorage(() => persistent);
    expect(result.temporary).toBe(false);
    expect(result.storage).toBe(persistent);
    expect(persistent.length).toBe(1);
    persistent.setItem = () => { throw new Error('quota'); };
    expect(() => result.storage.setItem('trial', '3')).toThrow('quota');
  });

  it.each(['throw', 'ignore'] as const)('preserves readable saves when writes %s', (failure) => {
    const persistent = memory();
    persistent.setItem('trial', '2');
    persistent.setItem = () => { if (failure === 'throw') throw new Error('quota'); };
    const result = acquireBrowserStorage(() => persistent);
    expect(result.temporary).toBe(true);
    expect(result.storage.getItem('trial')).toBe('2');
    result.storage.setItem('trial', '3');
    expect(result.storage.getItem('trial')).toBe('3');
    expect(persistent.getItem('trial')).toBe('2');
  });

  it('does not use a partial snapshot when reading fails', () => {
    const persistent = memory();
    persistent.setItem('trial', '2');
    persistent.setItem('bank', 'pending');
    const getItem = persistent.getItem;
    persistent.getItem = (key) => { if (key === 'bank') throw new Error('denied'); return getItem(key); };
    const result = acquireBrowserStorage(() => persistent);
    expect(result.temporary).toBe(true);
    expect(result.storage.length).toBe(0);
  });
});
