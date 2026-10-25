// six minutes of battle with the player wandering and firing, to shake out rare errors
SH.god(true);
const me = P.s;
for (let k = 0; k < 36; k++) {
  SH.keys.KeyW = k % 3 !== 2; SH.look(P.yaw + 0.4, 0);
  if (k % 4 === 0) SH.click('L');
  if (k % 4 === 1) SH.press('KeyR');
  if (k % 9 === 5) SH.press('KeyF');
  if (k % 7 === 3) SH.press('KeyQ');
  SH.sim(10);
}
SH.keys.KeyW = false;
return { t: M.time | 0, tickets: M.tickets, stats: SH.STATS, ships: SH.SHIPS.map((s) => s.alive + ':' + Math.round(s.hp)), guns: SH.CANNONS.map((c) => (c.alive ? 1 : 0) + (c.crew ? 'c' : '')).join(''), pieces: SH.PIECES.filter((p) => !p.alive).length };
