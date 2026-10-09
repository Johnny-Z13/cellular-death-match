import { expect, test } from '@playwright/test';
import { clickDish, completeOpeningActions, monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

test('the dish names its cultures and the labels can be switched off', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  await completeOpeningActions(page);

  // Tags re-key as a tap ping hands over to a strain tag, so measure the
  // Swarmlet tag and the dish in one step, retrying until one is on screen.
  await expect.poll(() => page.evaluate(() => {
    const tag = [...document.querySelectorAll('.dish-label')].find((node) => node.textContent?.includes('Swarmlet'));
    if (!tag) return 'missing';
    const t = tag.getBoundingClientRect();
    const d = document.getElementById('game')!.getBoundingClientRect();
    const inside = t.left >= d.left - 1 && t.right <= d.right + 1 && t.top >= d.top - 1 && t.bottom <= d.bottom + 1;
    return inside ? 'inside' : `outside ${JSON.stringify([t.left, t.top, t.right, t.bottom, d.left, d.top, d.right, d.bottom])}`;
  })).toBe('inside');
  const dish = (await page.locator('#game').boundingBox())!;

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
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveText('Dish labels — Off');
  await page.locator('#options-close').click();
  await expect(page.locator('#dish-labels')).toHaveClass(/is-off/);
  await expect(page.locator('.dish-label')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('cdm.dish-labels.v1'))).toBe('0');
  runtime.assertClean();
});
