export interface Rng {
  random(): number;        // [0, 1)
  randInt(n: number): number; // [0, n)
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return {
    random() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    randInt(n: number) {
      return Math.floor(this.random() * n);
    },
  };
}
