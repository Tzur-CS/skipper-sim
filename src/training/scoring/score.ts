import type { ScoreArea } from '../scenarios/types';

export type AreaScores = Record<ScoreArea, number>;

/** Weights of each area in the overall simulator score (configurable). */
export const SCORE_WEIGHTS: AreaScores = { completion: 0.4, steering: 0.2, sails: 0.25, crew: 0.15 };

export interface ScoreInput {
  success: boolean;
  stepsDone: number;
  stepsTotal: number;
  errors: Array<{ area: ScoreArea; penalty: number }>;
  elapsed: number;
  timeLimit: number;
}

export function computeScore(i: ScoreInput): { total: number; areas: AreaScores } {
  const areas: AreaScores = { completion: 100, steering: 100, sails: 100, crew: 100 };
  areas.completion = i.success ? 100 : Math.round((60 * i.stepsDone) / Math.max(1, i.stepsTotal));
  for (const e of i.errors) areas[e.area] = Math.max(0, areas[e.area] - e.penalty);
  let total = 0;
  for (const k of Object.keys(SCORE_WEIGHTS) as ScoreArea[]) total += areas[k] * SCORE_WEIGHTS[k];
  if (!i.success) total = Math.min(total, 59);
  return { total: Math.round(total), areas };
}
