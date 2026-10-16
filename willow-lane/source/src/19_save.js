// Willow Lane — saving to localStorage (willow-lane.save): the lot, objects, items, every sim, money, bills and the clock

const SAVE_KEY = 'willow-lane.save';
const SIM_KEYS = ['id', 'first', 'last', 'age', 'ageDays', 'pronoun', 'look', 'canCarry', 'voice', 'pers', 'interests', 'sign', 'needs', 'skills', 'rels', 'moodlets',
  'job', 'school', 'household', 'role', 'alive', 'x', 'z', 'dir', 'onLot', 'preg', 'crib', 'pension', 'novel', 'painting', 'bornDay', 'extraLife', 'birthdayDue', 'deathDue', 'neglect', 'money'];

function simToJSON(s) {
  const o = {};
  for (const k of SIM_KEYS) if (s[k] !== undefined) o[k] = s[k];
  if (s.away) o.away = { kind: s.away.kind, until: s.away.until, mood: s.away.mood, homework: s.away.homework };
  // guests go home when the game is saved
  if (!s.household) { o.onLot = false; }
  return o;
}
function saveGame(quiet) {
  if (G.state !== 'play' && G.state !== 'over') return false;
  const data = {
    v: 1,
    G: { t: G.t, money: G.money, family: G.family, nextId: G.nextId, walls: G.walls, options: G.options, log: G.log.slice(0, 40), stats: G.stats,
      flags: Object.assign({}, G.flags, { visits: [] }), bills: G.bills, selected: G.selected ? G.selected.id : 0, userSpeed: G.userSpeed },
    lot: lotToJSON(),
    objects: G.objects.map(objToJSON),
    items: G.items.filter((it) => it.kind !== 'fire').map((it) => ({ kind: it.kind, x: it.x, z: it.z, y: it.y, dirty: it.dirty, servings: it.servings, quality: it.quality, food: it.food })),
    sims: G.sims.filter((s) => !s.service).map(simToJSON),
    cam: { tx: R.cam.tx, tz: R.cam.tz, yaw: R.cam.yawT, dist: R.cam.distT },
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); if (!quiet) toast('Game saved'); return true; }
  catch (e) { console.warn('save failed', e); if (!quiet) toast('Could not save (storage full or blocked)'); return false; }
}
function loadSaveRaw() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
function loadGame(raw) {
  raw = raw || loadSaveRaw();
  if (!raw) return false;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return false; }
  resetWorld();
  Object.assign(G, { t: d.G.t, money: d.G.money, family: d.G.family, nextId: d.G.nextId, walls: d.G.walls || 'cut', log: d.G.log || [], stats: d.G.stats || G.stats, flags: d.G.flags || {}, bills: d.G.bills || [] });
  Object.assign(G.options, d.G.options || {});
  lotFromJSON(d.lot);
  rebuildLot();
  for (const oj of d.objects) objFromJSON(oj);
  rebuildOcc(); rebuildLot();
  for (const ij of d.items || []) addItem(ij.kind, ij.x, ij.z, ij.y, { dirty: ij.dirty, servings: ij.servings, quality: ij.quality, food: ij.food });
  for (const sj of d.sims) {
    const s = makeSim({ id: sj.id, first: sj.first, last: sj.last, age: sj.age, look: sj.look, pers: sj.pers, interests: sj.interests, household: sj.household, pronoun: sj.pronoun, canCarry: sj.canCarry, voice: sj.voice, needs: sj.needs });
    Object.assign(s, sj);
    s.queue = []; s.cur = null; s.posture = 'stand'; s.anim = 'idle';
    if (s.away) { s.onLot = false; }
    if (s.household && s.alive && !s.away) s.onLot = true;
    if (s.age === 'baby' && s.crib) { const c = objById(s.crib); if (c) { const [x, z] = objCenter(c); s.x = x; s.z = z; s.dir = worldAngle(c, 0); } }
    // stand somewhere walkable
    if (s.onLot && s.age !== 'baby' && !NAV.walk(Math.floor(s.x), Math.floor(s.z))) { const [dx, dz] = frontDoorTile(); s.x = dx + 0.5; s.z = dz + 0.5; }
    makeSimModel(s);
  }
  if (R.cam && d.cam) Object.assign(R.cam, { tx: d.cam.tx, tz: d.cam.tz, yaw: d.cam.yaw, yawT: d.cam.yaw, dist: d.cam.dist, distT: d.cam.dist });
  startPlay(simById(d.G.selected));
  G.userSpeed = 1;
  toast('Welcome back to Willow Lane');
  return true;
}
// clear sims, objects, items and vehicles from the scene
function resetWorld() {
  for (const s of G.sims) if (s.model) R.scene.remove(s.model);
  for (const o of G.objects) if (o.model) R.scene.remove(o.model);
  for (const it of G.items) if (it.model) R.scene.remove(it.model);
  clearVehicles();
  for (const b of UI.bubbles) b.el.remove();
  UI.bubbles = [];
  G.sims = []; G.objects = []; G.items = []; G.bills = []; G.flags = {}; G.log = []; G.selected = null;
  G.stats = { births: 0, weddings: 0, promotions: 0 };
  BUILD.undo = []; BUILD.redo = [];
  $('#notes').innerHTML = '';
}
