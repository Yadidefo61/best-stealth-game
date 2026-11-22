// level.js — level geometry: solid rects, collision and line-of-sight tests.
// Everything here works in pixel coordinates; config.js holds tile data.
import { TILE, LEVEL } from "./config.js";

// Convert a tile rect {x,y,w,h} to pixels.
export function tileRectToPx(r) {
  return { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE };
}

// All solid rects (walls + crates) in pixels, built once.
export const SOLIDS = [
  ...LEVEL.walls.map(tileRectToPx),
  ...LEVEL.crates.map(tileRectToPx),
];

export const BUSHES = LEVEL.bushes.map(tileRectToPx);
export const SHADOWS = LEVEL.shadows.map(tileRectToPx);
export const LAMPS = LEVEL.lamps.map((l) => ({ x: l.x * TILE, y: l.y * TILE }));

export const EXIT_RECT = tileRectToPx(LEVEL.exit);
export const SPAWN = { x: LEVEL.spawn.x * TILE, y: LEVEL.spawn.y * TILE };
export const ARTIFACTS = LEVEL.artifacts.map((a) => ({
  id: a.id, name: a.name, x: a.x * TILE, y: a.y * TILE, taken: false,
}));

function pointInRect(px, py, r) {
  return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h;
}

export function pointInAnyRect(px, py, rects) {
  return rects.some((r) => pointInRect(px, py, r));
}

export function isInBush(px, py) {
  return pointInAnyRect(px, py, BUSHES);
}

export function isInShadow(px, py) {
  return pointInAnyRect(px, py, SHADOWS);
}

export function isInLampLight(px, py) {
  return LAMPS.some((l) => {
    const dx = px - l.x, dy = py - l.y;
    return dx * dx + dy * dy < 95 * 95;
  });
}

// Circle vs solid rects: push the circle out and report whether it hit.
export function collideCircle(pos, radius) {
  let hit = false;
  for (const r of SOLIDS) {
    const cx = Math.max(r.x, Math.min(pos.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(pos.y, r.y + r.h));
    const dx = pos.x - cx, dy = pos.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.y = cy + (dy / d) * radius;
      } else {
        // Center inside the rect: push out along the smallest overlap.
        const left = pos.x - r.x, right = r.x + r.w - pos.x;
        const top = pos.y - r.y, bottom = r.y + r.h - pos.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) pos.x = r.x - radius;
        else if (m === right) pos.x = r.x + r.w + radius;
        else if (m === top) pos.y = r.y - radius;
        else pos.y = r.y + r.h + radius;
      }
    }
  }
  return hit;
}

// Segment vs rect test (slab method). True when the segment touches the rect.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx, t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy, t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Line of sight: true when no solid rect blocks the segment.
export function hasLineOfSight(x1, y1, x2, y2) {
  for (const r of SOLIDS) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}
