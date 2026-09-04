import { createMemoryStorage, type DiscoveryStorage } from './discoverySave';

export interface PreviewStorage extends DiscoveryStorage {
  beginPreview(): void;
  isPreview(): boolean;
  clear(): void;
}

// Keep one stable storage reference for the run, archive, coach and library.
// Once preview starts, even later banking/checkpoint writes stay in memory.
// Reloading discards the preview without restoring over another tab's saves.
export function createPreviewStorage(persistent: Storage): PreviewStorage {
  let preview: DiscoveryStorage | null = null;
  return {
    getItem: (key) => (preview ?? persistent).getItem(key),
    setItem: (key, value) => (preview ?? persistent).setItem(key, value),
    removeItem: (key) => (preview ?? persistent).removeItem(key),
    clear() {
      if (preview) preview = createMemoryStorage();
      else persistent.clear();
    },
    isPreview: () => preview !== null,
    beginPreview() {
      if (preview) return;
      const snapshot = createMemoryStorage();
      for (let i = 0; i < persistent.length; i++) {
        const key = persistent.key(i);
        if (key === null) continue;
        const value = persistent.getItem(key);
        if (value !== null) snapshot.setItem(key, value);
      }
      preview = snapshot;
    },
  };
}
