// Minimal engulf audio cue. Plays a low pulsing tone while engulf is held;
// silent otherwise. Lazily initializes the AudioContext on first use to
// satisfy browser autoplay policies (must follow a user gesture).

export interface EngulfTone {
  start(): void;
  stop(): void;
  setIntensity(t: number): void;   // 0..1; modulates pitch + volume slightly
}

export function createEngulfTone(): EngulfTone {
  let ctx: AudioContext | null = null;
  let osc: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  let playing = false;
  let lastIntensity = 0;

  function ensureContext(): AudioContext {
    if (ctx) return ctx;
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API not available');
    ctx = new Ctor();
    return ctx;
  }

  return {
    start() {
      if (playing) return;
      const c = ensureContext();
      // Resume in case browser suspended it (e.g. tab inactive on first load).
      if (c.state === 'suspended') void c.resume();

      // Carrier: low square wave, dirty/buzzy "absorbing" feel.
      osc = c.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 80;

      // LFO modulates the carrier frequency slightly for a pulsing rumble.
      lfo = c.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 6;       // 6 Hz pulse
      lfoGain = c.createGain();
      lfoGain.gain.value = 8;        // ±8 Hz around carrier
      lfo.connect(lfoGain).connect(osc.frequency);

      // Output gain: kept low so it sits under any future SFX without clipping.
      gain = c.createGain();
      gain.gain.value = 0.0;          // ramp up below
      osc.connect(gain).connect(c.destination);

      const now = c.currentTime;
      gain.gain.setTargetAtTime(0.06, now, 0.04);

      osc.start();
      lfo.start();
      playing = true;
    },
    stop() {
      if (!playing || !ctx || !osc || !gain || !lfo) return;
      const c = ctx;
      const oscRef = osc;
      const lfoRef = lfo;
      const gainRef = gain;
      const now = c.currentTime;
      gainRef.gain.setTargetAtTime(0, now, 0.02);
      // Schedule shutdown after the fade.
      const stopAt = now + 0.15;
      try { oscRef.stop(stopAt); } catch { /* already stopped */ }
      try { lfoRef.stop(stopAt); } catch { /* already stopped */ }
      osc = null;
      lfo = null;
      lfoGain = null;
      gain = null;
      playing = false;
    },
    setIntensity(t: number) {
      lastIntensity = Math.max(0, Math.min(1, t));
      if (!playing || !ctx || !osc || !gain) return;
      const now = ctx.currentTime;
      // Pitch rises 80 → 140 Hz across intensity range.
      osc.frequency.setTargetAtTime(80 + 60 * lastIntensity, now, 0.05);
      // Volume nudges 0.05 → 0.09.
      gain.gain.setTargetAtTime(0.05 + 0.04 * lastIntensity, now, 0.05);
    },
  };
}
