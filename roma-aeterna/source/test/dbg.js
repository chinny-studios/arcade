RA.go('suburastreet'); const N = RA.NPC; 
return { edgeW: Math.round(N.edgeW), target: N.targetWalkers(), walkers: N.agents.filter(a => a.type === 'walk').length, spots: N.agents.filter(a => a.type === 'spot').length, edges: N.edgesNear.length };
