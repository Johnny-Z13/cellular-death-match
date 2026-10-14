import { expect, test } from '@playwright/test';
import { monitorRuntime } from './helpers';

// The Z13 ident plays at boot for real players. Automation skips it unless the
// URL carries ?ident, so the rest of the suite starts on the title as before.

test('the ident plays at boot, then hands the title to the player', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/?ident');
  const plate = page.locator('#z13-ident');
  await expect(plate.locator('span')).toHaveCount(3);
  await expect(plate.getByText('PRESENTS')).toBeAttached();
  await expect(plate).toHaveCount(0, { timeout: 7_000 });
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
  await expect(page.locator('#title-start')).toBeVisible();
  runtime.assertClean();
});

test('a tap skips the ident without starting a trial', async ({ page }) => {
  await page.goto('/?ident');
  const plate = page.locator('#z13-ident');
  await expect(plate.locator('span')).toHaveCount(3);
  const viewport = page.viewportSize()!;
  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  await expect(plate).toHaveCount(0, { timeout: 1_000 });
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
});

test('automation skips the ident', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#z13-ident')).toHaveCount(0);
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
});
