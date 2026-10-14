import { expect, test } from '@playwright/test';
import { monitorRuntime } from './helpers';

// The dev labs are desktop tools; one project is enough.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'dev labs are checked on desktop');
});

test('the Dr. E look test draws every direction at every size', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/drelook.html?t=4000&talk=1');
  await page.waitForFunction(() => document.querySelectorAll('canvas.dre-face[data-drawn]').length === 16);
  const lit = await page.locator('canvas.dre-face').evaluateAll((nodes) => nodes.map((node) => {
    const canvas = node as HTMLCanvasElement;
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    let on = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) on += 1;
    return on / (data.length / 4);
  }));
  expect(lit).toHaveLength(16);
  for (const share of lit) expect(share).toBeGreaterThan(0.2);
  runtime.assertClean();
});
