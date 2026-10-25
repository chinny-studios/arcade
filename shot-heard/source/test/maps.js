// a look at each field: overview from the cinematic camera, then from the ground at a flag
const shot = async (map, i) => {};
out.res = [];
SH.start({ map: 'bunker', side: 1 }); SH.god(true); SH.sim(20);
SH.f.setState('deploy'); SH.f.cinematicCamera(0.016, true); SH.sim(0.1);
out.res.push(SH.stats());
//--- shot map_bunker_over
SH.f.setState('play'); const f = SH.f.flagById('B'); SH.tp(f.x + 30, f.z + 30); SH.aimAt(f.x, F.heightAt(f.x, f.z) + 2, f.z); SH.sim(0.2);
//--- shot map_bunker_ground
SH.start({ map: 'saratoga', side: 0 }); SH.god(true); SH.sim(20);
SH.f.setState('deploy'); SH.f.cinematicCamera(0.016, true); SH.sim(0.1);
out.res.push(SH.stats());
//--- shot map_saratoga_over
SH.f.setState('play'); const g = SH.f.flagById('C'); SH.tp(g.x - 50, g.z + 40); SH.aimAt(g.x, F.heightAt(g.x, g.z) + 3, g.z); SH.sim(0.2);
//--- shot map_saratoga_ground
SH.start({ map: 'yorktown', side: 0 }); SH.god(true); SH.sim(20);
SH.f.setState('deploy'); SH.f.cinematicCamera(0.016, true); SH.sim(0.1);
out.res.push(SH.stats());
//--- shot map_yorktown_over
SH.f.setState('play'); const h = SH.f.flagById('D'); SH.tp(h.x + 10, h.z + 45); SH.aimAt(h.x, F.heightAt(h.x, h.z) + 1, h.z); SH.sim(0.2);
//--- shot map_yorktown_ground
SH.start({ map: 'lexington', side: 1 }); SH.god(true); SH.sim(5);
const a = SH.f.flagById('A'); SH.tp(a.x + 30, a.z + 8); SH.aimAt(a.x - 20, F.heightAt(a.x, a.z) + 1, a.z - 4); SH.sim(0.2);
return out.res;
//--- shot map_lex_bridge
