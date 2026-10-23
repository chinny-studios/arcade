// Copter City — disasters: a chemical spill (lift people out of the cloud, wash the spill down), a tornado (get people
// out of its path, keep clear of the funnel), and an earthquake (a wave of fires, crashes and jams at once).

// ---------- chemical spill ----------
CALL_TYPES.spill = {
  start(c) {
    const s = roadSpot((e) => dist(e.a.x, e.a.z, CITY.home.x, CITY.home.z) > 200);
    c.x = s.x; c.z = s.z; c.y = 0;
    const tk = buildCar('tanker'); tk.group.position.set(s.x, 0.6, s.z); tk.group.rotation.set(0, s.yaw + 0.5, 1.4); addObj(tk.group); c.objs.push(tk.group); c.solids.push(...propSolids(s.x, s.z, s.yaw + 0.5, 9, 2.6, 0, 2.6));
    const pool = mesh(GM.disc(), mat(0x8aff3a, { basic: true, t: true, o: 0.6 }), s.x + 3, 0.08, s.z, 14, 1, 14); addObj(pool); c.objs.push(pool); c.pool = pool;
    c.edge = blockEdgeAt(s.x, s.z, true);
    c.tox = 1; c.r = 14;
    c.victims = [];
    for (let i = 0; i < 4; i++) { const a = rr(0, TAU), d = rr(10, 22); const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d; const P = spawnPerson(x, surfaceY(x, z, 2), z, i % 2 ? 'wave' : 'cower'); P.baseY = P.y; P.hp = 100; c.people.push(P); c.victims.push(P); }
    c.where = whereText(s.x, s.z);
    c.title = 'Chemical spill';
    c.radio = `Hazmat! A tanker has overturned ${c.where} and the cloud is spreading. Lift the residents out by ladder, and water down the spill.`;
    c.saved = 0;
    c.onWater = (x, y, z, L) => { if (c.state === 'open' && dist(x, z, c.x, c.z) < 18) { c.tox = Math.max(0, c.tox - L / 1600); steam(c.x, 1, c.z, 2); } };
  },
  update(c, dt) {
    c.tox = Math.max(0, c.tox - dt * 0.0015);
    c.r = Math.min(42, c.r + dt * 0.12 * c.tox);
    c.pool.scale.set(c.r * 0.6 * (0.4 + c.tox), 1, c.r * 0.6 * (0.4 + c.tox));
    c.pool.material.opacity = 0.2 + 0.4 * c.tox;
    for (let i = 0; i < 3; i++) if (Math.random() < c.tox) toxic(c.x + rr(-c.r, c.r) * 0.6, 0.5, c.z + rr(-c.r, c.r) * 0.6, 1 + c.r / 30);
    G.fleePoints = [{ x: c.x, z: c.z, r: c.r + 10 }];
    const H = HELI;
    if (G.where === 'heli' && dist(H.x, H.z, c.x, c.z) < c.r && altAGL() < 12 && c.tox > 0.2) { damageHeli(dt * 3 * c.tox, 'fumes'); if ((c.fT = (c.fT || 0) - dt) <= 0) { toast('Toxic fumes! Climb out of the cloud.', 'bad'); c.fT = 5; } }
    for (const P of c.victims) {
      if (P.state) continue;
      P.hp -= dt * 0.35 * c.tox;
      if (P.hp <= 0) { P.state = 'lost'; removePerson(P); msg('A resident was overcome by the fumes.', 'bad'); continue; }
      if (ladderGrab(P, dt)) { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); } }
      else if (landedNear(P.x, P.z, 20) && !P.walk) { P.walk = true; walkToHeli(P, () => { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); } else P.walk = false; }, { cancel: () => { P.walk = false; } }); }
    }
    const n = dropRescued(c);
    if (n) { c.saved += n; c.victims.filter((P) => P.state === 'aboard').slice(0, n).forEach((P) => { P.state = 'safe'; }); }
    const left = c.victims.filter((P) => !P.state).length, aboard = HELI.seats.filter((s) => s.call === c).length;
    if (!left && !aboard && c.tox < 0.15) {
      if (!c.saved) finishCall(c, false, 0, 'The spill is contained, but nobody got out.');
      else finishCall(c, true, c.def.reward * c.pay * (0.3 + 0.7 * c.saved / c.victims.length), `Spill contained, ${c.saved} residents evacuated.`);
      return;
    }
    c.stage = left ? `${left} residents in the cloud. Ladder (2) or land beside them.` : aboard ? `Drop the ${aboard} evacuees somewhere safe.` : `Wash down the spill with the bucket: toxicity ${Math.round(c.tox * 100)}%.`;
    c.markerPos = !left && aboard ? () => nearestPad(HELI.x, HELI.z, ['hospital', 'home', 'police', 'ground']) : null;
  },
  cleanup(c) { if (c.edge) c.edge.blocked = false; G.fleePoints = []; c.onWater = null; },
};
bus.on('water', (x, y, z, L) => { for (const c of G.calls.slice()) if (c.onWater) c.onWater(x, y, z, L); });

