// Small helpers used everywhere.

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Order-independent key for a pair of player ids.
const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;

let toastTimer;
// A short message at the bottom. Pass { label, fn } to add a button such as Undo.
function toast(msg, action) {
  const t = $('toast');
  t.textContent = msg;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toast-btn'; b.textContent = action.label;
    b.onclick = () => { t.hidden = true; action.fn(); };
    t.append(b);
  }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, action ? 6000 : 2600);
}
