# Chinny's Arcade

Collection of experimental browser games made with Claude. **Play them at https://chinny-studios.github.io/arcade/** Each game is a self-contained folder — open its `index.html` in a browser (WebGL 2 required for the 3D ones).

| Game | What it is | Source |
| :--- | :--- | :--- |
| [Be Kind, Rewind](be-kind-rewind/) | New Year's Eve 1999, home alone — explore the house and find every hidden memory before the ball drops. | single file |
| [Blockhaven](blockhaven/) | An endless voxel world of grass, stone and timber. Dig anywhere, build anything. | single file |
| [Rimward](rimward/) | Fly past the last charted stars: scan worlds, ride gravity wells, skim stars for fuel, bank survey data at a relay. | single file + soundtrack |
| [Gravity at the Edge](gravity-at-the-edge/) | Bigger take on Rimward: an explorer ship, galaxy map, honking systems, neutron jets, selling data for credits. | [`source/`](gravity-at-the-edge/source/) (esbuild + three.js) |
| [Midnight in the Sprawl](midnight-in-the-sprawl/) | Walk the rain-soaked neon streets of a cyberpunk city with an original soundtrack. | [`src/`](midnight-in-the-sprawl/src/) |
| [Port Calder](port-calder/) | Open-world city by the bay: walk the streets, jack any car you can get into, drift through the cul-de-sacs. | single file |
| [Vyrium](vyrium/) | Looter shooter: 58 zones, 5 professions, procedurally generated guns. | [`source/`](vyrium/source/) (three.js, vendored) |
| [Hollowmere](hollowmere/) | PS1-style horror: a deserted 1888 village in a thunderstorm. Find eight pages while something tall hunts you. | [`source/`](hollowmere/source/) (three.js, vendored) |
| [Calamity Bay](calamity-bay/) | Kaiju rampage: play a sea or mountain monster and topple a city of breakable towers while police, tanks, helicopters and jets fight back. | [`source/`](calamity-bay/source/) (three.js, vendored) |
| [Mud & Iron](mud-and-iron/) | WWI real-time strategy: four nations, trenches, wire, gas, barrages and early tanks across procedural sectors. Skirmish, Frontline, Survival and a five-mission campaign vs. the AI. Plays with mouse and keyboard or touch. | [`source/`](mud-and-iron/source/) (three.js, vendored) |
| [Studworks](studworks/) | Brick-building sandbox: snap bricks, plates, tiles and slopes onto a baseplate in 26 classic colors. Move, copy, paint, undo, save to file. | [`source/`](studworks/source/) (three.js, vendored) |
| [Iron Saber](iron-saber/) | Mobile suit action at real scale: walk up to an 18 m suit, ride the winch into its cockpit and fight across a breakable city, desert, forest and mountains. Panoramic and classic cockpits, first or third person, four boardable suits, sorties vs. Dominion AI. | [`source/`](iron-saber/source/) (three.js, vendored) |
| [Ashreach](ashreach/) | Offline sci-fi MMO homage: 4 breeds, 14 professions, nano programs, implants and clusters, tab-target combat, mission terminals with sliders and instanced interiors, six zones and two dungeons to level 50, and a world full of simulated players who hunt, team up, chat in OOC and fight over lumen pylons. | [`source/`](ashreach/source/) (three.js, vendored) |
| [Signal Front](signal-front/) | Turn-based tactics in the classic handheld style: an all-autonomous army (ground robots, recon and strike drones, loitering munitions, jammers, an XL-AUV) against drone swarms, tanks and artillery. Four skirmish maps, six commanders with Power and Super Power, fog of war, and an AI opponent. Plays with mouse or touch. | [`source/`](signal-front/source/) |
| [Revenant Protocol](revenant-protocol/) | 1995-style first-person shooter, an homage to the sector-engine classics: four missions (desert garrison, flooded sewers, lava foundry, enemy flagship) with keycards, lifts, moving platforms, ice, gas and lava, ten weapons with alt fire, a wireframe automap, PDA objectives, a headlamp, gas mask and ice cleats, sprites baked from low-poly models in eight directions, and a boss. Plays with mouse and keyboard or twin-stick touch. | [`source/`](revenant-protocol/source/) (three.js, vendored) |
| [Tokoyo](tokoyo/) | Survival sandbox in the eternal land of Japanese myth: a seeded island of meadows and cedar forest, snap-together building with structural support, Valheim-style food, rest, rain and cold, bronze smelting in a tatara, rafts and torii portals, yokai from gaki to oni, and two great kami to calm. | [`source/`](tokoyo/source/) (three.js, vendored) |
| [Farhold](farhold/) | A seamless procedural universe in the spirit of No Man's Sky: crash-land on an alien world, mine and craft to repair your ship, fly from the surface to orbit without a loading screen, trade at space stations, scan alien creatures and plants, build a base, dodge sentinels and pirates, and warp from star to star toward the galactic core. Mouse and keyboard or gamepad. | [`source/`](farhold/source/) (three.js, vendored) |

