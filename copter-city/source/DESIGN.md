# Copter City — design notes

A helicopter sim in the spirit of the 1996 city-helicopter classics. You fly for the city: dispatch radios in calls
and you answer them with whatever your helicopter carries. Fires, crashes, crooks, jams, riots, passengers, rooftop
and flood rescues, a burning freighter, chemical spills, tornadoes and earthquakes. A career takes you from a farm
town to the big city; free flight lets you fly any unlocked city in any helicopter. All art is built from boxes in
code, rendered at a low internal resolution and scaled up with nearest filtering. Every sound and all the music is
synthesized.

Choices the owner made at the start: career plus free flight; the 1996 retro look; all four groups of calls (fires
and medevac, crime and traffic, passengers and rescues, disasters); arcade flight by default with a sim option; the
pilot can land and get out; mouse and keyboard, gamepad and touch; a synthesized cockpit radio; the name Copter City.

## Scope

| Area | What's in |
| :--- | :--- |
| **Cities** | Five, in career order (`CITIES` in `02_data.js`): Dover Flats (7×7 blocks, a lake, farms), Port Halley (9×9, a bay), Granite Falls (10×10, a river with bridges every third line), Sunset Bay (11×11, a west coast), Metro Heights (13×13, a river and a harbour, a dense downtown). Blocks are 72 m. Each city is an island: hills rise outside town and ease down to the sea. Blocks are zoned by distance from the centre (downtown towers, shops and offices, apartments, houses, industry and containers on the shore, farms on the edge of small towns), plus a hangar, one to three hospitals with roof pads, a fire station, police HQ (with a pad), 6–12 named landmarks (stadium, domed city hall, clock tower, hall with a vaulted roof, a hotel with a roof pad, a botanical garden) and parks. Some towers have rooftop pads. |
| **Helicopters** | Six (`HELIS`): Sparrow 22 (the starter: bucket, ladder, megaphone), Watchdog P4 (police: light, siren, gas, no bucket), Lifeline M3 (medevac: patients hold on longer), Firehawk 9 (big bucket, heat resistant), Skyhauler 2 (twin rotor, ten seats, huge bucket, slow), Raptor X (fast, tough, everything). Each has speed, climb, turn, hull, fuel, burn, bucket, seats and gas. Upgrades: engine, armour, fuel tank, bucket, three levels each. |
| **Flight** | Arcade (`flyArcade`): forward/back, turn, strafe and climb; it holds altitude, levels itself, and flares near the ground so landings are soft. Sim (`flySim`): collective (persists), cyclic pitch and roll as rates with an optional stability assist, pedals, rotor torque you counter with pedal, thrust along the tilted rotor axis, quadratic drag, translational lift. Both: rotor spool-up, a heavier bucket and full seats climb slower, fuel burn, flameout and autorotation, an airspace fence, a ceiling. |
| **Landing and damage** | You can land on the ground, roofs and pads (`surfaceY`). Hard landings, rolling over, hitting walls (sphere vs boxes, `collideSphere`), touching water, flying in flames, gunfire, fumes and tornadoes hurt the hull. At zero you go down spinning; the insurance deductible comes out of your pay and a new helicopter waits at the hangar. |
| **Equipment** | Keys 1–5 (`09_equip.js`). The bucket hangs on a 12 m cable, swings, fills when dipped in water, and dumps on F as falling drops that put out what they land on. The rope ladder unrolls 13 m; people within reach climb it. The searchlight lights and auto-tracks a suspect. The megaphone clears jams, calms rioters and scatters pedestrians. Tear gas canisters fall and leave clouds that stop cars and break up crowds. Siren on police craft. Seats hold passengers, patients and the rescued. |
| **Fire** | `10_fire.js`. A building fire grows, spreads to neighbours within 9 m, and burns the building down (it collapses to a charred shell: its chunk mesh is rebuilt). Water cuts intensity by litres over footprint area. Flames come out of the roof and windows, smoke rises with the wind, the nearest fire lights the scene. |
| **Calls** | `12_calls.js` and `13_disasters.js`. Fire; medevac (land beside the crash, patients are carried aboard, fly to a hospital pad before their condition runs out); passenger (land, they walk over, fly them to a landmark, a rough ride costs the tip); traffic jam (a stalled truck, megaphone from low overhead); getaway car (it flees away from you at each junction; keep it in sight, in the searchlight at night, until police box it in, or gas it; it shoots at a low helicopter); rooftop rescue (ladder people off a burning roof, drop them on a pad or open ground); riot (a crowd that torches buildings if left alone); flash flood (people on car roofs as the water rises); ship on fire (bucket and ladder over open water, before it sinks). Disasters: chemical spill (a spreading cloud, residents to lift out, water it down), tornado (crosses town wrecking houses and throwing cars; get people out of its path; it drags you in), earthquake (a wave of fires, a crash, a jam and a rooftop rescue at once). Calls come every 35–70 s, up to two to four open at once by city; Tab picks the target. |
| **Career** | `14_career.js`. Money from calls (scaled by city), fuel, repairs, gas, helicopters and upgrades bought at the hangar (land on the yellow pad, Enter). Each city has a goal (6–15 calls); meeting it pays a bonus, raises your rank (Rookie → Sky Legend) and unlocks the next city, which you move to from the hangar's Relocate tab. Twelve gold rotor tokens per city are hidden on rooftops and in yards; get out and walk to collect them. Saved in localStorage (`copter-city-save-v1`, options in `copter-city-opts-v1`). |
| **On foot** | `11_foot.js`. Get out (E) wherever you've landed, walk or run the streets or the roof you're on, jump, fall (a long fall is a medical bill), chat with pedestrians, collect tokens, climb back in. |
| **Traffic** | `07_traffic.js`. Instanced cars and buses on the road graph, right-hand lanes, following distance, slowing at junctions, queuing at a jam, stopping for a helicopter on the road. Instanced pedestrians walk the sidewalk loops, fewer at night, and run from megaphones, spills and tornadoes. |
| **Look** | 360 internal lines by default (options: 240, 360, 480, native), point-sampled 16–64 px canvas textures, Lambert (per-vertex) lighting, fog, a day–night cycle (a day lasts 48 real minutes) with lit windows and street lamps at night, a sky dome with sun and stars. Buildings are merged per 4×4-block chunk per material, about 110 draw calls in Metro Heights. Cameras: chase, cockpit (with a window frame), high chase, belly (straight down, for the bucket and ladder). |
| **HUD** | `18_hud.js`. A 480×100 instrument panel drawn to a canvas and scaled up: heading-up radar with roads, pads, fires and calls, speed, altitude, vertical speed, compass tape, fuel, hull, RPM, seats, the five equipment slots with their state, warnings. The call card with an arrow, distance and the next step; other calls; money, clock and goal; the radio log; toasts; speech bubbles; prompts; the big map (click a call to target it). |
| **Sound** | `15_audio.js`, `16_music.js`. Rotor chop (band-passed noise chopped by a sawtooth at the blade rate) plus a low thump and turbine whine, muffled in the cockpit and with distance on foot; wind; fire crackle; bucket filling; siren; about twenty one-shots; the dispatcher reads calls aloud with speech synthesis when the browser has it. The radio (R) has three stations (rock, smooth jazz, dance) that generate songs from a seed: key, chord progression, a motif, drums, bass, chords and lead, with a title and artist. |

