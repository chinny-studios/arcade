// menus: title → new career → career map → fly → notice → pause → options → map → hangar (buy, upgrade, relocate)
localStorage.clear();
CC.f.showTitle(); CC.sim(0.5);
out.r = { title: !document.querySelector('#title').hidden, cont: !document.querySelector('#btnContinue').hidden };
//--- shot u_title
window.confirm = () => true;
document.querySelector('#btnNew').click(); CC.sim(0.2);
out.r.career = !document.querySelector('#career').hidden && document.querySelectorAll('#cityList .city').length;
//--- shot u_career
document.querySelector('#cityList .city button').click(); CC.sim(1);
out.r.play = document.body.dataset.state; out.r.notice = document.querySelector('#noticeTitle').textContent;
//--- shot u_notice
document.querySelector('#noticeOk').click(); CC.sim(0.2);
CC.press('menu'); out.r.pause = !document.querySelector('#pause').hidden;
//--- shot u_pause
document.querySelector('#pOptions').click(); CC.sim(0.1);
const sel = document.querySelector('[data-opt="res"]'); sel.value = '240'; sel.dispatchEvent(new Event('change', { bubbles: true }));
out.r.res = CC.R.res;
//--- shot u_options
document.querySelector('#optClose').click(); document.querySelector('#pResume').click(); CC.sim(0.2);
CC.press('map'); CC.sim(0.2); out.r.map = !document.querySelector('#mapBig').hidden;
//--- shot u_map
CC.press('map'); CC.sim(0.1);
CC.G.career.money = 60000; CC.HELI.fuel = 50; CC.HELI.hp = 60;
CC.press('enter'); CC.sim(0.1); out.r.hangar = !document.querySelector('#hangar').hidden;
//--- shot u_hangar
const btns = [...document.querySelectorAll('#hBody button')]; btns[btns.length - 1].click();
out.r.afterService = { fuel: Math.round(CC.HELI.fuel), hp: Math.round(CC.HELI.hp), money: CC.G.career.money };
document.querySelector('[data-htab="helis"]').click();
const buy = [...document.querySelectorAll('#hBody button')].find((b) => /Buy/.test(b.textContent)); buy.click();
out.r.bought = { type: CC.HELI.type, owned: CC.G.career.owned, money: CC.G.career.money };
//--- shot u_helis
document.querySelector('[data-htab="ups"]').click();
[...document.querySelectorAll('#hBody button')][0].click();
out.r.ups = CC.G.career.ups;
document.querySelector('[data-htab="move"]').click();
//--- shot u_ups
document.querySelector('#hLeave').click(); CC.sim(0.5);
out.r.saved = !!localStorage.getItem('copter-city-save-v1');
CC.G.noSave = false; CC.f.saveGame(); out.r.saved2 = !!localStorage.getItem('copter-city-save-v1');
document.querySelector('#pQuit').click(); CC.sim(0.3);
out.r.back = document.body.dataset.state; out.r.cont2 = document.querySelector('#btnContinue').textContent;
return out.r;
