// Wires buttons, toggles and inputs to the state.

// ---------- settings ----------
document.querySelectorAll('input[name=sport]').forEach(el => el.addEventListener('change', () => { S.sport = el.value; save(); render(); }));
document.querySelectorAll('input[name=format]').forEach(el => el.addEventListener('change', () => { S.format = el.value; save(); render(); }));
document.querySelectorAll('input[name=grouping]').forEach(el => el.addEventListener('change', () => { S.grouping = el.value; save(); renderSettings(); }));
$('courtsDown').onclick = () => { S.courts = Math.max(1, S.courts - 1); save(); renderSettings(); renderBoard(); renderTourney(); };
$('courtsUp').onclick = () => { S.courts = Math.min(30, S.courts + 1); save(); renderSettings(); renderBoard(); renderTourney(); };

// ---------- roster ----------
$('roster').addEventListener('input', e => {
  const li = e.target.closest('li'); if (!li) return;
  const p = S.players.find(x => x.id === li.dataset.id);
  if (e.target.id.startsWith('nm-')) { p.name = e.target.value; if (p.name.trim()) S.names[p.id] = p.name; }
  if (e.target.id.startsWith('rt-')) p.rating = e.target.value.trim();
  save(); renderLive();
});

$('roster').addEventListener('change', e => {
  if (!e.target.id.startsWith('in-')) return;
  const li = e.target.closest('li');
  const p = S.players.find(x => x.id === li.dataset.id);
  p.here = e.target.checked;
  if (p.here && S.rounds.length) p.offset = Math.max(p.offset || 0, lateCredit(p.id));
  li.classList.toggle('out', !p.here);
  save(); renderLive();
  toast(p.here ? `${p.name} checked in. They’ll be in the next round.` : `${p.name} checked out. They won’t be scheduled.`);
});

$('roster').addEventListener('click', e => {
  if (!e.target.classList.contains('x')) return;
  const id = e.target.closest('li').dataset.id;
  const at = S.players.findIndex(x => x.id === id);
  const [p] = S.players.splice(at, 1);
  save(); render();
  toast(`Removed ${p.name}.`, { label: 'Undo', fn: () => { S.players.splice(at, 0, p); save(); render(); toast(`${p.name} is back.`); } });
});

$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('addName').value.trim();
  if (!n) { toast('Type a name first.'); return; }
  addPlayer(n, $('addRating').value);
  $('addName').value = ''; $('addRating').value = ''; $('addName').focus();
  save(); render();
});

$('bulkAdd').onclick = () => {
  const lines = $('bulk').value.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) { toast('Paste one player per line, like "Maya Chen, 4.21".'); return; }
  lines.forEach(l => {
    const m = l.match(/^(.*?)[,\t;]\s*([\d.]+)?\s*$/);
    m ? addPlayer(m[1], m[2] || '') : addPlayer(l, '');
  });
  $('bulk').value = '';
  save(); render(); toast(`Added ${lines.length} player${lines.length > 1 ? 's' : ''}.`);
};

$('clearExamples').onclick = () => {
  const keep = { sport: S.sport, format: S.format, courts: S.courts, grouping: S.grouping, mode: S.mode };
  S = Object.assign(fresh(), keep);
  save(); render(); $('addName').focus();
};

// ---------- rounds ----------
$('next').onclick = () => nextRound(false);
$('courts').addEventListener('click', e => {
  if (e.target.closest('[data-fill]')) return fillCourt();
  const f = e.target.closest('.flip'); if (f) flipCourt(f);
});
$('courts').addEventListener('keydown', e => {
  const f = e.target.closest('.flip');
  if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flipCourt(f); }
});

// Flip one court. Classes are toggled in place (no re-render) so the flip animates.
function flipCourt(el) {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  const i = +el.dataset.court;
  if (!r.shown) r.shown = r.courts.map((c, k) => k);
  r.shown = r.shown.includes(i) ? r.shown.filter(k => k !== i) : r.shown.concat(i);
  el.style.removeProperty('--d');
  el.classList.toggle('up', r.shown.includes(i));
  save(); updateRevealButton();
}

