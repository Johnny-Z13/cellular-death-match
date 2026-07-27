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

  it('opts into notched-device safe areas and labels the interactive dish', () => {
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('id="game"');
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-keyshortcuts="Enter Space"');
    expect(mainSource).toContain("canvas.addEventListener('keydown'");
    expect(mainSource).toContain("event.key !== 'Enter' && event.key !== ' '");
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
    expect(mainSource).toContain('viewportHeight: window.innerHeight');
    expect(mainSource).toContain('screens.openMobileLifeformsDrawer();');
  });

  it('returns the dish to full focus after a mobile selection or successful action', () => {
    expect(screensSource).toContain('closeMobileDrawers(): void;');
    expect(screensSource).toContain("setMobileDrawer('none');");
    expect(mainSource).toContain('screens.closeMobileDrawers();');
  });
});
