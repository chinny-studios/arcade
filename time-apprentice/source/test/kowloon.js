// The Kowloon City event's extras: every odd job (offered, worked through and finished), every album shot taken from
// its own set, and the journal page that shows them. node test/smoke.mjs --steps test/kowloon.js
const sc = TA.Scenarios.byId.kowloon, res = { jobs: {}, shots: {} };
await TA.go('kowloon', 4); TA.sim(0.3);
while (TA.HUD.dlg) await TA.skip();
res.markers = TA.Stage.ticks.length > 0;
// one job the way a player does it: aim and press E (the bag can't be picked up until the job is offered)
const aim = (x, y, z) => { TA.tp(x, z + 1.6); TA.lookAt(x, y, z); TA.sim(0.1); return TA.f.findTarget(); };
const bag = TA.Stage.items.buns, bp = bag.obj.position;
res.bagBefore = (aim(bp.x, bp.y, bp.z) || {}).kind || null;
const chow = TA.Stage.actors.chow; aim(chow.x, chow.headY - 0.3, chow.z); TA.f.interact(); while (TA.HUD.dlg) await TA.skip();
res.bagAfter = (aim(bp.x, bp.y, bp.z) || {}).kind || null; TA.f.interact();
const yip = TA.Stage.actors.yip; aim(yip.x, yip.headY - 0.3, yip.z); TA.f.interact(); while (TA.HUD.dlg) await TA.skip(); TA.sim(0.2);
res.byHand = TA.Jobs.st('buns');
if (res.bagBefore === 'item' || res.bagAfter !== 'item' || res.byHand !== 'done') throw new Error(JSON.stringify(res));
for (const id of Object.keys(sc.jobs)) { res.jobs[id] = await TA.job(id); TA.sim(0.2); }
res.jobFacts = Object.values(sc.jobs).every((j) => TA.Journal.got('kowloon').includes(j.fact));
// each shot from the set it belongs to (planes and trams are sent along first where the shot needs them)
const where = {}; for (const [k, set] of Object.entries(sc.sets)) { TA.Story.loadSet(sc, k); for (const id in TA.Stage.spots) if (id.startsWith('shot:')) where[id.slice(5)] = k; }
for (const [id, set] of Object.entries(where)) {
  TA.Story.loadSet(sc, set);
  const D = TA.Stage.data; if (D.fly) { D.fly({ sec: 10, sound: false }); TA.sim(4); } if (D.tram) D.tram.position.x = TA.Stage.spots['shot:' + id].x;
  const s = TA.Stage.spots['shot:' + id]; TA.tp(s.x + 2, s.z + 2); TA.lookAt(s.x, s.y + s.dy, s.z);
  const why = s.use(s); res.shots[id] = TA.Album.has('kowloon', id);
}
res.album = TA.shots().kowloon;
res.pics = Object.keys(TA.Album.pics).filter((k) => k.startsWith('kowloon:')).length;
const bad = Object.entries(res.jobs).filter(([, v]) => v !== 'done').concat(Object.entries(res.shots).filter(([, v]) => !v));
if (bad.length || !res.jobFacts || res.album !== '15/15') throw new Error(JSON.stringify(res));
await TA.go('kowloon', 4); TA.sim(0.2); while (TA.HUD.dlg) await TA.skip();
TA.HUD.openJournal('kowloon'); document.querySelector('.jpage').scrollTop = 1e5;
return res;
//--- shot k_journal
TA.HUD.close(false); return 'ok';
