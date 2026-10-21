// ============================================================================
// CTF MODE ENGINE
// ----------------------------------------------------------------------------
// Loaded after questions.js + ctf_questions.js and before app.js.
//
//  * ALL_TASKS        -> Education tasks (CEH_QUESTIONS) followed by CTF tasks.
//                        Indexes into this array are what app.js calls "currentIndex".
//  * ctfConfig        -> Tutor-controlled class settings, shared with students via
//                        the cloud bucket:  { enabled, pattern, released[], updatedAt }
//  * Pairing          -> Each CTF task has pairedWith: <education task id>. In the sidebar
//                        the CTF card sits beside the Learn task it practises.
//  * Patterns         -> "5:5", "1:1", or custom "E3,C1,E2,C2" (E = learn, C = CTF).
//                        The C counts set how many CTF tasks one release batch opens;
//                        the E counts are pacing guidance (Learn tasks to cover first).
//  * Locks            -> A CTF task is invisible to students while CTF mode is off,
//                        and shows a lock card until the tutor releases it. The tutor
//                        opens CTF tasks batch by batch (or one at a time), never forced.
//
// Note: gating is a classroom pacing tool, not a security boundary. All task data
// ships to the browser, and flags are only obfuscated.
// ============================================================================

const ALL_TASKS = (typeof CTF_QUESTIONS !== "undefined") ? CEH_QUESTIONS.concat(CTF_QUESTIONS) : CEH_QUESTIONS.slice();

const CTF_LOCAL_KEY = "ceh_ctf_config";
const CTF_FLAG_KEY = "ceh-ctf-v13";
const CTF_HINT_COSTS = [10, 20, 40];
const CTF_SYNC_INTERVAL_MS = 8000;
const CTF_DEFAULT_PATTERN = "5:5";

let ctfConfig = loadLocalCtfConfig();
let ctfLockedShown = false;     // lock state of the task currently rendered (set by loadQuestion)
let ctfSyncTimer = null;
const ctfAdminHintTier = {};    // in-memory hint tiers for the tutor (no penalties apply)

// --------------------------------------------------------
// Task helpers
// --------------------------------------------------------
function taskType(q) {
  return (q && q.type) || "edu";
}

function isCtfTask(q) {
  return taskType(q) === "ctf";
}

function eduIndexes() {
  const out = [];
  ALL_TASKS.forEach((q, i) => { if (!isCtfTask(q)) out.push(i); });
  return out;
}

function ctfIndexes() {
  const out = [];
  ALL_TASKS.forEach((q, i) => { if (isCtfTask(q)) out.push(i); });
  return out;
}

function ctfNumber(q) {
  return ctfIndexes().findIndex((i) => ALL_TASKS[i].id === q.id) + 1;
}

function taskIndexById(id) {
  return ALL_TASKS.findIndex((q) => q.id === Number(id));
}

// Number of tasks a student can see right now (denominator for progress displays)
function taskTotal() {
  return ctfConfig.enabled ? ALL_TASKS.length : CEH_QUESTIONS.length;
}

// Solved ids that count toward the current view (CTF solves only count while CTF mode is on)
function scopedSolvedCount(solvedList) {
  const list = Array.isArray(solvedList) ? solvedList : [];
  if (ctfConfig.enabled) return list.length;
  const eduIds = new Set(CEH_QUESTIONS.map((q) => q.id));
  return list.filter((id) => eduIds.has(id)).length;
}

// --------------------------------------------------------
// Flag obfuscation (XOR + base64). Not cryptography: keeps flags out of view-source.
// --------------------------------------------------------
function ctfEncodeFlag(plain) {
  let out = "";
  for (let i = 0; i < plain.length; i++) {
    out += String.fromCharCode(plain.charCodeAt(i) ^ CTF_FLAG_KEY.charCodeAt(i % CTF_FLAG_KEY.length));
  }
  return btoa(out);
}

