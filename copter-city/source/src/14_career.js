// Copter City — the career: money, rank, cities and their goals, the hangar (fuel, repairs, gas, helicopters and
// upgrades), crashes and insurance, and the save in localStorage.

const SAVE_KEY = 'copter-city-save-v1', OPTS_KEY = 'copter-city-opts-v1';

function newCareer() {
  const cities = {};
  for (const c of CITIES) cities[c.id] = { unlocked: c.id === 'dover', done: 0, earned: 0, passed: false, tokens: [] };
  return { money: 3000, city: 'dover', cities, owned: ['sparrow'], heli: 'sparrow', ups: {}, hstate: {}, stats: { done: 0, failed: 0, earned: 0, crashes: 0 }, hour: null, introDone: false };
}
const rankOf = (car) => RANKS[Math.min(RANKS.length - 1, CITIES.filter((c) => car.cities[c.id].passed).length)];
function cityStat() { return G.career && G.career.cities[CITY.def.id]; }

function pay(amount, reason) {
  amount = Math.round(amount);
  if (!amount) return;
  G.stats.earned += amount;
  if (G.free || !G.career) { HUD.cash(amount); return; }
  G.career.money += amount;
  if (amount > 0) { G.career.stats.earned += amount; cityStat().earned += amount; }
  HUD.cash(amount);
  bus.emit('money', amount, reason);
}
const canAfford = (n) => G.free || G.career.money >= n;

bus.on('callEnd', (c, ok) => {
  if (G.free || !G.career) return;
  const cs = cityStat();
  if (ok) { cs.done++; G.career.stats.done++; } else G.career.stats.failed++;
  if (ok && !cs.passed && cs.done >= CITY.def.goal) promote();
  saveGame();
});
function promote() {
  const cs = cityStat(); cs.passed = true;
  const i = CITIES.findIndex((c) => c.id === CITY.def.id), next = CITIES[i + 1];
  const bonus = 2000 * CITY.def.pay;
  pay(bonus, 'Promotion bonus');
  if (next) {
    G.career.cities[next.id].unlocked = true;
    UI.notice('Promotion!', `<p>The ${CITY.def.name} city council is impressed. You're now a <b>${rankOf(G.career)}</b>, with a ${fmtMoney(bonus)} bonus.</p><p><b>${next.name}</b> has offered you a job. Fly back to the hangar and choose <b>Relocate</b> when you're ready, or stay and keep flying here.</p>`);
  } else UI.notice('Sky Legend!', `<p>Metro Heights is safe in your hands. You've reached the top: <b>${rankOf(G.career)}</b>, and a ${fmtMoney(bonus)} bonus.</p><p>Keep flying any city you like, or try Free Flight.</p>`);
  AUDIO.sfx('fanfare');
}

