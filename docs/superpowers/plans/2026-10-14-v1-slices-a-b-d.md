# v1 Slices A, B and D Implementation Plan (look test, voice, merge census)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first three v1 slices, which can run in parallel:

- **A:** Dr. E's cell-face renderer, plus a look-test sheet of four directions.
- **B:** a TypeScript port of the Z13 mumble voice, plus a Voice Lab page where Johnny tunes the voice.
- **D:** a merge census, measuring which groups of cultures already hold together in the shipped dishes.

**Architecture:**

- **The face.** A pure model rasterises a face (body, eyes, brows, mouth) onto a 40 × 40 grid. A canvas renderer animates it and paints it with the dish's bloom; that bloom code is extracted from `render.ts` so the two share it.
- **The voice.** The prototype engine is ported line for line into `src/audio/mumble.ts`, with a parity test against a vendored copy of `prototype-core.cjs`. A small Web Audio player and a word-reveal helper feed a dev-only Voice Lab page.
- **The census.** A pure contact-graph module (which later slice E reuses for merge detection) feeds a `vite-node` probe in the style of `scripts/dish-longevity.ts`.

**Tech Stack:** Vite 5, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), Vitest 2 (node environment), Playwright, Canvas 2D, Web Audio.

**Spec:** `docs/superpowers/specs/2026-10-14-friends-and-merges-design.md` (§7 Dr. E, §8.1–8.2 census and detection, §11 speech, §14 tunables, §15 slices A, B, D, §16 verification).

## Global Constraints

- Every tunable lives in a config object: `DR_E_VOICE` and `DR_E_FACE` in `src/content/drETuning.ts` (spec §14). No magic numbers inside the systems.
- Dr. E copy: one idea per bubble, 90 characters or fewer. The voice engine caps a line at 180 characters (spec §4).
- The voice is synthesised at runtime from the text, with no audio files. `plan()` must match `prototype-core.cjs` exactly (spec §11).
- Everything is cells: Dr. E is drawn on a cell grid with the dish's three-layer bloom, never as painted art (spec §3).
- Determinism: the same seed gives the same dish, and the same inputs and time give the same face raster (spec §3, §8.3).
- Platform stays open: the dev pages (`/drelook.html`, `/voicelab.html`) are never built into the game, because `vite build` uses only `index.html`. Game saves go through `runtimeStorage`. The Voice Lab's own presets are a dev-only exception (spec §1 Platform).
- Respect reduced motion; the keyboard can drive the Voice Lab (spec §1 Platform, §11).
- Repo conventions:
  - single quotes;
  - Vitest files in `tests/**`, Playwright specs in `e2e/`;
  - dev server via `npm run dev -- --port 5199 --strictPort` (5173 belongs to another project);
  - commit messages through a heredoc, sentence case, ending `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Coordination:** a wide-layout spike currently has uncommitted edits to `index.html`, `src/main.ts` and `src/wide-layout.css`. This plan touches none of those files. Task 2 edits `src/ui/render.ts`; rebase over the spike before starting it.

## Review Focus

1. **Script punctuation the prototype tokenizer ignores** (`…`, `—`, `–`, emoji, curly apostrophes). A reasonable person expects "Closer… closer…" to pause and to reveal cleanly, and emoji never to split. Pinned in Task 6 (`normalizeLine`) and Task 7 (reveal with `…` and emoji).
2. **Lines the engine cannot say** (empty, punctuation only, over 180 characters, too long at a slow pace). The expectation is a clear message and no crash or silent hang. Pinned in Task 8 (player returns `null`) and Task 9 (lab readout, e2e).
3. **Saying a new line while one is playing, or stopping mid-line.** The old voice must stop and never overlap, and the bubble must restart. Pinned in Task 8 (stops the previous source) and Task 9 (reveal restarts).
4. **Reduced motion, and a hidden tab, while the face runs.** The membrane should stop flickering and bouncing, the mouth should still move, and nothing should burn CPU in the background. Pinned in Task 3 (raster holds still under reduced motion). Task 4's `document.hidden` guard has no automated test, so Task 5 Step 5 checks it by hand.
5. **Census on dead, unlabelled or barely touching cultures** (volume 0, no archetype, a single diagonal pixel). These must not create contacts, or the census inflates "merges". Pinned in Task 11.

---

## File map

| File | Status | Responsibility |
| --- | --- | --- |
| `src/content/drETuning.ts` | Create | `DR_E_VOICE`, `DR_E_FACE`, `FACE_EXPRESSIONS`, `FACE_DIRECTIONS` and their types |
| `src/ui/render.ts` | Modify 122, 179–197 | Extract `drawBloomLayers()` so the dish and Dr. E share one bloom |
| `src/ui/drEFace/faceModel.ts` | Create | Pure: `rasterizeFace`, `blendFace`, `speechLevelAt`, `hash01`, part ids |
| `src/ui/drEFace/faceRenderer.ts` | Create | `createDrEFace(canvas, options)`: animation loop, paint, bloom |
| `drelook.html`, `src/dev/drELook.ts`, `src/dev/devLab.css` | Create | Look-test page (dev only) |
| `scripts/capture-dre-look.mjs` | Create | Screenshots the look test to `docs/assets/dre/` |
| `tests/fixtures/mumble/prototype-core.cjs` | Create (verbatim copy) | Reference engine for parity tests |
| `src/audio/mumble.ts` | Create | Engine port: `plan`, `synthesize`, `wordPattern`, `mumbleHash`, `normalizeLine` |
| `src/audio/mumblePlayer.ts` | Create | `createMumblePlayer(ctx, destination)`: one line at a time through Web Audio |
| `src/ui/speechReveal.ts` | Create | `revealLengthAt(text, plan, t)`: how much of a line is visible |
| `voicelab.html`, `src/dev/voiceLab.ts` | Create | Voice Lab (dev only) |
| `src/game/contactGraph.ts` | Create | Pure: contact graph, components, connected subsets, canonical shapes |
| `scripts/merge-census.ts` | Create | The census probe |
| `docs/v1/merge-census.md`, `docs/v1/merge-census.json` | Create | Census report and raw data |
| Tests | Create | `tests/content/drETuning.test.ts`, `tests/ui/drEFaceModel.test.ts`, `tests/audio/mumble.test.ts`, `tests/audio/mumblePlayer.test.ts`, `tests/ui/speechReveal.test.ts`, `tests/game/contactGraph.test.ts`, `e2e/dev-labs.spec.ts` |

**Lanes:** Task 1 first. Then three lanes can run in parallel:

- Lane A: Tasks 2 → 3 → 4 → 5.
- Lane B: Tasks 6 → 7 → 8 → 9.
- Lane D: Tasks 11 → 12 → 13. Lane D does not need Task 1.

Task 10 waits for Tasks 4 and 9.

**Who does what:**

- **Exact-spec** tasks are safe to hand to a cheaper subagent, with the main model reviewing the diff: 1, 2, 4, 6, 7, 8, 9, 10, 11, 12.
- **Judgment** tasks stay with the main model: 3 (the face's look), the review step of 5, and 13 (reading the census and proposing forms).

---

### Task 1: Dr. E tuning config — exact-spec

**Files:**
- Create: `src/content/drETuning.ts`
- Test: `tests/content/drETuning.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - types `MumbleVoiceId`, `DrEVoice`, `FaceExpressionId`, `FaceDirectionId`, `FaceParams`, `FaceDirection`, `DrEFaceTuning`;
  - constants `DR_E_VOICE`, `DR_E_FACE`, `FACE_EXPRESSIONS`, `FACE_DIRECTIONS`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/content/drETuning.test.ts
import { describe, expect, it } from 'vitest';
import { DR_E_FACE, DR_E_VOICE, FACE_DIRECTIONS, FACE_EXPRESSIONS } from '../../src/content/drETuning';

