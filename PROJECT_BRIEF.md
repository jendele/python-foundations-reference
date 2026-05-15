# PROJECT_BRIEF — Python Foundations Reference

> This document briefs Claude Code on the goal, the existing assets, the target architecture, and the immediate work. Read it first; then read `legacy/Pandas_project_reference.html` for the current content; then propose a concrete first commit before changing files.

---

## 1. Context

This repository hosts an interactive web-based reference for a **Python Foundations for Data Science** module at master's level. The course is taught by Dr. Jenny Delekta and is attended **predominantly by Business Analytics students** with little or no prior programming experience.

The reference is a learning aid: students consult it during the course, during self-study, and during the practical examination (a Jupyter notebook of their own choosing). It is not a textbook and not a tutorial. It is a *workflow-organised cheat sheet with explanations* — every command appears together with what it does, what its code means token by token, the conditions under which it applies, and the situations in which one would reach for it.

A version 6 prototype exists in `legacy/Pandas_project_reference.html`. The corpus it contains (~50 methods, ~75 glossary entries, three decision boxes, one worked example) is the starting point. **Do not discard it.** Extract its data into structured JSON, then extend.

---

## 2. Audience & tone

- Master's-level students; non-tech background; about 22 hours of contact teaching.
- Course language: English. All content English.
- Tone: **academic precision, not casual tutorial.** No "let's", no exclamation marks, no emojis.
- Plain language whenever possible; technical vocabulary introduced explicitly and linked to the glossary.

---

## 3. Existing assets (in `legacy/`)

| File | What it contains |
|---|---|
| `Pandas_project_reference.html` | Self-contained reference (v6) with CORPUS, GLOSSARY, SYNONYMS embedded as JS arrays. Stage-based accordion layout, floating Ask, glossary drawer, worked example. |
| `Project_Assignment.md` | The exam brief students receive. Describes the structural and micro-skill requirements. Useful for inferring which methods the reference *must* cover. |
| `lecture.ipynb` (Session 5) | Pandas II / Visualization / Clean Code. Demonstrates groupby, transform, merge, pivot, matplotlib OO API. Inline "Try it" mini-tasks. The reference should support every method shown here, at minimum. |

---

## 4. Target architecture

Refactor the single-file v6 into a maintainable static site suitable for GitHub Pages.

```
python-foundations-reference/
├── index.html                  Layout skeleton (no embedded data)
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── app.js                  Render commands + glossary into the DOM
│   ├── search.js               Question → suggested commands
│   ├── tasks.js                Random task engine
│   └── glossary.js             Auto-link + drawer
├── data/
│   ├── corpus.json             All methods (the main content)
│   ├── glossary.json           Terms with synonyms and definitions
│   ├── synonyms.json           DE↔EN search synonyms for question matching
│   └── tasks.json              Quiz / code-challenge / read-and-predict cards
├── legacy/
│   ├── workflow_v6.html        Frozen v6 — source of initial corpus extraction
│   ├── Project_Assignment.md
│   └── lecture.ipynb
└── docs/                       (Optional) developer notes
    └── schema.md
```

GitHub Pages should serve from `main` branch root. No build step. Pure static.

---

## 5. Data schema

### 5.1 `corpus.json`

Each entry is one command:

```json
{
  "id": "fillna",
  "code": "df[\"col\"].fillna(value)",
  "stage": "clean",
  "short": "Replace missing values with a specified substitute.",
  "what": "Returns a Series (or DataFrame) in which NaN is replaced by the value supplied. The substitute may be a scalar, a dictionary mapping columns to values, or another Series aligned on the index.",
  "tokens": [
    ["df[\"col\"]", "Selects the column to operate on."],
    [".fillna(...)", "Method replacing missing values."],
    ["value", "The substitute. Numeric columns often use df['col'].median(); categorical, a sentinel such as 'unknown'."]
  ],
  "requires": [
    "a Series or DataFrame containing NaN",
    "a defensible substitute value"
  ],
  "important": [
    "the missingness is plausibly random rather than informative",
    "the column is numeric and a central tendency provides a sensible default"
  ],
  "avoid": [
    "filling with zero unless zero is a meaningful default in the domain",
    "filling more than approximately a third of a column without acknowledging the assumption"
  ],
  "reach": "When a missing value can be defensibly replaced rather than dropped or allowed to propagate.",
  "example": "df[\"age\"] = df[\"age\"].fillna(df[\"age\"].median())",
  "tags": ["clean", "fill", "fillna", "impute", "missing", "nan", "replace"]
}
```

