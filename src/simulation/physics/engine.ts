import { AERO, HYDRO, MOTOR, SAILS, SIM, YACHT } from '../config';
import { DEG, KNOT, approach, clamp, norm180, norm360, sign } from '../math';
import { apparentWind, trueWindAngle } from '../wind/wind';
import { dynamicPressure, optimalChordAngle, sailForce, trimQuality } from '../sails/aero';
import { jibTarget, mainBoomTarget, maxBoomAngle } from '../sails/rig';
import { pointOfSailFromTwa, tackFromTwa } from '../boat/classify';
import {
  PREPARE_TIME,
  UNPREPARED_DELAY,
  lineValue,
  optimalLineValue,
  taskTargets,
  updateTaskPhase,
  workingJibSheet,
  type ActiveCrewTask,
  type CrewTaskKind,
} from '../controls/crew';
import { WorldSim } from '../world/worldSim';
import type {
  ControlInput,
  CrewCommandId,
  CrewManoeuvre,
  CrewStation,
  InitialConditions,
  LineId,
  PointOfSail,
  SimEvent,
  SimEventType,
  SimState,
  Tack,
} from '../types';

const noStations = (): Record<CrewStation, boolean> => ({ port: false, starboard: false, main: false, furler: false });

export const LINES: LineId[] = ['mainsheet', 'jibPort', 'jibStarboard', 'halyard', 'furler'];

export const DEFAULT_CONDITIONS: InitialConditions = {
  heading: 0,
  speed: 5.5,
  wind: { trueFrom: 45, trueSpeed: 12 },
  mainHoist: 1,
  mainsheet: 0.85,
  jibDeployed: 1,
  jibPortSheet: 0.95,
  jibStarboardSheet: 0,
};

function emptyInput(): ControlInput {
  return { helm: 0, mainsheet: 0, jibPort: 0, jibStarboard: 0, halyard: 0, furler: 0 };
}

/**
 * Deterministic, fixed-timestep sailing simulation. Independent from rendering and React.
 * The engine is the single source of truth for yacht state.
 */
export class SimEngine {
  state!: SimState;
  events: SimEvent[] = [];
  tasks: ActiveCrewTask[] = [];
  paused = false;
  /** Minimum steady headway in knots (represents motoring slowly; the engine itself is not simulated). */
  headwayAssistKt: number | null = null;
  /** Harbour / traffic world of the current scenario, if any. */
  world: WorldSim | null = null;
  private accumulator = 0;
  private uid = 0;
  private initial: InitialConditions = DEFAULT_CONDITIONS;
  // Event-detection memory
  private lastTack: Exclude<Tack, 'headToWind'> = 'starboard';
  private lastTwaSign = 1;
  private lastBoomSide = -1;
  private lastJibSide = -1;
  private inNoGo = false;
  private ironsTimer = 0;
  private inIrons = false;
  private posCandidate: PointOfSail = 'closeHauled';
  private posTimer = 0;
  private pos: PointOfSail = 'closeHauled';
  private stableTimer = 0;
  private stable = false;
  private lineDir: Record<LineId, number> = { mainsheet: 0, jibPort: 0, jibStarboard: 0, halyard: 0, furler: 0 };
  private lastRudderLogged = 0;
  private hitTimer = 0;
  private listeners = new Set<(e: SimEvent) => void>();

  constructor(init: InitialConditions = DEFAULT_CONDITIONS) {
    this.reset(init);
  }

