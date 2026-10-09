// Guided-lesson rescue. During a coached trial the lesson is built around the
// culture the player just planted; if it dies before the lesson's result
// lands, waiting is a dead end. After a short grace the shell restarts the
// lesson from its first step with an honest "it didn't take".
export const LESSON_RECOVERY_TUNING = {
  /** How long the lesson culture must stay dead before the rewind. */
  graceMs: 2500,
  /** How long to watch for the lesson's result after the last taught step
   *  before admitting it isn't coming (e.g. the culture drifted off the
   *  field) and running the steps again. */
  observeTimeoutMs: 15000,
};

export interface LessonWatch {
  cellId: number | null;
  lostAtMs: number | null;
}

export type LessonRecoveryVerdict = 'watching' | 'idle' | 'rewind';

export function createLessonWatch(): LessonWatch {
  return { cellId: null, lostAtMs: null };
}

export function watchLessonCulture(watch: LessonWatch, cellId: number | null): void {
  watch.cellId = cellId;
  watch.lostAtMs = null;
}

/** Advance the watch; returns 'rewind' exactly once when the lesson culture
 *  has been dead for the grace period. */
export function checkLessonCulture(
  watch: LessonWatch,
  state: { lessonActive: boolean; resultReached: boolean; cultureAlive: boolean; nowMs: number },
): LessonRecoveryVerdict {
  if (watch.cellId === null) return 'idle';
  if (!state.lessonActive || state.resultReached) {
    watchLessonCulture(watch, null);
    return 'idle';
  }
  if (state.cultureAlive) {
    watch.lostAtMs = null;
    return 'watching';
  }
  watch.lostAtMs ??= state.nowMs;
  if (state.nowMs - watch.lostAtMs < LESSON_RECOVERY_TUNING.graceMs) return 'watching';
  watchLessonCulture(watch, null);
  return 'rewind';
}

export interface ObserveWatch {
  awaitingSinceMs: number | null;
}

export function createObserveWatch(): ObserveWatch {
  return { awaitingSinceMs: null };
}

/** True exactly once when the lesson has waited for its result too long. */
export function checkLessonStall(
  watch: ObserveWatch,
  state: { awaitingResult: boolean; resultReached: boolean; nowMs: number },
): boolean {
  if (!state.awaitingResult || state.resultReached) {
    watch.awaitingSinceMs = null;
    return false;
  }
  watch.awaitingSinceMs ??= state.nowMs;
  if (state.nowMs - watch.awaitingSinceMs < LESSON_RECOVERY_TUNING.observeTimeoutMs) return false;
  watch.awaitingSinceMs = null;
  return true;
}
