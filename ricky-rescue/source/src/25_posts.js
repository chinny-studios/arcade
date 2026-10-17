// Ricky Rescue — system status management. Between calls dispatch posts Medic 12 at a spot (a firehouse apron, a
// park curb, a gas-station or strip-mall front, a hospital lot) picked to cover whatever part of the city is thinnest
// right now, given which of the other medic units are free. Those units are simulated: they catch calls, go to the
// hospital and come back in service on their own, park at their posts (drawn when Medic 12 is near) and show on the
// map. A unit going busy or coming free can bring a move-up order. Calls for Medic 12 come from the area it is the
// closest free unit to, weighted by demand that shifts with the hour, so sitting on post means shorter responses.

const SSM = { posts: [], units: [], pts: [], m12: null };
const COVER_R = 320;            // Manhattan metres a unit covers inside the response standard
const MOVEUP_GAIN = 0.05;       // a move-up has to cover this share of the city's demand more than staying put
const MOVEUP_GAP = 12 * 60;     // game seconds between move-up orders
const ACK_T = 60;               // game seconds to acknowledge a page before dispatch tones it out again
const chuteGoal = () => { const h = hourNow(); return h >= 22 || h < 6 ? 120 : 90; };  // page to wheels rolling
const SIM_UNITS = [
  { name: 'Medic 3', home: 'fire3' }, { name: 'Medic 5', home: 'fire5' }, { name: 'Medic 7', home: 'fire7' },
  { name: 'Medic 9', home: 'hosp-brigid' }, { name: 'Medic 14', home: 'hosp-general' },
];
// how busy each district is through the day (calls per unit time, relative)
const DEMAND = {
  downtown: (h) => (h >= 8 && h < 19 ? 1.6 : h >= 19 ? 1.0 : 0.6),
  harbor: (h) => (h >= 6 && h < 17 ? 1.3 : 0.6),
  eastgate: (h) => (h >= 17 || h < 2 ? 1.5 : h >= 9 ? 1.0 : 0.7),
  maple: (h) => (h >= 16 && h < 22 ? 1.2 : h >= 7 ? 0.9 : 0.6),
};
const KIND_DEMAND = { shop: 1.4, apt: 1.25, office: 1.15, house: 1, park: 0.8, ware: 0.9, road: 1.1 };
const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
const hourNow = () => (G.clockT / 3600) % 24;
function demandW(p, h = hourNow()) { return (DEMAND[p.district || districtAt(p.x, p.z)] || DEMAND.maple)(h) * (KIND_DEMAND[p.kind] || 1); }
const postLabel = (p) => `Post ${p.n}, ${p.name}`;

