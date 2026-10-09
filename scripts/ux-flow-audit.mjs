// UX flow audit: walks the game through 25 scripted states (title → Trial 1
// → reveal → upgrade → Trial 2 → Notebook → Options → Open Lab) and, at each
// state, records overlaps between surfaces that must never overlap, text that
// is visibly cut, and controls off screen. Screenshots every state.
//
// Usage (dev server running, page title "Cellular Death Match"):
//   node scripts/ux-flow-audit.mjs 390x844,375x667,844x390,768x1024,1280x720 output/ux-audit
// Env: CDM_URL (default http://127.0.0.1:5199/).
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[3] ?? 'output/ux-audit';
const sizes = (process.argv[2] ?? '390x844,375x667,844x390,768x1024,1280x720').split(',');
const URL = process.env.CDM_URL ?? 'http://127.0.0.1:5199/';
const browser = await chromium.launch();
const report = {};

const AUDIT = () => {
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (let e = el; e; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.05) return false;
    }
    return true;
  };
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; };
  const inter = (a, b) => {
    const w = Math.min(a.r, b.r) - Math.max(a.x, b.x);
    const h = Math.min(a.b, b.b) - Math.max(a.y, b.y);
    return w > 2 && h > 2 ? Math.round(w * h) : 0;
  };
  const named = (sel, name) => [...document.querySelectorAll(sel)].filter(vis).map((el, i) => ({ name: name ?? (el.id ? `#${el.id}` : sel) + (document.querySelectorAll(sel).length > 1 ? `[${(el.textContent || '').trim().slice(0, 14)}]` : ''), el, b: box(el) }));
  const groups = {
    hudGoal: named('#hud-goal', 'goal-strip'),
    hudDirector: named('#hud-director', 'director-slot'),
    hud: named('#hud', 'hud'),
    hudHeader: named('.hud-summary > .hud-row'),
    coach: named('#coach', 'coach'),
    chrome: named('.chrome-button'),
    notebookTab: named('#notebook-button', 'notebook-tab'),
    preview: named('#preview-exit', 'preview-exit'),
    paused: named('#simulation-paused-badge', 'paused-badge'),
    pointer: named('#onboarding-guide-pointer', 'dr-e-pointer'),
    dish: named('#game', 'dish'),
    shell: named('#mobile-shell', 'shell'),
    tools: named('#toolbox .tool-button'),
    toolbox: named('#toolbox', 'toolbox'),
    life: named('#life-panel', 'eggs-panel'),
    ticker: named('#ticker', 'log'),
    toasts: named('#fx-toasts .fx-toast', 'toast'),
    banner: named('#fx-banner', 'banner'),
    labels: named('.dish-label:not(.is-leaving)'),
    inspect: named('#dish-inspect', 'inspect'),
  };
  // Pairs that must never overlap (intended overlays excluded).
  const rules = [
    ['hudGoal', 'coach'], ['hudGoal', 'chrome'], ['hudGoal', 'dish'], ['hud', 'dish'], ['hudDirector', 'chrome'], ['hudHeader', 'chrome'], ['hudHeader', 'hudHeader'],
    ['coach', 'chrome'], ['coach', 'tools'], ['coach', 'shell'],
    ['labels', 'labels'], ['labels', 'notebookTab'], ['labels', 'preview'],
    ['toasts', 'hud'], ['toasts', 'tools'], ['toasts', 'shell'], ['toasts', 'coach'], ['toasts', 'chrome'],
    ['paused', 'hud'], ['paused', 'chrome'], ['paused', 'coach'],
    ['shell', 'toolbox'], ['shell', 'dish'], ['toolbox', 'dish'], ['tools', 'tools'],
    ['notebookTab', 'chrome'], ['notebookTab', 'hud'], ['banner', 'hud'], ['banner', 'coach'],
    ['life', 'hud'], ['ticker', 'hud'], ['life', 'tools'], ['ticker', 'tools'],
    ['pointer', 'hudGoal'],
  ];
  const overlaps = [];
  for (const [ga, gb] of rules) {
    const A = groups[ga]; const B = groups[gb];
    for (let i = 0; i < A.length; i++) for (let j = 0; j < B.length; j++) {
      if (ga === gb && j <= i) continue;
      const a = A[i]; const b = B[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const area = inter(a.b, b.b);
      if (area > 30) overlaps.push(`${a.name} × ${b.name} (${area}px²)`);
    }
  }
  // Truncated / overflowing text in visible elements.
  const truncated = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.children.length > 3) continue;
    const text = (el.textContent || '').trim();
    if (!/[A-Za-z]/.test(text) || text.length > 140) continue;
    const s = getComputedStyle(el);
    const clipsX = el.scrollWidth > el.clientWidth + 1 && (s.overflowX === 'hidden' || s.textOverflow === 'ellipsis');
    const clamped = s.webkitLineClamp && s.webkitLineClamp !== 'none';
    const bottom = el.getBoundingClientRect().bottom;
    const textCut = [...el.querySelectorAll('*')].some((c) => c.children.length === 0 && (c.textContent || '').trim() && c.getBoundingClientRect().bottom > bottom + 1 && c.getBoundingClientRect().height > 0);
    const clipsY = el.scrollHeight > el.clientHeight + 2 && s.overflowY === 'hidden' && el.clientHeight > 0 && (el.children.length === 0 ? !clamped : textCut);
    if (clipsX || clipsY) truncated.push(`${el.id ? '#' + el.id : el.className.toString().split(' ')[0] || el.tagName} "${text.slice(0, 40)}"${clipsY ? ' (cut vertically)' : ''}`);
  }
  // Interactive controls partly off-screen.
  const offscreen = [];
  for (const el of document.querySelectorAll('button, [role="button"], a')) {
    if (!vis(el)) continue;
    // Items in a scrolling list are reachable by scrolling.
    let scrolls = false;
    for (let e = el.parentElement; e && !scrolls; e = e.parentElement) scrolls = /auto|scroll/.test(getComputedStyle(e).overflowY + getComputedStyle(e).overflowX);
    if (scrolls) continue;
    const b = box(el);
    if (b.x < -1 || b.y < -1 || b.r > innerWidth + 1 || b.b > innerHeight + 1) offscreen.push(`${el.id || (el.textContent || '').trim().slice(0, 20)} [${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.r)},${Math.round(b.b)}]`);
  }
  return { overlaps, truncated: [...new Set(truncated)].slice(0, 20), offscreen };
};

