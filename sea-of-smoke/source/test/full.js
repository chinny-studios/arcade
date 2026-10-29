// Plays a whole battle AI-only (player ship parked) and prints the log and result.
SS.god(true); SS.helm(0, 0);
let lines = [];
for (let i = 0; i < 20 && SS.state().phase === 'battle'; i++) { SS.sim(30); const s = SS.state(); lines.push(`t=${s.time} pts=${s.pts} caps=${s.caps.join(' ')} alive=${s.alive}`); }
const s = SS.state();
return [...lines, 'RESULT ' + JSON.stringify(s.result), ...SS.match.log.map((l) => `${Math.round(l.t)} ${l.text}`),
  ...SS.ships().map((s) => `${s.team} ${s.cls.padEnd(8)} ${s.name.padEnd(15)} hp=${s.hp} crew=${s.crew} ${s.alive ? s.mode : 'SUNK'} dmg=${s.dmg} k=${s.kills} acc=${s.acc}%`)];
