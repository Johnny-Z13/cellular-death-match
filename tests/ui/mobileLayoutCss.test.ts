// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

function mediaBlock(query: string): string {
  const marker = `@media ${query} {`;
  const start = css.indexOf(marker);
  expect(start).toBeGreaterThan(-1);

  let depth = 0;
  for (let i = start; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }

  throw new Error(`Unclosed media block: ${query}`);
}

describe('mobile layout CSS', () => {
  it('switches phones to compact horizontal trays instead of desktop-length fixed lists', () => {
    const mobile = mediaBlock('(max-width: 899px)');

    expect(mobile).toContain('padding: calc(72px + env(safe-area-inset-top)) 10px calc(224px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('width: min(94vw, calc(100svh - 340px), 800px)');
    expect(mobile).toContain('height: min(94vw, calc(100svh - 340px), 800px)');

    expect(mobile).toContain('.toolbox {');
    expect(mobile).toContain('grid-template-columns: none');
    expect(mobile).toContain('grid-auto-flow: column');
    expect(mobile).toContain('grid-auto-columns: minmax(72px, 1fr)');
    expect(mobile).toContain('overflow-x: auto');
    expect(mobile).toContain('overflow-y: hidden');

    expect(mobile).toContain('.life-panel {');
    expect(mobile).toContain('bottom: calc(96px + env(safe-area-inset-bottom))');
    expect(mobile).toContain('max-height: 126px');
    expect(mobile).toContain('overflow: hidden');

    expect(mobile).toContain('.life-list {');
    expect(mobile).toContain('grid-template-columns: none');
    expect(mobile).toContain('grid-auto-flow: column');
    expect(mobile).toContain('grid-auto-columns: minmax(154px, 74vw)');
    expect(mobile).toContain('overflow-x: auto');
    expect(mobile).toContain('overflow-y: hidden');
  });

  it('has a tighter small-phone breakpoint for short portrait screens', () => {
    const smallPhone = mediaBlock('(max-width: 899px) and (max-height: 700px)');

    expect(smallPhone).toContain('padding: calc(62px + env(safe-area-inset-top)) 10px calc(204px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('width: min(92vw, calc(100svh - 326px), 800px)');
    expect(smallPhone).toContain('height: min(92vw, calc(100svh - 326px), 800px)');
    expect(smallPhone).toContain('bottom: calc(94px + env(safe-area-inset-bottom))');
    expect(smallPhone).toContain('max-height: 112px');
  });

  it('resets desktop controls back to rack flow so the desktop layout remains unchanged', () => {
    const desktop = mediaBlock('(min-width: 900px)');

    expect(desktop).toContain('grid-auto-flow: row');
    expect(desktop).toContain('grid-auto-columns: auto');
    expect(desktop).toContain('overflow-x: visible');
    expect(desktop).toContain('overflow-y: visible');
  });
});
