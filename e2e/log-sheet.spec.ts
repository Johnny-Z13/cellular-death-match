import { expect, test } from '@playwright/test';
import { completeOpeningActions, monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

test('the phone log opens as a solid sheet that leaves most of the dish visible', async ({ page }, testInfo) => {
  test.skip(!['phone', 'small-phone'].includes(testInfo.project.name), 'Phone log sheet only.');
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await page.locator('#mobile-log-toggle').click();
  const ticker = page.locator('#ticker');
  await expect(ticker).toBeVisible();
  await expect(page.locator('.ticker-title')).toBeVisible();
  const sheet = await ticker.evaluate((element) => {
    const style = getComputedStyle(element);
    const alpha = Number(/rgba?\([^)]*,\s*([\d.]+)\)$/.exec(style.backgroundColor)?.[1] ?? '1');
    return { alpha, height: element.getBoundingClientRect().height, viewport: window.innerHeight };
  });
  expect(sheet.alpha).toBeGreaterThanOrEqual(0.9);
  expect(sheet.height).toBeLessThanOrEqual(sheet.viewport * 0.45 + 1);
  runtime.assertClean();
});
