// Tidebound: battle engine. Turn order, damage, status and stat effects, the trainer AI, switching, running,
// catching, XP and the flow of a battle from transition to result. Drawing and animation are in
// 41_battle_ui.js (Battle.ui.*); the evolution scene is in 42_evolve.js. Only `Battle` and `Evolve` are top-level.

const Battle = {
  current: null,   // the battle in progress (read by the debug hook)
  ui: {},          // drawing and animation, filled in by 41_battle_ui.js
};

(function () {
  const B = Battle;

  const STAT_NAME = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasion' };
  const STATUS_TEXT = { psn: 'was poisoned!', brn: 'was burned!', par: 'is paralyzed! It may be unable to move!', slp: 'fell asleep!' };
  const CRIT_RATE = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2];
  const ABILITY_TYPE = { overgrow: 'grass', blaze: 'fire', torrent: 'water' };
  const STRUGGLE = { id: 'struggle', name: 'STRUGGLE', type: 'normal', cat: 'phys', power: 50, acc: 0, pp: 1, prio: 0,
    contact: true, recoil: 0.25, desc: 'Used when every move is out of PP.' };

  const clampStage = (v) => Math.max(-6, Math.min(6, v));
  const stageMul = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
  const accMul = (s) => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
  const abil = (m) => m.ability;
  const typesOf = (m) => SPECIES[m.sp].types;
  const moveOf = (act) => (act.struggle ? STRUGGLE : MOVES[act.id]);
  const other = (k) => (k === 'p' ? 'e' : 'p');
  const pause = (sec) => wait(DBG.fast ? 0 : sec);

  // ---------- sides ----------
  // A side is one combatant on the field: { key: 'p'|'e', mon, wild, stages, flinch, seedBy, down, shown }.
  // `shown` is the HP the bar currently displays; the animation drains it toward mon.hp.
  function makeSide(key, mon, wild) {
    return {
      key, mon, wild, down: false, flinch: false, seedBy: null,
      stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      shown: mon.hp, ox: 0, oy: 0, hide: false, alpha: 1, xpShown: 0,
    };
  }

  // "EMBIT", "The wild DUNEBUN", "Foe GULLIP": the prefix used at the start of a message.
  B.who = (side) => {
    const n = Mon.name(side.mon);
    if (side.key === 'p') return n;
    return side.wild ? 'The wild ' + n : 'Foe ' + n;
  };
  // "FOE GULLIP" for "It doesn't affect FOE GULLIP…"
  B.label = (side) => (side.key === 'p' ? '' : 'FOE ') + Mon.name(side.mon).toUpperCase();
  const say = (text, opts) => UI.say(text, opts);

  // XP progress inside the current level, 0..1 (for the XP bar).
  B.xpFrac = (m) => {
    const g = SPECIES[m.sp].growth;
    const lo = Mon.xpAt(m.lv, g), hi = Mon.xpAt(m.lv + 1, g);
    return Math.max(0, Math.min(1, (m.xp - lo) / Math.max(1, hi - lo)));
  };

  // ---------- stats ----------
  const statOf = (side, key) => Math.max(1, Math.floor(Mon.stats(side.mon)[key] * stageMul(side.stages[key])));

  function speedOf(side) {
    let v = statOf(side, 'spe');
    if (side.mon.status === 'par') v = Math.floor(v * 0.25);
    if (abil(side.mon) === 'swiftswim' && side.mon.hp === Mon.maxhp(side.mon)) v = Math.floor(v * 1.5);
    return v;
  }

  // ---------- damage ----------
  // Gen-3 formula. opts.crit: a critical hit. opts.avg: no random roll, for the trainer AI's estimates.
  function calcDamage(atk, def, mv, opts = {}) {
    const L = atk.mon.lv;
    const phys = mv.cat === 'phys';
    let A = statOf(atk, phys ? 'atk' : 'spa');
    const D = statOf(def, phys ? 'def' : 'spd');
    if (phys && atk.mon.status && abil(atk.mon) === 'guts') A = Math.floor(A * 1.5);
    const x = Math.floor(2 * L / 5 + 2);
    let dmg = Math.floor(Math.floor(x * mv.power * A / D) / 50) + 2;
    const crit = !!opts.crit && !opts.avg;
    if (crit) dmg *= 2;
    const roll = opts.avg ? 92.5 : R.int(85, 100);
    dmg = Math.floor(dmg * roll / 100);
    if (phys && atk.mon.status === 'brn' && abil(atk.mon) !== 'guts') dmg = Math.floor(dmg / 2);
    if (typesOf(atk.mon).includes(mv.type)) dmg = Math.floor(dmg * 1.5);
    const eff = typeEff(mv.type, typesOf(def.mon));
    dmg = Math.floor(dmg * eff);
    const item = atk.mon.item && ITEMS[atk.mon.item];
    if (item && item.typeBoost === mv.type) dmg = Math.floor(dmg * 1.2);
    if (ABILITY_TYPE[abil(atk.mon)] === mv.type && atk.mon.hp * 3 <= Mon.maxhp(atk.mon)) dmg = Math.floor(dmg * 1.5);
    if (mv.type === 'fire' && abil(def.mon) === 'thickfat') dmg = Math.floor(dmg * 0.5);
    if (eff > 0 && dmg < 1) dmg = 1;
    return { dmg: eff === 0 ? 0 : dmg, eff, crit };
  }

  // Trainer AI estimate: expected damage of a move with no crit and an average roll.
  const estDamage = (atk, def, mv) => (mv.cat === 'status' ? 0 : calcDamage(atk, def, mv, { avg: true }).dmg);

  function hitCheck(a, d, mv) {
    if (mv.ohko) {
      const diff = a.mon.lv - d.mon.lv;
      return diff >= 0 && R.float() * 100 < 30 + diff;
    }
    if (!mv.acc) return true;   // acc 0 never misses
    let acc = mv.acc * accMul(a.stages.acc) / accMul(d.stages.eva);
    if (abil(a.mon) === 'compoundeyes') acc *= 1.3;
    return R.float() * 100 < acc;
  }

  const effectText = (eff) => (eff > 1 ? 'It\'s super effective!' : eff < 1 && eff > 0 ? 'It\'s not very effective…' : null);

  // ---------- status and stat stages ----------
  function canInflict(side, s) {
    const m = side.mon;
    if (m.hp <= 0 || m.status) return false;
    const t = typesOf(m);
    if (s === 'psn' && t.includes('poison')) return false;
    if (s === 'brn' && t.includes('fire')) return false;
    return true;
  }

  async function inflict(side, s) {
    side.mon.status = s;
    if (s === 'slp') side.mon.slp = R.int(1, 3);
    await say(B.who(side) + ' ' + STATUS_TEXT[s]);
  }

  async function changeStat(side, stats) {
    for (const k of Object.keys(stats)) {
      const d = stats[k];
      if (k === 'acc' && d < 0 && abil(side.mon) === 'keeneye') {
        await say(B.who(side) + '\'s KEEN EYE prevents accuracy loss!');
        continue;
      }
      const cur = side.stages[k];
      const nv = clampStage(cur + d);
      if (nv === cur) {
        await say(B.who(side) + '\'s ' + STAT_NAME[k] + ' won\'t go ' + (d > 0 ? 'higher' : 'lower') + '!');
        continue;
      }
      side.stages[k] = nv;
      const big = Math.abs(d) >= 2;
      const verb = d > 0 ? (big ? 'sharply rose!' : 'rose!') : (big ? 'harshly fell!' : 'fell!');
      Sound.play(d > 0 ? 'statup' : 'statdown');
      await say(B.who(side) + '\'s ' + STAT_NAME[k] + ' ' + verb);
    }
  }

  // Contact abilities of the defender (static, poisonpoint) on the attacker.
  async function contactEffects(a, d) {
    const ab = abil(d.mon);
    if (ab === 'static' && R.float() < 0.3 && canInflict(a, 'par')) await inflict(a, 'par');
    else if (ab === 'poisonpoint' && R.float() < 0.3 && canInflict(a, 'psn')) await inflict(a, 'psn');
  }

  // ---------- move execution ----------
  // Returns false when the actor could not move this turn (asleep, flinched, paralysed).
  async function canAct(a) {
    const m = a.mon;
    if (m.status === 'slp') {
      if (m.slp > 0) {
        m.slp--;
        await say(B.who(a) + ' is fast asleep.');
        return false;
      }
      m.status = null;
      await say(B.who(a) + ' woke up!');
    }
    if (a.flinch) {
      await say(B.who(a) + ' flinched and couldn\'t move!');
      return false;
    }
    if (m.status === 'par' && R.float() < 0.25) {
      await say(B.who(a) + ' is paralyzed! It can\'t move!');
      return false;
    }
    return true;
  }

  // A status move (no damage). Effects: heal, rest, leech seed, status, stat stages.
  async function statusMove(S, ak, dk, mv) {
    const a = S[ak], d = S[dk];
    const selfSleep = mv.status && mv.status.self;
    const tgt = (mv.stat && mv.stat.target === 'self') || mv.heal || selfSleep ? a : d;
    if (mv.heal) {
      const max = Mon.maxhp(a.mon);
      if (a.mon.hp >= max) { await say('But it failed!'); return; }
      await B.ui.attack(S, ak, dk, mv, { dmg: 0 });
      if (selfSleep) {
        a.mon.status = 'slp';
        a.mon.slp = 2;
        a.mon.hp = max;
        await B.ui.drain(a);
        await say(B.who(a) + ' went to sleep and became healthy!');
        return;
      }
      a.mon.hp = Math.min(max, a.mon.hp + Math.floor(max * mv.heal));
      await B.ui.drain(a);
      await say(B.who(a) + ' regained health!');
      return;
    }
    if (mv.seed) {
      if (d.seedBy) { await say('But it failed!'); return; }
      await B.ui.attack(S, ak, dk, mv, { dmg: 0 });
      d.seedBy = ak;
      await say(B.who(d) + ' was seeded!');
      return;
    }
    if (mv.status && !selfSleep) {
      await B.ui.attack(S, ak, dk, mv, { dmg: 0 });
      if (!canInflict(d, mv.status.s)) { await say('But it failed!'); return; }
      await inflict(d, mv.status.s);
      return;
    }
    if (selfSleep) {   // rest with no heal (never used, but keep it safe)
      a.mon.status = 'slp';
      a.mon.slp = 2;
      await say(B.who(a) + ' went to sleep!');
      return;
    }
    if (mv.stat) {
      await B.ui.attack(S, ak, dk, mv, { dmg: 0 });
      await changeStat(tgt, mv.stat.stats);
      return;
    }
    await say('But it failed!');
  }

  // A damaging move: hits, crits, effectiveness, drain, recoil, secondary effects.
  async function damageMove(S, ak, dk, mv) {
    const a = S[ak], d = S[dk];
    const hits = mv.multi ? R.int(mv.multi[0], mv.multi[1]) : 1;
    let landed = 0, totalDmg = 0;
    for (let h = 0; h < hits; h++) {
      if (a.mon.hp <= 0 || d.mon.hp <= 0) break;
      const crit = R.float() < CRIT_RATE[Math.min(4, mv.crit || 0)];
      let r;
      if (mv.type === 'ground' && abil(d.mon) === 'levitate') r = { dmg: 0, eff: 0, crit: false };
      else if (mv.ohko) r = { dmg: d.mon.hp, eff: 1, crit: false };
      else if (mv.fixed) r = { dmg: mv.fixed, eff: 1, crit: false };
      else r = calcDamage(a, d, mv, { crit });
      if (r.eff === 0) {
        await say('It doesn\'t affect ' + B.label(d) + '…');
        break;
      }
      if (mv.type === 'water' && abil(d.mon) === 'waterabsorb') {
        d.mon.hp = Math.min(Mon.maxhp(d.mon), d.mon.hp + Math.floor(Mon.maxhp(d.mon) / 4));
        await B.ui.drain(d);
        await say(B.who(d) + '\'s WATER ABSORB restored HP!');
        break;
      }
      if (r.crit) await say('A critical hit!');
      let dmg = Math.min(r.dmg, d.mon.hp);
      const sturdy = abil(d.mon) === 'sturdy' && d.mon.hp === Mon.maxhp(d.mon) && dmg >= d.mon.hp;
      if (sturdy) dmg = d.mon.hp - 1;
      d.mon.hp -= dmg;
      landed++;
      totalDmg += dmg;
      await B.ui.attack(S, ak, dk, mv, { dmg, eff: r.eff, crit: r.crit });
      if (sturdy) await say(B.who(d) + ' endured the hit!');
      if (mv.ohko) await say('It\'s a one-hit KO!');
      const et = effectText(r.eff);
      if (et) await say(et);
      if (mv.contact && d.mon.hp > 0 && a.mon.hp > 0) await contactEffects(a, d);
      if (d.mon.hp <= 0) break;
    }
    if (!landed) return;
    if (hits > 1) await say('Hit ' + landed + ' time(s)!');

    if (mv.drain && a.mon.hp > 0) {
      const heal = Math.max(1, Math.floor(totalDmg * mv.drain));
      a.mon.hp = Math.min(Mon.maxhp(a.mon), a.mon.hp + heal);
      await B.ui.drain(a);
      await say('Sucked health from ' + B.label(d) + '!');
    }
    if (mv.recoil && a.mon.hp > 0) {
      const r = Math.max(1, Math.floor(totalDmg * mv.recoil));
      a.mon.hp = Math.max(0, a.mon.hp - r);
      await B.ui.drain(a);
      await say(B.who(a) + ' is damaged by recoil!');
    }
    // secondary effects: they need the target alive
    if (mv.status && !mv.status.self && d.mon.hp > 0 && R.float() * 100 < mv.status.chance && canInflict(d, mv.status.s)) {
      await inflict(d, mv.status.s);
    }
    if (mv.flinch && d.mon.hp > 0 && R.float() * 100 < mv.flinch) d.flinch = true;
    if (mv.stat && mv.stat.chance !== undefined && R.float() * 100 < mv.stat.chance) {
      if (mv.stat.target === 'self' && a.mon.hp > 0) await changeStat(a, mv.stat.stats);
      else if (mv.stat.target !== 'self' && d.mon.hp > 0) await changeStat(d, mv.stat.stats);
    }
  }

  // Runs one move. act = { kind:'move', slot, id, struggle? }.
  async function useMove(S, ak, act) {
    const a = S[ak], dk = other(ak), d = S[dk];
    const mv = moveOf(act);
    if (!(await canAct(a))) return;
    await say(B.who(a) + ' used ' + mv.name + '!');
    if (!act.struggle) a.mon.moves[act.slot].pp--;
    if (!hitCheck(a, d, mv)) {
      await say(B.who(a) + '\'s attack missed!');
      return;
    }
    if (mv.cat === 'status') await statusMove(S, ak, dk, mv);
    else await damageMove(S, ak, dk, mv);
  }

  B._internal = { makeSide, statOf, speedOf, calcDamage, estDamage, canAct, useMove, changeStat, inflict, canInflict,
    moveOf, other, pause, abil, typesOf, say, STRUGGLE, clampStage, accMul, stageMul };

  // ---------- move choice ----------
  const usable = (m) => m.moves.map((mv, slot) => ({ slot, id: mv.id, pp: mv.pp })).filter((x) => x.pp > 0);
  const STRUGGLE_ACT = (mon) => ({ kind: 'move', struggle: true, slot: -1, id: 'struggle', mon, pri: 0 });
  const moveAct = (mon, slot) => ({ kind: 'move', slot, id: mon.moves[slot].id, mon, pri: MOVES[mon.moves[slot].id].prio });

  // Trainer AI: 70% the damaging move with the best expected damage, else random. Potion when low.
  function enemyAction(S) {
    const e = S.e, m = e.mon;
    if (!S.wild && S.potions > 0 && m.hp > 0 && m.hp <= Mon.maxhp(m) / 4) {
      S.potions--;
      return { kind: 'potion', mon: m, pri: 6 };
    }
    const opts = usable(m);
    if (!opts.length) return STRUGGLE_ACT(m);
    let pick;
    if (!S.wild && R.float() < 0.7) {
      let best = -1;
      for (const o of opts) {
        const d = estDamage(e, S.p, MOVES[o.id]);
        if (d > best) { best = d; pick = o; }
      }
    } else {
      pick = R.pick(opts);
    }
    return moveAct(m, pick.slot);
  }

  // Debug autoBattle: the usable move with the most expected damage (first move if none does damage).
  function bestAct(S) {
    const m = S.p.mon;
    const opts = usable(m);
    if (!opts.length) return STRUGGLE_ACT(m);
    let best = opts[0], bestD = -1;
    for (const o of opts) {
      const d = estDamage(S.p, S.e, MOVES[o.id]);
      if (d > bestD) { bestD = d; best = o; }
    }
    return moveAct(m, best.slot);
  }

  // Player's turn choice: FIGHT / BAG / TIDELINGS / RUN. Loops until something takes a turn.
  async function playerChoice(S) {
    if (DBG.autoBattle) return bestAct(S);
    for (;;) {
      const c = await B.ui.menu(S, 'action');
      if (c === 0) {
        const slot = await B.ui.moveMenu(S);
        if (slot < 0) continue;
        if (S.p.mon.moves[slot].pp <= 0) { await say('There\'s no PP left for this move!'); continue; }
        return moveAct(S.p.mon, slot);
      }
      if (c === 1) {
        const r = await Menus.bag({ mode: 'battle' });
        if (!r) continue;
        const it = ITEMS[r.item];
        if (it.kind === 'ball') {
          if (!S.wild) { await say('The trainer blocked the ORB!'); continue; }
          return { kind: 'ball', item: r.item, mon: S.p.mon, pri: 6 };
        }
        if (it.kind === 'medicine' && r.target != null) {
          const mon = G.party[r.target];
          const res = Menus.useMedicine(r.item, mon);
          await say(res.text);
          if (!res.ok) continue;
          bagAdd(r.item, -1);
          if (r.target === S.pi) await B.ui.drain(S.p);
          if (res.events && res.events.length) await Menus.showEvents(mon, res.events);
          return { kind: 'noop', mon: S.p.mon, pri: 6 };
        }
        await say('That can\'t be used here.');
        continue;
      }
      if (c === 2) {
        const idx = await chooseSwitch(S, false);
        if (idx < 0) continue;
        return { kind: 'switch', idx, mon: S.p.mon, pri: 6 };
      }
      if (c === 3) {
        const r = await tryRun(S);
        if (r === 'escaped') return { kind: 'escaped' };
        if (r === 'failed') return { kind: 'noop', mon: S.p.mon, pri: 6 };
      }
    }
  }

  // ---------- running ----------
  // Gen-3 escape: always when faster or with Run Away; otherwise F = speed*128/enemy speed + 30 per attempt.
  // Returns 'escaped', 'failed' (turn lost) or 'denied' (no turn used).
  async function tryRun(S, forced) {
    if (!S.wild) { await say('No! There\'s no running from a trainer battle!'); return 'denied'; }
    if (S.static) { await say('Can\'t escape!'); return 'denied'; }
    S.runs++;
    const p = S.p.mon, e = S.e.mon;
    const ps = Mon.stats(p).spe, es = Mon.stats(e).spe;
    let ok = abil(p) === 'runaway' || ps > es;
    if (!ok) {
      const F = Math.floor(ps * 128 / Math.max(1, es)) + 30 * (S.runs - 1);
      ok = R.int(0, 255) < F;
    }
    if (ok) {
      Sound.play('flee');
      await say('Got away safely!');
      S.result = 'run';
      S.over = true;
      return 'escaped';
    }
    await say('Can\'t escape!');
    return 'failed';
  }

  // ---------- catching ----------
  // Gen-3 catch: a = ((3maxHP - 2HP) × rate × ball) / 3maxHP × status; b from a; four shake checks.
  async function throwBall(S, item) {
    const ball = ITEMS[item];
    bagAdd(item, -1);
    const foe = S.e.mon, sp = SPECIES[foe.sp];
    const max = Mon.maxhp(foe);
    let a = ((3 * max - 2 * foe.hp) * sp.catchRate * ball.ballRate) / (3 * max);
    if (foe.status === 'slp') a *= 2;
    else if (foe.status === 'psn' || foe.status === 'par' || foe.status === 'brn') a *= 1.5;
    a = Math.max(1, Math.floor(a));
    let passes = 0;
    if (a >= 255) passes = 4;
    else {
      const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / a)));
      while (passes < 4 && R.int(0, 65535) < b) passes++;
    }
    const caught = passes >= 4;
    await B.ui.throwBall(S, item, caught ? 3 : Math.min(passes, 3), caught);
    if (!caught) {
      await say(passes === 3 ? 'Aww! It appeared to be caught!' : 'Oh no! ' + Mon.name(foe) + ' broke free!');
      return false;
    }
    const isNew = !G.dex.caught[foe.sp];
    Mon.markCaught(foe.sp);
    foe.ot = G.name;
    foe.caughtAt = World.map ? World.map.id : '';
    Music.play('caught');
    await say('Gotcha! ' + sp.name + ' was caught!');
    if (isNew) await say(sp.name + '\'s data was added to the TIDEDEX.');
    const wantNick = DBG.autoBattle ? false : await UI.yesno('Give a nickname to the caught ' + sp.name + '?');
    if (wantNick) {
      const nick = await Menus.name('Nickname for ' + sp.name + '?', sp.name);
      if (nick && nick.trim()) foe.nick = nick.trim();
    }
    if (Mon.addToParty(foe) === 'box') await say(Mon.name(foe) + ' was sent to the PC.');
    S.result = 'caught';
    S.over = true;
    return true;
  }

  // ---------- XP and level events ----------
  // Handles the events of Mon.gainXp for a battle: level messages and stats box, learn messages, forget prompts.
  // Evolutions are not run here: they are returned as { mon, to } and run after the battle.
  async function handleEvents(m, events, oldStats) {
    const name = Mon.name(m);
    const evolves = [];
    const leveled = events.some((ev) => ev.type === 'level');
    for (const ev of events) {
      if (ev.type === 'level') {
        Sound.play('levelup');
        await say(name + ' grew to Lv. ' + ev.lv + '!');
      }
    }
    if (leveled) await B.ui.statsBox(m, oldStats, Mon.stats(m));
    for (const ev of events) {
      if (ev.type === 'learn') {
        await say(name + ' learned ' + MOVES[ev.move].name + '!');
      } else if (ev.type === 'learnFull') {
        await learnFull(m, ev.move);
      } else if (ev.type === 'evolve' && Mon.canEvolve(m)) {
        evolves.push({ mon: m, to: ev.to });
      }
    }
    return evolves;
  }

  async function learnFull(m, move) {
    const name = Mon.name(m), mvName = MOVES[move].name;
    const question = name + ' wants to learn ' + mvName + '. But ' + name + ' can\'t learn more than four moves. '
      + 'Delete a move to make room for ' + mvName + '?';
    const yes = DBG.autoBattle ? false : await UI.yesno(question);
    const slot = yes ? await Menus.forgetMove(m, move) : -1;
    if (slot >= 0) {
      const old = MOVES[m.moves[slot].id].name;
      Mon.teach(m, move, slot);
      await say('1, 2, and... Poof! ' + name + ' forgot ' + old + '. And... ' + name + ' learned ' + mvName + '!');
    } else {
      await say(name + ' did not learn ' + mvName + '.');
    }
  }

  // Shares the XP of a fainted foe among the fighters (and half to each EXP. Share holder).
  async function awardXp(S, foe) {
    const total = Mon.xpYield(foe, !S.wild);
    const fighters = [...S.parts].filter((m) => m && m.hp > 0);
    const shares = new Map();
    if (fighters.length) for (const m of fighters) shares.set(m, Math.max(1, Math.floor(total / fighters.length)));
    for (const m of G.party) {
      if (m.item === 'expshare' && m.hp > 0) shares.set(m, (shares.get(m) || 0) + Math.max(1, Math.floor(total / 2)));
    }
    for (const [m, x] of shares) {
      const oldStats = Mon.stats(m);
      const frac0 = B.xpFrac(m);
      const lvBefore = m.lv;
      await say(Mon.name(m) + ' gained ' + x + ' EXP. Points!');
      const events = Mon.gainXp(m, x);
      if (m === S.p.mon) await B.ui.xpBar(S.p, frac0, B.xpFrac(m), m.lv !== lvBefore);
      const evolves = await handleEvents(m, events, oldStats);
      for (const ev of evolves) S.evolves.push(ev);
    }
  }

  // ---------- switching ----------
  async function enterEnemy(S, mon) {
    S.e = makeSide('e', mon, S.wild);
    Mon.markSeen(mon.sp);
    await B.ui.sendOut(S.e);
  }

  async function enterPlayer(S, idx) {
    const old = S.p && S.p.mon;
    if (old && old.hp > 0) {
      if (old.ability === 'naturalcure') { old.status = null; old.slp = 0; }
      await say(Mon.name(old) + ', come back!');
      await B.ui.recall(S.p);
    }
    S.pi = idx;
    S.p = makeSide('p', G.party[idx], false);
    S.parts.add(G.party[idx]);
    await say('Go! ' + Mon.name(G.party[idx]) + '!');
    await B.ui.sendOut(S.p);
  }

  // Intimidate: the foe's Attack drops when the mon comes in.
  async function intimidate(S, key) {
    const side = S[key], foe = S[other(key)];
    if (abil(side.mon) !== 'intimidate' || foe.mon.hp <= 0) return;
    await say(B.who(side) + '\'s INTIMIDATE!');
    await changeStat(foe, { atk: -1 });
  }

  async function switchIn(S, key, idx) {
    await enterPlayer(S, idx);
    await intimidate(S, 'p');
  }

  // Player picks a mon. forced: after a faint, no cancel. Returns the party index or -1.
  async function chooseSwitch(S, forced) {
    if (DBG.autoBattle) return G.party.findIndex((m, i) => m.hp > 0 && i !== S.pi);
    return Menus.party({
      mode: 'battle', active: S.pi, canCancel: !forced,
      title: forced ? 'Choose a TIDELING.' : undefined,
    });
  }

  // After the player's mon faints: "Use next TIDELING?" in wild battles (NO tries to run), then a switch.
  async function forcedSwitch(S) {
    for (;;) {
      if (S.wild) {
        const yes = DBG.autoBattle ? true : await UI.yesno('Use next TIDELING?');
        if (!yes) {
          const r = await tryRun(S, true);
          if (r === 'escaped') return;
        }
      }
      const idx = await chooseSwitch(S, true);
      if (idx >= 0) { await enterPlayer(S, idx); await intimidate(S, 'p'); return; }
    }
  }

  // ---------- faints ----------
  async function faintFoe(S) {
    const e = S.e;
    await B.ui.faint(e);
    await say(B.who(e) + ' fainted!');
    await awardXp(S, e.mon);
    S.parts = new Set([S.p.mon]);
    const ni = S.foes.findIndex((m) => m.hp > 0);
    if (ni < 0) { S.result = 'win'; S.over = true; return; }
    S.ei = ni;
    await say(S.title + ' is about to use ' + SPECIES[S.foes[ni].sp].name + '.');
    await enterEnemy(S, S.foes[ni]);
    await intimidate(S, 'e');
  }

  async function faintPlayer(S) {
    await B.ui.faint(S.p);
    await say(B.who(S.p) + ' fainted!');
    if (!G.party.some((m) => m.hp > 0)) {
      S.result = 'lose';
      S.over = true;
      await say('{P} is out of usable TIDELINGS!');
      return;
    }
    await forcedSwitch(S);
  }

  // Returns true when the battle is over.
  async function faintCheck(S) {
    if (S.over) return true;
    if (S.e.mon.hp <= 0) {
      await faintFoe(S);
      if (S.over) return true;
    }
    if (S.p.mon.hp <= 0) {
      await faintPlayer(S);
      return S.over;
    }
    return false;
  }

  // ---------- turn ----------
  // Higher priority first (items and switches are 6), then Quick Claw, then speed, ties random.
  function orderActs(S, list) {
    for (const x of list) {
      x.quick = x.act.kind === 'move' && S[x.key].mon.item === 'quickclaw' && R.float() < 0.2;
      x.spe = speedOf(S[x.key]);
      x.tie = R.float();
    }
    list.sort((x, y) => (y.act.pri - x.act.pri) || ((y.quick ? 1 : 0) - (x.quick ? 1 : 0))
      || (y.spe - x.spe) || (x.tie - y.tie));
    return list;
  }

  async function execAct(S, key, act) {
    switch (act.kind) {
      case 'move': return useMove(S, key, act);
      case 'ball': return throwBall(S, act.item);
      case 'switch': return switchIn(S, key, act.idx);
      case 'potion': {
        const e = S.e, max = Mon.maxhp(e.mon);
        e.mon.hp = Math.min(max, e.mon.hp + 20);
        await say(S.title + ' used a POTION!');
        return B.ui.drain(e);
      }
      default: return undefined;   // 'noop': the item was used before the turn
    }
  }

  // End-of-turn effects: poison, burn, leech seed, leftovers, berries, shed skin.
  async function endTurn(S) {
    for (const key of ['p', 'e']) {
      const side = S[key];
      side.flinch = false;
      const m = side.mon;
      if (m.hp <= 0) continue;
      const max = Mon.maxhp(m);
      if (side.seedBy) {
        const src = S[side.seedBy];
        const dmg = Math.max(1, Math.floor(max / 8));
        m.hp = Math.max(0, m.hp - dmg);
        await B.ui.drain(side);
        await say(B.who(side) + '\'s health is sapped by LEECH SEED!');
        if (src.mon.hp > 0) {
          src.mon.hp = Math.min(Mon.maxhp(src.mon), src.mon.hp + dmg);
          await B.ui.drain(src);
        }
      }
      if (m.hp > 0 && (m.status === 'psn' || m.status === 'brn')) {
        m.hp = Math.max(0, m.hp - Math.max(1, Math.floor(max / 8)));
        await B.ui.drain(side);
        await say(B.who(side) + (m.status === 'psn' ? ' is hurt by poison!' : ' is hurt by its burn!'));
      }
      if (m.hp > 0 && m.item === 'leftovers' && m.hp < max) {
        m.hp = Math.min(max, m.hp + Math.max(1, Math.floor(max / 16)));
        await B.ui.drain(side);
        await say(B.who(side) + ' restored a little HP using its LEFTOVERS!');
      }
      const berry = m.item && ITEMS[m.item];
      if (m.hp > 0 && berry && berry.threshold && m.hp <= max * berry.threshold) {
        m.hp = Math.min(max, m.hp + berry.heal);
        m.item = null;
        await B.ui.drain(side);
        await say(B.who(side) + ' ate its ORAN BERRY and regained HP!');
      } else if (m.hp > 0 && berry && berry.consume && berry.cure && m.status === berry.cure) {
        m.status = null; m.slp = 0; m.item = null;
        await say(B.who(side) + ' ate its ' + berry.name + ' and was cured!');
      }
      if (m.hp > 0 && m.status && abil(m) === 'shedskin' && R.float() < 0.3) {
        m.status = null; m.slp = 0;
        await say(B.who(side) + '\'s SHED SKIN cured its status!');
      }
    }
  }

  async function turn(S, pa) {
    S.turn++;
    const list = orderActs(S, [{ key: 'p', act: pa }, { key: 'e', act: enemyAction(S) }]);
    for (const x of list) {
      if (S.over) return;
      const side = S[x.key];
      if (x.act.mon !== side.mon || side.mon.hp <= 0) continue;
      await execAct(S, x.key, x.act);
      if (await faintCheck(S)) return;
    }
    if (S.over) return;
    await endTurn(S);
    await faintCheck(S);
  }

  // ---------- flow ----------
  async function intro(S) {
    if (S.wild) {
      await enterEnemy(S, S.foes[0]);
      await say('A wild ' + SPECIES[S.foes[0].sp].name + ' appeared!');
    } else {
      await B.ui.portrait(S, true);
      await say(S.title + ' would like to battle!');
      await B.ui.portrait(S, false);
      await say(S.title + ' sent out ' + SPECIES[S.foes[0].sp].name + '!');
      await enterEnemy(S, S.foes[0]);
    }
    await enterPlayer(S, S.pi);
    await intimidate(S, 'p');
    await intimidate(S, 'e');
  }

  async function finishMessages(S) {
    if (S.result !== 'win') return;
    Music.play(S.wild ? 'victory' : 'victoryTrainer');
    if (S.wild) return;
    await B.ui.portrait(S, true);
    if (S.t.lose) await say(S.t.lose);
    const last = S.foes[S.foes.length - 1];
    const money = (S.t.money || 0) * last.lv;
    if (money > 0) {
      G.money += money;
      Sound.play('money');
      await say('{P} got $' + money + ' for winning!');
    }
  }

  async function evolveAll(S) {
    const done = new Set();
    for (const ev of S.evolves) {
      if (done.has(ev.mon)) continue;
      done.add(ev.mon);
      const to = Mon.canEvolve(ev.mon);
      if (to) await Evolve.run(ev.mon, to);
    }
  }

  async function run(S) {
    B.current = S;
    S.prev = Music.current;
    S.parts = new Set();
    await B.ui.transition(S);
    Scenes.push(S.scene);
    Music.play(S.music);
    await intro(S);
    while (!S.over) {
      const pa = await playerChoice(S);
      if (pa.kind === 'escaped') break;
      await turn(S, pa);
    }
    await finishMessages(S);
    Scenes.pop(S.scene);
    if (S.result !== 'lose') await evolveAll(S);
    if (S.prev) Music.play(S.prev); else Music.stop();
    B.current = null;
    return S.result;
  }

  const potionCount = (items) => (Array.isArray(items) ? items.length : (items || 0));

  function begin(o) {
    const S = Object.assign({
      wild: false, static: false, music: 'battle', foes: [], title: '', t: null, potions: 0,
      turn: 0, runs: 0, pi: 0, p: null, e: null, ei: 0, parts: new Set(), evolves: [], over: false,
      result: null, prev: null, scene: null,
    }, o);
    S.pi = Math.max(0, G.party.findIndex((m) => m.hp > 0));
    S.scene = B.ui.scene(S);
    return run(S);
  }

  // Wild encounter. opts: { static, music, mon } (mon: a prebuilt monster). Resolves 'win'|'lose'|'run'|'caught'.
  B.wild = (sp, lv, opts = {}) => {
    const mon = opts.mon || Mon.create(sp, lv);
    return begin({ wild: true, static: !!opts.static, music: opts.music || 'battle', foes: [mon] });
  };

  // Trainer battle from a map trainer object. Resolves 'win'|'lose'.
  B.trainer = (t) => {
    const cls = t.cls, name = cls === 'RIVAL' ? G.rival : t.name;
    // a party entry may name a third value: the level whose moveset to use (a fresh rival knows only its first moves)
    const foes = t.party.map(([sp, lv, mlv]) => Mon.create(sp, lv, mlv ? { moves: Mon.create(sp, mlv).moves.map((m) => m.id) } : undefined));
    const music = t.music || (cls === 'RIVAL' ? 'rival' : cls === 'LEADER' ? 'gymbattle' : 'trainer');
    return begin({ wild: false, music, foes, title: cls + ' ' + name, t, potions: potionCount(t.items) });
  };

  // Internal helpers for 41_battle_ui.js and 42_evolve.js.
  Object.assign(B, { handleEvents, learnFull, chooseSwitch, tryRun, abil, moveOf });

  DBG.battle_state = () => {
    const S = B.current;
    if (!S || !S.p || !S.e) return null;
    const p = S.p.mon, e = S.e.mon;
    return {
      player: { sp: p.sp, hp: p.hp, lv: p.lv },
      enemy: { sp: e.sp, hp: e.hp, lv: e.lv },
      turn: S.turn,
    };
  };
})();
