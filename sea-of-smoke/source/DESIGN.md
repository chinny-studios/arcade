# Sea of Smoke: design notes

World of Warships with sailing ships. Two pirate fleets (Brethren of the Coast, black flag; the Red Flag) of seven
ships each fight a domination battle among Caribbean islands, 1715. Grounded: no magic, light wind, real ship types.
Choices made with the owner: 3D chase camera, team battles vs AI, no progression, Golden Age setting, light wind,
broadsides with three kinds of shot, boarding, fire and flooding, fireships, forts and weather, mouse/keyboard and
gamepad, all five classes, three maps, 8–10 minute battles.

## Files (all share one scope; load order is the number)

| File | What it owns |
| :--- | :--- |
| `01_core` | math, seeded `rand`, value noise (`vnoise`, `fbm`, `noiseSeed`), `settings` (localStorage `sea-of-smoke.settings`), `G` |
| `02_data` | `CLASSES`, `AMMO`, `SPECIALS`, `FIRE`/`LEAK`/`REPAIR`, `MAPS`, `FLEET`, `MATCH` (rules and timings) |
| `03_input` | `Input`: keys, mouse buttons `M0`/`M2`, pointer lock, gamepad buttons `P0`..`P16` and sticks |
| `04_audio` | `Sfx`: synthesized cannon (delayed by distance at 343 m/s), splashes, cracks, bells, clash, sea/wind/rain/fire loops |
| `05_render` | `R` (renderer, sky shader, water shader, `R.setLook(map, squall)`), `waveH(x, z)`, `Fx` particle pools and recipes |
| `06_world` | `World`: heightmap islands and reefs, terrain mesh, palms, forts, minimap canvas, nav grid and A* (`World.path`) |
| `07_shipmodel` | `buildShip(cls, {team, strake})`: lofted hull, gun ports, masts, sails, flags; `flagTex(team)` |
| `08_ship` | `Ship`: sailing physics, grounding, reloads, damage, fires, leaks, consumables, boarding and capture |
| `09_combat` | `Combat`: ripple-fired balls (`queueShot`, `spawnBall`), hit tests, fire rafts, smoke clouds, `leadPoint` |
| `10_ai` | `Bot`: modes cap / hunt / engage / board / raft / ram / retreat, steering with land probes, gunnery, consumables |
| `11_match` | `Match`: setup, spotting, caps, forts, collisions, weather, points, end of battle |
| `12_player` | `PC`: helm and weapons from input, aim point, target pick, spectating, chase camera and spyglass |
| `13_hud` | `Hud`: DOM panels, overlay canvas (markers, reticle, batteries, lead marker, raft fan), minimap and chart |
| `14_ui` | `Ui`: title, port (ship and map choice), help, settings, pause, results, fast-forward after sinking |
| `15_main` | boot, frame loop, `window.SS` debug hook |

## Conventions

- Metres and seconds. Heading h: bow along (sin h, 0, cos h); starboard is (-cos h, 0, sin h); increasing h turns
  to port. Ship local frame: bow +z, port +x. `ship.wx/wz(lx, lz)` and `ship.lx/lz(x, z)` convert.
- Speeds are game speeds (a frigate does 16.5 m/s); the HUD shows knots as `v × 0.55` so they read as period figures.
- `rand` is `Math.random` unless `Match.start({seed})` seeds it.
- `G.simming` is set while fast-forwarding: no particles, no sound, no ribbons.

## Rules and numbers

- **Sailing:** `tele` −1 (backed, 25% astern), 0 (heave to), 1–4 quarter to full. Top speed × light-wind factor
  (0.95–1.05 by point of sail) × sails (30% + 70% × sail health) × leaks (−8% each). Turning circle `turnR` is fixed;
  the rudder takes `rudderT` to go hard over. Land deeper than −0.75 × draft grounds the ship (damage above 30% speed).
  Reefs on The Bones sit at −2 m: sloops (1.8 m) and fireships (1.4 m) cross them, everything else runs aground.
- **Gunnery:** a battery fires when loaded and the aim point lies in its arc (broadsides 40–140° off the bow, bow
  chasers ±38°, stern chasers beyond 148°). Each gun's ball is solved (low arc, g = 20) to pass over the aim point at
  `AIM_H` (round shot 2 m up the hull side, chain shot 12 m through the rigging, grapeshot 3.5 m across the decks) plus
  Gaussian dispersion (`0.016 × range + 2` m, ×1.7 along the line of fire, × class, ammo, lookout, squall). Guns ripple
  fire bow to stern over ~0.05 s each. Reload slows with crew below 65% and switching ammo costs half a reload.
