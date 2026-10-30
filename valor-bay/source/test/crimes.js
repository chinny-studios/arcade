// every crime type next to the hero, then a long god-mode patrol with the director running
VB.start({ hero: 'skylark', crimes: true, god: true });
const r = {};
for (const t of ['mugging', 'robbery', 'getaway', 'gangwar', 'heist']) {
  const c = VB.crime(t); r[t] = c ? { foes: c.foes.length, d: Math.round(Math.hypot(c.x - VB.P.x, c.z - VB.P.z)), district: c.district } : null;
}
VB.sim(5);
r.after5 = VB.stats();
r.toasts = [...document.querySelectorAll('.toast')].map((e) => e.textContent);
return r;
//--- shot c_markers
// let the city run for two minutes on its own
for (let i = 0; i < 8; i++) VB.sim(15);
const s = VB.stats();
return { crimes: s.crimes, wave: s.wave, foes: s.foes, list: VB.CRIME.list.map((c) => c.type + ':' + c.state + ':' + Math.round(c.t)) };
