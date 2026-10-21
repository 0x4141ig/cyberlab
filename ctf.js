// ============================================================================
// CTF MODE ENGINE
// ----------------------------------------------------------------------------
// Loaded after questions.js + ctf_questions.js and before app.js.
//
//  * ALL_TASKS        -> Education tasks (CEH_QUESTIONS) followed by CTF tasks.
//                        Indexes into this array are what app.js calls "currentIndex".
//  * ctfConfig        -> Tutor-controlled class settings, shared with students via
//                        the cloud bucket:  { enabled, pattern, released[], updatedAt }
//  * Patterns         -> "5:5" (5 learn then 5 CTF, repeating), "1:1", or custom
//                        "E3,C1,E2,C2" (E = education, C = CTF).
//  * Locks            -> A CTF task is invisible to students while CTF mode is off,
//                        and shows a lock card until the tutor releases it.
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
    return { blocks, error: null };
  }

  return { blocks: fallback, error: "Use 5:5, 1:1, or a custom list like E3,C1,E2,C2 (E = learn, C = CTF)." };
}

// Ordered blocks for CTF mode: [{ type, no, items: [taskIndex...] }]
function buildCtfBlocks(pattern) {
  const parsed = parseCtfPattern(pattern);
  const edu = eduIndexes();
  const ctf = ctfIndexes();
  const blocks = [];
  const counters = { edu: 0, ctf: 0 };
  let guard = 0;

  const push = (type, items) => {
    counters[type]++;
    blocks.push({ type, no: counters[type], items });
  };

  while ((edu.length || ctf.length) && guard++ < 500) {
    let progressed = false;
    for (const b of parsed.blocks) {
      // Once one side runs out, the rest of the other side becomes a single closing block
      if (!ctf.length && edu.length) { push("edu", edu.splice(0)); progressed = true; break; }
      if (!edu.length && ctf.length) { push("ctf", ctf.splice(0)); progressed = true; break; }
      const queue = b.type === "ctf" ? ctf : edu;
      if (!queue.length) continue;
      push(b.type, queue.splice(0, b.n));
      progressed = true;
    }
    if (!progressed) {
      if (edu.length) push("edu", edu.splice(0));
      if (ctf.length) push("ctf", ctf.splice(0));
    }
  }
  return blocks;
}

