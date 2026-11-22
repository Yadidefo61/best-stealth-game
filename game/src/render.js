// render.js — all canvas drawing for Moonlit Vault: floor, cover, light,
// vision cones, guards, the thief, artifacts, exit, HUD and menus.
import { TILE, VIEW_W, VIEW_H, LEVEL, GUARD_VIEW_DIST, GUARD_VIEW_DIST_SHADOW, GUARD_VIEW_ANGLE } from "./config.js";
import { SOLIDS, BUSHES, SHADOWS, LAMPS, EXIT_RECT, isInShadow, isInBush } from "./level.js";
import { GUARD_CALM, GUARD_SUSPICIOUS, GUARD_ALERT, globalAlarm } from "./guards.js";

const FLOOR_A = "#232733";
const FLOOR_B = "#20242e";

function coneColor(state) {
  if (state === GUARD_ALERT) return "rgba(232, 64, 48, 0.34)";
  if (state === GUARD_SUSPICIOUS) return "rgba(232, 150, 48, 0.30)";
  return "rgba(232, 200, 90, 0.22)";
}

function coneEdge(state) {
  if (state === GUARD_ALERT) return "rgba(232, 64, 48, 0.55)";
  if (state === GUARD_SUSPICIOUS) return "rgba(232, 150, 48, 0.5)";
  return "rgba(232, 200, 90, 0.4)";
}

