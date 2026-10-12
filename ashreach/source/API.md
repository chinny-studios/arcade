# Ashreach — module contracts

`build.py` concatenates `src/*.js` **in file-name order** into one IIFE, so every top-level
`const`/`let`/`function` is visible to every file. Rules that follow from that:

- **Top-level names must be unique across files.** Prefix private helpers with your module's
  short tag (`st_`, `nn_`, `it_`, `md_`, `wd_`, …) or keep them inside functions.
- Files may *call* functions from later files freely at runtime, but top-level *statements*
  (not inside functions) may only use names from earlier files (`const`/`let` are in the TDZ
  until their line runs; `function` declarations are hoisted).
- Pure data/logic modules (03–06) must not touch the DOM, `scene` or `THREE` at load time.
- No `import`/`export`, no `window.*` globals (except the debug hook in main), no network.
- Code style: 2-space indent, semicolons, single quotes, compact (see `../../iron-saber/source/src`).
- Every file starts with a one-line header comment: `// Ashreach — <what this file is>`.

Check syntax: `python3 build.py --check`. Smoke test (headless Chromium):
`node test/smoke.mjs [--steps file.js] [--shot name.png]` → screenshots in `test/out/`.

## File map and owners

| file | contents |
| :-- | :-- |
| `01_core.js` | math, RNG (`mulberry32`, `makeRng(seed)`, `strSeed(str)`), noise (`vnoise`,`fbm`,`ridged`), geometry (`polyGeo`,`chamferBox`,`taperBox`,`mergeParts`,`flatGeo`), `EV` event bus, input state (`keys`,`mouse`,`pressed`), `uid()`, `esc()`, `fmtInt()` |
| `02_render.js` | `renderer`, `scene`, `camera`, sun/hemi lights, sky dome, `setAtmosphere(atmos)`, `resize()` |
| `03_stats.js` | abilities, skills, breeds, professions, XP/IP tables, skill caps, IP costs, `newCharacter`, `computeStats` |
| `04_nanos.js` | nano schools, nanolines, the `NANOS` database, mob special abilities |
| `05_items.js` | slots, item templates, `makeItem`, requirements, implants & clusters, loot, vendor stock |
| `06_mobs.js` | `MOB_T` mob templates + `mobStats(tpl, level)` |
| `07_models.js` | `makeHumanoid(look)`, `makeCreature(kind, opts)` — rigged low-poly models with procedural animation |
| `08_world.js` … `11_*.js` | terrain, zones, city & building generation, interiors, colliders |
| `12_entities.js` | entities, spawning, stat refresh, inventory/equip ops |
| `13_combat.js` | auto-attack, specials, nano casting, buffs, damage, death, XP, loot |
| `14_ai.js` | mob, pet and NPC AI |
| `15_player.js` | player input, camera, targeting |
| `16_sim.js` | simulated players, teams, chat generator |
| `17_missions.js` | mission terminal, generation, instances, rewards |
| `18_audio.js` | WebAudio sound effects and ambience |
| `19_save.js` | save/load |
| `20_ui*.js` … `29_*.js` | DOM UI: HUD, windows, chat, character creation |
| `30_main.js` | boot, state machine, main loop, `window.AR` debug hook |

## Stat namespace (shared by stats, items, nanos, combat)

Every number that items, buffs or implants can modify lives in **one flat namespace of stat
ids**. A *mods* object is `{ statId: number }`, e.g. `{ str: 12, assault_rifle: 40, maxHp: 150, ac_proj: 80 }`.

- Abilities: `str agi sta int sen psy`
- Skills: see `SKILL_IDS` in `03_stats.js` (snake_case, e.g. `assault_rifle`, `body_dev`,
  `nano_pool`, `first_aid`, `treatment`, `bio`, `psi`, …). Nano schools are skills: `fab trn bio psi sen spt`.
- Derived: `maxHp maxNp hpRegen npRegen ncu runSpeed addDmg critPct nanoCost` (nanoCost is a %
  reduction, e.g. 10 = 10% cheaper), `nanoInit`
