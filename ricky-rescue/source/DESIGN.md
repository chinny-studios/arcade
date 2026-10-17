# Ricky Rescue — design notes

An EMT and paramedic simulator. You are Ricky, a new EMT on Medic 12 out of Station 12. Calls come over the radio:
drive the ambulance through a procedural city with traffic that pulls over for lights and sirens, find the patient
(often indoors, sometimes up a walk-up), assess and treat them with your partner Marisol working in parallel, move
them with the right device, load them, choose the right hospital, radio ahead, and give a handoff report. Each call
is scored and pays XP and money; ranks unlock skills, districts and call types; the garage sells rigs and cosmetics.
All art is built from primitives in code and every sound is synthesized.

Design choices the owner made at the start: 3D third-person; protocol-lite care (real steps, simplified effects);
procedural city with traffic; shift-based career; Ricky plus an AI partner; ride in back or drive during transport;
hands-on stretcher; grounded, warm tone; patients can decline but rarely die; every call type including MCIs;
keyboard and mouse, gamepad and touch.

## Scope

| Area | What's in |
| :--- | :--- |
| **City** | 12×12 blocks at 80 m (960 m square), the Beltway around it, four-lane avenues every third line. Four districts: Maple Heights (houses), Eastgate (apartments, strip malls, a gas station), Downtown (towers, a plaza), Harbor (warehouses, containers, a pier with cranes). Three hospitals, Station 12, parks, about 650 addressed places. Traffic lights at avenue intersections, four-way stops elsewhere. |
| **Traffic** | Up to 64 AI cars near the player, about 550 parked cars, 90 pedestrians, all instanced. Cars follow lanes, stop at lights and stop signs, queue, turn on Bezier curves, pull to the curb for lights and sirens (from behind or oncoming), hold at intersections the rig is crossing, and swing round a stopped rig. |
| **Driving** | Arcade bicycle model (throttle, brake/reverse, speed-sensitive steering, grip limit, handbrake slide), collisions with buildings, posts, parked cars and traffic, curb bumps, damage. Lights & sirens with three tones, an air horn, a chase camera with two distances. Ride roughness is tracked for the patient. A GPS ribbon on the road, turn-by-turn hints, a minimap and a full map. |
| **Calls** | 17 types (`12_calls.js`) plus the bus-crash MCI (`19_mci.js`). Chest pain/STEMI, cardiac arrest, stroke (with a hypoglycaemia mimic), diabetic, asthma, CHF, anaphylaxis, opioid overdose (sometimes with police staging), seizure (status at random), traffic collision, elderly fall with hip fracture (and head injury on thinners), arterial bleed, sports fracture, stabbing, childbirth, lift assist/refusal, heat stroke. |
| **Patient model** | Conditions push vitals around (`10_patient.js`); vitals ease toward a target, so treatment works over a minute or two. Blood loss and fluids, ventilation deficit and oxygen, airway states (snoring, gurgling, stridor), pain and anxiety, medications with onset times, cardiac arrest with viability, CPR quality, shocks and ROSC, and re-arrest after ROSC if the pressure is left low. |
| **Care** | 76 actions in seven tabs (`11_actions.js`), each with a duration, who can do it, the rank needed, a supply, requirements and contraindications. Mistakes are allowed and recorded. Ricky and Marisol work in parallel; a busy worker queues the next action. CPR, BVM and direct pressure are continuous. Ricky's compressions follow a tap rhythm (or an option). The fire engine helps with CPR on arrests. |
| **Responders** | Four firehouses (Engine 12 shares Station 12; Engines 7, 3 and 5 elsewhere) and patrol cars. Engines go to arrests, crashes, MCIs and about half of priority-1 calls; police to unsafe scenes, crashes, stabbings, MCIs and some overdoses and arrests. They drive the road network with lights and sirens (traffic yields to them as to Medic 12), park where they protect the scene (engines block upstream of a crash, with cones), and their crews walk in: a firefighter takes compressions or holds pressure on an arterial bleed, police clear unsafe scenes before anyone goes in and direct traffic at crashes. The first engine's firefighter-paramedic joins as a third crew member who can do anything up to paramedic level, whatever Ricky's rank, works an arrest's advanced side on their own, and rides in the ambulance on serious calls. Units go back in service once Medic 12 leaves. |
| **Between calls** | Calls come in on a pager with a minute to acknowledge, and turnout (page to wheels rolling) is scored. Dispatch posts Medic 12 at one of 16 posts (firehouse aprons, park curbs, Gas & Go, strip malls, hospital lots, and street corners wherever those leave a gap) to cover the most demand given which of the five other medic units are free, and moves it up when they get busy or come free. Calls come from where Medic 12 is the closest free unit, weighted by demand that changes by district and hour. On post: wait for the page with the clock fast, do the rig check (faults left by the last crew cost time on a call otherwise), restock at a hospital or the station, get a coffee against the shift's tiredness. |
| **Moving** | Stretcher (pushed, can't go up walk-ups), stair chair, scoop and long board (carried by both), assisted walking. Device choice is scored (spinal precautions, walking a broken leg, chair for a hip). Load at the rear doors, or pull the stretcher out there with a carried patient. |
| **Transport** | Choose the hospital (St. Brigid: basic and close; Mercy: cath lab, stroke center, L&D; Harbor General: Level I trauma, L&D), the pre-alert, lights and sirens, and who drives. Riding in back shows the patient compartment with sway and fast-forward; driving leaves Marisol caring and reporting by radio. |
| **Handoff and review** | Three or four multiple-choice handoff questions from what you actually found and did. The review scores response, assessment, protocol checks, destination and alert, scene time, driving, handoff and errors, and tells the patient's outcome. |
| **Career** | EMT → AEMT (1,400 XP) → Paramedic (3,800) → FTO (8,000). Districts unlock by rank and XP. Rigs (Type II, III, I), six liveries, four light patterns, four light colours, five uniforms, and Ricky's look. Saved in localStorage. Shifts of 4, 8 or 12 game hours starting at 07:00, 15:00 or 21:00. |

## Systems

- **Time.** One real second is six game seconds (`TIME_SCALE`). Everything medical uses game seconds, so a one-minute
  drive is a six-minute response and a 30-second action takes five real seconds. Between calls the clock runs on; on
  post `T` runs it ×20 until the next page, and chores (restocking, the rig check, coffee) run it ×8 (`timeWarp`).
  Fast-forward ×3 is available in the back of the rig.
- **City** (`04_city.js`). Line `i` sits at `i × 80`; avenue lines (`i % 3 == 0`) are 16 m wide with two lanes each way,
  local streets 11 m with one lane and a parking lane. x grows east and z south. Edges run between intersection nodes;
  lane offsets are measured to the right of the travel direction (`edgePos`). Buildings, posts, trees and parked cars
  are collision solids in a 20 m grid (`collideCircle`). Each building door is a place with an address, a floor count,
  an access type (`ground`, `stairs`, `elevator`) and a curb point where a rig parks facing with the curb on its right.
- **Routing** (`08_route.js`). A* over nodes with turn and signal penalties and no U-turns, turned into a lane-following
  polyline with Bezier corners; with lights and sirens on two-lane streets the line runs near the centre since traffic
  pulls to the curb. The autopilot (`07_vehicle.js`) follows it with pure pursuit, slows for corners ahead, eases past
  cars that won't move and steers round wrecks; it doesn't collide with traffic and its bumps don't count as crashes.
- **Calls** (`13_game.js`). `pending → enroute → staging (unsafe scenes) → onscene → transport → hospital → done`.
  The patient evolves from the moment of dispatch, so response time matters. Police clear unsafe scenes; the engine
  company comes to arrests, crashes and some priority-1 calls.
- **Scenes** (`14_scene.js`). Indoor calls build a doll-house room (single-sided walls facing in) at x = −5000, entered
  through the place's front door. The patient compartment is built at x = −5000, z = 600.
- **Responders** (`24_responders.js`). Each unit follows a route polyline kinematically with a speed profile from its
  corners and braking distance; it waits behind anything stopped in its lane, then eases past. Traffic yields to every
  vehicle in `sirenVehicles()`. Parked units become scene solids and traffic blockers. Crews are scene people with a goal
  (`crewGoal`) that walk between the street and a building's room through the front door.
- **Posting** (`25_posts.js`). Posts and demand points (every addressed place) are fixed at boot; each post lists the
  points within `COVER_R` (320 m, Manhattan). `coverPlan` greedily gives free units to posts by uncovered demand
  (`DEMAND` by district and hour × `KIND_DEMAND`), with a bonus for staying put and a cost for distance; Medic 12 only
  posts in the shift's districts. A move-up needs `MOVEUP_GAIN` (5% of the city's demand) over staying, at most every
  12 game minutes. The other units are a board with no driving: free at a post or busy for 30–65 minutes (a dot at the
  call, then at the hospital). Parked ones are merged into a few meshes (`mergeStatic`) and drawn within 200 m.
  `callZoneWeight` weights call places by demand, ×0.1 where another free unit is closer than Medic 12's post.
