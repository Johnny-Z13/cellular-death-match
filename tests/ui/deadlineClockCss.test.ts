// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8') as string;
const screensSource = readFileSync('src/ui/screens.ts', 'utf8') as string;

describe('living deadline clock', () => {
  it('ramps the readout amber then red as time runs out', () => {
    expect(css).toContain('.hud-deadline-warning');
    expect(css).toContain('.hud-deadline-critical');
  });

  it('pulses on each second tick, disabled under reduced motion', () => {
    expect(css).toContain('@keyframes hud-deadline-tick');
    const reducedBlocks = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}/g) ?? [];
    expect(reducedBlocks.some((b) => b.includes('hud-deadline-tick'))).toBe(true);
  });

  it('only signals urgency while the objective is incomplete', () => {
    expect(screensSource).toContain('hud-deadline-critical');
    expect(screensSource).toContain('!info.objectiveComplete');
  });
});
