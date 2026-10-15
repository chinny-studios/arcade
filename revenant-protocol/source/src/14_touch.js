// Revenant Protocol — twin-stick touch controls: left half moves, right half looks, buttons for the rest

function setupTouch() {
  if (isTouch) document.body.classList.add('touch');
  const joy = $('#joy'), knob = $('#joy i');
  let moveId = null, mx0 = 0, my0 = 0, lookId = null, lx = 0, ly = 0;
  const R0 = 52;
  $('#tmove').addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; moveId = t.identifier; mx0 = t.clientX; my0 = t.clientY;
    joy.style.display = 'block'; joy.style.left = mx0 + 'px'; joy.style.top = my0 + 'px'; knob.style.transform = '';
    e.preventDefault();
  }, { passive: false });
  $('#tlook').addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) {
        let dx = t.clientX - mx0, dy = t.clientY - my0; const l = Math.hypot(dx, dy);
        if (l > R0) { dx *= R0 / l; dy *= R0 / l; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        VI.mx = dx / R0; VI.mz = -dy / R0;
      } else if (t.identifier === lookId) {
        mouse.dx += (t.clientX - lx) * 1.6; mouse.dy += (t.clientY - ly) * 1.3; lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { moveId = null; VI.mx = VI.mz = 0; joy.style.display = 'none'; }
      if (t.identifier === lookId) lookId = null;
    }
  };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  const hold = (id, k) => {
    const b = $(id);
    b.addEventListener('touchstart', (e) => { VI[k] = true; b.classList.add('on'); e.preventDefault(); e.stopPropagation(); }, { passive: false });
    b.addEventListener('touchend', (e) => { VI[k] = false; b.classList.remove('on'); e.preventDefault(); });
  };
  const tap = (id, fn) => $(id).addEventListener('touchstart', (e) => { fn(); e.preventDefault(); e.stopPropagation(); }, { passive: false });
  hold('#tFire', 'fire'); hold('#tAlt', 'alt');
  tap('#tJump', () => { VI.jump = true; });
  tap('#tCrouch', () => { VI.crouch = !VI.crouch; $('#tCrouch').classList.toggle('on', VI.crouch); });
  tap('#tUse', () => { VI.use = true; });
  tap('#tPrev', () => cycleWeapon(-1)); tap('#tNext', () => cycleWeapon(1));
  tap('#tMap', () => toggleMap()); tap('#tPda', () => openPda());
  tap('#tLamp', () => toggleLamp()); tap('#tMask', () => toggleGear('mask')); tap('#tCleat', () => toggleGear('cleats'));
  tap('#tPause', () => pauseGame());
}