**Field semantics:**
- `id` — unique kebab-case identifier
- `code` — canonical signature
- `stage` — one of: `load | inspect | clean | transform | aggregate | merge | visualize | export | stats | strings | datetime | numpy | reshape`
- `short` — single sentence summary
- `what` — paragraph explanation; may reference glossary terms (auto-linker handles linking)
- `tokens` — array of `[snippet, explanation]` pairs that decompose the code piece by piece
- `requires` — preconditions (what must exist before calling)
- `important` — situations in which this method is the right choice
- `avoid` — situations in which it is not, or common misuses
- `reach` — the natural-language trigger (when to think of this method)
- `example` — runnable line(s) using a placeholder dataset; should not require external data
- `tags` — keywords for search

### 5.2 `glossary.json`

```json
{
  "term": "axis",
  "syn": ["achse", "dimension"],
  "def": "The dimension along which an operation is performed. axis=0 moves down rows (column-wise reduction); axis=1 moves across columns. For concatenation, the axis is the dimension that grows."
}
```

### 5.3 `synonyms.json`

```json
{
  "remove": ["drop", "delete", "kill", "eliminate", "löschen", "entfernen"],
  "missing": ["nan", "null", "na", "fehlend", "lücke", "luecke", "leer"]
}
```

### 5.4 `tasks.json`

Three card types. Discriminated by `type` field.

**Type A — Concept quiz (single-correct multiple choice):**
```json
{
  "id": "q-idxmax-vs-max",
  "type": "concept",
  "stage": "stats",
  "question": "Which method returns the *label* of the maximum value in a Series?",
  "options": [".max()", ".idxmax()", ".argmax()", ".loc[max]"],
  "correct": 1,
  "why": "max returns the value itself; idxmax returns the index label of that value; argmax returns the integer position.",
  "related": ["max", "idxmax", "argmax"]
}
```

**Type B — Code challenge (write a one-liner):**
```json
{
  "id": "c-median-per-group",
  "type": "code",
  "stage": "aggregate",
  "question": "Compute the median revenue per region as a Series.",
  "hint": "Combine groupby with median.",
  "solution": "df.groupby(\"region\")[\"revenue\"].median()",
  "why": "Group-then-stat is the canonical pattern; median is robust to outliers.",
  "related": ["groupby", "median"]
}
```

**Type C — Read & predict (inspect code, predict the result):**
```json
{
  "id": "r-transform-shape",
  "type": "read",
  "stage": "aggregate",
  "code": "df.groupby(\"ward\")[\"los_days\"].transform(\"mean\")",
  "question": "What is the shape of the result?",
  "options": [
    "One row per ward (a small Series)",
    "Same shape as the original df (a Series of length n_rows)",
    "A single scalar"
  ],
  "correct": 1,
  "why": "transform broadcasts the per-group statistic back to every original row.",
  "related": ["transform", "groupby"]
}
```

`related` is a list of corpus `id`s; the task UI should link to those entries.

---

## 6. Coverage gaps to fill (in order of priority)

The v6 corpus covers ~50 methods. The complete reference must cover at least the following, all currently missing or incomplete:

**Statistical methods (highest priority)**
mean, median, mode, sum, std, var, min, max, quantile, describe, skew, kurt, idxmax, idxmin, argmax, argmin, nunique, unique, value_counts (with normalize=True), corr, cov, cumsum, cumprod, cummax, cummin, rolling, expanding, rank, diff, pct_change

**GroupBy expanded**
groupby.size vs groupby.count distinction, groupby with multiple keys, groupby.transform, groupby.filter, groupby.apply, groupby.head, groupby.nth, groupby.cumcount

**Indexing & selection**
.loc, .iloc, .at, .iat, .set_index, .reset_index, boolean indexing as its own entry, .copy() vs view

**Strings**
.str.contains, .str.startswith, .str.endswith, .str.split, .str.cat, .str.extract, .str.findall, .str.len

**Datetime**
.dt.year, .dt.month, .dt.weekday, .dt.hour, .dt.strftime, .dt.to_period, pd.date_range, .resample

**Reshape**
.melt, .pivot, .stack, .unstack, .explode, pd.crosstab (already in v6 partially)

**Plotting extras**
ax.scatter, ax.boxplot, ax.errorbar, ax.fill_between, ax.annotate, ax.text, twinx, basic seaborn (sns.heatmap, sns.regplot, sns.boxplot, sns.pairplot)

**NumPy block (currently almost absent)**
np.array, np.arange, np.linspace, np.zeros, np.ones, np.mean/median/std/var, np.percentile, np.unique, np.where (in v6), np.clip, np.abs, np.log, np.exp, np.sqrt, np.argsort, np.argmax/argmin, .reshape, .T, np.random.default_rng, np.random.choice, np.random.normal