function ctfDecodeFlag(enc) {
  try {
    const raw = atob(enc);
    let out = "";
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ CTF_FLAG_KEY.charCodeAt(i % CTF_FLAG_KEY.length));
    }
    return out;
  } catch (e) {
    return "";
  }
}

function getTaskFlag(q) {
  return q && q.flagEnc ? ctfDecodeFlag(q.flagEnc) : "";
}

// Terminal output for a CTF task, with the flag injected and tool-specific variants applied
function resolveTaskOutput(q, cmd) {
  let out = q.output || "";
  if (Array.isArray(q.outputVariants)) {
    const hit = q.outputVariants.find((v) => (v.test instanceof RegExp ? v.test.test(cmd) : typeof v.test === "function" && v.test(cmd)));
    if (hit) out = hit.output;
  }
  return out.split("{{FLAG}}").join(getTaskFlag(q));
}

// A command rule can be a string, a RegExp or a function(cmd) => boolean
function matchesAcceptedRule(rule, cmd) {
  if (typeof rule === "string") return cmd.toLowerCase() === rule.toLowerCase();
  if (rule instanceof RegExp) return rule.test(cmd);
  if (typeof rule === "function") {
    try { return Boolean(rule(cmd)); } catch (e) { return false; }
  }
  return false;
}

// --------------------------------------------------------
// Config storage & cloud sync
// --------------------------------------------------------
function normalizeCtfConfig(raw) {
  const cfg = Object.assign({}, { enabled: false, pattern: CTF_DEFAULT_PATTERN, released: [], updatedAt: 0 }, raw || {});
  cfg.enabled = Boolean(cfg.enabled);
  cfg.pattern = String(cfg.pattern || CTF_DEFAULT_PATTERN);
  cfg.released = Array.isArray(cfg.released) ? cfg.released.map(Number).filter((n) => Number.isFinite(n)) : [];
  cfg.updatedAt = Number(cfg.updatedAt) || 0;
  return cfg;
}

function loadLocalCtfConfig() {
  try {
    const raw = localStorage.getItem(CTF_LOCAL_KEY);
    if (raw) return normalizeCtfConfig(JSON.parse(raw));
  } catch (e) {}
  return normalizeCtfConfig({});
}

function saveLocalCtfConfig(cfg) {
  try { localStorage.setItem(CTF_LOCAL_KEY, JSON.stringify(cfg)); } catch (e) {}
}

async function fetchRemoteCtfConfig() {
  try {
    const res = await fetch(`${AUTO_CLOUD_DB_BASE}/ctf_config?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return normalizeCtfConfig(await res.json());
  } catch (e) {
    return null;
  }
}

async function pushRemoteCtfConfig(cfg) {
  try {
    await fetch(`${AUTO_CLOUD_DB_BASE}/ctf_config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg)
    });
  } catch (e) {
    console.warn("CTF config cloud save error:", e);
  }
}

// Tutor-side update: apply immediately, then share with the class
function updateCtfConfig(patch) {
  ctfConfig = normalizeCtfConfig(Object.assign({}, ctfConfig, patch, { updatedAt: Date.now() }));
  saveLocalCtfConfig(ctfConfig);
  onCtfConfigChanged(false);
  pushRemoteCtfConfig(ctfConfig);
}

async function pollCtfConfig() {
  if (!currentUser) return;
  const remote = await fetchRemoteCtfConfig();
  if (!remote || remote.updatedAt <= ctfConfig.updatedAt) return;

  const before = ctfConfig;
  ctfConfig = remote;
  saveLocalCtfConfig(ctfConfig);

  const newlyReleased = remote.released.filter((id) => !before.released.includes(id));
  const justEnabled = remote.enabled && !before.enabled;
  onCtfConfigChanged(true, (justEnabled || newlyReleased.length > 0) && currentUser.role !== "admin");
}

