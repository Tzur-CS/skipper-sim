import { SimEngine } from '../simulation/physics/engine';
import { clamp, norm180 } from '../simulation/math';
import { ScenarioEvaluator, type TrainingMode } from '../training/evaluation/evaluator';
import type { ScenarioDef } from '../training/scenarios/types';

export function setup(def: ScenarioDef, mode: TrainingMode = 'practice') {
  const engine = new SimEngine(def.initial);
  engine.headwayAssistKt = def.headwayAssistKt ?? null;
  const ev = new ScenarioEvaluator(def, engine, mode);
  const dt = 1 / 30;
  /** Advance in 1/30 s ticks (2 physics steps each), calling `control` before each tick. */
  const run = (seconds: number, control?: () => void | boolean) => {
    const n = Math.round(seconds / dt);
    for (let i = 0; i < n && !ev.finished; i++) {
      if (control?.() === true) break;
      engine.advance(dt);
      ev.tick(dt);
    }
  };
  /** Simple autopilot: steer to hold a signed true-wind angle. */
  const holdTwa = (twa: number, gain = 1 / 12) => {
    const s = engine.state;
    const desired = s.wind.trueFrom - twa;
    const err = norm180(desired - s.boat.heading);
    engine.setHelm(clamp(err * gain - s.boat.yawRate * 0.08, -1, 1));
  };
  return { engine, ev, run, holdTwa };
}

/** Steer toward a point (world metres). Returns the distance to it. */
export function steerTo(engine: SimEngine, x: number, y: number, gain = 1 / 25): number {
  const s = engine.state;
  const brg = (Math.atan2(x - s.boat.x, y - s.boat.y) * 180) / Math.PI;
  const err = norm180(brg - s.boat.heading);
  engine.setHelm(clamp(err * gain - s.boat.yawRate * 0.08, -1, 1));
  return Math.hypot(x - s.boat.x, y - s.boat.y);
}

/** Follow waypoints in order; advance when within `tol` m. Returns a control function for `run`. */
export function route(engine: SimEngine, pts: Array<[number, number]>, tol = 12) {
  let i = 0;
  return () => {
    if (i >= pts.length) {
      engine.setHelm(0);
      return;
    }
    if (steerTo(engine, pts[i][0], pts[i][1]) < tol) i++;
  };
}
