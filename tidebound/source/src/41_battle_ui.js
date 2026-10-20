// Tidebound: battle scene drawing and menus (Battle.ui). The scene is opaque and owns the action and move menus
// (they are drawn and driven from its update, so the battle keeps its state while a menu is open). Animations are
// in the second half of this file. The logic lives in 40_battle.js.

(function () {
  const B = Battle;
  const ui = B.ui;
  const sprCache = new Map();
  const portraitCache = new Map();

  const monSprite = (sp, back) => {
    const k = sp + (back ? '|b' : '|f');
    if (!sprCache.has(k)) sprCache.set(k, Sprites.mon(sp, back));
    return sprCache.get(k);
  };
  function portraitFor(S) {
    if (!S.t) return null;
    let n = S.t.sprite || (S.t.cls === 'RIVAL' ? 'rival' : String(S.t.cls).toLowerCase());
    if (!Chars.names.includes(n)) n = 'youngster';
    if (!portraitCache.has(n)) portraitCache.set(n, Chars.portrait(n));
    return portraitCache.get(n);
  }

  // Positions (320x180 layout): enemy sprite bottom ~92, player back sprite bottom ~132.
  const E_X = 200, E_Y = 28, P_X = 52, P_Y = 68;
  const ENEMY_PLATE = { x: 232, y: 84, rx: 50, ry: 12 };
  const PLAYER_PLATE = { x: 84, y: 128, rx: 58, ry: 13 };
  const STATUS_COLOR = { psn: '#a040a0', brn: '#f08030', par: '#c8a810', slp: '#7880a0' };
  const MOVE_ROW_Y = [137, 146, 155, 164];
  const ACTION_LABELS = ['FIGHT', 'BAG', 'TIDELINGS', 'RUN'];

  const hpColor = (frac) => (frac > 0.5 ? '#38c060' : frac > 0.2 ? '#f0c020' : '#e04040');
  const cave = () => !!(World.map && World.map.id && String(World.map.id).includes('cave'));

  // ---------- backdrop ----------
  function drawBackdrop(g) {
    const grad = g.createLinearGradient(0, 0, 0, 110);
    if (cave()) {
      grad.addColorStop(0, '#2c2c36'); grad.addColorStop(1, '#5a5a68');
      g.fillStyle = grad; g.fillRect(0, 0, W, 110);
      const ground = g.createLinearGradient(0, 110, 0, H);
      ground.addColorStop(0, '#6e6e7c'); ground.addColorStop(1, '#4a4a56');
      g.fillStyle = ground; g.fillRect(0, 110, W, H - 110);
      g.fillStyle = '#7e7e8c';
      for (let i = 0; i < 14; i++) g.fillRect((i * 37) % W, 112 + ((i * 13) % 50), 6, 2);
    } else {
      grad.addColorStop(0, '#8fd0f0'); grad.addColorStop(1, '#e6f8ff');
      g.fillStyle = grad; g.fillRect(0, 0, W, 110);
      const ground = g.createLinearGradient(0, 100, 0, H);
      ground.addColorStop(0, '#bfe596'); ground.addColorStop(1, '#8cc860');
      g.fillStyle = ground; g.fillRect(0, 100, W, H - 100);
    }
  }

  function ellipse(g, p, fill, edge) {
    g.beginPath();
    g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    g.fillStyle = edge; g.fill();
    g.beginPath();
    g.ellipse(p.x, p.y - 1, p.rx - 2, p.ry - 2, 0, 0, Math.PI * 2);
    g.fillStyle = fill; g.fill();
  }

  function drawPlatforms(g) {
    const c = cave();
    ellipse(g, ENEMY_PLATE, c ? '#8a8a98' : '#a8d880', c ? '#505060' : '#6aa050');
    ellipse(g, PLAYER_PLATE, c ? '#8a8a98' : '#a8d880', c ? '#505060' : '#6aa050');
  }

  // ---------- sprites and boxes ----------
  function drawSide(g, side, x, y, back) {
    if (!side || !side.mon || side.hide) return;
    const sp = side.mon.sp;
    const k = side.shrink == null ? 1 : side.shrink;
    const img = monSprite(sp, back);
    const px = x + side.ox + (side.lx || 0), py = y + side.oy;
    g.save();
    g.globalAlpha = side.alpha == null ? 1 : side.alpha;
    if (k < 1) {
      if (k <= 0) { g.restore(); return; }
      g.drawImage(img, px + 32 * (1 - k), py + 64 * (1 - k), 64 * k, 64 * k);
    } else {
      g.drawImage(img, px, py);
    }
    if (side.flash > 0) {
      g.globalAlpha = side.flash * 0.7;
      g.fillStyle = '#ff3030';
      g.fillRect(px + 16, py + 8, 32, 48);
    }
    g.restore();
  }

  function statusBadge(g, m, x, y) {
    if (!m.status) return;
    const label = Mon.statusName(m.status);
    const w = textWidth(label) + 4;
    g.fillStyle = STATUS_COLOR[m.status] || '#808080';
    g.fillRect(x, y, w, 9);
    drawText(g, label, x + 2, y + 1, '#ffffff', 'rgba(0,0,0,0)');
  }

  function drawBar(g, x, y, w, h, frac, color) {
    g.fillStyle = '#404040'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = '#f8f8f8'; g.fillRect(x, y, w, h);
    g.fillStyle = color; g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
  }

  // Enemy box: top-left, name, level, status, HP bar.
  function drawEnemyBox(g, side) {
    const m = side.mon, max = Mon.maxhp(m);
    UI.box(g, 8, 10, 128, 34, 'white');
    drawText(g, Mon.name(m).toUpperCase(), 14, 15);
    statusBadge(g, m, 14 + textWidth(Mon.name(m).toUpperCase()) + 6, 14);
    drawText(g, 'Lv' + m.lv, 100, 15);
    drawText(g, 'HP', 14, 27);
    drawBar(g, 32, 28, 96, 4, side.shown / max, hpColor(side.shown / max));
  }

  // Player box: bottom-right, numbers and blue XP bar.
  function drawPlayerBox(g, side) {
    const m = side.mon, max = Mon.maxhp(m);
    if (side.xpShown === undefined) { side.xpShown = B.xpFrac(m); }
    UI.box(g, 176, 92, 136, 38, 'white');
    drawText(g, Mon.name(m).toUpperCase(), 182, 97);
    statusBadge(g, m, 182 + textWidth(Mon.name(m).toUpperCase()) + 6, 96);
    drawText(g, 'Lv' + m.lv, 280, 97);
    drawText(g, 'HP', 182, 108);
    drawBar(g, 200, 109, 104, 4, side.shown / max, hpColor(side.shown / max));
    drawText(g, side.shown + '/' + String(max).padStart(3, ' '), 228, 116);
    g.fillStyle = '#404040'; g.fillRect(182, 124, 124, 4);
    g.fillStyle = '#f8f8f8'; g.fillRect(183, 125, 122, 2);
    g.fillStyle = '#3870d8'; g.fillRect(183, 125, Math.round(122 * Math.max(0, Math.min(1, side.xpShown))), 2);
  }

  // Party balls for trainer battles, drawn under the enemy box.
  function drawBalls(g, S) {
    if (S.wild || !S.foes.length) return;
    S.foes.forEach((m, i) => {
      const x = 12 + i * 8, y = 48;
      g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2);
      if (m.hp <= 0) g.fillStyle = '#606060';
      else if (i <= S.ei) g.fillStyle = '#e04040';
      else g.fillStyle = '#f8f8f8';
      g.fill();
      g.strokeStyle = '#384870'; g.lineWidth = 1; g.stroke();
    });
  }

  function drawTrainer(g, S) {
    const pic = portraitFor(S);
    if (!pic) return;
    const x = E_X + (S.pox || 0);
    g.drawImage(pic, x, E_Y);
  }

  function drawBall(g, S) {
    const b = S.ball;
    if (!b || !b.visible) return;
    const y = b.y + (b.wob || 0);
    const x = b.x;
    g.fillStyle = '#384870'; g.fillRect(x - 4, y - 4, 9, 9);
    g.fillStyle = '#e04040'; g.fillRect(x - 3, y - 3, 7, 3);
    g.fillStyle = '#f8f8f8'; g.fillRect(x - 3, y, 7, 3);
    g.fillStyle = '#ffffff'; g.fillRect(x - 1, y - 1, 2, 2);
  }

  // ---------- particles (move effects, Battle.ui.attack) ----------
  function drawFx(g, S) {
    for (const p of S.fx) {
      if (p.u <= 0 || p.u >= 1) continue;
      const x = p.x0 + (p.x1 - p.x0) * p.u;
      const y = p.y0 + (p.y1 - p.y0) * p.u - Math.sin(p.u * Math.PI) * p.arc;
      g.fillStyle = p.color;
      switch (p.shape) {
        case 'leaf': g.fillRect(x, y, 3, 2); break;
        case 'spark': g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); break;
        case 'rock': g.fillRect(x, y, 3, 3); g.fillStyle = '#50483a'; g.fillRect(x + 2, y + 2, 1, 1); break;
        case 'bubble': g.strokeStyle = p.color; g.lineWidth = 1; g.strokeRect(x, y, 3, 3); break;
        case 'gust': g.fillRect(x, y, 4, 1); break;
        case 'slash': g.fillRect(x, y, 6, 1); break;
        case 'wave': {
          g.strokeStyle = p.color; g.lineWidth = 1;
          g.beginPath(); g.arc(p.x1, p.y1, 4 + 12 * p.u, -0.8, 0.8); g.stroke();
          break;
        }
        default: g.fillRect(x, y, 2, 2);
      }
    }
  }

  // ---------- menus ----------
  function drawActionMenu(g, S, m) {
    UI.box(g, 4, 132, 156, 44, 'white');
    const who = Mon.name(S.p.mon);
    const lines = wrapText('What will ' + who + ' do?', 140);
    lines.forEach((ln, i) => drawText(g, ln, 12, 141 + i * 12));
    UI.box(g, 164, 132, 152, 44, 'white');
    ACTION_LABELS.forEach((label, i) => {
      const col = i & 1, row = i >> 1;
      drawText(g, label, 180 + col * 68, 141 + row * 16);
    });
    const cx = 170 + (m.cur & 1) * 68, cy = 141 + (m.cur >> 1) * 16;
    UI.cursor(g, cx, cy - 1);
  }

  function drawMoveMenu(g, S, m) {
    const mon = S.p.mon;
    UI.box(g, 4, 132, 196, 44, 'white');
    mon.moves.forEach((mv, i) => {
      const info = MOVES[mv.id];
      drawText(g, info.name, 16, MOVE_ROW_Y[i] - 1);
    });
    if (m.cur >= mon.moves.length) m.cur = Math.max(0, mon.moves.length - 1);
    UI.cursor(g, 6, MOVE_ROW_Y[m.cur] - 1);
    UI.box(g, 204, 132, 112, 44, 'white');
    const mv = mon.moves[m.cur];
    if (mv) {
      const info = MOVES[mv.id];
      drawText(g, 'PP ' + mv.pp + '/' + info.pp, 212, 141);
      drawText(g, 'TYPE/' + info.type.toUpperCase(), 212, 157, TYPE_COLOR[info.type] || '#404040');
    }
  }

  // ---------- the scene ----------
  ui.scene = (S) => {
    S.fx = S.fx || [];
    S.pox = S.pox || 0;
    const scene = {
      name: 'battle',
      opaque: true,
      update(dt) {
        const m = S.menu;
        if (m) {
          if (m.kind === 'action') {
            if (Input.repeat('left') && (m.cur & 1)) m.cur--;
            if (Input.repeat('right') && !(m.cur & 1)) m.cur++;
            if (Input.repeat('up') && m.cur >= 2) m.cur -= 2;
            if (Input.repeat('down') && m.cur < 2) m.cur += 2;
            if (Input.pressed('a')) { S.menu = null; m.res(m.cur); }
          } else if (m.kind === 'move') {
            const n = S.p.mon.moves.length;
            if (Input.repeat('up') && m.cur > 0) m.cur--;
            if (Input.repeat('down') && m.cur < n - 1) m.cur++;
            if (Input.pressed('b')) { S.menu = null; m.res(-1); }
            else if (Input.pressed('a')) { S.menu = null; m.res(m.cur); }
          }
        }
        // low HP warning: a beep every half second while the player's mon is in the red
        const pm = S.p && S.p.mon;
        const low = pm && pm.hp > 0 && S.p.shown / Mon.maxhp(pm) <= 0.2;
        if (low) {
          S.beep = (S.beep || 0) - dt;
          if (S.beep <= 0) { Sound.play('lowhp'); S.beep = 0.5; }
        } else {
          S.beep = 0;
        }
      },
      draw(g) {
        drawBackdrop(g);
        drawPlatforms(g);
        if (S.portraitOn) drawTrainer(g, S);
        else if (S.e && S.e.mon) drawSide(g, S.e, E_X, E_Y, false);
        if ((S.e && S.e.mon) || S.portraitOn) drawBalls(g, S);
        drawBall(g, S);
        if (S.p && S.p.mon) drawSide(g, S.p, P_X, P_Y, true);
        if (S.e && S.e.mon && !S.portraitOn && !S.pox) drawEnemyBox(g, S.e);
        if (S.p && S.p.mon) drawPlayerBox(g, S.p);
        drawFx(g, S);
        if (S.menu && S.menu.kind === 'action') drawActionMenu(g, S, S.menu);
        if (S.menu && S.menu.kind === 'move') drawMoveMenu(g, S, S.menu);
      },
    };
    return scene;
  };

  // Action menu: resolves with 0 FIGHT, 1 BAG, 2 TIDELINGS, 3 RUN.
  ui.menu = (S) => new Promise((res) => { S.menu = { kind: 'action', cur: 0, res }; });

  // Move menu: resolves with the move slot, or -1 for B.
  ui.moveMenu = (S) => new Promise((res) => { S.menu = { kind: 'move', cur: 0, res }; });

  // ---------- transition ----------
  // GBA-style: a few white flashes, then black bars close in from the top and bottom.
  ui.transition = (S) => new Promise((res) => {
    if (DBG.fast) { res(); return; }
    const sc = {
      name: 'transition', opaque: false, t: 0,
      update(dt) {
        this.t += dt;
        if (this.t >= 0.8) { Scenes.pop(this); res(); }
      },
      draw(g) {
        const t = this.t;
        if (t < 0.4) {
          if (Math.floor(t * 12) % 2 === 0) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); }
          else { g.fillStyle = '#000000'; g.fillRect(0, 0, W, H); }
        } else {
          const h = Math.min(90, 90 * (t - 0.4) / 0.4);
          g.fillStyle = '#000000';
          g.fillRect(0, 0, W, h);
          g.fillRect(0, H - h, W, h);
        }
      },
    };
    Scenes.push(sc);
  });

})();

