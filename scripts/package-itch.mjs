import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const output = path.join(root, 'output/itch');
const staging = path.join(output, 'staging');
const zip = path.join(output, 'cellular-death-match-itch.zip');
await readFile(path.join(dist, 'index.html')); // Fail before changing output if no build exists.
await mkdir(output, { recursive: true });
await rm(staging, { recursive: true, force: true });
await cp(dist, staging, { recursive: true });
await cp(path.join(root, 'LICENSE'), path.join(staging, 'LICENSE.txt'));
const files = [];
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed: ${relative}`);
    if (entry.isDirectory()) await collect(path.join(directory, entry.name), relative);
    else {
      if (!entry.isFile() || relative.length > 240) throw new Error(`Invalid upload path: ${relative}`);
      const bytes = await readFile(path.join(staging, relative));
      if (bytes.length > 200 * 1024 * 1024) throw new Error(`File exceeds itch limit: ${relative}`);
      files.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
await collect(staging);
files.sort((a, b) => a.path.localeCompare(b.path));
const totalBytes = files.reduce((total, file) => total + file.bytes, 0);
if (files.length > 1000 || totalBytes > 500 * 1024 * 1024) throw new Error('Build exceeds itch HTML5 limits');
await rm(zip, { force: true });
execFileSync('zip', ['-q', '-X', zip, ...files.map(file => file.path)], { cwd: staging });
execFileSync('unzip', ['-tq', zip]);
const registry = JSON.parse(await readFile(path.join(root, 'docs/publishing/evidence/crazygames-asset-attributions.json'), 'utf8'));
const pending = registry.assets.filter(asset => asset.status !== 'cleared');
const manifest = {
  createdAt: new Date().toISOString(),
  purpose: 'Private itch.io validation candidate; not approved for public release',
  archive: path.basename(zip),
  archiveBytes: (await stat(zip)).size,
  archiveSha256: createHash('sha256').update(await readFile(zip)).digest('hex'),
  fileCount: files.length,
  totalBytes,
  pendingAssetRecords: pending.length,
  files,
};
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ archive: zip, archiveBytes: manifest.archiveBytes, fileCount: files.length, totalBytes, pendingAssetRecords: pending.length }, null, 2));
