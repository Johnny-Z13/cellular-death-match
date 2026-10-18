// UX flow audit: walks the game through 25 scripted states (title → Trial 1
// → reveal → upgrade → Trial 2 → Notebook → Options → Open Lab) and, at each
// state, records overlaps between surfaces that must never overlap, text that
// is visibly cut, and controls off screen. Screenshots every state.
//
// Usage (dev server running, page title "Cellular Death Match"):
//   node scripts/ux-flow-audit.mjs 390x844,375x667,844x390,768x1024,1280x720 output/ux-audit
// Env: CDM_URL (default http://localhost:5199/).
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[3] ?? 'output/ux-audit';
const sizes = (process.argv[2] ?? '390x844,375x667,844x390,768x1024,1280x720').split(',');
const URL = process.env.CDM_URL ?? 'http://localhost:5199/';
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
  // The wide layout floats its glass menus over a full-screen dish by design.
  const wide = document.documentElement.dataset.layout === 'wide';
  for (const [ga, gb] of rules) {
    if (wide && (ga === 'dish' || gb === 'dish')) continue;
    // The open egg tray is a modal over a held dish; it may cover the HUD.
    if (document.querySelector('.layout')?.dataset.mobileDrawer === 'lifeforms' && (ga === 'life' || gb === 'life')) continue;
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
    // A transparent label is a deliberate clip (kept for assistive tech).
    if (/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(s.color)) continue;
    const clipsX = el.scrollWidth > el.clientWidth + 1 && (s.overflowX === 'hidden' || s.textOverflow === 'ellipsis');
    const clamped = s.webkitLineClamp && s.webkitLineClamp !== 'none';
    const bottom = el.getBoundingClientRect().bottom;
    const textCut = [...el.querySelectorAll('*')].some((c) => c.children.length === 0 && (c.textContent || '').trim() && c.getBoundingClientRect().bottom > bottom + 1 && c.getBoundingClientRect().height > 0);
    const clipsY = el.scrollHeight > el.clientHeight + 2 && s.overflowY === 'hidden' && el.clientHeight > 0 && (el.children.length === 0 ? !clamped : textCut);
    if (clipsX || clipsY) truncated.push(`${el.id ? '#' + el.id : el.className.toString().split(' ')[0] || el.tagName} "${text.slice(0, 40)}"${clipsY ? ' (cut vertically)' : ''}`);
  }
  // Text that spills past the edge of its own button, tile or card (overflow
  // left visible, so nothing clips it and nothing reports it).
  const spills = [];
  const CONTAINERS = 'button, .tool-button, .pick-card, .objective-card, .life-item, .dex-tile, .notebook-entry, .chrome-button, .mobile-shell-button, .screen-button, .coach, .hud-goal, .hud-director';
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!/[A-Za-z0-9]/.test(text)) continue;
    const host = el.parentElement?.closest(CONTAINERS);
    if (!host || !vis(host) || el.closest('.egg-tool-tab')) continue;
    // A box that clips its own text is a truncation, reported above.
    if (getComputedStyle(el).overflow !== 'visible') continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const t = range.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    if (t.width < 1) continue;
    const over = Math.max(h.left - t.left, t.right - h.right, h.top - t.top, t.bottom - h.bottom);
    if (over > 1.5) spills.push(`${host.id ? '#' + host.id : host.className.toString().split(' ')[0]} ⊃ "${text.slice(0, 30)}" (+${Math.round(over)}px)`);
  }
  // Small text too faint to read: its colour (alpha and ancestor opacity
  // folded in) against the game's dark panel, below WCAG AA's 4.5:1.
  const faint = [];
  const lum = ([r, g, b]) => [r, g, b].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
  const PANEL = [8, 18, 21];
  for (const el of document.querySelectorAll('body *')) {
    if (!vis(el) || el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!/[A-Za-z0-9]/.test(text)) continue;
    const s = getComputedStyle(el);
    if (parseFloat(s.fontSize) >= 18 || el.closest('[aria-hidden="true"], .dish-labels, .debug-only, .notebook-locked, .locked-discovery, [disabled]')) continue;
    // Colours arrive as rgb()/rgba() or, from color-mix(), as color(srgb r g b / a) in 0-1.
    const parse = (c) => {
      const n = c.match(/[\d.]+/g)?.map(Number);
      if (!n) return null;
      if (c.startsWith('color(')) return [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1];
      return [n[0], n[1], n[2], n[3] ?? 1];
    };
    const m = parse(s.color);
    if (!m) continue;
    // Transparent text is deliberately invisible (a clipped label kept for
    // assistive tech), not faint.
    if (m[3] === 0) continue;
    let alpha = m[3];
    for (let e = el; e; e = e.parentElement) alpha *= Number(getComputedStyle(e).opacity);
    // Judge against the nearest solid background (a light button has dark text).
    let bg = PANEL;
    for (let e = el; e; e = e.parentElement) {
      const b = parse(getComputedStyle(e).backgroundColor);
      if (b && b[3] > 0.6) { bg = [b[0], b[1], b[2]]; break; }
    }
    const rgb = [0, 1, 2].map((i) => m[i] * alpha + bg[i] * (1 - alpha));
    const [hi, lo] = [lum(rgb), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    if (ratio < 4.5) faint.push(`${el.id ? '#' + el.id : el.className.toString().split(' ')[0] || el.tagName} "${text.slice(0, 24)}" ${ratio.toFixed(1)}:1`);
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
  return { overlaps, truncated: [...new Set(truncated)].slice(0, 20), spills: [...new Set(spills)].slice(0, 20), faint: [...new Set(faint)].slice(0, 30), offscreen };
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
  await tryDo(async () => { await page.waitForTimeout(2600); await snap('reveal-catch'); for (let i = 0; i < 6 && await page.locator('#fx-genome').getAttribute('aria-hidden') === 'false'; i += 1) { await page.click('#fx-genome'); await page.waitForTimeout(150); } await page.waitForTimeout(1000); await snap('after-reveal'); });
  await tryDo(async () => { if (await page.locator('#method-intro-continue').isVisible()) { await snap('on-your-own'); await page.click('#method-intro-continue'); await page.waitForTimeout(700); } await snap('upgrade-pick'); });
  await tryDo(async () => { await page.locator('#pick-choices .pick-card').first().click(); await page.waitForTimeout(2200); await snap('t2-start'); });
  await tryDo(async () => { await page.click('[data-tool="egg"]'); await page.waitForTimeout(600); await snap('t2-egg-tray'); });
  await tryDo(async () => { await page.locator('[data-lifeform-id="bloom_mass"]').click(); await page.waitForTimeout(700); await snap('t2-place-bloom'); await tap(0.5, 0.5); await page.waitForTimeout(900); await snap('t2-press-nutrient'); });
  await tryDo(async () => { if (mobile) { await page.click('#mobile-log-toggle'); await page.waitForTimeout(600); await snap('t2-log-open'); await page.click('#mobile-log-toggle'); await page.waitForTimeout(300); } });
  await tryDo(async () => { await page.click('#notebook-button'); await page.waitForTimeout(700); await snap('notebook-library'); await page.click('#notebook-tab-study'); await page.waitForTimeout(300); await snap('notebook-trial'); await page.click('#notebook-tab-log'); await page.waitForTimeout(300); await snap('notebook-found'); await page.click('#notebook-close'); await page.waitForTimeout(400); });
  await tryDo(async () => { await page.click('#options-button'); await page.waitForTimeout(500); await snap('options-in-trial2'); await page.click('#options-leave-trial'); await page.waitForTimeout(300); await snap('options-leave-armed'); await page.click('#options-close'); await page.waitForTimeout(300); });
  await tryDo(async () => { await page.click('#options-button'); await page.click('#dbg-reveal-discoveries'); await page.waitForTimeout(900); await snap('openlab-choice'); });
  await tryDo(async () => { await page.locator('#objective-choices .objective-card').first().click(); await page.waitForTimeout(2500); await snap('openlab-start'); for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.7]]) { await tap(x, y); await page.waitForTimeout(300); } await page.waitForTimeout(6000); await snap('openlab-busy'); });
  await tryDo(async () => { if (!mobile) { const lab = await page.locator('.dish-label').first().boundingBox(); if (lab) { await page.mouse.move(lab.x + lab.width / 2, lab.y + lab.height + 14); await page.waitForTimeout(400); await snap('openlab-hover'); } } });
  await tryDo(async () => { await page.click('[data-tool="egg"]'); await page.waitForTimeout(500); await snap('openlab-egg-tray'); await page.click('[data-tool="egg"]'); await page.waitForTimeout(300); });
  await tryDo(async () => { await page.click('#dex-button'); await page.waitForTimeout(900); await snap('friends'); await page.keyboard.press('Escape'); await page.waitForTimeout(400); });
  await tryDo(async () => { if (await page.evaluate(() => window.cdmDebug?.reveal?.('glider'))) { await page.waitForTimeout(1600); await snap('friend-reveal'); await page.waitForTimeout(3500); await snap('friend-reveal-settled'); } });
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
    for (const kind of ['overlaps', 'truncated', 'spills', 'faint', 'offscreen']) {
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
