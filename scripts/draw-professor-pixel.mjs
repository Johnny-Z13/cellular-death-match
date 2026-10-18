#!/usr/bin/env node
// Draws Dr. E. Mergent as a 64x80 pixel bust, placed shape by shape and pixel
// by pixel in the genome sprites' language: four-tone ramps, ink edges, a
// little speckle. No image model is involved; edit the shapes and re-run.
//
// usage: node scripts/draw-professor-pixel.mjs [out.png] [scale]
import path from 'node:path'
import sharp from 'sharp'

const OUT = path.resolve(process.argv[2] ?? 'public/art/professor/dr-e-mergent-pixel.png')
const W = 64, H = 80, SCALE = Number(process.argv[3] ?? 24)

const PAL = {
  bg: ['#04080a', '#071113', '#0a1a1d', '#0b2023'],
  ink: ['#02080a'],
  coat: ['#1b292e', '#3c535a', '#7d999e', '#c8dddc'],
  hair: ['#2f3b44', '#6f818c', '#b2c3ca', '#eef5f7'],
  skin: ['#4f2c24', '#94573f', '#cc8862', '#f0b98f'],
  brass: ['#4a3412', '#8c6420', '#d09a35', '#f6d27a'],
  glove: ['#2e1d4a', '#5d3f94', '#8f6bd0', '#c3a6f2'],
  bio: ['#0b3634', '#1f8f84', '#5be9d6', '#d4fff7'],
  knit: ['#070d0f', '#0f1c20', '#1d3238', '#2f4a52'],
  white: ['#f4fbfb'],
  agar: ['#0a2422', '#10393a'],
}

const mat = new Array(W * H).fill(null)
const tone = new Array(W * H).fill(0)
const layer = new Array(W * H).fill(-1)
const outlined = new Set()
let layerCount = 0

const idx = (x, y) => y * W + x
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const bayer = (x, y) => BAYER[y & 3][x & 3] / 16

let seed = 1337
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function ellipse(cx, cy, rx, ry) {
  const m = new Set()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) m.add(idx(x, y))
  }
  return m
}

function poly(pts) {
  const m = new Set()
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5
    let c = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j]
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c
    }
    if (c) m.add(idx(x, y))
  }
  return m
}

// A tapered quadratic stroke: hair strands, flyaways.
function strand([x0, y0], [cx, cy], [x1, y1], w0, w1 = 0.6) {
  const m = new Set()
  for (let t = 0; t <= 1; t += 0.01) {
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1
    const r = (w0 + (w1 - w0) * t) / 2
    for (let py = Math.floor(y - r); py <= Math.ceil(y + r); py++) for (let px = Math.floor(x - r); px <= Math.ceil(x + r); px++) {
      if (inside(px, py) && Math.hypot(px + 0.5 - x, py + 0.5 - y) <= r + 0.15) m.add(idx(px, py))
    }
  }
  return m
}

const union = (...ms) => new Set(ms.flatMap((m) => [...m]))
const minus = (a, b) => new Set([...a].filter((i) => !b.has(i)))

// Cel lighting from the upper left: count steps toward and away from the light
// until the shape ends. Edges facing the light highlight, far edges shade.
function edgeLight(mask, { lx = -0.75, ly = -0.65, hi = 1, sh = 1, mid = 3, base = 2, floorY = H } = {}) {
  const steps = (x, y, dx, dy) => {
    for (let s = 1; s <= 8; s++) {
      const px = Math.round(x + dx * s), py = Math.round(y + dy * s)
      if (py >= floorY) return 9
      if (!inside(px, py) || !mask.has(idx(px, py))) return s
    }
    return 9
  }
  return (x, y) => {
    const dl = steps(x, y, lx, ly)
    const ds = steps(x, y, -lx, -ly)
    if (dl <= hi) return 3
    if (ds <= sh) return 0
    if (ds <= sh + mid) return 1
    return typeof base === 'function' ? base(x, y) : base
  }
}

function paint(mask, m, toneFn = () => 2, { outline = false } = {}) {
  const L = layerCount++
  if (outline) outlined.add(L)
  for (const i of mask) {
    const x = i % W, y = (i / W) | 0
    mat[i] = m
    tone[i] = typeof toneFn === 'number' ? toneFn : toneFn(x, y)
    layer[i] = L
  }
  return L
}

// Hand-placed pixels sit just above the last painted shape: they never cast
// outlines, and outlined shapes painted later still edge them.
function px(x, y, m, t = 0) {
  if (!inside(x, y)) return
  const i = idx(x, y)
  mat[i] = m; tone[i] = t; layer[i] = layerCount - 0.5
}
function row(y, x0, x1, m, t = 0) { for (let x = x0; x <= x1; x++) px(x, y, m, t) }
function col(x, y0, y1, m, t = 0) { for (let y = y0; y <= y1; y++) px(x, y, m, t) }
function line(x0, y0, x1, y1, m, t = 0) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let s = 0; s <= n; s++) px(Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n), m, t)
}

