// Career: promotions and district unlocks from XP, buying in the garage, a save round trip, and the end of a shift.
localStorage.clear();
const G = RR.G;
G.noSave = false;
G.career = RR.f.newCareer({ look: { skin: 0xc68c62, hair: 0x1c1612, style: 'bun' } });
const K = G.career, L = [];
L.push(['start', K.rank, K.districts.join(',')]);
K.xp = 600; RR.f.saveGame();
const u1 = updateUnlocksProbe(); function updateUnlocksProbe() { const before = K.districts.length; K.rank = 0; RR.f.loadGame(); return [G.career.districts.join(','), G.career.rank]; }
L.push(['xp600', ...u1]);
G.career.xp = 4000; RR.f.saveGame(); RR.f.loadGame();
L.push(['xp4000', G.career.rank, G.career.districts.join(',')]);
// garage: buy the Type III and a livery
G.career.money = 20000;
RR.f.showStation('garage');
[...document.querySelectorAll('#stBody .card')].find((c) => c.textContent.includes('Type III')).click();
[...document.querySelectorAll('#stBody .card')].find((c) => c.textContent.includes('County Battenburg')).click();
L.push(['bought', G.career.rig, G.career.livery, G.career.money, G.career.rigs.join(',')]);
// not enough money
G.career.money = 10;
[...document.querySelectorAll('#stBody .card')].find((c) => c.textContent.includes('Type I Heavy')).click();
L.push(['broke', G.career.rig, G.career.money]);
RR.f.saveGame();
const saved = JSON.parse(localStorage.getItem('ricky-rescue.save.v1'));
L.push(['saved', saved.rig, saved.livery, saved.rigs.join(','), saved.look.style]);
await wait(500);
return L;
//--- shot c1_garage
// a 4-hour evening shift with one quick call that ends past the shift end
document.querySelector('#stTabs button').click();
[...document.querySelectorAll('#stBody .chip')].find((c) => c.textContent.includes('4 hours')).click();
document.querySelector('#stGo').click();
await wait(300);
RR.G.live = false;
const c = RR.call('lift');
RR.G.clockT = RR.G.shift.endT - 60;
RR.toScene(); RR.toPatient();
for (const a of ['ppe', 'impression', 'abc', 'exam', 'glucose', 'sample']) RR.act(a);
for (const a of ['pulse', 'bp', 'rr', 'spo2']) RR.act(a, 'partner');
RR.act('refusal'); RR.sim(4);
const rv = RR.UI.isOpen('review');
document.querySelector('#rvOk').click();
await wait(1500);
return { type: c.type, rig: RR.RIG.type, review: rv, over: RR.G.shift && RR.G.shift.over, shiftPanel: RR.UI.isOpen('shiftOver'), calls: RR.G.career.stats.calls };
//--- shot c2_shift_over
document.querySelector('#soOk').click(); await wait(500);
return { state: document.body.dataset.state, saved: JSON.parse(localStorage.getItem('ricky-rescue.save.v1')).stats.calls };
//--- shot c3_station_after
