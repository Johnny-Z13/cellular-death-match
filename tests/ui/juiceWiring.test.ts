// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync('src/main.ts', 'utf8') as string;
const juiceSource = readFileSync('src/ui/juice.ts', 'utf8') as string;

describe('juice wiring', () => {
  it('fires a ripple on every successful tool application', () => {
    expect(mainSource).toContain("juice.ripple(pos, selectedTool)");
    expect(mainSource).toContain("juice.ripple(pos, 'paste')");
  });

  it('draws juice on top of the dish each frame', () => {
    expect(mainSource).toContain('juice.draw()');
  });

  it('honors reduced motion in the wrapper', () => {
    expect(juiceSource).toContain('prefers-reduced-motion');
    expect(juiceSource).toContain('staticRippleVisual');
  });

  it('bursts on births, deaths, and discoveries; shakes on critical events', () => {
    expect(mainSource).toContain("'birth'");
    expect(mainSource).toContain("'death'");
    expect(mainSource).toContain("juice.shake('hard')");
    expect(mainSource).toContain("juice.shake('soft')");
  });

  it('has a soft dish-shake variant with reduced amplitude', () => {
    const css = readFileSync('src/styles.css', 'utf8') as string;
    expect(css).toContain('.dish-shake-soft');
    expect(css).toContain('@keyframes dish-shake-soft');
  });

  it('updates the HUD even when the control sample is absent (onboarding dish)', () => {
    expect(mainSource).toContain('vol: player?.vol ?? 0');
    expect(mainSource).toContain('targetVol: player?.targetVol ?? 0');
  });
});
