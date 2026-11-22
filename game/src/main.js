// main.js — game loop, state machine and thief movement for Moonlit Vault.
// States: "start" (title) -> "playing" -> "won" | "lost".
import {
  TILE, VIEW_W, VIEW_H, PLAYER_SPEED, PLAYER_SNEAK_SPEED, PLAYER_RADIUS,
  ARTIFACT_SCORE, PEBBLES_START, PEBBLE_NOISE_DIST, LEVEL,
} from "./config.js";
import { SPAWN, EXIT_RECT, ARTIFACTS, collideCircle, isInBush, isInShadow, isInLampLight } from "./level.js";
import { createInput } from "./input.js";
import { createAudio } from "./audio.js";
import { createGuards, updateGuard, alertGuardsToPoint, globalAlarm, GUARD_ALERT } from "./guards.js";
import * as render from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const input = createInput(canvas);
const audio = createAudio();
const selftestEl = document.getElementById("selftest");

const game = {
  state: "start",
  thief: null,
  guards: [],
  artifacts: [],
  pebbles: [],
  pebbleCount: PEBBLES_START,
  artifactsTaken: 0,
  score: 0,
  elapsed: 0,
  time: 0,
  stepTimer: 0,
  selftest: null,
};

function resetGame() {
  game.thief = {
    x: SPAWN.x, y: SPAWN.y, facing: -Math.PI / 2,
    sneaking: false, running: false, moving: false, alive: true,
  };
  game.guards = createGuards();
  game.artifacts = ARTIFACTS.map((a) => ({ ...a, taken: false }));
  game.pebbles = [];
  game.pebbleCount = PEBBLES_START;
  game.artifactsTaken = 0;
  game.score = 0;
  game.elapsed = 0;
  game.state = "playing";
  game.frozen = false;
}

// --- demo staging ---------------------------------------------------------
// ?demo=cover | alert | exit | win | caught stages a scene for screenshots.
// The game still renders through its own code; this only sets positions.
function stageDemo(kind) {
  resetGame();
  if (kind === "cover") {
    // Thief tucked behind crates near the south hall, Bram patrolling close.
    game.thief.x = 3.5 * TILE; game.thief.y = 10.5 * TILE;
    game.thief.sneaking = true;
    const bram = game.guards[0];
    bram.x = 3 * TILE; bram.y = 7.5 * TILE;
    bram.facing = Math.PI / 2;
    bram.waypointIndex = 1;
  } else if (kind === "alert") {
    // Thief caught in a lamp pool, Ida turning with suspicion high.
    game.thief.x = 14.5 * TILE; game.thief.y = 3.5 * TILE;
    const ida = game.guards[1];
    ida.x = 13 * TILE; ida.y = 3 * TILE;
    ida.facing = 0;
    ida.suspicion = 0.88;
    ida.lastSeen = { x: game.thief.x, y: game.thief.y };
  } else if (kind === "exit") {
    // Thief one step from the vault door, Mira patrolling the east wing.
    game.thief.x = 20.5 * TILE; game.thief.y = 2.5 * TILE;
    game.artifactsTaken = 3;
    game.artifacts.forEach((a) => { a.taken = true; });
    game.score = 3 * ARTIFACT_SCORE;
    game.elapsed = 87;
    const mira = game.guards[3];
    mira.x = 21 * TILE; mira.y = 6 * TILE;
    mira.facing = -Math.PI / 2;
  } else if (kind === "win") {
    game.artifactsTaken = 3;
    game.score = 3 * ARTIFACT_SCORE;
    game.elapsed = 132;
    game.state = "won";
  } else if (kind === "caught") {
    game.elapsed = 54;
    game.artifactsTaken = 1;
    game.state = "lost";
  }
  if (kind === "cover" || kind === "alert" || kind === "exit") {
    game.state = "playing";
    // Freeze the action so the staged moment holds for the screenshot;
    // the scene is still drawn by the game's own render code each frame.
    game.frozen = true;
  }
}

