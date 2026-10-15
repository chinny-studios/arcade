# Tokoyo — design notes

A survival sandbox in the mould of Valheim, set in Tokoyo (常世), the eternal land of Japanese myth.
You died; Yatagarasu, the three-legged crow, carried your soul here. The kami of the islands have run
wild. Survive, build, and calm them.

## Scope (first version)

Two biomes on a seeded island world, two bosses, the full early-game loop:

| Biome | Where | Creatures | Resources |
| :--- | :--- | :--- | :--- |
| **Satoyama** (meadows) | middle of the main island | deer, boar, lesser gaki, kappa by the water | wood, stone, flint, susuki straw, bamboo, strawberries, yomogi, hinoki (bronze axe) |
| **Sugi no Mori** (cedar forest) | outer ring of the main island and all the satellite isles | gaki, gaki brutes and shamans, oni, ochimusha at night and in haunted shrines | cedar heartwood, resin, copper (big rocks), tin (forest shores), kokemomo, matsutake |

Progression: hand tools → workbench (needs a roof) → **Shirokiba**, the white boar god (offer 2 boar tusks at
its shrine; an ema plaque in the meadows reveals the way) → tusk pickaxe → copper & tin → charcoal kiln + tatara
furnace (needs hi-no-tama from haunted shrines) → forge → bronze → raft across the sea → **Ōsugi**, the elder
cedar on Shinboku isle (offer 3 kami seeds from cursed hokora). Each boss trophy offered at the spirit shrine
grants a blessing (F). After Shirokiba, night parades (Hyakki Yagyō) may raid a base.

## Systems

- **World** (`04_world.js`): 2048 m square, 1 m heightfield from a 4 m coarse field plus fine noise. Islands are
  noise-warped discs; forest-ness is a smooth field; meadow ponds sit at sea level. POIs are placed on the coarse
  field and flattened. Terrain is 64 m chunks with four LODs and skirts. Edits (hoe, pickaxe) write to the
  heightfield and are saved sparsely. Paint channel: dirt, paved stone.
- **Nature** (`06_nature.js`): trees, rocks, ore and pickables are generated per chunk from the seed and merged
  into one mesh per chunk (near: detailed with wind sway; far: low-poly). Removed ids are saved. Felled trees
  fall, then split into logs; logs give the wood. Rocks drop a share each time a chunk breaks off.
- **Player** (`11_player.js`): third-person over-the-shoulder camera, stamina for running, jumping, attacks,
  blocking, dodging and swimming. Collision is capsule vs. terrain, oriented boxes (pieces), cylinders (trees,
  rocks) and big creatures. Skills improve with use; death costs 5 %.
- **Combat** (`12_combat.js`): 3-hit combos, secondary attacks (MMB: sword lunge, axe/club heavy, spear throw),
  bows with draw time, blocking with parry window (0.25 s), stagger, sneak attacks ×3 (knives ×10), damage types
  with creature resistances, Valheim's armour formula.
- **Building** (`13_build.js`): pieces have local colliders and snap points. The ghost snaps by testing pairs of
  snap points, skipping placements that overlap, and scoring by distance to the aim point plus how many snap
  points line up; walls, doors and beams also try the 90° turn. Structural support propagates from grounded
  pieces with per-material loss (wood: 12.5 % vertical, 20 % horizontal; stone can't overhang); unsupported
  pieces collapse and drop two thirds of their materials. T shows the support colours.
- **Survival** (`15_survival.js`): three food slots raise max health & stamina; Rested (comfort-based length)
  from sitting by a fire under a roof for 20 s; Wet (rain without shelter or a mino cape), Cold (night or wet in
  the forest, away from fire). Death leaves a grave marker with everything you carried.
- **Creatures** (`14_mobs.js`): sight & hearing perception (sneak and night matter), wander / chase / flee,
  ranged creatures keep their distance, stuck chasers break through walls. Star levels (★, ★★). Bosses have
  telegraphed area attacks.
- **Events** (`16_events.js`): POIs with colliders derived from their models, spawners (bone piles, hokora),
  urns and chests, boss altars, night parades, the crow guide's hints.
- **Saving** (`19_save.js`): localStorage autosave every 2 minutes, on sleep, boss kills and page hide;
  export/import JSON from the pause menu.

## Modules

`01_core` helpers, noise, model builder, input · `02_data` items, recipes, pieces, creatures, hints ·
`03_render` renderer, sky dome, light pool · `04_world` · `05_models` all low-poly models and rigs ·
`06_nature` · `07_sky` time, weather, fog · `08_fx` particles · `09_audio` procedural sound & music ·
`10_items` inventory, crafting, food, skills, drops · `11_player` · `12_combat` · `13_build` · `14_mobs` ·
`15_survival` · `16_events` · `17_hud` · `18_ui` · `19_save` · `20_main` loop & `#debug` hook.

Everything is concatenated in file order into one IIFE by `build.py`.
