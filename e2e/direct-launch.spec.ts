import { expect, test } from '@playwright/test';
import { monitorRuntime, startFirstTrial } from './helpers';

// Run against the staged static deployment or the live site, not the Vite root:
// CDM_URL=http://127.0.0.1:4191 npx playwright test e2e/direct-launch.spec.ts
// Use normal player boot behavior so the root redirect must reach the ident.
test.skip(!process.env.CDM_URL, 'Requires a staged or deployed site via CDM_URL');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
});

test('main URL opens the Z13 ident and game with no alpha page', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/play\/(?:\?.*)?$/);
  await expect(page).toHaveTitle('Cellular Death Match');
  const plate = page.locator('#z13-ident');
  await expect(plate.locator('span')).toHaveCount(3);
  await expect(plate.getByText('PRESENTS')).toBeAttached();
  await expect(plate).toHaveCount(0, { timeout: 7_000 });
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /branding\/z13-diamond-icon\.svg/);
  await expect(page.locator('.masthead, .hero, #build-notes')).toHaveCount(0);
  await startFirstTrial(page);
  await page.screenshot({ path: `test-results/direct-launch-${test.info().project.name}.png` });
  runtime.assertClean();
});

test('old index link also opens the game directly', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page).toHaveURL(/\/play\/(?:\?.*)?$/);
  await expect(page).toHaveTitle('Cellular Death Match');
  await expect(page.locator('#z13-ident')).toHaveCount(0, { timeout: 7_000 });
  await expect(page.locator('#title-start')).toBeVisible();
});
