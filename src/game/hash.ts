export function hash2(seed: number, x: number, y: number): number {
  let n = (seed ^ (x * 374761393) ^ (y * 668265263)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
