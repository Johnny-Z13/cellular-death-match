export interface EcologyAudioFrame {
  eating: number;
  fighting: number;
  reactions: number;
  mutations: number;
  hatches: number;
}

export interface EcologyAudio {
  unlock(): void;
  update(frame: EcologyAudioFrame): void;
}

export function createEcologyAudio(): EcologyAudio {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let lastEatAt = 0;
  let lastFightAt = 0;
  let lastReactionAt = 0;
  let lastMutationAt = 0;
  let lastHatchAt = 0;

  function ensureContext(): AudioContext {
    if (ctx) return ctx;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API not available');
    ctx = new Ctor();
    out = ctx.createGain();
    out.gain.value = 0.45;
    out.connect(ctx.destination);
    return ctx;
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

  return {
    unlock() {
      const c = ensureContext();
      if (c.state === 'suspended') void c.resume();
    },
    update(frame) {
      if (
        frame.eating <= 0
        && frame.fighting <= 0
        && frame.reactions <= 0
        && frame.mutations <= 0
        && frame.hatches <= 0
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
    },
  };
}
