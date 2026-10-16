// Nullwake — the in-run HUD (DOM): experience bar, clock, kills, gold, weapon and passive slots, boss bar.
const HUD = (() => {
  const el = {}, last = {};
  function init() {
    for (const id of ['xp', 'lv', 'clock', 'kills', 'gold', 'wslots', 'pslots', 'boss', 'hurt']) el[id] = $('#' + id);
    el.xpFill = el.xp.firstElementChild; el.bossName = el.boss.querySelector('.n'); el.bossFill = el.boss.querySelector('i');
    $('#icKill').innerHTML = `<img src="${icon('kill')}" style="width:100%;height:100%">`;
    $('#icGold').innerHTML = `<img src="${icon('gold')}" style="width:100%;height:100%">`;
  }
  const set = (k, v, fn) => { if (last[k] !== v) { last[k] = v; fn(v); } };
  function slots() {
    const w = P.weapons.map((x) => { const d = WEAPONS[x.id]; return `<div class="slot${d.from ? ' evo' : ''}" title="${esc(d.name)}"><img src="${icon(x.id)}" alt=""><span>${d.from ? '★' : x.lvl >= MAX_WLV ? 'M' : x.lvl}</span></div>`; });
    const p = P.passives.map((x) => `<div class="slot" title="${esc(PASSIVES[x.id].name)}"><img src="${icon(x.id)}" alt=""><span>${x.lvl >= PASSIVES[x.id].max ? 'M' : x.lvl}</span></div>`);
    while (w.length < MAX_SLOTS) w.push('<div class="slot empty"></div>');
    while (p.length < MAX_SLOTS) p.push('<div class="slot empty"></div>');
    el.wslots.innerHTML = w.join(''); el.pslots.innerHTML = p.join('');
  }
  function update() {
    if (!G.stage || G.state === 'title' || G.state === 'boot') return;
    el.xpFill.style.width = (P.xp / P.next * 100).toFixed(1) + '%';
    set('lv', P.lvl, (v) => { el.lv.textContent = 'LV ' + v; });
    set('clock', Math.floor(G.t), (v) => { el.clock.textContent = fmtTime(v); });
    set('final', !!G.finalBoss, (v) => el.clock.classList.toggle('final', v));
    set('kills', G.kills, (v) => { el.kills.textContent = fmtNum(v); });
    set('gold', G.gold, (v) => { el.gold.textContent = fmtNum(v); });
    if (G.invDirty) { G.invDirty = false; slots(); }
    const b = G.boss && !G.boss.dead ? G.boss : null;
    set('boss', b ? b.id : 0, () => { el.boss.hidden = !b; if (b) el.bossName.textContent = b.def.name; });
    if (b) el.bossFill.style.width = Math.max(0, b.hp / b.maxHp * 100).toFixed(1) + '%';
    const low = P.st && P.hp / P.st.maxHp < 0.3 && !P.dead ? 0.25 + 0.15 * Math.sin(G.t * 6) : 0;
    el.hurt.style.opacity = Math.max(G.hurtFlash, low).toFixed(2);
  }
  return { init, update, reset() { for (const k in last) delete last[k]; G.invDirty = true; } };
})();
