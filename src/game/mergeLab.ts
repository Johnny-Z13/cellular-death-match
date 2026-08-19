import type { Analytics } from '../platform/analytics';
import type { GameStorage } from '../platform/storage';

export const MERGE_LAB_SAVE_KEY = 'save';
export const MERGE_LAB_SAVE_VERSION = 1;
export const FIRST_MERGE_DNA = 70;
export const FEED_DNA = 10;
export const NOVICE_UPGRADE_DNA = 30;
export const SECOND_MERGE_DNA = 90;

// These are existing ecosystem upgrade ids so the onboarding choice can carry
// directly into the live run instead of becoming throwaway tutorial state.
export type MergeLabUpgradeChoice = 'egg_1' | 'red_buffer_1';

export interface MergeLabSave {
  version: typeof MERGE_LAB_SAVE_VERSION;
  flags: {
    firstPlayableSeen: boolean;
    firstMergeRewardClaimed: boolean;
    noviceTopUpClaimed: boolean;
  };
  run: {
    dna: number;
    firstInputAtMs: number | null;
    firstMergeAtMs: number | null;
    firstRewardAtMs: number | null;
    firstFeedAtMs: number | null;
    firstUpgradeAtMs: number | null;
    secondMergeAtMs: number | null;
  };
  atlas: {
    reveals: number;
    firstFamily: string | null;
  };
  upgrade: {
    firstChoice: MergeLabUpgradeChoice | null;
  };
  mergeTiers: Record<string, number>;
  updatedAtMs: number;
}

export interface MergeLabRuntime {
  state: MergeLabSave;
  recordFirstInput(nowMs: number): MergeLabSave;
  performFirstMerge(nowMs: number): MergeLabSave;
  performFeed(nowMs: number): MergeLabSave;
  performNoviceUpgrade(choice: MergeLabUpgradeChoice, nowMs: number): MergeLabSave;
  performSecondMerge(nowMs: number): MergeLabSave;
}

export function createEmptyMergeLabSave(nowMs = 0): MergeLabSave {
  return {
    version: MERGE_LAB_SAVE_VERSION,
    flags: {
      firstPlayableSeen: false,
      firstMergeRewardClaimed: false,
      noviceTopUpClaimed: false,
    },
    run: {
      dna: 0,
      firstInputAtMs: null,
      firstMergeAtMs: null,
      firstRewardAtMs: null,
      firstFeedAtMs: null,
      firstUpgradeAtMs: null,
      secondMergeAtMs: null,
    },
    atlas: {
      reveals: 0,
      firstFamily: null,
    },
    upgrade: {
      firstChoice: null,
    },
    mergeTiers: {
      sprinter: 1,
    },
    updatedAtMs: nowMs,
  };
}

export function loadMergeLabSave(storage: GameStorage, nowMs = 0): MergeLabSave {
  return storage.getJson(MERGE_LAB_SAVE_KEY, createEmptyMergeLabSave(nowMs), sanitizeMergeLabSave);
}

export function saveMergeLabState(storage: GameStorage, state: MergeLabSave): void {
  storage.setJson(MERGE_LAB_SAVE_KEY, state);
}

