/* ============================================================
   GLOSSARY — auto-linker over prose, plus the drawer.

   v6 kept GLOSSARY global and called autoLinkGlossary() once.
   Here the data arrives via initGlossary(glossary); app.js calls
   Glossary.autoLink(root) after all content has been rendered so
   the sweep also covers the decision and example regions.
   Synonym-aware drawer search reuses Search.expand().
   ============================================================ */
const Glossary = (() => {
  let GLOSSARY = [];

  /* Walk all prose under `root`, wrapping the first occurrence of each
     glossary term (or synonym) per scope in a clickable span. Code blocks,
     headings, buttons, and the drawer itself are skipped. Limiting to one
     link per term per scope keeps visual density down. */
  function autoLink(root) {
    if (!root) return;
    const patterns = [];
    GLOSSARY.forEach(e => {
      patterns.push({ pat: e.term, key: e.term });
      e.syn.forEach(s => patterns.push({ pat: s, key: e.term }));
    });
    patterns.sort((a, b) => b.pat.length - a.pat.length);

    // Suppress generic short tokens that would match too liberally in prose.
    const ignore = new Set(["df","col","cols","na","na ","null","type","case","row","list","set","key","col.","arr"]);
    const filtered = patterns.filter(p => p.pat.length >= 4 && !ignore.has(p.pat.toLowerCase()));

    // Guard: with no patterns, "\\b(" + "" + ")\\b" is /\b()\b/ — an
    // empty-capture regex that matches zero-width at every position and
    // spins exec() forever. Nothing to link anyway, so bail.
    if (!filtered.length) return;
    const escaped = filtered.map(p => p.pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi");

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent || node.textContent.trim().length < 6) return NodeFilter.FILTER_REJECT;
        let p = node.parentElement;
        while (p && p !== root) {
          const tag = p.tagName;
          if (tag === "CODE" || tag === "PRE" || tag === "BUTTON" || tag === "INPUT" ||
              tag === "SCRIPT" || tag === "STYLE" || tag === "SUMMARY" ||
              tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4") {
            return NodeFilter.FILTER_REJECT;
          }
          if (p.classList && p.classList.contains("glossary-link")) return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    const linkedByScope = new WeakMap();
    const getScope = (n) => {
      let s = n.parentElement;
      while (s && s !== root) {
        if (s.classList) {
          if (s.classList.contains("cmd") || s.classList.contains("decision") ||
              s.classList.contains("stage-bar") || s.classList.contains("hero") ||
              s.classList.contains("intro") || s.classList.contains("example") ||
              s.classList.contains("orient") || s.classList.contains("context") ||
              s.classList.contains("card")) return s;
        }
        s = s.parentElement;
      }
      return root;
    };

    nodes.forEach(node => {
      regex.lastIndex = 0;
      const txt = node.textContent;
      if (!regex.test(txt)) return;
      regex.lastIndex = 0;

      const scope = getScope(node);
      if (!linkedByScope.has(scope)) linkedByScope.set(scope, new Set());
      const seen = linkedByScope.get(scope);

      const frag = document.createDocumentFragment();
      let lastIdx = 0;
      let m;
      let replaced = false;
      while ((m = regex.exec(txt)) !== null) {
        const matched = m[0];
        const tm = filtered.find(p => p.pat.toLowerCase() === matched.toLowerCase());
        if (!tm) continue;
        if (seen.has(tm.key)) continue;
        seen.add(tm.key);
        if (m.index > lastIdx) frag.appendChild(document.createTextNode(txt.slice(lastIdx, m.index)));
        const span = document.createElement("span");
        span.className = "glossary-link";
        span.dataset.term = tm.key;
        span.textContent = matched;
        frag.appendChild(span);
        lastIdx = m.index + matched.length;
        replaced = true;
      }
      if (!replaced) return;
      if (lastIdx < txt.length) frag.appendChild(document.createTextNode(txt.slice(lastIdx)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  function glossaryMatch(entry, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const exp = new Set([q]);
    Search.expand(q).forEach(e => exp.add(e));
    for (const t of exp) {
      if (entry.term.toLowerCase().includes(t)) return true;
      if (entry.def.toLowerCase().includes(t)) return true;
      if (entry.syn.some(s => s.toLowerCase().includes(t))) return true;
    }
    return false;
  }

  function renderGlossary(q) {
    const results = document.getElementById("g-results");
    const sorted = [...GLOSSARY].sort((a, b) => a.term.toLowerCase().localeCompare(b.term.toLowerCase()));
    const hits = sorted.filter(e => glossaryMatch(e, q));
    if (!hits.length) {
      results.innerHTML = `<div class="empty">No entries match "${q}".</div>`;
      return;
    }
    // If a specific term was clicked, surface that entry at the top.
    if (q && hits.length > 1) {
      const exact = hits.findIndex(e => e.term.toLowerCase() === q.toLowerCase());
      if (exact > 0) { const [pulled] = hits.splice(exact, 1); hits.unshift(pulled); }
    }
    results.innerHTML = hits.map(e => `
      <div class="entry">
        <div class="term">${e.term}<span class="syn">${e.syn.join(" · ")}</span></div>
        <div class="def">${e.def}</div>
      </div>`).join("");
  }

  function wireDrawer() {
    const glossaryEl = document.getElementById("glossary");
    const scrim = document.getElementById("scrim");

    function openGlossary() { glossaryEl.classList.add("open"); scrim.classList.add("open"); renderGlossary(""); }
    function closeGlossary() { glossaryEl.classList.remove("open"); scrim.classList.remove("open"); }

    document.getElementById("open-glossary").addEventListener("click", openGlossary);
    document.getElementById("close-glossary").addEventListener("click", closeGlossary);
    scrim.addEventListener("click", closeGlossary);
    document.getElementById("g-search").addEventListener("input", e => renderGlossary(e.target.value));

    /* Click an inline glossary-link anywhere → open the drawer to that term. */
    document.body.addEventListener("click", e => {
      if (e.target.classList.contains("glossary-link")) {
        const term = e.target.dataset.term;
        openGlossary();
        document.getElementById("g-search").value = term;
        renderGlossary(term);
      }
    });
  }

  // setData must run before autoLink (it needs the terms to build the
  // matcher); wireDrawer only attaches event listeners and may run later.
  function setData(glossary) { GLOSSARY = glossary; }
  function initGlossary(glossary) {
    GLOSSARY = glossary;
    wireDrawer();
  }

  return { setData, initGlossary, autoLink };
})();
