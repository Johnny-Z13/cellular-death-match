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
});
