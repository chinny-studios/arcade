// Copter City — the dispatcher and the call types. A call has a position (its marker), a stage line for the HUD, an
// update(dt), and ends with finishCall(ok, pay). People in calls are full models; they walk to the helicopter or climb
// the ladder, and ride in its seats until dropped off.

const CALLS = { group: null, n: 0 };
const CALL_TYPES = {};

function initCalls() {
  if (CALLS.group) R.scene.remove(CALLS.group);
  CALLS.group = new THREE.Group(); R.scene.add(CALLS.group);
  G.calls = []; G.target = null; G.nextCallT = 12; G.walkers = [];
}
function spawnPerson(x, y, z, pose = 'stand', o = {}) {
  const P = buildPerson(o); P.pose = pose; P.x = x; P.y = y; P.z = z; P.yaw = o.yaw !== undefined ? o.yaw : rr(0, TAU);
  CALLS.group.add(P.group); placePerson(P, x, y, z, P.yaw);
  return P;
}
function removePerson(P) { if (P && P.group.parent) P.group.parent.remove(P.group); }
function addObj(o) { CALLS.group.add(o); return o; }

// ---------- the marker: a coloured beam of light over the call ----------
function makeMarker(color) {
  const m = mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 8, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(color), map: TEX.beam, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.frustumCulled = false; m.renderOrder = 4;
  TEX.beam.flipY = true;
  CALLS.group.add(m);
  return m;
}