// ---- Background: void with sparse drifting spores ---------------------------
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { mat[idx(x, y)] = 'bg'; tone[idx(x, y)] = 0 }
for (let n = 0; n < 34; n++) {
  const x = Math.floor(rand() * W), y = Math.floor(rand() * H * 0.7)
  px(x, y, 'bg', rand() < 0.25 ? 3 : 2)
}

// ---- Hair: thick locks swept back into a crest, two flyaways ----------------
paint(union(ellipse(32.5, 12, 11, 6.5), ellipse(21.8, 20, 3, 5.5), ellipse(42.8, 19.5, 3.4, 6)), 'hair', 0)
const locks = [
  [[40.5, 20], [46, 16], [50.5, 19], 3.4],
  [[38, 15.5], [42, 8.5], [51, 12], 5],
  [[33, 15], [33, 5.5], [48.5, 6], 5.6],
  [[28, 16], [24.5, 4.5], [43, 2.5], 5.8],
  [[24, 19], [18.5, 8.5], [35, 2.5], 5.2],
  [[22.5, 23], [19.5, 17], [24, 11], 3.2],
]
for (const [a, c, b, w] of locks) {
  const m = strand(a, c, b, w, 1.8)
  paint(m, 'hair', edgeLight(m, { hi: 1, sh: 1, mid: 0, base: 2 }), { outline: true })
}
for (const [a, c, b] of [[[43, 3], [46, 1], [49, 1.2]]]) {
  paint(strand(a, c, b, 1, 0.8), 'hair', 3)
}

// ---- Neck -------------------------------------------------------------------
const neck = poly([[27.5, 33], [36.5, 33], [37, 43], [27, 43]])
paint(neck, 'skin', (x, y) => (y < 38 ? 0 : x > 34 ? 0 : 1), { outline: true })

// ---- Lab coat ---------------------------------------------------------------
const coat = poly([[6, 80], [7.5, 61], [10, 52], [14, 47.5], [20.5, 44], [26, 40.5], [38, 40.5], [43.5, 44], [50, 47.5], [54, 52], [56.5, 61], [58, 80]])
// lit by the dish on the left, falling off to the right through a dither band
paint(coat, 'coat', edgeLight(coat, { mid: 2, sh: 2, base: (x, y) => (x < 41 - (y - 44) * 0.18 ? 2 : 1), floorY: H }), { outline: true })
// one fold from the armpit on the shadow side
line(49, 52, 47, 64, 'coat', 0); line(47, 65, 46.5, 79, 'coat', 0)

const knit = union(poly([[26.5, 37.5], [37.5, 37.5], [38.5, 43], [25.5, 43]]), poly([[26, 41], [38, 41], [33.6, 53], [30.4, 53]]))
paint(knit, 'knit', (x, y) => (y < 40 ? 3 : x < 31 ? 2 : 1), { outline: true })
for (let x = 27; x <= 37; x += 2) col(x, 38, 39, 'knit', 1)

const lapelL = poly([[26.5, 40], [21, 43], [23.5, 46.5], [22, 48], [30.2, 53.5], [28.5, 47], [27, 42]])
const lapelR = poly([[37.5, 40], [43, 43], [40.5, 46.5], [42, 48], [33.8, 53.5], [35.5, 47], [37, 42]])
paint(lapelL, 'coat', edgeLight(lapelL, { mid: 1, base: 3 }), { outline: true })
paint(lapelR, 'coat', (x, y) => (x <= 37 && y > 44 ? 2 : 1), { outline: true })
// front edge and buttons
col(32, 53, 79, 'ink'); col(33, 54, 79, 'coat', 0)
for (const y of [60, 68, 76]) { px(30, y, 'coat', 3); px(30, y + 1, 'coat', 1) }

// ---- Head -------------------------------------------------------------------
paint(ellipse(22.4, 25, 1.7, 2.7), 'skin', (x) => (x < 22 ? 2 : 1), { outline: true })
paint(ellipse(41.8, 25, 1.7, 2.7), 'skin', 1, { outline: true })
const head = union(ellipse(32, 22.5, 9.4, 11.5), poly([[22.8, 25], [41.2, 25], [39.5, 31.5], [35.5, 36.8], [28.5, 36.8], [24.5, 31.5]]))
const headLayer = paint(head, 'skin', edgeLight(head, { mid: 1, sh: 1 }), { outline: true })

