// Z13 mumble-speak: text-driven nonsense speech. Each word's sound comes from
// its own spelling, so a name always sounds like itself. A line-for-line port
// of the strange-voices prototype engine (ps1-world-unity
// Tools/Mumble/prototype-core.cjs); tests/audio/mumble.test.ts checks it
// matches that file exactly, sample for sample.
import type { MumbleVoiceId } from '../content/drETuning';

export const MUMBLE_RATE = 24000;

export const MUMBLE_VOICES: Record<MumbleVoiceId, { name: string; base: number; throat: number; note: string }> = {
  bog: { name: 'Bog organ', base: 128, throat: 0.77, note: 'Low, reedy vowels with a trembling growl.' },
  glass: { name: 'Glass moth', base: 285, throat: 1.4, note: 'Tiny vowel chimes with a brittle, metallic flutter.' },
  rust: { name: 'Rust oracle', base: 155, throat: 0.94, note: 'A crackling mechanical mutter with ringing edges.' },
  bubble: { name: 'Bubble imp', base: 225, throat: 1.12, note: 'Round, rubbery syllables with liquid pitch scoops.' },
};

type Vowel = 'a' | 'e' | 'i' | 'o' | 'u' | 'y';

const FORMANTS: Record<Vowel, [number, number, number]> = {
  a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010],
  o: [570, 840, 2410], u: [300, 870, 2240], y: [350, 1900, 2600],
};

export interface MumbleUnit { vowel: Vowel; step: number; duration: number; seed: number; offset: number }
export interface MumbleEvent extends MumbleUnit { start: number; semitone: number; amplitude: number; glide: number; wordIndex: number }
export interface MumbleWord { text: string; start: number; end: number; index: number }
export interface MumblePlan { events: MumbleEvent[]; words: MumbleWord[]; duration: number }
export interface MumbleSettings { voice: MumbleVoiceId; weird: number; pitch: number; pace: number }
export interface MumbleRender extends MumblePlan { samples: Float32Array<ArrayBuffer>; rate: number; peak: number; voice: MumbleVoiceId }

export function mumbleHash(text: string): number {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.codePointAt(0)!, 16777619);
  return n >>> 0;
}

function rng(seed: number): () => number {
  let n = seed || 1;
  return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
}

function clean(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function wordPattern(raw: string): MumbleUnit[] {
  const word = clean(raw);
  const groups = [...word.matchAll(/[aeiouy]+/g)];
  const random = rng(mumbleHash(word));
  const scale = [-3, -1, 0, 2, 4];
  const units = groups.length
    ? groups.map((m) => ({ group: m[0], offset: m.index! }))
    : Array.from({ length: Math.min(3, Math.max(1, Math.ceil(word.length / 3))) }, (_, i) => ({ group: 'u', offset: i * 3 }));
  return units.map((u, index) => ({
    vowel: (/^(oo|ou)/.test(u.group) ? 'u' : /^ee/.test(u.group) ? 'i' : u.group[0]) as Vowel,
    step: scale[Math.floor(random() * scale.length)]!,
    duration: 0.125 + random() * 0.065 + (u.group.length > 1 ? 0.035 : 0),
    seed: mumbleHash(word + ':' + index),
    offset: u.offset,
  }));
}

const TOKEN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|\.{2,}|[,.!?;:\n]/gu;
const WORD_START = /^[\p{L}\p{N}]/u;

export function plan(text: string, pace = 1): MumblePlan {
  if (typeof text !== 'string' || text.length > 180) throw new Error('Use up to 180 characters.');
  if (!Number.isFinite(pace) || pace < 0.65 || pace > 1.5) throw new Error('Pace is outside the supported range.');
  const tokens = [...text.matchAll(TOKEN)].map((m) => m[0]);
  if (!tokens.some((t) => WORD_START.test(t))) throw new Error('Type a name or a short line first.');
  const events: MumbleEvent[] = [];
  const words: MumbleWord[] = [];
  let time = 0.08;
  let phraseWord = 0;
  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti]!;
    if (!WORD_START.test(token)) {
      time += (token === ',' ? 0.19 : token.startsWith('..') ? 0.5 : 0.34) / pace;
      phraseWord = 0;
      continue;
    }
    const pattern = wordPattern(token);
    const next = tokens[ti + 1] || '';
    let ending = '';
    for (let j = ti + 1; j < tokens.length; j++) {
      if (/^[,.!?;:\n]/.test(tokens[j]!)) { ending = tokens[j]!; break; }
    }
    const shout = /[A-Z]/.test(token) && token === token.toUpperCase();
    const word: MumbleWord = { text: token, start: time, end: 0, index: words.length };
    pattern.forEach((unit, i) => {
      const phrase = Math.max(-4, -phraseWord * 0.7 - i * 0.45);
      const excited = ending === '!' ? 2 : 0;
      const question = next === '?' ? ((i + 1) / pattern.length) * 4 : 0;
      events.push({
        ...unit,
        start: time,
        duration: (unit.duration / pace) * 1.18,
        semitone: unit.step + phrase + excited + question + (shout ? 2 : 0),
        amplitude: (shout ? 1.2 : 1) * (next.startsWith('..') ? 1 - (i / pattern.length) * 0.65 : 1),
        glide: next === '?' ? 2 : -0.75,
        wordIndex: word.index,
      });
      time += unit.duration / pace;
    });
    word.end = time + 0.05 / pace;
    words.push(word);
    time += 0.09 / pace;
    phraseWord++;
  }
  const last = events[events.length - 1]!;
  const duration = Math.max(time, last.start + last.duration) + 0.12;
  if (duration > 30) throw new Error('That line runs long. Try fewer words or a faster pace.');
  return { events, words, duration };
}

