// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, plan, play, paused, caught, escaped.
//
// ?seed=N fixes the guard timing. ?shot=play|plan|grab|escape (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_ESCAPED, PHASE_CAUGHT, PHASE_ESCAPED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_TOOL_DECOY, ACTION_TOOL_EMP, ACTION_TOOL_SMOKE, createInput } from './input.js';
import { createRenderer, PLAN_BUTTONS, SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PAUSED, SCREEN_PLAN, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { buyTool } from './tools.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // A tool pressed this frame, fired once on the next world step and then cleared.
  let pendingTool = null;
  let pendingDecoyX = 0;
  let pendingDecoyY = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startPlan() {
    world.reset();
    screen = SCREEN_PLAN;
    announce('Plan the job. Pick a route, buy tools, then start the heist.');
  }

  function startPlay() {
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing. Steal the Meridian Diamond and escape to the van.');
  }

  function endRun() {
    if (world.state.phase === PHASE_ESCAPED) {
      screen = SCREEN_ESCAPED;
      if (world.state.score.total > best) {
        best = world.state.score.total;
        saveBest(best);
      }
      announce(`Escaped. Total take ${world.state.score.total}.`);
    } else if (world.state.phase === PHASE_CAUGHT) {
      screen = SCREEN_CAUGHT;
      announce('Caught. A guard got you.');
    }
  }

  function inside(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function handlePlanClick(point) {
    const logical = renderer.toLogical(point.x, point.y);
    const state = world.state;
    if (inside(logical, PLAN_BUTTONS.routeHall)) state.route = 'hall';
    else if (inside(logical, PLAN_BUTTONS.routeGallery)) state.route = 'gallery';
    else if (inside(logical, PLAN_BUTTONS.routeVent)) state.route = 'vent';
    else if (inside(logical, PLAN_BUTTONS.buySmoke)) state.credits = buyTool(state.loadout, 'smoke', state.credits);
    else if (inside(logical, PLAN_BUTTONS.buyEmp)) state.credits = buyTool(state.loadout, 'emp', state.credits);
    else if (inside(logical, PLAN_BUTTONS.buyDecoy)) state.credits = buyTool(state.loadout, 'decoy', state.credits);
    else if (inside(logical, PLAN_BUTTONS.start)) startPlay();
  }

  function handleActions(actions, click) {
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startPlan();
      return;
    }
    if (screen === SCREEN_PLAN) {
      if (click) handlePlanClick(click);
      if (actions & ACTION_TOOL_SMOKE) world.state.credits = buyTool(world.state.loadout, 'smoke', world.state.credits);
      if (actions & ACTION_TOOL_EMP) world.state.credits = buyTool(world.state.loadout, 'emp', world.state.credits);
      if (actions & ACTION_TOOL_DECOY) world.state.credits = buyTool(world.state.loadout, 'decoy', world.state.credits);
      // Space or Enter starts; a mouse click on empty space does not.
      if ((actions & ACTION_CONFIRM) && !click) startPlay();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      // Tools arm here and fire once on the next step.
      if (actions & ACTION_TOOL_SMOKE) pendingTool = 'smoke';
      else if (actions & ACTION_TOOL_EMP) pendingTool = 'emp';
      else if (actions & ACTION_TOOL_DECOY) {
        pendingTool = 'decoy';
        const m = input.mouse();
        const logical = renderer.toLogical(m.x, m.y);
        pendingDecoyX = logical.x;
        pendingDecoyY = logical.y;
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
      if (actions & ACTION_CONFIRM) startPlan();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the guards patrol and the cameras sweep behind the title.
      world.step(STEP, { mx: 0, my: 0, crouch: false, tool: null, lockpick: false });
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const dir = input.direction();
    const tool = pendingTool;
    pendingTool = null;
    const events = world.step(STEP, {
      mx: dir.mx,
      my: dir.my,
      crouch: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
      tool,
      decoyX: pendingDecoyX,
      decoyY: pendingDecoyY,
      lockpick: input.isDown('KeyE'),
    });
    if (events & (EVENT_CAUGHT | EVENT_ESCAPED)) endRun();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    const click = input.takeClick();
    handleActions(actions, click);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Vaultbreak, the Meridian Job. Press Space to plan the heist.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
