/* Cortex Jailbreaks — forum page. */
(() => {
  'use strict';
  const S = window.Social;
  const esc = S.esc;
  const $ = s => document.querySelector(s);
  const store = S.store;

  $('#mode-banner').innerHTML = S.banner();
  $('#year').textContent = new Date().getFullYear();
  const discord = (window.CORTEX && window.CORTEX.discord) || '';
  ['discord-top', 'discord-menu', 'discord-foot'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = discord;
  });

  const menuBtn = $('.menu-btn'), menu = $('#mobile-menu');
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  });

  const listView = $('#list-view'), threadView = $('#thread-view');
  const nameInput = $('#nt-name'), replyName = $('#rt-name');
  const saved = S.getName();
  if (saved) { nameInput.value = saved; replyName.value = saved; }

  const hint = (el, msg) => { el.textContent = msg; setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000); };

  /* ---------- list ---------- */
  async function paintList() {
    const threads = await store.threads();
    const ul = $('#threads');
    ul.innerHTML = threads.map(t => `
      <li><a href="#t/${encodeURIComponent(t.id)}">
        <span class="thread-main"><b>${esc(t.title)}</b><small>${esc(t.author)} · ${esc(S.when(t.createdAt))} ago</small></span>
        <span class="thread-stats"><span><b>${t.count || 1}</b>posts</span><span><b>${esc(S.when(t.lastAt))}</b>last</span></span>
      </a></li>`).join('');
    $('#threads-empty').hidden = threads.length > 0;
  }

  $('#new-thread').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#nt-submit');
    const author = nameInput.value.trim().slice(0, 28);
    const title = $('#nt-title').value.trim();
    const body = $('#nt-body').value.trim();
    if (!author || !title || !body) return;
    S.setName(author);
    replyName.value = author;
    btn.disabled = true;
    try {
      const t = await store.createThread({ title, body, author });
      $('#nt-title').value = ''; $('#nt-body').value = '';
      await paintList();
      location.hash = '#t/' + encodeURIComponent(t.id);
    } catch (err) {
      hint($('#nt-hint'), err.message || 'Could not post that');
    }
    btn.disabled = false;
  });

  /* ---------- one thread ---------- */
  async function paintThread(id) {
    let t;
    try { t = await store.thread(id); } catch { t = null; }
    if (!t) { location.hash = ''; return; }
    $('#t-title').textContent = t.title;
    $('#t-meta').textContent = `Started by ${t.author} · ${S.absolute(t.createdAt)}`;
    $('#t-posts').innerHTML = (t.posts || []).map((p, i) => `
      <li class="post${i === 0 ? ' is-op' : ''}">
        <div class="post-head"><b>${esc(p.author)}</b><time title="${esc(S.absolute(p.createdAt))}">${esc(S.when(p.createdAt))}</time></div>
        <p class="post-body">${esc(p.body)}</p>
      </li>`).join('');
    $('#reply').dataset.thread = id;
  }

  $('#reply').addEventListener('submit', async e => {
    e.preventDefault();
    const id = e.target.dataset.thread;
    if (!id) return;
    const btn = $('#rt-submit');
    const author = replyName.value.trim().slice(0, 28);
    const body = $('#rt-body').value.trim();
    if (!author || !body) return;
    S.setName(author);
    nameInput.value = author;
    btn.disabled = true;
    try {
      await store.addPost(id, { body, author });
      $('#rt-body').value = '';
      await paintThread(id);
    } catch (err) {
      hint($('#rt-hint'), err.message || 'Could not reply');
    }
    btn.disabled = false;
  });

  /* ---------- routing ---------- */
  async function route() {
    const m = location.hash.match(/^#t\/(.+)$/);
    if (m) {
      listView.hidden = true;
      threadView.hidden = false;
      await paintThread(decodeURIComponent(m[1]));
      window.scrollTo({ top: 0 });
    } else {
      threadView.hidden = true;
      listView.hidden = false;
      await paintList();
    }
  }

  addEventListener('hashchange', route);
  route();
})();
