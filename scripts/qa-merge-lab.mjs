import { chromium } from '@playwright/test';

const url = process.env.MERGE_LAB_URL ?? 'http://localhost:5199/?cg=1';
const saveKey = 'cellular-death-match.cg.v1.save';
const viewports = [
  ['desktop', { width: 1280, height: 720 }, false],
  ['mobile', { width: 390, height: 844 }, true],
  ['small-mobile', { width: 375, height: 667 }, true],
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const [name, viewport, mobile] of viewports) {
    const context = await browser.newContext({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: 1,
    });
    await context.addInitScript((key) => {
      if (sessionStorage.getItem('__merge_lab_qa_cleared__') === '1') return;
      localStorage.removeItem(key);
      sessionStorage.setItem('__merge_lab_qa_cleared__', '1');
    }, saveKey);
    const page = await context.newPage();
    const requests = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.merge-lab-overlay');

    const firstFrame = await page.evaluate((key) => {
      const canvas = document.querySelector('#game');
      const ctx = canvas?.getContext('2d');
      const samples = ctx && canvas
        ? [
          Array.from(ctx.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.58), 1, 1).data),
          Array.from(ctx.getImageData(Math.floor(canvas.width * 0.38), Math.floor(canvas.height * 0.58), 1, 1).data),
          Array.from(ctx.getImageData(Math.floor(canvas.width * 0.62), Math.floor(canvas.height * 0.58), 1, 1).data),
        ]
        : [];
      const prompt = document.querySelector('.merge-lab-prompt')?.getBoundingClientRect();
      const status = document.querySelector('.merge-lab-status')?.getBoundingClientRect();
      return {
        title: document.title,
        screen: document.querySelector('.layout')?.getAttribute('data-screen'),
        titleHidden: document.querySelector('#screen-title')?.hidden,
        loadoutHidden: document.querySelector('#screen-loadout')?.hidden,
        optionsHidden: document.querySelector('#options-button')?.hidden,
        fullscreenHidden: document.querySelector('#fullscreen-button')?.hidden,
        prompt: document.querySelector('[data-merge-lab-prompt]')?.textContent,
        save: localStorage.getItem(key),
        text: document.body.innerText,
        promptBox: prompt && { top: prompt.top, bottom: prompt.bottom },
        statusBox: status && { top: status.top, bottom: status.bottom },
        viewport: { width: innerWidth, height: innerHeight },
        samples,
      };
    }, saveKey);

    assert(firstFrame.title === 'Merge Lab: Cellular Death Match', `${name}: wrong title`);
    assert(firstFrame.screen === 'merge-lab', `${name}: not in merge-lab screen`);
    assert(firstFrame.titleHidden === true, `${name}: title not hidden`);
    assert(firstFrame.loadoutHidden === true, `${name}: loadout not hidden`);
    assert(firstFrame.optionsHidden === true, `${name}: options not hidden`);
    assert(firstFrame.fullscreenHidden === true, `${name}: fullscreen not hidden`);
    assert(firstFrame.prompt === 'Merge cells.', `${name}: first prompt mismatch`);
    assert(firstFrame.save === null, `${name}: fresh save was not empty`);
    assert(boxInside(firstFrame.promptBox, firstFrame.viewport), `${name}: prompt outside viewport`);
    assert(boxInside(firstFrame.statusBox, firstFrame.viewport), `${name}: status outside viewport`);
    assert(nonBlankSamples(firstFrame.samples), `${name}: canvas appears blank`);

    const badRequests = requests.filter((requestUrl) => (
      requestUrl.includes('fonts.googleapis.com')
      || requestUrl.includes('fonts.gstatic.com')
    ));
    assert(badRequests.length === 0, `${name}: external font request in Merge Lab route: ${badRequests.join(', ')}`);

    const box = await page.locator('#game').boundingBox();
    assert(Boolean(box), `${name}: missing canvas box`);
    const x = box.x + box.width * 0.5;
    const y = box.y + box.height * 0.58;
    if (mobile) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await page.waitForTimeout(140);

    const afterMerge = await page.evaluate((key) => {
      const save = localStorage.getItem(key);
      return {
        prompt: document.querySelector('[data-merge-lab-prompt]')?.textContent,
        dna: document.querySelector('[data-merge-lab-dna]')?.textContent,
        atlas: document.querySelector('[data-merge-lab-atlas]')?.textContent,
        rewardVisible: document.querySelector('.merge-lab-reward')?.textContent,
        save,
        parsed: save ? JSON.parse(save) : null,
      };
    }, saveKey);

    assert(afterMerge.prompt === 'Feed it.', `${name}: merge did not advance prompt`);
    assert(afterMerge.dna === '70', `${name}: DNA did not update to 70`);
    assert(afterMerge.atlas === '1/3', `${name}: atlas did not reveal`);
    assert(afterMerge.rewardVisible === '+70 DNA', `${name}: reward burst missing`);
    assert(afterMerge.parsed?.run?.dna === 70, `${name}: canonical save DNA missing`);
    assert(afterMerge.parsed?.atlas?.reveals === 1, `${name}: canonical atlas reveal missing`);
    assert(afterMerge.parsed?.mergeTiers?.sprinter === 2, `${name}: canonical merge tier missing`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.merge-lab-overlay');
    const afterReload = await page.evaluate((key) => {
      const save = localStorage.getItem(key);
      return {
        prompt: document.querySelector('[data-merge-lab-prompt]')?.textContent,
        dna: document.querySelector('[data-merge-lab-dna]')?.textContent,
        atlas: document.querySelector('[data-merge-lab-atlas]')?.textContent,
        parsed: save ? JSON.parse(save) : null,
      };
    }, saveKey);

    assert(afterReload.prompt === 'Feed it.', `${name}: reload did not preserve prompt`);
    assert(afterReload.dna === '70', `${name}: reload did not preserve DNA`);
    assert(afterReload.atlas === '1/3', `${name}: reload did not preserve atlas`);
    assert(afterReload.parsed?.run?.dna === 70, `${name}: reload save shape invalid`);

    await page.screenshot({ path: `/private/tmp/merge-lab-qa-${name}.png`, fullPage: true });
    results.push({ name, firstFrame, afterMerge, afterReload });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results.map(({ name, afterMerge, afterReload }) => ({
  name,
  afterMerge: {
    prompt: afterMerge.prompt,
    dna: afterMerge.dna,
    atlas: afterMerge.atlas,
  },
  afterReload: {
    prompt: afterReload.prompt,
    dna: afterReload.dna,
    atlas: afterReload.atlas,
  },
})), null, 2));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function boxInside(box, viewport) {
  return Boolean(box)
    && box.top >= 0
    && box.bottom <= viewport.height
    && box.bottom > box.top;
}

function nonBlankSamples(samples) {
  return samples.some((sample) => Array.isArray(sample) && sample[3] > 0 && (sample[0] + sample[1] + sample[2]) > 0);
}
