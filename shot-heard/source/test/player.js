// the player's own systems: shoot a man, load, bayonet, grenade, crew a gun, ride
SH.god(true); SH.sim(4);
const me = P.s, R = {};
const v = SH.dummy(25);
SH.aimAt(v.pos.x, v.pos.y + 1.2, v.pos.z); SH.holdMouse('R', true); SH.sim(0.5);
SH.aimAt(v.pos.x, v.pos.y + 1.2, v.pos.z); SH.click('L'); SH.sim(0.4); SH.holdMouse('R', false);
R.shot = { victim: v.state, hp: Math.round(v.hp), loaded: me.wp.loaded, shots: SH.STATS.shots, hits: SH.STATS.hits };
SH.press('KeyR'); SH.sim(0.1);
R.reloadStart = me.wp.reloading;
SH.sim(16);
R.reloaded = { loaded: me.wp.loaded, ammo: me.wp.ammo, reloading: me.wp.reloading };
const v2 = SH.dummy(1.8); SH.aimAt(v2.pos.x, v2.pos.y + 1.2, v2.pos.z);
SH.press('KeyF'); SH.sim(0.6);
R.melee = { state: v2.state, hp: Math.round(v2.hp) };
const v3 = SH.dummy(14); SH.aimAt(v3.pos.x, v3.pos.y + 3.5, v3.pos.z);
SH.press('Digit3'); SH.sim(0.4); SH.click('L'); SH.sim(0.1);
R.nade = { left: me.gad[0] };
SH.sim(3.6);
R.nade.v3 = v3.state; R.nade.hp = Math.round(v3.hp);
SH.press('Digit1'); SH.sim(0.4);
return R;
//--- shot player_after
const me = P.s;
const c = SH.CANNONS.find((c) => c.team === me.team || c.team === -1);
SH.tp(c.pos.x - Math.sin(c.yaw) * 1.8, c.pos.z - Math.cos(c.yaw) * 1.8, c.yaw); SH.sim(0.2);
SH.press('KeyE'); SH.sim(0.2);
const crewed = me.mount && me.mount.type;
SH.click('L'); SH.sim(0.1);
const rounds = SH.ROUNDS.length;
SH.sim(1.5);
return { crewed, rounds, loaded: c.loaded, aim: c.aimPoint.toArray().map((x) => Math.round(x)) };
//--- shot player_gun
const me = P.s;
SH.press('KeyE'); SH.sim(0.2);
const h = SH.HORSES.find((x) => x.team === me.team && x.alive && !x.rider);
if (!h) return 'no horse';
SH.tp(h.pos.x + 1.5, h.pos.z, -Math.PI / 2); SH.sim(0.1); SH.press('KeyE'); SH.sim(0.1);
const mounted = me.mount && me.mount.type;
const p0 = h.pos.clone();
SH.keys.KeyW = true; SH.keys.ShiftLeft = true; SH.sim(4); SH.keys.KeyW = false; SH.keys.ShiftLeft = false;
return { mounted, moved: Math.round(h.pos.distanceTo(p0)), speed: Math.round(h.speed) };
//--- shot player_horse