// ---------- dispatcher ----------
function updateDispatch(dt) {
  const def = CITY.def;
  if (G.dispatch) G.nextCallT -= dt;
  const open = G.calls.filter((c) => !c.child);
  if (G.dispatch && G.nextCallT <= 0 && open.length < def.maxCalls) {
    G.nextCallT = rr(35, 70) / (1 + 0.15 * open.length) * (open.length ? 1 : 0.6);
    const type = pickCallType();
    if (type) startCall(type);
  }
  for (const c of G.calls.slice()) {
    c.t += dt;
    if (c.def.time && c.timed !== false && c.t > c.def.time && !c.picked) { finishCall(c, false, 0, c.timeoutText || 'Too late. The call was cancelled.'); continue; }
    try { c.update(dt); } catch (e) { console.error(e); finishCall(c, false, 0, 'Call cancelled.'); continue; }
    if (c.marker) {
      const p = c.markerPos ? c.markerPos() : c;
      c.marker.position.set(p.x, (p.y || 0) - 2, p.z);
      const tgt = c === G.target;
      c.marker.scale.set(tgt ? 1.4 : 0.9, tgt ? 220 : 110, tgt ? 1.4 : 0.9);
      c.marker.material.opacity = (tgt ? 0.55 : 0.25) * (0.75 + 0.25 * Math.sin(G.t * 4));
      c.marker.visible = OPTS.markers !== false && c.state === 'open';
    }
  }
  if (G.target && G.target.state !== 'open') G.target = null;
  if (!G.target) G.target = G.calls.find((c) => c.state === 'open') || null;
  // people walking to the helicopter, and ones riding along
  for (const w of G.walkers.slice()) {
    w.t += dt;
    if (!HELI.landed || G.where !== 'heli') { G.walkers.splice(G.walkers.indexOf(w), 1); if (w.cancel) w.cancel(); continue; }
    const P = w.P, tx = w.tx(), tz = w.tz();
    const d = dist(P.x, P.z, tx, tz);
    if (d < 1.2 || w.t > 14) { G.walkers.splice(G.walkers.indexOf(w), 1); w.done(); continue; }
    const sp = w.speed || 3.5;
    P.x += (tx - P.x) / d * sp * dt; P.z += (tz - P.z) / d * sp * dt; P.yaw = Math.atan2(-(tx - P.x), -(tz - P.z));
    P.y = surfaceY(P.x, P.z, P.y + 1); P.pose = w.carried ? 'lie' : 'run';
  }
  for (const c of G.calls) if (c.people) for (const P of c.people) if (P.group.parent) { posePerson(P, dt); placePerson(P, P.x, P.y, P.z, P.yaw); }
  for (const P of G.loose || []) { posePerson(P, dt); placePerson(P, P.x, P.y, P.z, P.yaw); }
}
function pickCallType() {
  const def = CITY.def, has = (k) => HELI.st.equip.includes(k);
  const active = new Set(G.calls.map((c) => c.type));
  const opts = def.calls.filter((t) => CALL_TYPES[t] && !(CALL[t].disaster && (G.calls.some((c) => CALL[c.type].disaster) || G.t < 150)) && !(active.has(t) && ['crime', 'riot', 'ship', 'flood'].includes(t)));
  if (!opts.length) return null;
  let tot = 0; const w = opts.map((t) => { let x = CALL[t].w; if (CALL[t].needs && !has(CALL[t].needs)) x *= 0.25; tot += x; return x; });
  let r = Math.random() * tot;
  for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i]; }
  return opts[0];
}
function startCall(type, o = {}) {
  const T = CALL_TYPES[type];
  const c = { id: ++CALLS.n, type, def: CALL[type], t: 0, state: 'open', stage: '', people: [], objs: [], x: 0, y: 0, z: 0, pay: CITY.def.pay, child: o.child || null };
  let ok;
  try { ok = T.start(c, o); } catch (e) { console.error(e); ok = false; }
  if (ok === false) { cleanupCall(c); return null; }
  c.title = c.title || c.def.name;
  c.update = (dt) => T.update(c, dt);
  if (T.cleanup) c.cleanup = () => T.cleanup(c);
  if (!c.noMarker) c.marker = makeMarker(c.def.color);
  G.calls.push(c);
  if (!G.target || o.target) G.target = c;
  dispatch(c.radio || `${c.def.name} reported ${c.where || 'in town'}.`, c);
  AUDIO.sfx('radio');
  bus.emit('call', c);
  return c;
}
function finishCall(c, ok, amount, text) {
  if (c.state !== 'open') return;
  c.state = ok ? 'done' : 'failed';
  amount = Math.round((amount || 0) / 10) * 10;
  if (ok) { G.stats.done++; if (amount) pay(amount, c.title); msg(`${text || 'Good work.'}${amount ? ' ' + fmtMoney(amount) + ' paid.' : ''}`, 'good'); AUDIO.sfx('cash'); }
  else { G.stats.failed++; if (amount < 0) pay(amount, c.title); msg(text || 'Call failed.', 'bad'); AUDIO.sfx('fail'); }
  bus.emit('callEnd', c, ok, amount);
  if (c.marker) c.marker.visible = false;
  if (G.target === c) G.target = null;
  // clear the scene after a moment so the player sees the result
  setTimeout(() => cleanupCall(c), ok ? 6000 : 3000);
  const i = G.calls.indexOf(c); if (i >= 0) G.calls.splice(i, 1);
  if (c.parent) c.parent.childDone(c, ok);
}
function cleanupCall(c) {
  if (c.cleaned) return; c.cleaned = true;
  for (const P of c.people) removePerson(P);
  for (const o of c.objs) if (o.parent) o.parent.remove(o);
  if (c.marker && c.marker.parent) c.marker.parent.remove(c.marker);
  if (c.cleanup) c.cleanup();
  unboard((s) => s.call === c && c.state === 'failed');
}
bus.on('mega', (x, z, alt) => { for (const c of G.calls.slice()) if (c.onMega) c.onMega(x, z, alt); });
function cycleTarget() {
  const open = G.calls.filter((c) => c.state === 'open');
  if (!open.length) { toast('No calls right now.'); return; }
  const i = open.indexOf(G.target);
  G.target = open[(i + 1) % open.length];
  toast('Target: ' + G.target.title);
  AUDIO.sfx('click');
}
// where in town something is, in words
function whereText(x, z) {
  const b = blockAt(x, z) || CITY.blocks[clamp(Math.floor(z / P), 0, CITY.nb - 1) * CITY.nb + clamp(Math.floor(x / P), 0, CITY.nb - 1)];
  const lm = CITY.landmarks.reduce((a, l) => (!a || dist2(l.x, l.z, x, z) < dist2(a.x, a.z, x, z) ? l : a), null);
  const ns = z < CITY.size / 3 ? 'north' : z > CITY.size * 2 / 3 ? 'south' : '', ew = x < CITY.size / 3 ? 'west' : x > CITY.size * 2 / 3 ? 'east' : '';
  const side = (ns + ew) || 'central';
  if (lm && dist(lm.x, lm.z, x, z) < 140) return `near ${lm.name}`;
  const kind = { downtown: 'downtown', commercial: 'in the shopping district', apartments: 'in the apartment blocks', houses: 'in the suburbs', industrial: 'in the industrial zone', farm: 'out on the farms', park: 'in the park' }[b && b.kind] || '';
  return kind ? `${kind}, ${side} side` : `on the ${side} side`;
}
// is the helicopter landed close enough to something on the ground?
function landedNear(x, z, r) { return HELI.landed && G.where === 'heli' && dist(HELI.x, HELI.z, x, z) < r; }
// someone walks to the helicopter's door and gets in
function walkToHeli(P, done, o = {}) {
  G.walkers.push(Object.assign({ P, t: 0, tx: () => HELI.x + Math.cos(HELI.yaw) * HELI.model.r * 0.3, tz: () => HELI.z - Math.sin(HELI.yaw) * HELI.model.r * 0.3, done }, o));
}
// someone by the ladder climbs it
function ladderGrab(P, dt, pad = 4.5) {
  const tip = ladderTip();
  if (!tip || P.climbT === -1) return false;
  if (P.baseY === undefined) P.baseY = P.y;
  const near = dist(tip.x, tip.z, P.x, P.z) < pad + (P.climbT > 0 ? 2 : 0) && tip.y < P.baseY + 4.2 && tip.y > P.baseY - 2.5;
  if (near) {
    if (seatsFree() <= 0) { if ((P.fullT = (P.fullT || 0) - dt) <= 0) { toast('No room aboard! Drop people off first.', 'bad'); P.fullT = 5; } return false; }
    P.climbT = (P.climbT || 0) + dt; P.pose = 'climb';
    P.x = lerp(P.x, tip.x, dt * 4); P.z = lerp(P.z, tip.z, dt * 4); P.y = Math.max(P.y, tip.y + P.climbT * 2);
    HELI.ladder.busy = true;
    if (P.climbT > 1.6) { P.climbT = -1; HELI.ladder.busy = false; return true; }
  } else if (P.climbT > 0) { P.climbT = 0; P.pose = 'wave'; HELI.ladder.busy = false; P.y = P.baseY; }
  return false;
}
// safe ground for rescued people: landed on any pad, or on the ground far enough from the danger
function safeDrop(x, z, r) {
  if (!HELI.landed || G.where !== 'heli') return false;
  if (HELI.pad) return true;
  return dist(HELI.x, HELI.z, x, z) > r && HELI.y < 1;
}
function dropRescued(c, each) {
  if (!HELI.seats.some((s) => s.call === c && s.kind === 'rescue') || !safeDrop(c.x, c.z, 70)) return 0;
  const out = unboard((s) => s.call === c && s.kind === 'rescue');
  if (!out.length) return 0;
  for (const s of out) { const P = spawnPerson(HELI.x + rr(-4, 4), HELI.y, HELI.z + rr(-4, 4), 'wave'); (G.loose = G.loose || []).push(P); setTimeout(() => { removePerson(P); G.loose.splice(G.loose.indexOf(P), 1); }, 5000); }
  msg(out.length > 1 ? `${out.length} people climb out. "Thank you!"` : '"Thank you, pilot!"', 'good');
  if (each) each(out.length);
  return out.length;
}
const timeBonus = (t, fast, slow) => (t < fast ? 1.25 : t < slow ? 1 : 0.8);
// building fires left behind by another call become a fire call of their own
function handOffFires(fs) {
  fs = fs.filter((f) => f.kind === 'b' && FIRE.list.includes(f));
  if (!fs.length) return null;
  const first = fs[0], B = first.B, I = first.I;
  removeFire(first);
  const k = startCall('fire', { B, I });
  if (k) for (const f of fs.slice(1)) { f.inc = k.inc; k.inc.fires.push(f); }
  return k;
}

