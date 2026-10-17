// A hauling crew dragging a block of white limestone toward the Great Pyramid's ramp (candidate: Mission Control).
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'TA');
  const hide = () => page.evaluate(() => { for (const id of ['#banner', '#toasts', '#fps', '#dlg']) document.querySelector(id).style.visibility = 'hidden'; });
  await page.evaluate(async () => {
    localStorage.clear(); await TA.start();
    await TA.go('apollo11', 0); TA.sim(0.5);
    for (let i = 0; i < 6; i++) await TA.skip();
    TA.tp(-10.5, 6.5, 0); TA.lookAt(0, 1.6, -5); TA.sim(1);
  });
  await hide(); await wait(1500); await shot('control');
  await page.evaluate(async () => {
    await TA.go('giza', 1); TA.sim(16.5);
    // stand beside a crew that is hauling a loaded sledge, with the pyramid behind them
    const h = TA.Stage.crowd.find((a) => a.anim === 'haul');
    TA.tp(h.x - 9, h.z + 5); TA.lookAt(h.x - 3, 6, h.z - 36); TA.sim(0.05);
  });
  await hide(); await wait(1500); await shot();
};
