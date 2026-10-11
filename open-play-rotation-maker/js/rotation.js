// The rotation itself: who sits out, who plays where, and who partners whom.

// Tallies games, sit-outs, partners and opponents from the round history.
function stats() {
  const games = {}, sits = {}, lastSat = {}, partners = {}, opps = {}, partnerSet = {};
  S.rounds.forEach((r, i) => {
    r.courts.forEach(c => {
      const [A, B] = c.teams;
      [...A, ...B].forEach(id => games[id] = (games[id] || 0) + 1);
      [A, B].forEach(T => {
        for (let x = 0; x < T.length; x++) for (let y = x + 1; y < T.length; y++) {
          const k = pairKey(T[x], T[y]); partners[k] = (partners[k] || 0) + 1;
          (partnerSet[T[x]] ||= new Set()).add(T[y]);
          (partnerSet[T[y]] ||= new Set()).add(T[x]);
        }
      });
      A.forEach(a => B.forEach(b => { const k = pairKey(a, b); opps[k] = (opps[k] || 0) + 1; }));
    });
    r.sitting.forEach(id => { sits[id] = (sits[id] || 0) + 1; lastSat[id] = i; });
  });
  return { games, sits, lastSat, partners, opps, partnerSet };
}

// Games credited to a late arrival: the fewest anyone present has played.
function lateCredit(id, st = stats()) {
  const others = S.players.filter(p => p.here && p.id !== id && p.name.trim());
  if (!others.length) return 0;
  const min = Math.min(...others.map(p => (st.games[p.id] || 0) + (p.offset || 0)));
  return Math.max(0, min - (st.games[id] || 0));
}

function nextRound(silent) {
  const here = S.players.filter(p => p.here && p.name.trim());
  const per = S.format === 'doubles' ? 4 : 2;
  const nCourts = Math.min(S.courts, Math.floor(here.length / per));
  if (nCourts < 1) { if (!silent) toast(`Check in at least ${per} players to start a ${S.format} round.`); return; }

  const st = stats();
  const eff = p => (st.games[p.id] || 0) + (p.offset || 0);
  const ls = p => (p.id in st.lastSat) ? st.lastSat[p.id] : -1;

  // Who sits: most games played first; ties go to whoever sat longest ago (or never).
  const order = shuffle(here.slice()).sort((a, b) => (eff(b) - eff(a)) || (ls(a) - ls(b)));
  const nSit = here.length - nCourts * per;
  const sitters = order.slice(0, nSit), active = order.slice(nSit);

  const best = bestCourts(active.map(p => p.id), nCourts, per, st, skillMap(here));
  S.rounds.push({ courts: best, sitting: sitters.map(p => p.id), shown: [] });
  save(); render();
}

// A court was added mid-round: move players who are sitting out onto it, fewest games first.
function fillCourt() {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  const per = S.format === 'doubles' ? 4 : 2;
  const waiting = S.players.filter(p => p.here && r.sitting.includes(p.id));
  if (waiting.length < per) { toast(`Not enough players sitting out to fill a ${S.format} court.`); return; }

  const st = stats();
  const eff = p => (st.games[p.id] || 0) + (p.offset || 0);
  const chosen = shuffle(waiting).sort((a, b) => eff(a) - eff(b)).slice(0, per);
  const ids = chosen.map(p => p.id);

  // A new court matches the others: face-up if every court is already revealed, otherwise face-down.
  const allShown = r.shown && r.courts.every((c, i) => r.shown.includes(i));
  r.courts.push(...bestCourts(ids, 1, per, st, skillMap(S.players.filter(p => p.here))));
  if (allShown) r.shown.push(r.courts.length - 1);
  r.sitting = r.sitting.filter(id => !ids.includes(id));
  save(); render();
  toast(`Court ${r.courts.length} is on: ${chosen.map(p => p.name).join(', ')}.`);
}

// Tries many random lineups for the given players and returns the fairest set of courts.
function bestCourts(playerIds, nCourts, per, st, sk) {
  const avg = T => T.reduce((s, id) => s + sk[id], 0) / T.length;
  // Lower is better: uneven teams, repeat partners and repeat opponents all add cost.
  const pairCost = (A, B) => {
    let c = Math.abs(avg(A) - avg(B)) * (per === 4 ? 40 : 20);
    if (per === 4) c += 10 * ((st.partners[pairKey(A[0], A[1])] || 0) + (st.partners[pairKey(B[0], B[1])] || 0));
    A.forEach(a => B.forEach(b => c += (per === 4 ? 3 : 6) * (st.opps[pairKey(a, b)] || 0)));
    return c;
  };
  const splits = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];

  let best = null, bestCost = Infinity;
  for (let it = 0; it < 900; it++) {
    const ids = shuffle(playerIds.slice());
    if (S.grouping === 'level') {
      const j = {}; ids.forEach(id => j[id] = sk[id] + Math.random() * 0.07);
      ids.sort((a, b) => j[b] - j[a]);
    }
    let cost = 0; const courts = [];
    for (let c = 0; c < nCourts; c++) {
      const g = ids.slice(c * per, (c + 1) * per);
      let teams, tc;
      if (per === 2) { teams = [[g[0]], [g[1]]]; tc = pairCost(...teams); }
      else splits.forEach(([x, y]) => {
        const t = [[g[x[0]], g[x[1]]], [g[y[0]], g[y[1]]]];
        const v = pairCost(...t);
        if (tc === undefined || v < tc) { tc = v; teams = t; }
      });
      if (S.grouping === 'level') { const v = g.map(id => sk[id]); tc += (Math.max(...v) - Math.min(...v)) * 25; }
      cost += tc; courts.push({ teams });
    }
    if (cost < bestCost) { bestCost = cost; best = courts; }
  }
  return best;
}
