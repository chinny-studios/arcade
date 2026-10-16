// A party of four fighting Wraith Lancers and Hollow Penitents in the Sunken Nave.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'VB');
  await page.evaluate(async () => {
    localStorage.clear();
    await VB.start({ name: 'Sable', role: 'vanguard', race: 'human', level: 24, allies: 3, suit: 0 });
    VB.f.buildFloor('ruins', 0, 0, 'cover');
    VB.god(true);
    const rm = VB.LV.rooms.findIndex((r) => r.type === 'pack' && r.tiles > 60);
    VB.toRoom(rm >= 0 ? rm : 1);
    for (const e of [...VB.ENTS]) if (e.team === 1 && !e.box) e.hp = 0, VB.f.dealDamage(VB.PL, e, 1e9, { noNumber: true });
    VB.sim(1.5);
    const P = VB.PL;
    VB.spawn('lancer', 3.5, -1.5, { elite: ['fire'] }); VB.spawn('penitent', 2.5, 2); VB.spawn('penitent', -3, 2.5); VB.spawn('choir', 6, 2); VB.spawn('eye', -1, -5);
    for (const e of VB.ENTS) if (e.team === 1) { e.aggro = P; e.sleep = false; }
    for (let k = 0; k < 10; k++) { const e = VB.ENTS.find((q) => q.team === 1 && !q.dead && !q.box); if (e) P.aimPt = { x: e.x, z: e.z }; VB.Input.acts.add(k % 3 === 2 ? 'atkH' : 'atkN'); VB.sim(0.2); }
    for (const id of ['#banner', '#log', '#toasts', '#qtrack', '#topBtns']) document.querySelector(id).style.visibility = 'hidden';
  });
  await wait(1200); await shot();
};
