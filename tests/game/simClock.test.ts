import { describe, expect, it } from 'vitest';
import { SIM_SPEED_TUNING } from '../../src/content/ecologyTuning';
import { createFixedStepClock, normalizeSimTicksPerSecond } from '../../src/game/simClock';

describe('normalizeSimTicksPerSecond', () => {
  it('keeps runtime speed within the tuned player range', () => {
    expect(normalizeSimTicksPerSecond(12)).toBe(SIM_SPEED_TUNING.minTicksPerSecond);
    expect(normalizeSimTicksPerSecond(144)).toBe(SIM_SPEED_TUNING.maxTicksPerSecond);
    expect(normalizeSimTicksPerSecond('72')).toBe(72);
    expect(normalizeSimTicksPerSecond('nope')).toBe(SIM_SPEED_TUNING.defaultTicksPerSecond);
  });
});

describe('createFixedStepClock', () => {
  it('clamps a 144Hz render loop to the configured sim speed', () => {
    const clock = createFixedStepClock({ ticksPerSecond: 72, nowMs: 0 });
    let ticks = 0;

    for (let frame = 1; frame <= 144; frame++) {
      ticks += clock.consumeTicks(frame * (1000 / 144));
    }

    expect(ticks).toBe(72);
  });

  it('allows catch-up on slow frames without unbounded resume bursts', () => {
    const clock = createFixedStepClock({ ticksPerSecond: 72, nowMs: 0 });

    expect(clock.consumeTicks(1000)).toBe(SIM_SPEED_TUNING.maxTicksPerFrame);
    expect(clock.consumeTicks(1010)).toBeLessThanOrEqual(SIM_SPEED_TUNING.maxTicksPerFrame);
  });

  it('resets accumulated time between arena runs', () => {
    const clock = createFixedStepClock({ ticksPerSecond: 72, nowMs: 0 });

    expect(clock.consumeTicks(100)).toBe(SIM_SPEED_TUNING.maxTicksPerFrame);
    clock.reset(100);

    expect(clock.consumeTicks(105)).toBe(0);
  });
});