// hairline: a high widow's peak, the crest sweeping back from it
const hairFront = union(ellipse(32.2, 12, 10.8, 4.6), poly([[30.2, 15], [33.8, 15], [32, 17.8]]), ellipse(23.6, 15.5, 2.2, 3.4), ellipse(40.6, 15.5, 2.4, 3.6))
paint(hairFront, 'hair', (x, y) => (y >= 15 ? (x < 31 ? 2 : 1) : x < 29 ? 3 : 2), { outline: true })
for (const [x0, y0, x1, y1] of [[26, 15, 24, 10], [30, 16, 28, 9], [34, 16, 35, 9], [38, 15, 41, 10]]) line(x0, y0, x1, y1, 'hair', 1)

// ---- Face -------------------------------------------------------------------
// left brow, furrowed toward the nose
row(20, 24, 26, 'hair', 2); row(21, 25, 28, 'hair', 2); row(22, 27, 30, 'hair', 1); px(24, 21, 'hair', 1)
// left eye, half-lidded
row(23, 25, 29, 'skin', 0)
row(24, 26, 29, 'white'); px(28, 24, 'ink'); px(27, 24, 'bio', 1); px(25, 24, 'skin', 1)
row(25, 26, 29, 'skin', 1)
// gaunt cheek and smile creases
line(24, 27, 25, 29, 'skin', 1); line(24, 30, 25, 32, 'skin', 1); line(39, 29, 40, 31, 'skin', 1)
// nose, long and thin
col(31, 22, 28, 'skin', 3); col(32, 27, 29, 'skin', 1)
row(30, 30, 33, 'skin', 1); px(31, 29, 'skin', 3); px(33, 30, 'skin', 0); px(30, 30, 'skin', 0)
// the too-wide grin, higher on the loupe side
for (let y = 31; y <= 36; y++) for (let x = 25; x <= 37; x++) {
  const i = idx(x, y)
  if (mat[i] === 'skin' && layer[i] === headLayer) tone[i] = x >= 36 ? 1 : 2
}
px(24, 30, 'skin', 0); px(25, 31, 'ink'); px(26, 32, 'ink'); row(32, 27, 29, 'ink'); row(33, 29, 34, 'ink'); row(32, 34, 36, 'ink'); px(37, 31, 'ink'); px(38, 30, 'ink'); px(39, 29, 'skin', 0)
row(33, 28, 28, 'skin', 1); row(34, 30, 33, 'skin', 3); row(35, 30, 33, 'skin', 1)
row(36, 30, 32, 'skin', 3)

// ---- Jeweller's loupe over the right eye ----------------------------------
const LX = 37, LY = 24.2
const ringOuter = ellipse(LX, LY, 5.4, 5.4)
const ringInner = ellipse(LX, LY, 3.7, 3.7)
const barrel = minus(ellipse(LX + 0.9, LY + 0.9, 5.6, 5.6), ringOuter)
paint(barrel, 'brass', 0, { outline: true })
paint(minus(ringOuter, ringInner), 'brass', edgeLight(ringOuter, { hi: 1, sh: 1, mid: 1 }), { outline: true })
paint(ringInner, 'white', 0)
const iris = ellipse(LX - 0.4, LY + 0.5, 2.5, 2.5)
paint(iris, 'bio', (x, y) => (x + y < LX + LY - 1 ? 2 : (y > LY + 1.5 ? 0 : 1)))
paint(ellipse(LX - 0.4, LY + 0.5, 1.15, 1.15), 'ink', 0)
px(Math.round(LX - 2), Math.round(LY - 1), 'white')
for (const i of ringInner) {
  const x = i % W, y = (i / W) | 0
  if (y <= Math.floor(LY - 2.4)) { mat[i] = 'skin'; tone[i] = 2 }
  else if (y === Math.floor(LY - 1.4)) { mat[i] = 'ink'; tone[i] = 0 }
}
px(LX - 3, LY + 1, 'white'); px(LX - 3, LY + 2, 'white')
// raised brow arching over the ring
row(17, 34, 39, 'hair', 2); px(33, 18, 'hair', 1); px(40, 18, 'hair', 1)

// ---- Pocket, pens and the colony brooch ------------------------------------
line(41, 57, 49, 56, 'ink')
col(43, 52, 56, 'brass', 2); px(43, 52, 'brass', 3)
col(45, 53, 56, 'glove', 2); px(45, 53, 'glove', 3)
const brooch = [[38, 47, 2], [39, 47, 3], [37, 48, 1], [38, 48, 2], [39, 48, 2], [40, 48, 1], [38, 49, 1], [39, 49, 1], [36, 46, 2], [41, 46, 2], [40, 50, 2], [36, 50, 1]]
for (const [x, y, t] of brooch) px(x, y, 'bio', t)

