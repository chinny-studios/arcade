# Farhold — design notes

A seamless procedural universe in the mould of No Man's Sky. You wake beside a crashed ship on a hostile world,
repair it from what you can mine and harvest, fly from the ground to orbit without a loading screen, and follow a
signal from the rim of the galaxy to **Farhold**, the system at its core.

## Scale and frames of reference

- **Galaxy** (`05_universe.js`): ~420 stars in a three-armed spiral, 3,000 ly across. You start on the rim at a yellow
  star; Farhold sits at the centre. Star class gates travel: red, green and blue stars need the Cadmium, Emeril and
  Indium drives. Base warp range is 600 ly (the Warp Reactor adds 80%), so the core is five or six jumps away.
- **Star systems**: 2–5 planets (plus the odd moon) 40–150 km from the star, one space station, 2–4 asteroid fields,
  NPC traffic, an economy and a conflict level that drives pirate encounters.
- **Planets** are real spheres of 1.6–2.6 km radius (moons ~1 km) with up to ~170 m of relief. Each is a
  `THREE.Group` that **spins** (day length 15–25 min, axial tilt), so day and night come from rotation, not from moving
  the sun. Everything on a planet (terrain, flora, creatures, POIs, bases, the landed ship, particles) lives in the
  planet's local frame.
- **Frames** (`07_world.js`): the player and ship each have a frame — a planet (radial gravity), the station (flat
  gravity) or open space (none). Positions are frame-local doubles; three.js composes model-view matrices in double
  precision, so world coordinates of 100+ km render without jitter. The ship hands over between a planet frame and
  open space at 2.3 R; docking hands it to the station frame.
- **Depth**: logarithmic depth buffer, near 0.08 m / far 6,000 km.

## Terrain

- `02_kernel.js` holds a self-contained kernel (seeded 3D simplex noise, height and colour functions, chunk builder)
  that runs on the main thread for collisions and, via `Function.toString`, inside 1–3 Web Workers for meshing.
- Height = domain-warped continents + ridged mountains + hills, with per-archetype extras: terraces (mesas),
  canyons, crater fields (jittered lattice bowls with rims), spikes (exotic worlds), plus 10 m and 2 m detail.
  POIs flatten a disc around themselves inside the height function.
- Cube-sphere (tangent-warped) quadtree, 6 roots per planet, leaves ~30 m with 16/24/32 segments by quality.
  Skirts hide cracks. Chunks below sea level also emit a water grid (Phong, depth-faded, animated normals).
- Colour is per vertex from a generated pulp palette (grass, rock, sand, snow, seabed) by moisture, altitude and
  slope; a triplanar noise texture adds close-up detail in the fragment shader.

## Sky

- Atmosphere shell per planet: 8-sample optical depth along the view ray with exponential falloff; zenith/horizon/
  sunset colours from the palette, sun glow, storm tint. From orbit the planet gets limb haze and a rim. Cloud shell
  from a tiled noise texture. Scene fog matches the horizon colour and thins with altitude.
- Starfield and nebula follow the camera (drawn first, opaque list); the star is an additive billboard.

## Life