function startCtfSync() {
  if (ctfSyncTimer) return;
  pollCtfConfig();
  ctfSyncTimer = setInterval(pollCtfConfig, CTF_SYNC_INTERVAL_MS);
}

function onCtfConfigChanged(fromRemote, announce) {
  if (!currentUser) return;
  const layout = buildTaskLayout(currentUser);
  const q = ALL_TASKS[currentIndex];

  if (!layout.path.includes(currentIndex)) {
    loadQuestion(layout.path[0]);
  } else if (isTaskLocked(q, currentUser) !== ctfLockedShown) {
    loadQuestion(currentIndex);
  } else {
    renderQuestionGrid();
    updateProgress();
    updateNavButtons();
  }

  const adminModal = document.getElementById("adminPortalModal");
  if (adminModal && adminModal.style.display !== "none") renderAdminCtfPanel();
  if (announce) showCtfToast("🚩 New CTF content is available! Check the sidebar.");
}

function showCtfToast(message) {
  const el = document.getElementById("ctfToast");
  if (!el) return;
  el.innerText = message;
  el.style.display = "block";
  clearTimeout(showCtfToast._t);
  showCtfToast._t = setTimeout(() => { el.style.display = "none"; }, 5000);
}

// --------------------------------------------------------
// Patterns, path & layout
// --------------------------------------------------------
function parseCtfPattern(str) {
  const fallback = [{ type: "edu", n: 5 }, { type: "ctf", n: 5 }];
  const s = String(str || "").trim().toUpperCase().replace(/\s+/g, "");
  const MAX = 50;

  const pair = s.match(/^(\d+):(\d+)$/);
  if (pair) {
    const a = Number(pair[1]);
    const b = Number(pair[2]);
    if (a < 1 || b < 1 || a > MAX || b > MAX) return { blocks: fallback, error: `Each number must be between 1 and ${MAX}.` };
    return { blocks: [{ type: "edu", n: a }, { type: "ctf", n: b }], error: null };
  }

  if (/^([EC]\d+)(,[EC]\d+)*$/.test(s)) {
    const blocks = s.split(",").map((t) => ({ type: t[0] === "C" ? "ctf" : "edu", n: Number(t.slice(1)) }));
    if (blocks.some((b) => b.n < 1 || b.n > MAX)) return { blocks: fallback, error: `Each count must be between 1 and ${MAX}.` };
    if (!blocks.some((b) => b.type === "ctf")) return { blocks: fallback, error: "The pattern needs at least one C (CTF) entry, e.g. E3,C1." };
    return { blocks, error: null };
  }

  return { blocks: fallback, error: "Use 5:5, 1:1, or a custom list like E3,C1,E2,C2 (E = learn, C = CTF)." };
}

// Release batches: the CTF tasks grouped by the "C" counts of the pattern (cycling).
//   5:5 -> batches of 5      1:1 -> batches of 1      E3,C1,E2,C2 -> batches of 1, 2, 1, 2...
// Each batch also records how many Learn tasks the pattern suggests covering first.
function buildCtfBatches(pattern) {
  const tokens = parseCtfPattern(pattern).blocks;
  const queue = ctfIndexes();
  const batches = [];
  let learn = 0;
  let guard = 0;
  while (queue.length && guard++ < 1000) {
    for (const t of tokens) {
      if (t.type === "edu") { learn += t.n; continue; }
      if (!queue.length) break;
      batches.push({ learn, items: queue.splice(0, t.n) });
      learn = 0;
    }
  }
  return batches;
}

// CTF task indexes paired with the given Education task id
function ctfTwinsOf(eduId) {
  return ctfIndexes().filter((i) => ALL_TASKS[i].pairedWith === eduId);
}

