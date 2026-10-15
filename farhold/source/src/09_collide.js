// Farhold — oriented-box colliders inside frames (planet or station local space), sphere pushes and raycasts

const COLL = {
  list: [],
  add(f, c, q, h, o = {}) {
    const b = { f, c: c.clone(), q: q.clone(), qi: q.clone().invert(), h: h.clone(), r: h.length(), tag: o.tag || '', shelter: !!o.shelter, roof: !!o.roof, owner: o.owner || null, walk: o.walk !== false, data: o.data || null };
    this.list.push(b);
    return b;
  },
  remove(b) { const i = this.list.indexOf(b); if (i >= 0) this.list.splice(i, 1); },
  removeOwner(owner) { this.list = this.list.filter((b) => b.owner !== owner); },
  removeFrame(f) { this.list = this.list.filter((b) => b.f !== f); },
  clear() { this.list = []; },
  // Push a sphere out of every box. Returns the most upward contact normal (for grounding) or null.
  collideSphere(f, p, rad, up) {
    let ground = null, gdot = -2;
    for (let pass = 0; pass < 2; pass++) {
      for (const b of this.list) {
        if (b.f !== f) continue;
        const dx = p.x - b.c.x, dy = p.y - b.c.y, dz = p.z - b.c.z;
        if (dx * dx + dy * dy + dz * dz > (b.r + rad) ** 2) continue;
        // into box space
        const l = _v1.set(dx, dy, dz).applyQuaternion(b.qi);
        const cx = clamp(l.x, -b.h.x, b.h.x), cy = clamp(l.y, -b.h.y, b.h.y), cz = clamp(l.z, -b.h.z, b.h.z);
        let nx = l.x - cx, ny = l.y - cy, nz = l.z - cz;
        let d = Math.hypot(nx, ny, nz);
        if (d >= rad) continue;
        if (d < 1e-5) {
          // centre inside: push out along the shallowest axis
          const ox = b.h.x - Math.abs(l.x), oy = b.h.y - Math.abs(l.y), oz = b.h.z - Math.abs(l.z);
          if (oy <= ox && oy <= oz) { nx = 0; ny = Math.sign(l.y) || 1; nz = 0; d = -oy; }
          else if (ox <= oz) { nx = Math.sign(l.x) || 1; ny = 0; nz = 0; d = -ox; }
          else { nx = 0; ny = 0; nz = Math.sign(l.z) || 1; d = -oz; }
        } else { nx /= d; ny /= d; nz /= d; }
        const push = rad - d;
        _v2.set(nx, ny, nz).applyQuaternion(b.q);
        p.addScaledVector(_v2, push);
        if (up) { const gd = _v2.dot(up); if (gd > gdot) { gdot = gd; ground = ground || new V3(); ground.copy(_v2); ground.box = b; } }
      }
    }
    return gdot > 0.55 ? ground : null;
  },
  // Ray (local to f) vs boxes: nearest t or Infinity
  raycast(f, o, d, maxT, filter) {
    let best = maxT;
    let hitB = null;
    for (const b of this.list) {
      if (b.f !== f || (filter && !filter(b))) continue;
      _v1.copy(o).sub(b.c);
      const tc = _v1.dot(d);
      if (tc + b.r < 0 || _v1.lengthSq() - tc * tc > b.r * b.r) continue;
      const lo = _v2.copy(_v1).applyQuaternion(b.qi), ld = _v3.copy(d).applyQuaternion(b.qi);
      let t0 = -Infinity, t1 = Infinity;
      const ax = ['x', 'y', 'z'];
      let ok = true;
      for (const a of ax) {
        if (Math.abs(ld[a]) < 1e-9) { if (Math.abs(lo[a]) > b.h[a]) { ok = false; break; } continue; }
        let ta = (-b.h[a] - lo[a]) / ld[a], tb = (b.h[a] - lo[a]) / ld[a];
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
        if (t0 > t1) { ok = false; break; }
      }
      if (!ok || t1 < 0) continue;
      const t = t0 > 0 ? t0 : 0;
      if (t < best) { best = t; hitB = b; }
    }
    this.lastHit = hitB;
    return best;
  },
  // under a roof? cast up from p (local to f)
  sheltered(f, p, up) {
    if (!f) return false;
    const t = this.raycast(f, p, up, 12, (b) => b.roof);
    if (t >= 12) return false;
    // and something on at least two sides
    let walls = 0;
    const t1 = perpOf(up, _v5), t2 = _v6.crossVectors(up, t1);
    for (const dv of [t1, t2, t1.clone().negate(), t2.clone().negate()]) if (this.raycast(f, p, dv, 10, (b) => !b.roof || b.shelter) < 10) walls++;
    return walls >= 2;
  },
  inside(f, p, tag) {
    for (const b of this.list) {
      if (b.f !== f || (tag && b.tag !== tag)) continue;
      const l = _v1.copy(p).sub(b.c).applyQuaternion(b.qi);
      if (Math.abs(l.x) <= b.h.x && Math.abs(l.y) <= b.h.y && Math.abs(l.z) <= b.h.z) return b;
    }
    return null;
  },
};
// Helper: add colliders for a list of boxes defined in an object's local space.
// boxes: [[cx,cy,cz, hx,hy,hz, opts?]]; place: { f, pos (V3 local to f), q }
function addBoxColliders(boxes, place, owner) {
  const out = [];
  for (const b of boxes) {
    const c = _v4.set(b[0], b[1], b[2]).applyQuaternion(place.q).add(place.pos);
    const q = b[6] && b[6].rot ? place.q.clone().multiply(new Q4().setFromEuler(new THREE.Euler(...b[6].rot))) : place.q;
    out.push(COLL.add(place.f, c, q, new V3(b[3], b[4], b[5]), Object.assign({ owner }, b[6] || {})));
  }
  return out;
}
