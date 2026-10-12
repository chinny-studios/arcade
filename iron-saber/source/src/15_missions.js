// Iron Saber — optional sorties across the map, objective markers, and the hooks that react to
// kills, collapses and lost suits.

const MISSIONS = [
  {
    id: 'outpost', name: 'DESERT STORM', site: SITES.outpost, trigger: 650,
    brief: 'A Dominion outpost is dug in at the Kesra Desert. Destroy its garrison.',
    setup(M) {
      const O = SITES.outpost;
      for (const [dx, dz] of [[-60, 0], [50, -20], [0, 90], [-110, -80]]) M.enemies.push(spawnEnemy(O.x + dx, O.z + dz, { mission: M, yaw: -Math.PI / 2, hold: true, alertR: 600 }));
    },
    progress(M) { const n = M.enemies.filter((s) => s.dead || s.gone).length; return [`DESTROY THE GARRISON  ${n}/${M.enemies.length}`, n >= M.enemies.length]; },
  },
  {
    id: 'relay', name: 'SILENCE THE RELAY', site: SITES.relay, trigger: 700,
    brief: 'The Dominion relay on the Greyspine ridge is directing their drops. Bring the tower down.',
    setup(M) {
      const R = SITES.relay;
      for (const [dx, dz] of [[-70, 40], [60, -50]]) M.enemies.push(spawnEnemy(R.x + dx, R.z + dz, { mission: M, hold: true, alertR: 650 }));
    },
    progress(M) { return [RELAY.down ? 'RELAY DESTROYED' : 'DESTROY THE RELAY TOWER', RELAY.down]; },
    marker() { return { x: RELAY.x0 + 6, y: RELAY.y1 - 20, z: RELAY.z0 + 6, label: 'RELAY' }; },
  },
  {
    id: 'forest', name: 'ELDWOOD AMBUSH', site: SITES.clearing, trigger: 380,
    brief: 'A camp is hidden in the Eldwood. Sweep it, and expect them to be waiting.',
    setup(M) {
      const C = SITES.clearing;
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.4; M.enemies.push(spawnEnemy(C.x + Math.cos(a) * 220, C.z + Math.sin(a) * 220, { mission: M, alertR: 900 })); }
      say('AMBUSH! DOMINION SUITS IN THE TREES', 2.6, 'warn');
    },
    progress(M) { const n = M.enemies.filter((s) => s.dead || s.gone).length; return [`ELIMINATE THE AMBUSH  ${n}/${M.enemies.length}`, n >= M.enemies.length]; },
  },
  {
    id: 'city', name: 'DEFEND NEW HAVEN', site: { x: 0, z: 0, r: 0 }, trigger: 900, needs: 2,
    brief: 'Dominion drop pods are falling on New Haven, led by their ace. Hold the city.',
    setup(M) { M.wave = 0; M.waveT = 2; },
    tick(M, dt) {
      const alive = M.enemies.filter((s) => !s.dead && !s.gone).length;
      if (alive === 0) M.waveT -= dt;
      if (M.waveT <= 0 && M.wave < 2) {
        M.wave++; M.waveT = 4;
        const n = M.wave === 1 ? 4 : 3;
        for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = rr(120, 420); M.enemies.push(spawnEnemy(Math.cos(a) * r, Math.sin(a) * r, { mission: M, drop: 420 + i * 40, alertR: 1500 })); }
        if (M.wave === 2) { M.enemies.push(spawnEnemy(0, -300, { mission: M, ace: true, drop: 560, name: 'ACE "CRIMSON"', alertR: 2000 })); say('THE DOMINION ACE IS INBOUND', 3, 'warn'); }
        else say('DROP PODS INCOMING · WAVE ' + M.wave, 2.4, 'warn');
      }
    },
    progress(M) { const n = M.enemies.filter((s) => s.dead || s.gone).length; return [`WAVE ${Math.max(1, M.wave)}/2 · DOWNED ${n}/${M.wave >= 2 ? 8 : M.wave ? 4 : 0}`, M.wave >= 2 && n >= M.enemies.length && M.enemies.length >= 8]; },
  },
];
for (const M of MISSIONS) Object.assign(M, { state: 'available', enemies: [], t: 0 });
let ACTIVE = null;
function missionsDone() { return MISSIONS.filter((m) => m.state === 'done').length; }
function updateMissions(dt) {
  const s = PILOT.state === 'suit' ? PILOT.inSuit : null;
  const me = playerPos(_v3);
  if (!ACTIVE && s) {
    for (const M of MISSIONS) {
      if (M.state !== 'available' || (M.needs && missionsDone() < M.needs)) continue;
      if (Math.hypot(me.x - M.site.x, me.z - M.site.z) < M.trigger) { startMission(M); break; }
    }
  }
  if (ACTIVE) {
    const M = ACTIVE;
    M.t += dt;
    if (M.tick) M.tick(M, dt);
    const [text, done] = M.progress(M);
    setObjective(M.name, text);
    if (done && M.t > 1) {
      M.state = 'done'; ACTIVE = null;
      setObjective('', '');
      say('SORTIE COMPLETE · ' + M.name, 3.2, 'win');
      beep(880, 0.15, 0.08); beep(1320, 0.25, 0.08, 0.15);
      const left = MISSIONS.filter((m) => m.state !== 'done');
      if (!left.length) setTimeout(() => say('ALL SORTIES COMPLETE · NEW HAVEN IS SAFE', 5, 'win'), 3500);
      else if (left.some((m) => m.needs && missionsDone() === m.needs)) setTimeout(() => say('NEW SORTIE: DEFEND NEW HAVEN', 3.5), 3500);
    }
  }
}
function startMission(M) {
  ACTIVE = M; M.state = 'active'; M.t = 0; M.enemies = [];
  M.setup(M);
  say('SORTIE · ' + M.name, 2.8);
  hint(M.brief, 6);
}
function objectiveMarkers(all) {
  const out = [];
  for (const M of MISSIONS) {
    if (M.state === 'done' || (M.needs && missionsDone() < M.needs)) continue;
    if (ACTIVE && ACTIVE !== M && !all) continue;
    const m = M.marker ? M.marker() : { x: M.site.x, y: groundY(M.site.x, M.site.z) + 30, z: M.site.z, label: M.name };
    if (!m.label) m.label = M.name;
    out.push(m);
  }
  return out;
}

