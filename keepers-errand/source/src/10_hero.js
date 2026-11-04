// ---- the hero: Wick, the young keeper of the Brindle Isle light ----
const MODES = ['normal', 'sporty', 'aggressive', 'sneaky'];
const MODE_INFO = {
  normal: { name: 'Normal', speed: 4.2, desc: 'Talk, search, push and turn things.' },
  sporty: { name: 'Sporty', speed: 7.2, desc: 'Run fast and jump.' },
  aggressive: { name: 'Aggressive', speed: 4.0, desc: 'Punch and kick.' },
  sneaky: { name: 'Sneaky', speed: 2.1, desc: 'Creep silently past guards.' },
};
const Hero = {
  x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, ry: 0, r: 0.36, h: 1.6,
  onGround: true, state: 'free', stateT: 0, inv: 0, mode: 'normal',
  anim: { t: 0, phase: 0, move: 0, pose: 'idle', punch: 0, kick: 0, throwT: 0 },
  combo: 0, comboT: 0, swingHit: false, noise: 0, safe: null, safeT: 0, wading: false, platform: null,
  P: null, obj: null,
  build() {
    this.P = makeChar({ skin: 0xf2c9a0, coat: 0xf2c230, coat2: 0xe2a91c, pants: 0x3b4a6b, boots: 0x2a2624, hair: 0xb8582a, tuft: true,
      hat: 'keeper', scarf: 0xd2453a, buttons: 0x3a3028, sleeve: 0xf2c230, scale: 0.98 });
    this.obj = this.P.root;
    // the pebble pouch on the belt
    this.P.torso.add(mesh(GEO.sph, 0x7a5a3a, 0.22, 0.12, 0.12, 0.16, 0.18, 0.12));
    R.scene.add(this.obj);
  },
  place(x, z, ry = 0) {
    this.x = x; this.z = z; this.ry = ry; this.vx = this.vz = this.vy = 0;
    this.y = groundAt(x, z, 50, this.r);
    if (W.area.ground) this.y = Math.max(this.y, W.area.ground(x, z));
    this.y = groundAt(x, z, this.y + 0.5, this.r);
    this.onGround = true; this.state = 'free'; this.platform = null;
    this.safe = [x, z, ry]; this.inv = 0;
    this.sync();
  },
  setMode(m, quiet) {
    if (this.mode === m) return;
    this.mode = m; G.save.mode = m;
    this.combo = 0;
    if (!quiet) Audio2.sfx('mode', MODES.indexOf(m));
    HUD.mode();
  },
  sync() {
    const o = this.obj;
    o.position.set(this.x, this.y, this.z);
    o.rotation.y = this.ry;
    if (this.P.shadow) { this.P.shadow.position.y = (this.ground != null ? this.ground : this.y) - this.y + 0.03; }
  },
  hurt(dmg, fromX, fromZ) {
    if (this.inv > 0 || this.state === 'drown' || this.state === 'fall' || this.state === 'dead' || G.god) return false;
    G.save.life = Math.max(0, G.save.life - dmg);
    this.inv = 1.2;
    const dx = this.x - fromX, dz = this.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.kx = dx / d * 7; this.kz = dz / d * 7;
    this.state = 'hurt'; this.stateT = 0.35;
    if (this.onGround) this.vy = 3.5;
    this.onGround = false;
    Audio2.sfx('hurt'); CAM.shake = 0.25; HUD.hurt(); HUD.life();
    FX.burst(this.x, this.y + 1, this.z, 0xffffff, 6, 3);
    if (G.save.life <= 0) this.knockout();
    return true;
  },
  heal(n) { G.save.life = Math.min(G.save.maxLife, G.save.life + n); HUD.life(); },
  knockout() {
    this.state = 'dead'; this.stateT = 0;
    G.lockInput++;
    Timers.after(1.4, () => {
      HUD.fade(1, 0.4);
      Timers.after(0.5, () => {
        G.lockInput = Math.max(0, G.lockInput - 1);
        const lost = Math.min(G.save.clams, 5);
        G.save.clams -= lost;
        G.save.life = G.save.maxLife;
        Story.respawn();
        HUD.fade(0, 0.5); HUD.life(); HUD.clams();
        HUD.toast(lost ? `You come to, a little bruised. (Dropped ${lost} clams.)` : 'You come to, a little bruised.');
      });
    });
  },
  // drowned / fell: back to the last safe spot, minus some life
  mishap(kind) {
    if (this.state === 'drown' || this.state === 'fall' || this.state === 'dead') return;
    this.state = kind; this.stateT = 0;
    if (kind === 'drown') { Audio2.sfx('splash'); FX.splash(this.x, 0, this.z, 1.5); }
    G.lockInput++;
    Timers.after(kind === 'drown' ? 1.0 : 0.6, () => {
      HUD.fade(1, 0.2);
      Timers.after(0.25, () => {
        G.lockInput = Math.max(0, G.lockInput - 1);
        G.save.life = Math.max(1, G.save.life - 2); HUD.life();
        const s = this.safe; this.place(s[0], s[1], s[2]); this.inv = 1.5;
        CAM.snap = true;
        HUD.fade(0, 0.3);
        HUD.toast(kind === 'drown' ? "Brr! Keepers can't swim in a storm sea." : 'Ouch! Back up you get.');
      });
    });
  },
  drinkTonic() {
    if (G.save.tonics <= 0) { HUD.toast('No kelp tonic left. Noddy sells it in Pottle Harbour.'); return; }
    if (G.save.life >= G.save.maxLife) { HUD.toast('You feel fine already.'); return; }
    G.save.tonics--; this.heal(G.save.maxLife); Audio2.sfx('heart'); HUD.toast('Glug glug. Kelp tonic: tastes awful, works wonders.'); HUD.items();
  },
  update(dt) {
    const a = this.anim; a.t += dt;
    this.inv = Math.max(0, this.inv - dt);
    this.stateT -= dt; this.comboT -= dt;
    const I = Input, ctl = G.state === 'play' && !G.lockInput;
    const press = (k) => ctl && I.pressed[k];
    // mode switching
    if (ctl && this.state !== 'attack') {
      if (press('mode1')) this.setMode('normal'); if (press('mode2')) this.setMode('sporty');
      if (press('mode3')) this.setMode('aggressive'); if (press('mode4')) this.setMode('sneaky');
      if (press('modeNext')) this.setMode(MODES[(MODES.indexOf(this.mode) + 1) % 4]);
      if (press('modePrev')) this.setMode(MODES[(MODES.indexOf(this.mode) + 3) % 4]);
      if (press('tonic')) this.drinkTonic();
    }
    const info = MODE_INFO[this.mode];
    // movement intent from the camera basis
    let ix = 0, iz = 0;
    if (ctl && (this.state === 'free' || this.state === 'attack' || this.state === 'throw')) {
      const B = CAM.basis;
      ix = B.rx * I.mx + B.fx * I.my; iz = B.rz * I.mx + B.fz * I.my;
      // keep the old basis while the stick is held through a camera cut
      CAM.holdBasis = CAM.mode === 'fixed' && Math.hypot(I.mx, I.my) > 0.2;
    } else CAM.holdBasis = false;
    if (G.autoMove) { ix = G.autoMove[0]; iz = G.autoMove[1]; }
    const im = Math.min(1, Math.hypot(ix, iz));
    let speed = info.speed * (this.state === 'attack' ? 0.25 : this.state === 'throw' ? 0.5 : 1);
    if (this.wading) speed *= 0.6;
    let tvx = 0, tvz = 0;
    if (im > 0.08) { tvx = ix / Math.max(im, 1e-6) * speed * im; tvz = iz / Math.max(im, 1e-6) * speed * im; }
    if (this.state === 'free' || this.state === 'throw' || this.state === 'attack') {
      const accel = this.onGround ? 14 : 5;
      this.vx = approach(this.vx, tvx, accel * dt * Math.max(speed, 3));
      this.vz = approach(this.vz, tvz, accel * dt * Math.max(speed, 3));
      if (im > 0.08 && this.state !== 'attack') { const want = Math.atan2(ix, iz); this.ry += angDiff(this.ry, want) * Math.min(1, dt * 14); }
    } else if (this.state === 'hurt') { this.vx = this.kx; this.vz = this.kz; this.kx *= 0.9; this.kz *= 0.9; if (this.stateT <= 0) this.state = 'free'; }
    else { this.vx *= 0.8; this.vz *= 0.8; }
    if (this.state === 'drown' || this.state === 'fall' || this.state === 'dead') { this.vx = this.vz = 0; }
    // actions
    if (ctl && this.state === 'free') {
      if (press('use')) Story.interact();
      else if (press('action')) {
        if (this.mode === 'sporty') { if (this.onGround || this.coyote > 0) this.jump(); }
        else if (this.mode === 'aggressive') this.attack();
        else if (!Story.interact()) { if (this.mode === 'normal') HUD.toast('Nothing to do here. (Switch modes with 1-4 or Tab.)', 'hint-nothing'); }
      }
      if (press('throw')) Pebble.throw();
    } else if (ctl && this.state === 'attack') {
      if (press('action')) this.queued = true;
    }
    if (this.state === 'attack') this.updateAttack(dt);
    if (this.state === 'throw') { a.throwT = Math.min(1, a.throwT + dt / 0.38); if (a.throwT >= 1) { this.state = 'free'; a.throwT = 0; } }
    // move with a moving platform
    if (this.platform && this.onGround && this.platform.dx != null) { this.x += this.platform.dx; this.z += this.platform.dz; }
    const bumped = moveBody(this, this.vx * dt, this.vz * dt);
    if (bumped && bumped.push && this.mode === 'normal' && this.onGround && im > 0.5 && this.state === 'free') bumped.push(this, ix, iz, dt);
    this.pushing = !!(bumped && bumped.push && this.mode === 'normal' && im > 0.5);
    const wasGround = this.onGround;
    fallBody(this, dt);
    // a moment of grace to jump after running off a ledge
    if (this.onGround) this.coyote = 0.12; else if (wasGround && this.vy <= 0) this.coyote = 0.12; else this.coyote = Math.max(0, (this.coyote || 0) - dt);
    // which platform are we standing on?
    this.platform = null;
    if (this.onGround) for (const c of W.cols) if (c.moving && Math.abs(c.y1 - this.y) < 0.05 && colTop(c, this.x, this.z, this.r) > -Infinity) this.platform = c;
    if (this.justLanded) { this.justLanded = false; if (!wasGround && this.landSpeed > 4) { Audio2.sfx('land'); FX.dust(this.x, this.y, this.z); this.noise = Math.max(this.noise, this.mode === 'sneaky' ? 0 : 2); } }
    // water and pits
    const a2 = W.area;
    this.wading = false;
    if (a2.kind === 'outdoor' && this.state !== 'drown') {
      const g = a2.ground(this.x, this.z);
      if (g < -1.15 && this.y < -0.25 && this.onGround) this.mishap('drown');
      else if (g < -0.05 && this.y < 0.05) { this.wading = true; if (im > 0.2 && Math.random() < dt * 8) FX.splash(this.x, 0.02, this.z, 0.3); }
    }
    if (a2.water != null && a2.water > this.y + 1.0 && this.state !== 'drown') this.mishap('drown');
    if (this.y < a2.killY && this.state !== 'fall') this.mishap('fall');
    // remember the last safe footing
    this.safeT -= dt;
    if (this.safeT <= 0 && this.onGround && this.state === 'free' && !this.platform && !this.wading && (!a2.ground || a2.ground(this.x, this.z) > -0.3 || this.y > 0.3)) {
      this.safeT = 0.4;
      if (!a2.unsafe || !a2.unsafe(this.x, this.z, this.y)) this.safe = [this.x, this.z, this.ry];
    }
    // noise for the guards
    const sp = Math.hypot(this.vx, this.vz);
    this.noise = approach(this.noise, 0, dt * 3);
    if (sp > 0.5) this.noise = Math.max(this.noise, this.mode === 'sneaky' ? 0 : this.mode === 'sporty' ? 2 : 1);
    // animation
    a.move = clamp(sp / info.speed, 0, 1);
    const stepRate = this.mode === 'sporty' ? 2.0 : this.mode === 'sneaky' ? 1.3 : 1.7;
    const before = Math.sin(a.phase);
    a.phase += dt * sp * stepRate;
    if (this.onGround && sp > 0.5 && Math.sign(before) !== Math.sign(Math.sin(a.phase)) && this.mode !== 'sneaky') Audio2.sfx('step');
    let pose = 'idle';
    if (this.state === 'drown') pose = 'swim';
    else if (this.state === 'fall' || this.state === 'dead') pose = 'fall';
    else if (this.state === 'hurt') pose = 'hurt';
    else if (this.state === 'valve') pose = 'valve';
    else if (!this.onGround) pose = 'jump';
    else if (this.pushing) pose = 'push';
    else if (this.mode === 'sneaky') pose = 'sneak';
    else if (this.mode === 'aggressive') pose = 'fight';
    else if (sp > 0.5) pose = this.mode === 'sporty' ? 'run' : 'walk';
    a.pose = pose;
    if (this.state === 'dead') { this.obj.rotation.z = approach(this.obj.rotation.z, -1.4, dt * 4); } else this.obj.rotation.z = 0;
    if (this.state === 'drown') this.y = approach(this.y, -1.2, dt * 1.2);
    animChar(this.P, a);
    // blink while invulnerable
    this.obj.visible = !(this.inv > 0 && this.state !== 'drown' && Math.floor(a.t * 16) % 2 === 0);
    this.sync();
  },
  jump() {
    this.vy = 7.6; this.onGround = false; this.coyote = 0;
    // a running jump carries further
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > 3) { this.vx *= 1.08; this.vz *= 1.08; }
    Audio2.sfx('jump');
    this.noise = 2;
  },
  attack() {
    this.state = 'attack'; this.atkT = 0; this.swingHit = false; this.queued = false;
    if (this.comboT <= 0) this.combo = 0;
    this.swing = this.combo % 3;
    this.swingLen = this.swing === 2 ? 0.42 : 0.26;
    Audio2.sfx('swing');
    // lunge toward a nearby foe
    const foe = Actors.nearestFoe(this.x, this.z, 3.0, this.ry, 1.2);
    if (foe) { this.ry = Math.atan2(foe.x - this.x, foe.z - this.z); }
    const lunge = this.swing === 2 ? 3.5 : 2.2;
    this.vx = Math.sin(this.ry) * lunge; this.vz = Math.cos(this.ry) * lunge;
  },
  updateAttack(dt) {
    const a = this.anim;
    this.atkT += dt;
    const p = this.atkT / this.swingLen;
    if (this.swing === 2) { a.kick = clamp(p, 0, 1); a.punch = 0; } else { a.punch = clamp(p, 0, 1); a.punchSide = this.swing === 1; a.kick = 0; }
    this.vx *= 0.85; this.vz *= 0.85;
    if (!this.swingHit && p > 0.4) {
      this.swingHit = true;
      const dmg = this.swing === 2 ? 2 : 1;
      const reach = this.swing === 2 ? 1.6 : 1.35;
      const hx = this.x + Math.sin(this.ry) * 0.8, hz = this.z + Math.cos(this.ry) * 0.8;
      if (Actors.meleeHit(hx, this.y + 0.9, hz, reach, dmg, this)) { Audio2.sfx('punch'); CAM.shake = Math.max(CAM.shake, 0.08); }
    }
    if (p >= 1) {
      a.punch = 0; a.kick = 0;
      this.combo++; this.comboT = 0.4;
      if (this.queued && this.combo < 3) { this.attack(); return; }
      if (this.combo >= 3) this.combo = 0;
      this.state = 'free';
    }
  },
};
