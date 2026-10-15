// Tidemaw wades ashore and a tower comes down in smoke.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'CB'); await wait(1500);
  await page.evaluate(() => { CB.audioOff(); CB.startGame(); CB.sim(1); CB.skipIntro(); CB.sim(1); });
  for (const z of [380, 260]) {
    await page.evaluate((z) => {
      CB.MON.z = z; CB.MON.y = CB.terrainH(CB.MON.x, z);
      CB.spawnHeli(); CB.spawnHeli(); CB.spawnJets(); CB.spawnGround();
      for (let i = 0; i < 8; i++) { CB.keys.KeyW = true; CB.sim(0.4); CB.keys.KeyW = false; CB.primary(); CB.sim(0.5); CB.heavy(); CB.sim(0.5); }
    }, z);
    await wait(2500);
  }
  await shot();
};
