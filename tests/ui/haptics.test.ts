import { describe, expect, it, vi } from 'vitest';
import { createHaptics, HAPTICS_STORAGE_KEY } from '../../src/ui/haptics';

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
  };
}

describe('mobile haptics', () => {
  it('requires both vibration support and a coarse pointer', () => {
    const driver = { vibrate: vi.fn(() => true) };

    const desktop = createHaptics({
      driver,
      storage: null,
      isCoarsePointer: () => false,
      now: () => 0,
    });

    expect(desktop.isSupported()).toBe(false);
    expect(desktop.play('success')).toBe(false);
    expect(driver.vibrate).not.toHaveBeenCalled();
  });

  it('plays distinct semantic patterns and rate-limits event storms', () => {
    const driver = { vibrate: vi.fn(() => true) };
    let now = 1000;
    const haptics = createHaptics({
      driver,
      storage: null,
      isCoarsePointer: () => true,
      now: () => now,
    });

    expect(haptics.play('discovery')).toBe(true);
    expect(driver.vibrate).toHaveBeenLastCalledWith([16, 34, 22, 38, 40]);

    now += 100;
    expect(haptics.play('warning')).toBe(false);

    now += 600;
    expect(haptics.play('warning')).toBe(true);
    expect(driver.vibrate).toHaveBeenLastCalledWith([42, 52, 42]);
  });

  it('persists the preference and cancels vibration when disabled', () => {
    const driver = { vibrate: vi.fn(() => true) };
    const storage = memoryStorage();
    const haptics = createHaptics({
      driver,
      storage,
      isCoarsePointer: () => true,
      now: () => 0,
    });

    haptics.setEnabled(false);

    expect(haptics.isEnabled()).toBe(false);
    expect(storage.setItem).toHaveBeenCalledWith(HAPTICS_STORAGE_KEY, '0');
    expect(driver.vibrate).toHaveBeenLastCalledWith(0);
    expect(haptics.play('impact')).toBe(false);
  });

  it('loads a previously disabled preference', () => {
    const haptics = createHaptics({
      driver: { vibrate: vi.fn(() => true) },
      storage: memoryStorage('0'),
      isCoarsePointer: () => true,
      now: () => 0,
    });

    expect(haptics.isEnabled()).toBe(false);
  });
});
