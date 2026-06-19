// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCoach } from '../../src/ui/coach';
import { onboardingIdleNudge } from '../../src/ui/onboardingHints';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('src/styles.css', 'utf8');
const coachSource = readFileSync('src/ui/coach.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');

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
    expect(html).toContain('id="coach"');
    expect(html).toContain('id="coach-kicker"');
    expect(html).toContain('id="coach-title"');
    expect(html).toContain('id="coach-body"');
    expect(html).toContain('id="coach-step"');
    expect(html).toContain('id="coach-skip"');
  });

  it('advances on real gameplay beats using ONBOARDING_BEATS triggers', () => {
    expect(coachSource).toContain("ONBOARDING_BEATS");
    expect(coachSource).toContain("beat.trigger !== event");
    expect(mainSource).toContain("coach.report('egg-placed')");
    expect(mainSource).toContain("coach.report('nutrient-used')");
  });

  it('shows on the first epoch of a first run only, persisted via localStorage', () => {
    expect(coachSource).toContain("const SEEN_KEY = 'cdm.coach.seen.v3'");
    expect(coachSource).toContain('hasSeenTutorial(): boolean;');
    expect(coachSource).toContain('if (seen()) { active = false; hide(); return; }');
    expect(mainSource).toContain('coach.beginRun()');
  });

  it('nudges idle players with the objective hint, capped and dismissible', () => {
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

  it('never blocks interactive panels and hides in presentation mode', () => {
    expect(css).toContain('.coach {');
    expect(css).toContain('.coach.coach-show');
    expect(css).toContain('.presentation-mode .coach');
    const mobileBlockStart = css.indexOf('@media (max-width: 899px)');
    expect(css.indexOf('top: calc(92px + env(safe-area-inset-top))')).toBeGreaterThan(mobileBlockStart);
  });

  it('retires itself after the final tutorial beat without requiring Skip', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    coach.report('egg-placed');
    coach.report('nutrient-used');
    coach.report('bloom-discovered');

    expect(coach.isActive()).toBe(false);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);

    vi.advanceTimersByTime(4200);

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
    expect(elements.get('coach-title')?.textContent).toBe('Place a Swarmlet egg in the dish');
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
