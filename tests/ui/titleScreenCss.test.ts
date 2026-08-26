// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

describe('title screen atmosphere', () => {
  it('restores the CA key art beneath a super-slow Professor camera drift', () => {
    expect(css).toContain('background-image: url("/art/title-keyart-1024.png")');
    expect(css).toContain('animation: title-professor-camera-drift 72s ease-in-out');
    expect(css).toContain('animation: title-ca-wallpaper-drift 108s ease-in-out');
    expect(css).toContain('@keyframes title-professor-camera-drift');
    expect(css).toContain('@keyframes title-ca-wallpaper-drift');
  });

  it('freezes both ambient layers when reduced motion is requested', () => {
    const titleMotionStart = css.indexOf('@keyframes title-ca-wallpaper-drift');
    const reducedMotionStart = css.indexOf('@media (prefers-reduced-motion: reduce)', titleMotionStart);
    const reducedMotion = css.slice(reducedMotionStart, reducedMotionStart + 500);

    expect(reducedMotion).toContain('.screen-title-screen .title-professor img,');
    expect(reducedMotion).toContain('.screen-title-screen .title-art {');
    expect(reducedMotion).toContain('animation: none');
    expect(reducedMotion).toContain('will-change: auto');
  });
});
