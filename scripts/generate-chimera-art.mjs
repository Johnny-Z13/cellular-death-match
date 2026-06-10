#!/usr/bin/env node
// Generates microscope-specimen portraits for each chimera breed via Nano Banana.
//   node scripts/generate-chimera-art.mjs          # generate missing
//   node scripts/generate-chimera-art.mjs --force  # regenerate all
//   node scripts/generate-chimera-art.mjs KEY      # one breed
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const MODEL = 'gemini-2.5-flash-image';
const OUTPUT_DIR = 'public/art/chimera';
const STYLE_PREFIX =
  'Dark scientific microscope specimen illustration, bioluminescent petri-dish organism, a single creature-like microbe centred on a near-black background, '
  + 'glowing membranes and fine filaments, cinematic depth of field, fine film grain, limited palette of bio-cyan teal with one accent colour, '
  + 'elegant and clinical, looks alive under glass, no text, no words, no letters, no UI, no scale bars. Subject: ';

const ITEMS = {
  bloom_mass: { color: 'lime green', prompt: 'a soft self-budding coral-hydra bloom microbe shedding small glowing daughter buds, rounded swelling lobes' },
  glass_antibody: { color: 'pale cyan white', prompt: 'a glass-shelled diatom-basilisk microbe with sharp crystalline angular plates and a petrifying glare' },
  needle_swarm: { color: 'amber gold', prompt: 'a fast fragile wasp-manticore swarm microbe bristling with thin barbed quills radiating outward' },
  static_lattice: { color: 'electric cyan', prompt: 'a flickering slime-mould will-o-wisp microbe forming a repeating geometric lattice of glowing nodes' },
  folded_anchor: { color: 'deep blue', prompt: 'a heavy near-indestructible tardigrade-golem microbe, thick folded plated body, slow and dense' },
  quill_bloom: { color: 'yellow green', prompt: 'a swelling sea-urchin-phoenix microbe, a glowing bloom body firing prickly needle spines as it spreads' },
  vitric_anchor: { color: 'violet purple', prompt: 'a crystalline radiolarian-gargoyle microbe, a faceted glassy fortress with crystal spurs, toxin-proof and heavy' },
  mire_lattice: { color: 'teal green', prompt: 'a myxomycete-wyrm pattern-mass microbe budding fresh self-similar tiles across the field, serpentine repeating texture' },
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));

await main();

async function main() {
  const env = await loadEnv();
  const key = env.NANO_BANANA_API_KEY;
  if (!key) throw new Error('Missing NANO_BANANA_API_KEY in .env');
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const [name, item] of Object.entries(ITEMS)) {
    if (only && only !== name) continue;
    const outPath = join(OUTPUT_DIR, `${name}.png`);
    if (!force && existsSync(outPath)) { console.log(`skip ${name} (exists)`); continue; }
    const raw = await genOne(key, item);
    const buf = await sharp(raw).resize(384, 384, { fit: 'cover' }).png({ quality: 80, compressionLevel: 9 }).toBuffer();
    await writeFile(outPath, buf);
    console.log(`wrote ${outPath} (${buf.length} bytes)`);
    await new Promise((r) => setTimeout(r, 600));
  }
}

async function genOne(key, item) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const text = `${STYLE_PREFIX}${item.prompt}. The accent colour is ${item.color}.`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const d = await res.json();
  const part = d.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`No image part: ${JSON.stringify(d).slice(0, 240)}`);
  return Buffer.from(part.inlineData.data, 'base64');
}

async function loadEnv() {
  const env = { ...process.env };
  if (!existsSync('.env')) return env;
  const contents = await readFile('.env', 'utf8');
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in env)) env[k] = v;
  }
  return env;
}
