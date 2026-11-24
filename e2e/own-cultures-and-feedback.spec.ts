import { expect, test, type Page } from '@playwright/test';
import { clickDish, monitorRuntime, openFreshApp, selectSwarmlet, startFirstTrial } from './helpers';

const CASE_TRIALS = ['culture-shock', 'bitter-medicine', 'carrier-medium', 'storm-in-a-dish', 'cure-ish'];

interface StagedRun {
  fightIndex: number;
  upgrades?: Array<{ id: string; stacks: number }>;
  chosenObjective?: Record<string, unknown>;
  /** Every strain unlocked, for an Open Lab trial that needs several. */
  allStrains?: boolean;
  /** Open on the upgrade choice after this trial, offering these upgrades. */
  pick?: string[];
}

/** Open the game on a saved run at the start of a given trial. */
async function openStagedRun(page: Page, run: StagedRun): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ run, trials }) => {
    const completed = trials.slice(0, Math.min(run.fightIndex, trials.length));
    window.localStorage.clear();
    window.localStorage.setItem('cdm.onboarding-reset.v2', '1');
    window.localStorage.setItem('cdm.coach.seen.v8', '1');
    window.localStorage.setItem('cdm.coach.trials.v1', JSON.stringify(completed.map((_, index) => index)));
    window.localStorage.setItem('cellular-death-match.case-record.v1', JSON.stringify({
      completedTrialIds: completed,
    }));
    if (run.allStrains) {
      window.localStorage.setItem('cellular-death-match.discovery.v2', JSON.stringify({
        persistenceEnabled: true,
        discoveredBreedIds: [],
        discoveredNoteIds: [],
        revealAll: true,
      }));
    }
    window.localStorage.setItem('cellular-death-match.run-checkpoint.v1', JSON.stringify({
      run: {
        phase: run.pick ? 'upgrade_pick' : 'arena',
        fightIndex: run.fightIndex,
        upgrades: run.upgrades ?? [],
        outcome: null,
        pendingPickChoices: run.pick ?? [],
        seed: 42,
        epochResults: Array.from({ length: run.fightIndex + (run.pick ? 1 : 0) }, () => 'completed'),
        chosenObjective: run.chosenObjective,
      },
      loadout: run.allStrains ? ['swarmlet', 'bruiser', 'splitter'] : ['swarmlet'],
      pendingGenomeDecodeIds: [],
      savedAt: '2026-11-17T12:00:00.000Z',
    }));
  }, { run, trials: CASE_TRIALS });
  await page.reload();
  await page.locator('#title-start').click();
  if (run.pick) {
    await expect(page.locator('#pick-choices .pick-card')).toHaveCount(run.pick.length);
    return;
  }
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
}

test('a culture the player plants is tagged as theirs', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);
  await selectSwarmlet(page);
  await clickDish(page);
  // The wild Swarmlet already in the dish keeps its plain name.
  await expect(page.locator('.dish-label', { hasText: 'Your Swarmlet' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('your-swarmlet.png') });
  runtime.assertClean();
});

test('an upgrade adds to a tool\'s stock instead of replacing it', async ({ page }) => {
  await openStagedRun(page, { fightIndex: 2 });
  const water = page.locator('[data-tool="water"] [data-tool-count]');
  await expect(water).toHaveText('6/6');

  await openStagedRun(page, { fightIndex: 2, upgrades: [{ id: 'water_1', stacks: 1 }] });
  await expect(water).toHaveText('8/8');
});

test('a tap on a tool that is still recharging is refused out loud', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await openStagedRun(page, { fightIndex: 2 });
  const egg = page.locator('[data-tool="egg"]');
  const readout = page.locator('#mobile-tool-summary');
  const stocked = Number.parseInt((await egg.locator('[data-tool-count]').textContent())!, 10);
  const idle = (await readout.textContent())!.trim();

  // Two taps back to back, with nothing awaited between them: the first
  // plants and starts the Egg's cooldown, so the second is always refused.
  const box = (await page.locator('#game').boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.35);
  await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6);

  // The second tap plants nothing, and says so.
  await expect(egg).toHaveClass(/tool-denied/);
  await expect(readout).toHaveText('recharging, one moment');
  await expect(egg.locator('[data-tool-count]')).toHaveText(new RegExp(`^${stocked - 1}/`));
  await page.screenshot({ path: testInfo.outputPath('refused-tap.png') });

  // ...and the readout goes back to naming the tool.
  await expect(readout).toHaveText(idle);
  await expect(egg).not.toHaveClass(/tool-denied/);
  runtime.assertClean();
});

