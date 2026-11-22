# Moonlit Vault

A shadow thief slips into the Marlowe Museum after dark. Slip past the
patrolling guards, pocket the three artifacts, and reach the EXIT unseen.

## Play

Open `game/index.html` from any static server (or run `node serve.ts` and
open http://localhost:8080).

- **WASD / arrow keys** — move
- **SHIFT** — sneak (slower, harder to spot, quieter)
- **CLICK** — toss a pebble to lure a guard toward the noise
- **R** — restart after winning or being caught

## The stealth

- Guards patrol fixed routes with vision cones. Being seen fills a guard's
  suspicion: **calm → suspicious → alerted**. Break line of sight and stay
  hidden — in bushes or deep shadow — and suspicion fades.
- Crates block a guard's sight. Bushes hide you unless a guard is almost on
  top of you. Lamp pools make you easier to spot; shadows halve a guard's
  sight range.
- Running is loud: guards nearby hear fast footsteps through walls and come
  to investigate.
- Optional: collect the Moon Opal, the Scarab of Dawn and the Crown of Tides
  for +500 points each before you leave.

## Structure

- `game/index.html` — page and canvas
- `game/src/config.js` — tuning constants and the museum level layout
- `game/src/level.js` — collision and line-of-sight geometry
- `game/src/input.js` — keyboard and mouse input
- `game/src/audio.js` — procedural WebAudio sounds (no audio files)
- `game/src/guards.js` — guard patrol, vision and detection AI
- `game/src/render.js` — all canvas drawing
- `game/src/main.js` — game loop, state machine, thief movement
- `main.ts` — hand-in program: copies `game/` and `screenshots/` to
  `$MAKEFUN_OUTPUT_DIR` and writes `dossier.json`
- `serve.ts` — local play-test server

All art is drawn in code and all sound is synthesised; the game loads
nothing over the network.

## Testing hooks (for development only)

- `?demo=cover|alert|exit|win|caught` stages a frozen scene for screenshots.
- `?selftest=1` runs a scripted playthrough (win path, then lose path) and
  reports `SELFTEST PASS/FAIL` into `#selftest` and the page title.

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Yadidefo61/best-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Yadidefo61/best-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
