// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8') as string;

describe('debug layering', () => {
  it('keeps the explicit debug inspector above modal screens', () => {
    const screenRules: string[] = css.match(/\.screen \{[\s\S]*?\n\}/g) ?? [];
    const screenRule = screenRules.find((rule: string) => rule.includes('position: fixed;'));
    expect(screenRule).toBeTruthy();
    expect(screenRule).toContain('z-index: 10;');

    const debugRules: string[] = css.match(/\.debug-open \.debug \{[\s\S]*?\n\}/g) ?? [];
    expect(debugRules.length).toBeGreaterThanOrEqual(2);
    for (const rule of debugRules) {
      expect(rule).toContain('z-index: 12;');
      expect(rule).not.toContain('z-index: 4;');
      expect(rule).not.toContain('z-index: 8;');
    }
  });
});
