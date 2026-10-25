# Shot Heard — design notes

A Battlefield-style first-person battle game set in the American Revolution. One self-contained page: three.js r128
inlined, all models built in code, all sound synthesized. The player is one of 32 (or 16, or 24) men a side; everyone
else is a bot.

## Choices made with the owner

- Modes: **Conquest** and **Breakthrough**, on the same four maps.
- **32 v 32** by default (16 and 24 in the setup screen).
- **Both sides playable**: Patriots (militia in 1775, Continentals later) and the Crown (with Hessians at Saratoga and
  Yorktown).
- **Authentic-ish musketry**: a musket loads in about 14 s, a rifle about 20 s, through the real drill; smoothbores are
  inaccurate at range; smoke blocks sight; the bayonet matters. A "Brisk" setting loads 1.6× faster.
- **Five classes**: Line Infantry, Rifleman, Artilleryman, Officer, Surgeon.
- **Vehicles**: field guns, horses, gunboats.
- **Maps**: Lexington & Concord, Bunker Hill, Saratoga, Yorktown.
- First person; moderate destruction (walls, fences, gabions and house panels break, roofs fall in, craters stay);
  everything unlocked; mouse and keyboard or gamepad; a painterly low-poly look.

## Modules (`src/`, concatenated in order into one scope)

| File | What it holds |
| --- | --- |
| `01_core.js` | maths, seeded RNG, noise, polyline helpers, `mergeParts` geometry, input (keys, mouse, Gamepad API), settings |
| `02_data.js` | teams, weapons, the loading drills, melee, gadgets, classes, uniforms (`dressFor`) and names |
| `03_maps.js` | the four maps as data (terrain function, rivers, ravines, works, trenches, roads, fields, forests, walls, buildings, flags, HQs, sectors, guns, horses, ships) and light presets |
| `04_render.js` | renderer, sky shader, light presets, colour-grade post pass (warmth, soft smear, vignette, grain, hurt tint), the separate viewmodel scene |
| `05_terrain.js` | heightfield (2 m), earthwork and trench profiles, building pads, ground colours, water, far country, craters, nav grid, Dijkstra flow fields |
| `06_world.js` | colliders and ray casts (spatial hash, DDA), chunked instanced structures, breakable pieces, houses of panels, walls and fences, gabions, bridges, trees, camps, debris |
| `07_models.js` | weapon geometry, the instanced soldier kit and its pose (two-bone IK arms), horses, field guns, gunboats, flags |
| `08_fx.js` | instanced billboard particles, the smoke density grid that blinds bots, effect recipes, fires, camera shake |
| `09_audio.js` | Web Audio: musketry with distance delay, cannon, whizz, impacts, drill clicks, hooves, crowd shouts, ambience, fife and drum tunes |
| `10_combat.js` | musket balls and buckshot, round shot and canister, grenades, powder kegs, explosions, melee |
| `11_soldier.js` | soldier state, movement physics, mantling, the drill, firing, wounds and revives, corpses, animation |
| `12_player.js` | player input, camera, gadgets, spotting and squad orders, interaction, the first-person viewmodel |
| `13_ai.js` | squads, objectives, perception, fighting, charging, class tasks |
| `14_vehicles.js` | guns, horses, gunboats, and their bot drivers |
| `15_modes.js` | match setup, flags and capture, tickets and bleed, sectors, spawn points, scoring, officers' colours |
| `16_hud.js` | map image, minimap, compass, markers, crosshair, DOM panels, scoreboard |
| `17_ui.js` | screens: title, setup, deploy, pause, end, settings, help |
| `18_main.js` | loop, cameras, quality, boot, `window.SH` |

## Combat numbers

- Health 100. A body hit from any musket downs a man (100 damage, 75 for legs, 220 for the head) out to the weapon's
  range; past it damage falls slowly to 75 %. Spread is a cone in degrees (`spread` aimed, `hip` from the hip), widened
  by movement, narrowed by crouching, with most balls near the line of aim.
- **Volley:** line infantry who fire within 1.4 s of two friends nearby fly 38 % tighter.
- **Drill** (`DRILLS`): each step is a fraction of the weapon's `reload`. Running, melee, mounting or deep water pause
  it; walking slows you to 1.7 m/s. Officers' colours within 14 m load 15 % faster.
- **Wounded:** a downed man bleeds out in 12 s unless a surgeon revives him (to 45 hp). A ticket is spent only when he
  dies. Headshots, round shot and big blasts kill outright. Health regenerates after 14 s out of harm.
- **Misfire:** 3.5 % of shots flash in the pan and need 1.4 s to reprime.
- **Melee:** bayonet 100 (reach 2.5 m), sword 75, hanger 65, tomahawk 70, knife 50, musket butt 55, cavalry sabre 100.
  Charging or striking from behind hits harder.
- **Guns:** round shot at 165 m/s bounces through ranks and breaks pieces (fences and planks let it through, stone and
  earth stop it); canister fires 28 balls. Reload 9 s for an artilleryman, 16 s for anyone else.

## Bots

- **Squads** of five pick an objective flag every 12–20 s (`squadObjective`), spread across flags in Conquest; in
  Breakthrough the attackers mass on one uncaptured flag and leave one squad on each flag already taken.
- **Movement** follows a per-flag Dijkstra flow field over a 2 m nav grid (low walls cost a vault, tall ones block,
  bridge decks open rivers). The fields are rebuilt every 6 s after something breaks. Stuck bots vault, then sidestep.
- **Perception** every 0.25–0.45 s: range 150 m (rifles 230 m) times difficulty; terrain, sight-blocking colliders, the
  smoke grid and woodland all hide men; spotted enemies are seen further.
- **Fighting:** beyond their piece's useful range they advance. When loaded they aim (with skill error and gravity
  compensation) and fire, line infantry in squad volleys. When empty and close they charge with the bayonet. Otherwise
  they load, crouching where there is cover.
- **Classes:** surgeons run to the wounded, artillerymen crew nearby guns, officers plant colours near the objective,
  line infantry throw grenades, a few riders take horses, and one sailor a side takes the gunboat.
- **Difficulty** (`DIFF`): aim time, aim error, reaction time and sight range.

## Modes

- **Conquest:** each side starts with the two flags nearest its HQ; the middle one is open. Death costs a ticket. The
  side holding fewer flags bleeds 0.12 tickets per second per flag of difference (more if it holds none).
- **Breakthrough:** sectors from `map.breakthrough`. Only the active sector can be captured; when the attackers hold
  all of it, the next sector opens, the attackers gain tickets and a forward assembly spawn moves up. Defenders have
  unlimited tickets but slower respawns.
- Spawn points: HQ, owned flags (not while under attack), officers' colours, squadmates out of combat, a free horse,
  a free gunboat, and in Breakthrough the attackers' forward assembly.

## Rendering

- Painterly look: vertex-coloured Lambert shading, soft fog that matches the sky's horizon, warm colour grade, a light
  smear in flat areas, vignette and paper grain (`postMat`). Picture "Fast" drops the post pass and lowers resolution.
- Instancing everywhere: soldiers are about 21 InstancedMeshes in all, structures and trees are chunked by 160 m so
  the camera and shadow frustums cull them, and the terrain is a 4 × 4 grid over one set of buffers.
- The camera far plane sits just beyond the fog.

## Ideas for later

- Night assault variant of Yorktown; Trenton in snow; a naval map with frigates.
- Bots that use houses (firing from windows).
- More drill animation for the third-person soldiers (priming, biting) and a proper ragdoll.
- Touch controls.
