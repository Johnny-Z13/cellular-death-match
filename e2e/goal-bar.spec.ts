import { expect, test } from '@playwright/test';
import { completeOpeningActions, monitorRuntime, openFreshApp, startFirstTrial } from './helpers';

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1
    && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
}

test('the goal stays readable while Dr. E speaks and reports completion', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
  await startFirstTrial(page);

  const goal = page.locator('#hud-goal');
  await expect(page.locator('#coach-title')).toContainText('Press Egg.');
  await expect(goal).toBeVisible();
  await expect(page.locator('#hud-goal-line')).toHaveText('Feed a Swarmlet until it becomes Bloom Mass');

  const goalBox = await goal.boundingBox();
  const coachBox = await page.locator('#coach').boundingBox();
  const dishBox = await page.locator('#game').boundingBox();
  expect(goalBox).not.toBeNull();
  expect(coachBox).not.toBeNull();
  expect(intersects(goalBox!, coachBox!), 'Dr. E must not cover the goal').toBe(false);
  expect(intersects(goalBox!, dishBox!), 'the goal must not sit on the dish').toBe(false);

  await completeOpeningActions(page);
  await expect(goal).toHaveClass(/is-complete/, { timeout: 20_000 });
  await expect(page.locator('#hud-goal-value')).toHaveText('Done');
  runtime.assertClean();
});