// ---------- event hooks ----------
function onEnemyDown(s) {
  const by = s.lastHitBy;
  if (by && by.pilot) { say(s.T.id === 'ace' ? 'DOMINION ACE DOWN!' : 'TARGET DOWN', 1.4, s.T.id === 'ace' ? 'win' : ''); }
}
function onBuildingDown(b) {
  if (b.name && (b.team || b === RELAY)) say(b.name.toUpperCase() + ' DESTROYED', 2);
  else if (b.name === 'Coalition HQ') say('COALITION HQ HAS FALLEN', 3, 'warn');
}
const HOME_SUITS = {};
function onSuitGone(s) {
  if (s.team !== 0) return;
  if (PILOT.lastSuit === s) PILOT.lastSuit = null;
  RESPAWNS.push({ type: s.type, t: s.respawnT || 40, home: s.home });
}
const RESPAWNS = [];
function updateRespawns(dt) {
  for (let i = RESPAWNS.length - 1; i >= 0; i--) {
    const r = RESPAWNS[i];
    r.t -= dt;
    if (r.t > 0) continue;
    RESPAWNS.splice(i, 1);
    respawnSuitAtHome(r);
  }
}
function respawnSuitAtHome(r) {
  if (!r) return null;
  const home = r.home || HOME_SUITS[r.type].home;
  const s = createSuit(r.type, home.x, home.z, home.yaw, { parked: true });
  s.home = home;
  HOME_SUITS[r.type] = s;
  for (let i = RESPAWNS.length - 1; i >= 0; i--) if (RESPAWNS[i].type === r.type) RESPAWNS.splice(i, 1);
  if (state === 'play') say('REPLACEMENT ' + s.T.name + ' DELIVERED', 2.2);
  return s;
}
function onFirstBoard(s) {
  if (FIRST.board) return;
  FIRST.board = true;
  setTimeout(() => hint('Sorties are marked ◇ on your HUD and map (M). Press V to switch views, E to climb out.', 7), 4200);
}
const FIRST = { board: false };
