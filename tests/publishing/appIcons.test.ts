// @ts-expect-error Vitest runs this check in Node; app tsconfig omits Node types.
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('ships one consistent Dr. E icon set across browser, desktop install and share metadata', () => {
  expect(() => execFileSync('node', ['scripts/audit-app-icons.mjs'], { stdio: 'pipe' })).not.toThrow();
});
