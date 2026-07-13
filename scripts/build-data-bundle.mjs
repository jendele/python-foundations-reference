/* Inlines data/*.json into js/data.js so index.html works from file://
   (browsers block fetch() of local files). Re-run after editing any
   data/*.json:  node scripts/build-data-bundle.mjs */
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const root = process.cwd();
const files = {
  corpus:    "data/corpus.json",
  glossary:  "data/glossary.json",
  synonyms:  "data/synonyms.json",
  tasks:     "data/tasks.json",
  decisions: "data/decisions.json",
  example:   "data/example.json",
};

const data = {};
for (const [key, path] of Object.entries(files)) {
  data[key] = JSON.parse(await readFile(join(root, path), "utf8"));
}

const banner =
`/* ============================================================
   AUTO-GENERATED — do not edit by hand.
   Source of truth: data/*.json
   Regenerate:  node scripts/build-data-bundle.mjs

   This bundle lets index.html run when opened directly from
   disk (file://), where fetch() of local JSON is blocked.
   ============================================================ */
`;

const body = `window.REFERENCE_DATA = ${JSON.stringify(data)};\n`;

await writeFile(join(root, "js/data.js"), banner + body, "utf8");
console.log("Wrote js/data.js  (" + (banner + body).length + " bytes)");
for (const [k, v] of Object.entries(data)) {
  const n = Array.isArray(v) ? v.length : Object.keys(v).length;
  console.log(`  ${k}: ${n} ${Array.isArray(v) ? "entries" : "keys"}`);
}
