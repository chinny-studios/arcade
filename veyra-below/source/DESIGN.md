# Veyra Below — design notes

A dark sci-fi action RPG. The colony on Veyra went silent when the Founders' Spire erupted in violet light. You are a
warden from the second colony ship, the Meridian. You teleport down with up to three AI companions, fight through
sealed rooms, collect randomly rolled loot and work your way down to Kharzael, the thing that was buried under the planet.

## Structure

- **The ship** (`06_hub.js`): one hand-made deck. Each service is an NPC behind a counter: Commander Hale (story),
  Mira the Quartermaster (buy and sell), Old Bram the Artificer (appraise, hone, socket, fuse crystals), Ledger the
  Vault, Juno at the Wardens' Bureau (contracts), Dr. Pell's Sprite Lab, the Crew Terminal (recruit wardens) and Ines
  in the Medbay (heal, reset skills). The teleporter in the middle opens the descent menu.
- **Areas** (`AREAS` in `02_data.js`): Verdant Reach (wild forest), Cinder Hollows (volcanic caves), Deepworks
  (automated mines) and the Sunken Nave (a cathedral older than the colony). Each has two procedural floors and a boss
  floor. Beating a boss opens the next area; beating Kharzael opens the next difficulty. Every floor you reach becomes
  a waypoint.
- **Difficulties** (`DIFFS`): Initiate, Veteran, Ascendant and Apex add 0 / 28 / 52 / 72 monster levels and raise HP,
  damage, experience, drop quality and the chance of champion packs. Apex also brings "Gleaming" colour variants.

## Floors (`05_level.js`, `18_game.js`)

- 2 m tiles. A floor is a 4×4 grid of 15-tile slots: rooms grow along a random spanning tree with a loop or two, joined
  by L-shaped corridors (jogged in the organic areas). Forest and caves carve blobby rooms and draw walls as rocks and
  trees; mines and ruins carve rectangles with notched corners and draw block walls with a dark cap and light studs.
- Room types: `start` (pad home), `lock` (doors seal behind you, two or three teleported-in waves), `pack` (sleeping
  packs that wake when they see you), `treasure` (containers and a champion pack) and `exit` (a sealed fight that
  powers the teleporter onward). Door tiles are corridor tiles next to a room; fences sit on the room edge and block
  those tiles while the room is locked.
- Boss floors are an antechamber, a corridor and a round arena. The fences go up when you enter.
- Navigation: monsters and allies walk straight at their target when they can see it, otherwise down a BFS flow field
  from the target's tile (`updateFlow`/`flowDir`), refreshed when the target changes tile.
- Walls between the camera and the player shrink to stubs (`updateCutaway`), so you're never hidden.
- Leaving through a Recall Beacon or the Recall art keeps the floor in memory (`stashField`) so the portal on the ship
  takes you back to the same spot. Quitting or the start pad abandons the floor.

## Combat (`11_actors.js`, `12_combat.js`, `13_party.js`)