// What the given user sees.
//   groups  -> sidebar module groups; each row is { idx, twins: [ctf indexes shown beside it] }
//   path    -> every visible task in order (a Learn task, then its CTF twins)
//   navPath -> path without the CTF tasks that are still locked (used by Previous / Next)
function buildTaskLayout(user) {
  const isAdmin = Boolean(user && user.role === "admin");
  const showCtf = isAdmin || ctfConfig.enabled;

  const eduList = eduIndexes();
  const eduIds = new Set(eduList.map((i) => ALL_TASKS[i].id));
  const orphans = ctfIndexes().filter((i) => !eduIds.has(ALL_TASKS[i].pairedWith));

  const mods = new Set(eduList.map((i) => ALL_TASKS[i].module));
  if (showCtf) orphans.forEach((i) => mods.add(ALL_TASKS[i].module));

  const groups = Array.from(mods).sort((a, b) => a - b).map((m) => {
    const rows = eduList
      .filter((i) => ALL_TASKS[i].module === m)
      .map((i) => ({ idx: i, twins: showCtf ? ctfTwinsOf(ALL_TASKS[i].id) : [] }));
    if (showCtf) {
      orphans.filter((i) => ALL_TASKS[i].module === m).forEach((i) => rows.push({ idx: i, twins: [] }));
    }
    return { kind: "module", mod: m, rows };
  });

  const path = groups.flatMap((g) => g.rows.flatMap((r) => [r.idx, ...r.twins]));
  const navPath = path.filter((i) => !isTaskLocked(ALL_TASKS[i], user));
  return { path, navPath, groups };
}

// Next (dir = 1) / previous (dir = -1) task the user can open from the current one; -1 if none
function navTarget(dir) {
  const layout = buildTaskLayout(currentUser);
  const open = new Set(layout.navPath);
  for (let p = layout.path.indexOf(currentIndex) + dir; p >= 0 && p < layout.path.length; p += dir) {
    if (open.has(layout.path[p])) return layout.path[p];
  }
  return -1;
}

function isCtfLive(q) {
  return Boolean(ctfConfig.enabled && ctfConfig.released.includes(q.id));
}

function isTaskLocked(q, user) {
  if (!isCtfTask(q)) return false;
  if (user && user.role === "admin") return false;
  // A challenge the student already solved stays viewable (write-up) even if the tutor re-locks it
  if (user && Array.isArray(user.solved) && user.solved.includes(q.id)) return false;
  return !isCtfLive(q);
}

// --------------------------------------------------------
// Student-facing CTF UI: hints, flag submission, pane state
// --------------------------------------------------------
function setCtfPaneState(isCtf, locked) {
  document.body.classList.toggle("ctf-task", isCtf);
  const manual = document.querySelector(".manual-content");
  if (manual) {
    manual.classList.toggle("ctf-mode", isCtf);
    manual.classList.toggle("ctf-locked", locked);
  }
  const ctfCard = document.getElementById("ctfCard");
  const lockedCard = document.getElementById("ctfLockedCard");
  if (ctfCard) ctfCard.style.display = isCtf && !locked ? "block" : "none";
  if (lockedCard) lockedCard.style.display = locked ? "block" : "none";

  if (elTerminalInput) {
    if (!elTerminalInput.dataset.defaultPlaceholder) {
      elTerminalInput.dataset.defaultPlaceholder = elTerminalInput.placeholder;
    }
    elTerminalInput.disabled = locked;
    elTerminalInput.placeholder = locked ? "🔒 Challenge locked by your instructor..." : elTerminalInput.dataset.defaultPlaceholder;
  }
}

