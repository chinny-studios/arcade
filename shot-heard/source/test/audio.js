// run every sound path once with a live AudioContext (gain near zero)
const ok = SH.audio(); SH.god(true);
SH.sim(90);
const me = P.s; SH.dummy(20); SH.click('L'); SH.sim(0.5); SH.press('KeyR'); SH.sim(15);
SH.press('KeyF'); SH.sim(1);
const c = SH.CANNONS.find((c) => c.team === me.team || c.team === -1); SH.tp(c.pos.x - Math.sin(c.yaw) * 1.8, c.pos.z - Math.cos(c.yaw) * 1.8, c.yaw); SH.sim(0.2); SH.press('KeyE'); SH.sim(0.2); SH.click('L'); SH.sim(3);
SH.f.finishMatch(me.team); SH.sim(3);
return { ok, ac: SH.STATS, calls: SH.renderer.info.render.calls };
//--- shot audio_end
SH.render(); return { calls: SH.renderer.info.render.calls, tris: SH.renderer.info.render.triangles };
