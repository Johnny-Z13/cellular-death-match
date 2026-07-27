export type HapticCue = 'impact' | 'discovery' | 'success' | 'warning' | 'failure';

interface HapticDriver {
  vibrate(pattern: number | number[]): boolean;
}

interface HapticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Haptics {
  isSupported(): boolean;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  toggle(): boolean;
  play(cue: HapticCue): boolean;
}

export interface HapticsOptions {
  driver?: HapticDriver | null;
  storage?: HapticStorage | null;
  isCoarsePointer?: () => boolean;
  now?: () => number;
}

export const HAPTICS_STORAGE_KEY = 'cdm.haptics.enabled.v1';

const HAPTIC_PATTERNS: Record<HapticCue, number[]> = {
  impact: [18, 24, 18],
  discovery: [16, 34, 22, 38, 40],
  success: [18, 42, 34],
  warning: [42, 52, 42],
  failure: [72, 48, 72],
};

const MIN_CUE_GAP_MS = 520;

export function createHaptics(options: HapticsOptions = {}): Haptics {
  const driver = options.driver === undefined ? browserHapticDriver() : options.driver;
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const isCoarsePointer = options.isCoarsePointer ?? browserHasCoarsePointer;
  const now = options.now ?? (() => performance.now());
  const supported = driver !== null && isCoarsePointer();
  let enabled = readEnabled(storage);
  let lastCueAt = Number.NEGATIVE_INFINITY;

  function saveEnabled(): void {
    try {
      storage?.setItem(HAPTICS_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Storage can be unavailable in private browsing; haptics still work in-session.
    }
  }

  return {
    isSupported() {
      return supported;
    },
    isEnabled() {
      return enabled;
    },
    setEnabled(next) {
      enabled = next;
      saveEnabled();
      if (!enabled && supported && driver) {
        try {
          driver.vibrate(0);
        } catch {
          // The Vibration API is best-effort.
        }
      }
    },
    toggle() {
      enabled = !enabled;
      saveEnabled();
      return enabled;
    },
    play(cue) {
      if (!supported || !enabled || !driver) return false;
      const cueAt = now();
      if (cueAt - lastCueAt < MIN_CUE_GAP_MS) return false;
      lastCueAt = cueAt;
      try {
        return driver.vibrate([...HAPTIC_PATTERNS[cue]]);
      } catch {
        return false;
      }
    },
  };
}

function browserHapticDriver(): HapticDriver | null {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return null;
  return {
    vibrate(pattern) {
      return navigator.vibrate(pattern);
    },
  };
}

function browserStorage(): HapticStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function browserHasCoarsePointer(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
}

function readEnabled(storage: HapticStorage | null): boolean {
  try {
    return storage?.getItem(HAPTICS_STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}
