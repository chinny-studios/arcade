# Ashreach — design bible

An offline, single-player homage to the classic sci-fi MMO *Anarchy Online*: same feel and
systems, **all-original names, lore and art**. Never use Funcom's names (Rubi-Ka, Omni-Tek,
Clan as a faction name, Notum, Whompah, Yalmaha, Leet, ICC, Arete, Fixer Grid, Reclaim,
profession/breed names such as Solitus/Opifex/Nanomage/Atrox, Nano-Technician, Meta-Physicist…).
Generic genre words (soldier, doctor, burst, full auto, implant, nano program, assault rifle,
first aid, treatment, mission terminal) are fine.

The game *pretends to be online*: the world is full of simulated "players" with names,
professions and levels who hunt, team up, chat in OOC, sell things and fight over towers.

- Tech: one self-contained HTML page, three.js r128 (vendored, global `THREE`), plain JS.
  No network access at runtime except Google Fonts. Saves to `localStorage`.
- Camera/controls: classic MMO third-person. WASD move/turn, hold RMB to mouse-look,
  LMB click to target, Tab cycles hostile targets, Q toggles auto-attack, 1–0 hotbar,
  X sit, F interact, R autorun, Space jump.
- Combat: **tab-target**. Auto-attack ticks by weapon attack/recharge time; specials
  (Quick Shot, Burst, Full Auto, Aimed Shot, Fast Attack, Brawl, Pressure Point,
  Backstab) on their own recharge; nano programs cast from the hotbar.

## Setting

**Ashreach** is a dust-and-basalt world terraformed a century ago by **Meridian Consolidated**
to strip-mine **lumen**, a crystalline mineral whose lattice can host self-replicating
nanomachines. Lumen powers *nano programs* — downloadable effects that heal, harm, armour or
reshape a body — and the colonists' own implanted **Nano Memory**.

Contract workers who walked off the job became the **Freeholds**, a loose federation of
settlements in the badlands. Everyone else — traders, drifters, the uncommitted — are
**Unaligned**. A fragile ceasefire is policed by the **Concord**, an off-world arbitration
council whose neutral cities and clone bays let everyone come back from death… for a fee.

| AO concept | Ashreach name |
| :-- | :-- |
| Omni-Tek / Clan / Neutral | **Meridian** (corporate) / **Freehold** (rebels) / **Unaligned** |
| Notum | **lumen** |
| ICC | the **Concord** |
| NCU | **Nano Memory** (NM), sold as *memory banks* (util slot) |
| Reclaim / insurance terminal | **Clone Bay** (save point; "clone insurance") |
| Whompah | **Hopper** (suborbital shuttle between hubs) |
| Fixer Grid | **the Lattice** (Runner-only teleport network) |
| Arete | **Landfall Isle** |
| Leets | **chitterlings** |
| Yalmaha | **skimmer** (later) |
| Tower fields / Notum Wars | **lumen pylons** in the Lumen Scar |
| Dynacamp | **camp** |
| Credits | **credits** (cr) |

### Breeds (abilities: STR AGI STA INT SEN PSY)

| id | Name | Feel |
| :-- | :-- | :-- |
| `baseline` | **Baseline** | Unmodified humans. Balanced, cheap to raise everything. |
| `kestrel` | **Kestrel** | Lithe, gene-tuned for the dust. High AGI/SEN, low PSY/STR. |
| `savant` | **Savant** | Lab-bred thinkers. High INT/PSY, big nano pool, frail. |
| `bulwark` | **Bulwark** | Heavy-labour clones. High STR/STA, huge HP, poor nano. |

### Professions

