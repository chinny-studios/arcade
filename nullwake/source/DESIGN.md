# Nullwake — design notes

A survivors-like ("bullet heaven") in the style of Vampire Survivors, set in space. You move; your weapons fire on
their own. Collect crystals to level up, pick one of three upgrades, survive fifteen minutes, then kill the stage's
final boss. Gold carried home buys permanent upgrades in the hangar and unlocks pilots.

It is a 2D canvas game with no libraries. All art is drawn in code (`03_sprites.js`) and pre-rendered to offscreen
canvases; all sound is synthesized (`04_audio.js`).

## Structure

| File | What it holds |
| :--- | :--- |
| `01_core.js` | helpers, the seeded RNG `R()`, the run state `G`, the save file |
| `02_data.js` | weapons, passives, pilots, enemies, bosses, stages and waves, the event script, hangar upgrades, the XP curve |
| `03_sprites.js` | enemy shape drawers (`SHAPES`), live-drawn final bosses (`BOSS_DRAW`), player, portraits, pickups, icons |
| `04_audio.js` | sound effects and the step sequencer (`AUDIO.music(stage.music)`, `AUDIO.level(0..2)`) |
| `05_input.js` | keyboard, floating touch/drag stick, Gamepad API, spatial menu focus |
| `06_world.js` | ground tiles per stage look, the parallax star layer, supply pods |
| `07_entities.js` | enemies, the spatial hash, separation, damage, enemy bullets, hazards, gems and items |
| `08_weapons.js` | weapon behaviours (`BEHAV`), projectiles, mines and pools |
| `09_player.js` | stats, movement, taking damage, XP, level-up choices, chests and evolutions, the autopilot |
| `10_director.js` | `startRun`, the wave director, scripted events, boss deaths, `stepGame`, `endRun` |
| `11_bosses.js` | boss attack patterns |
| `12_fx.js` | particles, rings, beams, lightning, slashes, damage numbers |
| `13_render.js` | the canvas renderer and the title backdrop |
| `14_hud.js`, `15_ui.js` | the HUD and every menu |
| `16_main.js` | boot, the frame loop and the `#debug` hook |

## The run

- **Scale.** The shorter side of the screen shows about 540 world units (400 in portrait), whatever the resolution.
  The player moves at 128 units/s.
- **Waves.** `stage.waves[minute] = [minimum alive, seconds between batches, batch size, pool]`. Each minute keeps at
  least the minimum alive, and a batch arrives on the timer while fewer than twice the minimum are alive. Enemies
  spawn just outside the view, more often ahead of you, and are moved back in front if they fall too far behind.
- **Scaling.** Enemy HP grows 12% per minute and contact damage 4% per minute. Mid-bosses scale with time; final
  bosses do not. Elites have 12× HP, 1.6× size, a gold glow and drop a chest.
- **Events** (`EVENTS`, the same rhythm in every stage, cast from `stage.ev`): swarms that stream across the screen,
  encirclements, three elites, a mid-boss at 5:00 and 10:00 and the final boss at 15:00. While the final boss lives,
  normal spawning drops to 45%. Killing it clears the stage.
- **Damage to you.** Each enemy can touch you once every 0.7 s. Armor takes a flat amount off every hit (minimum 1).
- **Pickups.** Gems (blue 1, green 2–4, red 5–24, purple 25+). Past 450 gems on the floor, new XP goes into one big
  purple gem. Supply pods (props that weapons can break, but auto-aim ignores) drop gold, repair kits, magnets and
  EMPs.

## Weapons and evolutions

Weapons have 8 levels (`up[i]` is added at level i + 2); passives have 5 (Ammo Feed 2). Six of each. Player stats
multiply weapon stats in `calcWeapon`. A weapon at level 8 evolves when you open a chest while holding its partner
passive at any level:

| Weapon | + Passive | = Evolution |
| :--- | :--- | :--- |
| Pulse Blaster (nearest-target bolts) | Capacitor | Storm Repeater |
| Arc Lash (whip to the side) | Nanite Weave | Siphon Lash (heals per hit) |
| Orbit Drones (timed orbit) | Field Emitter | Halo Array (permanent) |
| Rail Lance (beam where you move) | Damage Amp | Sunspear (both ways) |
| Plasma Mines (lobbed pools) | Thrusters | Nullwake (trail of pools) |
| Seeker Missiles (homing, splash) | Ammo Feed | Swarm Barrage |
| Tesla Coil (random strikes, chains) | Tractor Beam | Thunderhead (splash) |
| Gravity Well (aura, slow) | Hull Plating | Event Horizon (implosions) |

Elite chests give one item; boss chests give 1, 3 or 5. An evolution takes priority in every slot.

## Stages

1. **Kessler Drift**: open space with a parallax star layer. Mites, Skimmers, Drifters, Splitters, Scrap Drones,
   Gunships (ranged), Rock Hulks. Scrapjaw (mid) and the Kessler Maw (final).
2. **The Brood Moon** (needs a clear of 1): Larvae, Broodlings, Crawlers, Leapers (telegraphed dashes), Spitters,
   Egg Sacs, Carapaces. The Brood Warden and the Brood Queen. Lobbed blasts leave acid pools. ×1.15 XP, ×1.3 gold.
3. **Station Halcyon** (needs a clear of 2): Servitors, Sparks, Crew Husks, Sentry Walkers, Phase Wraiths, Swarm
   Hives, Crushers. The Custodian Frame and HALCYON. ×1.3 XP, ×1.6 gold.

Boss attacks (`11_bosses.js`): ring, fan, spiral, summon, telegraphed dash, telegraphed lobbed blasts and
telegraphed beams. Below half health their timers run 30% faster.

## Meta

`SAVE` (`localStorage['nullwake.save.v1']`): gold, hangar ranks, unlocked pilots, stage clears, best runs, evolutions
seen (for the codex) and options. Rank n+1 of a hangar upgrade costs `cost × (n+1)`, and Refund all gives everything
back. Pilots: Ryn and Sable are free, Kade costs 600 and Ixa 1500. A cleared stage pays a 300 × goldMul bonus.

## Balance

`test/balance.js` plays a whole run with the autopilot (`botMove`, `botPick` in `09_player.js`) and prints a line
per minute, with damage taken by source. `test/veteran.js` does the same with a mid-game hangar, and
`test/endurance.js` with invulnerability. The autopilot clears Kessler Drift with no upgrades and reaches roughly the
middle of the later stages; people dodge better than it does but pick worse. Treat single runs as noisy.
