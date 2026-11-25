import { create } from 'zustand';
import type { CrewState, PointOfSail, Tack } from '../simulation/types';
import type { DetectedError, StepStatus } from '../training/evaluation/evaluator';

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
}

export const initialHud: Hud = {
  t: 0, speed: 0, heading: 0, tws: 0, twd: 0, aws: 0, awa: 0, twa: 0, tack: 'starboard', pos: 'closeHauled', heel: 0, rudder: 0, helm: 0,
  mainHoist: 0, mainsheet: 0, mainLuff: 0, mainTrim: 0, mainIncidence: 0, jibDeployed: 0, jibPort: 0, jibStbd: 0, jibLuff: 0, jibTrim: 0, jibIncidence: 0, jibBacked: false,
  crew: { readyFor: null, preparing: 0, lastAck: null, busy: 0 },
  currentStep: 0, stepStatus: [], successProgress: 0, elapsed: 0, warning: null, toast: null,
};

export const useHud = create<Hud>(() => initialHud);
