// The Alder family at home in the starter cottage on a late afternoon: dinner on the go, a chat on the sofa, homework.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'WL');
  await page.evaluate(() => {
    localStorage.clear();
    WL.start({ preset: 0, seed: 'cover', hour: 16.5 });
    WL.G.options.freeWill = false;
    const [maya, ben, jun] = WL.sims();
    WL.act(0, 'stove', 'clean');
    WL.act(1, 'sofa', 'sit');
    WL.act(2, 'desk', 'write');
    WL.sim(25);
    WL.social(1, 0, 'joke');
    WL.sim(6);
    WL.G.userSpeed = 0;
    WL.cam(13.6, 14.2, 20, Math.PI / 4 + 0.18);
    document.querySelector('#notes').style.visibility = 'hidden';
    WL.sel(0);
  });
  await wait(1500); await shot();
};
