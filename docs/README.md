# Cortex Jailbreaks

Static site. No build step, no framework, no dependencies. Open `index.html` and it
works.

```
index.html    packs, how it works, questions
forum.html    threads
chat.html     rooms
styles.css    everything visual
config.js     the settings you might change
catalog.js    the packs and their models
app.js        library, pack pages, dates, copy, download
social.js     forum/chat storage (browser or Worker)
forum.js      forum page
chat.js       chat page
packs/        the actual files: <pack>/<model>.md and .zip
assets/       the mark and the model logos
worker/       optional back end for shared forum and chat
```

## Putting it on GitHub Pages

The site needs to be at the repository root, or in a folder named `docs`, because
those are the only two places GitHub Pages will serve from.

If you keep it in `site/`:

```bash
mv site docs
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `/docs` → Save**.
A minute later it is at `https://<yourname>.github.io/Cortex-jailbreak/`.

If you would rather the site sit at the root of the repo, move the contents of
`site/` up one level instead, and keep `packs/` with it.

## The "Updated" date

Every model shows the date its `.md` was last committed. That is read from GitHub's
public API at load time and cached for a day, so:

- push a new `packs/chatgpt/md7dbcd87.md` and the date changes by itself;
- if GitHub cannot be reached, the fallback date in `catalog.js` is shown instead;
- the repository has to be **public**, or the lookup fails and every date falls back.

Repo and branch are set in `config.js`.

## The forum and chat

They work out of the box, but each visitor only sees their own posts: GitHub Pages
has no database. To share them, deploy the Worker in `worker/` and put its URL in
`config.js` as `api`.

## Adding a pack

1. Drop `packs/<pack>/<model>.md` and `.zip` in place.
2. Add the model to that pack in `catalog.js`:

```js
{ id: 'm1234abcd', name: 'Model name', note: 'How to use it.', updated: '2026-11-02T00:00:00Z' }
```

The `note` shows under the name; the date is only a fallback.

To add a whole pack, add an entry with a new `id`, a `file`, a `logo` in
`assets/logos/`, and `models: []`.

`tools/build-packs.py` generates the `.md` and `.zip` files from `jailbreaks/`.
