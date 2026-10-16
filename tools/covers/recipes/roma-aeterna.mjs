// Morning crowds in a street of the Subura (candidate: the Forum looking toward the Capitol).
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'RA');
  const view = (fn) => page.evaluate(fn);
  await view(async () => {
    localStorage.clear(); await RA.start({ hour: 9.3 });
    document.querySelector('#banner').style.visibility = 'hidden';
    document.querySelector('#msgs').style.visibility = 'hidden';
    document.querySelector('#fps').style.visibility = 'hidden';
  });
  // the Forum, looking up toward the Capitol
  await view(() => { RA.time(9.3); RA.tpFF(40, 6); RA.sim(3); RA.lookAt(...RA.f.FFw(-90, 0).slice(0, 1), 9, RA.f.FFw(-90, 0)[1]); RA.sim(0.1); });
  await wait(1500); await shot('forum');
  // the cover: morning crowds in a street of the Subura, shops open on both sides
  await view(() => { RA.time(9.4); RA.go('suburastreet'); RA.sim(4); RA.look(RA.PL.yaw, 0.04); RA.sim(0.1); });
  await wait(1500); await shot();
};
