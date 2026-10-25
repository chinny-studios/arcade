// first look: run a few seconds, render, report
SH.sim(3);
return SH.stats();
//--- shot first
SH.sim(0.1);
return { pos: P.s.pos.toArray(), state: SH.state };