// ---------- tornado ----------
CALL_TYPES.twister = {
  start(c) {
    // from one edge of town across to the other
    const a = rr(0, TAU), S = CITY.size, cx = S / 2, cz = S / 2, R0 = S * 0.62;
    c.p0 = { x: cx + Math.cos(a) * R0, z: cz + Math.sin(a) * R0 };
    c.p1 = { x: cx - Math.cos(a + rr(-0.5, 0.5)) * R0, z: cz - Math.sin(a + rr(-0.5, 0.5)) * R0 };
    c.x = c.p0.x; c.z = c.p0.z; c.y = 0;
    c.tw = buildTwister(); addObj(c.tw.group); c.objs.push(c.tw.group);
    c.u = 0; c.len = dist(c.p0.x, c.p0.z, c.p1.x, c.p1.z);
    c.speed = 7.5;
    // people in its path
    c.victims = [];
    const ahead = CITY.places.filter((p) => { const t = ((p.x - c.p0.x) * (c.p1.x - c.p0.x) + (p.z - c.p0.z) * (c.p1.z - c.p0.z)) / (c.len * c.len); const qx = lerp(c.p0.x, c.p1.x, t), qz = lerp(c.p0.z, c.p1.z, t); return t > 0.15 && t < 0.85 && dist(qx, qz, p.x, p.z) < 70; });
    for (const pl of RNG().shuffle(ahead).slice(0, 3)) { const P = spawnPerson(pl.x, CURB, pl.z, 'wave'); P.baseY = P.y; c.people.push(P); c.victims.push(P); }
    c.title = 'Tornado';
    c.where = 'heading into town';
    c.radio = `Tornado warning! A twister is touching down ${whereText(c.p0.x, c.p0.z)}. Get people out of its path, and stay clear of the funnel!`;
    c.saved = 0; c.hit = new Set();
    c.spotTarget = () => ({ x: c.x, y: 0, z: c.z });
    AUDIO.sfx('siren');
  },
  update(c, dt) {
    const H = HELI;
    c.u = Math.min(1, c.u + dt * c.speed / c.len);
    const wob = Math.sin(G.t * 0.4) * 25;
    const dx = (c.p1.x - c.p0.x) / c.len, dz = (c.p1.z - c.p0.z) / c.len;
    c.x = lerp(c.p0.x, c.p1.x, c.u) - dz * wob; c.z = lerp(c.p0.z, c.p1.z, c.u) + dx * wob;
    const g = c.tw.group;
    g.position.set(c.x, 0, c.z);
    c.tw.rings.forEach((r, i) => { r.rotation.y += dt * (4 - i * 0.25); r.position.x = Math.sin(G.t * 1.3 + i * 0.6) * i * 0.6; r.position.z = Math.cos(G.t * 1.1 + i * 0.6) * i * 0.6; });
    const fade = c.u > 0.92 ? (1 - c.u) / 0.08 : Math.min(1, c.t / 4);
    g.scale.set(fade, Math.max(0.05, fade), fade);
    for (let i = 0; i < 3; i++) dust(c.x + rr(-10, 10), 0.5, c.z + rr(-10, 10), 2.5);
    if (Math.random() < 0.5) spark({ x: c.x + rr(-6, 6), y: rr(2, 60), z: c.z + rr(-6, 6), vx: rr(-10, 10), vy: rr(-2, 6), vz: rr(-10, 10), life: 2, s0: 1, s1: 1, c0: [0.3, 0.25, 0.2, 0.9], c1: [0.3, 0.25, 0.2, 0], drag: 0.5 });
    CAM.shake = Math.max(CAM.shake, clamp(1 - dist(H.x, H.z, c.x, c.z) / 200, 0, 0.35));
    // it wrecks what it touches: houses collapse, cars get thrown, sometimes a fire
    for (const B of CITY.buildings) {
      if (B.burnt || B.noFire || c.hit.has(B) || B.h > 30) continue;
      if (Math.abs(B.cx - c.x) < 14 + (B.x1 - B.x0) / 2 && Math.abs(B.cz - c.z) < 14 + (B.z1 - B.z0) / 2) {
        c.hit.add(B);
        if (Math.random() < 0.65) { burnDown(B); for (let i = 0; i < 12; i++) dust(B.cx, B.h * 0.5, B.cz, 3); AUDIO.sfx('collapse'); c.wrecked = (c.wrecked || 0) + 1; c.wreckAt = c.wreckAt || []; c.wreckAt.push({ x: B.cx, z: B.cz }); }
        else if (Math.random() < 0.4 && G.calls.filter((k) => k.type === 'fire').length < 2) startCall('fire', { B, I: 0.3 });
      }
    }
    for (const car of carsNear(c.x, c.z, 16)) { kickCar(car, 40); for (let i = 0; i < 6; i++) spark({ x: car.x, y: 1, z: car.z, vx: rr(-8, 8), vy: rr(8, 18), vz: rr(-8, 8), life: 2, s0: 1.5, s1: 1, c0: [0.4, 0.4, 0.45, 1], c1: [0.3, 0.3, 0.3, 0], grav: 9 }); }
    G.fleePoints = [{ x: c.x, z: c.z, r: 60 }];
    // the helicopter gets dragged in and battered
    const hd = dist(H.x, H.z, c.x, c.z);
    if (G.where === 'heli' && hd < 45 && H.y < 110 && fade > 0.5) {
      const k = 1 - hd / 45;
      H.vx += (c.x - H.x) / Math.max(1, hd) * 14 * k * dt; H.vz += (c.z - H.z) / Math.max(1, hd) * 14 * k * dt;
      H.yaw += dt * 2.5 * k;
      if (hd < 22) { damageHeli(dt * 16 * k, 'tornado'); if ((c.tT = (c.tT || 0) - dt) <= 0) { toast('Caught in the tornado! Pull away!', 'bad'); c.tT = 3; } }
    }
    for (const P of c.victims) {
      if (P.state) continue;
      if (dist(P.x, P.z, c.x, c.z) < 15) { P.state = 'lost'; removePerson(P); msg('The twister took someone. Oh no.', 'bad'); continue; }
      if (ladderGrab(P, dt)) { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); } }
      else if (landedNear(P.x, P.z, 22) && !P.walk) { P.walk = true; walkToHeli(P, () => { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); } else P.walk = false; }, { cancel: () => { P.walk = false; } }); }
    }
    const n = dropRescued(c);
    if (n) { c.saved += n; c.victims.filter((P) => P.state === 'aboard').slice(0, n).forEach((P) => { P.state = 'safe'; }); }
    const left = c.victims.filter((P) => !P.state).length, aboard = HELI.seats.filter((s) => s.call === c).length;
    if (c.u >= 1 && !left && !aboard) {
      G.fleePoints = [];
      finishCall(c, c.saved > 0 || !c.victims.length, c.def.reward * c.pay * (c.victims.length ? c.saved / c.victims.length : 0.5), c.saved ? `The tornado has passed. ${c.saved} people got out thanks to you.` : 'The tornado has passed.');
      // the injured it left behind
      for (const w of (c.wreckAt || []).slice(0, 2)) { const s = roadSpot((e) => dist(e.a.x, e.a.z, w.x, w.z) < 120); startCall('medevac', { spot: s, noWrecks: true, title: 'Tornado injuries', radio: 'People hurt in the tornado wreckage. Land and fly them to hospital.' }); }
      return;
    }
    c.stage = left ? `${left} people in the tornado's path! Pick them up, fast.` : aboard ? `Drop the ${aboard} survivors somewhere safe.` : 'Stay clear of the funnel until it passes.';
    c.markerPos = left ? () => { const P = c.victims.find((q) => !q.state); return P ? { x: P.x, y: P.y, z: P.z } : c; } : aboard ? () => nearestPad(HELI.x, HELI.z, ['hospital', 'home', 'police', 'ground']) : null;
  },
  cleanup() { G.fleePoints = []; },
};

