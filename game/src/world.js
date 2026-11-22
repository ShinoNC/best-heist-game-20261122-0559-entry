// The game's rules and state, with no drawing and no browser in it: the thief, the
// alarm meter, the loot, the lockpick, the tools and the win/lose. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react without the
// world knowing about screens or sound. Nothing here allocates after createWorld returns.

import { ALARM, LOOT, SCORE, START_CREDITS, THIEF, TOOLS } from './config.js';
import { createCameras, empBlast, stepCamera, thiefInCameraCone } from './cameras.js';
import { createGuards, GUARD_ALERT, GUARD_SPOTTED, sendToDecoy, stepGuard, thiefInCone } from './guards.js';
import { createLoadout, stepTools, useDecoy, useEmp, useSmoke } from './tools.js';
import { ENTRY, EXIT, GOLD_SPOTS, inVent, moveCircle, VAULT } from './level.js';

export const EVENT_LOOT = 1;
export const EVENT_DIAMOND = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_LOCKDOWN = 8;
export const EVENT_CAUGHT = 16;
export const EVENT_ESCAPED = 32;
export const EVENT_TOOL = 64;

export const PHASE_PLAY = 0;
export const PHASE_CAUGHT = 1;
export const PHASE_ESCAPED = 2;

export function createWorld(random) {
  const thief = {
    x: ENTRY.x, y: ENTRY.y, crouch: false, hasDiamond: false,
    gold: 0, lockpick: 0, lockpicking: false,
  };
  const goldSpots = GOLD_SPOTS.map((g) => ({ x: g.x, y: g.y, taken: false }));
  const state = {
    phase: PHASE_PLAY,
    time: 0,
    credits: START_CREDITS,
    loadout: createLoadout(),
    route: 'hall',
    thief,
    guards: createGuards(),
    cameras: createCameras(),
    smokes: [],
    decoys: [],
    alarm: 0,
    maxAlarm: 0,
    lockdown: 0,
    vaultOpen: false,
    diamondTaken: false,
    goldSpots,
    message: '',
    messageTimer: 0,
    spottedFlash: 0,
    score: null,
  };

  function reset() {
    thief.x = ENTRY.x;
    thief.y = ENTRY.y;
    thief.crouch = false;
    thief.hasDiamond = false;
    thief.gold = 0;
    thief.lockpick = 0;
    thief.lockpicking = false;
    for (const g of goldSpots) g.taken = false;
    state.phase = PHASE_PLAY;
    state.time = 0;
    state.credits = START_CREDITS;
    state.loadout = createLoadout();
    state.route = 'hall';
    state.guards = createGuards();
    state.cameras = createCameras();
    state.smokes.length = 0;
    state.decoys.length = 0;
    state.alarm = 0;
    state.maxAlarm = 0;
    state.lockdown = 0;
    state.vaultOpen = false;
    state.diamondTaken = false;
    state.message = '';
    state.messageTimer = 0;
    state.spottedFlash = 0;
    state.score = null;
  }

  function showMessage(text, seconds) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function finishEscape() {
    const loot = (state.diamondTaken ? LOOT.diamondValue : 0) + thief.gold * LOOT.goldValue;
    const bonus = state.maxAlarm < 25 ? SCORE.ghostBonus : state.maxAlarm < 50 ? SCORE.cleanBonus : 0;
    const timePenalty = Math.max(0, state.time - SCORE.timeParSeconds) * SCORE.timePenaltyPerSecond;
    const alarmPenalty = Math.round(state.maxAlarm) * SCORE.alarmPenaltyPerPoint;
    state.score = {
      loot,
      bonus,
      timePenalty,
      alarmPenalty,
      total: Math.max(0, loot + bonus - timePenalty - alarmPenalty),
      ghost: state.maxAlarm < 25,
    };
    state.phase = PHASE_ESCAPED;
  }

  /**
   * One fixed step. `input` is { mx, my, crouch, tool, decoyX, decoyY, lockpick } where
   * mx/my is the move direction (-1..1), tool is 'smoke' | 'emp' | 'decoy' | null for a
   * tool used this step, and lockpick is true while E is held.
   */
  function step(dt, input) {
    let events = 0;
    if (state.phase !== PHASE_PLAY) return events;
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.spottedFlash > 0) state.spottedFlash -= dt;
    const wasLocked = state.lockdown > 0;
    if (state.lockdown > 0) state.lockdown -= dt;
    if (wasLocked && state.lockdown <= 0) state.alarm = ALARM.lockdownReset;

    // Move the thief: crouch and the vent both slow the step.
    thief.crouch = input.crouch;
    let speed = thief.crouch ? THIEF.crouchSpeed : THIEF.speed;
    if (inVent(thief.x, thief.y)) speed = THIEF.ventSpeed;
    const len = Math.hypot(input.mx, input.my);
    if (len > 0 && !thief.lockpicking) {
      const moved = moveCircle(thief.x, thief.y, THIEF.radius, (input.mx / len) * speed * dt, (input.my / len) * speed * dt);
      thief.x = moved.x;
      thief.y = moved.y;
    }

    // Tools.
    if (input.tool === 'smoke' && useSmoke(state.loadout, state.smokes, thief)) {
      events |= EVENT_TOOL;
      showMessage('Smoke out — cones cannot see through it.', 2);
    } else if (input.tool === 'emp' && useEmp(state.loadout)) {
      empBlast(state.cameras);
      events |= EVENT_TOOL;
      showMessage('EMP burst — cameras down for 12 seconds.', 2);
    } else if (input.tool === 'decoy' && useDecoy(state.loadout, state.decoys, input.decoyX, input.decoyY)) {
      events |= EVENT_TOOL;
      for (const guard of state.guards) {
        const dx = guard.x - input.decoyX;
        const dy = guard.y - input.decoyY;
        if (dx * dx + dy * dy < TOOLS.decoy.radius * TOOLS.decoy.radius) sendToDecoy(guard, input.decoyX, input.decoyY);
      }
      showMessage('Decoy thrown — guards go to look.', 2);
    }
    stepTools(dt, state.smokes, state.decoys);

    // The lockpick: hold E by the vault case. Moving or being seen pauses it, never resets it.
    const vaultDx = thief.x - VAULT.caseX;
    const vaultDy = thief.y - VAULT.caseY;
    const nearVault = vaultDx * vaultDx + vaultDy * vaultDy < LOOT.lockpickRange * LOOT.lockpickRange;
    thief.lockpicking = false;
    if (!state.vaultOpen && nearVault && input.lockpick) {
      const seen = state.guards.some((g) => thiefInCone(g, thief, state.smokes))
        || state.cameras.some((c) => thiefInCameraCone(c, thief, state.smokes));
      if (!seen) {
        thief.lockpicking = true;
        thief.lockpick += dt / LOOT.lockpickSeconds;
        if (thief.lockpick >= 1) {
          state.vaultOpen = true;
          state.diamondTaken = true;
          thief.hasDiamond = true;
          events |= EVENT_DIAMOND;
          showMessage('The Meridian Diamond is yours — get to the van!', 3);
        }
      }
    }

    // Gold bars: walk over one to pocket it.
    for (const spot of goldSpots) {
      if (spot.taken) continue;
      const dx = thief.x - spot.x;
      const dy = thief.y - spot.y;
      if (dx * dx + dy * dy < LOOT.grabRange * LOOT.grabRange) {
        spot.taken = true;
        thief.gold += 1;
        state.credits += LOOT.goldCredits;
        events |= EVENT_LOOT;
        showMessage(`Gold bar pocketed — +$50,000, +${LOOT.goldCredits} credits.`, 2);
      }
    }

    // Guards and cameras.
    let seenByGuard = false;
    let seenByCamera = false;
    let anyChase = false;
    for (const guard of state.guards) {
      if (thiefInCone(guard, thief, state.smokes)) seenByGuard = true;
      if (guard.state === GUARD_ALERT) anyChase = true;
      const result = stepGuard(guard, dt, thief, state.smokes);
      if (result === 'spotted') {
        state.alarm = Math.min(100, state.alarm + ALARM.spottedBump);
        state.spottedFlash = 0.6;
        events |= EVENT_SPOTTED;
        showMessage('SPOTTED! Break line of sight!', 1.5);
      } else if (result === 'caught') {
        state.phase = PHASE_CAUGHT;
        events |= EVENT_CAUGHT;
        return events;
      }
    }
    for (const camera of state.cameras) {
      if (thiefInCameraCone(camera, thief, state.smokes)) seenByCamera = true;
      if (stepCamera(camera, dt, thief, state.smokes)) {
        // A camera that locks on sends the nearest patrolling guard to look.
        let best = null;
        let bestDist = Infinity;
        for (const guard of state.guards) {
          if (guard.state === GUARD_ALERT || guard.state === GUARD_SPOTTED) continue;
          const d = Math.hypot(guard.x - thief.x, guard.y - thief.y);
          if (d < bestDist) {
            bestDist = d;
            best = guard;
          }
        }
        if (best) {
          best.lastSeenX = thief.x;
          best.lastSeenY = thief.y;
          best.suspicion = Math.max(best.suspicion, 0.6);
        }
      }
    }

    // The alarm meter: climbs while seen or chased, drains while hidden. During a
    // lockdown it stays pinned at 100; when the lockdown ends it drops to the reset value.
    if (state.lockdown > 0) {
      state.alarm = 100;
    } else {
      if (seenByGuard) state.alarm += ALARM.guardSeen * dt;
      if (seenByCamera) state.alarm += ALARM.cameraSeen * dt;
      if (anyChase) state.alarm += ALARM.chase * dt;
      if (!seenByGuard && !seenByCamera && !anyChase) state.alarm -= ALARM.drain * dt;
      state.alarm = Math.max(0, Math.min(100, state.alarm));
      state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
      if (state.alarm >= 100) {
        state.lockdown = ALARM.lockdownSeconds;
        events |= EVENT_LOCKDOWN;
        showMessage('LOCKDOWN! The exit is sealed — stay hidden.', 3);
        for (const guard of state.guards) {
          guard.lastSeenX = thief.x;
          guard.lastSeenY = thief.y;
          if (guard.state !== GUARD_ALERT && guard.state !== GUARD_SPOTTED) {
            guard.suspicion = Math.max(guard.suspicion, 0.6);
          }
        }
      }
    }

    // The exit: only with the diamond, and never during a lockdown.
    if (state.diamondTaken && state.lockdown <= 0) {
      const inExit = thief.x > EXIT.x - 10 && thief.x < EXIT.x + EXIT.w + 10
        && thief.y > EXIT.y - 10 && thief.y < EXIT.y + EXIT.h + 10;
      if (inExit) {
        finishEscape();
        events |= EVENT_ESCAPED;
        return events;
      }
    } else if (!state.diamondTaken) {
      const nearExit = Math.hypot(thief.x - (EXIT.x + EXIT.w / 2), thief.y - (EXIT.y + EXIT.h / 2)) < 60;
      if (nearExit && state.messageTimer <= 0) {
        showMessage('The job is not done — steal the Meridian Diamond first.', 2);
      }
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
