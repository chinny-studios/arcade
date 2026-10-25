# Act of God — design notes

You are a god over a modern city. Pick a city size, get a freshly generated city, and use powers on it: storms, earthquakes,
volcanoes, meteors, floods and plagues, or healing, rain, rebuilding, rainbows, golden ages and resurrection. There are
no goals or unlocks. The point is the city's response: people flee, buildings come down, fires spread, emergency
vehicles race across town, the mood swings and the news reports it all.

Choices the owner made at the start: a 3D god's-eye view; a pure sandbox (no meters to earn powers); fully random
cities in five sizes; a serious tone (casualties are counted and reported plainly); every group of powers offered
(weather, earth and fire, sky and sea, plagues; healing and rescue, growth, weather blessings, miracles); a live city
with a news ticker; mouse and touch.

## Scope

| Area | What's in |
| :--- | :--- |
| **Cities** | `04_world.js`. Five sizes (`SIZES`): Megacity (4 km square, 11–24 M people), Metropolis (3.2 km), City (2.4 km), Town (1.6 km), Small town (1.2 km). Each city is random: a water layout (coast, bay, river, lake, delta, island or inland), relief (flat, hills, mountains), a biome (temperate, desert, northern, tropical) and one to four centres. An urban-intensity field from the centres zones blocks into core towers, mid-rise, main street, houses, suburbs, industry, parks, fields and forest. Roads are a jittered grid with avenues and highways; major lines bridge short water. Special buildings: hospitals, fire and police stations, churches and a cathedral, city hall, stadiums, farms. Districts are named Voronoi regions used by the news. Population is spread over buildings by floor area and scaled to the size's range. |
| **Terrain and water** | `06_terrain.js`, `07_water.js`. A heightmap from a terrain function (fbm hills, ridged mountains, water carved by signed distance), draped with a 2048 px ground canvas (fields, lots, sidewalks, roads with markings) and an overlay texture at grid resolution (snow, scorch, street power, vegetation). The land outside the world is a ring mesh from the same function. Water and lava are virtual-pipe height fields: the sea edge holds sea level (a tsunami raises it), shields and parted water block cells, lava is thick, cools and turns into terrain. |
| **Buildings** | `05_buildings.js`. Every building is a record with parts (box, gable roof, cylinder, cone, dome) drawn as instanced unit shapes with one shader: procedural windows per style that light at night where the power is on and blur into their average far away, fire glow, soot from damage, snow on roofs, gold and sickly tints. A collapse squashes and tilts the parts into a rubble mound. Trees are instanced too. |
| **Simulation** | `10_sim.js`. Damage (`hurt`) and collapse with casualties scaled by who is inside at that hour and how many have evacuated; fire in buildings (flammability by kind, wind), trees and ground cells; an SIR plague per building that spreads to neighbours and by commuters; injury sites treated by hospitals and ambulances; panic and evacuation near threats; the power grid with repair crews; snow melt and regrowth; wind; a mood from recent deaths, fear and losses. Deaths are logged by place so Resurrection can bring them back. |
| **Streets** | `09_traffic.js`. A pool of cars and pedestrians that follows the camera, driving the road graph on the right; they flee threats, die in floods and lava and are flung by tornadoes. Fire engines, ambulances and police live at their stations and path-find (A*) to fires, injury sites and panic, spraying, loading the injured and flashing their lights. Collapsed buildings, craters, floods and fallen bridges close roads. |
| **Powers** | `11_powers.js`. Wrath: Lightning, Tornado (steerable while held), Blizzard, Hurricane (sea surge), Earthquake (magnitude from size, fault scarps, undersea quakes raise tsunamis), Sinkhole, Volcano (cone, lava, bombs, ash), Wildfire, Meteor (crater, blast rings, splash at sea), Tsunami, Deluge, Smite, Locusts, Plague, Blackout. Grace: Heal, Quench, Restore (rebuilds, heals the land, reopens roads), Shield (a dome nothing passes), Prosper (new and taller buildings), Bloom, Gentle rain, Sunshine (ends storms, dries floods), Rainbow (calm, crowds gather), Raise land, Part waters (drag a line), Golden age, Resurrection. Size slider and `[` `]` scale each one. |
| **News** | `12_news.js`. Every incident gets a first report, updates as its toll grows and an aftermath line; the public reacts to runs of wrath or grace; filler when nothing happens. Major events take the breaking-news banner. |
| **Sound** | `13_audio.js`. All synthesised: beds for wind, rumble, rain, fire, the swarm, the city and surging water, driven by what is near the camera; thunder delayed by distance, booms, collapses, a wrath sting, chimes and a choir for grace. |
| **Interface** | `15_ui.js`, `page.html`. Title screen over a live, orbiting preview of the generated city; HUD with city, population, mood, clock, pause, speed and time of day; a toll panel; the dock with the two sides and four groups each; size slider; ticker and banner; menu with quality, sound and help. Phone layouts in portrait and landscape. |

## Numbers worth knowing

- One game hour is 40 s (`HOUR_SEC`); the time button jumps to dawn, noon, dusk or night.
- Water runs 2.2× sim speed in 0.05 s steps and sleeps after 4 s of calm; lava runs 1.5× in 0.1 s steps.
- `LETHAL` in `10_sim.js` sets the share of a building's occupants killed per cause; `presence()` sets who is in by hour.
- Towers are capped at 7.5× their narrowest side so the skyline has no needles.

## Ideas not done yet

- Rivers that flow downhill (rivers are level with the sea today).
- Real crowds gathering at churches after disasters; worship and fear as visible behaviour.
- A photo mode and a replayable "chronicle" of the day's events.
