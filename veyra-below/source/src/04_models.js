// Veyra Below — procedural low-poly models: wardens, weapons, monsters, sprites, props

function part(parent, g, m, x, y, z, sx, sy, sz) { const o = mesh(g, m, x, y, z, sx, sy, sz); o.castShadow = true; parent.add(o); return o; }
function pivot(parent, x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; }

// ---------- humanoids ----------
// o: { suit, suit2, skin, hair, race, role, build (0 slim, 1 broad), scale }
function makeHumanoid(o) {
  const cast = o.race === 'construct';
  const suit = mat(o.suit), suit2 = mat(o.suit2 || 0x2a2a30), skin = mat(o.skin || 0xf0c8a0), hair = mat(o.hair || 0x2a2018);
  const trim = mat(o.trim || 0xe8e8e8), glow = mat(o.glow || 0x60e0ff, { e: o.glow || 0x60e0ff, ei: 1 });
  const broad = o.build ? 1.12 : 1;
  const g = new THREE.Group();
  const inner = pivot(g, 0, 0.92, 0);            // rotation centre for rolls and falls
  const hips = pivot(inner, 0, 0, 0);
  const torso = pivot(hips, 0, 0.02, 0);
  // torso
  part(torso, GM.box(), suit, 0, 0.32, 0, 0.46 * broad, 0.56, 0.28);
  part(torso, GM.box(), suit2, 0, 0.06, 0, 0.42 * broad, 0.14, 0.3);
  part(torso, GM.box(), trim, 0, 0.5, 0.15, 0.3 * broad, 0.1, 0.04);
  if (cast) { part(torso, GM.box(), suit2, 0, 0.34, -0.17, 0.3, 0.36, 0.1); part(torso, GM.box(), glow, 0, 0.34, 0.15, 0.12, 0.12, 0.02); }
  // head
  const head = pivot(torso, 0, 0.66, 0);
  if (cast) {
    part(head, GM.box(), suit, 0, 0.14, 0, 0.3, 0.3, 0.32);
    part(head, GM.box(), glow, 0, 0.16, 0.16, 0.24, 0.07, 0.02);
    part(head, GM.box(), suit2, 0, 0.32, -0.02, 0.06, 0.12, 0.06);
    part(head, GM.cone4(), trim, 0.18, 0.2, -0.04, 0.08, 0.26, 0.08).rotation.z = -0.5;
    part(head, GM.cone4(), trim, -0.18, 0.2, -0.04, 0.08, 0.26, 0.08).rotation.z = 0.5;
  } else {
    part(head, GM.sphMid(), skin, 0, 0.14, 0, 0.3, 0.33, 0.3);
    part(head, GM.sphMid(), hair, 0, 0.2, -0.03, 0.33, 0.3, 0.33);
    part(head, GM.box(), hair, 0, 0.06, -0.12, 0.3, 0.26, 0.1);
    if (o.race === 'sylph') { part(head, GM.cone4(), skin, 0.17, 0.14, 0, 0.05, 0.16, 0.08).rotation.z = -1.2; part(head, GM.cone4(), skin, -0.17, 0.14, 0, 0.05, 0.16, 0.08).rotation.z = 1.2; }
    part(head, GM.box(), mat(0x202028), 0.06, 0.13, 0.145, 0.04, 0.05, 0.02);
    part(head, GM.box(), mat(0x202028), -0.06, 0.13, 0.145, 0.04, 0.05, 0.02);
  }
  // role gear
  if (o.role === 'vanguard') {
    part(torso, GM.sphLo(), trim, 0.3 * broad, 0.52, 0, 0.24, 0.18, 0.26);
    part(torso, GM.sphLo(), trim, -0.3 * broad, 0.52, 0, 0.24, 0.18, 0.26);
  } else if (o.role === 'marksman') {
    if (!cast) part(head, GM.cyl(), suit2, 0, 0.3, 0.02, 0.36, 0.08, 0.36);
    part(head, GM.box(), glow, 0, 0.17, 0.16, 0.26, 0.05, 0.03);
    part(torso, GM.box(), suit2, 0.18, 0.3, -0.16, 0.12, 0.3, 0.08);
  } else if (o.role === 'psion') {
    if (!cast) { part(head, GM.cone(), suit, 0, 0.42, -0.02, 0.4, 0.42, 0.4); part(head, GM.cyl(), trim, 0, 0.27, 0, 0.5, 0.04, 0.5); }
    const coat = part(hips, GM.box(), suit, 0, -0.26, -0.06, 0.48 * broad, 0.5, 0.2); coat.rotation.x = 0.12;
  }
  // arms
  const mkArm = (side) => {
    const a = pivot(torso, side * (0.27 * broad), 0.5, 0);
    a.rotation.order = 'YXZ';
    part(a, GM.box(), cast ? suit2 : suit, 0, -0.17, 0, 0.13, 0.36, 0.14);
    part(a, GM.box(), cast ? suit : skin, 0, -0.43, 0, 0.11, 0.24, 0.12);
    const hand = pivot(a, 0, -0.56, 0);
    part(hand, GM.box(), cast ? suit2 : mat(0x30303a), 0, 0, 0, 0.12, 0.1, 0.12);
    return { a, hand };
  };
  const R_ = mkArm(-1), L_ = mkArm(1);
  // legs
  const mkLeg = (side) => {
    const l = pivot(hips, side * 0.12 * broad, -0.02, 0);
    part(l, GM.box(), suit2, 0, -0.22, 0, 0.17, 0.44, 0.18);
    part(l, GM.box(), cast ? suit : suit2, 0, -0.62, 0, 0.15, 0.4, 0.16);
    part(l, GM.box(), trim, 0, -0.86, 0.04, 0.17, 0.1, 0.26);
    return l;
  };
  const legR = mkLeg(-1), legL = mkLeg(1);
  const wpn = pivot(R_.hand, 0, -0.02, 0);   // main weapon (blade along -Y)
  const wpnL = pivot(L_.hand, 0, -0.02, 0);  // off-hand (knives, mechguns)
  const s = o.scale || 1; g.scale.setScalar(s * (o.build ? 1.04 : 1));
  return { g, inner, hips, torso, head, armR: R_.a, armL: L_.a, handR: R_.hand, handL: L_.hand, legR, legL, wpn, wpnL, height: 1.8 * s, wtype: null };
}

