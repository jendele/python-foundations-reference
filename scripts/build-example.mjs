/**
 * Assemble data/example.json. The `code` field must be a byte-faithful copy of
 * the v6 highlighted <pre>, so it is sliced straight out of the source rather
 * than hand-transcribed. Prose fields are transcribed from the v6 markup.
 * One-shot companion to extract.mjs; retained as a record of provenance.
 */
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("legacy/workflow_v6.html", "utf8");

const marker = '<pre class="full" id="example-code">';
const s = html.indexOf(marker);
const open = html.indexOf(">", s) + 1;
const e = html.indexOf("</pre>", open);
const code = html.slice(open, e);

if (code.length !== 16177) throw new Error(`code length ${code.length} != 16177`);

const example = {
  context: "A short, self-contained analysis that traces all eight stages on synthetic data — generated inline so the script runs in any notebook without an external file. Two questions are addressed of the Saint Mary's data: <em>which wards have the longest length of stay</em>, and <em>which DRGs are loss-making</em>.",
  quickStages: "<strong>What the script does, by stage:</strong><br>\n(1) generates a small Saint Mary's dataset with deliberate irregularities;\n(2) inspects shape, types, and missingness;\n(3) cleans gender labels, sentinel values, and missing length of stay;\n(4) derives margin and a loss indicator;\n(5) aggregates length of stay by ward and margin by DRG;\n(6) merges encounters with the DRG catalogue and the patient register;\n(7) produces a two-panel figure;\n(8) writes the summaries and the enriched table to disk.",
  copyNote: "The script may be copied into a Jupyter notebook and executed top to bottom. It requires <code>pandas</code>, <code>numpy</code>, and <code>matplotlib</code> — already part of a standard scientific Python installation.",
  code,
  footerNote: "The synthetic data is regenerated with a fixed random seed, so the numerical results are reproducible. To work with the actual Saint Mary's files, replace Step 1 with <code>pd.read_csv(...)</code> calls against <code>data/patients.csv</code>, <code>data/encounters.csv</code>, and <code>data/drg_catalog.csv</code>."
};

writeFileSync("data/example.json", JSON.stringify(example, null, 2) + "\n", "utf8");
console.log(`example.json written, code=${code.length} chars`);