| id | Name | AO analogue | Role / signature |
| :-- | :-- | :-- | :-- |
| `trooper` | Trooper | Soldier | Assault rifles, burst/full auto, reflect shields, best AR buffs |
| `bruiser` | Bruiser | Enforcer | 2h melee tank, taunts, HP buffs, rage |
| `medic` | Medic | Doctor | Heals, HoTs, HP buffs, DoT nukes |
| `mechanist` | Mechanist | Engineer | Robot pet, shields/armour buffs, blinds |
| `runner` | Runner | Fixer | SMGs, speed, HoTs, evades, the Lattice |
| `nanoshaper` | Nanoshaper | Nano-Technician | Big nukes, DoTs, roots, nano cost reduction |
| `psion` | Psion | Meta-Physicist | Mind pets (attack + heal), nano skill buffs |
| `martialist` | Martialist | Martial Artist | Fists, Brawl, Pressure Point, self-heals |
| `infiltrator` | Infiltrator | Agent | Rifles + Aimed Shot, concealment, crits |
| `wayfarer` | Wayfarer | Adventurer | Pistols, animal morphs, heals, run speed |
| `broker` | Broker | Trader | Shotguns, drains (steal skills/AC), deals at vendors |
| `executive` | Executive | Bureaucrat | Pistols, roots/calms, droid pet, team nano cost |
| `warden` | Warden | Keeper | 2h edged, team auras, heal-on-hit |
| `wraith` | Wraith | Shade | Piercing, Backstab, life-drain procs |

### Nano schools (each is a skill)

| id | Name | AO analogue |
| :-- | :-- | :-- |
| `fab` | Fabrication | Matter Creation |
| `trn` | Transmutation | Matter Metamorphosis |
| `bio` | Biomorphics | Biological Metamorphosis |
| `psi` | Psi Modulation | Psychological Modifications |
| `sen` | Sensory Tuning | Sensory Improvement |
| `spt` | Spacetime | Time and Space |

### Title levels
TL1 1–14 · TL2 15–49 · TL3 50–99 (slice caps at **level 50**).

## World (vertical slice)

```
             Hopper network: Halden ⇄ Mesa Outpost ⇄ Scar Outpost
 Landfall ──shuttle──▶ Halden Crossing ── Dustbowl Flats ── Greenhollow ── Broken Mesa ── Lumen Scar
  (1–10)                  (city, safe)        (5–20)          (15–30)         (25–40)        (35–50)
     └ Smuggler's Den (6–11)                                                   └ Sunken Foundry (30–46)
```

| id | Name | Kind | Levels | Notes |
| :-- | :-- | :-- | :-- | :-- |
| `landfall` | Landfall Isle | island | 1–10 | Shuttleport (start, clone bay, vendors, mission terminal, recruiter); beaches, scrub hills, a wrecked freighter; Smuggler's Den cave; shuttle to Halden |
| `smugglers_den` | Smuggler's Den | interior (cave) | 6–11 | Mini-dungeon, boss Captain Varro |
| `halden` | Halden Crossing | city (safe) | — | Concord neutral city: clone bay, shops (weapons, armour, nano store, implants & clusters, general), mission terminals, hopper pad, Meridian embassy, Freehold lodge, the Rusty Lumen bar, gates to Dustbowl Flats |
| `dustbowl` | Dustbowl Flats | outdoor desert | 5–20 | Mesas, dry riverbed, raider camp, a small outpost with a clone bay |
| `greenhollow` | Greenhollow | outdoor forest/marsh | 15–30 | Terraforming gone lush: giant ferns, bogs, spore fields, cultist camp |
| `broken_mesa` | Broken Mesa | outdoor canyons | 25–40 | Red canyons, Mesa Outpost (hopper, clone bay, vendor), entrance to the Sunken Foundry |
| `sunken_foundry` | Sunken Foundry | interior (industrial) | 30–46 | Dungeon, boss Overseer Kal-9 |
| `lumen_scar` | Lumen Scar | outdoor contested | 35–50 | Glowing crystal wastes, Scar Outpost (hopper, clone bay), three lumen pylon fields fought over by Meridian and Freehold, the Scar Colossus (world boss, 55) |
| `mission` | (generated) | interior | any | Built per mission from the mission's seed: office, warehouse, lab, bunker or cave |

