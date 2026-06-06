import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = 'public/audio/generated';
const API_URL = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_22050_32';

const ASSETS = [
  {
    id: 'hatch',
    file: 'hatch.mp3',
    duration_seconds: 0.8,
    text: 'Tiny wet organic hatch pop, playful laboratory arcade sound, short and clean, no music.',
  },
  {
    id: 'visible_mutation',
    file: 'visible_mutation.mp3',
    duration_seconds: 0.9,
    text: 'Retro pixel color-cycling mutation chirp, wet organic glitch, playful sci-fi lab, short one-shot.',
  },
  {
    id: 'catalytic_flare',
    file: 'catalytic_flare.mp3',
    duration_seconds: 1.1,
    text: 'Bright violent catalytic flare in a tiny lab dish, magnesium-like flash, punchy but not painful.',
  },
  {
    id: 'water_stabilize',
    file: 'water_stabilize.mp3',
    duration_seconds: 1.0,
    text: 'Soft water spreading through glass, stabilizing wet shimmer, gentle sci-fi lab one-shot.',
  },
  {
    id: 'salt_crystal',
    file: 'salt_crystal.mp3',
    duration_seconds: 0.9,
    text: 'Brittle salt crystallization ticks and tiny glassy shatter, precise arcade laboratory sound.',
  },
  {
    id: 'folding_fault',
    file: 'folding_fault.mp3',
    duration_seconds: 1.2,
    text: 'Stuttering cellular automata rule-machine fold, bassy glitch pulse, strange but playful sci-fi.',
  },
  {
    id: 'hidden_breed',
    file: 'hidden_breed.mp3',
    duration_seconds: 1.0,
    text: 'Small discovery sting for a new alien microbe breed, sparkling retro lab monitor, no melody.',
  },
  {
    id: 'objective_warning',
    file: 'objective_warning.mp3',
    duration_seconds: 0.8,
    text: 'Restrained retro lab warning blip, amber monitor alert, short and not alarming.',
  },
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');

await main();

async function main() {
  const env = await loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing ELEVENLABS_API_KEY in .env or process environment.');
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const generated = [];
  for (const asset of ASSETS) {
    const outPath = join(OUTPUT_DIR, asset.file);
    if (!force && existsSync(outPath)) {
      generated.push({ id: asset.id, file: `/audio/generated/${asset.file}`, skipped: true });
      continue;
    }
    if (dryRun) {
      generated.push({ id: asset.id, file: `/audio/generated/${asset.file}`, dryRun: true });
      continue;
    }
    const audio = await generateSound(apiKey, asset);
    await writeFile(outPath, Buffer.from(audio));
    generated.push({ id: asset.id, file: `/audio/generated/${asset.file}`, skipped: false });
  }

  await writeFile(
    join(OUTPUT_DIR, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), assets: generated }, null, 2)}\n`,
  );
  console.log(`Audio asset pass complete: ${generated.length} entries written to ${OUTPUT_DIR}.`);
}

async function loadEnv() {
  const env = { ...process.env };
  if (!existsSync('.env')) return env;
  const contents = await readFile('.env', 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in env)) env[key] = value;
  }
  return env;
}

async function generateSound(apiKey, asset) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: asset.text,
      duration_seconds: asset.duration_seconds,
      prompt_influence: 0.45,
      model_id: 'eleven_text_to_sound_v2',
    }),
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs sound generation failed for ${asset.id}: HTTP ${response.status}`);
  }
  return response.arrayBuffer();
}
