// The thief's tools, bought with credits on the plan screen and spent in the room.
// Smoke blocks every cone inside its cloud; EMP kills the cameras; a decoy noisemaker
// pulls nearby guards off their patrol to investigate the spot it lands on.

import { TOOLS } from './config.js';

/** A fresh loadout: counts of each tool the thief carries. */
export function createLoadout() {
  return { smoke: 0, emp: 0, decoy: 0 };
}

/** Can the thief afford one more of this tool with these credits? */
export function canAfford(tool, credits) {
  return credits >= TOOLS[tool].cost;
}

/** Buy one of a tool: returns the new credit balance, or the old one if unaffordable. */
export function buyTool(loadout, tool, credits) {
  if (!canAfford(tool, credits)) return credits;
  loadout[tool] += 1;
  return credits - TOOLS[tool].cost;
}

/** Drop a smoke cloud at the thief's feet. Returns true when one was spent. */
export function useSmoke(loadout, smokes, thief) {
  if (loadout.smoke <= 0) return false;
  loadout.smoke -= 1;
  smokes.push({ x: thief.x, y: thief.y, radius: TOOLS.smoke.radius, t: TOOLS.smoke.seconds });
  return true;
}

/** Fire the EMP. Returns true when one was spent. */
export function useEmp(loadout) {
  if (loadout.emp <= 0) return false;
  loadout.emp -= 1;
  return true;
}

/** Throw a decoy to a point. Returns true when one was spent. */
export function useDecoy(loadout, decoys, x, y) {
  if (loadout.decoy <= 0) return false;
  loadout.decoy -= 1;
  decoys.push({ x, y, t: TOOLS.decoy.seconds });
  return true;
}

/** Age smoke clouds and decoys by one step, dropping the spent ones. */
export function stepTools(dt, smokes, decoys) {
  for (let i = smokes.length - 1; i >= 0; i -= 1) {
    smokes[i].t -= dt;
    if (smokes[i].t <= 0) smokes.splice(i, 1);
  }
  for (let i = decoys.length - 1; i >= 0; i -= 1) {
    decoys[i].t -= dt;
    if (decoys[i].t <= 0) decoys.splice(i, 1);
  }
}
