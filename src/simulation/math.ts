export const DEG = Math.PI / 180;
export const KNOT = 0.514444; // m/s per knot

/** Normalize to (-180, 180]. */
export function norm180(a: number): number {
  let x = ((a + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}

/** Normalize to [0, 360). */
export function norm360(a: number): number {
  return ((a % 360) + 360) % 360;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Move `value` toward `target` by at most `maxStep`. */
export function approach(value: number, target: number, maxStep: number): number {
  if (value < target) return Math.min(target, value + maxStep);
  return Math.max(target, value - maxStep);
}

/** Piecewise-linear interpolation over a sorted table of [x, y] points. */
export function interp(table: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (x <= table[i][0]) {
      const [x0, y0] = table[i - 1];
      const [x1, y1] = table[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
}
