// Plays one mumble line at a time through Web Audio. The caller owns the
// AudioContext and the node the voice feeds (the Voice Lab today, the UI audio
// bus once Dr. E speaks in game).
import type { DrEVoice } from '../content/drETuning';
import { MUMBLE_RATE, normalizeLine, synthesize, type MumblePlan, type MumbleRender } from './mumble';

export interface MumbleUtterance {
  text: string; // the line as displayed
  plan: MumblePlan;
  /** AudioContext time the line started, in seconds. */
  startedAt: number;
  synthMs: number;
  peak: number;
  stop(): void;
}

export interface MumblePlayer {
  /** Speak `text`, stopping any line already playing. Returns null when the
   *  engine cannot say it (no words, over 180 characters, or too long). */
  say(text: string, voice: DrEVoice): MumbleUtterance | null;
  stop(): void;
}

// Synthesis takes several milliseconds a line, too long to do mid-frame each
// time Dr. E speaks. Lines are rendered once and kept (most are said again),
// and known lines are rendered ahead at idle time.
const RENDER_CACHE_LINES = 64;
const renders = new Map<string, MumbleRender>();

/** The rendered line, from the cache when it has been said before. Throws
 *  when the engine cannot say it. */
export function renderLine(text: string, voice: DrEVoice): MumbleRender {
  const key = `${voice.voice}|${voice.pitch}|${voice.pace}|${voice.weird}|${text}`;
  const cached = renders.get(key);
  if (cached) return cached;
  const render = synthesize(normalizeLine(text), { voice: voice.voice, weird: voice.weird, pitch: voice.pitch, pace: voice.pace });
  renders.set(key, render);
  if (renders.size > RENDER_CACHE_LINES) renders.delete(renders.keys().next().value!);
  return render;
}

/** Render `lines` ahead, one per idle moment, so saying them later is free. */
export function prewarmLines(lines: readonly string[], voice: DrEVoice): void {
  const queue = [...lines];
  const idle = (fn: () => void) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn) : setTimeout(fn, 50));
  const next = () => {
    const line = queue.shift();
    if (line === undefined) return;
    try { renderLine(line, voice); } catch { /* a line the voice cannot say */ }
    idle(next);
  };
  idle(next);
}

export function createMumblePlayer(ctx: AudioContext, destination: AudioNode): MumblePlayer {
  let current: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  const stop = (): void => {
    if (!current) return;
    current.source.stop();
    current.source.disconnect();
    current.gain.disconnect();
    current = null;
  };

  return {
    say(text, voice) {
      stop();
      const began = performance.now();
      let render;
      try {
        render = renderLine(text, voice);
      } catch {
        return null;
      }
      const synthMs = performance.now() - began;
      const buffer = ctx.createBuffer(1, render.samples.length, MUMBLE_RATE);
      buffer.copyToChannel(render.samples, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = voice.gain;
      source.connect(gain).connect(destination);
      const startedAt = ctx.currentTime;
      source.start(startedAt);
      const playing = { source, gain };
      current = playing;
      source.onended = () => {
        if (current === playing) current = null;
      };
      return {
        text,
        plan: { events: render.events, words: render.words, duration: render.duration },
        startedAt,
        synthMs,
        peak: render.peak,
        stop: () => {
          if (current === playing) stop();
        },
      };
    },
    stop,
  };
}
