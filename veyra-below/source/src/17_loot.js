// Veyra Below — loot on the ground: drop boxes, rare beams, credits, breakable containers, pickup

const GROUND = [];
const DROP_COLORS = { weapon: 0xff8040, frame: 0x5090ff, barrier: 0x5090ff, unit: 0x5090ff, tool: 0x50e070, disc: 0x40d0ff, gem: 0xffffff, quest: 0xffb040 };
function dropMesh(it, credits) {
  const g = new THREE.Group();
  if (credits) {
    for (let k = 0; k < 3; k++) part(g, GM.cyl(), mat(0xf0c040, { e: 0x705010, ei: 0.6 }), (k - 1) * 0.12, 0.08 + k * 0.05, (k % 2) * 0.1, 0.24, 0.05, 0.24);
    return g;
  }
  const rare = it.rar === 5, col = rare ? 0xff2030 : it.kind === 'gem' ? GEMS[it.base].color : DROP_COLORS[it.kind] || 0xffffff;
  const box = part(g, GM.box(), mat(col, { e: col, ei: 0.45 }), 0, 0.28, 0, 0.42, 0.42, 0.42);
  box.rotation.y = Math.PI / 4;
  part(g, GM.box(), mat(0xe8e8e8), 0, 0.28, 0, 0.45, 0.08, 0.45).rotation.y = Math.PI / 4;
  g.userData.box = box;
  if (isEquip(it) && it.rar >= 2 || it.kind === 'quest') {
    const bc = rare ? 0xff3040 : parseInt(itemColor(it).slice(1), 16);
    const beam = mesh(GM.cyl(), glowMat(bc, rare ? 0.4 : 0.25), 0, rare ? 4 : 2.5, 0, 0.35, rare ? 8 : 5, 0.35); g.add(beam); g.userData.beam = beam;
  }
  return g;
}
function dropItem(it, x, z, scatter = 1.0) {
  for (let k = 0; k < 8; k++) { const a = rnd() * TAU, r = rnd() * scatter; const nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r; if (!solidAt(nx, nz)) { x = nx; z = nz; break; } }
  const g = dropMesh(it, false); g.position.set(x, 0, z); R.root.add(g);
  const d = { item: it, x, z, mesh: g, t: 0 };
  GROUND.push(d);
  if (it.rar === 5) { AUDIO.sfx('rare', x, z); allyChatter('rare', 0.8); FX.pillar(x, z, 0.6, 10, 0xff3040, 1.2); }
  else if (isEquip(it) && it.rar >= 3) AUDIO.sfx('rare', x, z, 0.6);
  return d;
}
function dropCredits(n, x, z) {
  const a = rnd() * TAU, r = rnd() * 0.9; x += Math.cos(a) * r; z += Math.sin(a) * r;
  if (solidAt(x, z)) { x -= Math.cos(a) * r; z -= Math.sin(a) * r; }
  const g = dropMesh(null, true); g.position.set(x, 0, z); R.root.add(g);
  GROUND.push({ credits: n, x, z, mesh: g, t: 0 });
}
function clearGround() { for (const d of GROUND) if (d.mesh.parent) d.mesh.parent.remove(d.mesh); GROUND.length = 0; }
function updateGround(dt) {
  for (let i = GROUND.length - 1; i >= 0; i--) {
    const d = GROUND[i]; d.t += dt;
    const b = d.mesh.userData.box; if (b) { b.rotation.y += dt * 1.2; b.position.y = 0.3 + Math.sin(d.t * 3) * 0.05; }
    if (d.mesh.userData.beam) d.mesh.userData.beam.material.opacity = (d.item.rar === 5 ? 0.35 : 0.2) + Math.sin(d.t * 4) * 0.08;
    if (d.t < 0.3) d.mesh.position.y = Math.sin(d.t / 0.3 * Math.PI) * 0.6;
    // credits is picked up just by walking over it
    if (d.credits && PL && alive(PL) && dist2(d.x, d.z, PL.x, PL.z) < 1.5 * 1.5 && d.t > 0.3) {
      GAME.char.credits += d.credits; HUD.float(d.x, 1.2, d.z, '+' + d.credits + ' M', '#ffd860', 13); AUDIO.sfx('credits', d.x, d.z, 0.7);
      R.root.remove(d.mesh); GROUND.splice(i, 1);
    }
  }
}
function nearestGround(x, z, r) { let best = null, bd = r * r; for (const d of GROUND) { if (d.credits) continue; const dd = dist2(x, z, d.x, d.z); if (dd < bd) { bd = dd; best = d; } } return best; }
function pickUp(d) {
  const it = d.item, c = GAME.char;
  if (it.kind === 'quest') { GAME.questPickup(it); R.root.remove(d.mesh); GROUND.splice(GROUND.indexOf(d), 1); return true; }
  if (!invAdd(c.inv, it)) { HUD.toast('Your inventory is full.', '#ff9090'); AUDIO.sfx('error'); return false; }
  R.root.remove(d.mesh); GROUND.splice(GROUND.indexOf(d), 1);
  AUDIO.sfx('pickup', d.x, d.z);
  HUD.log(`Picked up <span style="color:${itemColor(it)}">${esc(itemName(it))}</span>`);
  if (it.rar === 5) c.stats.rares++;
  GAME.autoAssign(it);
  return true;
}

