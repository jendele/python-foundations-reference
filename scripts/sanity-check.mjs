// Sanity check in a real browser (Playwright/Chromium). The jsdom probe
// proved the render logic correct against real data; this confirms it in
// an actual browser and captures any console error.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// Expected counts derive from the data files so the check stays correct as
// §6 grows, instead of hardcoded baselines that rot on every content commit.
const corpus = JSON.parse(readFileSync("data/corpus.json", "utf8"));
const decisionsData = JSON.parse(readFileSync("data/decisions.json", "utf8"));
const EXPECT_CARDS = corpus.length;
// One stage bar per distinct corpus stage that has a section, plus the
// decisions and worked-example bars.
const EXPECT_STAGES = new Set(corpus.map(c => c.stage)).size;
const EXPECT_BARS = EXPECT_STAGES + 2;
const EXPECT_BOXES = decisionsData.boxes.length;
const allOpts = decisionsData.boxes.flatMap(b => b.options);
const EXPECT_OPTS = allOpts.length;
const kindCount = k => allOpts.filter(o => o.kind === k).length;

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto("http://127.0.0.1:8137/index.html", { waitUntil: "domcontentloaded" });
await page.waitForSelector("details.cmd", { state: "attached", timeout: 15000 });

const r = await page.evaluate(() => ({
  stageBars: document.querySelectorAll("details.stage-bar").length,
  cmds: document.querySelectorAll("details.cmd").length,
  decisions: document.querySelectorAll(".decision").length,
  opts: document.querySelectorAll(".decision .opt").length,
  killOpts: document.querySelectorAll(".decision .opt.kill").length,
  fillOpts: document.querySelectorAll(".decision .opt.fill").length,
  ignoreOpts: document.querySelectorAll(".decision .opt.ignore").length,
  // JSON `code` is 16177 chars *with* highlight markup; injected via
  // innerHTML it round-trips exactly, so compare innerHTML length.
  exampleCodeHTML: (document.getElementById("example-code") || {}).innerHTML?.length || 0,
  exampleHasSpans: !!document.querySelector("#example-code span.c"),
  glossaryLinks: document.querySelectorAll(".glossary-link").length,
  copyBtn: !!document.getElementById("copy-example"),
  hero: !!document.getElementById("s0"),
}));

await page.click("#open-glossary");
await page.fill("#g-search", "axis");
const glossaryHits = await page.evaluate(() => document.querySelectorAll("#g-results .entry").length);
await page.click("#close-glossary");

await page.click("#ask-fab");
await page.fill("#q", "average length of stay per ward");
await page.click("#ask");
await page.waitForTimeout(200);
const askHits = await page.evaluate(() => document.querySelectorAll("#suggestions .hit").length);

await browser.close();

const checks = [
  [`stage bars = ${EXPECT_BARS} (${EXPECT_STAGES} stages + decisions + example)`, r.stageBars === EXPECT_BARS],
  [`command cards = ${EXPECT_CARDS} (every corpus entry rendered)`, r.cmds === EXPECT_CARDS],
  [`decision boxes = ${EXPECT_BOXES}`, r.decisions === EXPECT_BOXES],
  [`decision options = ${EXPECT_OPTS}`, r.opts === EXPECT_OPTS],
  [`kill options = ${kindCount("kill")}`, r.killOpts === kindCount("kill")],
  [`fill options = ${kindCount("fill")}`, r.fillOpts === kindCount("fill")],
  [`ignore options = ${kindCount("ignore")}`, r.ignoreOpts === kindCount("ignore")],
  ["example code round-trips (16177 chars HTML)", r.exampleCodeHTML === 16177],
  ["example code keeps highlight spans", r.exampleHasSpans],
  ["glossary auto-links present (>50)", r.glossaryLinks > 50],
  ["copy button present", r.copyBtn],
  ["hero present", r.hero],
  ["glossary search returns hits", glossaryHits > 0],
  ["ask search returns hits", askHits > 0],
  ["no console errors", errors.length === 0],
];

let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`);
  if (!pass) ok = false;
}
console.log("\nraw:", JSON.stringify({ ...r, glossaryHits, askHits, errors }));
process.exit(ok ? 0 : 1);
