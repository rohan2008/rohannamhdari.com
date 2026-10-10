// Draws the settings, roster, courts, fairness table and history from S.

function renderSettings() {
  $('sp-' + S.sport).checked = true;
  $('fm-' + S.format).checked = true;
  $('gp-' + S.grouping).checked = true;
  $('courtsOut').textContent = S.courts;
  $('grpHelp').textContent = GROUP_HELP[S.grouping];
  const sp = SPORTS[S.sport];
  $('ratingCol').textContent = sp.rating;
  $('ratingHelp').textContent = sp.help;
  $('addRating').placeholder = sp.ph;
  $('banner').hidden = !S.example;
}

function renderRoster() {
  const sp = SPORTS[S.sport];
  $('roster').innerHTML = S.players.map(p => `
    <li data-id="${p.id}" class="${p.here ? '' : 'out'}">
      <input type="checkbox" id="in-${p.id}" ${p.here ? 'checked' : ''} aria-label="${esc(p.name)} is here">
      <input type="text" id="nm-${p.id}" value="${esc(p.name)}" aria-label="Name">
      <input type="text" id="rt-${p.id}" value="${esc(p.rating)}" inputmode="decimal" placeholder="${sp.ph}" aria-label="${sp.rating}" class="num">
      <button class="x" type="button" aria-label="Remove ${esc(p.name)}">×</button>
    </li>`).join('');
  renderCount();
}

function renderCount() {
  const n = S.players.filter(p => p.here && p.name.trim()).length;
  $('hereCount').textContent = `${n} checked in`;
}

function balance(teams, sk) {
  const avg = T => T.reduce((s, id) => s + sk[id], 0) / T.length;
  const d = Math.abs(avg(teams[0]) - avg(teams[1]));
  return d < 0.04 ? ['even', 'Even match'] : d < 0.1 ? ['close', 'Close match'] : ['uneven', 'Lopsided'];
}

function teamAvgLabel(T) {
  if (S.sport === 'badminton') return '';
  const v = T.map(id => parseFloat(playerOf(id).rating)).filter(isFinite);
  return v.length ? 'avg ' + (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '';
}

function renderBoard() {
  const r = S.rounds[S.rounds.length - 1];
  $('roundNo').textContent = S.rounds.length || '–';
  $('undo').disabled = !S.rounds.length;
  $('copy').disabled = !S.rounds.length;
  if (!r) {
    $('courts').innerHTML = `<div class="empty">Check in your players, then press <strong>Next round</strong> to put people on court.</div>`;
    $('sitting').innerHTML = '';
    return;
  }
  const removed = r.courts.flatMap(c => c.teams.flat()).filter(id => !S.players.some(p => p.id === id)).map(playerOf);
  const sk = skillMap(S.players.concat(removed));
  const ply = id => {
    const p = playerOf(id);
    return `<div class="player"><strong>${esc(p.name)}</strong><small class="num">${esc(fmtRating(p))}</small></div>`;
  };
  $('courts').innerHTML = r.courts.map((c, i) => {
    const [cls, txt] = balance(c.teams, sk);
    return `<article class="court-card" style="animation-delay:${i * 60}ms">
      <div class="court-top"><h3>Court ${i + 1}</h3><span class="pill ${cls}">${txt}</span></div>
      <div class="court" data-sport="${S.sport}"><div class="court-in">
        <div class="side a">${c.teams[0].map(ply).join('')}</div>
        <div class="side b">${c.teams[1].map(ply).join('')}</div>
      </div></div>
      <div class="court-foot num"><span>${teamAvgLabel(c.teams[0])}</span><span>${teamAvgLabel(c.teams[1])}</span></div>
    </article>`;
  }).join('');
  $('sitting').innerHTML = r.sitting.length
    ? `<span class="label">Sitting out</span>` + r.sitting.map(id => `<span class="chip">${esc(nameOf(id))}</span>`).join('')
    : `<span class="label">Nobody sits this round</span>`;
}

function renderFairness() {
  const st = stats();
  const rows = S.players.filter(p => p.name.trim() && (p.here || st.games[p.id] || st.sits[p.id]))
    .map(p => ({ p, g: st.games[p.id] || 0, s: st.sits[p.id] || 0, n: (st.partnerSet[p.id] || new Set()).size }))
    .sort((a, b) => b.g - a.g || a.p.name.localeCompare(b.p.name));
  const here = rows.filter(r => r.p.here).map(r => r.s);
  const maxS = Math.max(0, ...here), minS = Math.min(Infinity, ...here);
  $('fair').innerHTML = rows.map(r => `<tr class="${r.p.here && maxS - minS > 1 && r.s === maxS ? 'hi' : ''}">
      <td>${esc(r.p.name)}${r.p.here ? '' : ' <span class="help">(left)</span>'}</td>
      <td class="r num">${r.g}</td><td class="r num">${r.s}</td><td class="r num">${S.format === 'doubles' ? r.n : '–'}</td></tr>`).join('')
    || `<tr><td colspan="4" class="help">No players yet.</td></tr>`;
}

// Plain-text version of a round, used by History and "Copy for group chat".
function roundText(r, i) {
  const team = T => T.map(nameOf).join(' & ');
  const lines = r.courts.map((c, k) => `Court ${k + 1}: ${team(c.teams[0])} vs ${team(c.teams[1])}`);
  if (r.sitting.length) lines.push('Sitting out: ' + r.sitting.map(nameOf).join(', '));
  return { head: `Round ${i + 1}`, lines };
}

function renderHistory() {
  $('history').innerHTML = S.rounds.map((r, i) => {
    const t = roundText(r, i);
    return `<li><b>${t.head}</b><br>${t.lines.map(l => l.startsWith('Sitting') ? `<span class="muted">${esc(l)}</span>` : esc(l)).join('<br>')}</li>`;
  }).reverse().join('') || `<li class="help">Rounds you play will be listed here.</li>`;
}

function render() { renderSettings(); renderRoster(); renderBoard(); renderFairness(); renderHistory(); }
// Everything except the roster, so typing in a name box doesn't lose focus.
function renderLive() { renderCount(); renderBoard(); renderFairness(); renderHistory(); }
