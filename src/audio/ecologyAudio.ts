import {
  SOUND_EVENT_DEFS,
  type SoundEventDef,
  type SoundEventId,
} from './soundDesign';

export interface EcologyAudioFrame {
  eating: number;
  fighting: number;
  reactions: number;
  mutations: number;
  hatches: number;
  events: SoundEventId[];
}

export interface EcologyAudio {
  unlock(): void;
  update(frame: EcologyAudioFrame): void;
  setMuted(muted: boolean): void;
}

const MASTER_GAIN = 0.45;

export function createEcologyAudio(): EcologyAudio {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let muted = false;
  let lastEatAt = 0;
  let lastFightAt = 0;
  let lastReactionAt = 0;
  let lastMutationAt = 0;
  let lastHatchAt = 0;
  let didRequestAssets = false;
  const soundBuffers = new Map<SoundEventId, AudioBuffer>();
  const lastEventAt = new Map<SoundEventId, number>();
  const activeVoices = new Map<SoundEventId, number>();

  function ensureContext(): AudioContext {
    if (ctx) return ctx;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API not available');
    ctx = new Ctor();
    out = ctx.createGain();
    out.gain.value = muted ? 0 : MASTER_GAIN;
    out.connect(ctx.destination);
    void preloadSoundAssets(ctx);
    return ctx;
  }

  async function preloadSoundAssets(c: AudioContext): Promise<void> {
    if (didRequestAssets) return;
    didRequestAssets = true;
    const defs = Object.values(SOUND_EVENT_DEFS).filter((def) => def.asset);
    await Promise.all(defs.map(async (def) => {
      try {
        const response = await fetch(def.asset!);
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        const buffer = await c.decodeAudioData(bytes);
        soundBuffers.set(def.id, buffer);
      } catch {
        // Missing generated assets fall back to procedural layers.
      }
    }));
  }

  function makeNoiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
    const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playEat(amount: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const strength = Math.min(1, amount / 18);

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210 + Math.random() * 35, now);
    osc.frequency.exponentialRampToValueAtTime(92 + Math.random() * 18, now + 0.13);

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.5;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.018 + 0.025 * strength, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(filter).connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  function playFight(amount: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const strength = Math.min(1, amount / 10);

    const noise = c.createBufferSource();
    noise.buffer = makeNoiseBuffer(c, 0.08);

    const highpass = c.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 950;
    highpass.Q.value = 0.8;

    const bandpass = c.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1700 + Math.random() * 450;
    bandpass.Q.value = 2.2;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.016 + 0.032 * strength, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    noise.connect(highpass).connect(bandpass).connect(gain).connect(out);
    noise.start(now);
    noise.stop(now + 0.09);
  }

  function playReaction(amount: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const strength = Math.min(1, amount / 5);

    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 + Math.random() * 180 + 120 * strength, now);
    osc.frequency.exponentialRampToValueAtTime(150 + Math.random() * 60, now + 0.22 + 0.06 * strength);

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 760 + Math.random() * 420;
    filter.Q.value = 4.5;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.022 + 0.052 * strength, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3 + 0.04 * strength);

    osc.connect(filter).connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  function playMutation(amount: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const strength = Math.min(1, amount / 4);

    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(980 + Math.random() * 220, now + 0.11);

    const shimmer = c.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1040 + Math.random() * 180, now);

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200 + Math.random() * 500;
    filter.Q.value = 5.5;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.012 + 0.032 * strength, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(filter);
    shimmer.connect(filter);
    filter.connect(gain).connect(out);
    osc.start(now);
    shimmer.start(now + 0.015);
    osc.stop(now + 0.17);
    shimmer.stop(now + 0.13);
  }

  function playHatch(amount: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const strength = Math.min(1, amount / 3);

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340 + Math.random() * 70, now);
    osc.frequency.exponentialRampToValueAtTime(620 + Math.random() * 90, now + 0.08);

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.014 + 0.026 * strength, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  function playSoundEvent(id: SoundEventId): void {
    if (!ctx || !out) return;
    const def = SOUND_EVENT_DEFS[id];
    const nowMs = ctx.currentTime * 1000;
    const lastAt = lastEventAt.get(id) ?? -Infinity;
    if (nowMs - lastAt < def.cooldownMs) return;
    const voices = activeVoices.get(id) ?? 0;
    if (voices >= def.maxVoices) return;
    lastEventAt.set(id, nowMs);
    activeVoices.set(id, voices + 1);

    const buffer = soundBuffers.get(id);
    if (buffer) {
      playBufferEvent(def, buffer);
    } else {
      playProceduralEvent(def);
    }

    window.setTimeout(() => {
      activeVoices.set(id, Math.max(0, (activeVoices.get(id) ?? 1) - 1));
    }, Math.max(120, def.cooldownMs));
  }

  function playBufferEvent(def: SoundEventDef, buffer: AudioBuffer): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const source = c.createBufferSource();
    const gain = c.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(def.gain, now);
    source.connect(gain).connect(out);
    source.start(now);
  }

  function playProceduralEvent(def: SoundEventDef): void {
    if (!ctx || !out) return;
    if (def.id === 'hatch') {
      playHatch(1);
      return;
    }
    if (def.id === 'visible_mutation') {
      playMutation(2);
      return;
    }
    if (def.id === 'catalytic_flare') {
      playReaction(5);
      playFight(6);
      return;
    }
    if (def.id === 'water_stabilize') {
      playWaterStabilize(def.gain);
      return;
    }
    if (def.id === 'salt_crystal') {
      playSaltCrystal(def.gain);
      return;
    }
    if (def.id === 'folding_fault') {
      playFoldingFault(def.gain);
      return;
    }
    if (def.id === 'hidden_breed') {
      playHiddenBreed(def.gain);
      return;
    }
    playObjectiveWarning(def.gain);
  }

  function playWaterStabilize(gainValue: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05 * gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  function playSaltCrystal(gainValue: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1180 + i * 240 + Math.random() * 80, now + i * 0.018);
      gain.gain.setValueAtTime(0, now + i * 0.018);
      gain.gain.linearRampToValueAtTime(0.035 * gainValue, now + i * 0.018 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.018 + 0.09);
      osc.connect(gain).connect(out);
      osc.start(now + i * 0.018);
      osc.stop(now + i * 0.018 + 0.1);
    }
  }

  function playFoldingFault(gainValue: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.setValueAtTime(184, now + 0.04);
    osc.frequency.setValueAtTime(123, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.32);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06 * gainValue, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  function playHiddenBreed(gainValue: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const shimmer = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    shimmer.type = 'square';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.16);
    shimmer.frequency.setValueAtTime(1260, now + 0.04);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.052 * gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain);
    shimmer.connect(gain);
    gain.connect(out);
    osc.start(now);
    shimmer.start(now + 0.04);
    osc.stop(now + 0.26);
    shimmer.stop(now + 0.2);
  }

  function playObjectiveWarning(gainValue: number): void {
    if (!ctx || !out) return;
    const c = ctx;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.setValueAtTime(232, now + 0.11);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04 * gainValue, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(out);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  return {
    unlock() {
      const c = ensureContext();
      if (c.state === 'suspended') void c.resume();
    },
    setMuted(next) {
      muted = next;
      // Zero the master bus too so already-scheduled tails cut off instantly.
      if (out) out.gain.value = next ? 0 : MASTER_GAIN;
    },
    update(frame) {
      if (muted) return;
      if (
        frame.eating <= 0
        && frame.fighting <= 0
        && frame.reactions <= 0
        && frame.mutations <= 0
        && frame.hatches <= 0
        && frame.events.length === 0
      ) return;
      const c = ensureContext();
      if (c.state === 'suspended') return;
      const now = c.currentTime;

      if (frame.eating > 0 && now - lastEatAt > 0.09) {
        playEat(frame.eating);
        lastEatAt = now;
      }
      if (frame.fighting > 0 && now - lastFightAt > 0.07) {
        playFight(frame.fighting);
        lastFightAt = now;
      }
      if (frame.reactions > 0 && now - lastReactionAt > 0.14) {
        playReaction(frame.reactions);
        lastReactionAt = now;
      }
      if (frame.mutations > 0 && now - lastMutationAt > 0.16) {
        playMutation(frame.mutations);
        lastMutationAt = now;
      }
      if (frame.hatches > 0 && now - lastHatchAt > 0.12) {
        playHatch(frame.hatches);
        lastHatchAt = now;
      }
      for (const event of frame.events) {
        playSoundEvent(event);
      }
    },
  };
}
