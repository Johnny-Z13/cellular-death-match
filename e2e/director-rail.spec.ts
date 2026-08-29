import { expect, test } from '@playwright/test';
import { monitorRuntime } from './helpers';

test('keeps objective status in Dr. E’s rail when authored coaching is inactive', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('cdm.onboarding-reset.v2', '1');
    window.localStorage.setItem('cdm.coach.seen.v8', '1');
    window.localStorage.setItem('cdm.coach.trials.v1', '[0]');
  });
  await page.goto('/');
  await page.locator('#title-start').click();

  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  const director = page.locator('#hud-director');
  await expect(director).toBeVisible();
  await expect(director.locator('.hud-director-head')).toContainText('Dr. E');
  await expect(page.locator('#hud-director-title')).toHaveText('Culture Shock');
  await expect(page.locator('#hud-director-progress')).toContainText('Bloom Mass');
  await expect(page.locator('#hud-objective')).toContainText('Culture Shock');
  await expect(page.locator('#hud-hint')).toContainText('Swarmlet');
  await expect.poll(() => director.locator('img').evaluate((image) => (image as HTMLImageElement).complete)).toBe(true);

  const hudBox = await page.locator('#hud').boundingBox();
  const dishBox = await page.locator('#game').boundingBox();
  expect(hudBox).not.toBeNull();
  expect(dishBox).not.toBeNull();
  expect(hudBox!.height).toBeLessThanOrEqual(106);
  expect(hudBox!.y + hudBox!.height).toBeLessThan(dishBox!.y);
  await page.screenshot({ path: testInfo.outputPath('persistent-director-status.png') });

  // Detach a visual copy from the live render loop so representative late-game
  // copy cannot be overwritten while its constrained layout is measured.
  await director.evaluate((element) => element.replaceWith(element.cloneNode(true)));
  await page.addStyleTag({
    content: '.layout[data-screen="arena"] .hud-director { opacity: 1 !important; visibility: visible !important; }',
  });
  await page.locator('#hud-director-title').evaluate((element) => {
    element.textContent = 'The Cure-ish';
  });
  await page.locator('#hud-director-progress').evaluate((element) => {
    element.textContent = 'Brine Channel missing · 1/3 cultures · 100%/60% dominance';
  });
  await page.locator('#hud-hint').evaluate((element) => {
    element.textContent = 'Place Salt and Nutrient near Bloom Mass, then add Water. Keep three cultures alive.';
  });
  const textFit = await page.evaluate(() => {
    const metrics = (id: string) => {
      const element = document.getElementById(id)!;
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    };
    return {
      viewport: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
      rail: metrics('hud-director'),
      title: metrics('hud-director-title'),
      progress: metrics('hud-director-progress'),
      hint: metrics('hud-hint'),
    };
  });
  for (const metric of [textFit.title, textFit.progress]) {
    expect(metric.top).toBeGreaterThanOrEqual(textFit.rail.top - 1);
    expect(metric.bottom).toBeLessThanOrEqual(textFit.rail.bottom + 1);
    expect(metric.left).toBeGreaterThanOrEqual(textFit.rail.left - 1);
    expect(metric.right).toBeLessThanOrEqual(textFit.rail.right + 1);
  }
  await expect(page.locator('#hud-hint')).toBeHidden();
  expect(textFit.viewport.scrollWidth).toBeLessThanOrEqual(textFit.viewport.clientWidth);
  const longHudBox = await page.locator('#hud').boundingBox();
  expect(longHudBox!.height).toBeLessThanOrEqual(106);
  await page.screenshot({ path: testInfo.outputPath('long-director-status.png') });

  runtime.assertClean();
});
