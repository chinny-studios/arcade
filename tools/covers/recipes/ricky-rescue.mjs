// Medic 12 running lights and sirens down a Maple Heights street at dusk, following the GPS line to a chest-pain call.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'RR');
  await page.evaluate(async () => {
    localStorage.clear();
    await RR.start({ rank: 2, hour: 18.85 });
    RR.f.setQuality(2);
    RR.call('chest', { district: 'eastgate', far: 380 });
    // Marisol's autopilot drives while the chase camera follows
    RR.f.setSiren(true);
    RR.RIG.auto = { pts: RR.ROUTE.pts, i: 0 };
    RR.sim(13);
    RR.hideHUD(true);
  });
  await wait(1500); await shot();
};
