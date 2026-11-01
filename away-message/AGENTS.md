# Away Message

A simulation of an early-2000s family Windows desktop, played as a sandbox with achievements. It's Friday night,
June 15 2001: dial up with **AmeriNet Online**, download songs from strangers on **Snapster**, play them in the
skinnable **ZapAmp**, chat and set away messages on **BuddyChat**, and put up with **Bongo Buddy**, the singing pink
gorilla who keeps installing "free" toolbars. Every throwback thing you find or survive unlocks an achievement.

Everything is parody (Windoze Me, AmeriNet, Snapster, BuddyChat, Bongo) with **all original art, sound and music** —
no real logos, sounds or songs. Plain DOM + `<canvas>`, **no libraries**: every icon and the gorilla are drawn in
code, every sound effect and song is synthesized.

- **Read first:** `source/DESIGN.md` (architecture, the module map, the "virus" model, how songs are generated).
- **Build:** `cd source && python3 build.py`, which concatenates `src/*.js` (numeric order, one shared IIFE scope),
  wraps `src/page.html`, writes `../index.html`, and runs `node --check` on the bundle.
- **Files:** `01_core` (helpers, game-time scheduler `after`/`every`/`onTick`, the save `S`), `02_audio` /
  `03_voice` / `04_music` (SFX, the formant singing voice, the seeded song generator + sequencer `MP`), `05_icons`
  (every icon on a 32×32 grid), `06_wm` (windows, menus, dialogs), `07_fs` (virtual files, Explorer, Notepad, DOS,
  Run), `08_desktop` (apps, Start menu, tray), `09_system` (Control Panel, wallpapers, boot/shutdown/BSOD),
  `10_net` (dial-up, Mom, mail), `11_catalog`/`12_snapster`/`13_zapamp` (songs + the fake P2P + the player),
  `14_buddies`/`15_buddychat`/`16_culture` (buddies, IMs, chat rooms, profiles/away-message culture),
  `17_bongo` (the gorilla), `18_web` (Internet Exploder + a fake 2001 web), `19_virus` (harmless in-game "viruses"
  + VirusBlaster + Ad-Be-Gone), `20_fx` (confetti, screen savers, toast), `21_games` (Mine Finder, Solitaire,
  Pinball), `22_achievements`, `23_install` (download + setup wizard), `24_progz` (the PhAnToM 3.2 prog: punter, IM bomber, fader, macros,
  anti-punt, the Progz 4 Trade room, the progz site and TOS warnings), `99_main` (boot, frame loop, debug hook).
- **Debug hook:** open with `#debug` → `window.AM`. `AM.start()` readies the desktop without the power-on
  sequence; `AM.sim(sec)` fast-forwards game time (downloads, Mom, buddies, Bongo). Helpers: `AM.sn(name)`,
  `AM.connect()`/`AM.disconnect()`, `AM.give(songId, kbps, kind)`, `AM.search(a, t)`, `AM.open(appId)`,
  `AM.buddyOn(sn)`, `AM.bongo()`, `AM.sing(id)`, `AM.adware(id)`, `AM.virus(payload)`, `AM.bsod()`,
  `AM.saver(id)`, `AM.progz()` (gives the prog + its DLL and opens it), `AM.punt(sn, kind)`, `AM.punted(from)`,
  `AM.bomb(sn, text, n)`, `AM.fade(text, preset)`, `AM.macro(room, name)`, `AM.unlock(id)`, `AM.unlockAll()`, `AM.reset()`, and the objects `AM.S/WM/NET/BC/SNAP/ZAP/BONGO`.
- **Tests (in `source/`):** `node test/smoke.mjs --steps test/play.js` drives a full session (connect, download,
  chat, Bongo, games, browser) and fails on any console/page error; `--steps test/flow.js` checks the portal,
  search, mail and the trophy case. `test/progz.js` and `test/progz2.js` cover punting, getting punted, anti-punt,
  IM bombs, the fader, macros and getting TOS'd; they step game time in small slices (`run()`) because the prog's
  scripted sequences `await sleep()` between steps. Screenshots land in `test/out/` (git-ignored). The runner resets the save and
  reloads before each run.
- **Gotchas:** all `src/*.js` share one scope, so names are global across files; only `window.AM` and a few
  `window.__*` callbacks are exposed outside the IIFE. Timers (`after`/`every`) run on **game time**, which
  `AM.sim()` advances and which pauses while a full-screen `#screen` (boot/BSOD/ScanDisk) is up. Song length is
  cached by a key built from the track fields in `11_catalog.js` — include any new field that changes the music.
  Progz are the same: a punt only signs a simulated buddy off, and getting punted only closes BuddyChat. The "viruses" are cosmetic (pop-ups, flipped screen, mouse trails, melt, a fake BSOD) and never touch anything
  real; keep them that way.
- **Save:** everything lives in `localStorage` under `away-message`. `AM.reset()` or My Achievements → Reset wipes it.
