// Sanity check in a real browser (Playwright/Chromium). The jsdom probe
// proved the render logic correct against real data; this confirms it in
// an actual browser and captures any console error.
import { chromium } from "playwright";

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
  ["stage bars = 10 (8 stages + decisions + example)", r.stageBars === 10],
  ["command cards = 57", r.cmds === 57],
  ["decision boxes = 3", r.decisions === 3],
  ["decision options = 16", r.opts === 16],
  ["kill options = 2", r.killOpts === 2],
  ["fill options = 13", r.fillOpts === 13],
  ["ignore options = 1", r.ignoreOpts === 1],
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
