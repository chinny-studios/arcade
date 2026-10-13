// Ashreach — test helper appended after the modules under test: makes a player
function setPlayer(prof, level, faction) {
  const c = newCharacter({ name: 'Tester', prof, faction, breed: 'baseline' });
  while (c.level < level) levelUp(c);
  const P = makeEnt('player', { name: 'Tester', level, char: c, faction });
  PLAYER = P; addEnt(P); TEAM.members = [P]; TEAM.leader = P; P.team = TEAM;
  return P;
}
function getZone() { return ZONE; }
