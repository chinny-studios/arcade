# The Time Apprentice: design notes

## The brief

From issue #43: visit periods or people in history, interact with them in ways that teach, and actually do the
activities that built that piece of history. Chosen with the owner:

- **Audience:** kids 8–12. Short sentences, friendly characters, hard history handled gently.
- **Being there, not a museum:** first-person 3D, inside the event while it happens.
- **Role:** an apprentice or helper in every era (Merer's new hauler, Gutenberg's apprentice, the Wrights' helper, a
  trainee in Mission Control). Real people teach you as you work.
- **Activities:** a story told in dialogue, with a minigame or a hands-on task at each key moment.
- **History is fixed:** you can't fail the event. Minigames get easier after each miss and can be skipped after three.
  A journal fills with pages as you learn; there's no quiz, but questions in dialogue ask you to think (wrong answers get
  a gentle hint and you try again).
- **Hub:** Aunt Clio's workshop with the time machine, a time dial (one card per event), a souvenir shelf and the
  journal desk.
- **Length:** 15–20 minutes per event. **Read-aloud** with the browser's speech synthesis (on by default, toggle in the
  dialogue box and the pause menu). **Input:** mouse and keyboard, touch, and gamepad.
- **Modular:** each event is one self-contained file. See `ADDING_EVENTS.md`.

## The events

| Event | When | You | Activities |
| :--- | :--- | :--- | :--- |
| Building the Great Pyramid (`50_giza.js`) | about 2560 BC | helper in Merer's boat crew | carry a water jar, haul a sledge on wet sand (rhythm), climb the ramp, find north by two stars (align), write KHUFU in a cartouche (spell), count bread with Egyptian numerals (count) |
| Gutenberg's printing press (`51_mainz.js`) | about 1454 | apprentice | cast type in a hand mould (pour), set IN PRINCIPIO backwards (spell, mirror), bring the ink balls, order the printing steps (order), pull the press (rhythm), hang the sheet to dry |
| The first flight (`52_kittyhawk.js`) | 17 December 1903 | the Wrights' helper | find the best wing in the wind tunnel (tunnel), keep the glider level by wing-warping (kite), lay the four rail sections, raise the signal flag, take the famous photo (photo), then watch the flight |
| The Moon landing (`53_apollo11.js`) | 20 July 1969 | Mission Control trainee | run the Go/No-Go poll, decode the 1202 alarm (lookup), decide Go, fly along past the boulders (lander), watch the first step on the TV picture |
| The Walled City and Kai Tak (`54_kowloon.js`) | spring 1990, then 5 July 1998 | a newspaper photographer's helper | 1990: deliver letters through the Walled City (maze), explore its lanes, photograph a jet over the roofs. 1998: pull milk tea (milktea), bend neon (neon), red minibus and fare (minibus), tie up the Star Ferry (rhythm), develop film (order), set a headline in Chinese (spell, sign frame), yum cha, mahjong (mahjong), the checkerboard approach (approach), Kai Tak's last flights and lights out. Six odd jobs (bakery, sign painter, egg waffles, lion dance, a lost songbird, typhoon signals) and fifteen album shots |

Real people are flagged in each cast (`real: true`) and listed in the journal; each event's `note` says who is made up.

### Kowloon City (the fifth event)

Chosen with the owner: Kai Tak's last day *and* the Walled City, as one event with two visits; you're a cub reporter's
helper; a hub district (Kowloon City, 1998) with trips out; lots of activities; signs in real Chinese characters and a
handful of Cantonese words; long (35–50 minutes, 8 chapters, 44 journal pages). The first visit is set in 1990, not
1993: by November 1991 most of the City's people had moved out, the last were cleared in July 1992, and demolition ran
from March 1993 to April 1994. Mei Chan (the photographer), Grandma Lau and Ming appear in both years, as separate cast
entries (`mei` and `mei98` …) so their idle lines fit the year. A time-radio call from Aunt Clio and `warpTo()` move the
story from 1990 to 1998 between chapters 3 and 4; chapters carry their own `when`, `place` and `year`.

Planes fly over the sets on a schedule (`planes()` in the event file), with a roar from `AU.jet()`. A story goal can
wait for one: the `planecam` spot follows the plane, and `planes()` sends one within seconds while the story wants it.
Distances are squeezed (the runway is a few hundred metres from the rooftop), so the planes pass at 20–35 m instead of
the real 40–60 m.

## Code layout

`build.py` concatenates `src/*.js` in name order inside one IIFE with three.js r128 inlined, and wraps `page.html`.

| Files | What |
| :--- | :--- |
| `01_core.js` | helpers, seeded RNG and noise, the event bus, input (keyboard, mouse, touch stick, gamepad), game-time `Timers` |
| `02_render.js` | renderer, sky dome shader, environments as data (`setEnv`), settings, quality presets |
| `03_geo.js` | `GB` geometry batches (flat-shaded vertex colours), `terrainMesh`, canvas textures |
| `04_people.js` | `makePerson(look)` (jointed low-poly body) and the procedural poses |
| `05_stage.js` | the stage (the loaded set): batches, solids, ground, spots, items, actors, ticks, particle emitters; `Actor` |
| `06_player.js` | first-person movement and collision, camera and cutscene camera, targeting, carrying |
| `07_audio.js` | synthesized UI sounds, footsteps and ambience beds; read-aloud with `speechSynthesis` |
| `08_hud.js` | dialogue and questions, goal panel and marker, banners, toasts, journal, time dial, pause, souvenir screen |
| `09_story.js` | the `Scenarios` registry and checker, the story runner and its step kinds |
| `10_minigame.js` | the minigame host (canvas overlay, buttons, try-again, assist), drawing helpers `D` |
| `11_extras.js` | what an event can opt into: the photo album (`Album`), odd jobs (`Jobs`), the Chinese font (`CJK`, `FONTS`) |
| `20`–`36` | the seventeen minigames |
| `40_hub.js` | Aunt Clio's workshop, built from the registry |
| `50`–`54` | the five events |
| `90_main.js` | boot, title, time travel, main loop, save, `#debug` hook |

Each set is rebuilt from scratch when it loads (`Stage.clear()` disposes the old one), seeded by `event:set` so it is
the same every time. Story steps run as a small state machine; `Story.run` increments on every chapter start so that
late promises from a cut-short chapter are ignored. Async story waits use game time (`Timers`), so `TA.sim()` skips
them too.

**Save** (`localStorage['time-apprentice.save']`): `{ done: {id: true}, prog: {id: chapter}, facts: {id: [factIds]},
shots: {id: [shotIds]}, jobs: {id: {jobId: stepIndex | 'done'}}, at: 'hub' | id, intro, last }`. The album's pictures
(small JPEGs grabbed from the view) live under their own key, `time-apprentice.album`, so the save stays small. A game resumes at the start of the saved chapter, which is why chapters set up
everything they need in `setup(S)`.

## Ideas for more events

Each would reuse most minigames: Hatshepsut's expedition to Punt, the Library of Alexandria, the first Olympic Games,
Leonardo's workshop, Galileo's telescope, the Silk Road, building a medieval cathedral, Mary Anning's fossils, the
Underground Railroad with Harriet Tubman, Marie Curie's lab, Rosalind Franklin's Photo 51, Katherine Johnson's
calculations.

## Known gaps

- Each scene was checked in headless Chromium with SwiftShader. Frame rate on real hardware hasn't been measured. Auto
  quality steps down after a few seconds below 28 fps.
- Speech uses whatever English voices the system has. With none, read-aloud is silent and the text still shows.
- Characters are simple low-poly figures. Faces don't animate, apart from a nod while talking.
