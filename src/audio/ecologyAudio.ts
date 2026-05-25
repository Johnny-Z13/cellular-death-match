export interface EcologyAudioFrame {
  eating: number;
  fighting: number;
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

  return {
    unlock() {
      const c = ensureContext();
      if (c.state === 'suspended') void c.resume();
    },
    update(frame) {
      if (frame.eating <= 0 && frame.fighting <= 0) return;
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
    },
  };
}
