import { describe, expect, it } from 'vitest';
import { createPreviewStorage } from '../../src/game/previewStorage';

function storageFixture(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
    clear: () => data.clear(),
  };
}

describe('preview storage', () => {
  it('persists normal play but isolates every preview write, removal and clear', () => {
    const persistent = storageFixture();
    const storage = createPreviewStorage(persistent);
    storage.setItem('checkpoint', 'trial-2');
    storage.setItem('genome', 'bloom');
    expect(persistent.getItem('checkpoint')).toBe('trial-2');
    storage.beginPreview();
    expect(storage.getItem('genome')).toBe('bloom');
    storage.setItem('checkpoint', 'open-lab');
    storage.removeItem('genome');
    storage.setItem('new-genome', 'all');
    storage.beginPreview();
    expect(storage.getItem('checkpoint')).toBe('open-lab');
    expect(persistent.getItem('checkpoint')).toBe('trial-2');
    expect(persistent.getItem('genome')).toBe('bloom');
    expect(persistent.getItem('new-genome')).toBeNull();
    storage.clear();
    expect(storage.getItem('checkpoint')).toBeNull();
    expect(persistent.length).toBe(2);
    expect(storage.isPreview()).toBe(true);
  });

  it('leaves newer saves from another tab intact when a preview is discarded', () => {
    const persistent = storageFixture();
    persistent.setItem('checkpoint', 'trial-2');
    const preview = createPreviewStorage(persistent);
    preview.beginPreview();
    persistent.setItem('checkpoint', 'trial-3');
    preview.setItem('checkpoint', 'open-lab');
    expect(createPreviewStorage(persistent).getItem('checkpoint')).toBe('trial-3');
  });
});
