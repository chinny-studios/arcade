// Helpers shared by the recipes.

// Drag with the left button held: drag-to-look in games that fall back to it without pointer lock.
export async function drag(page, dx, dy, steps = 12, at = [640, 400]) {
  await page.mouse.move(at[0], at[1]); await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(at[0] + dx * i / steps, at[1] + dy * i / steps);
  await page.mouse.up();
}

export async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }

// Hide transient messages (tips, radio chatter) by their text, for games without ids on them.
export const hideText = (page, texts) => page.evaluate((texts) => {
  for (const t of texts) {
    const els = [...document.querySelectorAll('body *')].filter((e) => e.textContent.includes(t));
    for (const e of els.filter((e) => ![...e.children].some((c) => c.textContent.includes(t)))) {
      let n = e;
      for (let k = 0; k < 2 && n.parentElement && n.parentElement !== document.body && n.parentElement.textContent.length < t.length + 200; k++) n = n.parentElement;
      n.style.visibility = 'hidden';
    }
  }
}, texts);

// Wait for a game's #debug hook, e.g. hook(page, 'TK') or hook(page, 'AR', 'ready').
export const hook = (page, name, flag) => page.waitForFunction(([n, f]) => window[n] && (!f || window[n][f]), [name, flag], { timeout: 180000 });
