# Valor Bay: design notes

## The pitch

The open-world superhero game, small: one island city, five heroes who each get around it differently, and crime
that never stops. It's a sandbox, so there's no story and nothing to unlock. You get a score (points for every
knock-out and every crime stopped, multiplied by your combo), a hero rank that rises with it, and a best score per
hero. The city pushes back through the crime-wave meter: crimes you ignore make it rise, which means more crimes at
once and supervillains sooner.

Tone: bright Saturday-morning comic book. Saturated colours, toon shading, ink outlines, halftone dots in the
shadows, "POW!" and "THWIP!" words on every hit, speech bubbles, speed lines. Nobody dies: crooks are knocked out,
cuffed and carted off; civilians are bowled over and get back up.

## Modules (`src/`, concatenated in order into one scope)

| File | What |
| --- | --- |
| `01_core.js` | math, seeded RNG, event bus, options and save (`valor-bay.v1`), the session state `G` |
| `02_data.js` | `HEROES` (look, build, stats, speeds, the four powers), `GANGS`, `CROOKS`, `VILLAINS`, civilian palettes, `LINES`, `POWS` (sound words), `CRIMES`, `RANKS` |
| `03_render.js` | renderer, the post pass (ink and halftone), the sky shader, clouds, the day cycle (`DAY_KEYS`, `setTimeOfDay`), toon materials, the city window shader, `Mesher` |
| `04_tex.js` | canvas textures: comic cloud, blob, soft and hard puffs, hit star, web splat, ring |
| `05_city.js` | the city: ground strips and road markings, buildings and roof props, Valor Tower, Heroes Plaza, Liberty Park, parking lots, the docks and freighter, street props, lamp pools; collision boxes and their grid, `collide`, `supportY`, `raycast`, `losClear`; road and sidewalk graphs; the map image |
| `06_rig.js` | skinned characters (`buildRig` from a part-colour map and a build), the pose library (`poseRun`, `poseSwing`, `poseFly`, `poseCrawl`, `posePunch` …) |
| `07_fx.js` | particle pools, camera-facing ribbons (webs, lightning, beams, tracers), rings, instanced debris, instanced blob shadows, sound-word pops, shake, flash |
| `08_people.js` | pedestrians on the sidewalk graph, danger and fleeing, cowering, cheering; shared body physics (`knock`, `updateBody`, `placeRig`) |
| `09_cars.js` | car models, lane-following traffic, parked cars, getaway driving, `hitCar`, flying and wrecked cars, standing on and bumping into cars |
| `10_foes.js` | crooks: perception, attack tokens, melee and gun AI, drones, `damageFoe`, webbing, freezing, burning, lifting, knock-outs and arrests |
| `11_bosses.js` | Mauler, Kilowatt and Overclock: spawning, damage and stagger, their move sets, defeat |
| `12_hero.js` | the hero: movement modes, the travel powers, free-flow melee, ranged and the other powers, projectiles, taking damage, going down, animation; `CAM` |
| `13_game.js` | score and combo, the crime director, each crime's set-up and resolution, villain attacks, starting a patrol and switching hero |
| `14_audio.js` | synthesized SFX, city and wind ambience, the score (bright progression; a dark one when a villain is near) |
| `15_input.js` | keyboard and mouse, gamepad |
| `16_hud.js` | score, combo, health and hero meter, power slots, radar and the full map, crime markers, bubbles, floating points, "!" warnings, boss bar, toasts, banners, tips |
| `17_ui.js` | title, hero select (with the preview on a rooftop), pause, hero switch, options, controls |
| `30_main.js` | boot, the frame loop, the cameras, `window.VB` |

## The city

A square island, 800 m on a side (|x|, |z| ≤ 400) in a bay (water at y = −1.2). Road centre lines run every 64 m:
`L(i) = −384 + 64 i` for i = 0…12, in both directions, so blocks are 48 × 48 m inside a road 10 m wide (one lane
each way, traffic keeps right 2.5 m off the centre) and sidewalks 3 m wide. A promenade runs round the edge.

- **Downtown** (within about 140 m of the centre) has towers of 70–200 m; heights fall off toward the edges, where
  blocks split into rows of narrower buildings 12–40 m tall with water towers on the roofs.
- **Valor Tower** (block 6, 5) is 242 m tall plus a 60 m mast, with a gold V near the top and a deck at the 152 m
  setback. **Heroes Plaza** (block 5, 6) has a fountain and a bronze hero statue; the hero starts here.
- **Liberty Park** covers blocks 3–4 × 6–7 with the roads between them turned to paths, a pond with a footbridge and
  a bandstand. A few outer blocks are parking lots.
- **The docks** are the south row east of x = 0: warehouses, container stacks, gantry cranes on the quay, piers into
  the bay and a freighter tied up off them (its deck at 6 m is walkable).
- Districts (for messages): Downtown, Liberty Park, Dockside, Ironhill (NW), Northshore (NE), Old Town (SW),
  Southside (SE).

