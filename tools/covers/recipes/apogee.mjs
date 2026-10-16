// Mission 1, Kosmodrom 9: a guard on the launch pad fires, the rocket and its gantry behind him.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'AP');
  await page.evaluate(() => {
    AP.f.SET.aspect = '16:9'; AP.f.applyVideoSettings();
    AP.start(0, 1); AP.freeze(); AP.god();
    const G = AP.f.G, p = G.player;
    AP.tp(34, 15, 0.12); AP.look(0.12, 0.13);
    const g = G.actors.find((a) => a.type === 'soldierElite') || G.actors[0];
    g.x = 66.8; g.z = 24.0; g.state = 'combat'; g.reactT = 0; g.lastSeen = { x: p.x, z: p.z };
    AP.sim(0.8);
    g.yaw = Math.atan2(-(p.x - g.x), -(p.z - g.z)); g.kneel = false;
    AP.sim(0.05);
    AP.f.actorFire(g, 8);
    AP.render();
  });
  await wait(1200); await shot();
};
