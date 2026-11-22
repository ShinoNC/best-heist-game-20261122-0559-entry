// The screenshot scenes behind ?shot=play|plan|grab|escape. The play scene runs the real
// rules forward with an autopilot that walks the main-hall route, crouches when a guard
// grows suspicious and falls back to the vent when chased, so the frame is what a real
// run looks like. The grab and escape scenes stage their moment directly through the
// game's own state, and the plan scene just shows the loadout screen.

import { STEP } from './config.js';
import { GUARD_ALERT, GUARD_SPOTTED } from './guards.js';
import { ROUTES } from './level.js';
import { SCREEN_PLAN, SCREEN_PLAY } from './render.js';
import { PHASE_PLAY } from './world.js';

const PLAY_SECONDS = 16;
const SAMPLE = STEP;

/** The play scene's autopilot: walk the hall route, crouch under suspicion, flee to the vent. */
function autopilot(state) {
  const thief = state.thief;
  const route = ROUTES.hall.path;
  const anyChase = state.guards.some((g) => g.state === GUARD_ALERT || g.state === GUARD_SPOTTED);
  if (anyChase) {
    // Run for the vent: the safe corridor along the bottom.
    const dx = 640 - thief.x;
    const dy = 642 - thief.y;
    const len = Math.hypot(dx, dy) || 1;
    return { mx: dx / len, my: dy / len, crouch: false, tool: null, lockpick: false };
  }
  const hot = state.guards.some((g) => g.suspicion > 0.5);
  if (hot) return { mx: 0, my: 0, crouch: true, tool: null, lockpick: false };
  // Walk the route's waypoints in order.
  let target = route[route.length - 1];
  for (const point of route) {
    if (Math.hypot(point.x - thief.x, point.y - thief.y) > 30) {
      target = point;
      break;
    }
  }
  const dx = target.x - thief.x;
  const dy = target.y - thief.y;
  const len = Math.hypot(dx, dy) || 1;
  const nearVault = Math.hypot(640 - thief.x, 104 - thief.y) < 64;
  return { mx: dx / len, my: dy / len, crouch: false, tool: null, lockpick: nearVault };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Any unknown name stages the play scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'plan') {
    // A half-planned job: the vent route picked, one smoke and one EMP bought.
    world.state.route = 'vent';
    world.state.loadout.smoke = 1;
    world.state.loadout.emp = 1;
    world.state.credits = 0;
    return { screen: SCREEN_PLAN, best: 0 };
  }
  if (name === 'grab') {
    const s = world.state;
    s.thief.x = 640;
    s.thief.y = 168;
    s.thief.lockpick = 0.62;
    s.thief.lockpicking = true;
    s.thief.gold = 1;
    s.goldSpots[0].taken = true;
    s.alarm = 58;
    s.maxAlarm = 58;
    s.time = 96;
    s.loadout.smoke = 1;
    s.credits = 1;
    // The vault guard closing in from the left, nearly sure.
    const guard = s.guards[1];
    guard.x = 470;
    guard.y = 210;
    guard.dir = Math.atan2(s.thief.y - guard.y, s.thief.x - guard.x);
    guard.suspicion = 0.85;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'escape') {
    const s = world.state;
    s.thief.x = 1040;
    s.thief.y = 560;
    s.thief.hasDiamond = true;
    s.diamondTaken = true;
    s.vaultOpen = true;
    s.thief.gold = 2;
    s.goldSpots[0].taken = true;
    s.goldSpots[1].taken = true;
    s.alarm = 84;
    s.maxAlarm = 84;
    s.time = 152;
    s.loadout.smoke = 0;
    s.loadout.emp = 0;
    s.credits = 4;
    // One guard chasing from the left, one cutting across from above.
    const g1 = s.guards[0];
    g1.x = 780;
    g1.y = 520;
    g1.dir = Math.atan2(s.thief.y - g1.y, s.thief.x - g1.x);
    g1.state = GUARD_ALERT;
    g1.suspicion = 1;
    const g3 = s.guards[2];
    g3.x = 1000;
    g3.y = 380;
    g3.dir = Math.atan2(s.thief.y - g3.y, s.thief.x - g3.x);
    g3.suspicion = 0.7;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // The cover: a real run, played forward by the autopilot.
  for (let t = 0; t < PLAY_SECONDS; t += SAMPLE) {
    world.step(SAMPLE, autopilot(world.state));
    if (world.state.phase !== PHASE_PLAY) break;
  }
  return { screen: SCREEN_PLAY, best: 0 };
}
