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

// 2026-10-09 legibility pass: the phone rack wraps so every unlocked tool is
// on screen. The drag-to-reveal lesson (coach MOBILE_TOOLBOX_ONBOARDING_BEAT)
// remains as a fallback for a rack that overflows, but phones no longer need it.
test('shows a newly unlocked tool in the phone rack without a reveal lesson', async ({ page }, testInfo: TestInfo) => {
  test.skip(!['phone', 'small-phone'].includes(testInfo.project.name), 'Phone rack only.');
  const runtime = monitorRuntime(page);
  await openAtTrialThree(page);

  await expect(page.locator('.layout')).not.toHaveClass(/mobile-toolbox-lesson-active/);
  await expect(page.locator('#toolbox-more')).toBeHidden();
  await expect(page.locator('[data-tool="water"]')).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator('[data-tool="water"]')).not.toHaveAttribute('aria-disabled');
  const rack = await page.locator('#toolbox').evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(rack.scrollWidth).toBeLessThanOrEqual(rack.clientWidth + 1);
  await page.screenshot({ path: testInfo.outputPath('trial-3-full-rack.png') });
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

test('fits the fully unlocked rack on screen with no sideways scroll', async ({ page }, testInfo: TestInfo) => {
  test.skip(!['phone', 'small-phone', 'tablet-portrait'].includes(testInfo.project.name), 'Portrait racks only.');
  const runtime = monitorRuntime(page);
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem('rack-cleared')) {
      window.localStorage.clear();
      window.sessionStorage.setItem('rack-cleared', '1');
    }
  });
  await page.goto('/');
  await page.locator('#title-start').click();
  await page.locator('#coach-skip').click();
  await page.locator('#options-button').click();
  await page.locator('#dbg-reveal-discoveries').click();
  await page.locator('#objective-choices .objective-card').first().click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');

  for (const tool of ['egg', 'nutrient', 'paste', 'toxin', 'water', 'salt', 'acid']) {
    await expect(page.locator(`[data-tool="${tool}"]`)).toBeInViewport({ ratio: 0.95 });
  }
  await expect(page.locator('#agitate-button')).toBeInViewport({ ratio: 0.95 });
  const geometry = await page.evaluate(() => {
    const rack = document.getElementById('toolbox')!;
    const shell = document.getElementById('mobile-shell')!.getBoundingClientRect();
    const dish = document.getElementById('game')!.getBoundingClientRect();
    return {
      scrollWidth: rack.scrollWidth,
      clientWidth: rack.clientWidth,
      rackTop: rack.getBoundingClientRect().top,
      shellBottom: shell.bottom,
      dishBottom: dish.bottom,
      shellTop: shell.top,
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(geometry.shellBottom).toBeLessThanOrEqual(geometry.rackTop + 1);
  expect(geometry.dishBottom).toBeLessThanOrEqual(geometry.shellTop + 1);
  await page.screenshot({ path: testInfo.outputPath('full-rack.png') });
  runtime.assertClean();
});
