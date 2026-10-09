import { describe, expect, it } from 'vitest';
import {
  LESSON_RECOVERY_TUNING,
  checkLessonCulture,
  createLessonWatch,
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
