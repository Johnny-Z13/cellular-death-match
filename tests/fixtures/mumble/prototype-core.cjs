// Codex's strange-voices prototype (13 October 2026, made for Johnny), its engine only: the lines between CORE_START and CORE_END,
// copied verbatim as the reference the Unity planner and the unit generator are checked against. Not shipped.
  // CORE_START
  const RATE = 24000;
  const VOICES = {
    bog: { name: 'Bog organ', base: 128, throat: .77, note: 'Low, reedy vowels with a trembling growl.' },
    glass: { name: 'Glass moth', base: 285, throat: 1.4, note: 'Tiny vowel chimes with a brittle, metallic flutter.' },
    rust: { name: 'Rust oracle', base: 155, throat: .94, note: 'A crackling mechanical mutter with ringing edges.' },
    bubble: { name: 'Bubble imp', base: 225, throat: 1.12, note: 'Round, rubbery syllables with liquid pitch scoops.' }
  };
  const FORMANTS = {
    a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010],
    o: [570, 840, 2410], u: [300, 870, 2240], y: [350, 1900, 2600]
  };
  function hash(text) {
    let n = 2166136261;
    for (const c of text) n = Math.imul(n ^ c.codePointAt(0), 16777619);
    return n >>> 0;
  }
  function rng(seed) {
    let n = seed || 1;
    return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
  }
  function clean(text) {
    return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function wordPattern(raw) {
    const word = clean(raw);
    const groups = [...word.matchAll(/[aeiouy]+/g)];
    const random = rng(hash(word));
    const scale = [-3, -1, 0, 2, 4];
    const units = groups.length ? groups.map(m => ({ group: m[0], offset: m.index }))
      : Array.from({ length: Math.min(3, Math.max(1, Math.ceil(word.length / 3))) }, (_, i) => ({ group: 'u', offset: i * 3 }));
    return units.map((u, index) => ({
      vowel: /^(oo|ou)/.test(u.group) ? 'u' : /^ee/.test(u.group) ? 'i' : u.group[0],
      step: scale[Math.floor(random() * scale.length)],
      duration: .125 + random() * .065 + (u.group.length > 1 ? .035 : 0),
      seed: hash(word + ':' + index),
      offset: u.offset
    }));
  }
  function plan(text, pace = 1) {
    if (typeof text !== 'string' || text.length > 180) throw new Error('Use up to 180 characters.');
    if (!Number.isFinite(pace) || pace < .65 || pace > 1.5) throw new Error('Pace is outside the supported range.');
    const tokens = [...text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|\.{2,}|[,.!?;:\n]/gu)].map(m => m[0]);
    if (!tokens.some(t => /^[\p{L}\p{N}]/u.test(t))) throw new Error('Type a name or a short line first.');
    const events = [], words = [];
    let time = .08, phraseWord = 0;
    for (let ti = 0; ti < tokens.length; ti++) {
      const token = tokens[ti];
      if (!/^[\p{L}\p{N}]/u.test(token)) {
        time += (token === ',' ? .19 : token.startsWith('..') ? .5 : .34) / pace;
        phraseWord = 0;
        continue;
      }
      const pattern = wordPattern(token);
      const next = tokens[ti + 1] || '';
      let ending = '';
      for (let j = ti + 1; j < tokens.length; j++) {
        if (/^[,.!?;:\n]/.test(tokens[j])) { ending = tokens[j]; break; }
      }
      const shout = /[A-Z]/.test(token) && token === token.toUpperCase();
      const word = { text: token, start: time, end: 0, index: words.length };
      pattern.forEach((unit, i) => {
        const phrase = Math.max(-4, -phraseWord * .7 - i * .45);
        const excited = ending === '!' ? 2 : 0;
        const question = next === '?' ? (i + 1) / pattern.length * 4 : 0;
        events.push({ ...unit, start: time, duration: unit.duration / pace * 1.18,
          semitone: unit.step + phrase + excited + question + (shout ? 2 : 0),
          amplitude: (shout ? 1.2 : 1) * (next.startsWith('..') ? 1 - i / pattern.length * .65 : 1),
          glide: next === '?' ? 2 : -.75, wordIndex: word.index });
        time += unit.duration / pace;
      });
      word.end = time + .05 / pace;
      words.push(word);
      time += .09 / pace;
      phraseWord++;
    }
    const duration = Math.max(time, events.at(-1).start + events.at(-1).duration) + .12;
    if (duration > 30) throw new Error('That line runs long. Try fewer words or a faster pace.');
    return { events, words, duration };
  }
  function synthesize(text, settings) {
    const { voice = 'bog', weird = .55, pitch = 0, pace = 1 } = settings;
    if (!VOICES[voice] || !Number.isFinite(weird) || weird < 0 || weird > 1 || !Number.isFinite(pitch) || pitch < -12 || pitch > 12) {
      throw new Error('Choose a valid voice and settings.');
    }
    const score = plan(text, pace);
    const samples = new Float32Array(Math.ceil(score.duration * RATE));
    const v = VOICES[voice];
    for (const e of score.events) {
      const random = rng(e.seed ^ hash(voice));
      const f = v.base * 2 ** ((e.semitone + pitch) / 12);
      const formants = FORMANTS[e.vowel];
      const weights = Array.from({ length: 20 }, (_, i) => {
        const h = i + 1;
        return (.13 + formants.reduce((sum, band) => sum + 3 * Math.exp(-.5 * ((h * f - band * v.throat) / (95 + band * .055)) ** 2), 0)) / h;
      });
      const weightTotal = weights.reduce((a, b) => a + b, 0);
      const start = Math.floor(e.start * RATE), length = Math.floor(e.duration * RATE);
      let phase = 0, smoothNoise = 0;
      for (let i = 0; i < length && start + i < samples.length; i++) {
        const t = i / RATE, x = i / length;
        const envelope = Math.sin(Math.PI * Math.min(1, x / .16) / 2) * Math.sin(Math.PI * Math.min(1, (1 - x) / .3) / 2);
        const wobble = Math.sin(2 * Math.PI * (voice === 'bog' ? 2.4 : 5.1) * t + (e.seed % 17)) * weird * .6;
        const scoop = voice === 'bubble' ? weird * (5 * Math.exp(-x * 7) - 1.2 * x) : 0;
        phase += 2 * Math.PI * f * 2 ** ((e.glide * x + wobble + scoop) / 12) / RATE;
        let vowel = 0;
        for (let h = 1; h <= weights.length; h++) {
          if (h * f < RATE * .44) vowel += Math.sin(phase * h) * weights[h - 1];
        }
        vowel /= weightTotal;
        smoothNoise = .8 * smoothNoise + .2 * (random() * 2 - 1);
        let sound = vowel;
        if (voice === 'bog') sound = vowel * (.88 + .12 * Math.sin(phase / 2)) + weird * .15 * Math.sin(phase / 2) + smoothNoise * (.04 + weird * .12);
        if (voice === 'glass') sound = vowel * .55 + .28 * Math.sin(phase * 2 + (1 + weird * 3) * Math.sin(phase * 2.41)) * (.5 + .5 * Math.cos(x * Math.PI / 2));
        if (voice === 'rust') sound = Math.tanh(vowel * (2 + weird * 4)) * .4 * (1 - weird * .55 + weird * .55 * Math.cos(phase * 1.37)) + smoothNoise * weird * .09;
        if (voice === 'bubble') sound = vowel * .45 + .4 * Math.sin(phase + (1 + weird * 5) * Math.sin(phase * .5) * (1 - x)) + weird * smoothNoise * .05;
        samples[start + i] += sound * envelope * e.amplitude;
      }
    }
    // DC removal, fixed soft saturation, and capped peak: never auto-amplify quiet clips.
    let previousIn = 0, previousOut = 0, peak = 0;
    for (let i = 0; i < samples.length; i++) {
      const input = samples[i];
      const highpass = input - previousIn + .995 * previousOut;
      previousIn = input; previousOut = highpass;
      samples[i] = Math.tanh(highpass * 1.5) * .7;
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return { ...score, samples, rate: RATE, peak, voice };
  }
  // CORE_END
module.exports = { hash, rng, clean, wordPattern, plan, synthesize, VOICES, FORMANTS, RATE };
