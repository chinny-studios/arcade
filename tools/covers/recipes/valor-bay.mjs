// Spindle mid-swing high above a downtown avenue, web line to a tower, traffic far below.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'VB');
  await page.evaluate(() => {
    localStorage.clear();
    VB.start({ hero: 'spindle', at: { x: 2, z: 190 }, tod: 16 });
    VB.face(0, 0.1);
    VB.hold(['travel'], 3.1, { x: 0, y: -1 });
    // keep swinging while the real frames run
    VB.Input.held2.add('travel'); VB.Input.keys.add('KeyW');
    VB.CAM.yaw = -0.55; VB.CAM.pitch = -0.05; VB.CAM.zoom = 0.85; VB.CAM.snap = true;
    document.querySelector('#tip').hidden = true; document.querySelector('#toasts').innerHTML = '';
    VB.sim(0.05);
    return VB.stats();
  });
  await wait(800); await shot();
};
