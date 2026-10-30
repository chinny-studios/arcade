# Creature Feature: design notes

## The pitch

A 1950s B-movie in reverse: you are the thing from the graveyard. Pick one of four classic monsters and hunt the
people of Pine Hollow in third person. There is no one to fight; the only threat is your own hunger. The run is an
endless score attack that ends when hunger runs out, and the drain rises with time, so every run ends.

Tone: gory but cartoonish. Low-poly people come apart, blood sprays, pools spread and splatters hit the screen. The
"Blood: Less" option cuts sprays and pools back and turns off limbs and screen splatter.

## Modules (`src/`, concatenated in order into one scope)

| File | What |
| --- | --- |
| `01_core.js` | math, seeded RNG, value noise, event bus, options and save (`creature-feature.v1`), the run state `G` |
| `02_data.js` | `MONSTERS` (speeds, attack, powers, hunger gains), `FOLK` (townsfolk types, looks, points), lines, `BONUS` |
| `03_render.js` | renderer, sky dome, stars, moon, the 8-light pool that follows the camera, materials, `Mesher` |
| `04_tex.js` | canvas textures: moon, glow, puff, blood atlas, fur, bandage, neon and sign boards, the drive-in movie |
| `05_town.js` | the town layout and builders (houses, shops, diner, Rialto, motel, gas station, church and graveyard, park, school and water tower, drive-in, lovers' lane, woods, cornfield, farm) |
| `06_world.js` | terrain height, colliders and their spatial grid, `collide`, `supportY` (roofs and car roofs are standable), `losClear`, `rayHit`, the road graph and routes, `lightAt` |
| `07_models.js` | people rigs (`buildHuman`, `poseHuman`), monster rigs (`buildMonster`, `poseMonster`), car geometry |
| `08_fx.js` | instanced blood and debris cubes, blood pools, puffs, flying limbs, screen splatter, shake |
| `09_people.js` | townsfolk: spawning, perception, startle and screams, fleeing and refuges, cars, trance, cower, blind, knocked down, corpses |
| `10_cars.js` | parked, arriving and escaping cars, headlights, smashing, wrecks, thrown cars |
| `11_monster.js` | the player: movement, roofs, attack, powers, feeding, doors, carrying and throwing, the camera state |
| `12_game.js` | scoring, combo, hunger, panic, the director that keeps the streets populated, starting and ending runs |
| `13_audio.js` | synthesized SFX and the theremin score |
| `14_input.js` | keyboard and mouse, gamepad, touch |
| `15_hud.js` | HUD, radar, kill feed, bubbles, sense markers |
| `16_ui.js` | title, monster select, pause, options, controls, the title card, THE END |
| `30_main.js` | boot, frame loop, cameras, `window.CF` |

## The town

Streets run east–west at z = −120, −60, 0 (Main Street), 60, 120 and avenues north–south at x = −150, −90, −30, 30,
90, 150, all 10 m wide, giving 20 blocks of 50 × 50 m inside a 2.5 m pavement. Downtown is the six blocks on Main
Street between x = −90 and 90. Outside the town rectangle (|x| < 168, |z| < 138) the terrain rolls into woods,
flattened along the roads west, east and north (to the Starlite Drive-In and out of town) and rising to a hill on
the south road where lovers' lane is. The cornfield (west) hides you: sight is cut to 30% inside it.

Every door you can bolt is a **refuge** (`TOWN.refuges`): houses, shops, the diner, motel rooms, the church, the
school, the garage, the snack bar and the farmhouse, each with a door point, an approach point on the pavement, an
outward normal and a capacity. **POIs** (`TOWN.pois`) are where people stand around: the diner lot, the Rialto, the
gas pumps, the park and bandstand, the drive-in snack bar, porches, the motel and the graveyard.

People walk on the **road graph**: every intersection plus nodes for the roads out of town. `route()` follows the
pavement on the walker's side of the road; `driveRoute()` keeps cars in the right-hand lane. Exits are the three
nodes at the ends of the roads out; a car that reaches one takes everyone inside with it.

## People

Calm states are `idle` and `walk`. Every 0.2 s each one checks whether they can see you: the range is about 26 m,
scaled by how lit you are (`lightAt`, from lamps, porch lights, neon and shop windows), stalking (×0.5), running
(×1.25), bat form high up, the sandstorm, the cornfield, your monster's `sight` and the town's panic. They see in a
150° cone and hear you within 3.5 m (1.5 stalking, 9 running). Alert builds up; at 1 they **startle**: scream (which
startles anyone within 14 m and turns heads to 32 m), and if you are within 4.5 m they freeze for 0.7 s first.

Fleeing (`planFlee`) scores refuges within 75 m and parked cars within 45 m by distance plus penalties for running
toward or past you, falls back to the road node that gets furthest from you, and re-plans every 1.5 s. They sprint
for their stamina (3–8 s) then jog, may trip when you're within 7 m, and calm down after 12 s if you're 70 m away.
Reaching a door hides them inside; reaching a car starts it and drives for the exit away from you.

Breaking a door (`breakRefuge`) flushes everyone out; the vampire can't break doors but **beckons** one person out in
a trance. Hidden people come back out on their own after 40 s once the town is calmer.

## Monsters

| | Speed walk/run | Attack | Power 1 | Power 2 | Doors | Hunger per kill |
| --- | --- | --- | --- | --- | --- | --- |
| The Count | 4.6 / 9.2 | Bite: grab one, 1.15 s | Hypnotise (32 m, 7 s trance) | Bat form: fly 10 s, attack to swoop | beckons | 26 (+18 feeding) |
| The Wolf Man | 5 / 13.5 on all fours | Claw: everyone in a 2.6 m, 120° arc | Pounce (leads a running target) | Howl: 40 m, cower ~4 s | 2 hits | 14 (+26) |
| The Monster | 3.5 / 6.4 | Smash: 3 m, 140°, cars and lamps too | Grab and hurl (people, bodies, cars, props, road) | Stomp: 15 m knock-down | smashes in | 19 (+26) |
| The Mummy | 3.8 / 6.2 | Strangle: grab one, 1 s | Bandage lash (24 m, reel in) | Sandstorm 7 s, 16 m: blind and slow | 3 hits | 19 (+26) |

Aimed powers pick whoever is nearest the middle of the screen within a cone (twice as wide on pad and touch) with
line of sight from the monster. Melee attacks soft-lock toward the best victim in front.

## Scoring and hunger

Each kill scores the person's base points (80–250) plus bonuses (unseen, from above, home invasion, roadkill, double
feature for kills within 0.8 s, long reach, special delivery for thrown things, entranced, tripped, while they were
down, lost in the sand, petrified by the howl, pounce), times the combo. The combo goes up by one for each kill within
9 s, up to ×8. Feeding on a body (1.5 s) adds hunger and 50 × combo.

Hunger starts at 100 and drains 1.0/s, rising by 0.065/s every minute to a cap of 2.6/s. Panic rises with kills and
screams and decays at 0.7/s; it widens how far people see you. The director keeps about 34 people about (people
inside count half): new ones come out of houses away from you or drive into town.

## Ideas not done

- Police or a monster hunter (the brief chose "victims only").
- A day/night clock with dawn as a soft limit.
- Interiors to chase people through.
