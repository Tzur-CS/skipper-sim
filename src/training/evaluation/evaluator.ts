import type { SimEngine } from '../../simulation/physics/engine';
import type { SimEvent } from '../../simulation/types';
import type { ErrorCategory, L, Question, Rule, ScenarioDef, ScoreArea } from '../scenarios/types';
import { dataMatches, evalCond, type CondContext } from './conditions';
import { computeScore, type AreaScores } from '../scoring/score';

export type TrainingMode = 'guided' | 'practice' | 'exam';

export interface DetectedError {
  ruleId: string;
  category: ErrorCategory;
  area: ScoreArea;
  penalty: number;
  t: number;
  message: L;
  explanation: L;
  suggestion: L;
  recoverable: boolean;
}

export type StepStatus = 'pending' | 'active' | 'done' | 'skipped';

export interface TrainingResult {
  scenarioId: string;
  variant?: string;
  mode: TrainingMode;
  success: boolean;
  reason: 'completed' | 'timeout' | 'aborted' | 'failed';
  score: number;
  areas: AreaScores;
  stepsDone: number;
  stepsTotal: number;
  errors: DetectedError[];
  recoveries: string[];
  timeline: Array<{ t: number; type: SimEvent['type']; data?: SimEvent['data']; heading: number; speed: number }>;
  duration: number;
  /** Why the scenario was failed immediately (failOn), if it was. */
  failMessage?: L;
  date: string;
}

const TIMELINE_TYPES = new Set<SimEvent['type']>([
  'crewCommand',
  'crewReport',
  'sailHoisted',
  'sailLowered',
  'jibUnfurled',
  'jibFurled',
  'crossedWind',
  'tackChanged',
  'boomChangedSide',
  'jibChangedSide',
  'enteredNoGo',
  'exitedNoGo',
  'uncontrolledGybe',
  'inIrons',
  'pointOfSailChanged',
  'stabilized',
  'sheetEased',
  'sheetTrimmed',
  'throttleChanged',
  'collision',
  'closeQuarters',
  'vesselCpa',
  'gateCrossed',
  'answer',
]);

/**
 * Deterministic, event-driven scenario evaluator: step state machine + rule detectors +
 * physical outcome validation. Runs alongside the simulation, never modifies yacht state.
 */
export class ScenarioEvaluator {
  readonly def: ScenarioDef;
  readonly mode: TrainingMode;
  stepStatus: StepStatus[];
  currentStep = 0;
  errors: DetectedError[] = [];
  finished: TrainingResult | null = null;
  private engine: SimEngine;
  private startT: number;
  private stepT: number;
  private stepHold = 0;
  private successHold = 0;
  private ruleCounts = new Map<string, number>();
  private ruleTimers = new Map<string, number>();
  private gapStart = new Map<string, number>();
  private seenEventIdx = 0;
  private prev: CondContext['prev'];
  private onError?: (e: DetectedError) => void;
  private initHeading: number;
  /** Reason shown when `failOn` ended the scenario. */
  failMessage: L | null = null;

  constructor(def: ScenarioDef, engine: SimEngine, mode: TrainingMode, onError?: (e: DetectedError) => void) {
    this.def = def;
    this.engine = engine;
    this.mode = mode;
    this.onError = onError;
    this.startT = engine.state.t;
    this.stepT = this.startT;
    this.stepStatus = def.steps.map((_, i) => (i === 0 ? 'active' : 'pending'));
    this.seenEventIdx = engine.events.length;
    this.initHeading = engine.state.boat.heading;
  }

  private ctx(): CondContext {
    return { s: this.engine.state, events: this.engine.events, startT: this.startT, stepT: this.stepT, prev: this.prev, initHeading: this.initHeading };
  }

  private ruleActive(r: Rule): boolean {
    if ((this.ruleCounts.get(r.id) ?? 0) >= (r.maxCount ?? 1)) return false;
    if (r.after) return this.engine.events.some((e) => e.type === r.after && e.t >= this.startT);
    return true;
  }

  private flag(r: Rule): void {
    this.ruleCounts.set(r.id, (this.ruleCounts.get(r.id) ?? 0) + 1);
    const err: DetectedError = {
      ruleId: r.id,
      category: r.category,
      area: r.area,
      penalty: r.penalty,
      t: Math.round((this.engine.state.t - this.startT) * 10) / 10,
      message: r.message,
      explanation: r.explanation,
      suggestion: r.suggestion,
      recoverable: !!r.recoverable,
    };
    this.errors.push(err);
    this.onError?.(err);
  }