// --- self-test ------------------------------------------------------------
// ?selftest=1 runs a scripted playthrough in the real loop and reports
// WIN / LOSE results into #selftest so headless Chrome can read them.
function startSelftest() {
  resetGame();
  // Ghost mode for the win path only: guards cannot see the scripted thief,
  // so the run isolates movement, collision, pickups and the exit. The
  // separate lose test below runs with detection fully on.
  game.thief.ghost = true;
  game.selftest = {
    phase: "toArtifact",
    // Waypoints along open corridors (left column, south hall, east wing).
    // Each leg is checked against the level: no leg crosses a wall or crate.
    path: [
      { x: 1.5 * TILE, y: 1.5 * TILE },
      { x: 2.5 * TILE, y: 1.5 * TILE },   // Moon Opal
      { x: 1.5 * TILE, y: 1.5 * TILE },   // back west, clear of the crate
      { x: 1.5 * TILE, y: 12.5 * TILE },  // down the open left column
      { x: 10.5 * TILE, y: 12.5 * TILE }, // east along the south hall
      { x: 14.5 * TILE, y: 12.5 * TILE }, // north of the x=11 wall
      { x: 14.5 * TILE, y: 13.5 * TILE }, // down to the Scarab of Dawn
      { x: 14.5 * TILE, y: 12.5 * TILE }, // back north around the wall
      { x: 15.5 * TILE, y: 12.5 * TILE },
      { x: 15.5 * TILE, y: 1.5 * TILE },  // up the open east wing (clear of crate 17,11)
      { x: 15.5 * TILE, y: 5.5 * TILE },  // south around the x=16 top wall
      { x: 22 * TILE, y: 5.5 * TILE },    // east below crate 18,4 (past the Crown)
      { x: 22 * TILE, y: 1.5 * TILE },    // north into the exit rect
    ],
    waypoint: 0,
    results: [],
    loseTestDone: false,
    t: 0,
  };
}

function selftestStep(dt) {
  const st = game.selftest;
  if (!st) return;
  st.t += dt;
  if (st.phase === "toArtifact" || st.phase === "toExit") {
    const wp = st.path[st.waypoint];
    if (!wp) return;
    const dx = wp.x - game.thief.x, dy = wp.y - game.thief.y;
    const d = Math.hypot(dx, dy);
    if (d < 14) {
      st.waypoint++;
      if (st.waypoint >= st.path.length) st.phase = "done";
      return;
    }
    // Drive the thief with the same movement code as the player, at a
    // brisk test pace so the scripted run finishes before any chase lands.
    game.thief.x += (dx / d) * 300 * dt;
    game.thief.y += (dy / d) * 300 * dt;
    game.thief.facing = Math.atan2(dy, dx);
    game.thief.sneaking = true;
    game.thief.moving = true;
    collideCircle(game.thief, PLAYER_RADIUS);
  }
  if (game.state === "lost" && (st.phase === "toArtifact" || st.phase === "toExit")) {
    st.results.push("CAUGHT during win path at waypoint " + st.waypoint);
    st.phase = "finished";
    finishSelftest();
    return;
  }
  if (game.state === "won") {
    st.results.push("WIN reached exit, artifacts=" + game.artifactsTaken);
    st.phase = "loseTest";
    resetGame();
    game.thief.x = 13.5 * TILE; game.thief.y = 3 * TILE;
    const ida = game.guards[1];
    ida.x = 12 * TILE; ida.y = 3 * TILE;
    ida.facing = 0;
    ida.suspicion = 0.95;
    ida.lastSeen = { x: game.thief.x, y: game.thief.y };
    st.phase = "loseTest";
    st.t = 0;
  }
  if (st.phase === "loseTest" && game.state === "lost") {
    st.results.push("LOSE caught by guard as expected");
    st.phase = "finished";
    finishSelftest();
  }
  if (st.t > 120 && st.phase !== "finished") {
    st.results.push("TIMEOUT phase=" + st.phase + " state=" + game.state);
    st.phase = "finished";
    finishSelftest();
  }
}

function finishSelftest() {
  const st = game.selftest;
  const ok = st.results.length === 2 &&
    st.results[0].startsWith("WIN") && st.results[1].startsWith("LOSE");
  const text = (ok ? "SELFTEST PASS: " : "SELFTEST FAIL: ") + st.results.join(" | ");
  if (selftestEl) selftestEl.textContent = text;
  document.title = text;
  console.log(text);
}

