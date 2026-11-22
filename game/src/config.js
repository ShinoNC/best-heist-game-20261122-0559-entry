// VAULTBREAK — The Meridian Job. Every tuning number and colour in one place.
// The room is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Walls: the room's outer shell (the play area is inset from the canvas edge). */
export const WALL = { x: 24, y: 24, width: 1232, height: 672 };

export const THIEF = {
  radius: 13,
  speed: 230,
  crouchSpeed: 130,
  ventSpeed: 110,
  /** Detection range multiplier while crouched. */
  crouchSpot: 0.7,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 85,
  chaseSpeed: 170,
  coneRange: 200,
  coneHalfAngle: 0.61,
  /** Suspicion per second while the thief is in the cone. */
  spotRate: 1.4,
  /** Suspicion per second while the thief is out of the cone. */
  calmRate: 0.5,
  /** Suspicion level that makes a guard walk over and look. */
  suspiciousAt: 0.3,
  /** Seconds a guard stands still with "!" before the chase starts (the fair warning). */
  spottedPause: 1.5,
  /** Seconds a guard chases after losing sight before giving up. */
  chaseMemory: 3,
  /** Seconds a guard looks around at an investigated spot. */
  lookTime: 2,
  /** Pause at each patrol waypoint, seconds. */
  waypointPause: 1,
};

export const CAMERA = {
  coneRange: 230,
  coneHalfAngle: 0.52,
  /** Sweep speed, radians per second. */
  sweepSpeed: 0.45,
  /** Sweep half-amplitude, radians around the base angle. */
  sweepHalf: 0.7,
  spotRate: 1.0,
  calmRate: 0.6,
  /** Seconds a camera stays dead after an EMP. */
  empDown: 12,
};

export const ALARM = {
  /** Points per second while a guard sees the thief. */
  guardSeen: 18,
  /** Points per second while a camera sees the thief. */
  cameraSeen: 12,
  /** Points per second while any guard is chasing. */
  chase: 25,
  /** One-off points when a guard finishes the SPOTTED warning. */
  spottedBump: 10,
  /** Points per second the meter drains when nobody sees the thief. */
  drain: 8,
  /** Lockdown length in seconds when the meter hits 100. */
  lockdownSeconds: 10,
  /** Meter value after a lockdown ends. */
  lockdownReset: 50,
};

export const LOOT = {
  diamondValue: 500000,
  goldValue: 50000,
  /** Credits a gold bar pays on top of its value. */
  goldCredits: 2,
  /** Seconds holding E to pick the vault case. */
  lockpickSeconds: 2.5,
  /** How close the thief must be to the case to pick it. */
  lockpickRange: 64,
  /** How close the thief must be to grab a gold bar. */
  grabRange: 30,
};

export const TOOLS = {
  smoke: { name: 'Smoke Bomb', cost: 2, key: '1', radius: 95, seconds: 5 },
  emp: { name: 'EMP Burst', cost: 3, key: '2' },
  decoy: { name: 'Decoy', cost: 2, key: '3', radius: 320, seconds: 4 },
};

export const START_CREDITS = 5;

export const SCORE = {
  /** Bonus for escaping with the diamond and max alarm under 25. */
  ghostBonus: 100000,
  /** Bonus for escaping with the diamond and max alarm under 50. */
  cleanBonus: 50000,
  /** Dollars lost per second of play past the par time. */
  timeParSeconds: 120,
  timePenaltyPerSecond: 1000,
  /** Dollars lost per point of the highest alarm reached. */
  alarmPenaltyPerPoint: 500,
};

export const PALETTE = {
  backdrop: '#0b0e17',
  floor: '#171c2b',
  floorAlt: '#1b2133',
  carpet: '#5a1f2b',
  carpetEdge: '#7a2b3a',
  wall: '#2c3348',
  wallTop: '#3a435f',
  vent: '#10141f',
  ventEdge: '#2a3040',
  caseGlass: 'rgba(140, 200, 255, 0.16)',
  caseFrame: '#8a6d2f',
  pillar: '#39415c',
  pillarTop: '#4a5470',
  thief: '#e8ecf4',
  thiefDark: '#2a2f3d',
  guard: '#3d4a6b',
  guardCap: '#2c3550',
  cone: 'rgba(242, 201, 76, 0.20)',
  coneEdge: 'rgba(242, 201, 76, 0.45)',
  coneHot: 'rgba(229, 83, 75, 0.30)',
  coneHotEdge: 'rgba(229, 83, 75, 0.65)',
  cameraCone: 'rgba(120, 180, 255, 0.16)',
  cameraConeEdge: 'rgba(120, 180, 255, 0.4)',
  cameraOff: '#55606f',
  diamond: '#aef3ff',
  gold: '#f2c94c',
  alarmLow: '#4caf7d',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
  panel: '#141828',
  panelEdge: '#2c3348',
  text: '#eef1f5',
  muted: '#9aa3b5',
  accent: '#f2c94c',
  danger: '#e5534b',
  ok: '#4caf7d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'vaultbreak.best';