  onEvent(fn: (e: SimEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(init: InitialConditions = this.initial): void {
    this.initial = init;
    const twa = trueWindAngle(init.wind.trueFrom, init.heading);
    const aw = apparentWind(twa, init.wind.trueSpeed, init.speed);
    const s: SimState = {
      t: 0,
      wind: { ...init.wind },
      boat: { x: init.x ?? 0, y: init.y ?? 0, heading: norm360(init.heading), speed: init.speed, rudder: init.rudder ?? 0, yawRate: 0, heel: 0 },
      main: { hoist: init.mainHoist, sheet: init.mainsheet, boomAngle: 0, boomRate: 0, incidence: 0, luff: 0, trim: 0, backed: false },
      jib: {
        deployed: init.jibDeployed,
        portSheet: init.jibPortSheet,
        starboardSheet: init.jibStarboardSheet,
        angle: 0,
        incidence: 0,
        luff: 0,
        trim: 0,
        backed: false,
        activeSheet: null,
      },
      crew: { readyFor: null, sidesReady: noStations(), preparing: 0, tasks: [], lastAck: null },
      derived: { twa, awa: aw.awa, aws: aw.aws, tack: tackFromTwa(twa), pointOfSail: pointOfSailFromTwa(twa), driveForce: 0, sideForce: 0 },
      input: emptyInput(),
      motor: { fitted: !!init.motor, throttle: init.throttle ?? 0, target: init.throttle ?? 0 },
      vessels: [],
      zones: [],
    };
    const lee = -sign(aw.awa) || -1;
    if (init.autoTrim) {
      s.derived.awa = aw.awa;
      if (s.main.hoist > 0) s.main.sheet = optimalLineValue(s, 'mainsheet');
      if (s.jib.deployed <= 0) {
        // furled: leave sheets as configured
      } else if (lee < 0) s.jib.portSheet = optimalLineValue(s, 'jibPort');
      else s.jib.starboardSheet = optimalLineValue(s, 'jibStarboard');
    }
    // Settle sails on the leeward side.
    s.main.boomAngle = lee * Math.min(Math.abs(norm180(-aw.awa)), maxBoomAngle(s.main.sheet));
    s.jib.angle = jibTarget(aw.awa, s.jib.portSheet, s.jib.starboardSheet);
    if (s.jib.angle === 0) s.jib.angle = lee * 2;
    this.state = s;
    this.tasks = [];
    this.events = [];
    this.accumulator = 0;
    this.lastTack = twa >= 0 ? 'starboard' : 'port';
    this.lastTwaSign = sign(twa) || 1;
    this.lastBoomSide = sign(s.main.boomAngle) || lee;
    this.lastJibSide = sign(s.jib.angle) || lee;
    this.inNoGo = Math.abs(twa) < SIM.noGoAngle;
    this.ironsTimer = 0;
    this.inIrons = false;
    this.pos = this.posCandidate = s.derived.pointOfSail;
    this.posTimer = 0;
    this.stableTimer = 0;
    this.stable = false;
    this.lineDir = { mainsheet: 0, jibPort: 0, jibStarboard: 0, halyard: 0, furler: 0 };
    this.lastRudderLogged = s.boat.rudder;
    this.world = init.world ? new WorldSim(init.world, s.boat) : null;
    s.vessels = this.world?.vessels ?? [];
    s.zones = this.world?.zonesIn ?? [];
    this.hitTimer = 0;
    this.computeForces(0); // populate derived values
    this.emit('reset');
  }

  // ---------------------------------------------------------------- input API
  setHelm(v: number): void {
    this.state.input.helm = clamp(v, -1, 1);
  }
  setLineInput(line: LineId, v: number): void {
    this.state.input[line] = clamp(v, -1, 1);
    if (v !== 0) this.cancelTasksOnLine(line);
  }
  /** Throttle lever: -1 astern .. 0 neutral .. 1 full ahead. */
  setThrottle(v: number): void {
    const m = this.state.motor;
    if (!m.fitted) return;
    const nv = Math.round(clamp(v, -1, 1) * 100) / 100;
    if (nv === m.target) return;
    m.target = nv;
    this.emit('throttleChanged', { throttle: nv });
  }
  /** Record the student's answer to an identification question (used by scenario evaluation). */
  answer(q: string, choice: string, correct: boolean): void {
    this.emit('answer', { q, choice, correct });
  }
  setWind(trueFrom: number, trueSpeed: number): void {
    this.state.wind.trueFrom = norm360(trueFrom);
    this.state.wind.trueSpeed = clamp(trueSpeed, 0, 40);
  }

  command(id: CrewCommandId): void {
    const s = this.state;
    const crew = s.crew;
    this.emit('crewCommand', { command: id, ready: crew.readyFor });
    const prepared = (...m: CrewManoeuvre[]) => crew.readyFor !== null && m.includes(crew.readyFor) && crew.preparing <= 0;
    const ack = (key: string) => (crew.lastAck = { key, t: s.t });
    const prepare = (m: CrewManoeuvre) => {
      crew.readyFor = m;
      crew.preparing = PREPARE_TIME;
      crew.sidesReady = noStations();
      ack('ack.preparing');
    };
    const rollCall = (station: CrewStation) => {
      // Each station answers "מוכן" only once the crew has finished preparing for the manoeuvre.
      const ready = crew.readyFor !== null && crew.preparing <= 0;
      if (ready) crew.sidesReady[station] = true;
      this.emit('crewReport', { side: station, ready });
      ack(ready ? `ack.ready.${station}` : 'ack.sideNotYet');
    };
    switch (id) {
      case 'prepareTack': prepare('tack'); break;
      case 'prepareGybe': prepare('gybe'); break;
      case 'prepareUnfurl': prepare('unfurl'); break;
      case 'checkStarboardReady': rollCall('starboard'); break;
      case 'checkPortReady': rollCall('port'); break;
      case 'checkMainReady': rollCall('main'); break;
      case 'checkFurlerReady': rollCall('furler'); break;
      case 'tack':
      case 'gybe': {
        // "סיבוב" / "מהפך": the helm goes over. The crew holds the jib sheets and waits for "העבר חלוץ!".
        // In a gybe the mainsail must already have been centred ("מרכז ראשי").
        const ready = prepared(id);
        if (!ready) crew.readyFor = null;
        ack(ready ? `ack.${id}` : 'ack.notReady');
        break;
      }
      case 'deadRun':
        ack('ack.deadRun');
        break;
      case 'switchJib': {
        // "העבר חלוץ!": one side releases the old sheet now, the other pulls the new one as the jib comes across.
        const ready = prepared('tack', 'gybe');
        const { oldLine, newLine } = workingJibSheet(s);
        if (s.jib.deployed > 0.05) {
          this.addTask(id, ready ? 0 : UNPREPARED_DELAY, {
            // The tack we started on follows from the working sheet, so a late call (after the wind crossed) still works.
            kind: 'tackJib', oldLine, newLine, startSign: oldLine === 'jibPort' ? 1 : -1, trigger: 'bow', phase: 'release', elapsed: 0,
          });
        }
        crew.readyFor = null;
        crew.sidesReady = noStations();
        ack(ready ? 'ack.switchJib' : 'ack.notReady');
        break;
      }
      case 'unfurlJib': {
        // "פתח חלוץ": the furling line is eased under control while the working (leeward) side pulls the sheet.
        this.addTask(id, 0, { kind: 'set', line: 'furler', target: 1 });
        if (prepared('unfurl')) {
          const lee: LineId = (-sign(s.derived.awa) || 1) < 0 ? 'jibPort' : 'jibStarboard';
          this.addTask(id, 0, { kind: 'trimOptimal', line: lee });
          crew.readyFor = null;
          crew.sidesReady = noStations();
          ack('ack.unfurl');
        } else ack('ack.ok');
        break;
      }
      case 'releaseJibStarboard': this.addTask(id, 0, { kind: 'set', line: 'jibStarboard', target: 0 }); ack('ack.ok'); break;
      case 'releaseJibPort': this.addTask(id, 0, { kind: 'set', line: 'jibPort', target: 0 }); ack('ack.ok'); break;
      case 'trimJibStarboard': this.addTask(id, 0, { kind: 'trimOptimal', line: 'jibStarboard' }); ack('ack.ok'); break;
      case 'trimJibPort': this.addTask(id, 0, { kind: 'trimOptimal', line: 'jibPort' }); ack('ack.ok'); break;
      case 'trimMain': this.addTask(id, 0, { kind: 'trimOptimal', line: 'mainsheet' }); ack('ack.ok'); break;
      case 'easeMain': this.addTask(id, 0, { kind: 'set', line: 'mainsheet', target: 0.05 }); ack('ack.ok'); break;
      case 'centerMain': this.addTask(id, 0, { kind: 'set', line: 'mainsheet', target: 0.92 }); ack('ack.ok'); break;
      case 'hoistMain': this.addTask(id, 0, { kind: 'set', line: 'halyard', target: 1 }); ack('ack.ok'); break;
      case 'lowerMain': this.addTask(id, 0, { kind: 'set', line: 'halyard', target: 0 }); ack('ack.ok'); break;
      case 'furlJib': this.addTask(id, 0, { kind: 'set', line: 'furler', target: 0 }); ack('ack.ok'); break;
    }
    this.syncCrewView();
  }

  private addTask(command: CrewCommandId, delay: number, task: CrewTaskKind): void {
    // A new task on a line replaces older tasks on the same lines.
    const lines = new Set(this.linesOfTask(task));
    this.tasks = this.tasks.filter((t) => !this.linesOfTask(t.task).some((l) => lines.has(l)));
    this.tasks.push({ uid: ++this.uid, command, delay, task });
  }

  private linesOfTask(t: CrewTaskKind): LineId[] {
    switch (t.kind) {
      case 'set':
      case 'trimOptimal':
        return [t.line];
      case 'tackJib':
        return [t.oldLine, t.newLine];
      case 'gybeMain':
        return ['mainsheet'];
    }
  }

  private cancelTasksOnLine(line: LineId): void {
    const before = this.tasks.length;
    this.tasks = this.tasks.filter((t) => !this.linesOfTask(t.task).includes(line));
    if (this.tasks.length !== before) this.syncCrewView();
  }

  private syncCrewView(): void {
    this.state.crew.tasks = this.tasks.map((t) => ({
      id: String(t.uid),
      command: t.command,
      delay: t.delay,
      phase: 'phase' in t.task ? t.task.phase : 'active',
    }));
  }

  // ---------------------------------------------------------------- stepping
  /** Advance by real elapsed time using a fixed timestep accumulator. */
  advance(realDt: number): number {
    if (this.paused) return 0;
    this.accumulator += Math.min(realDt, SIM.dt * SIM.maxSubSteps);
    let n = 0;
    while (this.accumulator >= SIM.dt && n < SIM.maxSubSteps) {
      this.step(SIM.dt);
      this.accumulator -= SIM.dt;
      n++;
    }
    return n;
  }

  /** Run for a duration of simulated time (tests / scripted playback). */
  run(seconds: number, each?: (s: SimState) => void): void {
    const n = Math.round(seconds / SIM.dt);
    for (let i = 0; i < n; i++) {
      this.step(SIM.dt);
      each?.(this.state);
    }
  }

  step(dt: number): void {
    const s = this.state;
    s.t += dt;
    this.updateCrew(dt);
    this.updateLines(dt);

    // Rudder follows the helm at a finite rate.
    const rudderTarget = s.input.helm * YACHT.maxRudder;
    s.boat.rudder = approach(s.boat.rudder, rudderTarget, SIM.rudderRate * dt);
    if (Math.abs(s.boat.rudder - this.lastRudderLogged) > 8 || (rudderTarget === 0 && s.boat.rudder === 0 && this.lastRudderLogged !== 0)) {
      this.lastRudderLogged = s.boat.rudder;
      this.emit('rudderChanged', { rudder: Math.round(s.boat.rudder) });
    }

    this.updateSails(dt);
    const f = this.computeForces(dt);

    // Longitudinal dynamics.
    const v = s.boat.speed * KNOT;
    const vh = YACHT.hullSpeedKt * KNOT;
    let resist = HYDRO.k * v * Math.abs(v) * (1 + HYDRO.wave * Math.pow(Math.abs(v) / vh, HYDRO.waveExp)) + HYDRO.linear * v;
    if (v < 0) resist *= HYDRO.asternFactor;
    // Auxiliary engine: the throttle follows the lever; thrust is weaker astern.
    const m = s.motor;
    m.throttle = approach(m.throttle, m.target, 0.8 * dt);
    const thrust = m.fitted ? m.throttle * (m.throttle >= 0 ? MOTOR.thrustAhead : MOTOR.thrustAstern) : 0;
    const acc = (f.drive + thrust - resist) / YACHT.mass;
    const newV = clamp(v + acc * dt, -1.2 * KNOT, 12 * KNOT);
    s.boat.speed = newV / KNOT;
    if (this.headwayAssistKt !== null && s.boat.speed < this.headwayAssistKt) {
      s.boat.speed = approach(s.boat.speed, this.headwayAssistKt, 0.6 * dt);
    }

    // Heel from heeling moment against righting moment.
    const heelMoment = f.heelMoment;
    const sinHeel = clamp(heelMoment / HYDRO.rightingStiffness, -Math.sin(HYDRO.maxHeel * DEG), Math.sin(HYDRO.maxHeel * DEG));
    const heelTarget = Math.asin(sinHeel) / DEG;
    s.boat.heel += (heelTarget - s.boat.heel) * Math.min(1, dt / HYDRO.heelTau);

    // Yaw: rudder (speed dependent) + sail balance + weathercocking when stopped.
    // Propeller wash over the rudder gives some steering at low speed when going ahead.
    const wash = m.fitted && m.throttle > 0 ? m.throttle * MOTOR.washSpeed * clamp(1 - Math.abs(newV) / 2.5, 0, 1) : 0;
    const rTarget = ((newV + wash) * Math.tan(s.boat.rudder * DEG)) / YACHT.turnLength / DEG; // deg/s
    const slow = 1 - clamp(Math.abs(s.boat.speed) / 2, 0, 1);
    const windYaw = -HYDRO.windYawGain * Math.sin(2 * s.derived.twa * DEG) * slow * clamp(s.wind.trueSpeed / 12, 0, 2);
    const sailYaw = HYDRO.sailYawGain * f.yawMoment;
    s.boat.yawRate += ((rTarget - s.boat.yawRate) / YACHT.yawTau + sailYaw + windYaw) * dt;
    s.boat.heading = norm360(s.boat.heading + s.boat.yawRate * dt);

    const h = s.boat.heading * DEG;
    s.boat.x += Math.sin(h) * newV * dt;
    s.boat.y += Math.cos(h) * newV * dt;

    if (this.world) {
      const { hit } = this.world.step(dt, s.t, s.boat, (type, data) => this.emit(type, data));
      s.zones = this.world.zonesIn;
      if (hit) {
        // Contact: the boat is stopped and pushed back a little.
        if (this.hitTimer <= 0) {
          const back = Math.sign(s.boat.speed || 1) * 1.2;
          s.boat.x -= Math.sin(h) * back;
          s.boat.y -= Math.cos(h) * back;
        }
        s.boat.speed = 0;
        s.boat.yawRate *= 0.3;
        this.hitTimer = 0.5;
      }
      this.hitTimer -= dt;
    }

    this.detectEvents(dt);
  }

  private updateCrew(dt: number): void {
    const crew = this.state.crew;
    if (crew.preparing > 0) {
      crew.preparing = Math.max(0, crew.preparing - dt);
      if (crew.preparing === 0 && crew.readyFor) crew.lastAck = { key: 'ack.ready', t: this.state.t };
    }
    let changed = false;
    for (const t of this.tasks) {
      if (t.delay > 0) {
        t.delay = Math.max(0, t.delay - dt);
        continue;
      }
      const before = 'phase' in t.task ? t.task.phase : '';
      if (updateTaskPhase(this.state, t.task, dt)) {
        (t as ActiveCrewTask & { done?: boolean }).done = true;
        changed = true;
      }
      if ('phase' in t.task && t.task.phase !== before) changed = true;
    }
    if (changed) {
      this.tasks = this.tasks.filter((t) => !(t as ActiveCrewTask & { done?: boolean }).done);
      this.syncCrewView();
    }
  }

  private updateLines(dt: number): void {
    const s = this.state;
    // Crew targets
    const crewTargets = new Map<LineId, number>();
    for (const t of this.tasks) {
      if (t.delay > 0) continue;
      for (const { line, target } of taskTargets(s, t.task)) crewTargets.set(line, target);
    }
    for (const line of LINES) {
      const cur = lineValue(s, line);
      const manual = s.input[line];
      let next = cur;
      const upRate = this.lineRate(line, +1);
      const downRate = this.lineRate(line, -1);
      if (manual !== 0) {
        next = clamp(cur + manual * (manual > 0 ? upRate : downRate) * dt, 0, 1);
      } else if (crewTargets.has(line)) {
        const target = crewTargets.get(line)!;
        next = approach(cur, target, (target > cur ? upRate : downRate) * dt);
      }
      const delta = next - cur;
      if (delta !== 0) this.setLine(line, next);
      const dir = Math.abs(delta) < 1e-7 ? 0 : sign(delta);
      if (dir !== 0 && dir !== this.lineDir[line]) this.emitLineStart(line, dir, manual !== 0 ? 'manual' : 'crew');
      if (dir === 0 && this.lineDir[line] !== 0) this.emitLineEnd(line);
      this.lineDir[line] = dir;
    }
  }

  private lineRate(line: LineId, dir: 1 | -1): number {
    const s = this.state;
    const mainLoaded = s.main.luff < 0.5 && s.main.hoist > 0.15 && !this.isHeadToWindish();
    const jibLoaded = s.jib.luff < 0.5 && s.jib.deployed > 0.1 && Math.max(s.jib.portSheet, s.jib.starboardSheet) > 0.35;
    const windFactor = clamp(s.derived.aws / 14, 0.6, 1.8);
    switch (line) {
      case 'mainsheet':
        return dir > 0 ? SAILS.mainTrimRate / windFactor : SAILS.mainEaseRate;
      case 'jibPort':
      case 'jibStarboard':
        return dir > 0 ? SAILS.jibTrimRate / windFactor : SAILS.jibEaseRate;
      case 'halyard':
        return dir > 0 ? SAILS.hoistRate * (mainLoaded ? 0.25 : 1) : SAILS.lowerRate * (mainLoaded ? 0.45 : 1);
      case 'furler':
        return dir > 0 ? SAILS.unfurlRate : SAILS.furlRate * (jibLoaded ? 0.3 : 1);
    }
  }

  private isHeadToWindish(): boolean {
    return Math.abs(this.state.derived.awa) < 30;
  }

  private setLine(line: LineId, v: number): void {
    const s = this.state;
    switch (line) {
      case 'mainsheet': s.main.sheet = v; break;
      case 'jibPort': s.jib.portSheet = v; break;
      case 'jibStarboard': s.jib.starboardSheet = v; break;
      case 'halyard': s.main.hoist = v; break;
      case 'furler': s.jib.deployed = v; break;
    }
  }

  private emitLineStart(line: LineId, dir: number, by: 'manual' | 'crew'): void {
    if (line === 'halyard') this.emit(dir > 0 ? 'sailHoisted' : 'sailLowered', { phase: 'start', by });
    else if (line === 'furler') this.emit(dir > 0 ? 'jibUnfurled' : 'jibFurled', { phase: 'start', by });
    else this.emit(dir > 0 ? 'sheetTrimmed' : 'sheetEased', { line, by });
  }

  private emitLineEnd(line: LineId): void {
    const s = this.state;
    if (line === 'halyard' && s.main.hoist >= 0.999) this.emit('sailHoisted', { phase: 'complete' });
    if (line === 'halyard' && s.main.hoist <= 0.001) this.emit('sailLowered', { phase: 'complete' });
    if (line === 'furler' && s.jib.deployed >= 0.999) this.emit('jibUnfurled', { phase: 'complete' });
    if (line === 'furler' && s.jib.deployed <= 0.001) this.emit('jibFurled', { phase: 'complete' });
  }

  private updateSails(dt: number): void {
    const s = this.state;
    const awa = s.derived.awa;
    const q = dynamicPressure(s.derived.aws);
    // Boom: damped spring toward the wind-determined target; hard limit from the sheet.
    const target = s.main.hoist > 0.02 ? mainBoomTarget(awa, s.main.sheet, s.main.boomAngle) : clamp(s.main.boomAngle, -maxBoomAngle(s.main.sheet), maxBoomAngle(s.main.sheet)) * 0.98;
    const k = SAILS.boomStiffness * clamp(q / 40, 0.15, 3) * Math.max(0.2, s.main.hoist);
    const c = SAILS.boomDamping * Math.sqrt(clamp(q / 40, 0.15, 3));
    let rate = s.main.boomRate + (k * (target - s.main.boomAngle) - c * s.main.boomRate) * dt;
    let boom = s.main.boomAngle + rate * dt;
    const maxB = maxBoomAngle(s.main.sheet);
    if (Math.abs(boom) > maxB) {
      boom = sign(boom) * maxB;
      rate = 0;
    }
    s.main.boomAngle = boom;
    s.main.boomRate = rate;

    // Jib: light sail, fast first-order response.
    const jt = jibTarget(awa, s.jib.portSheet, s.jib.starboardSheet);
    const jibSpeed = 160 * clamp(q / 30, 0.3, 2);
    s.jib.angle = approach(s.jib.angle, jt, jibSpeed * dt);
    const lee = -sign(awa) || 1;
    s.jib.activeSheet = s.jib.deployed < 0.05 ? null : s.jib.angle < 0 ? 'port' : 'starboard';
    void lee;
  }

  private computeForces(_dt: number): { drive: number; heelMoment: number; yawMoment: number } {
    const s = this.state;
    s.derived.twa = trueWindAngle(s.wind.trueFrom, s.boat.heading);
    const aw = apparentWind(s.derived.twa, s.wind.trueSpeed, s.boat.speed);
    s.derived.awa = aw.awa;
    s.derived.aws = aw.aws;
    s.derived.tack = tackFromTwa(s.derived.twa);
    s.derived.pointOfSail = pointOfSailFromTwa(s.derived.twa);

    const q = dynamicPressure(aw.aws);
    const heelFactor = Math.pow(Math.cos(s.boat.heel * DEG), 2);
    const main = sailForce(s.main.boomAngle, aw.awa, SAILS.main.area * s.main.hoist);
    let jibArea = SAILS.jib.area * s.jib.deployed;
    // Jib blanketed behind the main when running with both sails on the same side.
    if (s.main.hoist > 0.3 && Math.abs(aw.awa) > 140 && sign(s.jib.angle) === sign(s.main.boomAngle)) jibArea *= 0.35;
    const jib = sailForce(s.jib.angle, aw.awa, jibArea);

    const lee = -sign(aw.awa) || 1;
    s.main.incidence = main.incidence;
    s.main.luff = s.main.hoist > 0.02 ? main.luff : 0;
    s.main.backed = main.backed;
    s.main.trim = s.main.hoist > 0.02 ? trimQuality(s.main.boomAngle, optimalChordAngle(aw.awa, lee, SAILS.minBoom, SAILS.maxBoom), main.luff, main.backed) : 0;
    s.jib.incidence = jib.incidence;
    s.jib.luff = s.jib.deployed > 0.02 ? jib.luff : 0;
    s.jib.backed = jib.backed && s.jib.deployed > 0.05;
    s.jib.trim = s.jib.deployed > 0.02 ? trimQuality(s.jib.angle, optimalChordAngle(aw.awa, lee, SAILS.minJib, SAILS.maxJib), jib.luff, jib.backed) : 0;

    // Windage of hull and rig along the apparent flow.
    const wfx = -Math.sin(aw.awa * DEG) * AERO.windageArea * AERO.windageCd;
    const wfy = -Math.cos(aw.awa * DEG) * AERO.windageArea * AERO.windageCd;

    const drive = q * ((main.fy + jib.fy) * heelFactor + wfy);
    const side = q * ((main.fx + jib.fx) * heelFactor + wfx);
    const heelMoment = q * heelFactor * (main.fx * SAILS.main.ceHeight + jib.fx * SAILS.jib.ceHeight);
    const yawMoment = q * heelFactor * (main.fx * SAILS.main.ceArm + jib.fx * SAILS.jib.ceArm);
    s.derived.driveForce = drive;
    s.derived.sideForce = side;
    return { drive, heelMoment, yawMoment };
  }

  // ---------------------------------------------------------------- events
  private detectEvents(dt: number): void {
    const s = this.state;
    const twa = s.derived.twa;
    const twaSign = sign(twa) || this.lastTwaSign;
    if (twaSign !== this.lastTwaSign) {
      this.emit('crossedWind', { through: Math.abs(twa) < 90 ? 'bow' : 'stern' });
      this.lastTwaSign = twaSign;
    }
    if (Math.abs(twa) > 3) {
      const tack: 'port' | 'starboard' = twa > 0 ? 'starboard' : 'port';
      if (tack !== this.lastTack) {
        this.emit('tackChanged', { from: this.lastTack, to: tack, through: Math.abs(twa) < 90 ? 'bow' : 'stern' });
        this.lastTack = tack;
      }
    }
    const boom = s.main.boomAngle;
    if (Math.abs(boom) > 4 && sign(boom) !== this.lastBoomSide) {
      const uncontrolled = Math.abs(s.main.boomRate) > SAILS.uncontrolledGybeRate && Math.abs(twa) > 100 && s.main.hoist > 0.3;
      this.emit('boomChangedSide', { to: boom > 0 ? 'starboard' : 'port', rate: Math.round(Math.abs(s.main.boomRate)), downwind: Math.abs(twa) > 100 });
      if (uncontrolled) this.emit('uncontrolledGybe', { rate: Math.round(Math.abs(s.main.boomRate)) });
      this.lastBoomSide = sign(boom);
    }
    const jibA = s.jib.angle;
    if (s.jib.deployed > 0.1 && Math.abs(jibA) > 4 && sign(jibA) !== this.lastJibSide) {
      this.emit('jibChangedSide', { to: jibA > 0 ? 'starboard' : 'port' });
      this.lastJibSide = sign(jibA);
    }
    const noGo = Math.abs(twa) < SIM.noGoAngle;
    if (noGo !== this.inNoGo) {
      this.emit(noGo ? 'enteredNoGo' : 'exitedNoGo');
      this.inNoGo = noGo;
    }
    if (s.boat.speed < 0.8 && Math.abs(twa) < 35) {
      this.ironsTimer += dt;
      if (this.ironsTimer > SIM.inIronsSeconds && !this.inIrons) {
        this.inIrons = true;
        this.emit('inIrons');
      }
    } else if (s.boat.speed > 1.5 || Math.abs(twa) > 45) {
      this.ironsTimer = 0;
      this.inIrons = false;
    }
    const p = s.derived.pointOfSail;
    if (p !== this.posCandidate) {
      this.posCandidate = p;
      this.posTimer = 0;
    } else if (p !== this.pos) {
      this.posTimer += dt;
      if (this.posTimer > 1.5) {
        this.emit('pointOfSailChanged', { from: this.pos, to: p });
        this.pos = p;
      }
    }
    const steady = Math.abs(s.boat.yawRate) < 2 && s.boat.speed > 2;
    if (steady) {
      this.stableTimer += dt;
      if (this.stableTimer > 5 && !this.stable) {
        this.stable = true;
        this.emit('stabilized');
      }
    } else if (Math.abs(s.boat.yawRate) > 5 || s.boat.speed < 1) {
      this.stableTimer = 0;
      this.stable = false;
    }
  }

  get isInIrons(): boolean {
    return this.inIrons;
  }
  get stableSeconds(): number {
    return this.stableTimer;
  }

  emit(type: SimEventType, data?: SimEvent['data']): void {
    const s = this.state;
    const e: SimEvent = {
      type,
      t: Math.round(s.t * 100) / 100,
      data,
      state: {
        heading: Math.round(s.boat.heading),
        speed: Math.round(s.boat.speed * 10) / 10,
        twa: Math.round(s.derived?.twa ?? 0),
        awa: Math.round(s.derived?.awa ?? 0),
        tack: s.derived?.tack ?? 'starboard',
        pointOfSail: s.derived?.pointOfSail ?? 'closeHauled',
        boomAngle: Math.round(s.main.boomAngle),
        mainHoist: Math.round(s.main.hoist * 100) / 100,
        jibDeployed: Math.round(s.jib.deployed * 100) / 100,
        mainsheet: Math.round(s.main.sheet * 100) / 100,
        jibPort: Math.round(s.jib.portSheet * 100) / 100,
        jibStarboard: Math.round(s.jib.starboardSheet * 100) / 100,
      },
    };
    this.events.push(e);
    for (const l of this.listeners) l(e);
  }
}