// ---------- the posts and the other units ----------
function initPosts() {
  const P = SSM.posts; P.length = 0;
  const add = (id, name, x, z, yaw, kind, coffee, street) => {
    if (P.some((q) => dist(q.x, q.z, x, z) < 60)) return;
    if (street && P.some((q) => q.name === name)) name += ', ' + street;
    P.push({ id, name, x, z, yaw, kind, district: districtAt(x, z), coffee });
  };
  const st = CITY.station;
  add('station', 'Station 12', st.x, st.z, st.yaw, 'station', { x: st.door.x, z: st.door.z, name: 'the station kitchen', cost: 0 });
  for (const f of CITY.firehouses) {
    if (f.num === 12) continue;
    const bz1 = f.home.z - 4.6;
    add('fire' + f.num, 'Fire Station ' + f.num, f.block.cx - 2, bz1 + 8.5, -Math.PI / 2, 'fire', { x: f.block.cx, z: bz1 + 1, name: `Fire Station ${f.num}'s kitchen`, cost: 0 });
  }
  for (const H of Object.values(CITY.hospitals)) {
    const b = H.bay, s = H.face === 'W' ? { x: b.x - 3, z: b.z - 18, yaw: 0 } : { x: b.x - 18, z: b.z + (H.face === 'S' ? 3 : -3), yaw: Math.PI / 2 };
    add('hosp-' + H.id, H.short + ' ER', s.x, s.z, s.yaw, 'hosp', { x: H.door.x, z: H.door.z, name: 'the ED break room', cost: 0 });
  }
  const gas = CITY.places.find((p) => p.storeName === 'Gas & Go');
  if (gas) add('gas', 'Gas & Go', gas.curb.x, gas.curb.z, gas.curb.yaw, 'shop', { x: gas.x, z: gas.z, name: 'Gas & Go', cost: 4 });
  for (const b of CITY.blocks) {
    if (b.kind !== 'park' && b.kind !== 'plaza') continue;
    const p = CITY.places.find((q) => q.block === b && q.kind === 'park'); if (!p) continue;
    add('park' + b.bi + '-' + b.bj, p.parkName, p.curb.x, p.curb.z, p.curb.yaw, 'park', b.kind === 'plaza' ? { x: p.x, z: p.z, name: 'the plaza coffee cart', cost: 4 } : null, p.street);
  }
  // two strip malls, far apart
  const malls = CITY.blocks.filter((b) => b.kind === 'mall');
  const pickM = malls.length > 1 ? malls.reduce((best, a) => { for (const c of malls) { const d = dist(a.cx, a.cz, c.cx, c.cz); if (!best || d > best.d) best = { d, a, c }; } return best; }, null) : null;
  for (const b of pickM ? [pickM.a, pickM.c] : malls) {
    const shops = CITY.places.filter((q) => q.block === b && q.kind === 'shop'); if (!shops.length) continue;
    const p = shops[Math.floor(shops.length / 2)];
    add('mall' + b.bi + '-' + b.bj, p.street + ' Shops', p.curb.x, p.curb.z, p.curb.yaw, 'shop', { x: p.x, z: p.z, name: 'the corner café', cost: 4 });
  }
  // fill gaps: a street-corner post where nothing else covers
  for (let gx = 120; gx < CW; gx += 240) for (let gz = 120; gz < CW; gz += 240) {
    if (P.some((q) => man(q, { x: gx, z: gz }) < 260)) continue;
    const c = CITY.places.filter((q) => q.curb && (q.kind === 'house' || q.kind === 'apt' || q.kind === 'office')).sort((a, b) => dist(a.x, a.z, gx, gz) - dist(b.x, b.z, gx, gz))[0];
    if (c) add('corner' + gx + '-' + gz, c.street, c.curb.x, c.curb.z, c.curb.yaw, 'curb', null);
  }
  const order = ['maple', 'eastgate', 'downtown', 'harbor'];
  P.sort((a, b) => order.indexOf(a.district) - order.indexOf(b.district) || (a.id === 'station' ? -1 : b.id === 'station' ? 1 : 0));
  P.forEach((p, i) => { p.n = i + 1; });
  // demand points: every addressed place, and the posts that can reach each one in time
  SSM.pts = CITY.places.map((p) => ({ x: p.x, z: p.z, district: p.district, kind: p.kind }));
  for (const p of P) { p.pts = []; SSM.pts.forEach((q, i) => { if (man(p, q) <= COVER_R) p.pts.push(i); }); }
  // the other medic units, parked at their home posts
  SSM.units = SIM_UNITS.map((d) => {
    const rig = buildRig('cutaway', 'classic', 'alt', 'redwhite', d.name.toUpperCase());
    animRigLights(rig, false, 0, 0);
    const model = { root: mergeStatic(rig.root) }; model.root.visible = false; R.scene.add(model.root);
    return { name: d.name, short: 'M' + d.name.split(' ')[1], home: P.find((p) => p.id === d.home) || P[0], post: null, state: 'post', model, solid: null, x: 0, z: 0 };
  });
}
// a parked rig never moves: bake it into one vertex-coloured mesh plus one per decal texture
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(), col = new THREE.Color();
  const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  root.traverse((o) => {
    if (!o.isMesh || !shown(o)) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const key = mat.map || mat.transparent ? mat.uuid : 'solid';
    let G_ = groups.get(key); if (!G_) groups.set(key, (G_ = { mat, pos: [], nor: [], uv: [], col: [] }));
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    col.copy(mat.color || col.set(0xffffff)); if (mat.emissive && key === 'solid') col.add(mat.emissive.clone().multiplyScalar(0.3));
    for (let i = 0; i < P.count; i++) {
      G_.pos.push(P.getX(i), P.getY(i), P.getZ(i));
      if (N) G_.nor.push(N.getX(i), N.getY(i), N.getZ(i)); else G_.nor.push(0, 1, 0);
      if (U) G_.uv.push(U.getX(i), U.getY(i)); else G_.uv.push(0, 0);
      G_.col.push(col.r, col.g, col.b);
    }
  });
  const out = new THREE.Group();
  for (const [key, G_] of groups) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(G_.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(G_.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(G_.uv, 2));
    let mat = G_.mat;
    if (key === 'solid') { geo.setAttribute('color', new THREE.Float32BufferAttribute(G_.col, 3)); mat = new THREE.MeshLambertMaterial({ vertexColors: true }); }
    const m = new THREE.Mesh(geo, mat); m.castShadow = key === 'solid'; m.receiveShadow = key === 'solid';
    out.add(m);
  }
  return out;
}
function postById(id) { return SSM.posts.find((p) => p.id === id); }
function removeSolid(s) {
  const i = CITY.solids.indexOf(s); if (i >= 0) CITY.solids.splice(i, 1);
  for (const l of CITY.grid.values()) { const k = l.indexOf(s); if (k >= 0) l.splice(k, 1); }
}
function parkSim(u, p) {
  if (u.solid) { removeSolid(u.solid); u.solid = null; }
  u.post = p;
  if (!p) return;
  u.x = p.x; u.z = p.z;
  const M = u.model, fx = Math.abs(Math.sin(p.yaw)), fz = Math.abs(Math.cos(p.yaw)), hl = 3.5, hw = 1.2;
  M.root.position.set(p.x, 0, p.z); M.root.rotation.y = p.yaw;
  u.solid = addSolid(p.x - fx * hl - fz * hw, p.z - fz * hl - fx * hw, p.x + fx * hl + fz * hw, p.z + fz * hl + fx * hw, 2.5, 'rig');
}

