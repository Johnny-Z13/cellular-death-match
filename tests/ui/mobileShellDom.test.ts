// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');

describe('mobile shell DOM', () => {
  it('provides mobile-only controls without duplicating desktop panels', () => {
    expect(html).toContain('id="mobile-shell"');
    expect(html).toContain('id="mobile-lifeforms-toggle"');
    expect(html).toContain('id="mobile-log-toggle"');
    expect(html).toContain('id="mobile-tool-readout"');
    expect(html).toContain('id="mobile-tool-name"');
    expect(html).toContain('id="mobile-tool-summary"');
    expect(html.match(/id="toolbox"/g)?.length).toBe(1);
    expect(html.match(/id="life-panel"/g)?.length).toBe(1);
    expect(html.match(/id="ticker"/g)?.length).toBe(1);
  });
});
