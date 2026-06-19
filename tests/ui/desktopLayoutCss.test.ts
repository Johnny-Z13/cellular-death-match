// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

describe('desktop layout CSS', () => {
  it('centers the dish in the viewport and snaps the right rack and log to it', () => {
    expect(css).toContain('--desktop-dish-size');
    expect(css).toContain('--desktop-rack-width');
    expect(css).toContain('padding: 0');
    expect(css).toContain('place-items: center');
    expect(css).toContain('width: var(--desktop-dish-size)');
    expect(css).toContain('height: var(--desktop-dish-size)');
    expect(css).toContain('left: calc(50vw + (var(--desktop-dish-size) / 2) + var(--desktop-gap))');
    expect(css).toContain('top: calc(50svh - (var(--desktop-dish-size) / 2))');
    expect(css).toContain('height: var(--desktop-dish-size)');
    expect(css).toContain('left: calc(50vw - (var(--desktop-dish-size) / 2) - var(--desktop-gap) - var(--desktop-rack-width))');
    expect(css).toContain('overflow-x: hidden');
    expect(css).toContain('bottom: calc(50svh + (var(--desktop-dish-size) / 2) + var(--desktop-gap))');
    expect(css).toContain('height: var(--desktop-status-height)');
    expect(css).toContain('overflow-x: hidden');
    expect(css).not.toContain('width: var(--desktop-rack-width);\n  }\n\n  .hud-val');
    expect(css).toContain('top: calc(50svh + (var(--desktop-dish-size) / 2) + var(--desktop-gap))');
    expect(css).toContain('width: var(--desktop-dish-size)');
    expect(css).toContain('@media (min-width: 900px) {');
    expect(css).toContain('.mobile-shell {\n    display: none;\n  }');
    expect(css).toContain('@media (min-width: 1181px) and (max-height: 780px) {');
    expect(css).toContain('top: 8px');
    expect(css).toContain('height: 104px');
    expect(css).toContain('bottom: auto');
    expect(css).toContain('.hud-volume-row,');
    expect(css).toContain('.hud-ecology-row,');
  });
});
