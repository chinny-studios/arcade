// Tokoyo — saving & loading: world edits, pieces, player, events; browser autosave and file export/import

const SAVE = (() => {
  const KEY = 'tokoyo.save.v1';
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  function packMap(map, floats) {
    const n = map.size, k = new Int32Array(n), v = floats ? new Float32Array(n) : new Uint8Array(n);
    let i = 0; for (const [a, b] of map) { k[i] = a; v[i] = b; i++; }
    return { k: b64(new Uint8Array(k.buffer)), v: b64(new Uint8Array(v.buffer)) };
  }
  function unpackMap(o, floats) {
    const m = new Map(); if (!o) return m;
    const kb = unb64(o.k), vb = unb64(o.v);
    const k = new Int32Array(kb.buffer, 0, kb.length / 4), v = floats ? new Float32Array(vb.buffer, 0, vb.length / 4) : vb;
    for (let i = 0; i < k.length; i++) m.set(k[i], v[i]);
    return m;
  }
  function serialize() {
    const P = PLAYER;
    const eqIdx = {};
    for (const k in P.eq) if (P.eq[k]) eqIdx[k] = P.inv.slots.indexOf(P.eq[k]);
    const status = {};
    for (const k of ['rested', 'noSkillDrain', 'shirokiba', 'osugi', 'wet']) if (P.status[k]) status[k] = P.status[k];
    return {
      v: 1, seed: W.seed, seedText: G.seedText, time: G.time, saved: Date.now(),
      player: { pos: P.pos.toArray(), yaw: P.yaw, hp: P.hp, st: P.st, inv: P.inv.toJSON(), eq: eqIdx, food: P.food, skills: P.skills, status, spawn: P.spawn, name: P.name, look: P.look,
        blessing: P.blessing || null, powerCd: P.powerCd, deaths: P.deaths, known: [...UI.known] },
      pieces: BUILD.pieces.map((p) => ({ u: p.uid, id: p.id, p: [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)], r: +p.yaw.toFixed(4), hp: Math.round(p.hp), d: pieceData(p) })),
      removed: [...NAT.removed], picked: [...NAT.picked], rockHp: [...NAT.rockHp],
      terrain: packMap(W.mods, true), paint: packMap(W.paintMods, false),
      drops: DROPS.slice(-300).map((d) => ({ id: d.st.id, n: d.st.n, q: d.st.q, du: d.st.dur, p: [+d.x.toFixed(2), +d.y.toFixed(2), +d.z.toFixed(2)] })),
      graves: GRAVES.map((g) => ({ p: [g.x, g.y, g.z], inv: g.inv.toJSON(), day: g.day })),
      events: EVENTS.save(), explored: HUD.explored ? b64(HUD.explored) : null,
    };
  }
  function pieceData(p) {
    const d = Object.assign({}, p.data);
    if (d.inv) d.inv = d.inv.toJSON();
    return d;
  }
  function save() {
    if (G.state !== 'play') return false;
    try { localStorage.setItem(KEY, JSON.stringify(serialize())); G.lastSave = G.time; return true; }
    catch (e) { HUD.msg('Could not save in this browser. Export your world from the pause menu.', 'bad'); return false; }
  }
  function load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function has() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  // ---------- applying a save (called during world start-up) ----------
  function applyWorld(s) {
    W.mods = unpackMap(s.terrain, true);
    for (const [k, v] of W.mods) W.H[k] = v;
    W.paintMods = unpackMap(s.paint, false);
    for (const [k, v] of W.paintMods) W.paint[k] = v;
    NAT.removed = new Set(s.removed || []);
    NAT.picked = new Map(s.picked || []);
    NAT.rockHp = new Map(s.rockHp || []);
    EVENTS.load(s.events);
    if (s.explored) HUD.explored = unb64(s.explored);
  }
  function applyRest(s) {
    const P = PLAYER, sp = s.player;
    P.pos.fromArray(sp.pos); P.yaw = sp.yaw; CAM.yaw = sp.yaw;
    P.inv = Inventory.from(sp.inv);
    for (const k in P.eq) P.eq[k] = null;
    for (const k in sp.eq) { const st = P.inv.slots[sp.eq[k]]; if (st) { P.eq[k] = st; st.eq = true; } }
    P.inv.slots.forEach((st) => { if (st && st.eq && !Object.values(P.eq).includes(st)) st.eq = false; });
    P.food = sp.food || []; P.skills = sp.skills || {}; P.status = sp.status || {};
    for (const k in P.status) if (P.status[k].t === null) P.status[k].t = Infinity;
    P.spawn = sp.spawn; P.name = sp.name; P.look = sp.look || P.look; P.blessing = sp.blessing; P.powerCd = sp.powerCd || 0; P.deaths = sp.deaths || 0;
    for (const k of sp.known || []) UI.known.add(k);
    P.hp = Math.min(sp.hp, 999); P.st = sp.st;
    for (const o of s.pieces || []) {
      if (!PIECES[o.id]) continue;
      const data = o.d || {};
      if (data.inv) data.inv = Inventory.from(data.inv);
      BUILD.add(o.id, o.p[0], o.p[1], o.p[2], o.r, { uid: o.u, hp: o.hp, data });
    }
    BUILD.updateSupport();
    for (const d of s.drops || []) if (ITEMS[d.id]) { const st = newStack(d.id, d.n, d.q, d.du); const dr = dropStack(st, d.p[0], d.p[1], d.p[2]); dr.vx = dr.vz = dr.vy = 0; }
    for (const g of s.graves || []) SURV.addGrave(g.p[0], g.p[1], g.p[2], Inventory.from(g.inv), g.day);
    G.time = s.time || 0;
  }
  function exportFile() {
    save();
    const blob = new Blob([JSON.stringify(serialize())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tokoyo-' + (PLAYER.name || 'world').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-day' + SKY.day + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    HUD.msg('World exported.');
  }
  function importFile(f) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const o = JSON.parse(rd.result);
        if (!o || o.v !== 1 || !o.player) throw new Error('not a Tokoyo save');
        localStorage.setItem(KEY, JSON.stringify(o));
        location.reload();
      } catch (e) { HUD.msg('That file is not a Tokoyo save.', 'bad'); }
    };
    rd.readAsText(f);
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  addEventListener('pagehide', () => save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  return { save, load, has, applyWorld, applyRest, exportFile, importFile, wipe, serialize };
})();
