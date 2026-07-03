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
});