// Reset the flag card for the task being shown
function renderCtfCard(q, isSolved) {
  const input = document.getElementById("ctfFlagInput");
  const btn = document.getElementById("ctfFlagSubmit");
  const feedback = document.getElementById("ctfFlagFeedback");
  const writeup = document.getElementById("ctfWriteup");
  if (!input || !btn || !feedback || !writeup) return;

  feedback.style.display = "none";
  feedback.className = "ctf-feedback";
  input.value = "";
  input.disabled = isSolved;
  btn.disabled = isSolved;
  input.placeholder = isSolved ? "Flag captured ✓" : "CEH{...}";

  // Once captured, show the flag with a copy button
  const captured = document.getElementById("ctfCaptured");
  if (captured) {
    if (isSolved) {
      captured.style.display = "flex";
      captured.innerHTML = `
        <span class="ctf-captured-label">🚩 Captured flag</span>
        <code class="ctf-captured-flag">${escapeHtml(getTaskFlag(q))}</code>
        <button type="button" class="btn-header ctf-copy-btn" onclick="copyCtfFlag(this)">📋 Copy</button>`;
    } else {
      captured.style.display = "none";
      captured.innerHTML = "";
    }
  }

  if (isSolved) {
    writeup.style.display = "block";
    writeup.innerHTML = `<strong>📖 Write-up</strong><br>${q.writeup || ""}
      <div><button class="btn-header" style="margin-top:8px;" onclick="nextQuestion()">Proceed to Next Task &rarr;</button></div>`;
  } else {
    writeup.style.display = "none";
    writeup.innerHTML = "";
  }
  updateCtfHintButton(q);
}

// Copy the captured flag (clipboard API with a fallback for non-secure contexts such as file://)
async function copyCtfFlag(btn) {
  const q = ALL_TASKS[currentIndex];
  if (!q || !isCtfTask(q) || !currentUser || !currentUser.solved.includes(q.id)) return;
  const flag = getTaskFlag(q);

  let copied = false;
  try {
    await navigator.clipboard.writeText(flag);
    copied = true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = flag;
    ta.style.cssText = "position:fixed; opacity:0; left:-9999px;";
    document.body.appendChild(ta);
    ta.select();
    try { copied = document.execCommand("copy"); } catch (err) {}
    document.body.removeChild(ta);
  }

  if (btn) {
    const original = btn.innerText;
    btn.innerText = copied ? "✓ Copied" : "Press Ctrl+C";
    setTimeout(() => { btn.innerText = original; }, 1600);
  }
}

function ctfHintTier(q) {
  if (currentUser && currentUser.role === "student") {
    const penalty = (currentUser.penalties && currentUser.penalties[q.id]) || 0;
    let tier = 0;
    let cumulative = 0;
    for (const cost of CTF_HINT_COSTS) {
      cumulative += cost;
      if (penalty >= cumulative) tier++;
      else break;
    }
    return Math.min(tier, (q.hints || []).length);
  }
  return ctfAdminHintTier[q.id] || 0;
}

function updateCtfHintButton(q) {
  const btn = document.getElementById("btnHint");
  if (!btn) return;
  if (!isCtfTask(q)) {
    btn.innerText = "💡 Need a Hint?";
    return;
  }
  const hints = q.hints || [];
  const tier = ctfHintTier(q);
  const solved = currentUser && Array.isArray(currentUser.solved) && currentUser.solved.includes(q.id);
  if (tier >= hints.length) {
    btn.innerText = `💡 Hints (${hints.length}/${hints.length})`;
  } else {
    const costText = currentUser && currentUser.role === "student" && !solved ? ` · −${CTF_HINT_COSTS[tier]} pts` : "";
    btn.innerText = `💡 Hint ${tier + 1}/${hints.length}${costText}`;
  }
}

function renderCtfHints(q, tier) {
  if (tier <= 0) return;
  const shown = (q.hints || []).slice(0, tier).map((h) => `<div style="margin-top:6px;">${escapeHtml(h)}</div>`).join("");
  showGuidance("hint", `<strong>💡 Instructor Hints (${tier}/${(q.hints || []).length}):</strong>${shown}`);
}

