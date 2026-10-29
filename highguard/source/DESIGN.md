# Highguard: design notes

Capital ship battles in the style of the opening space battle of a certain 2005 film, in an original setting: the
Concord's home fleet (grey hulls, blue engines and bolts) defends the city world Aster against the Hegemony (sand
hulls, orange engines and bolts). Choices made with the owner: the player captains one capital ship, full 3D with the
planet below, a short hand-built campaign, two rival human navies, squadrons launched from the hangar and given orders,
player-aimed broadsides with automatic point defence, shield facings plus targetable subsystems, mouse and keyboard
only, heavy but responsive handling, and a fixed ship per mission (nothing carries over except unlocks and grades).

## Files (all share one scope; load order is the number)

| File | What it owns |
| :--- | :--- |
| `01_core` | math, seeded `rand`, `dirFrom`/`yawOf`/`pitchOf`, `leadPoint`, `settings` (`highguard.settings`), `progress` (`highguard.progress`), `G` |
| `02_data` | `CLASSES` (stats per hull), `CLASS_NAMES` per navy, `SUBSYS`, `CRAFT`, `TORP`, `MISSIONS` (spawns, objectives, briefings) |
| `03_input` | `Input`: keys, mouse buttons `M0`/`M2`, `hit`/`up`/`heldFor` (tap vs hold), pointer lock |
| `04_audio` | `Sfx`: synthesized batteries, blasters, flak, shield and hull hits, explosions, torpedoes, jumps, engine rumble |
| `05_render` | `R`: renderer, two-pass draw (background scene at 1/100 scale: stars, nebula, sun, planet, clouds, atmosphere) |
| `06_fx` | `Fx`: additive and smoke particle pools, per-frame glows, instanced bolts, `makeShieldMesh` |
| `07_models` | `Models.ship(cls, team)` / `Models.craft(type, team)`: procedural hulls from boxes, wedges and cylinders |
| `08_ship` | `Ship`: flight, shields, subsystems, batteries, ripple fire, torpedoes, flak, damage, breaking apart, jumps |
| `09_craft` | `Craft` (fighters, bombers, the boarding shuttle) and `Squadron` (hangar, launch, orders, rearm, rebuild) |
| `10_combat` | `Combat`: bolts, pre-resolved craft shots and flak, homing torpedoes |
| `11_ai` | `ShipAI`: target choice, broadside steering, shield facing, gunnery, squadron orders |
| `12_mission` | `Mission`: spawning, jump-in queue, collisions, events, objectives, tips, grades, the title-screen demo battle |
| `13_player` | `PC`: helm, sight and gunnery, targeting, shields, squadron keys, chase camera; `Cine` (title camera) |
| `14_hud` | `Hud`: DOM panels, shield diagrams, overlay canvas (brackets, craft, lead marker, sight, radar) |
| `15_ui` | `Ui`: title, campaign and briefing, help, settings, pause, results |
| `16_main` | boot, frame loop, `window.HG` debug hook |

## Conventions

- Metres and seconds. Y is up. A ship's local frame: bow +z, up +y, **port +x**, starboard −x. Ship `yaw` turns the
  bow toward +x as it grows; `pitch` is nose-up positive, limited to ±0.85 rad. `root.rotation = (-pitch, yaw, roll, 'YXZ')`.
- `ship.toWorld(local)`, `ship.toLocal(world)`, `ship.dirToLocal(dir)` convert; models keep subsystems, guns, tubes,
  nozzles, beacons and the hangar in ship-local coordinates.
- `rand` is `Math.random` unless `Mission.start(i, {seed})` seeds it. Models use their own fixed generator, so a
  class always looks the same.
- `G.simming` is set while fast-forwarding: no particles, sound, ribbons or banners.
- Timed mission events use `Mission.later(seconds, fn)` (mission time), never `setTimeout`, so `sim()` stays exact.

## Rules and numbers

- **Flight:** throttle in six steps (`THROTTLE`, −25% to full). Speed approaches the setting at the class `accel`;
  yaw and pitch rates ramp to the class limit in about a second. Velocity lags the bow a little (drift). Engines
  knocked out: 25% speed and 40% turn rate.
- **Batteries:** port and starboard batteries bear when the aim point is 15–165° off the bow on that side
  (local x/|d| > 0.26); bow guns within 30° of the bow. Range 3.4 km, bolts at 1150 m/s. Each gun fires once per
  reload, rippled over half a second, at the aim point plus Gaussian spread (player 0.0011 rad, AI 0.0105–0.012).
  The station's ring batteries cover nearly all round.
- **Hits:** capital bolts are tested every frame against the target's hit boxes (the main hull parts plus a box per
  subsystem). No friendly fire. Small-craft shots and flak decide hit or miss when fired; damage lands when the
  visible bolt arrives.
- **Shields:** four facings (fore, aft, port, starboard), picked from the hit point. Base capacity per facing is the
  class `shield`; reinforcing one makes it ×1.6 and the others ×0.8, keeping each facing's fraction. A facing
  regenerates 5.5% of base per second after 3.2 s without a hit. Torpedoes only half-hit shields: the rest goes
  through to the hull. A dead shield generator stops regeneration and the shields bleed away at 12%/s.
- **Subsystems:** hull damage at a point also hits any subsystem within its radius (gun hits ×1.6). Subsystem HP is a
  share of hull (`SUBSYS`). Effects: engines (crawl), shield generator (above), port/starboard battery (silent),
  hangar (no launch, landing or rebuild), bridge (AI aim ×3.5 worse and no squadron orders; the player loses target
  lock and the lead marker). The player's damage control restores a knocked-out system after 35 s at 35% and slowly
  heals damaged ones.
- **Player toughness:** the player's ship takes 68% of incoming damage (a veteran crew), so it survives the AI's
  habit of shooting the most valuable target. AI target choice divides by `1 + 0.45 × ships already on that target`.
- **Squadrons:** interceptors 6, bombers 4, rebuilt one craft per 16 s when the hangar is intact, at most 60 craft
  a side in flight. Orders: escort (guard a ship, chase anything near it, bombers first), attack (bombers make
  torpedo runs on the chosen subsystem, interceptors clear fighters near the target, then strafe it), recall. Bombers
  come home when their two torpedoes are spent and relaunch after 7 s while the order stands.
- **Torpedoes:** 290 m/s, home at 1.1 rad/s, 460 damage, 25 HP (flak shoots them down). Player tubes: a salvo from
  every tube at the target if it is within 3.6 km and roughly ahead, 26 s reload.
- **Collisions:** touching hulls push apart and grind each other (shields first).
- **Grades:** on a win, 40 + hull × 35 + time bonus (par / time) × 15 + allies alive × 10; S ≥ 92, A ≥ 80, B ≥ 65.

## Missions

`MISSIONS` in `02_data` holds each battle: the player's ship and squadrons, allies, enemies (with `jump` times for
waves), and `obj.kind`: `destroyAll`, `carrier` (protect the `convoy` tenders until `escapeAt`, kill the `target`),
`survive` (keep `protect` alive for `time`), `destroyTag` (kill every `target`), `board` (disable the `flagship`,
which allies won't shoot, then a shuttle docks for `dockTime`). Spawn extras: `name`, `tag`, `throttle` (an opening
cruise held until the lines meet), `hull` (multiplier), `squads` (player only).

## Ideas not done

- Gamepad and touch controls; a skirmish mode with chosen fleets; per-gun turret animation; visible hull damage decals;
  capital ships falling into the planet's atmosphere; voiced radio chatter.