// What the given user sees: ordered navigation path + sidebar groups
function buildTaskLayout(user) {
  const isAdmin = Boolean(user && user.role === "admin");

  if (ctfConfig.enabled && ctfIndexes().length) {
    const blocks = buildCtfBlocks(ctfConfig.pattern);
    const groups = blocks.map((b) => ({
      kind: b.type,
      title: b.type === "ctf" ? `🚩 CTF · Round ${b.no}` : `📘 Learn · Part ${b.no}`,
      items: b.items
    }));
    return { path: blocks.flatMap((b) => b.items), groups };
  }

  const eduList = eduIndexes();
  const groups = [];
  const mods = Array.from(new Set(eduList.map((i) => ALL_TASKS[i].module))).sort((a, b) => a - b);
  mods.forEach((m) => groups.push({ kind: "module", mod: m, items: eduList.filter((i) => ALL_TASKS[i].module === m) }));

  const path = eduList.slice();
  if (isAdmin && ctfIndexes().length) {
    const pool = ctfIndexes();
    groups.push({ kind: "pool", title: "🚩 CTF Pool · hidden from students", items: pool });
    path.push(...pool);
  }
  return { path, groups };
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

function adminReleaseNextCtf() {
  const order = ctfConfig.enabled
    ? buildTaskLayout({ role: "student" }).path
    : ctfIndexes();
  const nextIdx = order.find((i) => isCtfTask(ALL_TASKS[i]) && !ctfConfig.released.includes(ALL_TASKS[i].id));
  if (nextIdx === undefined) return;
  updateCtfConfig({ released: ctfConfig.released.concat(ALL_TASKS[nextIdx].id) });
  renderAdminCtfPanel();
}

function adminReleaseAllCtf() {
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

  const ctfList = ctfIndexes().map((i) => ALL_TASKS[i]);
  if (!ctfList.length) {
    host.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No CTF tasks found. Add tasks to <code>ctf_questions.js</code>.</p>`;
    return;
  }

  const parsed = parseCtfPattern(ctfConfig.pattern);
  const blocks = buildCtfBlocks(ctfConfig.pattern);
  const students = Array.isArray(adminCachedStudents) ? adminCachedStudents : [];
  const presets = ["5:5", "3:3", "2:2", "1:1"];

  const preview = blocks.map((b) => `<span class="ctf-chip ${b.type}">${b.type === "ctf" ? "🚩" : "📘"} ${b.items.length}</span>`).join("");

  const rows = blocks
    .filter((b) => b.type === "ctf")
    .flatMap((b) => b.items.map((i) => ({ q: ALL_TASKS[i], round: b.no })))
    .map(({ q, round }) => {
      const live = isCtfLive(q);
      const solvedBy = students.filter((s) => Array.isArray(s.solved) && s.solved.includes(q.id)).length;
      return `
        <tr>
          <td style="font-weight:700; color:var(--text-muted);">🚩${ctfNumber(q)}</td>
          <td><strong style="color:var(--text-main);">${escapeHtml(q.title)}</strong><div style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(q.moduleTitle)}</div></td>
          <td style="text-align:center;">Round ${round}</td>
          <td style="text-align:center;">${students.length ? `${solvedBy} / ${students.length}` : "-"}</td>
          <td style="text-align:center;">
            <button class="ctf-release-btn ${live ? "live" : "locked"}" onclick="adminToggleCtfRelease(${q.id})">
              ${live ? "🔓 Released" : "🔒 Locked"}
            </button>
          </td>
        </tr>`;
    })
    .join("");

  host.innerHTML = `
    <div class="ctf-admin-grid">
      <div class="ctf-admin-card">
        <div class="ctf-admin-label">CTF Mode</div>
        <div class="ctf-admin-status ${ctfConfig.enabled ? "on" : "off"}">${ctfConfig.enabled ? "● ON" : "○ OFF"}</div>
        <p class="ctf-admin-help">${ctfConfig.enabled
          ? "Students follow the learn / CTF path below. Locked CTF tasks stay closed until you release them."
          : "Students only see the Education labs. CTF tasks are hidden from them."}</p>
        <button class="btn-header" onclick="adminSetCtfEnabled(${!ctfConfig.enabled})">${ctfConfig.enabled ? "Turn CTF Mode OFF" : "Turn CTF Mode ON"}</button>
      </div>

      <div class="ctf-admin-card">
        <div class="ctf-admin-label">Path Pattern</div>
        <div class="ctf-preset-row">
          ${presets.map((p) => `<button class="ctf-preset ${p === ctfConfig.pattern ? "active" : ""}" onclick="adminApplyCtfPattern('${p}')">${p}</button>`).join("")}
        </div>
        <div class="ctf-pattern-row">
          <input id="ctfPatternInput" class="form-input" value="${escapeHtml(ctfConfig.pattern)}" placeholder="5:5 or E3,C1,E2,C2" onkeydown="if(event.key==='Enter'){adminApplyCtfPattern();}" />
          <button class="btn-header" onclick="adminApplyCtfPattern()">Apply</button>
        </div>
        <div id="ctfPatternError" class="ctf-feedback error" style="display:${parsed.error ? "block" : "none"};">${escapeHtml(parsed.error || "")}</div>
        <p class="ctf-admin-help">Learn:CTF counts per round (<code>5:5</code>), or custom <code>E3,C1,E2,C2</code> (E = learn, C = CTF).</p>
        <div class="ctf-preview">${preview}</div>
      </div>
    </div>

    <div class="ctf-release-bar">
      <strong style="color:var(--text-main);">CTF Challenges</strong>
      <div class="ctf-release-actions">
        <button class="btn-header" onclick="adminReleaseNextCtf()">🔓 Release next</button>
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
            <th style="text-align:center;">Round</th>
            <th style="text-align:center;">Solved by</th>
            <th style="text-align:center; min-width:130px;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="ctf-admin-help" style="margin-top:10px;">Changes reach students within a few seconds. Release state is saved to the shared cloud bucket and cached in each browser.</p>
  `;
}