// Battle animations: hit effects, HP drain, faint, send out, portrait slide, catch throw, XP bar, stats box.
(function () {
  const B = Battle;
  const ui = B.ui;
  const fast = () => DBG.fast;

  // Move effects by type: [particle shape, colour]. Status moves send sound waves.
  const FX = {
    fire: ['ember', '#f08030'], water: ['bubble', '#6890f0'], grass: ['leaf', '#78c850'],
    electric: ['spark', '#f8d030'], rock: ['rock', '#b8a038'], ground: ['rock', '#c8a850'],
    flying: ['gust', '#c8d8ff'], bug: ['slash', '#a8b820'], poison: ['bubble', '#a040a0'], normal: ['slash', '#ffffff'],
  };
  const centerOf = (key) => (key === 'p' ? { x: 84, y: 98 } : { x: 232, y: 60 });

  // Particles fly from the attacker to the target over about half a second.
  function particles(S, ak, tk, shape, color, n) {
    const from = centerOf(ak), to = centerOf(tk);
    const list = [];
    for (let i = 0; i < n; i++) {
      const p = { shape, color, d: i * 0.05, u: 0, arc: shape === 'wave' ? 0 : 10 };
      if (shape === 'wave') {
        p.x0 = to.x; p.y0 = to.y; p.x1 = to.x; p.y1 = to.y;
      } else {
        p.x0 = from.x + R.float() * 8 - 4; p.y0 = from.y + R.float() * 8 - 4;
        p.x1 = to.x + R.float() * 12 - 6; p.y1 = to.y + R.float() * 12 - 6;
      }
      list.push(p);
    }
    S.fx = (S.fx || []).concat(list);
    const dur = 0.55;
    return tween(dur, (t) => {
      for (const p of list) p.u = Math.max(0, Math.min(1, (t * dur - p.d) / 0.3));
    }).then(() => { S.fx = S.fx.filter((p) => !list.includes(p)); });
  }

  // A physical contact move lunges the attacker forward and back.
  function lunge(side, dir) {
    return tween(0.2, (t) => { side.lx = dir * 12 * Math.sin(t * Math.PI); }).then(() => { side.lx = 0; });
  }

  // Blink three times (the target flickers).
  function blink(side) {
    if (fast()) return Promise.resolve();
    return tween(0.36, (t) => { side.hide = Math.floor(t * 6) % 2 === 1; }).then(() => { side.hide = false; });
  }

  // HP bar drains smoothly from what it shows to the monster's real HP.
  ui.drain = (side) => {
    const from = side.shown, to = side.mon.hp;
    if (fast() || from === to) { side.shown = to; return Promise.resolve(); }
    return tween(0.6, (t) => { side.shown = Math.round(lerp(from, to, t)); }).then(() => { side.shown = to; });
  };

  // One move's visual and sound. o: { dmg, eff, crit }. The defender's HP bar drains when damage was done.
  ui.attack = async (S, ak, dk, mv, o = {}) => {
    const a = S[ak], d = S[dk];
    const isStatus = mv.cat === 'status';
    const toSelf = isStatus && ((mv.stat && mv.stat.target === 'self') || mv.heal || (mv.status && mv.status.self));
    const tk = toSelf ? ak : dk;
    if (!fast() && !isStatus && mv.contact && o.dmg > 0) await lunge(a, ak === 'p' ? 1 : -1);
    if (!fast()) {
      const [shape, color] = isStatus ? ['wave', TYPE_COLOR[mv.type] || '#ffffff'] : (FX[mv.type] || FX.normal);
      await particles(S, ak, tk, shape, color, isStatus ? 1 : 6);
    }
    if (o.dmg > 0) {
      Sound.play(o.eff > 1 ? 'hitsuper' : (o.eff < 1 ? 'hitweak' : 'hit'));
      await blink(d);
      await ui.drain(d);
    }
  };

  // Faint: the sprite slides down out of view.
  ui.faint = (side) => {
    Sound.play('faint');
    if (fast()) { side.hide = true; return Promise.resolve(); }
    return tween(0.6, (t) => { side.oy = 60 * t; side.alpha = 1 - t; }).then(() => { side.hide = true; });
  };

  // Recall the player's mon (before a switch).
  ui.recall = (side) => {
    if (fast()) { side.hide = true; return Promise.resolve(); }
    return tween(0.4, (t) => { side.oy = 80 * t; side.alpha = 1 - t; }).then(() => { side.hide = true; });
  };

  // Send out: the enemy slides in from the right, the player's mon rises from below.
  ui.sendOut = (side) => {
    side.hide = false;
    side.alpha = 1;
    side.lx = 0;
    if (fast()) { side.ox = 0; side.oy = 0; return Promise.resolve(); }
    const enemy = side.key === 'e';
    if (enemy) side.ox = 120; else side.oy = 80;
    return tween(0.5, (t) => {
      const e = 1 - Math.pow(1 - t, 3);
      if (enemy) side.ox = 120 * (1 - e); else side.oy = 80 * (1 - e);
    }).then(() => { side.ox = 0; side.oy = 0; });
  };

  // Trainer portrait slides in on the enemy platform (on) or out to the right (off).
  ui.portrait = (S, on) => {
    if (on) S.portraitOn = true;
    if (fast()) {
      S.pox = 0;
      if (!on) S.portraitOn = false;
      return Promise.resolve();
    }
    const from = on ? 120 : 0, to = on ? 0 : 120;
    S.pox = from;
    return tween(0.5, (t) => {
      const e = 1 - Math.pow(1 - t, 3);
      S.pox = from + (to - from) * e;
    }).then(() => {
      if (!on) S.portraitOn = false;
      S.pox = 0;
    });
  };

  // Catch: the orb arcs to the foe, the foe shrinks into it with red flashes, the orb drops and shakes.
  // shakes: 0..3 shakes before it breaks, or 3 when caught. The enemy reappears when it breaks free.
  ui.throwBall = (S, item, shakes, caught) => {
    const e = S.e;
    if (fast()) { if (caught && e) e.hide = true; return Promise.resolve(); }
    const ball = { x: 84, y: 110, wob: 0, visible: true };
    S.ball = ball;
    Sound.play('throw');
    let p = tween(0.5, (t) => {
      ball.x = 84 + (232 - 84) * t;
      ball.y = 110 + (60 - 110) * t - Math.sin(Math.PI * t) * 40;
    });
    p = p.then(() => tween(0.4, (t) => {
      if (e) { e.shrink = 1 - t; e.flash = Math.floor(t * 8) % 2 ? 0.6 : 0; }
    })).then(() => {
      if (e) { e.flash = 0; }
      return tween(0.2, (t) => { ball.y = 60 + 26 * t; });
    });
    const n = caught ? 3 : shakes;
    for (let i = 0; i < n; i++) {
      p = p.then(() => {
        Sound.play('shake');
        return tween(0.5, (t) => { ball.wob = Math.sin(t * Math.PI * 4) * 4 * (1 - t); });
      }).then(() => { ball.wob = 0; return wait(0.2); });
    }
    return p.then(() => {
      ball.visible = false;
      if (caught) { if (e) e.hide = true; return null; }
      if (!e) return null;
      return tween(0.3, (t) => { e.shrink = t; }).then(() => { e.shrink = 1; e.flash = 0; });
    });
  };

  // XP bar: fills from `from` to `to`; on a level up it fills to the end, empties and fills again.
  ui.xpBar = (side, from, to, levelUp) => {
    if (fast()) { side.xpShown = to; return Promise.resolve(); }
    side.xpShown = from;
    const end = levelUp ? 1 : to;
    return tween(0.5, (t) => { side.xpShown = lerp(from, end, t); }).then(() => {
      if (!levelUp) return null;
      side.xpShown = 0;
      return tween(0.4, (t) => { side.xpShown = lerp(0, to, t); });
    });
  };

  // Stats box after a level up: page 1 shows the gains, page 2 the new totals. A or B turns the page.
  ui.statsBox = (m, oldS, newS) => {
    if (DBG.autoBattle || DBG.autoText) return wait(0.05);
    const rows = [['HP', 'hp'], ['Attack', 'atk'], ['Defense', 'def'], ['Sp. Atk', 'spa'], ['Sp. Def', 'spd'], ['Speed', 'spe']];
    return new Promise((res) => {
      const sc = {
        name: 'statsbox', opaque: false, page: 0,
        update() {
          if (Input.pressed('a') || Input.pressed('b')) {
            if (this.page === 0) this.page = 1;
            else { Scenes.pop(this); res(); }
          }
        },
        draw(g) {
          UI.box(g, 56, 14, 208, 130, 'white');
          drawText(g, Mon.name(m).toUpperCase() + ' Lv. ' + m.lv, 68, 24);
          rows.forEach(([label, k], i) => {
            const y = 42 + i * 14;
            drawText(g, label, 68, y);
            const val = this.page === 0 ? '+' + (newS[k] - oldS[k]) : String(newS[k]);
            drawText(g, val, 256 - textWidth(val), y);
          });
        },
      };
      Scenes.push(sc);
    });
  };
})();
