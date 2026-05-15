/* ============================================================
   APP — data loader and render orchestrator.

   Fetches the data/ JSON files, renders command cards, decision
   boxes and the worked example into their mount points, converts
   the stage sections into accordion bars, then runs the glossary
   auto-linker over the whole container.

   Render order (confirmed for this refactor):
     renderCommands → renderDecisions → renderExample
       → convertToAccordion → Glossary.autoLink(.container)
   so the auto-linker sweeps the freshly rendered decision and
   example regions as well as the command cards.
   ============================================================ */
(async function main() {
  let corpus, glossary, synonyms, tasks, decisions, example;
  try {
    [corpus, glossary, synonyms, tasks, decisions, example] = await Promise.all([
      fetch("data/corpus.json").then(r => r.json()),
      fetch("data/glossary.json").then(r => r.json()),
      fetch("data/synonyms.json").then(r => r.json()),
      fetch("data/tasks.json").then(r => r.json()),
      fetch("data/decisions.json").then(r => r.json()),
      fetch("data/example.json").then(r => r.json())
    ]);
  } catch (err) {
    // Most common cause: opening index.html via file:// (fetch blocked).
    document.querySelector(".container").insertAdjacentHTML("afterbegin",
      `<section class="card"><h2>Could not load data</h2>
       <p>The data files failed to load (${err}). Serve the site over HTTP
       — for example <code>python -m http.server</code> — rather than opening
       <code>index.html</code> directly from disk.</p></section>`);
    return;
  }

  /* ---- command cards ---- */
  function renderCmd(c) {
    const tokens = c.tokens.map(([code, expl]) => `
      <div class="row"><code>${code}</code><div>${expl}</div></div>`).join("");
    const required  = c.requires.length  ? `<li>${c.requires.join("</li><li>")}</li>`  : "<li>none</li>";
    const important = c.important.length ? `<li>${c.important.join("</li><li>")}</li>` : "<li>—</li>";
    const avoid     = c.avoid.length     ? `<li>${c.avoid.join("</li><li>")}</li>`     : "<li>—</li>";

    return `
      <details class="cmd" id="cmd-${c.id}">
        <summary><code>${c.code}</code><span class="short">${c.short}</span></summary>
        <div class="body">
          <h4>What it does</h4>
          <p class="what">${c.what}</p>
          <h4>What the code means</h4>
          <div class="tokens">${tokens}</div>
          <h4>Conditions</h4>
          <div class="cond">
            <div class="req"><span class="label">Requires</span><ul style="margin:0;padding-left:18px;">${required}</ul></div>
            <div class="imp"><span class="label">Important when</span><ul style="margin:0;padding-left:18px;">${important}</ul></div>
            <div class="avoid"><span class="label">Avoid when</span><ul style="margin:0;padding-left:18px;">${avoid}</ul></div>
          </div>
          <h4>When to reach for this</h4>
          <div class="reach">${c.reach}</div>
          <h4>Example</h4>
          ${c.example}
        </div>
      </details>`;
  }

  function renderCommands() {
    document.querySelectorAll(".commands").forEach(div => {
      const stage = div.dataset.stage;
      div.innerHTML = corpus.filter(c => c.stage === stage).map(renderCmd).join("");
    });
  }

  /* ---- decision boxes ---- */
  function renderDecisions() {
    const mount = document.querySelector("[data-decisions]");
    if (!mount) return;
    const boxes = decisions.boxes.map(box => {
      const intro = box.intro
        ? `<p style="font-size:14px;margin:6px 0 10px;">${box.intro}</p>` : "";
      const note = box.note
        ? `<p style="font-size:13px;margin-top:10px;color:#666;">${box.note}</p>` : "";
      const opts = box.options.map(o => {
        // kind drives the v6 colour coding; "neutral" carries no extra class.
        const cls = o.kind && o.kind !== "neutral" ? ` ${o.kind}` : "";
        const code = o.code ? `<code>${o.code}</code>` : "";
        return `<div class="opt${cls}"><span class="label">${o.label}</span>${code}${o.body || ""}</div>`;
      }).join("");
      return `
        <div class="decision">
          <h4>${box.title}</h4>
          ${intro}
          <div class="options">${opts}</div>
          ${note}
        </div>`;
    }).join("");
    mount.innerHTML =
      `<p style="font-size:14.5px;">${decisions.lede}</p>` + boxes;
  }

  /* ---- worked example ---- */
  function renderExample() {
    const mount = document.querySelector("[data-example]");
    if (!mount) return;
    mount.innerHTML = `
      <div class="context">${example.context}</div>
      <div class="quick-stages">${example.quickStages}</div>
      <div class="copy-row">
        <div class="label">${example.copyNote}</div>
        <button class="copy-btn" id="copy-example">Copy code</button>
      </div>
      <pre class="full" id="example-code">${example.code}</pre>
      <p class="footer-note">${example.footerNote}</p>`;
  }

  /* ---- stage sections → accordion bars (verbatim v6 transform) ---- */
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function convertToAccordion() {
    document.querySelectorAll("section.card").forEach(sec => {
      const h2 = sec.querySelector("h2");
      if (!h2) return;
      const numSpan = h2.querySelector(".num");
      const num = numSpan ? numSpan.textContent.trim() : "";
      let title = h2.textContent.trim();
      if (num) title = title.replace(new RegExp("^\\s*" + escapeRegex(num) + "\\s*"), "").trim();
      let mainTitle = title, desc = "";
      const dashIdx = title.indexOf("—");
      if (dashIdx > -1) {
        mainTitle = title.slice(0, dashIdx).trim();
        desc = title.slice(dashIdx + 1).trim();
        desc = desc.charAt(0).toUpperCase() + desc.slice(1);
        if (desc && !/[.?!]$/.test(desc)) desc += ".";
      }
      let stepLabel;
      if (num === "★") stepLabel = "Decisions";
      else if (num === "▣") stepLabel = "Example";
      else if (/^\d+$/.test(num)) stepLabel = "Step " + num;
      else stepLabel = num || "—";

      const details = document.createElement("details");
      details.className = "stage-bar";
      details.id = sec.id;
      if (sec.classList.contains("example")) details.classList.add("example");

      const summary = document.createElement("summary");
      summary.innerHTML =
        '<span class="bar-num">' + stepLabel + '</span>' +
        '<span class="bar-title">' + mainTitle + '</span>' +
        '<span class="bar-desc">' + desc + '</span>';

      const body = document.createElement("div");
      body.className = "bar-body";
      Array.from(sec.childNodes).forEach(child => {
        if (child !== h2) body.appendChild(child);
      });
      details.appendChild(summary);
      details.appendChild(body);
      sec.replaceWith(details);
    });
  }

  /* ---- back to top ---- */
  function wireBackTop() {
    const backTop = document.getElementById("back-top");
    if (!backTop) return;
    backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    window.addEventListener("scroll", () => {
      if (window.scrollY > 600) backTop.classList.add("visible");
      else backTop.classList.remove("visible");
    });
  }

  /* ---- open a stage bar when navigated to by anchor (#s1, #example…) ---- */
  function wireHashNav() {
    function openByHash() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el && el.tagName === "DETAILS") {
        el.open = true;
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    }
    window.addEventListener("hashchange", openByHash);
    openByHash();
  }

  /* ---- worked-example copy button ---- */
  function wireCopyButton() {
    const copyBtn = document.getElementById("copy-example");
    if (!copyBtn) return;
    copyBtn.addEventListener("click", () => {
      const code = document.getElementById("example-code").textContent;
      if (!navigator.clipboard) {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (_) {}
        document.body.removeChild(ta);
      } else {
        navigator.clipboard.writeText(code);
      }
      const original = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";
      copyBtn.classList.add("done");
      setTimeout(() => {
        copyBtn.textContent = original;
        copyBtn.classList.remove("done");
      }, 1800);
    });
  }

  // --- run, in the confirmed order ---
  // autoLink needs the glossary terms to build its matcher, so the data
  // must be set before it runs; the drawer wiring can happen afterwards.
  Glossary.setData(glossary);

  renderCommands();
  renderDecisions();
  renderExample();
  convertToAccordion();
  Glossary.autoLink(document.querySelector(".container"));

  Search.initSearch(corpus, synonyms);
  Glossary.initGlossary(glossary);
  wireBackTop();
  wireHashNav();
  wireCopyButton();
})();