Buildings are stacks of axis-aligned tiers; each tier is one collision box. Facades get windows from the city
shader: the `wuv` attribute holds window-cell coordinates (columns fitted to the footprint, 3.6 m floors) and a style
(1 punched windows, 2 ribbon bands, 3 curtain wall, 4 tall and narrow; the ground floor is always shopfront glass).
At night a random share of windows light up.

## Heroes

| Hero | HP | Travel | Ranged | Q | E | Ultimate |
| --- | --- | --- | --- | --- | --- | --- |
| Spindle | 120 | web-swing (hold), wall crawl, web-jump from the ground, double jump | web shot: 3 hits webs a crook | web yank: pull a crook in, disarm a gunman, zip to a villain or a point | web bomb: webs everyone within 10 m | web storm: everyone within 32 m |
| Skylark | 140 | flight up to 64 m/s (builds while you push forward) | homing solar bolt | sunbeam (held, 2.6 s) | sonic boom: dash 26 m through a crowd | supernova: 28 m blast |
| Blitz | 110 | super speed 55 m/s, wall-run, run on water, double jump | blur strike: zip to a crook and hit | whirlwind: lifts everyone within 10 m | lightning lap: circle a crowd hitting each three times | speed force: 8 s at 15% world speed |
| Bulwark | 260 | super leap (hold to charge, over 100 m), lands with a shockwave | lift a car and throw it, or tear up the street | ground pound (from the air: a dive) | thunder clap: 16 m cone | rampage: 10 s huge, invulnerable, 1.5× damage |
| Equinox | 120 | flame-jet flight up to 34 m/s | fireball (burns, splash) | ice lance: freezes everything on a line; frozen crooks shatter on the next hit | fire pillar under the target | absolute zero: freeze everything within 24 m, then shatter it |

Melee is free-flow: an attack lunges (up to ~11 m) to the crook nearest the direction you're pushing, and every
fourth hit is a finisher that knocks them flying. Two crooks at a time get to swing at you; the rest circle at 4–6 m.
A "!" marks a crook winding up (red for a gun being aimed). C dodges (0.4 s of invulnerability). Health regenerates
after 5 s out of harm. Going down costs your combo; you're back up after 4 s with 70% health.

The hero meter fills with hits and knock-outs; when full, R fires the ultimate.

## Crooks and villains

Thugs (bat), punks (fists), gunmen (pistol, keep 7–22 m away), brutes (pipe, heavy, hard to knock over) and
Overclock's drones. Three gangs dress them: Neon Jackals (magenta and cyan mohawks), Gearheads (orange coveralls),
the Syndicate (black suits). A knocked-out crook is cuffed and removed after 9 s.

- **Mauler** (1400 HP): smash, stomp (shockwave), charge (stuns himself on a wall: 1.8× damage), grabs a car and
  throws it at you.
- **Kilowatt** (1000 HP): floats at mid range, lightning bolts and chains, a storm of marked strikes around you,
  blinks away, a shock ring when you're close.
- **Overclock** (1100 HP): flies; homing missiles, a laser that sweeps toward you, launches drones, dives onto you.

Each staggers every quarter of its health and fights harder below half. Defeat: slow motion, "KRA-KOOOM!", 5000
points and a trip to Stonegate. Villains rotate in order.

## Crimes and the director

The director starts a crime when the timer runs out and there are fewer than `2 + wave / 25` active, 70–240 m from
the hero (muggings from 55 m; the timer shortens as the wave rises, 26 s down to 9 s). A villain comes every 200–280 s, or at once when
the wave reaches 80. The wave rises slowly on its own and faster for each crime nobody is near; a stopped crime
lowers it (9; 14 for gang wars and heists; 35 for a villain), a failed one raises it by 6.

| Crime | What | Points |
| --- | --- | --- |
| Mugging | 1–2 crooks menacing a cowering civilian, who thanks you after | 400 |
| Store robbery | 3–5 crooks at a shopfront; left alone for 60 s they pile into a getaway car | 800 |
| Getaway car | a car speeding away from you through traffic; damage it (or grab it) and the crew bails out to fight | 900 |
| Gang war | two gangs brawling; they turn on you when you arrive | 1200 |
| Armored truck heist | 5–6 crooks with a brute round a stopped armored truck | 1500 |

Crimes nobody goes near expire (the crooks slip away). The combo multiplier is ×1 + 0.5 per 10 hits (up to ×4).

## The look

- Toon materials with a 3-step gradient; sun plus hemisphere light, keyed through the day in `DAY_KEYS`.
- The post pass renders the scene to a target with a depth texture, then draws ink where the second difference of
  inverse depth spikes (silhouettes and creases; zero on flat surfaces, so the ground stays clean) and halftone dots
  where the image is dark. It is skipped on Low quality or with "Comic ink lines" off.
- One day lasts 16 minutes; options can pin it to day, sunset or night.

## Performance notes

About 100–140 draw calls and 200–280k triangles in the street. Every character is one skinned mesh (plus a small
glow overlay for some), shadows are one instanced mesh, particles three point clouds, ribbons two dynamic meshes.
34 pedestrians and 26 cars are recycled around the camera; pedestrians beyond 120 m update every third frame.
