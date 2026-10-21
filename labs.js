// ============================================================================
// LAB ENGINE (multi-step tool labs)
// ----------------------------------------------------------------------------
// Loaded after questions.js + lab_questions.js and before ctf.js / app.js.
//
//  * EDU_TASKS        -> the Education list: CEH_QUESTIONS with tool labs swapped in
//                        and hidden tasks removed (see lab_questions.js).
//  * Labs             -> a task with steps[]. getActiveTask() returns the lab merged with
//                        the step being worked on, so every helper feature (breakdown card,
//                        typing guide, Intellisense HUD, hint, solution) just works per step.
//  * Progress         -> "s_<labId>_<n>" keys inside conceptSolved, so partial progress is
//                        saved by every existing save path (local, Supabase, Vercel, bucket).
// ============================================================================

function assembleEduTasks() {
  let list = CEH_QUESTIONS.slice();
  const labs = (typeof LAB_QUESTIONS !== "undefined") ? LAB_QUESTIONS : [];

  labs.forEach((lab) => {
    const replaced = new Set([lab.id].concat(lab.replaces || []));
    let at = list.findIndex((q) => replaced.has(q.id));
    if (at === -1 && lab.placeAfter) {
      const anchor = list.findIndex((q) => q.id === lab.placeAfter);
      if (anchor !== -1) at = anchor + 1;
    }
    if (at === -1) at = list.length;
    const insertAt = list.slice(0, at).filter((q) => !replaced.has(q.id)).length;
    list = list.filter((q) => !replaced.has(q.id));
    list.splice(insertAt, 0, lab);
  });

  const hidden = new Set(typeof HIDDEN_TASK_IDS !== "undefined" ? HIDDEN_TASK_IDS : []);
  return list.filter((q) => !hidden.has(q.id));
}

const EDU_TASKS = assembleEduTasks();

const LAB_STEP_FIELDS = ["task", "solution", "accepted", "hint", "diagnostics", "output", "highlightText", "prompt", "target", "analysisQuestion"];

let labViewStep = 0;        // step the student is looking at in the current lab
let labViewTaskId = null;   // lab the step above belongs to

function isLab(q) {
  return Boolean(q && Array.isArray(q.steps) && q.steps.length);
}

function labStepKey(q, i) {
  return `s_${q.id}_${i + 1}`;
}

// Steps finished by the current user (a solved lab counts as fully done)
function labStepsDone(q, user) {
  const u = user || currentUser;
  if (!isLab(q) || !u) return 0;
  if (Array.isArray(u.solved) && u.solved.includes(q.id)) return q.steps.length;
  const keys = Array.isArray(u.conceptSolved) ? u.conceptSolved : [];
  let n = 0;
  while (n < q.steps.length && keys.includes(labStepKey(q, n))) n++;
  return n;
}

// Furthest step the user may open (the tutor can preview every step)
function labUnlockedMax(q) {
  if (!isLab(q)) return 0;
  if (currentUser && currentUser.role === "admin") return q.steps.length - 1;
  return Math.min(labStepsDone(q), q.steps.length - 1);
}

function defaultLabStep(q) {
  return Math.min(labStepsDone(q), q.steps.length - 1);
}

// The lab merged with one of its steps: what the rest of the app treats as "the task"
function getTaskView(q, stepIdx) {
  if (!isLab(q)) return q;
  const i = Math.min(Math.max(stepIdx, 0), q.steps.length - 1);
  const step = q.steps[i];
  const view = Object.assign({}, q);
  LAB_STEP_FIELDS.forEach((f) => { if (step[f] !== undefined) view[f] = step[f]; });
  view.stepIndex = i;
  view.stepCount = q.steps.length;
  view.stepLabel = step.label || `Step ${i + 1}`;
  if (step.analysisQuestion) {
    // A step can carry its own optional concept question (+25 bonus, never blocks progress)
    view.conceptKey = `c_${q.id}_${i + 1}`;
    view.stepConcept = true;
  }
  return view;
}

function getActiveTask() {
  const q = ALL_TASKS[currentIndex];
  return isLab(q) ? getTaskView(q, labViewStep) : q;
}

// Called by loadQuestion: keep the same step when the same lab re-renders, reset for another lab
function syncLabViewStep(q) {
  if (!isLab(q)) {
    labViewTaskId = null;
    labViewStep = 0;
    return;
  }
  if (labViewTaskId !== q.id) {
    labViewTaskId = q.id;
    labViewStep = defaultLabStep(q);
  } else {
    labViewStep = Math.min(labViewStep, labUnlockedMax(q));
  }
}

