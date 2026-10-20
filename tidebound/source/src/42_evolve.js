// Tidebound: the evolution scene. Evolve.run(mon, to) plays the animation, changes the species and checks the
// moves the new species learns at its level. B cancels before the change. Top-level names: Evolve only.

const Evolve = (() => {
  const SPARKLES = Array.from({ length: 24 }, (_, i) => ({
    x: (i * 53) % W, y: (i * 37) % H, ph: (i * 1.7) % 6.28,
  }));
  const silhouettes = new Map();

  // A white copy of a monster sprite, for the flicker.
  function silhouette(sp) {
    if (!silhouettes.has(sp)) {
      const src = Sprites.mon(sp, false);
      silhouettes.set(sp, makeCanvas(src.width, src.height, (c, g) => {
        g.drawImage(src, 0, 0);
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, c.width, c.height);
      }));
    }
    return silhouettes.get(sp);
  }

  // The scene: a dark background with sparkles. It drives the flicker and the flash itself, from its update.
  function makeScene(from, to) {
    const sc = {
      name: 'evolve', opaque: true, t: 0, acc: 0, period: 0.4, showNew: false, phase: 'idle',
      white: 0, res: null, onFlash: null,
      update(dt) {
        this.t += dt;
        if (this.phase === 'anim') {
          if (Input.pressed('b')) { this.finish(false); return; }
          const k = Math.min(1, this.t / 4);
          this.period = 0.42 - (0.42 - 0.05) * k;
          this.acc += dt;
          while (this.acc >= this.period) { this.acc -= this.period; this.showNew = !this.showNew; }
          if (this.t >= 4) this.finish(true);
        } else if (this.phase === 'flash') {
          this.white = Math.max(0, this.white - dt * 1.2);
          if (this.white <= 0 && this.onFlash) { const f = this.onFlash; this.onFlash = null; this.phase = 'idle'; f(); }
        }
      },
      finish(ok) {
        this.phase = 'idle';
        this.showNew = false;
        const r = this.res; this.res = null;
        if (r) r(ok);
      },
      draw(g) {
        g.fillStyle = '#101828';
        g.fillRect(0, 0, W, H);
        for (const s of SPARKLES) {
          const a = 0.35 + 0.65 * Math.max(0, Math.sin(this.t * 3 + s.ph));
          g.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
          g.fillRect(s.x, s.y, 1, 1);
        }
        const img = this.showNew ? silhouette(to) : silhouette(from);
        g.drawImage(img, 128, 36);
        if (this.white > 0) {
          g.globalAlpha = Math.min(1, this.white);
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, W, H);
          g.globalAlpha = 1;
        }
      },
    };
    // Evolution flicker: resolves true when the timer runs out, false on B.
    sc.animate = () => new Promise((res) => {
      sc.res = res;
      sc.phase = 'anim';
      sc.t = 0;
      sc.acc = 0;
      if (DBG.fast) { sc.finish(true); }
    });
    // Full white flash, then the new sprite is shown.
    sc.flashOut = () => new Promise((res) => {
      if (DBG.fast) { sc.showNew = true; res(); return; }
      sc.white = 1;
      sc.phase = 'flash';
      sc.onFlash = () => { sc.showNew = true; res(); };
    });
    return sc;
  }

  // Learn the moves the new species gets at the current level. A full moveset asks which move to forget.
  async function learnAtLevel(mon) {
    const name = Mon.name(mon);
    for (const id of Mon.learnable(mon, mon.lv)) {
      if (Mon.knows(mon, id)) continue;
      if (mon.moves.length < 4) {
        Mon.teach(mon, id);
        await UI.say(name + ' learned ' + MOVES[id].name + '!');
      } else {
        await Battle.learnFull(mon, id);
      }
    }
  }

  // Runs the evolution of mon into species `to`. Resolves true when it evolved, false when B cancelled.
  async function run(mon, to) {
    const from = mon.sp;
    const oldName = Mon.name(mon);
    const prev = Music.current;
    const sc = makeScene(from, to);
    Scenes.push(sc);
    Music.play('evolve');
    await UI.say('What? ' + oldName + ' is evolving!');
    const ok = await sc.animate();
    if (!ok) {
      await UI.say('Huh? ' + oldName + ' stopped evolving!');
      Scenes.pop(sc);
      if (prev) Music.play(prev); else Music.stop();
      return false;
    }
    Sound.play('evolve');
    await sc.flashOut();
    await UI.say('Congratulations! Your ' + oldName + ' evolved into ' + SPECIES[to].name + '!');
    Mon.evolve(mon, to);
    Mon.markCaught(to);
    await learnAtLevel(mon);
    Scenes.pop(sc);
    if (prev) Music.play(prev); else Music.stop();
    return true;
  }

  return { run };
})();
