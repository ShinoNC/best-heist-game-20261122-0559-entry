// The Meridian Gallery: one room, laid out once. Walls, display cases and pillars are
// solid and block sight; the service vent along the bottom is a slow, unseen route; the
// vault holds the Meridian Diamond; three gold bars sit in side cases. Guards patrol
// fixed waypoint loops and cameras sweep from the walls. Nothing here changes at run time.

import { WALL } from './config.js';

/** Solid rectangles the thief and the guards walk around and that block vision cones. */
export const COVER = [
  // Display cases down the left gallery.
  { x: 120, y: 150, w: 110, h: 60, label: 'JADE' },
  { x: 120, y: 320, w: 110, h: 60, label: 'SILK' },
  { x: 120, y: 470, w: 110, h: 60, label: 'BRONZE' },
  // Display cases down the right gallery.
  { x: 1050, y: 150, w: 110, h: 60, label: 'IVORY' },
  { x: 1050, y: 320, w: 110, h: 60, label: 'PEARL' },
  { x: 1050, y: 470, w: 110, h: 60, label: 'OPAL' },
  // Two long benches flanking the carpet.
  { x: 330, y: 300, w: 130, h: 26, label: '' },
  { x: 820, y: 300, w: 130, h: 26, label: '' },
  { x: 330, y: 470, w: 130, h: 26, label: '' },
  { x: 820, y: 470, w: 130, h: 26, label: '' },
];

/** Round pillars, also solid and sight-blocking. */
export const PILLARS = [
  { x: 340, y: 170, r: 24 },
  { x: 940, y: 170, r: 24 },
  { x: 340, y: 580, r: 24 },
  { x: 940, y: 580, r: 24 },
];

/** The service vent: a low corridor along the bottom wall. Slow inside, invisible to cones. */
export const VENT = { x: 60, y: 620, w: 1160, h: 44 };
export const VENT_GRATES = [
  { x: 60, y: 620, w: 44, h: 44 },
  { x: 1176, y: 620, w: 44, h: 44 },
];

/** The vault: a glass case on a plinth at the top centre, holding the Meridian Diamond. */
export const VAULT = { x: 580, y: 66, w: 120, h: 76, caseX: 640, caseY: 104 };

/** The three gold bars in their side cases. */
export const GOLD_SPOTS = [
  { x: 175, y: 350, taken: false },
  { x: 1105, y: 350, taken: false },
  { x: 640, y: 545, taken: false },
];

/** Entry door (thief spawn) and exit door (the getaway van waits outside). */
export const ENTRY = { x: 90, y: 590 };
export const EXIT = { x: 1190, y: 590, w: 46, h: 70 };

/** The red carpet runner from the entry to the vault. */
export const CARPET = { x: 600, y: 142, w: 80, h: 478 };

/** Wall cameras: position, base aim and which way they face. */
export const CAMERA_SPOTS = [
  { x: 60, y: 60, baseAngle: 0.9 },
  { x: 1220, y: 60, baseAngle: Math.PI - 0.9 },
];

/** Guard patrol loops: waypoint lists, walked in order and back. Every segment runs
 * through open floor — no segment crosses a case, a bench, a pillar or the vault, and
 * every waypoint stands at least a guard's radius clear of every solid. */
export const GUARD_PATROLS = [
  // Main hall guard: a wide rectangle through the centre of the room. The left
  // gallery (x < 500) stays outside the loop so the thief has a quiet approach.
  [
    { x: 560, y: 220 },
    { x: 1000, y: 220 },
    { x: 1000, y: 400 },
    { x: 560, y: 400 },
  ],
  // Vault guard: a shallow loop in front of the vault. The case itself is approachable
  // when the guard is on the far edge or walking away.
  [
    { x: 450, y: 230 },
    { x: 830, y: 230 },
    { x: 830, y: 270 },
    { x: 450, y: 270 },
  ],
  // Gallery guard: up and down the clear right-hand lane.
  [
    { x: 1000, y: 180 },
    { x: 1000, y: 560 },
  ],
];

