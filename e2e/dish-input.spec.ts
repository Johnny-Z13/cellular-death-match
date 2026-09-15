import { expect, test, type Page } from '@playwright/test';
import { monitorRuntime, openFreshApp } from './helpers';

async function openPasteStudy(page: Page): Promise<void> {
  await openFreshApp(page);
  await page.locator('#options-button').click();
  await page.locator('#dbg-reveal-discoveries').click();
  await page.locator('#objective-choices .objective-card').first().click();
  const paste = page.locator('[data-tool="paste"]');
  await paste.scrollIntoViewIfNeeded();
  await paste.click();
  await expect(page.locator('#game')).toBeVisible();
}

test('ignores secondary mouse buttons without spending a reagent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mouse-button regression.');
  const runtime = monitorRuntime(page);
  await openPasteStudy(page);
  const stock = page.locator('[data-tool="paste"] [data-tool-count]');
  await page.locator('#game').click({ button: 'right' });
  await expect(stock).toHaveText('3/3');
  await page.locator('#game').click();
  await expect(stock).toHaveText('2/3');
  runtime.assertClean();
});

test('ends a captured Paste stroke when Options pauses the dish', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Keyboard overlay interruption during a real drag.');
  const runtime = monitorRuntime(page);
  await openPasteStudy(page);
  const box = (await page.locator('#game').boundingBox())!;
  const stock = page.locator('[data-tool="paste"] [data-tool-count]');
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
  await page.mouse.down();
  await expect(stock).toHaveText('2/3');
  await page.locator('#options-button').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#simulation-paused-badge')).toBeVisible();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5, { steps: 10 });
  await expect(stock).toHaveText('2/3');
  await page.keyboard.press('Escape');
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7, { steps: 10 });
  await page.mouse.up();
  await expect(stock).toHaveText('2/3');
  await page.screenshot({ path: testInfo.outputPath('paste-interruption-recovered.png') });
  runtime.assertClean();
});

test('keeps a Paste stroke owned by its first finger', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Native multi-touch regression.');
  const runtime = monitorRuntime(page);
  await openPasteStudy(page);
  const box = (await page.locator('#game').boundingBox())!;
  const stock = page.locator('[data-tool="paste"] [data-tool-count]');
  const cdp = await page.context().newCDPSession(page);
  const first = { id: 1, x: box.x + box.width * 0.2, y: box.y + box.height * 0.4 };
  const second = { id: 2, x: box.x + box.width * 0.8, y: box.y + box.height * 0.6 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] });
  await expect(stock).toHaveText('2/3');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  await expect(stock).toHaveText('2/3');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [first, { ...second, x: box.x + box.width * 0.3 }] });
  await expect(stock).toHaveText('2/3');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...first, x: box.x + box.width * 0.8 }, second] });
  await expect(stock).toHaveText('1/3');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect.poll(() => page.locator('[data-tool="paste"]').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--cooldown').trim())).toBe('0');
  await page.touchscreen.tap(first.x, first.y);
  await expect(stock).toHaveText('0/3');
  await page.screenshot({ path: testInfo.outputPath('paste-multitouch.png') });
  runtime.assertClean();
});

test('draws an uninterrupted native touch trail and recovers after cancellation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'Native touch on each mobile layout.');
  const runtime = monitorRuntime(page);
  await openPasteStudy(page);
  const box = (await page.locator('#game').boundingBox())!;
  if (testInfo.project.name === 'phone-landscape') {
    const rack = (await page.locator('#toolbox').boundingBox())!;
    expect(rack.y).toBeGreaterThan(box.y + box.height);
    for (const button of await page.locator('#toolbox .tool-button:visible').all()) {
      expect((await button.boundingBox())!.height).toBeLessThanOrEqual(70);
    }
  }
  const stock = page.locator('[data-tool="paste"] [data-tool-count]');
  const cdp = await page.context().newCDPSession(page);
  const point = { x: box.x + box.width * 0.2, y: box.y + box.height * 0.5 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  for (const ratio of [0.35, 0.5, 0.65, 0.8]) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ ...point, x: box.x + box.width * ratio }],
    });
  }
  await expect(stock).toHaveText('1/3');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect.poll(() => page.locator('[data-tool="paste"]').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--cooldown').trim())).toBe('0');
  await page.touchscreen.tap(point.x, point.y);
  await expect(stock).toHaveText('0/3');
  await page.screenshot({ path: testInfo.outputPath('native-paste-trail.png') });
  runtime.assertClean();
});

test('requires a fresh keypress for each keyboard Paste stamp', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Keyboard repeat regression.');
  const runtime = monitorRuntime(page);
  await openPasteStudy(page);
  const stock = page.locator('[data-tool="paste"] [data-tool-count]');
  await page.locator('#game').focus();
  await page.keyboard.down('Enter');
  await expect(stock).toHaveText('2/3');
  await expect.poll(() => page.locator('[data-tool="paste"]').evaluate((element) =>
    getComputedStyle(element).getPropertyValue('--cooldown').trim())).toBe('0');
  await page.keyboard.down('Enter');
  await expect(stock).toHaveText('2/3');
  await page.keyboard.up('Enter');
  await page.keyboard.press('Enter');
  await expect(stock).toHaveText('1/3');
  runtime.assertClean();
});
