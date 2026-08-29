import { expect, test } from '@playwright/test';
import {
  clickDish,
  monitorRuntime,
  openFreshApp,
  selectSwarmlet,
  startFirstTrial,
  toolCharge,
} from './helpers';

const minimumDishSize: Readonly<Record<string, number>> = {
  phone: 340,
  'small-phone': 320,
  'phone-landscape': 276,
  'tablet-portrait': 560,
  desktop: 500,
};

test('keeps the Petri dish playable and core controls usable', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await openFreshApp(page);

  await expect(page.locator('#title-start')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('title.png') });

  await startFirstTrial(page);
  const liveHud = page.locator('#hud');
  const liveCoach = page.locator('#coach');
  const metrics = await page.evaluate(() => {
    const dish = document.getElementById('game')!.getBoundingClientRect();
    const layout = document.querySelector<HTMLElement>('.layout')!;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      dish: { left: dish.left, right: dish.right, top: dish.top, bottom: dish.bottom, width: dish.width, height: dish.height },
      visualQuality: layout.dataset.visualQuality,
    };
  });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport.width + 1);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewport.width + 1);
  expect(metrics.dish.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.dish.right).toBeLessThanOrEqual(metrics.viewport.width + 1);
  expect(metrics.dish.top).toBeGreaterThanOrEqual(-1);
  expect(metrics.dish.bottom).toBeLessThanOrEqual(metrics.viewport.height + 1);
  expect(metrics.dish.width).toBeGreaterThanOrEqual(minimumDishSize[testInfo.project.name]!);
  expect(Math.abs(metrics.dish.width - metrics.dish.height)).toBeLessThanOrEqual(2);
  expect(Math.abs((metrics.dish.left + metrics.dish.right) / 2 - metrics.viewport.width / 2)).toBeLessThanOrEqual(2);
  if (testInfo.project.name === 'desktop') expect(metrics.visualQuality).toBe('desktop');
  else expect(metrics.visualQuality).toMatch(/^mobile-/);

  if (testInfo.project.name === 'phone' || testInfo.project.name === 'small-phone') {
    await expect(page.locator('#hud-director')).toBeHidden();
    const hudBox = await liveHud.boundingBox();
    const coachBox = await liveCoach.boundingBox();
    expect(hudBox).not.toBeNull();
    expect(coachBox).not.toBeNull();
    expect(coachBox!.x).toBeGreaterThanOrEqual(hudBox!.x - 1);
    expect(coachBox!.y).toBeGreaterThanOrEqual(hudBox!.y - 1);
    expect(coachBox!.x + coachBox!.width).toBeLessThanOrEqual(hudBox!.x + hudBox!.width + 1);
    expect(coachBox!.y + coachBox!.height).toBeLessThanOrEqual(hudBox!.y + hudBox!.height + 1);
    expect(hudBox!.y + hudBox!.height).toBeLessThan(metrics.dish.top);
  }

  const options = page.locator('#options-button');
  const optionsBox = await options.boundingBox();
  expect(optionsBox).not.toBeNull();
  expect(optionsBox!.width).toBeGreaterThanOrEqual(44);
  expect(optionsBox!.height).toBeGreaterThanOrEqual(44);
  await options.click();
  const optionsPanel = page.locator('#debug');
  await expect(optionsPanel).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#options-close')).toBeFocused();
  const optionsPanelBox = await optionsPanel.boundingBox();
  expect(optionsPanelBox).not.toBeNull();
  expect(optionsPanelBox!.x).toBeGreaterThanOrEqual(-1);
  expect(optionsPanelBox!.y).toBeGreaterThanOrEqual(-1);
  expect(optionsPanelBox!.x + optionsPanelBox!.width).toBeLessThanOrEqual(metrics.viewport.width + 1);
  expect(optionsPanelBox!.y + optionsPanelBox!.height).toBeLessThanOrEqual(metrics.viewport.height + 1);
  await page.locator('#options-close').click();
  await expect(page.locator('[data-tool="egg"]')).toBeFocused();

  if (testInfo.project.name === 'phone-landscape') {
    const rails = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      };
      return { dish: bounds('#game'), hud: bounds('#hud'), shell: bounds('#mobile-shell') };
    });
    expect(rails.hud.right).toBeLessThan(rails.dish.left);
    expect(rails.shell.left).toBeGreaterThan(rails.dish.right);
  }

  await selectSwarmlet(page);
  const eggsBefore = await toolCharge(page, 'egg');
  await clickDish(page);
  await expect.poll(() => toolCharge(page, 'egg')).toBe(eggsBefore - 1);

  await page.locator('[data-tool="nutrient"]').click();
  const nutrientBefore = await toolCharge(page, 'nutrient');
  await clickDish(page, 0.55, 0.53);
  await expect.poll(() => toolCharge(page, 'nutrient')).toBe(nutrientBefore - 1);
  await page.screenshot({ path: testInfo.outputPath('gameplay.png') });

  runtime.assertClean();
});
