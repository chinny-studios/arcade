// A wild Pelicant on Lighthouse Road squaring up to a Cindrake, mid-battle with the action menu up.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'TB');
  await page.evaluate(async () => {
    localStorage.clear();
    await TB.start({ starter: 'cindrake', lv: 17, map: 'route2', x: 13, y: 20 });
    TB.noEncounters = true;
    TB.battle('pelicant', 14);
    await TB.sim(4);
  });
  await wait(1500); await shot();
};
