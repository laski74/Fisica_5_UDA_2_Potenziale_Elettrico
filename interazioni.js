
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


function highlightCurrentSection() {
  const dock = document.querySelector('.dock');
  const nav = dock?.querySelector('.nav');
  if (!nav) return;

  function keepLinkVisible(link) {
    const navBounds = nav.getBoundingClientRect();
    const linkBounds = link.getBoundingClientRect();
    if (linkBounds.left < navBounds.left) {
      nav.scrollLeft += linkBounds.left - navBounds.left - 4;
    } else if (linkBounds.right > navBounds.right) {
      nav.scrollLeft += linkBounds.right - navBounds.right + 4;
    }
  }

  function setDockOffset() {
    document.documentElement.style.setProperty('--dock-offset', (dock.offsetHeight + 12) + 'px');
  }

  const currentPage = nav.querySelector('[aria-current="page"]');
  if (currentPage) {
    const measure = () => {
      setDockOffset();
      keepLinkVisible(currentPage);
    };
    new ResizeObserver(measure).observe(dock);
    measure();
    return;
  }

  const links = new Map([...nav.querySelectorAll('a[href^="#"]')]
    .map(link => [link.hash.slice(1), link]));
  const sections = [...document.querySelectorAll('#contenuto > section[id]')]
    .filter(section => links.has(section.id));
  if (!sections.length) return;

  let current;
  let frame = 0;

  function update() {
    frame = 0;
    const readingLine = dock.offsetHeight + 18;
    let activeSection = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top > readingLine) break;
      activeSection = section;
    }
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atBottom) activeSection = sections.at(-1);

    const activeLink = links.get(activeSection.id);
    if (activeLink === current) return;

    current?.removeAttribute('aria-current');
    activeLink.setAttribute('aria-current', 'location');
    current = activeLink;

    keepLinkVisible(activeLink);
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measureDock() {
    setDockOffset();
    scheduleUpdate();
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('hashchange', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  new ResizeObserver(measureDock).observe(dock);
  measureDock();
}

highlightCurrentSection();



// Le risposte restano nella scheda del browser mentre si cambia lezione.
for (const [index, field] of [...document.querySelectorAll('.study-edition.inner-page main textarea')].entries()) {
  const key = 'monti-fisica2-risposta:' + location.pathname + ':' + index;
  try {
    const draft = sessionStorage.getItem(key);
    if (draft !== null) field.value = draft;
    field.addEventListener('input', () => {
      try {
        sessionStorage.setItem(key, field.value);
      } catch {
        // Il campo resta comunque utilizzabile se il browser blocca la memoria locale.
      }
    });
  } catch {
    // Alcuni browser limitano la memoria locale per i file aperti direttamente.
  }
}
