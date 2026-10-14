// Signal Front — boot, title attract map, save/load, main loop and the #debug test hook

function saveGame() {
  if (!S || S.over || S.demo) return;
  const skip = new Set(['firstEvents', 'anim', 'flash', 'vhp', '_tw', '_twv']);
  try { storeSet('save', JSON.parse(JSON.stringify(S, (k, v) => (skip.has(k) ? undefined : v)))); } catch (e) { /* ignore */ }
}
function loadGame() {
  const d = storeGet('save', null);
  if (!d) return;
  S = d; S.ver = 1;
  enterPlay();
  if (isHumanTurn()) { G.mode = 'idle'; playSong(FACTIONS[S.turn].id); hudRefresh(); }
  else runAI();
}
function enterPlay() {
  clearSel();
  FX.length = 0;
  R.insets.top = innerWidth <= 640 ? 52 : 56;
  R.insets.bottom = innerWidth <= 640 ? 64 : 52;
  R.userZoom = false;
  setState('play');
  fitZoom(true);
  const hq = S.tiles.findIndex((t) => t.k === 'hq' && t.o === humanSide());
  centerOn(hq % S.w, (hq / S.w) | 0, true);
  R.humanCam = { x: R.cam.x, y: R.cam.y };
  hudRefresh();
}
function startGame(opts) {
  storeDel('save');
  newGame(opts);
  enterPlay();
  beginTurn(S.firstEvents);
}

// Title screen: a quiet battlefield drifting behind the logo.
function toTitle() {
  G.mode = 'off';
  const demo = newGame({ map: 'twinrivers', coP: 'kade', coE: 'strann' });
  demo.demo = true;
  const place = [['crawler', 0, 3, 4], ['strider', 0, 5, 6], ['spark', 0, 2, 7], ['wraith', 0, 6, 3], ['mallet', 0, 4, 9], ['razorwing', 0, 7, 8], ['watchpost', 0, 3, 10],
    ['rifle', 1, 13, 7], ['tank', 1, 14, 5], ['fpv', 1, 12, 4], ['howitzer', 1, 16, 8], ['gunship', 1, 11, 9], ['heavy', 1, 15, 3], ['kite', 1, 10, 2]];
  for (const [t, s, x, y] of place) demo.units.push(mkUnit(demo, t, s, x, y));
  bump(demo);
  R.insets.top = 0; R.insets.bottom = 0;
  R.userZoom = false;
  fitZoom(true);
  R.cam.x = 0; R.cam.y = 0; R.camTo = null;
  clampCam();
  R.titleDrift = 0;
  setState('title');
  refreshTitle();
  playSong('title');
}

let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
  lastT = t;
  if (S && S.demo && document.body.dataset.state !== 'play') {
    R.titleDrift += dt;
    const vw = viewW() / R.zoom, mw = S.w * T;
    if (mw > vw) R.cam.x = (Math.sin(R.titleDrift * 0.08) * 0.5 + 0.5) * (mw - vw);
  }
  render(dt);
  requestAnimationFrame(loop);
}

function boot() {
  renderInit();
  inputInit();
  uiInit();
  TIME.speed = storeGet('speed', 1);
  toTitle();
  requestAnimationFrame(loop);
  // first gesture unlocks audio
  window.addEventListener('pointerdown', () => audioInit(), { once: true });
  if (DEBUG) {
    window.SF = {
      get S() { return S; },
      rules: { newGame, mkUnit, reach, pathTo, trapCheck, commitMove, strike, removeDead, doCapture, doJoin, doLoad, doDrop, dropTiles, doBuild, startTurn, endTurn, checkVictory, canSee, visMap, calcDmg, forecast, activatePower, canPower, powerCost, unitAt, stopKind, targetsFrom, supplyAround, bump },
      api: { TIME, G, R, tileToScreen, aiNext, aiContext, evalUnit, targetsFrom, forecast, reach, posScore, goalField, threatAt, UNITS, canSee, endTurn, perform },
      start(o = {}) { startGame({ map: 'crossfire', coP: 'kade', coE: 'volsk', ...o }); },
      reveal() { R.reveal = !R.reveal; },
      place(t, s, x, y, hp = 100) { const u = mkUnit(S, t, s, x, y); u.hp = hp; S.units.push(u); S.sides[s].ever = true; bump(S); hudRefresh(); return u; },
      meter(side, v) { S.sides[side].meter = v; hudRefresh(); },
      // AI vs AI, no animation: returns { winner, day, how }
      async sim(o = {}, maxDays = 40) {
        TIME.fast = true;
        newGame({ map: 'crossfire', coP: 'kade', coE: 'volsk', allAI: true, ...o });
        enterPlay();
        let guard = 0;
        while (maxDays > 0 && !S.over && S.day <= maxDays && guard++ < 10000) {
          let n = 0;
          while (!S.over && n++ < 400) { const a = aiNext(S, S.turn); if (a.kind === 'end') break; await perform(a); checkVictory(S); }
          if (S.over) break;
          endTurn(S); checkVictory(S);
        }
        TIME.fast = false;
        return { winner: S.winner, day: S.day, how: S.how, units: [0, 1].map((p) => S.units.filter((u) => u.s === p).length),
          props: [0, 1].map((p) => propCount(S, p)), stats: S.sides.map((s) => s.stats) };
      },
      gallery() {
        const c = mkCanvas(16 * 14 * 4, 16 * 4 * 4 + 40), x = c.getContext('2d');
        x.imageSmoothingEnabled = false; x.fillStyle = '#7cc858'; x.fillRect(0, 0, c.width, c.height);
        let i = 0;
        for (const side of [0, 1]) for (const t of FACTIONS[side].roster) {
          x.drawImage(unitSprite(t, side, 0), (i % 14) * 64, Math.floor(i / 14) * 64, 64, 64); i++;
        }
        i = 28;
        for (const k of ['city', 'base', 'airport', 'port', 'hq', 'tower']) for (const o of [-1, 0, 1]) { x.drawImage(propSprite(k, o), (i % 14) * 64, Math.floor(i / 14) * 64, 64, 80); i++; }
        document.body.appendChild(c);
        c.style.cssText = 'position:fixed;left:0;top:0;z-index:99;image-rendering:pixelated';
        return c;
      },
    };
  }
}
boot();