**Errors & warnings (new section)**
SettingWithCopyWarning, KeyError on merge, TypeError comparing datetime, NaN propagation surprises, IndexError positional indexer

---

## 7. New features beyond v6

### 7.1 Random Task button

Floating button next to "Ask" and "Glossary". Click opens a modal overlay (same pattern as Ask). Draws one card at random from `tasks.json` (filterable by stage). User reveals hint, then solution, with `why` displayed at the end. Tracks completion in `localStorage` so subsequent draws can deprioritise already-correct cards (spaced-repetition light).

Card UI: question on top, options (if quiz) or input area (if code), hint behind a click, solution behind another click, `related` corpus IDs as inline links that open the corresponding stage-bar and command card.

### 7.2 Errors & warnings reference

A new collapsible section near the end, before the worked example. Lists the top ~10 errors students actually encounter, each with: symptom (the error message), cause, fix, and a corpus link to the relevant method.

### 7.3 Comparison cards (optional, nice-to-have)

A subsection in each stage that highlights commonly-confused pairs: `.size()` vs `.count()`, `.loc` vs `.iloc`, `merge` vs `concat` vs `combine_first`, `transform` vs `agg`. Side-by-side mini table with one example each.

### 7.4 Progress tracking (optional)

Each command card gets a small pin/star icon. Clicking marks it as "studied" — saved in `localStorage`. A persistent counter in the header shows "n of N methods reviewed". Purely encouraging, not gated.

---

## 8. Design principles to keep

These were established in v6 and must be preserved:

- **Question first.** Every analysis starts with a question. The pipeline is the spine, not the goal.
- **Token-by-token code reading.** Every command's code is decomposed; students learn to read pandas as a language, not a magic incantation.
- **Conditions, not categories.** "When does this apply? When does it not?" is structurally part of every entry.
- **Auto-linked glossary.** Technical terms in prose are clickable. The glossary is a drawer, always available.
- **Floating Ask.** Question-driven access remains a first-class entry point.
- **Stage accordion.** The eight pipeline stages stay as collapsible bars; the worked example and decision boxes are equally-styled accordion bars.

---

## 9. First-session plan

When you (Claude Code) start, propose this sequence. Do not begin work until Jenny confirms.

1. **Bootstrap repo structure.** Create `index.html`, `css/style.css`, `js/app.js`, `js/search.js`, `js/glossary.js`, `data/corpus.json`, `data/glossary.json`, `data/synonyms.json`, `data/tasks.json`. The legacy v6 file is already present at `legacy/Pandas_project_reference.html` — leave it as the frozen reference for content extraction.

2. **Extract corpus from v6.** Parse the inline `CORPUS = [...]` array from `legacy/Pandas_project_reference.html` into `data/corpus.json`. Same for `GLOSSARY` → `data/glossary.json` and `SYNONYMS` → `data/synonyms.json`. Preserve every entry verbatim.

3. **Build the loader.** `app.js` should fetch the four JSON files, render the accordion stages, populate command cards, and re-implement the Ask overlay + glossary drawer + auto-linker from v6.

4. **Sanity check.** Open `index.html` locally; confirm visual parity with `legacy/Pandas_project_reference.html`. Same Ask behaviour, same glossary, same decision boxes, same worked example.

5. **Commit.** "Refactor v6 single-file HTML into structured static site (data-driven, GitHub Pages ready)".

After this checkpoint, work begins on §6 (coverage gaps) one stage at a time, and §7 (new features) after the corpus is solid.

---

## 10. Conventions

- **Commits.** Conventional commits style: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`. Small, single-purpose commits.
- **JSON formatting.** 2-space indent. UTF-8. Top-level array sorted by `id` alphabetically within each stage.
- **Naming.** kebab-case for ids, files; camelCase for JS variables; snake_case for JSON keys.
- **Comments.** JS code should explain *why*, not *what*. JSON files have no comments — the schema doc lives in `docs/schema.md`.
- **Validation.** Before each commit, JSON files must parse (`python -m json.tool < data/corpus.json`). HTML and JS must have no console errors when `index.html` is opened.

---

## 11. Out of scope (for now)

- Backend / database — everything is static
- User accounts / authentication
- Pyodide / in-browser Python execution
- Translation to German (English only for the foreseeable future)
- Mobile-app version (responsive web is enough)

These may come later but are explicitly not part of the initial iterations.

---

*Briefing prepared on 11.05.2026. Source for content extraction: `legacy/Pandas_project_reference.html`. Owner: Dr. Jenny Delekta.*
