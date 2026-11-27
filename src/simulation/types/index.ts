import type { VesselState, WorldDef } from '../world/types';

/** Core typed domain models for the sailing simulation. All angles are in degrees unless noted. */

export type Side = 'port' | 'starboard';
export type Tack = 'port' | 'starboard' | 'headToWind';
export type PointOfSail = 'noGo' | 'closeHauled' | 'closeReach' | 'beamReach' | 'broadReach' | 'running';

export interface WindState {
  /** Direction the true wind blows FROM, degrees clockwise from north (meteorological). */
  trueFrom: number;
  /** True wind speed, knots. */
  trueSpeed: number;
}

export interface MainsailState {
  /** 0 = lowered, 1 = fully hoisted. */
  hoist: number;
  /** Mainsheet: 0 = fully eased, 1 = sheeted hard to centerline. */
  sheet: number;
  /** Boom angle from the aft centerline. Positive = boom to starboard. */
  boomAngle: number;
  /** Boom angular velocity, deg/s. */
  boomRate: number;
  /** Angle of attack of the sail chord to the apparent wind (0..90). */
  incidence: number;
  /** 0..1 how much the sail is luffing (flapping). */
  luff: number;
  /** 0..1 trim quality (1 = optimal). */
  trim: number;
  /** True if the sail is being pressed from its leeward (back) side. */
  backed: boolean;
}

export interface JibState {
  /** 0 = fully furled, 1 = fully unfurled. */
  deployed: number;
  /** 0 = sheet released, 1 = sheeted hard. */
  portSheet: number;
  starboardSheet: number;
  /** Sail chord angle from the aft centerline. Positive = clew to starboard. */
  angle: number;
  incidence: number;
  luff: number;
  trim: number;
  /** Jib held on the windward side (aback). */
  backed: boolean;
  /** Which sheet is currently loaded / working. */
  activeSheet: Side | null;
}

export interface BoatState {
  /** Position in metres: x = east, y = north. */
  x: number;
  y: number;
  /** Heading, degrees clockwise from north (0..360). */
  heading: number;
  /** Speed through water along the heading, knots (may be slightly negative when drifting astern). */
  speed: number;
  /** Rudder angle, degrees. Positive turns the bow to starboard. */
  rudder: number;
  /** Yaw rate, deg/s. Positive = turning to starboard. */
  yawRate: number;
  /** Heel angle, degrees. Positive = heeled to starboard. */
  heel: number;
}

export interface DerivedState {
  /** True wind angle relative to bow, -180..180. Positive = wind from starboard. */
  twa: number;
  /** Apparent wind angle relative to bow, -180..180. Positive = wind from starboard. */
  awa: number;
  /** Apparent wind speed, knots. */
  aws: number;
  tack: Tack;
  pointOfSail: PointOfSail;
  /** Driving force (N) and heeling force (N) for instrumentation/education. */
  driveForce: number;
  sideForce: number;
}

/** Manoeuvres the crew can be told to prepare for ("היכון ל..."). */
export type CrewManoeuvre = 'tack' | 'gybe' | 'unfurl';
/** Crew stations in the roll call: jib sheet sides, mainsheet, furling line. */
export type CrewStation = 'port' | 'starboard' | 'main' | 'furler';

export type CrewCommandId =
  | 'prepareTack'
  /** Readiness roll call before a tack: "צד ימין מוכן?" / "צד שמאל מוכן?". */
  | 'checkStarboardReady'
  | 'checkPortReady'
  | 'tack'
  /** Gybe roll call: "ראשי מוכן?" (mainsheet trimmer). */
  | 'checkMainReady'
  /** "דד רן": called on a dead run as the jib collapses behind the main, just before the boom comes across. */
  | 'deadRun'
  /** "היכון לפתיחת חלוץ" and its roll call "גולל מוכן?" (furling line). */
  | 'prepareUnfurl'
  | 'checkFurlerReady'
  /** "העבר חלוץ!": one side releases the old jib sheet, the other pulls the new one. */
  | 'switchJib'
  | 'prepareGybe'
  | 'gybe'
  | 'releaseJibStarboard'
  | 'releaseJibPort'
  | 'trimJibStarboard'
  | 'trimJibPort'
  | 'trimMain'
  | 'easeMain'
  | 'centerMain'
  | 'hoistMain'
  | 'lowerMain'
  | 'unfurlJib'
  | 'furlJib';

