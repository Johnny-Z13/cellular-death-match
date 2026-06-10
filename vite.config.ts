import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Resolve a human-readable build identity for the title screen so the user can
// confirm a deploy is the latest. Tries git first, then Railway's build env
// vars (the build container often ships without a .git dir), and always falls
// back to a build timestamp so the readout is never empty.
function readCommitMessage(): string {
  const fromGit = tryGit('git log -1 --pretty=%s');
  if (fromGit) return fromGit;
  const env = process.env;
  const railwayMsg = env.RAILWAY_GIT_COMMIT_MESSAGE?.trim();
  if (railwayMsg) return railwayMsg;
  const sha = (env.RAILWAY_GIT_COMMIT_SHA ?? env.VERCEL_GIT_COMMIT_SHA ?? '').trim();
  if (sha) return `build ${sha.slice(0, 7)}`;
  return `build ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

function tryGit(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

export default defineConfig({
  define: {
    __COMMIT_MESSAGE__: JSON.stringify(readCommitMessage()),
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
