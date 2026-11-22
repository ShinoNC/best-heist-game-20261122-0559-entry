// Wall cameras: they sweep their cones back and forth across the galleries. A thief
// caught in a live cone raises the camera's suspicion; at full suspicion the alarm climbs
// fast and the nearest guard is sent to look. An EMP burst kills every camera for a while.

import { CAMERA } from './config.js';
import { CAMERA_SPOTS, hasLineOfSight, inVent } from './level.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createCameras() {
  return CAMERA_SPOTS.map((spot) => ({
    x: spot.x,
    y: spot.y,
    baseAngle: spot.baseAngle,
    angle: spot.baseAngle,
    sweepDir: 1,
    disabled: 0,
    suspicion: 0,
  }));
}

/** Is the thief inside this camera's cone right now? */
export function thiefInCameraCone(camera, thief, smokes) {
  if (camera.disabled > 0) return false;
  if (inVent(thief.x, thief.y)) return false;
  for (const s of smokes) {
    const sdx = thief.x - s.x;
    const sdy = thief.y - s.y;
    if (sdx * sdx + sdy * sdy < s.radius * s.radius) return false;
  }
  const dx = thief.x - camera.x;
  const dy = thief.y - camera.y;
  const range = CAMERA.coneRange * (thief.crouch ? 0.7 : 1);
  if (dx * dx + dy * dy > range * range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), camera.angle)) > CAMERA.coneHalfAngle) return false;
  return hasLineOfSight(camera.x, camera.y, thief.x, thief.y);
}

/** One fixed step for one camera. Returns true when its suspicion just hit full. */
export function stepCamera(camera, dt, thief, smokes) {
  if (camera.disabled > 0) {
    camera.disabled = Math.max(0, camera.disabled - dt);
    camera.suspicion = 0;
    return false;
  }
  camera.angle += camera.sweepDir * CAMERA.sweepSpeed * dt;
  if (camera.angle > camera.baseAngle + CAMERA.sweepHalf) {
    camera.angle = camera.baseAngle + CAMERA.sweepHalf;
    camera.sweepDir = -1;
  } else if (camera.angle < camera.baseAngle - CAMERA.sweepHalf) {
    camera.angle = camera.baseAngle - CAMERA.sweepHalf;
    camera.sweepDir = 1;
  }
  const seen = thiefInCameraCone(camera, thief, smokes);
  if (seen) {
    const wasFull = camera.suspicion >= 1;
    camera.suspicion = Math.min(1, camera.suspicion + CAMERA.spotRate * dt);
    return !wasFull && camera.suspicion >= 1;
  }
  camera.suspicion = Math.max(0, camera.suspicion - CAMERA.calmRate * dt);
  return false;
}

/** Kill every camera for the EMP's duration. */
export function empBlast(cameras) {
  for (const camera of cameras) camera.disabled = CAMERA.empDown;
}
