/* Cortex Jailbreaks — library, pack pages, dates, copy and download. */
(() => {
  'use strict';
  const d = document;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const cfg = window.CORTEX || {};
  const packs = window.PACKS || [];
  const packPath = window.packPath || ((p, m, e) => `packs/${p}/${m}.${e}`);

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = id => `<svg class="ico"><use href="#${id}"/></svg>`;
  const mark = p => p.logo
    ? `<img src="${esc(p.logo)}" alt="" draggable="false" loading="lazy">`
    : `<span class="sym">${esc(p.symbol || '')}</span>`;

  /* ---------- Toasts ---------- */
  const toastBox = $('#toasts');
  function toast(msg, ico = 'i-check') {
    if (!toastBox) return;
    const t = d.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="t-ico">${icon(ico)}</span><span></span>`;
    t.lastChild.textContent = msg;
    toastBox.append(t);
    while (toastBox.children.length > 3) toastBox.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add('is-leaving');
      t.addEventListener('animationend', () => t.remove(), { once: true });
      setTimeout(() => t.remove(), 400);
    }, 2600);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    const ta = d.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    d.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = d.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }

  /* ---------- Navigation ---------- */
  const menuBtn = $('.menu-btn'), mobileMenu = $('#mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.getAttribute('aria-expanded') !== 'true';
      menuBtn.setAttribute('aria-expanded', String(open));
      mobileMenu.hidden = !open;
    });
    mobileMenu.addEventListener('click', e => {
      if (e.target.closest('a')) { mobileMenu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- "Updated" dates, read from GitHub ----------
     Each model's date is the last commit that touched its file. Cached for six
     hours so a visit costs at most one request per file, then it is free. If
     GitHub is unreachable (or the repo is private) the fallback date from
     catalog.js is used, so the page never shows a blank.                        */
  const DAY = 86400000;
  const ghDate = async path => {
    if (!cfg.repo) return null;
    const key = `cx:gh:${cfg.repo}:${path}`;
    try {
      const c = JSON.parse(localStorage.getItem(key) || 'null');
      if (c && Date.now() - c.t < DAY && c.d) return c.d;
    } catch { /* private mode */ }
    try {
      const url = `https://api.github.com/repos/${cfg.repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(cfg.branch || 'main')}&per_page=1`;
      const r = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return null;
      const j = await r.json();
      const iso = j && j[0] && (j[0].commit?.committer?.date || j[0].commit?.author?.date);
      if (!iso) return null;
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: iso })); } catch { /* full */ }
      return iso;
    } catch { return null; }
  };

  const fmtDay = iso => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Fills every [data-when] on the page once its real date arrives.
  async function loadDates() {
    const els = $$('[data-when]');
    for (const el of els) {
      const path = el.dataset.when;
      if (!path) continue;
      const iso = await ghDate(path);
      if (iso) el.textContent = `Updated ${fmtDay(iso)}`;
    }
  }

  /* ---------- Library ---------- */
  const grid = $('#grid'), segment = $('#segment'), countEl = $('#count'), emptyEl = $('#empty');
  const search = $('#search'), clearBtn = $('#search-clear');
  const state = { type: 'all', q: '' };
  const liveModels = p => p.models || [];
  const isLive = p => liveModels(p).length > 0;

  if (segment) {
    segment.insertAdjacentHTML('beforeend', [['all', 'All'], ['chat', 'Chat'], ['coding', 'Coding']].map(([id, name]) =>
      `<button type="button" data-type="${id}" aria-pressed="false">${name}<span>${id === 'all' ? packs.length : packs.filter(p => p.type === id).length}</span></button>`).join(''));
    segment.addEventListener('click', e => {
      const b = e.target.closest('[data-type]');
      if (!b) return;
      state.type = b.dataset.type;
      $$('[data-type]', segment).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.type === state.type)));
      render();
    });
  }

  function cardHTML(p) {
    const n = liveModels(p).length;
    return `
      <div class="card-top">
        <span class="card-logo" aria-hidden="true">${mark(p)}</span>
        <span class="status${n ? ' ready' : ''}"><i></i>${n ? `${n} model${n === 1 ? '' : 's'}` : 'Soon'}</span>
      </div>
      <div>
        <h3>${esc(p.name)}</h3>
        <p class="card-meta">${esc(p.provider)} · ${p.type === 'coding' ? 'Coding' : 'Chat'}</p>
      </div>
      <button type="button" class="card-hit" data-open="${esc(p.id)}" aria-label="Open the ${esc(p.name)} pack"></button>`;
  }

  const cards = new Map();
  function buildCards() {
    if (!grid) return;
    packs.forEach(p => {
      const el = d.createElement('article');
      el.className = 'card';
      el.dataset.id = p.id;
      el.innerHTML = cardHTML(p);
      cards.set(p.id, el);
    });
  }

  function matches(p) {
    if (state.type !== 'all' && p.type !== state.type) return false;
    if (!state.q) return true;
    const hay = [p.name, p.provider, p.blurb, ...liveModels(p).map(m => m.name)].join(' ').toLowerCase();
    return hay.includes(state.q);
  }

  function render() {
    if (!grid) return;
    const list = packs.filter(matches);
    const ids = new Set(list.map(p => p.id));
    cards.forEach((el, id) => { el.hidden = !ids.has(id); });
    list.forEach(p => grid.append(cards.get(p.id)));
    if (countEl) countEl.innerHTML = `<b>${list.length}</b> pack${list.length === 1 ? '' : 's'}`;
    if (emptyEl) emptyEl.hidden = list.length > 0;
  }

  if (search) {
    search.addEventListener('input', () => {
      state.q = search.value.trim().toLowerCase();
      if (clearBtn) clearBtn.hidden = !search.value;
      render();
    });
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape' && search.value) { e.preventDefault(); search.value = ''; search.dispatchEvent(new Event('input')); }
    });
  }
  if (clearBtn) clearBtn.addEventListener('click', () => {
    search.value = ''; search.dispatchEvent(new Event('input')); search.focus();
  });
  const resetBtn = $('#reset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    state.type = 'all'; state.q = '';
    if (search) search.value = '';
    if (clearBtn) clearBtn.hidden = true;
    if (segment) $$('[data-type]', segment).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.type === 'all')));
    render();
  });

  if (grid) grid.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) openPack(b.dataset.open);
  });

  /* ---------- Pack page ---------- */
  const page = $('#pack-page');
  let current = null;

  function modelHTML(p, m) {
    const mdPath = packPath(p.id, m.id, 'md');
    const zipPath = packPath(p.id, m.id, 'zip');
    const when = m.note ? `${esc(m.note)} · ` : '';
    return `
      <li class="model">
        <div class="model-info">
          <h4>${esc(m.name)}</h4>
          <p>${when}<span class="when" data-when="${esc(mdPath)}">Updated ${esc(fmtDay(m.updated))}</span></p>
        </div>
        <div class="model-actions">
          <button type="button" class="mbtn" data-copy="${esc(m.id)}" data-src="${esc(mdPath)}" aria-label="Copy the ${esc(m.name)} prompt">${icon('i-copy')}<span>Copy</span></button>
          <a class="mbtn primary" href="${esc(zipPath)}" download aria-label="Download ${esc(m.name)} as a ZIP">${icon('i-down')}<span>ZIP</span></a>
        </div>
      </li>`;
  }

  function fill(p) {
    current = p;
    if (!page) return;
    const n = liveModels(p).length;
    $('#pp-logo').innerHTML = mark(p);
    $('#pp-provider').textContent = p.provider;
    $('#pp-title').textContent = p.name;
    $('#pp-desc').textContent = p.blurb;
    $('#pp-count').textContent = `${packs.indexOf(p) + 1} / ${packs.length}`;
    $('#pp-models-count').textContent = n ? `${n} model${n === 1 ? '' : 's'}` : '';
    $('#pp-models').innerHTML = n
      ? liveModels(p).map(m => modelHTML(p, m)).join('')
      : `<li class="model-empty">Nothing released for ${esc(p.name)} yet. It appears here when it is.</li>`;
    $('#pp-tree').textContent = `cortex-${p.id}/\n└── ${p.file}`;
    $('#pp-note').textContent = n
      ? `Each ZIP holds one ${p.file}, inside a folder named cortex-${p.id}.`
      : `When ${p.name} lands, its ZIP will hold a single ${p.file}.`;
    $('#pp-steps').innerHTML = [
      ['Pick your model', n ? 'Choose the one that matches the app you use.' : 'Models appear here as they are released.'],
      ['Download or copy', 'Download the ZIP and unzip it, or copy the text straight out.'],
      [`Use it`, `Select the unzipped folder as your workspace, or paste the text into ${esc(p.name)}.`]
    ].map(([t, s]) => `<li><b>${esc(t)}</b> ${esc(s)}</li>`).join('');
    if (page.open) loadDates();
  }

  function openPack(id) {
    const p = packs.find(x => x.id === id);
    if (!p || !page) return;
    fill(p);
    if (!page.open) page.showModal();
    $('#pp-body').scrollTop = 0;
    history.replaceState(null, '', '#pack-' + p.id);
  }

  function step(dir) {
    if (!current) return;
    const i = (packs.indexOf(current) + dir + packs.length) % packs.length;
    fill(packs[i]);
    $('#pp-body').scrollTop = 0;
  }

  if (page) {
    $('#pp-close').addEventListener('click', () => page.close());
    $('#pp-back').addEventListener('click', () => page.close());
    $('#pp-prev').addEventListener('click', () => step(-1));
    $('#pp-next').addEventListener('click', () => step(1));
    page.addEventListener('click', e => { if (e.target === page) page.close(); });
    page.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    page.addEventListener('close', () => {
      if (location.hash.startsWith('#pack-')) history.replaceState(null, '', location.pathname + location.search);
    });
    page.addEventListener('click', async e => {
      const b = e.target.closest('[data-copy]');
      if (!b) return;
      const label = $('span', b);
      b.disabled = true;
      try {
        const r = await fetch(b.dataset.src, { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        const text = await r.text();
        const ok = await copyText(text);
        if (ok) {
          b.classList.add('is-copied');
          label.textContent = 'Copied';
          toast(`Copied ${text.length.toLocaleString()} characters`, 'i-check');
          setTimeout(() => { b.classList.remove('is-copied'); label.textContent = 'Copy'; }, 1600);
        } else {
          toast('Copy failed — open the ZIP and copy from the file', 'i-info');
        }
      } catch {
        toast('That prompt could not be loaded', 'i-info');
      }
      b.disabled = false;
    });
  }

  /* ---------- Boot ---------- */
  buildCards();
  render();
  loadDates();

  const deep = location.hash.match(/^#pack-([\w-]+)$/);
  if (deep) setTimeout(() => openPack(deep[1]), 60);

  window.Cortex = { toast, copyText, esc, icon };
})();
