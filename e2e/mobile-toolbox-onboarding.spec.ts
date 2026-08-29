import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { monitorRuntime } from './helpers';

const COMPLETED_TRIALS = ['culture-shock', 'bitter-medicine'];

async function openAtTrialThree(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ completedTrials }) => {
    const discoveredAt = '2026-08-29T08:00:00.000Z';
    window.localStorage.clear();
    window.localStorage.setItem('cdm.onboarding-reset.v2', '1');
    window.localStorage.setItem('cdm.coach.seen.v8', '1');
    window.localStorage.setItem('cdm.coach.trials.v1', '[0,1]');
    window.localStorage.setItem('cellular-death-match.case-record.v1', JSON.stringify({
      completedTrialIds: completedTrials,
    }));
    window.localStorage.setItem('cellular-death-match.discovery.v2', JSON.stringify({
      persistenceEnabled: true,
      discoveredBreedIds: ['bloom_mass'],
      discoveredNoteIds: ['breed_bloom_mass', 'recipe_bitter_bloom'],
      breedDiscoveryRecords: [{
        id: 'bloom_mass',
        discoveredAt,
        fresh: false,
        stage: 'stabilized',
      }],
      noteDiscoveryRecords: [
        { id: 'breed_bloom_mass', discoveredAt, fresh: false, stage: 'understood' },
        { id: 'recipe_bitter_bloom', discoveredAt, fresh: false, stage: 'understood' },
      ],
      revealAll: false,
    }));
    window.localStorage.setItem('cellular-death-match.strains.v1', JSON.stringify({
      availableStrains: ['swarmlet', 'bruiser', 'bloom_mass'],
      loadout: ['swarmlet', 'bloom_mass'],
      loadoutSlots: 2,
      runCount: 0,
      biomeCount: 0,
    }));
  }, { completedTrials: COMPLETED_TRIALS });
  await page.reload();
  await expect(page.locator('#title-trial-label')).toContainText('Trial 03');
  await page.locator('#title-start').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
}

async function expectMobileRackLesson(page: Page, animated = true): Promise<void> {
  await expect(page.locator('#coach-title')).toHaveText('More tools are in the rack.');
  await expect(page.locator('#coach-body')).toContainText('Drag tools left to reveal Water');
  await expect(page.locator('#coach-step')).toHaveText('New control');
  await expect(page.locator('#onboarding-guide-pointer')).not.toHaveClass(/is-visible/);
  await expect(page.locator('.layout')).toHaveClass(/mobile-toolbox-lesson-active/);
  await expect(page.locator('#toolbox-more')).toBeFocused();
  await expect(page.locator('#toolbox-more')).toHaveCSS(
    'animation-name',
    animated ? 'mobile-toolbox-lesson-pulse' : 'none',
  );
  await expect(page.locator('[data-tool="toxin"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-tool="egg"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-tool="water"]')).not.toBeInViewport({ ratio: 0.9 });

  // Even synthetic activation cannot spend a charge or carry Trial 2's Toxin
  // selection into the new dish while the rack lesson owns input.
  const eggCharge = await page.locator('[data-tool="egg"] [data-tool-count]').textContent();
  await page.locator('[data-tool="toxin"]').evaluate((button: HTMLButtonElement) => button.click());
  await page.locator('#game').dispatchEvent('pointerdown', { clientX: 190, clientY: 420, pointerId: 1 });
  await expect(page.locator('[data-tool="egg"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-tool="toxin"]')).not.toHaveClass(/selected/);
  await expect(page.locator('[data-tool="egg"] [data-tool-count]')).toHaveText(eggCharge ?? '');
}

test('teaches a native mobile rack drag and persists the demonstrated gesture', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Touch-drag path is exercised once at the primary phone viewport.');
  const runtime = monitorRuntime(page);
  await openAtTrialThree(page);
  await expectMobileRackLesson(page);
  await page.screenshot({ path: testInfo.outputPath('trial-3-rack-lesson-touch.png') });

  const rack = page.locator('#toolbox');
  const box = await rack.boundingBox();
  expect(box).not.toBeNull();
  const y = box!.y + box!.height * 0.55;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: box!.x + box!.width - 72, y }],
  });
  for (const progress of [0.25, 0.5, 0.75, 1]) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box!.x + box!.width - 72 - (box!.width - 132) * progress, y }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect(page.locator('[data-tool="water"]')).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.layout')).not.toHaveClass(/mobile-toolbox-lesson-active/);
  await expect(page.locator('[data-tool="water"]')).not.toHaveAttribute('aria-disabled');
  await expect(page.locator('[data-tool="salt"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#hud-director-kicker')).toHaveText(/Dr\. E(?: · New trial)?/);
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('cdm.coach.mobile-toolbox-seen.v1')
  ))).toBe('1');
  await page.screenshot({ path: testInfo.outputPath('trial-3-rack-dragged.png') });

  await page.reload();
  await page.locator('#title-start').click();
  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#game')).toBeFocused();
  runtime.assertClean();
});

test('accepts the mobile overflow control as the accessible rack-lesson equivalent', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'small-phone', 'Overflow-button equivalent is exercised at the minimum phone viewport.');
  const runtime = monitorRuntime(page);
  await openAtTrialThree(page);
  await expectMobileRackLesson(page);
  await page.screenshot({ path: testInfo.outputPath('trial-3-rack-lesson-button.png') });

  await page.locator('#toolbox-more').click();
  await expect(page.locator('[data-tool="water"]')).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.layout')).not.toHaveClass(/mobile-toolbox-lesson-active/);
  await expect(page.locator('[data-tool="water"]')).not.toHaveAttribute('aria-disabled');
  await expect(page.locator('[data-tool="salt"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-tool="water"]')).toBeFocused();
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('cdm.coach.mobile-toolbox-seen.v1')
  ))).toBe('1');
  await page.screenshot({ path: testInfo.outputPath('trial-3-rack-button.png') });
  runtime.assertClean();
});

test('keeps the rack lesson explicit and operable with reduced motion', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'small-phone', 'Reduced-motion rack behavior is exercised at the tightest portrait viewport.');
  const runtime = monitorRuntime(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAtTrialThree(page);
  await expectMobileRackLesson(page, false);

  await page.locator('#toolbox-more').press('Enter');
  await expect(page.locator('[data-tool="water"]')).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('[data-tool="water"]')).toBeFocused();
  runtime.assertClean();
});

test('keeps the mobile-only rack lesson off desktop', async ({ page }, testInfo: TestInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop exclusion is asserted only in the desktop project.');
  const runtime = monitorRuntime(page);
  await openAtTrialThree(page);

  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#hud-director-title')).toHaveText('Carrier Medium');
  await expect(page.locator('#game')).toBeFocused();
  expect(await page.evaluate(() => (
    window.localStorage.getItem('cdm.coach.mobile-toolbox-seen.v1')
  ))).toBeNull();
  runtime.assertClean();
});