// ---------- a new shift ----------
function resetPosts() {
  for (const u of SSM.units) { u.state = 'post'; u.until = 0; u.callAt = null; parkSim(u, null); }
  for (const u of SSM.units) parkSim(u, u.home);
  SSM.m12 = { post: null, deadline: 0, reached: false, onPost: false, lastOrderT: -1e9, orderT: 0 };
  if (G.shift) G.shift.posting = { orders: 0, onTime: 0, late: 0, chutes: [] };
  replan('service');
}

// ---------- coverage planning ----------
// greedy: repeatedly give the free unit / free post pair that covers the most uncovered demand. Units lean towards
// staying where they are. Medic 12 only posts inside the districts it covers this shift.
function coverPlan(withM12, fixM12) {
  const h = hourNow(), w = SSM.pts.map((q) => demandW(q, h)), cov = new Uint8Array(w.length);
  const S = G.shift, cover = S ? S.cover : ['maple'];
  const out = new Map(); let got = 0;
  const take = (a, p) => { out.set(a, p); for (const i of p.pts) if (!cov[i]) { cov[i] = 1; got += w[i]; } free.delete(p); agents.splice(agents.indexOf(a), 1); };
  const free = new Set(SSM.posts);
  const agents = SSM.units.filter((u) => u.state === 'post');
  if (withM12) agents.push('m12');
  // the other units don't park on top of Medic 12 where it stands
  const nearRig = new Set(RIG ? SSM.posts.filter((p) => dist(p.x, p.z, RIG.x, RIG.z) < 16) : []);
  if (withM12 && fixM12) take('m12', fixM12);
  while (agents.length && free.size) {
    let best = null, bs = -Infinity;
    for (const a of agents) {
      const cur = a === 'm12' ? SSM.m12 && SSM.m12.post : a.post;
      const at = a === 'm12' ? (RIG || cur) : cur;
      for (const p of free) {
        if (a === 'm12' ? !cover.includes(p.district) : nearRig.has(p)) continue;
        let g = 0; for (const i of p.pts) if (!cov[i]) g += w[i];
        if (p === cur) g *= 1.12; else if (at) g -= man(at, p) * 0.004;
        if (g > bs) { bs = g; best = [a, p]; }
      }
    }
    if (!best) break;
    take(best[0], best[1]);
  }
  const all = w.reduce((a, b) => a + b, 0);
  return { out, got, all };
}
function systemCoverage() { const pl = coverPlan(!G.call && SSM.m12 && SSM.m12.post, SSM.m12 && SSM.m12.post); return pl.all ? pl.got / pl.all : 0; }
// work out where everyone should be; reason: 'service' (Medic 12 just came free), 'busy' (Medic 12 took a call),
// or the unit whose status changed
function replan(reason) {
  const S = G.shift; if (!S || !SSM.m12) return;
  const m12free = !G.call && !S.over;
  const pl = coverPlan(m12free);
  for (const u of SSM.units) {
    if (u.state !== 'post') continue;
    const p = pl.out.get(u);
    if (p && p !== u.post) { parkSim(u, p); if (!G.call && reason !== 'service' && rnd.chance(0.5)) radio(u.name, `${u.name} moving up to ${postLabel(p)}.`, 'other'); }
  }
  if (!m12free) return;
  const want = pl.out.get('m12'); if (!want) return;
  const m = SSM.m12;
  if (!m.post || reason === 'service') { assignPost(want, null); return; }
  if (want === m.post || G.clockT - m.lastOrderT < MOVEUP_GAP) return;
  const keep = coverPlan(true, m.post);
  if ((pl.got - keep.got) / pl.all < MOVEUP_GAIN) return;
  const why = reason && reason.name ? `${reason.name} is ${reason.state === 'busy' ? 'committed' : 'back in service'}.` : 'Coverage is changing.';
  assignPost(want, why);
}
function assignPost(p, why) {
  const m = SSM.m12, S = G.shift;
  m.post = p; m.lastOrderT = G.clockT; m.orderT = G.clockT; m.reached = false; m.onPost = false;
  DT.waiting = false;
  if (RIG && dist(RIG.x, RIG.z, p.x, p.z) < 24) {
    m.reached = true; m.deadline = G.clockT;
    radio('Dispatch', `Medic 12, ${why ? why + ' ' : ''}Hold on ${postLabel(p)}.`, 'dispatch');
    return;
  }
  const len = RIG ? routeLength({ x: p.x, z: p.z }) : 500;
  m.deadline = G.clockT + etaFor(len, false) * 1.5 + 90;
  S.posting.orders++;
  AUDIO.tone(880, 0.12, 'sine', 0.05); AUDIO.tone(1175, 0.18, 'sine', 0.05, 0.14);
  radio('Dispatch', why ? `Medic 12, ${why} Move up to ${postLabel(p)}.` : `Medic 12, post at ${postLabel(p)}.`, 'dispatch');
  setTimeout(() => { if (SSM.m12.post === p && !G.call) radio('Medic 12', `Medic 12 copies, ${why ? 'moving up to' : 'en route to'} post ${p.n}.`, 'crew'); }, DEBUG ? 0 : 1400);
  buildRoute({ x: p.x, z: p.z, yaw: p.yaw }, `Post ${p.n} · ${p.name}`);
  bus.emit('postOrder', p, why);
}
// Medic 12 takes a call: it's off the board, and the others shuffle to cover
bus.on('dispatch', (C) => { C.times.page = C.t; C.chuteGoal = chuteGoal(); if (RIG) C.rollFrom = { x: RIG.x, z: RIG.z }; postsOnDispatch(); });
function postsOnDispatch() {
  if (!SSM.m12) return;
  SSM.m12.post = null; SSM.m12.reached = false; SSM.m12.onPost = false;
  replan('busy');
}

