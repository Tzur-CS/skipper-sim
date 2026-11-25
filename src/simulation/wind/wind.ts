import { DEG, norm180 } from '../math';

export interface ApparentWind {
  /** -180..180, positive = from starboard. */
  awa: number;
  aws: number;
}

/**
 * Apparent wind from true wind and boat motion.
 * @param twa true wind angle relative to the bow (deg, + = starboard)
 * @param tws true wind speed (kt)
 * @param boatSpeed boat speed along heading (kt)
 */
export function apparentWind(twa: number, tws: number, boatSpeed: number): ApparentWind {
  // Boat frame: x = starboard, y = forward. "From" vector of the true wind.
  const fx = Math.sin(twa * DEG) * tws;
  const fy = Math.cos(twa * DEG) * tws;
  // Moving forward adds a headwind "from" ahead (+y).
  const ax = fx;
  const ay = fy + boatSpeed;
  const aws = Math.hypot(ax, ay);
  const awa = aws < 1e-6 ? 0 : norm180(Math.atan2(ax, ay) / DEG);
  return { awa, aws };
}

/** True wind angle relative to the bow (+ = from starboard). */
export function trueWindAngle(windFrom: number, heading: number): number {
  return norm180(windFrom - heading);
}
