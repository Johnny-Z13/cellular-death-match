import { expect, test, type Page } from '@playwright/test';
import { monitorRuntime } from './helpers';

async function clickGuidedDish(page: Page): Promise<void> {
  const pointer = page.locator('#onboarding-guide-pointer');
  await expect(pointer).toHaveAttribute('data-target', 'dish');
  const anchor = await pointer.evaluate((element) => ({
    x: Number.parseFloat((element as HTMLElement).style.left),
    y: Number.parseFloat((element as HTMLElement).style.top),
  }));
  await page.mouse.click(anchor.x, anchor.y);
}

test('Trial 2 guidance reliably reproduces Bitter Bloom', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem('cdm.onboarding-reset.v2', '1');
    window.localStorage.setItem('cdm.coach.seen.v8', '1');
    window.localStorage.setItem('cdm.coach.trials.v1', '[0]');
    window.localStorage.setItem('cellular-death-match.case-record.v1', JSON.stringify({
      completedTrialIds: ['culture-shock'],
    }));
    window.localStorage.setItem('cellular-death-match.discovery.v2', JSON.stringify({
      persistenceEnabled: true,
      discoveredBreedIds: ['bloom_mass'],
      discoveredNoteIds: ['breed_bloom_mass'],
      breedDiscoveryRecords: [{
        id: 'bloom_mass',
        discoveredAt: '2026-08-28T12:00:00.000Z',
        fresh: true,
        stage: 'stabilized',
      }],
      noteDiscoveryRecords: [{
        id: 'breed_bloom_mass',
        discoveredAt: '2026-08-28T12:00:00.000Z',
        fresh: true,
        stage: 'understood',
      }],
      revealAll: false,
    }));
    window.localStorage.setItem('cellular-death-match.run-checkpoint.v1', JSON.stringify({
      run: {
        phase: 'arena',
        fightIndex: 1,
        upgrades: [],
        outcome: null,
        pendingPickChoices: [],
        seed: 42,
        epochResults: ['completed'],
      },
      loadout: ['swarmlet'],
      pendingGenomeDecodeIds: [],
      savedAt: '2026-08-28T12:00:00.000Z',
    }));
  });
  await page.reload();
  await page.locator('#title-start').click();

  await page.locator('#mobile-lifeforms-toggle').click();
  await page.locator('[data-lifeform-id="bloom_mass"]').click();
  await clickGuidedDish(page);
  await page.locator('[data-tool="nutrient"]').click();
  await clickGuidedDish(page);
  await page.locator('[data-tool="toxin"]').click();
  await clickGuidedDish(page);

  await expect(page.locator('#hud-objective')).toContainText('complete', { timeout: 5_000 });
  const discovery = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem('cellular-death-match.discovery.v2') ?? '{}',
  ));
  expect(discovery.discoveredNoteIds).toContain('recipe_bitter_bloom');
  await page.screenshot({ path: testInfo.outputPath('bitter-bloom-guided.png') });
  runtime.assertClean();
});
