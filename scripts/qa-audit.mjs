// Autonomous QA harness: drives the game across both viewports, exercises every
// new system, captures console/page errors + screenshots, and prints a report.
//
// Run: start the dev server (npm run dev -- --port 5199 --strictPort), then
//   npm i -D playwright-core
//   CHROME_EXE="<path to chrome/chromium>" node scripts/qa-audit.mjs
// (playwright-core is not a committed dependency — install it transiently.)
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const EXE = process.env.CHROME_EXE;
const URL = 'http://localhost:5199/';
const OUT = 'qa-shots';
await mkdir(OUT, { recursive: true });

const findings = [];
function note(sev, area, msg) { findings.push({ sev, area, msg }); }

const browser = await chromium.launch({ executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });

for (const vp of [
  { name: 'desktop', width: 1280, height: 720, mobile: false },
  { name: 'iphone', width: 390, height: 844, mobile: true },
]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  if ((await page.title()) !== 'Cellular Death Match') note('P0', vp.name, 'Wrong page title');
  await page.screenshot({ path: `${OUT}/${vp.name}-01-title.png` });

  await page.click('#title-start');
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/${vp.name}-02-arena.png` });

  // Reveal everything so we can exercise every tool/breed/atlas node.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.click('#dbg-reveal-discoveries').catch(() => note('P1', vp.name, 'reveal-all button not clickable'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  const canvas = await page.$('#game');
  const box = await canvas.boundingBox();
  const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

  // Helper to select a tool, accounting for the mobile toolbar being scrollable.
  async function pickTool(tool) {
    const btn = await page.$(`[data-tool="${tool}"]`);
    if (!btn) { note('P1', vp.name, `tool ${tool} missing`); return false; }
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    const disabled = await btn.getAttribute('disabled');
    if (disabled !== null) { note('P1', vp.name, `tool ${tool} still disabled after reveal-all`); return false; }
    await btn.click();
    return true;
  }

  // 1) Every reagent drop (bespoke SFX path).
  for (const tool of ['nutrient', 'toxin', 'water', 'salt', 'acid']) {
    if (await pickTool(tool)) {
      const p = at(0.5, 0.5);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(80);
    }
  }

  // 2) Paste trail draw + glow, then catalyse it with water.
  if (await pickTool('paste')) {
    const a = at(0.3, 0.4), b = at(0.62, 0.5);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      const p = at(0.3 + 0.04 * i, 0.4 + 0.012 * i);
      await page.mouse.move(p.x, p.y, { steps: 4 });
      await page.waitForTimeout(30);
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-03-paste-glow.png` });
    await page.mouse.up();
    if (await pickTool('water')) {
      const p = at(0.45, 0.46);
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${OUT}/${vp.name}-04-paste-catalysis.png` });
  }

  // 3) Deploy a breed and check it isn't yellow/orange when it shouldn't be.
  if (vp.mobile) { await page.click('#mobile-lifeforms-toggle'); await page.waitForTimeout(300); }
  await page.click('[data-lifeform-id="vitric_anchor"]').catch(() => note('P1', vp.name, 'vitric_anchor card not clickable'));
  if (vp.mobile) { await page.click('#mobile-lifeforms-toggle'); await page.waitForTimeout(300); }
  for (let i = 0; i < 5; i++) { const p = at(0.2 + i * 0.03, 0.75); await page.mouse.click(p.x, p.y); await page.waitForTimeout(60); }
  await page.waitForTimeout(800);
  const vitricPeak = await page.evaluate(() => {
    const cv = document.getElementById('game'); const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    const reg = ctx.getImageData(w * 0.14, h * 0.68, w * 0.3, h * 0.18).data;
    let best = [0,0,0], score = -1;
    for (let p = 0; p < reg.length; p += 4) {
      const r = reg[p], g = reg[p+1], b = reg[p+2], a = reg[p+3];
      if (a < 200 || r+g+b < 110) continue;
      const s = b - Math.min(r, g);
      if (s > score) { score = s; best = [r,g,b]; }
    }
    return best;
  });
  // Vitric Anchor tint is violet/blue; flag if it reads as yellow/orange (r&g high, b low).
  if (vitricPeak[2] + 20 < Math.min(vitricPeak[0], vitricPeak[1])) {
    note('P0', vp.name, `Vitric Anchor deploys wrong colour: rgb(${vitricPeak.join(',')})`);
  }

  // 4) Notebook: open, Log + Atlas tabs.
  await page.click('#notebook-button');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${vp.name}-05-notebook-log.png` });
  await page.click('#notebook-tab-atlas');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${vp.name}-06-notebook-atlas.png` });
  // Verify chimera portraits actually loaded (naturalWidth > 0).
  const brokenPortraits = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.notebook-portrait')];
    return { total: imgs.length, broken: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length };
  });
  if (brokenPortraits.total === 0) note('P1', vp.name, 'no chimera portraits rendered in notebook');
  if (brokenPortraits.broken > 0) note('P0', vp.name, `${brokenPortraits.broken}/${brokenPortraits.total} chimera portraits failed to load`);
  await page.click('#notebook-close');
  await page.waitForTimeout(300);

  // 5) Audio toggle + reverb toggle exercise.
  await page.click('#audio-button');
  await page.waitForTimeout(120);
  await page.click('#audio-button');
  await page.waitForTimeout(120);

  // 6) Complete-when-ready: end the epoch and walk a couple more.
  for (let epoch = 0; epoch < 3; epoch++) {
    await page.click('#end-epoch-button').catch(() => {});
    await page.waitForTimeout(900);
    // Either an upgrade pick or run end appears.
    const pick = await page.$('#screen-pick.visible');
    if (pick) {
      const card = await page.$('.pick-card');
      if (card) await card.click();
      await page.waitForTimeout(2600); // next epoch banner
    } else {
      break;
    }
  }
  await page.screenshot({ path: `${OUT}/${vp.name}-07-after-epochs.png` });

  if (errors.length) for (const e of errors.slice(0, 8)) note('P0', vp.name, `console error: ${e.slice(0, 160)}`);
  console.log(`${vp.name}: errors=${errors.length} vitricPeak=${JSON.stringify(vitricPeak)} portraits=${JSON.stringify(brokenPortraits)}`);
  await ctx.close();
}

await browser.close();
console.log('\n=== FINDINGS ===');
if (!findings.length) console.log('No automated issues detected.');
for (const f of findings) console.log(`[${f.sev}] ${f.area}: ${f.msg}`);