export function drawFloor(ctx) {
  for (let ty = 0; ty < 16; ty++) {
    for (let tx = 0; tx < 24; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // Faint rug runners down the main hall.
  ctx.fillStyle = "rgba(96, 44, 66, 0.5)";
  ctx.fillRect(6 * TILE, 0, TILE, 16 * TILE);
  ctx.fillRect(17 * TILE, 0, TILE, 16 * TILE);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  for (let tx = 0; tx <= 24; tx++) {
    ctx.beginPath(); ctx.moveTo(tx * TILE, 0); ctx.lineTo(tx * TILE, VIEW_H); ctx.stroke();
  }
  for (let ty = 0; ty <= 16; ty++) {
    ctx.beginPath(); ctx.moveTo(0, ty * TILE); ctx.lineTo(VIEW_W, ty * TILE); ctx.stroke();
  }
}

export function drawShadowsAndLamps(ctx) {
  // Lamp pools first (light on the floor), then shadow zones darken.
  for (const lamp of LAMPS) {
    const g = ctx.createRadialGradient(lamp.x, lamp.y, 8, lamp.x, lamp.y, 100);
    g.addColorStop(0, "rgba(255, 214, 130, 0.28)");
    g.addColorStop(1, "rgba(255, 214, 130, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 100, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd682";
    ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const s of SHADOWS) {
    ctx.fillStyle = "rgba(6, 8, 18, 0.55)";
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = "rgba(140, 160, 220, 0.25)";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
  }
}

export function drawCover(ctx) {
  // Crates: solid cover that blocks sight.
  for (const r of SOLIDS) {
    const isCrate = r.w <= 2 * TILE && r.h <= 2 * TILE &&
      !(r.x === 0 || r.y === 0 || r.x + r.w === VIEW_W || r.y + r.h === VIEW_H);
    if (!isCrate) continue;
    ctx.fillStyle = "#6b4a2a";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = "#7d5732";
    ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    ctx.strokeStyle = "#4a3018";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.beginPath();
    ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.moveTo(r.x + r.w, r.y); ctx.lineTo(r.x, r.y + r.h);
    ctx.stroke();
  }
  // Walls: heavy stone.
  for (const r of SOLIDS) {
    const isWall = r.x === 0 || r.y === 0 || r.x + r.w === VIEW_W || r.y + r.h === VIEW_H ||
      (r.w >= 6 * TILE) || (r.h >= 4 * TILE);
    if (!isWall) continue;
    ctx.fillStyle = "#3a3f52";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = "#454b63";
    ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, 5);
    ctx.strokeStyle = "#232636";
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  }
  // Bushes: soft green hiding spots.
  for (const b of BUSHES) {
    ctx.fillStyle = "rgba(46, 110, 58, 0.9)";
    roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(86, 170, 92, 0.9)";
    for (let i = 0; i < 5; i++) {
      const bx = b.x + 8 + ((i * 37) % Math.max(10, b.w - 16));
      const by = b.y + 8 + ((i * 23) % Math.max(10, b.h - 16));
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawExit(ctx, time) {
  const pulse = 0.6 + Math.sin(time * 3) * 0.25;
  ctx.fillStyle = `rgba(80, 220, 130, ${0.25 + pulse * 0.2})`;
  ctx.fillRect(EXIT_RECT.x, EXIT_RECT.y, EXIT_RECT.w, EXIT_RECT.h);
  ctx.fillStyle = "#2fae5f";
  ctx.fillRect(EXIT_RECT.x, EXIT_RECT.y, EXIT_RECT.w, 6);
  ctx.fillStyle = "#d8ffe6";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("EXIT", EXIT_RECT.x + EXIT_RECT.w / 2, EXIT_RECT.y + EXIT_RECT.h / 2 + 5);
  ctx.strokeStyle = `rgba(120, 255, 170, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT_RECT.x + 1, EXIT_RECT.y + 1, EXIT_RECT.w - 2, EXIT_RECT.h - 2);
}

export function drawArtifacts(ctx, artifacts, time) {
  for (const a of artifacts) {
    if (a.taken) continue;
    const bob = Math.sin(time * 2.5 + a.x) * 3;
    const g = ctx.createRadialGradient(a.x, a.y + bob, 2, a.x, a.y + bob, 26);
    g.addColorStop(0, "rgba(255, 220, 120, 0.5)");
    g.addColorStop(1, "rgba(255, 220, 120, 0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(a.x, a.y + bob, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd76a";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + bob - 10);
    ctx.lineTo(a.x + 7, a.y + bob);
    ctx.lineTo(a.x, a.y + bob + 10);
    ctx.lineTo(a.x - 7, a.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath(); ctx.arc(a.x - 2, a.y + bob - 3, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawVisionCone(ctx, guard) {
  const range = guard.state === GUARD_ALERT ? GUARD_VIEW_DIST * 1.1 : GUARD_VIEW_DIST;
  const half = GUARD_VIEW_ANGLE;
  const g = ctx.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
  g.addColorStop(0, coneColor(guard.state));
  g.addColorStop(1, "rgba(232, 200, 90, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.facing - half, guard.facing + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = coneEdge(guard.state);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing - half) * range, guard.y + Math.sin(guard.facing - half) * range);
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(guard.facing + half) * range, guard.y + Math.sin(guard.facing + half) * range);
  ctx.stroke();
}

export function drawGuard(ctx, guard, time) {
  const bob = Math.sin(time * 6 + guard.x) * 1.5;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(guard.x, guard.y + 10, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Body: uniformed guard, colour-coded, with a lantern dot.
  ctx.fillStyle = guard.color;
  ctx.beginPath(); ctx.arc(guard.x, guard.y + bob, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1c2030";
  ctx.beginPath(); ctx.arc(guard.x, guard.y + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd76a";
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 10, guard.y + bob + Math.sin(guard.facing) * 10, 3, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y + bob);
  ctx.lineTo(guard.x + Math.cos(guard.facing) * 19, guard.y + bob + Math.sin(guard.facing) * 19);
  ctx.stroke();
  // Suspicion ring + state mark.
  if (guard.suspicion > 0.05) {
    ctx.strokeStyle = guard.state === GUARD_ALERT ? "#ff4030" : "#ffb347";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y + bob, 19, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.state !== GUARD_CALM) {
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = guard.state === GUARD_ALERT ? "#ff5040" : "#ffcf5e";
    ctx.fillText(guard.state === GUARD_ALERT ? "!" : "?", guard.x, guard.y + bob - 22);
  }
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.textAlign = "center";
  ctx.fillText(guard.name, guard.x, guard.y + bob + 30);
}

export function drawThief(ctx, thief, time) {
  const moving = thief.moving;
  const bob = moving ? Math.sin(time * 10) * 1.5 : Math.sin(time * 2) * 0.8;
  const hidden = isInBush(thief.x, thief.y);
  const shadowed = isInShadow(thief.x, thief.y);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(thief.x, thief.y + 10, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Cloaked figure: dark hood with a pale rim so it reads on the floor.
  ctx.fillStyle = hidden ? "rgba(30, 90, 50, 0.95)" : "#2b2f45";
  ctx.beginPath(); ctx.arc(thief.x, thief.y + bob, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = shadowed ? "#8fb7ff" : "#c9d4ff";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(thief.x, thief.y + bob, 12, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#e8ecff";
  ctx.beginPath(); ctx.arc(thief.x, thief.y + bob, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1c2030";
  ctx.beginPath(); ctx.arc(thief.x, thief.y + bob - 1, 2.5, 0, Math.PI * 2); ctx.fill();
  // Direction tick.
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(thief.x, thief.y + bob);
  ctx.lineTo(thief.x + Math.cos(thief.facing) * 16, thief.y + bob + Math.sin(thief.facing) * 16);
  ctx.stroke();
  if (thief.sneaking) {
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#9fd8ff";
    ctx.fillText("sneaking", thief.x, thief.y + bob - 18);
  }
}

export function drawPebbles(ctx, pebbles) {
  for (const p of pebbles) {
    ctx.strokeStyle = "rgba(255, 220, 120, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, 5 + p.pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#d8d8d8";
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawHud(ctx, game) {
  const alarm = globalAlarm(game.guards);
  ctx.fillStyle = "rgba(10, 12, 22, 0.85)";
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = "#e8ecff";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`MOONLIT VAULT`, 12, 22);
  ctx.font = "13px sans-serif";
  ctx.fillStyle = "#ffd76a";
  ctx.fillText(`Artifacts ${game.artifactsTaken}/3`, 180, 22);
  ctx.fillStyle = "#e8ecff";
  ctx.fillText(`Time ${formatTime(game.elapsed)}`, 300, 22);
  ctx.fillText(`Score ${game.score}`, 400, 22);
  ctx.fillText(`Pebbles ${game.pebbles} (click to toss)`, 500, 22);
  // Alarm meter on the right.
  ctx.fillStyle = "#3a3f52";
  ctx.fillRect(760, 11, 150, 12);
  ctx.fillStyle = alarm < 0.35 ? "#4caf50" : alarm < 0.85 ? "#ffb347" : "#ff4030";
  ctx.fillRect(760, 11, 150 * alarm, 12);
  ctx.fillStyle = "#e8ecff";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(alarm < 0.35 ? "UNSEEN" : alarm < 0.85 ? "SUSPICIOUS" : "ALARM!", 750, 22);
  ctx.textAlign = "left";
}

export function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = "rgba(6, 8, 16, 0.78)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = "bold 44px Georgia, serif";
  ctx.fillText(title, VIEW_W / 2, 210);
  ctx.fillStyle = "#e8ecff";
  ctx.font = "16px sans-serif";
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 260 + i * 28));
}

export function drawStartScreen(ctx) {
  overlay(ctx, "MOONLIT VAULT", [
    "A shadow thief slips into the Marlowe Museum after dark.",
    "Slip past the guards, pocket the three artifacts, reach the EXIT unseen.",
    "",
    "WASD / arrows — move      SHIFT — sneak (slower, harder to spot)",
    "CLICK — toss a pebble to lure a guard away",
    "Hide in bushes and shadows. If a guard spots you, break line of sight",
    "and stay hidden until the alarm fades.",
    "",
    "Press any key or click to begin.",
  ], "#ffd76a");
}

export function drawWinScreen(ctx, game) {
  const timeBonus = Math.max(0, 600 - Math.floor(game.elapsed)) * 10;
  overlay(ctx, "CLEAN GETAWAY", [
    `You slipped out of the Marlowe Museum with ${game.artifactsTaken} of 3 artifacts.`,
    `Time ${formatTime(game.elapsed)}   •   Score ${game.score + timeBonus}`,
    "",
    "The night guard never knew you were there.",
    "",
    "Press R to play again.",
  ], "#7dff9e");
}

export function drawLoseScreen(ctx, game) {
  overlay(ctx, "CAUGHT!", [
    "A guard caught you in the lamplight.",
    `Artifacts taken: ${game.artifactsTaken} of 3   •   Time ${formatTime(game.elapsed)}`,
    "",
    "The museum keeps its secrets — this time.",
    "",
    "Press R to try again.",
  ], "#ff5040");
}