// ---------- every frame ----------
function updatePosts(gdt) {
  const S = G.shift; if (!S || !SSM.m12) return;
  const h = hourNow();
  // the other units catch calls and clear them
  for (const u of SSM.units) {
    if (u.state === 'post') {
      if (!S.over && rnd() < gdt * DEMAND[u.post ? u.post.district : 'maple'](h) / 3600) unitBusy(u);
    } else if (G.clockT >= u.until) {
      u.state = 'post'; u.callAt = null;
      if (!G.call && rnd.chance(0.4)) radio(u.name, `${u.name} clear and available.`, 'other');
      replan(u);
    } else if (G.clockT >= u.hospT && u.callAt && !u.atHosp) { u.atHosp = true; u.callAt = u.hosp; }
  }
  // Medic 12 reaching its post, staying on it
  const m = SSM.m12;
  m.onPost = !!(m.post && !G.call && RIG && dist(RIG.x, RIG.z, m.post.x, m.post.z) < 24 && Math.abs(RIG.v) < 1.5);
  if (m.post && !m.reached && m.onPost) {
    m.reached = true;
    const late = G.clockT - m.deadline;
    if (late <= 0) { S.posting.onTime++; postReward(8); toast(`On post at ${m.post.name}, on time. +8 XP`, 'good'); }
    else { S.posting.late++; toast(`On post at ${m.post.name}, ${fmtDur(late)} late.`, 'bad'); }
    radio('Medic 12', `Medic 12 on post at ${m.post.name}.`, 'crew');
    if (ROUTE.label && ROUTE.label.startsWith('Post')) clearRoute();
    bus.emit('onPost', m.post);
  }
  // a busy activity (restocking, a rig check) is a good reason to be late: dispatch knows
  if (m.post && !m.reached && DT.act) m.deadline += gdt;
  // draw the parked units near the camera only
  const fx = focusX(), fz = focusZ();
  for (const u of SSM.units) u.model.root.visible = u.state === 'post' && !!u.post && R.env === 'city' && dist(u.x, u.z, fx, fz) < 200;
}
function postReward(xp) { const K = G.career; K.xp += xp; G.shift.xp += xp; }
function unitBusy(u) {
  const near = CITY.places.filter((p) => man(p, u.post) < COVER_R);
  const p = near.length ? rnd.wpick(near, (q) => demandW(q)) : rnd.pick(CITY.places);
  u.state = 'busy'; u.callAt = { x: p.x, z: p.z }; u.atHosp = false;
  const len = rnd.range(30, 65) * 60;
  u.until = G.clockT + len; u.hospT = G.clockT + len * 0.45;
  u.hosp = Object.values(CITY.hospitals).reduce((a, b) => (dist(a.x, a.z, p.x, p.z) < dist(b.x, b.z, p.x, p.z) ? a : b));
  parkSim(u, null);
  if (!G.call && rnd.chance(0.5)) radio('Dispatch', `${u.name}, respond priority ${rnd.pick([1, 2, 2, 3])} to ${p.addr}.`, 'other');
  replan(u);
}

