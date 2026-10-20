// Tidebound: script helpers for map scripts (items, monsters, walking, emotes, trainers, healing, shops, credits)
// and the debug hooks that drive the overworld (DBG.walk, DBG.step, DBG.where). Only `Script` is a top-level name.

const Script = (() => {
  const WALK = 0.25;
  const LETTER_DIR = { u: 'up', d: 'down', l: 'left', r: 'right' };
  const monC = {};

  function sfx(n) { try { if (typeof Sound !== 'undefined' && Sound.play) Sound.play(n); } catch (_) {} }
  function bgm(t) { try { if (typeof Music !== 'undefined' && Music.play) return Music.play(t); } catch (_) {} return null; }

  // 'player', an npc id, an npc object, or an object with x/y/dir
  function who(w) {
    if (w == null || w === 'player') return World.player;
    if (typeof w === 'string') return World.npc(w);
    return w;
  }
  function dirTo(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 0 && dy === 0) return 'down';
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }
  function monCanvas(sp) {
    if (!(sp in monC)) {
      try { monC[sp] = (typeof Sprites !== 'undefined' && Sprites.mon) ? Sprites.mon(sp) : null; } catch (_) { monC[sp] = null; }
    }
    return monC[sp];
  }

  // Bag item, with the "received" and "put in the BAG" messages. Key items skip the bag message.
  async function give(item, n = 1) {
    const it = (typeof ITEMS !== 'undefined' && ITEMS[item]) || { name: String(item).toUpperCase(), kind: 'medicine' };
    bagAdd(item, n);
    const name = it.name;
    if (it.kind === 'key') {
      sfx('keyitem');
      await UI.say('{P} received ' + name + '!');
      return;
    }
    sfx('item');
    const first = n > 1 ? '{P} found ' + n + ' ' + name + 's!' : '{P} received a ' + name + '!';
    const bagName = n > 1 ? name + 's' : name;
    await UI.say([first, '{P} put the ' + bagName + ' in the BAG.']);
  }

  // A new monster for the player. Nicknames are never asked for.
  async function giveMon(sp, lv) {
    const m = Mon.create(sp, lv);
    const where = Mon.addToParty(m);
    Mon.markCaught(sp);
    const nm = Mon.species(m).name;
    sfx('item');
    const msgs = ['{P} received ' + nm + '!'];
    if (where === 'box') msgs.push(nm + " was sent to someone's PC.");
    await UI.say(msgs);
    return m;
  }

  // Heal jingle, full heal, and remember this spot as the place to return to after a blackout.
  async function heal() {
    await Promise.resolve(bgm('heal'));
    Mon.healParty();
    const p = World.player;
    G.lastHeal = { map: G.map, x: p.x, y: p.y };
  }

  // Walk step by step. path: letters u d l r, optionally with a repeat count ('uurrd' or 'u3r2').
  async function walk(w, path) {
    const o = who(w);
    if (!o) return;
    const steps = [];
    const re = /([udlr])(\d*)/gi;
    const s = String(path || '').toLowerCase();
    let m;
    while ((m = re.exec(s))) {
      const n = m[2] ? parseInt(m[2], 10) : 1;
      for (let i = 0; i < n; i++) steps.push(LETTER_DIR[m[1]]);
    }
    const isPlayer = o === World.player;
    if (isPlayer) o.scripted = true;
    try {
      for (const d of steps) {
        const [dx, dy] = DIRS[d];
        World._move(o, o.x + dx, o.y + dy, WALK, false, d);
        await wait(WALK + 1 / 60);
        o.moving = null;
        o.frame = 0;
      }
    } finally {
      if (isPlayer) o.scripted = false;
    }
  }

  function face(w, dir) {
    const o = who(w);
    if (!o) return;
    o.dir = dir;
    if (o === World.player) G.dir = dir;
  }
  function faceEachOther(npc) {
    const n = who(npc), p = World.player;
    if (!n) return;
    n.dir = dirTo(n, p);
    p.dir = dirTo(p, n);
    G.dir = p.dir;
  }

  // Runtime add/remove of an npc. A hidden npc is neither drawn nor solid.
  function show(id) { const n = World.npc(id); if (n) n.hidden = false; }
  function hide(id) { const n = World.npc(id); if (n) { n.hidden = true; n.moving = null; } }

  // Speech bubble above a character for 0.6 s.
  async function emote(w, ch = '!') {
    const o = who(w);
    if (!o) return;
    o.emote = ch;
    await wait(0.6);
    o.emote = null;
  }

  // Battle a trainer npc. A win sets the defeated flag; a loss blacks out.
  async function trainerBattle(npc) {
    const t = npc.trainer;
    const m0 = World.map;
    const T = Object.assign({}, t, {
      party: (t.party || []).map((p) => p.slice()),
      sprite: npc.sprite || t.sprite,
    });
    const r = await Battle.trainer(T);
    if (r === 'win') {
      setFlag('tr_' + t.id);
      World.refresh();
    } else {
      await World.blackout();
      return 'lose';
    }
    if (World.map === m0 && m0 && m0.music) bgm(m0.music);
    return 'win';
  }

  function mart(items) { return Menus.mart(items); }
  function pc() { return Menus.pc(); }

  // Scrolling credits on an opaque scene. Resolves after the player presses A at THE END.
  function credits() {
    return new Promise((resolve) => {
      const LINES = [
        'TIDEBOUND', '', "A Chinny's Arcade game", '', 'Made with Claude', '',
        'Thanks for walking the coast', 'Coral, Maren and the Tidelings',
        'Captain Brine, Marina and the people of Lumen', '', 'Everything here is original.', '',
        'THE END ...for now',
      ];
      const LH = 16;
      const sEnd = H + (LINES.length - 1) * LH - (H / 2 - 4);
      const SPECIES = ['sproutle', 'embit', 'splishel', 'lumarine'];
      const st = { t: 0, scroll: 0, waitA: false, done: false };
      const scene = {
        name: 'credits',
        opaque: true,
        update(dt) {
          st.t += dt;
          if (st.waitA && Input.pressed('a')) finish();
        },
        draw(g) {
          g.fillStyle = '#101838';
          g.fillRect(0, 0, W, H);
          g.fillStyle = '#5870a0';
          for (let i = 0; i < 40; i++) {
            if ((i + Math.floor(st.t * 3)) % 5) g.fillRect((i * 97 + 13) % W, (i * 53 + 7) % H, 1, 1);
          }
          for (let i = 0; i < SPECIES.length; i++) {
            const c = monCanvas(SPECIES[i]);
            if (!c) continue;
            const x = ((i * 90 + st.t * 14) % (W + 64)) - 32;
            const y = 4 + (i % 2) * 130 + Math.sin(st.t * 1.3 + i) * 4;
            g.drawImage(c, Math.round(x), Math.round(y), 40, 40);
          }
          for (let i = 0; i < LINES.length; i++) {
            const s = LINES[i];
            if (!s) continue;
            const y = Math.round(H + i * LH - st.scroll);
            if (y < -LH || y > H) continue;
            drawText(g, s, Math.round((W - textWidth(s)) / 2), y, '#ffffff', '#000814');
          }
          if (st.waitA && Math.floor(st.t * 2) % 2 === 0) {
            drawText(g, 'PRESS A', Math.round((W - textWidth('PRESS A')) / 2), H - 14, '#ffe070', '#000814');
          }
        },
      };
      function finish() {
        if (st.done) return;
        st.done = true;
        Scenes.pop(scene);
        const m = World.map;
        if (m && m.music) bgm(m.music);
        resolve();
      }
      Scenes.push(scene);
      bgm('ending');
      tween(sEnd / 20, (t) => { st.scroll = sEnd * t; }).then(() => { st.waitA = true; });
    });
  }

  return {
    give, giveMon, heal, walk, face, faceEachOther, show, hide, emote, trainerBattle, mart, pc, credits,
    say: (...a) => UI.say(...a),
    choose: (...a) => UI.choose(...a),
  };
})();

// ---------- debug hooks (window.TB under #debug) ----------
DBG.world = World;
DBG.maps = Maps;
DBG.walk = (path) => Script.walk('player', path);
// Holds a direction for a little over one step per tile, n times.
DBG.step = async (dir, n = 1) => {
  for (let i = 0; i < n; i++) {
    Input.hold(dir, true);
    await DBG.sim(0.45);
    Input.hold(dir, false);
    await DBG.sim(0.05);
  }
};
DBG.where = () => ({ map: G.map, x: G.x, y: G.y, dir: G.dir });
DBG.noEncounters = false;
