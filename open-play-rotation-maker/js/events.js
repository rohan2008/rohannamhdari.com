// Wires buttons, toggles and inputs to the state.

// ---------- settings ----------
document.querySelectorAll('input[name=sport]').forEach(el => el.addEventListener('change', () => { S.sport = el.value; save(); render(); }));
document.querySelectorAll('input[name=format]').forEach(el => el.addEventListener('change', () => { S.format = el.value; save(); render(); }));
document.querySelectorAll('input[name=grouping]').forEach(el => el.addEventListener('change', () => { S.grouping = el.value; save(); renderSettings(); }));
$('courtsDown').onclick = () => { S.courts = Math.max(1, S.courts - 1); save(); renderSettings(); };
$('courtsUp').onclick = () => { S.courts = Math.min(30, S.courts + 1); save(); renderSettings(); };

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
  const p = S.players.find(x => x.id === id);
  S.players = S.players.filter(x => x.id !== id);
  save(); render(); toast(`Removed ${p.name}.`);
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
    const m = l.match(/^(.*?)[,\t;]\s*(#?[\d.]+)?\s*$/);
    m ? addPlayer(m[1], m[2] || '') : addPlayer(l, '');
  });
  $('bulk').value = '';
  save(); render(); toast(`Added ${lines.length} player${lines.length > 1 ? 's' : ''}.`);
};

$('clearExamples').onclick = () => {
  const keep = { sport: S.sport, format: S.format, courts: S.courts, grouping: S.grouping };
  S = Object.assign(fresh(), keep);
  save(); render(); $('addName').focus();
};

// ---------- rounds ----------
$('next').onclick = () => nextRound(false);
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
