// Guards: patrol, suspicion and the chase. A guard walks its waypoint loop; when the
// thief enters its vision cone with a clear line of sight, suspicion rises. Past the
// threshold the guard walks over to look; at full suspicion it stops, flashes "!" for a
// fair warning beat, then chases. Lose it for a few seconds and it calms back to patrol.

import { GUARD } from './config.js';
import { GUARD_PATROLS, hasLineOfSight, inVent, moveCircle } from './level.js';

export const GUARD_PATROL = 0;
export const GUARD_SUSPICIOUS = 1;
export const GUARD_SPOTTED = 2;
export const GUARD_ALERT = 3;

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is the thief inside this guard's cone right now (range, angle, sight, not in smoke/vent)? */
export function thiefInCone(guard, thief, smokes) {
  if (inVent(thief.x, thief.y)) return false;
  for (const s of smokes) {
    const sdx = thief.x - s.x;
    const sdy = thief.y - s.y;
    if (sdx * sdx + sdy * sdy < s.radius * s.radius) return false;
  }
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const range = GUARD.coneRange * (thief.crouch ? 0.7 : 1);
  if (dx * dx + dy * dy > range * range) return false;
  if (Math.abs(angleDiff(angleTo(guard.x, guard.y, thief.x, thief.y), guard.dir)) > GUARD.coneHalfAngle) return false;
  return hasLineOfSight(guard.x, guard.y, thief.x, thief.y);
}

export function createGuards() {
  return GUARD_PATROLS.map((waypoints, index) => {
    const start = waypoints[0];
    const next = waypoints[1];
    return {
      x: start.x,
      y: start.y,
      dir: angleTo(start.x, start.y, next.x, next.y),
      waypoints,
      waypointIdx: 1,
      pause: 0,
      state: GUARD_PATROL,
      suspicion: 0,
      lastSeenX: start.x,
      lastSeenY: start.y,
      spottedTimer: 0,
      lookTimer: 0,
      lostTimer: 0,
      decoyX: null,
      decoyY: null,
      index,
    };
  });
}

/**
 * One fixed step for one guard. Returns 'spotted' when the warning beat finishes and the
 * chase begins, 'caught' when the guard reaches the thief, otherwise null.
 */
export function stepGuard(guard, dt, thief, smokes) {
  const seen = thiefInCone(guard, thief, smokes);
  if (seen) {
    guard.lastSeenX = thief.x;
    guard.lastSeenY = thief.y;
    guard.suspicion = Math.min(1, guard.suspicion + GUARD.spotRate * dt);
    guard.lostTimer = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.calmRate * dt);
  }

  if (guard.state === GUARD_PATROL) {
    if (guard.suspicion >= 1) {
      guard.state = GUARD_SPOTTED;
      guard.spottedTimer = GUARD.spottedPause;
      return null;
    }
    if (guard.suspicion >= GUARD.suspiciousAt || guard.decoyX !== null) {
      guard.state = GUARD_SUSPICIOUS;
      guard.lookTimer = GUARD.lookTime;
      return null;
    }
    // Walk the loop, pausing at each waypoint to look around.
    if (guard.pause > 0) {
      guard.pause -= dt;
      guard.dir += Math.sin(guard.pause * 3) * 0.02;
      return null;
    }
    const target = guard.waypoints[guard.waypointIdx];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      guard.waypointIdx = (guard.waypointIdx + 1) % guard.waypoints.length;
      guard.pause = GUARD.waypointPause;
      return null;
    }
    const step = GUARD.patrolSpeed * dt;
    const nx = guard.x + (dx / dist) * step;
    const ny = guard.y + (dy / dist) * step;
    const moved = moveCircle(guard.x, guard.y, GUARD.radius, nx - guard.x, ny - guard.y);
    guard.x = moved.x;
    guard.y = moved.y;
    guard.dir = angleTo(guard.x, guard.y, target.x, target.y);
    return null;
  }

  if (guard.state === GUARD_SUSPICIOUS) {
    if (guard.suspicion >= 1) {
      guard.state = GUARD_SPOTTED;
      guard.spottedTimer = GUARD.spottedPause;
      return null;
    }
    const tx = guard.decoyX !== null ? guard.decoyX : guard.lastSeenX;
    const ty = guard.decoyY !== null ? guard.decoyY : guard.lastSeenY;
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) {
      guard.lookTimer -= dt;
      guard.dir += dt * 1.2;
      if (guard.lookTimer <= 0) {
        guard.state = GUARD_PATROL;
        guard.decoyX = null;
        guard.decoyY = null;
        guard.suspicion = 0;
      }
      return null;
    }
    const step = GUARD.patrolSpeed * 1.25 * dt;
    const moved = moveCircle(guard.x, guard.y, GUARD.radius, (dx / dist) * step, (dy / dist) * step);
    guard.x = moved.x;
    guard.y = moved.y;
    guard.dir = angleTo(guard.x, guard.y, tx, ty);
    return null;
  }

  if (guard.state === GUARD_SPOTTED) {
    guard.dir = angleTo(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY);
    guard.spottedTimer -= dt;
    if (guard.spottedTimer <= 0) {
      if (seen || guard.suspicion > 0.5) {
        guard.state = GUARD_ALERT;
        return 'spotted';
      }
      guard.state = GUARD_SUSPICIOUS;
      guard.lookTimer = GUARD.lookTime;
    }
    return null;
  }

  // GUARD_ALERT: chase the thief while it is visible; otherwise run to the last
  // place it was seen, then look around. The guard never tracks a thief it
  // cannot see — breaking line of sight and hiding in the vent escapes a chase.
  const actualDist = Math.hypot(thief.x - guard.x, thief.y - guard.y);
  if (actualDist < GUARD.radius + 13) return 'caught';
  const tx = seen ? thief.x : guard.lastSeenX;
  const ty = seen ? thief.y : guard.lastSeenY;
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (!seen) {
    guard.lostTimer += dt;
    if (dist < 10 || guard.lostTimer > GUARD.chaseMemory) {
      guard.state = GUARD_SUSPICIOUS;
      guard.lookTimer = GUARD.lookTime;
      return null;
    }
  }
  const step = GUARD.chaseSpeed * dt;
  const moved = moveCircle(guard.x, guard.y, GUARD.radius, (dx / dist) * step, (dy / dist) * step);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.dir = angleTo(guard.x, guard.y, tx, ty);
  return null;
}

/** Send a guard to investigate a decoy point. */
export function sendToDecoy(guard, x, y) {
  if (guard.state === GUARD_ALERT || guard.state === GUARD_SPOTTED) return;
  guard.decoyX = x;
  guard.decoyY = y;
  guard.state = GUARD_SUSPICIOUS;
  guard.lookTimer = GUARD.lookTime;
}
