#!/usr/bin/env node
// Builds the game and stages it at playtest/play/ for the alpha tester portal,
// then records the exact build in playtest/release.json.
//   node scripts/stage-playtest.mjs "Alpha Build 1" alpha-1 "One-line summary"
// Refuses to run with uncommitted game changes: a tester build must be
// reproducible from a commit.
import { execSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync } from 'node:fs';

const [version, id, summary] = process.argv.slice(2);
if (!version || !id) {
  console.error('usage: node scripts/stage-playtest.mjs "<version>" <id> "<summary>"');
  process.exit(1);
}

const run = (command) => execSync(command, { encoding: 'utf8' }).trim();
const dirty = run('git status --porcelain -- src index.html public package.json vite.config.ts');
if (dirty) {
  console.error(`Commit the game before staging; uncommitted changes:\n${dirty}`);
  process.exit(1);
}

execSync('npm run build', { stdio: 'inherit' });
rmSync('playtest/play', { recursive: true, force: true });
cpSync('dist', 'playtest/play', { recursive: true });

const release = {
  version,
  id,
  date: new Date().toISOString().slice(0, 10),
  sourceCommit: run('git rev-parse HEAD'),
  branch: run('git rev-parse --abbrev-ref HEAD'),
  description: summary ?? '',
  play: '/play/',
  platforms: 'Any modern browser: Chrome, Edge, Safari or Firefox, on desktop, tablet or phone.',
};
writeFileSync('playtest/release.json', `${JSON.stringify(release, null, 2)}\n`);
console.log(`Staged ${version} (${release.sourceCommit.slice(0, 7)}) at playtest/play/`);
