// input.js — keyboard and mouse input for Moonlit Vault.
// Tracks held keys and mouse clicks; the game reads this each frame.
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    // Last mouse click in canvas coordinates (null until clicked).
    click: null,
    // Set to true by the game when it consumes a click.
    clickConsumed: true,
  };

  function keyName(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    return k;
  }

  window.addEventListener("keydown", (e) => {
    const k = keyName(e);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
      e.preventDefault();
    }
    keys.add(k);
    // Any key press counts as the "start" gesture for overlays.
    state.anyKey = true;
  });
  window.addEventListener("keyup", (e) => keys.delete(keyName(e)));
  window.addEventListener("blur", () => keys.clear());

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.click = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    state.clickConsumed = false;
    state.anyKey = true;
  });
  // Movement vector from WASD / arrow keys, normalised.
  state.moveVector = function moveVector() {
    let x = 0, y = 0;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  };

  state.isSneaking = function isSneaking() {
    return keys.has("shift");
  };

  state.wasPressed = function wasPressed(...names) {
    return names.some((n) => keys.has(n));
  };

  // Consume a pending mouse click and return its position (or null).
  state.takeClick = function takeClick() {
    if (state.click && !state.clickConsumed) {
      state.clickConsumed = true;
      return state.click;
    }
    return null;
  };

  return state;
}
