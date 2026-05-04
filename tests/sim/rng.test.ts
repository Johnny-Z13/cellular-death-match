import { describe, it, expect } from 'vitest';
import { createRng } from '../../src/sim/rng';

describe('createRng', () => {
  it('produces deterministic sequence for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) {
      expect(a.random()).toBe(b.random());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.random()).not.toBe(b.random());
  });

  it('outputs are in [0, 1)', () => {
    const r = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = r.random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randInt(n) returns integers in [0, n)', () => {
    const r = createRng(5);
    for (let i = 0; i < 1000; i++) {
      const v = r.randInt(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
});
