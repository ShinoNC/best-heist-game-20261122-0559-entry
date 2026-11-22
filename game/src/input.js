// Keyboard and mouse: WASD or arrows to move, Shift to crouch, E to pick the vault,
// 1/2/3 to use tools, mouse click to aim a decoy, Esc or P to pause, Space/Enter to
// confirm. The input is read every frame; actions are consumed once by takeActions().

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_TOOL_SMOKE = 4;
export const ACTION_TOOL_EMP = 8;
export const ACTION_TOOL_DECOY = 16;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let click = null;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    if (event.code === 'Digit1') actions |= ACTION_TOOL_SMOKE;
    if (event.code === 'Digit2') actions |= ACTION_TOOL_EMP;
    if (event.code === 'Digit3') actions |= ACTION_TOOL_DECOY;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function onMouseDown(event) {
    onMouseMove(event);
    mouseDown = true;
    if (event.button === 0) {
      actions |= ACTION_CONFIRM;
      click = { x: mouseX, y: mouseY };
    }
  }

  function onMouseUp() {
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  /** The move direction this frame: mx, my in -1..1. */
  function direction() {
    let mx = 0;
    let my = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    return { mx, my };
  }

  /** Actions pressed since the last call, then cleared. */
  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  /** The last mouse click's canvas position since the last call, then cleared. */
  function takeClick() {
    const taken = click;
    click = null;
    return taken;
  }

  function isDown(code) {
    return keys.has(code);
  }

  /** Mouse position in canvas pixels, and whether the button is held. */
  function mouse() {
    return { x: mouseX, y: mouseY, down: mouseDown };
  }

  return { direction, takeActions, takeClick, isDown, mouse };
}
