// Tidebound: UI boxes, the bottom dialog (UI.say), menus (UI.choose, UI.yesno), the quantity picker (UI.number) and
// the full-screen flash. Each one is a non-opaque scene pushed on Scenes; it pops itself before resolving, except
// a keepOpen dialog, which stays drawn until the next say, UI.closeDialog() or a menu/picker closes over it.
// Top-level names: UI.

const UI = (() => {
  const BOX_X = 4, BOX_Y = 132, BOX_W = 312, BOX_H = 44;
  const TEXT_X = BOX_X + 8, TEXT_W = 296;
  const SPEED = { slow: 30, mid: 60, fast: 120 };
  const CURSOR = '▶', MORE = '▼';

  function snd(name) {
    try { if (typeof Sound !== 'undefined') Sound.play(name); } catch (_) {}
  }
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  // GBA-style frame: 2-tone blue with a light inner line on white; light edge around a dark interior.
  // The four outer corner pixels are cut so the frame reads as rounded.
  function box(g, x, y, w, h, style = 'white') {
    if (style === 'dark') {
      rect(g, x, y, w, h, '#f8f8f8');
      rect(g, x + 1, y + 1, w - 2, h - 2, '#5878a8');
      rect(g, x + 2, y + 2, w - 4, h - 4, '#283848');
    } else {
      rect(g, x, y, w, h, '#384870');
      rect(g, x + 1, y + 1, w - 2, h - 2, '#5878a8');
      rect(g, x + 2, y + 2, w - 4, h - 4, '#c8d8f0');
      rect(g, x + 3, y + 3, w - 6, h - 6, '#f8f8f8');
    }
    g.clearRect(x, y, 1, 1);
    g.clearRect(x + w - 1, y, 1, 1);
    g.clearRect(x, y + h - 1, 1, 1);
    g.clearRect(x + w - 1, y + h - 1, 1, 1);
  }

  function cursor(g, x, y) {
    drawText(g, CURSOR, x, y, '#d03030', null);
  }

  // ---- scene stack helpers ----
  function findTop(name) {
    for (let i = Scenes.stack.length - 1; i >= 0; i--) if (Scenes.stack[i].name === name) return Scenes.stack[i];
    return null;
  }
  // resolve and remove a scene (idempotent)
  function dismiss(sc) {
    sc.done = true;
    Scenes.pop(sc);
    if (sc.res) sc.res();
  }

  // split text into pages: array items and '\f' each start a new box; long pages wrap into 2-line pages
  function paginate(input) {
    const items = Array.isArray(input) ? input : [input];
    const out = [];
    for (const item of items) {
      for (const seg of String(item == null ? '' : item).split('\f')) {
        const s = seg.replace(/\{P\}/g, G.name).replace(/\{R\}/g, G.rival);
        const lines = wrapText(s, TEXT_W);
        for (let i = 0; i < lines.length; i += 2) {
          const pl = lines.slice(i, i + 2);
          out.push({ lines: pl, len: pl.reduce((a, l) => a + l.length, 0) });
        }
      }
    }
    if (!out.length) out.push({ lines: [''], len: 0 });
    return out;
  }
  function charsPerSecond() {
    return SPEED[(G.options && G.options.text) || 'mid'] || SPEED.mid;
  }
  // the visible part of a page: the first `count` characters, line by line
  function visibleLines(pg, count) {
    let rem = Math.floor(count);
    return pg.lines.map((ln) => {
      const take = Math.max(0, Math.min(ln.length, rem));
      rem -= take;
      return ln.slice(0, take);
    });
  }

  // ---- dialog (UI.say) ----
  function makeDialog(input, opts, res) {
    const sc = {
      name: 'dialog', opaque: false, done: false, kept: false, res,
      pages: paginate(input), pi: 0, pos: 0, wt: 0, t: 0, opts: opts || {},
      update(dt) {
        if (sc.done) return;
        sc.t += dt;
        const pg = sc.pages[sc.pi];
        const last = sc.pi === sc.pages.length - 1;
        const o = sc.opts;
        if (sc.pos < pg.len) {
          if (DBG.autoText) sc.pos = pg.len;
          else {
            const rate = charsPerSecond() * (Input.held('a') || Input.held('b') ? 4 : 1);
            sc.pos = Math.min(pg.len, sc.pos + rate * dt);
          }
          // a press while printing shows the whole page at once
          if (Input.pressed('a') || Input.pressed('b')) { sc.pos = pg.len; Input.clear(); }
          if (sc.pos < pg.len) return;
        }
        sc.wt += dt;
        if (last && o.keepOpen) { finish(true); return; }
        if (last && o.noWait) { finish(false); return; }
        if (DBG.autoText) { advance(false); return; }
        if (o.auto != null) {
          if (sc.wt >= o.auto) advance(false);
          return;
        }
        if (o.noWait) {                 // intermediate pages of a noWait say move on by themselves
          if (sc.wt >= 0.8) advance(false);
          return;
        }
        if (Input.pressed('a') || Input.pressed('b')) { Input.clear(); advance(true); }
      },
      draw(g) {
        box(g, BOX_X, BOX_Y, BOX_W, BOX_H, 'white');
        const pg = sc.pages[sc.pi];
        visibleLines(pg, sc.pos).forEach((ln, i) => {
          if (ln) drawText(g, ln, TEXT_X, BOX_Y + 10 + i * 14);
        });
        const last = sc.pi === sc.pages.length - 1;
        const waiting = sc.pos >= pg.len && !sc.opts.auto && !(last && (sc.opts.keepOpen || sc.opts.noWait));
        if (waiting && !DBG.autoText && Math.floor(sc.t * 2) % 2 === 0) {
          drawText(g, MORE, BOX_X + BOX_W - 14, BOX_Y + BOX_H - 10);
        }
      },
    };
    function advance(byPress) {
      if (sc.pi < sc.pages.length - 1) {
        sc.pi++; sc.pos = 0; sc.wt = 0;
        if (byPress) snd('select');
        return;
      }
      if (byPress) snd('select');
      finish(false);
    }
    function finish(keep) {
      if (sc.done) return;
      Input.clear();
      sc.kept = !!keep;
      if (keep) { sc.done = true; sc.res(); }
      else dismiss(sc);
    }
    return sc;
  }

  function say(text, opts = {}) {
    closeDialog();
    return new Promise((resolve) => {
      Scenes.push(makeDialog(text, opts, resolve));
    });
  }

  // remove every dialog box (keepOpen or a say still running)
  function closeDialog() {
    for (const s of Scenes.stack.slice()) if (s.name === 'dialog') dismiss(s);
  }

  // ---- menus ----
  function choose(options, opts = {}) {
    const items = options.map((o) => String(o));
    const n = items.length;
    if (!n) return Promise.resolve(-1);
    const tw = Math.max(...items.map((t) => textWidth(t)));
    const w = opts.w || Math.max(32, tw + 22);
    const h = n * 12 + 8;
    const x = opts.x != null ? opts.x : Math.max(0, 316 - w);
    const y = opts.y != null ? opts.y : Math.max(0, 130 - h);
    return new Promise((resolve) => {
      let sel = clamp(opts.start || 0, 0, n - 1);
      const sc = {
        name: 'choose', opaque: false, done: false, res: resolve,
        update() {
          if (sc.done) return;
          if (Input.repeat('up')) sel = (sel - 1 + n) % n;
          if (Input.repeat('down')) sel = (sel + 1) % n;
          if (Input.pressed('a')) { Input.clear(); snd('select'); pick(sel); }
          else if (opts.cancel && Input.pressed('b')) { Input.clear(); snd('cancel'); pick(-1); }
        },
        draw(g) {
          box(g, x, y, w, h, 'white');
          items.forEach((t, i) => drawText(g, t, x + 14, y + 5 + i * 12));
          cursor(g, x + 6, y + 5 + sel * 12);
        },
      };
      function pick(i) {
        if (sc.done) return;
        sc.done = true;
        Scenes.pop(sc);
        resolve(i);
      }
      sc.pick = pick;
      Scenes.push(sc);
    });
  }

  async function yesno(question) {
    if (question != null) await say(question, { keepOpen: true });
    const i = await choose(['YES', 'NO'], { cancel: true });
    return i === 0;
  }

  // quantity picker: up/down ±1, left/right ±10, A confirms, B returns 0
  function number(max, opts = {}) {
    if (!(max >= 1)) return Promise.resolve(0);
    const price = opts.price || 0;
    return new Promise((resolve) => {
      let n = clamp(opts.start || 1, 1, max);
      const lines = price ? 2 : 1;
      const label = () => '×' + String(n).padStart(2, '0');
      const priceText = () => '$' + price * n;
      const tw = () => Math.max(textWidth(label()), price ? textWidth(priceText()) : 0);
      const w = Math.max(40, tw() + 18);
      const h = 8 + lines * 12;
      const x = opts.x != null ? opts.x : Math.max(0, 316 - w);
      const y = opts.y != null ? opts.y : Math.max(0, 130 - h);
      const sc = {
        name: 'number', opaque: false, done: false,
        update() {
          if (sc.done) return;
          if (Input.repeat('up')) n = clamp(n + 1, 1, max);
          if (Input.repeat('down')) n = clamp(n - 1, 1, max);
          if (Input.repeat('right')) n = clamp(n + 10, 1, max);
          if (Input.repeat('left')) n = clamp(n - 10, 1, max);
          if (Input.pressed('a')) { Input.clear(); snd('select'); done(n); }
          else if (Input.pressed('b')) { Input.clear(); snd('cancel'); done(0); }
        },
        draw(g) {
          box(g, x, y, w, h, 'white');
          drawText(g, label(), x + Math.floor((w - textWidth(label())) / 2), y + 5);
          if (price) drawText(g, priceText(), x + Math.floor((w - textWidth(priceText())) / 2), y + 17);
        },
      };
      function done(v) {
        if (sc.done) return;
        sc.done = true;
        Scenes.pop(sc);
        resolve(v);
      }
      Scenes.push(sc);
    });
  }

  // full-screen flash of `color` (about 0.9 alpha, then fading out over the second half); resolves when done
  function flash(color = '#ffffff', sec = 0.25) {
    return new Promise((resolve) => {
      let t = 0;
      const sc = {
        name: 'flash', opaque: false,
        update(dt) {
          t += dt;
          if (t >= sec) { Scenes.pop(sc); resolve(); }
        },
        draw(g) {
          const half = sec / 2;
          const a = t < half ? 0.9 : 0.9 * Math.max(0, 1 - (t - half) / Math.max(1e-6, half));
          if (a <= 0) return;
          g.globalAlpha = a;
          g.fillStyle = color;
          g.fillRect(0, 0, W, H);
          g.globalAlpha = 1;
        },
      };
      Scenes.push(sc);
    });
  }

  // ---- debug helpers ----
  DBG.dialogText = () => {
    const s = findTop('dialog');
    if (!s) return null;
    const pg = s.pages[s.pi];
    return visibleLines(pg, s.pos).join('\n');
  };
  DBG.choose = (i) => {
    const s = findTop('choose');
    if (!s || !s.pick) return false;
    s.pick(i);
    return true;
  };

  return {
    box,
    cursor,
    say,
    choose,
    yesno,
    number,
    flash,
    closeDialog,
  };
})();
