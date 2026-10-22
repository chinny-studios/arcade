// sim flight, crash and insurance, on foot (walk, fall, tokens, chat), audio and the radio, draw calls
const H = CC.HELI, G = CC.G, r = {};
// sim flight model: raise the collective until it lifts, then hold a hover
CC.OPTS.flight = 'sim';
CC.hold({ coll: 1 }, 2.5); r.sim1 = { coll: +H.coll.toFixed(2), y: +H.y.toFixed(1), vy: +H.vy.toFixed(1) };
CC.hold({ coll: -1 }, 0.9); CC.hold({}, 3); r.sim2 = { coll: +H.coll.toFixed(2), y: +H.y.toFixed(1), vy: +H.vy.toFixed(1) };
CC.hold({ fwd: 1 }, 1.5); CC.hold({}, 4); r.sim3 = { pitch: +H.pitch.toFixed(2), v: +Math.hypot(H.vx, H.vz).toFixed(1), y: +H.y.toFixed(1) };
CC.hold({ pedal: 1 }, 1); r.sim4 = { yawRate: +H.yawRate.toFixed(2) };
CC.OPTS.flight = 'arcade';
// audio and the radio, every station
CC.Input.acts.add('x'); CC.AUDIO.init(); r.audio = !!CC.AUDIO.ctx;
for (let s = 1; s < 4; s++) { CC.f.MUSIC.setStation(s); CC.sim(2); }
r.song = CC.f.MUSIC.song && CC.f.MUSIC.song.title;
CC.f.MUSIC.setStation(0);
for (const n of ['click', 'cash', 'splash', 'boom', 'mega', 'quake', 'siren', 'coin', 'fanfare']) CC.AUDIO.sfx(n);
H.siren = true; CC.AUDIO.siren(true); CC.sim(1); CC.AUDIO.siren(false);
// on foot: land, get out, walk, chat, a token
CC.tp(H.x, H.z, 0); CC.f.exitHeli(); r.foot = G.where;
const t = CC.CITY.tokens.find((k) => k.y < 3) || CC.CITY.tokens[0];
Object.assign(CC.PILOT, { x: t.x + 0.5, z: t.z + 0.5, y: t.y - 1.4 }); CC.sim(0.5);
r.token = { got: t.got, money: G.career.money };
// a fall off a roof
const B = CC.CITY.buildings.find((b) => b.h > 20 && !b.gable);
Object.assign(CC.PILOT, { x: B.x0 - 0.3, z: (B.z0 + B.z1) / 2, y: B.h + 0.01, ground: false, fallFrom: B.h, vy: 0 }); CC.sim(4);
r.fall = { y: +CC.PILOT.y.toFixed(1), money: G.career.money };
// back to the heli
Object.assign(CC.PILOT, { x: H.x + 2, z: H.z + 2, y: H.y }); CC.press('use'); r.back = G.where;
// crash: flyinto the ground hard
CC.tp(H.x + 30, H.z, 60); CC.f.damageHeli(500, "test"); CC.sim(8); r.crash = { crashing: !!H.crashing, crashed: H.crashed };
await wait(2800); CC.sim(0.2);
r.notice = document.querySelector('#noticeTitle').textContent;
document.querySelector('#noticeOk').click(); CC.sim(0.5);
r.after = { hp: Math.round(H.hp), pad: H.pad && H.pad.kind, money: G.career.money, crashed: H.crashed };
// draw calls in the biggest city
CC.f.startCity({ city: 'metro', heli: 'raptor', free: true, hour: 12, quiet: true, dispatch: false });
CC.tp(CC.CITY.size / 2, CC.CITY.size / 2, 80, 0.5); CC.sim(0.5); CC.render();
r.metro = { calls: CC.R.renderer.info.render.calls, tris: CC.R.renderer.info.render.triangles, geos: CC.R.renderer.info.memory.geometries, buildings: CC.CITY.buildings.length };
return r;