/** Lines the crew (or the user directly) can work. */
export type LineId = 'mainsheet' | 'jibPort' | 'jibStarboard' | 'halyard' | 'furler';

export interface CrewTask {
  id: string;
  command: CrewCommandId;
  line?: LineId;
  /** Target value for the line (0..1), when applicable. */
  target?: number;
  /** Seconds until the crew starts working. */
  delay: number;
  phase: string;
}

export interface CrewState {
  readyFor: CrewManoeuvre | null;
  /** Which crew stations answered "מוכן" to the skipper's roll call since the last "היכון". */
  sidesReady: Record<CrewStation, boolean>;
  /** Seconds remaining until crew finishes preparing. */
  preparing: number;
  tasks: CrewTask[];
  /** Last acknowledgement message key, for UI. */
  lastAck: { key: string; t: number } | null;
}

export interface ControlInput {
  /** Desired rudder angle -1..1 (scaled by max rudder). */
  helm: number;
  /** Continuous manual line adjustments: -1 ease, +1 trim/hoist, 0 idle. */
  mainsheet: number;
  jibPort: number;
  jibStarboard: number;
  halyard: number;
  furler: number;
}

export type SimEventType =
  | 'crewCommand'
  /** A crew side answered the skipper's roll call (data: side, ready). */
  | 'crewReport'
  | 'rudderChanged'
  | 'sheetEased'
  | 'sheetTrimmed'
  | 'sailHoisted'
  | 'sailLowered'
  | 'jibUnfurled'
  | 'jibFurled'
  | 'crossedWind'
  | 'tackChanged'
  | 'boomChangedSide'
  | 'jibChangedSide'
  | 'enteredNoGo'
  | 'exitedNoGo'
  | 'uncontrolledGybe'
  | 'inIrons'
  | 'pointOfSailChanged'
  | 'stabilized'
  | 'reset'
  // harbour / traffic scenarios
  | 'throttleChanged'
  | 'collision'
  | 'closeQuarters'
  | 'vesselClose'
  | 'vesselCpa'
  | 'zoneEntered'
  | 'zoneExited'
  | 'gateCrossed'
  /** The student answered an identification question (data: q, choice, correct). */
  | 'answer';

export interface SimEventSnapshot {
  heading: number;
  speed: number;
  twa: number;
  awa: number;
  tack: Tack;
  pointOfSail: PointOfSail;
  boomAngle: number;
  mainHoist: number;
  jibDeployed: number;
  mainsheet: number;
  jibPort: number;
  jibStarboard: number;
}

export interface SimEvent {
  type: SimEventType;
  /** Simulation time, seconds. */
  t: number;
  data?: Record<string, string | number | boolean | null>;
  state: SimEventSnapshot;
}

export interface SimState {
  t: number;
  wind: WindState;
  boat: BoatState;
  main: MainsailState;
  jib: JibState;
  crew: CrewState;
  derived: DerivedState;
  input: ControlInput;
  /** Auxiliary engine. throttle -1 (astern) .. 1 (full ahead); `target` is the lever position. */
  motor: { fitted: boolean; throttle: number; target: number };
  /** Other vessels (harbour / traffic scenarios). */
  vessels: VesselState[];
  /** Ids of world zones the own boat is in. */
  zones: string[];
}

/** Initial conditions used by scenarios and free sailing. */
export interface InitialConditions {
  heading: number;
  speed: number;
  wind: WindState;
  mainHoist: number;
  mainsheet: number;
  jibDeployed: number;
  jibPortSheet: number;
  jibStarboardSheet: number;
  rudder?: number;
  /** Set the mainsheet and leeward jib sheet to optimal trim for the initial apparent wind. */
  autoTrim?: boolean;
  /** Start position (m). Default 0,0. */
  x?: number;
  y?: number;
  /** Use the auxiliary engine (shows the throttle). */
  motor?: boolean;
  /** Initial throttle lever position. */
  throttle?: number;
  /** Harbour, traffic, time of day. */
  world?: WorldDef;
}
