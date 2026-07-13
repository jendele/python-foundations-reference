/* ============================================================
   TASKS — the Random Task button: practice quizzes & exercises.

   Draws one card at random from tasks.json. Three card types,
   discriminated by `type`:
     concept — single-correct multiple choice
     read    — show code, predict the result (multiple choice)
     code    — write a one-liner; reveal hint then solution

   A task may carry a `dataset` key naming a shared mini-DataFrame
   (tasks.json → datasets); its pandas construction is shown as a
   copyable block so the student can paste it into a notebook and
   actually run the exercise.

   Spaced-repetition light: cards answered correctly are recorded
   in localStorage and de-prioritised on later draws (PROJECT_BRIEF
   §7.1). The overlay reuses the Ask modal's open/close + focus-trap
   conventions for consistency.

   tasks.json is { datasets, tasks }; a legacy bare array is still
   accepted. initTasks(data, corpus) is called by app.js once loaded.
   ============================================================ */
const Tasks = (() => {
  let TASKS = [];
  let DATASETS = {};
  let CORPUS_IDS = new Set();
  const LS_KEY = "pf_task_progress_v1";

  /* ---- progress (localStorage; degrades silently if unavailable) ---- */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
    catch (_) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(p)); }
    catch (_) { /* private mode / disabled storage — feature still works */ }
  }
  function markCorrect(id) {
    const p = loadProgress();
    p[id] = (p[id] || 0) + 1;
    saveProgress(p);
  }
  function resetProgress() { saveProgress({}); }

  /* Weighted random draw: unseen cards weight 1; each correct answer
     halves a card's weight, so mastered cards keep appearing only
     rarely rather than never. An optional stage filter narrows the pool. */
  function pickTask(stageFilter) {
    const progress = loadProgress();
    const pool = TASKS.filter(t => !stageFilter || t.stage === stageFilter);
    if (!pool.length) return null;
    const weighted = pool.map(t => {
      const correct = progress[t.id] || 0;
      return { task: t, w: 1 / Math.pow(2, correct) };
    });
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of weighted) {
      r -= x.w;
      if (r <= 0) return x.task;
    }
    return weighted[weighted.length - 1].task;
  }

  /* ---- corpus cross-links: open the stage-bar + command card ---- */
  function relatedLinks(ids) {
    const valid = (ids || []).filter(id => CORPUS_IDS.has(id));
    if (!valid.length) return "";
    const chips = valid.map(id =>
      `<button type="button" class="task-rel" data-id="${id}"><code>${id}</code></button>`).join("");
    return `<div class="task-related"><span class="label">See in the reference</span>${chips}</div>`;
  }
  function gotoCommand(id) {
    const el = document.getElementById("cmd-" + id);
    if (!el) return;
    let p = el.parentElement;
    while (p && !p.classList.contains("stage-bar")) p = p.parentElement;
    if (p) p.open = true;
    el.open = true;
    closeOverlay();
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const s = el.querySelector("summary");
      if (s) s.focus();
    }, 240);
  }

  /* ---- render one card into the panel body ---- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  function renderTask(task) {
    const body = document.getElementById("task-body");
    if (!task) {
      body.innerHTML = `<p class="task-empty">No tasks available for this filter.</p>`;
      return;
    }
    const typeLabel = { concept: "Concept quiz", read: "Read &amp; predict", code: "Code challenge" }[task.type] || task.type;
    const codeBlock = task.code
      ? `<pre class="task-code">${escapeHtml(task.code)}</pre>` : "";

    // A task may name a shared mini-DataFrame so the student can paste it
    // into a notebook and actually run the exercise. The setup code is the
    // pandas construction; it is copyable like the worked example.
    const ds = task.dataset && DATASETS[task.dataset];
    const datasetBlock = ds ? `
      <div class="task-dataset">
        <div class="task-dataset-head">
          <span class="label">Sample data — paste into a notebook to try it</span>
          <button type="button" class="task-copy" aria-label="Copy the sample data">Copy</button>
        </div>
        <div class="task-dataset-label">${ds.label || task.dataset}</div>
        <pre class="task-setup">${escapeHtml(ds.setup)}</pre>
      </div>` : "";

    let interactive = "";
    if (task.type === "concept" || task.type === "read") {
      interactive = `<div class="task-options" role="group" aria-label="Answer options">` +
        task.options.map((o, i) =>
          `<button type="button" class="task-opt" data-i="${i}">${o}</button>`).join("") +
        `</div>`;
    } else { // code
      interactive = `
        <div class="task-code-actions">
          <button type="button" class="task-reveal" data-step="hint">Show hint</button>
          <button type="button" class="task-reveal" data-step="solution">Show solution</button>
        </div>
        <div class="task-hint" hidden><span class="label">Hint</span> ${task.hint || "—"}</div>
        <pre class="task-solution" hidden>${escapeHtml(task.solution)}</pre>`;
    }

    body.dataset.taskType = task.type;
    body.dataset.taskId = task.id;
    body.innerHTML = `
      <div class="task-meta">
        <span class="task-type">${typeLabel}</span>
        <span class="task-stage">stage: ${task.stage}</span>
      </div>
      <div class="task-question">${task.question}</div>
      ${datasetBlock}
      ${codeBlock}
      ${interactive}
      <div class="task-why" hidden><span class="label">Why</span> ${task.why}</div>
      ${relatedLinks(task.related)}`;

    wireCard(task);
  }

  function revealOutcome(task, chosen) {
    const body = document.getElementById("task-body");
    const opts = [...body.querySelectorAll(".task-opt")];
    opts.forEach((b, i) => {
      b.disabled = true;
      if (i === task.correct) b.classList.add("correct");
      if (i === chosen && chosen !== task.correct) b.classList.add("wrong");
    });
    if (chosen === task.correct) markCorrect(task.id);
    const why = body.querySelector(".task-why");
    if (why) why.hidden = false;
  }

  function wireCard(task) {
    const body = document.getElementById("task-body");

    body.querySelectorAll(".task-opt").forEach(btn => {
      btn.addEventListener("click", () => revealOutcome(task, Number(btn.dataset.i)));
    });

    body.querySelectorAll(".task-reveal").forEach(btn => {
      btn.addEventListener("click", () => {
        const step = btn.dataset.step;
        const target = body.querySelector(step === "hint" ? ".task-hint" : ".task-solution");
        if (target) target.hidden = false;
        btn.disabled = true;
        if (step === "solution") {
          markCorrect(task.id); // self-assessed: revealing solution counts as practised
          const why = body.querySelector(".task-why");
          if (why) why.hidden = false;
        }
      });
    });

    body.querySelectorAll(".task-rel").forEach(b => {
      b.addEventListener("click", () => gotoCommand(b.dataset.id));
    });

    const copyBtn = body.querySelector(".task-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const text = body.querySelector(".task-setup").textContent;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
          fallbackCopy(text);
        }
        copyBtn.textContent = "Copied ✓";
        copyBtn.classList.add("done");
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("done");
        }, 1600);
      });
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    document.body.removeChild(ta);
  }

  /* ---- overlay open/close (mirrors the Ask modal, incl. focus trap) ---- */
  let returnFocusTo = null;
  function openOverlay() {
    const ov = document.getElementById("task-overlay");
    if (!ov) return;
    returnFocusTo = document.activeElement;
    ov.classList.add("open");
    ov.setAttribute("aria-hidden", "false");
    drawNew();
    setTimeout(() => {
      const c = document.getElementById("task-close");
      if (c) c.focus();
    }, 50);
  }
  function closeOverlay() {
    const ov = document.getElementById("task-overlay");
    if (!ov) return;
    ov.classList.remove("open");
    ov.setAttribute("aria-hidden", "true");
    if (returnFocusTo && typeof returnFocusTo.focus === "function") returnFocusTo.focus();
    returnFocusTo = null;
  }
  function trapFocus(e) {
    const ov = document.getElementById("task-overlay");
    if (e.key !== "Tab" || !ov.classList.contains("open")) return;
    const list = [...ov.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null && !el.disabled);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function currentStageFilter() {
    const sel = document.getElementById("task-stage-filter");
    return sel && sel.value ? sel.value : "";
  }
  function drawNew() {
    renderTask(pickTask(currentStageFilter()));
  }

  function populateStageFilter() {
    const sel = document.getElementById("task-stage-filter");
    if (!sel) return;
    const stages = [...new Set(TASKS.map(t => t.stage))].sort();
    sel.innerHTML = `<option value="">All stages</option>` +
      stages.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  function wireOverlay() {
    const fab   = document.getElementById("task-fab");
    const ov    = document.getElementById("task-overlay");
    const close = document.getElementById("task-close");
    if (fab)   fab.addEventListener("click", openOverlay);
    if (close) close.addEventListener("click", closeOverlay);
    if (ov) {
      ov.addEventListener("click", e => { if (e.target === ov) closeOverlay(); });
      ov.addEventListener("keydown", trapFocus);
    }
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && ov && ov.classList.contains("open")) closeOverlay();
    });
    const next = document.getElementById("task-next");
    if (next) next.addEventListener("click", drawNew);
    const sel = document.getElementById("task-stage-filter");
    if (sel) sel.addEventListener("change", drawNew);
    const reset = document.getElementById("task-reset");
    if (reset) reset.addEventListener("click", () => {
      resetProgress();
      reset.textContent = "Progress reset ✓";
      setTimeout(() => { reset.textContent = "Reset progress"; }, 1600);
      drawNew();
    });
  }

  function initTasks(tasksData, corpus) {
    // tasksData is either the legacy bare array or { datasets, tasks }.
    if (Array.isArray(tasksData)) {
      TASKS = tasksData;
      DATASETS = {};
    } else if (tasksData && typeof tasksData === "object") {
      TASKS = Array.isArray(tasksData.tasks) ? tasksData.tasks : [];
      DATASETS = tasksData.datasets || {};
    } else {
      TASKS = [];
      DATASETS = {};
    }
    CORPUS_IDS = new Set((corpus || []).map(c => c.id));
    const fab = document.getElementById("task-fab");
    // No tasks authored yet → hide the button rather than show an empty modal.
    if (!TASKS.length) { if (fab) fab.style.display = "none"; return; }
    populateStageFilter();
    wireOverlay();
  }

  return { initTasks };
})();
