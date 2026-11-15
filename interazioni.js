
'use strict';
const body = document.body;
const saved = (key, value) => {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    // Local storage can be disabled when opening a local copy.
  }
};
function toggleMode(id, className) {
  const button = document.getElementById(id);
  if (!button) return;
  const key = 'monti-fisica2-' + id;
  function apply(active) {
    body.classList.toggle(className, active);
    button.setAttribute('aria-pressed', String(active));
  }
  apply(saved(key) === 'true');
  button.addEventListener('click', () => {
    const active = !body.classList.contains(className);
    apply(active);
    saved(key, String(active));
  });
}
toggleMode('dark', 'dark');
toggleMode('dsa', 'dsa-mode');
const classes = { '5CLL': 'Liceo linguistico', '5DSU': 'Scienze umane' };
const classSelect = document.getElementById('classe');
if (classSelect) {
  const restored = saved('monti-fisica2-classe');
  if (classes[restored]) classSelect.value = restored;
  function updateClass() {
    const label = classSelect.value + ' · ' + classes[classSelect.value];
    document.querySelectorAll('[data-class-label]').forEach(node => { node.textContent = label; });
    saved('monti-fisica2-classe', classSelect.value);
  }
  classSelect.addEventListener('change', updateClass);
  updateClass();
}
for (const button of document.querySelectorAll('[data-details]')) {
  const groups = [...document.querySelectorAll('details.' + button.dataset.details)];
  const sync = () => {
    const open = groups.every(group => group.open);
    button.setAttribute('aria-pressed', String(open));
    button.textContent = (open ? 'Chiudi ' : 'Apri ') + button.dataset.label;
  };
  button.addEventListener('click', () => {
    const open = !groups.every(group => group.open);
    groups.forEach(group => { group.open = open; });
    sync();
  });
  groups.forEach(group => group.addEventListener('toggle', sync));
  sync();
}
document.getElementById('print')?.addEventListener('click', () => window.print());

