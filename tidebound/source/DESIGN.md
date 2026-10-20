# Tidebound: design and module contract

A short monster-collecting RPG in the style of the GBA classics, on a chain of coastal islands. All names, monsters
and art are original. Internal resolution **320x180** (widescreen GBA feel), 16x16 tiles, crisp pixels.
Everything is drawn with canvas 2D: no libraries, no image files. Sprites are authored in code (pixel strings or
drawing calls) and pre-rendered to offscreen canvases at load.

Target length 30–60 minutes. Classic difficulty: a little grinding before the gym.

## Build

`python3 build.py` concatenates `src/*.js` in filename order inside one `(function(){'use strict'; ... })()` and
writes `../index.html`. **All files share one scope**: a `const` in one file is visible in every later file, and
top-level code runs in filename order. So a file may *reference* later names inside functions, but must not *call*
them at top level. Never redeclare a name another file owns (the build fails on duplicates).

## Story and world

The player (default name KAI) lives in **Shellport**, a fishing village on the south island. Professor **Coral**
studies Tidelings (the monsters) in her seaside lab. The rival **MAREN** is her grandchild.

1. **Shellport** (start). Player's house (2 floors, Mom heals you), Coral's lab, 3–4 houses/NPCs, a dock, beach.
   - Wake up upstairs. Going outside toward the tall grass north, Coral stops you ("Wait! Wild Tidelings live in tall
     grass!") and leads you to the lab. Pick one of three starters. Maren picks the one strong against yours and
     battles you in the lab (flag `got_starter`, `rival1`). Coral then gives the Tidedex and 5 Capture Orbs.
     Leaving town before getting a starter is blocked.
   - A Chop tree (needs CHOP) blocks a little beach with a hidden item (Rare Candy).
2. **Route 1 "Dune Path"** north of Shellport. Tall grass, sandy ledges (one-way jumps south), 3 trainers, items.
   A **rest hut** halfway with a kind old sailor who heals your team for free.
3. **Tidewater Cave**. Dark rock floor, a few trainers (hiker, fisher), boulders blocking a side chamber (needs SMASH)
   with a static Corallo (lv 15) and an item. At the far exit a sailor (Captain Brine) gives **HM CHOP** after you talk
   to him (flag `got_chop`).
4. **Route 2 "Lighthouse Road"** north of the cave. Tall grass, 3 trainers, Chop trees blocking a cove with items
   (Leftovers, Great Orbs), a fisherman who gives a Quick Claw.
5. **Lumen City**. Care Center (free heals + PC), Mart, 3–4 houses, the **Lumen Gym** (leader **Marina**, Water/Flying
   specialist, 2 gym trainers then Marina: Gullip lv 12, Jellink lv 12, Pelicant lv 14), the **Lighthouse**.
   - Beating Marina gives the **Wave Badge**, TM-free reward money and **HM SMASH** (flag `badge1`, `got_smash`).
   - Then Maren waits at the lighthouse door for the final rival battle (flag `rival2`). After it the credits roll
     ("THE END ... for now"), then you return to the Care Center and can keep playing.
   - Post-game: at the top of the lighthouse sleeps **Lumarine** (lv 25 static encounter, flag `lumarine`).

Heal points: player's house (Mom), Route 1 rest hut, Lumen Care Center. Blackout returns you to `G.lastHeal`
(set whenever you heal there) with half your money.

## Names and terms

- Monsters: **Tidelings**. Dex: **TIDEDEX**. Balls: **Capture Orb** (`orb`), **Great Orb** (`greatorb`).
- Healing building: **CARE CENTER**. Shop: **MART**. Storage: the **PC** ("someone's PC").
- Badge: **Wave Badge**. Currency shown as `$`.

## Types (10)

`normal fire water grass electric rock ground flying bug poison`. Chart (attacker → defender multipliers, missing
means 1):

- normal: rock .5
- fire: fire .5, water .5, rock .5, grass 2, bug 2
- water: water .5, grass .5, fire 2, rock 2, ground 2
- grass: fire .5, grass .5, poison .5, flying .5, bug .5, water 2, rock 2, ground 2
- electric: electric .5, grass .5, ground 0, water 2, flying 2
- rock: ground .5, fire 2, flying 2, bug 2
- ground: grass .5, bug .5, flying 0, fire 2, electric 2, rock 2, poison 2
- flying: electric .5, rock .5, grass 2, bug 2
- bug: fire .5, flying .5, poison .5, grass 2
- poison: poison .5, ground .5, rock .5, grass 2

Type colours (used for move-type labels and the dex): normal `#a8a878`, fire `#f08030`, water `#6890f0`,
grass `#78c850`, electric `#f8d030`, rock `#b8a038`, ground `#e0c068`, flying `#a890f0`, bug `#a8b820`,
poison `#a040a0`.

## Species (28)

`id` is the key used everywhere. `→` is level-up evolution.

| # | id | name | types | evolves | notes / art brief |
|---|----|------|-------|---------|-------------------|
| 1 | sproutle | SPROUTLE | grass | → brambull lv 14 | starter. Small round turtle with a leafy sprout on its shell, green/tan |
| 2 | brambull | BRAMBULL | grass/ground | | stocky bull-turtle, bramble shell, thorny horns |
| 3 | embit | EMBIT | fire | → cindrake lv 14 | starter. Little red lizard with an ember-tipped tail, big eyes |
| 4 | cindrake | CINDRAKE | fire/flying | | lean drake, small wings, flame mane |
| 5 | splishel | SPLISHEL | water | → tidalon lv 14 | starter. Blue sea-otter pup holding a shell |
| 6 | tidalon | TIDALON | water | | proud otter with a wave-shaped tail and shell shield |
| 7 | dunebun | DUNEBUN | normal | → dunehare lv 14 | sandy rabbit, long ears |
| 8 | dunehare | DUNEHARE | normal | | tall hare, strong legs, scarf-like fur |
| 9 | gullip | GULLIP | normal/flying | → galeon lv 16 | small seagull, yellow beak |
| 10 | galeon | GALEON | normal/flying | | big gull with crest, spread wings |
| 11 | mothlet | MOTHLET | bug | → lumoth lv 8 | fuzzy cream larva |
| 12 | lumoth | LUMOTH | bug/flying | | moth with glowing pale-blue wing spots |
| 13 | thistlet | THISTLET | grass/poison | | purple thistle bulb with leaf feet |
| 14 | snipper | SNIPPER | water | → clawdon lv 18 | small orange crab, one big claw |
| 15 | clawdon | CLAWDON | water/rock | | armoured crab, rocky shell |
| 16 | sparkit | SPARKIT | electric | → voltabby lv 16 | yellow kitten with lightning-bolt tail |
| 17 | voltabby | VOLTABBY | electric | | striped cat crackling with sparks |
| 18 | jellink | JELLINK | water/poison | | pink-violet jellyfish, trailing tendrils |
| 19 | echobat | ECHOBAT | poison/flying | | purple cave bat, big ears, no eyes |
| 20 | geodig | GEODIG | ground | → quakemole lv 18 | brown mole with drill nose |
| 21 | quakemole | QUAKEMOLE | ground | | big mole with stone claws |
| 22 | pebblet | PEBBLET | rock | | grey rock with stubby arms and a face |
| 23 | kelpup | KELPUP | water | → sealord lv 20 | white seal pup with kelp collar |
| 24 | sealord | SEALORD | water | | large seal with a kelp crown and whiskers |
| 25 | zappeel | ZAPPEEL | water/electric | | teal eel with yellow glowing stripes |
| 26 | corallo | CORALLO | water/rock | | coral-pink branching body, rare |
| 27 | pelicant | PELICANT | water/flying | | white pelican, huge orange bill, gym ace |
| 28 | lumarine | LUMARINE | electric/water | | legendary. Glowing sea-serpent with a lighthouse-lamp crest, gold/teal |

## Abilities (ids)

`overgrow blaze torrent` (that type's moves ×1.5 at HP ≤ 1/3), `intimidate` (foe Atk −1 on entry),
`static` (30% paralyse attacker on contact), `poisonpoint` (30% poison attacker on contact), `sturdy` (survive a hit
from full HP with 1 HP), `keeneye` (accuracy can't be lowered), `runaway` (always escapes wild battles),
`compoundeyes` (move accuracy ×1.3), `levitate` (immune to ground moves), `thickfat` (fire damage ×0.5),
`waterabsorb` (water moves heal 1/4 max HP instead of damaging), `guts` (Atk ×1.5 when statused),
`naturalcure` (status cured on switch-out or battle end), `shedskin` (30% chance each turn end to cure status),
`swiftswim` (Spe ×1.5 — no weather, so just a flat bonus while HP is full; keep it simple),
`illuminate` (no battle effect; doubles wild encounter rate when leading — optional).

## Items (ids)

| id | name | kind | price | effect |
|----|------|------|-------|--------|
| orb | CAPTURE ORB | ball | 200 | catch ×1 |
| greatorb | GREAT ORB | ball | 600 | catch ×1.5 |
| potion | POTION | medicine | 300 | heal 20 HP |
| superpotion | SUPER POTION | medicine | 700 | heal 50 HP |
| antidote | ANTIDOTE | medicine | 100 | cure psn |
| parlyzheal | PARLYZ HEAL | medicine | 200 | cure par |
| awakening | AWAKENING | medicine | 250 | cure slp |
| burnheal | BURN HEAL | medicine | 250 | cure brn |
| fullheal | FULL HEAL | medicine | 600 | cure any status |
| revive | REVIVE | medicine | 1500 | revive fainted at 1/2 HP |
| ether | ETHER | medicine | 1200 | restore 10 PP to one move (simplify: all moves +10) |
| rarecandy | RARE CANDY | medicine | 0 | +1 level |
| repel | REPEL | field | 350 | no weak wild encounters for 100 steps |
| escaperope | ESCAPE ROPE | field | 550 | warp to G.lastHeal from caves |
| oranberry | ORAN BERRY | held | 0 | heal 10 HP when HP ≤ 1/2 (consumed) |
| pechaberry | PECHA BERRY | held | 0 | cure psn (consumed) |
| cheriberry | CHERI BERRY | held | 0 | cure par (consumed) |
| chestoberry | CHESTO BERRY | held | 0 | cure slp (consumed) |
| rawstberry | RAWST BERRY | held | 0 | cure brn (consumed) |
| charcoal | CHARCOAL | held | 0 | fire moves ×1.2 |
| mysticwater | MYSTIC WATER | held | 0 | water ×1.2 |
| miracleseed | MIRACLE SEED | held | 0 | grass ×1.2 |
| magnet | MAGNET | held | 0 | electric ×1.2 |
| hardstone | HARD STONE | held | 0 | rock ×1.2 |
| sharpbeak | SHARP BEAK | held | 0 | flying ×1.2 |
| quickclaw | QUICK CLAW | held | 0 | 20% to move first |
| leftovers | LEFTOVERS | held | 0 | heal 1/16 max HP each turn |
| expshare | EXP. SHARE | held | 0 | holder gets half the battle's XP without fighting |
| hm_chop | HM01 CHOP | key | 0 | teaches CHOP |
| hm_smash | HM02 SMASH | key | 0 | teaches SMASH |
| tidedex | TIDEDEX | key | 0 | (flag only) |

Mart stock in Lumen City: orb, potion, superpotion, antidote, parlyzheal, awakening, burnheal, repel, escaperope,
greatorb (after badge1). Selling gives half price.

## Data shapes (owned by the data files, used by everyone)

```js
TYPES            // ['normal', ...]
TYPE_COLOR       // { normal: '#a8a878', ... }
typeEff(atkType, defTypes /* array */) → number   // product of multipliers

MOVES[id] = { name: 'TACKLE', type: 'normal', cat: 'phys'|'spec'|'status', power: 40, acc: 100 /* 0 = never misses */,
  pp: 35, prio: 0, contact: true, desc: '...',
  // optional effects, interpreted by the battle engine:
  status: { s: 'psn'|'brn'|'par'|'slp', chance: 30 },          // on target
  stat: { target: 'self'|'foe', stats: { atk: -1 }, chance: 100 }, // stat stages: atk def spa spd spe acc eva
  drain: 0.5, recoil: 0.25, heal: 0.5 /* self heal fraction */, crit: 1 /* +1 crit stage */,
  multi: [2, 5], flinch: 30, fixed: 20 /* fixed damage */, ohko: false, field: 'chop'|'smash' }
ABILITIES[id] = { name: 'OVERGROW', desc: '...' }
ITEMS[id] = { name, kind: 'ball'|'medicine'|'field'|'held'|'key', price, desc, ballRate?, heal?, cure?: 'psn'|..|'all',
  revive?, pp?, level?, typeBoost?: 'fire' }
SPECIES[id] = { id, num, name, types: ['grass'], base: { hp, atk, def, spa, spd, spe }, abilities: ['overgrow'],
  growth: 'fast'|'medium'|'slow', xpYield: 64, catchRate: 45 /* 3..255 */, evolve?: { to: 'brambull', lv: 14 },
  learn: [[1, 'tackle'], [1, 'growl'], [5, 'vinewhip'], ...], hm: ['chop'] /* which HMs it can learn */,
  height: '0.4 m', weight: '6.0 kg', dex: 'Two-line flavour text.', color: '#78c850' }
DEX_ORDER        // array of species ids in dex order (num)
```

Monster instance (stored in `G.party` / `G.box`, must stay plain JSON):

```js
{ sp: 'embit', nick: null, lv: 5, xp: 135, hp: 20, iv: { hp, atk, def, spa, spd, spe } /* 0..15 */,
  moves: [{ id: 'scratch', pp: 35 }], status: null|'psn'|'brn'|'par'|'slp', slp: 0 /* turns left */,
  ability: 'blaze', item: null, ot: 'KAI', caughtAt: 'shellport' }
```

`Mon` helpers (file 15_monster.js):

- `Mon.create(sp, lv, opts?)` new instance, moves = last 4 learnable at that level, full HP, random IVs, random
  ability from the species list.
- `Mon.stats(m)` → `{ hp, atk, def, spa, spd, spe }` (Gen-3 formula with IVs 0..15 doubled, no EVs, neutral nature).
- `Mon.name(m)` → nick or species name. `Mon.species(m)` → SPECIES entry. `Mon.maxhp(m)`.
- `Mon.xpAt(lv, growth)` total XP needed to reach lv (fast 4n³/5, medium n³, slow 5n³/4).
- `Mon.gainXp(m, n)` → array of events `{ type: 'level', lv }`, `{ type: 'learn', move }` (auto-learned, had a free
  slot), `{ type: 'learnFull', move }` (needs the player to choose), `{ type: 'evolve', to }` (pending, run after
  battle). Recomputes HP keeping damage taken.
- `Mon.heal(m)` full HP, PP, no status. `Mon.healParty()`.
- `Mon.canEvolve(m)` → species id or null. `Mon.evolve(m, to)` changes species and recomputes stats.
- `Mon.learnable(m, lv)` moves learned exactly at lv. `Mon.knows(m, moveId)`. `Mon.teach(m, moveId, slot)`.
- `Mon.markSeen(sp)`, `Mon.markCaught(sp)` update `G.dex`.
- `Mon.addToParty(m)` → 'party' | 'box' (box when party has 6).

## Engine API (01_core.js, already written)

```
W=320 H=180 TILE=16  ctx canvas  DEBUG  clamp lerp  DIRS {up:[0,-1],...} OPP
makeCanvas(w, h, (c, g) => {...}) → offscreen canvas (smoothing off)
R.float() R.int(a,b) R.chance(p) R.pick(arr) R.weighted(list) R.seed(n)
Input.pressed(b) Input.held(b) Input.repeat(b) Input.dir() Input.any() Input.clear()   b: up down left right a b start select
Scenes.push(scene) Scenes.pop(scene) Scenes.top() Scenes.has(s)   scene = { name, update(dt), draw(g), opaque, enter(), exit() }
wait(sec) → Promise   tween(sec, t => ...) → Promise   (game time; works under DBG.sim)
fadeOut(sec, color) fadeIn(sec)   Fade.a
G (state, see newGame())  newGame()  flag(n) setFlag(n, v)  bagAdd(id, n) bagCount(id)
Save.write() Save.read() Save.exists() Save.wipe()
DBG: debug registry (window.TB under #debug). DBG.fast skips fades/animations, DBG.autoText makes text instant.
     DBG.sim(sec) DBG.render() DBG.tap(btn)
Audio_unlock   (reassign in the audio file)
```

Only the top scene updates. Drawing starts from the topmost scene with `opaque: true`, so a dialog box scene (not
opaque) draws over the world. Scenes must be tolerant of `dt` up to 0.1.

Async scripts are the main pattern: `await UI.say('Hello!'); const i = await UI.choose(['YES', 'NO']);`.
A function that shows a scene returns a Promise that resolves when that scene pops itself.

## UI API (02_font.js, 03_ui.js)

```
Font.LINE = 12 (line height), glyphs about 5x8 (cap height 7), 1px letter gap, proportional widths
drawText(g, str, x, y, color = '#404040', shadow = '#d0d0c8')   // top-left anchored; '\n' starts a new line
textWidth(str)   wrapText(str, maxWidth) → array of lines
UI.box(g, x, y, w, h, style = 'white')     // GBA-style frame. styles: 'white' (dialog/menus), 'dark'
UI.cursor(g, x, y)                          // the ▶ menu arrow
UI.say(text | [texts], opts?) → Promise     // bottom dialog box (x 4, y 132, w 312, h 44), 2 lines, typewriter,
    // A or B advances, ▼ blinks when waiting; '\n' forces a line break, '\f' a new box; array items are joined
    // with spaces and re-wrapped (scripts write ['line one', 'line two']);
    // {P} → G.name, {R} → G.rival. opts: { keepOpen: bool (resolve while box stays drawn, used before choose),
    // auto: sec (advance by itself, used in battle), noWait: true (resolve once printed) }
UI.choose(options, opts?) → Promise<index | -1>   // menu box; opts { x, y (default: right side above dialog box),
    // cancel: true (B returns -1), start: index, w }
UI.yesno(question?) → Promise<bool>         // say(question, keepOpen) then YES/NO
UI.number(max, opts) → Promise<number | 0>  // quantity picker (mart)
UI.flash(color, sec)                        // brief full-screen flash
UI.closeDialog()                            // remove a keepOpen box
```

Text palette: dark text `#404040` with shadow `#d0d0c8` on white `#f8f8f8`; frame border `#5878a8` / `#384870`
(FR/LG-like blue frame). Highlighted/menu text may use `#e04040` for warnings, `#3070d0` for names.

## Audio API (05_audio.js)

```
Sound.play(name)    // select cancel bump door stairs hit hitweak hitsuper faint levelup heal ball throw shake
                    // caught evolve save item keyitem money encounter ledge chop smash denied statup statdown
                    // flee lowhp
Music.play(track)   // title town route cave city lab center gym battle trainer gymbattle rival victory
                    // victoryTrainer evolve lighthouse ending heal (jingle) caught (jingle)
                    // Music.play with the current track is a no-op. Jingles return a Promise and resume the previous track.
Music.stop()  Music.current
```
Respects `G.options.music` / `G.options.sfx`. Nothing may throw when WebAudio is missing or locked.

## Sprites API

**Monsters (20_monsprites.js):**
```
Sprites.mon(sp, back = false) → canvas 64x64   // front: facing left (toward the player's monster);
                                               // back: facing up-right, seen from behind, used for the player's side
Sprites.monIcon(sp, frame = 0) → canvas 24x24  // party/PC/dex icon, 2 bobbing frames
```
Art is authored as pixel strings (palette letter per pixel) at 32x32 and scaled ×2 into the 64x64 canvas, with a
1px dark outline. Front and back are separate pixel maps (a back view can be simpler but must read as the same
creature from behind).

**Characters and tiles (21_tiles.js, 22_chars.js):**
```
Tiles.get(name) → { solid, enc /* 'grass'|'cave'|null */, ledge /* 'down'|'left'|'right'|null */, water, over /* drawn over
   the player's lower half, tall grass */, door, counter, chop, smash, draw(g, x, y, t /* seconds, for animation */) }
Tiles.names → list of tile names
Chars.draw(g, name, x, y, dir, frame /* 0 stand, 1 step L, 2 step R */)  // 16x20 sprite, (x, y) = top-left of the
   tile the character stands on; the sprite is drawn 4px above so the head overlaps the tile above
Chars.portrait(name) → canvas 64x64 trainer art for battle intros (front facing), for trainer classes
Chars.names → list
```
Character names: `player rival prof mom nurse clerk sailor captain lass youngster fisher hiker swimmer bugkid
oldman oldwoman girl boy man woman leader gymguide scientist`.
Trainer portraits needed for: `rival lass youngster fisher hiker swimmer bugkid sailor leader`.

Tile names (each 16x16):
outdoor `grass flowers tallgrass sand path water shore_n shore_s shore_e shore_w shore_ne shore_nw shore_se shore_sw
tree tree_top tree_bottom bush rock fence sign mailbox ledge_s ledge_w ledge_e dune chop_tree boulder smash_rock
dock pier_post flowerbed lamp`;
buildings `roof_l roof_m roof_r roof_red_l roof_red_m roof_red_r wall wall_window door care_roof care_wall care_door
mart_roof mart_wall mart_door gym_roof gym_wall gym_door lab_roof lab_wall lab_door lighthouse_top lighthouse_body
lighthouse_door`;
cave `cave_floor cave_wall cave_wall_top cave_ladder cave_entrance cave_exit water_cave rubble`;
interior `floor wood_floor wall_in window_in stairs_up stairs_down mat table chair bed bookshelf tv plant counter
pc heal_machine shelf rug lab_machine gym_floor gym_pool gym_statue`.
Exact visuals are up to the tile file; anything a map needs that is missing falls back to a magenta tile.

## World and scripts (30_world.js, 31_script.js)

Map definition (files 60–69 call `Maps.def`):

```js
Maps.def({
  id: 'shellport', name: 'SHELLPORT', music: 'town', indoor: false, border: 'water' /* tile drawn outside the map */,
  rows: [ 'TTTTT...', ... ],          // one char per tile, all rows the same length
  legend: { T: 'tree', '.': 'grass', ',': 'tallgrass', ... },  // chars → tile names (map-specific legends allowed)
  warps: [ { x, y, to: 'route1', tx, ty, dir: 'up' /* facing on arrival */ } ],
    // a warp on a door/stairs/cave tile fires when you step onto it; a warp on the map edge fires when you walk off
    // that edge from (x, y) (give edge warps one tile per column/row of the opening)
  npcs: [ { id: 'mom', x, y, sprite: 'mom', dir: 'down', move: 'still'|'look'|'wander',
            cond: () => bool,                  // only present while true (rechecked on map load and after scripts)
            text: 'Simple line.' | ['...', '...'],
            talk: async (npc) => { ... },      // instead of text
            trainer: { id: 'r1_youngster', cls: 'YOUNGSTER', name: 'JOEY', sprite portrait name via npc.sprite,
                       party: [['dunebun', 4], ['gullip', 5]], money: 60 /* per level of the last mon */,
                       sight: 4, intro: 'Hey! You looked at me!', lose: 'Aww, you win.', after: 'I need more training.',
                       music: 'trainer' } } ],
  signs: [ { x, y, text } ],
  items: [ { x, y, item: 'potion', n: 1, id: 'r1_potion' /* flag set when picked up */, hidden: false } ],
  encounters: { grass: { rate: 0.12, list: [['dunebun', 2, 4, 40], ['gullip', 2, 4, 30], ...] /* sp, min, max, weight */ },
                cave: { rate: 0.08, list: [...] } },
  triggers: [ { x, y, w: 1, h: 1, cond: () => !flag('got_starter'), run: async () => { ... } } ],  // step-on
  onEnter: async () => {},   // after the fade-in on entry
});
```

Coordinates are tile coordinates, (0,0) top-left. Trainer flags: defeating trainer `id` sets flag `'tr_' + id`.
Static encounters (Corallo, Lumarine) are NPCs whose `talk` calls `Battle.wild` and sets a flag.

World API:

```
World.enter()                   // push the world scene and load G.map at G.x, G.y (call once after title/new game)
World.warp(map, x, y, dir) → Promise  // fade out, load, fade in, run onEnter
World.player                    // { x, y, dir, moving, ... }
World.map                       // current map object (after Maps.def processing)
World.npc(id)                   // live npc object
World.blackout() → Promise      // "{P} blacked out!", warp to G.lastHeal, halve money, heal party
World.refresh()                 // re-evaluate npc cond() after flags changed
Maps.def(def)  Maps.get(id)  Maps.list
```

Script helpers (31_script.js) used by map scripts:

```
Script.give(item, n = 1) → Promise   // bagAdd + "{P} received POTION!" + sound
Script.giveMon(sp, lv) → Promise     // creates, adds to party/box, marks caught, message
Script.heal() → Promise              // heal jingle + Mon.healParty(); sets G.lastHeal to current map/player position
Script.walk(npcOrPlayer, 'uurrd' /* u d l r steps */) → Promise   // 'player' or an npc object or id
Script.face(who, dir)  Script.faceEachOther(npc)
Script.show(npcId) Script.hide(npcId)   // add/remove an npc at runtime
Script.emote(who, '!') → Promise        // exclamation bubble
Script.trainerBattle(npc) → Promise<'win'|'lose'>
Script.choose / say are just UI.choose / UI.say
Script.mart(itemIds) → Promise          // calls Menus.mart
Script.pc() → Promise                   // calls Menus.pc
Script.credits() → Promise              // scrolling credits scene
```

Field moves: facing a `chop_tree` or `smash_rock` tile and pressing A: "This tree looks like it can be CUT down!";
if any party member knows `chop` (and the player has the hm item) ask "Use CHOP?" → animate, the tile becomes `grass`
(or `cave_floor`) until the map is left (like the originals). Teaching an HM is from the Bag (key item → choose a
party member that has the HM in `hm`).

Walking: 1 tile per 0.25 s (holding B: running, 0.125 s). Tall grass/cave encounter check per completed step:
`R.chance(rate)`; first party member that isn't fainted fights. Repel blocks wild mons with level below the lead's.
Ledges: walking into a ledge from the allowed side hops two tiles. Trainers spot you within `sight` tiles in a straight
line they face: "!" emote, walk up, intro text, battle.

Start menu (Start button in the world): TIDEDEX, TIDELINGS (party), BAG, {P} (trainer card), SAVE, OPTIONS, EXIT.
TIDEDEX only after flag `got_dex`; TIDELINGS only with a party.

## Battle API (40_battle.js, 41_battle_ui.js, 42_evolve.js)

```
Battle.wild(sp, lv, opts?) → Promise<'win'|'lose'|'run'|'caught'>   // opts { static: true (can't run), music }
Battle.trainer(t /* trainer object from a map npc, see above */) → Promise<'win'|'lose'>
Evolve.run(mon, to) → Promise<bool>                      // evolution scene; B cancels
```
Battle does the whole thing: transition swirl, intro, menus (FIGHT / BAG / TIDELINGS / RUN), damage, messages, XP,
level ups, learning moves (forget prompt), catching (shake animation), money reward, and evolution scenes after the
battle. It does **not** handle blackout: on `'lose'` the caller calls `World.blackout()` (Script.trainerBattle and the
encounter code do this). Gen-3 damage formula, crit ×2 (1/16), STAB 1.5, random 85–100%, stat stages ±6, accuracy and
evasion stages, status: psn 1/8 per turn, brn 1/8 per turn and halves physical damage, par speed ×0.25 and 25% full
para, slp 1–3 turns. Trainer AI: pick the move with the best expected damage 70% of the time, else random; uses a
Potion once when below 25% if the trainer has `items`. Switching: the player may switch; trainers send the next mon.
Catch formula Gen-3 style with shakes. XP split among participants; `expshare` holders get half.

Battle layout guide (320x180): enemy platform ellipse centred around (232, 84), enemy sprite bottom at y≈92;
player platform around (84, 128), back sprite bottom at y≈132; enemy HP box top-left (8, 10, 128x34), player HP box
(176, 92, 136x38) with HP numbers and XP bar; dialog box at the bottom (y 132..180); the action menu (FIGHT BAG / MON
RUN) is a box inside the right side of the bottom area; the move menu replaces the dialog with 4 moves left and
PP/TYPE right. HP bar colours: green > 50%, yellow > 20%, red.

## Menus (50_menus.js, 51_title.js)

```
Menus.start() → Promise              // the start menu and everything under it, resolves when closed
Menus.party(opts) → Promise<index | -1>   // opts { mode: 'view'|'battle'|'item'|'teach'|'pick', title, canCancel,
                                          //        item, move, filter: m => bool }
   // 'view': choose a mon → submenu SUMMARY / SWITCH (reorder) / ITEM (give, take) / field move (CHOP, SMASH) / CANCEL
   // 'battle': SHIFT / SUMMARY / CANCEL; resolves with the chosen index to switch in
Menus.summary(mon) → Promise         // stats page + moves page
Menus.bag(opts) → Promise<{ item, target } | null>   // opts { mode: 'field'|'battle'|'give'|'sell' }
   // in 'field' mode the bag applies medicine/held/key items itself; in 'battle' it returns the choice and the
   // battle applies it (balls: target null; medicine: target index)
Menus.useMedicine(itemId, mon) → { ok, text }   // shared by bag and battle: applies potions, cures, revive, candy
Menus.dex() → Promise   Menus.pc() → Promise   Menus.mart(items) → Promise   Menus.options() → Promise
Menus.forgetMove(mon, newMove) → Promise<slot index | -1>  // "forget which move?" used by battle and HM teaching
Menus.name(prompt, def) → Promise<string>                  // letter grid, max 8 chars
Title.show() → Promise<'new' | 'continue'>
```

## Story (69_story.js)

```
Story.intro() → Promise   // after NEW GAME: Coral's welcome speech with a sprite, pick player name (KAI, ALEX,
                          // JUNO, RIO or custom), rival name (MAREN, ...), fade into the bedroom (sets G.map etc.)
```

## Boot (90_main.js)

Shows the title, then either loads the save or runs `Story.intro()`, then `World.enter()`.

## Debug hook `window.TB` (under `#debug`)

`TB.start({ starter, map, x, y, skipIntro })` new game skipping the intro, `TB.sim(sec)`, `TB.render()`,
`TB.tap(btn)`, `TB.tp(map, x, y)`, `TB.give(item, n)`, `TB.giveMon(sp, lv)`, `TB.battle(sp, lv)`,
`TB.trainer(def)`, `TB.flags`, `TB.G()`, `TB.auto(true)` (autoText + fast), `TB.scenes()`. Modules add more.
`TB.autoBattle = true` makes the player's side pick the first damaging move automatically (for tests).

## Integration notes (decisions made after the first build)

- Map `signs` entries may have `run: async () => {}` instead of `text`. An npc with `sprite: 'none'` is not drawn
  but is solid and talkable (PC, static encounters).
- Indoor maps draw `wall_in` only on the top row; side and bottom walls render black, as in the GBA games.
- Building signs are their own tiles (`care_sign`, `mart_sign`, `gym_sign`), placed once on a plain roof.
- Mats on the bottom row are edge warps: step onto the mat, then walk off it.
- A trainer party entry may be `[sp, lv, movesLv]`: the mon knows the moves it would have at `movesLv` (the first
  rival knows only its starting moves, like the classics).
- `Menus.useMedicine` is synchronous and returns `{ ok, text, events }`; callers show events with
  `Menus.showEvents`. `Menus.forgetMove` returns a slot and never teaches: call `Mon.teach`.
- Battle does not set trainer flags; `Script.trainerBattle` does (`tr_<id>`), and story battles set their own flags.
- Balance (test/balance.js, 6 seeds, autoBattle): the lab rival is winnable 2–6/6 per starter; each Route 1 trainer
  is beatable at lv 7 when healed between fights (Splishel vs Thistlet is the hard matchup); Marina falls to a lv 15
  evolved starter plus one lv 13 partner 5–6/6.
