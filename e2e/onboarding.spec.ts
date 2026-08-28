import { expect, test } from '@playwright/test';
import {
  clickDish,
  completeOpeningActions,
  monitorRuntime,
  openFreshApp,
  startFirstTrial,
  toolCharge,
} from './helpers';

test.describe('first discovery progression', () => {
  test('decodes only Bloom Mass and makes it selectable in Trial 2', async ({ page }, testInfo) => {
    const runtime = monitorRuntime(page);
    await openFreshApp(page);
    await startFirstTrial(page);
    await completeOpeningActions(page);

    await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
    await page.locator('#end-epoch-button').click();

    const reveal = page.locator('#fx-genome');
    await expect(reveal).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#fx-genome-eyebrow')).toHaveText('GENOME DECODED');
    await expect(page.locator('#fx-genome-title')).toHaveText('Bloom Mass');
    await expect(reveal).not.toHaveClass(/fx-genome-batch/);
    await expect(page.locator('#fx-genome-art img')).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('bloom-genome-decoded.png') });

    await reveal.click();
    await expect(page.locator('#screen-pick')).toHaveClass(/visible/);
    await expect(page.locator('#pick-choices .pick-card')).toHaveCount(3);
    const methodCard = page.locator('#pick-choices .pick-card').first();
    await expect(methodCard).toBeFocused();
    await methodCard.press('Enter');

    await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
    await expect(page.locator('#hud-fight')).toHaveText('2 / 5');
    await expect(page.locator('#coach-title')).toHaveText('Press Bloom Mass.');
    await expect(page.locator('#mobile-lifeforms-toggle')).toBeFocused();

    await page.locator('#mobile-lifeforms-toggle').click();
    await expect(page.locator('#life-count')).toHaveText('2 specimens available in this Study');
    const bloom = page.locator('[data-lifeform-id="bloom_mass"]');
    await expect(bloom).toBeVisible();
    await expect(bloom).toBeEnabled();
    await bloom.click();

    await expect(page.locator('#coach-title')).toHaveText('Place it here.');
    await expect(page.locator('#mobile-tool-summary')).toHaveText('Bloom Mass seed');
    await expect(page.locator('[data-tool="egg"]')).toHaveCSS('--egg-color', 'rgb(190, 255, 76)');

    const eggsBefore = await toolCharge(page, 'egg');
    await clickDish(page);
    await expect.poll(() => toolCharge(page, 'egg')).toBe(eggsBefore - 1);
    await page.screenshot({ path: testInfo.outputPath('trial-2-bloom-placed.png') });

    runtime.assertClean();
  });
});