// st: { t, move (0..1), state, ph (0..1 of action), step, wcls, aimPitch }
function animHumanoid(rig, st, dt) {
  const t = st.t, mv = st.move || 0;
  const sw = Math.sin(t * 10) * 0.75 * mv;
  rig.inner.rotation.set(0, 0, 0); rig.inner.position.y = 0.92 + Math.abs(Math.sin(t * 10)) * 0.05 * mv;
  rig.legR.rotation.set(sw, 0, 0); rig.legL.rotation.set(-sw, 0, 0);
  rig.torso.rotation.set(0.06 * mv, 0, 0); rig.head.rotation.set(0, 0, 0);
  rig.armR.rotation.set(-sw * 0.8, 0, 0.08); rig.armL.rotation.set(sw * 0.8, 0, -0.08);
  rig.wpn.rotation.set(0.9, 0, 0); rig.wpnL.rotation.set(0.9, 0, 0);
  const idle = Math.sin(t * 2.2) * 0.03;
  rig.torso.position.y = 0.02 + idle * 0.3;
  const ph = st.ph || 0, cls = st.wcls || 'melee';
  switch (st.state) {
    case 'attack': {
      if (cls === 'melee') {
        // alternate horizontal slashes, the third is overhead
        const e = ph < 0.35 ? -1 + ph / 0.35 * 0.2 : ph < 0.6 ? lerp(-0.8, 1, (ph - 0.35) / 0.25) : 1;
        const step = st.step % 3;
        if (step === 2) { rig.armR.rotation.set(lerp(-2.8, -0.4, (e + 1) / 2), 0, 0); rig.torso.rotation.x = lerp(-0.15, 0.3, (e + 1) / 2); }
        else { const dir = step === 0 ? 1 : -1; rig.armR.rotation.set(-1.45, dir * lerp(1.3, -1.4, (e + 1) / 2), 0); rig.torso.rotation.y = dir * lerp(0.5, -0.5, (e + 1) / 2); }
        rig.wpn.rotation.set(0.15, 0, 0);
        if (rig.wtype === 'knives') { rig.armL.rotation.set(-1.45, -rig.armR.rotation.y * 0.8, 0); rig.wpnL.rotation.set(0.15, 0, 0); }
        if (rig.wtype === 'lance') { rig.armR.rotation.set(-1.4, 0, 0); rig.armL.rotation.set(-1.3, -0.4, 0); rig.torso.rotation.y = 0; rig.inner.position.z = Math.sin(ph * Math.PI) * 0.3; rig.wpn.rotation.set(0, 0, 0); }
      } else if (cls === 'gun' || cls === 'staff') {
        const kick = ph > 0.3 && ph < 0.55 ? (0.55 - ph) * 2 : 0;
        rig.armR.rotation.set(-1.5 + kick * 0.6, 0, 0); rig.wpn.rotation.set(0, 0, 0);
        if (rig.wtype === 'repeater') { rig.armL.rotation.set(-1.5 + kick * 0.6, 0, 0); rig.wpnL.rotation.set(0, 0, 0); }
        else if (cls === 'gun' && rig.wtype !== 'pistol') rig.armL.rotation.set(-1.3, -0.5, 0);
      } else if (cls === 'thrown') {
        const e = ph < 0.4 ? ph / 0.4 : 1;
        rig.armR.rotation.set(-1.4, lerp(1.4, -1.2, e), 0); rig.torso.rotation.y = lerp(0.4, -0.4, e); rig.wpn.rotation.set(0.2, 0, 0);
      }
      rig.legR.rotation.x *= 0.3; rig.legL.rotation.x *= 0.3;
      break;
    }
    case 'cast': {
      const up = Math.sin(clamp(ph, 0, 1) * Math.PI);
      rig.armR.rotation.set(-1.3 - up * 0.8, 0, 0.3); rig.armL.rotation.set(-1.3 - up * 0.8, 0, -0.3);
      rig.torso.rotation.x = -0.12 * up; rig.wpn.rotation.set(0, 0, 0);
      break;
    }
    case 'skill': {
      rig.armR.rotation.set(-1.6, Math.sin(ph * TAU) * 1.4, 0); rig.armL.rotation.set(-1.2, 0, -0.6); rig.wpn.rotation.set(0.1, 0, 0);
      break;
    }
    case 'spin': rig.armR.rotation.set(-1.5, 0, 0); rig.armL.rotation.set(-1.5, 0, 0); rig.wpn.rotation.set(0.1, 0, 0); break;
    case 'dodge': {
      rig.inner.rotation.x = ph * TAU; rig.inner.position.y = 0.55;
      rig.legR.rotation.x = -1.4; rig.legL.rotation.x = -1.4; rig.armR.rotation.x = -1; rig.armL.rotation.x = -1;
      break;
    }
    case 'hit': rig.torso.rotation.x = -0.35; rig.head.rotation.x = -0.3; rig.armR.rotation.x = 0.4; rig.armL.rotation.x = 0.4; break;
    case 'down': {
      rig.inner.rotation.x = -Math.PI / 2; rig.inner.position.y = 0.2;
      rig.armR.rotation.set(-2.8, 0, 0.3); rig.armL.rotation.set(-2.8, 0, -0.3); rig.legR.rotation.x = 0; rig.legL.rotation.x = 0;
      break;
    }
    case 'talk': rig.head.rotation.y = Math.sin(t * 1.3) * 0.15; rig.armR.rotation.set(-0.3 + Math.sin(t * 3) * 0.2, 0, 0.2); break;
    case 'idle': default: rig.armR.rotation.x += idle; rig.armL.rotation.x -= idle;
  }
}

