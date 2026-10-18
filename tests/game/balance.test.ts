import { describe, expect, it } from 'vitest';
import { BALANCE_TUNING, createBalanceMeter, formatHeld } from '../../src/game/balance';

const vols = (entries: Record<string, number>) => new Map(Object.entries(entries));
const none = new Set<string>();

describe('balance meter', () => {
  it('is balanced with three strains and none over half the living mass', () => {
    const meter = createBalanceMeter();
    meter.sample({ strainVolumes: vols({ a: 40, b: 30, c: 30 }), hunterStrains: none }, 30);
    expect(meter.reading()).toMatchObject({ balanced: true, strains: 3, heldTicks: 30 });

    meter.sample({ strainVolumes: vols({ a: 60, b: 20, c: 20 }), hunterStrains: none }, 30);
    expect(meter.reading().balanced).toBe(false);

    meter.sample({ strainVolumes: vols({ a: 50, b: 50 }), hunterStrains: none }, 30);
    expect(meter.reading().balanced).toBe(false);
  });

  it('pauses the held clock on a dip instead of resetting it', () => {
    const meter = createBalanceMeter();
    const even = vols({ a: 1, b: 1, c: 1 });
    meter.sample({ strainVolumes: even, hunterStrains: none }, 600);
    meter.sample({ strainVolumes: vols({ a: 9, b: 1, c: 1 }), hunterStrains: none }, 6000);
    meter.sample({ strainVolumes: even, hunterStrains: none }, 600);
    expect(meter.reading().heldTicks).toBe(1200);
  });

  it('keeps a streak through a short dip, breaks it after the grace window', () => {
    const meter = createBalanceMeter();
    const even = vols({ a: 1, b: 1, c: 1 });
    const lopsided = vols({ a: 9, b: 1, c: 1 });
    meter.sample({ strainVolumes: even, hunterStrains: none }, 600);
    meter.sample({ strainVolumes: lopsided, hunterStrains: none }, BALANCE_TUNING.graceTicks - 30);
    expect(meter.reading().streakTicks).toBe(600);
    meter.sample({ strainVolumes: lopsided, hunterStrains: none }, 60);
    expect(meter.reading().streakTicks).toBe(0);
  });

  it('becomes a stable ecosystem after an unbroken streak, and stays one', () => {
    const meter = createBalanceMeter();
    const even = vols({ a: 1, b: 1, c: 1 });
    meter.sample({ strainVolumes: even, hunterStrains: none }, BALANCE_TUNING.stableAfterTicks - 30);
    expect(meter.reading().stable).toBe(false);
    meter.sample({ strainVolumes: even, hunterStrains: none }, 30);
    expect(meter.reading().stable).toBe(true);
    meter.sample({ strainVolumes: vols({ a: 1 }), hunterStrains: none }, 6000);
    expect(meter.reading().stable).toBe(true);
  });

  it('counts time with N strains alive and a hunter sharing the dish with prey', () => {
    const meter = createBalanceMeter();
    meter.sample({ strainVolumes: vols({ a: 1, b: 1, c: 1, d: 1, e: 1 }), hunterStrains: new Set(['a']) }, 60);
    meter.sample({ strainVolumes: vols({ a: 1, b: 1, c: 1 }), hunterStrains: new Set(['a']) }, 60);
    meter.sample({ strainVolumes: vols({ a: 9, b: 1 }), hunterStrains: new Set(['a']) }, 60);
    const reading = meter.reading();
    expect(reading.aliveTicks.get(5)).toBe(60);
    expect(reading.aliveTicks.get(3)).toBe(120);
    expect(reading.foodWebTicks).toBe(120);
  });

  it('formats held time as m:ss', () => {
    expect(formatHeld(0)).toBe('0:00');
    expect(formatHeld(60 * 102)).toBe('1:42');
  });
});