// ---------- where Medic 12's calls come from ----------
// weight for each candidate place: demand, strongly favouring places Medic 12 is the closest free unit to
function callZoneWeight() {
  const m = SSM.m12; if (!m || !RIG) return null;
  const base = m.post || { x: RIG.x, z: RIG.z };
  const others = SSM.units.filter((u) => u.state === 'post' && u.post).map((u) => u.post);
  const h = hourNow();
  return (p) => { const d = man(p, base); let mine = true; for (const o of others) if (man(p, o) < d) { mine = false; break; } return demandW(p, h) * (mine ? 1 : 0.1); };
}
// busier posts get paged more often
function callGapFactor() {
  const m = SSM.m12, p = m && m.post;
  return p ? clamp(DEMAND[p.district](hourNow()), 0.7, 1.5) : 1;
}
function freeUnits() { return SSM.units.filter((u) => u.state === 'post').length + (G.call ? 0 : 1); }

// ---------- map ----------
function drawPosts(g, P, big) {
  const m = SSM.m12;
  for (const p of SSM.posts) {
    const mine = m && m.post === p;
    g.fillStyle = mine ? '#40e0ff' : 'rgba(255,255,255,.35)';
    g.beginPath(); g.arc(P(p.x), P(p.z), mine ? (big ? 5 : 3.5) : big ? 3 : 2, 0, TAU); g.fill();
    if (mine) { g.strokeStyle = '#40e0ff'; g.lineWidth = 1.5; g.beginPath(); g.arc(P(p.x), P(p.z), big ? 9 : 6, 0, TAU); g.stroke(); }
    if (big) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '9px sans-serif'; g.textAlign = 'center'; g.fillText('P' + p.n, P(p.x), P(p.z) - 6); }
  }
  for (const u of SSM.units) {
    const at = u.state === 'post' ? u.post : u.callAt; if (!at) continue;
    g.fillStyle = u.state === 'post' ? '#f4f4f0' : '#ffa030';
    const s = big ? 6 : 3.6; g.fillRect(P(at.x) - s / 2, P(at.z) - s / 2, s, s);
    if (big) { g.fillStyle = u.state === 'post' ? '#e8f0ff' : '#ffc080'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText(u.short, P(at.x), P(at.z) + 13); }
  }
}
