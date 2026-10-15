// First-person on Landfall Shelf with the ringed planet overhead; the tutorial chatter is hidden.
import { hold, hideText } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url); await wait(5000);
  await page.click('[data-a="new"]'); await wait(1500);
  await page.click('#cGo'); await wait(12000);
  await hold(page, 'KeyW', 4000); await wait(2000);
  await page.keyboard.down('KeyW'); await hold(page, 'KeyD', 1500); await page.keyboard.up('KeyW');
  await hideText(page, ['Click to capture the mouse', 'Contractor, this is Ilsa']);
  await wait(1500); await shot();
};
