// Tidemaw wades ashore at the port and smashes into the waterfront under the downtown skyline.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'CB'); await wait(1500);
  await page.evaluate(() => { CB.audioOff(); CB.startGame(); CB.sim(1); CB.skipIntro(); CB.sim(1); });
  await page.evaluate(() => {
    CB.MON.z = 700; CB.MON.y = CB.terrainH(CB.MON.x, 700);
    CB.CAM.pitch = 0.12; CB.CAM.distT = 1.1;
    CB.spawnHeli(); CB.spawnHeli(); CB.spawnGround('tank');
    for (let i = 0; i < 5; i++) { CB.keys.KeyW = true; CB.sim(0.4); CB.keys.KeyW = false; CB.primary(); CB.sim(0.5); CB.heavy(); CB.sim(0.6); }
  });
  await wait(2500);
  await page.evaluate(() => { for (const s of ['#hint', '#banner']) document.querySelector(s).style.visibility = 'hidden'; });
  await wait(600);
  await shot();
};
