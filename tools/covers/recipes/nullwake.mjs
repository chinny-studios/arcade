// Twelve minutes into the Brood Moon: an evolved build carving through the swarm around an elite.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'NW');
  await page.evaluate(() => {
    localStorage.clear(); NW.mute();
    NW.start({ stage: 's2', pilot: 'sable', seed: 'cover' }); NW.god(true);
    for (const w of ['halo', 'thunder', 'barrage', 'nullwake']) NW.give(w, 1);
    NW.give('rail', 7); NW.give('blaster', 6);
    for (const p of ['emitter', 'amp', 'capacitor', 'thrusters', 'tractor', 'feed']) NW.give(p, 3);
    NW.time(700); NW.sim(40);
    NW.event('elite', 2); NW.event('swarm', 30); NW.sim(3);
    NW.SAVE().opts.nums = 1;
  });
  await wait(1500); await shot();
};
