// the promotion: meet Dover's goal, get the bonus and the job offer, relocate to Port Halley from the hangar
const G = CC.G, car = G.career;
for (const c of CC.CITIES) car.cities[c.id].unlocked = c.id === 'dover';
car.cities.dover.done = 5;
const c = CC.call('jam'); CC.f.finishCall(c, true, 600, 'ok');
const r = { done: car.cities.dover.done, passed: car.cities.dover.passed, halley: car.cities.halley.unlocked, notice: document.querySelector('#noticeTitle').textContent, money: car.money };
document.querySelector('#noticeOk').click();
CC.tp(CC.CITY.home.x, CC.CITY.home.z, 0); CC.press('enter');
document.querySelector('[data-htab="move"]').click();
const b = [...document.querySelectorAll('#hBody button')].find((x) => x.textContent === 'Relocate'); b.click(); CC.sim(0.5);
r.city = CC.CITY.def.id; r.carCity = car.city; r.notice2 = document.querySelector('#noticeTitle').textContent;
return r;
//--- shot career_halley
