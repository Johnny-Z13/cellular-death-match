// UI + cinematic audio: button taps, phase stingers, and a looping ambience
// bed. Separate from ecologyAudio (which tracks the simulation) so the mute
// toggle and ambience lifecycle stay simple. Generated assets load lazily with
// a quiet procedural fallback if a file is missing.

export type UiSoundId =
  | 'ui_tap' | 'ui_select' | 'epoch_begin' | 'epoch_win' | 'epoch_fail' | 'experiment_ready'
  | 'drop_nutrient' | 'drop_water' | 'drop_toxin' | 'drop_salt' | 'drop_acid' | 'drop_paste';

// Maps a lab tool to its bespoke drop sound (paste uses its own smear voice).
export const DROP_SOUND_FOR_TOOL: Record<string, UiSoundId> = {
  nutrient: 'drop_nutrient',
  water: 'drop_water',
  toxin: 'drop_toxin',
  salt: 'drop_salt',
  acid: 'drop_acid',
  paste: 'drop_paste',
};

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
  drop_nutrient: { asset: '/audio/generated/drop_nutrient.mp3', gain: 0.5, cooldownMs: 50 },
  drop_water: { asset: '/audio/generated/drop_water.mp3', gain: 0.5, cooldownMs: 50 },
  drop_toxin: { asset: '/audio/generated/drop_toxin.mp3', gain: 0.5, cooldownMs: 50 },
  drop_salt: { asset: '/audio/generated/drop_salt.mp3', gain: 0.5, cooldownMs: 50 },
  drop_acid: { asset: '/audio/generated/drop_acid.mp3', gain: 0.52, cooldownMs: 50 },
  drop_paste: { asset: '/audio/generated/drop_paste.mp3', gain: 0.4, cooldownMs: 90 },
};

const AMBIENCE_ASSET = '/audio/generated/ambience_loop.mp3';
const MUTE_KEY = 'cdm.audio.muted';
const REVERB_KEY = 'cdm.audio.reverb';
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
  isReverbEnabled(): boolean;
  setReverbEnabled(enabled: boolean): void;
  toggleReverb(): boolean;
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
  let reverbEnabled = readReverbPreference();
  let reverbWet: GainNode | null = null;
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
    // Parallel reverb send to glue the mix: master also feeds a convolver with a
    // procedurally-built impulse response, mixed back in via reverbWet.
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulseResponse(ctx, 1.8, 2.4);
    reverbWet = ctx.createGain();
    reverbWet.gain.value = reverbEnabled ? 0.22 : 0;
    master.connect(convolver).connect(reverbWet).connect(ctx.destination);
    ambienceGain = ctx.createGain();
    ambienceGain.gain.value = 0.0001;
    ambienceGain.connect(master);
    void preload(ctx);
    return ctx;
  }

  // A decaying noise burst makes a convincing, cheap room/hall impulse without
  // shipping an IR file. seconds = tail length, decay = how fast it fades.
  function makeImpulseResponse(c: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = c.sampleRate;
    const len = Math.floor(rate * seconds);
    const ir = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return ir;
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
    isReverbEnabled() {
      return reverbEnabled;
    },
    setReverbEnabled(next) {
      reverbEnabled = next;
      writeReverbPreference(next);
      if (reverbWet && ctx) {
        const now = ctx.currentTime;
        reverbWet.gain.cancelScheduledValues(now);
        reverbWet.gain.setValueAtTime(reverbWet.gain.value, now);
        reverbWet.gain.linearRampToValueAtTime(next ? 0.22 : 0, now + 0.25);
      }
    },
    toggleReverb() {
      this.setReverbEnabled(!reverbEnabled);
      return reverbEnabled;
    },
  };
}

function readReverbPreference(): boolean {
  try {
    // Default ON — the glue is subtle and helps the whole mix sit together.
    return window.localStorage.getItem(REVERB_KEY) !== '0';
  } catch {
    return true;
  }
}

function writeReverbPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(REVERB_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage failures.
  }
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
