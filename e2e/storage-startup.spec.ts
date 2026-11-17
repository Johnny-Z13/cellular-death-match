import { expect, test } from '@playwright/test';
import { completeOpeningActions, continueToMethodPicker, dismissReveal, monitorRuntime, startFirstTrial } from './helpers';

for (const failure of ['getter', 'read', 'write', 'silent-write'] as const) {
  test(`temporary play survives denied storage: ${failure}`, async ({ page }, testInfo) => {
    const runtime = monitorRuntime(page);
    await page.addInitScript((mode) => {
      const denied = () => { throw new DOMException('Browser storage denied', 'SecurityError'); };
      if (mode === 'getter') Object.defineProperty(window, 'localStorage', { get: denied });
      if (mode === 'read') Storage.prototype.getItem = denied;
      if (mode === 'write') Storage.prototype.setItem = denied;
      if (mode === 'silent-write') Storage.prototype.setItem = () => {};
    }, failure);
    await page.goto('/');
    await expect(page).toHaveTitle('Cellular Death Match');
    const notice = page.locator('.temporary-storage-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toBeInViewport({ ratio: 1 });
    await expect(notice).toContainText('progress is lost on reload');
    if (failure === 'getter') await page.screenshot({ path: testInfo.outputPath('temporary-title.png') });
    await startFirstTrial(page);
    await completeOpeningActions(page);
    await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/);
    await page.locator('#end-epoch-button').click();
    await dismissReveal(page);
    await continueToMethodPicker(page);
    await page.locator('#pick-choices .pick-card').first().click();
    await expect(page.locator('#hud-fight')).toHaveText('2 / 5');
    await page.locator('#options-button').click();
    await expect(page.locator('#debug [data-temporary-storage-notice]')).toBeVisible();
    await page.reload();
    await expect(notice).toBeVisible();
    await expect(page.locator('#title-start-label')).toHaveText('Run Trial');
    runtime.assertClean();
  });
}
