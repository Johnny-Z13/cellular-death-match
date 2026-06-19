import { describe, it, expect } from 'vitest';
import { getEscalation } from '../../src/game/escalation';

describe('getEscalation', () => {
  describe('epoch 3 returns base values', () => {
    it('crisisIntervalMul is 1.0 at epoch 3', () => {
      expect(getEscalation(3).crisisIntervalMul).toBe(1.0);
    });

    it('outbreakSeverity is 3 at epoch 3', () => {
      expect(getEscalation(3).outbreakSeverity).toBe(3);
    });

    it('mutationStrength is 1.0 at epoch 3', () => {
      expect(getEscalation(3).mutationStrength).toBe(1.0);
    });

    it('accidentIntervalMul is 1.0 at epoch 3', () => {
      expect(getEscalation(3).accidentIntervalMul).toBe(1.0);
    });

    it('epochTicks is base (60*70) at epoch 3', () => {
      expect(getEscalation(3).epochTicks).toBe(60 * 70);
    });
  });

  describe('epochs before 3 also return base values (depth clamped to 0)', () => {
    for (const epoch of [0, 1, 2]) {
      it(`epoch ${epoch} has crisisIntervalMul=1.0`, () => {
        expect(getEscalation(epoch).crisisIntervalMul).toBe(1.0);
      });

      it(`epoch ${epoch} has outbreakSeverity=3`, () => {
        expect(getEscalation(epoch).outbreakSeverity).toBe(3);
      });

      it(`epoch ${epoch} has mutationStrength=1.0`, () => {
        expect(getEscalation(epoch).mutationStrength).toBe(1.0);
      });

      it(`epoch ${epoch} has accidentIntervalMul=1.0`, () => {
        expect(getEscalation(epoch).accidentIntervalMul).toBe(1.0);
      });

      it(`epoch ${epoch} has epochTicks=60*70`, () => {
        expect(getEscalation(epoch).epochTicks).toBe(60 * 70);
      });
    }
  });

  describe('each epoch after 3 increases pressure', () => {
    it('crisisIntervalMul decreases each epoch past 3', () => {
      const e3 = getEscalation(3).crisisIntervalMul;
      const e4 = getEscalation(4).crisisIntervalMul;
      const e5 = getEscalation(5).crisisIntervalMul;
      expect(e4).toBeLessThan(e3);
      expect(e5).toBeLessThan(e4);
    });

    it('accidentIntervalMul decreases each epoch past 3', () => {
      const e3 = getEscalation(3).accidentIntervalMul;
      const e4 = getEscalation(4).accidentIntervalMul;
      const e5 = getEscalation(5).accidentIntervalMul;
      expect(e4).toBeLessThan(e3);
      expect(e5).toBeLessThan(e4);
    });

    it('outbreakSeverity increases each epoch past 3', () => {
      const e3 = getEscalation(3).outbreakSeverity;
      const e4 = getEscalation(4).outbreakSeverity;
      const e5 = getEscalation(5).outbreakSeverity;
      expect(e4).toBeGreaterThan(e3);
      expect(e5).toBeGreaterThan(e4);
    });

    it('mutationStrength increases each epoch past 3', () => {
      const e3 = getEscalation(3).mutationStrength;
      const e4 = getEscalation(4).mutationStrength;
      const e5 = getEscalation(5).mutationStrength;
      expect(e4).toBeGreaterThan(e3);
      expect(e5).toBeGreaterThan(e4);
    });

    it('epochTicks decreases each epoch past 3 until floor', () => {
      const e3 = getEscalation(3).epochTicks;
      const e4 = getEscalation(4).epochTicks;
      const e5 = getEscalation(5).epochTicks;
      expect(e4).toBeLessThan(e3);
      expect(e5).toBeLessThan(e4);
    });
  });

  describe('epoch timer never goes below 40 seconds', () => {
    it('epoch 20 epochTicks is exactly 60*40 (floor)', () => {
      // depth=17, reduction=17*60*5=5100, base=4200, floor=2400 => clamped to 2400
      expect(getEscalation(20).epochTicks).toBe(60 * 40);
    });

    it('very large epoch still respects the 40-second floor', () => {
      expect(getEscalation(1000).epochTicks).toBe(60 * 40);
    });
  });

  describe('outbreak severity increases by 1 per epoch', () => {
    it('epoch 5 outbreakSeverity is 5', () => {
      expect(getEscalation(5).outbreakSeverity).toBe(5);
    });

    it('epoch 8 outbreakSeverity is 8', () => {
      expect(getEscalation(8).outbreakSeverity).toBe(8);
    });

    it('epoch 4 outbreakSeverity is 4', () => {
      expect(getEscalation(4).outbreakSeverity).toBe(4);
    });

    it('epoch 10 outbreakSeverity is 10', () => {
      expect(getEscalation(10).outbreakSeverity).toBe(10);
    });
  });

  describe('mutationStrength increases 10% per epoch past 3', () => {
    it('epoch 4 mutationStrength is 1.1', () => {
      expect(getEscalation(4).mutationStrength).toBeCloseTo(1.1, 10);
    });

    it('epoch 5 mutationStrength is 1.2', () => {
      expect(getEscalation(5).mutationStrength).toBeCloseTo(1.2, 10);
    });

    it('epoch 6 mutationStrength is 1.3', () => {
      expect(getEscalation(6).mutationStrength).toBeCloseTo(1.3, 10);
    });

    it('epoch 13 mutationStrength is 2.0', () => {
      // depth=10, 1.0 + 10*0.1 = 2.0
      expect(getEscalation(13).mutationStrength).toBeCloseTo(2.0, 10);
    });
  });

  describe('crisis and accident interval multipliers follow exponential decay', () => {
    it('epoch 4 crisisIntervalMul is 0.95^1', () => {
      expect(getEscalation(4).crisisIntervalMul).toBeCloseTo(Math.pow(0.95, 1), 10);
    });

    it('epoch 7 crisisIntervalMul is 0.95^4', () => {
      expect(getEscalation(7).crisisIntervalMul).toBeCloseTo(Math.pow(0.95, 4), 10);
    });

    it('epoch 4 accidentIntervalMul is 0.92^1', () => {
      expect(getEscalation(4).accidentIntervalMul).toBeCloseTo(Math.pow(0.92, 1), 10);
    });

    it('epoch 7 accidentIntervalMul is 0.92^4', () => {
      expect(getEscalation(7).accidentIntervalMul).toBeCloseTo(Math.pow(0.92, 4), 10);
    });
  });
});
