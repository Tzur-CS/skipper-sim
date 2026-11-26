/**
 * Centralized yacht, sail, wind and simulation coefficients.
 * Values approximate a generic ~40 ft (12 m) cruising sloop. They are tuned for
 * educational plausibility, not racing accuracy.
 */
export const YACHT = {
  loa: 12.2, // m
  beam: 3.9,
  freeboard: 1.25,
  draft: 2.0,
  mass: 10500, // kg incl. added mass
  /** Hull speed in knots (~1.34 * sqrt(LWL ft)). */
  hullSpeedKt: 8.0,
  mastStation: -1.2, // m from midships (negative = forward), local z
  mastHeight: 17.5, // above deck
  boomHeight: 2.3,
  boomLength: 4.9,
  forestayHeight: 15.8,
  bowStation: -6.0,
  wheelStation: 4.5,
  helmStation: 5.15,
  eyeHeight: 1.72, // above cockpit floor
  cockpitFloor: 0.55, // above waterline
  maxRudder: 32,
  /** Steering geometry: effective wheelbase used for yaw-rate (m). */
  turnLength: 7.0,
  /** Yaw response time constant (s). */
  yawTau: 0.9,
} as const;

export const SAILS = {
  main: { area: 38, ceArm: -1.5, ceHeight: 7.5 },
  jib: { area: 34, ceArm: 1.5, ceHeight: 6.0 },
  /** Mainsheet → maximum boom angle mapping: sheet 1 → minBoom, sheet 0 → maxBoom. */
  minBoom: 3,
  maxBoom: 86,
  minJib: 8,
  maxJib: 88,
  /** Jib sheet above this value prevents the sail from crossing to the other side. */
  jibCrossHold: 0.32,
  /** How far "by the lee" (deg) the main stays before the wind flips it across. */
  byTheLeeLimit: 12,
  /** Boom swing dynamics. */
  boomStiffness: 22, // 1/s^2 at reference pressure
  boomDamping: 4.5,
  /** Gybe considered uncontrolled if boom crosses centre faster than this (deg/s). */
  uncontrolledGybeRate: 70,
  /** Rates (fraction per second). */
  hoistRate: 1 / 16,
  lowerRate: 1 / 9,
  furlRate: 1 / 10,
  unfurlRate: 1 / 8,
  mainTrimRate: 0.22,
  mainEaseRate: 0.45,
  jibTrimRate: 0.28,
  jibEaseRate: 0.9,
} as const;

/** Aerodynamic coefficients vs incidence (deg). Editable "polar" for sail behaviour. */
export const AERO = {
  lift: [
    [0, 0],
    [7, 0],
    [11, 0.4],
    [15, 0.85],
    [19, 1.2],
    [24, 1.4],
    [29, 1.42],
    [37, 1.3],
    [50, 1.05],
    [65, 0.72],
    [80, 0.38],
    [90, 0.1],
  ] as const,
  drag: [
    [0, 0.06],
    [11, 0.07],
    [15, 0.1],
    [19, 0.14],
    [24, 0.2],
    [29, 0.28],
    [37, 0.42],
    [50, 0.7],
    [65, 0.98],
    [80, 1.18],
    [90, 1.28],
  ] as const,
  /** Optimal incidence used for trim-quality and crew auto trim. */
  optimalIncidence: 25,
  /** Luffing fades out between these incidences (deg). */
  luffFull: 12,
  luffNone: 20,
  airDensity: 1.225,
  /** Extra drag coefficient of a flogging (luffing) sail. */
  flogDrag: 0.3,
  /** Hull/rig windage area (m^2) and drag coefficient. */
  windageArea: 8,
  windageCd: 0.9,
};

export const HYDRO = {
  /** Resistance R = k * v^2 * (1 + wave * (v/vh)^n). v in m/s. */
  k: 92,
  /** Linear (viscous) term, N per m/s: dominates at low speed so the boat glides to a stop. */
  linear: 170,
  wave: 2.2,
  waveExp: 6,
  /** Extra resistance when moving astern. */
  asternFactor: 4,
  /** Righting moment per sin(heel), N*m. */
  rightingStiffness: 105000,
  maxHeel: 40,
  heelTau: 1.4,
  /** Yaw moment from sails → yaw acceleration (deg/s^2 per N*m). */
  sailYawGain: 0.00055,
  /** Bare-hull weathercocking (bow falls off when stopped head to wind), deg/s^2. */
  windYawGain: 0.35,
};

export const SIM = {
  dt: 1 / 60,
  maxSubSteps: 8,
  /** Speeds below this (kt) give almost no steerage. */
  steerageSpeed: 1.0,
  rudderRate: 45, // deg/s
  noGoAngle: 40, // |TWA| below this = no-go zone (educational band)
  inIronsSeconds: 6,
} as const;

/** Points of sail by |TWA| (deg). Educational convention; may differ between schools. */
export const POINTS_OF_SAIL: ReadonlyArray<{ id: import('./types').PointOfSail; max: number }> = [
  { id: 'noGo', max: 40 },
  { id: 'closeHauled', max: 60 },
  { id: 'closeReach', max: 80 },
  { id: 'beamReach', max: 105 },
  { id: 'broadReach', max: 155 },
  { id: 'running', max: 180.01 },
];

/** Auxiliary engine (inboard diesel, ~30 hp). Thrust in N; ~3 kn at 0.22, ~4.8 kn at 0.45, ~6.5 kn full. */
export const MOTOR = {
  thrustAhead: 2300,
  thrustAstern: 1400,
  /** Equivalent flow speed (m/s) of propeller wash over the rudder at full throttle, standing still. */
  washSpeed: 2.2,
  /** Lever positions offered in the UI. */
  levels: [-0.3, 0, 0.22, 0.45, 1] as const,
};
