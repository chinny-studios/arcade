// Real DOM events: menus by click, then helm, targeting, shields, squadrons and firing by key and mouse.
const key = (code, type) => window.dispatchEvent(new KeyboardEvent(type || 'keydown', { code, bubbles: true }));
// SwiftShader draws a frame every few hundred ms, so wait for real frames between inputs.
const frames = (n) => new Promise((res) => { const f = () => (--n <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const tap = async (code) => { key(code); await frames(2); key(code, 'keyup'); await frames(2); };
const r = {};
document.getElementById('btnCampaign').click(); await wait(300);
r.campaignShown = !document.getElementById('campaign').hidden;
r.missions = document.querySelectorAll('.mi').length;
document.getElementById('btnLaunch').click(); await wait(1500);
r.state = HG.G.state;
const p = HG.G.player;
await tap('KeyW'); await tap('KeyW'); await tap('KeyW');
r.thr = p.thr;
key('KeyA'); await wait(1500); key('KeyA', 'keyup');
r.yawRate = +p.yawRate.toFixed(3);
const y0 = HG.pc.yaw; window.dispatchEvent(new MouseEvent('mousemove', { movementX: 200, movementY: 0 })); await frames(2);
r.camTurned = HG.pc.yaw !== y0;
await tap('Tab'); r.target = HG.pc.target && HG.pc.target.name;
await tap('KeyE'); r.sub = HG.pc.sub;
await tap('Digit3'); r.reinforce = p.reinforce;
await tap('Digit3'); r.balanced = p.reinforce;
await tap('KeyZ'); await frames(8); r.launched = p.squads[0].out.length;
key('KeyZ'); await wait(700); await frames(2); key('KeyZ', 'keyup'); await frames(2); r.recall = p.squads[0].order.kind;
HG.place(HG.pc.target, 1100, 85, 0, 180); HG.reload(); HG.aimAt(HG.pc.target);
for (const s in p.bat) p.bat[s].t = 0;
window.dispatchEvent(new MouseEvent('mousedown', { button: 0 })); await frames(3); window.dispatchEvent(new MouseEvent('mouseup', { button: 0 })); await frames(4);
r.shots = p.stats.shots; r.bears = Object.assign({}, HG.pc.bears);
key('Escape'); await frames(2); r.paused = HG.G.paused;
key('Escape', 'keyup'); document.getElementById('btnResume').click(); await frames(2); r.resumed = !HG.G.paused;
return r;
//--- shot inputs
