NR.tp(NR.NPC.baker.x + 4, NR.NPC.baker.z + 3); NR.lookAt(NR.NPC.baker.x, 1.6, NR.NPC.baker.z); NR.sim(0.2); NR.render();
//--- shot real_stall
NR.tp(NR.NPC.fai.x + 3, NR.NPC.fai.z - 4); NR.lookAt(NR.NPC.fai.x, 1.6, NR.NPC.fai.z); NR.sim(0.2); NR.render();
//--- shot real_tea
const ck = NR.LANDMARKS.find(l => l.id === 'chungking'); NR.tp(ck.x - 12, ck.z - 6); NR.lookAt(ck.x + 8, 5, ck.z); NR.sim(0.5); NR.render();
//--- shot real_chungking
NR.tp(-60, 300); NR.look(0, 0.05); NR.sim(0.5); NR.render();
//--- shot real_peking
