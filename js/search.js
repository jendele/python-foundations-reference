/* ============================================================
   SEARCH — question → command suggestion, plus the Ask overlay.

   v6 kept CORPUS and SYNONYMS as globals. Here they arrive via
   initSearch(corpus, synonyms) once app.js has fetched the JSON.
   The matching logic itself is unchanged from v6.
   ============================================================ */
const Search = (() => {
  let CORPUS = [];
  let SYNONYMS = {};

  /* Expand a query token to its synonym set, in both directions:
     a key maps to its values, and any value maps back to its key
     and that key's other values. */
  function expand(token) {
    const t = token.toLowerCase();
    const out = new Set([t]);
    if (SYNONYMS[t]) SYNONYMS[t].forEach(s => out.add(s));
    for (const [key, vals] of Object.entries(SYNONYMS)) {
      if (vals.includes(t)) {
        out.add(key);
        vals.forEach(v => out.add(v));
      }
    }
    return [...out];
  }

  function tokenize(s) {
    return s.toLowerCase()
            .replace(/[^a-zA-Zäöüß0-9 _\-]/g, " ")
            .split(/\s+/)
            .filter(t => t.length > 1 && !["the","a","an","i","my","to","do","how","with","of","in","on","for","is","are"].includes(t));
  }

  /* Tag hits weigh most heavily; id/short next; what/code least. */
  function score(cmd, queryTokens) {
    let s = 0;
    const expanded = new Set();
    queryTokens.forEach(t => expand(t).forEach(e => expanded.add(e)));

    for (const t of expanded) {
      if (cmd.tags && cmd.tags.includes(t)) s += 4;
      if (cmd.id.toLowerCase().includes(t)) s += 2;
      if (cmd.short.toLowerCase().includes(t)) s += 2;
      if (cmd.what.toLowerCase().includes(t)) s += 1;
      if (cmd.code.toLowerCase().includes(t)) s += 1;
    }
    return s;
  }

  function suggest(query) {
    const out = document.getElementById("suggestions");
    if (!query.trim()) { out.innerHTML = ""; return; }
    const qt = tokenize(query);
    const ranked = CORPUS
      .map(c => ({ ...c, _s: score(c, qt) }))
      .filter(c => c._s > 0)
      .sort((a, b) => b._s - a._s)
      .slice(0, 6);

    const closeBtnHtml = `<button class="sg-close" aria-label="Hide suggestions">× hide</button>`;
    const clearAll = () => {
      out.innerHTML = "";
      document.getElementById("q").value = "";
    };

    if (!ranked.length) {
      out.innerHTML = `<div class="sg-header"><span>No matches</span>${closeBtnHtml}</div>
                       <div class="empty">No matching commands found. Try keywords such as <em>missing, group, merge, plot, sort, count</em>.</div>`;
      out.querySelector(".sg-close").addEventListener("click", clearAll);
      return;
    }

    const hitsHtml = ranked.map(c => `
      <div class="hit" data-id="${c.id}">
        <div><code>${c.code}</code></div>
        <div class="why">${c.short} <em style="color:var(--grey-light);">— stage: ${c.stage}</em></div>
      </div>`).join("");

    out.innerHTML = `<div class="sg-header"><span>${ranked.length} suggestion${ranked.length === 1 ? "" : "s"}</span>${closeBtnHtml}</div>` + hitsHtml;
    out.querySelector(".sg-close").addEventListener("click", clearAll);

    out.querySelectorAll(".hit").forEach(h => {
      h.addEventListener("click", () => {
        const id = h.dataset.id;
        const el = document.getElementById("cmd-" + id);
        if (el) {
          // Open the parent stage-bar so the command is reachable.
          let p = el.parentElement;
          while (p && !p.classList.contains("stage-bar")) p = p.parentElement;
          if (p) p.open = true;
          el.open = true;
          const ov = document.getElementById("ask-overlay");
          if (ov) ov.classList.remove("open");
          setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 220);
        }
      });
    });
  }

  /* Ask overlay open/close + keyboard + outside click. */
  function wireAskOverlay() {
    const askFab     = document.getElementById("ask-fab");
    const askOverlay = document.getElementById("ask-overlay");
    const askClose   = document.getElementById("ask-close");

    function openAsk() {
      if (!askOverlay) return;
      askOverlay.classList.add("open");
      setTimeout(() => { const q = document.getElementById("q"); if (q) q.focus(); }, 50);
    }
    function closeAsk() {
      if (askOverlay) askOverlay.classList.remove("open");
    }

    if (askFab)   askFab.addEventListener("click", openAsk);
    if (askClose) askClose.addEventListener("click", closeAsk);
    if (askOverlay) {
      askOverlay.addEventListener("click", e => {
        if (e.target === askOverlay) closeAsk();
      });
    }
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && askOverlay && askOverlay.classList.contains("open")) closeAsk();
    });

    document.getElementById("ask").addEventListener("click", () => suggest(document.getElementById("q").value));
    document.getElementById("q").addEventListener("keydown", e => {
      if (e.key === "Enter") suggest(e.target.value);
      if (e.key === "Escape") {
        document.getElementById("suggestions").innerHTML = "";
        e.target.value = "";
      }
    });
    document.getElementById("q").addEventListener("input", e => {
      if (!e.target.value.trim()) document.getElementById("suggestions").innerHTML = "";
    });
    document.querySelectorAll(".ask-panel .hint span").forEach(s => {
      s.addEventListener("click", () => {
        document.getElementById("q").value = s.dataset.q;
        suggest(s.dataset.q);
      });
    });
  }

  function initSearch(corpus, synonyms) {
    CORPUS = corpus;
    SYNONYMS = synonyms;
    wireAskOverlay();
  }

  // expand() is shared with the glossary drawer's synonym-aware search.
  return { initSearch, expand };
})();
