import { norm180, norm360, sign } from '../../simulation/math';
import type { SimEvent, SimState } from '../../simulation/types';
import type { Cond, Range } from '../scenarios/types';

export interface CondContext {
  s: SimState;
  events: SimEvent[];
  /** Simulation time the scenario started (events before are ignored). */
  startT: number;
  /** Time the current step became active. */
  stepT: number;
  /** Previous values for detecting line motion. */
  prev?: { hoist: number; deployed: number; mainsheet: number };
  /** Own heading when the scenario started. */
  initHeading?: number;
}

const inRange = (v: number, r: Range) => (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max);

export function dataMatches(e: SimEvent, data?: Record<string, string | number | boolean>): boolean {
  if (!data) return true;
  for (const k of Object.keys(data)) if (e.data?.[k] !== data[k]) return false;
  return true;
}

export function evalCond(c: Cond, ctx: CondContext): boolean {
  const s = ctx.s;
  const lee = -sign(s.derived.awa) || 1;
  if ('all' in c) return c.all.every((x) => evalCond(x, ctx));
  if ('any' in c) return c.any.some((x) => evalCond(x, ctx));
  if ('not' in c) return !evalCond(c.not, ctx);
  if ('tack' in c) return s.derived.tack === c.tack;
  if ('pointOfSail' in c) return c.pointOfSail.includes(s.derived.pointOfSail);
  if ('twaAbs' in c) return inRange(Math.abs(s.derived.twa), c.twaAbs);
  if ('awaAbs' in c) return inRange(Math.abs(s.derived.awa), c.awaAbs);
  if ('speed' in c) return inRange(s.boat.speed, c.speed);
  if ('heelAbs' in c) return inRange(Math.abs(s.boat.heel), c.heelAbs);
  if ('yawRateAbs' in c) return inRange(Math.abs(s.boat.yawRate), c.yawRateAbs);
  if ('rudderAbs' in c) return inRange(Math.abs(s.boat.rudder), c.rudderAbs);
  if ('mainHoist' in c) return inRange(s.main.hoist, c.mainHoist);
  if ('mainsheet' in c) return inRange(s.main.sheet, c.mainsheet);
  if ('mainTrim' in c) return s.main.hoist > 0.05 && inRange(s.main.trim, c.mainTrim);
  if ('mainLuff' in c) return inRange(s.main.luff, c.mainLuff);
  if ('mainIncidence' in c) return inRange(s.main.incidence, c.mainIncidence);
  if ('jibDeployed' in c) return inRange(s.jib.deployed, c.jibDeployed);
  if ('jibTrim' in c) return s.jib.deployed > 0.05 && inRange(s.jib.trim, c.jibTrim);
  if ('jibLuff' in c) return inRange(s.jib.luff, c.jibLuff);
  if ('jibIncidence' in c) return inRange(s.jib.incidence, c.jibIncidence);
  if ('jibSheet' in c) {
    const side = c.jibSheet.side;
    const phys = side === 'port' ? -1 : side === 'starboard' ? 1 : side === 'leeward' ? lee : -lee;
    return inRange(phys < 0 ? s.jib.portSheet : s.jib.starboardSheet, c.jibSheet.range);
  }
  if ('jibSide' in c) {
    const js = sign(s.jib.angle);
    return c.jibSide === 'leeward' ? js === lee : js === -lee;
  }
  if ('jibBacked' in c) return s.jib.backed === c.jibBacked;
  if ('boomSide' in c) {
    const b = sign(s.main.boomAngle);
    const want = c.boomSide === 'port' ? -1 : c.boomSide === 'starboard' ? 1 : c.boomSide === 'leeward' ? lee : -lee;
    return b === want && Math.abs(s.main.boomAngle) > 2;
  }
  if ('line' in c) {
    const p = ctx.prev;
    if (!p) return false;
    const cur = c.line === 'halyard' ? s.main.hoist : c.line === 'furler' ? s.jib.deployed : s.main.sheet;
    const before = c.line === 'halyard' ? p.hoist : c.line === 'furler' ? p.deployed : p.mainsheet;
    return c.moving === 'up' ? cur > before + 1e-6 : cur < before - 1e-6;
  }
  if ('event' in c) {
    const from = c.since === 'step' ? ctx.stepT : ctx.startT;
    return ctx.events.some((e) => e.type === c.event && e.t >= from && dataMatches(e, c.data));
  }
  if ('command' in c) {
    return ctx.events.some((e) => e.type === 'crewCommand' && e.t >= ctx.startT && e.data?.command === c.command);
  }
  if ('crewReady' in c) return s.crew.readyFor === c.crewReady && s.crew.preparing <= 0;
  if ('elapsed' in c) return inRange(s.t - ctx.startT, c.elapsed);
  if ('inZone' in c) return s.zones.includes(c.inZone);
  if ('range' in c) {
    const v = s.vessels.find((x) => x.id === c.range.id);
    return !!v && inRange(v.range, c.range.range);
  }
  if ('headingDelta' in c) return inRange(Math.abs(norm180(s.boat.heading - (ctx.initHeading ?? s.boat.heading))), c.headingDelta);
  if ('headingChange' in c) return inRange(norm180(s.boat.heading - (ctx.initHeading ?? s.boat.heading)), c.headingChange);
  if ('heading' in c) {
    const lo = norm360(c.heading.min ?? 0);
    const span = norm360((c.heading.max ?? 360) - lo) || 360;
    return norm360(s.boat.heading - lo) <= span;
  }
  if ('throttle' in c) return s.motor.fitted && inRange(s.motor.target, c.throttle);
  if ('answered' in c) {
    return ctx.events.some((e) => e.type === 'answer' && e.t >= ctx.startT && e.data?.q === c.answered && (c.correct === undefined || e.data?.correct === c.correct));
  }
  return false;
}
