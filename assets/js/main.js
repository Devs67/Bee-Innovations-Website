const SEARCH_INDEX = [
  { title: 'Home', section: 'Home', path: 'home.html', excerpt: 'Create what you imagine. Bee Innovations gives schools the curriculum, the lab, and the trained teacher.' },
  { title: 'What We Do', section: 'What We Do', path: 'what-we-do/index.html', excerpt: 'Curriculum, lab setup, and teacher training, working together.' },
  { title: 'Curriculum & Content', section: 'What We Do', path: 'what-we-do/curriculum-content.html', excerpt: 'A grade-by-grade skill ladder for Grades 1-9, simulator-first and free-tier-first.' },
  { title: 'Lab & Makerspace Setup', section: 'What We Do', path: 'what-we-do/lab-makerspace-setup.html', excerpt: 'From a single robotics corner to a full makerspace, including hardware sourcing via Blix.' },
  { title: 'Curriculum', section: 'Curriculum', path: 'curriculum/index.html', excerpt: 'Grades 1-9. One skill ladder. Three stages: Explore, Build, Create. Four tracks.' },
  { title: 'Teacher Training & Support', section: 'Curriculum', path: 'curriculum/teacher-training-support.html', excerpt: 'We train a teacher already on your staff, and visit regularly to coach and troubleshoot.' },
  { title: 'Any-Door Alarm: Build Guide', section: 'Curriculum', path: 'curriculum/any-door-alarm.html', excerpt: 'Grade 6 Electronics & Robotics project: a two-button breadboard alarm.' },
  { title: 'Why Bee Innovations', section: 'Why Bee Innovations', path: 'why-bee-innovations/index.html', excerpt: 'The thinking behind the name: why a bee, why zero.' },
  { title: 'Brand Philosophy', section: 'Why Bee Innovations', path: 'why-bee-innovations/index.html#philosophy', excerpt: 'What we believe, why a bee, why zero, how we teach, where we are headed.' },
  { title: 'Our Story', section: 'Why Bee Innovations', path: 'why-bee-innovations/index.html#our-story', excerpt: 'Founded by Devendhar Bachhu, who came to education through engineering.' },
  { title: 'For Schools', section: 'For Schools', path: 'for-schools/index.html', excerpt: 'A partner, not just a vendor. Partnership and case studies.' },
  { title: 'Partner With Us', section: 'For Schools', path: 'for-schools/partner-with-us.html', excerpt: 'Built to run without us in the room. What is included, who this is for.' },
  { title: 'Contact', section: 'Contact', path: 'contact/index.html', excerpt: 'Let us talk about your school. Based in Hyderabad, Telangana.' }
];

function getRootPrefix() {
  const link = document.querySelector('link[rel="stylesheet"]');
  const href = link ? link.getAttribute('href') : '';
  return href && href.startsWith('../') ? '../' : '';
}

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
}

function initNavDropdowns() {
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  document.querySelectorAll('.nav-item').forEach((item) => {
    const parent = item.querySelector('.nav-parent');
    if (!parent) return;

    parent.addEventListener('click', (e) => {
      if (!isMobile()) return;
      e.preventDefault();
      const open = item.classList.toggle('open');
      parent.setAttribute('aria-expanded', String(open));
    });
  });
}

function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  const update = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function initFabStack(rootPrefix) {
  const stack = document.createElement('div');
  stack.className = 'fab-stack';

  const isContactPage = /\/contact\/index\.html$/.test(window.location.pathname) || window.location.pathname.endsWith('/contact/');

  const topBtn = document.createElement('button');
  topBtn.className = 'fab fab-top';
  topBtn.type = 'button';
  topBtn.setAttribute('aria-label', 'Back to top');
  topBtn.innerHTML = '&#8593;';
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  stack.appendChild(topBtn);

  if (!isContactPage) {
    const contactBtn = document.createElement('a');
    contactBtn.className = 'fab fab-contact';
    contactBtn.href = rootPrefix + 'contact/index.html';
    contactBtn.textContent = 'Contact Us';
    stack.appendChild(contactBtn);
  }

  document.body.appendChild(stack);

  const toggleTop = () => {
    topBtn.classList.toggle('visible', window.scrollY > 400);
  };

  window.addEventListener('scroll', toggleTop, { passive: true });
  toggleTop();
}

function initSearch(rootPrefix) {
  const navWrap = document.querySelector('.nav-wrap');
  const navToggle = document.querySelector('.nav-toggle');
  const navActions = document.querySelector('.nav-actions');
  if (!navWrap || !navToggle) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'search-trigger';
  trigger.setAttribute('aria-label', 'Search the site');
  trigger.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="6"></circle><line x1="13.2" y1="13.2" x2="18" y2="18"></line></svg>';
  navWrap.insertBefore(trigger, navActions || navToggle);

  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.innerHTML = `
    <div class="search-modal" role="dialog" aria-modal="true" aria-label="Site search">
      <input type="text" placeholder="Search the site..." aria-label="Search query">
      <div class="search-results"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('input');
  const results = overlay.querySelector('.search-results');

  const render = (query) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '<p class="search-empty">Start typing to search pages across the site.</p>';
      return;
    }
    const matches = SEARCH_INDEX.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.excerpt.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q)
    );
    if (!matches.length) {
      results.innerHTML = '<p class="search-empty">No pages matched your search.</p>';
      return;
    }
    results.innerHTML = matches.map(item => `
      <a href="${rootPrefix}${item.path}">
        <span class="result-section">${item.section}</span>
        <span class="result-title">${item.title}</span>
      </a>
    `).join('');
  };

  const isOpen = () => overlay.classList.contains('is-open');

  const open = () => {
    overlay.classList.add('is-open');
    input.value = '';
    render('');
    input.focus();
  };

  const close = () => {
    overlay.classList.remove('is-open');
  };

  trigger.addEventListener('click', open);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !isOpen() && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      open();
    }
  });
  input.addEventListener('input', () => render(input.value));
}

function initContactConfirm() {
  const form = document.querySelector('.form-grid');
  const confirm = document.querySelector('.form-confirm');
  if (!form || !confirm) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.hidden = true;
    confirm.classList.add('visible');
    confirm.setAttribute('tabindex', '-1');
    confirm.focus();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const rootPrefix = getRootPrefix();
  initNavToggle();
  initNavDropdowns();
  initScrollProgress();
  initFabStack(rootPrefix);
  initSearch(rootPrefix);
  initContactConfirm();
});
