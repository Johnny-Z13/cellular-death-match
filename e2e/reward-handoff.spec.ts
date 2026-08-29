import { expect, test, type TestInfo } from '@playwright/test';
import {
  completeOpeningActions,
  monitorRuntime,
  openFreshApp,
  startFirstTrial,
} from './helpers';

test('keeps the reward boundary covered from Genome Decoded into the Method handoff', async ({ page }, testInfo: TestInfo) => {
  test.skip(
    testInfo.project.name !== 'phone' && testInfo.project.name !== 'small-phone',
    'The reported transition flash occurs in portrait-phone flows.',
  );
  const runtime = monitorRuntime(page);
  await openFreshApp(page);
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
  await expect(page.locator('#screen-method-intro')).toHaveClass(/visible/);
  await expect(page.locator('#method-intro-continue')).toBeFocused();
  await page.waitForTimeout(350);
  await page.screenshot({ path: testInfo.outputPath('genome-to-method-handoff.png') });
  runtime.assertClean();
});
