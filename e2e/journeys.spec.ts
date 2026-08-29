import { expect, test, type Page, type TestInfo } from '@playwright/test';
import {
  clickDish,
  completeOpeningActions,
  continueToMethodPicker,
  monitorRuntime,
  startFirstTrial,
} from './helpers';

interface TrialTiming {
  trial: number;
  objective: string;
  activeMs: number;
}

async function openWithFreshStorageOnce(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
}

async function selectLifeform(page: Page, id: string): Promise<void> {
  const lifeform = page.locator(`[data-lifeform-id="${id}"]`);
  if (!await lifeform.isVisible()) await page.locator('#mobile-lifeforms-toggle').click();
  await expect(lifeform).toBeVisible();
  await expect(lifeform).toBeEnabled();
  await lifeform.click();
}

async function selectToolAndApply(page: Page, tool: string, guided = true): Promise<void> {
  const button = page.locator(`[data-tool="${tool}"]`);
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
  if (guided) await clickGuidedDish(page);
  else await clickDish(page, 0.52, 0.52);
}

async function clickGuidedDish(page: Page): Promise<void> {
  const pointer = page.locator('#onboarding-guide-pointer');
  await expect(pointer).toHaveAttribute('data-target', 'dish');
  await expect(pointer).toHaveClass(/is-visible/);
  const anchor = await pointer.evaluate((element) => ({
    x: Number.parseFloat((element as HTMLElement).style.left),
    y: Number.parseFloat((element as HTMLElement).style.top),
  }));
  expect(Number.isFinite(anchor.x) && Number.isFinite(anchor.y)).toBe(true);
  await page.mouse.click(anchor.x, anchor.y);
}

async function waitForToolReady(page: Page, tool: string): Promise<void> {
  const button = page.locator(`[data-tool="${tool}"]`);
  await expect.poll(() => button.evaluate((element) => (
    getComputedStyle(element).getPropertyValue('--cooldown').trim()
  ))).toBe('0');
}

async function finishTrial(
  page: Page,
  trial: number,
  objective: string,
  startedAt: number,
  timings: TrialTiming[],
): Promise<void> {
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 35_000 });
  timings.push({ trial, objective, activeMs: Date.now() - startedAt });
  await page.locator('#end-epoch-button').click();
  const reveal = page.locator('#fx-genome');
  const introduction = page.locator('#screen-method-intro');
  const pick = page.locator('#screen-pick');
  await expect.poll(async () => (
    await reveal.getAttribute('aria-hidden') === 'false'
      || await introduction.evaluate((element) => element.classList.contains('visible'))
      || await pick.evaluate((element) => element.classList.contains('visible'))
  )).toBe(true);
  if (await reveal.getAttribute('aria-hidden') === 'false') await reveal.click();
  await continueToMethodPicker(page);
}

async function pickMethod(page: Page): Promise<number> {
  await expect(page.locator('#pick-choices .pick-card')).toHaveCount(3);
  await page.locator('#pick-choices .pick-card').first().click();
  return Date.now();
}

