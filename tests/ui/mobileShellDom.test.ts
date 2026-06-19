// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

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

  it('starts mobile drawer toggles collapsed for touch play', () => {
    expect(html).toContain('id="mobile-lifeforms-toggle" class="mobile-shell-button" type="button" aria-expanded="false" aria-controls="life-panel"');
    expect(html).toContain('id="mobile-log-toggle" class="mobile-shell-button" type="button" aria-expanded="false" aria-controls="ticker"');
  });

  it('opens the mobile Lifeforms drawer by default for first-run players', () => {
    expect(screensSource).toContain('openMobileLifeformsDrawer(): void;');
    expect(screensSource).toContain("setMobileDrawer('lifeforms');");
    expect(mainSource).toContain('shouldOpenLifeformsForNewPlayer({');
    expect(mainSource).toContain('hasSeenTutorial: coach.hasSeenTutorial()');
    expect(mainSource).toContain('screens.openMobileLifeformsDrawer();');
  });
});
