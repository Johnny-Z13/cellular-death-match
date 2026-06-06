// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

describe('presentation mode', () => {
  it('hides every UI layer and lets the dish fill the viewport', () => {
    expect(css).toContain('.presentation-mode .debug');
    expect(css).toContain('.presentation-mode .screen');
    expect(css).toContain('width: min(100svw, 100svh)');
    expect(css).toContain('height: min(100svw, 100svh)');
    expect(css).not.toContain('width: min(96svw, 96svh, 900px)');
  });

  it('uses Escape to leave presentation mode before opening debug UI', () => {
    expect(mainSource).toContain('if (overlayState.presentationMode)');
    expect(mainSource).toContain('setPresentationMode(false)');
    expect(mainSource).toContain('return;');
  });
});