- Armour classes: `ac_melee ac_proj ac_energy ac_chem ac_rad ac_cold ac_fire ac_poison`
- Damage types: `melee proj energy chem rad cold fire poison`

## 03_stats.js

```js
ABILITY_IDS = ['str','agi','sta','int','sen','psy'];  ABILITY_NAMES = { str: 'Strength', ... }
SKILLS = { id: { name, cat, trickle: { str: 0.5, agi: 0.5 } } }   // trickle weights sum to 1
SKILL_IDS = [...];  SKILL_CATS = [{ id, name, skills: [ids] }]
BREEDS = { id: { name, desc, base: {str..psy}, cap: {str..psy} /*ability cap at lvl 1-ish multipliers*/, abilityCost: {str..psy}, hpBase, npBase, hpMul, npMul } }
PROFS = { id: { name, desc, role, color, skillCost: { skillId: tier }, hpPerLvl, npPerLvl,
               weapon: 'assault_rifle', startItems: [[templateId, ql]], startNanos: [nanoId], tips } }
MAX_LEVEL = 50
xpToNext(level) → xp needed to go from level to level+1
ipAtLevel(level) → IP granted on reaching `level`
titleLevel(level) → 1..3
abilityIpCost(char, ab) / skillIpCost(char, skillId) → IP for the next point
abilityCap(char, ab) / skillCap(char, skillId) → max *raised* value at current level
newCharacter({ name, breed, prof, faction, sex, look }) → char   // see shape below
raiseAbility(char, ab) / raiseSkill(char, skillId) → bool (spends IP, respects caps)
lowerSkill(char, skillId) → bool (refund, for the reset button)
computeStats(char, mods) → S   // S[statId] for every stat id, after trickle-down; mods = summed equipment+implant+buff mods
```

**char** (persistent, JSON-serialisable):
```js
{ name, breed, prof, faction: 'meridian'|'freehold'|'unaligned', sex: 'm'|'f',
  look: { skin, hair, hairStyle, height, primary, secondary },
  level, xp, ip /*unspent*/, abil: { str: raisedPts, ... }, skill: { skillId: raisedPts },
  equip: { slot: item|null }, implants: { slot: item|null }, inv: [item], bank: [item],
  credits, nanos: [nanoId], hotbar: [entry|null x 20], missions: [], flags: {} }
```

## 04_nanos.js

```js
NANO_SCHOOLS = { fab: { name: 'Fabrication', color }, ... }
NANOLINES = { lineId: { name, stack: 'self'|'team'|'enemy' } }   // one buff per line per target; higher `str` wins
NANOS = { id: {
  name, prof /* profession id or 'any' */, lvl /* min level */, line, str /* strength within line */,
  ncu /* Nano Memory cost, buffs only */, cost /* nano points */, cast /* s */, recharge /* s */,
  range /* m */, target: 'self'|'team'|'friend'|'enemy'|'pet',
  reqs: { bio: 120, psi: 100 },   // school-skill requirements to learn AND cast
  dur /* s, 0 = instant */, icon: { glyph, color },
  fx: [ effect, ... ], desc } }
```
effects (`fx` entries):
```js
{ t: 'buff', mods: { statId: v } }            // on target for dur (stacks per NANOLINES rules)
{ t: 'debuff', mods: { statId: -v } }         // hostile
{ t: 'heal', amt: [min, max] }
{ t: 'hot', amt, every }                      // per tick, for dur
{ t: 'dmg', type: 'energy', amt: [min, max] }
{ t: 'dot', type, amt, every }
{ t: 'root' } { t: 'snare', pct } { t: 'calm' } { t: 'stun' } { t: 'taunt', amt }
{ t: 'pet', pet: petId }                       // see PETS
{ t: 'drain', stat, amt }                      // broker: debuff target, buff self
{ t: 'shield', absorb } { t: 'reflect', pct } { t: 'dmgshield', type, amt }
{ t: 'morph', model }  { t: 'lattice' } { t: 'stealth' } { t: 'speed', pct }
```
`PETS = { id: { name, model, scale, colors, arch, lvlFrom: 'caster' } }`.
`MOB_ABILITIES = { id: same shape as a nano, minus learning fields }` for mob/sim casters.
`nanoReqMet(S, nano) → bool`.

