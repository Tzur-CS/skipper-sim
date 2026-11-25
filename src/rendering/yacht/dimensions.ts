import { YACHT } from '../../simulation/config';

/** Rendering-space yacht layout (metres, local frame: +x starboard, +y up, -z bow). */
export const L = {
  bowZ: -6.1,
  sternZ: 6.1,
  halfBeam: YACHT.beam / 2,
  deckAft: 1.12,
  deckFwd: 1.5,
  mastZ: YACHT.mastStation,
  mastBaseY: 1.75,
  mastTopY: 1.3 + YACHT.mastHeight,
  goosenecY: 2.85,
  boomLength: YACHT.boomLength,
  hounds: 1.3 + YACHT.forestayHeight,
  tack: [0, 1.55, -5.95] as const,
  cockpit: { x: 1.2, zFwd: 1.7, zAft: 5.75, floorY: YACHT.cockpitFloor },
  wheel: { z: YACHT.wheelStation, y: YACHT.cockpitFloor + 0.95, r: 0.5 },
  eye: { z: YACHT.helmStation + 0.45, y: YACHT.cockpitFloor + YACHT.eyeHeight + 0.3 },
  jibFoot: 5.4,
  mainFoot: YACHT.boomLength - 0.2,
  jibCar: { x: 1.5, y: 1.35, z: 0.9 },
  /** Jib-sheet winches (one per side), forward on the cockpit coamings. */
  winch: { x: 1.42, y: 1.32, z: 3.2 },
  /** Mainsheet winches (one per side), aft on the coamings within reach of the helm. */
  mainWinch: { x: 1.42, y: 1.32, z: 4.7 },
  /** Turning blocks at each end of the traveller, and the fairlead on top of the coaming. */
  mainBlock: { x: 0.92, y: 1.08 },
  mainFairlead: { x: 1.22, y: 1.5, z: 4.35 },
  traveller: { y: 1.05, z: 3.55 },
};

/** Sheer (deck edge) height along the hull, u = 0 at bow → 1 at stern. */
export const sheerAt = (u: number) => L.deckAft + (L.deckFwd - L.deckAft) * (1 - u) * (1 - u);
/** Half beam at deck. */
export function halfBeamAt(u: number): number {
  if (u < 0.55) return L.halfBeam * Math.pow(Math.sin(((u / 0.55) * Math.PI) / 2), 0.75);
  const k = (u - 0.55) / 0.45;
  return L.halfBeam * (1 - 0.13 * k * k);
}
/** Canoe-body depth below the waterline. */
export const depthAt = (u: number) => 0.08 + 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.7);
export const zAt = (u: number) => L.bowZ + (L.sternZ - L.bowZ) * u;