// ======================= call types =======================

// ---------- structure fire ----------
CALL_TYPES.fire = {
  start(c, o) {
    const cands = CITY.buildings.filter((B) => !B.burnt && !B.noFire && !B.fireRef && !B.pad && dist(B.cx, B.cz, CITY.home.x, CITY.home.z) > 120);
    const B = o.B || pick(cands.filter((B) => B.h > 5)) || pick(cands);
    if (!B) return false;
    c.inc = newIncident({ call: c });
    igniteBuilding(B, o.I || 0.45, c.inc);
    c.B = B; c.x = B.cx; c.z = B.cz; c.y = B.h;
    c.where = whereText(B.cx, B.cz);
    c.title = (B.h > 25 ? 'High-rise fire' : B.gable ? 'House fire' : B.style === 'ware' ? 'Warehouse fire' : 'Building fire');
    c.radio = `${c.title} ${c.where}. Fire department requests air support.`;
    c.stage = 'Fill the bucket at the water, then dump it on the flames (F).';
  },
  markerPos(c) { const f = nearestFire(HELI.x, HELI.z, c.inc); if (f) { c.x = f.x; c.z = f.z; c.y = f.h; } return c; },
  update(c) {
    c.markerPos = () => CALL_TYPES.fire.markerPos(c);
    if (!HELI.st.bucket) c.stage = 'You need a bucket for fires. Swap helicopters at the hangar.';
    else if (HELI.bucket.water > 50) c.stage = `Bucket ${Math.round(HELI.bucket.water)} L. Dump it on the flames (F).`;
    else c.stage = 'Fill the bucket: dip it in the lake, river or sea.';
    const left = FIRE.list.filter((f) => f.inc === c.inc).length;
    if (left === 0) {
      const lost = c.inc.lost;
      if (lost >= 3 || (lost >= 1 && c.inc.out === 0)) finishCall(c, false, 0, `The fire burned ${lost} building${lost > 1 ? 's' : ''} to the ground. The council is not pleased.`);
      else finishCall(c, true, c.def.reward * c.pay * timeBonus(c.t, 100, 220) * (1 - lost * 0.3) * (1 + 0.25 * (c.inc.fires.length - 1)), lost ? `Fire's out, but ${lost} building${lost > 1 ? 's were' : ' was'} lost.` : 'Fire is out! Nice flying.');
    }
  },
};

