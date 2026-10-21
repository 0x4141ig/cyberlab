// ============================================================================
// CTF ENGINE
// ----------------------------------------------------------------------------
// Loaded after questions.js + ctf_questions.js and before app.js.
//
//  * ALL_TASKS        -> Education tasks (CEH_QUESTIONS) followed by CTF tasks.
//                        Indexes into this array are what app.js calls "currentIndex".
//  * Sidebar tabs     -> "📘 Education" and "🚩 CTF" (sidebarTab). Both are grouped by module.
//  * ctfConfig        -> Tutor-controlled, shared with students via the cloud bucket:
//                        { released: [ids of the CTF tasks that are open], updatedAt }
//  * Locks            -> Students always see the CTF tab, but every CTF task shows a lock
//                        card and reveals nothing until the tutor opens it. The tutor can
//                        open or close any task at any time, one by one or several at once
//                        (Admin > 🚩 CTF Control).
//  * pairedWith       -> Optional id of the Education task a CTF practises (shown as
//                        "Related: Task N" once the CTF is open).
//
// Note: gating is a classroom pacing tool, not a security boundary. All task data
// ships to the browser, and flags are only obfuscated.
// ============================================================================

const ALL_TASKS = (typeof CTF_QUESTIONS !== "undefined") ? EDU_TASKS.concat(CTF_QUESTIONS) : EDU_TASKS.slice();

const CTF_LOCAL_KEY = "ceh_ctf_config";
const CTF_FLAG_KEY = "ceh-ctf-v13";
const CTF_HINT_COSTS = [10, 20, 40];
const CTF_SYNC_INTERVAL_MS = 8000;

let ctfConfig = loadLocalCtfConfig();
let ctfLockedShown = false;     // lock state of the task currently rendered (set by loadQuestion)
let ctfSyncTimer = null;
let sidebarTab = "edu";           // which sidebar tab is showing: "edu" or "ctf"
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

// Display number of an Education task: its position in the Education list (ids are only keys)
function eduNumber(q) {
  return eduIndexes().findIndex((i) => ALL_TASKS[i].id === q.id) + 1;
}

function ctfNumber(q) {
  return ctfIndexes().findIndex((i) => ALL_TASKS[i].id === q.id) + 1;
}

function taskIndexById(id) {
  return ALL_TASKS.findIndex((q) => q.id === Number(id));
}

