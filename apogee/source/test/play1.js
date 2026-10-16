// Mission 1: shoot a guard, knock a hat off, photograph and bug the payload, mine the radar, ride the lift.
const G = AP.f.G;
AP.freeze(); AP.god();
const guard = G.actors.find((a) => !a.civilian && a.state === 'idle' && Math.hypot(a.x - G.player.x, a.z - G.player.z) < 40);
out.gi = G.actors.indexOf(guard);
AP.tpXZ(guard.x - Math.sin(guard.yaw) * 4, guard.z - Math.cos(guard.yaw) * 4); AP.sim(0.1);
out.where = [guard.x, guard.z, AP.state().pos];
guard.P.root.updateMatrixWorld(true);
AP.aimAt(guard.x, guard.y + 1.85, guard.z); AP.fire(1);
out.hatOff = guard.hatOff;
AP.sim(0.5);
AP.aimAt(guard.x, guard.y + 1.25, guard.z); AP.fire(1); AP.sim(0.3);
out.guardHp = Math.round(guard.hp); out.guardState = guard.state;
AP.aimAt(guard.x, guard.y + 1.7, guard.z); AP.fire(1); AP.sim(0.2);
out.dead = guard.dead; out.kind = guard.deathKind; out.stats = Object.assign({}, G.stats);
AP.sim(1.0); AP.render();
//--- shot p1_dead
AP.peace();
AP.select('camera');
const pay = AP.f.L.props.find((p) => p.id === 'payload');
AP.tpXZ(pay.center[0] - 6, pay.center[2] + 1); AP.aimAt(...pay.center); AP.fire(1);
AP.select('bug');
AP.tpXZ(pay.center[0] - 2.2, pay.center[2]); AP.aimAt(pay.center[0], 1.6, pay.center[2]); AP.fire(1);
out.afterPhotoBug = AP.objectives().map((o) => o.letter + ':' + o.status);
const radar = AP.f.L.props.find((p) => p.id === 'radar');
AP.select('mines');
AP.tpXZ(radar.center[0] - 5, radar.center[2] + 1); AP.aimAt(radar.center[0], 2.5, radar.center[2]); AP.fire(1); AP.sim(1.5);
out.mines = AP.f.MINES.list.map((m) => [m.stuck, m.prop && m.prop.id]);
AP.tpXZ(radar.center[0] - 12, radar.center[2] + 4);
AP.press('KeyF'); AP.sim(0.3); AP.render();
//--- shot p1_boom
AP.sim(1.0);
out.afterRadar = AP.objectives().map((o) => o.letter + ':' + o.status);
AP.tp(37, 8, 0); AP.sim(0.5);
out.final = AP.state();
return out;
