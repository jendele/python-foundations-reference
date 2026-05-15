/**
 * One-shot extraction of the v6 single-file reference into structured JSON.
 *
 * Why a script rather than hand-transcription: the v6 corpus is ~940 lines of
 * JS object literals with embedded HTML, template strings, and German strings.
 * Evaluating the literals in an isolated VM context guarantees the JSON is a
 * byte-faithful copy of what v6 actually rendered, with zero transcription risk.
 *
 * Not part of the site. Run once during the v6 refactor, then retained under
 * scripts/ as a record of how data/ was produced.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const SRC = "legacy/workflow_v6.html";
const html = readFileSync(SRC, "utf8");

// Pull the three literal blocks out of the single <script> tag. Each is a
// top-level `const NAME = <literal>;` — slice from the declaration to the
// terminating `];` / `};` that closes its literal.
function sliceLiteral(name, openChar, closeSeq) {
  const start = html.indexOf(`const ${name} =`);
  if (start === -1) throw new Error(`${name} not found`);
  const end = html.indexOf(closeSeq, start);
  if (end === -1) throw new Error(`end of ${name} not found`);
  return html.slice(start, end + closeSeq.length);
}

const corpusSrc   = sliceLiteral("CORPUS", "[", "\n];");
const glossarySrc = sliceLiteral("GLOSSARY", "[", "\n];");
const synonymsSrc = sliceLiteral("SYNONYMS", "{", "\n};");

const sandbox = {};
createContext(sandbox);
// Top-level `const` in a VM script is block-scoped and does not attach to the
// context object; re-export onto globals so we can read the values back out.
runInContext(
  `${corpusSrc}\n${glossarySrc}\n${synonymsSrc}\n` +
  `this.CORPUS = CORPUS; this.GLOSSARY = GLOSSARY; this.SYNONYMS = SYNONYMS;`,
  sandbox
);

const { CORPUS, GLOSSARY, SYNONYMS } = sandbox;

// Sanity: counts must match what grep found in v6.
const expect = (cond, msg) => { if (!cond) throw new Error("CHECK FAILED: " + msg); };
expect(CORPUS.length === 57, `corpus length ${CORPUS.length} != 57`);
expect(GLOSSARY.length === 76, `glossary length ${GLOSSARY.length} != 76`);

// Brief §10: corpus sorted by id alphabetically within each stage. Stages keep
// the v6 pipeline order so the file reads in pipeline sequence.
const STAGE_ORDER = ["load","inspect","clean","transform","aggregate","merge","visualize","export"];
const corpus = [...CORPUS].sort((a, b) => {
  const sa = STAGE_ORDER.indexOf(a.stage), sb = STAGE_ORDER.indexOf(b.stage);
  if (sa !== sb) return sa - sb;
  return a.id.localeCompare(b.id);
});

// Glossary sorted by term (drawer already sorts at render; sorting the file
// too keeps diffs stable). Synonyms preserved in source order.
const glossary = [...GLOSSARY].sort((a, b) =>
  a.term.toLowerCase().localeCompare(b.term.toLowerCase()));

mkdirSync("data", { recursive: true });
const write = (path, obj) =>
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", "utf8");

write("data/corpus.json", corpus);
write("data/glossary.json", glossary);
write("data/synonyms.json", SYNONYMS);
write("data/tasks.json", []);

console.log(`corpus=${corpus.length} glossary=${glossary.length} ` +
            `synonyms=${Object.keys(SYNONYMS).length} tasks=0`);
