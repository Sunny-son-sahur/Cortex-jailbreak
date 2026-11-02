/* Cortex Jailbreaks — chat page. */
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

  const roomsView = $('#rooms-view'), roomView = $('#room-view');
  const nameInput = $('#nr-name');
  const saved = S.getName();
  if (saved) nameInput.value = saved;

  const hint = (msg) => { $('#chat-hint').textContent = msg; };

  /* ---------- rooms ---------- */
  async function paintRooms() {
    const rooms = await store.rooms();
    $('#rooms').innerHTML = rooms.map(r => `
      <li><a href="#r/${encodeURIComponent(r.id)}">
        <span class="room-hash"><svg class="ico"><use href="#i-hash"/></svg></span>
        <span class="thread-main"><b>${esc(r.name)}</b><small>made by ${esc(r.author)} · ${esc(S.when(r.createdAt))} ago</small></span>
        <span class="thread-stats"><span><b>${r.count || 0}</b>messages</span></span>
      </a></li>`).join('');
    $('#rooms-empty').hidden = rooms.length > 0;
  }

  $('#new-room').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#nr-submit');
    const author = nameInput.value.trim().slice(0, 28);
    const name = $('#nr-title').value.trim().replace(/^#+/, '').slice(0, 40);
    if (!author || !name) return;
    S.setName(author);
    btn.disabled = true;
    try {
      const r = await store.createRoom({ name, author });
      $('#nr-title').value = '';
      await paintRooms();
      location.hash = '#r/' + encodeURIComponent(r.id);
    } catch (err) {
      hint(err.message || 'Could not create that room');
    }
    btn.disabled = false;
  });

  /* ---------- one room ---------- */
  let room = null, timer = 0, lastCount = -1, lastDate = '';

  async function paintFeed(force) {
    if (!room) return;
    let msgs;
    try { msgs = await store.messages(room.id); } catch { hint('Could not load this room'); return; }
    if (!force && msgs.length === lastCount && (msgs[msgs.length - 1] || {}).createdAt === lastDate) return;
    lastCount = msgs.length;
    lastDate = (msgs[msgs.length - 1] || {}).createdAt || '';
    const feed = $('#feed');
    const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 60;
    feed.innerHTML = msgs.length
      ? msgs.map(m => `
        <div class="msg">
          <b>${esc(m.author)}</b>
          <span>${esc(m.body)}</span>
          <time title="${esc(S.absolute(m.createdAt))}">${esc(S.when(m.createdAt))}</time>
        </div>`).join('')
      : '<div class="msg sys">Nothing here yet. Say something.</div>';
    if (atBottom || force) feed.scrollTop = feed.scrollHeight;
  }

  async function paintRoom(id) {
    const rooms = await store.rooms();
    room = rooms.find(r => r.id === id);
    if (!room) { location.hash = ''; return; }
    $('#r-title').textContent = '# ' + room.name;
    $('#r-meta').textContent = `made by ${room.author} · ${S.absolute(room.createdAt)}`;
    hint(S.mode === 'api' ? 'Shared room — new messages appear by themselves.' : 'Local room — messages stay in this browser.');
    await paintFeed(true);
  }

  $('#send').addEventListener('submit', async e => {
    e.preventDefault();
    if (!room) return;
    const input = $('#msg'), btn = $('#send-btn');
    const body = input.value.trim();
    const author = (S.getName() || nameInput.value.trim() || 'anon').slice(0, 28);
    if (!body) return;
    S.setName(author);
    btn.disabled = true;
    try {
      await store.send(room.id, { body, author });
      input.value = '';
      await paintFeed(true);
      input.focus();
    } catch (err) {
      hint(err.message || 'Could not send that');
    }
    btn.disabled = false;
  });

  /* ---------- routing ---------- */
  async function route() {
    clearInterval(timer);
    const m = location.hash.match(/^#r\/(.+)$/);
    if (m) {
      roomsView.hidden = true;
      roomView.hidden = false;
      await paintRoom(decodeURIComponent(m[1]));
      window.scrollTo({ top: 0 });
      if (S.mode === 'api') timer = setInterval(() => paintFeed(false), (window.CORTEX && window.CORTEX.poll) || 6000);
    } else {
      room = null;
      roomView.hidden = true;
      roomsView.hidden = false;
      await paintRooms();
    }
  }

  addEventListener('hashchange', route);
  route();
})();
