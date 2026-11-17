/** Acquire storage once at boot. Later write failures must still reach the
 * verified-save/retry flow; they must never silently become temporary saves. */
export function acquireBrowserStorage(acquire: () => Storage): { storage: Storage; temporary: boolean } {
  const data = new Map<string, string>();
  const memory: Storage = {
    get length() { return data.size; },
    key: (index) => [...data.keys()][index] ?? null,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
    clear: () => data.clear(),
  };
  let persistent: Storage;
  try {
    persistent = acquire();
    // Keep readable progress when the browser allows reads but denies writes.
    for (let i = 0; i < persistent.length; i++) {
      const key = persistent.key(i);
      if (key === null) continue;
      const value = persistent.getItem(key);
      if (value !== null) data.set(key, value);
    }
  } catch {
    data.clear(); // A partial snapshot could split a multi-key save transaction.
    return { storage: memory, temporary: true };
  }
  const probe = `cellular-death-match.storage-probe.${Date.now()}.${Math.random()}`;
  try {
    persistent.setItem(probe, '1');
    if (persistent.getItem(probe) !== '1') throw new Error('Storage write was ignored');
    persistent.removeItem(probe);
    if (persistent.getItem(probe) !== null) throw new Error('Storage removal was ignored');
    return { storage: persistent, temporary: false };
  } catch {
    try { persistent.removeItem(probe); } catch { /* Browser policy may deny cleanup too. */ }
    return { storage: memory, temporary: true };
  }
}
