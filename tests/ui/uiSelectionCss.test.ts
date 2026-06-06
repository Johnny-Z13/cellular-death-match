// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');

describe('UI selection CSS', () => {
  it('prevents drag selection on game UI components while preserving debug text selection', () => {
    expect(css).toContain('.toolbox,\n.life-panel,\n.hud,\n.ticker,\n.screen');
    expect(css).toContain('user-select: none');
    expect(css).toContain('-webkit-user-select: none');
    expect(css).toContain('.debug {');
    expect(css).toContain('user-select: text');
  });
});
