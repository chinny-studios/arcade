// Veyra Below — input (keyboard & mouse, gamepad, touch) and the player controller

const BIND = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  dodge: ['Space'], interact: ['KeyE', 'KeyF'], pb: ['KeyR'], atkS: ['KeyQ'], walk: ['ShiftLeft', 'ShiftRight'],
  slot1: ['Digit1'], slot2: ['Digit2'], slot3: ['Digit3'], slot4: ['Digit4'], slot5: ['Digit5'], slot6: ['Digit6'],
  menu: ['Escape'], map: ['Tab', 'KeyM'], inv: ['KeyI', 'KeyC'], skills: ['KeyK'], techs: ['KeyT'], quests: ['KeyJ'], labels: ['AltLeft', 'AltRight'], labelToggle: ['KeyZ'],
  potHp: ['KeyH'], potTp: ['KeyG'],
};
const Input = (() => {
  const keys = new Set(), acts = new Set(), touchHeld = new Set(), touchPressed = new Set();
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: [false, false, false], pressed: [false, false, false], wheel: 0, game: false };
  const pad = { idx: -1, btn: [], prev: [], ax: [0, 0, 0, 0] };
  const stick = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
  let mode = 'kbm';
  const keyToAct = {};
  for (const [a, ks] of Object.entries(BIND)) for (const k of ks) (keyToAct[k] = keyToAct[k] || []).push(a);
  function setMode(m) { if (mode === m) return; mode = m; document.body.dataset.input = m; bus.emit('inputmode', m); }
  function init() {
    document.body.dataset.input = mode;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (['Tab', 'Space', 'AltLeft', 'AltRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      AUDIO.init(); setMode('kbm');
      if (!keys.has(e.code)) for (const a of keyToAct[e.code] || []) acts.add(a);
      keys.add(e.code);
    });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => { keys.clear(); mouse.down = [false, false, false]; });
    const c = $('#c');
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; if (e.movementX || e.movementY) setMode('kbm'); });
    c.addEventListener('mousedown', (e) => { AUDIO.init(); setMode('kbm'); mouse.down[e.button] = true; mouse.pressed[e.button] = true; e.preventDefault(); });
    addEventListener('mouseup', (e) => { mouse.down[e.button] = false; });
    c.addEventListener('wheel', (e) => { mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    addEventListener('gamepadconnected', (e) => { pad.idx = e.gamepad.index; });
    // touch controls
    const tz = $('#tStick');
    tz.addEventListener('pointerdown', (e) => { AUDIO.init(); setMode('touch'); stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; stick.x = 0; stick.y = 0; try { tz.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ } showStick(true); e.preventDefault(); });
    tz.addEventListener('pointermove', (e) => { if (e.pointerId !== stick.id) return; const dx = e.clientX - stick.x0, dy = e.clientY - stick.y0, l = Math.hypot(dx, dy), m = 55; stick.x = dx / Math.max(m, l); stick.y = dy / Math.max(m, l); if (l > m * 1.6) { stick.x0 = e.clientX - dx / l * m * 1.6; stick.y0 = e.clientY - dy / l * m * 1.6; } showStick(true); });
    const endStick = (e) => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; showStick(false); };
    tz.addEventListener('pointerup', endStick); tz.addEventListener('pointercancel', endStick);
    for (const b of $$('[data-act]')) {
      b.addEventListener('pointerdown', (e) => { AUDIO.init(); setMode('touch'); const a = b.dataset.act; touchHeld.add(a); touchPressed.add(a); b.classList.add('on'); e.preventDefault(); e.stopPropagation(); });
      const up = () => { touchHeld.delete(b.dataset.act); b.classList.remove('on'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    }
    addEventListener('touchstart', () => { AUDIO.init(); setMode('touch'); }, { passive: true });
  }
  function showStick(on) {
    const s = $('#tStickKnob'), base = $('#tStickBase');
    if (!on) { base.style.opacity = 0.35; s.style.transform = 'translate(-50%,-50%)'; base.style.left = ''; base.style.top = ''; return; }
    base.style.opacity = 0.8; base.style.left = stick.x0 + 'px'; base.style.top = stick.y0 + 'px';
    s.style.transform = `translate(calc(-50% + ${stick.x * 50}px), calc(-50% + ${stick.y * 50}px))`;
  }
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = pads[pad.idx];
    if (!p) { for (const q of pads) if (q && q.connected) { p = q; pad.idx = q.index; break; } }
    pad.prev = pad.btn;
    if (!p) { pad.btn = []; pad.ax = [0, 0, 0, 0]; return; }
    pad.btn = p.buttons.map((b) => b.pressed || b.value > 0.5);
    pad.ax = [0, 1, 2, 3].map((i) => { const v = p.axes[i] || 0; return Math.abs(v) < 0.18 ? 0 : v; });
    if (pad.btn.some((b, i) => b && !pad.prev[i]) || pad.ax.some((v) => Math.abs(v) > 0.5)) { setMode('pad'); AUDIO.init(); }
  }
  const pb = (i) => !!pad.btn[i] && !pad.prev[i];
  const ph = (i) => !!pad.btn[i];
  function update() {
    pollPad();
    if (mode === 'pad') {
      const shiftR = ph(7), shiftL = ph(6);
      if (pb(2)) acts.add(shiftR ? 'slot1' : shiftL ? 'slot4' : 'atkN');
      if (pb(3)) acts.add(shiftR ? 'slot2' : shiftL ? 'slot5' : 'atkH');
      if (pb(1)) acts.add(shiftR ? 'slot3' : shiftL ? 'slot6' : 'atkS');
      if (pb(0)) acts.add('padA');
      if (pb(5)) acts.add('dodge'); if (pb(4)) acts.add('pb');
      if (pb(12)) acts.add('potHp'); if (pb(13)) acts.add('potTp');
      if (pb(9)) acts.add('menu'); if (pb(8)) acts.add('map');
    }
    for (const a of touchPressed) acts.add(a);
    touchPressed.clear();
    if (mouse.pressed[0]) acts.add('click');
    if (mouse.pressed[2]) acts.add('atkH');
    if (mouse.pressed[1]) acts.add('atkS');
  }
  function endFrame() { acts.clear(); mouse.pressed = [false, false, false]; mouse.wheel = 0; }
  function held(a) {
    if (BIND[a] && BIND[a].some((k) => keys.has(k))) return true;
    if (touchHeld.has(a)) return true;
    if (mode === 'pad') { if (a === 'atkN') return ph(2) && !ph(7) && !ph(6); if (a === 'interact') return ph(0); if (a === 'labels') return ph(10); }
    if (a === 'atkN') return mouse.down[0] && mouse.game;
    return false;
  }
  const pressed = (a) => acts.has(a);
  // movement vector in screen terms: x right, y down
  function move() {
    let x = 0, y = 0;
    if (held('left')) x -= 1; if (held('right')) x += 1; if (held('up')) y -= 1; if (held('down')) y += 1;
    if (mode === 'pad') { x += pad.ax[0]; y += pad.ax[1]; if (ph(14)) x -= 1; if (ph(15)) x += 1; }
    if (stick.id !== null) { x += stick.x; y += stick.y; }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function rstick() { return mode === 'pad' ? { x: pad.ax[2], y: pad.ax[3] } : { x: 0, y: 0 }; }
  function navPad() {
    // menu navigation edges for the gamepad
    const out = {};
    if (pb(12) || (pad.ax[1] < -0.6 && !(pad.prevAx1 < -0.6))) out.up = true;
    if (pb(13) || (pad.ax[1] > 0.6 && !(pad.prevAx1 > 0.6))) out.down = true;
    if (pb(14) || (pad.ax[0] < -0.6 && !(pad.prevAx0 < -0.6))) out.left = true;
    if (pb(15) || (pad.ax[0] > 0.6 && !(pad.prevAx0 > 0.6))) out.right = true;
    if (pb(0)) out.ok = true; if (pb(1)) out.back = true; if (pb(4)) out.prevTab = true; if (pb(5)) out.nextTab = true; if (pb(9)) out.menu = true; if (pb(2)) out.x = true; if (pb(3)) out.y = true;
    pad.prevAx0 = pad.ax[0]; pad.prevAx1 = pad.ax[1];
    return out;
  }
  return { init, update, endFrame, held, pressed, move, rstick, navPad, mouse, keys, get mode() { return mode; }, setMode, acts };
})();

