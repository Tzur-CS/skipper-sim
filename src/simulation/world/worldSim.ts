import { DEG, KNOT, approach, norm180, norm360 } from '../math';
import type { SimEventType } from '../types';
import { MARINA_GATES, MARINA_ZONES, STRUCTURES, SWIM_ZONE } from './gordon';
import type { Gate, Pt, Seg, VesselDef, VesselKind, VesselState, WorldDef, Zone } from './types';

type Emit = (type: SimEventType, data?: Record<string, string | number | boolean | null>) => void;

/** Rough hull radius (m) per kind, for collision detection. */
export const VESSEL_RADIUS: Record<VesselKind, number> = {
  optimist: 1.3,
  windsurfer: 1.3,
  kitesurfer: 1,
  sailingYacht: 5,
  motorYacht: 6,
  fishing: 5,
  police: 4.5,
};

/** Own boat footprint: points along the centreline (m from the centre, + = forward). */
const OWN_POINTS = [5.6, 2, -2, -5.6];
const OWN_HALF_BEAM = 1.9;

export interface OwnBoat {
  x: number;
  y: number;
  heading: number;
  /** knots */
  speed: number;
}

export function inZone(z: Zone, x: number, y: number): boolean {
  if (z.kind === 'circle') return (x - z.x) ** 2 + (y - z.y) ** 2 <= z.r * z.r;
  return x >= Math.min(z.x0, z.x1) && x <= Math.max(z.x0, z.x1) && y >= Math.min(z.y0, z.y1) && y <= Math.max(z.y0, z.y1);
}

export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + u * dx), p[1] - (a[1] + u * dy));
}

/** Compass bearing from (x1,y1) to (x2,y2). */
export function bearing(x1: number, y1: number, x2: number, y2: number): number {
  return norm360(Math.atan2(x2 - x1, y2 - y1) / DEG);
}

/** Heading for a vessel at `v` with speed `s` (m/s) to meet a target at `p` moving with velocity `u`. */
export function interceptHeading(v: Pt, s: number, p: Pt, u: Pt): number | null {
  const d: Pt = [p[0] - v[0], p[1] - v[1]];
  const a = u[0] * u[0] + u[1] * u[1] - s * s;
  const b = 2 * (d[0] * u[0] + d[1] * u[1]);
  const c = d[0] * d[0] + d[1] * d[1];
  let T: number;
  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) < 1e-9) return null;
    T = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const r = Math.sqrt(disc);
    const t1 = (-b - r) / (2 * a);
    const t2 = (-b + r) / (2 * a);
    T = Math.min(...[t1, t2].filter((x) => x > 0));
  }
  if (!Number.isFinite(T) || T <= 0) return null;
  return bearing(0, 0, d[0] + u[0] * T, d[1] + u[1] * T);
}

/**
 * Kinematic world: other vessels, structures, zones and gates. Deterministic; stepped by the
 * engine after the own boat moved. It reports events but never changes the own boat itself
 * (the engine handles collision response).
 */
export class WorldSim {
  readonly def: WorldDef;
  readonly structures: Seg[];
  readonly zones: Zone[];
  readonly gates: Gate[];
  vessels: VesselState[];
  /** Ids of zones the own boat is in. */
  zonesIn: string[] = [];
  private defs = new Map<string, VesselDef>();
  private targetHeading = new Map<string, number>();
  private interceptIdx = new Map<string, number>();
  private closeFlag = new Set<string>();
  private nearFlag = new Set<string>();
  private hitCooldown = new Map<string, number>();
  private gateSide = new Map<string, number>();
  private slowTimer = new Map<string, number>();
  private released = new Set<string>();
  private startRange = new Map<string, number>();

  constructor(def: WorldDef, own: OwnBoat) {
    this.def = def;
    this.structures = def.marina ? STRUCTURES : [];
    this.zones = [...(def.marina ? MARINA_ZONES : []), ...(def.swimZone ? [SWIM_ZONE] : []), ...(def.zones ?? [])];
    this.gates = [...(def.marina ? MARINA_GATES : []), ...(def.gates ?? [])];
    this.vessels = def.vessels.map((v) => {
      this.defs.set(v.id, v);
      this.targetHeading.set(v.id, v.heading);
      this.interceptIdx.set(v.id, 0);
      const range = Math.hypot(v.x - own.x, v.y - own.y);
      this.startRange.set(v.id, range);
      return { id: v.id, kind: v.kind, x: v.x, y: v.y, heading: norm360(v.heading), speed: v.speed, range, minRange: range, wp: 0, givingWay: false, passed: false };
    });
    this.zonesIn = this.zones.filter((z) => inZone(z, own.x, own.y)).map((z) => z.id);
    for (const g of this.gates) this.gateSide.set(g.id, this.side(g, own.x, own.y));
  }