// ---------- weapons ----------
function makeWeapon(type, glowColor = 0x60d8ff, metal = 0x9aa0a8) {
  const g = new THREE.Group();
  const m = mat(metal), dark = mat(0x2a2a30), glow = mat(glowColor, { e: glowColor, ei: 1.4 }), add = glowMat(glowColor, 0.35);
  const blade = (len, w, th = 0.03) => { part(g, GM.box(), glow, 0, -0.12 - len / 2, 0, w, len, th); g.add(mesh(GM.box(), add, 0, -0.12 - len / 2, 0, w * 2.4, len * 1.05, th * 4)); };
  switch (type) {
    case 'blade': part(g, GM.cyl(), m, 0, 0, 0, 0.06, 0.24, 0.06); part(g, GM.box(), dark, 0, -0.12, 0, 0.16, 0.04, 0.08); blade(0.95, 0.07); break;
    case 'greatblade': part(g, GM.cyl(), dark, 0, 0.06, 0, 0.06, 0.34, 0.06); part(g, GM.box(), m, 0, -0.12, 0, 0.34, 0.08, 0.1); blade(1.45, 0.16, 0.04); break;
    case 'knives': part(g, GM.cyl(), m, 0, 0, 0, 0.05, 0.16, 0.05); blade(0.42, 0.06); break;
    case 'lance': part(g, GM.cyl(), m, 0, 0.5, 0, 0.05, 2.2, 0.05); part(g, GM.cone4(), glow, 0, -0.85, 0, 0.16, 0.6, 0.05).rotation.x = Math.PI; g.add(mesh(GM.sph(), add, 0, -0.75, 0, 0.3, 0.6, 0.2)); break;
    case 'chakram': { part(g, GM.cyl(), m, 0, -0.1, 0, 0.42, 0.04, 0.42); const r = part(g, GM.tor(), glow, 0, -0.1, 0, 0.9, 0.9, 1.6); r.rotation.x = Math.PI / 2; break; }
    case 'pistol': part(g, GM.box(), dark, 0, -0.02, 0.06, 0.08, 0.14, 0.1); part(g, GM.box(), m, 0, -0.2, 0, 0.08, 0.3, 0.1); part(g, GM.box(), glow, 0, -0.33, 0, 0.04, 0.04, 0.06); break;
    case 'rifle': part(g, GM.box(), dark, 0, 0.1, 0, 0.08, 0.3, 0.1); part(g, GM.box(), m, 0, -0.32, 0, 0.09, 0.7, 0.12); part(g, GM.cyl(), m, 0, -0.85, 0, 0.04, 0.4, 0.04); part(g, GM.box(), glow, 0, -0.25, 0.08, 0.03, 0.3, 0.03); break;
    case 'repeater': part(g, GM.box(), dark, 0, -0.08, 0.02, 0.1, 0.2, 0.14); part(g, GM.box(), m, 0, -0.26, 0, 0.12, 0.28, 0.12); part(g, GM.box(), glow, 0, -0.4, 0, 0.06, 0.04, 0.06); break;
    case 'scatter': part(g, GM.box(), dark, 0, 0.06, 0, 0.1, 0.26, 0.12); part(g, GM.box(), m, 0, -0.3, 0, 0.16, 0.6, 0.16); part(g, GM.cyl(), glow, 0, -0.62, 0, 0.12, 0.06, 0.12); break;
    case 'scepter': part(g, GM.cyl(), m, 0, -0.3, 0, 0.05, 1.1, 0.05); part(g, GM.sphMid(), glow, 0, -0.9, 0, 0.18, 0.18, 0.18); g.add(mesh(GM.sph(), add, 0, -0.9, 0, 0.4, 0.4, 0.4)); break;
    case 'staff': part(g, GM.cyl(), m, 0, 0.1, 0, 0.05, 1.7, 0.05); part(g, GM.oct(), glow, 0, -0.85, 0, 0.22, 0.32, 0.22); part(g, GM.tor(), m, 0, -0.85, 0, 0.5, 0.5, 0.5); g.add(mesh(GM.sph(), add, 0, -0.85, 0, 0.55, 0.55, 0.55)); break;
    case 'sigil': part(g, GM.cyl(), m, 0, -0.12, 0, 0.04, 0.5, 0.04); part(g, GM.oct(), glow, 0, -0.45, 0, 0.14, 0.24, 0.14); g.add(mesh(GM.sph(), add, 0, -0.45, 0, 0.32, 0.32, 0.32)); break;
  }
  g.traverse((o) => { o.castShadow = false; });
  return g;
}
function equipWeaponModel(rig, type, glowColor) {
  rig.wpn.clear(); rig.wpnL.clear(); rig.wtype = type;
  if (!type) return;
  rig.wpn.add(makeWeapon(type, glowColor));
  if (type === 'knives' || type === 'repeater') rig.wpnL.add(makeWeapon(type, glowColor));
}

