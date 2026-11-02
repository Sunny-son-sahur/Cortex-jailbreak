/* Cortex Jailbreaks — forum and chat back end.

   Deploy with Wrangler (see README.md next to this file), then put its URL in
   site/config.js as CORTEX.api. Until then the pages store posts in the visitor's
   browser instead.

   Bindings:
     DB            D1 database (schema.sql)
     ALLOWED_ORIGIN  optional, e.g. https://yourname.github.io
*/

const MAX = { title: 120, body: 4000, author: 28, room: 40, message: 1000 };

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
    const fail = (msg, status = 400) => json({ error: msg }, status);

    if (!env.DB) return fail('No database bound. See worker/README.md.', 500);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    const method = request.method;

    const body = async () => {
      if (!/^application\/json/i.test(request.headers.get('Content-Type') || '')) return null;
      try { return await request.json(); } catch { return null; }
    };
    const text = (v, max) => {
      if (typeof v !== 'string') return '';
      return v.replace(/\r\n/g, '\n').trim().slice(0, max);
    };
    const ok = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

    try {
      /* ---------- threads ---------- */
      if (path === '/threads' && method === 'GET') {
        const { results } = await env.DB.prepare(`
          SELECT t.id, t.title, t.author, t.created_at AS createdAt, t.last_at AS lastAt,
                 (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS count
          FROM threads t ORDER BY t.last_at DESC LIMIT 200`).all();
        return json(results || []);
      }

      if (path === '/threads' && method === 'POST') {
        const b = await body();
        if (!b) return fail('Expected JSON');
        if (!ok(b.title, MAX.title)) return fail('Title is required (max 120 characters)');
        if (!ok(b.body, MAX.body)) return fail('Post is required (max 4000 characters)');
        if (!ok(b.author, MAX.author)) return fail('Name is required (max 28 characters)');
        const id = crypto.randomUUID();
        const at = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO threads (id, title, author, created_at, last_at) VALUES (?, ?, ?, ?, ?)')
            .bind(id, text(b.title, MAX.title), text(b.author, MAX.author), at, at),
          env.DB.prepare('INSERT INTO posts (id, thread_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(crypto.randomUUID(), id, text(b.author, MAX.author), text(b.body, MAX.body), at)
        ]);
        return json({ id, title: text(b.title, MAX.title), author: text(b.author, MAX.author), createdAt: at, lastAt: at, count: 1 }, 201);
      }

      const threadMatch = path.match(/^\/threads\/([^/]+)$/);
      if (threadMatch && method === 'GET') {
        const id = decodeURIComponent(threadMatch[1]);
        const t = await env.DB.prepare(
          'SELECT id, title, author, created_at AS createdAt, last_at AS lastAt FROM threads WHERE id = ?').bind(id).first();
        if (!t) return fail('No such thread', 404);
        const { results } = await env.DB.prepare(
          'SELECT id, author, body, created_at AS createdAt FROM posts WHERE thread_id = ? ORDER BY created_at ASC LIMIT 500').bind(id).all();
        return json({ ...t, posts: results || [] });
      }

      const postMatch = path.match(/^\/threads\/([^/]+)\/posts$/);
      if (postMatch && method === 'POST') {
        const id = decodeURIComponent(postMatch[1]);
        const b = await body();
        if (!b) return fail('Expected JSON');
        if (!ok(b.body, MAX.body)) return fail('Message is required (max 4000 characters)');
        if (!ok(b.author, MAX.author)) return fail('Name is required (max 28 characters)');
        const t = await env.DB.prepare('SELECT id FROM threads WHERE id = ?').bind(id).first();
        if (!t) return fail('No such thread', 404);
        const pid = crypto.randomUUID(), at = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO posts (id, thread_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(pid, id, text(b.author, MAX.author), text(b.body, MAX.body), at),
          env.DB.prepare('UPDATE threads SET last_at = ? WHERE id = ?').bind(at, id)
        ]);
        return json({ id: pid, author: text(b.author, MAX.author), body: text(b.body, MAX.body), createdAt: at }, 201);
      }

      /* ---------- rooms ---------- */
      if (path === '/rooms' && method === 'GET') {
        const { results } = await env.DB.prepare(`
          SELECT r.id, r.name, r.author, r.created_at AS createdAt, r.last_at AS lastAt,
                 (SELECT COUNT(*) FROM messages m WHERE m.room_id = r.id) AS count
          FROM rooms r ORDER BY r.last_at DESC LIMIT 200`).all();
        return json(results || []);
      }

      if (path === '/rooms' && method === 'POST') {
        const b = await body();
        if (!b) return fail('Expected JSON');
        const name = text(b.name, MAX.room).replace(/^#+/, '').trim();
        if (!name) return fail('Room name is required (max 40 characters)');
        if (!ok(b.author, MAX.author)) return fail('Name is required (max 28 characters)');
        const id = crypto.randomUUID(), at = new Date().toISOString();
        await env.DB.prepare('INSERT INTO rooms (id, name, author, created_at, last_at) VALUES (?, ?, ?, ?, ?)')
          .bind(id, name, text(b.author, MAX.author), at, at).run();
        return json({ id, name, author: text(b.author, MAX.author), createdAt: at, lastAt: at, count: 0 }, 201);
      }

      const msgMatch = path.match(/^\/rooms\/([^/]+)\/messages$/);
      if (msgMatch && method === 'GET') {
        const id = decodeURIComponent(msgMatch[1]);
        const after = url.searchParams.get('after');
        const q = after
          ? env.DB.prepare('SELECT id, author, body, created_at AS createdAt FROM messages WHERE room_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 500').bind(id, after)
          : env.DB.prepare('SELECT id, author, body, created_at AS createdAt FROM messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 500').bind(id);
        const { results } = await q.all();
        return json(results || []);
      }

      if (msgMatch && method === 'POST') {
        const id = decodeURIComponent(msgMatch[1]);
        const b = await body();
        if (!b) return fail('Expected JSON');
        if (!ok(b.body, MAX.message)) return fail('Message is required (max 1000 characters)');
        if (!ok(b.author, MAX.author)) return fail('Name is required (max 28 characters)');
        const r = await env.DB.prepare('SELECT id FROM rooms WHERE id = ?').bind(id).first();
        if (!r) return fail('No such room', 404);
        const mid = crypto.randomUUID(), at = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO messages (id, room_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)')
            .bind(mid, id, text(b.author, MAX.author), text(b.body, MAX.message), at),
          env.DB.prepare('UPDATE rooms SET last_at = ? WHERE id = ?').bind(at, id)
        ]);
        return json({ id: mid, author: text(b.author, MAX.author), body: text(b.body, MAX.message), createdAt: at }, 201);
      }

      if (path === '/' || path === '/health') return json({ ok: true, service: 'cortex-social' });
      return fail('Not found', 404);
    } catch (err) {
      return fail('Server error: ' + (err && err.message ? err.message : 'unknown'), 500);
    }
  }
};
