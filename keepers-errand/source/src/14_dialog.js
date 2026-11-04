// ---- dialog: a typewriter box with speaker names, voice blips and choices. Runs on simulation time. ----
const Dialog = {
  open: false, queue: [], cur: null, shown: 0, resolve: null, choice: null, sel: 0, auto: false, prevState: 'play',
  VOICES: {},   // speaker name -> pitch
  say(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    lines = lines.map((l) => {
      if (typeof l !== 'string') return l;
      const m = l.match(/^([^:]{1,24}):\s([\s\S]*)$/);
      return m ? { who: m[1], text: m[2] } : { who: '', text: l };
    });
    return new Promise((res) => {
      this.queue = lines; this.resolve = res; this.choice = null;
      this.begin();
      this.next();
    });
  },
  choose(prompt, options, who = '') {
    return new Promise((res) => {
      this.queue = []; this.resolve = res;
      this.begin();
      this.cur = { who, text: prompt }; this.shown = prompt.length;
      this.choice = options; this.sel = 0;
      this.render();
    });
  },
  begin() {
    if (!this.open) { this.prevState = G.state === 'dialog' ? 'play' : G.state; }
    this.open = true; G.state = 'dialog';
    $('#dlg').hidden = false;
    HUD.prompt(null);
  },
  next() {
    if (!this.queue.length) return this.close();
    this.cur = this.queue.shift(); this.shown = 0; this.blipT = 0;
    if (this.cur.fn) { this.cur.fn(); }
    this.render();
  },
  close(val) {
    this.open = false; $('#dlg').hidden = true; this.cur = null;
    G.state = this.prevState === 'dialog' ? 'play' : this.prevState;
    Input.consume();
    const r = this.resolve; this.resolve = null;
    if (r) r(val);
  },
  update(dt) {
    if (!this.open || !this.cur) return;
    const I = Input.pressed;
    if (this.choice) {
      if (I.up || I.left) { this.sel = (this.sel + this.choice.length - 1) % this.choice.length; Audio2.sfx('menu'); this.render(); }
      if (I.down || I.right) { this.sel = (this.sel + 1) % this.choice.length; Audio2.sfx('menu'); this.render(); }
      if (I.ok || I.action || I.use) { Audio2.sfx('select'); const v = this.sel; this.choice = null; this.close(v); }
      if (I.back && this.choice) { const v = this.choice.length - 1; this.choice = null; this.close(v); }
      return;
    }
    const full = this.cur.text.length;
    if (this.shown < full) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(full, this.shown + dt * 60);
      if (this.auto) this.shown = full;
      this.blipT -= dt;
      if (Math.floor(this.shown) > before && this.blipT <= 0 && /\w/.test(this.cur.text[before] || '')) { this.blipT = 0.07; Audio2.sfx('blip', this.voice(this.cur.who)); }
      this.render();
      if ((I.ok || I.action || I.use) && this.shown > 2) { this.shown = full; this.render(); }
    } else if (I.ok || I.action || I.use || this.auto) {
      Audio2.sfx('menu');
      this.next();
    }
  },
  voice(who) {
    if (!who) return 1;
    if (this.VOICES[who]) return this.VOICES[who];
    let h = 0; for (const c of who) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return (this.VOICES[who] = 0.7 + (h % 100) / 100 * 0.9);
  },
  render() {
    const c = this.cur; if (!c) return;
    $('#dlgWho').textContent = c.who || '';
    $('#dlgWho').hidden = !c.who;
    $('#dlgText').textContent = c.text.slice(0, Math.floor(this.shown));
    const ch = $('#dlgChoices');
    if (this.choice) {
      ch.hidden = false;
      ch.innerHTML = this.choice.map((o, i) => `<button data-i="${i}" class="${i === this.sel ? 'on' : ''}">${o}</button>`).join('');
      ch.querySelectorAll('button').forEach((b) => b.onclick = (e) => { e.stopPropagation(); const v = +b.dataset.i; Audio2.sfx('select'); this.choice = null; this.close(v); });
    } else ch.hidden = true;
    $('#dlgMore').hidden = !!this.choice || this.shown < c.text.length;
  },
  click() {
    if (!this.open || this.choice) return;
    Input._queued.ok = true;
  },
};
