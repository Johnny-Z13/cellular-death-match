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
  mouthY: 0.14, mouthWidth: 0.11, mouthCurve: 0.45, mouthOpen: 0, cheeks: 0.2,
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
  bodyPalette: Rgb[] | null; // sub-cell colours, in turn; null: shades of `body`
}

export const FACE_DIRECTIONS: Record<FaceDirectionId, FaceDirection> = {
  merge: {
    id: 'merge', name: 'The merge he is', note: 'Green body, two red cells fused on as eyes: the shape from the title dish.',
    body: [72, 226, 112], eye: [255, 78, 164], pupil: [12, 18, 20], mouth: [10, 24, 16], cheek: [255, 140, 170],
    brow: null, lens: null, eyeScale: 1.6, eyeLift: 0.1, bodyCells: 1, bodyPalette: null,
  },
  blob: {
    id: 'blob', name: 'Single-cell blob', note: 'One soft culture; the eyes and mouth are gaps in its membrane.',
    body: [91, 233, 214], eye: [236, 250, 248], pupil: [6, 14, 16], mouth: [6, 14, 16], cheek: [255, 150, 160],
    brow: [16, 62, 58], lens: null, eyeScale: 1, eyeLift: 0, bodyCells: 1, bodyPalette: null,
  },
  loupe: {
    id: 'loupe', name: 'The loupe', note: 'The blob with one big glass lens for an eye, the old Dr. E\'s signature.',
    body: [91, 233, 214], eye: [236, 250, 248], pupil: [6, 14, 16], mouth: [6, 14, 16], cheek: [255, 150, 160],
    brow: [16, 62, 58], lens: [240, 195, 90], eyeScale: 1, eyeLift: 0, bodyCells: 1, bodyPalette: null,
  },
  colony: {
    id: 'colony', name: 'Colony face', note: 'Cells of several strains fused into one creature: Dr. E is a merge of friends.',
    body: [91, 233, 214], eye: [236, 250, 248], pupil: [6, 14, 16], mouth: [10, 18, 24], cheek: [255, 120, 170],
    brow: null, lens: null, eyeScale: 1.2, eyeLift: 0, bodyCells: 6,
    // Swarmlet cyan, the bio teal, Splitter green, Mirror violet: his friends' colours.
    bodyPalette: [[91, 233, 214], [72, 201, 255], [72, 226, 112], [91, 233, 214], [132, 113, 255], [72, 201, 255]],
  },
};

// The direction the game uses: Dr. E as a colony of his friends' cells.
// The other three stay in the look test for comparison.
export const DR_E_DIRECTION: FaceDirectionId = 'colony';

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
  coreShade: number; // how much darker a body cell is at its centre than at its membrane
  membraneLight: number; // lightening of the outer membrane, like a culture's edge in the dish
  seamLight: number; // lightening where two fused body cells meet
  talkMouthGain: number; // how far a full-volume syllable opens the mouth
  talkBounce: number; // squash added by a full-volume syllable
  blendMs: number; // expression change time
}

export const DR_E_FACE: DrEFaceTuning = {
  gridSize: 40, wobble: 0.04, wobbleHz: 0.5, flicker: 0.12, flickerMs: 90, shimmer: 0.08,
  blinkMinMs: 2000, blinkMaxMs: 6000, blinkMs: 140, breathHz: 0.25, breathSquash: 0.02,
  coreShade: 0.42, membraneLight: 0.38, seamLight: 0.2,
  talkMouthGain: 0.9, talkBounce: 0.05, blendMs: 150,
};
