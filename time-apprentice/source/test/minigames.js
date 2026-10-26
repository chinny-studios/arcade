// Screenshot of every minigame a few moments in. node test/smoke.mjs --steps test/minigames.js
const M = TA.Minigames;
window.__show = async (sc, ci, step, ms, n) => { const M = TA.Minigames; await TA.go(sc, ci); TA.sim(0.2); const st = TA.Story.sc.chapters[ci].steps[step]; M.open(st.play, st, () => {}); M.start(); for (let i = 0; i < n; i++) M.update(1/30); };
await window.__show('giza', 0, 4, 0, 120);
//--- shot mg_rhythm
const M = TA.Minigames, show = window.__show;
M.finish(); await show('giza', 2, 2, 0, 60);
//--- shot mg_align
const M = TA.Minigames, show = window.__show;
M.finish(); await show('giza', 3, 3, 0, 10); M.g.def.pick(M.g, M.g.pal.findIndex(t => t.id === 'kh'));  M.update(1/30);
//--- shot mg_spell
const M = TA.Minigames, show = window.__show;
M.finish(); await show('giza', 4, 3, 0, 10); for (let i=0;i<7;i++) { M.g.hits.plus = true; M.update(1/30); }
//--- shot mg_count
const M = TA.Minigames, show = window.__show;
M.finish(); await show('mainz', 1, 3, 0, 10); TA.Input.press('Space'); for (let i=0;i<40;i++) M.update(1/30);
//--- shot mg_pour
const M = TA.Minigames, show = window.__show;
TA.Input.release('Space'); M.finish(); await show('mainz', 2, 2, 0, 5); M.g.def.pick(M.g, M.g.pal.findIndex(t => t.id === 'I'));  M.update(1/30);
//--- shot mg_type
const M = TA.Minigames, show = window.__show;
M.finish(); await show('mainz', 3, 2, 0, 5); M.g.def.pick(M.g, M.g.cards.findIndex(c => c.i === 0)); M.update(1/30);
//--- shot mg_order
const M = TA.Minigames, show = window.__show;
M.finish(); await show('kittyhawk', 0, 4, 0, 5); M.g.hits.test = true; M.update(1/30); for (let i=0;i<30;i++) M.update(1/30);
//--- shot mg_tunnel
const M = TA.Minigames, show = window.__show;
M.finish(); await show('kittyhawk', 1, 4, 0, 90);
//--- shot mg_kite
const M = TA.Minigames, show = window.__show;
M.finish(); await show('kittyhawk', 3, 3, 0, 150);
//--- shot mg_photo
const M = TA.Minigames, show = window.__show;
M.finish(); await show('apollo11', 1, 4, 0, 20);
//--- shot mg_lookup
const M = TA.Minigames, show = window.__show;
M.finish(); await show('apollo11', 2, 1, 0, 200);
//--- shot mg_lander
const M = TA.Minigames, show = window.__show;
M.finish();
// the Kowloon City minigames, found by id in their chapter; keys are pressed through Input, as a player would
window.__play = async (ci, id, n, f) => { const M = TA.Minigames; if (M.g) M.finish(); await TA.go('kowloon', ci); TA.sim(0.2); const st = TA.Story.sc.chapters[ci].steps.find((s) => s.play === id); M.open(st.play, st, () => {}); M.start(); for (let i = 0; i < n; i++) { if (f) f(M.g, i); M.update(1/30); } };
await __play(0, 'maze', 40, (g, i) => { if (i === 0) TA.Input.press('ArrowRight'); if (i === 20) { TA.Input.release('ArrowRight'); TA.Input.press('ArrowDown'); } });
//--- shot mg_maze
TA.Input.release('ArrowDown'); TA.Input.press('Space');
await __play(3, 'milktea', 30);
//--- shot mg_milktea
TA.Input.release('Space');
await __play(4, 'neon', 40, (g, i) => { if (i === 2) TA.Input.press('Space'); if (i === 35) TA.Input.release('Space'); });
//--- shot mg_neon
TA.Input.release('Space');
await __play(5, 'minibus', 150);
//--- shot mg_minibus
await __play(6, 'mahjong', 5, (g, i) => { if (i === 1) g.def.pickTile(g, 0); });
//--- shot mg_mahjong
await __play(7, 'approach', 150);
//--- shot mg_approach
await __play(5, 'rhythm', 120);
//--- shot mg_ferry
TA.Minigames.finish(); return 'ok';
