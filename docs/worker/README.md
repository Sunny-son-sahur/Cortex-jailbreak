# Forum and chat back end

The site works without this. With `CORTEX.api` empty in `site/config.js`, the forum
and chat save posts in each visitor's own browser — real pages, real posting, but
nothing shared. GitHub Pages cannot store anything, so that is the only option
without a server.

Point `CORTEX.api` at this Worker and both become genuinely shared.

## Why it cannot live on GitHub Pages

GitHub Pages serves static files. It cannot run code that writes to a database, and
it has no database. Anything that stores a post needs somewhere else to run. This
Worker is that "somewhere else" — its code still lives in your GitHub repo, which is
what you asked for; it just executes on Cloudflare's free tier.

## Deploy

You need a free Cloudflare account and Node installed.

```bash
npm install -g wrangler
wrangler login
cd site/worker
wrangler d1 create cortex-social
```

`d1 create` prints a `database_id`. Paste it into `wrangler.toml` where it says
`PASTE-THE-ID-HERE`, then create the tables:

```bash
wrangler d1 execute cortex-social --remote --file=./schema.sql
wrangler deploy
```

`deploy` prints a URL like `https://cortex-social.yourname.workers.dev`. Put that in
`site/config.js`:

```js
api: 'https://cortex-social.yourname.workers.dev',
```

Then commit. The forum and chat switch to shared mode on the next load — no other
code changes.

## Locking it down

By default any website can call the API. Once your site is live, set the origin in
`wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGIN = "https://yourname.github.io"
```

and run `wrangler deploy` again.

## What it stores

Four tables: `threads`, `posts`, `rooms`, `messages` — see `schema.sql`. Names and
text only. No email, no password, no IP address. The name someone types is saved in
their own browser and sent with each post.

## Known limits

- **No accounts.** Anyone can post under any name, and nobody can delete a post
  except you, with SQL. That is the deliberate cost of having no login yet.
- **No rate limiting.** A script could spam it. The length caps in `index.js` are
  the only guard.
- **Polling, not sockets.** The chat asks for new messages every few seconds
  (`CORTEX.poll`). Cheap at small numbers, wasteful at large ones.

All three are worth fixing before this gets popular.
