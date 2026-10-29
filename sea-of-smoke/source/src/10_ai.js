// ---- 10_ai: bot captains ----
// Each bot thinks twice a second: picks a mode (cap, engage, board, raft, ram, retreat, hunt) and a goal,
// then steers every frame toward a heading, probing ahead for land, ships and incoming fire rafts.
class Bot {
  constructor(s) {
    this.s = s; this.think = rnd(0, 0.5); this.mode = 'cap'; this.target = null; this.goal = null;
    this.path = null; this.pathT = 0; this.side = rand() < 0.5 ? 1 : -1; this.sideT = 0;
    this.skill = rnd(0.5, 0.95); this.bias = rnd(-300, 300); this.ammoT = 0; this.stuck = 0; this.reverseT = 0;
    this.desired = s.h; this.capId = null; this.consT = rnd(1, 3);
  }
  update(dt) {
    const s = this.s; if (!s.alive) return;
    this.think -= dt; if (this.think <= 0) { this.think = 0.5; this.decide(); }
    this.steer(dt);
    this.shoot(dt);
    this.consumables(dt);
  }
  enemies() { return G.ships.filter((o) => o.alive && o.team !== this.s.team && Match.isSeen(o, this.s.team)); }
  decide() {
    const s = this.s, C = s.C, en = this.enemies();
    let best = null, bs = 1e9;
    for (const o of en) {
      const d = Math.hypot(o.x - s.x, o.z - s.z);
      let sc = d - (1 - o.hpf) * 300 - (o === this.target ? 150 : 0) + (o.cls === 'fireship' && d < 400 ? -300 : 0);
      if (sc < bs) { bs = sc; best = o; }
    }
    this.target = best;
    const d = best ? Math.hypot(best.x - s.x, best.z - s.z) : 1e9;
    const range = C.guns.range;
    const prev = this.mode;
    if (s.board) { this.mode = 'board'; return; }
    if (C.ignite && s.ignited > 0) this.mode = 'ram';
    else if (C.ignite && best && s.hpf < 0.35 && d < 380) { s.ignite(); this.mode = 'ram'; }
    else if (C.rafts && best && d < 1000) this.mode = 'raft';
    else if (best && d < 300 && s.strength() > best.strength() * 1.25 && (best.hpf < 0.35 || best.crewf < 0.3)) this.mode = 'board';
    else if (s.hpf < 0.22 && s.repair.n === 0 && best && d < range * 1.2) this.mode = 'retreat';
    else if (best && d < range * 1.4) this.mode = 'engage';
    else this.mode = 'cap';
    if (this.mode === 'cap') {
      const cap = this.pickCap();
      if (cap) this.goal = [cap.x + Math.sin(this.bias) * 70, cap.z + Math.cos(this.bias) * 70];
      else {
        const last = Match.lastSeenEnemy(s);
        this.goal = last ? [last.x, last.z] : [0, 0];
        this.mode = 'hunt';
      }
    }
    if (this.mode !== prev) this.path = null;
  }
  pickCap() {
    const s = this.s; let best = null, bs = 1e9;
    for (const c of Match.caps) {
      const mine = c.owner === s.team && c.capTeam !== 1 - s.team;
      if (mine) continue;
      let sc = Math.hypot(c.x - s.x, c.z - s.z) + this.bias;
      for (const o of G.ships) if (o !== s && o.alive && o.team === s.team && o.bot && o.bot.capId === c.id) sc += 220;
      if ((s.cls === 'galleon') && c.id === 'B') sc -= 300;
      if (sc < bs) { bs = sc; best = c; }
    }
    this.capId = best ? best.id : null;
    return best;
  }
  // ---- steering ----
  steer(dt) {
    const s = this.s, C = s.C, t = this.target;
    let want = this.desired, tele = 4;
    const L = C.len;
    if (this.reverseT > 0) {
      this.reverseT -= dt; s.tele = -1; s.rudderCmd = this.side; return;
    }
    if (this.mode === 'board' && s.board) { s.tele = 0; s.rudderCmd = 0; return; }
    if ((this.mode === 'engage' || this.mode === 'retreat' || this.mode === 'raft') && t) {
      const d = Math.hypot(t.x - s.x, t.z - s.z), bt = Math.atan2(t.x - s.x, t.z - s.z);
      if (this.mode === 'retreat') want = bt + Math.PI + this.side * 0.4;
      else {
        const pref = this.mode === 'raft' ? C.rafts.range * 0.5 : C.guns.range * (s.cls === 'galleon' ? 0.6 : 0.72);
        const err = (d - pref) / pref;
        const off = (90 - clamp(err * 70, -45, 55)) * DEG;
        this.sideT -= dt;
        if (this.sideT <= 0) { // orbit on the side that needs less turning
          const a1 = Math.abs(angNorm(bt + off - s.h)), a2 = Math.abs(angNorm(bt - off - s.h));
          this.side = a1 < a2 ? 1 : -1; this.sideT = rnd(10, 18);
        }
        want = bt + this.side * off;
      }
    } else if (this.mode === 'board' && t) {
      const [px, pz] = [t.x + Math.sin(t.h) * t.v * 2, t.z + Math.cos(t.h) * t.v * 2];
      want = Math.atan2(px - s.x, pz - s.z);
      const d = s.gap(t);
      if (d < 40) { want = t.h + (s.lx(t.x, t.z) > 0 ? 0.25 : -0.25); tele = 2 + (t.v > C.speed * 0.4 ? 2 : 0); }
      if (s.canBoard(t)) s.startBoard(t);
    } else if (this.mode === 'ram' && t) {
      const [px, pz] = raftLead({ x: s.x, z: s.z, C: { rafts: { speed: Math.max(5, s.v) } } }, t);
      want = Math.atan2(px - s.x, pz - s.z);
    } else if (this.goal) {
      this.pathT -= dt;
      if (!this.path || this.pathT <= 0) { this.path = World.path(C.draft, s.x, s.z, this.goal[0], this.goal[1]) || [this.goal]; this.pathT = 5; }
      let wp = this.path[0];
      while (this.path.length > 1 && Math.hypot(wp[0] - s.x, wp[1] - s.z) < 60) { this.path.shift(); wp = this.path[0]; }
      want = Math.atan2(wp[0] - s.x, wp[1] - s.z);
      const dg = Math.hypot(this.goal[0] - s.x, this.goal[1] - s.z);
      if (dg < 90 && this.mode === 'cap') { want = s.h + 0.5 * this.side; tele = 2; } // circle on the point
    }
    // avoid land: probe along the wanted heading, try alternatives if blocked
    const look = Math.max(L + 40, Math.abs(s.v) * 7);
    if (this.blocked(want, look)) {
      let found = null;
      for (let k = 1; k <= 9 && found === null; k++) for (const sg of [this.side, -this.side]) {
        const a = want + sg * k * 20 * DEG; if (!this.blocked(a, look)) { found = a; break; }
      }
      want = found === null ? s.h + Math.PI * 0.5 * this.side : found;
      if (found === null) tele = 1;
    }
    // avoid ships ahead
    for (const o of G.ships) {
      if (o === s || !o.alive || (this.mode === 'board' && o === t) || (this.mode === 'ram' && o === t)) continue;
      const dx = o.x - s.x, dz = o.z - s.z, d = Math.hypot(dx, dz), lim = (L + o.C.len) * 0.9 + 20;
      if (d > lim) continue;
      const b = s.bearing(o.x, o.z);
      if (Math.abs(b) < 60 * DEG) want = s.h + (b > 0 ? 1 : -1) * 70 * DEG;
    }
    // dodge fire rafts
    for (const r of Combat.rafts) {
      if (r.team === s.team) continue;
      const dx = s.x - r.x, dz = s.z - r.z, d = Math.hypot(dx, dz); if (d > 350) continue;
      const rvx = Math.sin(r.a) * r.v - Math.sin(s.h) * s.v, rvz = Math.cos(r.a) * r.v - Math.cos(s.h) * s.v;
      const tt = (dx * rvx + dz * rvz) / (rvx * rvx + rvz * rvz + 0.01);
      if (tt < 0 || tt > 25) continue;
      const cx = r.x + rvx * tt - s.x, cz = r.z + rvz * tt - s.z;
      if (Math.hypot(cx, cz) < C.len * 0.6 + 10 && rand() < this.skill + 0.2) { want = r.a + (s.bearing(r.x, r.z) > 0 ? -1 : 1) * 0.3; break; }
    }
    this.desired = want;
    const err = angNorm(want - s.h);
    s.rudderCmd = clamp(-err * 2.5, -1, 1);
    s.tele = tele;
    // stuck: sails set but not moving
    if (s.tele > 0 && Math.abs(s.v) < 1.2 && Match.phase === 'battle') this.stuck += dt; else this.stuck = Math.max(0, this.stuck - dt);
    if (this.stuck > 4) { this.stuck = 0; this.reverseT = 4; this.side = -this.side; this.path = null; }
  }
  blocked(a, look) {
    const s = this.s, dr = -(s.C.draft + 0.6);
    for (const f of [0.35, 0.7, 1]) {
      const x = s.x + Math.sin(a) * look * f, z = s.z + Math.cos(a) * look * f;
      if (World.h(x, z) > dr || Math.abs(x) > World.S / 2 - 60 || Math.abs(z) > World.S / 2 - 60) return true;
      for (const sx of [-0.5, 0.5]) if (World.h(x + Math.cos(a) * s.C.beam * sx * 1.5, z - Math.sin(a) * s.C.beam * sx * 1.5) > dr) return true;
    }
    return false;
  }
  // ---- gunnery ----
  shoot(dt) {
    const s = this.s; if (Match.phase !== 'battle') return;
    const en = this.enemies(); if (!en.length) return;
    this.ammoT -= dt;
    const t = this.target;
    // fire rafts
    if (s.C.rafts && t && s.raftRl <= 0) {
      const d = Math.hypot(t.x - s.x, t.z - s.z);
      if (d < s.C.rafts.range * 0.6) {
        const [px, pz] = raftLead(s, t);
        if (World.lineClear(1, s.x, s.z, px, pz) || rand() < 0.3) { const w = s.weapon; s.weapon = RAFT_SLOT; s.fire(px, pz); s.weapon = w; }
      }
    }
    const ready = BATTERIES.some((b) => s.rl[b] <= 0 && s.model.guns[b].length);
    if (!ready) return;
    const list = en.map((o) => [o, Math.hypot(o.x - s.x, o.z - s.z)]).sort((a, b) => (a[0] === t ? -1 : 0) - (b[0] === t ? -1 : 0) || a[1] - b[1]);
    for (const [o, d] of list) {
      if (d > s.C.guns.range) continue;
      this.chooseAmmo(o, d);
      if (d > s.range()) continue;
      let [px, pz] = leadPoint(s, o);
      const sig = d * 0.028 * (1.3 - this.skill) + 3;
      px += gauss() * sig; pz += gauss() * sig;
      if (BATTERIES.some((b) => s.rl[b] <= 0 && s.model.guns[b].length && s.bears(b, px, pz))) { s.fire(px, pz); break; }
    }
  }
  chooseAmmo(o, d) {
    const s = this.s; if (this.ammoT > 0) return;
    const r = s.C.guns.range;
    let want = 0;
    if (d < r * 0.45 && (this.mode === 'board' || o.crewf > 0.6) && s.cls !== 'galleon') want = 2;
    else if (d < r * 0.66 && o.sails > 0.5 && (s.C.chainBonus || (o.cls === 'galleon' && rand() < 0.3))) want = 1;
    if (this.mode === 'board' && d < r * 0.45) want = 2;
    if (want !== s.ammo) { s.setWeapon(want); this.ammoT = 12; }
  }
  consumables(dt) {
    const s = this.s; this.consT -= dt; if (this.consT > 0) return; this.consT = rnd(0.8, 2);
    const burning = s.fires.filter((f) => f > 0).length, leaking = s.leaks.some((l) => l > 0);
    if ((burning >= 2 || (burning && s.hpf < 0.6) || (leaking && s.hpf < 0.85) || (burning && s.fires.some((f) => f > 0 && f < FIRE.dur - 12))) && rand() < this.skill + 0.3) s.useRepair();
    const sp = s.spec, t = this.target, d = t ? Math.hypot(t.x - s.x, t.z - s.z) : 1e9;
    if (sp.n <= 0 || sp.cd > 0) return;
    if (sp.id === 'smoke' && ((Match.time - (s.hitT || -99) < 4 && s.hpf < 0.7) || (s.C.rafts && d < 700))) s.useSpecial();
    if (sp.id === 'studding' && this.goal && (this.mode === 'cap' || this.mode === 'hunt') && Math.hypot(this.goal[0] - s.x, this.goal[1] - s.z) > 600) s.useSpecial();
    if (sp.id === 'lookout' && this.mode === 'engage') s.useSpecial();
    if (sp.id === 'rally' && (s.board || (this.mode === 'engage' && d < s.C.guns.range * 0.8))) s.useSpecial();
  }
}
