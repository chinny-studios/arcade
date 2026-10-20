// Boot: title → intro or continue → world. Plus the TB debug helpers that span modules.

async function boot() {
  requestAnimationFrame((t) => Loop.tick(t));
  if (DEBUG) return;   // tests call TB.start()
  const choice = await Title.show();
  if (choice === 'continue' && Save.read()) {
    World.enter();
  } else {
    newGame();
    await Story.intro();
    World.enter();
  }
}

DBG.start = async (o = {}) => {
  Scenes.stack.length = 0;
  Fade.a = 0;
  R.seed(o.seed == null ? 1 : o.seed);
  newGame();
  DBG.fast = o.fast !== false;
  DBG.autoText = o.autoText !== false;
  G.options.music = false; G.options.sfx = false;
  if (o.starter) {
    G.party.push(Mon.create(o.starter, o.lv || 5)); Mon.markCaught(o.starter);
    G.starter = o.starter;
    setFlag('got_starter'); setFlag('rival1'); setFlag('got_dex'); setFlag('intro_done');
    bagAdd('orb', 5); bagAdd('potion', 2);
  }
  if (o.map) { G.map = o.map; G.x = o.x; G.y = o.y; }
  World.enter();
  await DBG.sim(0.2);
  return DBG.scenes();
};
DBG.auto = (on = true) => { DBG.fast = on; DBG.autoText = on; };
DBG.G = () => G;
DBG.flags = () => G.flags;
DBG.give = (item, n = 1) => bagAdd(item, n);
DBG.giveMon = (sp, lv = 5) => { const m = Mon.create(sp, lv); Mon.addToParty(m); Mon.markCaught(sp); return m; };
// boost(lv): level every party member up to lv the normal way (learning moves, replacing the weakest when full,
// evolving), then heal. boost(0) just heals.
DBG.boost = (lv) => {
  for (const m of G.party) {
    if (m.lv < lv) {
      const evs = Mon.gainXp(m, Mon.xpAt(lv, SPECIES[m.sp].growth) - m.xp);
      for (const ev of evs) {
        if (ev.type === 'learnFull') {
          let k = 0;
          m.moves.forEach((mv, i) => { if ((MOVES[mv.id].power || 0) < (MOVES[m.moves[k].id].power || 0)) k = i; });
          Mon.teach(m, ev.move, k);
        } else if (ev.type === 'evolve') Mon.evolve(m, ev.to);
      }
    }
    Mon.heal(m);
  }
};
DBG.story = Story;
DBG.tp = (map, x, y, dir = 'down') => World.warp(map, x, y, dir);
DBG.battle = (sp, lv = 5) => Battle.wild(sp, lv);
DBG.trainer = (t) => Battle.trainer(t);

boot();
