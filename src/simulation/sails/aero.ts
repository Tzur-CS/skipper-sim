import { AERO } from '../config';
import { DEG, clamp, interp, norm180, sign } from '../math';

export interface SailForce {
  /** Force coefficients * area (m^2): fx = toward starboard, fy = forward. Multiply by dynamic pressure for N. */
  fx: number;
  fy: number;
  /** Incidence of the sail chord to the apparent flow (0..90). */
  incidence: number;
  /** 0..1 luffing. */
  luff: number;
  /** Wind is pressing on the sail's outboard face (aback / by the lee). */
  backed: boolean;
}

/**
 * Simplified lift/drag model for a sail.
 * @param chordAngle sail chord angle from the aft centerline (+ = starboard)
 * @param awa apparent wind angle (+ = from starboard)
 * @param area effective area (m^2)
 */
export function sailForce(chordAngle: number, awa: number, area: number): SailForce {
  if (area <= 1e-4) return { fx: 0, fy: 0, incidence: 0, luff: 0, backed: false };
  // Boat frame: x = starboard, y = forward. Flow direction (where the air goes).
  const fx = -Math.sin(awa * DEG);
  const fy = -Math.cos(awa * DEG);
  // Chord points aft from the mast/stay, rotated toward the sail's side.
  const th = chordAngle * DEG;
  const cx = Math.sin(th);
  const cy = -Math.cos(th);
  const nx = Math.cos(th);
  const ny = Math.sin(th);
  const fc = fx * cx + fy * cy;
  const fn = fx * nx + fy * ny;
  const incidence = Math.acos(clamp(Math.abs(fc), 0, 1)) / DEG;
  const side = chordAngle !== 0 ? sign(chordAngle) : -sign(awa) || 1;
  const pushSign = fn >= 0 ? 1 : -1;
  // Properly filled sail is pushed outboard (away from the centreline).
  const backed = pushSign !== side && incidence > 4 && Math.abs(norm180(awa)) < 165;
  // Lift direction: component of the push direction perpendicular to the flow.
  let lx = pushSign * nx;
  let ly = pushSign * ny;
  const d = lx * fx + ly * fy;
  lx -= d * fx;
  ly -= d * fy;
  const ll = Math.hypot(lx, ly) || 1;
  lx /= ll;
  ly /= ll;
  const cl = interp(AERO.lift, incidence);
  const luffPre = clamp((AERO.luffNone - incidence) / (AERO.luffNone - AERO.luffFull), 0, 1);
  const cd = interp(AERO.drag, incidence) + AERO.flogDrag * luffPre;
  const luff = luffPre;
  // Luffing sails flog: lift collapses, a little flapping drag remains.
  const liftScale = 1 - 0.85 * luff;
  return {
    fx: area * (cl * liftScale * lx + cd * fx),
    fy: area * (cl * liftScale * ly + cd * fy),
    incidence,
    luff,
    backed,
  };
}

/** Dynamic pressure (N/m^2) for an apparent wind speed in knots. */
export function dynamicPressure(awsKt: number): number {
  const v = awsKt * 0.514444;
  return 0.5 * AERO.airDensity * v * v;
}

/**
 * The chord angle that gives optimal incidence for the given apparent wind on the given side,
 * limited to the achievable range.
 */
export function optimalChordAngle(awa: number, side: number, minAngle: number, maxAngle: number): number {
  const mag = clamp(Math.abs(awa) - AERO.optimalIncidence, minAngle, maxAngle);
  return side * mag;
}

/** Trim quality 0..1 comparing actual chord angle with optimal. */
export function trimQuality(actual: number, optimal: number, luff: number, backed: boolean): number {
  if (backed) return 0;
  const err = Math.abs(actual - optimal);
  return clamp(1 - err / 30, 0, 1) * (1 - 0.7 * luff);
}
