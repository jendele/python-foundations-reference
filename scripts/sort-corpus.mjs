/**
 * Maintenance: re-sort data/corpus.json in place per brief §10 — by stage in
 * canonical pipeline-then-reference order, then by id alphabetically within
 * each stage. app.js renders entries in file order, so this keeps the page
 * order correct as new §6 entries are added.
 *
 * Unlike scripts/extract.mjs (a frozen one-shot that reads the v6 HTML), this
 * operates on the live corpus.json and is safe to run after every edit.
 *
 * Usage: node scripts/sort-corpus.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

// Pipeline stages first (1–8), then the reference stages added for §6.
const STAGE_ORDER = [
  "load", "inspect", "clean", "transform", "aggregate", "merge",
  "visualize", "export",
  "stats", "select", "strings", "datetime", "reshape", "numpy",
];

const path = "data/corpus.json";
const corpus = JSON.parse(readFileSync(path, "utf8"));

const unknown = corpus.filter(c => !STAGE_ORDER.includes(c.stage));
if (unknown.length) {
  console.error("Unknown stage(s):", [...new Set(unknown.map(c => c.stage))].join(", "));
  process.exit(1);
}

const ids = new Set();
for (const c of corpus) {
  if (ids.has(c.id)) { console.error("Duplicate id:", c.id); process.exit(1); }
  ids.add(c.id);
}

corpus.sort((a, b) => {
  const s = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
  return s !== 0 ? s : a.id.localeCompare(b.id);
});

writeFileSync(path, JSON.stringify(corpus, null, 2) + "\n", "utf8");

const byStage = {};
for (const c of corpus) byStage[c.stage] = (byStage[c.stage] || 0) + 1;
console.log(`corpus.json sorted: ${corpus.length} entries`);
console.log(Object.entries(byStage).map(([s, n]) => `${s}=${n}`).join(" "));