export function createMergeLabRuntime(
  storage: GameStorage,
  analytics: Analytics,
  nowMs = 0,
): MergeLabRuntime {
  let state = loadMergeLabSave(storage, nowMs);

  const commit = (next: MergeLabSave, eventName: string, data?: Record<string, string | number | boolean | null>) => {
    state = next;
    saveMergeLabState(storage, state);
    analytics.record(eventName, data);
    return state;
  };

  return {
    get state() {
      return state;
    },
    recordFirstInput(atMs) {
      if (state.run.firstInputAtMs !== null) return state;
      return commit({
        ...state,
        flags: { ...state.flags, firstPlayableSeen: true },
        run: { ...state.run, firstInputAtMs: atMs },
        updatedAtMs: atMs,
      }, 'first_input');
    },
    performFirstMerge(atMs) {
      if (state.run.firstMergeAtMs !== null) return state;
      const next = commit({
        ...state,
        flags: { ...state.flags, firstMergeRewardClaimed: true },
        run: {
          ...state.run,
          dna: state.run.dna + FIRST_MERGE_DNA,
          firstMergeAtMs: atMs,
          firstRewardAtMs: atMs,
        },
        atlas: {
          reveals: Math.max(state.atlas.reveals, 1),
          firstFamily: state.atlas.firstFamily ?? 'sprinter',
        },
        mergeTiers: {
          ...state.mergeTiers,
          sprinter: Math.max(state.mergeTiers.sprinter ?? 1, 2),
        },
        updatedAtMs: atMs,
      }, 'first_merge', {
        dna: FIRST_MERGE_DNA,
        atlasReveals: 1,
        mergeTier: 2,
      });
      analytics.record('first_reward', { dna: FIRST_MERGE_DNA });
      return next;
    },
    performFeed(atMs) {
      if (state.run.firstMergeAtMs === null || state.run.firstFeedAtMs !== null) return state;
      return commit({
        ...state,
        run: {
          ...state.run,
          dna: state.run.dna + FEED_DNA,
          firstFeedAtMs: atMs,
        },
        updatedAtMs: atMs,
      }, 'first_feed', {
        dna: FEED_DNA,
      });
    },
    performNoviceUpgrade(choice, atMs) {
      if (state.run.firstFeedAtMs === null || state.flags.noviceTopUpClaimed) return state;
      const next = commit({
        ...state,
        flags: { ...state.flags, noviceTopUpClaimed: true },
        run: {
          ...state.run,
          dna: state.run.dna + NOVICE_UPGRADE_DNA,
          firstUpgradeAtMs: atMs,
        },
        upgrade: {
          firstChoice: choice,
        },
        updatedAtMs: atMs,
      }, 'first_upgrade', {
        choice,
        dna: NOVICE_UPGRADE_DNA,
      });
      analytics.record('next_goal_shown', { goal: 'second_merge' });
      return next;
    },
    performSecondMerge(atMs) {
      if (!state.flags.noviceTopUpClaimed || state.run.secondMergeAtMs !== null) return state;
      return commit({
        ...state,
        run: {
          ...state.run,
          dna: state.run.dna + SECOND_MERGE_DNA,
          secondMergeAtMs: atMs,
        },
        atlas: {
          reveals: Math.max(state.atlas.reveals, 2),
          firstFamily: state.atlas.firstFamily ?? 'sprinter',
        },
        mergeTiers: {
          ...state.mergeTiers,
          sprinter: Math.max(state.mergeTiers.sprinter ?? 1, 3),
        },
        updatedAtMs: atMs,
      }, 'second_merge', {
        dna: SECOND_MERGE_DNA,
        atlasReveals: 2,
        mergeTier: 3,
      });
    },
  };
}

export function sanitizeMergeLabSave(value: unknown): MergeLabSave {
  if (!value || typeof value !== 'object') return createEmptyMergeLabSave();
  const input = value as Record<string, unknown>;
  if (input.version !== MERGE_LAB_SAVE_VERSION) return createEmptyMergeLabSave();
  const flags = objectValue(input.flags);
  const run = objectValue(input.run);
  const atlas = objectValue(input.atlas);
  const mergeTiers = objectValue(input.mergeTiers);

  return {
    version: MERGE_LAB_SAVE_VERSION,
    flags: {
      firstPlayableSeen: flags.firstPlayableSeen === true,
      firstMergeRewardClaimed: flags.firstMergeRewardClaimed === true,
      noviceTopUpClaimed: flags.noviceTopUpClaimed === true,
    },
    run: {
      dna: nonNegativeNumber(run.dna),
      firstInputAtMs: nullableNonNegativeNumber(run.firstInputAtMs),
      firstMergeAtMs: nullableNonNegativeNumber(run.firstMergeAtMs),
      firstRewardAtMs: nullableNonNegativeNumber(run.firstRewardAtMs),
      firstFeedAtMs: nullableNonNegativeNumber(run.firstFeedAtMs),
      firstUpgradeAtMs: nullableNonNegativeNumber(run.firstUpgradeAtMs),
      secondMergeAtMs: nullableNonNegativeNumber(run.secondMergeAtMs),
    },
    atlas: {
      reveals: clampInt(atlas.reveals, 0, 12),
      firstFamily: typeof atlas.firstFamily === 'string' ? atlas.firstFamily : null,
    },
    upgrade: {
      firstChoice: upgradeChoice(objectValue(input.upgrade).firstChoice),
    },
    mergeTiers: sanitizeMergeTiers(mergeTiers),
    updatedAtMs: nonNegativeNumber(input.updatedAtMs),
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function sanitizeMergeTiers(value: Record<string, unknown>): Record<string, number> {
  const sprinter = clampInt(value.sprinter, 1, 4);
  return { sprinter };
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function nullableNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function clampInt(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function upgradeChoice(value: unknown): MergeLabUpgradeChoice | null {
  if (value === 'egg_1' || value === 'red_buffer_1') return value;
  // Migrate the two labels used by the initial isolated Merge Lab slice.
  if (value === 'quick_split') return 'egg_1';
  if (value === 'hard_shell') return 'red_buffer_1';
  return null;
}
