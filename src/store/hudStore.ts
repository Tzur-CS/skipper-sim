import { create } from 'zustand';
import type { CrewState, PointOfSail, Tack } from '../simulation/types';
import type { DetectedError, StepStatus } from '../training/evaluation/evaluator';
import type { TimeOfDay } from '../simulation/world/types';

/** Throttled snapshot of simulation values for the 2D UI (updated ~10 Hz to avoid re-renders). */
export interface Hud {
  t: number;
  speed: number;
  heading: number;
  tws: number;
  twd: number;
  aws: number;
  awa: number;
  twa: number;
  tack: Tack;
  pos: PointOfSail;
  heel: number;
  /** Weather helm, deg/s^2 (+ = bow pulled to starboard). */
  weatherHelm: number;
  /** True wind above the mean (kt): gust > 0, lull < 0. */
  gust: number;
  /** Mean wind and variation (free sailing sliders). */
  windMean: { trueFrom: number; trueSpeed: number; gusts: number; shifts: number };
  rudder: number;
  helm: number;
  mainHoist: number;
  mainsheet: number;
  mainLuff: number;
  mainTrim: number;
  mainIncidence: number;
  jibDeployed: number;
  jibPort: number;
  jibStbd: number;
  jibLuff: number;
  jibTrim: number;
  jibIncidence: number;
  jibBacked: boolean;
  crew: Pick<CrewState, 'readyFor' | 'preparing' | 'lastAck'> & { busy: number };
  // training
  currentStep: number;
  stepStatus: StepStatus[];
  successProgress: number;
  elapsed: number;
  warning: { key: string; t: number } | null;
  toast: { error: DetectedError; t: number } | null;
  // harbour / traffic
  timeOfDay: TimeOfDay;
  /** Changes whenever a new world is loaded (rebuilds the 3D world objects). */
  worldKey: number;
  motorFitted: boolean;
  throttle: number;
  throttleTarget: number;
  /** Id of the identification question currently shown, if any. */
  question: string | null;
  /** Last answered question, for feedback. */
  lastAnswer: { q: string; correct: boolean; t: number } | null;
}

export const initialHud: Hud = {
  t: 0, speed: 0, heading: 0, tws: 0, twd: 0, aws: 0, awa: 0, twa: 0, tack: 'starboard', pos: 'closeHauled', heel: 0, weatherHelm: 0, gust: 0, windMean: { trueFrom: 0, trueSpeed: 0, gusts: 0, shifts: 0 }, rudder: 0, helm: 0,
  mainHoist: 0, mainsheet: 0, mainLuff: 0, mainTrim: 0, mainIncidence: 0, jibDeployed: 0, jibPort: 0, jibStbd: 0, jibLuff: 0, jibTrim: 0, jibIncidence: 0, jibBacked: false,
  crew: { readyFor: null, preparing: 0, lastAck: null, busy: 0 },
  currentStep: 0, stepStatus: [], successProgress: 0, elapsed: 0, warning: null, toast: null,
  timeOfDay: 'day', worldKey: 0, motorFitted: false, throttle: 0, throttleTarget: 0, question: null, lastAnswer: null,
};

export const useHud = create<Hud>(() => initialHud);