/** The three routes the plan screen offers, as waypoint polylines for the map. */
export const ROUTES = {
  hall: {
    name: 'Main Hall',
    tag: 'Fast · guarded',
    path: [
      { x: 90, y: 590 },
      { x: 320, y: 480 },
      { x: 640, y: 400 },
      { x: 640, y: 170 },
    ],
  },
  gallery: {
    name: 'Side Gallery',
    tag: 'Cameras · medium',
    path: [
      { x: 90, y: 590 },
      { x: 300, y: 590 },
      { x: 980, y: 560 },
      { x: 1000, y: 250 },
      { x: 700, y: 170 },
    ],
  },
  vent: {
    name: 'Service Vent',
    tag: 'Slow · unseen',
    path: [
      { x: 90, y: 590 },
      { x: 90, y: 642 },
      { x: 1190, y: 642 },
      { x: 1190, y: 560 },
      { x: 900, y: 300 },
      { x: 700, y: 170 },
    ],
  },
};

/** True when a point is inside the vent corridor. */
export function inVent(x, y) {
  return x >= VENT.x && x <= VENT.x + VENT.w && y >= VENT.y && y <= VENT.y + VENT.h;
}

/** True when a circle overlaps a solid rectangle or pillar. */
export function hitsSolid(x, y, r) {
  for (const c of COVER) {
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
  }
  for (const p of PILLARS) {
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < (r + p.r) * (r + p.r)) return true;
  }
  if (x + r > VAULT.x && x - r < VAULT.x + VAULT.w && y + r > VAULT.y && y - r < VAULT.y + VAULT.h) return true;
  return false;
}

/** Clamp a point into the walkable room (inside the walls). */
export function clampToRoom(x, y, r) {
  return {
    x: Math.min(WALL.x + WALL.width - r, Math.max(WALL.x + r, x)),
    y: Math.min(WALL.y + WALL.height - r, Math.max(WALL.y + r, y)),
  };
}

/** Move a circle, sliding along solids: try x, then y, keeping the axes that stay clear. */
export function moveCircle(x, y, r, dx, dy) {
  const nextX = clampToRoom(x + dx, y, r);
  if (!hitsSolid(nextX.x, nextX.y, r)) x = nextX.x;
  const nextY = clampToRoom(x, y + dy, r);
  if (!hitsSolid(nextY.x, nextY.y, r)) y = nextY.y;
  return { x, y };
}

/** Does the segment from (x0,y0) to (x1,y1) cross a solid rect or pillar? */
function segmentHitsRect(x0, y0, x1, y1, rx, ry, rw, rh) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x0 < rx || x0 > rx + rw) return false;
  } else {
    let t1 = (rx - x0) / dx;
    let t2 = (rx + rw - x0) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y0 < ry || y0 > ry + rh) return false;
  } else {
    let t1 = (ry - y0) / dy;
    let t2 = (ry + rh - y0) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function segmentHitsCircle(x0, y0, x1, y1, cx, cy, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return false;
  let t = ((cx - x0) * dx + (cy - y0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x0 + t * dx;
  const py = y0 + t * dy;
  const ddx = px - cx;
  const ddy = py - cy;
  return ddx * ddx + ddy * ddy < r * r;
}

/** True when nothing solid stands between two points. */
export function hasLineOfSight(x0, y0, x1, y1) {
  for (const c of COVER) {
    if (segmentHitsRect(x0, y0, x1, y1, c.x, c.y, c.w, c.h)) return false;
  }
  for (const p of PILLARS) {
    if (segmentHitsCircle(x0, y0, x1, y1, p.x, p.y, p.r)) return false;
  }
  if (segmentHitsRect(x0, y0, x1, y1, VAULT.x, VAULT.y, VAULT.w, VAULT.h)) return false;
  return true;
}
