// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('discovery unlock visibility', () => {
  it('hides locked tools and lifeforms until they are discovered', () => {
    expect(screensSource).toContain('btn.hidden = locked;');
    expect(screensSource).toContain('button.hidden = locked;');
    expect(css).toContain('[hidden] {\n  display: none !important;\n}');
  });
});
