import { expect, test, type Page } from '@playwright/test';
import { completeOpeningActions, openFreshApp, startFirstTrial } from './helpers';

// Nothing a player reads may render below 11px, on any viewport, in any of
// the main states. Decorative glyphs with no letters are ignored.
const FLOOR_PX = 11;

async function smallText(page: Page, state: string): Promise<string[]> {
  return page.evaluate(({ floor, state }) => {
    const offenders: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const text = node.textContent?.trim() ?? '';
      if (!/[A-Za-z0-9]/.test(text)) continue;
      const element = node.parentElement;
      if (!element || seen.has(element)) continue;
      seen.add(element);
      if (element.closest('.sr-only, [hidden], .debug-only, #commit-debug')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.right < 0 || rect.top > innerHeight || rect.left > innerWidth) continue;
      let visible = true;
      for (let el: Element | null = element; el; el = el.parentElement) {
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < 0.05) {
          visible = false;
          break;
        }
      }
      if (!visible) continue;
      const size = parseFloat(getComputedStyle(element).fontSize);
      if (size < floor - 0.01) {
        const id = element.id ? `#${element.id}` : `.${[...element.classList].join('.')}`;
        offenders.push(`${state}: ${element.tagName.toLowerCase()}${id} ${size}px "${text.slice(0, 40)}"`);
      }
    }
    return offenders;
  }, { floor: FLOOR_PX, state });
}

test('no rendered text falls below the 11px floor', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const offenders: string[] = [];
  await openFreshApp(page);
  offenders.push(...await smallText(page, 'title'));
  await startFirstTrial(page);
  offenders.push(...await smallText(page, 'trial-1-coach'));
  await completeOpeningActions(page);
  await page.waitForTimeout(1500);
  offenders.push(...await smallText(page, 'trial-1-fed'));

  await page.locator('#options-button').click();
  offenders.push(...await smallText(page, 'options'));
  await page.locator('#dbg-reveal-discoveries').click();
  offenders.push(...await smallText(page, 'study-choice'));
  await page.locator('#objective-choices .objective-card').first().click();
  await page.waitForTimeout(800);
  offenders.push(...await smallText(page, 'open-lab'));

  if (await page.locator('#mobile-lifeforms-toggle').isVisible()) {
    await page.locator('#mobile-lifeforms-toggle').click();
    offenders.push(...await smallText(page, 'strains-drawer'));
    await page.locator('#mobile-lifeforms-toggle').click();
    await page.locator('#mobile-log-toggle').click();
    offenders.push(...await smallText(page, 'log'));
    await page.locator('#mobile-log-toggle').click();
  }
  await page.locator('#notebook-button').click();
  await page.waitForTimeout(500);
  offenders.push(...await smallText(page, 'notebook'));

  expect(offenders, `${testInfo.project.name}\n${offenders.join('\n')}`).toEqual([]);
});
