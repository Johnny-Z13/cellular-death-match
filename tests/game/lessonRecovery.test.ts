import { describe, expect, it } from 'vitest';
import {
  LESSON_RECOVERY_TUNING,
  checkLessonCulture,
  createLessonWatch,
  createObserveWatch,
  checkLessonStall,
  watchLessonCulture,
} from '../../src/game/lessonRecovery';

const live = { lessonActive: true, resultReached: false, cultureAlive: true, nowMs: 0 };

describe('guided lesson recovery', () => {
  it('does nothing until a lesson culture is being watched', () => {
    expect(checkLessonCulture(createLessonWatch(), { ...live, cultureAlive: false })).toBe('idle');
  });

  it('rewinds once after the lesson culture stays dead for the grace period', () => {
    const watch = createLessonWatch();
    watchLessonCulture(watch, 7);
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, nowMs: 1000 })).toBe('watching');
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, nowMs: 1000 + LESSON_RECOVERY_TUNING.graceMs - 1 })).toBe('watching');
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, nowMs: 1000 + LESSON_RECOVERY_TUNING.graceMs })).toBe('rewind');
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, nowMs: 9000 })).toBe('idle');
  });

  it('forgives a culture that flickers back within the grace period', () => {
    const watch = createLessonWatch();
    watchLessonCulture(watch, 7);
    checkLessonCulture(watch, { ...live, cultureAlive: false, nowMs: 0 });
    expect(checkLessonCulture(watch, { ...live, cultureAlive: true, nowMs: 1000 })).toBe('watching');
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, nowMs: 2000 })).toBe('watching');
  });

  it('stops watching once the lesson result lands or the lesson ends', () => {
    const watch = createLessonWatch();
    watchLessonCulture(watch, 7);
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, resultReached: true })).toBe('idle');
    watchLessonCulture(watch, 7);
    expect(checkLessonCulture(watch, { ...live, cultureAlive: false, lessonActive: false })).toBe('idle');
    expect(watch.cellId).toBeNull();
  });
});

describe('guided lesson stall', () => {
  it('fires once after waiting too long for the lesson result', () => {
    const watch = createObserveWatch();
    const waiting = { awaitingResult: true, resultReached: false };
    expect(checkLessonStall(watch, { ...waiting, nowMs: 0 })).toBe(false);
    expect(checkLessonStall(watch, { ...waiting, nowMs: LESSON_RECOVERY_TUNING.observeTimeoutMs - 1 })).toBe(false);
    expect(checkLessonStall(watch, { ...waiting, nowMs: LESSON_RECOVERY_TUNING.observeTimeoutMs })).toBe(true);
    expect(checkLessonStall(watch, { ...waiting, nowMs: LESSON_RECOVERY_TUNING.observeTimeoutMs + 10 })).toBe(false);
  });

  it('resets when the result lands or the wait ends', () => {
    const watch = createObserveWatch();
    checkLessonStall(watch, { awaitingResult: true, resultReached: false, nowMs: 0 });
    expect(checkLessonStall(watch, { awaitingResult: true, resultReached: true, nowMs: 20_000 })).toBe(false);
    checkLessonStall(watch, { awaitingResult: true, resultReached: false, nowMs: 30_000 });
    expect(checkLessonStall(watch, { awaitingResult: false, resultReached: false, nowMs: 50_000 })).toBe(false);
    expect(watch.awaitingSinceMs).toBeNull();
  });
});