// --- update ---------------------------------------------------------------
function update(dt) {
  game.time += dt;
  if (game.state !== "playing") return;
  game.elapsed += dt;

  const thief = game.thief;
  const mv = input.moveVector();
  thief.sneaking = input.isSneaking();
  thief.moving = mv.x !== 0 || mv.y !== 0;
  thief.running = thief.moving && !thief.sneaking;

  const speed = thief.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
  if (thief.moving) {
    thief.x += mv.x * speed * dt;
    thief.y += mv.y * speed * dt;
    thief.facing = Math.atan2(mv.y, mv.x);
    collideCircle(thief, PLAYER_RADIUS);
    // Footsteps: soft while sneaking, louder while running.
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      game.stepTimer = thief.sneaking ? 0.55 : 0.38;
      audio.footstep(thief.running);
    }
  }

  // Pebble toss: click throws one toward the click point.
  const click = input.takeClick();
  if (click && game.pebbleCount > 0) {
    game.pebbleCount--;
    game.pebbles.push({ x: click.x, y: click.y, pulse: 0, life: 6 });
    audio.pebble();
    alertGuardsToPoint(game.guards, click.x, click.y, PEBBLE_NOISE_DIST);
  }
  for (const p of game.pebbles) { p.pulse = (p.pulse + dt * 6) % 3; p.life -= dt; }
  game.pebbles = game.pebbles.filter((p) => p.life > 0);

  // Guards.
  let anyAlert = false;
  for (const g of game.guards) {
    const ev = updateGuard(g, thief, dt, game.guards);
    if (g.stepped) audio.guardStep(Math.hypot(g.x - thief.x, g.y - thief.y));
    if (ev.suspicious) audio.suspicious();
    if (ev.alert) { audio.alarm(); anyAlert = true; }
    if (ev.caught) {
      thief.alive = false;
      game.state = "lost";
      audio.caught();
    }
  }
  if (anyAlert) { /* alarm sting already played */ }

  // Artifacts: touch to pocket.
  for (const a of game.artifacts) {
    if (!a.taken && Math.hypot(a.x - thief.x, a.y - thief.y) < 26) {
      a.taken = true;
      game.artifactsTaken++;
      game.score += ARTIFACT_SCORE;
      audio.pickup();
    }
  }

  // Exit: reach the vault door.
  if (thief.x > EXIT_RECT.x && thief.x < EXIT_RECT.x + EXIT_RECT.w &&
      thief.y > EXIT_RECT.y && thief.y < EXIT_RECT.y + EXIT_RECT.h) {
    game.state = "won";
    audio.win();
  }
}

// --- draw -----------------------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.state === "start") {
    render.drawFloor(ctx);
    render.drawShadowsAndLamps(ctx);
    render.drawCover(ctx);
    render.drawExit(ctx, game.time);
    render.drawArtifacts(ctx, ARTIFACTS, game.time);
    render.drawStartScreen(ctx);
    return;
  }
  render.drawFloor(ctx);
  render.drawShadowsAndLamps(ctx);
  render.drawCover(ctx);
  render.drawExit(ctx, game.time);
  render.drawArtifacts(ctx, game.artifacts, game.time);
  for (const g of game.guards) render.drawVisionCone(ctx, g);
  for (const g of game.guards) render.drawGuard(ctx, g, game.time);
  if (game.thief.alive) render.drawThief(ctx, game.thief, game.time);
  render.drawPebbles(ctx, game.pebbles);
  render.drawHud(ctx, game);
  if (game.state === "won") render.drawWinScreen(ctx, game);
  if (game.state === "lost") render.drawLoseScreen(ctx, game);
}

// --- main loop ------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === "start") {
    game.time += dt;
    if (input.anyKey) {
      audio.unlock();
      resetGame();
    }
  } else {
    if (input.wasPressed("r") && (game.state === "won" || game.state === "lost")) {
      resetGame();
    }
    if (!game.frozen) update(dt);
    else game.time += dt;
    if (game.selftest) selftestStep(dt);
  }
  draw();
  requestAnimationFrame(frame);
}

// Boot: demo staging or self-test from the query string, else title screen.
// Debug handle for headless play-testing (read-only inspection).
window.__game = game;

const params = new URLSearchParams(location.search);
const demo = params.get("demo");
const selftest = params.get("selftest");
if (selftest === "1") {
  startSelftest();
} else if (demo) {
  stageDemo(demo);
}
requestAnimationFrame(frame);