// ---------- medical evacuation from a crash ----------
CALL_TYPES.medevac = {
  start(c, o) {
    const s = o.spot || roadSpot((e) => dist((e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2, CITY.home.x, CITY.home.z) > 150);
    c.x = s.x; c.z = s.z; c.y = 0;
    c.where = o.where || whereText(s.x, s.z);
    c.title = o.title || 'Car crash';
    c.radio = o.radio || `Two-car collision ${c.where}. Injured on the scene. Land nearby and fly them to a hospital.`;
    if (!o.noWrecks) {
      for (let i = 0; i < 2; i++) { const car = buildCar('car'); wreckCar(car); car.group.position.set(s.x + (i ? 2.5 : -2), 0.05, s.z + (i ? 1.5 : -1.8)); car.group.rotation.y = s.yaw + (i ? 0.9 : -0.4); addObj(car.group); c.objs.push(car.group); }
      igniteSpot(s.x + 2.5, 0.5, s.z + 1.5, 3, 4, 1.2, 0.2, null);
      c.edge = blockEdgeAt(s.x, s.z, true);
    }
    const n = o.n || (Math.random() < 0.4 ? 2 : 1);
    c.patients = [];
    for (let i = 0; i < n; i++) {
      const px = s.x + rr(-6, 6), pz = s.z + rr(-6, 6);
      const P = spawnPerson(px, surfaceY(px, pz), pz, 'lie'); P.hp = rr(70, 100); P.baseY = P.y;
      c.people.push(P); c.patients.push(P);
    }
    const by = spawnPerson(s.x + 6, CURB, s.z - 5, 'wave'); c.people.push(by); c.by = by;
    c.stage = 'Land near the crash to pick up the injured.';
  },
  update(c, dt) {
    const H = HELI, drain = H.st.medic ? 0.12 : 0.4;
    for (const P of c.patients) {
      if (P.state === 'dead' || P.state === 'done') continue;
      P.hp -= dt * (P.state === 'aboard' ? drain * (1 + H.roughT) : 0.35);
      if (P.hp <= 0) {
        P.state = 'dead'; removePerson(P);
        unboard((s) => s.P === P);
        msg('We lost one of the patients.', 'bad');
      }
    }
    const waiting = c.patients.filter((P) => !P.state);
    const aboard = c.patients.filter((P) => P.state === 'aboard');
    // load the waiting ones once you're down beside them
    if (waiting.length && landedNear(c.x, c.z, 28)) {
      for (const P of waiting) {
        if (seatsFree() <= c.patients.filter((q) => q.state === 'walk').length) { if ((c.fullT = (c.fullT || 0) - dt) <= 0) { toast('No room aboard for another patient.', 'bad'); c.fullT = 6; } break; }
        P.state = 'walk';
        walkToHeli(P, () => { if (P.state !== 'walk') return; if (board('patient', { call: c, P })) { P.state = 'aboard'; removePerson(P); } else P.state = null; }, { carried: true, speed: 2.4, cancel: () => { P.state = null; P.pose = 'lie'; } });
      }
    }
    // unload at a hospital
    if (aboard.length && H.landed && H.pad && H.pad.kind === 'hospital' && G.where === 'heli') {
      let sum = 0;
      for (const P of aboard) { P.state = 'done'; sum += c.def.reward * c.pay * (0.4 + 0.6 * P.hp / 100) * (H.pad.b && H.pad === nearestPad(c.x, c.z, ['hospital']) ? 1.1 : 1); }
      unboard((s) => s.call === c);
      c.paid = (c.paid || 0) + sum;
      msg(`Patient${aboard.length > 1 ? 's' : ''} handed over at ${H.pad.name}.`, 'good');
    }
    const live = c.patients.filter((P) => P.state !== 'dead');
    if (c.patients.every((P) => P.state === 'dead' || P.state === 'done')) {
      if (live.length) finishCall(c, true, c.paid, c.patients.some((P) => P.state === 'dead') ? 'One patient made it. The other didn\'t.' : 'The hospital says they\'ll pull through.');
      else finishCall(c, false, 0, 'All patients were lost.');
      return;
    }
    if (aboard.length && !waiting.length && !c.patients.some((P) => P.state === 'walk')) {
      const hp = nearestPad(H.x, H.z, ['hospital']);
      c.stage = `Fly to ${hp.name} and land on the red pad. Patient: ${Math.round(Math.min(...aboard.map((P) => P.hp)))}%`;
      c.markerPos = () => ({ x: hp.x, y: hp.y, z: hp.z });
    } else {
      c.stage = waiting.length ? `Land near the crash. ${waiting.length} injured, ${Math.round(Math.min(...waiting.map((P) => P.hp)))}% condition.` : 'Loading the patient...';
      c.markerPos = null;
    }
  },
  cleanup(c) { if (c.edge) c.edge.blocked = false; },
};

// ---------- passenger ----------
CALL_TYPES.taxi = {
  start(c) {
    const places = CITY.places.filter((p) => dist(p.x, p.z, HELI.x, HELI.z) > 120 && p.kind !== 'hangar');
    const pl = pick(places); if (!pl) return false;
    // sometimes they wait on a rooftop pad
    const pads = CITY.pads.filter((p) => p.kind === 'roof' && !p.dead);
    const onRoof = pads.length && Math.random() < 0.3 ? pick(pads) : null;
    const from = onRoof ? { x: onRoof.x + 3, y: onRoof.y, z: onRoof.z + 3 } : { x: pl.x, y: CURB, z: pl.z };
    c.x = from.x; c.y = from.y; c.z = from.z;
    c.name = randName();
    const dests = CITY.landmarks.filter((l) => dist(l.x, l.z, c.x, c.z) > 220);
    c.dest = pick(dests.length ? dests : CITY.landmarks);
    c.where = onRoof ? `on the ${onRoof.name.toLowerCase()} ${whereText(c.x, c.z)}` : whereText(c.x, c.z);
    c.title = 'Fare: ' + c.name;
    c.radio = `${c.name} wants a ride to ${c.dest.name}. Pickup ${c.where}.`;
    c.P = spawnPerson(c.x, c.y, c.z, 'wave'); c.people.push(c.P);
    c.comfort = 100;
    c.stage = `Land near ${c.name.split(' ')[0]} to pick them up.`;
    c.timeoutText = `${c.name} got tired of waiting and took the bus.`;
  },
  update(c, dt) {
    const H = HELI;
    if (!c.picked) {
      if (!c.walking && landedNear(c.x, c.z, 24)) {
        if (seatsFree() <= 0) { if ((c.fullT = (c.fullT || 0) - dt) <= 0) { toast('No free seat for the passenger.', 'bad'); c.fullT = 6; } return; }
        c.walking = true; c.P.pose = 'run';
        walkToHeli(c.P, () => { if (board('passenger', { call: c })) { c.picked = true; c.pickT = c.t; removePerson(c.P); msg(`${c.name.split(' ')[0]}: "${pick(TAXI_HI)}"`, 'person'); } else c.walking = false; }, { cancel: () => { c.walking = false; c.P.pose = 'wave'; } });
      }
      return;
    }
    c.stage = `Fly ${c.name.split(' ')[0]} to ${c.dest.name}. Comfort ${Math.round(c.comfort)}%`;
    c.markerPos = () => ({ x: c.dest.x, y: c.dest.pad ? c.dest.pad.y : 0, z: c.dest.z });
    // a rough ride annoys them
    const rough = H.roughT > 0.2 || Math.abs(H.roll) > 0.5 || Math.abs(H.pitch) > 0.4 || Math.abs(H.vy) > 9;
    if (rough) { c.comfort = Math.max(0, c.comfort - dt * (H.roughT > 0.2 ? 20 : 6)); if ((c.complainT = (c.complainT || 0) - dt) <= 0) { msg(`${c.name.split(' ')[0]}: "${pick(TAXI_ROUGH)}"`, 'person'); c.complainT = 8; } }
    if (H.landed && G.where === 'heli' && (dist(H.x, H.z, c.dest.x, c.dest.z) < 45 || (c.dest.pad && H.pad === c.dest.pad))) {
      unboard((s) => s.call === c);
      const ride = c.t - c.pickT, d = dist(c.x, c.z, c.dest.x, c.dest.z);
      const fare = (c.def.reward + d * 1.4) * c.pay, tip = fare * 0.5 * (c.comfort / 100) * (ride < d / 25 + 20 ? 1 : 0.4);
      const P = spawnPerson(H.x + 3, H.y, H.z + 3, 'wave'); (G.loose = G.loose || []).push(P); setTimeout(() => { removePerson(P); G.loose.splice(G.loose.indexOf(P), 1); }, 4000);
      finishCall(c, true, fare + tip, `${c.name.split(' ')[0]}: "${c.comfort > 60 ? pick(TAXI_BYE) : 'Never again.'}" Fare ${fmtMoney(fare)}${tip > 20 ? ', tip ' + fmtMoney(tip) : ', no tip'}.`);
    }
  },
};

// ---------- traffic jam ----------
CALL_TYPES.jam = {
  start(c) {
    const ns = CITY.nodes.filter((n) => n.edges.length >= 3 && !n.jam && dist(n.x, n.z, CITY.home.x, CITY.home.z) > 150);
    const n = pick(ns); if (!n) return false;
    n.jam = 1; n.jamQ = 0; c.n = n;
    c.x = n.x; c.z = n.z; c.y = 0;
    c.where = whereText(n.x, n.z);
    c.title = 'Traffic jam';
    c.radio = `Gridlock ${c.where}. A stalled truck has the intersection blocked. Get down there with the megaphone.`;
    const tr = buildCar('truck', 0xd8d8d0); tr.group.position.set(n.x + 1, 0.05, n.z - 1); tr.group.rotation.y = 0.6; addObj(tr.group); c.objs.push(tr.group);
    c.stage = 'Hover low over the jam and use the megaphone (4, then F).';
    c.timeoutText = 'The jam cleared on its own. No pay this time.';
    c.onMega = (x, z, alt) => {
      if (c.state !== 'open' || dist(x, z, c.n.x, c.n.z) > 55 || alt > 70) return;
      c.n.jam = 0;
      c.objs.forEach((o) => { o.visible = false; });
      finishCall(c, true, c.def.reward * c.pay * timeBonus(c.t, 45, 90), 'Traffic is moving again.');
    };
  },
  update(c) {
    const stuck = carsNear(c.n.x, c.n.z, 60).filter((k) => k.v < 0.5).length;
    c.stage = HELI.st.equip.includes('mega') ? `${stuck} cars stuck. Hover low and use the megaphone (4, then F).` : 'You need a megaphone for this one.';
  },
  cleanup(c) { c.n.jam = 0; c.onMega = null; },
};

// ---------- getaway car ----------
CALL_TYPES.crime = {
  start(c) {
    const s = roadSpot((e) => dist(e.a.x, e.a.z, HELI.x, HELI.z) > 200);
    const car = buildCar('car', 0x1a1a1a);
    c.car = { e: s.e, dir: 1, t: s.t, v: 0, vmax: 19, lane: 2.8, x: s.x, z: s.z, yaw: 0, model: car };
    addObj(car.group); c.objs.push(car.group);
    c.x = s.x; c.z = s.z;
    c.where = whereText(s.x, s.z);
    c.title = pick(['Bank robbery', 'Armed robbery', 'Jewelry heist', 'Stolen armored car']);
    c.radio = `${c.title} ${c.where}! Suspects fleeing in a black sedan. Keep them in sight, and gas them if you can.`;
    c.seen = 0; c.lost = 0; c.police = []; c.stopped = 0;
    c.spotTarget = () => ({ x: c.car.x, y: 0.5, z: c.car.z });
    c.markerPos = () => ({ x: c.car.x, y: 0, z: c.car.z });
  },
  update(c, dt) {
    const H = HELI, car = c.car;
    const d = dist(H.x, H.z, car.x, car.z);
    const dark = R.night > 0.5;
    const lit = H.spot && H.spotAim && dist(H.spotAim.x, H.spotAim.z, car.x, car.z) < 25;
    const sees = G.where === 'heli' && d < 150 && (!dark || lit || d < 45);
    if (c.stopped > 0) {
      c.stopped += dt; car.v = 0;
      if (c.stopped > 3 && !c.done) { c.done = true; finishCall(c, true, c.def.reward * c.pay * 1.35, 'Suspects in custody, coughing their lungs out. Great work!'); }
    } else {
      // flee: at each crossing, prefer the road leading away from the helicopter
      car.v = damp(car.v, car.vmax * (sees ? 1 : 0.7), 1, dt);
      followRoad(car, dt, (n, opts) => { let best = opts[0], bs = -1e9; for (const e of opts) { const o = e.a === n ? e.b : e.a; const s = dist(o.x, o.z, H.x, H.z) + rr(0, 60) - (o.edges.length < 2 ? 200 : 0); if (s > bs) { bs = s; best = e; } } return best; });
      if (inGas(car.x, car.z, 2) || GEAR.cans.some((k) => k.y < 3 && dist(k.x, k.z, car.x, car.z) < 7)) { c.stopped = 0.01; msg('Direct hit! The car swerves to a stop.', 'good'); car.model.group.rotation.z = 0.05; }
      if (sees) { c.seen += dt; c.lost = 0; } else c.lost += dt;
      if (c.seen > 8 && c.police.length < 2 && c.police.length < Math.floor(c.seen / 8)) {
        const pc = buildCar('police'); addObj(pc.group); c.objs.push(pc.group);
        c.police.push({ e: car.e, dir: car.dir, t: Math.max(0, car.t - 40), v: 16, vmax: 21, lane: 2.8, x: 0, z: 0, yaw: 0, model: pc });
        msg('Units joining the pursuit.', 'radio');
      }
      if (c.seen > 75) { c.stopped = 0.01; msg('Police have them boxed in!', 'good'); c.boxed = true; }
      if (c.lost > 28) { finishCall(c, false, 0, 'We lost them. The suspects got away.'); return; }
      // they shoot at a low helicopter
      if (d < 38 && H.y < 30 && G.where === 'heli' && Math.random() < dt * 0.7) { damageHeli(rr(2, 5), 'gunfire'); AUDIO.sfx('shot'); if ((c.shotT = (c.shotT || 0) - 1) < 0) { toast('They\'re shooting at you! Gain some height.', 'bad'); c.shotT = 3; } }
    }
    car.model.group.position.set(car.x, 0.05, car.z); car.model.group.rotation.y = car.yaw;
    for (const pc of c.police) {
      pc.v = damp(pc.v, c.stopped ? 0 : Math.min(pc.vmax, car.v + 3), 1, dt);
      if (!c.stopped || dist(pc.x, pc.z, car.x, car.z) > 9) followRoad(pc, dt, (n, opts) => { let best = opts[0], bd = 1e12; for (const e of opts) { const o = e.a === n ? e.b : e.a; const dd = dist2(o.x, o.z, car.x, car.z); if (dd < bd) { bd = dd; best = e; } } return best; });
      pc.model.group.position.set(pc.x, 0.05, pc.z); pc.model.group.rotation.y = pc.yaw;
      for (const l of pc.model.lights) l.visible = (G.t * 4 + (l === pc.model.lights[0] ? 0 : 0.5)) % 1 < 0.5;
    }
    c.x = car.x; c.z = car.z;
    c.stage = c.stopped ? 'Suspects stopped. Police moving in...' : d > 150 ? `Find the black sedan! Lost for ${Math.round(c.lost)} s.` : dark && !lit && d > 45 ? 'It\'s dark: switch on the searchlight (3, then F).' : `Pursuit ${Math.round(Math.min(100, c.seen / 75 * 100))}%. Drop tear gas (5, F) to stop them.`;
  },
};

// ---------- rooftop rescue ----------
CALL_TYPES.roof = {
  start(c) {
    const cands = CITY.buildings.filter((B) => !B.burnt && !B.noFire && !B.fireRef && !B.pad && !B.gable && B.h > 14 && B.h < 95 && dist(B.cx, B.cz, CITY.home.x, CITY.home.z) > 150);
    const B = pick(cands); if (!B) return false;
    c.B = B; c.inc = newIncident({ call: c, slow: true });
    igniteBuilding(B, 0.4, c.inc);
    const top = B.tiers[B.tiers.length - 1];
    c.x = (top.x0 + top.x1) / 2; c.z = (top.z0 + top.z1) / 2; c.y = top.h;
    const n = Math.random() < 0.5 ? 2 : 3;
    c.victims = [];
    for (let i = 0; i < n; i++) { const P = spawnPerson(lerp(top.x0 + 2, top.x1 - 2, Math.random()), top.h, lerp(top.z0 + 2, top.z1 - 2, Math.random()), 'wave'); P.baseY = P.y; c.people.push(P); c.victims.push(P); }
    c.where = whereText(B.cx, B.cz);
    c.title = 'Rooftop rescue';
    c.radio = `Fire ${c.where} with ${n} people trapped on the roof! Lower the ladder and get them off.`;
    c.saved = 0; c.lostN = 0;
  },
  update(c, dt) {
    const B = c.B;
    for (const P of c.victims) {
      if (P.state) continue;
      if (B.burnt) { P.state = 'lost'; removePerson(P); c.lostN++; continue; }
      if (ladderGrab(P, dt)) { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); msg('One aboard!', 'good'); } }
    }
    const n = dropRescued(c);
    if (n) { c.saved += n; c.victims.filter((P) => P.state === 'aboard').slice(0, n).forEach((P) => { P.state = 'safe'; }); }
    const onRoof = c.victims.filter((P) => !P.state).length, aboard = HELI.seats.filter((s) => s.call === c).length;
    if (!onRoof && !aboard) {
      const fireLeft = FIRE.list.some((f) => f.inc === c.inc);
      if (c.saved === 0) { finishCall(c, false, 0, 'Nobody made it off that roof.'); return; }
      finishCall(c, true, c.def.reward * c.pay * (c.saved / c.victims.length) * (fireLeft ? 1 : 1.3), `${c.saved} of ${c.victims.length} rescued.${fireLeft ? ' The fire is still burning.' : ' And the fire is out!'}`);
      if (fireLeft) handOffFires(FIRE.list.filter((q) => q.inc === c.inc));
      return;
    }
    if (onRoof) { c.stage = HELI.ladder.len > 6 ? `Hover so the ladder reaches the roof. ${onRoof} waiting.` : 'Select the ladder (2) and hover over the roof.'; c.markerPos = null; }
    else { c.stage = `Land at a helipad or open ground away from the fire to drop off ${aboard}.`; c.markerPos = () => { const p = nearestPad(HELI.x, HELI.z, ['hospital', 'home', 'police', 'ground']); return p; }; }
  },
};

