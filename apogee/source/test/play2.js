// Mission 2 on Orbital Agent: keycard from Rusk, download, transmitter, stay quiet, escape.
AP.freeze(); AP.god(); AP.peace();
const G = AP.f.G, L = AP.f.L;
const rusk = G.actors.find((a) => a.id === 'rusk');
AP.tpXZ(rusk.x + 3, rusk.z); AP.aimAt(rusk.x, rusk.y + 1.7, rusk.z); AP.fire(1); AP.sim(0.5);
out.ruskDead = rusk.dead;
AP.tpXZ(rusk.x, rusk.z); AP.sim(1.0);
out.items = Object.keys(G.player.items);
const term = L.props.find((p) => p.id === 'terminal');
const tc = [(term.box[0] + term.box[3]) / 2, (term.box[2] + term.box[5]) / 2];
AP.tpXZ(tc[0], tc[1] + 1.6); AP.aimAt(tc[0], 1.0, tc[1]);
out.useTarget = AP.useNow();
AP.sim(5);
const tx = L.props.find((p) => p.id === 'transmitter');
AP.select('mines');
AP.tpXZ(tx.center[0] - 3, tx.center[2]); AP.aimAt(tx.center[0], 1.0, tx.center[2]); AP.fire(1); AP.sim(1);
AP.tpXZ(tx.center[0] - 9, tx.center[2]); AP.press('KeyF'); AP.sim(1.5);
out.objs = AP.objectives().map((o) => o.letter + ':' + o.status);
// locked command deck door opens with the card
AP.tp(36, 15, -Math.PI / 2); AP.press('KeyE'); AP.sim(1.5);
const door = L.doors.find((d) => d.c === 37 && d.r === 15);
out.door = [door.locked, +door.open.toFixed(2)];
AP.tp(40, 15, 0); AP.sim(0.5); AP.render();
//--- shot p2_deck
AP.sim(0.5);
return Object.assign(out, AP.state());
