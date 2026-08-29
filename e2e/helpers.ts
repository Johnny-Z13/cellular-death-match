import { expect, type Page } from '@playwright/test';

export interface RuntimeMonitor {
  readonly issues: string[];
  assertClean(): void;
}

export function monitorRuntime(page: Page): RuntimeMonitor {
  const issues: string[] = [];

  page.on('pageerror', (error) => {
    issues.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') issues.push(`console.error: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const target = request.url();
    const currentOrigin = page.url().startsWith('http') ? new URL(page.url()).origin : '';
    if (currentOrigin && target.startsWith(currentOrigin)) {
      issues.push(`requestfailed: ${target} (${request.failure()?.errorText ?? 'unknown'})`);
    }
  });

  return {
    issues,
    assertClean() {
      expect(issues, issues.join('\n')).toEqual([]);
    },
  };
}

export async function openFreshApp(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
  await expect(page).toHaveTitle('Cellular Death Match');
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
}

export async function startFirstTrial(page: Page): Promise<void> {
  await page.locator('#title-start').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
  await expect(page.locator('#coach-title')).toHaveText('Welcome to my lab.');
  await page.locator('#coach-skip').click();
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');
}

export async function selectSwarmlet(page: Page): Promise<void> {
  await page.locator('[data-tool="egg"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Place it here.');
  // Trial 1 has exactly one ready genome, so Egg arms the already-selected
  // Swarmlet directly instead of opening a one-choice freezer drawer.
  await expect(page.locator('#mobile-tool-summary')).toHaveText('Swarmlet seed');
}

export async function clickDish(page: Page, xRatio = 0.5, yRatio = 0.5): Promise<void> {
  const dish = page.locator('#game');
  const box = await dish.boundingBox();
  expect(box, 'Petri dish should have a visible hit target').not.toBeNull();
  await page.mouse.click(
    box!.x + box!.width * xRatio,
    box!.y + box!.height * yRatio,
  );
}

export async function completeOpeningActions(page: Page): Promise<void> {
  await selectSwarmlet(page);
  await clickDish(page);
  await expect(page.locator('#coach-title')).toHaveText('Now press Nutrient.');

  await page.locator('[data-tool="nutrient"]').click();
  await expect(page.locator('#coach-title')).toHaveText('Feed it once.');
  await clickDish(page, 0.55, 0.53);
}

export async function continueToMethodPicker(page: Page): Promise<void> {
  const introduction = page.locator('#screen-method-intro');
  const picker = page.locator('#screen-pick');
  if (await picker.evaluate((element) => element.classList.contains('visible'))) return;
  await expect(introduction).toHaveClass(/visible/);
  await expect(page.locator('#method-intro-title')).toHaveText('Right. You’re on your own now.');
  await expect(page.locator('#method-intro-continue')).toBeFocused();
  await page.locator('#method-intro-continue').click();
  await expect(picker).toHaveClass(/visible/);
}

export async function toolCharge(page: Page, tool: 'egg' | 'nutrient' | 'toxin'): Promise<number> {
  const text = (await page.locator(`[data-tool="${tool}"] [data-tool-count]`).textContent()) ?? '';
  const match = /^(\d+)\//.exec(text.trim());
  expect(match, `Expected a numeric ${tool} charge, received "${text}"`).not.toBeNull();
  return Number(match![1]);
}