  /** Call after the simulation has advanced. `dt` = simulated seconds since last tick. */
  tick(dt: number): void {
    if (this.finished || dt <= 0) return;
    const s = this.engine.state;
    const ctx = this.ctx();

    // 1. Event-driven rules over new events.
    const newEvents = this.engine.events.slice(this.seenEventIdx);
    this.seenEventIdx = this.engine.events.length;
    for (const e of newEvents) {
      for (const r of this.def.rules) {
        if (!this.ruleActive(r)) continue;
        if (r.type === 'forbidEvent' && e.type === r.event && dataMatches(e, r.eventData)) this.flag(r);
        if ((r.type === 'requireBefore' || r.type === 'checkAtEvent') && e.type === r.event && dataMatches(e, r.eventData)) {
          if (!evalCond(r.require, ctx)) this.flag(r);
          else this.ruleCounts.set(r.id, r.maxCount ?? 1); // satisfied once: stop checking
        }
        if (r.type === 'eventGap') {
          if (e.type === r.from && !this.gapStart.has(r.id)) this.gapStart.set(r.id, e.t);
          if (e.type === r.to && this.gapStart.has(r.id)) {
            if (e.t - this.gapStart.get(r.id)! > r.maxSeconds) this.flag(r);
            this.gapStart.delete(r.id);
          }
        }
      }
    }

    // 2. Duration rules.
    for (const r of this.def.rules) {
      if (r.type !== 'condDuration' || !this.ruleActive(r)) continue;
      if (evalCond(r.cond, ctx)) {
        const tt = (this.ruleTimers.get(r.id) ?? 0) + dt;
        this.ruleTimers.set(r.id, tt);
        if (tt > r.seconds) {
          this.flag(r);
          this.ruleTimers.set(r.id, -1e9); // wait for condition to clear before re-arming
        }
      } else if ((this.ruleTimers.get(r.id) ?? 0) !== 0) {
        this.ruleTimers.set(r.id, 0);
      }
    }

    // 3. Step state machine (flexible: optional steps may be skipped).
    if (this.currentStep < this.def.steps.length) {
      const step = this.def.steps[this.currentStep];
      if (evalCond(step.done, ctx)) {
        this.stepHold += dt;
        if (this.stepHold >= (step.holdSeconds ?? 0)) this.completeStep(this.currentStep);
      } else {
        this.stepHold = 0;
        // Look ahead across optional steps: a later step may complete first.
        let allOptional = !!step.optional;
        for (let j = this.currentStep + 1; j < this.def.steps.length && allOptional; j++) {
          const sj = this.def.steps[j];
          if (!sj.holdSeconds && evalCond(sj.done, ctx)) {
            for (let k = this.currentStep; k < j; k++) this.stepStatus[k] = 'skipped';
            this.completeStep(j);
            break;
          }
          allOptional = !!sj.optional;
        }
      }
    }

    // 4. Immediate failure (collision, grounding...).
    if (this.def.failOn && evalCond(this.def.failOn.cond, ctx)) {
      this.failMessage = this.def.failOn.message;
      this.finish('failed');
      this.prev = { hoist: s.main.hoist, deployed: s.jib.deployed, mainsheet: s.main.sheet };
      return;
    }

    // 5. Physical success condition.
    const stepsOk = !this.def.success.requireAllSteps || this.currentStep >= this.def.steps.length;
    if (stepsOk && evalCond(this.def.success.cond, ctx)) {
      this.successHold += dt;
      if (this.successHold >= this.def.success.holdSeconds) this.finish('completed');
    } else {
      this.successHold = 0;
    }
    if (!this.finished && s.t - this.startT > this.def.timeLimit) this.finish('timeout');

    this.prev = { hoist: s.main.hoist, deployed: s.jib.deployed, mainsheet: s.main.sheet };
  }

  private completeStep(i: number): void {
    this.stepStatus[i] = 'done';
    this.currentStep = i + 1;
    this.stepHold = 0;
    this.stepT = this.engine.state.t;
    if (this.currentStep < this.def.steps.length) this.stepStatus[this.currentStep] = 'active';
  }

  /** The first unanswered identification question whose `showWhen` holds now. */
  activeQuestion(): Question | null {
    if (this.finished) return null;
    const ctx = this.ctx();
    for (const q of this.def.questions ?? []) {
      if (evalCond({ answered: q.id }, ctx)) continue;
      if (!q.showWhen || evalCond(q.showWhen, ctx)) return q;
    }
    return null;
  }

  /** Record an answer (first answer only). Returns whether it was correct. */
  answer(qid: string, choice: string): boolean {
    const q = this.def.questions?.find((x) => x.id === qid);
    if (!q || evalCond({ answered: qid }, this.ctx())) return false;
    const correct = q.correct === choice;
    this.engine.answer(qid, choice, correct);
    return correct;
  }

  get successProgress(): number {
    return Math.min(1, this.successHold / Math.max(0.01, this.def.success.holdSeconds));
  }

  get elapsed(): number {
    return this.engine.state.t - this.startT;
  }

  finish(reason: TrainingResult['reason']): TrainingResult {
    if (this.finished) return this.finished;
    const ctx = this.ctx();
    for (const r of this.def.rules) {
      if (r.type === 'atEnd' && this.ruleActive(r) && reason === 'completed' && !evalCond(r.require, ctx)) this.flag(r);
    }
    for (let i = this.currentStep; i < this.stepStatus.length; i++) {
      if (reason === 'completed' && this.stepStatus[i] !== 'done') this.stepStatus[i] = this.def.steps[i].optional ? 'skipped' : 'done';
    }
    const success = reason === 'completed';
    if (success) this.currentStep = this.def.steps.length;
    const stepsDone = this.stepStatus.filter((x) => x === 'done').length;
    const { total, areas } = computeScore({
      success,
      stepsDone,
      stepsTotal: this.def.steps.length,
      errors: this.errors,
      elapsed: this.elapsed,
      timeLimit: this.def.timeLimit,
    });
    const recoveries = success ? this.errors.filter((e) => e.recoverable).map((e) => e.ruleId) : [];
    const timeline = this.engine.events
      .filter((e) => e.t >= this.startT && TIMELINE_TYPES.has(e.type))
      .map((e) => ({ t: Math.round((e.t - this.startT) * 10) / 10, type: e.type, data: e.data, heading: e.state.heading, speed: e.state.speed }));
    this.finished = {
      scenarioId: this.def.id,
      variant: this.def.variant,
      mode: this.mode,
      success,
      reason,
      score: total,
      areas,
      stepsDone,
      stepsTotal: this.def.steps.length,
      errors: this.errors,
      recoveries,
      timeline,
      duration: Math.round(this.elapsed),
      failMessage: this.failMessage ?? undefined,
      date: new Date().toISOString(),
    };
    return this.finished;
  }
}