test('plays the five-Trial Case, records discovery cadence, and resumes an Open Lab study', async ({ page }, testInfo: TestInfo) => {
  test.setTimeout(180_000);
  const runtime = monitorRuntime(page);
  const timings: TrialTiming[] = [];
  await openWithFreshStorageOnce(page);

  let startedAt = Date.now();
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await finishTrial(page, 1, 'Culture Shock', startedAt, timings);

  startedAt = await pickMethod(page);
  await expect(page.locator('#coach-title')).toHaveText('Open Eggs. Choose Bloom Mass.');
  await selectLifeform(page, 'bloom_mass');
  await clickGuidedDish(page);
  await expect(page.locator('#coach-title')).toHaveText('Press Nutrient.');
  await selectToolAndApply(page, 'nutrient');
  await expect(page.locator('#coach-title')).toHaveText('Now press Toxin.');
  await selectToolAndApply(page, 'toxin');
  await finishTrial(page, 2, 'Bitter Medicine', startedAt, timings);

  const trialThreeMethod = page.locator('#pick-choices .pick-card').first();
  await expect(trialThreeMethod).toBeFocused();
  await trialThreeMethod.press('Enter');
  startedAt = Date.now();
  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('#hud-director-title')).toHaveText('Carrier Medium');
  } else {
    await expect(page.locator('#coach-title')).toHaveText('More tools are in the rack.');
    await expect(page.locator('#toolbox-more')).toBeFocused();
    await page.locator('#toolbox-more').click();
  }
  await expect(page.locator('[data-tool="water"]')).toBeInViewport({ ratio: 0.9 });
  await expect(page.locator('#coach')).toHaveAttribute('aria-hidden', 'true');
  await selectLifeform(page, 'bloom_mass');
  await clickDish(page, 0.52, 0.52);
  await selectToolAndApply(page, 'nutrient', false);
  await selectToolAndApply(page, 'water', false);
  await finishTrial(page, 3, 'Carrier Medium', startedAt, timings);

  startedAt = await pickMethod(page);
  await selectLifeform(page, 'swarmlet');
  await clickDish(page, 0.52, 0.52);
  await selectToolAndApply(page, 'toxin', false);
  await selectToolAndApply(page, 'water', false);
  await waitForToolReady(page, 'water');
  await clickDish(page, 0.52, 0.52);
  await finishTrial(page, 4, 'Storm in a Dish', startedAt, timings);

  startedAt = await pickMethod(page);
  await selectLifeform(page, 'bloom_mass');
  await clickDish(page, 0.52, 0.52);
  await selectToolAndApply(page, 'salt', false);
  await selectToolAndApply(page, 'nutrient', false);
  await selectToolAndApply(page, 'water', false);
  await finishTrial(page, 5, 'The Cure-ish', startedAt, timings);

  const save = await page.evaluate(() => ({
    caseRecord: JSON.parse(window.localStorage.getItem('cellular-death-match.case-record.v1') ?? '{}'),
    discoveries: JSON.parse(window.localStorage.getItem('cellular-death-match.discovery.v2') ?? '{}'),
  }));
  expect(save.caseRecord.completedTrialIds).toHaveLength(5);
  expect(save.discoveries.discoveredBreedIds).toContain('bloom_mass');
  expect(save.discoveries.discoveredNoteIds).toEqual(expect.arrayContaining([
    'recipe_bitter_bloom',
    'recipe_nutrient_conduit',
    'recipe_foam_lightning',
    'recipe_brine_channel',
  ]));

  await expect(page.locator('#fx-wipe')).not.toHaveClass(/fx-wipe-play/);
  await page.screenshot({ path: testInfo.outputPath('case-sealed-method-choice.png') });
  startedAt = await pickMethod(page);
  await expect(page.locator('#screen-objective')).toHaveClass(/visible/);
  const chosenObjective = (await page.locator('#objective-choices .objective-card .pick-card-name').first().textContent())?.trim() ?? '';
  await page.locator('#objective-choices .objective-card').first().evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.locator('#hud-fight')).toHaveText('1 / ∞');
  await selectToolAndApply(page, 'nutrient', false);
  timings.push({ trial: 6, objective: `Open Lab: ${chosenObjective}`, activeMs: Date.now() - startedAt });

  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Restart Study');
  await page.locator('#title-start').click();
  await expect(page.locator('#hud-fight')).toHaveText('1 / ∞');
  await expect(page.locator('#hud-director-title')).toHaveText(chosenObjective);
  await selectLifeform(page, 'bloom_mass');
  await clickDish(page, 0.68, 0.42);
  await page.screenshot({ path: testInfo.outputPath('open-lab-study-resumed.png') });

  const timingReport = {
    trials: timings,
    automatedActiveMs: timings.reduce((sum, timing) => sum + timing.activeMs, 0),
  };
  console.log(`JOURNEY_TIMINGS ${JSON.stringify(timingReport)}`);
  await testInfo.attach('journey-timing.json', {
    body: JSON.stringify(timingReport, null, 2),
    contentType: 'application/json',
  });
  runtime.assertClean();
});
