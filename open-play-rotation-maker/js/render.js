// Draws the settings, roster, courts, fairness table and history from S.

function renderSettings() {
  $('fm-' + S.format).checked = true;
  $('gp-' + S.grouping).checked = true;
  $('courtsOut').textContent = S.courts;
  $('grpHelp').textContent = GROUP_HELP[S.grouping];
  $('hideCourts').checked = S.hideCourts !== false;
  $('timerMin').value = String(TIMER_OPTIONS.includes(S.timerMin) ? S.timerMin : 0);
  $('ratingCol').textContent = RATING.name;
  $('ratingHelp').textContent = RATING.help;
  $('banner').hidden = !S.example;
}

// "Sat last" or "3 played" next to each name, so the organizer can answer "when am I playing?".
function playerStatus(p, st) {
  if (S.mode !== 'open' || !S.rounds.length || !p.here) return '';
  const last = S.rounds[S.rounds.length - 1];
  if (last.sitting.includes(p.id)) return '<span class="pstat sat">Sat last</span>';
  return `<span class="pstat num">${st.games[p.id] || 0} played</span>`;
}

function renderRoster() {
  const st = stats();
  $('roster').innerHTML = S.players.map(p => {
    const err = ratingError(p.rating);
    return `
    <li data-id="${p.id}" class="${p.here ? '' : 'out'}${err ? ' bad' : ''}">
      <input type="checkbox" id="in-${p.id}" ${p.here ? 'checked' : ''} aria-label="${esc(p.name)} is here">
      <input type="text" id="nm-${p.id}" value="${esc(p.name)}" aria-label="Name">
      ${playerStatus(p, st) || '<span></span>'}
      <input type="text" id="rt-${p.id}" value="${esc(p.rating)}" inputmode="decimal" placeholder="—" aria-label="${esc(p.name)} DUPR" class="num" aria-invalid="${!!err}">
      <button class="x" type="button" aria-label="Remove ${esc(p.name)}">×</button>
      <small class="rhint" ${err ? '' : 'hidden'}>${esc(err)}</small>
    </li>`;
  }).join('');
  renderCount();
}

function renderCount() {
  const n = S.players.filter(p => p.here && p.name.trim()).length;
  $('hereCount').textContent = `${n} checked in`;
}

// The gap between the two teams' average DUPR, labelled. Singles gaps run bigger, so the bands are wider.
function balance(teams, sk) {
  const avg = T => T.reduce((s, id) => s + sk[id], 0) / T.length;
  const gap = Math.abs(avg(teams[0]) - avg(teams[1])) * 6; // skill is DUPR mapped onto 0–1, so ×6 gives DUPR
  const singles = teams[0].length === 1;
  const [even, close] = singles ? [0.5, 1.0] : [0.25, 0.6];
  const g = gap.toFixed(2);
  return gap < even ? ['even', `Even · ${g}`] : gap < close ? ['close', `Close · ${g}`] : ['uneven', `Lopsided · ${g}`];
}

// Under each side of the court: the team's average DUPR, or just the rating in singles.
function teamAvgLabel(T) {
  const v = T.map(id => duprOf(playerOf(id))).filter(r => r !== null);
  if (!v.length) return '';
  const a = (v.reduce((x, y) => x + y, 0) / v.length).toFixed(2);
  return T.length === 1 ? a : 'avg ' + a;
}

// Courts start face-down each round (unless the organizer turned that off). Old rounds without `shown` count as revealed.
const isShown = (r, i) => !r.shown || r.shown.includes(i);

// The big Reveal bar shows while any court is face-down; the small Hide button only once every court is showing.
function updateRevealButton() {
  const r = S.rounds[S.rounds.length - 1];
  const has = r && r.courts.length;
  const allShown = !has || r.courts.every((c, i) => isShown(r, i));
  $('revealBar').hidden = allShown;
  $('hideAll').hidden = !has || !allShown;
}

// What was on screen last time, so only new courts (or a new round) animate in.
let shownBoard = { round: -1, courts: 0 };

