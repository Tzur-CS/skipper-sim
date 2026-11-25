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
