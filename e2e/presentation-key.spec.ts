import { expect, test } from '@playwright/test';
import { monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

test('F hides every menu for the dish alone, and F brings them back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'a keyboard shortcut, checked on desktop');
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  const layout = page.locator('.layout');

  await page.keyboard.press('f');
  await expect(layout).toHaveClass(/presentation-mode/);
  await expect(page.locator('#hud')).toBeHidden();
  await expect(page.locator('#toolbox')).toBeHidden();
  await expect(page.locator('#dex-button')).toBeHidden();
  await expect(page.locator('#game')).toBeVisible();

  await page.keyboard.press('F');
  await expect(layout).not.toHaveClass(/presentation-mode/);
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#dex-button')).toBeVisible();
  runtime.assertClean();
});
