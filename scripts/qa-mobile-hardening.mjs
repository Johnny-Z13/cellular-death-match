// Responsive regression harness for the mobile gameplay shell.
//
// Start the app first:
//   npm run dev -- --port 5199 --strictPort
// Then:
//   npm run qa:mobile
//
// Screenshots and metrics are written beneath ignored test-results/.
import { chromium } from 'playwright';
import { access, mkdir, writeFile } from 'node:fs/promises';

const URL = process.env.CDM_URL ?? 'http://localhost:5199/';
const OUTPUT = 'test-results/mobile-hardening';
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_EXE
  ?? await access(MAC_CHROME).then(() => MAC_CHROME).catch(() => undefined);

const viewports = [
  { name: 'phone', width: 390, height: 844, mobile: true, minDish: 340 },
  { name: 'small-phone', width: 375, height: 667, mobile: true, minDish: 320 },
  { name: 'phone-landscape', width: 844, height: 390, mobile: true, minDish: 276 },
  { name: 'tablet-portrait', width: 768, height: 1024, mobile: true, minDish: 560 },
  { name: 'desktop', width: 1280, height: 720, mobile: false, minDish: 500 },
];

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  executablePath,
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const viewport of viewports) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  assert(await page.title() === 'Cellular Death Match', `${viewport.name}: wrong page`);
  await page.screenshot({ path: `${OUTPUT}/${viewport.name}-01-title.png` });

  await page.click('#title-start');
  await page.waitForTimeout(2800);
  const lifeformsOpen = await page.getAttribute('#mobile-lifeforms-toggle', 'aria-expanded');
  if (lifeformsOpen === 'true') await page.click('#mobile-lifeforms-toggle');

  const metrics = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        right: bounds.right,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      page: {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      dish: rect('#game'),
      hud: rect('#hud'),
      toolbox: rect('#toolbox'),
      shell: rect('#mobile-shell'),
      options: rect('#options-button'),
      fullscreen: rect('#fullscreen-button'),
      profile: document.querySelector('.layout')?.getAttribute('data-visual-quality'),
    };
  });

  assert(metrics.dish, `${viewport.name}: dish missing`);
  assert(
    metrics.page.scrollWidth <= metrics.viewport.width + 1,
    `${viewport.name}: horizontal overflow ${metrics.page.scrollWidth}px`,
  );
  assert(
    metrics.dish.width >= viewport.minDish,
    `${viewport.name}: dish only ${metrics.dish.width}px`,
  );
  assert(
    metrics.dish.right <= metrics.viewport.width + 1 && metrics.dish.bottom <= metrics.viewport.height + 1,
    `${viewport.name}: dish leaves viewport`,
  );

  if (viewport.mobile) {
    assert(metrics.options?.height >= 44, `${viewport.name}: Options target below 44px`);
    assert(metrics.fullscreen?.height >= 44, `${viewport.name}: Full screen target below 44px`);
    assert(metrics.profile?.startsWith('mobile-'), `${viewport.name}: mobile profile not selected`);
  } else {
    assert(metrics.profile === 'desktop', 'desktop: full-quality profile not selected');
  }

  if (viewport.name === 'phone-landscape') {
    const dishCenter = metrics.dish.x + metrics.dish.width / 2;
    assert(
      Math.abs(dishCenter - metrics.viewport.width / 2) <= 2,
      'phone-landscape: dish is not centered',
    );
    assert(metrics.hud?.right < metrics.dish.x, 'phone-landscape: HUD overlaps dish');
    assert(metrics.shell?.x > metrics.dish.right, 'phone-landscape: shell overlaps dish');
  }

  await page.click('#options-button');
  const optionsPanel = await page.locator('#debug').boundingBox();
  const resetControls = await page.evaluate(() => ({
    reset: document.querySelector('#reset-onboarding-button')?.textContent,
    deleteSave: document.querySelector('#delete-save-data-button')?.textContent,
    statusLive: document.querySelector('#save-data-status')?.getAttribute('aria-live'),
  }));
  assert(optionsPanel, `${viewport.name}: options did not open`);
  assert(resetControls.reset === 'Reset onboarding', `${viewport.name}: reset onboarding control missing`);
  assert(resetControls.deleteSave === 'Delete all save data', `${viewport.name}: delete save data control missing`);
  assert(resetControls.statusLive === 'polite', `${viewport.name}: save data status is not announced`);
  assert(
    await page.evaluate(() => document.activeElement?.id) === 'options-close',
    `${viewport.name}: options did not receive focus`,
  );
  assert(
    optionsPanel.x >= 0
      && optionsPanel.y >= 0
      && optionsPanel.x + optionsPanel.width <= metrics.viewport.width + 1
      && optionsPanel.y + optionsPanel.height <= metrics.viewport.height + 1,
    `${viewport.name}: options escape the viewport`,
  );
  await page.click('#options-close');
  assert(
    await page.evaluate(() => document.activeElement?.id) === 'options-button',
    `${viewport.name}: options did not restore focus`,
  );

  const nutrient = page.locator('[data-tool="nutrient"]');
  await nutrient.scrollIntoViewIfNeeded();
  await nutrient.click();
  await page.locator('#game').click({ position: { x: metrics.dish.width / 2, y: metrics.dish.height / 2 } });
  assert(
    await page.locator('[data-tool="nutrient"] [data-tool-count]').textContent() === '4/5',
    `${viewport.name}: touch reagent action did not register`,
  );
  if (!viewport.mobile) {
    // Reagents have a short gameplay cooldown; wait for it to expire so this
    // assertion measures keyboard operability instead of cooldown rejection.
    await page.waitForTimeout(1700);
    await page.locator('#game').focus();
    await page.keyboard.press('Enter');
    assert(
      await page.locator('[data-tool="nutrient"] [data-tool-count]').textContent() === '3/5',
      'desktop: keyboard reagent action did not register',
    );
  }

  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUTPUT}/${viewport.name}-02-gameplay.png` });
  assert(errors.length === 0, `${viewport.name}: ${errors.join(' | ')}`);
  results.push({ ...viewport, metrics, errors });
  await context.close();
}

await browser.close();
await writeFile(`${OUTPUT}/metrics.json`, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Mobile hardening QA passed for ${results.length} responsive layouts.`);