## 05_items.js

```js
EQUIP_SLOTS = ['rhand','lhand','head','back','lshoulder','rshoulder','chest','larm','rarm','lwrist','rwrist','hands','legs','feet','util1','util2','util3','deck'];
IMPLANT_SLOTS = ['eye','head','ear','rarm','chest','larm','rwrist','waist','lwrist','rhand','legs','lhand','feet'];
ITEM_T = { id: { name, kind: 'weapon'|'armor'|'implant'|'cluster'|'nanocrystal'|'consumable'|'util'|'misc'|'key', slots: [...],
                 /* weapon */ skill, dmgType, specials: ['quick','burst','fullauto','aimed','fast','brawl','pressure','backstab'], twoHand, range, model,
                 qlMin, qlMax, value, ... } }
makeItem(templateId, ql, rng?) → item   // instances are plain JSON objects:
  { uid, t, name, ql, kind, slots, reqs: { statId: v }, mods: { statId: v },
    dmg: [min,max], dmgType, atk /*s*/, rech /*s*/, range, skill, specials, twoHand, model,
    nano /* nanocrystal */, clusters: { shiny, bright, faded } /* implant */, use /* consumable */,
    value, stack, icon: { glyph, color } }
itemReqsMet(S, item) → { ok, missing: [{ stat, need, have }] }
itemMods(item) → mods (implants include their clusters)
itemDesc(item) → array of tooltip lines
CLUSTER_T / implant cluster tables; clusterFits(implant, cluster, socket) → bool
rollLoot(tplOrKind, level, rng) → [item]      // mob loot
vendorStock(vendorKind, level, rng) → [item]  // 'weapons'|'armor'|'nanos:<prof>'|'implants'|'general'
itemPrice(item, buy) → credits
```

## 06_mobs.js

```js
MOB_T = { id: { name, model, scale, colors: [hex,hex,hex], lvl: [a,b], arch, dmgType, aggro, social, speed,
                hpMul, dmgMul, acMul, atk /*s*/, range, abilities: [mobAbilityId], loot, named, xpMul } }
mobStats(tpl, level) → { maxHp, maxNp, ar, dr /*defence*/, dmg: [min,max], atk, ac: {type: v}, runSpeed, xp }
```

## 07_models.js

```js
makeHumanoid(look) → rig     // look: { breed, sex, skin, hair, hairStyle, height, primary, secondary, accent, armorTier, helmet }
makeCreature(kind, opts) → rig   // kind: 'critter'|'beast'|'insect'|'mutant'|'drone'|'worm'|'golem'|'wisp'; opts: { colors, scale }
rig = {
  root,           // THREE.Object3D; caller sets root.position / root.rotation.y and adds to a scene
  height, radius, // metres, for nameplates, targeting and collision
  anim(dt, state, speed),   // state: 'idle'|'walk'|'run'|'combat'|'sit'|'dead'; speed m/s drives the gait
  play(action),             // one-shot: 'attack'|'shoot'|'cast'|'hit'|'special'|'emote'|'jump'
  setWeapon(kind),          // 'none'|'pistol'|'rifle'|'smg'|'shotgun'|'heavy'|'melee1h'|'melee2h'|'fists'
  setLook(look),            // recolour (humanoid)
  setGlow(color|null),      // buff/selection rim tint
  dispose() }
```
Facing: a rig faces **+Z** at `rotation.y = 0`. Ground contact at `root.position.y`.

## 08–11 world