// ---------- riot ----------
CALL_TYPES.riot = {
  start(c) {
    const pl = pick(CITY.places.filter((p) => ['downtown', 'commercial', 'landmark', 'park', 'apartments'].includes(p.kind)));
    if (!pl) return false;
    c.x = pl.x; c.z = pl.z; c.y = 0;
    c.where = whereText(c.x, c.z);
    c.title = 'Riot';
    c.radio = `A riot has broken out ${c.where}! Break it up with tear gas or the megaphone before they torch the place.`;
    c.rioters = [];
    for (let i = 0; i < 12; i++) { const P = spawnPerson(c.x + rr(-12, 12), CURB, c.z + rr(-12, 12), 'riot', { shirt: pick([0x2a2a2a, 0x5a2a2a, 0x3a3a5a, 0x6a6a6a]) }); P.home = { x: P.x, z: P.z }; c.people.push(P); c.rioters.push(P); }
    const s = roadSpot((e) => dist(e.a.x, e.a.z, c.x, c.z) < 110);
    const car = buildCar('car'); wreckCar(car); car.group.position.set(s.x, 0.05, s.z); car.group.rotation.y = s.yaw + 1; addObj(car.group); c.objs.push(car.group);
    c.inc = newIncident({ call: c });
    igniteSpot(s.x, 0.4, s.z, 3, 4, 1.4, 0.6, c.inc);
    c.anger = 0; c.megaHits = 0;
    c.onMega = (x, z, alt) => {
      if (c.state !== 'open' || dist(x, z, c.x, c.z) > 55 || alt > 70) return;
      const left = c.rioters.filter((P) => !P.state);
      for (const P of left.slice(0, Math.ceil(left.length * 0.25))) disperse(P);
      c.anger = Math.max(0, c.anger - 6);
    };
    function disperse(P) { P.state = 'run'; P.pose = 'run'; const a = Math.atan2(P.z - c.z, P.x - c.x); P.fx = Math.cos(a); P.fz = Math.sin(a); P.yaw = Math.atan2(-P.fx, -P.fz); }
    c.disperse = disperse;
    c.timeoutText = 'The riot burned itself out, and took half the block with it.';
  },
  update(c, dt) {
    const left = c.rioters.filter((P) => !P.state);
    for (const P of c.rioters) {
      if (P.state === 'run') { P.x += P.fx * 6 * dt; P.z += P.fz * 6 * dt; P.runT = (P.runT || 0) + dt; if (P.runT > 5) { P.state = 'gone'; removePerson(P); } continue; }
      if (P.state) continue;
      if (inGas(P.x, P.z, 2)) { c.disperse(P); continue; }
      P.x = lerp(P.x, P.home.x + Math.sin(G.t * 0.7 + P.t) * 4, dt); P.z = lerp(P.z, P.home.z + Math.cos(G.t * 0.6 + P.t) * 4, dt);
      P.y = surfaceY(P.x, P.z, 3);
    }
    // left alone, they start setting buildings alight
    c.anger += dt * left.length / 12;
    if (c.anger > 22 && left.length > 4) {
      c.anger = 0;
      const near = CITY.buildings.filter((B) => !B.noFire && !B.burnt && !B.fireRef && dist(B.cx, B.cz, c.x, c.z) < 70);
      if (near.length) { igniteBuilding(pick(near), 0.3, c.inc); msg('The rioters have set a building on fire!', 'bad'); }
    }
    c.stage = `${left.length} rioters. Tear gas (5, F) or the megaphone (4, F) breaks them up.`;
    if (!left.length && c.rioters.every((P) => P.state === 'gone')) {
      const fires = FIRE.list.filter((f) => f.inc === c.inc && f.kind === 'b');
      finishCall(c, true, c.def.reward * c.pay * timeBonus(c.t, 60, 120), 'The crowd has scattered. Order restored.');
      handOffFires(fires);
    }
  },
  cleanup(c) { c.onMega = null; for (const f of FIRE.list.slice()) if (f.inc === c.inc && f.kind === 's') removeFire(f); },
};

