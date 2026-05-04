// Returns the shortest displacement vector from `from` to `to` on a torus
// of size LX × LY. Result is in (-LX/2, LX/2] × (-LY/2, LY/2].
//
// Use this to compute "which direction should an AI go to reach the player",
// or "how far apart are two cells, accounting for grid wrap".
export function shortestVec(
  from: readonly [number, number],
  to: readonly [number, number],
  LX: number,
  LY: number,
): [number, number] {
  return [
    shortestAxis(to[0] - from[0], LX),
    shortestAxis(to[1] - from[1], LY),
  ];
}

function shortestAxis(delta: number, L: number): number {
  // Normalize delta into (-L/2, L/2].
  let d = delta % L;
  if (d > L / 2) d -= L;
  else if (d <= -L / 2) d += L;
  return d;
}
