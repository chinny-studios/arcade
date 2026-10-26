// A Symphony of Lights from the Avenue of Stars: beams over the Island skyline (candidates: Nathan Road at dusk
// outside Chungking Mansions, and Nathan Road at night from Milton Mansion's door).
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'NR', 'ready');
  const view = (fn) => page.evaluate(fn);
  await view(() => {
    localStorage.clear(); NR.start({ hour: 17.95 });
    for (const s of ['.hud', '#fps']) document.querySelector(s).style.visibility = 'hidden';
  });
  await view(() => { const L = NR.LANDMARKS.find((l) => l.id === 'chungking'); NR.tp(L.x - 13, L.z - 20); NR.lookAt(L.x + 6, 7, L.z + 8); NR.sim(8); });
  await wait(2000); await shot('chungking');
  await view(() => { NR.time(20.6); const d = NR.W.LP.miltonDoor; NR.tp(d[0] - 2, d[1] + 3, Math.PI); NR.look(Math.PI, 0.1); NR.sim(4); });
  await wait(2000); await shot('nathan-night');
  await view(() => { NR.time(20.08); const L = NR.LANDMARKS.find((l) => l.id === 'avenue'); NR.tp(L.x - 60, L.z - 9); NR.look(Math.PI, 0.1); NR.sim(3); });
  await wait(2000); await shot();
};
