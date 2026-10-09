// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { retiredWordsIn } from '../../src/content/glossary';
import { OBJECTIVES } from '../../src/content/objectives';
import { OBJECTIVE_POOL } from '../../src/game/objectivePool';
import { COMMON_COLD_CASE } from '../../src/content/researchCases';
import { ONBOARDING_BEATS, TRIAL_ONBOARDING_BEATS } from '../../src/game/onboardingStage';
import { UPGRADES } from '../../src/content/upgrades';
import { LIFEFORM_IDENTITIES } from '../../src/content/lifeformIdentity';
import { RESEARCH_SEALS } from '../../src/game/researchArchive';
import { BREED_DEFS, DISCOVERY_NOTES, REACTION_RECIPES } from '../../src/content/catalysis';
import { GENOME_ART } from '../../src/content/genomeArt';

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => strings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => strings(item, out));
  return out;
}

function offenders(label: string, texts: readonly string[]): string[] {
  return texts
    .filter((text) => !/^[a-z0-9_:-]+$/.test(text)) // ids, keys and asset slugs
    .flatMap((text) => retiredWordsIn(text).map((word) => `${label}: "${word}" in "${text.slice(0, 90)}"`));
}

function visibleHtmlText(): string[] {
  const html = readFileSync('index.html', 'utf8')
    .replace(/<section[^>]*debug-only[^>]*>[\s\S]*?<\/section>/g, '')
    .replace(/<div class="debug-help debug-only"[^>]*>[\s\S]*?<\/div>/g, '')
    .replace(/<label class="debug-toggle debug-only"[\s\S]*?<\/label>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '');
  const attributes = [...html.matchAll(/\s(?:aria-label|title|alt)="([^"]*)"/g)].map((match) => match[1]!);
  const text = html.replace(/<[^>]+>/g, '\n').split('\n').map((line: string) => line.trim()).filter(Boolean);
  return [...attributes, ...text];
}

describe('one player-facing vocabulary', () => {
  it('keeps retired nouns out of the page markup', () => {
    expect(offenders('index.html', visibleHtmlText())).toEqual([]);
  });

  it('keeps retired nouns out of authored copy', () => {
    const copy: Array<[string, unknown]> = [
      ['objectives', OBJECTIVES.map(({ name, description, target, hint }) => ({ name, description, target, hint }))],
      ['objective pool', OBJECTIVE_POOL.map(({ name, description, target, hint }) => ({ name, description, target, hint }))],
      ['research case', COMMON_COLD_CASE],
      ['onboarding', [ONBOARDING_BEATS, TRIAL_ONBOARDING_BEATS]],
      ['upgrades', UPGRADES.map(({ name, description }) => ({ name, description }))],
      ['strain identity', Object.values(LIFEFORM_IDENTITIES).map(({ name, role, behavior, origin }) => ({ name, role, behavior, origin }))],
      ['badges', RESEARCH_SEALS.map(({ title, description }) => ({ title, description }))],
      ['strain discovery', Object.values(BREED_DEFS).map(({ name, discoveryTrigger }) => ({ name, discoveryTrigger }))],
      ['reactions', REACTION_RECIPES.map(({ name }) => name)],
      ['notebook notes', Object.values(DISCOVERY_NOTES).map(({ title, body }) => ({ title, body }))],
      ['strain portraits', Object.values(GENOME_ART).map(({ reconstructionNote }) => reconstructionNote)],
    ];
    const found = copy.flatMap(([label, value]) => offenders(label, strings(value)));
    expect(found).toEqual([]);
  });
});
