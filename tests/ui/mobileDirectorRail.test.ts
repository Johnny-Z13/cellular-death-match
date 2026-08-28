// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const screens = readFileSync('src/ui/screens.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('unified mobile Director rail', () => {
  it('groups telemetry and persistent Dr. E status in one HUD surface', () => {
    expect(html).toContain('class="hud-summary"');
    expect(html).toContain('id="hud-director" class="hud-director"');
    expect(html).toContain('id="hud-director-title"');
    expect(html).toContain('id="hud-director-progress"');
    expect(html).toContain('Dr. E · Dish status');
    expect(html).toContain('aria-label="Dr. E trial status"');
  });

  it('lets authored guidance replace the fallback without moving the full-screen welcome', () => {
    const unified = css.slice(css.indexOf('/* ---- Unified mobile Director rail'));
    expect(unified).toContain('.coach-active .hud-director');
    expect(unified).toContain('.coach:not(.coach-welcome)');
    expect(unified).toContain('min-height: 104px');
    expect(unified).toContain('min-height: 82px');
    expect(unified).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
  });

  it('uses compact status copy because Dr. E already owns the channel', () => {
    expect(screens).not.toContain("`Dr. E: ${info.objectiveHint}`");
    expect(screens).toContain('hudDirectorTitle.textContent = info.objectiveName');
    expect(screens).toContain('hudDirectorProgress.textContent = info.objectiveComplete');
    expect(screens).toContain("info.biomeName ?? 'Stable'");
  });
});
