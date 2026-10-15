// Dev-only Voice Lab (/voicelab.html; vite build ships index.html alone): type
// a line, tune Dr. E's mumble voice and hear it with the words revealing in
// time, then paste the copied settings into DR_E_VOICE (src/content/drETuning.ts).
import { DR_E_VOICE, type DrEVoice, type MumbleVoiceId, DR_E_DIRECTION, FACE_DIRECTIONS, FACE_EXPRESSIONS, type FaceDirectionId, type FaceExpressionId } from '../content/drETuning';
import { createDrEFace } from '../ui/drEFace/faceRenderer';
import { MUMBLE_VOICES } from '../audio/mumble';
import { createMumblePlayer, type MumblePlayer, type MumbleUtterance } from '../audio/mumblePlayer';
import { revealLengthAt } from '../ui/speechReveal';

// Lines from the v1 script (spec §12), one click each.
const PRESET_LINES = [
  'Oh! A visitor!',
  "I'm Dr. E. I'm a merge.",
  'My friends came apart. Help me find them?',
  "That's Bloom Mass! Friend number one.",
  'Closer… closer… hold it!',
  "You did it! That's Twin Bloom.",
  "I've seen something odd near Salt…",
];

const SLIDERS = [
  { key: 'pitch', label: 'Pitch (semitones)', min: -12, max: 12, step: 1 },
  { key: 'pace', label: 'Pace', min: 0.65, max: 1.5, step: 0.05 },
  { key: 'weird', label: 'Weird', min: 0, max: 1, step: 0.05 },
  { key: 'gain', label: 'Gain', min: 0, max: 1, step: 0.05 },
] as const;

// Dev-only presets. The game reads DR_E_VOICE and never this key.
const PROFILES_KEY = 'cdm.voicelab.profiles.v1';
type Profiles = Record<string, DrEVoice>;

const readProfiles = (): Profiles => {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '{}') as Profiles;
  } catch {
    return {};
  }
};
const writeProfiles = (profiles: Profiles): void => {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // Private mode: presets just won't persist.
  }
};
const snippet = (v: DrEVoice): string =>
  `export const DR_E_VOICE: DrEVoice = { voice: '${v.voice}', pitch: ${v.pitch}, pace: ${v.pace}, weird: ${v.weird}, gain: ${v.gain} };`;

const voice: DrEVoice = { ...DR_E_VOICE };
let player: MumblePlayer | null = null;
let utterance: MumbleUtterance | null = null;
let startMs = 0;
const speakListeners: Array<(spoken: MumbleUtterance, startedAtMs: number) => void> = [];
const stopListeners: Array<() => void> = [];

const root = document.getElementById('lab')!;
root.innerHTML = `
  <header class="lab-head">
    <h1>Voice Lab</h1>
    <p>Tune Dr. E's mumble voice, then copy it into <code>DR_E_VOICE</code>. Ctrl or Cmd + Enter says the line.</p>
  </header>
  <section class="lab-stage">
    <canvas id="face" class="dre-face" aria-hidden="true"></canvas>
    <div class="lab-actions"><select id="direction" aria-label="Face direction"></select><span id="expressions"></span></div>
    <p id="bubble" class="lab-bubble" aria-live="polite"><span class="shown"></span><span class="hidden"></span></p>
    <p id="readout" class="lab-readout">Press Say.</p>
  </section>
  <section class="lab-controls">
    <label class="lab-line">Line <textarea id="line" maxlength="180" rows="2"></textarea></label>
    <div id="presets" class="lab-presets"></div>
    <label>Voice <select id="voice"></select></label>
    <div id="sliders" class="lab-sliders"></div>
    <div class="lab-actions">
      <button id="say" type="button">Say</button>
      <button id="stop" type="button">Stop</button>
      <button id="reset" type="button">Reset to config</button>
      <button id="copy" type="button">Copy JSON</button>
    </div>
    <div class="lab-profiles">
      <input id="profile-name" placeholder="Profile name" />
      <button id="profile-save" type="button">Save</button>
      <select id="profile-list"></select>
      <button id="profile-load" type="button">Load</button>
      <button id="profile-delete" type="button">Delete</button>
    </div>
    <pre id="json" class="lab-json"></pre>
  </section>`;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const line = $<HTMLTextAreaElement>('line');
