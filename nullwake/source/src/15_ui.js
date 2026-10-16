// Nullwake — menus: title, pilot and stage select, hangar, codex, options, level-up, chests, pause and results.
// Every screen is HTML in #menu; [data-nav] elements take keyboard/gamepad focus, [data-back] answers Esc / B.
const UI = (() => {
  const menu = $('#menu');
  let keyFn = null, lvChoices = null, optFrom = 'title';
  const sel = { pilot: 'ryn', stage: 's1' };
  const IMG = {};
  const portraitURL = (id) => IMG['p' + id] || (IMG['p' + id] = portrait(id, 96).toDataURL());
  const goldLine = () => `<div class="goldline"><img src="${icon('gold')}" alt="">${fmtNum(SAVE.gold)}</div>`;
  const backBtn = (act, label = 'Back') => `<button class="btn sm" data-nav data-back data-act="${act}">${label}</button>`;

  function show(html, o = {}) {
    menu.innerHTML = html; keyFn = o.key || null; $('#banner').classList.remove('on');
    for (const b of menu.querySelectorAll('[data-act]')) b.addEventListener('click', () => { AUDIO.init(); const f = ACT[b.dataset.act]; if (f) f(b.dataset.arg, b); });
    const first = (o.focus && menu.querySelector(o.focus)) || INPUT.navItems()[0];
    if (first) INPUT.focusEl(first);
    menu.scrollTop = 0;
  }
  function close() { menu.innerHTML = ''; keyFn = null; }
  function key(code) { return keyFn ? !!keyFn(code) : false; }

  // ---- title flow ----
  function title() {
    setState('title'); G.stage = null; AUDIO.title(); HUD.reset();
    show(`<div class="screen">
      <h1>NULLWAKE</h1>
      <div class="tag">A star collapsed and the swarm poured out of its wake. Your ship is gone; your suit's auto-weapons are not.
        <b>Survive fifteen minutes</b>, then face what comes for you.</div>
      ${goldLine()}
      <div class="stack">
        <button class="btn primary" data-nav data-act="launch">Launch</button>
        <button class="btn" data-nav data-act="hangar">Hangar</button>
        <button class="btn" data-nav data-act="codex">Codex</button>
        <button class="btn" data-nav data-act="options" data-arg="title">Options</button>
      </div>
      <div class="hint">Move with <kbd>WASD</kbd> or the arrow keys, a gamepad stick, or drag anywhere on a touch screen.<br>
        Your weapons fire by themselves. Collect crystals to level up; max a weapon and own its partner to evolve it from a chest.</div>
    </div>`);
  }
  function pilots() {
    if (!SAVE.pilots[sel.pilot]) sel.pilot = 'ryn';
    const cards = Object.entries(PILOTS).map(([id, p]) => {
      const owned = SAVE.pilots[id], w = WEAPONS[p.weapon];
      return `<button class="card${owned ? '' : ' locked'}${sel.pilot === id ? ' sel' : ''}" data-nav data-act="pilot" data-arg="${id}">
        <div class="top"><img class="portrait" src="${portraitURL(id)}" alt=""><div><div class="nm">${esc(p.name)}</div><div class="lv">${esc(p.role)}</div></div></div>
        <div class="d"><img src="${icon(p.weapon)}" alt="" style="width:24px;height:24px;vertical-align:middle;margin-right:4px">${esc(w.name)}</div>
        <div class="x">${esc(p.bt)}</div><div class="x"><i>${esc(p.story)}</i></div>
        ${owned ? '' : `<div class="cost">${SAVE.gold >= p.cost ? 'Unlock for' : 'Locked:'} ${p.cost} gold</div>`}
      </button>`;
    }).join('');
    show(`<div class="screen"><h2>Choose a pilot</h2>${goldLine()}<div class="cards">${cards}</div><div class="row-btns">${backBtn('title')}</div></div>`, { focus: `[data-arg="${sel.pilot}"]` });
  }
  function stagePreview(st) {
    if (IMG['s' + st.id]) return IMG['s' + st.id];
    const c = makeCanvas(320, 160), x = c.getContext('2d'), tiles = buildTiles(st.look);
    x.fillStyle = LOOKS[st.look].bg; x.fillRect(0, 0, 320, 160);
    if (st.look === 'drift') x.drawImage(WORLD.far, 0, 0, 400, 400);
    x.drawImage(tiles[0], 0, 0, 400, 400);
    const roster = [...new Set(st.waves.flatMap((w) => w[3].split(' ')))], rnd = artRng(st.id.charCodeAt(1) * 13);
    roster.forEach((id, i) => { const s = enemySprite(id), fr = s.frames[i & 1], sz = s.half * 2 * 1.3; x.drawImage(rnd() > 0.5 ? fr.n : fr.f, 20 + i * 290 / roster.length + rnd() * 10, 40 + rnd() * 70, sz, sz); });
    const g = x.createLinearGradient(0, 100, 0, 160); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = g; x.fillRect(0, 0, 320, 160);
    return (IMG['s' + st.id] = c.toDataURL());
  }
  function stages() {
    const cards = STAGES.map((st) => {
      const open = !st.needs || SAVE.cleared[st.needs], best = SAVE.best[st.id], won = SAVE.cleared[st.id];
      const status = !open ? `Clear ${STAGE[st.needs].name} to unlock` : won ? `Cleared ×${won} · most kills ${fmtNum(best.kills)}` : best ? `Best ${fmtTime(best.t)} · level ${best.lvl}` : 'Not yet attempted';
      return `<button class="card stagecard${open ? '' : ' locked'}" data-nav data-act="stage" data-arg="${st.id}">
        <img src="${stagePreview(st)}" alt="" style="width:100%;aspect-ratio:2/1;display:block;border-radius:5px;margin-bottom:10px;${open ? '' : 'filter:grayscale(1) brightness(.5)'}">
        <div class="nm">${esc(st.name)}</div><div class="lv">${esc(st.sub)}</div><div class="d">${esc(st.d)}</div>
        <div class="x">${status}${st.goldMul > 1 ? ` · gold ×${st.goldMul}` : ''}</div></button>`;
    }).join('');
    show(`<div class="screen"><h2>Choose a stage</h2><div class="sub">Pilot: ${esc(PILOTS[sel.pilot].name)}</div><div class="cards">${cards}</div>
      <div class="row-btns">${backBtn('launch')}</div></div>`, { focus: `[data-arg="${sel.stage}"]` });
  }
  function hangar(focusId) {
    const cards = META.map((m) => {
      const r = SAVE.meta[m.id] || 0, maxed = r >= m.max, cost = metaCost(m, r);
      return `<button class="card" data-nav data-act="buy" data-arg="${m.id}">
        <div class="top"><img class="ic" src="${icon(m.icon)}" alt=""><div><div class="nm">${esc(m.name)}</div><div class="lv">Rank ${r} / ${m.max}</div></div></div>
        <div class="d">${esc(m.d)}</div><div class="pips">${Array.from({ length: m.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</div>
        <div class="cost${!maxed && cost > SAVE.gold ? ' bad' : ''}">${maxed ? 'Maxed' : cost + ' gold'}</div></button>`;
    }).join('');
    show(`<div class="screen"><h2>Hangar</h2><div class="sub">Permanent upgrades, paid for with the gold you carry home.</div>${goldLine()}
      <div class="cards scroll">${cards}</div><div class="row-btns">${backBtn('title')}<button class="btn sm" data-nav data-act="refund">Refund all</button></div></div>`,
    { focus: focusId ? `[data-arg="${focusId}"]` : null });
  }
  function codex() {
    const rows = BASE_WEAPONS.map((id) => {
      const d = WEAPONS[id], ev = WEAPONS[d.evo], p = PASSIVES[d.needs], seen = SAVE.seen[d.evo];
      return `<div class="evo-row"><img src="${icon(id)}" alt=""><span class="plus">+</span><img src="${icon(d.needs)}" alt=""><span class="plus">=</span>
        <img src="${seen ? icon(d.evo) : icon('kill')}" alt="" style="${seen ? '' : 'opacity:.25'}">
        <span class="nm"><b>${esc(d.name)}</b> (max level) with <b>${esc(p.name)}</b> → ${seen ? `<span class="gold">${esc(ev.name)}</span>: ${esc(ev.d)}` : '<span class="unk">??? Open a chest to find out.</span>'}</span></div>`;
    }).join('');
    const ws = BASE_WEAPONS.map((id) => `<div class="evo-row"><img src="${icon(id)}" alt=""><span class="nm"><b>${esc(WEAPONS[id].name)}</b>: ${esc(WEAPONS[id].d)}</span></div>`).join('');
    const ps = Object.keys(PASSIVES).map((id) => `<div class="evo-row"><img src="${icon(id)}" alt=""><span class="nm"><b>${esc(PASSIVES[id].name)}</b>: ${esc(PASSIVES[id].d)} Max level ${PASSIVES[id].max}.</span></div>`).join('');
    show(`<div class="screen"><h2>Codex</h2><div class="sub">Max a weapon, hold its partner passive, then open a chest dropped by an elite or boss.</div>
      <div class="codex scroll" tabindex="-1"><h3>Evolutions</h3>${rows}<h3>Weapons</h3>${ws}<h3>Systems</h3>${ps}</div>
      <div class="row-btns">${backBtn('title')}</div></div>`);
  }
  function options(from, focusArg) {
    if (from) optFrom = from;
    const o = SAVE.opts, pct = (v) => Math.round(v * 100) + '%';
    show(`<div class="screen"><h2>Options</h2><div style="height:12px"></div>
      <div class="opt"><span>Sound effects</span><span><button class="btn sm" data-nav data-act="opt" data-arg="sfx-">−</button> <b style="display:inline-block;width:4ch">${pct(o.sfx)}</b> <button class="btn sm" data-nav data-act="opt" data-arg="sfx+">+</button></span></div>
      <div class="opt"><span>Music</span><span><button class="btn sm" data-nav data-act="opt" data-arg="mus-">−</button> <b style="display:inline-block;width:4ch">${pct(o.music)}</b> <button class="btn sm" data-nav data-act="opt" data-arg="mus+">+</button></span></div>
      <div class="opt"><span>Screen shake</span><button class="btn sm" data-nav data-act="opt" data-arg="shake">${o.shake ? 'On' : 'Off'}</button></div>
      <div class="opt"><span>Damage numbers</span><button class="btn sm" data-nav data-act="opt" data-arg="nums">${o.nums ? 'On' : 'Off'}</button></div>
      <div class="opt"><span>Full screen</span><button class="btn sm" data-nav data-act="opt" data-arg="full">${document.fullscreenElement ? 'Exit' : 'Enter'}</button></div>
      ${optFrom === 'title' ? '<div class="opt"><span>Progress</span><button class="btn sm" data-nav data-act="opt" data-arg="reset">Reset save</button></div>' : ''}
      <div class="row-btns">${backBtn('optback')}</div></div>`, { focus: focusArg ? `[data-arg="${focusArg}"]` : null });
  }

  // ---- in-run screens ----
  function levelUp() {
    setState('levelup'); INPUT.endStick();
    lvChoices = rollChoices();
    if (G.bot) { pick(botPick(lvChoices)); return; }
    sfx('level'); renderLevelUp();
  }
  function renderLevelUp() {
    const cards = lvChoices.map((c, i) => {
      const f = choiceInfo(c);
      return `<button class="card" data-nav data-act="pick" data-arg="${i}"><span class="k">${i + 1}</span>
        <div class="top"><img class="ic" src="${f.icon}" alt=""><div><div class="nm">${esc(f.name)}</div><div class="lv">${f.lv === 'NEW' ? '<span class="new">NEW</span>' : esc(f.lv)}</div></div></div>
        <div class="d">${esc(f.d)}</div>${f.x ? `<div class="x">${esc(f.x)}</div>` : ''}</button>`;
    }).join('');
    const extra = (P.rerolls ? `<button class="btn sm" data-nav data-act="reroll">Reroll (${P.rerolls}) <span class="dim">R</span></button>` : '')
      + (P.skips ? `<button class="btn sm" data-nav data-act="skip">Skip (${P.skips}) <span class="dim">K</span></button>` : '');
    show(`<div class="screen levelup"><h2 class="lvl">Level ${P.lvl - G.pendingLv + 1}</h2><div class="sub">Choose an upgrade</div>
      <div class="cards">${cards}</div>${extra ? `<div class="row-btns">${extra}</div>` : ''}</div>`, {
      key: (code) => {
        const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
        if (n !== undefined && lvChoices[n]) { pick(n); return true; }
        if (code === 'KeyR' && P.rerolls) { ACT.reroll(); return true; }
        if (code === 'KeyK' && P.skips) { ACT.skip(); return true; }
        return false;
      },
    });
  }
  function pick(i) {
    const c = lvChoices[i]; if (!c) return;
    applyChoice(c); G.pendingLv--;
    if (!G.bot) { sfx('pickup'); FX.ring(P.x, P.y, 50, '#5ef0ff', 0.4, 4); }
    if (G.pendingLv > 0) levelUp(); else resume();
  }
  function chest(kind) {
    setState('chest'); INPUT.endStick();
    const res = openChest(kind);
    if (G.bot) { G.botLog && G.botLog.push(res); resume(); return; }
    sfx(res.evo ? 'evolve' : 'chest');
    const items = res.items.map((o, i) => {
      if (o.kind === 'gold') return `<div class="card" style="animation-delay:${i * 0.25}s"><div class="top"><img class="ic" src="${icon('gold')}" alt=""><div><div class="nm">${o.n} gold</div><div class="lv">Nothing left to upgrade</div></div></div></div>`;
      const d = WEAPONS[o.id] || PASSIVES[o.id];
      if (o.kind === 'evo') return `<div class="card evo" style="animation-delay:${i * 0.25}s"><div class="top"><img class="ic" src="${icon(o.id)}" alt=""><div><div class="nm gold">${esc(d.name)}</div><div class="lv">${esc(WEAPONS[o.from].name)} evolved</div></div></div><div class="d">${esc(d.d)}</div></div>`;
      return `<div class="card" style="animation-delay:${i * 0.25}s"><div class="top"><img class="ic" src="${icon(o.id)}" alt=""><div><div class="nm">${esc(d.name)}</div><div class="lv">Level ${o.lvl}</div></div></div></div>`;
    }).join('');
    show(`<div class="screen"><h2 class="${res.evo ? 'evo' : 'lvl'}">${res.evo ? 'Evolution!' : 'Supply cache'}</h2>
      <div class="goldline"><img src="${icon('gold')}" alt="">+${res.gold}</div><div class="loot">${items}</div>
      <div class="row-btns"><button class="btn primary" data-nav data-back data-act="resume">Continue</button></div></div>`);
  }
  function pause() {
    if (G.state !== 'play') return;
    setState('pause'); INPUT.endStick();
    const build = P.weapons.map((w) => { const d = WEAPONS[w.id]; return `<tr><td><img src="${icon(w.id)}" alt="">${esc(d.name)}</td><td>${d.from ? '★' : 'Lv ' + w.lvl}</td><td>${d.evo && !d.from ? `<span class="dim">+ ${esc(PASSIVES[d.needs].name)}${passiveOf(d.needs) ? ' ✓' : ''}</span>` : ''}</td></tr>`; }).join('')
      + P.passives.map((p) => `<tr><td><img src="${icon(p.id)}" alt="">${esc(PASSIVES[p.id].name)}</td><td>Lv ${p.lvl}</td><td></td></tr>`).join('');
    show(`<div class="screen"><h2>Paused</h2><div class="sub">${esc(G.stage.name)} · ${esc(PILOTS[G.pilotId].name)}</div>
      <div class="stats"><div>Time<b>${fmtTime(G.t)}</b></div><div>Level<b>${P.lvl}</b></div><div>Kills<b>${fmtNum(G.kills)}</b></div><div>Gold<b>${fmtNum(G.gold)}</b></div></div>
      <table class="res"><tr><th>Loadout</th><th></th><th>Evolves with</th></tr>${build}</table>
      <div class="row-btns"><button class="btn primary" data-nav data-back data-act="resume">Resume</button><button class="btn" data-nav data-act="options" data-arg="pause">Options</button><button class="btn" data-nav data-act="quit">Quit run</button></div></div>`,
    { key: (code) => { if (code === 'KeyP') { resume(); return true; } return false; } });
  }
  function resume() { close(); setState('play'); }
  function results(won) {
    setState('over'); INPUT.endStick(); AUDIO.title();
    const rows = P.weapons.slice().sort((a, b) => b.dealt - a.dealt).map((w) => { const d = WEAPONS[w.id]; return `<tr><td><img src="${icon(w.id)}" alt="">${esc(d.name)}</td><td>${d.from ? '★' : w.lvl}</td><td>${fmtNum(w.dealt)}</td><td>${fmtNum(w.kills)}</td></tr>`; }).join('');
    const next = won && STAGES.find((s) => s.needs === G.stageId && SAVE.cleared[G.stageId] === 1);
    const head = won ? 'Stage clear' : G.quit ? 'Run abandoned' : 'Signal lost';
    show(`<div class="screen"><h2 class="${won ? 'evo' : ''}" style="${won ? '' : 'color:var(--bad)'}">${head}</h2>
      <div class="sub">${esc(G.stage.name)} · ${esc(PILOTS[G.pilotId].name)}</div>
      <div class="stats"><div>Survived<b>${fmtTime(G.t)}</b></div><div>Level<b>${P.lvl}</b></div><div>Kills<b>${fmtNum(G.kills)}</b></div><div>Gold<b class="gold">+${fmtNum(G.gold + G.bonus)}</b></div></div>
      ${G.bonus ? `<div class="sub">Includes a clear bonus of ${G.bonus} gold.</div>` : ''}
      ${next ? `<div class="sub good">New stage unlocked: ${esc(next.name)}</div>` : ''}
      <table class="res"><tr><th>Weapon</th><th>Lv</th><th>Damage</th><th>Kills</th></tr>${rows}</table>
      <div class="row-btns"><button class="btn primary" data-nav data-act="retry">Again</button><button class="btn" data-nav data-act="launch">Change pilot</button><button class="btn" data-nav data-act="hangar">Hangar</button><button class="btn" data-nav data-back data-act="title">Title</button></div></div>`);
  }

  // ---- actions ----
  const ACT = {
    title() { sfx('back'); title(); },
    launch() { sfx('ui'); pilots(); },
    hangar() { sfx('ui'); hangar(); },
    codex() { sfx('ui'); codex(); },
    options(arg) { sfx('ui'); options(arg); },
    optback() { sfx('back'); if (optFrom === 'pause') { setState('play'); pause(); } else title(); },
    pilot(id) {
      if (SAVE.pilots[id]) { sfx('ui'); sel.pilot = id; SAVE.lastPilot = id; stages(); return; }
      const p = PILOTS[id];
      if (SAVE.gold >= p.cost) { SAVE.gold -= p.cost; SAVE.pilots[id] = 1; sel.pilot = id; writeSave(); sfx('buy'); pilots(); } else sfx('deny');
    },
    stage(id) {
      const st = STAGE[id]; if (st.needs && !SAVE.cleared[st.needs]) { sfx('deny'); return; }
      sel.stage = id; sfx('ui'); startRun({ stage: id, pilot: sel.pilot });
    },
    buy(id) {
      const m = META.find((x) => x.id === id), r = SAVE.meta[id] || 0, cost = metaCost(m, r);
      if (r >= m.max || SAVE.gold < cost) { sfx('deny'); return; }
      SAVE.gold -= cost; SAVE.meta[id] = r + 1; writeSave(); sfx('buy'); hangar(id);
    },
    refund() {
      let back = 0; for (const m of META) { const r = SAVE.meta[m.id] || 0; for (let i = 0; i < r; i++) back += metaCost(m, i); }
      if (!back) { sfx('deny'); return; }
      SAVE.gold += back; SAVE.meta = {}; writeSave(); sfx('back'); hangar();
    },
    opt(a, b) {
      const o = SAVE.opts;
      if (a === 'sfx-') o.sfx = Math.max(0, Math.round((o.sfx - 0.1) * 10) / 10); else if (a === 'sfx+') o.sfx = Math.min(1, Math.round((o.sfx + 0.1) * 10) / 10);
      else if (a === 'mus-') o.music = Math.max(0, Math.round((o.music - 0.1) * 10) / 10); else if (a === 'mus+') o.music = Math.min(1, Math.round((o.music + 0.1) * 10) / 10);
      else if (a === 'shake') o.shake = o.shake ? 0 : 1; else if (a === 'nums') o.nums = o.nums ? 0 : 1;
      else if (a === 'full') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } catch (e) { /* not allowed */ } setTimeout(() => options(null, 'full'), 200); return; }
      else if (a === 'reset') {
        if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Really erase?'; sfx('deny'); return; }
        SAVE = defaultSave(); writeSave(); sfx('back'); title(); return;
      }
      writeSave(); AUDIO.setVol(); sfx('ui'); options(null, a);
    },
    pick(i) { pick(+i); },
    reroll() { if (!P.rerolls) return; P.rerolls--; lvChoices = rollChoices(); sfx('ui'); renderLevelUp(); },
    skip() { if (!P.skips) return; P.skips--; G.pendingLv--; sfx('back'); if (G.pendingLv > 0) levelUp(); else resume(); },
    resume() { sfx('ui'); resume(); },
    quit(a, b) {
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Really quit?'; return; }
      G.quit = true; endRun(false);
    },
    retry() { sfx('ui'); startRun({ stage: G.stageId, pilot: G.pilotId }); },
  };
  return { title, pilots, stages, hangar, codex, options, levelUp, chest, pause, resume, results, close, key, pick, sel, get choices() { return lvChoices; } };
})();
