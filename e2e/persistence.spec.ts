import { expect, test } from '@playwright/test';
import {
  clickDish,
  completeOpeningActions,
  continueToMethodPicker,
  monitorRuntime,
  selectSwarmlet,
  startFirstTrial,
  toolCharge,
} from './helpers';

async function openWithFreshStorageOnce(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveTitle('Cellular Death Match');
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
}

async function continueSavedCase(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
  await expect(page.locator('#title-start-label')).toHaveText(/^(Restart Trial|Continue Case)$/);
  await page.locator('#title-start').click();
}

test.describe('reload-safe Case checkpoints', () => {
  test('restarts an interrupted active dish cleanly with its guidance intact', async ({ page }) => {
    const runtime = monitorRuntime(page);
    await openWithFreshStorageOnce(page);
    await startFirstTrial(page);

    await page.reload();
    await continueSavedCase(page);
    await expect(page.locator('#coach-title')).toHaveText('Welcome to my lab.');
    await page.locator('#coach-skip').click();
    await expect(page.locator('#coach-title')).toContainText('Press Egg.');

    await selectSwarmlet(page);
    await clickDish(page);
    await expect(page.locator('#coach-title')).toHaveText('Now press Nutrient.');
    await page.reload();
    await continueSavedCase(page);
    await expect(page.locator('#coach-title')).toHaveText('Welcome to my lab.');
    await expect(page.locator('[data-tool="egg"] [data-tool-count]')).toHaveText('8/8');

    await page.locator('#coach-skip').click();
    await completeOpeningActions(page);
    await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
    await page.reload();
    await continueSavedCase(page);
    await expect(page.locator('#coach-title')).toHaveText('Welcome to my lab.');
    await expect(page.locator('#hud-fight')).toHaveText('1 / 5');

    runtime.assertClean();
  });

  test('survives reloads during genome reveal, Method choice, and Trial 2', async ({ page }, testInfo) => {
    const runtime = monitorRuntime(page);
    await openWithFreshStorageOnce(page);
    await startFirstTrial(page);
    await completeOpeningActions(page);
    await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
    await page.locator('#end-epoch-button').click();
    await expect(page.locator('#fx-genome')).toHaveAttribute('aria-hidden', 'false');

    await page.reload();
    await expect(page.locator('#title-trial-label')).toContainText('Trial 02');
    await continueSavedCase(page);
    await expect(page.locator('#fx-genome-title')).toHaveText('Bloom Mass');
    await page.locator('#fx-genome').click();
    await continueToMethodPicker(page);

    await page.reload();
    await continueSavedCase(page);
    await expect(page.locator('#screen-pick')).toHaveClass(/visible/);
    await expect(page.locator('#pick-choices .pick-card')).toHaveCount(3);
    await page.locator('#pick-choices .pick-card').first().click();
    await expect(page.locator('#hud-fight')).toHaveText('2 / 5');
    await expect(page.locator('#coach-title')).toHaveText('Open Eggs. Choose Bloom Mass.');

    await page.locator('#mobile-lifeforms-toggle').click();
    await page.locator('[data-lifeform-id="bloom_mass"]').click();
    await expect(page.locator('#coach-title')).toHaveText('Place it here.');
    const eggsBefore = await toolCharge(page, 'egg');
    await clickDish(page);
    await expect.poll(() => toolCharge(page, 'egg')).toBe(eggsBefore - 1);

    await page.reload();
    await expect(page.locator('#title-case-progress')).toHaveText('1 / 5 sealed');
    await expect(page.locator('#title-trial-label')).toContainText('Trial 02');
    await continueSavedCase(page);
    await expect(page.locator('#hud-fight')).toHaveText('2 / 5');
    await expect(page.locator('#coach-title')).toHaveText('Open Eggs. Choose Bloom Mass.');
    await page.screenshot({ path: testInfo.outputPath('trial-2-resumed-cleanly.png') });

    runtime.assertClean();
  });

  test('keeps a completed dish visible until a failed bank write is retried', async ({ page }) => {
    const runtime = monitorRuntime(page);
    await openWithFreshStorageOnce(page);
    await startFirstTrial(page);
    await completeOpeningActions(page);
    await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });

    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      (window as unknown as { __restoreStorageWrite?: () => void }).__restoreStorageWrite = () => {
        Storage.prototype.setItem = original;
      };
      Storage.prototype.setItem = function failingDiscoveryWrite(key: string, value: string): void {
        if (key === 'cellular-death-match.discovery.v2') return;
        original.call(this, key, value);
      };
    });
    await page.locator('#end-epoch-button').click();
    await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
    await expect(page.locator('#end-epoch-button')).toHaveAttribute('data-exit-mode', 'retry-save');
    await expect(page.locator('#end-epoch-button strong')).toHaveText('Retry save');
    const frozenTick = Number(await page.locator('#dbg-tick').textContent());
    const frozenEggs = await toolCharge(page, 'egg');
    await page.locator('[data-tool="egg"]').click();
    await clickDish(page, 0.7, 0.35);
    await expect.poll(() => toolCharge(page, 'egg')).toBe(frozenEggs);
    await page.waitForTimeout(350);
    await expect(page.locator('#dbg-tick')).toHaveText(String(frozenTick));
    await expect.poll(() => page.evaluate(() => (
      window.localStorage.getItem('cellular-death-match.research-bank.v1') !== null
    ))).toBe(true);

    await page.evaluate(() => {
      (window as unknown as { __restoreStorageWrite?: () => void }).__restoreStorageWrite?.();
    });
    await page.locator('#end-epoch-button').click();
    await expect(page.locator('#fx-genome')).toHaveAttribute('aria-hidden', 'false');
    const saved = await page.evaluate(() => ({
      pending: window.localStorage.getItem('cellular-death-match.research-bank.v1'),
      strains: JSON.parse(window.localStorage.getItem('cellular-death-match.strains.v1') ?? '{}'),
    }));
    expect(saved.pending).toBeNull();
    expect(saved.strains.availableStrains).toContain('bloom_mass');
    expect(saved.strains.runCount).toBe(0);
    runtime.assertClean();
  });

  test('requires two deliberate activations to abandon and resumes the same unsealed Trial', async ({ page }) => {
    const runtime = monitorRuntime(page);
    await openWithFreshStorageOnce(page);
    await startFirstTrial(page);
    await completeOpeningActions(page);
    await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
    await page.locator('#end-epoch-button').click();
    if (await page.locator('#fx-genome').getAttribute('aria-hidden') === 'false') {
      await page.locator('#fx-genome').click();
    }
    await continueToMethodPicker(page);
    await page.locator('#pick-choices .pick-card').first().click();
    await expect(page.locator('#hud-fight')).toHaveText('2 / 5');

    const end = page.locator('#end-epoch-button');
    await expect(end).toHaveAttribute('data-exit-mode', 'abandon');
    await end.click();
    await expect(end).toHaveAttribute('data-exit-mode', 'confirm-abandon');
    await page.locator('#notebook-button').click();
    await expect(page.locator('#screen-notebook')).toHaveClass(/visible/);
    await page.locator('#notebook-close').click();
    await expect(end).toHaveAttribute('data-exit-mode', 'abandon');
    await end.click();
    await expect(end).toHaveAttribute('data-exit-mode', 'confirm-abandon');
    await page.locator('[data-tool="egg"]').click();
    await expect(end).toHaveAttribute('data-exit-mode', 'abandon');
    await end.click();
    await expect(end).toHaveAttribute('data-exit-mode', 'confirm-abandon');
    await end.click();

    await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
    await expect(page.locator('#title-case-progress')).toHaveText('1 / 5 sealed');
    await expect(page.locator('#title-trial-label')).toContainText('Trial 02');
    await expect(page.locator('#title-start-label')).toHaveText('Run Trial');
    await page.locator('#title-start').click();
    await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
    await expect(page.locator('#hud-fight')).toHaveText('2 / 5');
    await expect(page.locator('#hud-director-title')).toHaveText('Bitter Medicine');
    await expect(page.locator('#coach-title')).toHaveText('Open Eggs. Choose Bloom Mass.');
    runtime.assertClean();
  });
});
