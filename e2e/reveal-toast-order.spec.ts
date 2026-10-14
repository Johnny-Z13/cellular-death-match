import { expect, test } from '@playwright/test';

// A finish can reveal a new strain and earn a badge at once. The reveal owns
// the screen; the badge toast waits for it instead of printing under the
// reveal copy. Drives the real fx module through Vite's source server.

test('a badge toast waits for the strain reveal to close', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Phones already queue both through the notification director.');
  await page.goto('/');
  await page.evaluate(async () => {
    const { createFx } = await import('/src/ui/fx.ts');
    const fx = createFx();
    fx.showGenomeDecode([{
      id: 'boss', name: 'Boss', asset: 'art/genomes/boss.png', alt: 'Boss',
      primary: [61, 90, 254], archivePosition: '9 / 14 strains found',
    }], () => {});
    fx.showToast('discovery', 'Badge earned', 'Common Cold Cured');
  });

  const reveal = page.locator('#fx-genome');
  await expect(reveal).toHaveAttribute('aria-hidden', 'false');
  // Point-in-time count: a retrying assertion would just wait out the toast's life.
  expect(await page.locator('.fx-toast').count()).toBe(0);

  await reveal.click();
  await expect(reveal).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.fx-toast')).toContainText('Common Cold Cured');
});
