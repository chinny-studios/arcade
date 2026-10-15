// A staged clash near the British line: Mark IVs and infantry pushing through a village under fire.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'MI'); await wait(1500);
  await page.evaluate(() => { MI.start({ fog: false, size: 's', seed: 77 }); MI.sim(2); });
  await wait(3000);
  await page.evaluate(() => {
    const hq0 = MI.units(0).find((e) => e.type === 'hq') || MI.units(0)[0];
    const hq1 = MI.units(1).find((e) => e.type === 'hq') || MI.units(1)[0];
    const dx = hq1.x - hq0.x, dz = hq1.z - hq0.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux;
    const at = (f, s) => [hq0.x + ux * f + px * s, hq0.z + uz * f + pz * s];
    const mine = [], theirs = [];
    for (let i = 0; i < 6; i++) mine.push(MI.spawnUnit(i < 4 ? 'rifle' : 'mg', 0, ...at(45, -30 + i * 12)));
    mine.push(MI.spawnUnit('mark4', 0, ...at(38, -8)), MI.spawnUnit('mark4', 0, ...at(38, 14)));
    for (let i = 0; i < 6; i++) theirs.push(MI.spawnUnit(i < 4 ? 'rifle' : 'mg', 1, ...at(95, -30 + i * 12)));
    theirs.push(MI.spawnUnit('a7v', 1, ...at(100, 0)));
    MI.orderMove(mine, ...at(90, 0), false, true);
    MI.orderMove(theirs, ...at(45, 0), false, true);
    MI.sim(13);
    const live = mine.filter((e) => !e.dead);
    const cx = live.reduce((s, e) => s + e.x, 0) / live.length, cz = live.reduce((s, e) => s + e.z, 0) / live.length;
    document.querySelector('#banner').style.visibility = 'hidden'; // its fade outlasts a slow frame
    Object.assign(MI.CAM, { x: cx, z: cz, yaw: Math.atan2(ux, uz) + Math.PI + 0.5, pitch: 0.5, dist: 48, tdist: 48 });
    MI.render();
  });
  await wait(1500); await shot();
};
