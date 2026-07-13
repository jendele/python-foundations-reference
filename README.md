# Python Foundations Reference

An interactive, workflow-organised command reference for the **Python Foundations
for Data Science** module (M.Sc. Digital Health, Dr. Jenny Delekta). It is a
learning aid for students with little or no prior programming experience:
every command appears with what it does, a token-by-token reading of its code,
the conditions under which it applies, and when one would reach for it.

## Structure

Pure static site — no build step, no backend. Served via GitHub Pages from the
`main` branch root, and installable as a **Progressive Web App** (see below).

```
index.html          Layout skeleton (no embedded data)
manifest.webmanifest PWA manifest (name, icons, colours)
sw.js                Service worker: precaches the site for offline use
icons/               App icons (favicon, install icons, apple-touch)
css/style.css        Styles
js/data.js           AUTO-GENERATED bundle of data/*.json (so file:// works)
js/app.js            Reads js/data.js, renders cards/decisions/example, accordion + auto-link
js/search.js         Question → suggested commands; the Ask overlay
js/glossary.js       Glossary auto-linker + drawer
js/tasks.js          The Practice button: random quizzes/exercises + progress
data/corpus.json     All commands (the main content)
data/glossary.json   Terms, synonyms, definitions
data/synonyms.json   DE↔EN search synonyms for question matching
data/tasks.json      Quiz / code / read-and-predict cards (the Practice pool)
data/decisions.json  The decision boxes
data/example.json    The complete worked example
docs/schema.md       Data schema reference
legacy/workflow_v6.html  Frozen v6 single-file prototype (source of extraction)
scripts/             One-shot extraction scripts used during the v6 refactor
```

## Running locally

Just open `index.html` in a browser — double-clicking the file works. The
data is inlined into `js/data.js`, so there is no `fetch()` and no server
requirement. This is how the reference is distributed to students (USB,
email attachment, GitHub Pages — all work the same).

Serving over HTTP (`python -m http.server`) also works and is unchanged.

## Progressive Web App (install & offline use)

When the reference is opened from GitHub Pages (or any HTTPS server), it can
be **installed like an app** and then works **fully offline**:

- **Desktop (Chrome/Edge):** click the install icon in the address bar, or
  menu → *Install app*.
- **Android:** browser menu → *Add to Home screen* / *Install app*.
- **iPhone/iPad (Safari):** Share button → *Add to Home Screen*.

On first visit the service worker (`sw.js`) precaches the entire site
(~300 KB), so the installed app opens instantly and needs no connection —
useful in lecture halls with poor Wi-Fi and on the train.

**Updates:** content changes reach installed apps on the next visit while
online. For that to happen, `CACHE_VERSION` in `sw.js` **must be bumped**
whenever any shipped file changes (see next section).

The PWA layer is additive: opening `index.html` from disk (`file://`, USB,
email attachment) still works exactly as before — the service worker simply
does not register there.

## Editing content

All content lives in `data/`. Adding or changing a command means editing
`data/corpus.json`; no code changes are needed. See [docs/schema.md](docs/schema.md)
for the field semantics of every data file.

**After editing any `data/*.json`, regenerate the inlined bundle:**

```
node scripts/build-data-bundle.mjs
```

This rewrites `js/data.js` from the JSON files. `js/data.js` is
auto-generated — never edit it by hand. Commit it alongside the JSON
change so the distributed file stays in sync.

**Then bump `CACHE_VERSION` in `sw.js`** (e.g. `pfr-v2.0.0` → `pfr-v2.0.1`).
Without the bump, students who installed the PWA keep seeing the old cached
content.

Before committing, every JSON file must parse:

```
python -m json.tool < data/corpus.json > /dev/null
```

`scripts/sanity-check.mjs` loads the served site in headless Chromium and
asserts render parity (card/decision counts, auto-links, search, no console
errors). It needs `playwright` available and the site served locally; it is a
developer aid, not a build dependency.

`legacy/workflow_v6.html` is frozen — it is the provenance record for the
initial extraction and should not be edited.
