// Draws the tournament screens: setup, pool play (round robin) and the bracket.

function renderMode() {
  $('md-' + S.mode).checked = true;
  $('kicker').textContent = 'Pickleball ' + MODE_NAMES[S.mode].toLowerCase();
  $('openPlay').hidden = S.mode !== 'open';
  $('tourney').hidden = S.mode === 'open';
  $('openOpts').hidden = S.mode !== 'open';
  $('tNote').hidden = !currentTourney();
}

// Finished pool rounds fold shut; these are the ones the organizer has opened (not saved).
const openRounds = new Set();

function renderTourney() {
  if (S.mode === 'open') return;
  const T = currentTourney();
  $('tourney').innerHTML = T ? tourneyHTML(T) : setupHTML();
}

const ratingTxt = r => r == null ? '' : r.toFixed(2);
const pairingsTxt = n => {
  const o = seedOrder(n), pairs = [];
  for (let i = 0; i < o.length; i += 2) pairs.push(`${o[i]} v ${o[i + 1]}`);
  return n > 8 ? `${pairs.slice(0, 2).join(', ')} and so on` : pairs.join(', ');
};

/* ---------- setup ---------- */

function setupHTML() {
  const kind = S.mode;
  const singles = S.format === 'singles';
  const { teams, left } = draftTeams();
  const count = teams.length;
  const noun = singles ? 'player' : 'team';
  const plural = n => `${n} ${noun}${n === 1 ? '' : 's'}`;

  const desc = {
    rr: 'Everyone plays everyone once. Standings rank by wins, then point difference.',
    bracket: 'Single elimination. Lose once and you’re out. Seeds come from ratings.',
    combo: 'Pool play first so everyone gets games, then the best records go into a seeded bracket.'
  }[kind];

  const entrants = count
    ? (singles
      ? `<div class="entrants">${teams.map((t, i) => `<span class="entrant" style="--tc:${teamColor(i)}"><i class="tdot"></i><b>${esc(nameOf(t[0]))}</b><small class="num">${ratingTxt(entrantRating(t))}</small></span>`).join('')}</div>`
      : teamRowsHTML(teams, S.teamMode === 'picked'))
    : `<p class="help">Check players in on the left to build the ${noun} list.</p>`;

  const picked = !singles && S.teamMode === 'picked';
  const oddNote = !left.length ? ''
    : picked ? `<p class="note">${left.length} player${left.length > 1 ? 's aren’t' : ' isn’t'} on a team yet and won’t play.</p>`
    : `<p class="note">Odd number of players. Sitting out:
        <select id="sitPick" aria-label="Who sits out">${checkedIn().map(p => `<option value="${p.id}" ${p.id === left[0] ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></p>`;

  let sizeField = '';
  if (kind !== 'rr' && count >= 2) {
    const opts = bracketSizeOptions(kind, count);
    const n = chosenBracketSize(kind, count);
    let help;
    if (kind === 'combo') help = `After pool play, the top ${n} go straight to the ${STAGE_NAMES[n].toLowerCase()}, seeded by record: ${pairingsTxt(n)}.`;
    else if (n >= count) { const byes = n - count; help = `Seeded by rating: ${pairingsTxt(n)}. ` + (byes ? `The top ${byes === 1 ? 'seed gets' : byes + ' seeds get'} a first-round bye.` : 'No byes needed.'); }
    else help = `Only the top ${n} by rating get in. ${count - n} ${count - n === 1 ? noun + ' sits' : noun + 's sit'} this one out.`;
    sizeField = `<div class="field">
      <span class="label" id="bsLbl">Start the bracket at</span>
      <div class="seg" role="radiogroup" aria-labelledby="bsLbl">${opts.map(o =>
        `<label><input type="radio" name="bsize" id="bs-${o}" value="${o}" ${o === n ? 'checked' : ''}><span>${STAGE_NAMES[o]}</span></label>`).join('')}</div>
      <p class="help">${help}</p>
    </div>`;
  }

  let summary = '';
  if (kind !== 'bracket' && count >= 2) {
    const matches = count * (count - 1) / 2, rounds = count % 2 ? count : count - 1;
    summary = `<p class="help">Pool play is ${matches} matches over ${rounds} rounds on ${S.courts} court${S.courts > 1 ? 's' : ''}.${count % 2 ? ` With ${plural(count)}, one sits out each round.` : ''}</p>`;
  }

  const replacing = S.tourney ? `<p class="note">Starting this ends your ${MODE_NAMES[S.tourney.kind].toLowerCase()} in progress.</p>` : '';

  return `<div class="panel">
    <div class="roster-head"><h2>${MODE_NAMES[kind]}</h2><span class="label num">${plural(count)}</span></div>
    <p class="help">${desc}</p>
    ${singles ? `<div class="field"><span class="label">Players</span>${entrants}</div>` : teamsFieldHTML(teams, left, picked, entrants, oddNote)}
    ${sizeField}${summary}${scoreRuleHTML()}${replacing}
    <div><button class="btn primary" type="button" id="startT" ${count < 2 ? 'disabled' : ''}>Start ${MODE_NAMES[kind].toLowerCase()}</button></div>
  </div>`;
}

// Doubles: choose randomized or picked teams.
function teamsFieldHTML(teams, left, picked, entrants, oddNote) {
  const toggle = `<div class="seg" role="radiogroup" aria-label="How teams are made">
    <label><input type="radio" name="teamMode" id="tm-random" value="random" ${picked ? '' : 'checked'}><span>Randomized teams</span></label>
    <label><input type="radio" name="teamMode" id="tm-picked" value="picked" ${picked ? 'checked' : ''}><span>Picked teams</span></label>
  </div>`;

  if (!picked) return `<div class="field">${toggle}
    <div class="roster-head"><p class="help">Random partners, kept roughly even by rating.</p>
    ${teams.length >= 2 ? '<button class="btn" type="button" id="repair">Shuffle teams</button>' : ''}</div>
    ${entrants}${oddNote}</div>`;

  const made = teams.length ? entrants : '';
  const pool = left.length
    ? `<div class="entrants">${left.map(id => `<button type="button" class="pick${pickSel === id ? ' sel' : ''}" data-pick="${id}" aria-pressed="${pickSel === id}">${esc(nameOf(id))}<small class="num">${esc(fmtRating(playerOf(id)))}</small></button>`).join('')}</div>`
    : '<p class="help">Everyone checked in is on a team.</p>';

  return `<div class="field">${toggle}
    <p class="help">${pickSel ? `Now tap ${esc(nameOf(pickSel))}’s partner.` : 'Tap two players to put them on a team.'}</p>
    ${pool}${made}${oddNote}</div>`;
}

// Doubles teams: color, optional team name, players, rating (and a split button for picked teams).
function teamRowsHTML(teams, picked) {
  return `<p class="help">Type a team name if they have one. Otherwise the players’ names are used.</p>
  <div class="team-rows">${teams.map((t, i) => {
    const players = t.map(nameOf).join(' & '), key = teamKey(t);
    return `<div class="team-row" style="--tc:${teamColor(i)}">
      <i class="tdot"></i>
      <div class="team-id">
        <input type="text" class="tname" id="tn-${key}" data-key="${key}" value="${esc((S.teamNames || {})[key] || '')}" placeholder="Team name (optional)" aria-label="Team name for ${esc(players)}" autocomplete="off">
        <small>${esc(players)}</small>
      </div>
      <small class="num">${ratingTxt(entrantRating(t))}</small>
      ${picked ? `<button class="x" type="button" data-split="${i}" aria-label="Split up ${esc(t.map(nameOf).join(' and '))}">×</button>` : ''}
    </div>`;
  }).join('')}</div>`;
}

// A team's color dot and name, plus the players' names when the team has its own name.
const tag = (e, withSub) => `<span class="tteam" style="--tc:${e.color || '#708090'}"><i class="tdot"></i><span>${esc(e.name)}${withSub && e.sub ? `<small>${esc(e.sub)}</small>` : ''}</span></span>`;

/* ---------- active tournament ---------- */

function tourneyHTML(T) {
  const E = {}; T.entrants.forEach(e => E[e.id] = e);
  let title, status, champ = '';
  const rounds = T.bracket ? bracketRounds(T.bracket) : null;
  if (rounds) {
    title = 'Bracket';
    const final = rounds[rounds.length - 1].matches[0];
    if (final.winner) { status = 'Final result'; champ = `<div class="champ"><span class="label">Champion${E[final.winner].members.length > 1 ? 's' : ''}</span><b>${tag(E[final.winner], true)}</b></div>`; }
    else status = (rounds.find(r => r.matches.some(m => !m.winner)) || rounds[0]).name + ' in progress';
  } else {
    const p = rrProgress(T);
    title = T.kind === 'rr' ? 'Round robin' : 'Pool play';
    status = p.done === p.total ? 'All matches scored' : `${p.done} of ${p.total} matches scored`;
  }

  return `<div class="board">
    <div class="board-head">
      <div>${MODE_NAMES[T.kind] !== title ? `<span class="label">${MODE_NAMES[T.kind]}</span>` : ''}<h2 class="t-title">${title}</h2><p class="t-status">${status}</p></div>
      <div class="minor">
        <button class="btn" type="button" id="copyResults">Copy results</button>
        <button class="btn quiet" type="button" id="endT">End tournament</button>
      </div>
    </div>
    ${scoreRuleHTML()}
    ${champ}
    ${rounds ? bracketHTML(T, rounds, E) : ''}
    ${T.rr ? poolHTML(T, E) : ''}
  </div>`;
}

function poolHTML(T, E) {
  const p = rrProgress(T);
  const locked = !!T.bracket; // pool results are final once the bracket is seeded
  const rows = standings(T);
  const qualify = T.kind === 'combo' ? T.size : 0;

  let seedBox = '';
  if (T.kind === 'combo' && !T.bracket) {
    seedBox = p.done === p.total
      ? `<div class="seedbox"><div><span class="label">Pool play done</span><p>Top ${T.size} go to the ${STAGE_NAMES[T.size].toLowerCase()}: ${rows.slice(0, T.size).map((r, i) => `<b>${i + 1}.</b> ${tag(r.e)}`).join(' &nbsp; ')}</p></div><button class="btn primary" type="button" id="seedB">Seed the bracket</button></div>`
      : `<p class="help">${p.total - p.done} of ${p.total} matches still need a score. When pool play is done, the top ${T.size} are seeded into the ${STAGE_NAMES[T.size].toLowerCase()}.</p>`;
  }

  const table = `<div class="table-wrap"><table class="standings">
    <thead><tr><th class="r">#</th><th>${T.entrants[0].members.length > 1 ? 'Team' : 'Player'}</th><th class="r">W</th><th class="r">L</th><th class="r">+/−</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr class="${i < qualify ? 'q' : ''}">
      <td class="r num">${p.done ? i + 1 : '–'}</td><td>${tag(r.e, true)}${i < qualify ? ' <span class="qtag">Qualifies</span>' : ''}</td>
      <td class="r num">${r.w}</td><td class="r num">${r.l}</td><td class="r num">${r.pf - r.pa > 0 ? '+' : ''}${r.pf - r.pa}</td></tr>`).join('')}</tbody>
  </table></div>`;

  const catchUp = T.rr.catchUp || {};
  const finished = r => T.rr.rounds[r].every(([a, b], m) => winnerOf(a, b, T.rr.scores[`${r}-${m}`]));
  const upNext = T.rr.rounds.findIndex((rd, r) => !finished(r));
  const roundsHTML = T.rr.rounds.map((round, r) => {
    const late = catchUp[r];
    const playing = new Set(round.flat());
    const bye = late ? [] : T.entrants.filter(e => !playing.has(e.id) && !e.late);
    const heading = late ? `Catch-up: ${esc(E[late].name)}` : `Round ${r + 1}`;
    const body = `${round.map(([a, b], m) => matchRow(T, 'rr', `${r}-${m}`, a, b, T.rr.scores[`${r}-${m}`], late ? `Game ${m + 1}` : courtLabel(m), locked, E)).join('')}
      ${bye.length ? `<p class="help">Sits out: ${bye.map(e => esc(e.name)).join(', ')}</p>` : ''}`;
    if (finished(r)) return `<details class="rr-round done" data-r="${r}" ${openRounds.has(r) ? 'open' : ''}>
      <summary><h3>${heading}</h3><span class="rtag">Done</span></summary>${body}</details>`;
    return `<div class="rr-round${r === upNext ? ' next' : ''}" data-r="${r}"><h3>${heading}${r === upNext ? ' <span class="rtag up">Up next</span>' : ''}</h3>${body}</div>`;
  }).join('');

  return `<section class="pool">
    <div class="roster-head"><h2>${T.kind === 'combo' ? 'Pool play' : 'Standings'}</h2>
      ${locked ? '<button class="btn quiet" type="button" id="reopenPool">Reopen pool play</button>' : `<span class="label num">${p.done}/${p.total} scored</span>`}</div>
    ${seedBox}${table}
    <div class="rr-rounds">${roundsHTML}</div>
    ${locked ? '' : lateEntryHTML(T)}
  </section>`;
}

// Match m in a round goes on court (m mod courts); extra matches wait for the next wave.
function courtLabel(m) {
  const c = S.courts, wave = Math.floor(m / c);
  return (wave ? `Wave ${wave + 1} · ` : '') + `Court ${(m % c) + 1}`;
}

function matchRow(T, stage, key, a, b, sc, courtTag, locked, E) {
  const w = winnerOf(a, b, sc);
  const inp = side => `<input type="number" min="0" inputmode="numeric" class="score num" id="sc-${stage}-${key}-${side}"
    data-stage="${stage}" data-key="${key}" data-side="${side}" value="${sc && sc[side] != null ? sc[side] : ''}" aria-label="${esc((side ? E[b] : E[a]).name)} score" ${locked ? 'disabled' : ''}>`;
  return `<div class="mrow${w ? ' done' : ''}">
    <span class="mtag">${courtTag}</span>
    <span class="mname a${w === a ? ' win' : w ? ' lose' : ''}">${tag(E[a])}</span>
    ${inp(0)}<span class="dash">–</span>${inp(1)}
    <span class="mname b${w === b ? ' win' : w ? ' lose' : ''}">${tag(E[b])}</span>
    ${scoreWarning(sc)}
  </div>`;
}

function bracketHTML(T, rounds, E) {
  const B = T.bracket;
  // Courts go to matches that are ready to play, earliest round first.
  const ready = rounds.flatMap(r => r.matches).filter(m => m.a && m.b && !m.winner);
  const court = {}; ready.forEach((m, i) => court[m.key] = i < S.courts ? `Court ${i + 1}` : 'Waiting for a court');

  const slot = (m, side) => {
    const id = side ? m.b : m.a, seed = side ? m.seedB : m.seedA, score = side ? m.sb : m.sa;
    const name = id ? esc(E[id].name) : (m.bye ? 'Bye' : 'TBD');
    const label = id ? tag(E[id], true) : name;
    const input = m.a && m.b && !m.bye
      ? `<input type="number" min="0" inputmode="numeric" class="score num" id="sc-br-${m.key}-${side}" data-stage="br" data-key="${m.key}" data-side="${side}" value="${score != null ? score : ''}" aria-label="${name} score">`
      : '';
    return `<div class="slot${m.winner && m.winner === id ? ' win' : ''}${m.winner && id && m.winner !== id ? ' lose' : ''}${id ? '' : ' tbd'}"${id ? ` style="--tc:${E[id].color || '#708090'}"` : ''}><span class="seed num">${seed || ''}</span><span class="nm">${label}</span>${input}</div>`;
  };

  return `<section class="bracket-wrap"><div class="bracket">${rounds.map(r => `
    <div class="bround"><h3>${r.name}</h3><div class="bmatches">${r.matches.map(m => `
      <div class="bmatch${m.winner ? ' done' : ''}">
        <span class="mtag">${m.bye ? 'Bye' : (court[m.key] || (m.winner ? 'Final score' : 'Waiting on earlier results'))}</span>
        ${slot(m, 0)}${slot(m, 1)}${m.bye ? '' : scoreWarning(B.scores[m.key])}
      </div>`).join('')}</div></div>`).join('')}
  </div></section>`;
}

// Shown under a match whose score can't count yet.
function scoreWarning(sc) {
  const issue = scoreIssue(sc);
  if (issue === 'tie') return '<p class="mwarn">Scores can’t be tied. Fix one of them.</p>';
  if (issue === 'rule') return `<p class="mwarn">${Math.max(...sc)}–${Math.min(...sc)} isn’t a finished game to ${S.scoreRule.to}, win by 2. Check for a typo.</p>`;
  return '';
}

// Optional typo check for game scores. Applies to the whole tournament and can be changed any time.
function scoreRuleHTML() {
  const r = S.scoreRule || { on: false, to: 11 };
  return `<div class="rule">
    <label><input type="checkbox" id="ruleOn" ${r.on ? 'checked' : ''}> Check scores: game to</label>
    <select id="ruleTo" aria-label="Game length">${GAME_LENGTHS.map(n => `<option value="${n}" ${n === r.to ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <span>, win by 2</span>
    <span class="help">Catches typos like 11–10 before they count.</span>
  </div>`;
}

// Add a late arrival during pool play. They must be checked in on the Players list first.
function lateEntryHTML(T) {
  const doubles = T.entrants[0].members.length > 1;
  const cands = lateCandidates(T);
  const need = doubles ? 2 : 1;
  const opts = sel => cands.map((p, i) => `<option value="${p.id}" ${i === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  const body = cands.length < need
    ? `<p class="help">Someone arrived late? Add them on the Players list${doubles ? ' (two players for a team)' : ''}, then add them here.</p>`
    : `<div class="late-row">
        <select id="lateA" aria-label="Late player">${opts(0)}</select>
        ${doubles ? `<select id="lateB" aria-label="Their partner">${opts(1)}</select>
        <input type="text" id="lateName" placeholder="Team name (optional)" autocomplete="off">` : ''}
        <button class="btn" type="button" id="addLate">Add to tournament</button>
      </div>
      <p class="help">They’ll get one catch-up match against every ${doubles ? 'team' : 'player'}.</p>`;
  return `<div class="late"><span class="label">Late arrivals</span>${body}</div>`;
}

// Standings and bracket as plain text for the group chat.
function resultsText(T) {
  const E = {}; T.entrants.forEach(e => E[e.id] = e);
  const lines = [MODE_NAMES[T.kind]];
  if (T.rr) {
    const p = rrProgress(T);
    lines.push('', `Standings (${p.done} of ${p.total} matches scored)`);
    standings(T).forEach((r, i) => lines.push(`${p.done ? i + 1 : '–'}. ${r.e.name}  ${r.w}-${r.l}  (${r.pf - r.pa > 0 ? '+' : ''}${r.pf - r.pa})`));
  }
  if (T.bracket) {
    bracketRounds(T.bracket).forEach(rd => {
      lines.push('', rd.name);
      rd.matches.forEach(m => {
        if (m.bye) lines.push(`${E[m.winner].name}: bye`);
        else if (!m.a || !m.b) lines.push('To be decided');
        else lines.push(`${E[m.a].name} ${m.sa ?? '–'} – ${m.sb ?? '–'} ${E[m.b].name}${m.winner ? '' : ' (not played yet)'}`);
      });
    });
    const final = bracketRounds(T.bracket).pop().matches[0];
    if (final.winner) lines.push('', `Champion: ${E[final.winner].name}`);
  }
  return lines.join('\n');
}