- **Downtime** (`26_downtime.js`). One activity at a time (`DT.act`) on game time, cancelled by a page. The rig check
  has ten items; up to three come with faults at shift start (`RR.start` clears them unless `faults: true`). Some
  faults change stock (low O₂, missing naloxone); the rest add a delay and a −2 readiness item the first time the kit is
  used on a call (`equipDelay`). Energy falls 5.5 an hour (9 overnight); below 40 actions take 8% longer, below 20 18%.
- **Workers** (`16_care.js`). `WORK.ricky`, `WORK.partner` and `WORK.medic` each run one job; `careContext` turns them into CPR
  quality, ventilation and pressure for the patient tick. Marisol takes vitals every few minutes and starts CPR on an
  arrest unless `partnerAuto` is off.
- **Scoring** (`18_review.js`). 10 response (3 turnout against 1:30 by day or 2:00 at night, 7 drive; −2 for a page
  acknowledged after a minute), 20 assessment, 35 protocol (critical checks count double), 10 destination
  and alert, 5 scene time, 5 driving, 5 handoff, 10 outcome, −6 per error (up to −36). A resuscitation that followed
  protocol isn't punished for the death.

## Modules

`01_core` helpers, RNG, clock · `02_data` ranks, rigs, cosmetics, districts, hospitals, supplies, names · `03_render`
renderer, materials, merging, textures, sky, cameras · `04_city` · `05_models` rigs, cars, people and poses, stretcher
and gear · `06_traffic` · `07_vehicle` physics and autopilot · `08_route` · `09_audio` · `10_patient` · `11_actions` ·
`12_calls` · `13_game` shift, dispatch, call stages · `24_responders` engines, police, crews and the engine medic ·
`25_posts` posts, the other medic units, move-ups · `26_downtime` rig check, restock, coffee, waiting · `14_scene` · `15_crew` Ricky, Marisol, equipment, moving,
interactions · `16_care` workers and the care panel · `17_transport` rear doors, hospital choice, the back of the rig,
handoff · `18_review` · `19_mci` · `20_hud` · `21_ui` menus · `22_input` · `23_save` · `30_main` loop and `window.RR`.

## Ideas not done

Pediatric calls and a pediatric dosing tape; SVT and bradycardia with pacing; rain and snow; a 12-lead strip view;
choosing your own partner; the other medic units driving for real; the station's day room between calls.