// ---------- flash flood ----------
CALL_TYPES.flood = {
  start(c) {
    // a land block on the river bank floods
    const bs = CITY.blocks.filter((b) => b.shore && !b.water && ['houses', 'apartments', 'commercial', 'park', 'industrial'].includes(b.kind));
    const b = pick(bs); if (!b) return false;
    c.b = b; c.x = b.cx; c.z = b.cz; c.y = 0;
    c.level = 0.2;
    const w = mesh(GM.plane(), new THREE.MeshLambertMaterial({ map: TEX.water, color: 0xa89a70, transparent: true, opacity: 0.85 }), b.cx, c.level, b.cz, b.sx1 - b.sx0 + 14, 1, b.sz1 - b.sz0 + 14);
    addObj(w); c.objs.push(w); c.water = w;
    c.victims = [];
    const n = 3 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const s = { x: rr(b.sx0 - 4, b.sx1 + 4), z: rr(b.sz0, b.sz1) };
      if (i % 2 === 0) { s.x = b.sx0 - 3; s.z = rr(b.sz0 + 5, b.sz1 - 5); } // on a car in the street
      const car = buildCar('car'); car.group.position.set(s.x, 0.05, s.z); car.group.rotation.y = rr(0, TAU); addObj(car.group); c.objs.push(car.group);
      const P = spawnPerson(s.x, 1.55, s.z, 'wave'); P.baseY = P.y; P.hp = 100; c.people.push(P); c.victims.push(P);
    }
    c.where = whereText(b.cx, b.cz);
    c.title = 'Flash flood';
    c.radio = `Flash flooding ${c.where}! ${n} people stranded on their cars. Ladder rescue needed.`;
    c.saved = 0;
  },
  update(c, dt) {
    c.level = Math.min(1.5, c.level + dt * 0.006);
    c.water.position.y = c.level;
    for (const P of c.victims) {
      if (P.state) continue;
      P.hp -= dt * (c.level > 1.2 ? 0.6 : 0.25);
      if (P.hp <= 0) { P.state = 'lost'; removePerson(P); msg('Someone was swept away by the water.', 'bad'); continue; }
      if (ladderGrab(P, dt)) { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); msg('Got one!', 'good'); } }
    }
    const n = dropRescued(c);
    if (n) { c.saved += n; c.victims.filter((P) => P.state === 'aboard').slice(0, n).forEach((P) => { P.state = 'safe'; }); }
    const left = c.victims.filter((P) => !P.state).length, aboard = HELI.seats.filter((s) => s.call === c).length;
    if (!left && !aboard) {
      if (!c.saved) finishCall(c, false, 0, 'Nobody was saved from the flood.');
      else finishCall(c, true, c.def.reward * c.pay * c.saved / c.victims.length, `${c.saved} of ${c.victims.length} pulled out of the flood.`);
      return;
    }
    c.stage = left ? `${left} stranded. Lower the ladder (2) and hover over them.` : `Drop ${aboard} off on dry ground or a helipad.`;
    c.markerPos = left ? null : () => nearestPad(HELI.x, HELI.z, ['hospital', 'home', 'police', 'ground']);
  },
};