for (const size of sizes) {
  const [w, h] = size.split('x').map(Number);
  const mobile = w < 900;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { if (!sessionStorage.getItem('c')) { localStorage.clear(); sessionStorage.setItem('c', '1'); } });
  await page.goto(URL); await page.waitForTimeout(800);
  const dir = `${OUT}/${size}`; mkdirSync(dir, { recursive: true });
  report[size] = {};
  let n = 0;
  const snap = async (state) => {
    n += 1;
    const name = `${String(n).padStart(2, '0')}-${state}`;
    await page.screenshot({ path: `${dir}/${name}.png` });
    report[size][name] = await page.evaluate(AUDIT);
  };
  const tryDo = async (fn) => { try { await fn(); } catch (e) { report[size][`err-${n}`] = String(e).slice(0, 160); } };
  const b = async () => page.locator('#game').boundingBox();
  const tap = async (x, y) => { const bb = await b(); await page.mouse.click(bb.x + bb.width * x, bb.y + bb.height * y); };

  await snap('title');
  await page.click('#title-start'); await page.waitForTimeout(1300); await snap('welcome');
  await page.click('#coach-skip'); await page.waitForTimeout(1600); await snap('t1-press-egg');
  await tryDo(async () => { await page.click('[data-tool="egg"]'); await page.waitForTimeout(700); await snap('t1-place-egg'); });
  await tryDo(async () => { await tap(0.5, 0.5); await page.waitForTimeout(900); await snap('t1-press-nutrient'); });
  await tryDo(async () => { await page.click('[data-tool="nutrient"]'); await page.waitForTimeout(700); await snap('t1-feed'); });
  await tryDo(async () => { await tap(0.55, 0.53); await page.waitForTimeout(1200); await snap('t1-bloom-1s'); await page.waitForTimeout(3500); await snap('t1-goal-done'); });
  await tryDo(async () => { await page.click('#options-button'); await page.waitForTimeout(500); await snap('options-in-trial1'); await page.click('#options-close'); await page.waitForTimeout(300); });
  await tryDo(async () => { await page.click('#end-epoch-button'); await page.waitForTimeout(1500); await snap('reveal-new-strain'); });
  await tryDo(async () => { if (await page.locator('#fx-genome').getAttribute('aria-hidden') === 'false') await page.click('#fx-genome'); await page.waitForTimeout(1200); await snap('after-reveal'); });
  await tryDo(async () => { if (await page.locator('#method-intro-continue').isVisible()) { await snap('on-your-own'); await page.click('#method-intro-continue'); await page.waitForTimeout(700); } await snap('upgrade-pick'); });
  await tryDo(async () => { await page.locator('#pick-choices .pick-card').first().click(); await page.waitForTimeout(2200); await snap('t2-start'); });
  await tryDo(async () => { if (mobile) { await page.click('#mobile-lifeforms-toggle'); await page.waitForTimeout(600); await snap('t2-eggs-drawer'); } });
  await tryDo(async () => { await page.locator('[data-lifeform-id="bloom_mass"]').click(); await page.waitForTimeout(700); await snap('t2-place-bloom'); await tap(0.5, 0.5); await page.waitForTimeout(900); await snap('t2-press-nutrient'); });
  await tryDo(async () => { if (mobile) { await page.click('#mobile-log-toggle'); await page.waitForTimeout(600); await snap('t2-log-open'); await page.click('#mobile-log-toggle'); await page.waitForTimeout(300); } });
  await tryDo(async () => { await page.click('#notebook-button'); await page.waitForTimeout(700); await snap('notebook-library'); await page.click('#notebook-tab-study'); await page.waitForTimeout(300); await snap('notebook-trial'); await page.click('#notebook-tab-log'); await page.waitForTimeout(300); await snap('notebook-found'); await page.click('#notebook-close'); await page.waitForTimeout(400); });
  await tryDo(async () => { await page.click('#options-button'); await page.waitForTimeout(500); await snap('options-in-trial2'); await page.click('#options-leave-trial'); await page.waitForTimeout(300); await snap('options-leave-armed'); await page.click('#options-close'); await page.waitForTimeout(300); });
  await tryDo(async () => { await page.click('#options-button'); await page.click('#dbg-reveal-discoveries'); await page.waitForTimeout(900); await snap('openlab-choice'); });
  await tryDo(async () => { await page.locator('#objective-choices .objective-card').first().click(); await page.waitForTimeout(2500); await snap('openlab-start'); for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.7]]) { await tap(x, y); await page.waitForTimeout(300); } await page.waitForTimeout(6000); await snap('openlab-busy'); });
  await tryDo(async () => { if (!mobile) { const lab = await page.locator('.dish-label').first().boundingBox(); if (lab) { await page.mouse.move(lab.x + lab.width / 2, lab.y + lab.height + 14); await page.waitForTimeout(400); await snap('openlab-hover'); } } });
  report[size].errors = errors;
  await ctx.close();
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
await browser.close();
// Summary: each finding once, with the viewports and states it appears in.
// The welcome card (state 02) is a modal and overlaps everything by design.
const seen = new Map();
for (const [size, states] of Object.entries(report)) {
  for (const [state, result] of Object.entries(states)) {
    if (!result || typeof result !== 'object' || Array.isArray(result) || state.startsWith('02-')) continue;
    for (const kind of ['overlaps', 'truncated', 'offscreen']) {
      for (const item of result[kind] ?? []) {
        const key = `${kind}: ${item.replace(/\(\d+px²\)/, '').replace(/\[[^\]]*\]/g, '[]')}`;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push(`${size}:${state.slice(0, 2)}`);
      }
    }
  }
}
for (const [key, where] of [...seen].sort()) console.log(`${key}  (${where.slice(0, 6).join(' ')}${where.length > 6 ? ` +${where.length - 6}` : ''})`);
console.log(`${seen.size} distinct findings → ${OUT}/report.json`);
