import type { CrewCommandId, InitialConditions, PointOfSail, SimEventType } from '../../simulation/types';

/** Localized text. Hebrew is the default language. */
export interface L {
  he: string;
  en: string;
}

export interface Range {
  min?: number;
  max?: number;
}

/**
 * Small declarative condition language used by scenario configs. Every condition is evaluated
 * against the live simulation state (and the event log for `event`).
 */
export type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { tack: 'port' | 'starboard' }
  | { pointOfSail: PointOfSail[] }
  | { twaAbs: Range }
  | { awaAbs: Range }
  | { speed: Range }
  | { heelAbs: Range }
  | { yawRateAbs: Range }
  | { rudderAbs: Range }
  | { mainHoist: Range }
  | { mainsheet: Range }
  | { mainTrim: Range }
  | { mainLuff: Range }
  | { mainIncidence: Range }
  | { jibDeployed: Range }
  | { jibTrim: Range }
  | { jibLuff: Range }
  | { jibIncidence: Range }
  /** Jib sheet by physical side, or relative to the wind (leeward = working sheet on the current tack). */
  | { jibSheet: { side: 'port' | 'starboard' | 'leeward' | 'windward'; range: Range } }
  | { jibSide: 'leeward' | 'windward' }
  | { jibBacked: boolean }
  | { boomSide: 'leeward' | 'windward' | 'port' | 'starboard' }
  | { line: 'halyard' | 'furler' | 'mainsheet'; moving: 'up' | 'down' }
  | { event: SimEventType; data?: Record<string, string | number | boolean>; since?: 'start' | 'step' }
  | { command: CrewCommandId }
  | { crewReady: 'tack' | 'gybe' }
  | { elapsed: Range }
  // harbour / traffic
  /** Own boat is inside the world zone with this id. */
  | { inZone: string }
  /** Current distance (m) to another vessel. */
  | { range: { id: string; range: Range } }
  /** |heading change| (deg) from the heading at the start of the scenario. */
  | { headingDelta: Range }
  /** Signed heading change (deg, + = to starboard) from the heading at the start. */
  | { headingChange: Range }
  /** Absolute heading window (deg, clockwise from min to max; may wrap through north). */
  | { heading: Range }
  /** Throttle lever position (-1 astern .. 1 full ahead). */
  | { throttle: Range }
  /** The question with this id was answered (correctly, if `correct` is true). */
  | { answered: string; correct?: boolean };

export type Source = 'general' | 'school' | 'vessel';

export interface ScenarioStep {
  id: string;
  title: L;
  hint: L;
  done: Cond;
  /** Condition must hold continuously this long (s). */
  holdSeconds?: number;
  /** May be skipped if a later step completes first. */
  optional?: boolean;
  /** UI control ids to highlight in guided mode. */
  highlight?: string[];
  /** Provenance of this procedure step. */
  source: Source;
}

export type ErrorCategory = 'procedural' | 'timing' | 'sail' | 'steering' | 'unsafe' | 'crew';
export type ScoreArea = 'completion' | 'steering' | 'sails' | 'crew';

interface RuleBase {
  id: string;
  category: ErrorCategory;
  area: ScoreArea;
  penalty: number;
  /** Shown when the error is detected. */
  message: L;
  /** Why it matters. */
  explanation: L;
  /** What to do better next time. */
  suggestion: L;
  source: Source;
  /** Only evaluated after this event has occurred. */
  after?: SimEventType;
  /** Max times this rule can trigger (default 1). */
  maxCount?: number;
  /** If the scenario still succeeds, count as a successful recovery. */
  recoverable?: boolean;
}

export type Rule =
  /** When `event` first happens, `require` must already be true (latched events) or true at that moment. */
  | (RuleBase & { type: 'requireBefore'; event: SimEventType; eventData?: Record<string, string | number | boolean>; require: Cond })
  /** Check a state condition at the moment an event fires. */
  | (RuleBase & { type: 'checkAtEvent'; event: SimEventType; eventData?: Record<string, string | number | boolean>; require: Cond })
  /** Error if an event happens at all. */
  | (RuleBase & { type: 'forbidEvent'; event: SimEventType; eventData?: Record<string, string | number | boolean> })
  /** Error if a condition holds continuously longer than `seconds`. */
  | (RuleBase & { type: 'condDuration'; cond: Cond; seconds: number })
  /** Error if more than maxSeconds elapse between two events. */
  | (RuleBase & { type: 'eventGap'; from: SimEventType; to: SimEventType; maxSeconds: number })
  /** Evaluated at the end of the scenario. */
  | (RuleBase & { type: 'atEnd'; require: Cond });

export interface ScenarioVariant {
  id: string;
  label: L;
}

/** Identification question (e.g. "what do these lights show?"), shown when `showWhen` holds. */
export interface Question {
  id: string;
  prompt: L;
  options: Array<{ id: string; text: L }>;
  correct: string;
  /** Shown after answering (not in exam mode). */
  explanation: L;
  showWhen?: Cond;
}

export interface ScenarioDef {
  id: string;
  variant?: string;
  title: L;
  objective: L;
  learningObjective: L;
  initial: InitialConditions;
  /** Keep a minimum steady headway (kt). Represents motoring slowly; the engine is not simulated. */
  headwayAssistKt?: number;
  steps: ScenarioStep[];
  success: { cond: Cond; holdSeconds: number; requireAllSteps?: boolean };
  /** Scenario fails if not completed in this time (s). */
  timeLimit: number;
  /** The scenario ends as a failure as soon as this holds (e.g. a collision). */
  failOn?: { cond: Cond; message: L };
  questions?: Question[];
  rules: Rule[];
  commonErrors: L[];
  /** Content review status; all MVP content needs validation by a qualified instructor. */
  review: { status: 'needsInstructorReview' | 'reviewed'; notes: string[] };
}

export interface ScenarioCatalogEntry {
  id: string;
  order: number;
  title: L;
  summary: L;
  variants?: ScenarioVariant[];
  build: (variant?: string) => ScenarioDef;
}
