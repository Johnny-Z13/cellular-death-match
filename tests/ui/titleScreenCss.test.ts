// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
const titleScreen = html.slice(html.indexOf('id="screen-title"'), html.indexOf('id="screen-loadout"'));

describe('title screen', () => {
  it('is the itch cover, live: the stacked wordmark beside the running dish', () => {
    expect(titleScreen).toContain('<canvas id="title-dish"');
    expect(titleScreen).toContain('id="title-dish-tags"');
    expect(titleScreen).toContain('<span>Cellular</span> <span>Death</span> <span>Match</span>');
    expect(titleScreen).not.toContain('title-professor');
    expect(css).not.toContain('title-keyart');
    expect(css).toContain('.screen-title-screen .title-dish {');
  });

  it('holds the copy still and the tags steady when reduced motion is requested', () => {
    const titleBlock = css.indexOf('.screen-title-screen .title-dish {');
    const reducedMotionStart = css.indexOf('@media (prefers-reduced-motion: reduce)', titleBlock);
    const reducedMotion = css.slice(reducedMotionStart, reducedMotionStart + 200);

    expect(reducedMotion).toContain('.screen-title-screen .title-card { animation: none; }');
    expect(reducedMotion).toContain('.title-dish-tag { transition: none; }');
  });
});
