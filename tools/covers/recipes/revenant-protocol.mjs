// Mission 3, the Kethra foundry: lava floor, coolant pump and catwalks.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'RP');
  await page.evaluate(() => {
    RP.start(2, 1); RP.god(); RP.peace();
    RP.tp(21, 24, -Math.PI / 2 - 0.2); RP.look(-Math.PI / 2 - 0.2, -0.15); RP.sim(0.3); RP.shot();
  });
  await wait(1000); await shot();
};
