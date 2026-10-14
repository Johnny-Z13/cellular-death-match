// Dr. E says his lines. When the coach's title or the method intro's heading
// shows a new line, he speaks it in his mumble voice while its words appear in
// time with the syllables, and every one of his faces moves its mouth. A tap
// on the line shows the rest at once. With his voice off or Sound muted he
// still mouths the words as they appear; with reduced motion the line shows
// whole and only his mouth moves. The coach owns the text: this module only
// re-draws it as said and unsaid halves, so the element's text never changes.
import { DR_E_VOICE } from '../content/drETuning';
import { normalizeLine, plan as planLine, type MumblePlan } from '../audio/mumble';
import { createMumblePlayer, type MumblePlayer } from '../audio/mumblePlayer';
import type { UiAudio } from '../audio/uiAudio';
import type { DrEPresence } from './drEPresence';
import { revealLengthAt } from './speechReveal';

export interface DrESpeechOptions {
  presence: DrEPresence;
  audio: UiAudio;
  voiceEnabled: () => boolean;
  reducedMotion: boolean;
}

export interface DrESpeech {
  /** Stop talking and show the current line whole. */
  finish(): void;
}

interface Line {
  el: HTMLElement;
  text: string;
  plan: MumblePlan | null;
  startMs: number;
  shown: number;
}

export function createDrESpeech(options: DrESpeechOptions): DrESpeech {
  const { presence, audio } = options;
  let player: MumblePlayer | null = null;
  let stopVoice: (() => void) | null = null;
  let line: Line | null = null;
  let raf = 0;

  const draw = (current: Line, shown: number): void => {
    current.shown = shown;
    let said = current.el.querySelector<HTMLElement>(':scope > .dre-said');
    let unsaid = current.el.querySelector<HTMLElement>(':scope > .dre-unsaid');
    if (!said || !unsaid) {
      said = document.createElement('span');
      said.className = 'dre-said';
      unsaid = document.createElement('span');
      unsaid.className = 'dre-unsaid';
      current.el.replaceChildren(said, unsaid);
    }
    said.textContent = current.text.slice(0, shown);
    unsaid.textContent = current.text.slice(shown);
  };

  const finish = (): void => {
    cancelAnimationFrame(raf);
    stopVoice?.();
    stopVoice = null;
    presence.stopSpeaking();
    audio.duckAmbience(false);
    if (line && line.shown < line.text.length) draw(line, line.text.length);
  };

  const tick = (): void => {
    if (!line) return;
    const t = (performance.now() - line.startMs) / 1000;
    const shown = line.plan ? revealLengthAt(line.text, line.plan, t) : line.text.length;
    if (shown !== line.shown) draw(line, shown);
    if (!line.plan || t >= line.plan.duration) {
      presence.stopSpeaking();
      audio.duckAmbience(false);
      stopVoice = null;
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const say = (el: HTMLElement, text: string): void => {
    finish();
    let voicePlan: MumblePlan | null = null;
    if (options.voiceEnabled() && !audio.isMuted()) {
      const bus = audio.speechBus();
      if (bus && bus.ctx.state === 'running') {
        player ??= createMumblePlayer(bus.ctx, bus.destination);
        const utterance = player.say(text, DR_E_VOICE);
        if (utterance) {
          voicePlan = utterance.plan;
          stopVoice = utterance.stop;
          audio.duckAmbience(true);
        }
      }
    }
    let plan = voicePlan;
    if (!plan) {
      try {
        plan = planLine(normalizeLine(text), DR_E_VOICE.pace);
      } catch {
        plan = null; // a line the voice cannot say simply appears
      }
    }
    line = { el, text, plan, startMs: performance.now(), shown: -1 };
    if (plan) presence.speak(plan, line.startMs);
    draw(line, options.reducedMotion || !plan ? text.length : 0);
    raf = requestAnimationFrame(tick);
  };

  // The coach rewrites its title with textContent, which removes our halves:
  // a new text is a new line; the same text is the same line re-drawn.
  const watch = (el: HTMLElement | null): void => {
    if (!el || typeof MutationObserver !== 'function') return;
    new MutationObserver(() => {
      if (el.querySelector(':scope > .dre-said')) return;
      const text = el.textContent ?? '';
      if (line && line.el === el && line.text === text) {
        draw(line, line.shown);
        return;
      }
      if (text.trim()) say(el, text);
    }).observe(el, { childList: true, characterData: true, subtree: true });
    el.addEventListener('click', () => {
      if (line?.el === el) finish();
    });
  };

  watch(document.getElementById('coach-title'));
  watch(document.getElementById('dex-line'));
  watch(document.getElementById('reveal-line'));
  const intro = document.getElementById('screen-method-intro');
  const introTitle = document.getElementById('method-intro-title');
  if (intro && introTitle && typeof MutationObserver === 'function') {
    let wasVisible = intro.classList.contains('visible');
    new MutationObserver(() => {
      const visible = intro.classList.contains('visible');
      if (visible && !wasVisible) say(introTitle, introTitle.textContent ?? '');
      wasVisible = visible;
    }).observe(intro, { attributes: true, attributeFilter: ['class'] });
  }
  return { finish };
}
