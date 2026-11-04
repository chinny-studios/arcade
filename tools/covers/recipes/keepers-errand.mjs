// Wick squares up to two clockwork bailiffs below the purple-lit lighthouse in the storm, pebble in flight.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'KE');
  await page.evaluate(async () => {
    localStorage.clear();
    await KE.start({ area: 'isle', at: [-81, 9.5, 1.6], items: { pebble: 1 }, flags: { sawNotice: true, intro: true, metBram: true } });
    KE.god(); KE.mode('aggressive');
    const F = KE.f, H = F.Hero;
    F.CAM.dist = 27; F.CAM.fov = 32;
    const a = F.Actors.ticker({ x: -77.6, z: 8.4, ry: -1.6 }), b = F.Actors.ticker({ x: -78.4, z: 11.8, ry: -1.6 });
    KE.sim(0.2);
    for (const t of [a, b]) { t.state = 'windup'; t.st = 0; }
    a.ry = Math.atan2(H.x - a.x, H.z - a.z); b.ry = Math.atan2(H.x - b.x, H.z - b.z);
    H.ry = Math.atan2(a.x - H.x, a.z - H.z);
    KE.press('throw'); KE.sim(0.28);
    for (const t of [a, b]) { t.state = 'windup'; t.st = 0; }
    KE.sim(0.05);
    for (const s of ['#toasts', '#goal', '#banner', '#modeTip', '#prompt']) document.querySelector(s).style.visibility = 'hidden';
    F.G.manual = true; KE.render();
  });
  await wait(1500); await shot();
};