// ---------- monsters ----------
// Every builder returns { g, body, head, legs:[], wings:[], arms:[], glow: [] , h }
function rigBase() { const g = new THREE.Group(); const body = pivot(g, 0, 0, 0); return { g, body, head: null, legs: [], wings: [], arms: [], tail: null, h: 1 }; }
const SHAPES = {
  slime(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 0.6 });
    part(r.body, GM.sphMid(), c, 0, 0.42, 0, 1, 0.8, 1); r.head = pivot(r.body, 0, 0.55, 0.3);
    part(r.head, GM.sph(), c2, 0.15, 0, 0.1, 0.14, 0.14, 0.14); part(r.head, GM.sph(), c2, -0.15, 0, 0.1, 0.14, 0.14, 0.14);
    for (let i = 0; i < 5; i++) part(r.body, GM.cone4(), c2, Math.cos(i * 1.3) * 0.3, 0.75, Math.sin(i * 1.3) * 0.3 - 0.05, 0.12, 0.3, 0.12);
    r.h = 0.85; r.squish = true; return r;
  },
  wolf(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2), eye = mat(0xff3020, { e: 0xff3020 });
    part(r.body, GM.box(), c, 0, 0.62, 0, 0.42, 0.42, 1.0); part(r.body, GM.box(), c2, 0, 0.82, -0.1, 0.3, 0.14, 0.7);
    r.head = pivot(r.body, 0, 0.8, 0.55); part(r.head, GM.box(), c, 0, 0, 0.12, 0.32, 0.3, 0.36); part(r.head, GM.box(), c2, 0, -0.06, 0.38, 0.18, 0.16, 0.28);
    part(r.head, GM.cone4(), c, 0.1, 0.2, 0.05, 0.08, 0.2, 0.08); part(r.head, GM.cone4(), c, -0.1, 0.2, 0.05, 0.08, 0.2, 0.08);
    part(r.head, GM.box(), eye, 0.09, 0.05, 0.3, 0.05, 0.04, 0.02); part(r.head, GM.box(), eye, -0.09, 0.05, 0.3, 0.05, 0.04, 0.02);
    if (d.horns) { part(r.head, GM.cone4(), c2, 0.14, 0.24, -0.05, 0.06, 0.32, 0.06).rotation.x = -0.6; part(r.head, GM.cone4(), c2, -0.14, 0.24, -0.05, 0.06, 0.32, 0.06).rotation.x = -0.6; }
    for (const [x, z] of [[0.15, 0.35], [-0.15, 0.35], [0.15, -0.35], [-0.15, -0.35]]) { const l = pivot(r.body, x, 0.48, z); part(l, GM.box(), c, 0, -0.22, 0, 0.12, 0.46, 0.12); r.legs.push(l); }
    r.tail = pivot(r.body, 0, 0.75, -0.5); part(r.tail, GM.box(), c2, 0, 0, -0.22, 0.1, 0.1, 0.45).rotation.x = 0.4;
    r.h = 1.0; return r;
  },
  beast(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { flat: true }), eye = mat(0xffd020, { e: 0xffd020 });
    part(r.body, GM.sphMid(), c, 0, 1.0, 0, 1.1, 1.0, 1.2); part(r.body, GM.sphMid(), c, 0, 1.25, 0.25, 0.9, 0.8, 0.8);
    for (let i = 0; i < 6; i++) part(r.body, GM.cone4(), c2, (i % 2 - 0.5) * 0.4, 1.55 - Math.floor(i / 2) * 0.12, 0.1 - i * 0.12, 0.14, 0.42, 0.14).rotation.x = -0.6;
    r.head = pivot(r.body, 0, 1.3, 0.62); part(r.head, GM.box(), c, 0, 0, 0.1, 0.44, 0.38, 0.4); part(r.head, GM.box(), mat(0x302018), 0, -0.1, 0.32, 0.26, 0.16, 0.14);
    part(r.head, GM.box(), eye, 0.12, 0.06, 0.31, 0.06, 0.05, 0.02); part(r.head, GM.box(), eye, -0.12, 0.06, 0.31, 0.06, 0.05, 0.02);
    for (const s of [-1, 1]) { const a = pivot(r.body, s * 0.55, 1.2, 0.3); part(a, GM.box(), c, 0, -0.4, 0.05, 0.26, 0.8, 0.26); part(a, GM.cone4(), mat(0xe8e0c8), 0, -0.85, 0.12, 0.08, 0.2, 0.08).rotation.x = 2.6; r.arms.push(a); }
    for (const s of [-1, 1]) { const l = pivot(r.body, s * 0.3, 0.6, -0.2); part(l, GM.box(), c, 0, -0.3, 0, 0.3, 0.6, 0.32); r.legs.push(l); }
    r.h = 1.8; return r;
  },
  moth(d) {
    const r = rigBase(), c = mat(d.color), c2 = mat(d.color2, { e: d.color2, ei: 0.8, ds: true });
    r.body.position.y = 1.5;
    part(r.body, GM.sphMid(), c, 0, 0, 0, 0.3, 0.3, 0.7); r.head = pivot(r.body, 0, 0.05, 0.38); part(r.head, GM.sph(), mat(0x200a00), 0, 0, 0, 0.26, 0.24, 0.24);
    part(r.head, GM.sph(), mat(0xff2000, { e: 0xff2000 }), 0.09, 0.04, 0.1, 0.1, 0.1, 0.1); part(r.head, GM.sph(), mat(0xff2000, { e: 0xff2000 }), -0.09, 0.04, 0.1, 0.1, 0.1, 0.1);
    for (const s of [-1, 1]) { const w = pivot(r.body, s * 0.12, 0.05, 0.05); const wm = part(w, GM.plane(), c2, s * 0.55, 0, 0, 1.0, 0.8, 1); wm.rotation.x = -Math.PI / 2; r.wings.push(w); }
    r.h = 1.9; r.fly = 1.5; return r;
  },
  imp(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2 });
    part(r.body, GM.cone(), mat(0x2a3a20, { flat: true }), 0, 0.55, 0, 0.7, 1.1, 0.7);
    r.head = pivot(r.body, 0, 1.2, 0); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.42, 0.4, 0.42);
    part(r.head, GM.sph(), c2, 0.1, 0.02, 0.17, 0.08, 0.08, 0.08); part(r.head, GM.sph(), c2, -0.1, 0.02, 0.17, 0.08, 0.08, 0.08);
    for (let i = 0; i < 4; i++) part(r.head, GM.cone4(), mat(0x6a5030), (i - 1.5) * 0.12, 0.25, -0.05, 0.06, 0.3, 0.06).rotation.z = (i - 1.5) * 0.3;
    for (const s of [-1, 1]) { const a = pivot(r.body, s * 0.25, 0.95, 0); part(a, GM.box(), c, 0, -0.25, 0, 0.1, 0.5, 0.1); r.arms.push(a); }
    const staffA = r.arms[0]; part(staffA, GM.cyl(), mat(0x5a4020), 0, -0.4, 0.2, 0.05, 1.3, 0.05); part(staffA, GM.sph(), c2, 0, 0.2, 0.2, 0.18, 0.18, 0.18);
    r.h = 1.5; return r;
  },
  bird(d) {
    const r = rigBase(), c = mat(d.color, { e: d.color, ei: 0.3 }), c2 = mat(d.color2);
    part(r.body, GM.sphMid(), c, 0, 0.6, 0, 0.6, 0.7, 0.6); r.head = pivot(r.body, 0, 1.0, 0.1); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.42, 0.4, 0.42);
    part(r.head, GM.cone4(), mat(0xff8020), 0, -0.02, 0.26, 0.12, 0.2, 0.12).rotation.x = Math.PI / 2;
    part(r.head, GM.sph(), mat(0x101010), 0.1, 0.06, 0.16, 0.07, 0.07, 0.07); part(r.head, GM.sph(), mat(0x101010), -0.1, 0.06, 0.16, 0.07, 0.07, 0.07);
    part(r.head, GM.cone4(), c2, 0, 0.3, -0.05, 0.1, 0.3, 0.1);
    for (const s of [-1, 1]) { const w = pivot(r.body, s * 0.28, 0.7, 0); part(w, GM.box(), c2, s * 0.2, 0, 0, 0.4, 0.06, 0.3); r.wings.push(w); }
    for (const s of [-1, 1]) { const l = pivot(r.body, s * 0.12, 0.3, 0); part(l, GM.box(), mat(0xff8020), 0, -0.15, 0, 0.05, 0.3, 0.05); r.legs.push(l); }
    r.h = 1.3; return r;
  },
  grub(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 1 });
    for (let i = 0; i < 4; i++) { part(r.body, GM.sphMid(), i % 2 ? c2 : c, 0, 0.3, 0.3 - i * 0.28, 0.6 - i * 0.08, 0.55 - i * 0.06, 0.42); }
    r.head = pivot(r.body, 0, 0.35, 0.45); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.42, 0.4, 0.3); part(r.head, GM.sph(), c2, 0, 0, 0.12, 0.24, 0.2, 0.1);
    r.h = 0.7; r.squish = true; r.pulse = part(r.body, GM.sph(), glowMat(d.color2, 0.4), 0, 0.3, 0, 1.0, 0.7, 1.2); return r;
  },
  slug(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 1 });
    part(r.body, GM.sphMid(), c, 0, 0.35, 0, 0.9, 0.6, 1.6); for (let i = 0; i < 5; i++) part(r.body, GM.sph(), c2, (i % 2 - 0.5) * 0.4, 0.62, -0.5 + i * 0.25, 0.2, 0.14, 0.2);
    r.head = pivot(r.body, 0, 0.6, 0.7); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.6, 0.5, 0.5);
    part(r.head, GM.cyl(), c, 0.15, 0.3, 0, 0.06, 0.4, 0.06).rotation.z = -0.3; part(r.head, GM.cyl(), c, -0.15, 0.3, 0, 0.06, 0.4, 0.06).rotation.z = 0.3;
    part(r.head, GM.sph(), c2, 0.22, 0.5, 0, 0.1, 0.1, 0.1); part(r.head, GM.sph(), c2, -0.22, 0.5, 0, 0.1, 0.1, 0.1);
    r.h = 1.0; r.squish = true; return r;
  },
  bat(d) {
    const r = rigBase(), c = mat(d.color), c2 = mat(d.color2, { e: d.color2 }), wm = mat(0x4a2a50, { ds: true });
    r.body.position.y = 1.7;
    part(r.body, GM.sphMid(), c, 0, 0, 0, 0.45, 0.55, 0.4); r.head = pivot(r.body, 0, 0.3, 0.1); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.36, 0.34, 0.34);
    part(r.head, GM.cone4(), c, 0.12, 0.2, 0, 0.1, 0.3, 0.06); part(r.head, GM.cone4(), c, -0.12, 0.2, 0, 0.1, 0.3, 0.06);
    part(r.head, GM.sph(), c2, 0.08, 0.02, 0.15, 0.08, 0.08, 0.08); part(r.head, GM.sph(), c2, -0.08, 0.02, 0.15, 0.08, 0.08, 0.08);
    for (const s of [-1, 1]) { const w = pivot(r.body, s * 0.2, 0.1, 0); const p = part(w, GM.cone4(), wm, s * 0.6, 0, 0, 0.9, 1.2, 0.05); p.rotation.z = s * Math.PI / 2; p.rotation.y = Math.PI / 4; r.wings.push(w); }
    r.h = 2.1; r.fly = 1.7; return r;
  },
  beetle(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 1 });
    part(r.body, GM.sphMid(), c, 0, 0.7, -0.1, 1.3, 0.9, 1.7); part(r.body, GM.box(), c2, 0, 1.08, -0.1, 0.06, 0.1, 1.5);
    for (let i = 0; i < 4; i++) part(r.body, GM.box(), c2, (i % 2 ? 1 : -1) * 0.4, 0.95, -0.6 + i * 0.3, 0.3, 0.04, 0.08);
    r.head = pivot(r.body, 0, 0.6, 0.85); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.6, 0.45, 0.45);
    part(r.head, GM.cone4(), mat(0x1a1614), 0, 0.2, 0.3, 0.14, 0.7, 0.14).rotation.x = 1.0;
    for (const s of [-1, 1]) for (const z of [-0.5, 0, 0.5]) { const l = pivot(r.body, s * 0.55, 0.5, z); const p = part(l, GM.box(), c, s * 0.25, -0.2, 0, 0.5, 0.08, 0.1); p.rotation.z = -s * 0.6; r.legs.push(l); }
    r.h = 1.3; return r;
  },
  spider(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2 });
    part(r.body, GM.box(), c, 0, 0.45, 0, 0.6, 0.28, 0.7); part(r.body, GM.box(), mat(0x303034), 0, 0.62, -0.05, 0.4, 0.12, 0.4);
    r.head = pivot(r.body, 0, 0.45, 0.38); part(r.head, GM.box(), c, 0, 0, 0, 0.3, 0.2, 0.2); part(r.head, GM.box(), c2, 0, 0.02, 0.1, 0.22, 0.06, 0.02);
    for (const s of [-1, 1]) for (const z of [-0.25, 0, 0.25]) { const l = pivot(r.body, s * 0.3, 0.45, z); const p = part(l, GM.box(), c, s * 0.25, 0.05, 0, 0.5, 0.06, 0.06); p.rotation.z = s * 0.5; part(l, GM.box(), c, s * 0.5, -0.2, 0, 0.06, 0.45, 0.06); r.legs.push(l); }
    r.h = 0.7; return r;
  },
  drone(d) {
    const r = rigBase(), c = mat(d.color), c2 = mat(d.color2, { e: d.color2, ei: 1.2 });
    r.body.position.y = 1.6;
    part(r.body, GM.sphMid(), c, 0, 0, 0, 0.6, 0.45, 0.6); part(r.body, GM.cyl(), mat(0x30343a), 0, -0.05, 0, 0.75, 0.1, 0.75);
    r.head = pivot(r.body, 0, -0.05, 0.25); part(r.head, GM.sph(), c2, 0, 0, 0.05, 0.2, 0.2, 0.12);
    part(r.head, GM.box(), mat(0x20242a), 0.2, -0.15, 0.1, 0.06, 0.06, 0.4); part(r.head, GM.box(), mat(0x20242a), -0.2, -0.15, 0.1, 0.06, 0.06, 0.4);
    for (const s of [-1, 1]) { const w = pivot(r.body, s * 0.45, 0.12, 0); part(w, GM.cyl(), glowMat(d.color2, 0.4), 0, 0, 0, 0.4, 0.02, 0.4); r.wings.push(w); }
    r.h = 2; r.fly = 1.6; r.spin = true; return r;
  },
  mech(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), dk = mat(0x2a2e34), c2 = mat(d.color2, { e: d.color2, ei: 1.2 });
    part(r.body, GM.box(), c, 0, 1.25, 0, 0.9, 0.7, 0.7); part(r.body, GM.box(), dk, 0, 0.82, 0, 0.6, 0.3, 0.5);
    r.head = pivot(r.body, 0, 1.68, 0.05); part(r.head, GM.box(), c, 0, 0, 0, 0.4, 0.26, 0.34); part(r.head, GM.box(), c2, 0, 0, 0.18, 0.3, 0.06, 0.02);
    for (const s of [-1, 1]) { const a = pivot(r.body, s * 0.58, 1.45, 0); part(a, GM.box(), dk, 0, -0.3, 0, 0.22, 0.6, 0.22);
      if (s < 0) { part(a, GM.cone(), mat(0xc0c0c0), 0, -0.85, 0.05, 0.22, 0.6, 0.22).rotation.x = Math.PI; }
      else if (d.shield) { const sh = part(a, GM.box(), c, 0.05, -0.55, 0.3, 0.12, 1.0, 0.8); sh.rotation.y = 0.2; part(a, GM.box(), c2, 0.12, -0.55, 0.3, 0.02, 0.6, 0.1); }
      else part(a, GM.box(), c, 0, -0.7, 0, 0.26, 0.3, 0.26);
      r.arms.push(a); }
    for (const s of [-1, 1]) { const l = pivot(r.body, s * 0.25, 0.75, 0); part(l, GM.box(), dk, 0, -0.35, 0, 0.22, 0.7, 0.26); part(l, GM.box(), c, 0, -0.68, 0.08, 0.3, 0.12, 0.42); r.legs.push(l); }
    r.h = 1.9; return r;
  },
  mine(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 1.5 });
    part(r.body, GM.sphMid(), c, 0, 0.4, 0, 0.75, 0.75, 0.75);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(r.body, GM.cone4(), c, Math.cos(a) * 0.38, 0.4, Math.sin(a) * 0.38, 0.1, 0.26, 0.1).rotation.set(0, -a, Math.PI / 2); }
    r.head = pivot(r.body, 0, 0.78, 0); r.pulse = part(r.head, GM.sph(), c2, 0, 0, 0, 0.2, 0.2, 0.2);
    r.h = 0.8; r.roll = true; return r;
  },
  turret(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), dk = mat(0x2a2e34), c2 = mat(d.color2, { e: d.color2, ei: 1.3 });
    part(r.body, GM.cyl6(), dk, 0, 0.3, 0, 1.0, 0.6, 1.0); part(r.body, GM.cyl6(), c, 0, 0.7, 0, 0.7, 0.3, 0.7);
    r.head = pivot(r.body, 0, 1.0, 0); part(r.head, GM.box(), c, 0, 0, 0, 0.6, 0.38, 0.6); part(r.head, GM.box(), c2, 0, 0.05, 0.31, 0.3, 0.08, 0.02);
    part(r.head, GM.cyl(), dk, 0.15, -0.02, 0.5, 0.08, 0.6, 0.08).rotation.x = Math.PI / 2; part(r.head, GM.cyl(), dk, -0.15, -0.02, 0.5, 0.08, 0.6, 0.08).rotation.x = Math.PI / 2;
    r.h = 1.3; r.static = true; return r;
  },
  robed(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 1 }), bone = mat(0xd8d0b8);
    part(r.body, GM.cone(), c, 0, 0.7, 0, 0.9, 1.5, 0.8); part(r.body, GM.cyl(), c, 0, 1.4, 0, 0.42, 0.35, 0.36);
    r.head = pivot(r.body, 0, 1.68, 0.03); part(r.head, GM.sphMid(), d.halo ? bone : mat(0x1a1612), 0, 0, 0, 0.3, 0.34, 0.3);
    part(r.head, GM.cone(), c, 0, 0.12, -0.04, 0.42, 0.5, 0.42).rotation.x = -0.25;
    part(r.head, GM.sph(), c2, 0.07, 0, 0.14, 0.06, 0.06, 0.06); part(r.head, GM.sph(), c2, -0.07, 0, 0.14, 0.06, 0.06, 0.06);
    if (d.halo) { const h = part(r.head, GM.tor(), c2, 0, 0.42, -0.05, 0.7, 0.7, 0.7); h.rotation.x = Math.PI / 2 - 0.3; }
    for (const s of [-1, 1]) { const a = pivot(r.body, s * 0.3, 1.45, 0.05); part(a, GM.box(), c, 0, -0.3, 0, 0.16, 0.6, 0.16); part(a, GM.box(), bone, 0, -0.65, 0.04, 0.07, 0.2, 0.07); r.arms.push(a); }
    r.h = 2.0; r.glide = true; return r;
  },
  knight(d) {
    const r = rigBase(), c = mat(d.color, { flat: true }), c2 = mat(d.color2, { e: d.color2, ei: 1.3 }), m = mat(0x6a6478, { flat: true });
    part(r.body, GM.box(), c, 0, 1.35, 0, 0.7, 0.75, 0.42); part(r.body, GM.box(), m, 0, 1.6, 0.05, 0.85, 0.2, 0.46);
    part(r.body, GM.cone(), c, 0, 0.78, 0, 0.75, 0.7, 0.55).rotation.x = Math.PI;
    r.head = pivot(r.body, 0, 1.9, 0); part(r.head, GM.box(), m, 0, 0, 0, 0.3, 0.36, 0.32); part(r.head, GM.box(), c2, 0, 0.02, 0.17, 0.22, 0.04, 0.02);
    part(r.head, GM.cone4(), c, 0, 0.32, -0.05, 0.08, 0.4, 0.2);
    for (const s of [-1, 1]) { const a = pivot(r.body, s * 0.45, 1.6, 0); part(a, GM.box(), m, 0, -0.3, 0, 0.2, 0.6, 0.2); r.arms.push(a); }
    part(r.arms[0], GM.cyl(), m, 0, -0.62, 0.6, 0.06, 2.4, 0.06).rotation.x = Math.PI / 2; part(r.arms[0], GM.cone4(), c2, 0, -0.62, 1.95, 0.16, 0.5, 0.06).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { const l = pivot(r.body, s * 0.18, 0.95, 0); part(l, GM.box(), m, 0, -0.45, 0, 0.2, 0.9, 0.22); r.legs.push(l); }
    r.h = 2.3; return r;
  },
  ninja(d) {
    const r = rigBase(), c = mat(d.color), c2 = mat(d.color2, { e: d.color2, ei: 1.4 });
    part(r.body, GM.box(), c, 0, 1.2, 0, 0.4, 0.6, 0.26); r.head = pivot(r.body, 0, 1.65, 0); part(r.head, GM.sphMid(), c, 0, 0, 0, 0.28, 0.3, 0.28); part(r.head, GM.box(), c2, 0, 0.02, 0.13, 0.2, 0.04, 0.02);
    for (const s of [-1, 1]) { const a = pivot(r.body, s * 0.26, 1.45, 0); part(a, GM.box(), c, 0, -0.28, 0, 0.1, 0.56, 0.1); part(a, GM.box(), c2, 0, -0.6, 0.25, 0.04, 0.04, 0.6); r.arms.push(a); }
    for (const s of [-1, 1]) { const l = pivot(r.body, s * 0.11, 0.9, 0); part(l, GM.box(), c, 0, -0.44, 0, 0.13, 0.88, 0.14); r.legs.push(l); }
    r.h = 1.85; return r;
  },
  eye(d) {
    const r = rigBase(), c = mat(d.color), c2 = mat(d.color2, { e: d.color2, ei: 1.5 });
    r.body.position.y = 1.6;
    part(r.body, GM.sphMid(), c, 0, 0, 0, 0.8, 0.8, 0.8); r.head = pivot(r.body, 0, 0, 0.32); part(r.head, GM.sph(), c2, 0, 0, 0, 0.36, 0.36, 0.2); part(r.head, GM.sph(), mat(0x050505), 0, 0, 0.08, 0.14, 0.14, 0.08);
    for (let i = 0; i < 6; i++) { const w = pivot(r.body, 0, 0, -0.2); const p = part(w, GM.box(), mat(0x6a2a3a), 0, 0, -0.5, 0.06, 0.06, 0.9); w.rotation.set(Math.cos(i) * 0.6, Math.sin(i) * 0.9, 0); r.wings.push(w); p.userData.t = i; }
    r.h = 2.1; r.fly = 1.6; r.tent = true; return r;
  },
  wisp(d) {
    const r = rigBase(); r.body.position.y = 1.4;
    part(r.body, GM.sph(), mat(d.color, { e: d.color, ei: 1.5 }), 0, 0, 0, 0.35, 0.35, 0.35); r.body.add(mesh(GM.sph(), glowMat(d.color, 0.4), 0, 0, 0, 0.9, 0.9, 0.9));
    r.head = pivot(r.body, 0, 0, 0); r.h = 1.6; r.fly = 1.4; return r;
  },
};
function makeMonster(def, scale = 1) {
  const r = (SHAPES[def.shape] || SHAPES.slime)(def);
  r.g.scale.setScalar((def.size || 1) * scale);
  r.baseFly = r.fly || 0;
  return r;
}
// st: { t, move, state ('idle','move','wind','strike','hit','dead'), ph }
function animMonster(r, st) {
  const t = st.t, mv = st.move || 0, sw = Math.sin(t * 11) * 0.6 * Math.max(mv, 0.15);
  r.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? sw : -sw); });
  r.wings.forEach((w, i) => { if (r.tent) w.rotation.z = Math.sin(t * 3 + i) * 0.3; else if (r.fly) w.rotation.z = (i ? -1 : 1) * Math.sin(t * 16) * 0.7; else w.rotation.z = (i ? -1 : 1) * Math.sin(t * 9) * 0.3 * mv; });
  if (r.spin) r.wings.forEach((w) => { w.rotation.y += 0.6; });
  if (r.tail) r.tail.rotation.y = Math.sin(t * 8) * 0.4;
  r.body.rotation.set(0, 0, 0);
  if (r.fly) r.body.position.y = r.baseFly + Math.sin(t * 2.5) * 0.15;
  else r.body.position.y = Math.abs(Math.sin(t * 11)) * 0.06 * mv;
  if (r.squish) { const s = 1 + Math.sin(t * 9) * 0.1 * Math.max(mv, 0.3); r.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); }
  if (r.roll) r.body.rotation.x = t * 6 * mv;
  if (r.pulse) { if (!r.pulse.userData.s) r.pulse.userData.s = r.pulse.scale.clone(); const p = 1 + Math.sin(t * 8) * 0.15; r.pulse.scale.copy(r.pulse.userData.s).multiplyScalar(p); }
  if (r.head) r.head.rotation.set(0, 0, 0);
  r.arms.forEach((a, i) => { a.rotation.set(Math.sin(t * 2 + i) * 0.1 - sw * 0.5 * (i ? 1 : -1), 0, 0); });
  const ph = st.ph || 0;
  if (st.state === 'wind') {
    r.body.rotation.x = -0.25 * ph; if (r.head) r.head.rotation.x = -0.3 * ph;
    r.arms.forEach((a) => { a.rotation.x = -2.4 * ph; });
    if (r.squish) r.body.scale.set(1 + ph * 0.25, 1 - ph * 0.3, 1 + ph * 0.25);
  } else if (st.state === 'strike') {
    const k = 1 - ph;
    r.body.rotation.x = 0.35 * k; if (r.head) r.head.rotation.x = 0.4 * k;
    r.arms.forEach((a) => { a.rotation.x = lerp(-2.4, 0.4, Math.min(1, ph * 3)); });
  } else if (st.state === 'hit') { r.body.rotation.x = -0.3; }
  else if (st.state === 'dead') { r.body.rotation.z = Math.min(1, ph * 3) * 1.4; r.body.position.y = (r.fly || 0) * (1 - Math.min(1, ph * 2)); }
}

