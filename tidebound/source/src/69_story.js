// Tidebound: story scenes and scripted events. The intro, Coral's starter and rival sequence, the Shellport blocker,
// Mom, the Care Center, Captain Brine, the Lumen gym, the lighthouse rival, and the static Tideling encounters.
// Only `Story` is a top-level name in this file. Map files call these functions from their talk/run hooks.

const Story = (() => {
  const TYPE = { sproutle: 'GRASS', embit: 'FIRE', splishel: 'WATER' };
  const COUNTER = { sproutle: 'embit', embit: 'splishel', splishel: 'sproutle' };
  const EVOLVED = { sproutle: 'brambull', embit: 'cindrake', splishel: 'tidalon' };
  const PLAYER_NAMES = ['KAI', 'ALEX', 'JUNO', 'RIO'];
  const RIVAL_NAMES = ['MAREN', 'TAO', 'SKYE'];

  function bgm(t) { try { Music.play(t); } catch (_) {} }
  function spName(sp) { return SPECIES[sp].name; }

  // ---------- intro ----------
  function introScene() {
    const port = Chars.portrait('prof');
    const mon = Sprites.mon('splishel');
    return {
      name: 'intro', opaque: true,
      update() {},
      draw(g) {
        g.fillStyle = '#9fd8ea'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#e8f6f0'; g.fillRect(0, 124, W, 56);
        g.fillStyle = '#c9e7d6'; g.fillRect(0, 120, W, 4);
        g.drawImage(port, 112, 14);
        g.drawImage(mon, 196, 58);
      },
    };
  }

  async function intro() {
    const scene = Scenes.push(introScene());
    await UI.say(['Hello there! Welcome to the', 'world of TIDELINGS!']);
    await UI.say(['People and TIDELINGS live side', 'by side on our little islands.']);
    await UI.say(['I am Professor CORAL. Now,', 'what is your name?']);
    const i = await UI.choose(['NEW NAME', 'KAI', 'ALEX', 'JUNO', 'RIO']);
    if (i === 0) {
      const n = await Menus.name('Your name?', 'KAI');
      G.name = (n || 'KAI').toUpperCase().slice(0, 8) || 'KAI';
    } else {
      G.name = PLAYER_NAMES[i > 0 ? i - 1 : 0];
    }
    await UI.say(['{P}! What a fine name!', 'And my grandchild, what is theirs?']);
    const j = await UI.choose(['NEW NAME', 'MAREN', 'TAO', 'SKYE']);
    if (j === 0) {
      const n = await Menus.name("Rival's name?", 'MAREN');
      G.rival = (n || 'MAREN').toUpperCase().slice(0, 8) || 'MAREN';
    } else {
      G.rival = RIVAL_NAMES[j > 0 ? j - 1 : 0];
    }
    await UI.say(['{R} is my grandchild. We', 'study TIDELINGS together.']);
    await UI.say('Your very own TIDELING legend is about to unfold!');
    await fadeOut(0.5);
    Scenes.pop(scene);
    G.map = 'player_house_2f'; G.x = 4; G.y = 4; G.dir = 'down';
    setFlag('intro_done');
  }

  // ---------- Shellport ----------
  // Stepping on the north exit before the starter is picked: Coral's warning, then you are turned back.
  async function northBlock() {
    await Script.emote('player', '!');
    await UI.say(['Wait! Wild TIDELINGS live in', 'the tall grass out there!']);
    await UI.say(['Come see Prof. CORAL in the lab', 'first. Go on, shoo!']);
    await Script.walk('player', 'dd');
  }

  async function mom() {
    if (!flag('got_starter')) {
      return UI.say(['Oh, {P}! Professor CORAL was', 'looking for you! Hurry along!']);
    }
    await UI.say(['You look tired, sweetheart.', 'Have a rest.']);
    await Script.heal();
    await UI.say(['Your TIDELINGS are fighting fit!', 'Now off you go, and be careful.']);
  }

  // ---------- lab: Coral, the starter and the first rival battle ----------
  async function coralLab() {
    if (flag('got_dex')) {
      return UI.say(['Prof. CORAL: How is your TIDEDEX', 'coming along? Keep catching!']);
    }
    if (!flag('got_starter')) {
      await UI.say(['Ah, {P}! Right on time.', 'Pick a TIDELING to be your partner.']);
      await UI.say(['SPROUTLE is GRASS-type. EMBIT is', 'FIRE-type. SPLISHEL is WATER-type.']);
      let sp = null;
      while (!sp) {
        const i = await UI.choose(['SPROUTLE', 'EMBIT', 'SPLISHEL']);
        const cand = ['sproutle', 'embit', 'splishel'][i < 0 ? 0 : i];
        const ok = await UI.yesno('So you want ' + spName(cand) + ', the ' + TYPE[cand] + ' TIDELING?');
        if (ok) sp = cand;
      }
      setFlag('got_starter');
      G.starter = sp;
      await Script.giveMon(sp, 5);
      await UI.say(['Take good care of your new friend!', 'Oh? Someone is coming in...']);
      setFlag('rival_here');
      World.refresh();
      await Script.emote('rival_lab', '!');
      await Script.walk('rival_lab', 'l');
    } else {
      // Came back after a lost rival battle: finish the sequence.
      setFlag('rival_here');
      World.refresh();
    }
    if (!flag('rival1')) {
      const rv = COUNTER[G.starter];
      await UI.say([G.rival + ': Hah! I get the one', 'that beats yours. Let\'s go!']);
      const T = {
        id: 'rival1', cls: 'RIVAL', name: G.rival, sprite: 'rival', music: 'rival', money: 30,
        party: [[rv, 5]],
        intro: G.rival + ': Ready when you are!',
        lose: G.rival + ': Hmph. A lucky break.',
        after: G.rival + ': Next time I win!',
      };
      const r = await Battle.trainer(T);
      if (r === 'lose') Mon.healParty();
      setFlag('rival1');
      World.refresh();
      bgm('town');
      await UI.say([G.rival + ': Grr! Gramps, I am off', 'to the sea. See you around!']);
    }
    if (!flag('got_dex')) {
      await UI.say(['Prof. CORAL: Splendid! Take this.', 'It is your TIDEDEX.']);
      setFlag('got_dex');
      await UI.say(['It records every TIDELING you', 'meet. Catch them all!']);
      await Script.give('orb', 5);
      await UI.say(['Go on, explore the islands!', 'The tall grass is waiting.']);
    }
  }

  // Blank sign at the heal machine: the Care Center machine sends TIDELINGS back to full health.
  async function healMachine() {
    await UI.say(['The machine hums softly and', 'the TIDELINGS in it glow.']);
    await Script.heal();
    await UI.say(['Your TIDELINGS are fighting fit!', 'We hope to see you again!']);
  }

  async function nurse() {
    const ok = await UI.yesno('Welcome to the CARE CENTER! Shall we restore your TIDELINGS to full health?');
    if (!ok) return UI.say('Come back any time. We are here!');
    await Script.heal();
    await UI.say(['Your TIDELINGS are fighting fit!', 'We hope to see you again!']);
  }

  // ---------- Route 1 / Route 2 / cave ----------
  async function brine() {
    if (flag('got_chop')) {
      return UI.say(['Ahoy! Mind the tides on the', 'way north, matey!']);
    }
    await UI.say(['Ahoy, traveler! You made it', 'out of that dark cave!']);
    await UI.say(['Here, take this. HM01 CHOP!', 'It cuts down the stubborn trees.']);
    setFlag('got_chop');
    await Script.give('hm_chop');
  }

  // ---------- Lumen gym ----------
  const MARINA = {
    id: 'gym_marina', cls: 'LEADER', name: 'MARINA', sprite: 'leader', music: 'gymbattle', money: 100,
    party: [['gullip', 12], ['jellink', 12], ['pelicant', 14]],
    items: ['superpotion', 'superpotion'],
    intro: 'Marina: Oh! A challenger! Let\'s see if your TIDELINGS can ride the waves.',
    lose: 'Marina: The tide was not with you today!',
    after: 'Marina: Come back when the wind is high!',
  };

  async function gymLeader() {
    if (flag('badge1')) {
      return UI.say('MARINA: The tide and wind favor you now. Fly well!');
    }
    await UI.say(MARINA.intro);
    bgm(MARINA.music);
    const r = await Script.trainerBattle({ trainer: MARINA, sprite: 'leader' });
    if (r !== 'win') return;
    G.badges.push('wave');
    setFlag('badge1');
    G.money += 500;
    await UI.say(['{P} received the WAVE BADGE!', 'MARINA: The sea trusts you now.']);
    setFlag('got_smash');
    await Script.give('hm_smash');
    await UI.say(['HM02 SMASH lets you break rocks.', 'Now the Tidewater Cave opens up!']);
    World.refresh();
  }

  // ---------- Lumen lighthouse rival (final battle) ----------
  async function rival2() {
    if (flag('rival2') || !flag('badge1')) return;
    const n = World.npc('rival_lumen');
    const p = World.player;
    if (n && n.y + 1 < p.y) await Script.walk('rival_lumen', 'd');
    await Script.emote('rival_lumen', '!');
    await UI.say([G.rival + ': Heh, you beat Marina?', 'Then prove you are the best!']);
    const T = {
      id: 'rival2', cls: 'RIVAL', name: G.rival, sprite: 'rival', music: 'rival', money: 60,
      party: [['gullip', 13], [EVOLVED[G.starter] || 'brambull', 16], ['kelpup', 13]],
      intro: G.rival + ': Ready! Let\'s end this!',
      lose: G.rival + ': Ugh, you really are good.',
      after: G.rival + ': Still too strong for me!',
    };
    const r = await Battle.trainer(T);
    if (r === 'lose') Mon.healParty();
    setFlag('rival2');
    World.refresh();
    await UI.say([G.rival + ': Fine, the lighthouse is', 'yours. Take care of the sea!']);
    await UI.say(['Prof. CORAL would be proud.', 'Thank you for playing Tidebound.']);
    await Script.credits();
    await World.warp('lumen_center', 6, 5, 'up');
  }

  // ---------- static Tidelings ----------
  async function statics(sp, lv, flagName, lines) {
    await UI.say(lines);
    bgm('battle');
    const r = await Battle.wild(sp, lv, { static: true });
    if (r === 'lose') return World.blackout();
    setFlag(flagName);
    World.refresh();
  }

  function corallo() {
    return statics('corallo', 15, 'corallo', ['Something pink and branching', 'uncoils from the rubble...']);
  }

  function lumarine() {
    return statics('lumarine', 25, 'lumarine', ['A massive shape coils around', 'the great lamp. It is LUMARINE!']);
  }

  return {
    intro, northBlock, mom, coralLab, healMachine, nurse, brine, gymLeader, rival2, corallo, lumarine,
    spName, bgm,
  };
})();