test('a Balance trial says why its clock is paused', async ({ page }, testInfo) => {
  await openStagedRun(page, {
    fightIndex: 5,
    allStrains: true,
    chosenObjective: {
      kind: 'hold_balance',
      name: 'Living Dish',
      description: 'Hold the dish in balance for two minutes in all.',
      target: 'Balance held 2:00',
      hint: 'Plant three strains apart. Feed whoever is fading; slow whoever is taking over.',
      sustainTicks: 60 * 120,
    },
  });
  const line = page.locator('#hud-director-progress');
  await expect(line).toHaveText('Clock paused: 0 of 3 of your strains alive. Plant 3 more.');
  await clickDish(page, 0.3, 0.35);
  await expect(line).toHaveText('Clock paused: 1 of 3 of your strains alive. Plant 2 more.');
  await page.screenshot({ path: testInfo.outputPath('balance-paused.png') });
});

test('desktop toasts hang under the HUD, off the middle of the dish', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 0) < 900, 'Phones and tablets keep their own event rail.');
  await openStagedRun(page, { fightIndex: 2 });
  const hudBottom = await page.locator('#hud').evaluate((el) => el.getBoundingClientRect().bottom);
  const toasts = await page.locator('#fx-toasts').evaluate((el) => {
    const style = getComputedStyle(el);
    return { top: el.getBoundingClientRect().top, bottom: style.bottom };
  });
  expect(toasts.top).toBeGreaterThanOrEqual(hudBottom);
  expect(toasts.top).toBeLessThan(hudBottom + 40);
  expect(toasts.bottom).not.toBe('112px');
});

test('an upgrade card shows the stock before and after, and is not a rack tool', async ({ page }, testInfo) => {
  const runtime = monitorRuntime(page);
  await openStagedRun(page, { fightIndex: 2, upgrades: [{ id: 'food_1', stacks: 1 }], pick: ['food_1', 'toxin_radius_1', 'water_1'] });
  const cards = page.locator('#pick-choices .upgrade-card');

  // Nutrient is 5 by default and the run already holds one Richer Agar.
  const nutrient = cards.nth(0);
  await expect(nutrient.locator('.upgrade-card-tool')).toHaveText('Nutrient');
  await expect(nutrient.locator('.upgrade-stat-from')).toHaveText('6');
  await expect(nutrient.locator('.upgrade-stat-to')).toHaveText('7');
  await expect(nutrient.locator('.upgrade-pips i')).toHaveCount(7);
  await expect(nutrient.locator('.upgrade-pips i.is-new')).toHaveCount(1);
  await expect(cards.nth(1).locator('.upgrade-stat-to')).toHaveText('+18%');
  await expect(cards.nth(2).locator('.upgrade-stat-to')).toHaveText('8');

  // The cards must never answer to the rack's tool selector.
  await expect(page.locator('#pick-choices [data-tool]')).toHaveCount(0);

  // Every card and its Choose control sit inside the sheet, unscrolled.
  const fits = await page.evaluate(() => {
    const sheet = document.querySelector('#screen-pick .method-card')!.getBoundingClientRect();
    return [...document.querySelectorAll('#pick-choices .pick-card-action')].every((action) => {
      const r = action.getBoundingClientRect();
      return r.top >= sheet.top && r.bottom <= sheet.bottom + 1 && r.bottom <= window.innerHeight;
    });
  });
  expect(fits).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('upgrade-cards.png') });

  await cards.nth(2).click();
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'arena');
  await expect(page.locator('[data-tool="water"] [data-tool-count]')).toHaveText('8/8');
  runtime.assertClean();
});


test('Sniper shots strike cultures, the screen takes every impact, and none cross the dish wall', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await openStagedRun(page, { fightIndex: 2 });
  const seen = await page.evaluate(async () => {
    const arena = (window as unknown as { cdmDebug: { arena(): {
      state: { bullets: Array<{ wraps: number; struck?: Set<number> }> };
      drainBulletImpacts(): unknown[];
    } } }).cdmDebug.arena();
    const struck = new Set<object>();
    let wrapped = 0;
    const until = performance.now() + 20_000;
    while (performance.now() < until && struck.size < 6) {
      await new Promise(requestAnimationFrame);
      for (const bullet of arena.state.bullets) {
        if (bullet.struck) struck.add(bullet);
        if (bullet.wraps > 0) wrapped += 1;
      }
    }
    return { struck: struck.size, wrapped, undrained: arena.drainBulletImpacts().length };
  });
  expect(seen.struck).toBeGreaterThan(0);
  expect(seen.wrapped).toBe(0);
  // Left undrained this would be in the dozens by now.
  expect(seen.undrained).toBeLessThan(6);
  runtime.assertClean();
});