- Three attacks: normal, heavy (×1.8, slower, a little less accurate) and special (×1.5, costs a few PSI, triggers the
  weapon's special). Combos run three steps (×1, ×1.1, ×1.3). Pressing the next attack between 62% and 97% of the
  current swing is a **perfect** hit (+25%, more with Combo Mastery). Holding the button keeps swinging without the bonus.
- Hit chance uses ACC against monster evasion; heavy and special attacks miss more, later combo steps less. Monsters
  roll against your EVA; a dodge roll gives brief invulnerability.
- Damage: weapon roll × (1 + ATK/400) × attack multipliers × family tuning × crits. Arts scale with art level and PSY
  (`techPower`): an art of level *lv* hits like the monster curve at level (lv−1)×2.5+1, times PSY over the PSY a
  character of that level is expected to have. Arts cost about two casts per standard monster for a Psion at any level.
- Monster numbers: HP = def.hp × `LCURVE`(lvl) × (1 + lvl/80), attack = def.atk × `ECURVE`(lvl), with difficulty and
  party-size multipliers (+32% HP per ally). `test/balance.js` prints the curves.
- Status effects: burn and poison tick, freeze/paralysis/stun stop actions, slow, mark (+damage taken), enfeeble and
  expose. Bosses take a quarter of the duration of hard crowd control and get a few seconds of immunity after.
- Enemy attacks are data (`ENEMIES[id].attacks`): melee cones, pounces, charges, slams, projectiles, lobbed shots with
  burning pools, delayed bursts, summons, self-destructs and beams. Anything that can't be seen coming gets a red
  ground telegraph.
- Champion packs carry one or two modifiers (Swift, Mighty, Blazing, Frostbound, Stormcharged, Plated, Leeching,
  Phasing). Named uniques (gold) lead three minions and drop extra loot. Bureau bounties place a named unique.

## Bosses (`16_bosses.js`)

- **Vharn, the Rotwing** (forest): bites, tail sweeps, a fire-breath cone it drags toward you, charges and fireball
  fans. At 66% and 33% it takes off, rains telegraphed fire on everyone for a while, then slams down where you stand.
- **The Maw Below** (caves): surfaces to spit acid fans, slam and call grubs, then dives and tunnels toward someone,
  erupting under a telegraphed circle. Faster below half health.
- **CUSTODIAN-7** (mines): a shielded core with three turret pods that fire lasers. Kill the pods to drop the shield for
  12 seconds; they come back while it's above 40%. It sweeps a full-circle laser, electrifies patches of floor, calls
  drones and, below 40%, detaches and hunts you with homing missiles.
- **Kharzael, the Sleeper** (ruins): a scythe-armed giant that blinks, throws seeking orbs and calls penitents. Below
  55% it splits open into a heart that sweeps two or three dark beams across the arena, sends out shockwave rings to
  roll through, drops pillars of darkness on everyone and summons watching eyes.

## Characters (`10_stats.js`)

- Classes: **Vanguard** (melee), **Marksman** (guns), **Psion** (arts). Origins: **Human** (+XP, luck, every art),
  **Sylph** (more PSI and PSY, faster PSI regen, frail), **Construct** (tough, immune to poison and paralysis, lays
  snares, no support arts, attack arts at 60%).
- One skill point per level; three tiers of three skills per class (tiers open at levels 1/8/16 and 0/3/8 points spent).
- Arts are learned from art chips up to level 20 for Psions and 10 for the others. Radiance, Umbra, Enfeeble and
  Expose are Psion-only.
- Tonics raise stats permanently (120 per character).

## Loot (`09_items.js`, `17_loot.js`)

- Slots: weapon, armor, ward and two implants. Rarities: Standard, Enhanced (1–2 affixes), Exotic (3–6 affixes and a
  generated name), Ensemble (three four-piece sets with bonuses at two and four pieces), Legendary (fixed stats and flavour) and **Relic** (hand-made
  weapons with a special and family tuning, behind a red beam).
- Your **star sign** comes from the letters of your name. Each sign favours two weapon types for drops and makes
  certain relics five times more likely. Drops also lean toward weapons your class can use.
- Weapons can be honed (+3.5% damage per step, up to a limit) and can carry psi crystal sockets. Exotic and better
  finds arrive sealed and are appraised by the Artificer.
- Family tuning: weapons roll extra damage against Wild, Burrower, Mech or Eldritch foes (one family per area), or
  Keen (accuracy and crits).

## Sprites

- A floating companion fed with consumables (once every 40 s). Feeding raises Guard, Might, Agility and Insight (DEF,
  ATK, ACC/EVA, PSY) and Bond (overdrive charge rate). It evolves at levels 10 (by class), 35 (by its strongest stat)
  and 60 (by class), learning an overdrive each time: Nova Burst, Seeker Swarm, Seraph Rain or Aegis Field. The
  overdrive charges from damage dealt and taken; R (LB, or tap the gauge) unleashes it.

## Allies (`14_allies.js`)

- Recruited at the Crew Terminal (new faces each visit), they level with you and use generated average gear. Psions
  heal with Mend below 55%, buff with Fervor and Bulwark, revive with Rekindle and pick arts by monster weakness and
  crowding. Everyone else revives with two Revive Shots per floor. They step out of telegraphed attacks, follow in
  formation, teleport to you if left far behind and chat in one of three personalities.

## Audio (`08_audio.js`)

- Every sound is synthesised. Music is generated bar by bar per area (scale, chord progression, pad, bass, arpeggio,
  sparse lead, drums) and gets louder drums in combat.

## Saves

- Three slots in `localStorage` under `veyrabelow.saves.v1`; options under `veyrabelow.opts.v1`. Saved when you board
  the ship, every minute on board, and on quit. Floors aren't saved: quitting on Veyra puts you back on the ship.
