/**
 * World model for harbour and traffic scenarios: fixed structures (breakwaters, pontoons, shore),
 * zones and gates for evaluation, and other vessels that move kinematically.
 * Coordinates are metres, x = east, y = north (same frame as BoatState).
 */

export type TimeOfDay = 'day' | 'dusk' | 'night';

export type VesselKind =
  | 'optimist'
  | 'windsurfer'
  | 'kitesurfer'
  | 'sailingYacht'
  | 'motorYacht'
  | 'fishing'
  | 'police';

export type Pt = [number, number];

/** A solid obstacle: a thick line segment. */
export interface Seg {
  a: Pt;
  b: Pt;
  /** Width, metres. */
  w: number;
  kind: 'breakwater' | 'pontoon' | 'shore';
}

export type Zone =
  | { id: string; kind: 'circle'; x: number; y: number; r: number }
  | { id: string; kind: 'rect'; x0: number; y0: number; x1: number; y1: number };

/** A line the boat can cross. `inside` is a point on the "in" side. */
export interface Gate {
  id: string;
  a: Pt;
  b: Pt;
  inside: Pt;
}

export interface VesselDef {
  id: string;
  kind: VesselKind;
  x: number;
  y: number;
  heading: number;
  /** Knots. */
  speed: number;
  /** Follow these waypoints (then stop, or loop). */
  path?: Pt[];
  loop?: boolean;
  /** Sail lazily around a centre point (dinghies, boards). */
  wander?: { x: number; y: number; r: number };
  /**
   * Simulation times (s) at which the vessel re-aims to meet the own boat, assuming the own boat
   * keeps its course and speed: it creates a real risk of collision if nobody acts.
   */
  intercept?: number[];
  /** Give-way vessel: when the range closes below `atRange` it alters course by `turn` degrees (+ = starboard). */
  giveWay?: { atRange: number; turn: number };
  /** Distance (m) that counts as "too close" for this vessel. */
  closeDist: number;
  /** Fishing: 'trawl' shows green over white, 'other' red over white. */
  fishing?: 'trawl' | 'other';
  /** Police: flashing blue light. */
  blue?: boolean;
  /**
   * Law-enforcement style approach: close in and keep station `offset` m abeam of the own boat
   * (negative = to its port side). Leaves once the own boat has slowed below `releaseBelowKt` for 5 s.
   */
  follow?: { offset: number; releaseBelowKt: number };
  /** Seconds before the vessel starts moving. */
  startT?: number;
}

export interface WorldDef {
  time: TimeOfDay;
  /** Include the Gordon beach marina (Tel Aviv) structures. */
  marina?: boolean;
  /** Show the buoyed bathing area off the beach. */
  swimZone?: boolean;
  vessels: VesselDef[];
  zones?: Zone[];
  gates?: Gate[];
}

export interface VesselState {
  id: string;
  kind: VesselKind;
  x: number;
  y: number;
  heading: number;
  speed: number;
  /** Distance to the own boat, m. */
  range: number;
  minRange: number;
  /** Index of the next path waypoint. */
  wp: number;
  givingWay: boolean;
  /** Closest point of approach already passed (range opening after closing in). */
  passed: boolean;
}
