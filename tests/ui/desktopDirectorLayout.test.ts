// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/arena-layout.css', 'utf8');

describe('desktop Director layout', () => {
  it('loads the form-factor-specific arena placement after the shared styles', () => {
    const shared = html.indexOf('/src/styles.css');
    const arena = html.indexOf('/src/arena-layout.css');

    expect(shared).toBeGreaterThan(-1);
    expect(arena).toBeGreaterThan(shared);
  });

  it('centers both persistent and authored Dr. E transmissions above the dish', () => {
    expect(css).toContain('@media (min-width: 900px)');
    expect(css).toMatch(/\.layout\[data-screen="arena"\] \.hud \{[\s\S]*?left: 50%;[\s\S]*?top: max\(8px, env\(safe-area-inset-top\)\);[\s\S]*?transform: translateX\(-50%\);/);
    expect(css).toMatch(/\.coach:not\(\.coach-welcome\),[\s\S]*?left: 50%;[\s\S]*?top: max\(8px, env\(safe-area-inset-top\)\);[\s\S]*?transform: translateX\(-50%\);/);
  });

  it('keeps the goal visible while Dr. E speaks by docking him over the director slot', () => {
    const legibility = readFileSync('src/legibility.css', 'utf8');
    expect(html.indexOf('/src/legibility.css')).toBeGreaterThan(html.indexOf('/src/arena-layout.css'));
    expect(css).not.toContain('.coach-active .hud {');
    expect(legibility).toContain('.hud-slot-docked.coach-active .hud-director');
    expect(legibility).toMatch(/\.hud-slot-docked\.coach-active \.coach:not\(\.coach-welcome\):not\(\.coach-intro\) \{[\s\S]*?top: var\(--hud-slot-top/);
  });

  it('keeps the Director portrait and objective in the persistent desktop rail', () => {
    expect(css).toContain('.hud-director-portrait');
    expect(css).toContain('.hud-director-title');
    expect(css).toContain('.hud-director-progress');
    expect(css).toContain('grid-template-columns: 58px minmax(0, 1fr)');
  });
});
