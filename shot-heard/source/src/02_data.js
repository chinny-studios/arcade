// Shot Heard — teams, classes, weapons, reload drill, uniforms and names

const US = 0, GB = 1;
const TEAMS = [
  { key: 'US', name: 'Patriots', army: 'Continental Army', short: 'Patriots', tune: 'yankee' },
  { key: 'GB', name: 'The Crown', army: 'British Army', short: 'Crown', tune: 'grenadiers' },
];

// Every firearm loads from the muzzle (the Ferguson from the breech). Times are seconds at "authentic" reload speed.
const WEAPONS = {
  bess: { name: 'Short Land Pattern', nick: '"Brown Bess"', model: 'musket', dmg: 100, vel: 290, spread: 0.7, hip: 3.6, reload: 14, bayonet: true, ammo: 24, zoom: 1.18, range: 70, drill: 'musket',
    desc: 'The King\'s musket. Heavy ball, long bayonet, reliable lock.' },
  longland: { name: 'Long Land Pattern', model: 'musket', dmg: 105, vel: 300, spread: 0.62, hip: 3.8, reload: 15, bayonet: true, ammo: 22, zoom: 1.2, range: 80, drill: 'musket', long: true,
    desc: 'The older, longer musket. A touch more accurate, a touch slower to load.' },
  charleville: { name: 'Charleville M1766', model: 'musket', dmg: 100, vel: 300, spread: 0.66, hip: 3.4, reload: 13.5, bayonet: true, ammo: 24, zoom: 1.18, range: 75, drill: 'musket',
    desc: 'French musket shipped to the Continentals. Lighter and quick in the hand.' },
  fowler: { name: 'Fowling Piece', model: 'fowler', dmg: 90, vel: 270, spread: 0.95, hip: 3.0, reload: 12, bayonet: false, ammo: 26, zoom: 1.15, range: 60, drill: 'musket',
    desc: 'A farmer\'s bird gun. Quick to load, but no bayonet: club it if they close.' },
  penn: { name: 'Pennsylvania Rifle', model: 'rifle', dmg: 115, vel: 340, spread: 0.16, hip: 3.2, reload: 21, bayonet: false, ammo: 20, zoom: 2.3, range: 160, drill: 'rifle',
    desc: 'Long rifled barrel and a patched ball. Hits a man at 200 yards; takes an age to load.' },
  jaeger: { name: 'Jäger Rifle', model: 'jaeger', dmg: 110, vel: 320, spread: 0.26, hip: 3.0, reload: 17, bayonet: false, ammo: 20, zoom: 2.0, range: 130, drill: 'rifle',
    desc: 'Short German hunting rifle. Heavier ball, quicker than the long rifle.' },
  ferguson: { name: 'Ferguson Rifle', model: 'rifle', dmg: 105, vel: 320, spread: 0.4, hip: 3.0, reload: 9.5, bayonet: false, ammo: 22, zoom: 1.9, range: 120, drill: 'breech',
    desc: 'Patrick Ferguson\'s breech-loader. One turn of the trigger guard opens the breech.' },
  carbine: { name: 'Artillery Carbine', model: 'carbine', dmg: 90, vel: 260, spread: 1.0, hip: 3.6, reload: 11, bayonet: true, ammo: 20, zoom: 1.15, range: 55, drill: 'musket',
    desc: 'A short musket for gunners and surgeons, with a short bayonet.' },
  blunder: { name: 'Blunderbuss', model: 'blunder', dmg: 34, pellets: 9, vel: 210, spread: 5.5, hip: 7, reload: 13, bayonet: false, ammo: 14, zoom: 1.08, range: 14, drill: 'musket',
    desc: 'Brass bell-mouth loaded with buckshot. Clears a doorway; useless past thirty yards.' },
  pistol: { name: 'Sea Service Pistol', model: 'pistol', dmg: 80, vel: 230, spread: 1.4, hip: 3.0, reload: 8, bayonet: false, ammo: 16, zoom: 1.08, range: 30, drill: 'pistol',
    desc: 'One heavy pistol. Load, fire, and draw the sword.' },
  brace: { name: 'Brace of Pistols', model: 'pistol', dmg: 75, vel: 220, spread: 1.6, hip: 3.2, reload: 13, shots: 2, bayonet: false, ammo: 16, zoom: 1.08, range: 25, drill: 'pistol',
    desc: 'Two loaded pistols for two quick shots, then a long reload.' },
  fusil: { name: 'Officer\'s Fusil', model: 'carbine', dmg: 95, vel: 290, spread: 0.6, hip: 3.4, reload: 12.5, bayonet: true, ammo: 18, zoom: 1.18, range: 70, drill: 'musket',
    desc: 'A light, well-made musket carried by officers of light companies.' },
};
const DRILLS = {
  musket: [['half', 'Half-cock, open the pan', 0.07], ['bite', 'Bite the cartridge', 0.08], ['prime', 'Prime the pan', 0.09], ['shut', 'Shut the frizzen', 0.05],
    ['cast', 'Cast about', 0.09], ['charge', 'Charge with cartridge', 0.12], ['draw', 'Draw rammer', 0.11], ['ram', 'Ram down', 0.18], ['return', 'Return rammer', 0.11], ['ready', 'Make ready', 0.10]],
  rifle: [['half', 'Half-cock', 0.05], ['bite', 'Measure the powder', 0.10], ['prime', 'Prime the pan', 0.08], ['shut', 'Shut the frizzen', 0.04], ['cast', 'Stand the rifle', 0.06],
    ['charge', 'Pour the charge', 0.08], ['patch', 'Patch and ball', 0.10], ['draw', 'Draw the ramrod', 0.07], ['ram', 'Ram the patched ball', 0.24], ['return', 'Return the ramrod', 0.08], ['ready', 'Make ready', 0.10]],
  breech: [['open', 'Turn the trigger guard', 0.2], ['charge', 'Ball and powder in the breech', 0.38], ['close', 'Close the breech', 0.17], ['prime', 'Prime and cock', 0.25]],
  pistol: [['half', 'Half-cock', 0.1], ['bite', 'Bite the cartridge', 0.12], ['prime', 'Prime the pan', 0.13], ['charge', 'Charge the barrel', 0.15], ['ram', 'Ram down', 0.3], ['ready', 'Cock', 0.2]],
};
// Melee: reach in metres, cd = time between blows, wind = delay before the blow lands.
const MELEE = {
  bayonet: { name: 'Bayonet', dmg: 100, reach: 2.5, cd: 1.05, wind: 0.22, thrust: true },
  shortbay: { name: 'Bayonet', dmg: 90, reach: 2.1, cd: 0.95, wind: 0.2, thrust: true },
  butt: { name: 'Musket butt', dmg: 55, reach: 1.7, cd: 0.9, wind: 0.2 },
  hanger: { name: 'Hanger', dmg: 65, reach: 1.9, cd: 0.72, wind: 0.16, model: 'hanger' },
  sword: { name: 'Sword', dmg: 75, reach: 2.0, cd: 0.62, wind: 0.14, model: 'sword' },
  hatchet: { name: 'Tomahawk', dmg: 70, reach: 1.7, cd: 0.7, wind: 0.15, model: 'hatchet' },
  knife: { name: 'Knife', dmg: 50, reach: 1.5, cd: 0.5, wind: 0.12, model: 'knife' },
  sabre: { name: 'Sabre', dmg: 100, reach: 2.9, cd: 0.8, wind: 0.12, model: 'sword' },
};
const GADGETS = {
  grenade: { name: 'Grenado', n: 2, desc: 'Light the fuse and throw. Bursts after three seconds.' },
  spyglass: { name: 'Spyglass', n: 0, desc: 'Hold aim to look through it. Enemies you look at are spotted for your side.' },
  keg: { name: 'Powder Keg', n: 1, desc: 'Set it down and light the fuse. Breaks walls, guns and gabions.' },
  gabion: { name: 'Gabion', n: 3, desc: 'Set down a basket of earth for cover. Stand by a damaged gun and hold E to repair it.' },
  colours: { name: 'Regimental Colours', n: 1, desc: 'Plant the colours: your side can spawn on them, and men near them reload faster.' },
  bandage: { name: 'Bandages', n: 0, desc: 'Bind a wound: heal yourself or the man in front of you. Hold E on the wounded to revive them.' },
  pouch: { name: 'Cartridge Pouch', n: 2, desc: 'Drop a pouch of cartridges for the men around you.' },
};
const CLASSES = {
  line: { name: 'Line Infantry', desc: 'Musket and bayonet. Fire with the men beside you for a volley: tighter shot.',
    primary: { US: ['charleville', 'longland', 'fowler'], GB: ['bess', 'longland'] }, melee: 'hanger', gadgets: ['grenade'], rank: ['Pvt.', 'Pvt.', 'Pvt.', 'Cpl.', 'Sgt.'] },
  rifle: { name: 'Rifleman', desc: 'Rifled barrel, slow to load, deadly at range. Spots for the line with a spyglass.',
    primary: { US: ['penn', 'jaeger'], GB: ['jaeger', 'ferguson'] }, melee: 'hatchet', gadgets: ['spyglass'], rank: ['Pvt.', 'Pvt.', 'Cpl.'] },
  arty: { name: 'Artilleryman', desc: 'Loads cannon faster than anyone, repairs guns, sets gabions and blows walls with powder.',
    primary: { US: ['carbine', 'blunder'], GB: ['carbine', 'blunder'] }, melee: 'hanger', gadgets: ['keg', 'gabion'], rank: ['Mtrs.', 'Gnr.', 'Bomb.'] },
  officer: { name: 'Officer', desc: 'Pistol and sword. Plant the colours to give your side a spawn point; Q with nothing marked calls a volley.',
    primary: { US: ['pistol', 'brace', 'fusil'], GB: ['pistol', 'brace', 'fusil'] }, melee: 'sword', gadgets: ['colours', 'spyglass'], rank: ['Ens.', 'Lt.', 'Capt.'] },
  surgeon: { name: 'Surgeon', desc: 'Revives the wounded, binds wounds and hands out cartridges.',
    primary: { US: ['carbine', 'pistol'], GB: ['carbine', 'pistol'] }, melee: 'knife', gadgets: ['bandage', 'pouch'], rank: ['Dr.', 'Mate'] },
};
const CLASS_ORDER = ['line', 'rifle', 'arty', 'officer', 'surgeon'];
// how a side fills its ranks (bots): weights per class
const CLASS_MIX = { line: 0.5, rifle: 0.14, arty: 0.12, officer: 0.1, surgeon: 0.14 };

