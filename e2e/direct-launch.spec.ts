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
  await expect(page.locator('link[rel="icon"][type="image/x-icon"]')).toHaveAttribute('href', /favicon\.ico\?v=5/);
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

test('root favicon and app-icon routes serve the same current Dr. E files', async ({ request }, info) => {
  test.skip(!process.env.CDM_LIVE || info.project.name !== 'desktop', 'Vercel rewrites require the live deployment');
  for (const path of ['favicon.ico', 'favicon.png', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-1024.png']) {
    const root = await request.get(`/${path}`);
    const game = await request.get(`/play/${path}`);
    expect(root.status(), `root ${path}`).toBe(200);
    expect(game.status(), `game ${path}`).toBe(200);
    expect(await root.body(), path).toEqual(await game.body());
  }
  const manifest = await request.get('/manifest.json');
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).icons.every((icon: { src: string }) => icon.src.endsWith('?v=5'))).toBe(true);
});
