import { POINTS_OF_SAIL } from '../config';
import type { PointOfSail, Tack } from '../types';

/** Tack is named after the side the wind comes over. Within `headBand` deg of the bow = head to wind. */
export function tackFromTwa(twa: number, headBand = 2): Tack {
  if (Math.abs(twa) < headBand) return 'headToWind';
  return twa > 0 ? 'starboard' : 'port';
}

export function pointOfSailFromTwa(twa: number): PointOfSail {
  const a = Math.abs(twa);
  for (const p of POINTS_OF_SAIL) if (a < p.max) return p.id;
  return 'running';
}
