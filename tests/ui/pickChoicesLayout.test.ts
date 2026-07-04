// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8') as string;

describe('pick popup layout', () => {
  it('centers trial/upgrade choice cards for any card count on desktop', () => {
    const rules: string[] = css.match(/\.pick-choices \{[\s\S]*?\n  \}/g) ?? [];
    const desktopRule = rules.find((r: string) => r.includes('auto-fit'));
    expect(desktopRule).toBeTruthy();
    expect(desktopRule).toContain('justify-content: center;');
    expect(css).not.toContain('grid-template-columns: repeat(3, 1fr)');
  });
});
