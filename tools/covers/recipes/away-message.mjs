// The 2001 family desktop in full swing: Snapster downloading, ZapAmp playing, an IM from a buddy, and Bongo the
// pink gorilla singing in the corner.
import { hook } from './_lib.mjs';
export default async ({ page, shot, wait, url }) => {
  await page.goto(url + '#debug');
  await hook(page, 'AM');
  await page.evaluate(() => { AM.reset(); });
  await page.reload();
  await hook(page, 'AM');
  await page.evaluate(() => {
    AM.S.noWelcome = true; AM.S.bongo.met = true; AM.save();
    AM.start();
    AM.sn('sk8rgrl2001');
    AM.connect();
    for (const id of ['blink', 'nsynk', 'eiffel']) AM.give(id, 128);
    // Snapster mid-search, lower-left
    AM.open('snapster');
    AM.snap.qa = 'blink-183'; AM.snap.qt = ''; AM.snap.minKb = 'any';
    AM.snap.results = AM.snapSearch('blink-183', '').results;
    AM.snap.label = AM.snap.results.length + ' results returned';
    AM.snapTab(0);
    AM.place('snapster', 24, 300, 600, 384);
    // ZapAmp playing, upper right
    AM.open('zapamp');
    const lib = AM.filesIn('music'); if (lib.length) AM.zapQueue(lib, true);
    AM.place('zapamp', 930, 36);
    // Buddy list + an IM
    AM.open('buddy'); AM.place('buddylist', 1050, 120);
    AM.buddyOn('jenny4eva');
    const im = AM.openIM('jenny4eva'); im.move(372, 70); im.size(372, 300);
    AM.imLine(im, 'jenny4eva', 'omg did u get the new blink-183??? send it send it!!! :)');
    // Bongo singing, lower middle
    AM.bongo(); AM.bongoObj.x = 700; AM.bongoObj.y = AM.deskH() - 2;
    AM.sing('theme');
  });
  await wait(1700);
  await page.evaluate(() => {
    const wel = AM.win('welcome'); if (wel) wel.close(true);
    AM.place('snapster', 24, 300, 600, 384);
    AM.win('jenny4eva - Instant Message') || 0;
    const b = document.querySelector('#bongo'); if (b) b.style.zIndex = 70000;
  });
  await wait(500);
  await shot();
};