describe('Dr. E tuning', () => {
  it('keeps the voice inside the mumble engine ranges', () => {
    expect(['bog', 'glass', 'rust', 'bubble']).toContain(DR_E_VOICE.voice);
    expect(DR_E_VOICE.pitch).toBeGreaterThanOrEqual(-12);
    expect(DR_E_VOICE.pitch).toBeLessThanOrEqual(12);
    expect(DR_E_VOICE.pace).toBeGreaterThanOrEqual(0.65);
    expect(DR_E_VOICE.pace).toBeLessThanOrEqual(1.5);
    expect(DR_E_VOICE.weird).toBeGreaterThanOrEqual(0);
    expect(DR_E_VOICE.weird).toBeLessThanOrEqual(1);
    expect(DR_E_VOICE.gain).toBeGreaterThanOrEqual(0);
    expect(DR_E_VOICE.gain).toBeLessThanOrEqual(1);
  });

  it('defines the six v1 expressions with finite face parameters', () => {
    expect(Object.keys(FACE_EXPRESSIONS).sort()).toEqual(['delighted', 'happy', 'neutral', 'surprised', 'thinking', 'worried']);
    for (const params of Object.values(FACE_EXPRESSIONS)) {
      for (const value of Object.values(params)) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('defines four look-test directions with valid colours', () => {
    expect(Object.keys(FACE_DIRECTIONS).sort()).toEqual(['blob', 'colony', 'loupe', 'merge']);
    for (const [id, direction] of Object.entries(FACE_DIRECTIONS)) {
      expect(direction.id).toBe(id);
      const colours = [direction.body, direction.eye, direction.pupil, direction.mouth, direction.cheek, direction.brow, direction.lens];
      for (const colour of colours) {
        if (colour === null) continue;
        for (const channel of colour) expect(channel >= 0 && channel <= 255).toBe(true);
      }
    }
  });

  it('keeps blink and grid settings sane', () => {
    expect(DR_E_FACE.gridSize).toBeGreaterThanOrEqual(24);
    expect(DR_E_FACE.blinkMinMs).toBeLessThan(DR_E_FACE.blinkMaxMs);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npx vitest run tests/content/drETuning.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/content/drETuning".

- [ ] **Step 3: Write the config**

```ts
// src/content/drETuning.ts
// Dr. E's hand-tuned settings: his mumble voice and his cell face. Johnny tunes
// the voice in /voicelab.html and judges the face in /drelook.html; the game
// reads only these objects, so retuning never means hunting through code.

export type MumbleVoiceId = 'bog' | 'glass' | 'rust' | 'bubble';

export interface DrEVoice {
  voice: MumbleVoiceId;
  pitch: number; // semitones, -12..12
  pace: number; // 0.65..1.5
  weird: number; // 0..1
  gain: number; // 0..1
}

// A starting point until Johnny tunes it in the Voice Lab.
export const DR_E_VOICE: DrEVoice = { voice: 'bubble', pitch: 3, pace: 1.1, weird: 0.6, gain: 0.8 };

export type FaceExpressionId = 'neutral' | 'happy' | 'delighted' | 'surprised' | 'worried' | 'thinking';
export type FaceDirectionId = 'merge' | 'blob' | 'loupe' | 'colony';

/** Face geometry in fractions of the face grid's width; y grows downward. */
export interface FaceParams {
  bodyRadius: number;
  squash: number; // +0.1 = 10% wider and 10% shorter
  eyeSpacing: number; // each eye's horizontal distance from the centre
  eyeY: number; // eye centre relative to the face centre
  eyeRadius: number;
  eyeOpen: number; // 0 shut .. 1 open
  pupilX: number; // look direction, -1..1 of the pupil's travel
  pupilY: number;
  browLift: number; // 0 resting .. 1 raised
  browTilt: number; // -1 worried (inner ends up) .. 1 cross (inner ends down)
  mouthY: number;
  mouthWidth: number; // half-width
  mouthCurve: number; // -1 frown .. 1 smile
  mouthOpen: number; // 0 closed .. 1 wide
  cheeks: number; // 0..1 blush cells
}

const NEUTRAL: FaceParams = {
  bodyRadius: 0.36, squash: 0, eyeSpacing: 0.14, eyeY: -0.07, eyeRadius: 0.075, eyeOpen: 1,
  pupilX: 0, pupilY: 0, browLift: 0, browTilt: 0,
  mouthY: 0.14, mouthWidth: 0.1, mouthCurve: 0.25, mouthOpen: 0, cheeks: 0,
};

export const FACE_EXPRESSIONS: Record<FaceExpressionId, FaceParams> = {
  neutral: NEUTRAL,
  happy: { ...NEUTRAL, eyeOpen: 0.85, mouthWidth: 0.13, mouthCurve: 0.8, cheeks: 0.4 },
  delighted: { ...NEUTRAL, squash: 0.06, eyeOpen: 0.55, browLift: 0.4, mouthWidth: 0.15, mouthCurve: 1, mouthOpen: 0.45, cheeks: 1 },
  surprised: { ...NEUTRAL, squash: -0.06, eyeRadius: 0.095, browLift: 1, mouthWidth: 0.06, mouthCurve: 0, mouthOpen: 0.7 },
  worried: { ...NEUTRAL, eyeOpen: 0.9, pupilY: 0.3, browLift: 0.3, browTilt: -1, mouthWidth: 0.08, mouthCurve: -0.6 },
  thinking: { ...NEUTRAL, eyeOpen: 0.75, pupilX: 0.6, pupilY: -0.5, browTilt: 0.5, mouthWidth: 0.06, mouthCurve: -0.1 },
};

type Rgb = [number, number, number];

export interface FaceDirection {
  id: FaceDirectionId;
  name: string; // label on the look sheet
  note: string; // one line under the label
  body: Rgb;
  eye: Rgb;
  pupil: Rgb;
  mouth: Rgb;
  cheek: Rgb;
  brow: Rgb | null; // null: no brows
  lens: Rgb | null; // non-null: the right eye is a big glass lens with this rim
  eyeScale: number; // eye size relative to FaceParams.eyeRadius
  eyeLift: number; // raises the eyes toward the rim (fused-on eye cells)
  bodyCells: number; // >1 splits the body into this many fused sub-cells
}

export const FACE_DIRECTIONS: Record<FaceDirectionId, FaceDirection> = {
  merge: {
    id: 'merge', name: 'The merge he is', note: 'Green body, two red cells fused on as eyes: the shape from the title dish.',
    body: [72, 226, 112], eye: [255, 78, 164], pupil: [12, 18, 20], mouth: [10, 24, 16], cheek: [255, 140, 170],
    brow: null, lens: null, eyeScale: 1.6, eyeLift: 0.1, bodyCells: 1,
  },
  blob: {
    id: 'blob', name: 'Single-cell blob', note: 'One soft culture; the eyes and mouth are gaps in its membrane.',
    body: [91, 233, 214], eye: [4, 8, 10], pupil: [220, 255, 250], mouth: [4, 8, 10], cheek: [255, 170, 120],
    brow: [40, 140, 130], lens: null, eyeScale: 1, eyeLift: 0, bodyCells: 1,
  },
  loupe: {
    id: 'loupe', name: 'The loupe', note: 'The blob with one big glass lens for an eye, the old Dr. E\'s signature.',
    body: [91, 233, 214], eye: [4, 8, 10], pupil: [220, 255, 250], mouth: [4, 8, 10], cheek: [255, 170, 120],
    brow: [40, 140, 130], lens: [240, 195, 90], eyeScale: 1, eyeLift: 0, bodyCells: 1,
  },
  colony: {
    id: 'colony', name: 'Colony face', note: 'Several fused cells make one creature, like a Pokémon made of bubbles.',
    body: [132, 113, 255], eye: [230, 240, 255], pupil: [12, 18, 20], mouth: [40, 20, 70], cheek: [255, 140, 190],
    brow: null, lens: null, eyeScale: 1.2, eyeLift: 0, bodyCells: 6,
  },
};

export interface DrEFaceTuning {
  gridSize: number; // face grid cells across
  wobble: number; // membrane rim wobble, fraction of the radius
  wobbleHz: number;
  flicker: number; // chance an edge pixel flips each flicker step
  flickerMs: number;
  shimmer: number; // interior brightness variation, 0..1
  blinkMinMs: number;
  blinkMaxMs: number;
  blinkMs: number;
  breathHz: number;
  breathSquash: number;
  talkMouthGain: number; // how far a full-volume syllable opens the mouth
  talkBounce: number; // squash added by a full-volume syllable
  blendMs: number; // expression change time
}

export const DR_E_FACE: DrEFaceTuning = {
  gridSize: 40, wobble: 0.04, wobbleHz: 0.5, flicker: 0.12, flickerMs: 90, shimmer: 0.08,
  blinkMinMs: 2000, blinkMaxMs: 6000, blinkMs: 140, breathHz: 0.25, breathSquash: 0.02,
  talkMouthGain: 0.9, talkBounce: 0.05, blendMs: 150,
};
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run tests/content/drETuning.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/content/drETuning.ts tests/content/drETuning.test.ts
git commit -F - <<'EOF'
Add Dr. E's voice and face tuning config

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Shared bloom helper — exact-spec

**Files:**
- Modify: `src/ui/render.ts`: remove line 122 (`const supportsCanvasFilter = …`), replace lines 179–197 (the three bloom draws after `ctx.drawImage(agarFor(...))` at line 178), and add the helper.
- Test: the existing suite plus a screenshot check (the bloom is visual, and the node environment has no canvas).

**Interfaces:**
- Produces: `drawBloomLayers(ctx: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number, additive: boolean): void`.

- [ ] **Step 1: Capture a before screenshot**

With the dev server on 5199, take a Playwright (or browser) screenshot of `http://localhost:5199/` at 1440 × 900, 3 s after pressing Escape to skip the ident. Keep it for Step 5.

- [ ] **Step 2: Add the helper above `createRenderer` in `src/ui/render.ts`**

```ts
/** The dish's bloom: a blurred glow underlay, the crisp cell pixels on top,
 *  then a faint additive glow. `source` is the grid-sized image; the dish and
 *  Dr. E's face both paint through here so they share one light. */
export function drawBloomLayers(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  additive: boolean,
): void {
  const supportsFilter = typeof ctx.filter === 'string';
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  if (supportsFilter) ctx.filter = `blur(${Math.max(3, width / 90)}px)`;
  ctx.globalAlpha = 0.9;
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, width, height);

  if (additive) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    if (supportsFilter) ctx.filter = `blur(${Math.max(2, width / 160)}px)`;
    ctx.globalAlpha = 0.18;
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();
  }
}
```

- [ ] **Step 3: Use it in `render()`**

Replace lines 179–197 with one call, keeping the agar line above it:

```ts
      ctx.drawImage(agarFor(canvas.width, canvas.height), 0, 0);
      drawBloomLayers(ctx, offscreen!, canvas.width, canvas.height, additiveBloom);
```

Delete line 122 (`const supportsCanvasFilter = typeof ctx.filter === 'string';`), which is now unused; `noUnusedLocals` would fail on it.

- [ ] **Step 4: Run the suite and the type check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass (824 at the time of writing, plus Task 1's); `tsc` exits 0.

- [ ] **Step 5: Check the running game**

Hard-refresh `http://localhost:5199/` and take the after screenshot the same way. Compare it with Step 1: the title dish's glow must look the same (same blur radius and brightness). The canvas pixels need not match exactly, because the dish is seeded from the clock.

- [ ] **Step 6: Commit**

```bash
git add src/ui/render.ts
git commit -F - <<'EOF'
Share the dish's bloom layers through one helper

Dr. E's cell face will paint through drawBloomLayers so he is made of
the same light as the cultures. The dish renders exactly as before.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Face model (raster, blend, speech level) — judgment (main model)

**Files:**
- Create: `src/ui/drEFace/faceModel.ts`
- Test: `tests/ui/drEFaceModel.test.ts`

**Interfaces:**
- Consumes: `FaceDirection`, `FaceParams`, `DrEFaceTuning` (Task 1).
- Produces:
  - `PART` (`empty`, `body`, `eye`, `pupil`, `mouth`, `brow`, `cheek`, `lens`) and `BODY_CELL_BASE = 16`;
  - `hash01(x, y, step): number`;
  - `blendFace(a, b, t): FaceParams`;
  - `interface SpeechEnvelope { events: ReadonlyArray<{ start: number; duration: number; amplitude: number }> }`;
  - `speechLevelAt(speech, tSec): number`;
  - `rasterizeFace(direction, params, tuning, timeMs, reducedMotion): Uint8Array`. The face grid is row-major, index `y * N + x`. That differs from the sim grid, which is x-major.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/ui/drEFaceModel.test.ts
import { describe, expect, it } from 'vitest';
import { DR_E_FACE, FACE_DIRECTIONS, FACE_EXPRESSIONS } from '../../src/content/drETuning';
import { BODY_CELL_BASE, PART, blendFace, rasterizeFace, speechLevelAt } from '../../src/ui/drEFace/faceModel';

const N = DR_E_FACE.gridSize;
const count = (grid: Uint8Array, test: (part: number) => boolean) => grid.reduce((n, part) => n + (test(part) ? 1 : 0), 0);
const neutral = FACE_EXPRESSIONS.neutral;

describe('Dr. E face model', () => {
  it('draws a body of roughly the configured area', () => {
    const grid = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    expect(grid.length).toBe(N * N);
    const area = Math.PI * (neutral.bodyRadius * N) ** 2;
    const filled = count(grid, (p) => p !== PART.empty);
    expect(filled).toBeGreaterThan(area * 0.85);
    expect(filled).toBeLessThan(area * 1.15);
  });

  it('shuts the eyes when eyeOpen is 0', () => {
    const grid = rasterizeFace(FACE_DIRECTIONS.blob, { ...neutral, eyeOpen: 0 }, DR_E_FACE, 0, true);
    expect(count(grid, (p) => p === PART.eye)).toBe(0);
    expect(count(grid, (p) => p === PART.pupil)).toBeGreaterThan(0);
  });

  it('opens the mouth wider as mouthOpen rises', () => {
    const closed = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    const open = rasterizeFace(FACE_DIRECTIONS.blob, { ...neutral, mouthOpen: 1 }, DR_E_FACE, 0, true);
    expect(count(open, (p) => p === PART.mouth)).toBeGreaterThan(3 * count(closed, (p) => p === PART.mouth));
  });

  it('is deterministic for the same inputs and time', () => {
    const a = rasterizeFace(FACE_DIRECTIONS.merge, FACE_EXPRESSIONS.happy, DR_E_FACE, 1234, false);
    const b = rasterizeFace(FACE_DIRECTIONS.merge, FACE_EXPRESSIONS.happy, DR_E_FACE, 1234, false);
    expect(a).toEqual(b);
  });

  it('holds the membrane still under reduced motion', () => {
    const a = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    const b = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 5000, true);
    expect(a).toEqual(b);
  });

  it('flickers only at the membrane, never the features', () => {
    const a = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, false);
    const b = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 900, false);
    const changed = a.reduce((n, part, i) => n + (part !== b[i] ? 1 : 0), 0);
    const body = count(a, (p) => p === PART.body);
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(body * 0.25);
    const features = (g: Uint8Array) => count(g, (p) => p === PART.eye || p === PART.pupil || p === PART.mouth);
    expect(features(b)).toBe(features(a));
  });

  it('gives the loupe direction a lens ring and the blob none', () => {
    const loupe = rasterizeFace(FACE_DIRECTIONS.loupe, neutral, DR_E_FACE, 0, true);
    const blob = rasterizeFace(FACE_DIRECTIONS.blob, neutral, DR_E_FACE, 0, true);
    expect(count(loupe, (p) => p === PART.lens)).toBeGreaterThan(0);
    expect(count(blob, (p) => p === PART.lens)).toBe(0);
  });

  it('splits the colony body into its sub-cells', () => {
    const grid = rasterizeFace(FACE_DIRECTIONS.colony, neutral, DR_E_FACE, 0, true);
    const ids = new Set([...grid].filter((p) => p >= BODY_CELL_BASE));
    expect(ids.size).toBe(FACE_DIRECTIONS.colony.bodyCells);
  });

  it('opens the mouth with each syllable and closes between them', () => {
    const speech = { events: [{ start: 1, duration: 0.5, amplitude: 1 }, { start: 2, duration: 0.5, amplitude: 1.2 }] };
    expect(speechLevelAt(speech, 0.9)).toBe(0);
    expect(speechLevelAt(speech, 1.2)).toBeGreaterThan(0.99);
    expect(speechLevelAt(speech, 1.6)).toBe(0);
    expect(speechLevelAt(speech, 2.2)).toBe(1);
  });

  it('blends between expressions', () => {
    const mid = blendFace(FACE_EXPRESSIONS.neutral, FACE_EXPRESSIONS.surprised, 0.5);
    expect(mid.browLift).toBeCloseTo(0.5);
    expect(blendFace(FACE_EXPRESSIONS.neutral, FACE_EXPRESSIONS.surprised, 1)).toEqual(FACE_EXPRESSIONS.surprised);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/ui/drEFaceModel.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/ui/drEFace/faceModel".

- [ ] **Step 3: Write the model**

```ts
// src/ui/drEFace/faceModel.ts
// Dr. E's face as cells: a parametric face (body, eyes, brows, mouth) is laid
// onto a small grid every frame, then roughened at the membrane so he reads
// as a living culture. Pure: the same inputs and time give the same grid.
// The grid is row-major (y * N + x), unlike the sim grid, which is x-major.
import type { DrEFaceTuning, FaceDirection, FaceParams } from '../../content/drETuning';

export const PART = { empty: 0, body: 1, eye: 2, pupil: 3, mouth: 4, brow: 5, cheek: 6, lens: 7 } as const;
// Colony sub-cells use ids from here upward.
export const BODY_CELL_BASE = 16;

export interface SpeechEnvelope {
  events: ReadonlyArray<{ start: number; duration: number; amplitude: number }>;
}

export function hash01(x: number, y: number, step: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(step | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function blendFace(a: FaceParams, b: FaceParams, t: number): FaceParams {
  if (t >= 1) return b;
  const k = Math.max(0, t);
  const out = { ...a };
  for (const key of Object.keys(a) as Array<keyof FaceParams>) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/** How open the mouth is `tSec` into a line: the voice's own syllable
 *  envelope (prototype-core.cjs), so lips and sound rise and fall together. */
export function speechLevelAt(speech: SpeechEnvelope, tSec: number): number {
  let level = 0;
  for (const e of speech.events) {
    if (tSec < e.start || tSec >= e.start + e.duration) continue;
    const x = (tSec - e.start) / e.duration;
    const envelope = Math.sin((Math.PI * Math.min(1, x / 0.16)) / 2) * Math.sin((Math.PI * Math.min(1, (1 - x) / 0.3)) / 2);
    level = Math.max(level, envelope * e.amplitude);
  }
  return Math.min(1, level);
}

const isBody = (part: number): boolean => part === PART.body || part >= BODY_CELL_BASE;

function colonySeeds(cells: number, radius: number): Array<[number, number]> {
  if (cells <= 1) return [];
  const seeds: Array<[number, number]> = [[0, radius * 0.05]];
  for (let j = 0; j < cells - 1; j++) {
    const angle = (2 * Math.PI * j) / (cells - 1) + 0.5;
    seeds.push([Math.cos(angle) * radius * 0.55, Math.sin(angle) * radius * 0.55]);
  }
  return seeds;
}

export function rasterizeFace(
  direction: FaceDirection,
  params: FaceParams,
  tuning: DrEFaceTuning,
  timeMs: number,
  reducedMotion: boolean,
): Uint8Array {
  const N = tuning.gridSize;
  const grid = new Uint8Array(N * N);
  const c = (N - 1) / 2;
  const sx = 1 + params.squash;
  const sy = 1 - params.squash;
  const R = params.bodyRadius * N;
  const w = reducedMotion ? 0 : (2 * Math.PI * tuning.wobbleHz * timeMs) / 1000;
  const set = (x: number, y: number, part: number, onlyOnBody = false): void => {
    const gx = Math.round(x);
    const gy = Math.round(y);
    if (gx < 0 || gx >= N || gy < 0 || gy >= N) return;
    if (onlyOnBody && !isBody(grid[gy * N + gx]!)) return;
    grid[gy * N + gx] = part;
  };
  const disc = (cx: number, cy: number, rx: number, ry: number, part: number, onlyOnBody = false): void => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (((x - cx) / Math.max(rx, 0.5)) ** 2 + ((y - cy) / Math.max(ry, 0.5)) ** 2 <= 1) set(x, y, part, onlyOnBody);
      }
    }
  };

  // Body: a squashed disc whose rim wobbles slowly like a membrane.
  const seeds = colonySeeds(direction.bodyCells, R);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x - c) / sx;
      const dy = (y - c) / sy;
      const angle = Math.atan2(dy, dx);
      const rim = R * (1 + tuning.wobble * (0.6 * Math.sin(3 * angle + w) + 0.4 * Math.sin(5 * angle - 1.3 * w)));
      if (Math.hypot(dx, dy) > rim) continue;
      let part: number = PART.body;
      if (seeds.length > 1) {
        let best = 0;
        for (let i = 1; i < seeds.length; i++) {
          if (Math.hypot(dx - seeds[i]![0], dy - seeds[i]![1]) < Math.hypot(dx - seeds[best]![0], dy - seeds[best]![1])) best = i;
        }
        part = BODY_CELL_BASE + best;
      }
      grid[y * N + x] = part;
    }
  }

  // Mouth: a curve (smile or frown) that opens downward as he speaks.
  const my = c + params.mouthY * N * sy;
  const mw = params.mouthWidth * N * sx;
  const opening = Math.max(0, Math.min(1, params.mouthOpen)) * mw * 0.9;
  for (let x = -mw; x <= mw; x += 0.5) {
    const k = 1 - (x / mw) ** 2;
    const top = my + params.mouthCurve * k * mw * 0.45;
    const depth = Math.max(1, opening * k);
    for (let y = 0; y < depth; y += 0.5) set(c + x, top + y, PART.mouth);
  }

  // Eyes, brows and cheeks (the loupe direction makes the right eye a lens).
  const open = Math.max(0, Math.min(1, params.eyeOpen));
  for (const side of [-1, 1] as const) {
    const lens = direction.lens !== null && side === 1;
    const ex = c + side * params.eyeSpacing * N * sx;
    const ey = c + (params.eyeY - direction.eyeLift) * N * sy;
    const er = params.eyeRadius * N * direction.eyeScale * (lens ? 1.8 : 1);
    if (lens) disc(ex, ey, er, er, PART.lens);
    const inner = lens ? er - 1.5 : er;
    if (open < 0.15) {
      for (let x = ex - inner; x <= ex + inner; x += 0.5) set(x, ey, PART.pupil);
    } else {
      disc(ex, ey, inner, inner * open, PART.eye);
      const pr = inner * 0.45;
      disc(ex + params.pupilX * pr, ey + params.pupilY * pr * open, pr, pr * open, PART.pupil);
    }
    if (direction.brow) {
      const half = er * 1.1;
      const by = ey - er * open - 1.5 - params.browLift * 2.5;
      for (let u = -1; u <= 1; u += 1 / Math.max(2, half * 2)) {
        const x = ex + side * u * half;
        const y = by + params.browTilt * ((1 - u) / 2) * er * 0.8;
        set(x, y, PART.brow);
        set(x, y + 1, PART.brow);
      }
    }
    if (params.cheeks > 0) {
      disc(ex + side * er * 0.6, (ey + my) / 2 + 1, 1 + params.cheeks * 1.5, 1 + params.cheeks, PART.cheek, true);
    }
  }

  // Membrane flicker: edge pixels drop out and bud on a slow random beat.
  if (!reducedMotion && tuning.flicker > 0) {
    const step = Math.floor(timeMs / tuning.flickerMs);
    const before = grid.slice();
    const at = (x: number, y: number): number => (x >= 0 && x < N && y >= 0 && y < N ? before[y * N + x]! : PART.empty);
    const sides: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const part = before[y * N + x]!;
        if (isBody(part)) {
          if (sides.some(([dx, dy]) => at(x + dx, y + dy) === PART.empty) && hash01(x, y, step) < tuning.flicker) grid[y * N + x] = PART.empty;
        } else if (part === PART.empty) {
          const neighbour = sides.map(([dx, dy]) => at(x + dx, y + dy)).find(isBody);
          if (neighbour !== undefined && hash01(x + 101, y + 31, step) < tuning.flicker * 0.5) grid[y * N + x] = neighbour;
        }
      }
    }
  }
  return grid;
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/ui/drEFaceModel.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` exits 0. If a geometry bound fails (body area, colony count), adjust geometry constants in `rasterizeFace` (seed radius, feature sizes), not the test bounds. The bounds encode the spec's "reads as a round culture".

- [ ] **Step 5: Commit**

```bash
git add src/ui/drEFace/faceModel.ts tests/ui/drEFaceModel.test.ts
git commit -F - <<'EOF'
Draw Dr. E's face as cells on a small grid

A parametric face (body, eyes, brows, mouth, cheeks) rasterised onto a
40-cell grid with a wobbling, flickering membrane, plus expression
blending and a mouth level that follows the voice's syllables.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Face renderer (canvas loop) — exact-spec

**Files:**
- Create: `src/ui/drEFace/faceRenderer.ts`
- Test: covered by the e2e check in Task 5. The node test environment has no canvas.

**Interfaces:**
- Consumes:
  - `drawBloomLayers` (Task 2);
  - `rasterizeFace`, `blendFace`, `speechLevelAt`, `hash01`, `PART`, `BODY_CELL_BASE`, `SpeechEnvelope` (Task 3);
  - `DR_E_FACE`, `FACE_DIRECTIONS`, `FACE_EXPRESSIONS` (Task 1).
- Produces:
  - `createDrEFace(canvas: HTMLCanvasElement, options: DrEFaceOptions): DrEFace`;
  - `interface DrEFaceOptions { direction: FaceDirectionId; size: number; expression?: FaceExpressionId; tuning?: DrEFaceTuning; now?: () => number; reducedMotion?: boolean; additiveBloom?: boolean }`;
  - `interface DrEFace { setExpression(id: FaceExpressionId): void; setDirection(id: FaceDirectionId): void; setSize(cssPx: number): void; speak(speech: SpeechEnvelope, startMs: number): void; stopSpeaking(): void; paintMs(): number; destroy(): void }`.
  - After its first paint, the canvas carries `data-drawn="1"`.

- [ ] **Step 1: Write the renderer**

```ts
// src/ui/drEFace/faceRenderer.ts
// Draws Dr. E into a canvas: blends expressions, blinks, breathes and moves
// his mouth with a speech plan, then paints the face grid through the dish's
// bloom so he is made of the same light as the cultures.
import {
  DR_E_FACE, FACE_DIRECTIONS, FACE_EXPRESSIONS,
  type DrEFaceTuning, type FaceDirection, type FaceDirectionId, type FaceExpressionId, type FaceParams,
} from '../../content/drETuning';
import { drawBloomLayers } from '../render';
import { BODY_CELL_BASE, PART, blendFace, hash01, rasterizeFace, speechLevelAt, type SpeechEnvelope } from './faceModel';

export interface DrEFaceOptions {
  direction: FaceDirectionId;
  size: number; // CSS pixels across
  expression?: FaceExpressionId;
  tuning?: DrEFaceTuning;
  /** Milliseconds; defaults to performance.now. Stills pass a fixed clock. */
  now?: () => number;
  reducedMotion?: boolean;
  additiveBloom?: boolean;
}

export interface DrEFace {
  setExpression(id: FaceExpressionId): void;
  setDirection(id: FaceDirectionId): void;
  setSize(cssPx: number): void;
  /** Move the mouth with `speech`, whose time 0 is `startMs` on the face's clock. */
  speak(speech: SpeechEnvelope, startMs: number): void;
  stopSpeaking(): void;
  /** Rolling average paint time in milliseconds (spec budget: under 1 ms). */
  paintMs(): number;
  destroy(): void;
}

type Rgb = readonly [number, number, number];

function shade(colour: Rgb, k: number): Rgb {
  const target = k >= 0 ? 255 : 0;
  const a = Math.abs(k);
  return [colour[0] + (target - colour[0]) * a, colour[1] + (target - colour[1]) * a, colour[2] + (target - colour[2]) * a];
}

function partColour(direction: FaceDirection, part: number): Rgb | null {
  if (part === PART.empty) return null;
  if (part >= BODY_CELL_BASE) return shade(direction.body, (((part - BODY_CELL_BASE) % 3) - 1) * 0.12);
  switch (part) {
    case PART.eye: return direction.eye;
    case PART.pupil: return direction.pupil;
    case PART.mouth: return direction.mouth;
    case PART.brow: return direction.brow ?? direction.body;
    case PART.cheek: return direction.cheek;
    case PART.lens: return direction.lens ?? direction.eye;
    default: return direction.body;
  }
}

export function createDrEFace(canvas: HTMLCanvasElement, options: DrEFaceOptions): DrEFace {
  const tuning = options.tuning ?? DR_E_FACE;
  const now = options.now ?? (() => performance.now());
  const reducedMotion = options.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const additive = options.additiveBloom !== false;
  const N = tuning.gridSize;
  const ctx = canvas.getContext('2d')!;
  const grid = document.createElement('canvas');
  grid.width = N;
  grid.height = N;
  const gridCtx = grid.getContext('2d')!;
  const image = gridCtx.createImageData(N, N);

  let direction = FACE_DIRECTIONS[options.direction];
  let from: FaceParams = FACE_EXPRESSIONS[options.expression ?? 'neutral'];
  let to: FaceParams = from;
  let blendStart = now();
  let speech: SpeechEnvelope | null = null;
  let speechStart = 0;
  let blinkSeed = 1;
  let blinkStart = Number.NEGATIVE_INFINITY;
  let nextBlink = now() + tuning.blinkMinMs;
  let averagePaint = 0;
  let raf = 0;

  const setSize = (cssPx: number): void => {
    const pxPerCell = Math.max(1, Math.round((cssPx * (window.devicePixelRatio || 1)) / N));
    canvas.width = N * pxPerCell;
    canvas.height = N * pxPerCell;
    canvas.style.width = `${cssPx}px`;
    canvas.style.height = `${cssPx}px`;
  };

  const paint = (cells: Uint8Array, t: number): void => {
    const data = image.data;
    const step = Math.floor(t / tuning.flickerMs);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const part = cells[i]!;
        const colour = partColour(direction, part);
        const o = i * 4;
        if (!colour) {
          data[o + 3] = 0;
          continue;
        }
        const edge = (x > 0 && cells[i - 1] !== part) || (x < N - 1 && cells[i + 1] !== part)
          || (y > 0 && cells[i - N] !== part) || (y < N - 1 && cells[i + N] !== part);
        let rgb: Rgb = edge ? shade(colour, 0.3) : colour;
        if (!edge && !reducedMotion && (part === PART.body || part >= BODY_CELL_BASE)) {
          rgb = shade(rgb, -tuning.shimmer * hash01(x, y, step));
        }
        data[o] = rgb[0];
        data[o + 1] = rgb[1];
        data[o + 2] = rgb[2];
        data[o + 3] = 255;
      }
    }
    gridCtx.putImageData(image, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBloomLayers(ctx, grid, canvas.width, canvas.height, additive);
    canvas.dataset.drawn = '1';
  };

  const frame = (): void => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const began = performance.now();
    const t = now();
    const p = { ...blendFace(from, to, (t - blendStart) / tuning.blendMs) };
    if (!reducedMotion) p.squash += tuning.breathSquash * Math.sin((2 * Math.PI * tuning.breathHz * t) / 1000);
    if (t >= nextBlink) {
      blinkStart = t;
      blinkSeed += 1;
      nextBlink = t + tuning.blinkMinMs + hash01(blinkSeed, 7, 3) * (tuning.blinkMaxMs - tuning.blinkMinMs);
    }
    const blink = (t - blinkStart) / tuning.blinkMs;
    if (blink >= 0 && blink < 1) p.eyeOpen *= Math.abs(1 - 2 * blink);
    if (speech) {
      const level = speechLevelAt(speech, (t - speechStart) / 1000);
      p.mouthOpen = Math.min(1, p.mouthOpen + tuning.talkMouthGain * level);
      if (!reducedMotion) p.squash += tuning.talkBounce * level;
    }
    paint(rasterizeFace(direction, p, tuning, t, reducedMotion), t);
    averagePaint = averagePaint * 0.9 + (performance.now() - began) * 0.1;
  };

  setSize(options.size);
  raf = requestAnimationFrame(frame);

  return {
    setExpression(id) {
      const t = now();
      from = blendFace(from, to, (t - blendStart) / tuning.blendMs);
      to = FACE_EXPRESSIONS[id];
      blendStart = t;
    },
    setDirection(id) {
      direction = FACE_DIRECTIONS[id];
    },
    setSize,
    speak(next, startMs) {
      speech = next;
      speechStart = startMs;
    },
    stopSpeaking() {
      speech = null;
    },
    paintMs: () => averagePaint,
    destroy() {
      cancelAnimationFrame(raf);
    },
  };
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/ui/drEFace/faceRenderer.ts
git commit -F - <<'EOF'
Animate and paint Dr. E's cell face with the dish's bloom

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Look-test page and sheet — exact-spec build, judgment review

**Files:**
- Create: `drelook.html`, `src/dev/drELook.ts`, `src/dev/devLab.css`, `scripts/capture-dre-look.mjs`, `e2e/dev-labs.spec.ts`
- Output: `docs/assets/dre/look-test-neutral.png`, `docs/assets/dre/look-test-talking.png`

**Interfaces:**
- Consumes: `createDrEFace`, `DrEFace` (Task 4); `SpeechEnvelope` (Task 3); `FACE_DIRECTIONS`, `FACE_EXPRESSIONS` (Task 1).
- Produces:
  - the page at `/drelook.html` (dev server only), which takes the query parameters `?expr=<id>`, `?talk=1` and `?t=<ms>` (a frozen clock);
  - canvases with the class `dre-face`;
  - `e2e/dev-labs.spec.ts`, which Task 9 extends.

- [ ] **Step 1: Write the failing e2e test**

```ts
// e2e/dev-labs.spec.ts
import { expect, test } from '@playwright/test';
import { monitorRuntime } from './helpers';

// The dev labs are desktop tools; one project is enough.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'dev labs are checked on desktop');
});

test('the Dr. E look test draws every direction at every size', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/drelook.html?t=4000&talk=1');
  await page.waitForFunction(() => document.querySelectorAll('canvas.dre-face[data-drawn]').length === 16);
  const lit = await page.locator('canvas.dre-face').evaluateAll((nodes) => nodes.map((node) => {
    const canvas = node as HTMLCanvasElement;
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    let on = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) on += 1;
    return on / (data.length / 4);
  }));
  expect(lit).toHaveLength(16);
  for (const share of lit) expect(share).toBeGreaterThan(0.2);
  runtime.assertClean();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CDM_URL=http://localhost:5199 npx playwright test e2e/dev-labs.spec.ts --project=desktop`
Expected: FAIL. The page 404s, or the canvas count is not 16 within the timeout.

- [ ] **Step 3: Write the page, the stylesheet and the script**

```html
<!-- drelook.html (dev server only; vite build ships index.html alone) -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dr. E look test</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Michroma&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz@6..72&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/dev/devLab.css" />
  </head>
  <body>
    <main id="look" class="lab"></main>
    <script type="module" src="/src/dev/drELook.ts"></script>
  </body>
</html>
```

```css
/* src/dev/devLab.css: shared by the dev-only look test and Voice Lab. */
:root { --void: #04080a; --panel: rgba(9, 16, 19, 0.72); --hairline: rgba(120, 196, 200, 0.16); --bio: #5be9d6; --text: #e7f6f4; --muted: #8fb3b1; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--void); color: var(--text); font: 14px/1.5 'IBM Plex Mono', ui-monospace, monospace; }
.lab { max-width: 1400px; margin: 0 auto; padding: 24px 16px 48px; }
.lab-head h1 { font: 22px 'Michroma', sans-serif; letter-spacing: 0.08em; color: var(--bio); margin: 0 0 4px; }
.lab-head p, .look-label p, figcaption, .lab-readout { color: var(--muted); }
.lab-actions, .lab-presets, .lab-profiles { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
button, select, input, textarea { font: inherit; color: var(--text); background: var(--panel); border: 1px solid var(--hairline); border-radius: 8px; padding: 8px 12px; }
button:hover, button:focus-visible, button[aria-pressed='true'] { border-color: var(--bio); outline: none; }
textarea { width: 100%; }
.look-row { display: flex; flex-wrap: wrap; align-items: center; gap: 24px; padding: 16px 0; border-top: 1px solid var(--hairline); }
.look-label { width: 260px; }
.look-label h2 { font-size: 15px; margin: 0; }
figure { margin: 0; display: grid; justify-items: center; gap: 6px; }
canvas.dre-face { image-rendering: pixelated; }
.lab-stage { display: grid; justify-items: start; gap: 12px; padding: 16px 0; }
.lab-bubble { max-width: 60ch; min-height: 3em; margin: 0; padding: 12px 16px; border: 1px solid var(--hairline); border-radius: 16px; background: var(--panel); font: 18px/1.4 'Newsreader', Georgia, serif; }
.lab-bubble .hidden { visibility: hidden; }
.lab-sliders { display: grid; gap: 8px; max-width: 560px; }
.lab-sliders label { display: grid; grid-template-columns: 170px 1fr 56px; align-items: center; gap: 12px; }
.lab-json { white-space: pre-wrap; color: var(--bio); }
```

```ts
// src/dev/drELook.ts
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
```

```js
// scripts/capture-dre-look.mjs
// Screenshots the Dr. E look test for Johnny to pick a direction.
// usage: node scripts/capture-dre-look.mjs [baseUrl]   (dev server on 5199)
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5199';
const outDir = 'docs/assets/dre';
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
for (const [name, query] of [['look-test-neutral', 'expr=neutral'], ['look-test-talking', 'expr=happy&talk=1']]) {
  await page.goto(`${base}/drelook.html?t=4000&${query}`);
  await page.waitForFunction(() => document.querySelectorAll('canvas.dre-face[data-drawn]').length === 16);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(`${outDir}/${name}.png`);
}
await browser.close();
```

- [ ] **Step 4: Run the e2e test, then confirm the build ignores the dev page**

Run: `CDM_URL=http://localhost:5199 npx playwright test e2e/dev-labs.spec.ts --project=desktop`
Expected: PASS.

Run: `npm run build && ls dist`
Expected: the build succeeds; `dist` has `index.html` and no `drelook.html`.

- [ ] **Step 5: Capture the sheets and review them (main model)**

Run: `node scripts/capture-dre-look.mjs`

Open both PNGs and judge each direction against spec §7:

- Does it read as a friendly face at 44 px?
- Does it read as a culture, not a sticker?
- Does the mouth visibly open at 72 px?

Tune constants in `FACE_DIRECTIONS` and `DR_E_FACE` (Task 1's file) until all four directions are each at their best. Watch the bloom on the 44 px faces: `drawBloomLayers` blurs by at least 3 px, a larger share of a small canvas than of the dish. Note the paint time from the page header (budget: under 1 ms). Switch to another tab for 10 s and back, and confirm in Activity Monitor that the page's CPU drops while hidden (Task 4's `document.hidden` guard).

- [ ] **Step 6: Commit and hand the sheet to Johnny**

```bash
git add drelook.html src/dev/drELook.ts src/dev/devLab.css scripts/capture-dre-look.mjs e2e/dev-labs.spec.ts docs/assets/dre/look-test-neutral.png docs/assets/dre/look-test-talking.png
git commit -F - <<'EOF'
Add the Dr. E look test: four cell-face directions at every slot size

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Show Johnny both sheets and the live page (`http://localhost:5199/drelook.html`, expression buttons and Talk). He picks one direction. Record his pick in the spec's §7 Look section in the same session.

---

### Task 6: Mumble engine port with parity tests — exact-spec

**Files:**
- Create: `tests/fixtures/mumble/prototype-core.cjs` (verbatim copy)
- Create: `src/audio/mumble.ts`
- Test: `tests/audio/mumble.test.ts`

**Interfaces:**
- Consumes: `MumbleVoiceId` (Task 1).
- Produces:
  - `MUMBLE_RATE = 24000` and `MUMBLE_VOICES: Record<MumbleVoiceId, { name: string; base: number; throat: number; note: string }>`;
  - `mumbleHash(text): number`;
  - `wordPattern(raw): MumbleUnit[]`;
  - `plan(text, pace = 1): MumblePlan`;
  - `synthesize(text, settings: MumbleSettings): MumbleRender`;
  - `normalizeLine(text): string`;
  - the types `MumbleUnit`, `MumbleEvent`, `MumbleWord`, `MumblePlan { events; words; duration }`, `MumbleSettings { voice; weird; pitch; pace }` and `MumbleRender extends MumblePlan { samples: Float32Array<ArrayBuffer>; rate; peak; voice }`.

- [ ] **Step 1: Vendor the reference**

Run: `mkdir -p tests/fixtures/mumble && cp ~/Projects/Games/ps1-world-unity/Tools/Mumble/prototype-core.cjs tests/fixtures/mumble/prototype-core.cjs`
Expected: a 134-line file whose header begins "Codex's strange-voices prototype (13 October 2026…". Do not edit it. Vitest ignores it (it only includes `tests/**/*.test.ts`), and `tsc` ignores `.cjs`.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/audio/mumble.test.ts
// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { normalizeLine, plan, synthesize } from '../../src/audio/mumble';

// The engine this game ports, kept verbatim so any drift shows up here.
const requireCjs = createRequire(import.meta.url);
const reference = requireCjs('../fixtures/mumble/prototype-core.cjs') as {
  plan(text: string, pace?: number): unknown;
  synthesize(text: string, settings: object): { samples: Float32Array; peak: number };
};

const LINES = [
  'Oh! A visitor!',
  "I'm Dr. E. I'm a merge.",
  'My friends came apart. Help me find them?',
  'Closer... closer... hold it!',
  'AGNES, Agnes and Agnès.',
  'Hmm. Brr? Tsk tsk.',
  'Swarmlet 42 meets Bloom Mass, twice.',
  'That’s Twin Bloom.\nFriend number one.',
];

describe('mumble engine', () => {
  it('plans every line exactly as the prototype does', () => {
    for (const line of LINES) {
      for (const pace of [0.65, 1, 1.5]) expect(plan(line, pace)).toEqual(reference.plan(line, pace));
    }
  });

  it('renders the same samples as the prototype for every voice', () => {
    for (const voice of ['bog', 'glass', 'rust', 'bubble'] as const) {
      const settings = { voice, weird: 0.55, pitch: 3, pace: 1.1 };
      const mine = synthesize(LINES[0]!, settings);
      const theirs = reference.synthesize(LINES[0]!, settings);
      expect(mine.samples.length).toBe(theirs.samples.length);
      let worst = 0;
      for (let i = 0; i < mine.samples.length; i++) worst = Math.max(worst, Math.abs(mine.samples[i]! - theirs.samples[i]!));
      expect(worst).toBe(0);
      expect(mine.peak).toBe(theirs.peak);
      expect(mine.peak).toBeLessThanOrEqual(0.7);
    }
  });

  it('rejects what the prototype rejects', () => {
    expect(() => plan('')).toThrow('Type a name');
    expect(() => plan('...!?')).toThrow('Type a name');
    expect(() => plan('a'.repeat(181))).toThrow('180');
    expect(() => plan('hello', 2)).toThrow('Pace');
  });

  it('says a name the same way wherever it appears', () => {
    const shape = (events: ReturnType<typeof plan>['events']) => events.map((e) => [e.vowel, e.step, e.seed]);
    const alone = shape(plan('Agnes').events);
    const inLine = shape(plan('Well, hello Agnes').events.filter((e) => e.wordIndex === 2));
    expect(inLine).toEqual(alone);
  });

  it('spells script punctuation the way the engine understands', () => {
    expect(normalizeLine('Closer… closer… hold it!')).toBe('Closer... closer... hold it!');
    expect(normalizeLine('Wait — no – yes')).toBe('Wait , no , yes');
    expect(plan(normalizeLine('Closer… hold it!')).duration).toBeGreaterThan(plan('Closer hold it!').duration);
  });
});
```

- [ ] **Step 3: Run them to confirm they fail**

Run: `npx vitest run tests/audio/mumble.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/audio/mumble".

- [ ] **Step 4: Write the port**

Keep every arithmetic expression in the prototype's order. The parity test compares samples with `toBe(0)` difference, so reordering a multiplication will fail it.

```ts
// src/audio/mumble.ts
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
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run tests/audio/mumble.test.ts && npx tsc --noEmit`
Expected: PASS; `tsc` exits 0.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/mumble/prototype-core.cjs src/audio/mumble.ts tests/audio/mumble.test.ts
git commit -F - <<'EOF'
Port the Z13 mumble voice engine, matched sample for sample

src/audio/mumble.ts is a line-for-line TypeScript port of the
strange-voices prototype (ps1-world-unity Tools/Mumble), checked
against a vendored copy of prototype-core.cjs.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Word reveal helper — exact-spec

**Files:**
- Create: `src/ui/speechReveal.ts`
- Test: `tests/ui/speechReveal.test.ts`

**Interfaces:**
- Consumes: `plan`, `normalizeLine`, `MumblePlan` (Task 6).
- Produces: `revealLengthAt(text: string, plan: Pick<MumblePlan, 'words' | 'duration'>, tSec: number): number`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/ui/speechReveal.test.ts
import { describe, expect, it } from 'vitest';
import { normalizeLine, plan } from '../../src/audio/mumble';
import { revealLengthAt } from '../../src/ui/speechReveal';

describe('speech reveal', () => {
  it('shows each word, its punctuation and space from the moment it is spoken', () => {
    const text = 'Oh! A visitor!';
    const p = plan(normalizeLine(text));
    expect(revealLengthAt(text, p, 0)).toBe(0);
    expect(revealLengthAt(text, p, p.words[0]!.start)).toBe('Oh! '.length);
    expect(revealLengthAt(text, p, p.words[1]!.start)).toBe('Oh! A '.length);
    expect(revealLengthAt(text, p, p.duration)).toBe(text.length);
  });

  it('keeps the displayed ellipsis while the voice pauses on it', () => {
    const text = 'Closer… closer… hold it!';
    const p = plan(normalizeLine(text));
    expect(revealLengthAt(text, p, p.words[1]!.start)).toBe('Closer… '.length);
    expect(p.words[1]!.start - p.words[0]!.end).toBeGreaterThan(0.4);
  });

  it('never splits an emoji and skips it in the voice', () => {
    const text = 'Hi 🧫 friend!';
    const p = plan(normalizeLine(text));
    expect(p.words.map((w) => w.text)).toEqual(['Hi', 'friend']);
    expect(text.slice(0, revealLengthAt(text, p, p.words[1]!.start - 0.001))).toBe('Hi 🧫 ');
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/ui/speechReveal.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/ui/speechReveal".

- [ ] **Step 3: Write the helper**

```ts
// src/ui/speechReveal.ts
// Dr. E's text appears word by word as he says it. The voice plan gives each
// word's spoken onset; word i of the plan is word i of the displayed line,
// because the engine and this pattern match words identically.
import type { MumblePlan } from '../audio/mumble';

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

/** How many characters of `text` are visible `tSec` into its speech: each
 *  spoken word brings its trailing punctuation and space with it. */
export function revealLengthAt(text: string, plan: Pick<MumblePlan, 'words' | 'duration'>, tSec: number): number {
  if (tSec >= plan.duration) return text.length;
  const starts = [...text.matchAll(WORD)].map((m) => m.index!);
  let shown = -1;
  for (let i = 0; i < plan.words.length && i < starts.length; i++) {
    if (plan.words[i]!.start <= tSec) shown = i;
  }
  if (shown < 0) return 0;
  return shown + 1 < starts.length ? starts[shown + 1]! : text.length;
}
```

The emoji test checks the time just before "friend" starts: only "Hi" is shown, and the reveal runs to the start index of "friend", so the emoji arrives whole with the space after it.

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/ui/speechReveal.test.ts && npx tsc --noEmit`
Expected: PASS; exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/ui/speechReveal.ts tests/ui/speechReveal.test.ts
git commit -F - <<'EOF'
Reveal Dr. E's lines word by word in time with his voice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Mumble player — exact-spec

**Files:**
- Create: `src/audio/mumblePlayer.ts`
- Test: `tests/audio/mumblePlayer.test.ts`

**Interfaces:**
- Consumes: `synthesize`, `normalizeLine`, `MUMBLE_RATE`, `MumblePlan` (Task 6); `DrEVoice` (Task 1).
- Produces:
  - `createMumblePlayer(ctx: AudioContext, destination: AudioNode): MumblePlayer`;
  - `interface MumblePlayer { say(text: string, voice: DrEVoice): MumbleUtterance | null; stop(): void }`;
  - `interface MumbleUtterance { text: string; plan: MumblePlan; startedAt: number; synthMs: number; peak: number; stop(): void }`.

`src/audio/uiAudio.ts:62-` keeps its `AudioContext` private and exposes no buffer playback. Slice C will add a speech bus there; until then, callers (the Voice Lab) pass their own context and destination.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/audio/mumblePlayer.test.ts
import { describe, expect, it } from 'vitest';
import { createMumblePlayer } from '../../src/audio/mumblePlayer';
import { DR_E_VOICE } from '../../src/content/drETuning';

function fakeContext() {
  const started: number[] = [];
  const stopped: number[] = [];
  let made = 0;
  const ctx = {
    currentTime: 2,
    createBuffer: (channels: number, length: number, rate: number) => ({ channels, length, rate, copyToChannel: () => undefined }),
    createBufferSource: () => {
      const id = made++;
      return {
        buffer: null, onended: null,
        connect: (node: unknown) => node, disconnect: () => undefined,
        start: () => { started.push(id); }, stop: () => { stopped.push(id); },
      };
    },
    createGain: () => ({ gain: { value: 1 }, connect: (node: unknown) => node, disconnect: () => undefined }),
  };
  return { ctx: ctx as unknown as AudioContext, destination: {} as AudioNode, started, stopped };
}

describe('mumble player', () => {
  it('speaks a line and returns its plan and start time', () => {
    const { ctx, destination, started } = fakeContext();
    const utterance = createMumblePlayer(ctx, destination).say('Oh! A visitor!', DR_E_VOICE);
    expect(utterance).not.toBeNull();
    expect(utterance!.plan.words.map((w) => w.text)).toEqual(['Oh', 'A', 'visitor']);
    expect(utterance!.startedAt).toBe(2);
    expect(utterance!.peak).toBeLessThanOrEqual(0.7);
    expect(started).toEqual([0]);
  });

  it('stops the line already playing when a new one starts', () => {
    const { ctx, destination, started, stopped } = fakeContext();
    const player = createMumblePlayer(ctx, destination);
    player.say('First line.', DR_E_VOICE);
    player.say('Second line.', DR_E_VOICE);
    expect(started).toEqual([0, 1]);
    expect(stopped).toEqual([0]);
  });

  it('returns null, and plays nothing, for lines the engine cannot say', () => {
    const { ctx, destination, started } = fakeContext();
    const player = createMumblePlayer(ctx, destination);
    expect(player.say('...', DR_E_VOICE)).toBeNull();
    expect(player.say('a'.repeat(181), DR_E_VOICE)).toBeNull();
    expect(player.say('', DR_E_VOICE)).toBeNull();
    expect(started).toEqual([]);
  });

  it('pauses on the script ellipsis', () => {
    const { ctx, destination } = fakeContext();
    const player = createMumblePlayer(ctx, destination);
    const withPause = player.say('Closer… hold it!', DR_E_VOICE)!;
    const without = player.say('Closer hold it!', DR_E_VOICE)!;
    expect(withPause.plan.duration).toBeGreaterThan(without.plan.duration);
    expect(withPause.text).toBe('Closer… hold it!');
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/audio/mumblePlayer.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/audio/mumblePlayer".

- [ ] **Step 3: Write the player**

```ts
// src/audio/mumblePlayer.ts
// Plays one mumble line at a time through Web Audio. The caller owns the
// AudioContext and the node the voice feeds (the Voice Lab today, the UI audio
// bus once Dr. E speaks in game).
import type { DrEVoice } from '../content/drETuning';
import { MUMBLE_RATE, normalizeLine, synthesize, type MumblePlan } from './mumble';

export interface MumbleUtterance {
  text: string; // the line as displayed
  plan: MumblePlan;
  /** AudioContext time the line started, in seconds. */
  startedAt: number;
  synthMs: number;
  peak: number;
  stop(): void;
}

export interface MumblePlayer {
  /** Speak `text`, stopping any line already playing. Returns null when the
   *  engine cannot say it (no words, over 180 characters, or too long). */
  say(text: string, voice: DrEVoice): MumbleUtterance | null;
  stop(): void;
}

export function createMumblePlayer(ctx: AudioContext, destination: AudioNode): MumblePlayer {
  let current: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  const stop = (): void => {
    if (!current) return;
    current.source.stop();
    current.source.disconnect();
    current.gain.disconnect();
    current = null;
  };

  return {
    say(text, voice) {
      stop();
      const began = performance.now();
      let render;
      try {
        render = synthesize(normalizeLine(text), { voice: voice.voice, weird: voice.weird, pitch: voice.pitch, pace: voice.pace });
      } catch {
        return null;
      }
      const synthMs = performance.now() - began;
      const buffer = ctx.createBuffer(1, render.samples.length, MUMBLE_RATE);
      buffer.copyToChannel(render.samples, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = voice.gain;
      source.connect(gain).connect(destination);
      const startedAt = ctx.currentTime;
      source.start(startedAt);
      const playing = { source, gain };
      current = playing;
      source.onended = () => {
        if (current === playing) current = null;
      };
      return {
        text,
        plan: { events: render.events, words: render.words, duration: render.duration },
        startedAt,
        synthMs,
        peak: render.peak,
        stop: () => {
          if (current === playing) stop();
        },
      };
    },
    stop,
  };
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/audio/mumblePlayer.test.ts && npx tsc --noEmit`
Expected: PASS; exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/audio/mumblePlayer.ts tests/audio/mumblePlayer.test.ts
git commit -F - <<'EOF'
Play mumble lines one at a time through Web Audio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Voice Lab page — exact-spec

**Files:**
- Create: `voicelab.html`, `src/dev/voiceLab.ts`
- Modify: `e2e/dev-labs.spec.ts` (append one test)

**Interfaces:**
- Consumes:
  - `createMumblePlayer`, `MumblePlayer`, `MumbleUtterance` (Task 8);
  - `revealLengthAt` (Task 7);
  - `MUMBLE_VOICES` (Task 6);
  - `DR_E_VOICE`, `DrEVoice`, `MumbleVoiceId` (Task 1);
  - `devLab.css` (Task 5).
- Produces:
  - the page at `/voicelab.html` (dev server only);
  - the element ids `line`, `voice`, `bubble`, `readout`, `face`, `json`;
  - module-level `speakListeners` and `stopListeners` arrays in `voiceLab.ts`, which Task 10 pushes onto.

If Lane A has not merged `devLab.css` yet, create it now from Task 5 Step 3 verbatim.

- [ ] **Step 1: Write the failing e2e test (append it to `e2e/dev-labs.spec.ts`)**

```ts
test('the Voice Lab says a line, reveals it, and exports the voice', async ({ page }) => {
  const runtime = monitorRuntime(page);
  await page.goto('/voicelab.html');
  await page.getByRole('button', { name: 'Oh! A visitor!' }).click();
  await expect(page.locator('#readout')).toContainText('synth');
  await expect(page.locator('#bubble .shown')).toHaveText('Oh! A visitor!', { timeout: 5_000 });

  await page.locator('#line').fill('...');
  await page.getByRole('button', { name: 'Say', exact: true }).click();
  await expect(page.locator('#readout')).toContainText('cannot say');

  await page.getByRole('button', { name: 'Copy JSON' }).click();
  await expect(page.locator('#json')).toContainText('export const DR_E_VOICE: DrEVoice = {');
  runtime.assertClean();
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CDM_URL=http://localhost:5199 npx playwright test e2e/dev-labs.spec.ts --project=desktop -g "Voice Lab"`
Expected: FAIL, because the page 404s.

- [ ] **Step 3: Write the page and the lab**

```html
<!-- voicelab.html (dev server only; vite build ships index.html alone) -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dr. E Voice Lab</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Michroma&family=IBM+Plex+Mono:wght@400;500&family=Newsreader:opsz@6..72&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/dev/devLab.css" />
  </head>
  <body>
    <main id="lab" class="lab"></main>
    <script type="module" src="/src/dev/voiceLab.ts"></script>
  </body>
</html>
```

```ts
// src/dev/voiceLab.ts
// Dev-only Voice Lab (/voicelab.html; vite build ships index.html alone): type
// a line, tune Dr. E's mumble voice and hear it with the words revealing in
// time, then paste the copied settings into DR_E_VOICE (src/content/drETuning.ts).
import { DR_E_VOICE, type DrEVoice, type MumbleVoiceId } from '../content/drETuning';
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
    readout.textContent = 'The engine cannot say that: it needs at least one word and 180 characters at most.';
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
```

The reveal runs on the page clock (`performance.now`) from the moment `say` returns, not on `ctx.currentTime`. The buffer starts at `ctx.currentTime`, so the two agree to within the output latency, and headless runs cannot stall on a muted audio device.

- [ ] **Step 4: Run the e2e test, the type check and the build**

Run: `CDM_URL=http://localhost:5199 npx playwright test e2e/dev-labs.spec.ts --project=desktop && npx tsc --noEmit && npm run build && ls dist`
Expected: both dev-lab tests pass; `tsc` exits 0; `dist` has no `voicelab.html`.

- [ ] **Step 5: Listen in the running page**

Open `http://localhost:5199/voicelab.html` with sound on and play every preset with each of the four voices. Check:

- the words land as they are spoken;
- "Closer… closer…" pauses;
- no clicks at line starts.

Record the synth times shown (budget: under 40 ms per line on a mid-range phone). Open the same page on a phone via the network URL (`npm run dev -- --host --port 5199 --strictPort`) and record those times too.

- [ ] **Step 6: Commit**

```bash
git add voicelab.html src/dev/voiceLab.ts e2e/dev-labs.spec.ts
git commit -F - <<'EOF'
Add the Voice Lab for tuning Dr. E's mumble voice

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Voice Lab face hook — exact-spec

**Files:**
- Modify: `src/dev/voiceLab.ts`
- Modify: `e2e/dev-labs.spec.ts` (one assertion)

**Interfaces:**
- Consumes:
  - `createDrEFace` (Task 4);
  - `FACE_DIRECTIONS`, `FACE_EXPRESSIONS`, `FaceDirectionId`, `FaceExpressionId` (Task 1);
  - `speakListeners` and `stopListeners` (Task 9).
- Produces: a live face beside the bubble that talks with each line, plus direction and expression pickers.

- [ ] **Step 1: Extend the e2e test**

Append to the Voice Lab test, before `runtime.assertClean()`:

```ts
  await expect(page.locator('#face')).toHaveAttribute('data-drawn', '1');
  await page.locator('#direction').selectOption('loupe');
  await page.getByRole('button', { name: 'surprised' }).click();
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `CDM_URL=http://localhost:5199 npx playwright test e2e/dev-labs.spec.ts --project=desktop -g "Voice Lab"`
Expected: FAIL, because `#face` never gets `data-drawn`.

- [ ] **Step 3: Wire the face**

In `src/dev/voiceLab.ts`, add to the imports:

```ts
import { FACE_DIRECTIONS, FACE_EXPRESSIONS, type FaceDirectionId, type FaceExpressionId } from '../content/drETuning';
import { createDrEFace } from '../ui/drEFace/faceRenderer';
```

Merge the first import into the existing `../content/drETuning` import line.

In the template, directly after the `<canvas id="face" …></canvas>` line, add:

```html
    <div class="lab-actions"><select id="direction" aria-label="Face direction"></select><span id="expressions"></span></div>
```

After `const profileList = …`, add:

```ts
const face = createDrEFace($<HTMLCanvasElement>('face'), { direction: 'blob', size: 192 });
const directionSelect = $<HTMLSelectElement>('direction');
for (const [id, direction] of Object.entries(FACE_DIRECTIONS)) directionSelect.add(new Option(direction.name, id));
directionSelect.value = 'blob';
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
```

- [ ] **Step 4: Run the e2e test and the type check**

Run: `CDM_URL=http://localhost:5199 npx playwright test e2e/dev-labs.spec.ts --project=desktop && npx tsc --noEmit`
Expected: PASS; exit 0.

- [ ] **Step 5: Hand the lab to Johnny**

Tell Johnny the lab is at `http://localhost:5199/voicelab.html`. After he tunes the voice:

1. Paste the copied snippet over `DR_E_VOICE` in `src/content/drETuning.ts`.
2. Run `npx vitest run tests/content/drETuning.test.ts`; the ranges test guards it.
3. Commit with the message "Tune Dr. E's voice".

- [ ] **Step 6: Commit**

```bash
git add src/dev/voiceLab.ts e2e/dev-labs.spec.ts
git commit -F - <<'EOF'
Show Dr. E's face talking in the Voice Lab

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: Contact graph — exact-spec

**Files:**
- Create: `src/game/contactGraph.ts`
- Test: `tests/game/contactGraph.test.ts`

**Interfaces:**
- Consumes:
  - `SimState` and `CellId` (`src/sim/types.ts:1, 57-71`). The grid is x-major: `cells[x * LY + y]` (`src/sim/grid.ts:18-20`, and the comment in `src/ui/render.ts:153-155`).
  - The 8-neighbourhood (`src/sim/types.ts:73-76`).
- Produces:
  - `interface ContactGraph { strain: Map<CellId, string>; contacts: Map<CellId, Map<CellId, number>> }`;
  - `buildContactGraph(state: SimState, strainOf: (id: CellId) => string | null, minContact = 2): ContactGraph`;
  - `contactComponents(graph): CellId[][]`;
  - `connectedSubsets(graph, maxSize): CellId[][]`;
  - `canonicalShape(graph, ids: readonly CellId[]): string`.

  Slice E's merge detection will reuse all of these.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/game/contactGraph.test.ts
import { describe, expect, it } from 'vitest';
import { addCell, createSim } from '../../src/sim/sim';
import { buildContactGraph, canonicalShape, connectedSubsets, contactComponents, type ContactGraph } from '../../src/game/contactGraph';

// Three 3x3 cultures in a row (x 2-4, 5-7, 8-10 at y 3-5), touching edge to
// edge, plus one (x 11-13, y 0-2) touching the third at a single diagonal pixel.
function rowOfThree() {
  const state = createSim({ LX: 14, LY: 8, nCells: 0, targetVol: 9, seed: 1, wrap: false });
  addCell(state, { id: 2, targetVol: 9, pos: [3, 4] });
  addCell(state, { id: 3, targetVol: 9, pos: [6, 4] });
  addCell(state, { id: 4, targetVol: 9, pos: [9, 4] });
  addCell(state, { id: 5, targetVol: 9, pos: [12, 1] });
  const labels: Record<number, string> = { 2: 'sniper', 3: 'splitter', 4: 'sniper', 5: 'swarmlet' };
  return { state, strainOf: (id: number) => labels[id] ?? null };
}

function graphOf(edges: Array<[number, number]>, labels: Record<number, string>): ContactGraph {
  const strain = new Map(Object.entries(labels).map(([id, label]) => [Number(id), label]));
  const contacts = new Map([...strain.keys()].map((id) => [id, new Map<number, number>()]));
  for (const [a, b] of edges) {
    contacts.get(a)!.set(b, 5);
    contacts.get(b)!.set(a, 5);
  }
  return { strain, contacts };
}

describe('contact graph', () => {
  it('counts each touching pixel pair once across the 8-neighbourhood', () => {
    const { state, strainOf } = rowOfThree();
    const graph = buildContactGraph(state, strainOf);
    expect(graph.contacts.get(2)!.get(3)).toBe(7);
    expect(graph.contacts.get(3)!.get(4)).toBe(7);
    expect(graph.contacts.get(2)!.has(4)).toBe(false);
  });

  it('ignores a single diagonal touch unless minContact allows it', () => {
    const { state, strainOf } = rowOfThree();
    expect(buildContactGraph(state, strainOf).contacts.get(4)!.has(5)).toBe(false);
    expect(buildContactGraph(state, strainOf, 1).contacts.get(4)!.get(5)).toBe(1);
  });

  it('leaves out dead and unlabelled cultures', () => {
    const { state, strainOf } = rowOfThree();
    state.cells.get(3)!.vol = 0;
    const graph = buildContactGraph(state, (id) => (id === 4 ? null : strainOf(id)));
    expect(graph.strain.has(3)).toBe(false);
    expect(graph.strain.has(4)).toBe(false);
    expect(graph.contacts.get(2)!.size).toBe(0);
  });

  it('finds connected components', () => {
    const { state, strainOf } = rowOfThree();
    expect(contactComponents(buildContactGraph(state, strainOf))).toEqual([[2, 3, 4], [5]]);
  });

  it('enumerates every connected set once', () => {
    const path = graphOf([[1, 2], [2, 3]], { 1: 'a', 2: 'b', 3: 'c' });
    expect(connectedSubsets(path, 3)).toEqual(expect.arrayContaining([[1, 2], [2, 3], [1, 2, 3]]));
    expect(connectedSubsets(path, 3)).toHaveLength(3);
    const triangle = graphOf([[1, 2], [2, 3], [1, 3]], { 1: 'a', 2: 'b', 3: 'c' });
    expect(connectedSubsets(triangle, 3)).toHaveLength(4);
    const star = graphOf([[1, 2], [1, 3], [1, 4]], { 1: 'a', 2: 'b', 3: 'c', 4: 'd' });
    const sets = connectedSubsets(star, 4).map((s) => s.join(','));
    expect(sets).toHaveLength(7);
    expect(new Set(sets).size).toBe(7);
  });

  it('names an arrangement the same way whichever cultures form it', () => {
    const { state, strainOf } = rowOfThree();
    const graph = buildContactGraph(state, strainOf);
    expect(canonicalShape(graph, [2, 3, 4])).toBe('sniper,sniper,splitter|0-2,1-2');
    expect(canonicalShape(graph, [4, 2, 3])).toBe('sniper,sniper,splitter|0-2,1-2');
    const triangle = graphOf([[7, 8], [8, 9], [7, 9]], { 7: 'sniper', 8: 'splitter', 9: 'sniper' });
    expect(canonicalShape(triangle, [7, 8, 9])).toBe('sniper,sniper,splitter|0-1,0-2,1-2');
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run tests/game/contactGraph.test.ts`
Expected: FAIL, "Failed to resolve import ../../src/game/contactGraph".

- [ ] **Step 3: Write the module**

```ts
// src/game/contactGraph.ts
// Which living cultures touch, and how much. Built from the grid every few
// ticks: the merge census reads it now, and merge detection will later.
// Dishes run with wrap off, so contacts across a wrapped edge are not counted.
import type { CellId, SimState } from '../sim/types';

export interface ContactGraph {
  /** Living culture -> its strain key ('control', an archetype, or a breed id). */
  strain: Map<CellId, string>;
  /** a -> (b -> touching pixel pairs), stored both ways. */
  contacts: Map<CellId, Map<CellId, number>>;
}

// Half the sim's 8-neighbourhood, so each touching pixel pair counts once.
const FORWARD: ReadonlyArray<readonly [number, number]> = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function buildContactGraph(
  state: SimState,
  strainOf: (id: CellId) => string | null,
  minContact = 2,
): ContactGraph {
  const { LX, LY, cells } = state.grid;
  const strain = new Map<CellId, string>();
  for (const [id, cell] of state.cells) {
    if (cell.vol <= 0) continue;
    const key = strainOf(id);
    if (key !== null) strain.set(id, key);
  }
  const pairs = new Map<number, number>();
  for (let x = 0; x < LX; x++) {
    for (let y = 0; y < LY; y++) {
      const a = cells[x * LY + y]!;
      if (a === 0 || !strain.has(a)) continue;
      for (const [dx, dy] of FORWARD) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= LX || ny < 0 || ny >= LY) continue;
        const b = cells[nx * LY + ny]!;
        if (b === 0 || b === a || !strain.has(b)) continue;
        const key = a < b ? a * 65536 + b : b * 65536 + a;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }
  const contacts = new Map<CellId, Map<CellId, number>>();
  for (const id of strain.keys()) contacts.set(id, new Map());
  for (const [key, count] of pairs) {
    if (count < minContact) continue;
    const a = Math.floor(key / 65536);
    const b = key % 65536;
    contacts.get(a)!.set(b, count);
    contacts.get(b)!.set(a, count);
  }
  return { strain, contacts };
}

/** Groups of cultures that touch, directly or through each other; ids ascending. */
export function contactComponents(graph: ContactGraph): CellId[][] {
  const seen = new Set<CellId>();
  const out: CellId[][] = [];
  for (const start of [...graph.contacts.keys()].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const group: CellId[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const id = queue.pop()!;
      group.push(id);
      for (const next of graph.contacts.get(id)!.keys()) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    out.push(group.sort((a, b) => a - b));
  }
  return out;
}

/** Every connected set of 2..maxSize cultures, each exactly once, ids
 *  ascending (the ESU enumeration, emitting every size on the way up). */
export function connectedSubsets(graph: ContactGraph, maxSize: number): CellId[][] {
  const out: CellId[][] = [];
  const neighbours = (id: CellId): Iterable<CellId> => graph.contacts.get(id)!.keys();
  const extend = (subset: CellId[], extension: CellId[], root: CellId): void => {
    if (subset.length >= 2) out.push([...subset].sort((a, b) => a - b));
    if (subset.length === maxSize) return;
    const pending = [...extension];
    while (pending.length > 0) {
      const w = pending.pop()!;
      const next = [...pending];
      for (const u of neighbours(w)) {
        if (u <= root || subset.includes(u) || next.includes(u)) continue;
        // Neighbours of the subset itself were already offered as extensions.
        if (subset.some((s) => graph.contacts.get(s)!.has(u))) continue;
        next.push(u);
      }
      extend([...subset, w], next, root);
    }
  };
  for (const root of [...graph.contacts.keys()].sort((a, b) => a - b)) {
    extend([root], [...neighbours(root)].filter((u) => u > root), root);
  }
  return out;
}

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((rest) => Array.from({ length: n }, (_, i) => [...rest.slice(0, i), n - 1, ...rest.slice(i)]));
}

/** A name for a set's strains and contact pattern that ignores which culture
 *  is which: the same arrangement anywhere gets the same name. Labels come
 *  first, then the touching pairs by position. Fine for sets of up to 6. */
export function canonicalShape(graph: ContactGraph, ids: readonly CellId[]): string {
  let best = '';
  for (const order of permutations(ids.length)) {
    const members = order.map((i) => ids[i]!);
    const edges: string[] = [];
    for (let a = 0; a < members.length; a++) {
      for (let b = a + 1; b < members.length; b++) {
        if (graph.contacts.get(members[a]!)!.has(members[b]!)) edges.push(`${a}-${b}`);
      }
    }
    const code = `${members.map((id) => graph.strain.get(id)!).join(',')}|${edges.join(',')}`;
    if (best === '' || code < best) best = code;
  }
  return best;
}
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/game/contactGraph.test.ts && npx tsc --noEmit`
Expected: PASS; exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/game/contactGraph.ts tests/game/contactGraph.test.ts
git commit -F - <<'EOF'
Build a contact graph of touching cultures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Merge census probe — exact-spec

**Files:**
- Create: `scripts/merge-census.ts`

**Interfaces:**
- Consumes:
  - `buildContactGraph`, `canonicalShape`, `connectedSubsets`, `contactComponents` (Task 11);
  - `createRun` and `RunState.fightIndex` (`src/game/run.ts:33-60`), with `run.restore(...)` setting the trial;
  - `createArena`, `Arena.applyTool`, `Arena.tick`, `Arena.setHazardsHeld` and `Arena.archetypes` (`src/game/arena.ts:83-108, 187-206`);
  - `ECOSYSTEM_SCHEDULE` through `run.getEpochSpawnList()` (`src/game/run.ts:213-218`);
  - `run.getOnboardingSpawnList()` for trial 1 (`src/game/run.ts:219-224`, matching `src/main.ts:1361-1363`);
  - `TITLE_DISH_TUNING.strains` (`src/ui/titleDish.ts:16-40`);
  - `OPEN_LAB_LIFE_CYCLE` and `COMMON_COLD_CASE`.
  - The open-lab setup copies `scripts/dish-longevity.ts:44-49, 87-94` exactly; the title setup copies `src/ui/titleDish.ts:72-90`.
- Produces: stdout tables, plus an optional JSON file (`--json path`) of `{ args, perDish: Record<DishId, ShapeRow[]>, overall: ShapeRow[], scanMs }`, where `ShapeRow = { shape, episodes, held2, held4, held8, medianHold, longest, isolatedShare, seeds }`.

- [ ] **Step 1: Write the probe**

```ts
// scripts/merge-census.ts
// Merge census: which small groups of cultures already hold together in the
// dishes we ship, and for how long. Each dish opens like a player opens it;
// every --scan ticks the probe builds the contact graph and records how long
// each touching set of 2..--max cultures keeps its exact members and contact
// pattern. Times are game seconds at 60 ticks/s (the title dish runs at half
// speed on screen, so its holds look twice as long there).
//
// usage: npx vite-node scripts/merge-census.ts -- [--seeds 12] [--seconds 180] [--dish all|trial1..trial5|openlab|title] [--scan 10] [--max 4] [--top 30] [--json out.json]
import { writeFileSync } from 'node:fs';
import { createRun } from '../src/game/run';
import { createArena, type Arena } from '../src/game/arena';
import { ARCHETYPE_DEFAULTS, type EnemyArchetype } from '../src/content/enemies';
import { OPEN_LAB_LIFE_CYCLE } from '../src/content/ecologyTuning';
import { COMMON_COLD_CASE } from '../src/content/researchCases';
import { TITLE_DISH_TUNING } from '../src/ui/titleDish';
import { buildContactGraph, canonicalShape, connectedSubsets, contactComponents } from '../src/game/contactGraph';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};
const DISHES = ['trial1', 'trial2', 'trial3', 'trial4', 'trial5', 'openlab', 'title'] as const;
type DishId = (typeof DISHES)[number];
const SEEDS = Number(arg('seeds', '12'));
const SECONDS = Number(arg('seconds', '180'));
const SCAN = Number(arg('scan', '10'));
const MAX = Number(arg('max', '4'));
const TOP = Number(arg('top', '30'));
const JSON_OUT = arg('json', '');
const DISH_ARG = arg('dish', 'all');
const RUN_DISHES: DishId[] = DISH_ARG === 'all' ? [...DISHES] : [DISH_ARG as DishId];
if (!RUN_DISHES.every((d) => (DISHES as readonly string[]).includes(d))) throw new Error(`unknown dish ${DISH_ARG}`);
const TPS = 60;
const EGGS: EnemyArchetype[] = ['swarmlet', 'bruiser', 'splitter', 'sniper', 'mirror', 'swarmlet'];
const IDLE = { moveVec: [0, 0] as [number, number], shouldFire: false, shouldEngulf: false };
// The shape Johnny saw on the title: one green Splitter with two red cultures.
const RED = new Set(['sniper', 'control', 'boss']);

function openDish(dish: DishId, seed: number): Arena {
  if (dish === 'title') {
    // As src/ui/titleDish.ts builds it, at the 1440x900 window's grid.
    const arena = createArena({
      LX: 219, LY: 137, seed, player: createRun(seed).getPlayerConfig(),
      enemies: TITLE_DISH_TUNING.strains.map((a) => ({ ...ARCHETYPE_DEFAULTS[a] })),
      wrap: false, mode: 'ecosystem', includeControlSample: true, fightIndex: COMMON_COLD_CASE.trials.length,
      worldEventIntensity: 0, knownBreedIds: new Set(), lifeCycle: OPEN_LAB_LIFE_CYCLE, breedDiscovery: false,
    });
    arena.setHazardsHeld(true);
    return arena;
  }
  const run = createRun(seed);
  // The open lab copies scripts/dish-longevity.ts; trials restore their fight index.
  const fightIndex = dish === 'openlab' ? 6 : Number(dish.slice(5)) - 1;
  if (dish !== 'openlab') run.restore({ ...run.getState(), phase: 'arena', fightIndex });
  const onboarding = fightIndex === 0;
  const arena = createArena({
    LX: 160, LY: 160, seed, player: run.getPlayerConfig(),
    enemies: onboarding ? run.getOnboardingSpawnList() : run.getEpochSpawnList(),
    wrap: false, mode: 'ecosystem', includeControlSample: !onboarding, objective: run.getObjective(),
    fightIndex, knownBreedIds: new Set(),
    lifeCycle: fightIndex >= COMMON_COLD_CASE.trials.length ? OPEN_LAB_LIFE_CYCLE : 'arena',
  });
  // Open the dish like a player: six eggs in a ring, honouring cooldowns; an
  // egg the dish refuses is skipped after 15 s.
  for (let i = 0; i < EGGS.length; i++) {
    const a = (i / EGGS.length) * Math.PI * 2;
    const pos: [number, number] = [80 + 38 * Math.cos(a), 80 + 38 * Math.sin(a)];
    let guard = 0;
    while (!arena.applyTool('egg', pos, { eggArchetype: EGGS[i] }) && guard++ < 900) arena.tick(IDLE);
    arena.tick(IDLE);
  }
  return arena;
}

interface Episode { shape: string; seconds: number; isolated: boolean }

let scanMsTotal = 0;
let scans = 0;

function census(dish: DishId, seed: number): Episode[] {
  const arena = openDish(dish, seed);
  const strainOf = (id: number): string | null => {
    if (id === 1) return 'control';
    const spawn = arena.archetypes.get(id);
    return spawn ? spawn.breedId ?? spawn.archetype : null;
  };
  const active = new Map<string, { shape: string; scans: number; isolatedScans: number }>();
  const episodes: Episode[] = [];
  const close = (key: string): void => {
    const entry = active.get(key)!;
    episodes.push({ shape: entry.shape, seconds: (entry.scans * SCAN) / TPS, isolated: entry.isolatedScans * 2 >= entry.scans });
    active.delete(key);
  };
  for (let tick = 1; tick <= SECONDS * TPS; tick++) {
    arena.tick(IDLE);
    if (tick % SCAN !== 0) continue;
    const began = performance.now();
    const graph = buildContactGraph(arena.state, strainOf);
    const whole = new Set(contactComponents(graph).map((group) => group.join(',')));
    const seen = new Set<string>();
    for (const ids of connectedSubsets(graph, MAX)) {
      const members = ids.join(',');
      const shape = canonicalShape(graph, ids);
      const key = `${members}|${shape}`;
      seen.add(key);
      const entry = active.get(key) ?? { shape, scans: 0, isolatedScans: 0 };
      entry.scans += 1;
      if (whole.has(members)) entry.isolatedScans += 1;
      active.set(key, entry);
    }
    scanMsTotal += performance.now() - began;
    scans += 1;
    for (const key of [...active.keys()]) if (!seen.has(key)) close(key);
  }
  for (const key of [...active.keys()]) close(key);
  return episodes;
}

interface ShapeRow { shape: string; episodes: number; held2: number; held4: number; held8: number; medianHold: number; longest: number; isolatedShare: number; seeds: number }

function summarise(perSeed: Episode[][]): ShapeRow[] {
  const byShape = new Map<string, { holds: number[]; isolated: number; seeds: Set<number> }>();
  perSeed.forEach((episodes, seedIndex) => {
    for (const e of episodes) {
      const row = byShape.get(e.shape) ?? { holds: [], isolated: 0, seeds: new Set<number>() };
      row.holds.push(e.seconds);
      if (e.isolated) row.isolated += 1;
      row.seeds.add(seedIndex);
      byShape.set(e.shape, row);
    }
  });
  return [...byShape].map(([shape, row]) => {
    const holds = [...row.holds].sort((a, b) => a - b);
    return {
      shape, episodes: holds.length,
      held2: holds.filter((s) => s >= 2).length, held4: holds.filter((s) => s >= 4).length, held8: holds.filter((s) => s >= 8).length,
      medianHold: holds[Math.floor(holds.length / 2)] ?? 0, longest: holds.at(-1) ?? 0,
      isolatedShare: row.isolated / holds.length, seeds: row.seeds.size,
    };
  }).sort((a, b) => b.held4 - a.held4 || b.held2 - a.held2 || b.episodes - a.episodes);
}

const printRows = (rows: ShapeRow[]): void => {
  console.log(`  ${'shape'.padEnd(58)} ${'eps'.padStart(6)} ${'>=2s'.padStart(6)} ${'>=4s'.padStart(6)} ${'>=8s'.padStart(6)} ${'median'.padStart(7)} ${'longest'.padStart(8)} ${'isolated'.padStart(9)} ${'seeds'.padStart(6)}`);
  for (const r of rows) {
    console.log(`  ${r.shape.padEnd(58)} ${String(r.episodes).padStart(6)} ${String(r.held2).padStart(6)} ${String(r.held4).padStart(6)} ${String(r.held8).padStart(6)} ${r.medianHold.toFixed(1).padStart(7)} ${r.longest.toFixed(1).padStart(8)} ${(r.isolatedShare * 100).toFixed(0).padStart(8)}% ${String(r.seeds).padStart(6)}`);
  }
};

const isTwoRedAroundGreen = (shape: string): boolean => {
  const labels = shape.split('|')[0]!.split(',');
  return labels.length === 3 && labels.filter((l) => l === 'splitter').length === 1 && labels.filter((l) => RED.has(l)).length === 2;
};

const started = Date.now();
const perDish = {} as Record<DishId, ShapeRow[]>;
const all: Episode[][] = [];
for (const dish of RUN_DISHES) {
  const perSeed: Episode[][] = [];
  for (let seed = 1; seed <= SEEDS; seed++) perSeed.push(census(dish, seed * 7919));
  all.push(...perSeed);
  perDish[dish] = summarise(perSeed);
  console.log(`\n${dish}: ${SEEDS} seeds x ${SECONDS}s, sets of 2-${MAX}, top ${TOP} by holds of 4 s or more`);
  printRows(perDish[dish].slice(0, TOP));
}
const overall = summarise(all);
console.log(`\nTwo red cultures around one green Splitter (sniper, control, boss), every dish:`);
for (const dish of RUN_DISHES) {
  const rows = perDish[dish].filter((r) => isTwoRedAroundGreen(r.shape));
  console.log(` ${dish}${rows.length ? '' : ': none seen'}`);
  if (rows.length) printRows(rows);
}
const scanMs = scans ? scanMsTotal / scans : 0;
console.log(`\nlegend: shape = sorted strain labels | touching pairs by position. "isolated" = share of holds where the set was a whole contact group, not part of a bigger cluster.`);
console.log(`scan cost ${scanMs.toFixed(3)} ms average over ${scans} scans (merge detection budget: 0.3 ms). ${((Date.now() - started) / 1000).toFixed(0)}s wall`);
if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ args: { SEEDS, SECONDS, SCAN, MAX, dishes: RUN_DISHES }, perDish, overall, scanMs }, null, 2));
  console.log(`wrote ${JSON_OUT}`);
}
```

- [ ] **Step 2: Smoke run**

Run: `npx vite-node scripts/merge-census.ts -- --seeds 2 --seconds 30 --dish trial2`
Expected:

- a `trial2` table with at least one row;
- a "Two red cultures…" section (which may say "none seen");
- a scan-cost line;
- no exceptions.

Then run `--dish title` the same way, and confirm the title dish runs on its 219 × 137 grid without error.

- [ ] **Step 3: Commit**

```bash
git add scripts/merge-census.ts
git commit -F - <<'EOF'
Add the merge census probe

Seeds each shipped dish like a player, scans the contact graph every
few ticks, and reports which touching sets of cultures hold for 2, 4
and 8 seconds, including the two-red-around-a-green shape from the
title.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 13: Run the census and propose the v1 forms — judgment (main model)

**Files:**
- Create: `docs/v1/merge-census.json` (raw output), `docs/v1/merge-census.md` (report)

**Interfaces:**
- Consumes: Task 12's probe.
- Produces:
  - the inputs to slice E: a recommended lock window, a rare candidate list of 12 shapes, and very-rare leads;
  - the answer to "where does two red around a green sit".

- [ ] **Step 1: Run the full census**

Run (about 10–15 minutes, in the background): `mkdir -p docs/v1 && npx vite-node scripts/merge-census.ts -- --seeds 12 --seconds 180 --json docs/v1/merge-census.json | tee /tmp/merge-census.txt`
Expected: tables for all seven dishes; the two-red section; a scan cost under 0.3 ms (if it is over, note it for slice E).

- [ ] **Step 2: Write `docs/v1/merge-census.md`**

The report has these sections, with numbers copied from the run:

1. **Method:** the command, seeds, seconds and scan interval. Times are game seconds at 60 ticks/s; note the title's half-speed display.
2. **What holds naturally:** the top shapes per dish and overall, each with its 2/4/8 s counts, median, longest and isolated share.
3. **Two red around a green:** which variant Johnny most likely saw, a path with the Splitter in the middle or a triangle, and whether those reds are Snipers or the control sample. Say how common it is on the title compared with the trials.
4. **Lock window:** recommend the hold time that most natural touching sets never reach but deliberate setups could. Use the elbow in the overall 2/4/8 s counts. That becomes `MERGE_DETECTION`'s default lock window in slice E.
5. **Embedded or isolated:** from the isolated share, should forms be matched as whole contact groups or as sets inside bigger clusters? This settles the ambiguity in spec §8.2.
6. **v1 rare candidates (12):** shapes that happen sometimes but rarely hold past the lock window, with one line each on how a player would coax them (strains, arrangement, tool). Order them by difficulty and flag the easiest as the Trial 2 "First Merge" friend.
7. **Very-rare leads:** sets of 4 that hold past 8 s, or shapes seen in only one or two seeds. Each is a starting point for slice I's behaviour detection.

- [ ] **Step 3: Commit and take the report to Johnny**

```bash
git add docs/v1/merge-census.md docs/v1/merge-census.json
git commit -F - <<'EOF'
Report the merge census and propose the v1 forms

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Show Johnny the report: the two-red answer, the lock window and the 12 candidates. His picks become the rare list in slice E's plan.
