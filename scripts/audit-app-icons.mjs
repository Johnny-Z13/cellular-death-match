// Checks source icon sizes, metadata, ICO contents, staged files and optional live routes.
// node scripts/audit-app-icons.mjs [--staged] [--live https://cellular-death-match.vercel.app]
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const args = process.argv.slice(2);
const liveIndex = args.indexOf('--live');
const live = liveIndex < 0 ? null : new URL(args[liveIndex + 1]);
const staged = args.includes('--staged');
const sizes = { 'favicon-32.png': 32, 'favicon.png': 48, 'apple-touch-icon.png': 180,
  'icon-192.png': 192, 'icon-512.png': 512, 'icon-1024.png': 1024 };
const files = ['favicon.ico', ...Object.keys(sizes), 'manifest.json'];
const source = new Map(await Promise.all(files.map(async name => [name, await readFile(`public/${name}`)])));
const manifest = JSON.parse(source.get('manifest.json'));
const html = await readFile('index.html', 'utf8');
const fallback = await readFile('playtest/index.html', 'utf8');
const config = JSON.parse(await readFile('playtest/vercel.json', 'utf8'));
const version = new URL(manifest.icons[0].src, 'https://local.test/').search;
assert.match(version, /^\?v=\d+$/);
for (const [name, size] of Object.entries(sizes)) {
  const metadata = await sharp(source.get(name)).metadata();
  assert.equal(metadata.width, size, `${name} width`);
  assert.equal(metadata.height, size, `${name} height`);
}
const ico = source.get('favicon.ico');
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 3);
for (const [index, size] of [16, 32, 48].entries()) {
  const at = 6 + 16 * index;
  assert.equal(ico[at], size);
  assert.equal(ico[at + 1], size);
  const length = ico.readUInt32LE(at + 8), offset = ico.readUInt32LE(at + 12);
  assert.ok(offset >= 54 && offset + length <= ico.length, 'ICO entry bounds');
  const png = ico.subarray(offset, offset + length);
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, size);
  assert.equal(metadata.height, size);
  if (size !== 16) assert.deepEqual(png, source.get(size === 32 ? 'favicon-32.png' : 'favicon.png'));
}
for (const name of ['favicon.ico', 'favicon-32.png', 'favicon.png', 'apple-touch-icon.png']) {
  assert.ok(html.includes(`href="/${name}${version}"`), `HTML references ${name} at ${version}`);
}
assert.ok(fallback.includes(`./play/favicon.ico${version}`), 'Fallback favicon version');
for (const icon of manifest.icons) {
  const url = new URL(icon.src, 'https://local.test/');
  const name = url.pathname.slice(1);
  assert.equal(url.search, version, 'Manifest icon version');
  assert.equal(icon.sizes, `${sizes[name]}x${sizes[name]}`);
}
const share = `https://cellular-death-match.vercel.app/play/icon-512.png${version}`;
assert.ok(html.includes(`property="og:image" content="${share}"`));
assert.ok(html.includes(`name="twitter:image" content="${share}"`));
let routeChecks = 0;
for (const name of files) {
  assert.ok(config.rewrites.some(rule => rule.source === `/${name}` && rule.destination === `/play/${name}`), `Root route: ${name}`);
  if (staged) assert.deepEqual(await readFile(`playtest/play/${name}`), source.get(name), `Staged ${name}`);
  for (const prefix of ['', 'play/']) {
    const path = `/${prefix}${name}`;
    assert.ok(config.headers.some(rule => rule.source === path && rule.headers.some(header => header.key === 'Cache-Control' && header.value === 'no-cache')), `Revalidation: ${path}`);
    if (!live) continue;
    const response = await fetch(new URL(path, live), { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('cache-control') ?? '', /no-cache/, path);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), source.get(name), `Live ${path}`);
    routeChecks++;
  }
}
console.log(JSON.stringify({ ok: true, iconVersion: version, pngSizes: Object.values(sizes), icoSizes: [16, 32, 48], staged, liveRoutesChecked: routeChecks }, null, 2));
