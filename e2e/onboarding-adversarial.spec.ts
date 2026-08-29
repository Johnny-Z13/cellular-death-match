import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  clickDish,
  completeOpeningActions,
  continueToMethodPicker,
  monitorRuntime,
  openFreshApp,
  toolCharge,
} from './helpers';

const CORE_PROJECTS = new Set(['phone', 'small-phone', 'desktop']);

async function openLifeformPickerIfNeeded(page: Page, id: string): Promise<void> {
  const lifeform = page.locator(`[data-lifeform-id="${id}"]`);
  if (!await lifeform.isVisible()) {
    await page.locator('#mobile-lifeforms-toggle').click();
  }
  await expect(lifeform).toBeVisible();
}

async function reachTrialTwo(page: Page): Promise<void> {
  await openFreshApp(page);
  await page.locator('#title-start').click();
  await page.locator('#coach-skip').click();
  await completeOpeningActions(page);
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
  await page.locator('#end-epoch-button').evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator('#fx-genome')).toHaveAttribute('aria-hidden', 'false');
  await page.waitForTimeout(3_100);
  await expect(page.locator('#fx-genome')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#screen-method-intro')).not.toHaveClass(/visible/);
  await page.locator('#fx-genome').press('Enter');
  await continueToMethodPicker(page);
  await page.locator('#pick-choices .pick-card').first().dblclick();
  await expect(page.locator('#hud-fight')).toHaveText('2 / 5');
}

test('owns exact input, rejects wrong actions, and restores focus to Dr. E’s target', async ({ page }, testInfo: TestInfo) => {
  test.skip(!CORE_PROJECTS.has(testInfo.project.name), 'Core onboarding resilience runs on both portrait phones and desktop.');
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await page.locator('#title-start').click();
  await expect(page.locator('#coach-title')).toHaveText('Welcome to my lab.');

  await page.locator('#options-button').click();
  await expect(page.locator('#simulation-paused-badge')).toBeVisible();
  await page.locator('#options-close').click();
  await expect(page.locator('#coach-skip')).toBeFocused();
  await page.locator('#coach-skip').click();
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');
  await expect(page.locator('[data-tool="egg"]')).toBeFocused();

  const nutrientBefore = await toolCharge(page, 'nutrient');
  await page.locator('[data-tool="nutrient"]').click();
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');
  await expect(page.locator('[data-tool="egg"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-tool="nutrient"]')).not.toHaveClass(/selected/);
  await expect.poll(() => toolCharge(page, 'nutrient')).toBe(nutrientBefore);

  await page.locator('#notebook-button').click();
  await expect(page.locator('#screen-notebook')).toHaveClass(/visible/);
  await page.locator('#notebook-close').click();
  await expect(page.locator('[data-tool="egg"]')).toBeFocused();
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');

  await page.locator('[data-tool="egg"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Place it here.');
  await expect(page.locator('#game')).toBeFocused();
  await page.locator('[data-tool="nutrient"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Place it here.');
  await expect(page.locator('[data-tool="egg"]')).toHaveClass(/selected/);

  const eggsBefore = await toolCharge(page, 'egg');
  await clickDish(page);
  await clickDish(page, 0.54, 0.5);
  await expect.poll(() => toolCharge(page, 'egg')).toBe(eggsBefore - 1);
  await expect(page.locator('#coach-title')).toHaveText('Now press Nutrient.');
  await expect(page.locator('[data-tool="nutrient"]')).toBeFocused();
  await expect(page.locator('#end-epoch-button')).not.toHaveClass(/end-action-ready/);

  await page.locator('[data-tool="nutrient"]').click();
  await expect(page.locator('#game')).toBeFocused();
  await clickDish(page, 0.55, 0.53);
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
  await page.screenshot({ path: testInfo.outputPath('exact-input-owned.png') });
  runtime.assertClean();
});

test('keeps Trial 2 recoverable through wrong specimens, wrong reagents, and rapid boundary input', async ({ page }, testInfo: TestInfo) => {
  test.skip(!CORE_PROJECTS.has(testInfo.project.name), 'Core onboarding resilience runs on both portrait phones and desktop.');
  test.setTimeout(90_000);
  const runtime = monitorRuntime(page);
  await reachTrialTwo(page);

  await expect(page.locator('#coach-title')).toHaveText('Open Eggs. Choose Bloom Mass.');
  const eggsBeforeWrongPlacement = await toolCharge(page, 'egg');
  await openLifeformPickerIfNeeded(page, 'swarmlet');
  await page.locator('[data-lifeform-id="swarmlet"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Open Eggs. Choose Bloom Mass.');
  await clickDish(page);
  await expect.poll(() => toolCharge(page, 'egg')).toBe(eggsBeforeWrongPlacement);

  await openLifeformPickerIfNeeded(page, 'bloom_mass');
  await page.locator('[data-lifeform-id="bloom_mass"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Place it here.');

  await openLifeformPickerIfNeeded(page, 'swarmlet');
  await page.locator('[data-lifeform-id="swarmlet"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Place it here.');
  await expect(page.locator('[data-lifeform-id="bloom_mass"]')).toHaveAttribute('aria-selected', 'true');

  await clickDish(page);
  await expect(page.locator('#coach-title')).toHaveText('Press Nutrient.');
  const toxinBefore = await toolCharge(page, 'toxin');
  await page.locator('[data-tool="toxin"]').click();
  await clickDish(page);
  await expect.poll(() => toolCharge(page, 'toxin')).toBe(toxinBefore);
  await expect(page.locator('#coach-title')).toHaveText('Press Nutrient.');

  await page.locator('[data-tool="nutrient"]').click();
  await clickDish(page);
  await page.locator('[data-tool="toxin"]').click();
  await clickDish(page);
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 10_000 });
  await expect(page.locator('#coach-title')).toHaveText('Bitter Bloom. Logged.', { timeout: 10_000 });
  await page.screenshot({ path: testInfo.outputPath('trial-2-adversarial-recovered.png') });
  runtime.assertClean();
});

test('survives a portrait-landscape-portrait change without losing the current lesson', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Orientation resilience runs once in the primary touch project.');
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await page.locator('#title-start').click();
  await page.locator('#coach-skip').click();
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');
  await expect(page.locator('[data-tool="egg"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');
  await page.locator('[data-tool="egg"]').click();
  await clickDish(page);
  await expect(page.locator('#coach-title')).toHaveText('Now press Nutrient.');
  runtime.assertClean();
});

test('restarts a hostile mid-step reload as a clean, fully guided dish on desktop', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Phone reload coverage already lives in persistence.spec; this closes the desktop gap.');
  const runtime = monitorRuntime(page);
  // Clear once rather than installing a per-navigation init script: reload is
  // the behavior under test and must retain the checkpoint written in play.
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
  await page.locator('#title-start').click();
  await page.locator('#coach-skip').click();
  await page.locator('[data-tool="egg"]').click();
  await clickDish(page);
  await expect(page.locator('#coach-title')).toHaveText('Now press Nutrient.');

  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Restart Trial');
  await page.locator('#title-start').click();
  await expect(page.locator('#coach-title')).toHaveText('Welcome to my lab.');
  await expect(page.locator('[data-tool="egg"] [data-tool-count]')).toHaveText('8/8');
  await expect(page.locator('[data-tool="nutrient"] [data-tool-count]')).toHaveText('5/5');
  runtime.assertClean();
});