// ---- Sleeve, glove and the dish -------------------------------------------
// forearm crosses the body; the gloved hand grips the dish from its right edge
const sleeve = poly([[19, 55.5], [27.5, 55.5], [24.5, 65], [17, 80], [1, 80], [3, 72], [11, 63]])
paint(sleeve, 'coat', edgeLight(sleeve, { mid: 2, sh: 1, base: 2 }), { outline: true })
row(55, 20, 27, 'coat', 3)
const hand = union(ellipse(23, 48.8, 3.3, 3.8), poly([[20.5, 50], [26, 50], [26, 55], [21, 55]]))
paint(hand, 'glove', edgeLight(hand, { mid: 1 }), { outline: true })
line(22, 54, 25, 54, 'glove', 0)

const DX = 14, DY = 46.5
const dishOuter = ellipse(DX, DY, 9.3, 4.3)
const dishInner = ellipse(DX, DY - 0.4, 8, 3.1)
paint(minus(dishOuter, dishInner), 'bio', (x, y) => (y < DY - 1 ? 3 : (y < DY + 1 ? 2 : 1)), { outline: true })
paint(dishInner, 'agar', (x, y) => ((x + y) & 1 ? 1 : 0))
// colonies growing on the agar
const colony = ellipse(12, 46, 3, 1.7)
paint(colony, 'bio', (x, y) => (x < 12 && y < 46 ? 3 : 2))
for (const [x, y, t] of [[8, 45, 1], [15, 45, 1], [10, 47, 1], [14, 47, 1], [7, 47, 2], [16, 44, 2], [12, 44, 3]]) px(x, y, 'bio', t)
for (const [x, y, t] of [[17, 47, 2], [18, 47, 3], [17, 48, 1]]) px(x, y, 'brass', t)
px(9, 48, 'glove', 3); px(10, 48, 'glove', 2)
// glass highlight on the far rim
row(42, 10, 14, 'white'); px(6, 43, 'white')
// thumb across the lid, fingertips curled under the near rim
paint(ellipse(20.5, 43.4, 2.3, 1.15), 'glove', (x, y) => (y < 43 ? 3 : 2), { outline: true })
for (const fx of [18.2, 20.4]) paint(ellipse(fx, 51, 1.15, 1.2), 'glove', (x, y) => (y < 51 ? 3 : 1), { outline: true })

// ---- Outlines: shapes cast an ink edge onto whatever sits behind them -------
const outlineHits = []
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y)
  if (mat[i] === 'bg' || mat[i] === 'ink') continue
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!inside(x + dx, y + dy)) continue
    const j = idx(x + dx, y + dy)
    if (layer[j] > layer[i] && outlined.has(layer[j])) { outlineHits.push([i, mat[j] === mat[i]]); break }
  }
}
// Across materials the edge is ink; within one material (lapel on coat, lock on
// lock) it is that material's darkest tone.
for (const [i, same] of outlineHits) { if (!same) mat[i] = 'ink'; tone[i] = 0 }

// ---- Glow from the culture: a dithered halo in the void ---------------------
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y)
  const d = Math.hypot(x + 0.5 - DX, (y + 0.5 - DY) * 1.5)
  if (mat[i] === 'bg' && d < 12 && bayer(x, y) < ((12 - d) / 12) * 0.32) { mat[i] = 'bio'; tone[i] = 0 }
}

// ---- Speckle: noisy transitions like the genome sprites ---------------------
const speckle = { coat: 0.04, hair: 0.05, glove: 0.04 }
const next = tone.slice()
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = idx(x, y)
  const p = speckle[mat[i]]
  if (!p) continue
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    if (!inside(x + dx, y + dy)) continue
    const j = idx(x + dx, y + dy)
    if (mat[j] === mat[i] && tone[j] !== tone[i] && rand() < p) { next[i] = tone[j]; break }
  }
}
for (let i = 0; i < next.length; i++) tone[i] = next[i]

// ---- Write ------------------------------------------------------------------
const hex = (h) => [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16))
// The void stays transparent so every UI slot supplies its own backdrop.
const buf = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) {
  const ramp = PAL[mat[i]]
  buf.set(hex(ramp[Math.min(tone[i], ramp.length - 1)]), i * 4)
  buf[i * 4 + 3] = mat[i] === 'bg' && tone[i] === 0 ? 0 : 255
}
await sharp(buf, { raw: { width: W, height: H, channels: 4 } })
  .resize(W * SCALE, H * SCALE, { kernel: sharp.kernel.nearest })
  .png({ compressionLevel: 9 })
  .toFile(OUT)
console.log('wrote', OUT)