- **Flora & minerals** (`08_flora.js`): each planet generates 2–3 tree species and 2 bush species from its archetype's
  styles (round, conifer, palm, mushroom, bulb tree, crystal, dead tree, cactus, coral, spike, spiral, orb, tentacle,
  fern), plus rocks, boulders, metal deposits (the star's metal, cobalt, gold, silver), di-hydrogen crystals and
  pickable oxygen, sodium and biome-special plants. Objects are scattered per ~120 m surface cell (deterministic per
  planet/cell), merged into one mesh per cell (wind sway via a per-vertex attribute), with a low-detail version and
  small objects dropped beyond 150 m, and grass/pebbles near the player. Mining shrinks objects and yields
  progressively; removals are saved per planet.
- **Fauna** (`11_fauna.js`): 2–7 ground species and 0–2 flyers per living planet, assembled from body plans
  (quadruped, biped, hexapod, hopper, flyer) with random heads, horns, shells, spikes, tails and palettes. Temperament:
  docile, timid, defensive, predatory. Herds spawn around the player and walk on the sphere; they graze, flee, hunt
  and can be fed (10 carbon) for gifts.
- **Points of interest** (`18_poi.js`): trading posts (pads, terminal, NPC), shelters (blueprints, logs), drop pods
  (+1 exosuit slot), damaged machinery (nanites), ancient waystones (lore, relic shards), crashed ships (claim or
  salvage), supply caches. They are built with box colliders when within 1.5 km.

## Player and starship

- On foot (`13_player.js`): first/third person on a sphere (body re-aligned to local up every frame), sprint with
  stamina, jetpack, swimming, fall damage, sphere-vs-oriented-box collisions plus tree/rock cylinders.
- Multitool (`14_tool.js`): mining beam (heat/overheat), bolt caster (clip, reload with ferrite), scanner pulse
  (marks the nearest of each resource kind and reveals structures), analysis visor (study species), melee.
- Starship (`15_ship.js`): take-off (25% lift fuel unless on a pad), arcade flight with a springy virtual stick,
  roll, auto-levelling in atmosphere, hover near the ground, boost, terrain bumping, re-entry flames, pulse drive in
  space (jammed by pirates, drops out near bodies), cannon with heat and aim assist, auto-landing (pads preferred),
  chase or cockpit camera. Four hull classes: shuttle, fighter, explorer, hauler.
- Space (`16_space.js`): the station has a hangar you fly into (auto-docking path to a free pad), walk around and
  trade in; asteroid fields (instanced, mineable for tritium); pirate ambushes; NPC traffic; warp with a hyperspace
  tunnel.

## Systems

- Survival (`20_survival.js`): life support (~22 min), hazard protection drained by heat, cold, toxins or radiation
  in proportion to how extreme it is, storms (×4 and a temperature spike), shelter detection (roof + walls) in bases,
  buildings, the ship and the station; shields regenerate. Storm crystals appear during storms.
- Items (`03_data.js`, `12_items.js`): ~25 elements, a dozen products, refining recipes, crafted warp cells,
  inventories with stacks (ship cargo stacks double), recharging from the quick menu, market prices by economy.
- Technology: exosuit, multitool and ship upgrades; blueprints from station merchants (nanites) and shelters.
- Sentinels (`17_sentinel.js`): patrols watch mining and hunting; wanted levels 1–5 send drone and quad waves; lose
  them by breaking line of sight for 22 s or by leaving in the ship.
- Discoveries (`21_discovery.js`): planets, fauna, flora and minerals give units when found and nanites when
  uploaded; everything can be renamed.
- Bases (`19_base.js`): a base computer claims 160 m; floors, walls, doorways, windows, roofs and ramps snap to a
  shared grid frame; devices: storage, refiner, landing pad, save beacon, teleporter (to bases and visited stations
  in any system), hydroponic tray, lights, banner.
- The journey (`22_quest.js`): the crash tutorial walks through mining, the scanner, oxygen, ship repairs, take-off,
  the station, selling, the warp drive and warp cells; SOLA, the ship's mind, comments as you travel inward. Reaching
  Farhold offers a new galaxy (keeping everything).
- Saving (`27_save.js`): localStorage autosave on leaving the ship, docking, warping and every 4 minutes; export and
  import from the pause menu.

## Modules

`01_core` helpers, model builder, input & actions · `02_kernel` terrain kernel & worker pool · `03_data` ·
`04_render` renderer, materials, stars, sun · `05_universe` galaxy, systems, palettes, POI placement ·
`06_planet` quadtree terrain, atmosphere, clouds, system loading · `07_world` frames, environment, weather ·
`08_flora` · `09_collide` · `10_models` · `11_fauna` · `12_items` · `13_player` · `14_tool` · `15_ship` ·
`16_space` · `17_sentinel` · `18_poi` · `19_base` · `20_survival` · `21_discovery` · `22_quest` · `23_audio`
procedural sound & generative score · `24_fx` · `25_hud` · `26_ui` · `27_save` · `28_main` loop & `#debug` hook.