// ---------- ship on fire ----------
CALL_TYPES.ship = {
  start(c) {
    // open water at least one block from the shore
    const cells = [];
    for (let bj = -2; bj < CITY.nb + 2; bj++) for (let bi = -2; bi < CITY.nb + 2; bi++) if (waterBlock(bi, bj) && waterBlock(bi + 1, bj) && waterBlock(bi - 1, bj) && waterBlock(bi, bj + 1) && waterBlock(bi, bj - 1)) cells.push([bi, bj]);
    if (!cells.length) return false;
    const [bi, bj] = pick(cells);
    c.x = (bi + 0.5) * P; c.z = (bj + 0.5) * P; c.y = 2;
    c.ship = buildShip(); c.ship.position.set(c.x, WATER_Y, c.z); c.ship.rotation.y = rr(0, TAU); addObj(c.ship); c.objs.push(c.ship);
    c.inc = newIncident({ call: c });
    const cy = Math.cos(c.ship.rotation.y), sy = Math.sin(c.ship.rotation.y);
    c.fire = igniteSpot(c.x + sy * -5, 2, c.z + cy * -5, 6, 9, 2.5, 0.6, c.inc);
    c.victims = [];
    for (let i = 0; i < 3; i++) { const lz = 6 + i * 1.6; const P = spawnPerson(c.x + sy * lz + rr(-1.5, 1.5), WATER_Y + 1.85, c.z + cy * lz, 'wave'); P.baseY = P.y; c.people.push(P); c.victims.push(P); }
    c.title = 'Ship on fire';
    c.where = 'out on the water';
    c.radio = 'Mayday from the freighter "Dorothy B": engine room fire and crew on deck! Put out the fire and lift the crew off.';
    c.sink = 0; c.saved = 0;
  },
  update(c, dt) {
    const fireLeft = FIRE.list.includes(c.fire);
    if (fireLeft) c.sink += dt;
    if (c.sink > 260) { // she's going down
      c.ship.position.y = WATER_Y - (c.sink - 260) * 0.15;
      for (const P of c.victims) if (!P.state && c.sink > 285) { P.state = 'lost'; removePerson(P); }
      if (c.sink > 300 && fireLeft) removeFire(c.fire);
    }
    for (const P of c.victims) {
      if (P.state) continue;
      P.y = c.ship.position.y + 2.25;
      P.baseY = P.y;
      if (ladderGrab(P, dt)) { if (board('rescue', { call: c })) { P.state = 'aboard'; removePerson(P); msg('Crewman aboard!', 'good'); } }
    }
    const n = dropRescued(c);
    if (n) { c.saved += n; c.victims.filter((P) => P.state === 'aboard').slice(0, n).forEach((P) => { P.state = 'safe'; }); }
    const left = c.victims.filter((P) => !P.state).length, aboard = HELI.seats.filter((s) => s.call === c).length;
    if (!left && !aboard && (!FIRE.list.includes(c.fire) || c.sink > 260)) {
      const out = !FIRE.list.includes(c.fire) && c.sink <= 260;
      if (!c.saved && !out) finishCall(c, false, 0, 'The Dorothy B went down with all hands.');
      else finishCall(c, true, c.def.reward * c.pay * (0.3 * (out ? 1 : 0) + 0.7 * c.saved / 3), out ? `Fire out and ${c.saved} crew saved. The harbourmaster owes you a drink.` : `${c.saved} crew saved, but the ship is lost.`);
      return;
    }
    c.stage = left ? `${left} crew on deck. Ladder (2) to lift them${fireLeft ? ', bucket (1) for the fire' : ''}.` : aboard ? `Land the ${aboard} crew on dry ground.` : 'Put the fire out with the bucket.';
    c.markerPos = !left && aboard ? () => nearestPad(HELI.x, HELI.z, ['home', 'hospital', 'ground', 'police']) : null;
  },
};
