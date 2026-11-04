// ---- story: characters, dialogue, quest flags, cutscenes ----
// Flags: intro, sawNotice, metMayor, metLedgerby, metCumula, nestDown, hatReturned, pebbleUp, stampSafe, backUnbolted,
// lighthouseOpen, lhDrained, fuseBroken, bossDone. Items: pebble, stamp, hat, glass_quarry, glass_stack, glass_cove.
const LOOKS = {
  mayor: { coat: 0x7a4aa8, coat2: 0x6a3a98, pants: 0x3a3040, skin: 0xf0c8a8, hat: 'top', mustache: 0xd8d0c8, sash: 0xd6b25a, girth: 1.35, buttons: 0xd6b25a, hair: 0xd8d0c8 },
  cumula: { coat: 0x7ab0e0, coat2: 0x5a90c8, skirt: true, skin: 0xf2d0b8, cloud: 0xffffff, hair: null, staff: true, scale: 0.92, nose: 1.4, specs: 0xd6b25a },
  noddy: { coat: 0xe8e0d0, coat2: 0x3a6aa8, pants: 0x3a4a5a, skin: 0xe8b890, hat: 'cap', hatColor: 0x3a6aa8, girth: 0.85, scale: 1.06, apron: 0x3a6aa8, hair: 0x4a3a2a, mustache: 0x4a3a2a },
  quill: { coat: 0x2a3a5a, pants: 0x2a2a34, skin: 0xd8a888, hat: 'cap', hatColor: 0x1e2838, beard: 0xe8e4dc, buttons: 0xd6b25a, girth: 1.15 },
  pip: { coat: 0xd2453a, coat2: 0x3a5a9a, pants: 0x3a5a9a, skin: 0xf6d2b0, hair: 0x6a3a1a, tuft: true, scale: 0.68, head: 1.15 },
  bram: { coat: 0x7a8a5a, pants: 0x5a4a3a, skin: 0xe0b090, hat: 'bonnet', hatColor: 0x8a7a5a, beard: 0xe8e8e8, scale: 0.95, nose: 1.5 },
  gubbins: { coat: 0x3f7a4a, coat2: 0x2f6a3a, pants: 0x3a3a34, skin: 0xd8a080, beard: 0x8a5a3a, girth: 1.3, nose: 1.6, hair: 0x8a5a3a },
  gubbinsHat: { coat: 0x3f7a4a, coat2: 0x2f6a3a, pants: 0x3a3a34, skin: 0xd8a080, beard: 0x8a5a3a, girth: 1.3, nose: 1.6, hat: 'souwester', hatColor: 0xf2c230 },
  marla: { coat: 0xb05a3a, skirt: true, coat2: 0x8a3a2a, skin: 0xf0c8a0, hair: 0x2a1a12, bun: true, apron: 0xf4ecd8, girth: 1.1 },
  fennel: { coat: 0x4a8aa8, pants: 0x5a4a3a, skin: 0xc89070, hair: 0x1a1a1a, hat: 'souwester', hatColor: 0x4a8aa8 },
  dot: { coat: 0xe8a0b0, skirt: true, coat2: 0xd890a0, skin: 0xf6d2b0, hair: 0xd8b060, bun: true, scale: 0.9 },
  pennywhistle: { coat: 0x8a6aa8, skirt: true, coat2: 0x7a5a98, skin: 0xf0d0b8, hat: 'bonnet', hatColor: 0xb090c8, scale: 0.9, specs: 0x3a3a3a },
  sal: { coat: 0x5a5a6a, pants: 0x3a3a3a, skin: 0xe0b090, hat: 'souwester', hatColor: 0x3a3a3a, beard: 0xb0b0b0, girth: 1.2 },
  clerk: { kind: 'clerk' },
};
const Story = {
  regionId: null,
  shards() { return ['glass_quarry', 'glass_stack', 'glass_cove'].filter(hasItem).length; },
  goal() {
    const g = [];
    if (F('bossDone')) return ['The storm is over. Enjoy the sunshine on Brindle Isle!'];
    if (!hasItem('pebble')) return ["Search the cottage for Grandma's old sea chest."];
    if (!F('sawNotice')) return ['Go outside and see what is happening at the lighthouse.'];
    if (!F('metCumula') && !F('metMayor')) return ['Find help in Pottle Harbour, east along the road.'];
    if (!F('metCumula')) g.push("Visit Auntie Cumula's windmill on Thunder Hill.");
    else if (!F('pebbleUp')) {
      const n = this.shards();
      if (n === 3) g.push('Bring the three sky-glass shards to Auntie Cumula.');
      else {
        const left = [];
        if (!hasItem('glass_quarry')) left.push('the Old Quarry');
        if (!hasItem('glass_stack')) left.push('the top of the Needle');
        if (!hasItem('glass_cove')) left.push("Gubbins at Smuggler's Cove");
        g.push(`Find the sky-glass shards (${n}/3): ${left.join(', ')}.`);
      }
    }
    if (!F('lighthouseOpen')) {
      if (!hasItem('stamp')) g.push(F('metLedgerby') ? 'Get the PAID stamp from the records room behind the Weather Office.' : 'Ask at the Weather Office in Pottle Harbour about the lighthouse.');
      else g.push('Stamp the seal on the lighthouse door.');
    } else if (F('pebbleUp')) g.push('Climb the lighthouse and stop the Storm Engine.');
    else if (g.length === 0) g.push('Climb the lighthouse. Auntie Cumula may know how to beat what waits at the top.');
    return g.slice(0, 2);
  },
  music() {
    const a = W.area; if (!a) return;
    let m;
    if (a.kind === 'outdoor') {
      const r = OUT.regionAt(Hero.x, Hero.z);
      m = G.weather === 'sun' ? 'sun' : r && r.id === 'harbour' ? 'village' : 'storm';
    } else if (a.id === 'lh3') m = F('bossDone') ? 'sun' : G.bossActive ? 'boss' : 'lighthouse';
    else if (a.music) m = a.music;
    else if (a.id === 'windmill') m = 'windmill';
    else if (a.id === 'records') m = 'sneak';
    else m = 'indoors';
    Audio2.music(m);
  },
  // called every simulation step
  update(dt) {
    const a = W.area;
    if (a.kind === 'outdoor') {
      const r = OUT.regionAt(Hero.x, Hero.z), id = r ? r.id : null;
      if (id !== this.regionId) {
        this.regionId = id;
        if (r && !G.lockInput && G.state === 'play') HUD.banner(r.name, true);
        this.music();
        if (id === 'harbour' && !F('metMayor') && F('sawNotice')) HUD.toast('Pottle Harbour! The Mayor is usually by the fountain.', 'harbour');
        if (id === 'quarry' && G.weather !== 'sun') HUD.toast('Bailiffs! Fight in Aggressive mode (3), or throw your pebble (F).', 'quarry');
        if (id === 'stack' && !hasItem('glass_stack') && !F('pebbleUp') && F('metCumula')) HUD.toast('The Needle. Those rock pillars look jumpable in Sporty mode (2).', 'stack');
      }
      if (OUT.sails) OUT.sails.rotation.z += dt * (G.weather === 'sun' ? 0.6 : 1.6);
    }
    if (a.onUpdate) a.onUpdate(a, dt);
  },
  // ---------- interaction ----------
  interact() {
    const it = nearestInteract();
    if (!it) return false;
    if (it.npc && Hero.mode === 'aggressive') {
      const e = W.ents.find((q) => q.interact === it);
      Dialog.say([`${e ? e.name : 'Someone'}: ${pick(['Whoa! Put those fists down before you talk to me.', 'Easy there, keeper! Calm down first. (Switch modes with 1-4 or Tab.)', "I don't talk to people who look like they're about to punch me."])}`]);
      return true;
    }
    if (it.mode && Hero.mode !== it.mode) { HUD.toast(it.modeMsg || `You need to be in ${MODE_INFO[it.mode].name} mode for that.`); return true; }
    it.fn();
    return true;
  },
  bonk(e) {
    if (Hero.mode !== 'aggressive' && !Pebble.active) return;
    FX.icon(e, '!', 0.8);
    HUD.toast(`${e.name}: ${pick(['Ow!', 'Hey!', 'Watch it, keeper!', 'What did I do?!', 'Rude!'])}`, null, 1.6);
  },
  async cut(fn) {
    G.state = 'cutscene'; G.lockInput++; HUD.letterbox(true); HUD.prompt(null);
    try { await fn(); } finally { G.lockInput = Math.max(0, G.lockInput - 1); HUD.letterbox(false); if (G.state === 'cutscene') G.state = 'play'; HUD.goal(); }
  },
  respawn() {
    const c = G.checkpoint || ['isle', -74, 16, Math.PI];
    Hero.state = 'free'; Hero.obj.rotation.z = 0;
    enterArea(c[0], [c[1], c[2], c[3]], { quiet: true });
    Hero.inv = 2;
  },

  // ---------- the cottage ----------
  async intro() {
    await this.cut(async () => {
      Hero.ry = Math.PI;
      camCine([2.5, 3.2, 4.5], [-1, 1, -1.5]);
      HUD.fade(1, 0); await wait(0.4); HUD.fade(0, 1.6);
      lightning(1); Audio2.sfx('thunder', 0.1);
      await wait(1.2);
      await Dialog.say([
        'Wick: Nine days of storm. And tonight the lighthouse went dark.',
        "Wick: That lamp hasn't gone out once in fifty-one years. Not while Grandma kept it, and not since I took over.",
        "Wick: Something's wrong up there. Grandma always said: when in doubt, check the sea chest.",
      ]);
      camFixed(W.area.cams);
    });
    setFlag('intro');
    HUD.toast(Input.lastDevice === 'pad' ? 'Move with the left stick. A or B to interact.' : 'Move with WASD or the arrow keys. E or Space to interact.', null, 6);
  },
  async chest() {
    if (hasItem('pebble')) { Dialog.say(["Grandma's sea chest. Old charts, a spare wick, a tin of humbugs (empty) and a note: 'Keep the light, little one.'"]); return; }
    Audio2.sfx('chest');
    giveItem('pebble'); HUD.items();
    await Dialog.say([
      "Under the old charts you find Grandma's tide-pebble: smooth, blue-grey, and strangely warm.",
      "Wick: \"A keeper's pebble always comes home.\" She used to skip it right across the harbour.",
      { who: '', text: 'Got the TIDE-PEBBLE! Throw it with F (or click, or X on a pad). It bounces off walls and comes back to you. Your mode changes how you throw it.' },
    ]);
    HUD.goal();
  },
  logbook() {
    Dialog.say([
      "Keeper's Log, day 1: Rain. Lamp lit.",
      'Day 5: Rain. Wind. A gilded airship over the island again. Lamp lit.',
      "Day 9: Strange ticking noises on the stairs tonight. I'll check the lamp room at dawn.",
      "Wick: ...I fell asleep. And now it's dark.",
    ]);
  },
  bench() {
    Dialog.say(F('bossDone')
      ? ["You sit on Grandma's bench and watch the sea sparkle. The lamp turns overhead, slow and steady."]
      : ["Grandma's bench. Her initials are carved in the armrest: T.W. Rain pools in the seat."]);
  },

  // ---------- Lighthouse Point ----------
  populateIsle(a) {
    const storm = G.weather !== 'sun';
    const sun = !storm;
    // islanders
    Actors.npc({ id: 'mayor', name: 'Mayor Bunting', look: LOOKS.mayor, x: sun ? -80 : 49.5, z: sun ? 9 : 11, ry: Math.PI });
    Actors.npc({ id: 'noddy', name: 'Noddy', look: LOOKS.noddy, x: ISLE.P.shop[0], z: ISLE.P.shop[1] - 1.4, ry: 0, fixedFacing: true });
    Actors.npc({ id: 'quill', name: 'Harbourmaster Quill', look: LOOKS.quill, x: 85, z: 4, ry: -Math.PI / 2 });
    Actors.npc({ id: 'pip', name: 'Pip', look: LOOKS.pip, x: 30, z: 14, path: [[30, 14], [36, 10], [32, 4], [26, 8]], speed: 2.2 });
    Actors.npc({ id: 'bram', name: 'Old Bram', look: LOOKS.bram, x: -60, z: 15, ry: Math.PI });
    Actors.npc({ id: 'gubbins', name: 'Gubbins', look: F('hatReturned') ? LOOKS.gubbinsHat : LOOKS.gubbins, x: 19, z: 49.5, ry: Math.PI });
    Actors.npc({ id: 'fennel', name: 'Fennel', look: LOOKS.fennel, x: 56, z: 10, path: [[56, 10], [62, 3], [70, 3], [62, 3]], speed: 1.4 });
    Actors.npc({ id: 'dot', name: 'Dot', look: LOOKS.dot, x: 40, z: 18, ry: 0, pose: 'idle' });
    if (sun) {
      for (const [id, nm, lk, x, z] of [['marlaOut', 'Marla', 'marla', -81, 12], ['cumulaOut', 'Auntie Cumula', 'cumula', -82.5, 8.4], ['salOut', 'Old Sal', 'sal', -79, 4]]) Actors.npc({ id, name: nm, look: LOOKS[lk], x, z, ry: Math.PI / 2, pose: 'cheer' });
    }
    // gulls
    Actors.gull({ x: -84, y: 20, z: 10, rad: 9 }); Actors.gull({ x: 80, y: 12, z: 4, rad: 7, sp: -0.4 }); Actors.gull({ x: 4, y: 10, z: 54, rad: 10 });
    // the gull nest on its pole
    if (!F('nestDown')) this.spawnNest();
    else if (!hasItem('hat') && !F('hatReturned')) this.spawnHat(ISLE.P.gullPole[0] + 1.2, ISLE.P.gullPole[1] + 0.8);
    // sky-glass
    if (!F('pebbleUp')) {
      if (!hasItem('glass_stack')) { const [x, z, y] = OUT.stackTop; this.spawnGlass('glass_stack', x, z, y); }
      if (!hasItem('glass_quarry')) this.spawnBoulder();
    }
    // the push crate behind the Weather Office
    const cr = G.save.crate || [71.5, -5.5];
    Actors.pushCrate({ x: cr[0], z: cr[1], onMove: (e) => { G.save.crate = [+e.x.toFixed(2), +e.z.toFixed(2)]; } });
    // breakables
    const brk = [[-62, 23, 'crate'], [-62.2, 27, 'barrel'], [-44, -38, 'crate'], [-56, -36, 'crate'], [-47, -48, 'barrel'], [-58, -44, 'crate'], [74, 1.8, 'crate'], [86, 6, 'barrel'], [22, 52, 'barrel'], [-4, 56, 'crate'], [8, -64, 'barrel'], [-20, 4, 'crate']];
    for (const [x, z, t] of brk) Actors.breakable({ x, z, type: t });
    // hidden gold
    for (const [id, x, z] of [['g_mill', 13.5, -64], ['g_pond', -26, -10], ['g_cliff', -95, 18], ['g_dock', 88, 3], ['g_cove', -10, 44]]) if (!G.save.dead[id]) Actors.pickup({ type: 'gold', id, x, z });
    if (storm) {
      // bailiffs on the roads and in the quarry
      const T = (id, x, z, path, kind) => { if (!G.save.dead[id]) Actors.ticker({ id, x, z, path, kind }); };
      if (F('sawNotice')) {
        T('r1', -44, 10, [[-44, 10], [-30, 8.5]]);
        T('r2', 2, -26, [[2, -26], [3, -38]]);
        T('r3', 12, 26, [[12, 26], [11.5, 37]]);
        T('r4', 22, 6.5, [[16, 6.5], [26, 7]]);
        T('q1', -48, -36, [[-48, -36], [-42, -44]]);
        T('q2', -56, -44, [[-56, -44], [-52, -50]]);
        T('q3', -45, -49, [[-45, -49], [-49, -46]]);
        T('qh', -53, -41, null, 'heavy');
      }
      for (const [x, z] of [[2, 49], [12, 51], [-46, 54], [-53, 54]]) Actors.crab({ x, z });
    }
    // the first time you step outside, a bailiff is nailing a notice to your lighthouse
    if (!F('sawNotice') && hasItem('pebble')) Timers.after(0.4, () => this.bailiffScene());
    if (OUT.seal) OUT.seal.visible = !F('lighthouseOpen');
  },
  spawnNest() {
    const [gx, gz] = ISLE.P.gullPole, gy = ISLE.H(gx, gz) + 6.7;
    const g = new THREE.Group();
    g.add(mesh(GEO.cyl, 0x8a6a42, 0, 0, 0, 1.3, 0.4, 1.3)); g.add(mesh(GEO.sph, 0xf2c230, 0.1, 0.25, 0, 0.7, 0.35, 0.7)); g.add(mesh(GEO.cyl12, 0xf2c230, 0.1, 0.18, 0, 1.1, 0.04, 1.1));
    const gull = new THREE.Group(); gull.add(mesh(GEO.sph, 0xf4f4f0, 0, 0.5, 0, 0.4, 0.5, 0.6)); gull.add(mesh(GEO.sph, 0xf4f4f0, 0, 0.9, 0.2, 0.3, 0.3, 0.3)); const bk = mesh(GEO.cone, 0xe8a83a, 0, 0.9, 0.45, 0.1, 0.25, 0.1); bk.rotation.x = Math.PI / 2; gull.add(bk); gull.position.set(-0.3, 0.1, 0); g.add(gull);
    W.area.group.add(g); g.position.set(gx, gy, gz);
    Actors.target({
      x: gx, y: gy, z: gz, aimY: gy + 0.2, r: 0.9, aim: true, obj: g, t: 0,
      update(dt) { this.t += dt; gull.rotation.y = Math.sin(this.t * 0.7) * 1.2; if (this.falling) { this.vy -= 18 * dt; this.y += this.vy * dt; g.position.y = this.y; g.rotation.z += dt * 4; const gr = ISLE.H(this.x + 1, this.z); if (this.y < gr) { this.dead = true; } } },
      onPebble() {
        if (this.falling) return null;
        this.falling = true; this.vy = 2; this.aim = false;
        setFlag('nestDown'); Audio2.sfx('punch'); FX.burst(gx, gy, gz, 0xf4f4f0, 12, 4);
        Actors.gull({ x: gx, y: gy + 4, z: gz, rad: 6, sp: 0.8 });
        Timers.after(0.9, () => { Story.spawnHat(gx + 1.2, gz + 0.8); FX.dust(gx + 1.2, ISLE.H(gx + 1.2, gz + 0.8), gz + 0.8); });
        HUD.toast('SQUAWK! The nest tumbles down, and something yellow falls out of it.');
        return 'stop';
      },
      onPunch() { HUD.toast("It's way up on top of the pole. Try the pebble: Sporty mode throws the highest.", 'nest-punch'); return false; },
    });
  },
  spawnHat(x, z) {
    Actors.pickup({ type: 'item', x, z, float: 0.4, model: () => { const g = new THREE.Group(); g.add(mesh(GEO.sph, 0xf2c230, 0, 0.1, 0, 0.6, 0.35, 0.6)); g.add(mesh(GEO.cyl12, 0xf2c230, 0, 0.04, 0, 0.95, 0.04, 0.95)); return g; },
      onCollect: () => { giveItem('hat'); Audio2.sfx('pickup'); HUD.items(); HUD.toast("Got Gubbins' lucky sou'wester! It smells of herring."); } });
  },
  spawnGlass(item, x, z, y) {
    Actors.pickup({ type: 'glass', x, z, y, float: 0.7, onCollect: () => { giveItem(item); Audio2.sfx('fanfare'); HUD.items(); HUD.goal(); HUD.toast(`Got a SKY-GLASS SHARD! (${Story.shards()}/3)`, null, 4); writeSave(); } });
  },
  spawnBoulder() {
    const x = -55.5, z = -47.5, y = ISLE.H(x, z);
    const g = new THREE.Group(), b = new Batch();
    b.p('dodo', 0x8a8478, 0, 1.1, 0, 3.0, 2.4, 2.6, 0.4, 0.1);
    b.p('box', 0x9fe8ff, 0, 1.3, 1.1, 0.12, 1.4, 0.1, 0, 0, 0.4); b.p('box', 0x9fe8ff, 0.3, 1.6, 1.12, 0.1, 0.8, 0.1, 0, 0, -0.6);
    g.add(b.build());
    const col = { t: 'cyl', x, z, r: 1.4, y0: y - 1, y1: y + 2.2, noStand: true };
    W.cols.push(col);
    const glow = new THREE.PointLight(0x9fe8ff, 0.8, 6); glow.position.set(0, 1.5, 1.4); g.add(glow);
    Actors.target({
      x, y, z, aimY: y + 1.2, r: 1.6, obj: g, hits: 0, col,
      onPebble() { Audio2.sfx('clang'); HUD.toast('The pebble just bounces off. Something this tough needs fists: Aggressive mode (3).', 'boulder-pebble'); return 'bounce'; },
      onPunch(dmg) {
        if (Math.hypot(Hero.x - x, Hero.z - z) > 2.8) return false;
        this.hits += dmg; Audio2.sfx('punch'); CAM.shake = 0.15; FX.burst(x, y + 1.2, z, 0x9a9488, 8, 4);
        g.position.x = x + rnd(-0.08, 0.08);
        if (this.hits >= 4) {
          this.dead = true; col.off = true; Audio2.sfx('boom'); FX.gears(x, y + 1, z, 12, 0x8a8478);
          Story.spawnGlass('glass_quarry', x, z + 0.4, y + 0.2);
        } else if (this.hits === 1) HUD.toast('Crack! Keep punching.');
        return true;
      },
    });
  },
  async bailiffScene() {
    if (F('sawNotice') || G.lockInput) return;
    const [lx, lz] = ISLE.P.lighthouse, ly = ISLE.H(lx, lz);
    const t = Actors.ticker({ id: 'bailiff', x: lx + 4.5, z: lz + 0.4, ry: -Math.PI / 2 });
    t.state = 'caught'; // stands still during the scene
    await this.cut(async () => {
      camCine([lx + 14, ly + 7, lz + 14], [lx + 3, ly + 2, lz]);
      await wait(0.4);
      for (let i = 0; i < 3; i++) { Audio2.sfx('stamp'); t.anim.punch = 1; await wait(0.35); t.anim.punch = 0; await wait(0.2); }
      await Dialog.say([
        'Ticker: TICK. TOCK. By order of BARON HALCYON PLUME, Lord of the Upper Airs, this lighthouse is hereby SEIZED.',
        'Ticker: Reason: UNPAID WEATHER. Have a pleasant storm. TICK.',
      ]);
      camCine([Hero.x + 9, Hero.y + 8, Hero.z + 9], [Hero.x, Hero.y + 1, Hero.z], 1.0);
      await wait(1.0);
      await Dialog.say([
        "Wick: Hey! That's MY lighthouse! I'm the keeper!",
        'Ticker: Correction: you were the keeper. Complaints go to the Weather Office in Pottle Harbour. Resistance goes... here. TICK TOCK.',
      ]);
      camIso(false);
    });
    setFlag('sawNotice'); writeSave();
    t.state = 'chase'; t.st = 0; FX.icon(t, '!'); Audio2.sfx('alert');
    HUD.toast(Input.lastDevice === 'pad' ? 'It wants a fight! Y or RB switches to Aggressive mode, then A to punch. X throws the pebble.' : 'It wants a fight! Press 3 (or Tab) for Aggressive mode, then Space to punch. F throws the pebble.', null, 7);
  },
  async seal() {
    if (F('lighthouseOpen')) return;
    const lines = [
      'NOTICE OF SEIZURE. This lighthouse is the property of BARON HALCYON PLUME, for non-payment of weather.',
      'The lamp has been replaced with a STORM ENGINE (also property of the Baron), which collects all local sunshine for export to the Sky-Isles.',
      "To reclaim the premises, this seal must be stamped PAID by the Weather Office. — T. Ledgerby, Clerk.",
    ];
    if (!hasItem('stamp')) { await Dialog.say(lines); if (!F('sawNotice')) setFlag('sawNotice'); return; }
    const c = await Dialog.choose('The seal needs a PAID stamp. You happen to have one.', ['Stamp it: PAID', 'Not yet']);
    if (c !== 0) return;
    await this.cut(async () => {
      const [lx, lz] = ISLE.P.lighthouse, ly = ISLE.H(lx, lz);
      camCine([lx + 9, ly + 4, lz + 5], [lx + 3.6, ly + 1.7, lz], 0.8);
      await wait(0.9);
      Audio2.sfx('stamp'); CAM.shake = 0.2; FX.burst(lx + 3.8, ly + 1.7, lz, 0xc0302a, 10, 3);
      await wait(0.6);
      OUT.seal.visible = false; FX.gears(lx + 3.8, ly + 1.7, lz, 8, 0xd6b25a); Audio2.sfx('gears');
      await wait(0.6);
      await Dialog.say(['Wick: PAID. In full. With interest.', 'The seal pops off the door with a satisfied "thunk" and rolls away into the heather.']);
      camIso(false);
    });
    setFlag('lighthouseOpen'); writeSave(); Audio2.sfx('fanfare');
  },

  // ---------- the harbour ----------
  async talk(e) {
    e.talking = true;
    try { await (this.TALK[e.id] || this.TALK.generic).call(this, e); } finally { e.talking = false; HUD.goal(); writeSave(); }
  },
  TALK: {
    async generic(e) { await Dialog.say([`${e.name}: Lovely weather. For ducks.`]); },
    async mayor(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: Keeper! The whole island is out in the sunshine! I've declared a holiday. Then another holiday to celebrate the first one.`, `${N}: Grandma Tess would be proud. Now, about that Baron's bill... I've filed it under "Ha".`]); return; }
      if (!F('metMayor')) {
        setFlag('metMayor');
        await Dialog.say([
          `${N}: Wick! Thank goodness. Have you seen it? My hat has been rained INTO. Twice.`,
          `${N}: Nine days ago a gilded airship arrived. A Baron called Plume stepped out and announced he'd bought the weather. ALL of it.`,
          `${N}: Now everyone gets a weather bill from his Weather Office by the quay. And the worse the weather, the bigger the bill!`,
          "Wick: His bailiffs just seized my lighthouse. They put some kind of engine where the lamp should be.",
          `${N}: Then you'll want two things, keeper. First, see the clerk at the Weather Office. He's made of clockwork and paperwork, but he's the one with the stamps.`,
          `${N}: Second, see Auntie Cumula up on Thunder Hill. Nobody knows weather like Cumula. She predicted this storm. She predicted the Baron. She predicted I'd lose my umbrella, and I did.`,
        ]);
        return;
      }
      await Dialog.say([`${N}: ${pick(["The Weather Office is the brick building by the quay. Mind the bailiffs.", "Auntie Cumula's windmill is up Thunder Hill, north of the crossroads.", "If you need supplies, Noddy's stall is just west of the square. Marla's chowder in the Gull & Kettle will set you right, too."])}`]);
    },
    async noddy(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: Sunshine! Terrible for business. I've got four hundred umbrellas. Want one? No? Kelp tonic, then?`]); }
      const c = await Dialog.choose(`${N}: Kelp tonic! Fixes bumps, bruises and bailiff-related injuries. 12 clams a bottle. (You have ${G.save.clams} clams, ${G.save.tonics}/3 tonics.)`, ['Buy a tonic (12)', 'Just looking'], N);
      if (c !== 0) { await Dialog.say([`${N}: ${pick(['Come back when you\'re bruised!', 'Mind the puddles.', 'Umbrellas are half price. Every day. Forever.'])}`]); return; }
      if (G.save.tonics >= 3) { await Dialog.say([`${N}: Three's the limit, keeper. Any more and you'll start sprouting seaweed.`]); return; }
      if (G.save.clams < 12) { await Dialog.say([`${N}: That's not enough clams. Smash a few of the Baron's crates: bailiffs always leave a few clams lying about.`]); return; }
      G.save.clams -= 12; G.save.tonics++; HUD.clams(); HUD.items(); Audio2.sfx('coin');
      await Dialog.say([`${N}: Pleasure doing business. Drink it with H when you're hurting. Hold your nose.`]);
    },
    async quill(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: Ships coming in from all over now the storm's gone. Your light's a beauty, keeper.`]); return; }
      if (F('stampSafe')) { await Dialog.say([`${N}: Got the stamp? Ha! I'd have paid clams to see Ledgerby's face.`]); return; }
      await Dialog.say([
        `${N}: The Weather Office? That annex at the back is the records room. Flat roof, big skylight. Ledgerby used to sunbathe under it, before he got rusty.`,
        `${N}: Those bailiffs stacked their barrels against the wall like a staircase, the fools. One crate short of a ladder, if you ask me.`,
        `${N}: There's a loose crate by the quay. Push it about in Normal mode, then a Sporty sort could hop right up.`,
      ]);
    },
    async pip(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: You beat the big clockwork guy?! I'm going to be a lighthouse keeper when I grow up. Or a pirate. Or a lighthouse pirate.`]); return; }
      const tips = [
        `${N}: Did you know? In Sporty mode you can jump! Grown-ups never jump. It's sad.`,
        `${N}: Sneaky mode is the best. You go all tiptoe and the bailiffs can't see you unless you're right in front of them.`,
        `${N}: If you throw your pebble in Aggressive mode it goes super fast and straight. In Sporty mode it goes up REALLY high!`,
        `${N}: A gull stole Gubbins' hat! He was SO cross. He said words I'm not allowed to say. Like "codswallop".`,
        `${N}: The bailiffs only hear you if you're stomping about. Tiptoe, tiptoe!`,
      ];
      e.tip = ((e.tip || 0) + 1) % tips.length;
      await Dialog.say([tips[e.tip]]);
    },
    async bram(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: Look at that sky. Haven't seen blue like that since your grandma's day.`]); return; }
      if (!F('metBram')) {
        setFlag('metBram');
        await Dialog.say([
          `${N}: Young Wick! Saw those clockwork bailiffs march up to your lighthouse. Rude little kettles.`,
          `${N}: Listen to an old man. You can't do everything the same way. Your grandma used to say a keeper has four moods:`,
          `${N}: Normal for talking and fiddling with things. Sporty for running and jumping. Aggressive for when someone needs a thump. And Sneaky, for tiptoeing past trouble.`,
          `${N}: Press 1 to 4 (or Tab) to change. Pottle Harbour's that way, east. Mind the road; the bailiffs patrol it.`,
        ]);
        return;
      }
      await Dialog.say([`${N}: ${pick(['If a bailiff is too much, throw your pebble from a distance. It comes right back to you.', "Fell in the sea? Nobody's ever drowned on Brindle, they just get very wet and very cross.", 'Rain, rain, rain. My knees have opinions about it.'])}`]);
    },
    async gubbins(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: Caught a fish with a smile on its face this morning. Sunshine does that.`]); return; }
      if (F('hatReturned')) { await Dialog.say([`${N}: Me lucky hat! I've caught three fish and a boot since. Lucky boot, too.`]); return; }
      if (hasItem('hat')) {
        takeItem('hat');
        setFlag('hatReturned');
        await Dialog.say([
          `${N}: ME HAT! Me lucky sou'wester! You found it!`,
          `${N}: Right, a deal's a deal. This came up in me net the morning that airship got hit by lightning. Glowy. Warm. Hums a bit. Gives me the shivers.`,
          { who: '', text: `Got a SKY-GLASS SHARD! (${Story.shards() + 1}/3)` , fn: () => { giveItem('glass_cove'); Audio2.sfx('fanfare'); HUD.items(); } },
        ]);
        e.P.root.parent && e.P.root.parent.remove(e.P.root);
        e.dead = true;
        Actors.npc({ id: 'gubbins', name: 'Gubbins', look: LOOKS.gubbinsHat, x: e.x, z: e.z, ry: e.ry });
        return;
      }
      if (!F('metGubbins')) {
        setFlag('metGubbins');
        await Dialog.say([
          `${N}: Don't come any closer, keeper, I'm in a MOOD.`,
          `${N}: That gull. THAT gull. Swiped me lucky sou'wester right off me head and stuffed it in its nest up on that pole.`,
          `${N}: Can't fish without me hat. Can't think without me hat. Can't even be properly cross without me hat, and I am VERY cross.`,
        ]);
      }
      if (F('metCumula')) await Dialog.say([`${N}: Something shiny in me net? Aye, I've got it. You can have it when I've got me hat back.`, `${N}: Knock that nest down with your pebble. Throw it HIGH. In Sporty mode, I reckon.`]);
      else await Dialog.say([`${N}: Knock that nest off the pole and I'll make it worth your while.`]);
    },
    async fennel(e) { await Dialog.say([`${e.name}: ${F('bossDone') ? "The nets are drying for the first time in weeks! The nets are thrilled. I'm thrilled." : pick(["I got a bill for 'excessive drizzle'. EXCESSIVE DRIZZLE.", "My boat's been bailed out more times than a bailiff's... no, wait.", 'Those clockwork bailiffs wind themselves up every morning. You can hear them ticking.'])}`]); },
    async dot(e) { await Dialog.say([`${e.name}: ${F('bossDone') ? "I've hung all my washing out. All of it. Even the winter things. Just because I can!" : pick(["I've knitted eleven scarves since the storm started. Do you want a scarf? You already have a scarf.", 'Marla says the Baron sells our sunshine in little bottles to rich folk up in the Sky-Isles. Bottled sunshine! The cheek!'])}`]); },
    async marla(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: On the house today, love. Everything's on the house. Except the house; that's mine.`]); Hero.heal(99); return; }
      const c = await Dialog.choose(`${N}: Welcome to the Gull & Kettle, love. Bowl of chowder? Puts you right back on your feet. 4 clams.`, ['Chowder please (4)', 'Any news?', 'Bye'], N);
      if (c === 0) {
        if (G.save.clams < 4) { await Dialog.say([`${N}: Short of clams? Go on then, this one's on me. Don't tell the Baron.`]); }
        else { G.save.clams -= 4; HUD.clams(); Audio2.sfx('coin'); }
        Hero.heal(99); Audio2.sfx('heart');
        await Dialog.say([`${N}: There. Fish, potato, a bit of seaweed for luck. You look better already.`]);
      } else if (c === 1) {
        await Dialog.say([`${N}: ${pick([
          "Ledgerby's terrified of the records room getting messy. He's got two bailiffs walking circles in there all day.",
          "Folk say Auntie Cumula saw bits of the Baron's airship fall when the lightning struck it. Shiny bits.",
          "Gubbins has been in here moaning about a gull. Every day. Same gull.",
          "Those bailiffs have big eyes but small ears. Creep past quiet-like and they'll never know.",
        ])}`]);
      }
    },
    async sal(e) { await Dialog.say([`${e.name}: ${pick(["Sixty years I've fished these waters. Never paid for weather. Not about to start.", "The Baron's airship has gold propellers. GOLD. Who needs gold propellers?", 'Keeper! When are you lighting that lamp again? I keep walking into the harbour wall.'])}`]); },
    async ledgerby(e) {
      const N = 'Ledgerby';
      if (F('bossDone')) { await Dialog.say([`${N}: The Baron has... stopped answering my telegrams. I find myself without a purpose. Do you need anything... filed?`]); return; }
      if (!F('metLedgerby')) {
        setFlag('metLedgerby');
        await Dialog.say([
          `${N}: Next! Ah. Wick, Keeper of the Brindle Light. I have your file. It is a thick file.`,
          `${N}: Weather consumed: nine days of storm at the premium rate. Plus the lamp removal fee. Plus the seizure fee. Plus the fee for calculating the fees.`,
          `${N}: Total owing: nine thousand, nine hundred and ninety-nine clams.`,
        ]);
      }
      const c = await Dialog.choose(`${N}: How would you like to proceed?`, ['Pay the bill', 'Complain', 'Leave'], N);
      if (c === 0) await Dialog.say([`${N}: You have ${G.save.clams} clams. That is... adorable. Next!`]);
      else if (c === 1) await Dialog.say([
        `${N}: Complaints must be submitted on Form 77-B, in triplicate, stamped PAID.`,
        "Wick: How can I get it stamped PAID if I can't pay?",
        `${N}: That is not my department. The PAID stamp lives in the records room, safe and sound, guarded day and night. Nobody goes in there but me. NEXT!`,
      ]);
    },
    async pennywhistle(e) { await Dialog.say([`${e.name}: ${pick(["I've been in this queue since Tuesday. I came in to complain about the queue.", "I'm number four thousand five hundred and twelve. They're serving number twelve. I've brought sandwiches."])}`]); },
    async cumula(e) {
      const N = e.name;
      if (F('bossDone')) { await Dialog.say([`${N}: Sunshine! Real, free, unbottled sunshine. I knew you could do it, little keeper. I predicted it. Mostly.`]); return; }
      if (!F('metCumula')) {
        setFlag('metCumula');
        await Dialog.say([
          `${N}: Ah! The little keeper. Come in, come in, mind the cloud, it bites.`,
          `${N}: I've been watching your lighthouse through my telescope. Purple! A lighthouse should never be PURPLE.`,
          `${N}: That's the Baron's Storm Engine. It drinks every drop of sunshine for miles and bottles it, and what's left over is storm. He sells the bottles up in the Sky-Isles.`,
          `${N}: To break it you'll need more than a pebble, dear. You'll need a pebble full of sky.`,
          `${N}: When lightning struck the Baron's airship last week, three shards of sky-glass fell onto our island. Bring me all three and I'll charge your pebble with them.`,
          `${N}: One fell into the Old Quarry, where his bailiffs dig. One landed on top of the Needle, the sea stack off the south-west beach. And Gubbins down at the cove was hollering about something shiny in his net.`,
        ]);
        if (!hasItem('stamp') && !F('lighthouseOpen')) await Dialog.say([`${N}: And the door? Paperwork, dear. Bailiffs love paperwork. Beat them with their own stamp.`]);
        return;
      }
      if (F('pebbleUp')) { await Dialog.say([`${N}: ${F('lighthouseOpen') ? 'Up the lighthouse with you! Bring the light home.' : 'Now get that lighthouse door open. Paperwork, dear: beat them with their own stamp.'}`]); return; }
      const n = Story.shards();
      if (n < 3) { await Dialog.say([`${N}: ${['None yet? The quarry, the Needle, and Gubbins at the cove. Off you pop.', 'One shard! Two more. I can feel the sky in it from here.', 'Two! One more and we can make a sunrise.'][n]}`]); return; }
      await this.cut(async () => {
        await Dialog.say([`${N}: All three! Hold out your pebble, dear. Don't drop it. And don't look directly at it.`]);
        for (const it of ['glass_quarry', 'glass_stack', 'glass_cove']) takeItem(it);
        Audio2.sfx('magic'); lightning(0.8);
        for (let i = 0; i < 30; i++) FX.burst(Hero.x, Hero.y + 1.3, Hero.z, i % 2 ? 0xffd36a : 0x9fe8ff, 2, 3);
        await wait(1.2);
        setFlag('pebbleUp'); Audio2.sfx('fanfare'); HUD.items();
        await Dialog.say([
          { who: '', text: 'The shards melt into the tide-pebble with a sound like a sunrise. Got the SUN-PEBBLE! It glows, bounces twice as often and hits harder.' },
          `${N}: There. Sunshine in a stone. That's the only thing that'll crack the Storm Engine's core.`,
          `${N}: ${F('lighthouseOpen') ? 'Now up that lighthouse, keeper. Bring the light home.' : "Now get that door open. Paperwork, dear: beat them with their own stamp."}`,
        ]);
      });
    },
  },

  // ---------- the tavern, the office, the records room ----------
  populateTavern() {
    Actors.npc({ id: 'marla', name: 'Marla', look: LOOKS.marla, x: -1.5, z: -3.4, ry: 0, fixedFacing: true });
    Actors.npc({ id: 'sal', name: 'Old Sal', look: LOOKS.sal, x: -2.9, z: 2.2, ry: Math.PI });
    Actors.npc({ id: 'dot', name: 'Dot', look: LOOKS.dot, x: 3.1, z: 0.8, ry: 0 });
  },
  populateOffice() {
    Actors.npc({ id: 'ledgerby', name: 'Ledgerby', look: LOOKS.clerk, x: 2.8, z: -1.0, ry: -Math.PI / 2, fixedFacing: true, setup: (e) => { e.interact.r = 2.8; } });
    Actors.npc({ id: 'pennywhistle', name: 'Mrs. Pennywhistle', look: LOOKS.pennywhistle, x: -1.1, z: 1.7, ry: Math.PI / 2 });
  },
  ticket() { Audio2.sfx('tick'); Dialog.say(['You take ticket number 4,513. A little sign says NOW SERVING: 12.']); },
  async skylight() {
    if (F('stampSafe')) { HUD.toast("You've already got what you need from in there."); return; }
    await Dialog.say(['You pry open the skylight. Below: rows of shelves, a desk, and the ticking of two bailiffs on patrol.']);
    const c = await Dialog.choose('Lower yourself in on the rope?', ['Climb down quietly', 'Not yet']);
    if (c !== 0) return;
    G.records = true;
    Hero.setMode('sneaky');
    goArea('records', [-2.8, 4.2, Math.PI], { sfx: false, then: () => { Hero.noise = 0; HUD.toast('You slip down in Sneaky mode. Stay out of the yellow cones, grab the stamp from the desk and leave by the back door.', 'records', 7); } });
  },
  populateRecords(a) {
    const stampObj = new THREE.Group(); stampObj.add(mesh(GEO.cyl, 0x6b3f26, 0, 0.12, 0, 0.12, 0.25, 0.12)); stampObj.add(mesh(GEO.box, 0xa83a3a, 0, 0, 0, 0.32, 0.1, 0.22));
    stampObj.position.set(0.3, 0.86, -4.2); a.group.add(stampObj); a.stampObj = stampObj;
    stampObj.visible = !hasItem('stamp');
    if (F('stampSafe')) return;
    const onCaught = () => Story.caught();
    Actors.ticker({ kind: 'guard', x: 2.8, z: -3.2, ry: Math.PI / 2, path: [[-2.8, -3.2], [2.8, -3.2]], wait: 2.2, lookAround: true, cone: true, onCaught });
    Actors.ticker({ kind: 'guard', x: 1.7, z: 0.6, ry: 0, path: [[1.7, 3.3], [1.7, 0.6]], wait: 1.8, lookAround: true, cone: true, onCaught });
  },
  async takeStamp() {
    giveItem('stamp'); Audio2.sfx('pickup'); HUD.items();
    if (W.area.stampObj) W.area.stampObj.visible = false;
    HUD.toast('Got the PAID stamp! Now slip out the back door (east wall) without being seen.', null, 5);
  },
  async caught() {
    if (G.caughtBusy) return; G.caughtBusy = true;
    await this.cut(async () => {
      await Dialog.say(['Ticker: INTRUDER! UNAUTHORISED TAXPAYER IN THE RECORDS ROOM! TICK! TICK! TICK!']);
      HUD.fade(1, 0.3); await wait(0.4);
      const had = hasItem('stamp') && !F('stampSafe');
      if (had) takeItem('stamp');
      enterArea('isle', [53.0, -8, -Math.PI / 2], { quiet: true });
      HUD.fade(0, 0.4); await wait(0.5);
      await Dialog.say([
        { who: '', text: 'The bailiffs march you through the front hall and toss you out onto the cobbles.' },
        had ? "Ledgerby: And I'll have THAT back, thank you. Stamps are for staff." : 'Ledgerby: And stay out! Records are for RECORDING, not for... whatever that was.',
      ]);
    });
    G.caughtBusy = false;
    HUD.toast('Try Sneaky mode (4): bailiffs only spot you up close, and only if you are in their cone.', 'caught-hint', 6);
  },
  backDoor() {
    setFlag('backUnbolted');
    if (hasItem('stamp')) { setFlag('stampSafe'); Audio2.sfx('fanfare'); HUD.toast('You slip out the back with the stamp. Now: the seal on the lighthouse door!', null, 5); }
    goArea('isle', [68.4, -7, Math.PI / 2]);
  },

  // ---------- the windmill ----------
  populateWindmill() {
    Actors.npc({ id: 'cumula', name: 'Auntie Cumula', look: LOOKS.cumula, x: -0.4, z: 0.6, ry: Math.PI });
    // a little cloud that floats about
    const cloud = new THREE.Group(); for (let i = 0; i < 5; i++) cloud.add(mesh(GEO.ico, 0xffffff, (i - 2) * 0.22, Math.sin(i) * 0.1, 0, 0.45, 0.35, 0.4));
    addEnt({ kind: 'deco', obj: cloud, t: 0, x: 0, z: 0, update(dt) { this.t += dt; cloud.position.set(Math.sin(this.t * 0.5) * 2.5, 2.4 + Math.sin(this.t * 1.3) * 0.2, Math.cos(this.t * 0.5) * 2.0 - 0.5); } });
  },

  // ---------- the lighthouse ----------
  populateLh(a, floor) {
    const T = (id, x, z, path, kind, extra) => { if (!G.save.dead[id] && !F('bossDone')) return Actors.ticker(Object.assign({ id, x, z, path, kind }, extra || {})); };
    if (floor === 0) {
      a.waterMesh.visible = !F('lhDrained');
      a.water = null;
      T('lh0a', 3, -2, [[3, -2], [3, 3]]); T('lh0b', -3, 2, [[-3, 2], [1, -3]]);
      for (const [x, z] of [[5.2, 1.5], [5.5, -0.8], [-4.5, 4.4]]) Actors.breakable({ x, z, type: 'barrel' });
      if (!F('lhEnter')) { setFlag('lhEnter'); Timers.after(0.6, () => Dialog.say(["Wick: The pump room's flooded. The drain valve is on the far wall... I'll need a steady hand for that. (Normal mode.)"])); }
      a.interacts.forEach((it) => { if (it.label === 'Turn the drain valve') { it.mode = 'normal'; it.modeMsg = 'You need a calm, steady grip to turn the valve. Switch to Normal mode (1).'; } });
    }
    if (floor === 1) {
      T('lh1a', -2.6, -0.6, null, 'heavy', { sleep: true, ry: 0.6 });
      T('lh1b', 2.4, -2.0, null, 'heavy', { sleep: true, ry: -2.2 });
      if (!G.save.dead.lh1chest) {
        const b = new Batch(); INT.furn(a, b, 'chest', 5.2, -1.2, -Math.PI / 2); const m = b.build(); a.group.add(m);
        a.interacts.push({ x: 4.6, z: -1.2, r: 1.4, label: 'Open the chest', cond: () => !G.save.dead.lh1chest, fn: () => { G.save.dead.lh1chest = true; Audio2.sfx('chest'); Actors.dropClams(4.4, 0.5, -1.2, 15); HUD.toast('A bailiff\'s pay chest! 15 clams.'); } });
      }
      if (!F('lh1Enter')) { setFlag('lh1Enter'); Timers.after(0.6, () => Dialog.say(['Wick: (Two big ones, fast asleep. Better tiptoe... Sneaky mode.)'])); }
    }
    if (floor === 2) {
      T('lh2a', 1.5, -6.6, [[-3, -6.6], [3, -6.6]]);
      if (!F('fuseBroken')) {
        const bars = new THREE.Group();
        for (let i = 0; i < 5; i++) bars.add(mesh(GEO.box, MAT.glow(0xb070ff), -0.6 + i * 0.3, 3.2, -7.6, 0.08, 2.4, 0.08));
        a.group.add(bars);
        const fuse = new THREE.Group(); fuse.add(mesh(GEO.box, 0x4a4a54, 0, 0, 0, 1.2, 1.0, 0.4)); fuse.add(mesh(GEO.sph, MAT.glow(0xd0a0ff), 0, 0, 0.2, 0.5, 0.5, 0.2));
        a.group.add(fuse);
        Actors.target({
          x: 1.8, y: 5.0, z: -7.4, aimY: 5.0, r: 0.8, aim: true, obj: fuse, bars, t: 0,
          update(dt) { this.t += dt; bars.children.forEach((c, i) => { c.visible = Math.sin(this.t * 30 + i * 2) > -0.6; }); },
          onPebble() {
            if (!Pebble.sun) { Audio2.sfx('zap'); FX.burst(1.8, 5, -7.4, 0xd0a0ff, 8, 3); HUD.toast('ZZT! The plain pebble fizzles on the fuse. It needs more power than that. (Auntie Cumula?)', 'fuse'); return 'stop'; }
            Audio2.sfx('boom'); FX.gears(1.8, 5, -7.4, 10, 0x4a4a54); this.dead = true; bars.visible = false; bars.parent && bars.parent.remove(bars);
            setFlag('fuseBroken'); writeSave(); HUD.toast('The fuse blows! The way up is clear.');
            return 'stop';
          },
          onPunch() { return false; },
        });
      }
    }
    if (floor === 3) {
      if (F('bossDone')) {
        const lamp = new THREE.Mesh(GEO.ico1, new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); lamp.scale.setScalar(2.4); lamp.position.y = 2.2; a.group.add(lamp);
        const l = new THREE.PointLight(0xffe8a0, 2, 20); l.position.y = 2.6; a.group.add(l);
        W.cols.push({ t: 'cyl', x: 0, z: 0, r: 1.6, y0: -1, y1: 5, noStand: true });
        return;
      }
      G.bossActive = true;
      const boss = Boss.spawn(a); G.boss = boss;
      Timers.after(0.3, () => this.bossIntro(boss));
    }
  },
  async valve() {
    if (F('lhDrained')) return;
    const a = W.area;
    await this.cut(async () => {
      Hero.state = 'valve'; Hero.ry = -Math.PI / 2;
      Audio2.sfx('creak');
      for (let i = 0; i < 20; i++) { a.valve.rotation.x += 0.18; await wait(0.07); if (i % 6 === 0) Audio2.sfx('creak'); }
      Audio2.sfx('splash');
      for (let i = 0; i < 20; i++) { a.waterMesh.position.y -= 0.03; await wait(0.05); }
      a.waterMesh.visible = false;
      Hero.state = 'free';
      await Dialog.say(['Gurgle... GLUG. The flood drains away down the old pipes. The stair door groans and swings loose.']);
    });
    setFlag('lhDrained'); writeSave();
  },
  async bossIntro(boss) {
    await this.cut(async () => {
      camCine([-8.5, 6.5, 4.5], [0, 2.0, -3.5]);
      boss.state = 'intro';
      await wait(0.6);
      Audio2.sfx('roar'); CAM.shake = 0.3;
      await Dialog.say([
        'Foreman Gearwhistle: WELL, well, well. A trespasser in my lamp room. On my shift.',
        "Wick: It's MY lamp room. And that thing is going.",
        "Foreman Gearwhistle: This 'thing' is a Plume Patent Storm Engine, little keeper. It turns your sunshine into the Baron's profit. And I am its FOREMAN.",
        'Foreman Gearwhistle: Nobody gets past my ledger. NOBODY!',
      ]);
      camFixed(W.area.cams);
    });
    boss.state = 'stalk'; boss.st = 0; boss.nextMove = 2;
    this.music();
    HUD.toast("His ledger blocks everything from the front. Make him charge into a wall, then hit his back boiler!", 'boss1', 7);
  },
  bossHalf() {
    HUD.toast('Foreman Gearwhistle: Enough! FULL POWER TO THE ENGINE!', null, 3);
  },
  bossPhase2() {
    const b = G.boss; b.phase = 2;
    Audio2.sfx('roar'); lightning(1); CAM.shake = 0.4;
    Timers.after(0.5, () => {
      HUD.toast('The Storm Engine roars to life! Wait for its cage to open, then hit the core with the sun-pebble.', 'boss2', 6);
      for (const [x, z] of [[-5, 3], [5, 3]]) Actors.ticker({ x, z });
    });
  },
  coreHit() {
    const b = G.boss, eng = b.eng;
    b.coreHp--; Audio2.sfx('boom'); lightning(1); CAM.shake = 0.5;
    FX.burst(0, 1.9, 0, 0xd8b0ff, 30, 7);
    eng.cycle = 0;
    if (b.coreHp === 1) for (const [x, z] of [[-6, -2], [6, -2]]) Actors.ticker({ x, z });
    if (b.coreHp <= 0) this.victory();
    else HUD.toast(b.coreHp === 2 ? 'Direct hit! The engine shudders.' : 'One more!');
  },
  async victory() {
    const b = G.boss, eng = b.eng;
    eng.dead = true; b.state = 'down'; G.peace = true;
    for (const e of W.ents) if (e.kind === 'foe') { e.die(); }
    await this.cut(async () => {
      Audio2.music(null);
      camCine([0, 7, 10], [0, 1.9, 0]);
      for (let i = 0; i < 6; i++) { Audio2.sfx('boom'); lightning(1); FX.gears(rnd(-1, 1), 1.9 + rnd(-1, 1), rnd(-1, 1), 8, i % 2 ? 0x9a5aff : 0xd6b25a); await wait(0.35); }
      HUD.flash();
      eng.g.visible = false; eng.col.off = true;
      G.weather = 'sun';
      applySky('lamp'); R.hemi.intensity = 1.3; R.sun.intensity = 1.2;
      const lamp = new THREE.Mesh(GEO.ico1, new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); lamp.scale.setScalar(2.4); lamp.position.y = 2.2; W.area.group.add(lamp);
      Audio2.sfx('fanfare');
      await wait(1.5);
      await Dialog.say([
        "Foreman Gearwhistle: My... my beautiful engine. The Baron will dock my winding privileges for a MONTH...",
        { who: '', text: 'With a long, sad "sproing", the Foreman unwinds and sits down with a clank.' },
        'A voice booms from outside, through a very large megaphone.',
        'Baron Plume: GEARWHISTLE! What is going ON down there?! My sunshine is LEAKING!',
        'Baron Plume: YOU! Little keeper! Do you have ANY idea what that engine cost?! I shall send you the bill! With INTEREST!',
        'Wick: Send it to the Weather Office. I hear they have a very nice PAID stamp.',
        'Baron Plume: Hmph! HMPH! This is not over! Full steam for the Sky-Isles! And somebody find me a new foreman!',
      ]);
      Audio2.music('victory');
      HUD.fade(1, 1.0); await wait(1.2);
      setFlag('bossDone'); G.bossActive = false; G.peace = false; writeSave();
      enterArea('isle', [-82.6, 6, Math.PI / 2], { quiet: true });
      camCine([-70, 22, 18], [-86, 10, 6]);
      HUD.fade(0, 1.5); await wait(2.0);
      camCine([-74, 12, 14], [-84, 9, 6], 2.5);
      await wait(2.4);
      await Dialog.say([
        'Mayor Bunting: Three cheers for the keeper! Hip hip...',
        'Everyone: HOORAY!',
        "Auntie Cumula: Look at that sky, dear. Blue as a duck's egg. And your lamp, turning again.",
        'Wick: Grandma never let it go dark. Neither will I.',
      ]);
      camIso(false);
    });
    HUD.showEnd();
  },
};
