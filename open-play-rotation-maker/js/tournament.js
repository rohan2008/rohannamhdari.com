// Tournament modes: round robin, single-elimination bracket, and round robin into a seeded bracket.

const nextPow2 = n => { let p = 1; while (p < n) p *= 2; return p; };
const checkedIn = () => S.players.filter(p => p.here && p.name.trim());
const currentTourney = () => (S.tourney && S.tourney.kind === S.mode) ? S.tourney : null;

/* ---------- entrants ---------- */

// Teams for the next tournament. Singles: one player each.
// Doubles, picked: the teams the organizer paired up. Doubles, randomized: balanced pairs
// (strongest with weakest until shuffled). With an odd count, one player sits out: the organizer's
// choice, or the most recently added player if they haven't picked.
function draftTeams() {
  const here = checkedIn();
  if (S.format === 'singles') return { teams: here.map(p => [p.id]), left: [] };

  if (S.teamMode === 'picked') {
    const ids = new Set(here.map(p => p.id));
    const teams = (S.pickedTeams || []).filter(t => t.every(id => ids.has(id)));
    const used = new Set(teams.flat());
    return { teams, left: here.filter(p => !used.has(p.id)).map(p => p.id) };
  }

  const sitter = here.length % 2 ? (here.find(p => p.id === S.sitOut) || here[here.length - 1]) : null;
  const pool = here.filter(p => p !== sitter);
  const left = sitter ? [sitter.id] : [];
  const ids = new Set(pool.map(p => p.id));
  const d = S.draftTeams;
  if (d && d.flat().length === pool.length && d.flat().every(id => ids.has(id))) return { teams: d, left };

  const sk = skillMap(here);
  const sorted = pool.map(p => p.id).sort((a, b) => sk[b] - sk[a]);
  const teams = [];
  for (let i = 0; i < sorted.length / 2; i++) teams.push([sorted[i], sorted[sorted.length - 1 - i]]);
  return { teams, left };
}

// Picked teams: tap one player, then their partner.
function pickPlayer(id) {
  S.pickedTeams = (S.pickedTeams || []).filter(t => t.every(x => checkedIn().some(p => p.id === x)));
  if (!pickSel || pickSel === id) { pickSel = pickSel === id ? null : id; return; }
  S.pickedTeams.push([pickSel, id]);
  pickSel = null;

  // Only two players left without a partner: they're a team. (Only after a pick, so splitting a team still works.)
  const used = new Set(S.pickedTeams.flat());
  const left = checkedIn().filter(p => !used.has(p.id));
  if (left.length === 2) {
    S.pickedTeams.push(left.map(p => p.id));
    toast(`${left[0].name} & ${left[1].name} were the last two, so they're a team.`);
  }
}
function splitTeam(i) { S.pickedTeams.splice(i, 1); }
let pickSel = null; // first player tapped, waiting for a partner (not saved)

// Another balanced pairing, picked at random from the most even ones.
function rePairTeams() {
  const { teams, left } = draftTeams();
  const ids = teams.flat();
  if (ids.length < 4) return;
  const sk = skillMap(checkedIn());
  let best = null, bestCost = Infinity;
  for (let it = 0; it < 400; it++) {
    const s = shuffle(ids.slice());
    const pairs = []; for (let i = 0; i < s.length; i += 2) pairs.push([s[i], s[i + 1]]);
    const avgs = pairs.map(t => (sk[t[0]] + sk[t[1]]) / 2);
    const cost = Math.max(...avgs) - Math.min(...avgs) + Math.random() * 0.03;
    if (cost < bestCost) { bestCost = cost; best = pairs; }
  }
  S.draftTeams = best;
  return left;
}

// Same two players = same team, whatever order they were paired in. Used to remember team names.
const teamKey = members => members.slice().sort().join('+');
const teamColor = i => TEAM_COLORS[i % TEAM_COLORS.length];
const customName = members => members.length > 1 ? ((S.teamNames || {})[teamKey(members)] || '').trim() : '';

