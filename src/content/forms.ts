// Dr. E's friends that you rescue by merging. Each form is a few of your own
// cultures of given strains, touching in a given pattern, fed together in one
// field (wild cultures never count, nor spoil it), that
// lock into one bonded organism once the arrangement holds. The list comes
// from the merge census (docs/v1/merge-census.md): natural affinities first,
// arrangements the dish resists last. Numbers follow the dex: #000 is Dr. E,
// #001-#014 are the strains, then these.

/** The field a form must be fed in. */
export type FormFeed = 'nutrient' | 'water' | 'salt' | 'acid';

export type FormId =
  | 'bloom_buddy' | 'puddle_pals' | 'split_pea' | 'big_spoon' | 'tri_puff' | 'daisy_chain'
  | 'looking_glass' | 'lookout' | 'heavyweights' | 'mortar_and_pestle' | 'four_square' | 'the_sandwich'
  | 'rainbow';

/** The very rares: behaviours of locked forms over time, plus the Rainbow,
 *  which is any merge of four different strains. */
export type VeryRareId = 'glider' | 'blinker' | 'compound' | 'rainbow' | 'old_timer';

export interface FormDef {
  id: FormId;
  number: number;
  name: string;
  /** Strain keys as the dish names them: an archetype, a breed id or 'control'. */
  strains: readonly string[];
  /** Which strains touch, as index pairs into `strains`. Every other pair
   *  must be apart, so a triangle and a chain are different forms. */
  touching: ReadonlyArray<readonly [number, number]>;
  feed: FormFeed;
  /** Dr. E's line on its dex page; 90 characters at most. */
  note: string;
  /** What Dr. E says when he hints at it. */
  hint: string;
}

/** The Rainbow has no fixed arrangement: any isolated group of four
 *  different strains, fed with Nutrient, held for the lock window. */
export const RAINBOW_FORM: FormDef = {
  id: 'rainbow', number: 30, name: 'Rainbow', strains: [], touching: [], feed: 'nutrient',
  note: 'Four strains, one organism. A Rainbow!',
  hint: 'One merge made of four different strains.',
};

export const FORMS: readonly FormDef[] = [
  {
    id: 'bloom_buddy', number: 15, name: 'Bloom Buddy', strains: ['bloom_mass', 'swarmlet'], touching: [[0, 1]], feed: 'nutrient',
    note: 'Bloom Buddy! Two old pals, fed till they stuck.',
    hint: 'Feed a Swarmlet and a Bloom Mass together. Just the two of them.',
  },
  {
    id: 'puddle_pals', number: 16, name: 'Puddle Pals', strains: ['swarmlet', 'swarmlet'], touching: [[0, 1]], feed: 'nutrient',
    note: 'Puddle Pals. Two Swarmlets who refuse to let go.',
    hint: 'Two Swarmlets, alone, sharing one meal.',
  },
  {
    id: 'split_pea', number: 17, name: 'Split Pea', strains: ['splitter', 'swarmlet'], touching: [[0, 1]], feed: 'nutrient',
    note: 'Split Pea: a Splitter that finally found its other half.',
    hint: 'A Splitter and a Swarmlet, fed together, away from the crowd.',
  },
  {
    id: 'big_spoon', number: 18, name: 'Big Spoon', strains: ['bruiser', 'swarmlet'], touching: [[0, 1]], feed: 'nutrient',
    note: 'Big Spoon. The Bruiser hugs; the Swarmlet allows it.',
    hint: 'A Bruiser that shares dinner with a Swarmlet instead of eating it.',
  },
  {
    id: 'tri_puff', number: 19, name: 'Tri-Puff', strains: ['swarmlet', 'swarmlet', 'swarmlet'], touching: [[0, 1], [0, 2], [1, 2]], feed: 'nutrient',
    note: 'Tri-Puff! Three Swarmlets, all touching, all smug.',
    hint: 'Three Swarmlets, each one touching the other two.',
  },
  {
    id: 'daisy_chain', number: 20, name: 'Daisy Chain', strains: ['splitter', 'swarmlet', 'swarmlet'], touching: [[0, 1], [1, 2]], feed: 'nutrient',
    note: 'Daisy Chain: Splitter, Swarmlet, Swarmlet, holding hands.',
    hint: 'Line them up: a Splitter, then two Swarmlets in a row.',
  },
  {
    id: 'looking_glass', number: 21, name: 'Looking Glass', strains: ['mirror', 'swarmlet'], touching: [[0, 1]], feed: 'water',
    note: 'Looking Glass. The Mirror finally has something to copy.',
    hint: 'A Mirror and a Swarmlet, together, in Water.',
  },
  {
    id: 'lookout', number: 22, name: 'Lookout', strains: ['sniper', 'swarmlet'], touching: [[0, 1]], feed: 'water',
    note: 'Lookout! A Sniper that guards a Swarmlet instead of shooting it.',
    hint: 'A Sniper and a Swarmlet sharing a puddle of Water.',
  },
  {
    id: 'heavyweights', number: 23, name: 'Heavyweights', strains: ['bruiser', 'bruiser'], touching: [[0, 1]], feed: 'salt',
    note: 'Heavyweights. Two Bruisers, salted into one big lump.',
    hint: 'Two Bruisers in Salt, alone together.',
  },
  {
    id: 'mortar_and_pestle', number: 24, name: 'Mortar and Pestle', strains: ['bruiser', 'splitter'], touching: [[0, 1]], feed: 'salt',
    note: 'Mortar and Pestle. One grinds, one splits. Very tidy.',
    hint: 'A Bruiser and a Splitter, in Salt.',
  },
  {
    id: 'four_square', number: 25, name: 'Four Square', strains: ['swarmlet', 'swarmlet', 'swarmlet', 'swarmlet'], touching: [[0, 1], [1, 2], [2, 3], [0, 3]], feed: 'nutrient',
    note: 'Four Square! A ring of Swarmlets with a hole in the middle.',
    hint: 'Four Swarmlets in a ring, each touching only its two neighbours.',
  },
  {
    // Johnny's "two red fused around the green": on the dish the Snipers wrap
    // the Splitter until all three touch, so the form is that triangle.
    id: 'the_sandwich', number: 26, name: 'The Sandwich', strains: ['sniper', 'splitter', 'sniper'], touching: [[0, 1], [1, 2], [0, 2]], feed: 'nutrient',
    note: 'The Sandwich. Two Snipers hugging a Splitter, nobody shooting. Delicious.',
    hint: 'Two Snipers hugging one Splitter, all three touching, fed together.',
  },
];