// ---------- sprites ----------
function makeSprite(formId) {
  const f = SPRITE_FORMS[formId] || SPRITE_FORMS.sprite;
  const g = new THREE.Group(), c = mat(f.color, { e: f.color, ei: 0.25 }), w = mat(0xf0f0f8), glow = mat(f.color, { e: f.color, ei: 1.4 });
  switch (f.shape) {
    case 'pod': part(g, GM.sphMid(), c, 0, 0, 0, 0.26, 0.32, 0.26); part(g, GM.box(), w, 0.17, 0, 0, 0.08, 0.2, 0.12); part(g, GM.box(), w, -0.17, 0, 0, 0.08, 0.2, 0.12); break;
    case 'wing': part(g, GM.oct(), c, 0, 0, 0, 0.24, 0.36, 0.24); for (const s of [-1, 1]) { const p = part(g, GM.cone4(), w, s * 0.26, 0.05, 0, 0.12, 0.5, 0.06); p.rotation.z = s * 1.2; } break;
    case 'ring': part(g, GM.sph(), c, 0, 0, 0, 0.2, 0.2, 0.2); { const r = part(g, GM.tor(), glow, 0, 0, 0, 0.75, 0.75, 0.75); r.rotation.x = 1.2; } break;
    case 'orb': part(g, GM.sphMid(), c, 0, 0, 0, 0.3, 0.3, 0.3); for (let i = 0; i < 3; i++) part(g, GM.sph(), glow, Math.cos(i * 2.1) * 0.28, Math.sin(i * 2.1) * 0.28, 0, 0.08, 0.08, 0.08); break;
    case 'shell': part(g, GM.dodec(), c, 0, 0, 0, 0.36, 0.36, 0.36); part(g, GM.box(), glow, 0, 0, 0.17, 0.12, 0.04, 0.02); break;
    case 'crown': part(g, GM.oct(), c, 0, 0, 0, 0.26, 0.4, 0.26); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; part(g, GM.cone4(), glow, Math.cos(a) * 0.24, 0.18, Math.sin(a) * 0.24, 0.06, 0.24, 0.06); } { const r = part(g, GM.tor(), w, 0, 0, 0, 0.6, 0.6, 0.6); r.rotation.x = Math.PI / 2; } break;
  }
  g.add(mesh(GM.sph(), glowMat(f.color, 0.25), 0, 0, 0, 0.7, 0.7, 0.7));
  g.traverse((o) => { o.castShadow = false; });
  return g;
}

