import { expect, test } from '@playwright/test';
import { openFreshApp } from './helpers';

// The title is the first screen every player sees: Run Trial must be fully
// on screen and tappable, with the pitch line visible where there is room.
async function expectCtaOnScreen(page: import('@playwright/test').Page): Promise<void> {
  const geometry = await page.evaluate(() => {
    const button = document.getElementById('title-start')!.getBoundingClientRect();
    const label = document.getElementById('title-start-label')!;
    const text = label.getBoundingClientRect();
    const context = document.querySelector('.title-context')!.getBoundingClientRect();
    const archive = document.querySelector('.title-archive-strip')!.getBoundingClientRect();
    return {
      top: button.top, bottom: button.bottom, height: button.height, width: button.width,
      viewport: window.innerHeight,
      centreOffset: Math.abs((text.left + text.right - button.left - button.right) / 2),
      textFits: label.scrollWidth <= label.clientWidth,
      contextTop: context.top, contextBottom: context.bottom, archiveTop: archive.top,
    };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.width).toBeLessThanOrEqual(280);
  expect(geometry.centreOffset).toBeLessThanOrEqual(1);
  expect(geometry.textFits).toBe(true);
  expect(geometry.contextTop).toBeGreaterThan(geometry.bottom);
  expect(geometry.contextBottom).toBeLessThanOrEqual(geometry.archiveTop);
}

test('Run Trial stays fully on screen on the title', async ({ page }, testInfo) => {
  await openFreshApp(page);
  await expectCtaOnScreen(page);
  await expect(page.locator('.title-context')).toContainText('cellular automata');
  await expect(page.locator('.title-pitch')).toContainText('Discover new strains');
  await page.screenshot({ path: testInfo.outputPath('title-design.png') });
});

test('Restart Trial remains centred and works with the keyboard after a reload', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.locator('#title-start').press('Enter');
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Restart Trial');
  await expectCtaOnScreen(page);
  await expect(page.locator('#title-start')).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('title-restart.png') });
  await page.locator('#title-start').press('Enter');
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
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
