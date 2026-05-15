# Data schema

All content is data. The site code renders these files; it contains no content
itself. Conventions (from the project brief §10): 2-space indent, UTF-8, no
comments in JSON. Embedded HTML (`<code>`, `<em>`, `<span class="glossary-link">`,
syntax-highlight spans) is permitted inside string fields and is injected via
`innerHTML` at render time.

## `corpus.json`

Top-level array. Sorted by `stage` then by `id` alphabetically within each
stage. The canonical stage order — pipeline stages first, then the §6
reference stages — is the `STAGE_ORDER` constant in `scripts/sort-corpus.mjs`;
run that script after editing to keep the file (and therefore the page) in
order. Each entry is one command:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Unique kebab/snake identifier; the DOM id is `cmd-<id>`. |
| `code` | string | Canonical signature shown in the card summary. |
| `stage` | string | One of: `load \| inspect \| clean \| transform \| aggregate \| merge \| visualize \| export` (the 8 pipeline stages) or the §6 reference stages `select \| stats \| strings \| datetime \| reshape \| numpy`. Each stage has a matching `<section>` in `index.html` with a `data-stage` mount. |
| `short` | string | Single-sentence summary. |
| `what` | string | Paragraph explanation; may contain glossary-link spans. |
| `tokens` | array of `[snippet, explanation]` | Token-by-token decomposition of `code`. |
| `requires` | string[] | Preconditions that must hold before calling. |
| `important` | string[] | Situations in which this is the right choice. |
| `avoid` | string[] | Situations in which it is not, or common misuses. |
| `reach` | string | The natural-language trigger — when to think of this method. |
| `example` | string | Runnable line(s), wrapped in a `<pre>` with highlight spans. Self-contained (no external data). |
| `tags` | string[] | Keywords for question→command search. |

## `glossary.json`

Top-level array, sorted by `term` (case-insensitive). Each entry:

| Field | Type | Meaning |
|---|---|---|
| `term` | string | The canonical term, shown as the entry heading. |
| `syn` | string[] | Synonyms (English/German) matched by drawer search and the auto-linker. |
| `def` | string | Definition; may contain `<code>`/`<em>`. |

## `synonyms.json`

Top-level object: `keyword → [synonyms]`. Used by the question→command matcher
to expand a query token in both directions (a key reaches its values; a value
reaches its key and that key's other values). Source order preserved.

## `tasks.json`

Top-level array (currently empty — populated in a later session). Three card
types, discriminated by `type`:

- **`concept`** — single-correct multiple choice: `id, type, stage, question, options[], correct (index), why, related[]`
- **`code`** — write a one-liner: `id, type, stage, question, hint, solution, why, related[]`
- **`read`** — inspect code, predict result: `id, type, stage, code, question, options[], correct (index), why, related[]`

`related` is a list of corpus `id`s the task UI links to.

## `decisions.json`

Object with `lede` (string, intro paragraph) and `boxes` (array). Each box:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier for the box. |
| `title` | string | Box heading. |
| `intro` | string? | Optional paragraph before the options. |
| `options` | array | The decision options (see below). |
| `note` | string? | Optional footnote paragraph after the options. |

Each option:

| Field | Type | Meaning |
|---|---|---|
| `kind` | string? | `kill \| fill \| ignore \| neutral`. Drives the v6 colour coding (red / green / blue / none). Optional; absent or `neutral` → no colour class. |
| `label` | string | The bold option label. |
| `code` | string? | Optional code snippet rendered as `<code>` immediately after the label. |
| `body` | string | The explanatory text following the label/code. |

## `example.json`

Object describing the single worked example:

| Field | Type | Meaning |
|---|---|---|
| `context` | string | The italic context blurb. |
| `quickStages` | string | The "what the script does, by stage" summary. |
| `copyNote` | string | The label beside the copy button. |
| `code` | string | The full Python script with verbatim syntax-highlight spans (`<span class="c\|k\|s\|h">`). Rendered inside `<pre class="full">`. |
| `footerNote` | string | The closing note about reproducibility / real files. |

## `errors.json`

Object with `lede` (string, the section intro) and `items` (array). Each
item is one error or warning students commonly hit:

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier; the DOM id is `err-<id>`. |
| `symptom` | string | The message roughly as it appears to the student. |
| `kind` | string | `error` or `warning`. Drives a colour cue in the UI. |
| `cause` | string | Why it happens, in plain language; may contain `<code>`. |
| `fix` | string | The concrete remedy; may contain `<code>`. |
| `related` | string[] | Corpus `id`s the UI links to (the methods that resolve it). Every value must resolve to a real `corpus.json` entry. |