## Day and night

A day lasts 40 real minutes (`DAY_LEN` in `02_render.js`); new characters wake at about 07:00 and the time is saved.
Each zone's `atmos` is its noon look and night colours are derived from it. The sun arcs through the zone's
own noon direction and the moon lights the night. Stars come out, lamps brighten and lit windows stand out.
`atmos.dayCycle` (0–1) softens the cycle; the Lumen Scar uses 0.55 to keep its violet dusk. Interiors have none.
Mobs notice you from 20% further away at night, but stealth works better. A system line announces dusk, night
and dawn, and simulated players remark on it. `/time` prints the clock, which also shows under the minimap.

## Mob roster

`model` is a `makeCreature` kind (or `humanoid`). `arch`: melee / ranged / caster.

| id | Name | model | lvl | arch | notes |
| :-- | :-- | :-- | :-- | :-- | :-- |
| chitterling | Chitterling | critter | 1–4 | melee | passive, chirps, iconic newbie mob |
| dust_scuttler | Dust Scuttler | insect | 2–6 | melee | |
| rust_hound | Rust Hound | beast | 4–8 | melee | aggressive, social (packs) |
| scav_drone | Scavenger Drone | drone | 5–9 | ranged | energy damage |
| smuggler | Smuggler | humanoid | 6–10 | ranged | Smuggler's Den |
| smuggler_boss | Captain Varro | humanoid | 11 | ranged | named boss |
| sand_wyrm | Sand Wyrm | worm | 8–14 | melee | bursts from sand |
| dune_strider | Dune Strider | beast | 10–16 | melee | tall, passive until hit |
| scorpod | Scorpod | insect | 12–18 | melee | poison DoT |
| rogue_drone | Rogue Drone | drone | 14–20 | ranged | |
| dust_raider | Dust Raider | humanoid | 15–20 | ranged | camp, social |
| mire_lurker | Mire Lurker | mutant | 15–22 | melee | |
| spore_beetle | Spore Beetle | insect | 18–25 | melee | chemical damage |
| thornback | Thornback | beast | 20–28 | melee | |
| feral_mutant | Feral Mutant | mutant | 22–30 | melee | aggressive |
| lumen_cultist | Lumen Cultist | humanoid | 24–30 | caster | camp, nukes + heals each other |
| mesa_stalker | Mesa Stalker | beast | 25–32 | melee | aggressive |
| canyon_raider | Canyon Raider | humanoid | 28–36 | ranged | camp |
| rock_golem | Rock Golem | golem | 30–38 | melee | slow, high AC |
| hover_sentry | Hover Sentry | drone | 32–40 | ranged | |
| brute_mutant | Brute Mutant | mutant | 34–40 | melee | big |
| foundry_bot | Foundry Bot | drone | 30–38 | ranged | Sunken Foundry |
| foundry_tech | Foundry Technician | humanoid | 32–40 | caster | Sunken Foundry |
| slag_golem | Slag Golem | golem | 34–42 | melee | fire damage, Sunken Foundry |
| overseer | Overseer Kal-9 | golem | 46 | melee | named boss |
| lumen_wisp | Lumen Wisp | wisp | 36–44 | caster | energy |
| scar_worm | Scar Worm | worm | 40–48 | melee | |
| deserter | Meridian Deserter | humanoid | 40–48 | ranged | camp |
| scar_titan | Scar Titan | mutant | 45–50 | melee | named roamer |
| colossus | The Scar Colossus | golem | 55 | melee | world boss |
| merc | Mercenary | humanoid | any | ranged | missions |
| security_bot | Security Bot | drone | any | ranged | missions |
| lab_horror | Lab Horror | mutant | any | melee | missions |
| guard | Concord Guard | humanoid | 60 | ranged | city guards, never attack the player |