// ---------- props ----------
const PROPS = {
  tree(pal, rng) {
    const g = new THREE.Group(), h = rng.range(2.6, 4.2);
    part(g, GM.cyl6(), mat(0x4a3424, { flat: true }), 0, h * 0.35, 0, 0.32, h * 0.7, 0.32);
    const c = mat(rng.pick([0x2f5a2a, 0x3a6a30, 0x2a4e2e, 0x4a5a26]), { flat: true });
    for (let i = 0; i < 3; i++) part(g, GM.cone(), c, 0, h * 0.6 + i * 0.7, 0, 2.2 - i * 0.5, 1.6, 2.2 - i * 0.5);
    return g;
  },
  bush(pal, rng) { const g = new THREE.Group(); const c = mat(rng.pick([0x3a6a30, 0x4a7a34, 0x5a6a2a]), { flat: true }); for (let i = 0; i < 3; i++) part(g, GM.sphLo(), c, rng.range(-0.4, 0.4), 0.35, rng.range(-0.4, 0.4), rng.range(0.7, 1.1), 0.7, rng.range(0.7, 1.1)); return g; },
  rock(pal, rng) { const g = new THREE.Group(); part(g, GM.dodec(), mat(pal.wall2, { flat: true }), 0, 0.3, 0, rng.range(0.6, 1.3), rng.range(0.5, 0.9), rng.range(0.6, 1.3)).rotation.y = rng() * 3; return g; },
  mushroom(pal, rng) { const g = new THREE.Group(); const c = rng.pick([0xd04a40, 0xb060ff, 0x60d0ff]); for (let i = 0; i < 3; i++) { const x = rng.range(-0.4, 0.4), z = rng.range(-0.4, 0.4), s = rng.range(0.5, 1); part(g, GM.cyl(), mat(0xe8e0c8), x, 0.2 * s, z, 0.1 * s, 0.4 * s, 0.1 * s); part(g, GM.sph(), mat(c, { e: c, ei: 0.4 }), x, 0.42 * s, z, 0.4 * s, 0.22 * s, 0.4 * s); } return g; },
  flower(pal, rng) { const g = new THREE.Group(); const c = rng.pick([0xf0e060, 0xf080c0, 0xffffff, 0x80c0ff]); for (let i = 0; i < 5; i++) part(g, GM.sph(), mat(c), rng.range(-0.5, 0.5), 0.1, rng.range(-0.5, 0.5), 0.14, 0.1, 0.14); return g; },
  crystal(pal, rng) { const g = new THREE.Group(); const c = pal.glow; for (let i = 0; i < 3; i++) { const p = part(g, GM.oct(), mat(c, { e: c, ei: 0.7, t: true, o: 0.85 }), rng.range(-0.3, 0.3), 0.4, rng.range(-0.3, 0.3), 0.3, rng.range(0.8, 1.6), 0.3); p.rotation.z = rng.range(-0.4, 0.4); } return g; },
  lavarock(pal, rng) { const g = new THREE.Group(); part(g, GM.dodec(), mat(0x2a1a14, { flat: true }), 0, 0.2, 0, 1.2, 0.5, 1.2); part(g, GM.box(), mat(0xff6020, { e: 0xff5010, ei: 1.5 }), 0, 0.42, 0, 0.8, 0.04, 0.08).rotation.y = rng() * 3; return g; },
  stalagmite(pal, rng) { const g = new THREE.Group(); const c = mat(pal.wall2, { flat: true }); for (let i = 0; i < 2; i++) part(g, GM.cone(), c, rng.range(-0.3, 0.3), 0.8, rng.range(-0.3, 0.3), 0.6, rng.range(1.2, 2.2), 0.6); return g; },
  pipe(pal, rng) { const g = new THREE.Group(); const m = mat(0x5a6470); const p = part(g, GM.cyl(), m, 0, 0.5, 0, 0.4, 2, 0.4); p.rotation.z = Math.PI / 2; part(g, GM.box(), mat(0x2a2e34), 0, 0.25, 0, 0.3, 0.5, 0.3); return g; },
  barrel(pal, rng) { const g = new THREE.Group(); part(g, GM.cyl(), mat(rng.pick([0xb04020, 0x2a6ab0, 0xc0a030])), 0, 0.5, 0, 0.7, 1, 0.7); part(g, GM.cyl(), mat(0x2a2e34), 0, 0.5, 0, 0.74, 0.08, 0.74); return g; },
  console(pal, rng) { const g = new THREE.Group(); part(g, GM.box(), mat(0x3a4048), 0, 0.5, 0, 1.0, 1.0, 0.6); const s = part(g, GM.box(), mat(pal.glow, { e: pal.glow, ei: 1 }), 0, 0.9, 0.1, 0.8, 0.4, 0.05); s.rotation.x = -0.5; return g; },
  lamp(pal, rng) { const g = new THREE.Group(); part(g, GM.cyl(), mat(0x30343a), 0, 1.2, 0, 0.12, 2.4, 0.12); part(g, GM.sph(), mat(pal.glow, { e: pal.glow, ei: 2 }), 0, 2.45, 0, 0.3, 0.3, 0.3); g.add(mesh(GM.sph(), glowMat(pal.glow, 0.25), 0, 2.45, 0, 1, 1, 1)); return g; },
  column(pal, rng) { const g = new THREE.Group(); const m = mat(pal.wall2, { flat: true }); part(g, GM.box(), m, 0, 0.15, 0, 1.0, 0.3, 1.0); part(g, GM.cyl6(), m, 0, 1.7, 0, 0.6, 3.1, 0.6); part(g, GM.box(), m, 0, 3.3, 0, 1.0, 0.3, 1.0); return g; },
  brokencolumn(pal, rng) { const g = new THREE.Group(); const m = mat(pal.wall2, { flat: true }); part(g, GM.box(), m, 0, 0.15, 0, 1.0, 0.3, 1.0); part(g, GM.cyl6(), m, 0, 0.7, 0, 0.6, rng.range(0.8, 1.4), 0.6); const p = part(g, GM.cyl6(), m, 0.9, 0.3, 0.3, 0.6, 1.4, 0.6); p.rotation.z = Math.PI / 2; return g; },
  candles(pal, rng) { const g = new THREE.Group(); for (let i = 0; i < 4; i++) { const x = rng.range(-0.4, 0.4), z = rng.range(-0.4, 0.4), h = rng.range(0.2, 0.5); part(g, GM.cyl(), mat(0xe8e0c8), x, h / 2, z, 0.08, h, 0.08); g.add(mesh(GM.sph(), glowMat(0xffb040, 0.8), x, h + 0.05, z, 0.1, 0.16, 0.1)); } return g; },
  bones(pal, rng) { const g = new THREE.Group(); const b = mat(0xd8d0b8); part(g, GM.sphMid(), b, 0, 0.12, 0, 0.26, 0.24, 0.28); for (let i = 0; i < 3; i++) { const p = part(g, GM.cyl(), b, rng.range(-0.5, 0.5), 0.05, rng.range(-0.5, 0.5), 0.06, 0.6, 0.06); p.rotation.set(Math.PI / 2, 0, rng() * 3); } return g; },
  statue(pal, rng) { const g = new THREE.Group(); const m = mat(pal.wall2, { flat: true }); part(g, GM.box(), m, 0, 0.3, 0, 1.0, 0.6, 1.0); part(g, GM.cone(), m, 0, 1.4, 0, 0.7, 1.6, 0.7); part(g, GM.sphMid(), m, 0, 2.4, 0, 0.42, 0.46, 0.42); part(g, GM.tor(), mat(pal.glow, { e: pal.glow }), 0, 2.85, 0, 0.6, 0.6, 0.6).rotation.x = Math.PI / 2; return g; },
};

