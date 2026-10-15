// Lightning over the village square: notice board, church, and the tall man between the houses.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'HM'); await wait(1500);
  await page.evaluate(() => {
    HM.start(); document.querySelector('#intro').classList.remove('on');
    const P = HM.P, M = HM.M, x = 6, z = 12, yaw = -0.35, d = 13, side = 2.5;
    Object.assign(P, { x, z, yaw, pitch: 0.1 });
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    M.active = false; M.intro = false; M.group.visible = true; // the opening glimpse: he stands and watches
    M.x = x + fx * d - fz * side; M.z = z + fz * d + fx * side;
  });
  await wait(1000);
  await page.evaluate(() => { HM.strike(); HM.LT.power = 1; });
  await wait(150); await shot(); // the flash fades fast; retry if it comes out dark
};
