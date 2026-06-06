// @ts-expect-error Vitest runs this test in Node; the app tsconfig does not ship Node types.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const debugSource = readFileSync('src/ui/debug.ts', 'utf8');
const mainSource = readFileSync('src/main.ts', 'utf8');
const html = readFileSync('index.html', 'utf8');

describe('debug discovery readout', () => {
  it('shows named catalyst and lifeform discoveries in the inspector', () => {
    expect(html).toContain('id="dbg-discovery-catalysts"');
    expect(html).toContain('id="dbg-discovery-lifeforms"');

    expect(debugSource).toContain('discoveredCatalysts: string[];');
    expect(debugSource).toContain('discoveredLifeforms: string[];');
    expect(debugSource).toContain("const discoveryCatalysts = get('dbg-discovery-catalysts');");
    expect(debugSource).toContain("const discoveryLifeforms = get('dbg-discovery-lifeforms');");
    expect(debugSource).toContain('discoveryCatalysts.textContent = discoveryListText(');
    expect(debugSource).toContain('discoveryLifeforms.textContent = discoveryListText(');
    expect(debugSource).toContain("function discoveryListText(label: string, values: readonly string[]): string {");

    expect(mainSource).toContain('discoveredCatalysts: string[];');
    expect(mainSource).toContain('discoveredLifeforms: string[];');
    expect(mainSource).toContain('discoveryProgression.discoveredNoteIds');
    expect(mainSource).toContain('DISCOVERY_NOTES[noteId].title');
    expect(mainSource).toContain('BREED_DEFS[breedId].name');
  });
});