// One court card per court in use: filled courts from the current round, open ones for courts not yet in play.
function renderBoard() {
  const r = S.rounds[S.rounds.length - 1];
  $('roundNo').textContent = S.rounds.length || '–';
  $('undo').disabled = !S.rounds.length;
  $('copy').disabled = !S.rounds.length;

  const played = r ? r.courts : [];
  const removed = played.flatMap(c => c.teams.flat()).filter(id => !S.players.some(p => p.id === id)).map(playerOf);
  const sk = skillMap(S.players.concat(removed));
  const per = S.format === 'doubles' ? 4 : 2;
  const hereCount = S.players.filter(p => p.here && p.name.trim()).length;
  const waiting = r ? r.sitting.filter(id => S.players.some(p => p.id === id && p.here)).length : 0;

  const ply = id => {
    const p = playerOf(id);
    return `<div class="player"><strong>${esc(p.name)}</strong><small class="num">${esc(fmtRating(p))}</small></div>`;
  };
  const courtShape = (inner, singles) =>
    `<div class="court"><div class="court-in${singles ? ' singles' : ''}">${inner}</div></div>`;

  const newRound = S.rounds.length !== shownBoard.round;
  const anim = (i, filledNow) => newRound ? ` new" style="animation-delay:${i * 60}ms` : (i >= shownBoard.courts || (filledNow && i >= shownBoard.filled)) ? ' new' : '';

  const filled = played.map((c, i) => {
    const [cls, txt] = balance(c.teams, sk);
    const closing = i >= S.courts;
    return `<article class="court-card${closing ? ' closing' : ''}${anim(i, true)}">
      <div class="court-top"><h3>Court ${i + 1}</h3>${closing ? '<span class="pill closing">Last game</span>' : `<span class="pill ${cls} num" title="Gap between team averages, in DUPR">${txt}</span>`}</div>
      <div class="flip${isShown(r, i) ? ' up' : ''}" data-court="${i}" role="button" tabindex="0" aria-label="Court ${i + 1}: show or hide players">
        <div class="face front">${courtShape(`<div class="side a">${c.teams[0].map(ply).join('')}</div><div class="side b">${c.teams[1].map(ply).join('')}</div>`, c.teams[0].length === 1)}</div>
        <div class="face back">${courtShape('<div class="side a"></div><div class="side b"></div>', c.teams[0].length === 1)}<span class="open-label">Tap to reveal</span></div>
      </div>
      <div class="court-foot num"><span>${teamAvgLabel(c.teams[0])}</span><span>${teamAvgLabel(c.teams[1])}</span></div>
    </article>`;
  });

  const open = [];
  for (let i = played.length; i < S.courts; i++) {
    const short = (i + 1) * per - hereCount;
    let foot;
    if (!r) foot = short > 0 ? `Needs ${short} more player${short > 1 ? 's' : ''}` : 'Ready for round 1';
    else if (i === played.length && waiting >= per) foot = `<button class="btn primary" type="button" data-fill>Put ${per} sitting players on</button>`;
    else foot = short > 0 ? `Needs ${short} more player${short > 1 ? 's' : ''}` : 'Fills next round';
    open.push(`<article class="court-card open${anim(i, false)}">
      <div class="court-top"><h3>Court ${i + 1}</h3><span class="pill closing">Open</span></div>
      <div class="court-wrap">${courtShape('<div class="side a"></div><div class="side b"></div>', per === 2)}<span class="open-label">Open court</span></div>
      <div class="court-foot">${foot}</div>
    </article>`);
  }
  $('courts').innerHTML = filled.concat(open).join('');
  updateRevealButton();
  renderTimer();
  shownBoard = { round: S.rounds.length, courts: Math.max(S.courts, played.length), filled: played.length };

  if (!r) {
    $('sitting').innerHTML = `<span class="help">Check in your players, then press <strong>Next round</strong> to put people on court.</span>`;
    return;
  }
  $('sitting').innerHTML = r.sitting.length
    ? `<span class="label">Sitting out</span>` + r.sitting.map(id => `<span class="chip">${esc(nameOf(id))}</span>`).join('')
    : `<span class="label">Nobody sits this round</span>`;
}

