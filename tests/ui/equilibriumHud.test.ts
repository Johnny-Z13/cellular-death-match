// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const html = readFileSync('index.html', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');

describe('equilibrium HUD state', () => {
  it('adds a HUD row and createScreens API for equilibrium progress', () => {
    expect(html).toContain('id="hud-equilibrium"');
    expect(screensSource).toContain('setEquilibrium(info: EquilibriumInfo): void;');
    expect(screensSource).toContain('Equilibrium ${Math.round');
    expect(screensSource).toContain('Equilibrium: ${info.biomeName}');
    expect(screensSource).toContain("hud.classList.toggle('hud-equilibrium-achieved'");
  });

  it('updates equilibrium from main without immediately ending the run', () => {
    expect(mainSource).toContain('const equilibrium = arena.getEquilibrium();');
    expect(mainSource).toContain('screens.setEquilibrium(equilibrium);');
    expect(mainSource).toContain('didAnnounceEquilibrium');
    expect(mainSource).not.toContain('arena.isHomeostasisAchieved()) {\n    persistArenaDiscoveries(arena);');
  });

  it('does not let onboarding equilibrium mark End ready or end the run', () => {
    expect(mainSource).toContain('const equilibriumCanEndRun = !isOnboardingEpoch(run.getState().fightIndex);');
    expect(mainSource).toContain('if (equilibriumCanEndRun && arena.getEquilibrium().achieved)');
    expect(mainSource).toContain('screens.setEpochComplete(objective.complete || (equilibriumCanEndRun && equilibrium.achieved));');
  });

  it('styles the equilibrium row with the calm bio glow', () => {
    expect(css).toContain('.hud-equilibrium-row .hud-val');
    expect(css).toContain('.hud-equilibrium-achieved .hud-equilibrium-row .hud-val');
    expect(css).toContain('rgba(91, 233, 214');
  });

  it('uses a compact wide-desktop HUD layout that leaves room for the new equilibrium row', () => {
    expect(css).toContain('--desktop-status-height: 128px;');
    expect(css).toContain('@media (min-width: 1181px) and (max-height: 780px) {');
    expect(css).toContain('.hud-volume-row,');
    expect(css).toContain('.hud-ecology-row,');
    expect(css).toContain('#hud-upgrades-row {');
    expect(css).toContain('height: 104px');
  });
});