// ---------- uniforms ----------
const C = (h) => col(h);
const SKINS = [0xe2b89c, 0xd8a888, 0xc89878, 0xeac4ac, 0xb47c5c, 0x8c5c40, 0x6e4430].map(C);
const MILITIA_COATS = [0x6a4a2e, 0x75705f, 0x4c5838, 0x9a8460, 0x5a3424, 0x46506a, 0x8a6a40, 0x5e5446].map(C);
const MILITIA_BREECH = [0x8a7a5a, 0x5a4a38, 0xc8bc9a, 0x3a3428, 0x6a5e48].map(C);
const MILITIA_HOSE = [0xd8d0c0, 0x6a6050, 0x3a3428, 0x8a8070].map(C);
const HUNTING = [0xcfc4a0, 0xb8aa80, 0x9a9468, 0x7a7448].map(C);
const GB_FACINGS = [0x1f3570, 0xd8c050, 0x26502e, 0xe8e4d8, 0x1a1a1a, 0xb8a070].map(C);
const HESS_FACINGS = [0xb8302a, 0xe0c040, 0xe8e4d8, 0xd06a20].map(C);
const FIRST = {
  US: ['Josiah', 'Ebenezer', 'Amos', 'Nathaniel', 'Jonas', 'Elijah', 'Caleb', 'Asa', 'Levi', 'Silas', 'Isaac', 'Jedediah', 'Ezra', 'Abner', 'Reuben', 'Seth', 'Moses', 'Prince', 'Cato', 'Thaddeus', 'Ephraim', 'Jabez', 'Oliver', 'Benjamin'],
  GB: ['Thomas', 'William', 'John', 'James', 'George', 'Richard', 'Henry', 'Edward', 'Samuel', 'Joseph', 'Robert', 'Charles', 'Francis', 'Daniel', 'Matthew', 'Hugh', 'Patrick', 'Archibald', 'Duncan', 'Alexander'],
  HE: ['Johann', 'Friedrich', 'Heinrich', 'Wilhelm', 'Georg', 'Karl', 'Christoph', 'Konrad'],
};
const LAST = {
  US: ['Allen', 'Brooks', 'Hosmer', 'Buttrick', 'Parker', 'Munroe', 'Harrington', 'Wheeler', 'Hayward', 'Davis', 'Fuller', 'Chandler', 'Barrett', 'Pierce', 'Ward', 'Greene', 'Lee', 'Whitcomb', 'Brown', 'Estabrook', 'Hale', 'Knox', 'Salem', 'Poor', 'Freeman', 'Cooper'],
  GB: ['Hardy', 'Walker', 'Smith', 'Taylor', 'Barnes', 'Fletcher', 'Hughes', 'Morgan', 'Price', 'Campbell', 'Fraser', 'Murray', 'Gordon', 'Kerr', 'Wright', 'Parsons', 'Webb', 'Lamb', 'Harris', 'Doyle', 'Reilly', 'Marsh', 'Ashby', 'Clarke'],
  HE: ['Müller', 'Schmidt', 'Weber', 'Becker', 'Hoffmann', 'Krause', 'Vogel', 'Hartmann', 'Keller', 'Braun'],
};
// Dress a soldier for his side, class and the year of the battle. Colours are linear-ish [r,g,b].
function dressFor(team, cls, map) {
  const r = Math.random;
  const d = { skin: fpick(SKINS), hat: 'tricorn', hatC: C(0x1c1a18), lace: 0, sash: null, hessian: false };
  if (team === GB) {
    const hess = map.hessians && cls !== 'arty' && cls !== 'surgeon' && r() < map.hessians;
    d.hessian = hess;
    if (hess) {
      Object.assign(d, { coat: C(0x253a6a), facing: fpick(HESS_FACINGS), belt: C(0xeeeadf), breech: C(0xd6cc96), hose: C(0x222020) });
      if (cls === 'rifle') Object.assign(d, { coat: C(0x2f4a2c), facing: C(0x9a2a22), breech: C(0x3c4a34) });
      else if (cls === 'line' && r() < 0.35) { d.hat = 'mitre'; d.hatC = C(0xb8302a); }
    } else {
      Object.assign(d, { coat: C(0xb3302a), facing: fpick(GB_FACINGS), belt: C(0xeeeadf), breech: C(0xe8e2d0), hose: C(0x222020) });
      if (cls === 'rifle') Object.assign(d, { coat: C(0x2f4a2c), facing: C(0x1a1a1a), breech: C(0x3c4a34), belt: C(0x5a3d24) });
      if (cls === 'arty') Object.assign(d, { coat: C(0x253058), facing: C(0xa82a24) });
    }
    if (cls === 'officer') { d.sash = C(0x9a1828); d.lace = 1; d.hose = C(0x1a1a1a); }
    if (cls === 'surgeon') Object.assign(d, { coat: C(0x2c2a30), facing: C(0x2c2a30), belt: C(0x3a2a20), breech: C(0x222024), hose: C(0x2a2a2a), hat: 'round', hatC: C(0x1a1818) });
    d.name = (hess ? fpick(FIRST.HE) + ' ' + fpick(LAST.HE) : fpick(FIRST.GB) + ' ' + fpick(LAST.GB));
  } else {
    const militia = cls !== 'rifle' && r() < map.militia;
    if (militia) {
      const coat = fpick(MILITIA_COATS);
      Object.assign(d, { coat, facing: shadeC(coat, 0.78), belt: C(0x5a3d24), breech: fpick(MILITIA_BREECH), hose: fpick(MILITIA_HOSE) });
      if (r() < 0.6) { d.hat = 'round'; d.hatC = fpick([C(0x3a2e24), C(0x2a2420), C(0x5a4a38)]); }
    } else {
      Object.assign(d, { coat: C(0x283a64), facing: fpick([C(0xd2b880), C(0xd2b880), C(0xa83028), C(0xe8e4d8)]), belt: C(0xe8e2d0), breech: fpick([C(0xd2c8a8), C(0xe8e2d0)]), hose: fpick([C(0x2a2622), C(0xe0dccc)]) });
      d.lace = 2;
    }
    if (cls === 'rifle') { const sh = fpick(HUNTING); Object.assign(d, { coat: sh, facing: shadeC(sh, 1.08), belt: C(0x5a3d24), breech: shadeC(sh, 0.92), hose: C(0x6a5a44), hat: 'round', hatC: C(0x3a3028) }); }
    if (cls === 'arty' && !militia) d.facing = C(0xa83028);
    if (cls === 'officer') { d.sash = C(0x8a2030); d.lace = 1; if (militia) { d.hat = 'tricorn'; d.hatC = C(0x1c1a18); } }
    if (cls === 'surgeon') Object.assign(d, { coat: C(0x3a3028), facing: C(0x3a3028), belt: C(0x3a2a20), breech: C(0x2a2622), hose: C(0x3a3430), hat: 'round', hatC: C(0x1e1a18) });
    d.name = fpick(FIRST.US) + ' ' + fpick(LAST.US);
  }
  d.rank = fpick(CLASSES[cls].rank);
  return d;
}
