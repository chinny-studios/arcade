// Ricky Rescue — scoring a call, the patient's outcome, pay and experience, and the review screen

const RESPONSE_GOAL = { 1: 8 * 60, 2: 12 * 60, 3: 20 * 60 };
function destOK(C) {
  const want = typeof C.tpl.dest === 'function' ? C.tpl.dest(C.P) : C.tpl.dest;
  if (!want || want === 'any') return { ok: true, want: null };
  return { ok: !!C.dest && HOSPITALS[C.dest].caps.includes(want), want };
}
function alertWanted(C) {
  const P = C.P;
  let a = typeof C.tpl.alert === 'function' ? C.tpl.alert(P) : C.tpl.alert;
  if (a === 'stemi' && !P.conds.stemi && !(P.rosc || P.lastArrest || P.arrest)) a = null;
  if (a === 'stroke' && !P.conds.stroke) a = null;
  if (a === 'trauma' && C.tpl.id === 'mvc' && effLoss(P) < 600 && !P.conds.pneumo && !P.conds.tbi && !(P.conds.fracture && P.conds.fracture.femur)) a = null;
  return a;
}
// what happened to the patient after we left them
function outcomeFor(C) {
  const P = C.P, d = destOK(C);
  if (C.how === 'refusal') {
    const fine = !C.harms.some((h) => /refusal/i.test(h.text));
    return fine ? { tier: 1, text: `${P.first} stayed home and did fine. A follow-up call the next day found them well.` } : { tier: 3, text: `${P.first} got worse after you left and called 911 again two hours later.` };
  }
  if (C.how === 'abandoned') return { tier: 4, text: 'Another unit was sent to the patient after you left.' };
  if (P.dead || C.terminated) return { tier: 5, text: `${P.first} ${P.last} died. You stayed with the family and called the chaplain.` };
  if (P.arrest) return P.arrest.V > 0.35 ? { tier: 3, text: 'The ER team got a pulse back after ten more minutes. Admitted to the ICU.' } : { tier: 5, text: `${P.first} died in the emergency department despite everything.` };
  if (P.rosc) {
    const v = P.roscV;
    return v > 0.6 ? { tier: 1, text: `${P.first} woke up in the ICU two days later and went home a week after that. You were part of a save.`, save: true } : v > 0.3 ? { tier: 2, text: `${P.first} survived, with some memory problems that are slowly improving.`, save: true } : { tier: 4, text: `${P.first} never woke up and died in the ICU four days later.` };
  }
  // a risk score from how sick they were and how long things went wrong
  const S = P.stats, f = effLoss(P) / (P.kg * 70);
  let risk = S.hypoxT / 900 + S.hypoT / 900 + Math.max(0, f - 0.15) * 2.5;
  if (P.conds.stemi) risk += P.conds.stemi.sev * 0.6 + (d.ok ? 0 : 0.5) + (C.prealert === 'stemi' ? -0.2 : 0);
  if (P.conds.stroke) risk += 0.25 + (d.ok ? 0 : 0.5) + (C.prealert === 'stroke' ? -0.15 : 0.1);
  if (P.conds.tbi) risk += P.conds.tbi.sev * 0.8 + (d.ok ? 0 : 0.4);
  if (P.conds.pneumo && !P.conds.pneumo.decomp) risk += P.conds.pneumo.sev * 0.6;
  if (P.conds.anaph) risk += P.conds.anaph.sev * 0.7;
  if (P.conds.asthma) risk += P.conds.asthma.sev * 0.5;
  if (P.conds.chf) risk += P.conds.chf.sev * 0.5;
  if (P.conds.heat) risk += P.conds.heat.sev * 0.6;
  if (P.conds.hypogly && P.conds.hypogly.glu < 60) risk += 0.4;
  if (P.conds.opioid && P.conds.opioid.sev > 0.5) risk += 0.2;
  if (P.spine.violated) risk += 0.6;
  if (P.conds.labor && P.conds.labor.born && !P.conds.labor.baby.warm) risk += 0.4;
  if (C.mvc && !d.ok && risk > 0.3) risk += 0.3;
  risk = Math.max(0, risk);
  const who = P.first;
  let text, tier;
  if (risk < 0.25) { tier = 1; text = P.conds.labor ? `Mum and baby went home two days later.` : `${who} recovered well and went home ${P.conds.fracture || P.conds.stemi || P.conds.stroke ? 'after a few days' : 'the same day'}.`; }
  else if (risk < 0.6) { tier = 2; text = `${who} was admitted and is recovering.`; }
  else if (risk < 1.1) { tier = 3; text = `${who} needed the ICU for a few days, but pulled through.`; }
  else { tier = 4; text = `${who} was critically ill for a long time. The doctors say the delays mattered.`; }
  if (!d.ok && d.want) text += ` They had to be transferred to ${d.want === 'cardiac' || d.want === 'stroke' ? 'Mercy' : 'Harbor General'} for ${d.want === 'cardiac' ? 'the cath lab' : d.want === 'stroke' ? 'stroke care' : d.want === 'ob' ? 'labor & delivery' : 'the trauma team'}, which cost about an hour.`;
  if (P.spine.violated) text += ' A spinal injury got worse while being moved.';
  return { tier, text };
}
function scoreCall(C) {
  const P = C.P, items = [];
  const add = (cat, text, got, max, kind) => items.push({ cat, text, got: Math.round(got * 10) / 10, max, kind: kind || (got >= max ? 'good' : got <= 0 ? 'bad' : 'meh') });
  const special = C.how === 'refusal' || C.how === 'terminated';
  // response
  const goal = RESPONSE_GOAL[C.pri] * (C.hazard ? 1.4 : 1);
  // turnout: from the page to the wheels rolling; then the drive
  const page = C.times.page || 0, ack = (C.times.ack !== undefined ? C.times.ack : C.t) - page;
  const roll = C.times.roll !== undefined ? C.times.roll : C.times.respond || 0, cg = C.chuteGoal || 90;
  const chute = Math.max(0, roll - page), resp = (C.times.arrive || C.t) - roll;
  add('Response', `Turnout ${fmtDur(chute)} from the page (goal ${fmtDur(cg)})`, clamp(3 * (2 - chute / cg), 0, 3), 3);
  if (ack > ACK_T) add('Response', `Took ${fmtDur(ack)} to acknowledge the page`, -2, 0, 'bad');
  add('Response', `Drive ${fmtMin(resp)} (goal ${fmtMin(goal)})`, clamp(7 * (2 - resp / goal), 0, 7), 7);
  // problems a rig check would have caught
  for (const f of (C.equipFails || []).slice(0, 2)) add('Readiness', `Found on the call: ${f}. A rig check would have caught it.`, -2, 0, 'bad');
  if (C.pri === 3 && C.ls.enroute) add('Response', 'Lights and sirens on a priority 3 call', -3, 0, 'bad');
  // assessment
  add('Assessment', 'Gloves before touching the patient', C.ppe && !C.ppeWarn ? 3 : 0, 3);
  add('Assessment', 'General impression and ABCs', (C.acts.has('impression') ? 2 : 0) + (C.acts.has('abc') ? 3 : 0), 5);
  // a pulseless patient has no vitals to take: in an arrest the monitor counts, and vitals matter after a pulse returns
  const arrestCall = !!(P.arrest || P.lastArrest);
  const vs = ['hr', 'bp', 'rr', 'spo2'].filter((k) => P.known.has(k)).length;
  if (arrestCall && (P.arrest || !P.rosc)) add('Assessment', P.pads || P.monitor ? 'Rhythm monitored' : 'No monitor on a pulseless patient', P.pads || P.monitor ? 5 : 0, 5);
  else add('Assessment', `Vital signs (${vs} of 4)`, vs * 1.25, 5);
  const bpN = (C.actN.bp || 0) + (P.monitor ? 1 : 0), reN = (C.actN.pulse || 0) + (C.actN.spo2 || 0) + (C.actN.bp || 0) + (P.monitor ? 2 : 0);
  add('Assessment', 'Reassessed vitals', arrestCall && P.monitor ? 3 : reN >= 4 && bpN >= 2 ? 3 : reN >= 3 ? 1.5 : 0, 3);
  add('Assessment', 'History (SAMPLE)', C.acts.has('sample') || (P.known.has('bystanderTalk') && P.avpu !== 'A') ? 4 : 0, 4);
  // protocol checks
  let pg = 0, pm = 0;
  for (const k of C.tpl.checks) {
    const w = k.kind === 'crit' ? 2 : 1, ok = !!k.test(C, P);
    pm += w; if (ok) pg += w;
    items.push({ cat: 'Protocol', text: k.text, got: ok ? 1 : 0, max: 1, kind: ok ? 'good' : k.kind === 'crit' ? 'bad' : 'meh', crit: k.kind === 'crit' });
  }
  const proto = pm ? 35 * pg / pm : 35;
  // destination and pre-alert
  let dest = 10;
  if (!special) {
    const d = destOK(C), want = alertWanted(C);
    if (!d.ok) { dest -= 6; items.push({ cat: 'Destination', text: `Should have gone to a hospital with ${CAP_NAMES[d.want].toLowerCase()}`, got: 0, max: 1, kind: 'bad' }); }
    else items.push({ cat: 'Destination', text: `Right hospital (${C.dest ? HOSPITALS[C.dest].short : 'none'})`, got: 1, max: 1, kind: 'good' });
    if (want && C.prealert !== want) { dest -= 4; items.push({ cat: 'Destination', text: `Should have called a ${want === 'stemi' ? 'STEMI' : want} alert`, got: 0, max: 1, kind: 'bad' }); }
    else if (!want && C.prealert && C.prealert !== 'none') { dest -= 2; items.push({ cat: 'Destination', text: 'Called an alert the patient didn\'t need', got: 0, max: 1, kind: 'meh' }); }
    else if (want) items.push({ cat: 'Destination', text: 'Pre-alert called', got: 1, max: 1, kind: 'good' });
    const tls = C.tpl.transportLS(C, P);
    if (C.ls.transport && !tls && !P.arrest) { dest -= 2; items.push({ cat: 'Destination', text: 'Lights and sirens to the hospital for a stable patient', got: 0, max: 1, kind: 'meh' }); }
  }
  // scene time
  const st = C.sceneTime !== undefined ? C.sceneTime : (C.times.end - (C.times.contact || C.times.arrive || 0));
  const sg = C.tpl.sceneGoal;
  const scene = special ? 5 : clamp(5 * (2 - st / sg), 0, 5);
  items.push({ cat: 'Scene', text: `Scene time ${fmtMin(st)} (goal ${fmtMin(sg)})`, got: Math.round(scene), max: 5, kind: scene >= 4 ? 'good' : scene >= 2 ? 'meh' : 'bad' });
  // driving
  const crashes = RIG ? RIG.crashes - C.crashes0 : 0;
  let drive = Math.max(0, 5 - crashes * 2);
  if (crashes) items.push({ cat: 'Driving', text: `${crashes} collision${crashes > 1 ? 's' : ''}`, got: -crashes * 2, max: 0, kind: 'bad' });
  if (C.roughSum > 20) { drive -= 2; items.push({ cat: 'Driving', text: 'A rough ride for the patient', got: -2, max: 0, kind: 'meh' }); }
  drive = Math.max(0, drive);
  // handoff
  const ho = C.handoff ? 5 * C.handoff.right / C.handoff.n : special ? 5 : 0;
  if (C.handoff) items.push({ cat: 'Handoff', text: `Handoff report ${C.handoff.right}/${C.handoff.n} correct`, got: Math.round(ho), max: 5, kind: ho >= 4 ? 'good' : 'meh' });
  // outcome
  const out = outcomeFor(C);
  const outPts = { 1: 10, 2: 8, 3: 5, 4: 2, 5: 0 }[out.tier];
  const deathFair = (C.how === 'terminated' || out.tier === 5) && C.tpl.arrest && pg / Math.max(1, pm) > 0.7;
  // harms
  const harm = Math.min(36, C.harms.length * 6);
  let total = items.filter((i) => ['Response', 'Assessment', 'Readiness'].includes(i.cat)).reduce((a, i) => a + i.got, 0) + proto + dest + scene + drive + ho + (deathFair ? 7 : outPts) - harm;
  if (C.how === 'abandoned') total = Math.min(total, 30);
  total = clamp(Math.round(total), 0, 100);
  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F';
  const xp = Math.round(total * 1.3 + (C.pri === 1 ? 30 : 10) + (out.save ? 60 : 0));
  const pay = Math.round(110 + total * 2.2 + (G.career.rank >= 3 ? 60 : 0) + (out.save ? 100 : 0));
  return { C, P, items, harms: C.harms, total, grade, xp, pay, out, proto: Math.round(proto), sections: { proto, dest, scene, drive, ho }, deathFair, chute };
}
function applyResult(res) {
  const K = G.career, C = res.C;
  const before = K.rank;
  K.xp += res.xp; K.money += res.pay;
  G.shift.earnings += res.pay; G.shift.xp += res.xp;
  if (G.shift.posting) G.shift.posting.chutes.push(res.chute);
  K.stats.calls++; K.stats.grades[res.grade]++;
  if (res.out.save) { K.stats.saves++; K.stats.rosc++; }
  if (C.P.conds.labor && C.P.conds.labor.born) K.stats.deliveries++;
  if (RIG) K.stats.crashes += RIG.crashes - C.crashes0;
  if (!K.stats.best || res.total > K.stats.best) K.stats.best = res.total;
  K.hist.unshift({ t: Date.now(), nature: C.nature, grade: res.grade, total: res.total, name: C.P.name });
  K.hist = K.hist.slice(0, 30);
  res.unlocks = updateUnlocks(K);
  res.rankUp = K.rank > before ? RANKS[K.rank] : null;
}
function showReview(res) {
  const C = res.C, P = res.P;
  closeCare();
  $('#rvGrade').textContent = res.grade; $('#rvGrade').className = 'grade g' + res.grade;
  $('#rvTitle').textContent = `${C.nature}: ${P.name}, ${P.age}`;
  $('#rvScore').textContent = res.total + ' / 100';
  $('#rvOutcome').textContent = res.out.text;
  const cats = {};
  for (const i of res.items) (cats[i.cat] = cats[i.cat] || []).push(i);
  let html = '';
  for (const [cat, list] of Object.entries(cats)) {
    html += `<h4>${cat}</h4>` + list.map((i) => `<div class="ri ${i.kind}"><span>${i.kind === 'good' ? '✓' : i.kind === 'bad' ? '✗' : '•'}</span>${esc(i.text)}${i.crit && i.kind !== 'good' ? ' <em>critical</em>' : ''}</div>`).join('');
  }
  if (res.harms.length) html += '<h4>Errors</h4>' + res.harms.map((h) => `<div class="ri bad"><span>!</span>${esc(h.text)} <em>−6</em></div>`).join('');
  $('#rvItems').innerHTML = html;
  const K = G.career, nr = RANKS[K.rank + 1];
  $('#rvPay').innerHTML = `+${res.xp} XP · +${fmtMoney(res.pay)}` + (res.rankUp ? `<div class="up">Promoted: ${res.rankUp.long}! ${esc(res.rankUp.blurb)}</div>` : '') + (res.unlocks && res.unlocks.length ? `<div class="up">New district: ${res.unlocks.join(', ')}</div>` : '');
  $('#rvRank').innerHTML = nr ? `<i style="width:${clamp((K.xp - RANKS[K.rank].xp) / (nr.xp - RANKS[K.rank].xp) * 100, 0, 100)}%"></i><span>${RANKS[K.rank].name} · ${K.xp} / ${nr.xp} XP to ${nr.name}</span>` : `<i style="width:100%"></i><span>${RANKS[K.rank].long} · ${K.xp} XP</span>`;
  UI.show('review');
  AUDIO.chime && AUDIO.chime(res.grade);
}