function entrantRating(members) {
  const v = members.map(id => duprOf(playerOf(id))).filter(r => r !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/* ---------- setup choices ---------- */

function bracketSizeOptions(kind, count) {
  if (count < 2) return [];
  return kind === 'combo'
    ? BRACKET_SIZES.filter(n => n <= count)
    : BRACKET_SIZES.filter(n => n <= Math.min(32, nextPow2(count)));
}
function defaultBracketSize(kind, count) {
  const opts = bracketSizeOptions(kind, count);
  if (!opts.length) return null;
  if (kind === 'combo') return opts.includes(4) && count >= 5 ? 4 : opts[0];
  return opts[opts.length - 1]; // bracket only: room for everyone
}
function chosenBracketSize(kind, count) {
  const opts = bracketSizeOptions(kind, count);
  return opts.includes(S.bracketSize) ? S.bracketSize : defaultBracketSize(kind, count);
}

/* ---------- starting / ending ---------- */

function startTourney() {
  const kind = S.mode;
  const { teams } = draftTeams();
  if (teams.length < 2) { toast(`Check in at least ${S.format === 'doubles' ? 4 : 2} players to start.`); return; }

  const sk = skillMap(checkedIn());
  const entrants = teams.map((m, i) => ({
    id: 't' + i,
    name: customName(m) || m.map(nameOf).join(' & '),
    sub: customName(m) ? m.map(nameOf).join(' & ') : '', // players' names, shown under a team name
    color: teamColor(i),
    members: m.slice(),
    rating: entrantRating(m),
    skill: m.reduce((s, id) => s + sk[id], 0) / m.length
  }));
  const T = { kind, size: kind === 'rr' ? null : chosenBracketSize(kind, entrants.length), entrants, stage: kind === 'bracket' ? 'bracket' : 'pool', rr: null, bracket: null };

  if (kind === 'bracket') {
    const bySkill = entrants.slice().sort((a, b) => b.skill - a.skill).map(e => e.id);
    T.bracket = makeBracket(bySkill, T.size);
  } else {
    T.rr = { rounds: circleSchedule(entrants.map(e => e.id)), scores: {} };
  }
  S.tourney = T;
  save(); render();
}

// Undo the seeding: back to pool play with its scores unlocked. The bracket and its scores are deleted.
function reopenPool() {
  const T = currentTourney(); if (!T || !T.rr) return;
  T.bracket = null; T.stage = 'pool';
  save(); render(); toast('Pool play reopened. Seed the bracket again when the scores are right.');
}

function endTourney() { S.tourney = null; save(); render(); toast('Tournament ended.'); }

/* ---------- round robin ---------- */

// Circle method: everyone meets everyone once. With an odd count, one entrant has a bye each round.
function circleSchedule(ids) {
  const list = ids.slice();
  if (list.length % 2) list.push(null);
  const n = list.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a && b) matches.push([a, b]);
    }
    rounds.push(matches);
    list.splice(1, 0, list.pop()); // rotate everyone except the first
  }
  return rounds;
}

// Why a fully entered score can't count: 'tie', or 'rule' when the optional "game to N, win by 2" check fails.
function scoreIssue(sc) {
  if (!sc || sc[0] == null || sc[1] == null) return null;
  const w = Math.max(sc[0], sc[1]), l = Math.min(sc[0], sc[1]);
  if (w === l) return 'tie';
  const rule = S.scoreRule;
  if (rule && rule.on && !((w === rule.to && w - l >= 2) || (w > rule.to && w - l === 2))) return 'rule';
  return null;
}
const winnerOf = (a, b, sc) => (sc && sc[0] != null && sc[1] != null && !scoreIssue(sc)) ? (sc[0] > sc[1] ? a : b) : null;

// Players checked in but not yet on any team in this tournament.
const lateCandidates = T => { const inT = new Set(T.entrants.flatMap(e => e.members)); return checkedIn().filter(p => !inT.has(p.id)); };

// Late arrival during pool play: they join with one catch-up match against every other entrant.
function addLateEntry(members) {
  const T = currentTourney(); if (!T || !T.rr || T.bracket) return;
  const i = T.entrants.length;
  const sk = skillMap(checkedIn());
  const e = {
    id: 't' + i,
    name: customName(members) || members.map(nameOf).join(' & '),
    sub: customName(members) ? members.map(nameOf).join(' & ') : '',
    color: teamColor(i), members: members.slice(), rating: entrantRating(members),
    skill: members.reduce((s, id) => s + (sk[id] ?? 0.5), 0) / members.length,
    late: true
  };
  T.rr.rounds.push(T.entrants.map(o => [o.id, e.id]));
  (T.rr.catchUp ||= {})[T.rr.rounds.length - 1] = e.id;
  T.entrants.push(e);
  save(); render();
  toast(`${e.name} joined with ${T.entrants.length - 1} catch-up match${T.entrants.length > 2 ? 'es' : ''}.`);
}

