import { expect, test } from '@playwright/test';
import {
  clickDish,
  monitorRuntime,
  openFreshApp,
  selectSwarmlet,
  startFirstTrial,
} from './helpers';

test('supports reduced motion without changing the interaction path', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshApp(page);
  await startFirstTrial(page);
  await selectSwarmlet(page);
  await clickDish(page);
  await expect(page.locator('#coach-title')).toHaveText('Now press Nutrient.');
  runtime.assertClean();
});