- **Hits:** each ball segment is tested against the target's hull box (tapered by `halfW` at that point) and, once,
  against its sail box above deck (the ball flies on). Hull hits: hull damage, crew, fire chance, leak chance if near
  the waterline. Sail hits: sail health (chain ×2.4, brig chain ×1.35 more). Gunfire never takes a crew below 8%:
  only boarding finishes one. No friendly fire: balls pass through allies. Gun damage per ball: 6-pdr 66, swivel 38,
  9-pdr 102, 12-pdr 138, 24-pdr 198, fort 180.
- **Visible damage:** every hull hit stamps a shot hole on that side (80 per ship, oldest reused); the hull darkens
  to 40% as it is battered, lists up to 0.13 rad toward the side that took more shot (more with leaks) and settles by
  up to 28% of its freeboard; below 55% hull a ship trails smoke. On ships with two or more masts a mast falls over
  the side when sails drop below 38% and again below 17% (never the last), and the sails can then only be mended to
  70% (40% with two down). Bigger splinter bursts and a flash on every hit; your own hits thud at any range.
- **Critical hits:** 2% of hull hits dismount the battery on that side (or bow/stern chasers at the ends) for 30 s,
  halving its reload rate, or jam the rudder for 9 s if they strike the stern quarter. 1.2% of chain-shot sail hits
  (0.5% for other shot) bring a mast down outright. The repair party clears dismounted guns and a jammed rudder.
- **Fire / leaks:** up to 3 fires (bow, waist, stern) at 0.28% hull/s for 35 s; up to 2 leaks at 0.28%/s for 30 s.
  The repair party (R) puts both out and heals 0.6%/s for 14 s.
- **Specials (T):** smoke pots (sloop, fireship), studding sails (brig, +16% speed), lookout aloft (frigate, +35%
  spotting, tighter aim), rally the crew (man-o'-war, +25% reload, +40% boarding strength).
- **Fireship:** fire rafts (weapon 4): three burning boats in a 10° fan, 15 m/s, 760 m, 4000 damage and two fires
  each. Y sets her alight for 30 s (+15% speed); touching an enemy then explodes for 7500 and three fires, and the
  fireship is spent. If the 30 s run out she burns to the waterline.
- **Boarding (G):** within 18 m of the enemy's side, relative speed under 8 m/s, and the enemy either below 40% hull,
  below 30% crew, or outnumbered 1.4 : 1 in strength. Each second both crews lose men in proportion to the other's
  strength (the defender gets +15%). Capture when the defender falls under 10% crew; driven off if the attackers fall
  to 55% of their starting number or after 22 s. A captured ship changes flag and fights for the captor, with a prize
  crew of up to 30% of the attacker's men.
- **Spotting:** a ship is seen by the enemy within its `conceal` range of any enemy ship (or owned, unsilenced fort at
  700 m). Firing raises that to 110% of gun range for 15 s; fire aboard ×1.15, a lit fireship 1300 m; the squall
  ×0.55, fog banks up to ×0.5 (either end); lookout ×1.35. Smoke screens block sight lines beyond 150 m. Unspotted
  enemies are not drawn and have no marker.
- **Points:** both fleets start at 300. Each held point adds 3 every 5 s. A ship sunk costs her fleet 90% of her
  `value` and gives the other 60% (a spent fireship gives nothing); a ship captured moves her full value across.
  Win at 1000, when the enemy reaches 0, when the enemy fleet is all sunk, or on points after 9 minutes.
- **Caps:** 220 m radius, 40 s for one ship (up to ×1.5 for more), paused while contested, enemy progress is undone
  first. A point with a fort hands the fort to its holder: four 24-pounders, 680 m, 12 s reload each. Round shot
  silences a fort (3500) for 60 s.
- **Weather:** a squall at 2.5–4.5 minutes lasting 85 s darkens the sky, thickens fog, raises the swell, adds rain and
  halves spotting. Fog banks drift with the wind.

## AI

Bots think every 0.5 s. Target: nearest spotted enemy, weighted toward damaged ships and close fireships. Modes:
`engage` orbits the target at 60–72% of gun range on the side needing less helm; `cap` goes to the nearest point not
held (spread out by a per-bot bias and how many allies already go there) and circles it; `hunt` heads for the last
place an enemy was seen; `board` closes alongside a weakened or outnumbered enemy; `raft` (fireship) closes to raft
range and launches with lead; `ram` (lit fireship) steers at the target; `retreat` when nearly sunk without repairs.
Steering probes the heading ahead and tries ±20° steps until clear, avoids ships ahead, dodges incoming rafts, and
backs off when stuck. Paths come from A* on a 104×104 grid built per draft, with big ships kept two cells off shore.

## Ideas not done

Ship-of-the-line formations and divisions, a minimap ping, chat callouts from bots, wind affecting raft drift,
masts falling when sails are shot away, a night map with lanterns, touch controls.