// ---------- the player ----------
function bestTool(c, ids, missingFrac) {
  const have = ids.filter((id) => invCount(c.inv, id) > 0);
  if (!have.length) return null;
  for (const id of have) if (TOOLS[id].v >= missingFrac - 0.05) return id;
  return have[have.length - 1];
}
function updatePlayer(dt) {
  if (GAME.bot) { botUpdate(PL, dt); PL.aimPt = PL.ai && PL.ai.target ? { x: PL.ai.target.x, z: PL.ai.target.z } : null; return; }
  const a = PL, c = GAME.char;
  const ctrl = { mx: 0, mz: 0, aim: null, atk: null, atkHeld: false, dodge: false, slot: null, walk: false };
  const blocked = UI.isOpen();
  if (!blocked && !a.downed) {
    const mv = Input.move(), b = camBasis();
    ctrl.mx = b.rx * mv.x - b.fx * mv.y; ctrl.mz = b.rz * mv.x - b.fz * mv.y;
    ctrl.walk = Input.held('walk');
    if (Math.hypot(mv.x, mv.y) > 0.2) a.autoWalk = null;
    // aiming
    const mode = Input.mode;
    if (mode === 'kbm') {
      const g = screenToGround(Input.mouse.x, Input.mouse.y, 0.9);
      if (g) ctrl.aim = g;
      // snap to an enemy right under the cursor
      const t = g && nearestFoeTo(g.x, g.z, 1.6, a);
      if (t) ctrl.aim = { x: t.x, z: t.z };
    } else {
      const rs = Input.rstick();
      if (Math.hypot(rs.x, rs.y) > 0.3) { const dx = b.rx * rs.x - b.fx * rs.y, dz = b.rz * rs.x - b.fz * rs.y; ctrl.aim = { x: a.x + dx * 6, z: a.z + dz * 6 }; }
      else {
        const fx = Math.hypot(ctrl.mx, ctrl.mz) > 0.2 ? ctrl.mx : Math.sin(a.yaw), fz = Math.hypot(ctrl.mx, ctrl.mz) > 0.2 ? ctrl.mz : Math.cos(a.yaw);
        const t = foeInDir(a, fx, fz, wcls(a) === 'melee' ? 6 : 12, 1.1) || nearestFoe(a, 4);
        ctrl.aim = t ? { x: t.x, z: t.z } : { x: a.x + fx * 5, z: a.z + fz * 5 };
      }
    }
    // clicking an item label picks it up (walking over first)
    let clickUsed = false;
    if (Input.pressed('click')) {
      const lab = HUD.labelAt(Input.mouse.x, Input.mouse.y);
      if (lab) { clickUsed = true; if (dist2(a.x, a.z, lab.x, lab.z) < 1.8 * 1.8) pickUp(lab); else a.autoWalk = lab; }
      else { Input.mouse.game = true; ctrl.atk = 'N'; }
    }
    if (!Input.mouse.down[0]) Input.mouse.game = false;
    if (Input.pressed('atkN')) ctrl.atk = 'N';
    if (Input.pressed('atkH')) ctrl.atk = 'H';
    if (Input.pressed('atkS')) ctrl.atk = 'S';
    ctrl.atkHeld = !clickUsed && Input.held('atkN');
    if (Input.pressed('dodge')) ctrl.dodge = true;
    for (let i = 0; i < 6; i++) if (Input.pressed('slot' + (i + 1))) ctrl.slot = i;
    const near = nearestInteract();
    if (Input.pressed('interact') || Input.pressed('padA')) {
      if (near) interact(near);
      else if (Input.pressed('padA')) ctrl.dodge = true;
    }
    if (Input.pressed('pb')) usePB(a);
    if (Input.pressed('potHp')) { const id = bestTool(c, ['medgel1', 'medgel2', 'medgel3'], 1 - a.hp / a.maxHp); if (id) startItem(a, id); else HUD.toast('No medgels left.', '#ff9090'); }
    if (Input.pressed('potTp')) { const id = bestTool(c, ['psicell1', 'psicell2', 'psicell3'], 1 - a.tp / a.maxTp); if (id) startItem(a, id); else HUD.toast('No psi cells left.', '#ff9090'); }
    // walking to a clicked item
    if (a.autoWalk) {
      const d = a.autoWalk;
      if (!GROUND.includes(d)) a.autoWalk = null;
      else if (dist2(a.x, a.z, d.x, d.z) < 1.4 * 1.4) { pickUp(d); a.autoWalk = null; }
      else { const dx = d.x - a.x, dz = d.z - a.z, l = Math.hypot(dx, dz); ctrl.mx = dx / l; ctrl.mz = dz / l; }
    }
    HUD.prompt(near ? near.label : null);
  } else if (a.downed && !blocked) {
    if (Input.pressed('interact') || Input.pressed('padA')) { if (!selfRevive(a)) HUD.toast('No Revive Shot. Wait for an ally, or return to the ship.', '#ff9090'); }
    HUD.prompt(null);
  } else HUD.prompt(null);
  updatePartyActor(a, dt, ctrl);
  a.aimPt = ctrl.aim;
}
function nearestFoeTo(x, z, r, a) { let best = null, bd = r * r; for (const e of ENTS) { if (e.team === a.team || !alive(e) || e.untargetable) continue; const d = dist2(x, z, e.x, e.z); if (d < bd) { bd = d; best = e; } } return best; }
