// The Time Apprentice — the stage: whatever set is loaded now (the workshop, or one location of a scenario).
// Scenario build functions only talk to this API: batches, solids, ground, spots, items, actors, ticks and particles.

const Stage = {
  root: null, id: null, gbs: {}, solids: [], spots: {}, items: {}, actors: {}, crowd: [], ticks: [], emitters: [],
  heightFn: null, box: [-50, -50, 50, 50], surf: 'sand', sc: null, data: {},
  clear() {
    if (this.root) {
      R.scene.remove(this.root);
      this.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material !== R.mat.person && !Object.values(R.mat).includes(o.material)) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      });
    }
    this.root = new THREE.Group(); R.scene.add(this.root);
    this.gbs = {}; this.solids = []; this.spots = {}; this.items = {}; this.actors = {}; this.crowd = []; this.ticks = []; this.emitters = [];
    this.heightFn = null; this.box = [-50, -50, 50, 50]; this.surf = 'sand'; this.data = {}; this.id = null;
  },
  // a batch layer: 'main' casts and receives shadows, 'shell' (walls, roofs) only receives, 'glow' is unlit, 'ds' double-sided
  gb(layer = 'main') { return this.gbs[layer] || (this.gbs[layer] = new GB()); },
  finish() {
    for (const k in this.gbs) {
      const gb = this.gbs[k]; if (gb.empty) continue;
      const mat = k === 'glow' ? R.mat.glow : k === 'ds' ? R.mat.vcDS : R.mat.vc;
      const m = gb.mesh(mat, { cast: k === 'main' || k === 'ds', receive: k !== 'glow' });
      m.name = 'batch:' + k; this.root.add(m);
    }
    this.gbs = {};
  },
  add(o, parent) { (parent || this.root).add(o); return o; },
  // a movable object built from its own batch
  obj(build, x = 0, y = 0, z = 0, ry = 0, o = {}) {
    const gb = new GB(); build(gb);
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry;
    if (!gb.empty) grp.add(gb.mesh(o.mat || R.mat.vc, { cast: o.cast !== false }));
    if (o.glow) { const gg = new GB(); o.glow(gg); if (!gg.empty) grp.add(gg.mesh(R.mat.glow, { cast: false, receive: false })); }
    this.root.add(grp); return grp;
  },
  // ---- collision ----
  solidBox(x, z, w, d, ry = 0, o = {}) { const s = { k: 'b', x, z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), y0: o.y0 != null ? o.y0 : -1e9, y1: o.y1 != null ? o.y1 : 1e9, id: o.id }; this.solids.push(s); return s; },
  solidCircle(x, z, r, o = {}) { const s = { k: 'c', x, z, r, y0: o.y0 != null ? o.y0 : -1e9, y1: o.y1 != null ? o.y1 : 1e9, id: o.id }; this.solids.push(s); return s; },
  removeSolid(s) { this.solids = this.solids.filter((q) => q !== s && (!s || typeof s !== 'string' || q.id !== s)); },
  bounds(x0, z0, x1, z1) { this.box = [x0, z0, x1, z1]; },
  ground(fn) { this.heightFn = fn; },
  height(x, z) { return this.heightFn ? this.heightFn(x, z) : 0; },
  collide(x, z, r, y = 0) {
    for (let pass = 0; pass < 2; pass++) {
      for (const s of this.solids) {
        if (y + 1.5 < s.y0 || y > s.y1) continue;
        if (s.k === 'c') {
          const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz), m = s.r + r;
          if (d < m && d > 1e-6) { x = s.x + dx / d * m; z = s.z + dz / d * m; }
        } else {
          const dx = x - s.x, dz = z - s.z;
          const lx = dx * s.c - dz * s.s, lz = dx * s.s + dz * s.c;
          const cx = clamp(lx, -s.hw, s.hw), cz = clamp(lz, -s.hd, s.hd);
          let ox = lx - cx, oz = lz - cz; const d = Math.hypot(ox, oz);
          let nx = lx, nz = lz;
          if (d < 1e-6) {
            // centre inside the box: push out along the shallowest side
            const px = s.hw - Math.abs(lx), pz = s.hd - Math.abs(lz);
            if (px < pz) nx = Math.sign(lx || 1) * (s.hw + r); else nz = Math.sign(lz || 1) * (s.hd + r);
          } else if (d < r) { nx = cx + ox / d * r; nz = cz + oz / d * r; } else continue;
          x = s.x + nx * s.c + nz * s.s; z = s.z - nx * s.s + nz * s.c;
        }
      }
      for (const a of this.actorList()) {
        if (!a.solid || !a.g.visible) continue;
        const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz), m = 0.28 + r;
        if (d < m && d > 1e-6) { x = a.x + dx / d * m; z = a.z + dz / d * m; }
      }
    }
    const b = this.box;
    return [clamp(x, b[0], b[2]), clamp(z, b[1], b[3])];
  },
  // ---- named places, things to pick up, people ----
  spot(id, x, z, o = {}) { const s = Object.assign({ id, x, z, y: o.y != null ? o.y : this.height(x, z), r: 2.2, label: null }, o); this.spots[id] = s; return s; },
  // where an album shot (sc.album.shots[id]) is taken from: look toward (x, y + dy, z) from within `reach` and press E.
  // o.when(S) may return a string (a hint, like "Wait for a plane!") while the shot isn't possible yet.
  shot(id, x, z, o = {}) {
    const sc = this.sc, def = sc && sc.album && sc.album.shots[id]; if (!def) { console.warn('no album shot ' + id); return null; }
    const s = this.spot('shot:' + id, x, z, Object.assign({ r: 1, dy: 1.6, reach: 7 }, o, {
      label: (Album.has(sc.id, id) ? 'Photograph again: ' : 'Take a photo: ') + def.t,
      use: () => {
        const why = o.when ? o.when(this) : true;
        if (why !== true) { HUD.toast('Not yet', typeof why === 'string' ? why : 'Wait for the right moment.', 'hint'); return; }
        Album.snap(sc.id, id); s.label = 'Photograph again: ' + def.t;
      },
    }));
    return s;
  },
  item(id, obj, o = {}) { const it = Object.assign({ id, obj, label: id, taken: false, gone: false }, o); this.items[id] = it; return it; },
  actor(id, x, z, yaw = 0, o = {}) {
    const def = Object.assign({}, (this.sc && this.sc.cast && this.sc.cast[o.cast || id]) || {}, o);
    const a = new Actor(id, def, x, z, yaw);
    this.actors[id] = a; this.root.add(a.g); return a;
  },
  // background people: lighter bodies, never talkable unless given lines
  extra(look, x, z, yaw = 0, o = {}) {
    const a = new Actor(null, Object.assign({ look, name: o.name || null }, o), x, z, yaw);
    a.solid = o.solid !== false; this.crowd.push(a); this.root.add(a.g); return a;
  },
  actorList() { return Object.values(this.actors).concat(this.crowd); },
  tick(fn) { this.ticks.push(fn); },
  // ---- smoke, steam, dust and sparks ----
  emitter(x, y, z, o = {}) {
    const n = o.n || 24, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: o.color || 0xcccccc, size: o.size || 1.2, transparent: true, opacity: o.opacity || 0.45, depthWrite: false, map: softDot(), blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; this.root.add(pts);
    const e = { x, y, z, n, pos, geo, pts, life: o.life || 4, rise: o.rise || 0.8, spread: o.spread || 0.3, drift: o.drift || [0.2, 0], age: [], on: o.on !== false };
    for (let i = 0; i < n; i++) e.age.push(Math.random() * e.life);
    this.emitters.push(e); return e;
  },
  update(dt, t) {
    for (const a of this.actorList()) a.update(dt, t);
    for (const f of this.ticks) f(dt, t);
    for (const e of this.emitters) {
      for (let i = 0; i < e.n; i++) {
        e.age[i] += dt;
        if (e.age[i] > e.life) { e.age[i] = e.on ? 0 : e.life + 1; }
        const a = e.age[i], k = a / e.life, sd = i * 12.9898;
        const vis = a <= e.life;
        e.pos[i * 3] = e.x + Math.sin(sd) * e.spread * (0.3 + k) + e.drift[0] * a;
        e.pos[i * 3 + 1] = vis ? e.y + e.rise * a : -999;
        e.pos[i * 3 + 2] = e.z + Math.cos(sd * 1.7) * e.spread * (0.3 + k) + e.drift[1] * a;
      }
      e.geo.attributes.position.needsUpdate = true;
    }
  },
};
let _softDot = null;
function softDot() {
  if (_softDot) return _softDot;
  _softDot = canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  return _softDot;
}