const voiceSelect = $<HTMLSelectElement>('voice');
const readout = $('readout');
const json = $('json');
const bubble = $('bubble');
const shownEl = bubble.querySelector<HTMLElement>('.shown')!;
const hiddenEl = bubble.querySelector<HTMLElement>('.hidden')!;
const profileList = $<HTMLSelectElement>('profile-list');
// Dr. E's live face beside the bubble, talking with each line.
const face = createDrEFace($<HTMLCanvasElement>('face'), { direction: DR_E_DIRECTION, size: 192 });
const directionSelect = $<HTMLSelectElement>('direction');
for (const [id, direction] of Object.entries(FACE_DIRECTIONS)) directionSelect.add(new Option(direction.name, id));
directionSelect.value = DR_E_DIRECTION;
directionSelect.addEventListener('change', () => face.setDirection(directionSelect.value as FaceDirectionId));
for (const id of Object.keys(FACE_EXPRESSIONS) as FaceExpressionId[]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = id;
  button.addEventListener('click', () => face.setExpression(id));
  $('expressions').append(button);
}
speakListeners.push((spoken, startedAtMs) => face.speak(spoken.plan, startedAtMs));
stopListeners.push(() => face.stopSpeaking());
line.value = PRESET_LINES[0]!;

for (const [id, def] of Object.entries(MUMBLE_VOICES)) voiceSelect.add(new Option(`${def.name} (${id})`, id));
voiceSelect.addEventListener('change', () => {
  voice.voice = voiceSelect.value as MumbleVoiceId;
  json.textContent = snippet(voice);
});

const sliderInputs = new Map<(typeof SLIDERS)[number]['key'], { input: HTMLInputElement; value: HTMLElement }>();
for (const slider of SLIDERS) {
  const label = document.createElement('label');
  label.innerHTML = `<span>${slider.label}</span><input type="range" min="${slider.min}" max="${slider.max}" step="${slider.step}" /><output></output>`;
  const input = label.querySelector('input')!;
  const value = label.querySelector('output')!;
  input.addEventListener('input', () => {
    voice[slider.key] = Number(input.value);
    value.textContent = input.value;
    json.textContent = snippet(voice);
  });
  sliderInputs.set(slider.key, { input, value });
  $('sliders').append(label);
}

const syncControls = (): void => {
  voiceSelect.value = voice.voice;
  for (const [key, { input, value }] of sliderInputs) {
    input.value = String(voice[key]);
    value.textContent = String(voice[key]);
  }
  json.textContent = snippet(voice);
};

const say = (): void => {
  const text = line.value.trim();
  if (!player) {
    const ctx = new AudioContext();
    player = createMumblePlayer(ctx, ctx.destination);
  }
  utterance = player.say(text, voice);
  if (!utterance) {
    readout.textContent = 'The engine cannot say that: it needs at least one word, 180 characters at most, and under 30 seconds of speech.';
    return;
  }
  startMs = performance.now();
  readout.textContent = `${utterance.plan.words.length} words · ${utterance.plan.duration.toFixed(2)} s · synth ${utterance.synthMs.toFixed(1)} ms · peak ${utterance.peak.toFixed(2)}`;
  for (const listener of speakListeners) listener(utterance, startMs);
};

const stop = (): void => {
  player?.stop();
  utterance = null;
  for (const listener of stopListeners) listener();
};

for (const preset of PRESET_LINES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = preset;
  button.addEventListener('click', () => {
    line.value = preset;
    say();
  });
  $('presets').append(button);
}

const refreshProfiles = (): void => {
  profileList.replaceChildren(...Object.keys(readProfiles()).map((name) => new Option(name, name)));
};

$('say').addEventListener('click', say);
$('stop').addEventListener('click', stop);
$('reset').addEventListener('click', () => {
  Object.assign(voice, DR_E_VOICE);
  syncControls();
});
$('copy').addEventListener('click', () => {
  json.textContent = snippet(voice);
  void navigator.clipboard?.writeText(json.textContent).catch(() => undefined);
});
$('profile-save').addEventListener('click', () => {
  const name = $<HTMLInputElement>('profile-name').value.trim();
  if (!name) return;
  writeProfiles({ ...readProfiles(), [name]: { ...voice } });
  refreshProfiles();
});
$('profile-load').addEventListener('click', () => {
  const saved = readProfiles()[profileList.value];
  if (!saved) return;
  Object.assign(voice, saved);
  syncControls();
});
$('profile-delete').addEventListener('click', () => {
  const profiles = readProfiles();
  delete profiles[profileList.value];
  writeProfiles(profiles);
  refreshProfiles();
});
line.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    say();
  }
});

const draw = (): void => {
  requestAnimationFrame(draw);
  const text = utterance?.text ?? line.value;
  const shown = utterance ? revealLengthAt(text, utterance.plan, (performance.now() - startMs) / 1000) : text.length;
  const head = text.slice(0, shown);
  if (shownEl.textContent !== head || hiddenEl.textContent !== text.slice(shown)) {
    shownEl.textContent = head;
    hiddenEl.textContent = text.slice(shown);
  }
};

syncControls();
refreshProfiles();
requestAnimationFrame(draw);