function rrProgress(T) {
  let total = 0, done = 0;
  T.rr.rounds.forEach((round, r) => round.forEach(([a, b], m) => { total++; if (winnerOf(a, b, T.rr.scores[`${r}-${m}`])) done++; }));
  return { total, done };
}

// Standings: wins, then point difference, then points scored, then rating.
function standings(T) {
  const row = {};
  T.entrants.forEach(e => row[e.id] = { e, w: 0, l: 0, pf: 0, pa: 0 });
  T.rr.rounds.forEach((round, r) => round.forEach(([a, b], m) => {
    const sc = T.rr.scores[`${r}-${m}`];
    const w = winnerOf(a, b, sc); if (!w) return;
    row[a].pf += sc[0]; row[a].pa += sc[1]; row[b].pf += sc[1]; row[b].pa += sc[0];
    row[w].w++; row[w === a ? b : a].l++;
  }));
  return Object.values(row).sort((x, y) =>
    (y.w - x.w) || ((y.pf - y.pa) - (x.pf - x.pa)) || (y.pf - x.pf) || (y.e.skill - x.e.skill));
}

function seedBracketFromPool() {
  const T = currentTourney(); if (!T || !T.rr) return;
  const p = rrProgress(T);
  if (p.done < p.total) { toast(`Finish pool play first: ${p.total - p.done} match${p.total - p.done > 1 ? 'es' : ''} still need a score.`); return; }
  T.bracket = makeBracket(standings(T).slice(0, T.size).map(r => r.e.id), T.size);
  T.stage = 'bracket';
  save(); render();
  toast(`Bracket seeded. The ${STAGE_NAMES[T.size].toLowerCase()} ${T.size === 2 ? 'is' : 'are'} set.`);
}

/* ---------- bracket ---------- */

function makeBracket(seedIds, size) { return { size, seeds: seedIds.slice(0, size), scores: {} }; }

// Standard placement so the top seeds can only meet late: 1 v 8, 4 v 5, 2 v 7, 3 v 6 ...
function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2 + 1;
    order = order.flatMap(s => [s, n - s]);
  }
  return order;
}

// Works out every round from the seeds and the scores entered so far.
function bracketRounds(B) {
  const seedOf = id => B.seeds.indexOf(id) + 1;
  const rounds = [];
  const order = seedOrder(B.size);
  let prev = null;
  for (let r = 0, teams = B.size; teams >= 2; r++, teams /= 2) {
    const matches = [];
    for (let m = 0; m < teams / 2; m++) {
      let a, b;
      if (r === 0) { a = B.seeds[order[2 * m] - 1] || null; b = B.seeds[order[2 * m + 1] - 1] || null; }
      else { a = prev[2 * m].winner; b = prev[2 * m + 1].winner; }
      const key = `${r}-${m}`, sc = B.scores[key];
      const bye = r === 0 && (!a || !b);
      const winner = bye ? (a || b) : (a && b ? winnerOf(a, b, sc) : null);
      matches.push({ r, m, key, a, b, sa: sc ? sc[0] : null, sb: sc ? sc[1] : null, winner, bye, seedA: a ? seedOf(a) : null, seedB: b ? seedOf(b) : null });
    }
    rounds.push({ teams, name: STAGE_NAMES[teams], matches });
    prev = matches;
  }
  return rounds;
}

/* ---------- scores ---------- */

function setScore(stage, key, side, raw) {
  const T = currentTourney(); if (!T) return;
  const v = raw === '' ? null : Math.max(0, Math.round(+raw));
  if (stage === 'rr') {
    const sc = T.rr.scores[key] || [null, null];
    sc[side] = isFinite(v) ? v : null;
    T.rr.scores[key] = sc;
  } else {
    const before = bracketRounds(T.bracket);
    const sc = T.bracket.scores[key] || [null, null];
    sc[side] = isFinite(v) ? v : null;
    T.bracket.scores[key] = sc;
    // If the winner changed, later results along this path no longer make sense.
    let [r, m] = key.split('-').map(Number);
    const after = bracketRounds(T.bracket);
    if (before[r].matches[m].winner !== after[r].matches[m].winner) {
      for (r++, m >>= 1; r < after.length; r++, m >>= 1) delete T.bracket.scores[`${r}-${m}`];
    }
  }
  save();
}
