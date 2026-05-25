import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

function readCommitMessage(): string {
  try {
    return execSync('git log -1 --pretty=%s', { encoding: 'utf8' }).trim();
  } catch {
    return 'commit unavailable';
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