/* ---------- round timer ---------- */
let buzzedFor = null; // the timer end we've already vibrated for

function renderTimer() {
  const el = $('timer');
  if (S.mode !== 'open' || !S.timerEnd) { el.hidden = true; return; }
  const left = Math.ceil((S.timerEnd - Date.now()) / 1000);
  el.hidden = false;
  el.classList.toggle('soon', left > 0 && left <= 60);
  el.classList.toggle('done', left <= 0);
  if (left <= 0) {
    el.textContent = 'Time!';
    if (buzzedFor !== S.timerEnd) { buzzedFor = S.timerEnd; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} }
  } else {
    el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  }
  el.setAttribute('aria-label', left > 0 ? `${el.textContent} left in this round` : 'Round time is up');
}
setInterval(renderTimer, 1000);

/* ---------- fairness & history ---------- */

function renderFairness() {
  const st = stats();
  const showPartners = S.format === 'doubles' && S.rounds.length >= 3; // too noisy before round 3
  $('partTh').hidden = !showPartners;
  $('fairHelp').hidden = !showPartners;
  const rows = S.players.filter(p => p.name.trim() && (p.here || st.games[p.id] || st.sits[p.id]))
    .map(p => ({ p, g: st.games[p.id] || 0, s: st.sits[p.id] || 0, n: (st.partnerSet[p.id] || new Set()).size }))
    .sort((a, b) => b.s - a.s || a.g - b.g || a.p.name.localeCompare(b.p.name)); // most owed a game first
  const here = rows.filter(r => r.p.here).map(r => r.s);
  const maxS = Math.max(0, ...here), minS = Math.min(Infinity, ...here);
  $('fair').innerHTML = rows.map(r => `<tr class="${r.p.here && maxS - minS > 1 && r.s === maxS ? 'hi' : ''}">
      <td>${esc(r.p.name)}${r.p.here ? '' : ' <span class="help">(left)</span>'}</td>
      <td class="r num">${r.s}</td><td class="r num">${r.g}</td>${showPartners ? `<td class="r num">${r.n}</td>` : ''}</tr>`).join('')
    || `<tr><td colspan="4" class="help">No players yet.</td></tr>`;
}

// Plain-text version of a round, used by History and "Copy for group chat".
function roundText(r, i) {
  const team = T => T.map(nameOf).join(' & ');
  const lines = r.courts.map((c, k) => `Court ${k + 1}: ${team(c.teams[0])} vs ${team(c.teams[1])}`);
  if (r.sitting.length) lines.push('Sitting out: ' + r.sitting.map(nameOf).join(', '));
  return { head: `Round ${i + 1}`, lines };
}

// Newest first. The last 3 rounds show; older ones fold under "Show earlier rounds".
function renderHistory() {
  const item = (r, i) => {
    const t = roundText(r, i);
    return `<li><div class="h-head"><b>${t.head}</b><button class="btn quiet" type="button" data-copy="${i}">Copy</button></div>
      ${t.lines.map(l => l.startsWith('Sitting') ? `<span class="muted">${esc(l)}</span>` : esc(l)).join('<br>')}</li>`;
  };
  const all = S.rounds.map(item).reverse();
  if (!all.length) { $('history').innerHTML = `<li class="help">Rounds you play will be listed here.</li>`; return; }
  const recent = all.slice(0, 3), older = all.slice(3);
  $('history').innerHTML = recent.join('') + (older.length
    ? `<li class="h-older"><details><summary>Show earlier rounds (${older.length})</summary><ul class="history">${older.join('')}</ul></details></li>` : '');
}

function render() { renderMode(); renderSettings(); renderRoster(); renderBoard(); renderFairness(); renderHistory(); renderTourney(); }
// Everything except the roster, so typing in a name box doesn't lose focus.
function renderLive() { renderCount(); renderBoard(); renderFairness(); renderHistory(); renderTourney(); }
