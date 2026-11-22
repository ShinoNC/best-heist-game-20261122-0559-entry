// Drawing: the room, the thief, the guards and their cones, the cameras, the HUD and
// every screen. The logical field is 1280x720; the canvas scales it to the window. All
// text is drawn bold and light on dark panels, so it reads at a glance and at small size.

import { CAMERA, FIELD, FONT, GUARD, LOOT, PALETTE, THIEF, TOOLS, WALL } from './config.js';
import { CAMERA_SPOTS, CARPET, COVER, ENTRY, EXIT, PILLARS, ROUTES, VENT, VENT_GRATES, VAULT } from './level.js';
import { GUARD_ALERT, GUARD_PATROL, GUARD_SPOTTED, GUARD_SUSPICIOUS } from './guards.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAN = 1;
export const SCREEN_PLAY = 2;
export const SCREEN_PAUSED = 3;
export const SCREEN_CAUGHT = 4;
export const SCREEN_ESCAPED = 5;

/** Plan-screen buttons, in logical coordinates, for the main loop to hit-test. */
export const PLAN_BUTTONS = {
  routeHall: { x: 660, y: 150, w: 540, h: 40 },
  routeGallery: { x: 660, y: 200, w: 540, h: 40 },
  routeVent: { x: 660, y: 250, w: 540, h: 40 },
  buySmoke: { x: 1060, y: 330, w: 140, h: 40 },
  buyEmp: { x: 1060, y: 380, w: 140, h: 40 },
  buyDecoy: { x: 1060, y: 430, w: 140, h: 40 },
  start: { x: 440, y: 600, w: 400, h: 60 },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(5, 7, 12, 0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function cone(ctx, x, y, dir, range, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function money(n) {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    offsetX = (w * dpr - FIELD.width * scale) / 2;
    offsetY = (h * dpr - FIELD.height * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  /** Canvas pixels to logical field coordinates (for mouse hit-testing). */
  function toLogical(px, py) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    return { x: (px * dpr - offsetX) / scale, y: (py * dpr - offsetY) / scale };
  }

  function drawFloor() {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(WALL.x, WALL.y, WALL.width, WALL.height);
    // Checkerboard marble, two close tones.
    ctx.fillStyle = PALETTE.floorAlt;
    const tile = 88;
    for (let y = WALL.y; y < WALL.y + WALL.height; y += tile) {
      for (let x = WALL.x; x < WALL.x + WALL.width; x += tile) {
        const col = Math.floor((x - WALL.x) / tile);
        const row = Math.floor((y - WALL.y) / tile);
        if ((col + row) % 2 === 0) ctx.fillRect(x, y, tile, tile);
      }
    }
    // Marble veins.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      const y = WALL.y + 40 + i * 64;
      ctx.beginPath();
      ctx.moveTo(WALL.x + 20, y);
      ctx.bezierCurveTo(WALL.x + 400, y + 18, WALL.x + 800, y - 18, WALL.x + WALL.width - 20, y + 6);
      ctx.stroke();
    }
    // Red carpet runner to the vault.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(CARPET.x, CARPET.y, CARPET.w, CARPET.h);
    ctx.fillStyle = PALETTE.carpetEdge;
    ctx.fillRect(CARPET.x, CARPET.y, 4, CARPET.h);
    ctx.fillRect(CARPET.x + CARPET.w - 4, CARPET.y, 4, CARPET.h);
    // Service vent along the bottom.
    ctx.fillStyle = PALETTE.vent;
    ctx.fillRect(VENT.x, VENT.y, VENT.w, VENT.h);
    ctx.fillStyle = PALETTE.ventEdge;
    ctx.fillRect(VENT.x, VENT.y, VENT.w, 3);
    ctx.fillRect(VENT.x, VENT.y + VENT.h - 3, VENT.w, 3);
    for (const g of VENT_GRATES) {
      ctx.fillStyle = '#3a3f52';
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = '#5a6178';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(g.x + 6, g.y + 8 + i * 10);
        ctx.lineTo(g.x + g.w - 6, g.y + 8 + i * 10);
        ctx.stroke();
      }
    }
    text(ctx, 'SERVICE VENT', VENT.x + VENT.w / 2, VENT.y + VENT.h / 2, 13, PALETTE.muted, 'center', 700);
    // Walls.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, WALL.y);
    ctx.fillRect(0, WALL.y + WALL.height, FIELD.width, FIELD.height - WALL.y - WALL.height);
    ctx.fillRect(0, WALL.y, WALL.x, WALL.height);
    ctx.fillRect(WALL.x + WALL.width, WALL.y, FIELD.width - WALL.x - WALL.width, WALL.height);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, WALL.y - 4, FIELD.width, 4);
    // Entry and exit doors.
    ctx.fillStyle = '#1d2436';
    ctx.fillRect(ENTRY.x - 30, WALL.y + WALL.height - 4, 60, 8);
    ctx.fillStyle = PALETTE.ok;
    roundRect(ctx, EXIT.x - 8, EXIT.y - 8, EXIT.w + 16, 22, 4);
    ctx.fill();
    text(ctx, 'EXIT', EXIT.x + EXIT.w / 2, EXIT.y + 3, 13, '#0b0e17', 'center', 800);
    // The getaway van, parked outside the exit.
    ctx.fillStyle = '#232a3d';
    roundRect(ctx, EXIT.x + EXIT.w + 14, EXIT.y + 6, 66, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#31405e';
    ctx.fillRect(EXIT.x + EXIT.w + 14, EXIT.y + 6, 66, 16);
    ctx.fillStyle = '#0b0e17';
    ctx.beginPath();
    ctx.arc(EXIT.x + EXIT.w + 28, EXIT.y + 52, 8, 0, Math.PI * 2);
    ctx.arc(EXIT.x + EXIT.w + 66, EXIT.y + 52, 8, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'VAN', EXIT.x + EXIT.w + 47, EXIT.y + 33, 11, PALETTE.muted, 'center', 800);
  }

  function drawCases() {
    for (const c of COVER) {
      ctx.fillStyle = PALETTE.caseFrame;
      ctx.fillRect(c.x - 3, c.y - 3, c.w + 6, c.h + 6);
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      if (c.label) text(ctx, c.label, c.x + c.w / 2, c.y + c.h / 2, 12, 'rgba(230, 238, 250, 0.75)', 'center', 700);
    }
    for (const p of PILLARS) {
      const grad = ctx.createRadialGradient(p.x - 6, p.y - 8, 4, p.x, p.y, p.r + 4);
      grad.addColorStop(0, PALETTE.pillarTop);
      grad.addColorStop(1, PALETTE.pillar);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawVault(state) {
    // Plinth + glass case.
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(VAULT.x - 8, VAULT.y + VAULT.h - 12, VAULT.w + 16, 20);
    ctx.fillStyle = PALETTE.caseFrame;
    ctx.fillRect(VAULT.x - 3, VAULT.y - 3, VAULT.w + 6, VAULT.h + 6);
    ctx.fillStyle = state.vaultOpen ? 'rgba(140, 200, 255, 0.05)' : PALETTE.caseGlass;
    ctx.fillRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    if (!state.diamondTaken) {
      // The Meridian Diamond: bright, glowing, unmistakable.
      const glow = ctx.createRadialGradient(VAULT.caseX, VAULT.caseY, 2, VAULT.caseX, VAULT.caseY, 46);
      glow.addColorStop(0, 'rgba(174, 243, 255, 0.55)');
      glow.addColorStop(1, 'rgba(174, 243, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(VAULT.caseX, VAULT.caseY, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.moveTo(VAULT.caseX, VAULT.caseY - 16);
      ctx.lineTo(VAULT.caseX + 13, VAULT.caseY - 4);
      ctx.lineTo(VAULT.caseX, VAULT.caseY + 16);
      ctx.lineTo(VAULT.caseX - 13, VAULT.caseY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(VAULT.caseX, VAULT.caseY - 16);
      ctx.lineTo(VAULT.caseX + 13, VAULT.caseY - 4);
      ctx.lineTo(VAULT.caseX - 13, VAULT.caseY - 4);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, state.vaultOpen ? 'VAULT OPEN' : 'MERIDIAN DIAMOND', VAULT.x + VAULT.w + 10, VAULT.y + 30, 13, PALETTE.accent, 'left', 800);
    // Gold bars in their cases.
    for (const spot of state.goldSpots) {
      if (spot.taken) continue;
      const glow = ctx.createRadialGradient(spot.x, spot.y, 2, spot.x, spot.y, 26);
      glow.addColorStop(0, 'rgba(242, 201, 76, 0.4)');
      glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(spot.x, spot.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      roundRect(ctx, spot.x - 12, spot.y - 7, 24, 14, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(spot.x - 9, spot.y - 5, 18, 3);
    }
  }

  function drawCones(state) {
    for (const camera of state.cameras) {
      if (camera.disabled > 0) continue;
      const hot = camera.suspicion > 0.5;
      cone(ctx, camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle,
        hot ? PALETTE.coneHot : PALETTE.cameraCone, hot ? PALETTE.coneHotEdge : PALETTE.cameraConeEdge);
    }
    for (const guard of state.guards) {
      const hot = guard.state === GUARD_SPOTTED || guard.state === GUARD_ALERT || guard.suspicion > 0.5;
      cone(ctx, guard.x, guard.y, guard.dir, GUARD.coneRange, GUARD.coneHalfAngle,
        hot ? PALETTE.coneHot : PALETTE.cone, hot ? PALETTE.coneHotEdge : PALETTE.coneEdge);
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      // Body.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 10, 15, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GUARD_ALERT === guard.state || GUARD_SPOTTED === guard.state ? '#7a2b2b' : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Cap + facing tick.
      ctx.fillStyle = PALETTE.guardCap;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eef1f5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.dir) * 18, guard.y + Math.sin(guard.dir) * 18);
      ctx.stroke();
      // Suspicion arc + marks.
      if (guard.suspicion > 0.05 && guard.state !== GUARD_ALERT) {
        ctx.strokeStyle = guard.suspicion > 0.5 ? PALETTE.danger : PALETTE.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
        ctx.stroke();
      }
      if (guard.state === GUARD_SPOTTED) text(ctx, '!', guard.x, guard.y - 30, 26, PALETTE.danger, 'center', 900);
      else if (guard.state === GUARD_SUSPICIOUS) text(ctx, '?', guard.x, guard.y - 28, 22, PALETTE.accent, 'center', 900);
      else if (guard.state === GUARD_ALERT) text(ctx, '!', guard.x, guard.y - 30, 26, PALETTE.danger, 'center', 900);
    }
  }

  function drawCameras(state) {
    for (let i = 0; i < state.cameras.length; i += 1) {
      const camera = state.cameras[i];
      const spot = CAMERA_SPOTS[i];
      ctx.fillStyle = '#1d2436';
      roundRect(ctx, camera.x - 12, camera.y - 10, 24, 20, 4);
      ctx.fill();
      ctx.fillStyle = camera.disabled > 0 ? PALETTE.cameraOff : (camera.suspicion > 0.5 ? PALETTE.danger : '#7fd4ff');
      ctx.beginPath();
      ctx.arc(camera.x + Math.cos(camera.angle) * 8, camera.y + Math.sin(camera.angle) * 8, 5, 0, Math.PI * 2);
      ctx.fill();
      if (camera.disabled > 0) {
        text(ctx, 'OFF', camera.x, camera.y + 24, 11, PALETTE.muted, 'center', 800);
      } else if (camera.suspicion > 0.05) {
        ctx.strokeStyle = camera.suspicion > 0.5 ? PALETTE.danger : PALETTE.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(camera.x, camera.y, 16, -Math.PI / 2, -Math.PI / 2 + camera.suspicion * Math.PI * 2);
        ctx.stroke();
      }
      void spot;
    }
  }

  function drawThief(state) {
    const t = state.thief;
    const inVentNow = t.y > 620 && t.y < 664;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + 10, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = t.crouch || inVentNow ? 0.75 : 1;
    ctx.fillStyle = PALETTE.thiefDark;
    ctx.beginPath();
    ctx.arc(t.x, t.y, THIEF.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.thief;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Hood + eyes.
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0e17';
    ctx.beginPath();
    ctx.arc(t.x - 3, t.y - 3, 1.8, 0, Math.PI * 2);
    ctx.arc(t.x + 3, t.y - 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Lockpick progress ring.
    if (t.lockpicking) {
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, THIEF.radius + 8, -Math.PI / 2, -Math.PI / 2 + t.lockpick * Math.PI * 2);
      ctx.stroke();
      text(ctx, 'PICKING…', t.x, t.y - 30, 12, PALETTE.accent, 'center', 800);
    } else if (t.lockpick > 0 && t.lockpick < 1 && !state.vaultOpen) {
      text(ctx, `LOCK ${Math.round(t.lockpick * 100)}%`, t.x, t.y - 30, 12, PALETTE.muted, 'center', 800);
    }
    // Diamond carried.
    if (t.hasDiamond) {
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.moveTo(t.x + 14, t.y - 14);
      ctx.lineTo(t.x + 20, t.y - 8);
      ctx.lineTo(t.x + 14, t.y - 2);
      ctx.lineTo(t.x + 8, t.y - 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawEffects(state) {
    for (const s of state.smokes) {
      const alpha = Math.min(1, s.t / 1.5) * 0.55;
      ctx.fillStyle = `rgba(180, 185, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220, 224, 232, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(s.x - 20, s.y - 12, s.radius * 0.5, 0, Math.PI * 2);
      ctx.arc(s.x + 24, s.y + 10, s.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const d of state.decoys) {
      const pulse = 1 + Math.sin(d.t * 10) * 0.15;
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 14 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.accent;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 5, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '!', d.x, d.y - 22, 16, PALETTE.accent, 'center', 900);
    }
  }

  function drawRoom(state) {
    drawFloor();
    drawCases();
    drawVault(state);
    drawCones(state);
    drawCameras(state);
    drawGuards(state);
    drawThief(state);
    drawEffects(state);
  }

  function alarmColor(value) {
    if (value < 40) return PALETTE.alarmLow;
    if (value < 75) return PALETTE.alarmMid;
    return PALETTE.alarmHigh;
  }

  function drawHud(state) {
    // Top bar.
    ctx.fillStyle = 'rgba(10, 13, 22, 0.88)';
    ctx.fillRect(0, 0, FIELD.width, 52);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 52, FIELD.width, 2);
    // Loot.
    const lootValue = (state.diamondTaken ? LOOT.diamondValue : 0) + state.thief.gold * LOOT.goldValue;
    text(ctx, 'LOOT', 24, 18, 12, PALETTE.muted, 'left', 800);
    text(ctx, money(lootValue), 24, 38, 20, PALETTE.text, 'left', 800);
    if (state.diamondTaken) {
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.moveTo(190, 18);
      ctx.lineTo(197, 26);
      ctx.lineTo(190, 34);
      ctx.lineTo(183, 26);
      ctx.closePath();
      ctx.fill();
    }
    text(ctx, `GOLD ${state.thief.gold}/3`, 210, 26, 14, PALETTE.gold, 'left', 800);
    // Alarm meter, centre.
    text(ctx, 'ALARM', 640, 16, 12, PALETTE.muted, 'center', 800);
    const barX = 490;
    const barW = 300;
    ctx.fillStyle = '#232a3d';
    roundRect(ctx, barX, 26, barW, 16, 8);
    ctx.fill();
    ctx.fillStyle = alarmColor(state.alarm);
    if (state.alarm > 0) {
      roundRect(ctx, barX, 26, Math.max(16, (barW * state.alarm) / 100), 16, 8);
      ctx.fill();
    }
    text(ctx, `${Math.round(state.alarm)}%`, 640, 34, 13, '#0b0e17', 'center', 900);
    if (state.lockdown > 0) {
      text(ctx, `LOCKDOWN ${Math.ceil(state.lockdown)}s`, 640, 48, 11, PALETTE.danger, 'center', 800);
    }
    // Time + credits, right.
    text(ctx, clock(state.time), 1256, 20, 18, PALETTE.text, 'right', 800);
    text(ctx, `CREDITS ${state.credits}`, 1256, 40, 13, PALETTE.accent, 'right', 800);
    // Tool belt, bottom-left.
    const tools = [
      { key: '1', name: 'SMOKE', count: state.loadout.smoke },
      { key: '2', name: 'EMP', count: state.loadout.emp },
      { key: '3', name: 'DECOY', count: state.loadout.decoy },
    ];
    let bx = 24;
    for (const tool of tools) {
      ctx.fillStyle = tool.count > 0 ? PALETTE.panel : 'rgba(20, 24, 40, 0.5)';
      roundRect(ctx, bx, 664, 110, 44, 8);
      ctx.fill();
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, `[${tool.key}]`, bx + 10, 678, 12, PALETTE.muted, 'left', 800);
      text(ctx, tool.name, bx + 10, 696, 13, tool.count > 0 ? PALETTE.text : PALETTE.muted, 'left', 800);
      text(ctx, `x${tool.count}`, bx + 100, 686, 16, tool.count > 0 ? PALETTE.accent : PALETTE.muted, 'right', 800);
      bx += 120;
    }
    text(ctx, '[E] PICK LOCK  ·  [SHIFT] CROUCH', 24, 646, 12, PALETTE.muted, 'left', 700);
    // Objective, bottom-right.
    const objective = state.diamondTaken ? 'ESCAPE TO THE VAN →' : 'STEAL THE MERIDIAN DIAMOND';
    text(ctx, objective, 1256, 686, 15, state.diamondTaken ? PALETTE.ok : PALETTE.accent, 'right', 800);
    // Message line.
    if (state.messageTimer > 0 && state.message) {
      text(ctx, state.message, 640, 620, 15, PALETTE.text, 'center', 700);
    }
    // Spotted flash.
    if (state.spottedFlash > 0) {
      ctx.strokeStyle = `rgba(229, 83, 75, ${Math.min(1, state.spottedFlash * 2)})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
      text(ctx, 'SPOTTED!', 640, 110, 30, PALETTE.danger, 'center', 900);
    }
  }

  function drawTitle(state, best) {
    drawRoom(state);
    ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'VAULTBREAK', 640, 200, 84, PALETTE.text, 'center', 900);
    text(ctx, 'THE MERIDIAN JOB', 640, 262, 26, PALETTE.accent, 'center', 800);
    text(ctx, 'One room. Three guards. Two cameras. One diamond.', 640, 320, 18, PALETTE.muted, 'center', 600);
    text(ctx, 'WASD move  ·  SHIFT crouch  ·  E pick lock  ·  1/2/3 tools  ·  Click to throw a decoy', 640, 400, 16, PALETTE.text, 'center', 600);
    text(ctx, 'Read the cones. Spend your credits. Get out rich.', 640, 432, 16, PALETTE.text, 'center', 600);
    ctx.fillStyle = PALETTE.accent;
    roundRect(ctx, 440, 480, 400, 56, 10);
    ctx.fill();
    text(ctx, 'PRESS SPACE — PLAN THE HEIST', 640, 508, 18, '#0b0e17', 'center', 900);
    if (best > 0) text(ctx, `BEST TAKE ${money(best)}`, 640, 580, 16, PALETTE.muted, 'center', 700);
  }

  function drawMiniMap(state) {
    const mx = 80;
    const my = 150;
    const mw = 520;
    const mh = 290;
    const sx = mw / FIELD.width;
    const sy = mh / FIELD.height;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, mx - 10, my - 10, mw + 20, mh + 20, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = PALETTE.vent;
    ctx.fillRect(mx + VENT.x * sx, my + VENT.y * sy, VENT.w * sx, VENT.h * sy);
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(mx + CARPET.x * sx, my + CARPET.y * sy, CARPET.w * sx, CARPET.h * sy);
    for (const c of COVER) {
      ctx.fillStyle = PALETTE.caseFrame;
      ctx.fillRect(mx + c.x * sx, my + c.y * sy, c.w * sx, c.h * sy);
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(mx + VAULT.x * sx, my + VAULT.y * sy, VAULT.w * sx, VAULT.h * sy);
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.arc(mx + VAULT.caseX * sx, my + VAULT.caseY * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ok;
    ctx.fillRect(mx + EXIT.x * sx, my + EXIT.y * sy, EXIT.w * sx, EXIT.h * sy);
    // The three routes, the chosen one bright.
    const routeColors = { hall: '#f2c94c', gallery: '#7fd4ff', vent: '#4caf7d' };
    for (const key of Object.keys(ROUTES)) {
      const route = ROUTES[key];
      ctx.strokeStyle = routeColors[key];
      ctx.globalAlpha = key === state.route ? 1 : 0.35;
      ctx.lineWidth = key === state.route ? 3 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      route.path.forEach((p, i) => {
        if (i === 0) ctx.moveTo(mx + p.x * sx, my + p.y * sy);
        else ctx.lineTo(mx + p.x * sx, my + p.y * sy);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // Thief spawn.
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(mx + ENTRY.x * sx, my + ENTRY.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    text(ctx, 'THE MERIDIAN GALLERY', mx + mw / 2, my + mh + 28, 13, PALETTE.muted, 'center', 800);
  }

  function drawPlan(state) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PLAN THE JOB', 640, 60, 40, PALETTE.text, 'center', 900);
    text(ctx, `CREDITS ${state.credits} — tools cost credits, gold bars pay them back`, 640, 100, 16, PALETTE.accent, 'center', 700);
    drawMiniMap(state);
    // Route cards.
    text(ctx, 'ROUTE IN', 660, 132, 14, PALETTE.muted, 'left', 800);
    const routeKeys = ['hall', 'gallery', 'vent'];
    const routeButtons = [PLAN_BUTTONS.routeHall, PLAN_BUTTONS.routeGallery, PLAN_BUTTONS.routeVent];
    routeKeys.forEach((key, i) => {
      const b = routeButtons[i];
      const selected = state.route === key;
      ctx.fillStyle = selected ? '#2a2410' : PALETTE.panel;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.strokeStyle = selected ? PALETTE.accent : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2.5 : 1.5;
      ctx.stroke();
      text(ctx, ROUTES[key].name.toUpperCase(), b.x + 16, b.y + b.h / 2, 16, selected ? PALETTE.accent : PALETTE.text, 'left', 800);
      text(ctx, ROUTES[key].tag, b.x + b.w - 16, b.y + b.h / 2, 13, PALETTE.muted, 'right', 700);
    });
    // Tool cards.
    text(ctx, 'TOOLS', 660, 312, 14, PALETTE.muted, 'left', 800);
    const toolKeys = ['smoke', 'emp', 'decoy'];
    const toolButtons = [PLAN_BUTTONS.buySmoke, PLAN_BUTTONS.buyEmp, PLAN_BUTTONS.buyDecoy];
    const toolHints = { smoke: 'Blocks cones for 5s', emp: 'Cameras down 12s', decoy: 'Pulls guards away' };
    toolKeys.forEach((key, i) => {
      const b = toolButtons[i];
      const y = b.y;
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, 660, y, 540, 40, 8);
      ctx.fill();
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, `${TOOLS[key].name.toUpperCase()}  x${state.loadout[key]}`, 676, y + 20, 15, PALETTE.text, 'left', 800);
      text(ctx, toolHints[key], 880, y + 20, 12, PALETTE.muted, 'left', 600);
      const afford = state.credits >= TOOLS[key].cost;
      ctx.fillStyle = afford ? PALETTE.accent : '#3a3f52';
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      text(ctx, `BUY ${TOOLS[key].cost}cr`, b.x + b.w / 2, b.y + b.h / 2, 14, afford ? '#0b0e17' : PALETTE.muted, 'center', 900);
    });
    // Start button.
    const s = PLAN_BUTTONS.start;
    ctx.fillStyle = PALETTE.accent;
    roundRect(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    text(ctx, 'START THE HEIST', s.x + s.w / 2, s.y + s.h / 2, 22, '#0b0e17', 'center', 900);
    text(ctx, 'Click a route or a BUY button · 1/2/3 buys tools · SPACE starts', 640, 690, 13, PALETTE.muted, 'center', 600);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(5, 7, 12, 0.7)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', 640, 320, 48, PALETTE.text, 'center', 900);
    text(ctx, 'ESC or P to resume', 640, 380, 18, PALETTE.muted, 'center', 600);
  }

  function drawCaught(state) {
    drawRoom(state);
    ctx.fillStyle = 'rgba(20, 5, 8, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'BUSTED', 640, 240, 72, PALETTE.danger, 'center', 900);
    text(ctx, 'A guard caught you in the gallery.', 640, 310, 20, PALETTE.text, 'center', 600);
    const lootValue = (state.diamondTaken ? LOOT.diamondValue : 0) + state.thief.gold * LOOT.goldValue;
    text(ctx, `Loot dropped: ${money(lootValue)}  ·  Time ${clock(state.time)}  ·  Max alarm ${Math.round(state.maxAlarm)}%`, 640, 360, 16, PALETTE.muted, 'center', 600);
    text(ctx, 'The cones were readable — next time, wait for the sweep.', 640, 400, 16, PALETTE.muted, 'center', 600);
    text(ctx, 'PRESS SPACE TO TRY AGAIN', 640, 480, 20, PALETTE.accent, 'center', 800);
  }

  function drawEscaped(state, best) {
    drawRoom(state);
    ctx.fillStyle = 'rgba(5, 12, 8, 0.8)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const score = state.score;
    text(ctx, score.ghost ? 'GHOST RUN' : 'CLEAN GETAWAY', 640, 170, 64, PALETTE.gold, 'center', 900);
    text(ctx, score.ghost ? 'Nobody ever knew you were there.' : 'The van pulls away into the night.', 640, 230, 18, PALETTE.text, 'center', 600);
    const rows = [
      ['Loot', money(score.loot), PALETTE.text],
      ['Getaway bonus', score.bonus > 0 ? `+${money(score.bonus)}` : '$0', PALETTE.ok],
      ['Time penalty', score.timePenalty > 0 ? `−${money(score.timePenalty)}` : '$0', PALETTE.danger],
      ['Alarm penalty', score.alarmPenalty > 0 ? `−${money(score.alarmPenalty)}` : '$0', PALETTE.danger],
    ];
    let y = 300;
    for (const [label, value, color] of rows) {
      text(ctx, label, 440, y, 18, PALETTE.muted, 'left', 700);
      text(ctx, value, 840, y, 18, color, 'right', 800);
      y += 40;
    }
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(440, y - 8, 400, 2);
    text(ctx, 'TOTAL TAKE', 440, y + 24, 22, PALETTE.text, 'left', 900);
    text(ctx, money(score.total), 840, y + 24, 26, PALETTE.gold, 'right', 900);
    text(ctx, `BEST ${money(Math.max(best, score.total))}  ·  TIME ${clock(state.time)}  ·  MAX ALARM ${Math.round(state.maxAlarm)}%`, 640, y + 80, 15, PALETTE.muted, 'center', 700);
    text(ctx, 'PRESS SPACE TO RUN IT AGAIN', 640, y + 130, 18, PALETTE.accent, 'center', 800);
  }

  function draw(state, screen, best) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PLAN) drawPlan(state);
    else if (screen === SCREEN_PLAY) {
      drawRoom(state);
      drawHud(state);
    } else if (screen === SCREEN_PAUSED) {
      drawRoom(state);
      drawHud(state);
      drawPaused();
    } else if (screen === SCREEN_CAUGHT) drawCaught(state);
    else if (screen === SCREEN_ESCAPED) drawEscaped(state, best);
  }

  return { draw, toLogical, resize };
}
