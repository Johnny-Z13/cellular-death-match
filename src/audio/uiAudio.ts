// UI + cinematic audio: button taps, phase stingers, and a looping ambience
// bed. Separate from ecologyAudio (which tracks the simulation) so the mute
// toggle and ambience lifecycle stay simple. Generated assets load lazily with
// a quiet procedural fallback if a file is missing.

export type UiSoundId = 'ui_tap' | 'ui_select' | 'epoch_begin' | 'epoch_win' | 'epoch_fail' | 'experiment_ready';

interface UiSoundDef {
  asset: string;
  gain: number;
  cooldownMs: number;
}

const UI_SOUND_DEFS: Record<UiSoundId, UiSoundDef> = {
  ui_tap: { asset: '/audio/generated/ui_tap.mp3', gain: 0.32, cooldownMs: 40 },
  ui_select: { asset: '/audio/generated/ui_select.mp3', gain: 0.4, cooldownMs: 60 },
  epoch_begin: { asset: '/audio/generated/epoch_begin.mp3', gain: 0.6, cooldownMs: 400 },
  epoch_win: { asset: '/audio/generated/epoch_win.mp3', gain: 0.66, cooldownMs: 400 },
  epoch_fail: { asset: '/audio/generated/epoch_fail.mp3', gain: 0.62, cooldownMs: 400 },
  experiment_ready: { asset: '/audio/generated/experiment_ready.mp3', gain: 0.6, cooldownMs: 600 },
};

const AMBIENCE_ASSET = '/audio/generated/ambience_loop.mp3';
const MUTE_KEY = 'cdm.audio.muted';
// The generated clip has no loop-friendly head/tail, so a native loop clicks at
// the seam. We re-trigger it with this much equal-power crossfade overlap so the
// boundary is masked instead.
const AMBIENCE_CROSSFADE = 1.4;

export interface UiAudio {
  unlock(): void;
  play(id: UiSoundId): void;
  startAmbience(): void;
  stopAmbience(): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  toggleMuted(): boolean;
}

export function createUiAudio(): UiAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambienceGain: GainNode | null = null;
  let ambienceBuffer: AudioBuffer | null = null;
  let ambienceWanted = false;
  let ambienceTimer = 0;
  const ambienceVoices = new Set<AudioBufferSourceNode>();
  let didPreload = false;
  let muted = readMutedPreference();
  const buffers = new Map<UiSoundId, AudioBuffer>();
  const lastAt = new Map<UiSoundId, number>();

  function ensureContext(): AudioContext {
    if (ctx) return ctx;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API not available');
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0.0001;
    ambienceGain.connect(master);
    void preload(ctx);
    return ctx;
  }

  async function preload(c: AudioContext): Promise<void> {
    if (didPreload) return;
    didPreload = true;
    await Promise.all([
      ...Object.entries(UI_SOUND_DEFS).map(async ([id, def]) => {
        const buf = await fetchBuffer(c, def.asset);
        if (buf) buffers.set(id as UiSoundId, buf);
      }),
      (async () => {
        ambienceBuffer = await fetchBuffer(c, AMBIENCE_ASSET);
        if (ambienceWanted) startAmbienceNow();
      })(),
    ]);
  }

  async function fetchBuffer(c: AudioContext, url: string): Promise<AudioBuffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await c.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  function startAmbienceNow(): void {
    if (!ctx || !ambienceGain || !ambienceBuffer || ambienceVoices.size > 0) return;
    const now = ctx.currentTime;
    // Fade the overall ambience bed up gently.
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(Math.max(0.0001, ambienceGain.gain.value), now);
    ambienceGain.gain.linearRampToValueAtTime(0.5, now + 2.5);
    scheduleAmbienceVoice(now);
  }

  // Play one pass of the clip with an equal-power fade at both ends, and queue
  // the next pass to start during this one's tail so the seam never clicks.
  function scheduleAmbienceVoice(startAt: number): void {
    if (!ctx || !ambienceGain || !ambienceBuffer) return;
    const dur = ambienceBuffer.duration;
    const fade = Math.min(AMBIENCE_CROSSFADE, dur / 2);
    const src = ctx.createBufferSource();
    src.buffer = ambienceBuffer;
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, startAt);
    voiceGain.gain.linearRampToValueAtTime(1, startAt + fade);
    voiceGain.gain.setValueAtTime(1, startAt + dur - fade);
    voiceGain.gain.linearRampToValueAtTime(0.0001, startAt + dur);
    src.connect(voiceGain).connect(ambienceGain);
    src.start(startAt);
    src.stop(startAt + dur + 0.05);
    ambienceVoices.add(src);
    src.onended = () => { ambienceVoices.delete(src); };

    // Queue the next pass to overlap this one's tail by `fade`.
    const nextAt = startAt + dur - fade;
    const delayMs = Math.max(0, (nextAt - ctx.currentTime - 0.2) * 1000);
    ambienceTimer = window.setTimeout(() => {
      if (ambienceWanted && ctx) scheduleAmbienceVoice(ctx.currentTime + 0.2);
    }, delayMs);
  }

  function playProceduralTap(strong: boolean): void {
    if (!ctx || !master) return;
    const c = ctx;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(strong ? 540 : 360, now);
    osc.frequency.exponentialRampToValueAtTime(strong ? 760 : 240, now + 0.08);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(strong ? 0.05 : 0.03, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  return {
    unlock() {
      const c = ensureContext();
      if (c.state === 'suspended') void c.resume();
    },
    play(id) {
      if (muted) return;
      const c = ensureContext();
      if (c.state === 'suspended') return;
      const def = UI_SOUND_DEFS[id];
      const nowMs = c.currentTime * 1000;
      if (nowMs - (lastAt.get(id) ?? -Infinity) < def.cooldownMs) return;
      lastAt.set(id, nowMs);
      const buf = buffers.get(id);
      if (buf && master) {
        const src = c.createBufferSource();
        const gain = c.createGain();
        src.buffer = buf;
        gain.gain.value = def.gain;
        src.connect(gain).connect(master);
        src.start();
      } else {
        playProceduralTap(id !== 'ui_tap');
      }
    },
    startAmbience() {
      ambienceWanted = true;
      ensureContext();
      startAmbienceNow();
    },
    stopAmbience() {
      ambienceWanted = false;
      window.clearTimeout(ambienceTimer);
      if (ctx && ambienceGain) {
        const now = ctx.currentTime;
        ambienceGain.gain.cancelScheduledValues(now);
        ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
        ambienceGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
        const voices = [...ambienceVoices];
        ambienceVoices.clear();
        window.setTimeout(() => {
          for (const src of voices) { try { src.stop(); } catch { /* already stopped */ } }
        }, 900);
      }
    },
    isMuted() {
      return muted;
    },
    setMuted(next) {
      muted = next;
      writeMutedPreference(next);
      if (master && ctx) {
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(next ? 0 : 1, now + 0.2);
      }
    },
    toggleMuted() {
      this.setMuted(!muted);
      return muted;
    },
  };
}

function readMutedPreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMutedPreference(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore storage failures (private mode, etc).
  }
}
