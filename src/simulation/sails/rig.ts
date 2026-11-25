import { SAILS } from '../config';
import { clamp, norm180, sign } from '../math';

/** Mainsheet value → maximum boom angle magnitude. */
export function maxBoomAngle(sheet: number): number {
  return SAILS.minBoom + (1 - clamp(sheet, 0, 1)) * (SAILS.maxBoom - SAILS.minBoom);
}
/** Inverse: sheet value for a desired boom angle magnitude. */
export function sheetForBoomAngle(angle: number): number {
  return clamp(1 - (Math.abs(angle) - SAILS.minBoom) / (SAILS.maxBoom - SAILS.minBoom), 0, 1);
}
export function maxJibAngle(sheet: number): number {
  return SAILS.minJib + (1 - clamp(sheet, 0, 1)) * (SAILS.maxJib - SAILS.minJib);
}
export function sheetForJibAngle(angle: number): number {
  return clamp(1 - (Math.abs(angle) - SAILS.minJib) / (SAILS.maxJib - SAILS.minJib), 0, 1);
}

/**
 * Where the wind wants to put the boom, given the mainsheet constraint.
 * A free sail weathervanes (chord along the flow = -AWA). Downwind the boom stays on its side
 * until the boat is more than `byTheLeeLimit` by the lee, then the wind throws it across.
 */
export function mainBoomTarget(awa: number, sheet: number, currentBoom: number): number {
  const maxB = maxBoomAngle(sheet);
  const free = norm180(-awa);
  const curSide = sign(currentBoom);
  if (
    curSide !== 0 &&
    sign(free) !== curSide &&
    Math.abs(awa) > 180 - SAILS.byTheLeeLimit &&
    Math.abs(currentBoom) > 20
  ) {
    return curSide * maxB;
  }
  return clamp(free, -maxB, maxB);
}

/** Angular bounds for the jib from both sheets. Returns [lower, upper] (deg, + = starboard). */
export function jibBounds(portSheet: number, starboardSheet: number): [number, number] {
  let lower = -maxJibAngle(portSheet);
  let upper = maxJibAngle(starboardSheet);
  // A loaded sheet keeps the clew on its own side of the boat.
  if (starboardSheet > SAILS.jibCrossHold) lower = Math.max(lower, 2);
  if (portSheet > SAILS.jibCrossHold) upper = Math.min(upper, -2);
  if (lower > upper) {
    const mid = (lower + upper) / 2;
    return [mid, mid];
  }
  return [lower, upper];
}

/** Clamp an angle into [lo, hi], choosing the bound that is circularly closest when outside. */
export function circularClamp(a: number, lo: number, hi: number): number {
  if (a >= lo && a <= hi) return a;
  return Math.abs(norm180(a - lo)) <= Math.abs(norm180(a - hi)) ? lo : hi;
}

export function jibTarget(awa: number, portSheet: number, starboardSheet: number): number {
  const [lo, hi] = jibBounds(portSheet, starboardSheet);
  return circularClamp(norm180(-awa), lo, hi);
}
