// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8') as string;

describe('pick popup layout', () => {
  it('centers trial/upgrade choice cards for any card count on desktop', () => {
    // Extract the desktop media query block that contains .pick-choices
    const mediaMatch = css.match(/@media \(min-width: 700px\) \{[\s\S]*?^\}/m);
    expect(mediaMatch).toBeTruthy();
    const desktopBlock = mediaMatch?.[0] ?? '';
    expect(desktopBlock).toContain('display: flex;');
    expect(desktopBlock).toContain('flex-wrap: wrap;');
    expect(desktopBlock).toContain('justify-content: center;');
    expect(css).toContain('flex: 0 1 240px;');
    expect(css).not.toContain('grid-template-columns: repeat(3, 1fr)');
  });

  it('centers the Method dialog on phones without short-screen clipping', () => {
    const start = css.indexOf('/* The between-trial Method choice');
    const end = css.indexOf('/* Arena phone CSS', start);
    const phoneMethodBlock = css.slice(start, end);

    expect(phoneMethodBlock).toContain('align-items: center;');
    expect(phoneMethodBlock).toContain('max(8px, env(safe-area-inset-top))');
    expect(phoneMethodBlock).toContain('position: relative;');
    expect(phoneMethodBlock).toContain('left: auto;');
    expect(phoneMethodBlock).toContain('right: auto;');
  });

  it('covers phase changes immediately with a short reveal', () => {
    expect(css).toContain('animation: fx-wipe-cycle 240ms ease-out;');
    expect(css).toContain('@keyframes fx-wipe-cycle {\n  0% { opacity: 1; }');
    expect(css).toContain('animation: card-rise 200ms cubic-bezier(0.2, 0.8, 0.2, 1);');
    expect(css).not.toContain('animation: screen-fade-in');
  });
});
