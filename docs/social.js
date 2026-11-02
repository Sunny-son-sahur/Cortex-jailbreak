/* Cortex Jailbreaks — forum and chat storage.

   Two back ends that behave identically:
     local  — posts live in this browser only. Works on GitHub Pages with no server.
     api    — posts are shared. Used when CORTEX.api is set to your Worker's URL.

   The pages only ever talk to Social.store, so switching one for the other changes
   nothing else. */

window.Social = (() => {
  'use strict';

  const cfg = window.CORTEX || {};
  const api = String(cfg.api || '').replace(/\/+$/, '');
  const mode = api ? 'api' : 'local';

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- who you are ---------- */
  const NAME_KEY = 'cx:name';
  function getName() {
    try { return (localStorage.getItem(NAME_KEY) || '').trim(); } catch { return ''; }
  }
  function setName(n) {
    try { localStorage.setItem(NAME_KEY, String(n).slice(0, 28).trim()); } catch { /* private mode */ }
  }

  /* ---------- relative time ---------- */
  function when(iso) {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 45) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 604800) return Math.floor(s / 86400) + 'd';
    return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  const absolute = iso => {
    const t = new Date(iso);
    return isNaN(t) ? '' : t.toLocaleString();
  };

  /* ---------- local back end ---------- */
  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; } catch { return fallback; }
  };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  };

  const local = {
    mode: 'local',

    async threads() {
      return read('cx:threads', []).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
    },
    async thread(id) {
      const t = read('cx:threads', []).find(x => x.id === id);
      if (!t) return null;
      return { ...t, posts: read('cx:posts:' + id, []) };
    },
    async createThread({ title, body, author }) {
      const t = { id: uid(), title, author, createdAt: now(), lastAt: now(), count: 1 };
      write('cx:threads', [...read('cx:threads', []), t]);
      write('cx:posts:' + t.id, [{ id: uid(), author, body, createdAt: now() }]);
      return t;
    },
    async addPost(id, { body, author }) {
      const list = read('cx:threads', []);
      const t = list.find(x => x.id === id);
      if (!t) throw new Error('missing');
      const post = { id: uid(), author, body, createdAt: now() };
      write('cx:posts:' + id, [...read('cx:posts:' + id, []), post]);
      t.lastAt = post.createdAt;
      t.count = (t.count || 0) + 1;
      write('cx:threads', list);
      return post;
    },

    async rooms() {
      return read('cx:rooms', []).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
    },
    async createRoom({ name, author }) {
      const r = { id: uid(), name, author, createdAt: now(), lastAt: now(), count: 0 };
      write('cx:rooms', [...read('cx:rooms', []), r]);
      write('cx:msgs:' + r.id, []);
      return r;
    },
    async messages(id) {
      return read('cx:msgs:' + id, []);
    },
    async send(id, { body, author }) {
      const list = read('cx:rooms', []);
      const r = list.find(x => x.id === id);
      if (!r) throw new Error('missing');
      const msg = { id: uid(), author, body, createdAt: now() };
      write('cx:msgs:' + id, [...read('cx:msgs:' + id, []), msg]);
      r.lastAt = msg.createdAt;
      r.count = (r.count || 0) + 1;
      write('cx:rooms', list);
      return msg;
    }
  };

  /* ---------- shared back end ---------- */
  const call = async (path, options = {}) => {
    const r = await fetch(api + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!r.ok) {
      let msg = `Request failed (${r.status})`;
      try { msg = (await r.json()).error || msg; } catch { /* not json */ }
      throw new Error(msg);
    }
    return r.status === 204 ? null : r.json();
  };

  const remote = {
    mode: 'api',
    threads: () => call('/threads'),
    thread: id => call('/threads/' + encodeURIComponent(id)),
    createThread: d => call('/threads', { method: 'POST', body: JSON.stringify(d) }),
    addPost: (id, d) => call('/threads/' + encodeURIComponent(id) + '/posts', { method: 'POST', body: JSON.stringify(d) }),
    rooms: () => call('/rooms'),
    createRoom: d => call('/rooms', { method: 'POST', body: JSON.stringify(d) }),
    messages: id => call('/rooms/' + encodeURIComponent(id) + '/messages'),
    send: (id, d) => call('/rooms/' + encodeURIComponent(id) + '/messages', { method: 'POST', body: JSON.stringify(d) })
  };

  const store = mode === 'api' ? remote : local;

  /* ---------- shared bits the pages use ---------- */
  function banner() {
    if (mode === 'api') return '';
    return `<div class="mode-banner">${'<svg class="ico"><use href="#i-info"/></svg>'}
      <span><b>Saved in this browser only.</b> Nothing is shared with other visitors yet — point <span class="mono">CORTEX.api</span> at your Worker to make it public.</span></div>`;
  }

  // Ask for a display name once, then keep it.
  function ensureName(onSet) {
    const have = getName();
    if (have) { onSet(have); return; }
  }

  return { mode, store, esc, when, absolute, getName, setName, banner, ensureName, cfg };
})();
