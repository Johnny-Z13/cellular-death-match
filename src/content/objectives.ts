export type ObjectiveKind = 'preserve' | 'cull_red' | 'bloom' | 'sterilize' | 'balance';

export interface ObjectiveDef {
  kind: ObjectiveKind;
  name: string;
  description: string;
  target: string;
}

export const OBJECTIVES: ReadonlyArray<ObjectiveDef> = [
  {
    kind: 'preserve',
    name: 'Preserve Blue Lineages',
    description: 'Keep at least 1 non-red lifeform alive until the deadline.',
    target: '1 blue lifeform at deadline',
  },
  {
    kind: 'cull_red',
    name: 'Cull the Red Invasive',
    description: 'Reduce the red lineage below 180 volume while keeping at least 2 blue lifeforms alive.',
    target: 'red <= 180, blue >= 2',
  },
  {
    kind: 'bloom',
    name: 'Induce Bloom',
    description: 'Fill at least 10% of the dish with living cellular matter.',
    target: '10% living coverage',
  },
  {
    kind: 'sterilize',
    name: 'Sterilize Sample',
    description: 'Reduce living matter below 4% of the dish before the deadline.',
    target: '4% living coverage',
  },
  {
    kind: 'balance',
    name: 'Prevent Monoculture',
    description: 'Reach the deadline with no single lineage above 56% of living matter.',
    target: 'dominant <= 56% at deadline',
  },
];

export function objectiveForEpoch(epochIndex: number): ObjectiveDef {
  return OBJECTIVES[epochIndex % OBJECTIVES.length]!;
}