// teleporter pad, colour by purpose
function makeTeleporter(color = 0x60e0ff) {
  const g = new THREE.Group();
  part(g, GM.cyl(), mat(0x3a4048), 0, 0.08, 0, 2.4, 0.16, 2.4);
  part(g, GM.cyl(), mat(color, { e: color, ei: 1.2 }), 0, 0.17, 0, 1.8, 0.04, 1.8);
  const ring = mesh(GM.tor(), glowMat(color, 0.7), 0, 0.5, 0, 2.2, 2.2, 2.2); ring.rotation.x = Math.PI / 2; g.add(ring);
  const beam = mesh(GM.cyl(), glowMat(color, 0.18), 0, 1.6, 0, 1.6, 3.2, 1.6); g.add(beam);
  g.userData.ring = ring; g.userData.beam = beam;
  return g;
}
function makeCapsule() {
  const g = new THREE.Group();
  part(g, GM.cyl(), mat(0x5a6470), 0, 0.1, 0, 0.7, 0.2, 0.7);
  const c = part(g, GM.sphMid(), mat(0xff60a0, { e: 0xff60a0, ei: 1, t: true, o: 0.85 }), 0, 0.75, 0, 0.5, 0.9, 0.5);
  g.add(mesh(GM.sph(), glowMat(0xff60a0, 0.25), 0, 0.75, 0, 1.2, 1.6, 1.2));
  g.userData.core = c;
  return g;
}
function makeCrate(pal, kind) {
  const g = new THREE.Group();
  if (kind === 'box') { part(g, GM.box(), mat(0xc0a040), 0, 0.4, 0, 0.8, 0.8, 0.8); part(g, GM.box(), mat(0x4a5058), 0, 0.4, 0, 0.84, 0.12, 0.84); part(g, GM.box(), mat(pal.glow, { e: pal.glow }), 0, 0.82, 0, 0.3, 0.03, 0.3); }
  else { part(g, GM.cyl6(), mat(0x6a7a8a), 0, 0.45, 0, 0.7, 0.9, 0.7); part(g, GM.cyl6(), mat(pal.glow, { e: pal.glow }), 0, 0.92, 0, 0.4, 0.04, 0.4); }
  return g;
}
function makeFence(color = 0xff3040) {
  const g = new THREE.Group();
  const m = mat(color, { basic: true, t: true, o: 0.55, add: true, ds: true });
  for (let i = 0; i < 4; i++) g.add(mesh(GM.box(), m, 0, 0.3 + i * 0.4, 0, 2, 0.06, 0.06));
  g.add(mesh(GM.box(), mat(color, { basic: true, t: true, o: 0.15, add: true, ds: true }), 0, 0.9, 0, 2, 1.8, 0.02));
  part(g, GM.box(), mat(0x30343a), -1, 0.9, 0, 0.14, 1.9, 0.14); part(g, GM.box(), mat(0x30343a), 1, 0.9, 0, 0.14, 1.9, 0.14);
  return g;
}