function showCtfHint(q) {
  const hints = q.hints || [];
  let tier = ctfHintTier(q);

  if (tier >= hints.length) {
    renderCtfHints(q, tier);
    return;
  }

  const solved = currentUser && Array.isArray(currentUser.solved) && currentUser.solved.includes(q.id);
  if (currentUser && currentUser.role === "student" && !solved) {
    if (!currentUser.penalties) currentUser.penalties = {};
    currentUser.penalties[q.id] = (currentUser.penalties[q.id] || 0) + CTF_HINT_COSTS[tier];
    saveCurrentUser();
  } else {
    ctfAdminHintTier[q.id] = tier + 1;
  }

  tier = Math.min(tier + 1, hints.length);
  renderCtfHints(q, tier);
  updateCtfHintButton(q);
  if (elGuidanceBox) elGuidanceBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function submitCtfFlag(e) {
  if (e) e.preventDefault();
  const q = ALL_TASKS[currentIndex];
  const input = document.getElementById("ctfFlagInput");
  const feedback = document.getElementById("ctfFlagFeedback");
  if (!q || !isCtfTask(q) || !input || !feedback) return;
  if (isTaskLocked(q, currentUser) || !currentUser) return;

  const value = input.value.trim();
  if (!value) return;

  const real = getTaskFlag(q);
  if (value.toLowerCase() !== real.toLowerCase()) {
    playBeep(false);
    feedback.style.display = "block";
    feedback.className = "ctf-feedback error";
    feedback.innerText = /^CEH\{.*\}$/i.test(value)
      ? "Not the right flag. Re-read the output carefully."
      : "That doesn't look like a flag. Flags look like CEH{...} and appear inside the command output.";
    return;
  }

  playBeep(true);
  let earned = 0;
  if (!currentUser.solved.includes(q.id)) {
    currentUser.solved.push(q.id);
    const penalty = (currentUser.penalties && currentUser.penalties[q.id]) || 0;
    earned = Math.max(20, (q.points || 150) - penalty);
    currentUser.score += earned;
    saveCurrentUser();
    updateLeaderboardWithUser();
  }

  updateAuthUI();
  showGuidance("success", `<strong>🚩 Flag Captured!</strong>${earned ? ` +${earned} pts` : ""}<br>Read the write-up below to see why this worked.`);
  const term = document.querySelector(".terminal-pane");
  term.classList.add("pulse-success");
  setTimeout(() => term.classList.remove("pulse-success"), 1000);
}

// --------------------------------------------------------
// Tutor panel: "🚩 CTF Control" tab in the admin dashboard
// --------------------------------------------------------
function adminSetCtfEnabled(on) {
  updateCtfConfig({ enabled: Boolean(on) });
  renderAdminCtfPanel();
}

function adminApplyCtfPattern(value) {
  const input = document.getElementById("ctfPatternInput");
  const pattern = (value !== undefined ? value : (input ? input.value : "")).trim();
  const parsed = parseCtfPattern(pattern);
  if (parsed.error) {
    const err = document.getElementById("ctfPatternError");
    if (err) { err.innerText = parsed.error; err.style.display = "block"; }
    return;
  }
  updateCtfConfig({ pattern: pattern.toUpperCase().replace(/\s+/g, "") });
  renderAdminCtfPanel();
}

function adminToggleCtfRelease(id) {
  const released = new Set(ctfConfig.released);
  if (released.has(id)) released.delete(id);
  else released.add(id);
  updateCtfConfig({ released: Array.from(released) });
  renderAdminCtfPanel();
}

function adminSetBatchRelease(batchNo, release) {
  const batch = buildCtfBatches(ctfConfig.pattern)[batchNo - 1];
  if (!batch) return;
  const ids = batch.items.map((i) => ALL_TASKS[i].id);
  const released = new Set(ctfConfig.released);
  ids.forEach((id) => (release ? released.add(id) : released.delete(id)));
  updateCtfConfig({ released: Array.from(released) });
  renderAdminCtfPanel();
}

// Open the next batch the pattern defines (finishes a partly opened batch first)
function adminReleaseNextBatch() {
  const batches = buildCtfBatches(ctfConfig.pattern);
  const next = batches.findIndex((b) => b.items.some((i) => !ctfConfig.released.includes(ALL_TASKS[i].id)));
  if (next !== -1) adminSetBatchRelease(next + 1, true);
}

// Open just the next single CTF task
function adminReleaseNextOne() {
  const nextIdx = ctfIndexes().find((i) => !ctfConfig.released.includes(ALL_TASKS[i].id));
  if (nextIdx === undefined) return;
  updateCtfConfig({ released: ctfConfig.released.concat(ALL_TASKS[nextIdx].id) });
  renderAdminCtfPanel();
}

function adminReleaseAllCtf() {
  if (!confirm("Release ALL CTF challenges to the class at once?")) return;
  updateCtfConfig({ released: ctfIndexes().map((i) => ALL_TASKS[i].id) });
  renderAdminCtfPanel();
}

function adminLockAllCtf() {
  updateCtfConfig({ released: [] });
  renderAdminCtfPanel();
}

function renderAdminCtfPanel() {
  const host = document.getElementById("adminTabContentCtf");
  if (!host) return;

  if (!ctfIndexes().length) {
    host.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No CTF tasks found. Add tasks to <code>ctf_questions.js</code>.</p>`;
    return;
  }

  const parsed = parseCtfPattern(ctfConfig.pattern);
  const batches = buildCtfBatches(ctfConfig.pattern);
  const students = Array.isArray(adminCachedStudents) ? adminCachedStudents : [];
  const presets = ["5:5", "3:3", "2:2", "1:1"];
  const isReleased = (i) => ctfConfig.released.includes(ALL_TASKS[i].id);
  const nextBatchNo = batches.findIndex((b) => b.items.some((i) => !isReleased(i))) + 1;
  const releasedCount = ctfConfig.released.filter((id) => ALL_TASKS.some((q) => q.id === id && isCtfTask(q))).length;

  const preview = batches.map((b, n) => {
    const all = b.items.every(isReleased);
    return `<span class="ctf-chip ctf ${all ? "done" : ""}">${b.learn ? `📘 ${b.learn} → ` : ""}🚩 ${b.items.length}</span>`;
  }).join("");

  const rows = batches.map((b, n) => {
    const batchNo = n + 1;
    const allOpen = b.items.every(isReleased);
    const header = `
      <tr class="ctf-batch-row">
        <td colspan="4">
          <strong style="color:var(--ctf-accent);">Batch ${batchNo}</strong>
          <span style="color:var(--text-muted); font-size:0.74rem;">· ${b.items.length} challenge${b.items.length > 1 ? "s" : ""}${b.learn ? ` · suggested: cover ${b.learn} Learn task${b.learn > 1 ? "s" : ""} first` : ""}</span>
        </td>
        <td style="text-align:center;">
          <button class="ctf-release-btn ${allOpen ? "live" : "locked"}" onclick="adminSetBatchRelease(${batchNo}, ${!allOpen})">${allOpen ? "🔒 Lock batch" : "🔓 Release batch"}</button>
        </td>
      </tr>`;
    const body = b.items.map((i) => {
      const q = ALL_TASKS[i];
      const live = isCtfLive(q);
      const solvedBy = students.filter((st) => Array.isArray(st.solved) && st.solved.includes(q.id)).length;
      const beside = ALL_TASKS.find((t) => t.id === q.pairedWith && !isCtfTask(t));
      return `
        <tr>
          <td style="font-weight:700; color:var(--text-muted);">🚩${ctfNumber(q)}</td>
          <td><strong style="color:var(--text-main);">${escapeHtml(q.title)}</strong><div style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(q.moduleTitle)}</div></td>
          <td style="font-size:0.76rem;">${beside ? `Task ${beside.id}: ${escapeHtml(beside.title)}` : "-"}</td>
          <td style="text-align:center;">${students.length ? `${solvedBy} / ${students.length}` : "-"}</td>
          <td style="text-align:center;">
            <button class="ctf-release-btn ${live ? "live" : "locked"}" onclick="adminToggleCtfRelease(${q.id})">
              ${live ? "🔓 Released" : "🔒 Locked"}
            </button>
          </td>
        </tr>`;
    }).join("");
    return header + body;
  }).join("");

  host.innerHTML = `
    <div class="ctf-admin-grid">
      <div class="ctf-admin-card">
        <div class="ctf-admin-label">CTF Mode</div>
        <div class="ctf-admin-status ${ctfConfig.enabled ? "on" : "off"}">${ctfConfig.enabled ? "● ON" : "○ OFF"}</div>
        <p class="ctf-admin-help">${ctfConfig.enabled
          ? "Students see a locked 🚩 card beside each Learn task that has a CTF. Nothing opens until you release it."
          : "Students only see the Learn tasks. CTF challenges are hidden from them."}</p>
        <button class="btn-header" onclick="adminSetCtfEnabled(${!ctfConfig.enabled})">${ctfConfig.enabled ? "Turn CTF Mode OFF" : "Turn CTF Mode ON"}</button>
      </div>

      <div class="ctf-admin-card">
        <div class="ctf-admin-label">Release Pattern</div>
        <div class="ctf-preset-row">
          ${presets.map((p) => `<button class="ctf-preset ${p === ctfConfig.pattern ? "active" : ""}" onclick="adminApplyCtfPattern('${p}')">${p}</button>`).join("")}
        </div>
        <div class="ctf-pattern-row">
          <input id="ctfPatternInput" class="form-input" value="${escapeHtml(ctfConfig.pattern)}" placeholder="5:5 or E3,C1,E2,C2" onkeydown="if(event.key==='Enter'){adminApplyCtfPattern();}" />
          <button class="btn-header" onclick="adminApplyCtfPattern()">Apply</button>
        </div>
        <div id="ctfPatternError" class="ctf-feedback error" style="display:${parsed.error ? "block" : "none"};">${escapeHtml(parsed.error || "")}</div>
        <p class="ctf-admin-help">The <code>C</code> numbers are how many CTF challenges one <em>release batch</em> opens (<code>5:5</code> = 5, <code>1:1</code> = 1, <code>E3,C1,E2,C2</code> = 1 then 2...). The <code>E</code> numbers are a pacing hint. You still decide when each batch opens.</p>
        <div class="ctf-preview">${preview}</div>
      </div>
    </div>

    <div class="ctf-release-bar">
      <strong style="color:var(--text-main);">CTF Challenges <span style="color:var(--text-muted); font-weight:400; font-size:0.78rem;">· ${releasedCount} of ${ctfIndexes().length} released</span></strong>
      <div class="ctf-release-actions">
        <button class="btn-header" onclick="adminReleaseNextBatch()" ${nextBatchNo ? "" : "disabled"}>🔓 Release next batch${nextBatchNo ? ` (${nextBatchNo})` : ""}</button>
        <button class="btn-header" onclick="adminReleaseNextOne()" ${nextBatchNo ? "" : "disabled"}>🔓 Release next 1</button>
        <button class="btn-header" onclick="adminReleaseAllCtf()">🔓 Release all</button>
        <button class="btn-header" onclick="adminLockAllCtf()">🔒 Lock all</button>
      </div>
    </div>

    <div style="overflow-x:auto; border:1px solid var(--border-color); border-radius:8px;">
      <table class="leaderboard-table" style="margin:0; width:100%;">
        <thead>
          <tr>
            <th style="width:60px;">#</th>
            <th>Challenge</th>
            <th>Beside Learn task</th>
            <th style="text-align:center;">Solved by</th>
            <th style="text-align:center; min-width:140px;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="ctf-admin-help" style="margin-top:10px;">Changes reach students within a few seconds. Release state is saved to the shared cloud bucket and cached in each browser.</p>
  `;
}
