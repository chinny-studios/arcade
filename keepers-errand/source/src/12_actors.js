// ---- actors: islanders, clockwork bailiffs, crabs, gulls, breakables, pickups, push crates, pebble targets ----
const Actors = {};
(function () {
  // ---------- line of sight ----------
  function sightClear(ax, ay, az, bx, by, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
    for (let i = 1; i < n; i++) {
      const t = i / n, x = lerp(ax, bx, t), y = lerp(ay, by, t), z = lerp(az, bz, t);
      for (const c of W.cols) {
        if (c.off || c.t === 'ring' || c.seeThrough) continue;
        if (y > c.y1 || y < c.y0) continue;
        if (colTop(c, x, z, 0) > -Infinity) return false;
      }
      if (W.area.ground && W.area.ground(x, z) > y) return false;
    }
    return true;
  }
  Actors.sightClear = sightClear;

  // ---------- islanders ----------
  Actors.npc = function (def) {
    const P = makeChar(def.look);
    const e = {
      kind: 'npc', id: def.id, name: def.name, P, obj: P.root, x: def.x, z: def.z, y: 0, ry: def.ry || 0, home: [def.x, def.z], r: 0.45,
      anim: { t: Math.random() * 10, phase: 0, move: 0, pose: def.pose || 'idle' }, talking: false, path: def.path, pi: 0, waitT: 0, voice: def.voice || 1,
      interact: { label: 'Talk to ' + def.name, r: 2.0, fn: () => Story.talk(e), npc: true },
      speed: def.speed || 1.3,
      update(dt) {
        const a = this.anim; a.t += dt;
        const near = Math.hypot(Hero.x - this.x, Hero.z - this.z);
        let mv = 0;
        if (this.talking || (near < 3 && !this.path)) {
          const want = Math.atan2(Hero.x - this.x, Hero.z - this.z);
          if (!this.fixedFacing || this.talking) this.ry += angDiff(this.ry, want) * Math.min(1, dt * 6);
        } else if (this.path && near > 2.2) {
          if (this.waitT > 0) this.waitT -= dt;
          else {
            const [tx, tz] = this.path[this.pi];
            const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
            if (d < 0.3) { this.pi = (this.pi + 1) % this.path.length; this.waitT = rnd(1, 4); }
            else { const sp = this.speed; this.x += dx / d * sp * dt; this.z += dz / d * sp * dt; this.ry += angDiff(this.ry, Math.atan2(dx, dz)) * Math.min(1, dt * 6); mv = 1; }
          }
        } else if (this.path) { const want = Math.atan2(Hero.x - this.x, Hero.z - this.z); this.ry += angDiff(this.ry, want) * Math.min(1, dt * 5); }
        a.move = approach(a.move, mv * 0.6, dt * 4); a.phase += dt * mv * this.speed * 2.2;
        a.pose = this.talking ? 'talk' : this.flinch > 0 ? 'hurt' : mv ? 'walk' : (this.pose || 'idle');
        this.flinch = Math.max(0, (this.flinch || 0) - dt);
        this.y = groundAt(this.x, this.z, this.y + 1, 0.3);
        animChar(P, a);
        this.obj.position.set(this.x, this.y, this.z); this.obj.rotation.y = this.ry;
      },
      onHit() { this.flinch = 0.5; Story.bonk(this); },
    };
    if (def.pose) e.pose = def.pose;
    if (def.fixedFacing) e.fixedFacing = true;
    if (def.setup) def.setup(e);
    e.y = groundAt(e.x, e.z, 50, 0.3);
    return addEnt(e);
  };

  // ---------- clockwork bailiffs ----------
  const TICK = {
    ticker: { hp: 4, speed: 3.1, range: 11, fov: 1.15, dmg: 2, reach: 1.5, scale: 1, clams: [2, 4] },
    heavy: { hp: 10, speed: 2.2, range: 9, fov: 1.0, dmg: 3, reach: 1.9, scale: 1.45, clams: [6, 9] },
    guard: { hp: 99, speed: 1.6, range: 7, fov: 0.95, dmg: 0, reach: 0, scale: 1, clams: [0, 0] },
  };
  Actors.ticker = function (def) {
    const T = Object.assign({}, TICK[def.kind || 'ticker'], def.stats || {});
    const P = makeChar({ kind: def.kind === 'heavy' ? 'heavy' : 'ticker', scale: T.scale });
    const e = {
      kind: 'foe', sub: def.kind || 'ticker', id: def.id, P, obj: P.root, x: def.x, z: def.z, y: 0, vy: 0, ry: def.ry || 0, r: 0.45 * T.scale, h: 1.5 * T.scale,
      hp: T.hp, T, state: def.sleep ? 'sleep' : 'patrol', st: 0, path: def.path, pi: 0, waitT: 0, home: [def.x, def.z, def.ry || 0],
      anim: { t: Math.random() * 5, phase: 0, move: 0, pose: 'idle' }, flash: 0, seeT: 0, lostT: 0, icon: null, kx: 0, kz: 0,
      guard: !!def.onCaught, onCaught: def.onCaught, onDie: def.onDie, aimY: null, onGround: true,
      update(dt) {
        const a = this.anim; a.t += dt; this.st += dt; this.flash = Math.max(0, this.flash - dt);
        const dx = Hero.x - this.x, dz = Hero.z - this.z, dist = Math.hypot(dx, dz);
        const toHero = Math.atan2(dx, dz);
        let mv = 0, sp = 0, want = null;
        if (G.peace) { this.state = this.state === 'sleep' ? 'sleep' : 'patrol'; }
        switch (this.state) {
          case 'sleep':
            a.pose = 'sleep';
            if (Math.random() < dt * 0.5) FX.zzz(this.x, this.y + 2.2 * T.scale, this.z);
            if (!G.peace && Hero.state !== 'dead' && ((Hero.noise >= 1 && dist < 5.5) || (Hero.noise >= 1.5 && dist < 9))) this.wake();
            break;
          case 'patrol': {
            if (this.path && this.path.length) {
              if (this.waitT > 0) { this.waitT -= dt; if (this.path.length === 1 || this.lookAround) want = this.home[2] + Math.sin(a.t * 0.8) * 1.0; }
              else {
                const [tx, tz] = this.path[this.pi]; const ddx = tx - this.x, ddz = tz - this.z, d = Math.hypot(ddx, ddz);
                if (d < 0.35) { this.pi = (this.pi + 1) % this.path.length; this.waitT = def.wait != null ? def.wait : 1.2; this.home[2] = this.ry; }
                else { want = Math.atan2(ddx, ddz); sp = T.speed * 0.45; mv = 0.5; }
              }
            } else { want = this.home[2] + Math.sin(a.t * 0.6) * 0.9; }
            if (this.canSee(dist, toHero)) this.alert();
            break;
          }
          case 'alert':
            want = toHero;
            if (this.st > 0.6) { if (this.guard) { this.state = 'caught'; this.onCaught && this.onCaught(this); } else this.state = 'chase'; this.st = 0; }
            break;
          case 'chase':
            want = toHero; sp = T.speed; mv = 1;
            if (dist < T.reach * 0.9) { this.state = 'windup'; this.st = 0; }
            if (dist > 18 || Hero.state === 'dead') { this.lostT += dt; if (this.lostT > 2.5) { this.state = 'return'; FX.icon(this, '?'); } } else this.lostT = 0;
            break;
          case 'windup':
            want = toHero; a.pose = 'fight';
            if (this.st > (this.sub === 'heavy' ? 0.65 : 0.45)) { this.state = 'swing'; this.st = 0; Audio2.sfx('swing'); }
            break;
          case 'swing':
            if (this.st > 0.12 && !this.hitDone) {
              this.hitDone = true;
              const fx = Math.sin(this.ry), fz = Math.cos(this.ry);
              if (dist < T.reach + 0.3 && (dx * fx + dz * fz) / (dist || 1) > 0.3 && Math.abs(Hero.y - this.y) < 1.5) { Hero.hurt(T.dmg, this.x, this.z); Audio2.sfx('stamp'); }
              if (this.sub === 'heavy') { CAM.shake = Math.max(CAM.shake, 0.15); FX.ring(this.x + fx * 1.5, this.y + 0.1, this.z + fz * 1.5, 0xffffff); }
            }
            if (this.st > 0.55) { this.state = 'chase'; this.st = 0; this.hitDone = false; }
            break;
          case 'stun':
            if (this.st > (this.stunLen || 0.35)) { this.state = 'chase'; this.st = 0; }
            break;
          case 'return': {
            const [hx, hz] = this.path ? this.path[this.pi] : this.home; const ddx = hx - this.x, ddz = hz - this.z, d = Math.hypot(ddx, ddz);
            if (d < 0.5) { this.state = 'patrol'; this.lostT = 0; } else { want = Math.atan2(ddx, ddz); sp = T.speed * 0.6; mv = 0.6; }
            if (this.canSee(dist, toHero)) this.alert();
            break;
          }
          case 'dead': return;
          case 'caught': want = toHero; break;
        }
        if (want != null) this.ry += angDiff(this.ry, want) * Math.min(1, dt * (this.state === 'chase' ? 7 : 3));
        // move
        let vx = Math.sin(this.ry) * sp, vz = Math.cos(this.ry) * sp;
        if (this.state === 'stun') { vx = this.kx; vz = this.kz; this.kx *= 0.88; this.kz *= 0.88; }
        const ox = this.x, oz = this.z;
        moveBody(this, vx * dt, vz * dt);
        // don't wander into the sea or off ledges
        if (W.area.ground && W.area.ground(this.x, this.z) < -0.4) { this.x = ox; this.z = oz; }
        const g = groundAt(this.x, this.z, this.y + 0.3, this.r);
        if (g < this.y - 1.2 && this.state !== 'stun') { this.x = ox; this.z = oz; } else this.y = approach(this.y, g, dt * 8);
        if (this.y < W.area.killY) this.die(true);
        a.move = mv; a.phase += dt * sp * 2.6;
        if (this.state !== 'sleep' && this.state !== 'windup') a.pose = this.state === 'stun' ? 'hurt' : mv ? 'walk' : 'idle';
        if (this.state === 'swing') { a.punch = Math.min(1, this.st / 0.3); a.punchSide = false; } else a.punch = 0;
        animChar(P, a);
        P.eye.material = MAT.glow(this.state === 'chase' || this.state === 'windup' || this.state === 'swing' || this.state === 'alert' || this.state === 'caught' ? 0xff4a3a : this.state === 'sleep' ? 0x335566 : 0x9fe8ff);
        this.obj.position.set(this.x, this.y, this.z); this.obj.rotation.y = this.ry;
        this.obj.scale.setScalar(this.flash > 0 ? 1.08 : 1);
        if (this.cone) { this.cone.position.set(this.x, this.y + 0.06, this.z); this.cone.rotation.y = this.ry; this.cone.material.color.setHex(this.state === 'alert' || this.state === 'caught' ? 0xff5040 : 0xfff2a0); }
      },
      canSee(dist, toHero) {
        if (G.peace || Hero.state === 'dead' || G.lockInput || G.t - (W.enterT || 0) < 1.5) return false;
        const sneaky = Hero.mode === 'sneaky';
        const moving = Math.hypot(Hero.vx, Hero.vz) > 0.4;
        let range = T.range * (sneaky ? (moving ? 0.45 : 0.3) : 1);
        let fov = sneaky ? T.fov * 0.75 : T.fov;
        if (Hero.noise >= 1 && dist < (Hero.noise >= 2 ? 7 : 3) && !this.guard) return true;   // heard you
        if (this.guard && Hero.noise >= 2 && dist < 5) return true;
        if (dist > range || Math.abs(Hero.y - this.y) > 3) return false;
        if (Math.abs(angDiff(this.ry, toHero)) > fov) return false;
        this.seeT -= 1;
        return sightClear(this.x, this.y + 1.1, this.z, Hero.x, Hero.y + 1.0, Hero.z);
      },
      alert() { this.state = 'alert'; this.st = 0; FX.icon(this, '!'); Audio2.sfx('alert'); },
      wake() { this.state = 'alert'; this.st = 0; FX.icon(this, '!'); Audio2.sfx('alert'); if (this.onWake) this.onWake(this); },
      hit(dmg, sx, sz, how) {
        if (this.state === 'dead' || this.guard) { if (this.guard) { Audio2.sfx('clang'); if (this.state === 'patrol') this.alert(); } return false; }
        this.hp -= dmg; this.flash = 0.15;
        FX.burst(this.x, this.y + 1, this.z, 0xffd36a, 6, 4);
        Audio2.sfx('clang');
        if (this.hp <= 0) { this.die(); return true; }
        const d = Math.hypot(this.x - sx, this.z - sz) || 1;
        const kb = this.sub === 'heavy' ? (how === 'kick' ? 4 : 1.5) : 6;
        this.kx = (this.x - sx) / d * kb; this.kz = (this.z - sz) / d * kb;
        if (this.sub !== 'heavy' || how === 'kick' || this.state === 'sleep' || this.state === 'patrol') { this.state = 'stun'; this.st = 0; this.stunLen = this.sub === 'heavy' ? 0.5 : 0.4; }
        else if (this.state === 'patrol') this.alert();
        return true;
      },
      die(silent) {
        this.state = 'dead'; this.dead = true;
        if (!silent) {
          Audio2.sfx('gears'); FX.gears(this.x, this.y + 0.8, this.z, this.sub === 'heavy' ? 14 : 9);
          const [a0, a1] = T.clams; const n = Math.round(rnd(a0, a1));
          Actors.dropClams(this.x, this.y, this.z, n);
          if (Math.random() < (this.sub === 'heavy' ? 0.8 : 0.3)) Actors.pickup({ type: 'heart', x: this.x + rnd(-0.5, 0.5), z: this.z + rnd(-0.5, 0.5), y: this.y + 0.5, pop: true });
        }
        if (this.id) G.save.dead[this.id] = true;
        if (this.cone && this.cone.parent) this.cone.parent.remove(this.cone);
        if (this.onDie) this.onDie(this);
      },
      destroy() { if (this.cone && this.cone.parent) this.cone.parent.remove(this.cone); },
    };
    e.y = groundAt(e.x, e.z, 50, e.r);
    if (def.lookAround) e.lookAround = true;
    if (def.cone) {
      const r = T.range, segs = 12, pts = [0, 0, 0];
      const geo = new THREE.BufferGeometry(); const v = [];
      for (let i = 0; i < segs; i++) {
        const a0 = -T.fov + (2 * T.fov) * i / segs, a1 = -T.fov + (2 * T.fov) * (i + 1) / segs;
        v.push(0, 0, 0, Math.sin(a1) * r, 0, Math.cos(a1) * r, Math.sin(a0) * r, 0, Math.cos(a0) * r);
      }
      void pts;
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      e.cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      W.area.group.add(e.cone);
    }
    return addEnt(e);
  };

  // ---------- crabs ----------
  Actors.crab = function (def) {
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    body.add(mesh(GEO.sph, 0xd8553a, 0, 0.22, 0, 0.7, 0.32, 0.55));
    for (const s of [-1, 1]) {
      body.add(mesh(GEO.sph, 0xe8664a, s * 0.42, 0.3, 0.25, 0.26, 0.2, 0.22));
      body.add(mesh(GEO.sph, 0x111111, s * 0.12, 0.42, 0.22, 0.08, 0.12, 0.08));
      for (let i = 0; i < 3; i++) body.add(mesh(GEO.box, 0xb8442e, s * 0.35, 0.1, -0.15 + i * 0.15, 0.35, 0.05, 0.05));
    }
    const sh = new THREE.Mesh(SHADOW.geo, SHADOW.mat); sh.rotation.x = -Math.PI / 2; sh.scale.setScalar(0.8); root.add(sh);
    const e = {
      kind: 'foe', sub: 'crab', obj: root, x: def.x, z: def.z, y: 0, ry: 0, r: 0.35, h: 0.5, hp: 2, home: [def.x, def.z], st: 0, state: 'idle', t: Math.random() * 9, cd: 0, kx: 0, kz: 0,
      update(dt) {
        this.t += dt; this.st += dt; this.cd -= dt;
        const dx = Hero.x - this.x, dz = Hero.z - this.z, d = Math.hypot(dx, dz);
        let vx = 0, vz = 0;
        if (this.state === 'stun') { vx = this.kx; vz = this.kz; this.kx *= 0.9; this.kz *= 0.9; if (this.st > 0.5) this.state = 'idle'; }
        else if (!G.peace && d < 6 && Hero.state !== 'dead' && Math.hypot(this.x - this.home[0], this.z - this.home[1]) < 9) {
          vx = dx / d * 2.6; vz = dz / d * 2.6;
          if (d < 0.9 && this.cd <= 0) { Hero.hurt(1, this.x, this.z); this.cd = 1.2; }
        } else {
          const hx = this.home[0] + Math.sin(this.t * 0.4) * 2.5 - this.x, hz = this.home[1] + Math.cos(this.t * 0.3) * 1.5 - this.z;
          vx = clamp(hx, -1, 1); vz = clamp(hz, -1, 1);
        }
        const ox = this.x, oz = this.z;
        moveBody(this, vx * dt, vz * dt);
        if (W.area.ground(this.x, this.z) < -0.6) { this.x = ox; this.z = oz; }
        this.y = groundAt(this.x, this.z, this.y + 0.5, 0.2);
        // crabs walk sideways
        if (Math.hypot(vx, vz) > 0.1) this.ry += angDiff(this.ry, Math.atan2(vx, vz) + Math.PI / 2) * Math.min(1, dt * 5);
        body.position.y = Math.abs(Math.sin(this.t * 14)) * 0.05 * Math.min(1, Math.hypot(vx, vz));
        root.position.set(this.x, this.y, this.z); root.rotation.y = this.ry;
      },
      hit(dmg, sx, sz) {
        this.hp -= dmg; Audio2.sfx('punch'); FX.burst(this.x, this.y + 0.4, this.z, 0xff8866, 5, 3);
        if (this.hp <= 0) { this.dead = true; FX.burst(this.x, this.y + 0.4, this.z, 0xd8553a, 10, 4); Actors.dropClams(this.x, this.y, this.z, 1); return true; }
        const d = Math.hypot(this.x - sx, this.z - sz) || 1; this.kx = (this.x - sx) / d * 6; this.kz = (this.z - sz) / d * 6; this.state = 'stun'; this.st = 0;
        return true;
      },
    };
    e.y = groundAt(e.x, e.z, 50, 0.2);
    return addEnt(e);
  };

  // ---------- gulls (scenery that circles) ----------
  Actors.gull = function (def) {
    const root = new THREE.Group();
    root.add(mesh(GEO.sph, 0xf4f4f0, 0, 0, 0, 0.3, 0.26, 0.6));
    root.add(mesh(GEO.cone, 0xe8a83a, 0, 0, 0.38, 0.1, 0.2, 0.1)); root.children[1].rotation.x = Math.PI / 2;
    const wl = new THREE.Group(), wr = new THREE.Group(); root.add(wl); root.add(wr);
    wl.add(mesh(GEO.box, 0xdedad0, -0.5, 0, 0, 1.0, 0.04, 0.35)); wr.add(mesh(GEO.box, 0xdedad0, 0.5, 0, 0, 1.0, 0.04, 0.35));
    const e = {
      kind: 'deco', obj: root, x: def.x, y: def.y, z: def.z, t: Math.random() * 20, cx: def.x, cz: def.z, rad: def.rad || 8, sp: def.sp || 0.35,
      update(dt) {
        this.t += dt;
        const a = this.t * this.sp;
        this.x = this.cx + Math.cos(a) * this.rad; this.z = this.cz + Math.sin(a) * this.rad;
        root.position.set(this.x, this.y + Math.sin(this.t * 0.7) * 0.6, this.z);
        root.rotation.y = -a + (this.sp > 0 ? 0 : Math.PI);
        const f = Math.sin(this.t * 7) * 0.5; wl.rotation.z = f; wr.rotation.z = -f;
      },
    };
    return addEnt(e);
  };

  // ---------- breakables ----------
  Actors.breakable = function (def) {
    const g = new THREE.Group(), b = new Batch();
    if (def.type === 'barrel') PROPS.barrel(b, 0, 0, 0); else PROPS.crate(b, 0, 0, 0, def.s || 0.9);
    g.add(b.build());
    const y = def.y != null ? def.y : groundAt(def.x, def.z, 50, 0.3);
    g.position.set(def.x, y, def.z);
    const s = def.type === 'barrel' ? 0.42 : (def.s || 0.9) / 2;
    const e = {
      kind: 'break', id: def.id, obj: g, x: def.x, y, z: def.z, r: s,
      col: def.type === 'barrel' ? { t: 'cyl', x: def.x, z: def.z, r: 0.42, y0: y, y1: y + 1 } : { t: 'box', x: def.x, z: def.z, hx: s, hz: s, y0: y, y1: y + 2 * s },
      hit() {
        this.dead = true; this.col.off = true;
        Audio2.sfx('punch'); FX.burst(this.x, this.y + 0.5, this.z, 0xb08350, 12, 5);
        if (this.id) G.save.dead[this.id] = true;
        const roll = Math.random();
        if (def.drop) def.drop(this);
        else if (roll < 0.25) Actors.pickup({ type: 'heart', x: this.x, z: this.z, y: this.y + 0.4, pop: true });
        else Actors.dropClams(this.x, this.y, this.z, roll < 0.85 ? 1 + (Math.random() * 3 | 0) : 5);
        return true;
      },
    };
    return addEnt(e);
  };

  // ---------- pickups ----------
  const PICK = {
    clam: { color: 0xf6e6d8, glow: 0xfff0e0, size: 0.32 },
    gold: { color: 0xf2c94a, glow: 0xffe8a0, size: 0.4 },
    heart: { color: 0xe8445a, glow: 0xff9aa8, size: 0.36 },
    glass: { color: 0x9fe8ff, glow: 0xdff8ff, size: 0.5 },
    item: { color: 0xd6b25a, glow: 0xfff0b0, size: 0.5 },
  };
  Actors.pickup = function (def) {
    const k = PICK[def.type] || PICK.item;
    const g = new THREE.Group();
    let m;
    if (def.type === 'clam' || def.type === 'gold') { m = mesh(GEO.sph, k.color, 0, 0, 0, k.size, k.size * 0.4, k.size * 0.9); g.add(m); for (let i = -2; i <= 2; i++) g.add(mesh(GEO.box, 0xd8b8a0, i * 0.05, 0.06, 0, 0.02, 0.04, k.size * 0.8)); }
    else if (def.type === 'heart') { m = mesh(GEO.sph, k.color, -0.09, 0, 0, 0.24, 0.24, 0.16); g.add(m); g.add(mesh(GEO.sph, k.color, 0.09, 0, 0, 0.24, 0.24, 0.16)); const c = mesh(GEO.cone, k.color, 0, -0.14, 0, 0.36, 0.26, 0.16); c.rotation.x = Math.PI; g.add(c); }
    else if (def.type === 'glass') { m = mesh(GEO.ico, MAT.glow(0xbff4ff), 0, 0, 0, 0.35, 0.6, 0.35); g.add(m); g.add(mesh(GEO.ico, new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0, 0, 0.7, 1.0, 0.7)); }
    else { m = def.model ? def.model() : mesh(GEO.box, k.color, 0, 0, 0, 0.4, 0.4, 0.4); g.add(m); }
    const y0 = def.y != null ? def.y : groundAt(def.x, def.z, 50, 0.2);
    const e = {
      kind: 'pickup', type: def.type, id: def.id, obj: g, x: def.x, z: def.z, y: y0, vy: def.pop ? 5 : 0, vx: def.pop ? rnd(-1.5, 1.5) : 0, vz: def.pop ? rnd(-1.5, 1.5) : 0,
      t: Math.random() * 6, life: def.life || (def.pop ? 14 : 1e9), float: def.float != null ? def.float : 0.5,
      update(dt) {
        this.t += dt; this.life -= dt;
        if (this.vy || this.vx) {
          this.vy -= 18 * dt; this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
          const g = groundAt(this.x, this.z, this.y + 0.2, 0.1);
          if (this.y <= g) { this.y = g; this.vy = this.vy < -2 ? -this.vy * 0.4 : 0; this.vx *= 0.6; this.vz *= 0.6; if (!this.vy) this.vx = this.vz = 0; }
        }
        const d = Math.hypot(Hero.x - this.x, Hero.z - this.z), dy = Hero.y + 0.8 - (this.y + this.float);
        if (this.type !== 'item' && this.type !== 'glass' && d < 2.5 && this.t > 0.4) { this.x += (Hero.x - this.x) * dt * 6; this.z += (Hero.z - this.z) * dt * 6; }
        if (d < 0.8 && Math.abs(dy) < 1.4 && this.t > 0.3 && Hero.state !== 'dead') this.collect();
        if (this.life < 3) g.visible = Math.floor(this.t * 8) % 2 === 0;
        if (this.life <= 0) this.dead = true;
        g.position.set(this.x, this.y + this.float + Math.sin(this.t * 3) * 0.08, this.z); g.rotation.y = this.t * 2.5;
      },
      collect() {
        this.dead = true;
        if (this.id) G.save.dead[this.id] = true;
        if (this.type === 'clam') { G.save.clams += 1; Audio2.sfx('coin'); HUD.clams(); }
        else if (this.type === 'gold') { G.save.clams += 5; Audio2.sfx('coin'); HUD.clams(); }
        else if (this.type === 'heart') { Hero.heal(2); Audio2.sfx('heart'); }
        FX.burst(this.x, this.y + 0.5, this.z, k.glow, 6, 2);
        if (def.onCollect) def.onCollect(this);
      },
    };
    return addEnt(e);
  };
  Actors.dropClams = function (x, y, z, n) {
    while (n >= 5) { Actors.pickup({ type: 'gold', x: x + rnd(-0.4, 0.4), z: z + rnd(-0.4, 0.4), y: y + 0.6, pop: true }); n -= 5; }
    for (let i = 0; i < n; i++) Actors.pickup({ type: 'clam', x: x + rnd(-0.4, 0.4), z: z + rnd(-0.4, 0.4), y: y + 0.6, pop: true });
  };

  // ---------- a crate you can push in Normal mode ----------
  Actors.pushCrate = function (def) {
    const g = new THREE.Group(), b = new Batch(); PROPS.crate(b, 0, 0, 0, 1.0); g.add(b.build());
    g.add(mesh(GEO.box, 0x6a4a2a, 0, 0.5, 0.51, 0.6, 0.12, 0.02)); g.add(mesh(GEO.box, 0x6a4a2a, 0, 0.5, -0.51, 0.6, 0.12, 0.02));
    const y = groundAt(def.x, def.z, 50, 0.3);
    const col = { t: 'box', x: def.x, z: def.z, hx: 0.5, hz: 0.5, y0: y, y1: y + 1.0 };
    const e = {
      kind: 'push', obj: g, x: def.x, y, z: def.z, col, creakT: 0,
      update(dt) { this.creakT -= dt; g.position.set(this.x, this.y, this.z); },
    };
    col.push = (hero, ix, iz, dt) => {
      // push along the dominant axis away from the hero
      const dx = e.x - hero.x, dz = e.z - hero.z;
      let ax = 0, az = 0;
      if (Math.abs(dx) > Math.abs(dz)) ax = Math.sign(dx); else az = Math.sign(dz);
      if (ax * ix + az * iz < 0.3) return;
      const step = 1.7 * dt, nx = e.x + ax * step, nz = e.z + az * step;
      // blocked by other solids?
      const probe = { t: 'box', x: nx, z: nz, hx: 0.49, hz: 0.49 };
      for (const c of W.cols) {
        if (c === col || c.off || c.t === 'ring') { if (c.t === 'ring' && Math.hypot(nx - c.x, nz - c.z) > c.r - 0.7) return; continue; }
        if (c.y1 <= e.y + 0.2 || c.y0 >= e.y + 1) continue;
        if (c.t === 'box' && !c.ry && Math.abs(nx - c.x) < c.hx + 0.49 && Math.abs(nz - c.z) < c.hz + 0.49) return;
        if (c.t === 'box' && c.ry && colTop(c, nx, nz, 0.9) > -Infinity) return;
        if (c.t === 'cyl' && Math.hypot(nx - c.x, nz - c.z) < c.r + 0.55) return;
      }
      void probe;
      const g1 = W.area.ground ? W.area.ground(nx, nz) : e.y;
      if (Math.abs(g1 - e.y) > 0.35 || g1 < -0.2) return;
      e.x = nx; e.z = nz; e.y = g1; col.x = nx; col.z = nz; col.y0 = g1; col.y1 = g1 + 1.0;
      if (e.creakT <= 0) { e.creakT = 0.5; Audio2.sfx('creak'); }
      if (def.onMove) def.onMove(e);
    };
    return addEnt(e);
  };

  // ---------- a generic pebble / fist target ----------
  // def: { x, y, z, r, obj, onPebble(p) -> 'stop'|'bounce'|null, onPunch(dmg) -> bool, aim: true }
  Actors.target = function (def) {
    const e = Object.assign({ kind: 'target', r: 0.6 }, def);
    if (e.obj) e.obj.position.set(e.x, e.y, e.z);
    e.update = e.update || function () {};
    return addEnt(e);
  };

  // ---------- queries ----------
  const isFoe = (e) => !e.dead && e.kind === 'foe' && e.state !== 'dead';
  Actors.nearestFoe = function (x, z, range, ry, cone) {
    let best = null, bd = range;
    for (const e of W.ents) {
      if (!isFoe(e) && !(e.kind === 'boss' && !e.dead)) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > bd) continue;
      if (cone != null && Math.abs(angDiff(ry, Math.atan2(e.x - x, e.z - z))) > cone) continue;
      best = e; bd = d;
    }
    return best;
  };
  Actors.aimTarget = function (x, z, ry, range) {
    let best = null, bs = 1e9;
    for (const e of W.ents) {
      if (e.dead) continue;
      if (!(isFoe(e) || (e.kind === 'target' && e.aim && !e.done) || (e.kind === 'boss' && e.aimable && e.aimable()) || e.kind === 'break')) continue;
      if (e.guard) continue;
      const d = Math.hypot(e.x - x, e.z - z); if (d > range || d < 0.5) continue;
      const da = Math.abs(angDiff(ry, Math.atan2(e.x - x, e.z - z)));
      if (da > 0.42) continue;
      const s = d * 0.1 + da * 3 - (e.kind === 'target' ? 2 : 0);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  };
  Actors.meleeHit = function (x, y, z, reach, dmg, src) {
    let any = false;
    const how = dmg >= 2 ? 'kick' : 'punch';
    for (const e of W.ents) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d > reach + (e.r || 0.4) * 0.5) continue;
      if (e.y != null && Math.abs((e.y + 0.8) - y) > 1.8) continue;
      if (isFoe(e) && e.hit) { if (e.hit(dmg, src.x, src.z, how)) any = true; }
      else if (e.kind === 'break') { e.hit(); any = true; }
      else if (e.kind === 'npc') { e.onHit(); any = true; }
      else if ((e.kind === 'target' || e.kind === 'boss') && e.onPunch) { if (e.onPunch(dmg, how)) any = true; }
    }
    return any;
  };
  Actors.pebbleTouch = function (p) {
    for (const e of W.ents) {
      if (e.dead || p.hitSet.has(e)) continue;
      if (e.kind === 'boss') { const r = e.pebble && e.pebble(p); if (r) { p.hitSet.add(e); return r; } continue; }
      const r = (e.r || 0.4) + p.r + 0.15;
      const ey = (e.aimY != null ? e.aimY : (e.y || 0) + (e.kind === 'foe' ? 0.8 : 0.4));
      if (Math.hypot(e.x - p.x, e.z - p.z) > r || Math.abs(ey - p.y) > (e.hy || (e.kind === 'foe' ? 1.2 : 0.9))) continue;
      if (isFoe(e)) { p.hitSet.add(e); e.hit(p.dmg, p.x - p.vx * 0.1, p.z - p.vz * 0.1, 'pebble'); return e.guard ? 'bounce' : 'bounce'; }
      if (e.kind === 'break') { p.hitSet.add(e); e.hit(); return null; }
      if (e.kind === 'npc') { p.hitSet.add(e); e.onHit(); return 'bounce'; }
      if (e.kind === 'target' && e.onPebble) { p.hitSet.add(e); return e.onPebble(p) || null; }
    }
    return null;
  };
  Actors.update = function (dt) {
    for (const e of W.ents) if (!e.dead && e.update) e.update(dt);
    // drop the dead
    for (let i = W.ents.length - 1; i >= 0; i--) {
      const e = W.ents[i];
      if (!e.dead) continue;
      if (e.obj && e.obj.parent && !e.keepObj) e.obj.parent.remove(e.obj);
      if (e.col) { const k = W.cols.indexOf(e.col); if (k >= 0) W.cols.splice(k, 1); }
      if (e.destroy) e.destroy();
      W.ents.splice(i, 1);
    }
  };
})();
