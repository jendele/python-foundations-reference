# Python Foundations Reference

An interactive, workflow-organised command reference for the **Python Foundations
for Data Science** module (M.Sc. Digital Health, Dr. Jenny Delekta). It is a
learning aid for students with little or no prior programming experience:
every command appears with what it does, a token-by-token reading of its code,
the conditions under which it applies, and when one would reach for it.

## Structure

Pure static site — no build step, no backend. Suitable for GitHub Pages served
from `main` branch root.

```
index.html          Layout skeleton (no embedded data)
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