// Flip every court at once, one after another. The big bar only shows while courts are face-down.
$('revealBar').onclick = () => $('reveal').click();
$('reveal').onclick = () => {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  const show = !r.courts.every((c, i) => isShown(r, i));
  r.shown = show ? r.courts.map((c, i) => i) : [];
  document.querySelectorAll('#courts .flip').forEach((el, k) => {
    el.style.setProperty('--d', `${k * 140}ms`);
    el.classList.toggle('up', show);
  });
  save(); updateRevealButton();
};
$('undo').onclick = () => { if (!S.rounds.length) return; S.rounds.pop(); save(); render(); toast('Last round removed.'); };

$('reset').onclick = () => {
  const b = $('reset');
  if (b.dataset.armed) {
    S.rounds = []; S.players.forEach(p => p.offset = 0);
    delete b.dataset.armed; b.textContent = 'New session';
    save(); render(); toast('Started a new session. Players kept, history cleared.');
    return;
  }
  b.dataset.armed = '1'; b.textContent = 'Tap again to clear history';
  setTimeout(() => { delete b.dataset.armed; b.textContent = 'New session'; }, 3500);
};

$('copy').onclick = async () => {
  const r = S.rounds[S.rounds.length - 1]; if (!r) return;
  const t = roundText(r, S.rounds.length - 1);
  try {
    await navigator.clipboard.writeText([t.head, ...t.lines].join('\n'));
    toast(`Round ${S.rounds.length} copied. Paste it into your group chat.`);
  } catch (e) {
    toast('Your browser blocked copying. The round is listed under History to copy by hand.');
  }
};

// ---------- tournaments ----------
document.querySelectorAll('input[name=mode]').forEach(el => el.addEventListener('change', () => { S.mode = el.value; save(); render(); }));

$('tourney').addEventListener('click', e => {
  const t = e.target;
  if (t.id === 'startT') return startTourney();
  if (t.id === 'seedB') return seedBracketFromPool();
  if (t.id === 'repair') { rePairTeams(); save(); renderTourney(); return; }
  if (t.id === 'addLate') {
    const a = $('lateA').value, b = $('lateB') && $('lateB').value;
    if ($('lateB')) {
      if (a === b) { toast('Pick two different players for the team.'); return; }
      const name = $('lateName').value.trim();
      if (name) (S.teamNames ||= {})[teamKey([a, b])] = name;
      return addLateEntry([a, b]);
    }
    return addLateEntry([a]);
  }
  const pick = t.closest('[data-pick]'); if (pick) { pickPlayer(pick.dataset.pick); save(); renderTourney(); return; }
  const split = t.closest('[data-split]'); if (split) { splitTeam(+split.dataset.split); save(); renderTourney(); return; }
  if (t.id === 'endT') {
    if (t.dataset.armed) return endTourney();
    t.dataset.armed = '1'; t.textContent = 'Tap again to end it';
    setTimeout(() => { if (t.isConnected) { delete t.dataset.armed; t.textContent = 'End tournament'; } }, 3500);
  }
});

// Team names save as you type; no re-draw, so the box keeps focus.
$('tourney').addEventListener('input', e => {
  if (!e.target.classList.contains('tname')) return;
  (S.teamNames ||= {})[e.target.dataset.key] = e.target.value;
  save();
});

$('tourney').addEventListener('change', e => {
  const t = e.target;
  if (t.name === 'bsize') { S.bracketSize = +t.value; save(); renderTourney(); return; }
  if (t.id === 'sitPick') { S.sitOut = t.value; rePairTeams(); save(); renderTourney(); return; }
  if (t.id === 'ruleOn' || t.id === 'ruleTo') {
    S.scoreRule = { on: $('ruleOn').checked, to: Math.max(1, Math.round(+$('ruleTo').value) || 11) };
    save(); renderTourney(); return;
  }
  if (t.name === 'teamMode') {
    S.teamMode = t.value; pickSel = null;
    if (t.value === 'random') rePairTeams(); // a fresh random draw each time you switch back
    save(); renderTourney(); return;
  }
  if (t.classList.contains('score')) {
    setScore(t.dataset.stage, t.dataset.key, +t.dataset.side, t.value.trim());
    // Re-draw after focus has moved (e.g. Tab to the next score box), then put focus back there.
    setTimeout(() => {
      const id = document.activeElement && document.activeElement.id;
      renderTourney();
      if (id && $(id)) $(id).focus();
    });
  }
});

// Re-pairing changes who's on which team, so forget a custom pairing when the format changes.
document.querySelectorAll('input[name=format]').forEach(el => el.addEventListener('change', () => { S.draftTeams = null; save(); }));