// ---------- breakable containers ----------
function spawnBox(x, z, pal) {
  const b = makeActor('box', x, z, { team: 1, box: true, hp: 1, maxHp: 1, evp: 0, static: true, r: 0.5, name: 'Container', h: 1, res: {}, noXp: true });
  b.model = makeCrate(pal, rnd() < 0.5 ? 'box' : 'cyl'); b.model.position.set(x, 0, z); b.model.rotation.y = rnd() * TAU; R.root.add(b.model);
  return b;
}

// ---------- drops when something dies ----------
function lootFor(e) {
  const c = GAME.char, S = PL ? PL.S : { mf: 0, gf: 0, lck: 10 };
  const ctx = { ilvl: e.lvl, mf: S.mf + S.lck / 1000, sid: STAR_SIGNS.find((s) => s.id === c.sid), area: e.area, role: c.role, diff: GAME.diff, boss: e.bossId };
  const drops = [];
  if (e.box) {
    ctx.source = 'box'; ctx.ilvl = GAME.floorLevel();
    if (rnd() < 0.4) drops.push(rollDrop(ctx)); else if (rnd() < 0.5) dropCredits(creditsDrop(ctx.ilvl, S.gf), e.x, e.z);
  } else if (e.boss) {
    ctx.source = 'boss';
    for (let k = 0; k < 5; k++) drops.push(rollDrop(ctx));
    if (rnd() < 0.35 + DIFFS[GAME.diff].drop * 0.05) { const s = rollRelic(e.lvl, { ...ctx, source: 'boss' }, rnd); if (s) drops.push(s); }
    drops.push(makeTool(rnd.pick(['strTonic', 'psyTonic', 'defTonic', 'evaTonic', 'vigTonic', 'psiTonic', 'luckTonic'])));
    for (let k = 0; k < 4; k++) dropCredits(creditsDrop(e.lvl, S.gf) * 3, e.x, e.z);
  } else if (!e.noDrop) {
    const D = DIFFS[GAME.diff];
    let n = 0, src = 'monster';
    if (e.unique) { n = 3; src = 'unique'; }
    else if (e.elite) { n = rnd() < 0.6 ? 2 : 1; src = 'elite'; }
    else if (e.def.rare) { n = 4; src = 'skylark'; }
    else if (rnd() < 0.14 * D.drop * (e.variant ? RARE_VARIANT.drop : 1)) n = 1;
    ctx.source = src;
    for (let k = 0; k < n; k++) drops.push(rollDrop(ctx));
    if (e.unique) { const r = rollDrop({ ...ctx, mf: ctx.mf + 2 }); drops.push(r); }
    if (rnd() < (e.elite || e.unique ? 0.9 : 0.4)) dropCredits(creditsDrop(e.lvl, S.gf) * (e.unique ? 4 : e.elite ? 2 : 1), e.x, e.z);
  }
  for (const it of drops) if (it) dropItem(it, e.x, e.z, e.boss ? 3 : 1.2);
}