export function synthesize(text: string, settings: MumbleSettings): MumbleRender {
  const { voice, weird, pitch, pace } = settings;
  if (!MUMBLE_VOICES[voice] || !Number.isFinite(weird) || weird < 0 || weird > 1 || !Number.isFinite(pitch) || pitch < -12 || pitch > 12) {
    throw new Error('Choose a valid voice and settings.');
  }
  const score = plan(text, pace);
  const samples = new Float32Array(Math.ceil(score.duration * MUMBLE_RATE));
  const v = MUMBLE_VOICES[voice];
  for (const e of score.events) {
    const random = rng(e.seed ^ mumbleHash(voice));
    const f = v.base * 2 ** ((e.semitone + pitch) / 12);
    const formants = FORMANTS[e.vowel];
    const weights = Array.from({ length: 20 }, (_, i) => {
      const h = i + 1;
      return (0.13 + formants.reduce((sum, band) => sum + 3 * Math.exp(-0.5 * ((h * f - band * v.throat) / (95 + band * 0.055)) ** 2), 0)) / h;
    });
    const weightTotal = weights.reduce((a, b) => a + b, 0);
    const start = Math.floor(e.start * MUMBLE_RATE);
    const length = Math.floor(e.duration * MUMBLE_RATE);
    let phase = 0;
    let smoothNoise = 0;
    for (let i = 0; i < length && start + i < samples.length; i++) {
      const t = i / MUMBLE_RATE;
      const x = i / length;
      const envelope = Math.sin((Math.PI * Math.min(1, x / 0.16)) / 2) * Math.sin((Math.PI * Math.min(1, (1 - x) / 0.3)) / 2);
      const wobble = Math.sin(2 * Math.PI * (voice === 'bog' ? 2.4 : 5.1) * t + (e.seed % 17)) * weird * 0.6;
      const scoop = voice === 'bubble' ? weird * (5 * Math.exp(-x * 7) - 1.2 * x) : 0;
      phase += (2 * Math.PI * f * 2 ** ((e.glide * x + wobble + scoop) / 12)) / MUMBLE_RATE;
      let vowel = 0;
      for (let h = 1; h <= weights.length; h++) {
        if (h * f < MUMBLE_RATE * 0.44) vowel += Math.sin(phase * h) * weights[h - 1]!;
      }
      vowel /= weightTotal;
      smoothNoise = 0.8 * smoothNoise + 0.2 * (random() * 2 - 1);
      let sound = vowel;
      if (voice === 'bog') sound = vowel * (0.88 + 0.12 * Math.sin(phase / 2)) + weird * 0.15 * Math.sin(phase / 2) + smoothNoise * (0.04 + weird * 0.12);
      if (voice === 'glass') sound = vowel * 0.55 + 0.28 * Math.sin(phase * 2 + (1 + weird * 3) * Math.sin(phase * 2.41)) * (0.5 + 0.5 * Math.cos((x * Math.PI) / 2));
      if (voice === 'rust') sound = Math.tanh(vowel * (2 + weird * 4)) * 0.4 * (1 - weird * 0.55 + weird * 0.55 * Math.cos(phase * 1.37)) + smoothNoise * weird * 0.09;
      if (voice === 'bubble') sound = vowel * 0.45 + 0.4 * Math.sin(phase + (1 + weird * 5) * Math.sin(phase * 0.5) * (1 - x)) + weird * smoothNoise * 0.05;
      samples[start + i] = samples[start + i]! + sound * envelope * e.amplitude;
    }
  }
  // DC removal, fixed soft saturation, and a capped peak: quiet lines are never amplified.
  let previousIn = 0;
  let previousOut = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const input = samples[i]!;
    const highpass = input - previousIn + 0.995 * previousOut;
    previousIn = input;
    previousOut = highpass;
    samples[i] = Math.tanh(highpass * 1.5) * 0.7;
    peak = Math.max(peak, Math.abs(samples[i]!));
  }
  return { ...score, samples, rate: MUMBLE_RATE, peak, voice };
}

/** Not part of the prototype: its tokenizer drops the ellipsis and dash
 *  characters the script uses, so spell them the way it understands (the
 *  Unity planner does the same). Word tokens are untouched, so word i of the
 *  plan is still word i of the displayed line. */
export function normalizeLine(text: string): string {
  return text.replace(/…/g, '...').replace(/[—–]/g, ',');
}
