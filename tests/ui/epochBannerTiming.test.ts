// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const fxSource = readFileSync('src/ui/fx.ts', 'utf8');

describe('epoch intro banner timing', () => {
  it('keeps the first epoch popup readable for about one second longer', () => {
    expect(css).toContain('animation: fx-banner-cycle 3200ms');
    expect(fxSource).toContain('accent ? 1900 : 2600');
  });
});
