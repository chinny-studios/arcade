// Plays through every errand and feature headless and checks the results. Run from source/:
//   node test/smoke.mjs --steps test/play.js
// Returns {fails: [...]} at the end; the runner prints it. Screenshots go to test/out/.
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const NRs = () => NR.state();
// ---- Milton Mansion's door and the lobby
const d = NR.W.LP.miltonDoor;
NR.tp(d[0] - 1, d[1], -Math.PI / 2);
ok(NR.focus() === 'Enter Milton Mansion', 'door prompt: ' + NR.focus());
NR.use(); await wait(700);
ok(NRs().space === 'milton', 'inside Milton');
NR.render();
window.__f = fails;
return { fails };
//--- shot play_lobby
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- egg tarts for the guard -> roof key
let t = NR.talk('guard'); ok(t && t.opts.length === 2, 'guard offers errand'); NR.choose(0); NR.close();
ok(NR.ST.er.tarts === 1, 'tarts stage 1');
NR.toNPC('baker'); t = NR.talk('baker'); ok(t && /HK\$36/.test(t.opts[0]), 'stall sells tarts'); NR.choose(0); NR.close();
ok(NR.ST.items.tarts === 1 && NR.ST.money === 264, 'bought tarts');
NR.enterMilton('G'); NR.talk('guard'); NR.choose(0); NR.close();
ok(NR.ST.roofKey && NR.ST.er.tarts === 'done', 'roof key');
// ---- the directory and a tenant's door
NR.PL.x = 26.5; NR.PL.z = -2.2; NR.look(0, 0);
ok(NR.focus() === 'Read the directory', 'directory prompt: ' + NR.focus());
const ten = NR.MAP.milton.filter((m) => m[0] && m[1]);
if (ten.length) {
  NR.enterMilton(ten[0][0]);
  const D = [{ u: 'A', x: 4, s: -1 }, { u: 'B', x: 4, s: 1 }, { u: 'C', x: 11, s: -1 }, { u: 'D', x: 11, s: 1 }].find((q) => q.u === ten[0][1]);
  if (D) { NR.PL.x = D.x + 0.65; NR.PL.z = D.s * 0.6; NR.look(D.s < 0 ? 0 : Math.PI, 0); ok(/^Knock: /.test(NR.focus() || ''), 'tenant door: ' + NR.focus()); }
}
NR.render();
return { fails };
//--- shot play_tenant_floor
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- the roof
NR.lift('R'); await wait(1300); NR.sim(0.2);
ok(NR.state().space === 'roof' && NR.state().y > 30, 'on the roof');
NR.render();
return { fails };
//--- shot play_roof
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- curry for the tailor, then the suit to the Peninsula
NR.toNPC('tailor'); NR.talk('tailor'); NR.choose(0); NR.close();
ok(NR.ST.er.curry === 1 && NR.ST.money === 314, 'curry errand given money');
NR.toNPC('raj'); NR.talk('raj'); NR.choose(0); NR.close(); ok(NR.ST.items.curry === 1, 'bought curry');
NR.toNPC('tailor'); NR.talk('tailor'); NR.choose(0); NR.close(); ok(NR.ST.items.suit === 1 && NR.ST.er.curry === 2, 'got suit');
NR.toNPC('doorman'); NR.talk('doorman'); NR.choose(0); NR.close(); ok(NR.ST.er.curry === 'done', 'suit delivered');
// ---- the paper and the flamingos
NR.toNPC('granny'); NR.talk('granny'); NR.choose(0); NR.close();
NR.toNPC('news'); NR.talk('news'); NR.choose(0); NR.close(); ok(NR.ST.items.paper === 1, 'bought paper');
NR.toNPC('granny'); NR.talk('granny'); NR.choose(0); NR.close(); ok(NR.ST.er.paper === 'done' && NR.ST.er.flamingo === 1, 'paper done');
NR.toNPC('warden'); t = NR.talk('warden');
const right = t.opts.indexOf(String(NR.W.flamingoCount)); ok(right >= 0, 'flamingo answer offered');
NR.choose(right); NR.choose(0); NR.close(); ok(NR.ST.er.flamingo === 'done', 'flamingos counted');
NR.render();
return { fails, money: NR.ST.money };
//--- shot play_warden
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- milk tea for Uncle Sam
NR.toNPC('fai'); NR.talk('fai'); NR.choose(0); NR.close();
NR.toNPC('sam'); NR.talk('sam'); NR.choose(0); NR.close(); ok(NR.ST.er.milktea === 'done' && NR.ST.freeRide, 'milk tea delivered');
// ---- Ingrid's photo at the Clock Tower
NR.toNPC('ingrid'); NR.talk('ingrid'); NR.choose(0); NR.close();
const n = NR.NPC.ingrid, ct = NR.LANDMARKS.find((l) => l.id === 'clocktower');
// stand so that Ingrid is in front of the tower
const dx = n.x - ct.x, dz = n.z - ct.z, L = Math.hypot(dx, dz);
NR.tp(n.x + dx / L * 14, n.z + dz / L * 14); NR.lookAt(ct.x, 14, ct.z); NR.sim(0.1);
NR.camera(true); NR.render(); NR.photo(); NR.camera(false);
ok(NR.ST.er.ingrid === 2, 'Ingrid photo taken (stage ' + NR.ST.er.ingrid + ')');
NR.toNPC('ingrid'); NR.talk('ingrid'); NR.choose(0); NR.close(); ok(NR.ST.er.ingrid === 'done', 'Ingrid done');
NR.render();
return { fails };
//--- shot play_clock
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- A Symphony of Lights for Kit
NR.toNPC('kit'); NR.talk('kit'); NR.choose(0); NR.close();
NR.time(20.05); NR.sim(1); NR.look(Math.PI, 0.05); NR.camera(true); NR.render(); NR.photo(); NR.camera(false);
ok(NR.ST.er.show === 2, 'show photo (stage ' + NR.ST.er.show + ', vps ' + NR.vps().join() + ')');
NR.toNPC('kit'); NR.talk('kit'); NR.choose(0); NR.close(); ok(NR.ST.zoom && NR.ST.er.show === 'done', 'zoom lens');
NR.look(Math.PI, 0.05); NR.render();
return { fails };
//--- shot play_show
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
// ---- the Star Ferry: board, cross, stay aboard at Central, get off back in TST
NR.time(15);
let tries = 0; while (NR.ferryState().every((s) => s[0] !== 'tst') && tries++ < 400) NR.sim(1, 0.5);
NR.board(); ok(NR.state().space === 'ferry', 'aboard');
NR.sim(120, 0.25); ok(NR.state().space === 'ferry', 'still aboard mid-harbour');
NR.look(NR.PL.yaw + 1.3, 0); NR.render();
window.__fs = NR.ferryState();
return { fails, ferry: NR.ferryState() };
//--- shot play_ferry
const fails = window.__f, ok = (c, m) => { if (!c) fails.push(m); };
let k = 0; while (!(NR.focus() || '').startsWith('Get off') && k++ < 800) NR.sim(1, 0.5);
ok((NR.focus() || '').startsWith('Get off'), 'ferry back at TST');
NR.use(); await wait(700); ok(NR.state().space === 'street', 'off the ferry');
// ---- landmarks, map, notebook, save
for (const L of NR.LANDMARKS) { NR.go(L.id); NR.sim(0.2); }
ok(Object.keys(NR.ST.found).length >= NR.LANDMARKS.length - 1, 'landmarks found: ' + Object.keys(NR.ST.found).length + '/' + NR.LANDMARKS.length);
const saved = JSON.parse(localStorage.getItem('nathan-road-save') || '{}');
ok(saved.er && saved.er.tarts === 'done', 'saved progress');
NR.map(); await wait(150);
return { fails, found: Object.keys(NR.ST.found).length, photos: NR.ST.photos.length, money: NR.ST.money };
//--- shot play_map
NR.closePanels(); NR.journal('er'); await wait(150);
return { fails: window.__f };
//--- shot play_journal
