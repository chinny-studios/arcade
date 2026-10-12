// Ashreach — save slots in localStorage (character sheet, zone and position)

const SAVE_KEY = 'ashreach.save.';
let SAVE_SLOT = null;
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
function listSaves() {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const raw = lsGet(SAVE_KEY + i);
    if (!raw) continue;
    try {
      const d = JSON.parse(raw), c = d.char;
      out.push({ slot: i, name: c.name, level: c.level, prof: c.prof, breed: c.breed, faction: c.faction, zone: d.zone, time: d.time });
    } catch (e) { /* corrupt slot: skip */ }
  }
  return out.sort((a, b) => b.time - a.time);
}
function freeSlot() { for (let i = 0; i < 8; i++) if (!lsGet(SAVE_KEY + i)) return i; return 7; }
function saveGame(quiet) {
  if (!PLAYER || SAVE_SLOT === null || state === 'title') return false;
  const zone = ZONE && ZONE.def && ZONE.def.kind === 'interior' && ZONE.def.returnTo ? ZONE.def.returnTo : null;
  const d = {
    v: 1, time: Date.now(), char: PLAYER.char,
    zone: zone ? zone.zone : ZONE.id, pos: zone ? null : { x: PLAYER.pos.x, z: PLAYER.pos.z, yaw: PLAYER.yaw }, poi: zone ? zone.poi : null,
    hp: PLAYER.hp / PLAYER.S.maxHp, np: PLAYER.np / PLAYER.S.maxNp,
    buffs: PLAYER.buffs.filter((b) => !b.hostile && NANOS[b.nano]).map((b) => ({ nano: b.nano, t: b.t })),
    sim: typeof simSaveState === 'function' ? simSaveState() : null,
  };
  // generated mission zones can't be restored; fall back to the zone outside
  if (ZONE.def.generated && !zone) { d.zone = PLAYER.char.flags.clone ? PLAYER.char.flags.clone.zone : 'halden'; d.pos = null; d.poi = PLAYER.char.flags.clone ? PLAYER.char.flags.clone.poi : null; }
  const ok = lsSet(SAVE_KEY + SAVE_SLOT, JSON.stringify(d));
  if (!quiet) EV.emit('log', ok ? 'Game saved.' : 'Could not save: browser storage is unavailable.', ok ? 'info' : 'warn');
  return ok;
}
function readSave(slot) { const raw = lsGet(SAVE_KEY + slot); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } }
function deleteSave(slot) { lsDel(SAVE_KEY + slot); }
function continueSave(slot) {
  const d = readSave(slot);
  if (!d) return false;
  SAVE_SLOT = slot;
  startGame(d.char, d);
  return true;
}
