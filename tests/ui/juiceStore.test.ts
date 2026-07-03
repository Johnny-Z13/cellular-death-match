import { describe, expect, it } from 'vitest';
import {
  createJuiceStore, spawnRipple, spawnBurst, stepJuice,
  rippleVisual, staticRippleVisual, particleVisual,
  MAX_PARTICLES, MAX_RIPPLES, RIPPLE_COLORS,
} from '../../src/ui/juice';

const fixedRand = () => 0.5;

describe('juice store', () => {
  it('spawns a ripple and evicts the oldest past the cap', () => {
    const store = createJuiceStore();
    for (let i = 0; i < MAX_RIPPLES + 5; i++) {
      spawnRipple(store, [i, i], 'egg', 1000 + i);
    }
    expect(store.ripples.length).toBe(MAX_RIPPLES);
    expect(store.ripples[0]!.x).toBe(5); // oldest 5 evicted
  });

  it('enforces the particle cap across repeated bursts', () => {
    const store = createJuiceStore();
    for (let i = 0; i < 12; i++) {
      spawnBurst(store, [10, 10], [126, 230, 255], 'discovery', 1000, fixedRand);
    }
    expect(store.particles.length).toBe(MAX_PARTICLES);
  });

  it('dims death burst colors and keeps birth colors true', () => {
    const store = createJuiceStore();
    spawnBurst(store, [0, 0], [200, 100, 50], 'death', 0, fixedRand);
    expect(store.particles[0]!.rgb[0]).toBeLessThan(100);
    const store2 = createJuiceStore();
    spawnBurst(store2, [0, 0], [200, 100, 50], 'birth', 0, fixedRand);
    expect(store2.particles[0]!.rgb[0]).toBe(200);
  });

  it('ages out expired ripples and particles', () => {
    const store = createJuiceStore();
    spawnRipple(store, [1, 1], 'nutrient', 0);
    spawnBurst(store, [1, 1], [255, 255, 255], 'birth', 0, fixedRand);
    stepJuice(store, 100);
    expect(store.ripples.length).toBe(1);
    expect(store.particles.length).toBeGreaterThan(0);
    stepJuice(store, 10_000);
    expect(store.ripples.length).toBe(0);
    expect(store.particles.length).toBe(0);
  });

  it('ripple visual expands and fades, then nulls out', () => {
    const r = { x: 0, y: 0, tool: 'nutrient' as const, start: 0, duration: 450 };
    const early = rippleVisual(r, 0)!;
    const late = rippleVisual(r, 400)!;
    expect(early.color).toBe(RIPPLE_COLORS.nutrient);
    expect(late.radius).toBeGreaterThan(early.radius);
    expect(late.alpha).toBeLessThan(early.alpha);
    expect(rippleVisual(r, 450)).toBeNull();
  });

  it('static ripple visual has fixed radius for reduced motion', () => {
    const r = { x: 0, y: 0, tool: 'egg' as const, start: 0, duration: 450 };
    expect(staticRippleVisual(r, 0)!.radius).toBe(staticRippleVisual(r, 300)!.radius);
    expect(staticRippleVisual(r, 450)).toBeNull();
  });

  it('particles drift outward and fade', () => {
    const store = createJuiceStore();
    spawnBurst(store, [50, 50], [255, 255, 255], 'discovery', 0, fixedRand);
    const p = store.particles[0]!;
    const early = particleVisual(p, 50)!;
    const late = particleVisual(p, 800)!;
    const distEarly = Math.hypot(early.x - 50, early.y - 50);
    const distLate = Math.hypot(late.x - 50, late.y - 50);
    expect(distLate).toBeGreaterThan(distEarly);
    expect(late.alpha).toBeLessThan(early.alpha);
    expect(particleVisual(p, p.duration + 1)).toBeNull();
  });
});
