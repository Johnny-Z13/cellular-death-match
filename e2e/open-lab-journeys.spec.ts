import { expect, test, type Page } from '@playwright/test';
import { clickDish, monitorRuntime } from './helpers';

const CASE_TRIALS = [
  'culture-shock',
  'bitter-medicine',
  'carrier-medium',
  'storm-in-a-dish',
  'cure-ish',
];

const CASE_NOTES = [
  'recipe_bitter_bloom',
  'recipe_nutrient_conduit',
  'recipe_foam_lightning',
  'recipe_brine_channel',
];

async function seedSealedCase(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ trials, notes }) => {
    const discoveredAt = '2026-08-28T12:00:00.000Z';
    window.localStorage.clear();
    window.localStorage.setItem('cdm.onboarding-reset.v2', '1');
    window.localStorage.setItem('cdm.coach.seen.v8', '1');
    window.localStorage.setItem('cdm.coach.trials.v1', '[0,1,2,3,4]');
    window.localStorage.setItem('cellular-death-match.case-record.v1', JSON.stringify({
      completedTrialIds: trials,
    }));
    window.localStorage.setItem('cellular-death-match.discovery.v2', JSON.stringify({
      persistenceEnabled: true,
      discoveredBreedIds: ['bloom_mass'],
      discoveredNoteIds: ['breed_bloom_mass', ...notes],
      breedDiscoveryRecords: [{
        id: 'bloom_mass',
        discoveredAt,
        fresh: false,
        stage: 'stabilized',
      }],
      noteDiscoveryRecords: ['breed_bloom_mass', ...notes].map((id) => ({
        id,
        discoveredAt,
        fresh: false,
        stage: 'understood',
      })),
      revealAll: false,
    }));
    window.localStorage.setItem('cellular-death-match.strains.v1', JSON.stringify({
      availableStrains: ['swarmlet', 'bruiser', 'bloom_mass'],
      loadout: ['swarmlet', 'bruiser'],
      loadoutSlots: 2,
      runCount: 1,
      biomeCount: 0,
    }));
  }, { trials: CASE_TRIALS, notes: CASE_NOTES });
  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Enter Open Lab');
  await expect(page.locator('#title-genome-progress')).toHaveText('5 / 14 genomes decoded');
}

async function enterOpenLab(page: Page): Promise<string> {
  await page.locator('#title-start').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'loadout');
  await page.locator('.loadout-confirm').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'objective');
  const firstCard = page.locator('#objective-choices .objective-card').first();
  const objective = (await firstCard.locator('.pick-card-name').textContent())?.trim() ?? '';
  await firstCard.click();
  await expect(page.locator('#hud-fight')).toHaveText('1 / ∞');
  return objective;
}

async function chooseLifeform(page: Page, id: string): Promise<void> {
  await page.locator('[data-tool="egg"]').click();
  const button = page.locator(`[data-lifeform-id="${id}"]`);
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
}

async function useToolAtCentre(page: Page, tool: string): Promise<void> {
  const button = page.locator(`[data-tool="${tool}"]`);
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
  await clickDish(page, 0.52, 0.52);
}

test('chooses a rare-genome loadout and resumes the same Open Lab study', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await seedSealedCase(page);
  await page.locator('#title-start').click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'loadout');

  await expect(page.locator('.loadout-count')).toHaveText('2/2 archived');
  await page.locator('[data-strain="swarmlet"]').click();
  await page.locator('[data-strain="bloom_mass"]').click();
  await expect(page.locator('[data-strain="bloom_mass"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.loadout-confirm').click();

  const firstCard = page.locator('#objective-choices .objective-card').first();
  const objective = (await firstCard.locator('.pick-card-name').textContent())?.trim() ?? '';
  await firstCard.click();
  await expect(page.locator('#hud-director-title')).toHaveText(objective);
  await expect(page.locator('#study-start-announcer')).toContainText(`New Study: ${objective}`);
  await expect(page.locator('#hud-director-kicker')).toHaveText('Dr. E · New study');
  await expect(page.locator('#fx-banner')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#game')).toBeFocused();
  await expect(page.locator('#study-start-announcer')).toBeEmpty({ timeout: 4_000 });
  await expect(page.locator('#hud-director-kicker')).toHaveText('Dr. E · Dish status');
  await chooseLifeform(page, 'bloom_mass');

  const saved = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem('cellular-death-match.run-checkpoint.v1') ?? '{}',
  ));
  expect(saved.loadout).toEqual(['bruiser', 'bloom_mass']);

  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Restart Study');
  await page.locator('#title-start').click();
  await expect(page.locator('#hud-director-title')).toHaveText(objective);
  await chooseLifeform(page, 'bloom_mass');
  await page.screenshot({ path: testInfo.outputPath('rare-loadout-study-resumed.png') });
  runtime.assertClean();
});

test('discovers Salt-Water Crystal experimentally and persists the new protocol', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await seedSealedCase(page);
  await enterOpenLab(page);

  await chooseLifeform(page, 'bruiser');
  await clickDish(page, 0.52, 0.52);
  await page.locator('#toolbox-more').click();
  await useToolAtCentre(page, 'salt');
  await useToolAtCentre(page, 'water');

  await expect.poll(async () => page.evaluate(() => {
    const save = JSON.parse(window.localStorage.getItem('cellular-death-match.discovery.v2') ?? '{}');
    return save.discoveredNoteIds?.includes('recipe_salt_water_crystal') === true;
  }), { timeout: 8_000 }).toBe(true);
  await expect(page.locator('[data-tool="acid"]')).toBeDisabled();

  const firstEvidence = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem('cellular-death-match.discovery.v2') ?? '{}',
  ));
  expect(firstEvidence.noteDiscoveryRecords.find(
    (record: { id: string }) => record.id === 'recipe_salt_water_crystal',
  )?.stage).toBe('observed');

  await page.locator('#notebook-button').click();
  await page.locator('#notebook-tab-log').click();
  const observedCard = page.locator('.notebook-entry', { hasText: 'Salt-Water Crystal' });
  await expect(observedCard).toContainText('Signal observed');
  await expect(observedCard).toContainText('fresh later dish');
  await page.locator('#notebook-close').click();

  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Restart Study');
  await page.locator('#title-start').click();
  await page.locator('#toolbox-more').click();
  await chooseLifeform(page, 'bruiser');
  await clickDish(page, 0.52, 0.52);
  await page.locator('#toolbox-more').click();
  await useToolAtCentre(page, 'salt');
  await useToolAtCentre(page, 'water');

  await expect(page.locator('[data-tool="acid"]')).toBeEnabled();
  const persisted = await page.evaluate(() => JSON.parse(
    window.localStorage.getItem('cellular-death-match.discovery.v2') ?? '{}',
  ));
  expect(persisted.noteDiscoveryRecords.find(
    (record: { id: string }) => record.id === 'recipe_salt_water_crystal',
  )?.stage).toBe('understood');
  await page.locator('#notebook-button').click();
  await page.locator('#notebook-tab-log').click();
  await expect(page.locator('.notebook-entry', { hasText: 'Salt-Water Crystal' }))
    .toContainText('Protocol understood');
  await page.screenshot({ path: testInfo.outputPath('crystal-protocol-persisted.png') });
  runtime.assertClean();
});