function renderLabStepper(q) {
  const el = document.getElementById("labStepper");
  if (!el) return;
  if (!isLab(q)) {
    el.style.display = "none";
    el.innerHTML = "";
    return;
  }

  const done = labStepsDone(q);
  const max = labUnlockedMax(q);
  let lastGroup = null;
  const chips = q.steps.map((s, i) => {
    const cls = [
      "lab-step",
      i < done ? "done" : "",
      i === labViewStep ? "viewing" : "",
      i > max ? "locked" : ""
    ].join(" ");
    // Long labs (such as nmap) group their steps under small headings
    const heading = s.group && s.group !== lastGroup ? `<div class="lab-step-group">${escapeHtml(s.group)}</div>` : "";
    if (s.group) lastGroup = s.group;
    return `${heading}<button type="button" class="${cls}" ${i > max ? "disabled" : ""} onclick="goLabStep(${i})" title="${escapeHtml(s.label || "")}">
      <span class="lab-step-no">${i < done ? "✓" : i + 1}</span>
      <span class="lab-step-label">${escapeHtml(s.label || `Step ${i + 1}`)}</span>
    </button>`;
  }).join("");

  el.style.display = "block";
  el.innerHTML = `
    <div class="lab-stepper-head">
      <span class="lab-stepper-badge">🧪 TOOL LAB</span>
      <span class="lab-stepper-count">Step ${labViewStep + 1} of ${q.steps.length} · ${done} done</span>
    </div>
    <div class="lab-steps">${chips}</div>`;
}

// Switch to another step of the current lab
function goLabStep(i) {
  const q = ALL_TASKS[currentIndex];
  if (!isLab(q) || i < 0 || i >= q.steps.length || i > labUnlockedMax(q)) return;
  labViewStep = i;
  applyTaskView(q);
  hideGuidance();
  if (!(currentUser && currentUser.solved.includes(q.id))) elConceptCard.style.display = "none";
  renderLabStepper(q);
  updateCtfHintButton(q);
  if (elTerminalInput) elTerminalInput.focus();
}

function nextStepButton(q, from) {
  if (from + 1 >= q.steps.length) return "";
  return `<div><button class="btn-header" style="margin-top:8px;" onclick="goLabStep(${from + 1})">Continue to step ${from + 2}: ${escapeHtml(q.steps[from + 1].label || "")} &rarr;</button></div>`;
}

// A correct command was typed on a lab step
function handleLabStepSuccess(q) {
  const total = q.steps.length;
  const done = labStepsDone(q);
  const viewing = labViewStep;

  if (viewing !== done) {
    showGuidance("success", `<strong>Step ${viewing + 1} is already complete.</strong> Output shown again.${nextStepButton(q, viewing)}`);
    return;
  }

  if (!Array.isArray(currentUser.conceptSolved)) currentUser.conceptSolved = [];
  const key = labStepKey(q, viewing);
  if (!currentUser.conceptSolved.includes(key)) currentUser.conceptSolved.push(key);
  saveCurrentUser();

  if (done + 1 >= total) {
    completeLab(q);
    return;
  }

  renderLabStepper(q);
  renderQuestionGrid();
  showGuidance(
    "success",
    `<strong>Step ${viewing + 1} of ${total} complete!</strong> Read the output, then move on.${nextStepButton(q, viewing)}`
  );

  // Optional per-step concept question (bonus points, does not block the next step)
  if (q.steps[viewing].analysisQuestion) renderConceptQuestion(getTaskView(q, viewing), false);
}

// Last step finished: score the lab and open the concept question
function completeLab(q) {
  if (!currentUser.solved.includes(q.id)) {
    currentUser.solved.push(q.id);
    const penalty = (currentUser.penalties && currentUser.penalties[q.id]) || 0;
    const earned = Math.max(20, (q.points || 100) - penalty);
    currentUser.score += earned;
    saveCurrentUser();
    updateLeaderboardWithUser();
  }

  updateAuthUI();

  showGuidance(
    "success",
    `<strong>Lab Complete!</strong> All ${q.steps.length} steps done.<br>
     Now answer the <strong>CEH Purpose Check</strong> below to confirm your analysis.`
  );
  // Lab-level concept question; if the lab has none, fall back to the last step's own one
  const lastStep = q.steps.length - 1;
  if (q.analysisQuestion) renderConceptQuestion(q, false);
  else if (q.steps[lastStep].analysisQuestion) renderConceptQuestion(getTaskView(q, lastStep), false);

  const term = document.querySelector(".terminal-pane");
  term.classList.add("pulse-success");
  setTimeout(() => term.classList.remove("pulse-success"), 1000);
}

