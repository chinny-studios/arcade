// Farhold — the journey: crash-landing tutorial, SOLA's guidance, the road to the galactic core

const QUEST = {
  step: 0, flags: {}, done: false,
  steps: [
    { id: 'wake', text: 'Mine <b>Ferrite Dust</b> from rocks (30)', check: () => PLAYER.suit.count('ferrite') >= 30 || hasTech('scanner') },
    { id: 'scanner', text: 'Repair the <b>Scanner</b> — inventory <b>[inventory]</b> › Technology', check: () => hasTech('scanner'), say: 'scanner' },
    { id: 'scan', text: 'Pulse the scanner <b>[scan]</b>', ev: 'scanned' },
    { id: 'oxygen', text: 'Harvest <b>Oxygen</b> and recharge life support <b>[quick]</b>', ev: 'recharged', evOk: (k) => k === 'life', say: 'oxygen' },
    { id: 'ship', text: 'Reach your crashed ship', check: () => SHIP.cur && SHIP.frame === PLAYER.frame && PLAYER.pos.distanceTo(SHIP.pos) < 35, say: 'ship', target: () => SHIP.cur && SHIP.frame ? { f: SHIP.frame, pos: SHIP.pos, label: 'Ship' } : null },
    { id: 'thrusters', text: 'Repair the <b>Lift Thrusters</b> — craft a Hull Plate and Seal Gel', check: () => hasTech('thrusters'), say: 'thrusters' },
    { id: 'fuel', text: 'Fuel the Lift Thrusters with <b>Di-hydrogen</b> (50%)', check: () => SHIP.cur && SHIP.cur.lift >= 50, say: 'fuel' },
    { id: 'pulse', text: 'Repair the <b>Pulse Drive</b>', check: () => hasTech('pulse'), say: 'pulse' },
    { id: 'launch', text: 'Board the ship <b>[interact]</b> and take off <b>[jump]</b>', ev: 'tookOff', say: 'launch' },
    { id: 'space', text: 'Climb out of the atmosphere', check: () => PLAYER.inShip && !SHIP.frame },
    { id: 'station', text: 'Fly to the <b>space station</b> — hold <b>[pulse]</b>', ev: 'docked', say: 'space', target: () => STATION.obj ? { f: null, pos: STATION.pos.clone().add(new V3(0, 18, -90).applyQuaternion(STATION.obj.quaternion)), label: 'Station' } : null },
    { id: 'sell', text: 'Sell something at the <b>Trade Terminal</b>', ev: 'sold', say: 'docked', on: () => { QUEST.flags.station = true; } },
    { id: 'warpdrive', text: 'Build a <b>Warp Drive</b> — ship technology', check: () => hasTech('warpdrive'), say: 'warp' },
    { id: 'warpcell', text: 'Craft a <b>Warp Cell</b>', check: () => INV.has('warpcell', 1) || QUEST.flags.jumps > 0, say: 'warpcell' },
    { id: 'jump', text: 'Open the galaxy map <b>[map]</b>, pick a star and warp <b>[warp]</b>', ev: 'warped' },
    { id: 'core', text: 'Travel to <b>Farhold</b> at the galactic core', check: () => SYS.star && SYS.star.core, dyn: () => 'Travel to <b>Farhold</b> at the galactic core · ' + fmtNum(Math.hypot(SYS.star.x, SYS.star.z)) + ' ly' },
  ],
  cur() { return this.steps[this.step]; },
  text() { const s = this.cur(); if (!s) return ''; return fillKeys(s.dyn ? s.dyn() : s.text); },
  target() { const s = this.cur(); return s && s.target ? s.target() : null; },
  advance() {
    const s = this.cur();
    if (s && s.on) s.on();
    this.step++;
    const n = this.cur();
    AU.sfx('objective');
    if (n) { HUD.objective(true); if (n.say) setTimeout(() => SOLA_say(n.say), 900); }
    bus.emit('questStep', this.step);
  },
  update() {
    const s = this.cur();
    if (!s || this.done) return;
    if ((s.check && s.check()) || (s.ev && this.flags['ev_' + s.id])) this.advance();
  },
};
// event steps also remember events that happen a little early (e.g. scanning before the repair registers)
for (const s of QUEST.steps) if (s.ev) bus.on(s.ev, (...a) => { if (s.evOk && !s.evOk(...a)) return; const c = QUEST.cur(); if (c === s) QUEST.advance(); else if (QUEST.steps.indexOf(s) > QUEST.step) QUEST.flags['ev_' + s.id] = true; });
// the guidance voice
function fillKeys(t) { return t.replace(/\[(\w+)\]/g, (m, k) => (ACT[k] ? '<kbd>' + keyLabel(k) + '</kbd>' : m)); }
function SOLA_say(key) { const t = SOLA[key]; if (!t) return; HUD.sola(fillKeys(t)); }
QUEST.flags.jumps = 0;
bus.on('warped', (S) => {
  QUEST.flags.jumps = (QUEST.flags.jumps || 0) + 1;
  const j = QUEST.flags.jumps;
  if (S.core) { setTimeout(() => SOLA_say('core'), 2000); setTimeout(() => UI.open('ending'), 9000); return; }
  if (j === 1) { setTimeout(() => SOLA_say('jump1'), 2500); setTimeout(() => SOLA_say('base'), 30000); }
  else if (j === 2) setTimeout(() => SOLA_say('jump2'), 2500);
  else if (j === 3) setTimeout(() => SOLA_say('jump3'), 2500);
});
bus.on('stormStart', (pl) => { if (ENV.pl === pl && !PLAYER.inShip && !QUEST.flags.stormTold) { QUEST.flags.stormTold = true; SOLA_say('storm'); } });
bus.on('docked', () => { if (SYS.star) GALAXY.stationsVisited.add(SYS.star.i); });
// first landing on any planet
bus.on('exitShip', () => { if (PLAYER.frame && PLAYER.frame.kind === 'planet') visitPlanet(PLAYER.frame.pl); });
