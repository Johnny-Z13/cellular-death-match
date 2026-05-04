import type { Cell, CellId } from './types';

export function createCell(id: CellId, targetVol: number): Cell {
  return {
    id,
    vol: 0,
    targetVol,
    centerSum: [
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ],
    center: [0, 0],
    intent: {
      vec: [0, 0],
      speed: 0,
      engulfMultiplier: 1,
      shooting: false,
    },
  };
}

// Internal: add or subtract one pixel's contribution to the circular sum,
// then recompute the center via the circular-mean trick.
//   exp(2πi * x / LX) for the x-axis, similar for y
//   center_x = (angle(sum_x / vol) / 2π) * LX, mod LX
function applyContribution(
  c: Cell,
  x: number,
  y: number,
  LX: number,
  LY: number,
  sign: 1 | -1,
): void {
  const ax = (2 * Math.PI * x) / LX;
  const ay = (2 * Math.PI * y) / LY;
  c.centerSum[0].re += sign * Math.cos(ax);
  c.centerSum[0].im += sign * Math.sin(ax);
  c.centerSum[1].re += sign * Math.cos(ay);
  c.centerSum[1].im += sign * Math.sin(ay);
}

function recomputeCenter(c: Cell, LX: number, LY: number): void {
  if (c.vol <= 0) {
    c.center = [0, 0];
    return;
  }
  // angle of (sum / vol) is the same as angle of sum (vol is positive real),
  // so we can skip the divide.
  const thetaX = Math.atan2(c.centerSum[0].im, c.centerSum[0].re);
  const thetaY = Math.atan2(c.centerSum[1].im, c.centerSum[1].re);
  // atan2 returns (-π, π]; convert to [0, 2π) then scale to grid coords.
  const ux = ((thetaX % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const uy = ((thetaY % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  c.center = [(ux / (2 * Math.PI)) * LX, (uy / (2 * Math.PI)) * LY];
}

export function addPixel(c: Cell, x: number, y: number, LX: number, LY: number): void {
  c.vol += 1;
  applyContribution(c, x, y, LX, LY, 1);
  recomputeCenter(c, LX, LY);
}

export function removePixel(c: Cell, x: number, y: number, LX: number, LY: number): void {
  c.vol -= 1;
  applyContribution(c, x, y, LX, LY, -1);
  recomputeCenter(c, LX, LY);
}