// ----------------------------------------------------------------------------
// Content self-test: run contentSelfTest() in the browser console after editing
// labs or CTFs. It checks every lab and CTF and returns the list of problems.
// ----------------------------------------------------------------------------
function contentSelfTest() {
  const problems = [];
  const warn = (m) => problems.push(m);
  const seen = new Set();

  const checkAccepted = (where, q, cmd) => {
    const rules = q.accepted;
    if (!Array.isArray(rules) || !rules.length) { warn(`${where}: no accepted rules`); return false; }
    if (!cmd) { warn(`${where}: no solution`); return false; }
    if (!rules.some((r) => matchesAcceptedRule(r, cmd))) { warn(`${where}: solution "${cmd}" is not accepted by its own rules`); return false; }
    return true;
  };

  const checkConcept = (where, aq) => {
    if (!aq) return;
    if (!aq.prompt || !Array.isArray(aq.options) || aq.options.length < 3) warn(`${where}: concept question needs a prompt and 3+ options`);
    else if (aq.options.filter((o) => o.correct).length !== 1) warn(`${where}: concept question needs exactly one correct option`);
    if (!aq.explanation) warn(`${where}: concept question has no explanation`);
  };

  ALL_TASKS.forEach((q) => {
    const tag = `${isCtfTask(q) ? "CTF" : "Task"} ${q.id}`;
    if (seen.has(q.id)) warn(`${tag}: duplicate id`);
    seen.add(q.id);
    if (!q.title || !q.scenario || !q.prompt || !q.target) warn(`${tag}: missing title, scenario, prompt or target`);
    if (!(q.module >= 1 && q.module <= 5)) warn(`${tag}: module must be 1 to 5`);
    if (!q.cehExamTip) warn(`${tag}: missing cehExamTip`);

    if (isCtfTask(q)) {
      const flag = getTaskFlag(q);
      if (!/^CEH\{[A-Za-z0-9_]+\}$/.test(flag)) warn(`${tag}: flag missing or malformed (${flag || "no flagEnc"})`);
      if (q.flagPlain) warn(`${tag}: flagPlain left in the source, encode it into flagEnc`);
      if (!Array.isArray(q.hints) || q.hints.length !== 3) warn(`${tag}: needs exactly 3 hints`);
      else if (q.hints[2].replace(/^Hint 3:\s*/, "").trim() !== q.solution) warn(`${tag}: hint 3 should be exactly the solution command`);
      if (!q.writeup) warn(`${tag}: missing writeup`);
      if (!q.output || (!q.output.includes("{{FLAG}}") && !q.derivedFlag)) warn(`${tag}: output has no {{FLAG}} (set derivedFlag: true if the flag is built from the output)`);
      if (q.pairedWith !== undefined && !EDU_TASKS.some((t) => t.id === q.pairedWith)) warn(`${tag}: pairedWith ${q.pairedWith} is not an Education task`);
      checkAccepted(tag, q, q.solution);
      return;
    }

    if (isLab(q)) {
      if (!q.analysisQuestion && !q.steps[q.steps.length - 1].analysisQuestion) warn(`${tag}: lab has no concept question`);
      checkConcept(tag, q.analysisQuestion);
      if (!q.tutorNotes) warn(`${tag}: missing tutorNotes`);
      q.steps.forEach((st, i) => {
        const w = `${tag} step ${i + 1}`;
        if (!st.label || !st.task || !st.hint) warn(`${w}: missing label, task or hint`);
        if (st.output === undefined) { warn(`${w}: missing output`); }
        else {
          const out = typeof st.output === "function" ? st.output(st.solution) : st.output;
          if (typeof out !== "string" || !out.trim()) warn(`${w}: output is empty`);
        }
        if (!Array.isArray(st.diagnostics) || !st.diagnostics.length) warn(`${w}: no diagnostics`);
        else if (st.diagnostics.some((d) => { try { return d.check(st.solution); } catch (e) { return false; } })) warn(`${w}: a diagnostic fires on the correct solution`);
        checkAccepted(w, st, st.solution);
        checkConcept(w, st.analysisQuestion);
      });
      if (!ctfIndexes().some((i) => ALL_TASKS[i].pairedWith === q.id)) warn(`${tag} (${q.title}): no CTF is paired with this lab`);
    } else {
      warn(`${tag} (${q.title}): still a single-step task, convert it to a lab`);
    }
  });

  const summary = {
    educationTasks: EDU_TASKS.length,
    labs: EDU_TASKS.filter(isLab).length,
    steps: EDU_TASKS.filter(isLab).reduce((n, q) => n + q.steps.length, 0),
    ctfs: ctfIndexes().length,
    problems: problems.length
  };
  return { summary, problems };
}
