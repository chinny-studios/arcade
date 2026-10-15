// The scene behind the title screen: a planet seen through the ship's frame. The game starts in a dark station.
export default async ({ page, shot, wait, url }) => {
  await page.goto(url); await wait(7000);
  await page.evaluate(() => { document.querySelector('#title').style.visibility = 'hidden'; });
  await wait(1500); await shot();
};
