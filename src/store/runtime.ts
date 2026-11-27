import { SimEngine, DEFAULT_CONDITIONS } from '../simulation/physics/engine';
import type { InitialConditions, WindState } from '../simulation/types';
import { ScenarioEvaluator, type DetectedError } from '../training/evaluation/evaluator';
import { getScenario } from '../training/scenarios';
import type { ScenarioDef } from '../training/scenarios/types';
import { useApp, type Session } from './appStore';
import { initialHud, useHud } from './hudStore';

/**
 * Runtime singleton connecting the simulation engine, the scenario evaluator and the UI stores.
 * The engine is the single source of truth; rendering reads it directly every frame.
 */
export const engine = new SimEngine(DEFAULT_CONDITIONS);

export const FREE_SAIL_START: InitialConditions = {
  heading: 0,
  speed: 5,
  wind: { trueFrom: 60, trueSpeed: 12 },
  mainHoist: 1,
  mainsheet: 0.7,
  jibDeployed: 1,
  jibPortSheet: 0.7,
  jibStarboardSheet: 0,
  autoTrim: true,
};

interface Runtime {
  evaluator: ScenarioEvaluator | null;
  scenario: ScenarioDef | null;
  session: Session | null;
}

let freeWind: WindState = { ...FREE_SAIL_START.wind };
let worldKey = 0;

/** Change the wind in free sailing (kept for the next reset). */
export function setFreeWind(trueFrom: number, trueSpeed: number): void {
  freeWind = { ...freeWind, trueFrom, trueSpeed };
  engine.setWind(trueFrom, trueSpeed);
  syncHud();
}

/** Gusts (kt) and wind shifts (deg) in free sailing (kept for the next reset). */
export function setFreeWindVariation(gusts: number, shifts: number): void {
  freeWind = { ...freeWind, gusts, shifts };
  engine.setWindVariation(gusts, shifts);
  syncHud();
}

export const runtime: Runtime = { evaluator: null, scenario: null, session: null };

function onError(err: DetectedError) {
  const mode = runtime.evaluator?.mode;
  if (mode === 'exam') return;
  useHud.setState({ toast: { error: err, t: engine.state.t } });
}

engine.onEvent((e) => {
  if (e.type === 'uncontrolledGybe') useHud.setState({ warning: { key: 'uncontrolledGybe', t: e.t } });
  if (e.type === 'inIrons' && runtime.evaluator?.mode !== 'exam') useHud.setState({ warning: { key: 'inIrons', t: e.t } });
  if (e.type === 'collision') useHud.setState({ warning: { key: 'collision', t: e.t } });
  if (e.type === 'answer') useHud.setState({ lastAnswer: { q: String(e.data?.q), correct: !!e.data?.correct, t: e.t } });
});

export function startRuntime(session: Session): void {
  runtime.session = session;
  if (session.kind === 'scenario') {
    const def = getScenario(session.scenarioId, session.variant);
    runtime.scenario = def;
    engine.reset(def.initial);
    engine.headwayAssistKt = def.headwayAssistKt ?? null;
    runtime.evaluator = new ScenarioEvaluator(def, engine, session.mode, onError);
  } else {
    runtime.scenario = null;
    runtime.evaluator = null;
    engine.headwayAssistKt = null;
    engine.reset({ ...FREE_SAIL_START, wind: { ...freeWind } });
  }
  engine.paused = false;
  worldKey++;
  useHud.setState({ ...initialHud, worldKey, timeOfDay: engine.world?.def.time ?? 'day' });
  syncHud();
}

export function restartRuntime(): void {
  if (runtime.session) startRuntime(runtime.session);
}

/** Finish the current scenario and show results. */
export function finishRuntime(): void {
  const ev = runtime.evaluator;
  if (!ev) {
    useApp.getState().go('home');
    return;
  }
  const r = ev.finished ?? ev.finish('aborted');
  useApp.getState().setResult(r);
}

let lastHud = 0;
/** Called every animation frame by the Canvas driver. */
export function frame(realDt: number): void {
  const paused = useApp.getState().paused;
  engine.paused = paused;
  const before = engine.state.t;
  engine.advance(realDt);
  const simDt = engine.state.t - before;
  const ev = runtime.evaluator;
  if (ev && !ev.finished) {
    ev.tick(simDt);
    if (ev.finished) {
      const r = ev.finished;
      setTimeout(() => useApp.getState().setResult(r), 1200);
    }
  }
  if (engine.state.t - lastHud > 0.1 || engine.state.t < lastHud) {
    lastHud = engine.state.t;
    syncHud();
  }
}

export function syncHud(): void {
  const s = engine.state;
  const ev = runtime.evaluator;
  useHud.setState({
    t: s.t,
    speed: s.boat.speed,
    heading: s.boat.heading,
    tws: s.wind.trueSpeed,
    twd: s.wind.trueFrom,
    aws: s.derived.aws,
    awa: s.derived.awa,
    twa: s.derived.twa,
    tack: s.derived.tack,
    pos: s.derived.pointOfSail,
    heel: s.boat.heel,
    weatherHelm: s.derived.weatherHelm,
    gust: s.derived.gust,
    windMean: engine.meanWind,
    rudder: s.boat.rudder,
    helm: s.input.helm,
    mainHoist: s.main.hoist,
    mainsheet: s.main.sheet,
    mainLuff: s.main.luff,
    mainTrim: s.main.trim,
    mainIncidence: s.main.incidence,
    jibDeployed: s.jib.deployed,
    jibPort: s.jib.portSheet,
    jibStbd: s.jib.starboardSheet,
    jibLuff: s.jib.luff,
    jibTrim: s.jib.trim,
    jibIncidence: s.jib.incidence,
    jibBacked: s.jib.backed,
    crew: { readyFor: s.crew.readyFor, preparing: s.crew.preparing, lastAck: s.crew.lastAck, busy: s.crew.tasks.length },
    currentStep: ev?.currentStep ?? 0,
    stepStatus: ev ? [...ev.stepStatus] : [],
    successProgress: ev?.successProgress ?? 0,
    elapsed: ev?.elapsed ?? s.t,
    motorFitted: s.motor.fitted,
    throttle: s.motor.throttle,
    throttleTarget: s.motor.target,
    question: ev?.activeQuestion()?.id ?? null,
  });
}

// Expose for e2e tests and debugging.
declare global {
  interface Window {
    __sim?: { engine: SimEngine; runtime: Runtime };
  }
}
if (typeof window !== 'undefined') window.__sim = { engine, runtime };
