// guards.js — guard AI for Moonlit Vault: patrols, vision cones, and the
// three-stage detection ladder (calm -> suspicious -> alerted) with recovery.
import {
  TILE, GUARD_SPEED_PATROL, GUARD_SPEED_SUSPICIOUS, GUARD_SPEED_CHASE,
  GUARD_VIEW_DIST, GUARD_VIEW_DIST_SHADOW, GUARD_VIEW_ANGLE,
  GUARD_HEAR_DIST, SUSPICION_GAIN, SUSPICION_DECAY, SUSPICIOUS_AT, ALERT_AT,
  LOSE_SIGHT_AFTER, CATCH_DIST, PEBBLE_NOISE_DIST, LEVEL,
} from "./config.js";
import { collideCircle, hasLineOfSight, isInBush, isInShadow, isInLampLight } from "./level.js";

export const GUARD_CALM = "calm";
export const GUARD_SUSPICIOUS = "suspicious";
export const GUARD_ALERT = "alert";

// Angle helpers: keep angles wrapped to (-PI, PI].
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

function angleDiff(a, b) {
  return Math.abs(wrapAngle(a - b));
}

export function createGuard(def) {
  const waypoints = def.waypoints.map(([tx, ty]) => ({ x: tx * TILE, y: ty * TILE }));
  return {
    name: def.name,
    color: def.color,
    waypoints,
    waypointIndex: 0,
    x: waypoints[0].x,
    y: waypoints[0].y,
    facing: 0,
    pause: def.pause || 1,
    pauseTimer: 0,
    state: GUARD_CALM,
    suspicion: 0,
    lastSeen: null,       // {x, y} of the thief when last spotted
    unseenTimer: 0,
    investigateTimer: 0,
    lookTimer: 0,
    lookDir: 0,
    stepTimer: 0,
    wasSuspicious: false,
    wasAlert: false,
  };
}

export function createGuards() {
  return LEVEL.guards.map(createGuard);
}

// Can this guard see the thief right now? Returns a 0..1 visibility factor.
export function guardSeesThief(guard, thief) {
  // Ghost mode is a self-test flag only: the scripted thief is unseeable.
  if (thief.ghost) return 0;
  const dx = thief.x - guard.x, dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = isInShadow(thief.x, thief.y) ? GUARD_VIEW_DIST_SHADOW : GUARD_VIEW_DIST;
  if (dist > range) return 0;
  const angleTo = Math.atan2(dy, dx);
  if (angleDiff(angleTo, guard.facing) > GUARD_VIEW_ANGLE) return 0;
  if (!hasLineOfSight(guard.x, guard.y, thief.x, thief.y)) return 0;
  // Hidden in a bush unless the guard is almost on top of the thief.
  if (isInBush(thief.x, thief.y) && dist > 55) return 0;
  // Closer and better lit means seen faster; sneaking in shadow is slowest.
  let factor = 1 - (dist / range) * 0.55;
  if (thief.sneaking) factor *= 0.55;
  if (isInLampLight(thief.x, thief.y)) factor *= 1.5;
  if (thief.running) factor *= 1.25;
  return Math.max(0.15, Math.min(1.4, factor));
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x, dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  collideCircle(guard, 14);
  return dist - step < 2;
}

// A pebble clink or running feet pulls guards to a point.
export function alertGuardsToPoint(guards, x, y, radius) {
  for (const g of guards) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < radius && g.state !== GUARD_ALERT) {
      g.lastSeen = { x, y };
      g.state = GUARD_SUSPICIOUS;
      g.investigateTimer = 0;
      if (g.suspicion < SUSPICIOUS_AT) g.suspicion = SUSPICIOUS_AT;
    }
  }
}

