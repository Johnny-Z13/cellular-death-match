// Builds before/after comparison sheets from docs/ux-legibility/<label>/.
// Usage: node scripts/ux-compare.mjs [before] [after]
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';

const [beforeLabel = 'before', afterLabel = 'after'] = process.argv.slice(2);
const root = 'docs/ux-legibility';
const out = `${root}/compare`;
await mkdir(out, { recursive: true });

const files = (await readdir(`${root}/${afterLabel}`)).filter((name) => name.endsWith('.jpg'));
const projects = [...new Set(files.map((name) => name.replace(/-\d\d-.*$/, '')))];
const GAP = 16;
const LABEL_H = 34;

for (const project of projects) {
  const states = files.filter((name) => new RegExp(`^${project}-\\d\\d-`).test(name)).sort();
  const rows = [];
  for (const state of states) {
    const before = sharp(`${root}/${beforeLabel}/${state}`);
    const after = sharp(`${root}/${afterLabel}/${state}`);
    const meta = await after.metadata();
    rows.push({ state, width: meta.width, height: meta.height, before: await before.toBuffer(), after: await after.toBuffer() });
  }
  if (rows.length === 0) continue;
  const scale = rows[0].width > 900 ? 0.5 : 0.75;
  const cellW = Math.round(rows[0].width * scale);
  const cellH = Math.round(rows[0].height * scale);
  const width = cellW * 2 + GAP * 3;
  const height = LABEL_H + rows.length * (cellH + GAP) + GAP;
  const composites = [{
    input: Buffer.from(`<svg width="${width}" height="${LABEL_H}"><style>text{font:600 16px sans-serif;fill:#cfeee9}</style><text x="${GAP}" y="24">BEFORE · ${project}</text><text x="${GAP * 2 + cellW}" y="24">AFTER · ${project}</text></svg>`),
    top: 0,
    left: 0,
  }];
  for (const [index, row] of rows.entries()) {
    const top = LABEL_H + index * (cellH + GAP);
    composites.push({ input: await sharp(row.before).resize(cellW, cellH).toBuffer(), top, left: GAP });
    composites.push({ input: await sharp(row.after).resize(cellW, cellH).toBuffer(), top, left: GAP * 2 + cellW });
  }
  await sharp({ create: { width, height, channels: 3, background: '#05090b' } })
    .composite(composites)
    .jpeg({ quality: 70 })
    .toFile(`${out}/${project}.jpg`);
  console.log(`${out}/${project}.jpg`);
}
