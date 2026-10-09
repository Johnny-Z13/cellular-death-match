import { expect, test } from '@playwright/test';
import { completeOpeningActions, monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

test('the phone log opens as a solid sheet that leaves most of the dish visible', async ({ page }, testInfo) => {
  test.skip(!['phone', 'small-phone'].includes(testInfo.project.name), 'Phone log sheet only.');
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await page.locator('#mobile-log-toggle').click();
  const ticker = page.locator('#ticker');
  await expect(ticker).toBeVisible();
  await expect(page.locator('.ticker-title')).toBeVisible();
  const sheet = await ticker.evaluate((element) => {
    const style = getComputedStyle(element);
    const alpha = Number(/rgba?\([^)]*,\s*([\d.]+)\)$/.exec(style.backgroundColor)?.[1] ?? '1');
    return { alpha, height: element.getBoundingClientRect().height, viewport: window.innerHeight };
  });
  expect(sheet.alpha).toBeGreaterThanOrEqual(0.9);
  expect(sheet.height).toBeLessThanOrEqual(sheet.viewport * 0.45 + 1);
  runtime.assertClean();
});

test('wrapped log lines never overlap the next line', async ({ page }, testInfo) => {
  test.skip(!['phone', 'small-phone'].includes(testInfo.project.name), 'Phone log sheet only.');
  await openFreshApp(page);
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await page.locator('#mobile-log-toggle').click();
  await page.evaluate(() => {
    const lines = document.getElementById('ticker-lines')!;
    for (let i = 0; i < 6; i++) {
      const line = document.createElement('div');
      line.className = 'ticker-line ticker-line-discovery';
      line.textContent = i % 2 ? 'Short line.' : 'Visible mutation: a culture expressed a new trait that wraps on phones.';
      lines.prepend(line);
    }
  });
  const boxes = await page.locator('.ticker-line').evaluateAll((lines) => lines.slice(0, 6).map((line) => {
    const rect = line.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, scroll: line.scrollHeight, client: line.clientHeight };
  }));
  for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.top).toBeGreaterThanOrEqual(boxes[i - 1]!.bottom - 0.5);
  for (const box of boxes) expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
});
