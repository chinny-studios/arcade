// The Wolf Man tearing into a crowd outside the Rialto on Main Street, blood on the road, the rest screaming.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'CF');
  await page.evaluate(() => {
    localStorage.clear();
    CF.start({ monster: 'werewolf', god: true });
    CF.tp(-56.5, 3.6); CF.face(0);
    const vs = [];
    for (const [x, z, t] of [[-57.5, 1.3, 'sweetheart'], [-56.1, 1.1, 'greaser'], [-53, -1, 'jock'], [-61, -1.5, 'housewife'], [-51.5, -3.5, 'milkman'], [-58.5, -5, 'waitress']]) vs.push(CF.spawn(t, x, z));
    CF.aimAt(vs[1]); CF.press('atk'); CF.sim(0.25);
    for (const v of vs) if (v.state !== 'dead') { CF.f.startle(v, CF.P.x, CF.P.z); v.state = 'flee'; }
    CF.sim(0.35);
    CF.press('atk'); CF.sim(0.3);
    CF.CAM.yaw = 0.35; CF.CAM.pitch = 0.12; CF.CAM.zoom = 1.25; CF.CAM.snap = true;
    document.querySelector('#tip').hidden = true; document.querySelector('#splat').style.display = 'none'; document.querySelector('#prompt').style.visibility = 'hidden';
    CF.sim(0.05);
  });
  await wait(1500); await shot();
};
