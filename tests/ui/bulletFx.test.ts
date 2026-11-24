import { describe, expect, it } from 'vitest';
import { BULLET_FX_TUNING as T, createBulletFx } from '../../src/ui/bulletFx';
import type { BulletImpact } from '../../src/sim/types';

const hit = (victimId: number, shielded = false): BulletImpact => ({
  ownerId: 9, victimId, pos: [5, 6], v: [2, 0], shielded,
});

function rig() {
  const sparks: Array<[number, boolean]> = [];
  const sounds: boolean[] = [];
  const fx = createBulletFx({
    spark: (_pos, _v, id, shielded) => sparks.push([id, shielded]),
    sound: (shielded) => sounds.push(shielded),
  });
  return { fx, sparks, sounds };
}

describe('bullet hit effects', () => {
  it('lights a struck culture, throws a spark and sounds, then fades', () => {
    const { fx, sparks, sounds } = rig();
    fx.update([hit(3)], 1000);
    expect(fx.flashes(1000).get(3)).toBe(1);
    expect(fx.flashes(1000 + T.flashMs / 2).get(3)).toBeCloseTo(0.5, 5);
    expect(fx.flashes(1000 + T.flashMs).has(3)).toBe(false);
    expect(sparks).toEqual([[3, false]]);
    expect(sounds).toEqual([false]);
  });

  it('never strobes a culture under heavy fire, but sparks for every bullet', () => {
    const { fx, sparks } = rig();
    let peaks = 0;
    for (let now = 0; now < 3000; now += 50) {
      fx.update([hit(3)], now);
      if (fx.flashes(now).get(3) === 1) peaks += 1;
    }
    expect(peaks / 3).toBeLessThanOrEqual(3);
    expect(sparks).toHaveLength(60);
  });

  it('keeps the sound sparse when many cultures are hit at once', () => {
    const { fx, sounds } = rig();
    fx.update([hit(3), hit(4), hit(5)], 1000);
    fx.update([hit(6)], 1000 + T.soundEveryMs / 2);
    expect(sounds).toHaveLength(1);
    fx.update([hit(7, true)], 1000 + T.soundEveryMs);
    expect(sounds).toEqual([false, true]);
  });

  it('holds a yolk shield lit for longer than a hit', () => {
    const { fx } = rig();
    fx.update([hit(3, true)], 0);
    expect(fx.flashes(T.flashMs).get(3)).toBeGreaterThan(0);
  });

  it('forgets everything for a new dish', () => {
    const { fx } = rig();
    fx.update([hit(3)], 0);
    fx.reset();
    expect(fx.flashes(0).size).toBe(0);
  });
});
