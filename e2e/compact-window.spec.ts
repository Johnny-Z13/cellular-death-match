import { expect, test } from '@playwright/test';
import { completeOpeningActions, monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

test('keeps the HUD, dish and tools separate in a nearly square window', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'One dedicated compact-window check.');
  await page.setViewportSize({ width: 814, height: 756 });
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await page.locator('#options-button').click();
  await page.locator('#dbg-reveal-discoveries').click();
  await page.locator('#objective-choices .objective-card').first().click();
  const bounds = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const exit = document.querySelector('#preview-exit')!.getBoundingClientRect();
    return {
      hud: box('#hud'), dish: box('#game'), shell: box('#mobile-shell'), tools: box('#toolbox'),
      exitClickable: document.elementFromPoint(exit.x + exit.width / 2, exit.y + exit.height / 2)?.id === 'preview-exit',
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(bounds.hud.bottom).toBeLessThan(bounds.dish.top);
  expect(bounds.dish.bottom).toBeLessThan(bounds.shell.top);
  // The adjoining chrome may share its one-pixel border.
  expect(bounds.shell.bottom).toBeLessThanOrEqual(bounds.tools.top + 1);
  expect(bounds.dish.width).toBeGreaterThanOrEqual(480);
  expect(bounds.scrollWidth).toBeLessThanOrEqual(814);
  expect(bounds.exitClickable).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('compact-preview.png') });
  runtime.assertClean();
});