```js
ZONE_DEFS = { id: { id, name, kind: 'outdoor'|'city'|'island'|'interior', lvl: [a,b], size, safe,
  atmos: { fog, near, far, horizon, zenith, sunColor, sunInt, hemiSky, hemiGround, hemiInt, sunDir: [x,y,z] },
  music: 'calm'|'tense'|'city'|'dungeon',
  spawns: [{ x, z, r, mobs: [mobId], n, lvl: [a,b], camp, respawn /*s*/ }],
  pois:   [{ id, type, x, z, yaw, name, role, data }],
  // type: 'start'|'clonebay'|'terminal'|'vendor'|'hopper'|'shuttle'|'npc'|'door'|'pylon'|'trainer'|'bank'
  exits:  [{ x, z, r, to: zoneId, poi: poiId, label }] } }
loadZone(id, at) → { x, y, z, yaw }  // at: poi id or {x,z,yaw}; clears and rebuilds `zoneRoot`; sets ZONE; emits EV 'zone'
ZONE                                 // { id, def, root }
groundY(x, z) → y
collideMove(x, z, nx, nz, r) → { x, z }   // slide along static colliders + zone bounds
losClear(ax, ay, az, bx, by, bz) → bool
updateZone(dt)                        // water, lights, animated props
zoneMapCanvas() → HTMLCanvasElement   // top-down map of the current zone, 512x512
registerZone(def)                     // for generated zones (missions)
makeInteriorDef({ id, seed, theme, size, lvl, mobs, boss, name }) → def   // theme: 'office'|'warehouse'|'lab'|'bunker'|'cave'|'foundry'
randomDoorIn(zoneId, rng) → { x, z, yaw }   // a building door usable as a mission entrance
```

## 12–15 entities, combat, AI, player

```js
ENTS = [];  PLAYER;  // the player's Ent
Ent: { id, kind: 'player'|'sim'|'mob'|'npc'|'pet', name, level, faction, char /*player & sim*/, tpl /*mob*/,
       S /*computed stats*/, hp, np, pos: V3, yaw, rig, target, team, owner /*pet*/, buffs: [], cds: {},
       dead, sitting, attacking, cast: { nano, t, target } | null, role /*npc*/, hate: Map }
spawnMob(tplId, level, x, z, opts) → Ent;  spawnNpc(poi) → Ent;  spawnSim(simChar, x, z) → Ent;  removeEnt(e)
entsNear(x, z, r, filter) → [Ent];  isHostile(a, b);  refreshStats(e)
equip(e, item, slot) → { ok, msg };  unequip(e, slot);  addItem(e, item) → bool;  removeItem(e, item)
useItem(e, item);  learnNano(e, item) → { ok, msg };  implant(e, item, slot)
startAttack(e, target);  stopAttack(e);  useSpecial(e, special) → { ok, msg };  castNano(e, nanoId, target) → { ok, msg }
dealDamage(src, tgt, amt, type, opts);  heal(src, tgt, amt);  giveXp(e, amt)
setTarget(ent|null)   // player target
interact(ent)         // player pressed F on an NPC/terminal → emits 'interact'
TEAM = { members: [Ent], leader }   // the player's team
```

## Events (`EV.emit(name, ...)`)

| name | args |
| :-- | :-- |
| `chat` | channel ('vicinity'|'ooc'|'team'|'system'|'tell'|'shout'|'faction'), from (name or ''), text |
| `log` | text, cls ('dmg-out'|'dmg-in'|'heal'|'nano'|'xp'|'loot'|'info'|'warn') |
| `dmg` | src, tgt, amount, type, { crit, miss, special } |
| `heal` | src, tgt, amount |
| `kill` | killer, victim |
| `xp` | ent, amount |
| `levelup` | ent, level |
| `loot` | ent, item |
| `target` | ent |
| `cast` | ent, nano, target (start) / `castdone` ent, nano, target, ok |
| `zone` | zoneId |
| `interact` | npcEnt (role tells the UI which window: 'vendor', 'terminal', 'clonebay', 'hopper', 'shuttle', 'faction', 'bank', 'trainer') |
| `stats` | ent (stats/equipment changed; UI redraws) |
| `inv` | ent (inventory changed) |
| `mission` | mission (accepted/updated/completed) |
| `teaminvite` | fromEnt |
| `death` | ent |
