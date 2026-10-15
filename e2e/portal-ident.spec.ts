import { expect, test } from '@playwright/test';
import { monitorRuntime } from './helpers';
import { readFileSync } from 'node:fs';

// Exercise the allowed-autoplay path; a separate test forces browser denial.
test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } });
const portal = '/playtest/index.html';
const config = JSON.parse(readFileSync('playtest/vercel.json', 'utf8'));
const csp = config.headers.find((entry: { source: string }) => entry.source === '/')
  .headers.find((header: { key: string }) => header.key === 'Content-Security-Policy').value;

test.beforeEach(async ({ page }) => {
  await page.route('**/playtest/index.html', async route => {
    // Serve the exact static portal, without Vite's development-only HMR client.
    await route.fulfill({
      body: readFileSync('playtest/index.html', 'utf8'),
      contentType: 'text/html',
      headers: { 'content-security-policy': csp },
    });
  });
});

test('portal opens with the animated mark and jingle, then reveals Play now', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto(portal);
  await expect(page).toHaveTitle('Cellular Death Match: Alpha playtest');
  await expect(page.locator('.ident-mark > span')).toHaveCount(3);
  await expect(page.locator('.ident')).toBeVisible();
  await expect.poll(() => page.locator('#intro-audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  await expect(page.locator('.ident')).toBeHidden({ timeout: 7000 });
  await expect(page.locator('.play-button')).toBeVisible();
  await expect(page.locator('.brand-mark > i')).toHaveCount(2);
  for (const diamond of await page.locator('.brand-mark > i').all()) {
    await expect(diamond).toHaveCSS('background-color', 'rgb(255, 209, 13)');
    await expect(diamond).toHaveCSS('transform', 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/portal-${test.info().project.name}.png` });
  runtime.assertClean();
});

test('replay restarts picture and audio; Escape stops both', async ({ page }) => {
  await page.goto(portal);
  await expect(page.locator('.ident')).toBeHidden({ timeout: 7000 });
  await page.getByRole('button', { name: 'Replay intro with sound' }).click();
  await expect(page.locator('.ident')).toBeVisible();
  await expect.poll(() => page.locator('#intro-audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ident')).toBeHidden();
  expect(await page.locator('#intro-audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  await expect(page.getByRole('button', { name: 'Replay intro with sound' })).toHaveAttribute('aria-pressed', 'false');
});

test('blocked autoplay still reveals the page and allows sound on replay', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    let first = true;
    HTMLMediaElement.prototype.play = function () {
      if (first) { first = false; return Promise.reject(new DOMException('Autoplay denied', 'NotAllowedError')); }
      return play.call(this);
    };
  });
  await page.goto(portal);
  await expect(page.locator('.ident')).toBeVisible();
  await expect(page.locator('.ident')).toBeHidden({ timeout: 7000 });
  await page.getByRole('button', { name: 'Replay intro with sound' }).click();
  await expect.poll(() => page.locator('#intro-audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
});

test('missing jingle cannot trap the page behind the ident', async ({ page }) => {
  await page.route('**/z13-ident.mp3', route => route.abort());
  await page.goto(portal);
  await expect(page.locator('.ident')).toBeHidden({ timeout: 7000 });
  await expect(page.locator('.play-button')).toBeVisible();
});

test('reduced motion skips automatic playback and keeps an audio-only replay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(portal);
  await expect(page.locator('.ident')).toBeHidden();
  expect(await page.locator('#intro-audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  await page.getByRole('button', { name: 'Replay intro with sound' }).click();
  await expect(page.locator('.ident')).toBeHidden();
  await expect.poll(() => page.locator('#intro-audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
});
