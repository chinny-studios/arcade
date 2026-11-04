// ---- the boss: Foreman Gearwhistle and the Storm Engine ----
// Phase 1: the Foreman hides behind a giant ledger. Hit his back boiler: after a charge into a wall he is stunned.
// Phase 2: he cranks the Storm Engine. When its cage opens, hit the core with the sun-charged pebble (3 times).
const Boss = {
  spawn(a) {
    const P = makeChar({ kind: 'foreman', scale: 2.0 });
    // the ledger shield on his left arm and a boiler on his back
    const shield = new THREE.Group(); shield.position.set(-0.2, -0.45, 0.42); shield.rotation.y = 0.35;
    shield.add(mesh(GEO.box, 0x6a2a2a, 0, 0, 0, 0.85, 1.05, 0.2)); shield.add(mesh(GEO.box, 0xf4ecd8, 0, 0, 0.0, 0.78, 0.98, 0.22)); shield.add(mesh(GEO.box, 0xd6b25a, 0, 0.15, 0.12, 0.5, 0.12, 0.02));
    P.armL.add(shield);
    const boiler = new THREE.Group(); boiler.position.set(0, 0.45, -0.55);
    boiler.add(mesh(GEO.cyl12, 0x5a4a3a, 0, 0, 0, 0.7, 0.8, 0.5)); boiler.children[0].rotation.x = Math.PI / 2;
    const core = mesh(GEO.sph, MAT.glow(0xff8a3a), 0, 0, -0.22, 0.45, 0.45, 0.2); boiler.add(core);
    P.torso.add(boiler);
    const eng = Boss.buildEngine(a);
    const e = {
      kind: 'boss', P, obj: P.root, x: 0, z: -4.5, y: 0, ry: 0, r: 1.0, h: 3.2, onGround: true,
      phase: 1, hp: 8, maxHp: 8, coreHp: 3, state: 'intro', st: 0, anim: { t: 0, phase: 0, move: 0, pose: 'idle' }, flash: 0, boilerCore: core, eng,
      vx: 0, vz: 0, nextMove: 0, strikes: [],
      update(dt) {
        const a2 = this.anim; a2.t += dt; this.st += dt; this.flash = Math.max(0, this.flash - dt);
        const dx = Hero.x - this.x, dz = Hero.z - this.z, dist = Math.hypot(dx, dz), toHero = Math.atan2(dx, dz);
        let sp = 0, turn = 3;
        a2.pose = 'idle'; a2.punch = 0;
        switch (this.state) {
          case 'intro': this.ry = toHero; break;
          case 'stalk':
            sp = 2.4; this.ry += angDiff(this.ry, toHero) * Math.min(1, dt * turn);
            if (this.st > this.nextMove) { this.st = 0; this.state = dist < 4.5 && Math.random() < 0.6 ? 'slamWind' : 'chargeWind'; if (this.state === 'chargeWind') { Audio2.sfx('roar'); FX.icon(this, '!'); } }
            break;
          case 'slamWind':
            this.ry += angDiff(this.ry, toHero) * Math.min(1, dt * 2);
            a2.pose = 'fight'; this.P.armR.rotation.x = -2.8;
            if (this.st > 0.8) {
              this.state = 'slam'; this.st = 0; Audio2.sfx('boom'); CAM.shake = 0.35;
              const fx = this.x + Math.sin(this.ry) * 2.2, fz = this.z + Math.cos(this.ry) * 2.2;
              FX.ring(fx, 0.1, fz, 0xffe0a0, 2.2); FX.dust(fx, 0, fz);
              this.wave = { x: fx, z: fz, r: 0, hit: false };
            }
            break;
          case 'slam':
            a2.punch = 1;
            if (this.wave) {
              const w = this.wave; w.r += dt * 9;
              const hd = Math.hypot(Hero.x - w.x, Hero.z - w.z);
              if (!w.hit && Math.abs(hd - w.r) < 0.7 && Hero.onGround && Hero.y < 0.5) { w.hit = true; Hero.hurt(2, w.x, w.z); }
              if (w.r > 5.5) this.wave = null;
            }
            if (this.st > 0.9) { this.state = 'stalk'; this.st = 0; this.nextMove = rnd(1.5, 2.6); }
            break;
          case 'chargeWind':
            this.ry += angDiff(this.ry, toHero) * Math.min(1, dt * 5);
            a2.pose = 'fight';
            if (Math.random() < dt * 20) FX.spark(this.x + rnd(-0.6, 0.6), this.y + 2.6, this.z + rnd(-0.6, 0.6), 0xffffff, 0.6);
            if (this.st > 0.75) { this.state = 'charge'; this.st = 0; this.hitHero = false; }
            break;
          case 'charge': {
            sp = 11; a2.pose = 'run';
            if (!this.hitHero && dist < 1.8) { this.hitHero = true; Hero.hurt(3, this.x, this.z); }
            break;
          }
          case 'stunned':
            a2.pose = 'hurt';
            if (Math.random() < dt * 6) FX.icon({ x: this.x + rnd(-0.5, 0.5), y: this.y + 3.4, z: this.z, fixed: true }, '?', 0.8);
            if (this.st > 3.2) { this.state = 'stalk'; this.st = 0; this.nextMove = rnd(1.0, 2.0); }
            break;
          case 'retreat': {
            // go round the engine, not through it
            let tx = 0, tz = 2.6;
            if (this.z < 1.5 && Math.abs(this.x) < 3.0) { tx = (this.x >= 0 ? 1 : -1) * 3.6; tz = clamp(this.z, -2, 2.6); }
            const ddx = tx - this.x, ddz = tz - this.z, d = Math.hypot(ddx, ddz);
            if (d > 0.3 || tx !== 0) { this.ry += angDiff(this.ry, Math.atan2(ddx, ddz)) * Math.min(1, dt * 6); sp = 4; }
            else { this.state = 'crank'; this.st = 0; this.ry = Math.PI; Story.bossPhase2(); }
            break;
          }
          case 'crank':
            a2.pose = 'valve'; this.ry = Math.PI;
            break;
          case 'down':
            a2.pose = 'fall'; this.obj.rotation.z = approach(this.obj.rotation.z, -1.4, dt * 2);
            break;
        }
        this.vx = Math.sin(this.ry) * sp; this.vz = Math.cos(this.ry) * sp;
        const hit = moveBody(this, this.vx * dt, this.vz * dt);
        if (this.state === 'charge' && (hit || this.st > 2.2)) {
          this.state = 'stunned'; this.st = 0; Audio2.sfx('boom'); CAM.shake = 0.5; FX.gears(this.x, this.y + 2, this.z, 6);
          // bounce back a little so he faces away from the wall, back exposed
          this.x -= Math.sin(this.ry) * 0.6; this.z -= Math.cos(this.ry) * 0.6;
        }
        a2.move = sp > 0 ? Math.min(1, sp / 4) : 0; a2.phase += dt * sp * 1.4;
        animChar(P, a2);
        if (this.state === 'slamWind') P.armR.rotation.x = -2.8;
        core.material = MAT.glow(this.state === 'stunned' ? (Math.floor(a2.t * 8) % 2 ? 0xffd060 : 0xff6a2a) : 0xff8a3a);
        P.root.position.set(this.x, this.y, this.z); P.root.rotation.y = this.ry;
        P.body.scale.setScalar(this.flash > 0 ? 1.06 : 1);
        Boss.updateEngine(eng, dt, this);
        // lightning strikes in phase 2
        if (this.phase === 2 && this.state === 'crank') {
          this.strikeT = (this.strikeT || 1.5) - dt;
          if (this.strikeT <= 0) { this.strikeT = rnd(1.6, 2.4); Boss.strike(this, Hero.x + Hero.vx * 0.4, Hero.z + Hero.vz * 0.4); }
        }
        for (let i = this.strikes.length - 1; i >= 0; i--) {
          const s = this.strikes[i]; s.t += dt;
          s.m.material.opacity = 0.25 + Math.sin(s.t * 20) * 0.15;
          if (s.t > 1.0) {
            lightning(0.5); FX.bolt(s.x, s.z, 6); Audio2.sfx('zap'); FX.burst(s.x, 0.3, s.z, 0xd0c0ff, 14, 5);
            if (Math.hypot(Hero.x - s.x, Hero.z - s.z) < 1.5) Hero.hurt(2, s.x, s.z);
            s.m.parent && s.m.parent.remove(s.m); this.strikes.splice(i, 1);
          }
        }
        HUD.boss(this.phase === 1 ? this.hp / this.maxHp : this.coreHp / 3, this.phase === 1 ? 'Foreman Gearwhistle' : 'The Storm Engine');
      },
      // is a hit from (sx, sz) on his back (or is he stunned)?
      exposed(sx, sz) {
        if (this.phase !== 1 || this.state === 'intro' || this.state === 'retreat') return false;
        if (this.state === 'stunned') return true;
        const from = Math.atan2(sx - this.x, sz - this.z);
        return Math.abs(angDiff(this.ry, from)) > 1.9;
      },
      damage(n) {
        this.hp -= n; this.flash = 0.2; Audio2.sfx('clang'); FX.gears(this.x, this.y + 2.2, this.z, 4);
        CAM.shake = Math.max(CAM.shake, 0.12);
        if (this.hp <= 0) { this.hp = 0; this.state = 'retreat'; this.st = 0; Audio2.sfx('roar'); Story.bossHalf(); }
      },
      onPunch(dmg) {
        if (Math.hypot(Hero.x - this.x, Hero.z - this.z) > 2.6) return false;
        if (this.exposed(Hero.x, Hero.z)) { this.damage(dmg); return true; }
        Audio2.sfx('clang'); FX.burst(this.x, this.y + 1.6, this.z, 0xffffff, 5, 3);
        if (this.phase === 1 && this.state === 'stalk' && Math.random() < 0.4) HUD.toast('The ledger blocks it! Get behind him.', 'boss-front');
        return true;
      },
      pebble(p) {
        if (this.state === 'down') return null;
        const by = this.y + 1.8;
        if (Math.hypot(p.x - this.x, p.z - this.z) < 1.3 && Math.abs(p.y - by) < 1.8) {
          const sx = p.x - p.vx * 0.15, sz = p.z - p.vz * 0.15;
          if (this.exposed(sx, sz)) { this.damage(p.dmg >= 3 ? 2 : 1); return 'stop'; }
          Audio2.sfx('clang'); FX.burst(p.x, p.y, p.z, 0xffffff, 6, 3);
          return 'bounce';
        }
        return null;
      },
      aimable() { return this.phase === 1 && this.state !== 'retreat'; },
      destroy() { for (const s of this.strikes) s.m.parent && s.m.parent.remove(s.m); HUD.boss(null); },
    };
    e.y = 0;
    addEnt(e);
    return e;
  },
  buildEngine(a) {
    const g = new THREE.Group();
    const b = new Batch();
    b.p('cyl12', 0x3a3a44, 0, 0.4, 0, 3.6, 0.8, 3.6);
    b.p('cyl12', 0x4a4a54, 0, 4.6, 0, 3.4, 0.4, 3.4);
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU; b.p('cyl', 0x5a5a64, Math.sin(an) * 1.6, 2.5, Math.cos(an) * 1.6, 0.25, 4.2, 0.25); }
    b.p('cone', 0x3a3a44, 0, 5.4, 0, 2.4, 1.4, 2.4);
    b.p('box', 0x6a5a42, 0, 1.2, 2.0, 0.3, 0.3, 0.8);
    g.add(b.build());
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x9a5aff });
    const core = new THREE.Mesh(GEO.ico1, coreMat); core.scale.setScalar(1.6); core.position.y = 2.6; g.add(core);
    const cage = new THREE.Group(); for (let i = 0; i < 10; i++) { const an = i / 10 * TAU; cage.add(mesh(GEO.box, 0x2a2a30, Math.sin(an) * 1.15, 0, Math.cos(an) * 1.15, 0.16, 2.6, 0.16)); }
    cage.position.y = 2.6; g.add(cage);
    const pl = new THREE.PointLight(0xa070ff, 2.0, 18); pl.position.y = 2.6; g.add(pl);
    g.scale.set(1, 0.72, 1);     // squat enough that the camera sees over it
    a.group.add(g);
    const col = { t: 'cyl', x: 0, z: 0, r: 1.85, y0: -1, y1: 3.9, noStand: true };
    W.cols.push(col);
    const eng = { g, core, coreMat, cage, pl, open: false, cycle: 0, col, dead: false };
    // the core is a pebble target of its own
    const tgt = Actors.target({
      x: 0, y: 1.9, z: 0, aimY: 1.9, r: 1.95, hy: 2.1,   // any hit on the open engine counts aim: false,   // wider than the engine's collider, so a pebble bouncing off the cage still counts
      onPebble(p) {
        if (eng.dead) return null;
        if (Math.abs(p.y - 1.9) > 2.1) return null;
        if (!eng.open) { Audio2.sfx('clang'); FX.burst(p.x, p.y, p.z, 0xffffff, 5, 3); return 'bounce'; }
        if (!Pebble.sun) { Audio2.sfx('zap'); HUD.toast('Fzzt! A plain pebble just fizzles against the core.'); return 'stop'; }
        Story.coreHit(); return 'stop';
      },
    });
    eng.tgt = tgt;
    return eng;
  },
  updateEngine(eng, dt, boss) {
    if (eng.dead) return;
    eng.core.rotation.y += dt * 1.5; eng.core.rotation.x += dt * 0.7;
    const pulse = 0.85 + Math.sin(performance.now() / 120) * 0.15;
    if (boss.phase === 2 && boss.state === 'crank') {
      eng.cycle += dt;
      const period = 6.5, openFor = 3.0;
      const was = eng.open;
      eng.open = (eng.cycle % period) > period - openFor;
      if (eng.open !== was) { Audio2.sfx(eng.open ? 'magic' : 'clang'); if (eng.open) HUD.toast('The cage is open! Hit the core!', 'core-open'); }
    } else eng.open = false;
    eng.tgt.aim = eng.open;
    eng.cage.position.y = approach(eng.cage.position.y, eng.open ? -0.4 : 2.6, dt * 6);
    eng.coreMat.color.setHex(eng.open ? 0xd8b0ff : 0x9a5aff).multiplyScalar(pulse);
    eng.pl.intensity = (eng.open ? 3 : 1.6) * pulse;
  },
  strike(boss, x, z) {
    const r = Math.hypot(x, z); if (r > 8.2) { x *= 8.2 / r; z *= 8.2 / r; }
    if (Math.hypot(x, z) < 2.2) { const an = Math.atan2(x, z); x = Math.sin(an) * 2.4; z = Math.cos(an) * 2.4; }
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({ color: 0xc0a0ff, transparent: true, opacity: 0.35, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); W.area.group.add(m);
    boss.strikes.push({ x, z, t: 0, m });
  },
};
