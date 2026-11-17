import { chromium, firefox, webkit, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

const project = fileURLToPath(new URL('..', import.meta.url));
const output = path.join(project, 'output/itch');
const root = await fs.mkdtemp(path.join(tmpdir(), 'cdm-itch-extracted-'));
const types = {
  html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png',
  mp3: 'audio/mpeg', svg: 'image/svg+xml', json: 'application/json', ico: 'image/x-icon',
};
// localhost and 127.0.0.1 deliberately provide different origins, like an
// itch page embedding its HTML CDN. Files must work below an upload prefix.
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<body style="margin:0"><iframe src="http://localhost:5203/upload/game/index.html" allow="autoplay; fullscreen" style="width:100vw;height:100vh;border:0"></iframe>');
      return;
    }
    if (!pathname.startsWith('/upload/game/')) {
      res.writeHead(404).end();
      return;
    }
    const relative = pathname.slice('/upload/game/'.length);
    const data = await fs.readFile(path.join(root, relative));
    res.setHeader('Content-Type', types[relative.split('.').pop()] ?? 'application/octet-stream');
    res.end(data);
  } catch {
    res.writeHead(404).end();
  }
});

async function checkJourney(browser, name, layout, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes(':5203')) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  try {
    await page.goto('http://127.0.0.1:5203/');
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('#title-start')).toBeVisible();
    await frame.locator('#title-start').click();
    await frame.locator('#coach-skip').click();
    await frame.locator('[data-tool="egg"]').click();
    const box = await frame.locator('#game').boundingBox();
    if (!box) throw new Error('Dish is not visible');
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await frame.locator('[data-tool="nutrient"]').click();
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.53);
    await expect(frame.locator('#end-epoch-button')).toHaveClass(/end-action-ready/);
    // Allow the delayed success coaching to settle for visual evidence.
    await page.waitForTimeout(4500);
    await page.screenshot({ path: path.join(output, `${name}-${layout}-gameplay.png`) });
    await frame.locator('#end-epoch-button').click();
    const reveal = frame.locator('#fx-genome');
    for (let i = 0; i < 30 && await reveal.getAttribute('aria-hidden') === 'false'; i++) {
      await reveal.click();
      await page.waitForTimeout(150);
    }
    await expect(frame.locator('#screen-pick')).toHaveClass(/visible/);
    await frame.locator('#pick-choices .pick-card').first().click();
    await expect(frame.locator('#hud-fight')).toHaveText('2 / 5');
    await page.reload();
    await expect(frame.locator('#title-start-label')).toHaveText('Restart Trial');
    return { name, layout, status: errors.length ? 'failed' : 'passed', errors };
  } catch (error) {
    return { name, layout, status: 'failed', error: error.message, errors };
  } finally {
    await page.close();
  }
}

const results = [];
try {
  execFileSync('unzip', ['-q', path.join(output, 'cellular-death-match-itch.zip'), '-d', root]);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(5203, '127.0.0.1', resolve);
  });
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    let browser;
    try {
      browser = await engine.launch({ headless: true });
    } catch (error) {
      results.push({ name, status: 'unavailable', error: error.message });
      continue;
    }
    try {
      for (const [layout, viewport] of Object.entries({
        desktop: { width: 1280, height: 720 },
        phone: { width: 375, height: 667 },
      })) {
        results.push(await checkJourney(browser, name, layout, viewport));
      }
    } finally {
      await browser.close();
    }
  }
  await fs.writeFile(path.join(output, 'browser-check.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
  if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
} finally {
  server.close();
  await fs.rm(root, { recursive: true, force: true });
}
