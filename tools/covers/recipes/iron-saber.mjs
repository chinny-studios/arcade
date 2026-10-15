// The Valiant in third person among New Haven's towers, with Dominion suits ahead.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'IS'); await wait(1500);
  await page.evaluate(() => { IS.audioOff(); IS.startGame(); IS.sim(0.5); IS.enter('valiant'); IS.setZones(false); IS.sim(1); });
  for (const [x, z, ex, ez] of [[0, 330, 0, 230], [140, 330, 140, 220], [-70, 300, -40, 190]]) {
    await page.evaluate(([x, z, ex, ez]) => {
      IS.tp(x, z); IS.sim(0.5);
      const yaw = Math.atan2(x - ex, z - ez);
      IS.spawnEnemy(ex, ez, { yaw }); IS.spawnEnemy(ex + 40, ez - 30, { yaw });
      IS.camMode = 'tp'; IS.sim(0.3);
      IS.lookAt(ex, IS.terrainH(ex, ez) + 14, ez); IS.sim(0.3);
      document.querySelector('#hint').classList.remove('on');
    }, [x, z, ex, ez]);
    await wait(2000);
  }
  await shot();
};
