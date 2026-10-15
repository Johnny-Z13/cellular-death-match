// Export the actual cellular Dr. E renderer, not the retired painted portrait.
// Run with the Vite dev server available: node scripts/export-dre-icons.mjs [url]
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:5199';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.route('**/dre-icon-export', route => route.fulfill({
    contentType: 'text/html',
    body: `<!doctype html><html><body><canvas id="face"></canvas>
      <script type="module">
        import { createDrEFace } from '/src/ui/drEFace/faceRenderer.ts';
        import { DR_E_DIRECTION } from '/src/content/drETuning.ts';
        createDrEFace(document.querySelector('canvas'), {
          direction: DR_E_DIRECTION, size: 240, expression: 'happy', now: () => 4000,
        });
      </script></body></html>`,
  }));
  await page.goto(`${base}/dre-icon-export`);
  await page.waitForSelector('#face[data-drawn="1"]');
  const sizes = [16, 32, 48, 180, 192, 512, 1024];
  const images = await page.evaluate((sizes) => {
    const face = document.querySelector('#face');
    return sizes.map(size => {
      const output = document.createElement('canvas');
      output.width = output.height = size;
      const ctx = output.getContext('2d');
      ctx.fillStyle = '#04080a';
      ctx.fillRect(0, 0, size, size);
      ctx.imageSmoothingEnabled = false;
      // Fill the tiny icon with the face while retaining its membrane glow.
      const margin = face.width * 0.075;
      ctx.drawImage(face, margin, margin, face.width - 2 * margin, face.height - 2 * margin, 0, 0, size, size);
      return output.toDataURL('image/png').split(',')[1];
    });
  }, sizes);
  const pngs = new Map(sizes.map((size, i) => [size, Buffer.from(images[i], 'base64')]));
  for (const [size, name] of [[32, 'favicon-32.png'], [48, 'favicon.png'], [180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png'], [1024, 'icon-1024.png']]) {
    writeFileSync(`public/${name}`, pngs.get(size));
  }
  // ICO with PNG-compressed 16/32/48px entries, supported by modern browsers.
  const entries = [16, 32, 48];
  const header = Buffer.alloc(6 + 16 * entries.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach((size, i) => {
    const at = 6 + 16 * i;
    header[at] = header[at + 1] = size;
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(pngs.get(size).length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += pngs.get(size).length;
  });
  writeFileSync('public/favicon.ico', Buffer.concat([header, ...entries.map(size => pngs.get(size))]));
  console.log('Exported cellular Dr. E icons (16–1024px) from the game renderer.');
} finally {
  await browser.close();
}
