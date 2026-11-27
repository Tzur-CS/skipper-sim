import { SAILS } from '../config';
import { sign } from '../math';
import { optimalChordAngle } from '../sails/aero';
import { sheetForBoomAngle, sheetForJibAngle } from '../sails/rig';
import type { CrewCommandId, LineId, SimState } from '../types';

/**
 * Crew task model. The skipper issues commands; virtual crew members work the lines at
 * realistic winch/halyard rates. Unprepared crew react late.
 */
export type CrewTaskKind =
  | { kind: 'set'; line: LineId; target: number }
  | { kind: 'trimOptimal'; line: LineId; elapsed?: number }
  | { kind: 'tackJib'; oldLine: LineId; newLine: LineId; startSign: number; trigger: 'bow' | 'stern'; phase: 'wait' | 'release' | 'trim'; elapsed: number }
  | { kind: 'gybeMain'; startBoomSign: number; phase: 'center' | 'ease'; elapsed: number };

export interface ActiveCrewTask {
  uid: number;
  command: CrewCommandId;
  delay: number;
  task: CrewTaskKind;
}

export const UNPREPARED_DELAY = 2.2;
export const PREPARE_TIME = 2.5;

/** Value of a line in the state. */
export function lineValue(s: SimState, line: LineId): number {
  switch (line) {
    case 'mainsheet': return s.main.sheet;
    case 'jibPort': return s.jib.portSheet;
    case 'jibStarboard': return s.jib.starboardSheet;
    case 'halyard': return s.main.hoist;
    case 'furler': return s.jib.deployed;
  }
}

/** Optimal sheet value for a line given current apparent wind (crew "trims to the telltales"). */
export function optimalLineValue(s: SimState, line: LineId): number {
  const awa = s.derived.awa;
  const leeSide = -sign(awa) || 1;
  if (line === 'mainsheet') {
    return sheetForBoomAngle(optimalChordAngle(awa, leeSide, SAILS.minBoom, SAILS.maxBoom));
  }
  if (line === 'jibPort' || line === 'jibStarboard') {
    const side = line === 'jibPort' ? -1 : 1;
    if (side !== leeSide && Math.abs(awa) < 150) return 0.85; // trimming the windward sheet backs the jib
    return sheetForJibAngle(optimalChordAngle(awa, side, SAILS.minJib, SAILS.maxJib));
  }
  return lineValue(s, line);
}

export function workingJibSheet(s: SimState): { oldLine: LineId; newLine: LineId } {
  // With both sheets slack (e.g. running), the side the jib is lying on decides.
  const portIsWorking = s.jib.portSheet > s.jib.starboardSheet || (s.jib.portSheet === s.jib.starboardSheet && s.jib.angle <= 0);
  return portIsWorking
    ? { oldLine: 'jibPort', newLine: 'jibStarboard' }
    : { oldLine: 'jibStarboard', newLine: 'jibPort' };
}

/** Lines a task is currently driving and their targets. */
export function taskTargets(s: SimState, t: CrewTaskKind): Array<{ line: LineId; target: number }> {
  switch (t.kind) {
    case 'set':
      return [{ line: t.line, target: t.target }];
    case 'trimOptimal':
      return [{ line: t.line, target: optimalLineValue(s, t.line) }];
    case 'tackJib':
      if (t.phase === 'release') return [{ line: t.oldLine, target: 0 }];
      if (t.phase === 'trim') return [{ line: t.oldLine, target: 0 }, { line: t.newLine, target: optimalLineValue(s, t.newLine) }];
      return [];
    case 'gybeMain':
      if (t.phase === 'center') return [{ line: 'mainsheet', target: 0.9 }];
      return [{ line: 'mainsheet', target: optimalLineValue(s, 'mainsheet') }];
  }
}

/** Advance task phases. Returns true when the task is finished. */
export function updateTaskPhase(s: SimState, t: CrewTaskKind, dt: number): boolean {
  const near = (line: LineId, target: number) => Math.abs(lineValue(s, line) - target) < 0.02;
  switch (t.kind) {
    case 'set':
      return Math.abs(lineValue(s, t.line) - t.target) < 1e-6;
    case 'trimOptimal':
      // The crew keeps tending the sheet for a while as the boat (and apparent wind) settles.
      t.elapsed = (t.elapsed ?? 0) + dt;
      return t.elapsed > 8 && near(t.line, optimalLineValue(s, t.line));
    case 'tackJib': {
      t.elapsed += dt;
      const twa = s.derived.twa;
      if (t.phase === 'wait') {
        const crossed = sign(twa) !== t.startSign && Math.abs(twa) > 3;
        const trigger =
          t.trigger === 'bow'
            ? Math.abs(s.derived.awa) < 16 || s.jib.backed || crossed
            : crossed || Math.abs(twa) > 172;
        if (trigger) t.phase = 'release';
        if (t.elapsed > 90) return true; // manoeuvre abandoned
      } else if (t.phase === 'release') {
        const crossed = sign(twa) !== t.startSign && Math.abs(twa) > 8;
        if (lineValue(s, t.oldLine) <= 0.05 && crossed) t.phase = 'trim';
        if (t.elapsed > 100) return true;
      } else {
        return near(t.newLine, optimalLineValue(s, t.newLine)) && lineValue(s, t.oldLine) < 0.05;
      }
      return false;
    }
    case 'gybeMain': {
      t.elapsed += dt;
      if (t.phase === 'center') {
        const crossed = sign(s.main.boomAngle) !== t.startBoomSign && Math.abs(s.main.boomAngle) > 2;
        if (crossed) t.phase = 'ease';
        if (t.elapsed > 90) return true;
        return false;
      }
      return near('mainsheet', optimalLineValue(s, 'mainsheet'));
    }
  }
}
