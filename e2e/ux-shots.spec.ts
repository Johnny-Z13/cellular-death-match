import { test, type Page } from '@playwright/test';
import { clickDish, completeOpeningActions, monitorRuntime, startFirstTrial } from './helpers';

// Evidence capture, not an assertion suite. Run with:
//   CDM_UX_SHOTS=before npx playwright test e2e/ux-shots.spec.ts --workers=1
// Shots land in docs/ux-legibility/<label>/<project>-<state>.jpg so a before
// and after pass can be compared side by side.
const label = process.env.CDM_UX_SHOTS;

test.skip(!label, 'set CDM_UX_SHOTS=<label> to capture UX evidence shots');

async function shot(page: Page, project: string, state: string): Promise<void> {
  await page.screenshot({
    path: `docs/ux-legibility/${label}/${project}-${state}.jpg`,
    type: 'jpeg',
    quality: 72,
  });
}

test('capture legibility evidence', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const project = testInfo.project.name;
  monitorRuntime(page);
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem('cdm.ux-shots.cleared')) {
      window.localStorage.clear();
      window.sessionStorage.setItem('cdm.ux-shots.cleared', '1');
    }
  });
  await page.goto('/');
  await page.waitForTimeout(800);
  await shot(page, project, '01-title');

  await startFirstTrial(page);
  await page.waitForTimeout(600);
  await shot(page, project, '02-trial1-first-instruction');

  await completeOpeningActions(page);
  await page.waitForTimeout(4500);
  await shot(page, project, '03-trial1-fed');

  await page.locator('#options-button').click();
  await page.locator('#dbg-reveal-discoveries').click();
  await page.locator('#objective-choices .objective-card').first().click();
  await page.waitForTimeout(1500);
  for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.7], [0.25, 0.65]] as const) {
    await clickDish(page, x, y);
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(9000);
  await shot(page, project, '04-open-lab-busy');

  const logToggle = page.locator('#mobile-log-toggle');
  if (await logToggle.isVisible()) {
    await logToggle.click();
    await page.waitForTimeout(500);
    await shot(page, project, '05-log-open');
    await logToggle.click();
  }
  const strainsToggle = page.locator('#mobile-lifeforms-toggle');
  if (await strainsToggle.isVisible()) {
    await strainsToggle.click();
    await page.waitForTimeout(500);
    await shot(page, project, '06-strains-open');
  }
});
