[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/ShinoNC/best-heist-game-20261122-0559-entry/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/ShinoNC/best-heist-game-20261122-0559-entry/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# VAULTBREAK — The Meridian Job

A top-down stealth heist game for make.fun's best-heist-game-20261122-0559 bounty. One room, three guards, two cameras, one diamond.

Plan the job (pick a route, buy tools with credits), sneak through the Meridian Gallery past patrolling guards and sweeping cameras, pick the vault, steal the Meridian Diamond, and escape to the van — before the alarm meter fills and the room locks down.

## Play

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

- **WASD / arrows** — move
- **Shift** — crouch (slower, harder to spot)
- **E** — pick the vault lock (hold, 2.5s, while unseen)
- **1** — smoke bomb (blocks cones), **2** — EMP (cameras down 12s), **3** — decoy (click to throw, pulls guards away)
- **Esc / P** — pause

Three routes in: the fast Main Hall, the camera-watched Side Gallery, or the slow, unseen Service Vent. Gold bars pay credits for more tools. A clean run (low alarm) pays a getaway bonus.

## Layout

- `game/index.html` — the page and canvas
- `game/src/config.js` — tuning numbers and palette
- `game/src/level.js` — the room: walls, cases, pillars, vent, vault, patrols, routes
- `game/src/guards.js` — guard AI: patrol, suspicion, the fair SPOTTED warning, the chase
- `game/src/cameras.js` — sweeping cameras and their detection
- `game/src/tools.js` — smoke, EMP, decoy
- `game/src/world.js` — rules and state: alarm, loot, lockpick, win/lose, score
- `game/src/input.js` — keyboard and mouse
- `game/src/render.js` — canvas drawing, HUD, and all six screens
- `game/src/shots.js` — the `?shot=` screenshot scenes
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — hands the game in (copies game/ + screenshots/ to /output, writes dossier.json)
