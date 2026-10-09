import { expect, test } from '@playwright/test';
import { clickDish, completeOpeningActions, monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

test('the dish names its cultures and the labels can be switched off', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  await completeOpeningActions(page);

  const swarmletTag = page.locator('.dish-label', { hasText: 'Swarmlet' }).first();
  await expect(swarmletTag).toBeVisible();
  const dish = (await page.locator('#game').boundingBox())!;
  const tag = (await swarmletTag.boundingBox())!;
  expect(tag.x).toBeGreaterThanOrEqual(dish.x - 1);
  expect(tag.x + tag.width).toBeLessThanOrEqual(dish.x + dish.width + 1);
  expect(tag.y).toBeGreaterThanOrEqual(dish.y - 1);
  expect(tag.y + tag.height).toBeLessThanOrEqual(dish.y + dish.height + 1);

  // The goal strain gets the goal marker once it exists.
  await expect(page.locator('.dish-label--goal', { hasText: 'Bloom Mass' })).toBeVisible({ timeout: 20_000 });

  if (testInfo.project.name === 'desktop') {
    const goalTag = (await page.locator('.dish-label--goal').boundingBox())!;
    await page.mouse.move(goalTag.x + goalTag.width / 2, goalTag.y + goalTag.height + 14);
    await expect(page.locator('#dish-inspect')).toBeVisible();
    await expect(page.locator('#dish-inspect .dish-inspect-name')).not.toHaveText('');
    await page.mouse.move(dish.x - 40, dish.y + dish.height / 2);
    await expect(page.locator('#dish-inspect')).toBeHidden();
  } else {
    // Touch never opens the hover card; the tapped culture is named instead.
    await clickDish(page, 0.55, 0.53);
    await expect(page.locator('#dish-inspect')).toBeHidden();
  }

  await page.locator('#options-button').click();
  const toggle = page.locator('#labels-button');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveText('Dish labels — Off');
  await page.locator('#options-close').click();
  await expect(page.locator('#dish-labels')).toHaveClass(/is-off/);
  await expect(page.locator('.dish-label')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('cdm.dish-labels.v1'))).toBe('0');
  runtime.assertClean();
});
