// Day 5 of an AI-vs-AI game on Crossfire, cropped to the map.
import { hook } from './_lib.mjs';
export const crop = [169, 98, 1111, 628];
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug'); await hook(page, 'SF'); await wait(1000);
  await page.evaluate(() => SF.start()); await wait(1500);
  await page.evaluate(() => SF.sim({}, 5)); await wait(2500);
  await shot();
};
