import { expect, test, type TestInfo } from '@playwright/test';
import {
  clickDish,
  completeOpeningActions,
  monitorRuntime,
  startFirstTrial,
} from './helpers';

test('uses one meaningful Dr. E graduation without repeating it after every result', async ({ page }, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== 'phone' && testInfo.project.name !== 'small-phone',
    'The reported transition flash occurs in portrait-phone flows.',
  );
  const runtime = monitorRuntime(page);
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page).toHaveTitle('Cellular Death Match');
  await expect(page.locator('.layout')).toHaveAttribute('data-screen', 'title');
  await startFirstTrial(page);
  await completeOpeningActions(page);
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 25_000 });
  await page.locator('#end-epoch-button').click();
  await expect(page.locator('#fx-genome')).toHaveAttribute('aria-hidden', 'false');

  await page.waitForFunction(() => {
    const reveal = document.getElementById('fx-genome');
    const animation = reveal?.getAnimations().find((candidate) => (
      candidate instanceof CSSAnimation && candidate.animationName === 'fx-genome-reveal'
    ));
    return Number(animation?.currentTime ?? 0) >= 2_600;
  });

  const lateRevealFrame = await page.evaluate(() => {
    const reveal = document.getElementById('fx-genome');
    const methodIntro = document.getElementById('screen-method-intro');
    return {
      revealOpacity: Number.parseFloat(getComputedStyle(reveal!).opacity),
      methodIntroVisible: methodIntro?.classList.contains('visible') === true,
      layoutScreen: document.querySelector<HTMLElement>('.layout')?.dataset.screen,
    };
  });
  expect(
    lateRevealFrame.revealOpacity >= 0.99 && !lateRevealFrame.methodIntroVisible,
    `Late reveal exposed ${lateRevealFrame.layoutScreen} at opacity ${lateRevealFrame.revealOpacity}`,
  ).toBe(true);

  await expect(page.locator('#fx-genome')).toBeFocused();
  await page.locator('#fx-genome').click();
  await expect(page.locator('#screen-method-intro')).not.toHaveClass(/visible/);
  await expect(page.locator('#screen-pick')).toHaveClass(/visible/);
  await expect(page.locator('#pick-choices .pick-card').first()).toBeFocused();
  await page.waitForTimeout(350);
  await page.screenshot({ path: testInfo.outputPath('genome-to-method-choice.png') });

  await page.locator('#pick-choices .pick-card').first().click();
  const bloom = page.locator('[data-lifeform-id="bloom_mass"]');
  if (!await bloom.isVisible()) await page.locator('#mobile-lifeforms-toggle').click();
  await bloom.click();
  await clickDish(page);
  await page.locator('[data-tool="nutrient"]').click();
  await clickDish(page);
  await page.locator('[data-tool="toxin"]').click();
  await clickDish(page);
  await expect(page.locator('#end-epoch-button')).toHaveClass(/end-action-ready/, { timeout: 10_000 });
  await page.locator('#end-epoch-button').click();
  await expect(page.locator('#fx-genome')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#fx-genome').click();

  await expect(page.locator('#screen-method-intro')).toHaveClass(/visible/);
  await expect(page.locator('#method-intro-title')).toHaveText('Right. You’re on your own now.');
  await expect(page.locator('.method-intro-copy > p:not(.method-intro-kicker)')).toHaveText(
    'Run the next trials your way. I’ll check in from time to time.',
  );
  await expect(page.locator('#method-intro-continue')).toBeFocused();
  await page.waitForTimeout(350);
  await page.screenshot({ path: testInfo.outputPath('trial-2-autonomy-handoff.png') });

  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Continue Case');
  await page.locator('#title-start').click();
  await expect(page.locator('#method-intro-title')).toHaveText('Right. You’re on your own now.');
  await expect(page.locator('#method-intro-continue')).toBeFocused();
  await page.locator('#method-intro-continue').click();
  await expect(page.locator('#screen-pick')).toHaveClass(/visible/);
  await expect.poll(() => page.evaluate(() => (
    window.localStorage.getItem('cdm.coach.autonomy-handoff-seen.v1')
  ))).toBe('1');

  await page.reload();
  await expect(page.locator('#title-start-label')).toHaveText('Continue Case');
  await page.locator('#title-start').click();
  await expect(page.locator('#screen-method-intro')).not.toHaveClass(/visible/);
  await expect(page.locator('#screen-pick')).toHaveClass(/visible/);
  runtime.assertClean();
});
