// A sunset street downtown with the first car and a passer-by.
import { hold, hideText } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url); await wait(4000);
  await page.click('#start'); await wait(3000);
  await hold(page, 'KeyW', 1200); await wait(300);
  await page.keyboard.press('KeyF'); await wait(3500);
  await hold(page, 'KeyW', 3500); await wait(200);
  await hold(page, 'KeyW', 3000); await wait(200);
  await hideText(page, ['is right there']);
  await wait(500); await shot();
};
