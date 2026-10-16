# Roma Aeterna — design notes

## The brief

Walk around Rome and see the landmarks; see everyday life on an ordinary street; travel out of the city to a small
town; people walking, riding horses and driving carts. Chosen with the owner: **AD 125** (Hadrian back from his first
tour, the Pantheon just rebuilt, the Temple of Venus and Rome still a building site), **first person**, the
**Via Appia** walked seamlessly out to **Bovillae**, with **placards**, a **day/night cycle** and **talking to people**.

No objectives beyond discovery: the journal counts places found (about 75) and placards read (about 80).

## Layout

World units are metres; north is -z. Most of the centre is authored in the **Forum frame** `FF` (04_terrain.js):
+u runs down the Forum from the Capitol toward the Arch of Titus (bearing 120°), +v toward the Palatine. A `Frame` maps
local (u, v) to world (x, z); a building's front is its local -v side, and `new Frame(x, z, bearing)` faces that bearing.

Distances are close to real in the centre and squeezed further out: Forum to Colosseum ~400 m, Pantheon ~800 m
north-west, the Via Appia ~2.4 km from Porta Capena to Bovillae (really ~19 km; milestones mark twelfths).

- Terrain: analytic hills (plateau ellipses), flattened sites, the Tiber carved in with Tiber Island, sampled onto a 12 m
  grid. `groundAt` interpolates the same triangles the mesh draws. An apron runs out to a ring of distant hills
  (Sabines, Alban Hills).
- Monuments (07–09): Forum, Velia (Arch of Titus, Venus & Rome under construction, Colossus, Meta Sudans), Capitol,
  Palatine, Colosseum (walkable ambulatory and arena), Ludus Magnus, Circus Maximus, Baths of Trajan, Temple of
  Claudius, imperial fora, Trajan's Column and Markets, Pantheon (walk-in, coffered dome, oculus), Saepta, Stadium,
  theatres of Pompey and Marcellus, Mausoleum, sundial, Ara Pacis, river front, bridges, Porta Capena, the Aqua Claudia.
- City (10): `district(frame, rect, style)` lays a street grid, skips anything on `reserve()`d ground, and fills blocks
  with insulae (shops below, windows that light at night, Nero's porticoes, balconies), domus, warehouses and gardens,
  with fountains and crossroads shrines. The Subura street (`buildSubura`) is hand-made: walk-in shops with props
  (bakery with donkey mill, thermopolium, fuller, butcher, wine shop with the Hedone sign, booksellers, barber, cobbler,
  smith, latrine, school, vigiles station, small baths) and a town house you can enter (fauces, atrium with impluvium,
  lararium, tablinum, peristyle).
- Via Appia and Bovillae (11): suburb, Tomb of the Scipios, Arch of Drusus, tombs of seven kinds with real epitaphs,
  Caecilia Metella, milestones, the Villa of the Quintilii, a mansio, farms; the town has a forum, temple of the Julian
  shrine, inn, baths, theatre and a grid of houses ringed by fields.

## Rendering

All static geometry is written into growable flat-shaded batches (`GB`, 02_geo.js) per layer (`city`, `mon`, `prop`,
`ds`, `glow`, `tree`) and 192 m cell; each layer has its own draw distance. Lit windows and shop lamps sit in the
`glow` layer, a MeshBasic material whose colour the sky animates from dark to warm. Text (inscriptions, signs,
graffiti) are canvas-texture decals. Shadows come from one sun light whose box follows the player.

Quality presets (03_render.js) set view distance, shadow map, pixel ratio, crowd size and NPC draw distance; `auto`
steps down if fps stays under 26.

## People

Every body part is an `InstancedMesh` (13_people.js); agents write their part matrices each frame (`IPart.put`, Euler
YXZ composed by hand). Legs are thigh + shin so walking, sitting, squatting and riding work. Appearance comes from
roles (14_npc.js `ROLES`, `JOBS`): clothing (tunic, stola, toga with or without the purple border, cloaks), hair and
Hadrianic beards, hats, armour, carried goods.

- **Walkers** follow the navigation graph (streets, plazas, paths), choosing turns weighted by density and zone and
  staying near the player; they spawn out of sight within ~150 m and despawn beyond ~175 m. Counts follow the hour.
- **Vehicles and groups**: ox and mule carts (only after the tenth hour inside the city, per the Lex Julia), carriages,
  riders and couriers, pack donkeys, litters with four bearers, a consul with twelve lictors, a Vestal with her lictor,
  vigiles patrols with torches at night, a contubernium of legionaries on the Appia.
- **Spots** (`W.spots`) are stationary people placed by the builders with optional hours: shopkeepers, customers, the
  patron and his morning clients, a schoolmaster and pupils, masons, gladiators sparring, the orator on the Rostra with
  his crowd, a donkey turning the mill, flocks with a shepherd and dog.
- **Circus**: between hours 8.5 and 16.5 eight quadrigas of the four factions race round the spina and the stands fill.

Talking (15_dialog.js): each person has a dialogue key; conversations can be limited to morning/day/night. Lines carry
Latin in `*asterisks*` with a gloss after `|`.

## Placards

`placard(id, x, z)` places a little marble post with a bronze plate and a floating mark; the text lives in
`PLACARD_TEXT` (24_text.js). Keep them short, concrete, and honest about doubt ("Cassius Dio tells a story… historians
doubt it").

## Ideas not done

Interiors for the Curia and the basilicas; games in the Colosseum on festival days; boats on the Tiber; rain; a
funeral procession on the Appia; more variety in faces.
