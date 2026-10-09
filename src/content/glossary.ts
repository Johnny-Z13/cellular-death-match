// One player-facing vocabulary (2026-10-09 legibility pass).
//
//   Culture  — one living mass in the dish
//   Strain   — a kind of culture (Swarmlet, Bloom Mass, a hybrid…)
//   Egg      — the tool that plants a strain; "Eggs" lists the plantable strains
//   Tool     — anything applied to the dish (Nutrient, Paste, Toxin, Water…)
//   Reaction — chemistry that fires when tools and strains combine
//   Trial    — one dish round; the Open Lab continues the numbering
//   Upgrade  — the pick between trials
//   Notebook — the collection and its history
//   Balance  — 3+ strains holding steady; pressure pauses and you may finish
//   Badge    — a long-term lab achievement
//
// Internal identifiers (breed, lifeform, genome, study, epoch, seal…) are
// unchanged; this list guards rendered text only.
export const RETIRED_PLAYER_WORDS: readonly RegExp[] = [
  /\bstud(?:y|ies)\b/i,
  /\bepochs?\b/i,
  /\bgenomes?\b/i,
  /\bspecimens?\b/i,
  /\blife ?forms?\b/i,
  /\bbreeds?\b/i,
  /\bbred\b/i,
  /\bbreeding\b/i,
  /\bchimeras?\b/i,
  /\breagents?\b/i,
  /\bcatalys(?:ts?|e|ed|is)\b/i,
  /\bcatalytic\b/i,
  /\bprotocols?\b/i,
  /\bfindings\b/i,
  /\batlas\b/i,
  /\bequilibrium\b/i,
  /\bhomeostasis\b/i,
  /\bbank(?:ed|ing)?\b/i,
  /\bsealed\b/i,
  /\babandon(?:ed)?\b/i,
  /\bfreezer\b/i,
  /\bphenotypes?\b/i,
  /\barchetypes?\b/i,
  /\blineages?\b/i,
  // Capitalised UI nouns only; lower-case English uses are fine.
  /\bMethods?\b/,
  /\bCase\b/,
];

export function retiredWordsIn(text: string): string[] {
  const found: string[] = [];
  for (const pattern of RETIRED_PLAYER_WORDS) {
    const match = pattern.exec(text);
    if (match) found.push(match[0]);
  }
  return found;
}