// One guard update. Returns events for sounds: {suspicious, alert, caught}.
export function updateGuard(guard, thief, dt, guards) {
  const events = { suspicious: false, alert: false, caught: false };
  const seen = guardSeesThief(guard, thief);

  // --- detection ladder -------------------------------------------------
  if (seen > 0 && thief.alive) {
    guard.suspicion += SUSPICION_GAIN * seen * dt;
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.unseenTimer = 0;
  } else {
    guard.suspicion -= SUSPICION_DECAY * dt;
    guard.unseenTimer += dt;
  }
  guard.suspicion = Math.max(0, Math.min(1, guard.suspicion));

  const prevState = guard.state;
  if (guard.suspicion >= ALERT_AT) {
    guard.state = GUARD_ALERT;
  } else if (guard.suspicion >= SUSPICIOUS_AT) {
    if (guard.state === GUARD_CALM) guard.state = GUARD_SUSPICIOUS;
  } else if (guard.state === GUARD_SUSPICIOUS && guard.unseenTimer > 2.5) {
    guard.state = GUARD_CALM;
    guard.waypointIndex = nearestWaypoint(guard);
  }
  if (guard.state === GUARD_ALERT && guard.unseenTimer > LOSE_SIGHT_AFTER) {
    guard.state = GUARD_SUSPICIOUS;
    guard.investigateTimer = 0;
  }
  if (guard.state !== prevState) {
    if (guard.state === GUARD_SUSPICIOUS) events.suspicious = true;
    if (guard.state === GUARD_ALERT) events.alert = true;
  }

  // --- hearing: running feet nearby raise suspicion ---------------------
  if (thief.running && thief.alive) {
    const d = Math.hypot(guard.x - thief.x, guard.y - thief.y);
    if (d < GUARD_HEAR_DIST && hasLineOfSight(guard.x, guard.y, thief.x, thief.y)) {
      guard.suspicion = Math.min(1, guard.suspicion + 0.35 * dt);
    } else if (d < GUARD_HEAR_DIST * 0.6) {
      // Heard through a wall: investigate the noise, do not see.
      if (guard.state === GUARD_CALM) {
        guard.lastSeen = { x: thief.x, y: thief.y };
        guard.state = GUARD_SUSPICIOUS;
      }
    }
  }

  // --- movement ---------------------------------------------------------
  if (guard.state === GUARD_ALERT) {
    const target = guard.lastSeen || { x: thief.x, y: thief.y };
    moveToward(guard, target.x, target.y, GUARD_SPEED_CHASE, dt);
    if (thief.alive && Math.hypot(guard.x - thief.x, guard.y - thief.y) < CATCH_DIST) {
      events.caught = true;
    }
  } else if (guard.state === GUARD_SUSPICIOUS) {
    if (guard.lastSeen) {
      const arrived = moveToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_SPEED_SUSPICIOUS, dt);
      if (arrived) {
        guard.investigateTimer += dt;
        guard.lookTimer += dt;
        if (guard.lookTimer > 0.9) {
          guard.lookTimer = 0;
          guard.lookDir += (Math.random() - 0.5) * 2.4;
          guard.facing = guard.lookDir;
        }
        if (guard.investigateTimer > 2.5) {
          guard.lastSeen = null;
          guard.state = GUARD_CALM;
          guard.waypointIndex = nearestWaypoint(guard);
        }
      }
    }
  } else {
    // Patrol: walk the loop, pausing at each waypoint to look around.
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.facing += Math.sin(guard.pauseTimer * 2.2) * 0.012;
    } else {
      const wp = guard.waypoints[guard.waypointIndex];
      const arrived = moveToward(guard, wp.x, wp.y, GUARD_SPEED_PATROL, dt);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = guard.pause;
      }
    }
  }

  // Footstep timing for the audio layer (guard steps get louder up close).
  guard.stepTimer -= dt;
  if (guard.state !== GUARD_CALM || guard.pauseTimer <= 0) {
    if (guard.stepTimer <= 0) {
      guard.stepTimer = guard.state === GUARD_ALERT ? 0.32 : 0.55;
      guard.stepped = true;
    } else {
      guard.stepped = false;
    }
  } else {
    guard.stepped = false;
  }
  return events;
}

function nearestWaypoint(guard) {
  let best = 0, bestD = Infinity;
  guard.waypoints.forEach((wp, i) => {
    const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

// Highest suspicion across all guards: the global alarm meter.
export function globalAlarm(guards) {
  return guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
}

export { PEBBLE_NOISE_DIST };
