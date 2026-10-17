// A bus-crash MCI at Paramedic rank: triage everyone with START, send the report, treat and transport our red tag.
const c = RR.call('mci');
RR.toScene();
RR.f.exitCab();
RR.sim(1);
return { c, stage: RR.C.stage, n: RR.C.mci.pts.length, kinds: RR.C.mci.pts.map((p) => p.mciKind + '→' + p.triage) };
//--- shot m1_scene
const C = RR.C, L = [];
for (const P of C.mci.pts) {
  RR.PLAYER.x = P.where.x + 1.4; RR.PLAYER.z = P.where.z; RR.sim(0.1);
  const it = RR.f.interactions().find((i) => i.label.startsWith('Triage'));
  if (!it) { L.push('no triage prompt'); continue; }
  it.fn();
  for (const b of [...document.querySelectorAll('#triActs button')]) if (!b.classList.contains('dis')) b.click();
  L.push(document.querySelector('#triRes').innerText.replace(/\n/g, ' '));
  if (L.length === 2) break;
}
RR.render();
return L;
//--- shot m2_triage
const C2 = RR.C;
for (const P of C2.mci.pts) if (!C2.mci.tags.has(P)) RR.f.tagPatient(P, RR.f.startTag(P));
RR.UI.hide('triage');
RR.f.sendMCIReport();
RR.sim(1);
return { tagged: C2.mci.tags.size, patients: C2.patients.length, main: RR.P.mciKind };
//--- shot m3_report
RR.toPatient();
for (const a of ['ppe', 'impression', 'tq', 'abc', 'exam']) RR.act(a);
RR.act('warm', 'partner'); RR.act('iv'); RR.act('txa');
RR.pack('board');
RR.transport('general', 'partner', 'trauma', true);
RR.sim(2); RR.arrive();
return RR.handoff(true);
//--- shot m4_review
