// Screenshots the Dr. E look test for Johnny to pick a direction.
// usage: node scripts/capture-dre-look.mjs [baseUrl]   (dev server on 5199)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5199';
const outDir = 'docs/assets/dre';
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
for (const [name, query] of [['look-test-neutral', 'expr=neutral'], ['look-test-talking', 'expr=happy&talk=1']]) {
  await page.goto(`${base}/drelook.html?t=4000&${query}`);
  await page.waitForFunction(() => document.querySelectorAll('canvas.dre-face[data-drawn]').length === 16);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`${outDir}/${name}.png`);
}
await browser.close();