// ---------- actors ----------
class Actor {
  constructor(id, def, x, z, yaw) {
    this.id = id; this.def = def;
    this.name = def.name || null; this.title = def.title || '';
    this.P = makePerson(def.look || {});
    this.g = this.P.g;
    this.x = x; this.z = z; this.y = Stage.height(x, z); this.yaw = yaw; this.wantYaw = yaw;
    this.anim = def.anim || 'idle'; this.t = Math.random() * 10;
    this.target = null; this.speed = def.speed || 1.4; this.resolve = null;
    this.talking = false; this.solid = true; this.lookAtPlayer = def.lookAtPlayer !== false; this.seated = !!def.seated;
    this.fixedY = def.y != null ? def.y : null;
    this.talkable = def.talkable != null ? def.talkable : !!(id && def.name);
    this.held = null; this.k = 0;
    this.place();
  }
  place() { this.g.position.set(this.x, this.fixedY != null ? this.fixedY : this.y, this.z); this.g.rotation.y = this.yaw; }
  set(anim) { this.anim = anim; return this; }
  // walk in a straight line; resolves on arrival
  walkTo(x, z, o = {}) {
    if (this.resolve) this.resolve();
    this.target = { x, z, anim: o.anim || 'walk', after: o.then || o.after || null, speed: o.speed || this.speed, face: o.face };
    return new Promise((res) => { this.resolve = res; });
  }
  async path(pts, o = {}) { for (const p of pts) await this.walkTo(p[0], p[1], o); }
  face(x, z) { this.wantYaw = Math.atan2(x - this.x, z - this.z); return this; }
  faceNow(x, z) { this.wantYaw = this.yaw = Math.atan2(x - this.x, z - this.z); this.place(); return this; }
  tp(x, z, yaw) { this.x = x; this.z = z; this.y = Stage.height(x, z); if (yaw != null) this.yaw = this.wantYaw = yaw; this.target = null; if (this.resolve) { const r = this.resolve; this.resolve = null; r(); } this.place(); return this; }
  hold(obj) { if (this.held) this.P.parts.handR.remove(this.held); this.held = obj; if (obj) { obj.position.set(0, 0, 0); this.P.parts.handR.add(obj); } return this; }
  show(v) { this.g.visible = v; return this; }
  update(dt) {
    this.t += dt;
    let moving = false;
    if (this.target) {
      const tg = this.target, dx = tg.x - this.x, dz = tg.z - this.z, d = Math.hypot(dx, dz);
      const st = tg.speed * dt;
      if (d <= st) {
        this.x = tg.x; this.z = tg.z; this.target = null;
        if (tg.after) this.anim = tg.after;
        if (tg.face) this.face(tg.face[0], tg.face[1]);
        const r = this.resolve; this.resolve = null; if (r) r();
      } else {
        this.x += dx / d * st; this.z += dz / d * st; this.wantYaw = Math.atan2(dx, dz); moving = true;
      }
      this.y = Stage.height(this.x, this.z);
    }
    if (this.talking && this.lookAtPlayer && !this.seated && !moving) this.face(PL.x, PL.z);
    const dy = angWrap(this.wantYaw - this.yaw); this.yaw += dy * Math.min(1, dt * 6);
    const anim = moving ? (this.target.anim) : (this.talking && !this.seated && ['idle', 'stand', 'hands', 'point'].includes(this.anim) ? 'talk' : this.anim);
    // only pose people who are close enough to see the detail
    const far = dist2(this.x, this.z, PL.x, PL.z) > 90 * 90;
    if (!far || G.frame % 6 === 0) posePerson(this.P, anim, this.t, moving || anim === 'walk' || anim === 'haul' || anim === 'push' ? 1 : 0);
    if (this.talking && this.seated) { this.P.parts.head.rotation.x = Math.sin(this.t * 4) * 0.07; this.P.parts.head.rotation.y = clamp(angWrap(Math.atan2(PL.x - this.x, PL.z - this.z) - this.yaw), -0.9, 0.9); }
    this.place();
  }
  get headY() { return (this.fixedY != null ? this.fixedY : this.y) + (this.seated || this.anim === 'sit' || this.anim === 'type' || this.anim === 'write' ? this.P.h * 0.72 : this.P.h * 0.93); }
}
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
