// Plays every event from the time dial to its souvenir with TA.auto(), then checks the save and the shelf.
// node test/smoke.mjs --steps test/play.js
const res = {};
TA.sim(0.5);
// the workshop intro ends with the time dial open
const intro = await TA.auto(20, 0.3);
res.intro = intro.includes('use dial') && intro.includes('eras');
if (TA.HUD.open) TA.HUD.close(false);
for (const sc of TA.Scenarios.sorted()) {
  await TA.f.travel(sc.id);
  const log = await TA.auto(600, 0.3);
  res[sc.id] = { steps: log.length, stuck: log.filter((r) => r === 'stuck').length, done: !!TA.SAVE.data.done[sc.id], facts: TA.Journal.count(sc.id) + '/' + Object.keys(sc.facts).length, back: TA.Story.sc.id };
}
TA.sim(1);
res.shelf = Object.keys(TA.Stage.spots).filter((k) => k.startsWith('souv-')).length;
res.allDone = TA.Scenarios.sorted().every((sc) => TA.SAVE.data.done[sc.id]);
if (!res.allDone || !res.intro) throw new Error('play-through failed: ' + JSON.stringify(res));
return res;
//--- shot play_shelf
TA.tp(-5.5, 0, Math.PI / 2); TA.look(Math.PI / 2, -0.15); TA.sim(0.3); TA.render();
//--- shot play_shelf2
