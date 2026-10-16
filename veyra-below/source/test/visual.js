// Screenshot tour. node test/smoke.mjs --no-start --steps test/visual.js
VB.UI.showTitle(); VB.sim(0.5);
//--- shot v_title
document.querySelector('[data-a^="new:"]').click(); VB.sim(0.3);
const inp = document.querySelector('#cname'); inp.value = 'Sable'; inp.dispatchEvent(new Event('input', { bubbles: true }));
document.querySelector('[data-a="role:psion"]').click(); document.querySelector('[data-a="race:sylph"]').click(); VB.sim(0.5);
//--- shot v_create
VB.start({ role: 'vanguard', race: 'human', level: 8, allies: 3 }); VB.sim(2);
document.querySelectorAll('.dlg').forEach((d) => d.remove());
//--- shot v_hub
VB.UI.openMenu('gear'); VB.sim(0.1);
//--- shot v_menu
VB.UI.close(true); VB.UI.openMenu('skills'); VB.sim(0.1);
//--- shot v_skills
VB.UI.close(true); VB.UI.openNpc('shop'); VB.sim(0.1);
//--- shot v_shop
VB.UI.close(true); VB.UI.openTeleporter(); VB.sim(0.1);
//--- shot v_tele
VB.UI.close(true);
F.buildFloor('caves', 0, 0, 'vis2'); VB.god(true);
VB.toRoom(VB.LV.rooms.findIndex((r) => r.type === 'pack')); VB.sim(3);
//--- shot v_caves
F.buildFloor('mines', 1, 0, 'vis3'); VB.god(true);
VB.toRoom(VB.LV.rooms.findIndex((r) => r.type === 'lock')); VB.sim(2.5);
//--- shot v_mines
F.buildFloor('ruins', 0, 0, 'vis4'); VB.god(true);
VB.toRoom(VB.LV.rooms.findIndex((r) => r.type === 'lock')); VB.sim(2.5);
//--- shot v_ruins
F.buildFloor('forest', 2, 0, 'vis5'); VB.god(true); VB.toRoom(1); VB.sim(4);
//--- shot v_boss
