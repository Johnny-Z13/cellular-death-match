#!/usr/bin/env node
// Generates the title-screen key art for Cellular Death Match via Nano Banana.
//   node scripts/generate-keyart.mjs           # generate missing
//   node scripts/generate-keyart.mjs --force   # regenerate
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const MODEL = 'gemini-2.5-flash-image';
const OUTPUT_DIR = 'public/art';
const STYLE_PREFIX =
  'Premium dark scientific macro photograph, deep-sea bioluminescence aesthetic, '
  + 'microscope view of a petri dish, near-black void background, cinematic depth of field, '
  + 'fine film grain, soft volumetric glow, limited palette of bio-cyan teal, warm amber, and violet, '
  + 'high contrast, elegant and clinical, no text, no words, no letters, no logos, no UI. Subject: ';

const ITEMS = {
  TITLE_KEYART: {
    file: 'title-keyart-1024.png',
    prompt:
      'an abstract colony of glowing single-celled organisms blooming across a black petri dish, '
      + 'delicate filaments and luminous cyan cell clusters with amber and violet accents radiating from a dark center, '
      + 'shallow focus, drifting particles suspended in fluid, vast empty negative space toward the edges so a title can sit over it, '
      + 'shot from directly above through cover glass with faint circular lens vignette.',
  },
};

const force = process.argv.includes('--force');

await main();

async function main() {
  const env = await loadEnv();
  const key = env.NANO_BANANA_API_KEY;
  if (!key) throw new Error('Missing NANO_BANANA_API_KEY in .env');
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const [name, item] of Object.entries(ITEMS)) {
    const outPath = join(OUTPUT_DIR, item.file);
    if (!force && existsSync(outPath)) {
      console.log(`skip ${name} (exists)`);
      continue;
    }
    const raw = await genOne(key, item);
    // Nano Banana ships ~1024px PNGs at ~1.5MB; recompress to a web-friendly
    // square so the title art stays lean.
    const buf = await sharp(raw)
      .resize(1024, 1024, { fit: 'cover' })
      .png({ quality: 82, compressionLevel: 9 })
      .toBuffer();
    await writeFile(outPath, buf);
    console.log(`wrote ${outPath} (${buf.length} bytes)`);
    await new Promise((r) => setTimeout(r, 600));
  }
}

async function genOne(key, item) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: STYLE_PREFIX + item.prompt }] }] }),
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