## Module map

`01_core` helpers and `G` · `02_data` helicopters, cities, calls, names · `03_render` low-res renderer, sky, textures,
`Merger`, cameras · `04_city` generation, heightmap, solids grid, chunks, pads, places · `05_models` helicopters, people,
cars, ship, tornado · `06_fx` particle pools · `07_traffic` · `08_heli` flight, collisions, damage, cameras ·
`09_equip` gear and seats · `10_fire` · `11_foot` · `12_calls` dispatcher and call types · `13_disasters` ·
`14_career` money, hangar, crashes, save, options · `15_audio` · `16_music` · `17_input` · `18_hud` · `19_ui` menus,
starting a city · `30_main` loop, autopilot, `window.CC`.

## Conventions

- x east, z south, y up, metres. Helicopters and cars face −z; yaw 0 is north. Forward is (−sin yaw, −cos yaw). The
  chase camera sits at `H + (sin a, cos a)·d`, so `a = yaw` is behind the nose.
- A call is `{ type, def, x, z, stage, update, markerPos?, spotTarget?, people, objs }`; `startCall(type, o)` runs
  `CALL_TYPES[type].start(c, o)` (return `false` to refuse) and `finishCall(c, ok, pay, text)` ends it. People are
  full models in `CALLS.group`; `ladderGrab(P, dt)` and `walkToHeli(P, done, { cancel })` move them aboard;
  `dropRescued(c)` lets the rescued off on a pad or open ground away from the call.
- Fires belong to an incident (`newIncident`); a call watches its incident's fires. `handOffFires` turns fires left by
  a rescue or riot into a fire call of their own.
- `bus` events: `water (x, y, z, litres)`, `gas (cloud)`, `mega (x, z, alt)`, `callEnd (c, ok, pay)`, `damage`,
  `crash`, `crashed`, `landed (pad)`.

## Ideas for later

Helicopter liveries; a news chopper with a camera mission; night-only search missions with thermal view; fire
trucks and ambulances that drive to calls; weather (rain lowers visibility, wind gusts); a sling load mission
(carry a container or an air conditioner to a roof); more cities with real hills in town.
