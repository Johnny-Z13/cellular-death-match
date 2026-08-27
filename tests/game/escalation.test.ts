import { describe, expect, it } from 'vitest';
import { getEscalation } from '../../src/game/escalation';

describe('getEscalation', () => {
  it('keeps all five authored Case Trials at base pressure', () => {
    for (const epoch of [0, 1, 2, 3, 4, 5]) {
      expect(getEscalation(epoch)).toEqual({
        epochTicks: 60 * 70,
        crisisIntervalMul: 1,
        outbreakSeverity: 3,
        mutationStrength: 1,
        accidentIntervalMul: 1,
      });
    }
  });

  it('increases pressure once each Open Lab study beyond the first begins', () => {
    const first = getEscalation(5);
    const second = getEscalation(6);
    const third = getEscalation(7);

    expect(second.epochTicks).toBeLessThan(first.epochTicks);
    expect(third.epochTicks).toBeLessThan(second.epochTicks);
    expect(second.crisisIntervalMul).toBeCloseTo(0.95, 10);
    expect(second.accidentIntervalMul).toBeCloseTo(0.92, 10);
    expect(second.outbreakSeverity).toBe(4);
    expect(second.mutationStrength).toBeCloseTo(1.1, 10);
  });

  it('never shortens an observation window below forty seconds', () => {
    expect(getEscalation(20).epochTicks).toBe(60 * 40);
    expect(getEscalation(1000).epochTicks).toBe(60 * 40);
  });

  it('uses predictable linear severity and exponential interval scaling', () => {
    expect(getEscalation(9).outbreakSeverity).toBe(7);
    expect(getEscalation(15).mutationStrength).toBeCloseTo(2, 10);
    expect(getEscalation(9).crisisIntervalMul).toBeCloseTo(Math.pow(0.95, 4), 10);
    expect(getEscalation(9).accidentIntervalMul).toBeCloseTo(Math.pow(0.92, 4), 10);
  });
});
