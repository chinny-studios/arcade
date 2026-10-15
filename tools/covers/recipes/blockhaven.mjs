// A few steps into a fresh world: beach, hills and trees.
import { hold } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url); await wait(4000);
  await page.click('#playBtn'); await wait(4000);
  await hold(page, 'KeyW', 2500);
  await wait(2000); await shot();
};
