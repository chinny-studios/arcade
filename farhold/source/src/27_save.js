// Farhold — saving: localStorage autosave (exiting the ship, docking, warping, every few minutes), export/import

const SAVE_KEY = 'farhold.save.v1';
const SAVE = {
  last: 0,
  has() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  load() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } },
  save(why) {
    if (G.state !== 'play' || WARP.active || !SYS.cur || G.noSave) return false;
    const P = PLAYER, S = SHIP;
    if (!P.alive) return false;
    const fr = (f) => (!f ? null : f.kind === 'planet' ? { k: 'p', i: f.pl.idx } : { k: 's' });
    const v3 = (v) => [v.x, v.y, v.z], q4 = (q) => [q.x, q.y, q.z, q.w];
    // in-flight states collapse to something stable
    let shipState = S.state, shipFrame = S.frame, shipPos = S.pos, shipQ = S.q;
    if (shipState === 'dock' || shipState === 'undock') { shipState = 'docked'; }
    else if (shipState === 'landing' && S.path) { shipState = 'landed'; shipPos = S.path.p1; shipQ = S.path.q1; }
    else if (shipState === 'takeoff') shipState = 'flight';
    const data = {
      v: 1, t: Date.now(), why, time: G.time, seed: GALAXY.seed, seedText: G.seedText, star: SYS.star.i,
      player: { name: P.name, units: P.units, nanites: P.nanites, suit: P.suit.toJSON(), stats: P.stats, tech: P.tech, known: [...P.known], lore: P.lore,
        frame: fr(P.frame), pos: v3(P.pos), q: q4(P.q), pitch: P.pitch, inShip: P.inShip, graves: P.graves.map((g) => ({ pl: g.pl, pos: v3(g.pos), items: g.items })) },
      ship: S.cur ? { type: S.cur.type, seed: S.cur.seed, name: S.cur.name, cargo: S.cur.cargo.toJSON(), lift: S.cur.lift, pulse: S.cur.pulse, shield: S.cur.shield, hull: S.cur.hull,
        frame: fr(shipFrame), pos: v3(shipPos), q: q4(shipQ), state: shipState, onPad: S.onPad } : null,
      quest: { step: QUEST.step, flags: QUEST.flags },
      disc: DISC.planets,
      removed: Object.fromEntries([...NAT.removed].map(([k, s]) => [k, [...s]])),
      pois: [...POIS.done],
      bases: BASES.list.map((b) => ({ id: b.id, pl: b.pl, star: b.star, name: b.name, portable: !!b.portable, center: v3(b.center), parts: b.parts.map((p) => ({ id: p.id, pos: v3(p.pos), q: q4(p.q), g: p.g ? { o: v3(p.g.o), q: q4(p.g.q) } : null, inv: p.inv ? p.inv.toJSON() : null, ref: p.ref ? { input: p.ref.input, output: p.ref.output } : null, grow: p.grow })) })),
      visited: [...GALAXY.visited], stations: [...GALAXY.stationsVisited], target: GALAXY.target ? GALAXY.target.i : null,
      wanted: 0,
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { HUD.msg('Could not save (storage full or blocked).', 'bad'); return false; }
    this.last = G.time;
    if (why && why !== 'auto' && why !== 'quit') HUD.msg('Saved.', 'dim');
    return true;
  },
  exportFile() {
    this.save('export');
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([s], { type: 'application/json' }));
    a.download = 'farhold-' + (G.seedText || 'save') + '.json';
    a.click();
  },
  importFile() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      f.text().then((t) => {
        try { const d = JSON.parse(t); if (!d.player || !d.seed) throw new Error('bad'); localStorage.setItem(SAVE_KEY, t); location.reload(); }
        catch (e) { alert('That file is not a Farhold save.'); }
      });
    };
    inp.click();
  },
};
// rebuild the world from a save
function applySave(d) {
  const V = (a) => new V3(a[0], a[1], a[2]), Qq = (a) => new Q4(a[0], a[1], a[2], a[3]);
  G.time = d.time || 0; G.seedText = d.seedText || String(d.seed);
  genGalaxy(d.seed);
  GALAXY.visited = new Set(d.visited || []); GALAXY.stationsVisited = new Set(d.stations || []);
  GALAXY.target = d.target != null ? GALAXY.stars[d.target] : null;
  const P = PLAYER;
  P.name = d.player.name; P.units = d.player.units; P.nanites = d.player.nanites;
  P.suit = new Inv(24, 1, 'Exosuit'); P.suit.load(d.player.suit);
  Object.assign(P.stats, d.player.stats);
  P.tech = d.player.tech; P.known = new Set(d.player.known); P.lore = d.player.lore || [];
  QUEST.step = d.quest.step; QUEST.flags = d.quest.flags || {};
  DISC.planets = d.disc || {};
  NAT.removed = new Map(Object.entries(d.removed || {}).map(([k, a]) => [k, new Set(a)]));
  POIS.done = new Set(d.pois || []);
  BASES.list = (d.bases || []).map((b) => ({ id: b.id, pl: b.pl, star: b.star, name: b.name, portable: !!b.portable, center: V(b.center), parts: b.parts.map((p) => { const o = { id: p.id, pos: V(p.pos), q: Qq(p.q) }; if (p.g) o.g = { o: V(p.g.o), q: Qq(p.g.q) }; if (p.inv) { o.inv = new Inv(10, 1, 'Storage'); o.inv.load(p.inv); } if (p.id === 'refiner') { o.ref = makeRefiner(0.4); if (p.ref) { o.ref.input = p.ref.input; o.ref.output = p.ref.output; } } if (p.id === 'planter') o.grow = p.grow || 0; return o; }) }));
  // the system and our ship
  const star = GALAXY.stars[d.star];
  setShip(Object.assign(makeShipData(d.ship.type, d.ship.seed, d.ship.name), { lift: d.ship.lift, pulse: d.ship.pulse, shield: d.ship.shield, hull: d.ship.hull }));
  SHIP.cur.cargo.load(d.ship.cargo);
  arriveSystem(star);
  for (const pl of PLANETS.list) { pl.spin = pl.phase0 + G.time * TAU / pl.day; updatePlanetSpin(pl, 0); }
  const frameOf = (fr) => (!fr ? null : fr.k === 's' ? STATION.frame : planetFrame(SYS.cur.planets[fr.i]));
  const sh = d.ship;
  if (sh.state === 'docked' || (sh.frame && sh.frame.k === 's')) { dockInstant(); }
  else placeShip(frameOf(sh.frame), V(sh.pos), Qq(sh.q), sh.state === 'flight' ? 'flight' : 'landed');
  SHIP.onPad = !!sh.onPad;
  if (SHIP.state === 'flight') { SHIP.speed = 60; SHIP.camQ.copy(SHIP.q); }
  P.inShip = !!d.player.inShip;
  if (P.inShip) { P.frame = SHIP.frame; }
  else { placePlayer(frameOf(d.player.frame), V(d.player.pos), null); P.q.copy(Qq(d.player.q)); P.pitch = d.player.pitch || 0; }
  P.graves = (d.player.graves || []).map((g) => ({ pl: g.pl, pos: V(g.pos), items: g.items }));
  for (const g of P.graves) spawnGraveMarker(g);
}