## The index page

[`index.html`](index.html) builds its cards from the `GAMES` list in its script. Visitors can sort (newest, oldest, A–Z, genre), search (`/` to focus), filter by genre or by input (touch, gamepad), and open a random game with **Surprise me**. The view is kept in the URL (e.g. `?sort=az&genre=Strategy&input=touch`), so filtered views can be shared. To list a new game, add an entry to `GAMES` with the day it was added, its genres, tags and supported inputs (`kbm`, `touch`, `pad`). Then add a 16:9 screenshot at `<game>/cover.webp` (800×450, about 20–60 KB). [`tools/covers`](tools/covers/) captures one headlessly from a per-game recipe. The four newest games from the past week get a **New** badge.

## Rebuilding

- **Gravity at the Edge:** `cd gravity-at-the-edge/source && npm install && python3 build.py` → `dist/standalone.html` (copy over `../index.html`).
- **Midnight in the Sprawl:** `cd midnight-in-the-sprawl && python3 build.py` → regenerates `index.html` from `src/`.
- **Vyrium:** `cd vyrium/source && mkdir -p dist && python3 build.py` → copy `dist/vyrium.html` over `../index.html`.
- **Calamity Bay:** `cd calamity-bay/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.CB` test hook (`CB.sim(seconds)` fast-forwards the simulation).
- **Hollowmere:** `cd hollowmere/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` to get a `window.HM` test hook.
- **Mud & Iron:** `cd mud-and-iron/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.MI` test hook (`MI.sim(seconds)` fast-forwards, `MI.start({...})` launches a match).
- **Studworks:** `cd studworks/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.SW` test hook. New parts go in the catalog at the bottom of `src/01_core.js`.
- **Iron Saber:** `cd iron-saber/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.IS` test hook (`IS.sim(seconds)` fast-forwards, `IS.enter('valiant')` jumps into a suit).
- **Signal Front:** `cd signal-front/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.SF` test hook (`SF.sim({map}, days)` plays AI vs AI, `SF.place(type, side, x, y)` drops a unit); `node test/smoke.mjs` runs the rules checks and four AI-vs-AI games headless.
- **Ashreach:** `cd ashreach/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.AR` test hook (`AR.quick('medic')` starts a character, `AR.sim(seconds)` fast-forwards); `node test/smoke.mjs` runs a headless check. Design notes in `DESIGN.md`, module contracts in `API.md`.
- **Tokoyo:** `cd tokoyo/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.TK` test hook (`TK.start({seed})` begins a world, `TK.sim(seconds)` fast-forwards, `TK.give(id, n)`, `TK.tp(x, z)`, `TK.spawn(type)`); `node test/smoke.mjs --steps test/play.js` runs the core loop headless (also `build.js`, `systems.js`, `bosses.js`, `visual.js`, `ui.js`; `node test/saveload.mjs` checks a save round trip). Design notes in `DESIGN.md`.

- **Revenant Protocol:** `cd revenant-protocol/source && python3 build.py` → writes `../index.html` directly. Levels are ASCII maps with a per-level legend in `src/06_levels.js` (format notes at the top of `src/05_level.js`). Open with `#debug` for a `window.RP` test hook (`RP.start(mission)`, `RP.sim(seconds)`, `RP.tp(col, row)`, `RP.all()`, `RP.reach()` checks every key, switch, goal and exit is reachable); `node test/smoke.mjs --no-start --steps test/reach.js` runs that check for all four missions, and `test/play1.js`, `plat.js`, `boss.js`, `ai.js`, `flow.js` drive the game headless.
- **Farhold:** `cd farhold/source && python3 build.py` → writes `../index.html` directly. Open with `#debug` for a `window.FH` test hook (`FH.start({seed})` begins a journey, `FH.sim(seconds)` fast-forwards, `FH.give(id, n)`, `FH.tpPlanet(i, lat, lon)`, `FH.stream()` builds the surroundings); `node test/smoke.mjs --steps test/loop.js` runs the opening on-foot loop headless (also `flight.js` for take-off → orbit → docking → trade → warp, `systems.js`, `ui.js`, `perf.js`). Design notes in `DESIGN.md`.

## Running locally

Some games load their soundtrack via a relative path, so serve the folder rather than opening via `file://` if audio doesn't play:

```sh
python3 -m http.server 8000   # then open http://localhost:8000/<game>/
```

## License

The code is [MIT](LICENSE), © 2026 Jeffrey Chin. The music files are **not** covered by it, and three.js and the fonts have their own licenses: see [THIRD_PARTY.md](THIRD_PARTY.md).
