// Dev-only look test (/drelook.html): every Dr. E direction at every slot size
// from spec §7, so Johnny can pick one. ?expr=<id> sets the expression, ?talk=1
// moves the mouth with a canned line, and ?t=<ms> freezes the clock for stills.
import { FACE_DIRECTIONS, FACE_EXPRESSIONS, type FaceDirectionId, type FaceExpressionId } from '../content/drETuning';
import { createDrEFace, type DrEFace } from '../ui/drEFace/faceRenderer';
import type { SpeechEnvelope } from '../ui/drEFace/faceModel';

// HUD (phone), coach (phone), coach (desktop), big moments.
const SIZES = [44, 72, 112, 256];
const AMPLITUDES = [1, 0.7, 0.9, 0.5, 1.1];
// A 2.5 s line of fourteen syllables, so the mouth can be judged without the voice engine.
const CANNED: SpeechEnvelope = {
  events: Array.from({ length: 14 }, (_, i) => ({ start: 0.08 + i * 0.17, duration: 0.2, amplitude: AMPLITUDES[i % AMPLITUDES.length]! })),
};
const LOOP_MS = 3200;

const params = new URLSearchParams(location.search);
const frozen = params.get('t');
const now = frozen === null ? undefined : () => Number(frozen);
const clock = now ?? (() => performance.now());
const requested = params.get('expr');
const expression: FaceExpressionId = requested && requested in FACE_EXPRESSIONS ? (requested as FaceExpressionId) : 'neutral';
let talking = params.get('talk') === '1';

const root = document.getElementById('look')!;
root.innerHTML = `
  <header class="lab-head">
    <h1>Dr. E look test</h1>
    <p>Four directions at the v1 slot sizes: HUD 44, phone coach 72, desktop coach 112, big moments 256. <span id="paint"></span></p>
  </header>
  <div id="controls" class="lab-actions"></div>
  <div id="rows"></div>`;

const faces: DrEFace[] = [];
const rows = document.getElementById('rows')!;
for (const id of Object.keys(FACE_DIRECTIONS) as FaceDirectionId[]) {
  const direction = FACE_DIRECTIONS[id];
  const row = document.createElement('section');
  row.className = 'look-row';
  const label = document.createElement('div');
  label.className = 'look-label';
  label.innerHTML = '<h2></h2><p></p>';
  label.querySelector('h2')!.textContent = direction.name;
  label.querySelector('p')!.textContent = direction.note;
  row.append(label);
  for (const size of SIZES) {
    const figure = document.createElement('figure');
    const canvas = document.createElement('canvas');
    canvas.className = 'dre-face';
    const caption = document.createElement('figcaption');
    caption.textContent = `${size}px`;
    figure.append(canvas, caption);
    row.append(figure);
    faces.push(createDrEFace(canvas, { direction: id, size, expression, now }));
  }
  rows.append(row);
}

const talk = (): void => {
  const start = clock() - (frozen === null ? 0 : 300);
  for (const face of faces) face.speak(CANNED, start);
};

const controls = document.getElementById('controls')!;
for (const id of Object.keys(FACE_EXPRESSIONS) as FaceExpressionId[]) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = id;
  button.addEventListener('click', () => { for (const face of faces) face.setExpression(id); });
  controls.append(button);
}
const talkButton = document.createElement('button');
talkButton.type = 'button';
talkButton.textContent = 'Talk';
talkButton.setAttribute('aria-pressed', String(talking));
talkButton.addEventListener('click', () => {
  talking = !talking;
  talkButton.setAttribute('aria-pressed', String(talking));
  if (talking) talk();
  else for (const face of faces) face.stopSpeaking();
});
controls.append(talkButton);

if (talking) talk();
window.setInterval(() => {
  if (talking && frozen === null) talk();
  const mean = faces.reduce((sum, face) => sum + face.paintMs(), 0) / faces.length;
  document.getElementById('paint')!.textContent = `Paint ${mean.toFixed(2)} ms per face.`;
}, LOOP_MS);
