// Screenshots of each stage in a busy moment, plus the level-up, chest, pause and results screens.
//   node test/smoke.mjs --steps test/visual.js
NW.start({ stage: 's1', pilot: 'ryn', seed: 'v1' }); NW.god(true);
for (const w of ['lash', 'drones', 'mines', 'missiles', 'tesla']) NW.give(w, 6);
NW.give('blaster', 5); NW.give('emitter', 2);
NW.sim(250);
NW.event('elite', 1);
NW.sim(4);
//--- shot s1
NW.start({ stage: 's2', pilot: 'sable', seed: 'v2' }); NW.god(true);
for (const w of ['rail', 'gravity', 'missiles', 'tesla']) NW.give(w, 7);
NW.give('drones', 8);
NW.time(296); NW.sim(10);
//--- shot s2
NW.start({ stage: 's3', pilot: 'kade', seed: 'v3' }); NW.god(true);
for (const w of ['storm', 'siphon', 'halo', 'nullwake', 'barrage', 'horizon']) NW.give(w, 1);
for (const p of ['plating', 'amp', 'capacitor', 'emitter']) NW.give(p, 4);
NW.time(780); NW.sim(30); NW.time(899); NW.sim(6);
//--- shot s3
NW.start({ stage: 's1', pilot: 'ixa', seed: 'v4' });
NW.give('gravity', 3); NW.give('tesla', 2); NW.give('tractor', 1); NW.sim(40);
out.lv = NW.levelUp();
return out.lv;
//--- shot levelup
NW.UI.pick(0); NW.give('gravity', 8); NW.give('plating', 1);
out.ch = NW.chest('boss');
await wait(1200);
return out.ch;
//--- shot chest
NW.UI.resume(); NW.pause();
//--- shot pause
NW.UI.resume(); NW.end(false);
//--- shot results