// Denominator for solved counts in the leaderboard / admin views:
// every Education task plus the CTF tasks the tutor has opened
function taskTotal() {
  return EDU_TASKS.length + ctfIndexes().filter((i) => isCtfLive(ALL_TASKS[i])).length;
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
  const src = raw || {};
  return {
    released: Array.isArray(src.released) ? src.released.map(Number).filter((n) => Number.isFinite(n)) : [],
    updatedAt: Number(src.updatedAt) || 0
  };
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

  const newlyOpened = remote.released.filter((id) => !before.released.includes(id));
  onCtfConfigChanged(true, newlyOpened.length > 0 && currentUser.role !== "admin");
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
  if (announce) showCtfToast("🚩 A new CTF challenge is open! Check the CTF tab.");
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
// Layout (sidebar tabs) & navigation
// --------------------------------------------------------
function moduleGroups(indexes) {
  const mods = Array.from(new Set(indexes.map((i) => ALL_TASKS[i].module))).sort((a, b) => a - b);
  return mods.map((m) => ({ mod: m, items: indexes.filter((i) => ALL_TASKS[i].module === m) }));
}

// Two lists, each grouped by module: Education tasks and CTF tasks
function buildTaskLayout(user) {
  const edu = eduIndexes();
  const ctf = ctfIndexes();
  return {
    path: edu.concat(ctf),
    edu: { path: edu, groups: moduleGroups(edu) },
    ctf: { path: ctf, groups: moduleGroups(ctf) }
  };
}

// Next (dir = 1) / previous (dir = -1) task in the same list (Education or CTF)
// that the user can open; -1 if there is none
function navTarget(dir) {
  const list = isCtfTask(ALL_TASKS[currentIndex]) ? ctfIndexes() : eduIndexes();
  for (let p = list.indexOf(currentIndex) + dir; p >= 0 && p < list.length; p += dir) {
    if (!isTaskLocked(ALL_TASKS[list[p]], currentUser)) return list[p];
  }
  return -1;
}

function syncSidebarTabUI() {
  const eduBtn = document.getElementById("sidebarTabEdu");
  const ctfBtn = document.getElementById("sidebarTabCtf");
  if (eduBtn) eduBtn.classList.toggle("active", sidebarTab === "edu");
  if (ctfBtn) ctfBtn.classList.toggle("active", sidebarTab === "ctf");
}

function setSidebarTab(tab) {
  sidebarTab = tab === "ctf" ? "ctf" : "edu";
  syncSidebarTabUI();
  renderQuestionGrid();
}

function isCtfLive(q) {
  return ctfConfig.released.includes(q.id);
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
const adminCtfSelection = new Set();   // CTF task ids ticked in the tutor panel

function adminSetCtfOpen(ids, open) {
  const released = new Set(ctfConfig.released);
  ids.forEach((id) => (open ? released.add(id) : released.delete(id)));
  updateCtfConfig({ released: Array.from(released) });
  renderAdminCtfPanel();
}

function adminToggleCtfRelease(id) {
  adminSetCtfOpen([id], !ctfConfig.released.includes(id));
}

// Open / close every ticked challenge at once
function adminSetSelectedCtf(open) {
  const ids = Array.from(adminCtfSelection);
  if (!ids.length) return;
  adminCtfSelection.clear();
  adminSetCtfOpen(ids, open);
}

function adminSetAllCtf(open) {
  if (open && !confirm("Open ALL CTF challenges to the class at once?")) return;
  adminCtfSelection.clear();
  adminSetCtfOpen(ctfIndexes().map((i) => ALL_TASKS[i].id), open);
}

// Quick selections: all | none | closed | open
function adminSelectCtf(mode) {
  adminCtfSelection.clear();
  ctfIndexes().map((i) => ALL_TASKS[i]).forEach((q) => {
    const live = isCtfLive(q);
    if (mode === "all" || (mode === "closed" && !live) || (mode === "open" && live)) adminCtfSelection.add(q.id);
  });
  renderAdminCtfPanel();
}

function adminToggleCtfSelect(id, checked) {
  if (checked) adminCtfSelection.add(id);
  else adminCtfSelection.delete(id);
  updateCtfSelectionUI();
}

// Refresh the selection counter and bulk buttons without redrawing the table
function updateCtfSelectionUI() {
  const n = adminCtfSelection.size;
  const total = ctfIndexes().length;
  const openBtn = document.getElementById("ctfOpenSelected");
  const closeBtn = document.getElementById("ctfCloseSelected");
  const count = document.getElementById("ctfSelectedCount");
  const master = document.getElementById("ctfSelectAllBox");
  if (openBtn) { openBtn.disabled = n === 0; openBtn.innerText = `🔓 Open selected (${n})`; }
  if (closeBtn) { closeBtn.disabled = n === 0; closeBtn.innerText = `🔒 Close selected (${n})`; }
  if (count) count.innerText = n ? `${n} selected` : "Tick challenges to open or close several at once";
  if (master) { master.checked = n > 0 && n === total; master.indeterminate = n > 0 && n < total; }
}

function adminToggleAllCtfBoxes(checked) {
  adminSelectCtf(checked ? "all" : "none");
}

function renderAdminCtfPanel() {
  const host = document.getElementById("adminTabContentCtf");
  if (!host) return;

  const ctfList = ctfIndexes().map((i) => ALL_TASKS[i]);
  if (!ctfList.length) {
    host.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No CTF tasks found. Add tasks to <code>ctf_questions.js</code>.</p>`;
    return;
  }

  // Forget ticks for tasks that no longer exist
  Array.from(adminCtfSelection).forEach((id) => { if (!ctfList.some((q) => q.id === id)) adminCtfSelection.delete(id); });

  const students = Array.isArray(adminCachedStudents) ? adminCachedStudents : [];
  const openCount = ctfList.filter(isCtfLive).length;

  const rows = ctfList.map((q) => {
    const live = isCtfLive(q);
    const solvedBy = students.filter((st) => Array.isArray(st.solved) && st.solved.includes(q.id)).length;
    const related = ALL_TASKS.find((t) => t.id === q.pairedWith && !isCtfTask(t));
    return `
      <tr class="ctf-row ${live ? "is-open" : ""}">
        <td style="width:34px; text-align:center;"><input type="checkbox" class="ctf-check" ${adminCtfSelection.has(q.id) ? "checked" : ""} onchange="adminToggleCtfSelect(${q.id}, this.checked)" /></td>
        <td style="font-weight:700; color:var(--text-muted);">🚩${ctfNumber(q)}</td>
        <td><strong style="color:var(--text-main);">${escapeHtml(q.title)}</strong><div style="font-size:0.7rem; color:var(--text-muted);">${escapeHtml(q.moduleTitle)}</div></td>
        <td style="font-size:0.76rem;">${related ? `Task ${eduNumber(related)}: ${escapeHtml(related.title)}` : "-"}</td>
        <td style="text-align:center;">${students.length ? `${solvedBy} / ${students.length}` : "-"}</td>
        <td style="text-align:center;">
          <button class="ctf-release-btn ${live ? "live" : "locked"}" onclick="adminToggleCtfRelease(${q.id})" title="${live ? "Click to close" : "Click to open"}">
            ${live ? "🔓 Open" : "🔒 Closed"}
          </button>
        </td>
      </tr>`;
  }).join("");

  host.innerHTML = `
    <div class="ctf-admin-card" style="margin-bottom:14px;">
      <div style="display:flex; align-items:baseline; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <div class="ctf-admin-label">CTF Challenges</div>
          <div class="ctf-admin-status ${openCount ? "on" : "off"}">${openCount} of ${ctfList.length} open</div>
        </div>
        <div class="ctf-release-actions">
          <button class="btn-header" onclick="adminSetAllCtf(true)">🔓 Open all</button>
          <button class="btn-header" onclick="adminSetAllCtf(false)">🔒 Close all</button>
        </div>
      </div>
      <p class="ctf-admin-help">Students always see the <strong>🚩 CTF</strong> tab, but each challenge stays locked and reveals nothing until you open it. Open or close any challenge at any time with its button, or tick several and open or close them together.</p>
    </div>

    <div class="ctf-bulk-bar">
      <span id="ctfSelectedCount" class="ctf-admin-help" style="margin:0;"></span>
      <div class="ctf-release-actions">
        <button class="btn-header" onclick="adminSelectCtf('closed')">Select closed</button>
        <button class="btn-header" onclick="adminSelectCtf('none')">Clear</button>
        <button class="btn-header ctf-bulk-open" id="ctfOpenSelected" onclick="adminSetSelectedCtf(true)">🔓 Open selected (0)</button>
        <button class="btn-header" id="ctfCloseSelected" onclick="adminSetSelectedCtf(false)">🔒 Close selected (0)</button>
      </div>
    </div>

    <div style="overflow-x:auto; border:1px solid var(--border-color); border-radius:8px;">
      <table class="leaderboard-table" style="margin:0; width:100%;">
        <thead>
          <tr>
            <th style="width:34px; text-align:center;"><input type="checkbox" id="ctfSelectAllBox" onchange="adminToggleAllCtfBoxes(this.checked)" title="Select all" /></th>
            <th style="width:60px;">#</th>
            <th>Challenge</th>
            <th>Related Education task</th>
            <th style="text-align:center;">Solved by</th>
            <th style="text-align:center; min-width:120px;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="ctf-admin-help" style="margin-top:10px;">Changes reach students within a few seconds. The open/closed list is saved to the shared cloud bucket and cached in each browser.</p>
  `;
  updateCtfSelectionUI();
}
