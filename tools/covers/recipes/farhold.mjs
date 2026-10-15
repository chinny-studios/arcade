// The ship above a world after hopping through a few star systems: orbit and the planet in one view.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'FH');
  await page.evaluate(async () => {
    localStorage.clear(); await FH.start({ seed: 'test' }); FH.mute();
    const F = FH.f, seen = {};
    for (let si = 0; si < 40 && Object.keys(seen).length < 8; si++) {
      const S = F.arriveSystem(FH.GALAXY.stars[5 + si * 9]);
      for (const pl of S.planets) seen[pl.type] = 1;
    }
  });
  await wait(1500); await shot();
};
