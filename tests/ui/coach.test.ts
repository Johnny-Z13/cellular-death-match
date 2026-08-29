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
  hidden = false;
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

  focus(): void { /* focus behavior is covered in the browser pass */ }
}

function continueFromWelcome(elements: Map<string, FakeElement>): void {
  elements.get('coach-skip')?.click();
  vi.advanceTimersByTime(520);
}

function installCoachDom(): Map<string, FakeElement> {
  const ids = ['coach', 'coach-kicker', 'coach-title', 'coach-body', 'coach-step', 'coach-action', 'coach-skip'];
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
  it('ships a coach panel with a continue control for the welcome', () => {
    expect(html).toContain('id="coach"');
    expect(html).toContain('id="coach-kicker"');
    expect(html).toContain('id="coach-title"');
    expect(html).toContain('id="coach-body"');
    expect(html).toContain('id="coach-step"');
    expect(html).toContain('id="coach-action"');
    expect(html).toContain('id="coach-skip"');
  });

  it('advances on real gameplay beats using ONBOARDING_BEATS triggers', () => {
    expect(coachSource).toContain("ONBOARDING_BEATS");
    expect(coachSource).toContain("beat.trigger !== event");
    expect(mainSource).toContain('coach.report(`${tool}-selected`)');
    expect(mainSource).toContain('coach.report(`${selectedTool}-used`)');
    expect(mainSource).toContain("coach.report('bloom-discovered')");
  });

  it('wires the post-feed auto-spawn failsafe so success is always reachable', () => {
    // shouldAutoSpawn was dead code; it must actually seed a helper swarmlet.
    expect(mainSource).toContain('coach.shouldAutoSpawn()');
    expect(mainSource).toContain('arena.spawnOnboardingSeed()');
  });

  it('banks the taught Bloom Mass through the verified completion boundary', () => {
    expect(mainSource).toContain('livingDiscoveredBreedIds(arena, discoveries.breedIds)');
    expect(mainSource).toContain('planResearchBank({');
    expect(mainSource).toContain('executeResearchBank(runtimeStorage, plan.commit)');
  });

  it('restores banked Case specimens when a reload starts the authored trials again', () => {
    expect(mainSource).toContain('const availableBreeds = run.getState().fightIndex < COMMON_COLD_CASE.trials.length');
    expect(mainSource).toContain(".filter((record) => record.stage === 'stabilized')");
    expect(mainSource).toContain('lifeformUnlocksForCurrentRun(\n    stagedLifeforms,\n    currentRunLoadout,\n    availableBreeds,');
  });

  it('publishes the HUD bottom edge so the coach never overlaps a wrapped HUD', () => {
    expect(mainSource).toContain("layout.style.setProperty('--hud-bottom'");
    expect(mainSource).toContain('new ResizeObserver(publishHudBottom)');
  });

  it('persists the precise tutorial and each gradually guided trial', () => {
    expect(coachSource).toContain("const SEEN_KEY = 'cdm.coach.seen.v8'");
    expect(coachSource).toContain("const SEEN_TRIALS_KEY = 'cdm.coach.trials.v1'");
    expect(coachSource).toContain('hasSeenTutorial(): boolean;');
    expect(coachSource).toContain('seenTrials().has(trialIndex)');
    expect(coachSource).toContain('markSeen(currentTrialIndex);');
    expect(mainSource).toContain('coach.beginTrial(runState.fightIndex);');
  });

  it('holds on a large first-run welcome until the player continues', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();

    expect(elements.get('coach')?.classList.contains('coach-welcome')).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Welcome to my lab.');
    expect(elements.get('coach-body')?.textContent).toContain('show you the ropes');
    expect(elements.get('coach-skip')?.textContent).toBe('Tap to continue');
    expect(coach.getCurrentPointerTarget()).toBeUndefined();

    vi.advanceTimersByTime(3000);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
    expect(elements.get('coach')?.classList.contains('coach-exit')).toBe(false);
    coach.report('egg-selected');
    expect(coach.getBeatIndex()).toBe(0);

    elements.get('coach-skip')?.click();
    expect(elements.get('coach')?.classList.contains('coach-exit')).toBe(true);
    vi.advanceTimersByTime(520);

    expect(elements.get('coach')?.classList.contains('coach-welcome')).toBe(false);
    expect(elements.get('coach')?.classList.contains('coach-prompt')).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('I’m Dr. E. Press Egg.');
    expect(elements.get('coach-action')?.textContent).toBe('Press Egg');
    expect(coach.getCurrentPointerTarget()).toBe('tool:egg');
  });

  it('keeps the compact instruction visible until the exact next action', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    continueFromWelcome(elements);

    vi.advanceTimersByTime(3000);
    expect(elements.get('coach')?.classList.contains('coach-exit')).toBe(false);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
    expect(coach.isActive()).toBe(true);

    coach.report('egg-selected');

    expect(elements.get('coach-title')?.textContent).toBe('Place it here.');
    expect(elements.get('coach-action')?.textContent).toBe('Tap the dish');
    expect(elements.get('coach')?.classList.contains('coach-prompt')).toBe(true);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
  });

  it('ignores wrong actions and never persists a partial tutorial', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    continueFromWelcome(elements);
    coach.report('nutrient-selected');

    expect(elements.get('coach')?.classList.contains('coach-prompt')).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(elements.get('coach-title')?.textContent).toBe('I’m Dr. E. Press Egg.');
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
    expect(coach.isActive()).toBe(true);
    coach.dismiss();
    expect(coach.hasSeenTutorial()).toBe(false);
  });

  it('holds simulation time during the opening reading beat', () => {
    expect(mainSource).toContain('coach.isActive() && coach.getBeatIndex() === 0');
    expect(mainSource).toContain('const ticksToRun = holdingForFirstInstruction ? 0 : simClock.consumeTicks(now)');
  });

  it('nudges idle players with the objective hint, capped and dismissible', () => {
    expect(coachSource).toContain('showNudge(title: string, body: string, opts?: { interruptTutorial?: boolean }): void;');
    expect(coachSource).toContain("if (mode === 'nudge') hideNudgeNow();");
    expect(coachSource).toContain("kickerEl.textContent = 'Professor’s note';");
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
    // On phones the coach tracks the HUD's live bottom edge (published as
    // --hud-bottom by main.ts) so a two-line objective can't overlap it.
    expect(css.indexOf('top: calc(var(--hud-bottom, 100px) + 8px)')).toBeGreaterThan(mobileBlockStart);
    expect(css).toContain('.coach.coach-intro.coach-exit');
    expect(css).toContain('.coach.coach-prompt.coach-exit');
    expect(css).toContain('.coach-success-active .fx-banner');
    expect(css).toContain('.layout:not([data-screen="arena"]) .coach');
  });

  it('keeps the canonical phone transmission in the measured band above the dish', () => {
    const canonical = css.slice(css.indexOf('/* ---- Canonical Professor transmission'));

    expect(canonical).toContain('top: calc(var(--hud-bottom, 72px) + 6px)');
    expect(canonical).toContain('min-height: 84px');
    expect(canonical).toContain('min-height: 56px');
    expect(canonical).toContain('pointer-events: none');
    expect(canonical).toContain('.coach .coach-skip {');
    expect(canonical).toContain('pointer-events: auto');
    expect(canonical).toContain('.coach-prompt-active .onboarding-professor-pointer.is-visible');
  });

  it('gives the first-run welcome its own full-screen Professor composition', () => {
    const welcome = css.slice(css.indexOf('/* ---- First-run Professor welcome'));

    expect(welcome).toContain('.coach.coach-welcome {');
    expect(welcome).toContain('inset: 0');
    expect(welcome).toContain('height: 100dvh');
    expect(welcome).toContain('pointer-events: auto');
    expect(welcome).toContain('.coach.coach-welcome .coach-title {');
    expect(welcome).toContain('@media (max-width: 899px)');
  });

  it('shows the evolved dish, then waits on End before recording success', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();
    const onComplete = vi.fn();
    coach.onOnboardingComplete = onComplete;

    coach.beginRun();
    continueFromWelcome(elements);
    coach.report('egg-selected');
    coach.report('egg-used');
    coach.report('nutrient-selected');
    coach.report('nutrient-used');

    expect(coach.shouldAutoSpawn()).toBe(true);
    expect(coach.shouldAutoSpawn()).toBe(false);
    coach.report('bloom-discovered');
    expect(coach.isPresentingSuccess()).toBe(false);
    expect(elements.get('coach-title')?.textContent).toBe('Watch the culture.');
    coach.report('objective-complete');

    expect(coach.isActive()).toBe(true);
    expect(coach.isPresentingSuccess()).toBe(true);
    expect(elements.get('coach')?.classList.contains('coach-exit')).toBe(true);

    vi.advanceTimersByTime(520);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(false);
    expect(elements.get('coach')?.classList.contains('coach-success')).toBe(false);

    vi.advanceTimersByTime(2599);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(false);
    vi.advanceTimersByTime(1);

    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
    expect(elements.get('coach')?.classList.contains('coach-success')).toBe(true);
    expect(elements.get('coach')?.classList.contains('coach-prompt')).toBe(true);
    expect(elements.get('coach')?.classList.contains('coach-welcome')).toBe(false);
    expect(elements.get('coach-title')?.textContent).toBe('Experiment complete.');
    expect(elements.get('coach-body')?.textContent).toContain('keep playing');
    expect(coach.getCurrentPointerTarget()).toBe('end');

    vi.advanceTimersByTime(3600);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();

    coach.report('end-experiment');

    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(false);
    expect(elements.get('coach')?.getAttribute('aria-hidden')).toBe('true');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith(0);
  });

  it('does not let the hidden coach button bypass the End lesson', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();
    const onComplete = vi.fn();
    coach.onOnboardingComplete = onComplete;

    coach.beginRun();
    continueFromWelcome(elements);
    for (const event of ['egg-selected', 'egg-used', 'nutrient-selected', 'nutrient-used', 'objective-complete']) {
      coach.report(event);
    }
    vi.advanceTimersByTime(520 + 2600);
    elements.get('coach-skip')?.click();

    expect(elements.get('coach-skip')?.hidden).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(true);
  });

  it('advances later guided trials after the Professor records success', () => {
    vi.useFakeTimers();
    installCoachDom();
    const coach = createCoach();
    const onComplete = vi.fn();
    coach.onOnboardingComplete = onComplete;

    coach.beginTrial(1);
    for (const event of [
      'lifeform:bloom_mass', 'egg-used', 'nutrient-selected', 'nutrient-used',
      'toxin-selected', 'toxin-used', 'objective-complete',
    ]) coach.report(event);

    expect(coach.isPresentingSuccess()).toBe(true);
    vi.advanceTimersByTime(520 + 2600);
    expect(onComplete).not.toHaveBeenCalled();
    coach.report('end-experiment');
    expect(onComplete).toHaveBeenCalledWith(1);
    expect(coach.isPresentingSuccess()).toBe(false);
  });

  it('retires and records the coach when End wins before the delayed success card appears', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();
    const onComplete = vi.fn();
    coach.onOnboardingComplete = onComplete;

    coach.beginTrial(1);
    for (const event of [
      'lifeform:bloom_mass', 'egg-used', 'nutrient-selected', 'nutrient-used',
      'toxin-selected', 'toxin-used',
    ]) coach.report(event);

    expect(elements.get('coach-title')?.textContent).toBe('Watch the culture.');
    coach.leaveArena(true);

    expect(coach.isActive()).toBe(false);
    expect(elements.get('coach')?.classList.contains('coach-show')).toBe(false);
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('latches an early completed objective and celebrates after the final required action', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    continueFromWelcome(elements);
    coach.report('egg-selected');
    coach.report('egg-used');
    coach.report('objective-complete');

    expect(coach.isActive()).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Now press Nutrient.');

    coach.report('nutrient-selected');
    coach.report('nutrient-used');

    expect(coach.isActive()).toBe(true);
    vi.advanceTimersByTime(520 + 2600);
    expect(elements.get('coach')?.classList.contains('coach-success')).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('Experiment complete.');
  });

  it('can show an idle onboarding nudge over the active tutorial and then restore the tutorial card', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    continueFromWelcome(elements);
    coach.showNudge('Make the first discovery', 'Place one Swarmlet egg, then feed the living cultures.', {
      interruptTutorial: true,
    });

    expect(elements.get('coach-title')?.textContent).toBe('Make the first discovery');
    expect(elements.get('coach-skip')?.textContent).toBe('Got it');

    elements.get('coach-skip')?.click();

    expect(coach.isActive()).toBe(true);
    expect(elements.get('coach-title')?.textContent).toBe('I’m Dr. E. Press Egg.');
    expect(elements.get('coach-skip')?.hidden).toBe(true);
  });

  it('reports when all taught actions are waiting on the authored result', () => {
    vi.useFakeTimers();
    const elements = installCoachDom();
    const coach = createCoach();

    coach.beginRun();
    continueFromWelcome(elements);
    coach.report('egg-selected');
    coach.report('egg-used');
    coach.report('nutrient-selected');
    coach.report('nutrient-used');

    expect(coach.isAwaitingObjective()).toBe(true);
    coach.report('objective-complete');
    expect(coach.isAwaitingObjective()).toBe(false);
    expect(coach.isPresentingSuccess()).toBe(true);
  });

  it('chooses onboarding idle nudges for the next concrete action', () => {
    expect(onboardingIdleNudge({
      objectiveComplete: true,
      tutorialActive: false,
      objectiveHint: 'unused',
    })).toEqual({
      title: 'Experiment ready',
      body: 'Bank this result to preserve the evidence and unlock the next research step.',
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

    const exactHints = [
      'Feed budding tissue before applying pressure.',
      'Place Bloom Mass, add Nutrient, then overlap the same field with Toxin.',
    ] as const;
    expect(onboardingIdleNudge({
      objectiveComplete: false,
      tutorialActive: true,
      objectiveHint: 'unused',
      guidanceTier: 'exact',
      recoveryHints: exactHints,
    })).toEqual({
      title: 'No reaction yet',
      body: exactHints[1],
      interruptTutorial: true,
    });

    const recoveryHints = [
      'Water can carry an existing food field through budding tissue.',
      'Place Bloom Mass, add Nutrient, then overlap the same field with Water.',
    ] as const;
    expect(onboardingIdleNudge({
      objectiveComplete: false,
      tutorialActive: false,
      objectiveHint: 'unused',
      guidanceTier: 'hypothesis',
      nudgeIndex: 0,
      recoveryHints,
    })).toMatchObject({ title: 'A principle to test', body: recoveryHints[0] });
    expect(onboardingIdleNudge({
      objectiveComplete: false,
      tutorialActive: false,
      objectiveHint: 'unused',
      guidanceTier: 'hypothesis',
      nudgeIndex: 1,
      recoveryHints,
    })).toMatchObject({ title: 'Exact method', body: recoveryHints[1] });
  });
});
