// config.js — tuning constants and the museum level layout for Moonlit Vault.
// All positions are in tile units; TILE is the pixel size of one tile.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 85;
export const PLAYER_RADIUS = 12;

export const GUARD_SPEED_PATROL = 62;
export const GUARD_SPEED_SUSPICIOUS = 95;
export const GUARD_SPEED_CHASE = 132;
export const GUARD_RADIUS = 14;
export const GUARD_VIEW_DIST = 210;
export const GUARD_VIEW_DIST_SHADOW = 110;
export const GUARD_VIEW_ANGLE = 0.61; // half-angle of the vision cone (~70 deg total)
export const GUARD_HEAR_DIST = 130;

export const SUSPICION_GAIN = 1.15; // per second while fully seen
export const SUSPICION_DECAY = 0.28;
export const SUSPICIOUS_AT = 0.35;
export const ALERT_AT = 0.85;
export const LOSE_SIGHT_AFTER = 4.0; // seconds unseen while alerted
export const CATCH_DIST = 20;

export const PEBBLES_START = 5;
export const PEBBLE_NOISE_DIST = 170;

export const ARTIFACT_SCORE = 500;
export const WIN_TIME_BONUS_PER_SEC = 10;

// Level layout. Rects are {x, y, w, h} in tile units.
// Walls block movement and line of sight. Crates block both too (cover).
// Bushes hide the thief when he stands inside them. Shadows halve guard sight.
// Lamps are light pools: being seen inside one fills suspicion faster.
export const LEVEL = {
  name: "The Marlowe Museum — Night Wing",
  spawn: { x: 1.5, y: 14.5 },
  exit: { x: 21.5, y: 1.5, w: 2, h: 1 },
  walls: [
    { x: 0, y: 0, w: 24, h: 1 }, { x: 0, y: 15, w: 24, h: 1 },
    { x: 0, y: 0, w: 1, h: 16 }, { x: 23, y: 0, w: 1, h: 16 },
    { x: 5, y: 0, w: 1, h: 5 }, { x: 5, y: 7, w: 1, h: 4 },
    { x: 11, y: 5, w: 1, h: 6 }, { x: 11, y: 13, w: 1, h: 2 },
    { x: 16, y: 0, w: 1, h: 4 }, { x: 16, y: 6, w: 1, h: 5 },
    { x: 8, y: 11, w: 6, h: 1 }, { x: 19, y: 9, w: 4, h: 1 },
    { x: 19, y: 12, w: 1, h: 3 },
  ],
  crates: [
    { x: 2, y: 3, w: 2, h: 1 }, { x: 3, y: 9, w: 1, h: 2 },
    { x: 7, y: 2, w: 1, h: 1 }, { x: 7, y: 13, w: 2, h: 1 },
    { x: 12, y: 8, w: 2, h: 1 }, { x: 14, y: 2, w: 1, h: 2 },
    { x: 18, y: 4, w: 2, h: 1 }, { x: 20, y: 13, w: 1, h: 1 },
    { x: 9, y: 5, w: 1, h: 1 }, { x: 17, y: 11, w: 1, h: 1 },
  ],
  bushes: [
    { x: 2, y: 6, w: 2, h: 1 }, { x: 6, y: 9, w: 1, h: 2 },
    { x: 13, y: 5, w: 2, h: 1 }, { x: 18, y: 7, w: 1, h: 2 },
    { x: 21, y: 10, w: 1, h: 2 }, { x: 10, y: 13, w: 1, h: 1 },
  ],
  shadows: [
    { x: 1, y: 1, w: 3, h: 3 }, { x: 6, y: 5, w: 4, h: 2 },
    { x: 12, y: 11, w: 4, h: 3 }, { x: 18, y: 1, w: 3, h: 2 },
    { x: 20, y: 6, w: 2, h: 3 },
  ],
  lamps: [
    { x: 3.5, y: 1.5 }, { x: 9.5, y: 3.5 }, { x: 14.5, y: 9.5 },
    { x: 20.5, y: 3.5 }, { x: 8.5, y: 12.5 }, { x: 21.5, y: 8.5 },
  ],
  artifacts: [
    { id: "moon", name: "Moon Opal", x: 2.5, y: 1.5 },
    { id: "scar", name: "Scarab of Dawn", x: 14.5, y: 13.5 },
    { id: "crown", name: "Crown of Tides", x: 21.5, y: 4.5 },
  ],
  guards: [
    {
      name: "Bram", color: "#e8b34b",
      waypoints: [[3, 6], [3, 12], [9, 12], [9, 6]], pause: 1.2,
    },
    {
      name: "Ida", color: "#e86a4b",
      waypoints: [[13, 3], [20, 3], [20, 8], [13, 8]], pause: 0.9,
    },
    {
      name: "Kessler", color: "#7fb3e8",
      waypoints: [[7, 13], [15, 13], [15, 10], [7, 10]], pause: 1.5,
    },
    {
      name: "Mira", color: "#9be87f",
      waypoints: [[21, 12], [21, 6], [17, 6], [17, 12]], pause: 1.0,
    },
  ],
};