  private side(g: Gate, x: number, y: number): number {
    const c = (g.b[0] - g.a[0]) * (y - g.a[1]) - (g.b[1] - g.a[1]) * (x - g.a[0]);
    return c >= 0 ? 1 : -1;
  }

  /** Advance the world. Returns 'structure' when the own boat hit something solid this step. */
  step(dt: number, t: number, own: OwnBoat, emit: Emit): { hit: boolean } {
    let hit = false;
    for (const [k, v] of this.hitCooldown) this.hitCooldown.set(k, v - dt);
    const oh = own.heading * DEG;
    const ou: Pt = [Math.sin(oh) * own.speed * KNOT, Math.cos(oh) * own.speed * KNOT];
    const pts: Pt[] = OWN_POINTS.map((a) => [own.x + Math.sin(oh) * a, own.y + Math.cos(oh) * a]);

    for (const v of this.vessels) {
      const d = this.defs.get(v.id)!;
      if (d.startT && t < d.startT) {
        this.updateRange(v, d, own, emit, pts);
        continue;
      }
      // Intercept: aim to meet the own boat (collision course).
      const ii = this.interceptIdx.get(v.id)!;
      if (d.intercept && ii < d.intercept.length && t >= d.intercept[ii]) {
        this.interceptIdx.set(v.id, ii + 1);
        if (!v.givingWay && !v.passed) {
          const h = interceptHeading([v.x, v.y], v.speed * KNOT, [own.x, own.y], ou);
          if (h !== null) {
            v.heading = h;
            this.targetHeading.set(v.id, h);
          }
        }
      }
      // Give-way vessel alters course when the range closes.
      if (d.giveWay && !v.givingWay && !v.passed && v.range < d.giveWay.atRange) {
        v.givingWay = true;
        this.targetHeading.set(v.id, norm360(v.heading + d.giveWay.turn));
      }
      // Path following / wandering / station keeping.
      if (d.follow && !this.released.has(v.id)) {
        const f = d.follow;
        const side = (own.heading + (f.offset < 0 ? -90 : 90)) * DEG;
        const tx = own.x + Math.sin(side) * Math.abs(f.offset);
        const ty = own.y + Math.cos(side) * Math.abs(f.offset);
        const dist = Math.hypot(tx - v.x, ty - v.y);
        if (dist > 25) {
          this.targetHeading.set(v.id, bearing(v.x, v.y, tx, ty));
          v.speed = approach(v.speed, d.speed, 3 * dt);
        } else {
          this.targetHeading.set(v.id, own.heading);
          v.speed = approach(v.speed, Math.max(0, own.speed + dist / 15), 3 * dt);
        }
        const st = own.speed < f.releaseBelowKt && dist < 60 ? (this.slowTimer.get(v.id) ?? 0) + dt : 0;
        this.slowTimer.set(v.id, st);
        if (st > 5) {
          this.released.add(v.id);
          this.targetHeading.set(v.id, norm360(own.heading + (f.offset < 0 ? -120 : 120)));
        }
      } else if (d.follow) {
        v.speed = approach(v.speed, d.speed, 2 * dt);
      } else if (d.wander) {
        const w = d.wander;
        const ang = Math.atan2(v.x - w.x, v.y - w.y);
        const radial = Math.hypot(v.x - w.x, v.y - w.y);
        // Circle clockwise with a correction toward the radius.
        const tangent = ang / DEG + 90 + (radial - w.r) * 1.2;
        this.targetHeading.set(v.id, norm360(tangent));
      } else if (d.path && !v.givingWay) {
        const p = d.path[v.wp];
        if (p) {
          if (Math.hypot(p[0] - v.x, p[1] - v.y) < 8) {
            v.wp++;
            if (v.wp >= d.path.length && d.loop) v.wp = 0;
          }
          const q = d.path[v.wp];
          if (q) this.targetHeading.set(v.id, bearing(v.x, v.y, q[0], q[1]));
          else v.speed = approach(v.speed, 0, 0.5 * dt);
        }
      }
      const th = this.targetHeading.get(v.id)!;
      const err = norm180(th - v.heading);
      const rate = v.kind === 'optimist' || v.kind === 'windsurfer' || v.kind === 'kitesurfer' ? 25 : 12;
      v.heading = norm360(v.heading + Math.max(-rate * dt, Math.min(rate * dt, err)));
      const h = v.heading * DEG;
      v.x += Math.sin(h) * v.speed * KNOT * dt;
      v.y += Math.cos(h) * v.speed * KNOT * dt;
      if (this.updateRange(v, d, own, emit, pts)) hit = true;
    }

    // Structures.
    for (const sgm of this.structures) {
      const dmin = Math.min(...pts.map((p) => segDist(p, sgm.a, sgm.b)));
      if (dmin < sgm.w / 2 + OWN_HALF_BEAM * 0.6) {
        const key = `s:${sgm.kind}`;
        if ((this.hitCooldown.get(key) ?? 0) <= 0) emit('collision', { with: 'structure', kind: sgm.kind });
        this.hitCooldown.set(key, 3);
        hit = true;
      }
    }

    // Zones.
    const now = this.zones.filter((z) => inZone(z, own.x, own.y)).map((z) => z.id);
    for (const id of now) if (!this.zonesIn.includes(id)) emit('zoneEntered', { id });
    for (const id of this.zonesIn) if (!now.includes(id)) emit('zoneExited', { id });
    this.zonesIn = now;

    // Gates.
    for (const g of this.gates) {
      const sd = this.side(g, own.x, own.y);
      const prev = this.gateSide.get(g.id)!;
      if (sd !== prev) {
        // Only count crossings within the gate span (with a little margin).
        const len = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]);
        if (segDist([own.x, own.y], g.a, g.b) < 6 || Math.hypot(own.x - (g.a[0] + g.b[0]) / 2, own.y - (g.a[1] + g.b[1]) / 2) < len / 2) {
          const inSide = this.side(g, g.inside[0], g.inside[1]);
          const cx = (g.a[0] + g.b[0]) / 2;
          const cy = (g.a[1] + g.b[1]) / 2;
          // Offset from the gate centre toward each end, as a fraction: + = toward `b`.
          const u = ((own.x - cx) * (g.b[0] - g.a[0]) + (own.y - cy) * (g.b[1] - g.a[1])) / (len * len / 2);
          emit('gateCrossed', { id: g.id, dir: sd === inSide ? 'in' : 'out', offset: Math.round(u * 100) / 100 });
        }
        this.gateSide.set(g.id, sd);
      }
    }
    return { hit };
  }

  private updateRange(v: VesselState, d: VesselDef, own: OwnBoat, emit: Emit, pts: Pt[]): boolean {
    let hit = false;
    const prev = v.range;
    v.range = Math.hypot(v.x - own.x, v.y - own.y);
    if (v.range < v.minRange) v.minRange = v.range;
    if (v.range < 200 && !this.nearFlag.has(v.id)) {
      this.nearFlag.add(v.id);
      emit('vesselClose', { id: v.id, kind: v.kind });
    }
    if (v.range < d.closeDist && !this.closeFlag.has(v.id)) {
      this.closeFlag.add(v.id);
      emit('closeQuarters', { id: v.id, kind: v.kind, dist: Math.round(v.range) });
    } else if (v.range > d.closeDist * 1.6) this.closeFlag.delete(v.id);
    const contact = Math.min(...pts.map((p) => Math.hypot(p[0] - v.x, p[1] - v.y)));
    if (contact < VESSEL_RADIUS[v.kind] + OWN_HALF_BEAM) {
      if ((this.hitCooldown.get(v.id) ?? 0) <= 0) emit('collision', { with: v.id, kind: v.kind });
      this.hitCooldown.set(v.id, 5);
      hit = true;
    }
    // CPA: only after the two have really closed in on each other.
    if (!v.passed && v.minRange < 500 && v.minRange < this.startRange.get(v.id)! - 25 && v.range > prev && v.range > v.minRange + 3) {
      v.passed = true;
      // Where is the own boat relative to the other vessel's heading? |rel| > 90 = own passed astern of it.
      const rel = norm180(bearing(v.x, v.y, own.x, own.y) - v.heading);
      const side = norm180(bearing(own.x, own.y, v.x, v.y) - own.heading) < 0 ? 'port' : 'starboard';
      emit('vesselCpa', { id: v.id, kind: v.kind, dist: Math.round(v.minRange), astern: Math.abs(rel) > 100, side });
    }
    return hit;
  }
}
