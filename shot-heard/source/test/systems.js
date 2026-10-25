// gunboat, breakthrough sectors, surgeon, officer, artilleryman, rifleman
const R = {};
SH.start({ map: 'bunker', side: 1, spawn: 'B' }); SH.god(true); SH.sim(0.5);
const me = P.s, sh = me.mount && me.mount.s;
R.ship = { mounted: me.mount && me.mount.type };
if (sh) {
  const p0 = sh.pos.clone();
  SH.press('KeyW'); SH.sim(0.1); SH.press('KeyW'); SH.sim(0.1); SH.sim(8);
  R.ship.moved = Math.round(sh.pos.distanceTo(p0)); R.ship.throttle = sh.throttle;
  SH.look(sh.yaw - Math.PI / 2, 0.05); SH.sim(0.05); SH.click('L'); SH.sim(0.1);
  R.ship.pending = sh.pending.length; R.ship.loaded = sh.loaded.slice();
  SH.sim(1.2); R.ship.rounds = SH.ROUNDS.length;
}
out.R = R;
return R;
//--- shot sys_ship
const R = out.R;
SH.start({ map: 'lexington', mode: 'breakthrough', side: 1 }); SH.god(true);
for (const s of SH.SOLDIERS) if (s.bot) s.bot.peace = true;
const E = SH.f.flagById('E');
SH.tp(E.x + 2, E.z + 2); SH.sim(0.5);
R.bt = { attacker: M.attacker, sector0: M.sector, tickets0: M.tickets.slice(), E: [E.owner, E.locked, E.active] };
// keep the defenders off the flag while we take it
for (const s of SH.SOLDIERS) if (s.bot && s.team !== P.s.team) s.bot.hold = true;
SH.sim(35);
R.bt.after = { sector: M.sector, tickets: M.tickets.slice(), E: [E.owner, E.ctrl.toFixed(2), E.locked], D: [SH.f.flagById('D').active, SH.f.flagById('D').locked] };
return R.bt;
//--- shot sys_breakthrough
const R = out.R;
SH.start({ map: 'lexington', cls: 'surgeon' }); SH.god(true); SH.sim(5);
const me = P.s;
const fr = SH.dummy(1.6, 0, me.team);
SH.f.hurtSoldier(fr, 100, null, 'test', 'body', 0, 0);
R.surgeon = { downed: fr.state };
SH.aimAt(fr.pos.x, fr.pos.y, fr.pos.z); SH.sim(0.1);
SH.keys.KeyE = true; SH.sim(1.7); SH.keys.KeyE = false;
R.surgeon.after = fr.state; R.surgeon.hp = Math.round(fr.hp); R.surgeon.revives = me.sc.revives;
SH.start({ map: 'lexington', cls: 'officer' }); SH.god(true); SH.sim(1);
SH.press('Digit3'); SH.sim(0.4); SH.click('L'); SH.sim(0.2);
R.officer = { colours: SH.COLOURS.length, spawn: SH.f.spawnPoints(P.s.team, P.s).filter((p) => p.kind === 'colours').length };
SH.start({ map: 'lexington', cls: 'arty' }); SH.god(true); SH.sim(1);
const pieces0 = SH.PIECES.length;
SH.press('Digit4'); SH.sim(0.4); SH.click('L'); SH.sim(0.2);
R.arty = { gabions: SH.PIECES.length - pieces0 };
// a powder keg against the stone wall of the Battle Road
const wallP = SH.PIECES.find((p) => p.mat === 'stone' && p.alive && Math.hypot(p.x - 60, p.z - 45) < 60);
SH.tp(wallP.x + 1.2, wallP.z + 1.2); SH.aimAt(wallP.x, wallP.y, wallP.z); SH.sim(0.1);
SH.press('Digit3'); SH.sim(0.4); SH.click('L'); SH.sim(0.1);
R.arty.kegs = 1 - P.s.gad[0];
SH.tp(wallP.x + 25, wallP.z + 25); SH.aimAt(wallP.x, wallP.y, wallP.z); SH.sim(5.5);
R.arty.wallBroken = !wallP.alive;
SH.start({ map: 'lexington', cls: 'rifle' }); SH.god(true); SH.sim(1);
SH.press('Digit3'); SH.sim(0.4); SH.holdMouse('R', true); SH.sim(0.6);
R.rifle = { spy: P.spyT, zoom: P.zoom.toFixed(2), fov: SH.camera.fov.toFixed(1) };
return R;
//--- shot sys_spyglass
SH.holdMouse('R', false);