// ---------- hangar services ----------
function hangarQuote() {
  const H = HELI, st = H.st, free = G.free;
  const fuel = Math.max(0, st.fuel - H.fuel), hp = Math.max(0, st.hp - H.hp), gas = Math.max(0, st.gas - H.gas);
  return { fuel, hp, gas, fuelCost: free ? 0 : Math.ceil(fuel * PRICES.fuel), hpCost: free ? 0 : Math.ceil(hp * PRICES.repair), gasCost: free ? 0 : gas * PRICES.gas };
}
function buyService(what) {
  const H = HELI, q = hangarQuote();
  const cost = { fuel: q.fuelCost, repair: q.hpCost, gas: q.gasCost }[what];
  if (!G.free && G.career.money < cost) {
    // spend what you have on a partial top-up
    const m = G.career.money;
    if (m <= 0) { toast('Not enough money.', 'bad'); AUDIO.sfx('deny'); return false; }
    if (what === 'fuel') H.fuel += m / PRICES.fuel; else if (what === 'repair') H.hp += m / PRICES.repair; else H.gas += Math.floor(m / PRICES.gas);
    pay(-m, what);
    return true;
  }
  if (what === 'fuel') H.fuel = H.st.fuel; else if (what === 'repair') { H.hp = H.st.hp; H.lowWarned = false; } else H.gas = H.st.gas;
  if (cost) pay(-cost, what);
  AUDIO.sfx('cash');
  return true;
}
function buyHeli(id) {
  const h = HELIS[id];
  if (G.career.owned.includes(id)) return switchHeli(id);
  if (!canAfford(h.price)) { toast('Not enough money.', 'bad'); AUDIO.sfx('deny'); return false; }
  pay(-h.price, 'Bought ' + h.name);
  G.career.owned.push(id);
  switchHeli(id);
  saveGame();
  return true;
}
function switchHeli(id) {
  const car = G.career;
  if (car) { car.hstate[HELI.type] = { fuel: HELI.fuel, hp: HELI.hp, gas: HELI.gas }; car.heli = id; }
  // passengers wait at the hangar for the swap; anything you were carrying is lost
  if (HELI.seats.length) { toast('Your passengers climbed out at the hangar.'); HELI.seats = []; }
  const s = (car && car.hstate[id]) || {};
  const home = CITY.home;
  HELI.fuel = s.fuel || 0; HELI.hp = s.hp || 0; HELI.gas = s.gas !== undefined ? s.gas : 999;
  spawnHeli(id, home.x, home.y, home.z, Math.PI);
  if (!s.fuel) HELI.fuel = HELI.st.fuel;
  saveGame();
  return true;
}
function buyUpgrade(up) {
  const car = G.career, id = HELI.type, ups = car.ups[id] = car.ups[id] || {};
  const lvl = ups[up] || 0;
  if (lvl >= 3) return false;
  const cost = upCost(id, up, lvl);
  if (!canAfford(cost)) { toast('Not enough money.', 'bad'); AUDIO.sfx('deny'); return false; }
  pay(-cost, UPGRADES[up].name + ' upgrade');
  ups[up] = lvl + 1;
  const keep = { fuel: HELI.fuel, hp: HELI.hp };
  HELI.st = heliStats(id, ups);
  if (up === 'armor') HELI.hp = keep.hp + (HELI.st.hp - heliStats(id, Object.assign({}, ups, { armor: lvl })).hp);
  AUDIO.sfx('cash'); saveGame();
  return true;
}

// ---------- crashes ----------
bus.on('crashed', () => {
  if (!G.city) return;
  const H = HELI, deduct = G.free ? 0 : Math.max(1500, Math.round(HELIS[H.type].price * 0.2 / 100) * 100);
  for (const c of G.calls.slice()) if (H.seats.some((s) => s.call === c)) finishCall(c, false, 0, 'Everyone aboard was hurt in the crash.');
  H.seats = [];
  if (G.career && !G.free) G.career.stats.crashes++;
  UI.notice('You crashed', `<p>The ${H.st.name} is a write-off, but you walked away. ${deduct ? `The insurance deductible is <b>${fmtMoney(deduct)}</b>.` : ''}</p><p>A replacement is waiting at the hangar.</p>`, () => {
    if (deduct) pay(-deduct, 'Insurance deductible');
    const home = CITY.home;
    H.hp = 0; H.fuel = 0;
    spawnHeli(H.type, home.x, home.y, home.z, Math.PI);
    H.hp = H.st.hp; H.fuel = H.st.fuel; H.lowWarned = false;
    G.where = 'heli'; document.body.dataset.where = 'heli'; PILOT.model.group.visible = false;
    CAM.snap = true;
    saveGame();
  });
});

// ---------- save ----------
function saveGame() {
  if (G.noSave || G.free || !G.career) return;
  const car = G.career;
  if (CITY.def && HELI.st) { car.hstate[HELI.type] = { fuel: HELI.fuel, hp: HELI.hp, gas: HELI.gas }; car.city = CITY.def.id; car.hour = G.hour; }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(car)); } catch (e) { /* private mode */ }
}
function loadCareer() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || !s.cities) return null;
    const base = newCareer();
    for (const id of Object.keys(base.cities)) s.cities[id] = Object.assign(base.cities[id], s.cities[id] || {});
    return Object.assign(base, s);
  } catch (e) { return null; }
}
const hasSave = () => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } };
function wipeSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } }

const OPTS = { flight: 'arcade', assist: true, torque: true, res: 360, view: 900, vol: 0.8, music: 0.5, voice: true, shake: true, tips: true, invert: false, markers: true, spread: true, station: 0 };
function loadOpts() { try { Object.assign(OPTS, JSON.parse(localStorage.getItem(OPTS_KEY)) || {}); } catch (e) { /* */ } }
function saveOpts() { try { localStorage.setItem(OPTS_KEY, JSON.stringify(OPTS)); } catch (e) { /* */ } }
