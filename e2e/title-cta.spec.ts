import { expect, test } from '@playwright/test';
import { openFreshApp } from './helpers';

// The title is the first screen every player sees: Run Trial must be fully
// on screen and tappable, with the pitch line visible where there is room.
async function expectCtaOnScreen(page: import('@playwright/test').Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const button = document.getElementById('title-start')!.getBoundingClientRect();
    return { top: button.top, bottom: button.bottom, height: button.height, viewport: window.innerHeight };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
}

test('Run Trial stays fully on screen on the title', async ({ page }) => {
  await openFreshApp(page);
  await expectCtaOnScreen(page);
});

test('Run Trial stays on screen on a 360x640 phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'One extra small-phone size.');
  await page.setViewportSize({ width: 360, height: 640 });
  await openFreshApp(page);
  await expectCtaOnScreen(page);
  await expect(page.locator('.title-pitch')).toBeVisible();
});

test('the title dish draws a live culture beside the wordmark', async ({ page }) => {
  await openFreshApp(page);
  const litShare = () => page.evaluate(() => {
    const canvas = document.getElementById('title-dish') as HTMLCanvasElement;
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i]! + data[i + 1]! + data[i + 2]! > 300) lit += 1;
    return lit / (data.length / 4);
  });
  await expect.poll(litShare, { timeout: 6_000 }).toBeGreaterThan(0.02);
});
