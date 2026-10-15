# Apogee: design notes

## What it is copying

The 1997 console spy shooter: mission folders and a typed briefing, objectives that grow with the difficulty
(Agent / Secret Agent / Orbital Agent), guards that flinch differently depending on where they are hit and lose their
hats, alarm panels that bring reinforcements until they're shot, a wristwatch pause menu, a debrief with accuracy and
hit locations. The setting is original (no film names, characters or maps): a private aerospace company in 1967-68 builds
HELIOS, an orbital mirror that can burn cities.

## The N64 look (03_render.js)

- Everything renders into a 320×240 target (640×480 with the "expansion pak" option, or 16:9 widths). A full-screen pass
  stretches it with bilinear filtering and a slight horizontal blur, standing in for the VI filter.
- One shader for everything. Textures are 32×32 tiles in one 512² atlas painted at load (02_textures.js). The fragment
  shader wraps texel coordinates inside the tile and blends three texels (the RDP's 3-point filter). It picks one of
  three mip atlases from the UV derivatives, so distant surfaces get the same soft, popping mips.
- Light is Gouraud only. Level vertices bake ambient (indoor or outdoor), a ray-marched sun with shadows, point lights
  with grid line of sight, and a little corner occlusion (04_level.js `lightAt`). People, doors and pickups are lit per
  vertex in the shader from a per-cell light grid plus the sun.
- Linear fog, then 5 bits per channel with a 4×4 ordered dither.
- No vertex snapping or affine warping. That is the PlayStation look, not the N64's.

## Levels (04_level.js, 05_props.js, 06_levels.js)

- 2 m cells. Walls are full cells. Doors and windows are cells with their own floor and "ceiling" (a sill and a lintel),
  so one rule set makes jambs, lintels, steps and sills. Faces are split into ≤2 m bands so the vertex light has detail.
- Doors slide up. The player opens them by walking into them or pressing E, and guards open them on their paths.
  Locked doors name a key item in `locks`.
- Props (crates, barrels, consoles, alarm panels, objective machines, rockets, shuttles) register an AABB in every cell
  they touch. Bullets, sight lines, feet and the sun's shadow all use those boxes.
- One grid ray caster answers bullets, sight (`{ sight: true }` sees through intact glass) and use targets. Rays test
  people separately against each body part's oriented box, which is where head, hat, arm, leg and groin hits come from.

## People (08_actors.js, 09_ai.js)

- Box parts on a joint hierarchy, with poses mixed from a base action (idle, walk, run, aim, kneel, surrender, cower),
  an additive hit reaction for the part that was hit, and a scripted fall for each kind of death (back, front, spin,
  crumple, side).
- Perception happens every ~0.2 s. Sight range depends on fog distance, darkness at the player's cell and crouching.
  Idle guards have a narrow view cone. Noise events (gunfire, glass, explosions) carry by weapon: the silenced PK-9
  carries 5 m.
- Spotted guards may run to the nearest alarm panel. An alarm tints the light, sounds a klaxon and spawns
  reinforcements at `r` points out of sight, until a panel is shot or switched off, or 75 s pass.
- Each guard's first shot misses on purpose. After that, hit chance depends on difficulty, range, your speed,
  crouching and kneeling.

## Tuning knobs

`DIFF` in 01_core.js (damage to the player, guard accuracy, reaction time, guard health, ammo), `WEAPONS` in
10_weapons.js (player and guard damage, rate, spread, noise radius), `ACTOR_TYPES` in 06_levels.js (health multiplier,
weapon, chance to run for the alarm).

## Ideas not done yet

A fly-by camera intro for each mission, unlockable cheats for target times, multiplayer split-screen, more missions
(the shuttle launch itself, Kessler's mountain HQ), guards that notice bodies, grenades.
