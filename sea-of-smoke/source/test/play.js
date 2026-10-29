// Starts a battle, renders the opening, then fast-forwards and reports fleet state.
window.brief = () => { const s = SS.state(); return `${s.phase} t=${s.time} pts=${s.pts} caps=${s.caps.join(' ')} alive=${s.alive} balls=${s.balls}` + (s.result ? ' RESULT ' + JSON.stringify(s.result) : ''); };
window.fleet = () => SS.ships().map((s) => `${s.team} ${s.cls.padEnd(8)} ${s.name.padEnd(15)} hp=${s.hp} crew=${s.crew} sails=${s.sails} ${s.alive ? s.mode : 'SUNK'} dmg=${s.dmg} k=${s.kills} acc=${s.acc}% @${s.x},${s.z}`);
SS.render(); await wait(300); SS.render();
return [brief()];
//--- shot p0
SS.helm(4, 0); SS.sim(40); SS.render(); await wait(200); SS.render();
return [brief(), JSON.stringify(SS.me())];
//--- shot p40
SS.sim(80); SS.render(); await wait(200); SS.render();
return [brief(), ...fleet()];
//--- shot p120
SS.sim(150); SS.render();
return [brief(), ...fleet()];
