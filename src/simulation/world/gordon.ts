import type { Gate, Pt, Seg, Zone } from './types';

/**
 * Schematic Tel Aviv (Gordon beach) marina. The layout is simplified for training: the coast runs
 * north-south with the land to the east, a main breakwater shelters the basin from the west and the
 * entrance opens to the north-west between the breakwater head and the north jetty.
 * REVIEW: real dimensions, entrance orientation, light characteristics and local rules must be
 * checked against the current chart / marina regulations by a qualified instructor.
 */

/** Shore line (x of the waterline). Land is x > SHORE_X. */
export const SHORE_X = 0;

export const WEST_HEAD: Pt = [-205, 215];
export const NORTH_HEAD: Pt = [-140, 175];

/** Pontoon y positions; pontoons run west from the quay to x = PONTOON_END. */
export const PONTOONS = [-160, -110, -60, -10, 40, 90, 135];
export const PONTOON_START = -18;
export const PONTOON_END = -115;
/** Half-width of a pontoon with boats moored on both sides. */
export const PONTOON_HALF = 6.5;

/** Centre line of the inner fairway between the breakwater and the pontoon ends. */
export const FAIRWAY_X = -177;

export const STRUCTURES: Seg[] = [
  { a: [SHORE_X + 12, -3000], b: [SHORE_X + 12, 3000], w: 24, kind: 'shore' },
  { a: [SHORE_X, -200], b: [-240, -200], w: 14, kind: 'breakwater' },
  { a: [-240, -200], b: [-240, 160], w: 16, kind: 'breakwater' },
  { a: [-240, 160], b: WEST_HEAD, w: 16, kind: 'breakwater' },
  { a: [SHORE_X, 175], b: NORTH_HEAD, w: 12, kind: 'breakwater' },
  ...PONTOONS.map((y): Seg => ({ a: [PONTOON_START, y], b: [PONTOON_END, y], w: PONTOON_HALF * 2, kind: 'pontoon' })),
];

/** Entrance lights (IALA region A: entering, red to port and green to starboard). */
export const ENTRANCE_LIGHTS: Array<{ pos: Pt; color: 'red' | 'green'; period: number }> = [
  { pos: WEST_HEAD, color: 'green', period: 5 },
  { pos: NORTH_HEAD, color: 'red', period: 5 },
];

export const MARINA_ZONES: Zone[] = [
  { id: 'marina', kind: 'rect', x0: -240, y0: -200, x1: SHORE_X, y1: 205 },
  { id: 'fairway', kind: 'rect', x0: -232, y0: -192, x1: PONTOON_END - PONTOON_HALF, y1: 168 },
  /** Eastern half of the fairway: starboard side when heading out (north). */
  { id: 'fairwayEast', kind: 'rect', x0: FAIRWAY_X, y0: -192, x1: PONTOON_END - PONTOON_HALF, y1: 168 },
  /** Western half of the fairway: starboard side when heading in (south). */
  { id: 'fairwayWest', kind: 'rect', x0: -232, y0: -192, x1: FAIRWAY_X, y1: 168 },
  /** Halves of the entrance: entering, keep to the west (green) half; leaving, to the east (red) half. */
  { id: 'entranceWest', kind: 'circle', x: -188.75, y: 205, r: 20 },
  { id: 'entranceEast', kind: 'circle', x: -156.25, y: 185, r: 20 },
  /** Approach area just outside the entrance. */
  { id: 'approach', kind: 'circle', x: -215, y: 270, r: 70 },
  /** Open water clear of the entrance. */
  { id: 'open', kind: 'circle', x: -340, y: 290, r: 55 },
  /** Berth area: mouth of the slip between the 4th and 5th pontoons. */
  { id: 'berth', kind: 'circle', x: -135, y: 15, r: 16 },
];

export const SWIM_ZONE: Zone = { id: 'swim', kind: 'rect', x0: -170, y0: -1400, x1: SHORE_X, y1: -260 };

export const MARINA_GATES: Gate[] = [{ id: 'entrance', a: WEST_HEAD, b: NORTH_HEAD, inside: [-170, 150] }];

/** Moored boats along both sides of each pontoon (visual only; collisions use the pontoon width). */
export function mooredBoats(): Array<{ x: number; y: number; mast: boolean; len: number }> {
  const out: Array<{ x: number; y: number; mast: boolean; len: number }> = [];
  let k = 0;
  for (const y of PONTOONS) {
    for (let x = PONTOON_START - 8; x > PONTOON_END + 3; x -= 6.5) {
      for (const side of [-1, 1]) {
        k++;
        if ((k * 7919) % 11 === 0) continue; // a few empty berths
        out.push({ x, y: y + side * 4.2, mast: (k * 31) % 5 !== 0, len: 8 + ((k * 13) % 5) });
      }
    }
  }
  return out;
}

/** Deterministic city blocks along the shore (Hayarkon street hotels and towers). */
export function cityBlocks(): Array<{ x: number; y: number; w: number; d: number; h: number }> {
  const out: Array<{ x: number; y: number; w: number; d: number; h: number }> = [];
  for (let i = 0; i < 70; i++) {
    const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const r2 = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
    const y = -1800 + i * 52 + r1 * 20;
    const row = i % 3;
    out.push({ x: 90 + row * 70 + r2 * 25, y, w: 22 + r2 * 18, d: 20 + r1 * 15, h: 18 + Math.pow(r1, 2) * 90 + (row === 2 ? 30 : 0) });
  }
  return out;
}
