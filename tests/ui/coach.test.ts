// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCoach } from '../../src/ui/coach';
import { onboardingIdleNudge } from '../../src/ui/onboardingHints';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const coachSource = readFileSync('src/ui/coach.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const screensSource = readFileSync('src/ui/screens.ts', 'utf8');

class FakeClassList {
  private readonly classes = new Set<string>();

  add(name: string): void {
    this.classes.add(name);
  }

  remove(name: string): void {
    this.classes.delete(name);
  }

  contains(name: string): boolean {
    return this.classes.has(name);
  }
}

class FakeElement {
  textContent = '';
  readonly classList = new FakeClassList();
  private readonly attrs = new Map<string, string>();
  private clickHandler: (() => void) | null = null;

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }

  addEventListener(event: string, handler: () => void): void {
    if (event === 'click') this.clickHandler = handler;
  }

  click(): void {
    this.clickHandler?.();
  }
}

function installCoachDom(): Map<string, FakeElement> {
  const ids = ['coach', 'coach-kicker', 'coach-title', 'coach-body', 'coach-step', 'coach-skip'];
  const elements = new Map(ids.map((id) => [id, new FakeElement()]));
  const storage = new Map<string, string>();
  vi.stubGlobal('document', {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
  });
  vi.stubGlobal('window', {
    setTimeout,
    clearTimeout,
    localStorage: {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
    },
  });
  return elements;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('onboarding coach', () => {
  it('ships a skippable coach panel in the HTML', () => {
    expect(html).toContain('id="hud-tutorial"');
    expect(html).toContain('id="hud-tutorial-kicker"');
    expect(html).toContain('id="hud-tutorial-title"');
    expect(html).toContain('id="hud-tutorial-body"');
    expect(html).toContain('id="hud-tutorial-step"');
    expect(html).toContain('id="hud-tutorial-skip"');
    expect(html).not.toContain('id="coach"');
  });

  it('uses the objective HUD as the tutorial surface', () => {
    expect(mainSource).toContain('createCoach({');
    expect(mainSource).toContain('screens.setHudTutorial');
    expect(coachSource).toContain('setTutorialCard(card: CoachCard | null): void;');
    expect(css).toContain('.hud-tutorial');
    expect(css).toContain('.hud.hud-tutorial-active .hud-row');
  });

  it('advances on real gameplay beats, not timers', () => {
    expect(coachSource).toContain("advanceOn: 'egg-placed'");
    expect(coachSource).toContain("advanceOn: 'nutrient-used'");
    expect(coachSource).toContain("advanceOn: 'objective-complete'");
    expect(coachSource).toContain("advanceOn: 'epoch-ended'");
    expect(coachSource).toContain('Click Egg, then plant it');
    expect(coachSource).toContain('Click Nutrient, then feed it');
    expect(coachSource).toContain('Press End');
    expect(mainSource).toContain("coach.report('egg-placed')");
    expect(mainSource).toContain("coach.report('nutrient-used')");
    expect(mainSource).toContain("coach.report('objective-complete')");
    expect(mainSource).toContain("coach.report('epoch-ended')");
  });

  it('shows on the first epoch of a first run only, persisted via localStorage', () => {
    expect(coachSource).toContain("const SEEN_KEY = 'cdm.coach.seen.v3'");
    expect(coachSource).toContain('hasSeenTutorial(): boolean;');
    expect(coachSource).toContain('if (seen()) { active = false; hide(); return; }');
    expect(mainSource).toContain('if (runState.fightIndex === 0) coach.beginRun()');
    expect(mainSource).toContain('shouldUseOnboardingDishForCurrentStage(runState.fightIndex, false)');
    expect(mainSource).toContain('run.getOnboardingSpawnList()');
  });

  it('nudges idle players with the objective hint, capped and dismissible', () => {
    // The nudge reuses the coach card in a second mode: "Got it" dismisses
    // just the nudge, never marking the tutorial as seen.
    expect(coachSource).toContain('showNudge(title: string, body: string, opts?: { interruptTutorial?: boolean }): void;');
    expect(coachSource).toContain("if (mode === 'nudge') hideNudgeNow();");
    expect(coachSource).toContain("kickerEl.textContent = 'Lab Assistant';");
    expect(mainSource).toContain('const NUDGE_IDLE_TICKS = 60 * 22;');
    expect(mainSource).toContain('const MAX_NUDGES_PER_EPOCH = 2;');
    expect(mainSource).toContain('function maybeNudgeIdlePlayer(');
    expect(mainSource).toContain('onboardingIdleNudge({');
    expect(mainSource).toContain('function registerPlayerAction(): void {');
    expect(mainSource).toContain('coach.hideNudge();');
  });

  it('keeps the HUD content-driven so tutorial or objective text cannot be clipped', () => {
    expect(css).toContain('min-height: var(--desktop-status-height)');
    expect(css).toContain('overflow: visible');
    expect(css).toContain('max-height: calc(100svh - 16px - env(safe-area-inset-top))');
    expect(css).not.toContain('\n    height: var(--desktop-status-height)');
    expect(css).not.toContain('\n    height: 84px');
  });

  it('keeps the deadline ticking even when the onboarding dish has no control sample', () => {
    expect(mainSource).toContain('vol: player?.vol ?? 0');
    expect(mainSource).toContain('targetVol: player?.targetVol ?? 0');
    expect(mainSource).not.toContain('// HUD update.\n  if (player) {');
    expect(mainSource).not.toContain('// HUD update.\r\n  if (player) {');
    expect(screensSource).toContain("info.targetVol > 0 ? `${info.vol} / ${Math.round(info.targetVol)}` : '-'");
  });

  it('hand-holds the first epoch until the player ends it successfully', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    expect(elements.get('coach-title')?.textContent).toBe('Click Egg, then plant it');

    coach.report('egg-placed');
    expect(coach.isActive()).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Click Nutrient, then feed it');

    coach.report('nutrient-used');
    expect(coach.isActive()).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Create Bloom Mass');

    coach.report('objective-complete');
    expect(coach.isActive()).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Press End');

    coach.report('epoch-ended' as never);

    expect(coach.isActive()).toBe(false);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(false);
    expect(elements.get('coach')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('can show an idle onboarding nudge over the active tutorial and then restore the tutorial card', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    coach.showNudge('Make the first discovery', 'Place one Swarmlet egg, then feed the living cultures.', {
      interruptTutorial: true,
    });

    expect(elements.get('coach-title')?.textContent).toBe('Make the first discovery');
    expect(elements.get('coach-skip')?.textContent).toBe('Got it');

    elements.get('coach-skip')?.click();

    expect(coach.isActive()).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Click Egg, then plant it');
    expect(elements.get('coach-skip')?.textContent).toBe('Skip tutorial');
  });

  it('chooses onboarding idle nudges for the next concrete action', () => {
    expect(onboardingIdleNudge({
      objectiveComplete: true,
      tutorialActive: false,
      objectiveHint: 'unused',
    })).toEqual({
      title: 'Experiment ready',
      body: 'Press End to bank this dish and unlock the next research step.',
      interruptTutorial: false,
    });

    expect(onboardingIdleNudge({
      objectiveComplete: false,
      tutorialActive: true,
      objectiveHint: 'Seed one extra Swarmlet, then feed the living cultures with Nutrient until Bloom appears.',
    })).toEqual({
      title: 'Make the first discovery',
      body: 'Place one Swarmlet egg, then feed the living cultures with Nutrient until Bloom appears.',
      interruptTutorial: true,
    });
  });
});
