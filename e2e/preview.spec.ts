import { expect, test, type Page } from '@playwright/test';
import { completeOpeningActions, monitorRuntime, startFirstTrial } from './helpers';

async function savedProgress(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.entries(window.localStorage)
    .filter(([key]) => key.startsWith('cellular-death-match.') || key.startsWith('cdm.coach.'))));
}

test('preview play leaves real progress intact and exits to the saved Trial', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveTitle('Cellular Death Match');
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/);
  await page.locator('#options-button').click();
  const before = await savedProgress(page);
  await page.locator('#dbg-reveal-discoveries').click();
  await expect(page.locator('#objective-choices .objective-card')).toHaveCount(2);
  await page.locator('#objective-choices .objective-card').first().click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
  await expect(page.locator('#preview-exit')).toBeVisible();
  // The same real controls that write discoveries/checkpoints in normal play.
  const paste = page.locator('[data-tool="paste"]');
  await paste.scrollIntoViewIfNeeded();
  await paste.click();
  await page.locator('#game').focus();
  await page.keyboard.press('Enter');
  await expect(paste.locator('[data-tool-count]')).toHaveText('2/3');
  await expect.poll(() => paste.evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--cooldown').trim())).toBe('0');
  await page.keyboard.press('Enter');
  await expect(paste.locator('[data-tool-count]')).toHaveText('1/3');
  await page.screenshot({ path: testInfo.outputPath('preview-gameplay.png') });
  expect(await savedProgress(page)).toEqual(before);
  await page.locator('#preview-exit').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
  expect(await savedProgress(page)).toEqual(before);
  await expect(page.locator('#preview-exit')).toBeHidden();
  await page.locator('#title-start').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
  await expect(page.locator('[data-tool="acid"]')).toBeHidden();
  runtime.assertClean();
});
