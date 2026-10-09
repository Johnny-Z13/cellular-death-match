// Which living cultures count toward the current goal. The dish draws a
// dashed ring around each and the label overlay marks their strain, so the
// goal bar's sentence points at something the player can see.
import type { EnemySpawn } from '../content/enemies';
import { ARCHETYPE_ECOLOGY } from '../content/ecology';
import type { ObjectiveDef } from '../content/objectives';

export interface GoalCandidate {
  spawn: EnemySpawn;
  vol: number;
}

export function goalCultureIds(
  def: ObjectiveDef,
  cultures: ReadonlyMap<number, GoalCandidate>,
): Set<number> {
  const ids = new Set<number>();
  const living = [...cultures].filter(([, culture]) => culture.vol > 0);
  switch (def.kind) {
    case 'discover_breed':
    case 'stabilize_breed':
      for (const [id, { spawn }] of living) if (spawn.breedId === def.breedId) ids.add(id);
      break;
    case 'breed_archetype':
    case 'dominant_archetype':
      for (const [id, { spawn }] of living) if (spawn.archetype === def.archetype) ids.add(id);
      break;
    case 'preserve_grazers':
      for (const [id, { spawn }] of living) {
        const role = ARCHETYPE_ECOLOGY[spawn.archetype].role;
        if (role === 'grazer' || role === 'propagator') ids.add(id);
      }
      break;
    case 'mega_culture': {
      let best: [number, number] | null = null;
      for (const [id, { vol }] of living) if (!best || vol > best[1]) best = [id, vol];
      if (best) ids.add(best[0]);
      break;
    }
    default:
      break;
  }
  return ids;
}
