# Discoverer's Notebook Design

## Intent

Add a Discoverer's Notebook as the game's catalogue and meta-progression surface. The main dish stays clean and playable; the notebook gives the player a place to review what they have found, see locked mysteries, and pick the next experiment without turning the live UI into a spreadsheet.

## Current Audit

The current discovery spine is already strong:

| Area | Current state | Gap |
| --- | --- | --- |
| Lifeforms | Starter strains plus rare breeds live in `LIFEFORM_IDENTITIES` and `BREED_DEFS`. Locked lifeforms show as unknown cards in the right rack. | No persistent catalogue view with flavour, clue, or discovery status. |
| Catalysts | `REACTION_RECIPES` defines named recipes, caution, inputs, and effect types. `DISCOVERY_NOTES` stores note copy. | Discoveries are visible in the dish log/debug text only; there is no browsable list. |
| Strange events | Mutation, crisis, accident, outbreak, water notes, and fold markers are signposted in log/canvas. | These are not tracked as catalogue entries unless they are catalyst notes. |
| Unlock flow | `DiscoveryProgressionState` owns discovered breed/note IDs, unlocked tools/lifeforms, reveal-all, and completion research grants. | The UI cannot show overall progress or unknown future discoveries. |
| Debug/save | `discoverySave.ts` supports optional persistence, clear, and reveal all. Debug exposes counts plus named catalysts/lifeforms. | Debug actions do not refresh a catalogue because no catalogue exists. |
| Effects | Dish event rings, flashes, and color cycling exist for mutations/folds/critical reactions. | More reaction families can use these effects, but clarity should remain more important than noise. |

## Notebook UX

The notebook is a dedicated overlay screen opened from a small UI control and from the Escape/debug menu. It should not permanently take space from the Petri dish.

Notebook structure:

- Header: "Discoverer's Notebook", progress count, close button.
- Tabs/filters are intentionally deferred. A single scrollable catalogue is enough for this pass.
- Sections: Lifeforms, Catalysts, Lab Notes, Strange Events.
- Discovered entries show name, short flavour description, caution/status, and one useful gameplay clue.
- Locked entries show a grey question mark card, category, and a vague hint such as "Unknown catalyst: combine unlocked reagents near a living culture."
- Debug reveal all and clear discoveries immediately refresh the notebook.

Access:

- Add one compact "Notebook" button in the HUD/title/debug controls.
- Escape closes the notebook if open, exits presentation mode if active, otherwise toggles debug/menu as it does today.
- Presentation mode hides the notebook button and overlay.

## Content Model

Create `src/content/notebook.ts` as a derived catalogue layer. It should not own save state.

Entry shape:

```ts
export type NotebookCategory = 'lifeform' | 'catalyst' | 'lab_note' | 'event';

export interface NotebookEntry {
  id: string;
  category: NotebookCategory;
  title: string;
  lockedTitle: string;
  body: string;
  clue: string;
  caution: CautionLevel;
  unlock: {
    breedId?: BreedId;
    noteId?: DiscoveryNoteId;
    starter?: boolean;
  };
}
```

Derived behaviour:

- Starter lifeforms are discovered by default.
- Rare lifeforms unlock from `discoveredBreedIds`.
- Catalyst/lab-note entries unlock from `discoveredNoteIds`.
- Strange event entries unlock from existing note IDs where possible in this pass; future passes can add explicit event IDs if needed.
- Reveal-all marks every entry as visible.

This keeps `DiscoveryProgressionState` authoritative and prevents a second progression model.

## Discovery Expansion

Add a small set of new authored discoveries that fit the current engine:

| New discovery | Type | Trigger direction | Effect |
| --- | --- | --- | --- |
| Chromatic Spill | catalyst | Acid + water + nutrient around fragile or budding tissue | Foam/conduit burst with stronger visible color cycling. |
| Lattice Bloom | catalyst | Crystal + nutrient near budding or mirror cultures | Crystal-fed bloom that can stabilize Static Lattice clues. |
| Spore Comet | catalyst | Agitated hatch inside foam or conduit | Fast volatile flare, good early/mid mystery. |
| Echo Ring | event note | Mirror or Static Lattice near a fold fault | Fold marker and catalogue event clue. |
| Velvet Prison | catalyst | Salt + toxin around gelatinous or boss cultures | Slowing lysis field that signals danger but not instant loss. |

The goal is not to add dozens of recipes. Add enough that the notebook feels worth opening and the dish has more mid-run mystery.

## Visual Rules

- Important notebook-relevant discoveries still need dish-log and canvas signposting.
- Critical catalysts can add a second short flash marker, as existing critical reactions do.
- New effects should reuse existing `foam`, `conduit`, `flare`, `crystal`, `fold_fault`, or `lysis` effect types unless a new type is clearly needed.
- Avoid unreadable particle spam. Short-lived rings and palette-cycling are preferred over permanent clutter.

## Testing Requirements

- Content test: every notebook entry has copy, clue, caution, category, and an unlock rule.
- Progression test: starter entries are visible at run start, hidden entries lock, reveal-all reveals all, clear returns to starter entries.
- UI source test: HTML contains notebook overlay/control IDs and CSS hides it in presentation mode.
- Screen test: `createScreens` exposes notebook open/close/update methods and renders locked/discovered entry states.
- Catalyst tests: at least three new recipes resolve from `reactionRecipeFor`.
- Arena tests: at least two new recipes create the expected effect and discovery note.
- Full verification remains `npm test`, `npm run build`, desktop browser check, and mobile browser check.

## Out Of Scope

- Permanent persistence enabled by default.
- Multi-tab notebook filtering.
- New real-world disease or medical language.
- Large new art or generated image assets.
- Refactoring `src/sim/`.

## Success Criteria

- The player can open and close the Discoverer's Notebook without cluttering the dish.
- The notebook shows discovered lifeforms, catalysts, lab notes, events, and locked unknowns.
- Existing debug reveal/clear updates the notebook state.
- The discovery loop has several new fictional reactions with clear signposting.
- Desktop and mobile remain playable with no horizontal overflow.