// ---------- earthquake ----------
CALL_TYPES.quake = {
  start(c) {
    c.x = CITY.size / 2; c.z = CITY.size / 2; c.y = 0;
    c.title = 'Earthquake';
    c.where = 'across the city';
    c.radio = 'Earthquake! Magnitude 6.1. Reports of fires, injuries and blocked roads all over the city. All units respond!';
    c.noMarker = true; c.kids = []; c.okN = 0; c.shake = 9;
    AUDIO.sfx('quake');
    const sub = [['fire', {}], ['fire', {}], ['medevac', {}], ['jam', {}]];
    if (CITY.def.calls.includes('roof')) sub.push(['roof', {}]);
    for (const [t, o] of sub) { const k = startCall(t, Object.assign({ child: c }, o)); if (k) { k.parent = c; k.title = 'Quake: ' + k.title; c.kids.push(k); } }
    c.childDone = (k, ok) => { if (ok) c.okN++; };
    c.timed = false;
  },
  update(c, dt) {
    if (c.shake > 0) { c.shake -= dt; CAM.shake = Math.max(CAM.shake, 0.6 * Math.min(1, c.shake / 3)); }
    const open = c.kids.filter((k) => k.state === 'open').length;
    c.stage = `${open} quake emergencies still open.`;
    if (!open) finishCall(c, c.okN > 0, c.def.reward * c.pay * c.okN / Math.max(1, c.kids.length), `The city is back on its feet. ${c.okN} of ${c.kids.length} emergencies handled.`);
  },
};
