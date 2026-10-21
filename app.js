// Antigravity CEH v13 NetAcad-style Interactive Lab App

let currentIndex = 0;
let commandHistory = [];
let historyIndex = -1;
let currentFilter = "all";
let trackerEnabled = false; // Live Keystroke Highlight Tracker (optional, hidden by default for pro users)

// Current User Session State (null on initial load until authenticated)
let currentUser = null;

// Seed initial leaderboard (Empty by default for a fresh experience)
const DEFAULT_LEADERBOARD = [];

// Purge legacy mock data from local storage
function cleanMockData() {
  const legacyMockUsers = ["ahmed_sec", "fahad_cyber", "sara_ethical", "khalid_net", "testuser"];
  try {
    const rawUsers = localStorage.getItem("ceh_users");
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      let changed = false;
      for (const key of Object.keys(users)) {
        if (legacyMockUsers.includes(key.toLowerCase())) {
          delete users[key];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("ceh_users", JSON.stringify(users));
      }
    }

    const rawLb = localStorage.getItem("ceh_leaderboard");
    if (rawLb) {
      const lb = JSON.parse(rawLb);
      if (Array.isArray(lb)) {
        const filtered = lb.filter(x => !legacyMockUsers.includes((x.username || "").toLowerCase()));
        if (filtered.length !== lb.length) {
          localStorage.setItem("ceh_leaderboard", JSON.stringify(filtered));
        }
      }
    }
  } catch (e) {}
}

function getStoredUsers() {
  const users = localStorage.getItem("ceh_users");
  if (users) {
    try {
      const parsed = JSON.parse(users);
      if (!parsed["admin"]) {
        parsed["admin"] = { password: "Pa$$w0rd", role: "admin", score: 0, solved: [], conceptSolved: [] };
      }
      return parsed;
    } catch (e) {}
  }
  return {
    "admin": { password: "Pa$$w0rd", role: "admin", score: 0, solved: [], conceptSolved: [] }
  };
}

function saveStoredUsers(users) {
  localStorage.setItem("ceh_users", JSON.stringify(users));
}

function getLeaderboard() {
  const lb = localStorage.getItem("ceh_leaderboard");
  if (lb) {
    try {
      const parsed = JSON.parse(lb);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {}
  }
  return [];
}

function saveLeaderboard(lb) {
  localStorage.setItem("ceh_leaderboard", JSON.stringify(lb));
}

// Audio Feedback (Web Audio API)
function playBeep(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(130, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {}
}

// DOM Elements
const elModuleTag = document.getElementById("moduleTag");
const elTaskTitle = document.getElementById("taskTitle");
const elTargetBadge = document.getElementById("targetBadge");
const elScenarioText = document.getElementById("scenarioText");
const elTaskText = document.getElementById("taskText");
const elExamTipText = document.getElementById("examTipText");
const elTutorBox = document.getElementById("tutorBox");
const elTutorNotesText = document.getElementById("tutorNotesText");
const elGuidanceBox = document.getElementById("guidanceBox");
const elConceptCard = document.getElementById("conceptCard");
const elConceptPrompt = document.getElementById("conceptPrompt");
const elConceptOptions = document.getElementById("conceptOptions");
const elConceptFeedback = document.getElementById("conceptFeedback");
const elQuestionIndicator = document.getElementById("questionIndicator");
const elQuestionGrid = document.getElementById("questionGrid");
const elProgressBarFill = document.getElementById("progressBarFill");
const elProgressText = document.getElementById("progressText");
const elTerminalBody = document.getElementById("terminalBody");
const elTerminalPrompt = document.getElementById("terminalPrompt");
const elTerminalInput = document.getElementById("terminalInput");
const elBtnPrev = document.getElementById("btnPrev");
const elBtnNext = document.getElementById("btnNext");
const elUserDisplay = document.getElementById("userDisplay");
const elUserScore = document.getElementById("userScore");
const elRoleBadge = document.getElementById("roleBadge");
const elModeBanner = document.getElementById("modeBanner");
const elPointsPill = document.getElementById("pointsPill");
const elCliTracker = document.getElementById("cliTracker");
const elTrackerDisplay = document.getElementById("trackerDisplay");
const elTrackerMatchPct = document.getElementById("trackerMatchPct");
const elTrackerTip = document.getElementById("trackerTip");
const elBtnTrackerToggle = document.getElementById("btnTrackerToggle");
const elPasteToast = document.getElementById("pasteToast");

// Guidance Box Helpers
function showGuidance(type, htmlContent) {
  if (!elGuidanceBox) return;
  elGuidanceBox.style.display = "block";
  elGuidanceBox.className = `guidance-box ${type}`;
  elGuidanceBox.innerHTML = htmlContent;
}

function hideGuidance() {
  if (!elGuidanceBox) return;
  elGuidanceBox.style.display = "none";
  elGuidanceBox.className = "guidance-box";
  elGuidanceBox.innerHTML = "";
}

// Show Paste Warning Toast
function showPasteWarning() {
  playBeep(false);
  if (elPasteToast) {
    elPasteToast.style.display = "flex";
    setTimeout(() => {
      elPasteToast.style.display = "none";
    }, 2800);
  }
}

// Load Question

// Render Modern Target Scope Intelligence Card
function renderTargetBadge(q) {
  if (!elTargetBadge || !q) return;
  const isDomain = q.target.includes(".com") || (q.target.includes(".") && !/\d{1,3}\.\d{1,3}/.test(q.target));
  const isWinServer = q.target.includes("10.10.1.22") || q.target.toLowerCase().includes("windows");
  const isParrot = q.target.includes("10.10.1.11") || q.target.includes("Parrot");
  const isLinux = q.target.includes("10.10.1.19");

  let envLabel = "Windows Server 2022 Datacenter (Domain Host)";
  if (isDomain) envLabel = "External Target / Public DNS Domain";
  else if (isParrot) envLabel = "Parrot Security OS (Internal Gateway)";
  else if (isLinux) envLabel = "Linux Server (RPC & Mail Services)";

  const cleanIp = q.target.split(" ")[0].replace(/[\(\)]/g, "");

  elTargetBadge.innerHTML = `
    <div class="target-card-inner">
      <div class="target-card-col">
        <span class="target-card-label">🎯 IN-SCOPE TARGET</span>
        <div class="target-card-value-wrap">
          <code class="target-card-ip">${q.target}</code>
          <button type="button" class="btn-copy-target" onclick="navigator.clipboard.writeText('${cleanIp}')" title="Copy Target IP/Domain (${cleanIp})">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>
      <div class="target-card-divider"></div>
      <div class="target-card-col">
        <span class="target-card-label">🖥️ ENVIRONMENT &amp; ROLE</span>
        <span class="target-card-val-text">${envLabel}</span>
      </div>
      <div class="target-card-divider"></div>
      <div class="target-card-col">
        <span class="target-card-label">⚡ LAB NETWORK STATUS</span>
        <span class="target-status-badge"><span class="live-pulse-dot"></span> HOST ONLINE</span>
      </div>
    </div>
  `;
}

function loadQuestion(idx) {
  if (idx < 0 || idx >= ALL_TASKS.length) return;

  // Keep users inside the tasks their path exposes (CTF tasks stay hidden until CTF mode is on)
  const layout = buildTaskLayout(currentUser);
  if (layout.path.length && !layout.path.includes(idx)) idx = layout.path[0];

  currentIndex = idx;
  const q = ALL_TASKS[idx];
  const isCtf = isCtfTask(q);
  const locked = isTaskLocked(q, currentUser);
  ctfLockedShown = locked;
  setCtfPaneState(isCtf, locked);

  elQuestionIndicator.innerText = locked
    ? "🔒 CTF locked"
    : `Task ${layout.navPath.indexOf(idx) + 1} of ${layout.navPath.length}`;
  elPointsPill.innerText = `+${q.points || 100} PTS`;

  // Terminal Prompt
  elTerminalPrompt.innerText = q.prompt;
  if (q.prompt.startsWith("msf")) {
    elTerminalPrompt.classList.add("msf");
  } else {
    elTerminalPrompt.classList.remove("msf");
  }
  elTerminalInput.value = "";

  if (locked) {
    // Locked CTF challenge: reveal nothing about the task until the instructor releases it
    elModuleTag.innerText = "🚩 CTF CHALLENGE";
    elTaskTitle.innerText = `🔒 CTF Challenge ${ctfNumber(q)} — Locked`;
    const lockedHud = document.getElementById("cliIntellisenseHud");
    if (lockedHud) lockedHud.style.display = "none";
    elTutorBox.style.display = "none";
    hideGuidance();
    elConceptCard.style.display = "none";
    setTrackerVisible(false);
    updateNavButtons();
    renderQuestionGrid();
    return;
  }

  // Update Left Manual Pane
  elModuleTag.innerText = q.moduleTitle;
  elTaskTitle.innerText = isCtf ? `🚩 CTF ${ctfNumber(q)}: ${q.title}` : `Task ${q.id}: ${q.title}`;
  renderTargetBadge(q);

  // Update Command Syntax & Argument Breakdown (Education tasks only: CTF never shows the command)
  if (!isCtf) renderCommandBreakdown(q);
  const hud = document.getElementById("cliIntellisenseHud");
  if (hud) hud.style.display = "none";
  updateCliIntellisense("");

  elScenarioText.innerText = q.scenario;
  elTaskText.innerText = q.task;
  elExamTipText.innerText = q.cehExamTip;

  // Sync module filter chip if navigating across modules while filtered
  if (currentFilter !== "all" && q.module.toString() !== currentFilter) {
    currentFilter = q.module.toString();
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.getAttribute("data-module") === currentFilter);
    });
  }

  // Track active task for student
  if (currentUser && currentUser.role !== "admin") {
    currentUser.currentTaskId = q.id;
    currentUser.currentTaskTitle = q.title;
    currentUser.currentTaskModule = q.moduleTitle;
    currentUser.lastActive = "Just now";
    saveCurrentUser();
  }

  // Tutor Notes
  if (currentUser && currentUser.role === "admin") {
    elTutorBox.style.display = "block";
    let notes = q.tutorNotes || "Demonstrate command syntax and review output details with students.";
    if (isCtf) notes += `\n🔑 Solution: ${q.solution}\n🚩 Flag: ${getTaskFlag(q)}`;
    elTutorNotesText.innerText = notes;
  } else {
    elTutorBox.style.display = "none";
  }

  const isSolved = (currentUser && Array.isArray(currentUser.solved)) ? currentUser.solved.includes(q.id) : false;
  if (isCtf) {
    // CTF: flag card instead of the concept question
    hideGuidance();
    elConceptCard.style.display = "none";
    renderCtfCard(q, isSolved);
    if (isSolved) {
      showGuidance("success", `<strong>🚩 Flag Captured!</strong> You've completed this challenge.`);
    } else {
      renderCtfHints(q, ctfHintTier(q));
    }
  } else {
    updateCtfHintButton(q);
    // Concept Card
    if (isSolved) {
      showGuidance("success", `<strong>Challenge Solved!</strong> You've successfully executed this command.`);
      renderConceptQuestion(q, true);
    } else {
      hideGuidance();
      elConceptCard.style.display = "none";
    }
  }

  updateNavButtons();

  elTerminalInput.focus();

  // Reset Live Keystroke Tracker (Hidden by default for pro users)
  setTrackerVisible(false);
  updateKeystrokeTracker("");

  renderQuestionGrid();
}

// Previous / Next follow the user's task path (module order, or the learn/CTF pattern)
function updateNavButtons() {
  elBtnPrev.disabled = navTarget(-1) === -1;
  elBtnNext.disabled = navTarget(1) === -1;
}

// Render Question Grid with Module Separation & Ability to Show All
// Render Modules & Tasks in Dedicated Left Sidebar
// Full-width sidebar card for a Learn task (or a CTF task that has no Learn pair)
function buildSidebarCard(idx, solvedList) {
  const q = ALL_TASKS[idx];
  const isCtf = isCtfTask(q);
  const locked = isTaskLocked(q, currentUser);
  const isSolved = solvedList.includes(q.id);
  const isActive = idx === currentIndex;

  const card = document.createElement("div");
  card.className = `sidebar-task-card ${isActive ? "active" : ""} ${isSolved ? "completed" : ""} ${isCtf ? "ctf" : ""} ${locked ? "locked" : ""}`;
  card.id = `sidebarTask_${idx}`;
  card.onclick = () => loadQuestion(idx);

  const badge = document.createElement("div");
  badge.className = "sidebar-task-badge";
  badge.innerHTML = isSolved ? "✓" : (locked ? "🔒" : (isCtf ? "🚩" : q.id));

  const title = locked ? `Locked CTF Challenge ${ctfNumber(q)}` : q.title;
  let meta;
  if (locked) {
    meta = `<span>Waiting for your instructor</span>`;
  } else if (isCtf) {
    const status = currentUser && currentUser.role === "admin"
      ? `<span style="opacity:0.8;">${isCtfLive(q) ? "LIVE" : "NOT RELEASED"}</span>`
      : `<span style="opacity:0.8;">CTF</span>`;
    meta = `<span>+${q.points || 150} pts</span><span>•</span>${status}`;
  } else {
    meta = `
      <span>+${q.points || 100} pts</span>
      <span>•</span>
      <span style="opacity:0.8;">${q.target ? q.target.split(' ')[0] : 'Lab'}</span>`;
  }

  const info = document.createElement("div");
  info.className = "sidebar-task-info";
  info.innerHTML = `
    <div class="sidebar-task-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
    <div class="sidebar-task-meta">${meta}</div>
  `;

  card.appendChild(badge);
  card.appendChild(info);
  return card;
}

// Compact CTF card that sits beside the Learn task it practises
function buildCtfMiniCard(idx, solvedList) {
  const q = ALL_TASKS[idx];
  const locked = isTaskLocked(q, currentUser);
  const isSolved = solvedList.includes(q.id);
  const isAdmin = Boolean(currentUser && currentUser.role === "admin");

  const mini = document.createElement("div");
  mini.className = `sidebar-ctf-mini ${idx === currentIndex ? "active" : ""} ${isSolved ? "completed" : ""} ${locked ? "locked" : ""} ${isAdmin ? (isCtfLive(q) ? "live" : "notlive") : ""}`;
  mini.id = `sidebarTask_${idx}`;
  mini.title = locked ? `CTF ${ctfNumber(q)} (locked)` : `CTF ${ctfNumber(q)}: ${q.title}`;
  mini.onclick = () => loadQuestion(idx);

  const icon = isSolved ? "✓" : (locked ? "🔒" : "🚩");
  const sub = isAdmin ? (isCtfLive(q) ? "LIVE" : "OFF") : (locked ? "Locked" : `+${q.points || 150}`);
  mini.innerHTML = `<span class="mini-icon">${icon}</span><span class="mini-label">CTF ${ctfNumber(q)}</span><span class="mini-sub">${sub}</span>`;
  return mini;
}

function renderQuestionGrid() {
  if (!elQuestionGrid) return;
  elQuestionGrid.innerHTML = "";

  const modules = [
    { id: 1, name: "Intro to Ethical Hacking" },
    { id: 2, name: "Footprinting & Recon" },
    { id: 3, name: "Scanning Networks" },
    { id: 4, name: "Enumeration & NetBIOS" },
    { id: 5, name: "Vulnerability Analysis" }
  ];

  const searchInput = document.getElementById("sidebarSearch");
  const searchTerm = (searchInput ? searchInput.value : "").toLowerCase().trim();

  const layout = buildTaskLayout(currentUser);
  const viewTotal = layout.path.length;
  const solvedList = (currentUser && Array.isArray(currentUser.solved)) ? currentUser.solved : [];

  // Update total badges
  const totalBadge = document.getElementById("sidebarTotalBadge");
  if (totalBadge) totalBadge.innerText = `${viewTotal} Labs`;
  const chipAll = document.querySelector('.filter-chip[data-module="all"]');
  if (chipAll) chipAll.innerText = `All (${viewTotal})`;
  const navBadge = document.querySelector(".btn-modules .header-count-badge");
  if (navBadge) navBadge.innerText = viewTotal;

  // Update sidebar progress bar
  const solvedCount = layout.path.filter((i) => solvedList.includes(ALL_TASKS[i].id)).length;
  const pct = Math.round((solvedCount / (viewTotal || 1)) * 100);
  const elSidebarPct = document.getElementById("sidebarProgressPct");
  const elSidebarFill = document.getElementById("sidebarProgressFill");
  if (elSidebarPct) elSidebarPct.innerText = `${solvedCount} / ${viewTotal} (${pct}%)`;
  if (elSidebarFill) elSidebarFill.style.width = `${pct}%`;

  const matchesSearch = (q, locked) => {
    if (!searchTerm) return true;
    if (locked) return "locked ctf challenge".includes(searchTerm);
    return q.title.toLowerCase().includes(searchTerm) || q.task.toLowerCase().includes(searchTerm) || q.id.toString() === searchTerm;
  };

  layout.groups.forEach(group => {
    if (currentFilter !== "all" && group.mod.toString() !== currentFilter) return;

    // A row shows when its Learn task matches, or when one of its CTF twins matches the search
    const rows = group.rows.filter((row) => {
      const ids = [row.idx, ...row.twins];
      return ids.some((i) => matchesSearch(ALL_TASKS[i], isTaskLocked(ALL_TASKS[i], currentUser)));
    });

    if (rows.length === 0) return;

    const groupEl = document.createElement("div");
    groupEl.className = "sidebar-module-group";

    const groupIdx = rows.flatMap((row) => [row.idx, ...row.twins]);
    const solvedInGroup = groupIdx.filter((i) => solvedList.includes(ALL_TASKS[i].id)).length;

    const mod = modules.find((m) => m.id === group.mod) || { id: group.mod, name: "Module " + group.mod };
    const header = document.createElement("div");
    header.className = `sidebar-module-header mod-${mod.id}`;
    header.innerHTML = `
      <span>Mod 0${mod.id}: ${mod.name}</span>
      <span class="sidebar-module-stat">${solvedInGroup}/${groupIdx.length}</span>
    `;
    groupEl.appendChild(header);

    rows.forEach((row) => {
      const card = buildSidebarCard(row.idx, solvedList);
      if (!row.twins.length) {
        groupEl.appendChild(card);
        return;
      }

      // Learn task on the left, its CTF challenge(s) on the right
      const rowEl = document.createElement("div");
      rowEl.className = "sidebar-task-row";
      rowEl.appendChild(card);
      const col = document.createElement("div");
      col.className = "sidebar-ctf-col";
      row.twins.forEach((ci) => col.appendChild(buildCtfMiniCard(ci, solvedList)));
      rowEl.appendChild(col);
      groupEl.appendChild(rowEl);
    });

    elQuestionGrid.appendChild(groupEl);
  });

  if (!elQuestionGrid.children.length) {
    const empty = document.createElement("div");
    empty.className = "sidebar-empty-state";
    empty.style.cssText = "padding:18px 12px; text-align:center; color:var(--text-muted); font-size:0.82rem;";
    empty.innerText = "No tasks match your search.";
    elQuestionGrid.appendChild(empty);
  }

  // Scroll active task into view within sidebar
  const activeCard = document.getElementById(`sidebarTask_${currentIndex}`);
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function filterSidebarTasks() {
  renderQuestionGrid();
}

function toggleSidebar() {
  const sidebar = document.getElementById("modulesSidebar");
  const btn = document.getElementById("btnToggleSidebar");
  if (sidebar) {
    sidebar.classList.toggle("collapsed");
    const isCollapsed = sidebar.classList.contains("collapsed");
    if (btn) {
      btn.style.opacity = isCollapsed ? "0.6" : "1";
    }
  }
}

// Update User & Mode UI
function updateAuthUI() {
  const btnSignOut = document.getElementById("btnSignOut");
  const btnCloud = document.getElementById("btnCloudSettings");
  const btnAdminPortal = document.getElementById("btnAdminPortal");
  const authNotice = document.getElementById("authCloudNotice");
  const isAdmin = currentUser && currentUser.role === "admin";

  if (btnCloud) btnCloud.style.display = isAdmin ? "inline-flex" : "none";
  if (btnAdminPortal) btnAdminPortal.style.display = isAdmin ? "inline-flex" : "none";
  if (authNotice) authNotice.style.display = isAdmin ? "flex" : "none";

  if (!currentUser) {
    elUserDisplay.innerText = "Sign In";
    elUserScore.innerText = "0 pts";
    if (btnSignOut) btnSignOut.style.display = "none";
    elRoleBadge.className = "role-badge student";
    elRoleBadge.innerText = "Guest";
    elModeBanner.className = "mode-banner student";
    elModeBanner.innerHTML = `
      <div class="mode-bar-inner">
        <div class="mode-bar-left">
          <span class="mode-status-dot lock"></span>
          <span class="mode-bar-title">🔒 Authentication Required</span>
          <span class="mode-bar-sub">• Sign in or create practice account</span>
        </div>
        <div class="mode-bar-right">
          <span class="mode-target-tag">Target Scope: 10.10.1.0/24 Subnet</span>
        </div>
      </div>
    `;
    updateProgress();
    renderQuestionGrid();
    loadQuestion(currentIndex);
    return;
  }

  if (btnSignOut) btnSignOut.style.display = "inline-flex";
  elUserDisplay.innerText = currentUser.username;
  elUserScore.innerText = `${currentUser.score} pts`;
  startCtfSync(); // keep CTF mode / release state in step with the instructor

  if (currentUser.role === "admin") {
    elRoleBadge.className = "role-badge tutor";
    elRoleBadge.innerText = "Instructor Admin";
    elModeBanner.className = "mode-banner tutor";
    elModeBanner.innerHTML = `
      <div class="mode-bar-inner">
        <div class="mode-bar-left">
          <span class="mode-status-dot tutor"></span>
          <span class="mode-bar-title">🎓 Instructor Teaching Mode</span>
          <span class="mode-bar-sub">• Full Teaching Access &amp; Solutions Unlocked</span>
        </div>
        <div class="mode-bar-center">
          <span class="mode-target-pill">🎯 <strong>Lab Scope:</strong> 10.10.1.22 <span class="host-online-dot">● ONLINE</span></span>
        </div>
        <div class="mode-bar-right">
          <button class="mode-admin-btn" onclick="openAdminPortal()">
            🛡️ Admin Class Matrix
          </button>
        </div>
      </div>
    `;
  } else {
    elRoleBadge.className = "role-badge student";
    elRoleBadge.innerText = "CTF Practice";
    elModeBanner.className = "mode-banner student";
    elModeBanner.innerHTML = `
      <div class="mode-bar-inner">
        <div class="mode-bar-left">
          <span class="mode-status-dot live"></span>
          <span class="mode-bar-title">⚡ Colleague CTF Practice Lab Mode</span>
          <span class="mode-bar-sub">• Manual Typing Enforced</span>
        </div>
        <div class="mode-bar-center">
          <span class="mode-target-pill">🎯 <strong>Lab Scope:</strong> 10.10.1.22 <span class="host-online-dot">● ONLINE</span></span>
        </div>
        <div class="mode-bar-right">
          <span class="mode-score-pill">⭐ Current Score: <strong>${currentUser.score} pts</strong></span>
        </div>
      </div>
    `;
  }

  updateProgress();
  renderQuestionGrid();
  loadQuestion(currentIndex);
}

// Progress Bar
function updateProgress() {
  const path = buildTaskLayout(currentUser).path;
  const solvedList = (currentUser && Array.isArray(currentUser.solved)) ? currentUser.solved : [];
  const total = path.length;
  const done = path.filter((i) => solvedList.includes(ALL_TASKS[i].id)).length;
  const pct = Math.round((done / (total || 1)) * 100);
  if (elProgressBarFill) elProgressBarFill.style.width = `${pct}%`;
  if (elProgressText) elProgressText.innerText = `${done} / ${total} (${pct}%)`;

  const elSidebarPct = document.getElementById("sidebarProgressPct");
  const elSidebarFill = document.getElementById("sidebarProgressFill");
  if (elSidebarPct) elSidebarPct.innerText = `${done} / ${total} (${pct}%)`;
  if (elSidebarFill) elSidebarFill.style.width = `${pct}%`;
}

// Evaluate Command
function evaluateCommand(userCmd) {
  if (!currentUser) {
    const appRoot = document.getElementById("appRoot");
    const authGate = document.getElementById("authGate");
    if (appRoot) appRoot.style.display = "none";
    if (authGate) authGate.style.display = "flex";
    return;
  }

  const q = ALL_TASKS[currentIndex];
  const trimmed = userCmd.trim();

  if (!trimmed) return;
  if (isTaskLocked(q, currentUser)) return;

  appendTerminalBlock(q.prompt, trimmed);

  // Check acceptance
  let isCorrect = q.accepted.some((rule) => matchesAcceptedRule(rule, trimmed));

  // Flexible argument fallback: check if stripping harmless pro flags (-Pn, -T4, -T3, -v, -vv, --reason, sudo ) matches
  if (!isCorrect) {
    const stripped = trimmed
      .replace(/^sudo\s+/i, "")
      .replace(/\s+(-Pn|-pn)\b/g, "")
      .replace(/\s+(-T[0-5])\b/gi, "")
      .replace(/\s+(-v|-vv|--reason)\b/g, "")
      .trim();

    isCorrect = q.accepted.some((rule) => matchesAcceptedRule(rule, stripped));
  }

  if (isCorrect) {
    playBeep(true);

    if (isCtfTask(q)) {
      // CTF: show output with the flag injected, then wait for the flag submission
      appendHighlightedOutput(resolveTaskOutput(q, trimmed));
      showGuidance(
        "success",
        `<strong>Command Accepted!</strong> Output generated.<br>
         Read it carefully, find the <strong>flag</strong> and submit it in the 🚩 box above.`
      );
      const flagInput = document.getElementById("ctfFlagInput");
      if (flagInput && !flagInput.disabled) flagInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    appendHighlightedOutput(q.output, q.highlightText);

    if (currentUser) {
      const alreadySolved = currentUser.solved.includes(q.id);
      if (!alreadySolved) {
        currentUser.solved.push(q.id);
        
        const penalty = currentUser.penalties[q.id] || 0;
        const earned = Math.max(20, (q.points || 100) - penalty);
        currentUser.score += earned;

        saveCurrentUser();
        updateLeaderboardWithUser();
      }

      updateAuthUI();
    }

    showGuidance(
      "success",
      `<strong>Command Accepted!</strong> Output generated.<br>
       Now answer the <strong>CEH Purpose Check</strong> below to confirm your analysis.`
    );

    renderConceptQuestion(q, false);

    const term = document.querySelector(".terminal-pane");
    term.classList.add("pulse-success");
    setTimeout(() => term.classList.remove("pulse-success"), 1000);

  } else {
    playBeep(false);

    let diagnosticMsg = null;
    if (q.diagnostics && q.diagnostics.length > 0) {
      for (let diag of q.diagnostics) {
        if (diag.check(trimmed)) {
          diagnosticMsg = diag.msg;
          break;
        }
      }
    }

    if (!diagnosticMsg && isCtfTask(q)) {
      diagnosticMsg = "That command didn't surface what the mission asks for. Re-read the objective, think about which tool fits, or use a hint.";
    }

    if (!diagnosticMsg) {
      if (!trimmed.includes("10.10.1.22") && !trimmed.includes("certifiedhacker.com") && !trimmed.startsWith("use")) {
        diagnosticMsg = "Missing or incorrect target identifier (check IP / domain).";
      } else {
        diagnosticMsg = "Syntax or option parameter mismatch. Follow the keystroke tracker guide.";
      }
    }

    appendOutputResponse(`[!] Syntax check failed: ${diagnosticMsg}\n[!] NetAcad Tutor: See the Instructor Guidance on the left.`);

    showGuidance(
      "error",
      `<strong>Command Error Detected:</strong><br>
       ${diagnosticMsg}<br>
       <span style="font-size:0.8rem; opacity:0.85;">Need assistance? Click <strong>Need a Hint?</strong> or check the live typing guide.</span>`
    );
  }
}

// ========================================================
// LIVE KEYSTROKE TRACKING & HIGHLIGHTING ENGINE
// ========================================================
function updateKeystrokeTracker(typedValue) {
  if (!elCliTracker || !elTrackerDisplay) return;

  const q = ALL_TASKS[currentIndex];
  if (isCtfTask(q)) return; // CTF tasks never reveal the command through the typing guide
  const target = q.solution;
  const typed = typedValue;

  let displayHtml = "";
  let correctCount = 0;
  let firstMismatchIndex = -1;

  for (let i = 0; i < target.length; i++) {
    const targetChar = target[i];
    const displayChar = targetChar === " " ? "&nbsp;" : escapeHtml(targetChar);

    if (i < typed.length) {
      // User has typed up to here
      if (typed[i] === targetChar && firstMismatchIndex === -1) {
        correctCount++;
        displayHtml += `<span class="char-correct">${displayChar}</span>`;
      } else {
        if (firstMismatchIndex === -1) firstMismatchIndex = i;
        displayHtml += `<span class="char-wrong">${displayChar}</span>`;
      }
    } else if (i === typed.length && firstMismatchIndex === -1) {
      // Current character the user should type next!
      displayHtml += `<span class="char-next">${displayChar}</span>`;
    } else {
      // Remaining characters not yet reached
      displayHtml += `<span class="char-remaining">${displayChar}</span>`;
    }
  }

  elTrackerDisplay.innerHTML = displayHtml;

  // Percentage & Status Tip
  const pct = Math.round((correctCount / target.length) * 100);
  elTrackerMatchPct.innerText = `${correctCount} / ${target.length} (${pct}%)`;

  if (firstMismatchIndex !== -1) {
    const expectedChar = target[firstMismatchIndex] === " " ? "[Space]" : `'${target[firstMismatchIndex]}'`;
    const gotChar = typed[firstMismatchIndex] === " " ? "[Space]" : `'${typed[firstMismatchIndex]}'`;
    elTrackerTip.className = "tracker-tip mismatch";
    elTrackerTip.innerHTML = `⚠️ Typo at character ${firstMismatchIndex + 1}: Expected <strong>${expectedChar}</strong>, but typed <strong>${gotChar}</strong>.`;
  } else if (typed.length >= target.length) {
    elTrackerTip.className = "tracker-tip match";
    elTrackerTip.innerHTML = `✓ Exact match! Press <strong>[ENTER]</strong> to execute command.`;
  } else if (typed.length > 0) {
    const nextChar = target[typed.length] === " " ? "[Space]" : `'${target[typed.length]}'`;
    elTrackerTip.className = "tracker-tip";
    elTrackerTip.innerHTML = `Typing in progress... Next character to type: <strong style="color:var(--accent-cyan);">${nextChar}</strong>`;
  } else {
    elTrackerTip.className = "tracker-tip";
    elTrackerTip.innerHTML = `Start typing the command. Watch characters turn green as you type!`;
  }
}

function toggleTracker() {
  if (isCtfTask(ALL_TASKS[currentIndex])) return;
  setTrackerVisible(!trackerEnabled);
}

function setTrackerVisible(visible) {
  trackerEnabled = visible;
  if (elCliTracker) {
    elCliTracker.style.display = trackerEnabled ? "flex" : "none";
  }
  if (elBtnTrackerToggle) {
    elBtnTrackerToggle.innerText = trackerEnabled ? "⌨️ Guide: ON" : "⌨️ Guide: OFF";
    elBtnTrackerToggle.style.color = trackerEnabled ? "var(--accent-cyan)" : "var(--text-muted)";
  }
}

// Terminal Text Highlighting (Tutor vs Student)
function appendHighlightedOutput(rawOutput, highlightStr) {
  const resp = document.createElement("div");
  resp.className = "terminal-response";

  if (highlightStr && rawOutput.includes(highlightStr)) {
    const isTutor = currentUser && currentUser.role === "admin";
    const escapedHighlight = escapeHtml(highlightStr);
    const parts = rawOutput.split(highlightStr);
    const highlightedHtml = parts.map(p => escapeHtml(p)).join(
      `<span class="cli-highlight ${isTutor ? '' : 'hidden'}">${escapedHighlight}</span>`
    );
    resp.innerHTML = highlightedHtml;
  } else {
    resp.innerText = rawOutput;
  }

  elTerminalBody.appendChild(resp);
  elTerminalBody.scrollTop = elTerminalBody.scrollHeight;
}

function revealCliHighlight() {
  document.querySelectorAll(".cli-highlight.hidden").forEach((el) => {
    el.classList.remove("hidden");
  });
}

// Concept Question
function renderConceptQuestion(q, wasAlreadyCompleted = false) {
  if (!q.analysisQuestion) return;

  elConceptCard.style.display = "block";
  elConceptPrompt.innerText = q.analysisQuestion.prompt;
  elConceptOptions.innerHTML = "";
  elConceptFeedback.style.display = "none";
  elConceptFeedback.className = "concept-explanation-box";

  q.analysisQuestion.options.forEach((opt, oIdx) => {
    const btn = document.createElement("button");
    btn.className = "concept-opt-btn";
    btn.innerText = opt.text;
    btn.onclick = () => selectConceptAnswer(q, opt, btn);
    elConceptOptions.appendChild(btn);
  });
}

function selectConceptAnswer(q, option, btnElement) {
  if (!currentUser) {
    const appRoot = document.getElementById("appRoot");
    const authGate = document.getElementById("authGate");
    if (appRoot) appRoot.style.display = "none";
    if (authGate) authGate.style.display = "flex";
    return;
  }
  const allBtns = elConceptOptions.querySelectorAll(".concept-opt-btn");
  
  if (option.correct) {
    playBeep(true);
    allBtns.forEach(b => b.disabled = true);
    btnElement.classList.add("correct");

    if (currentUser) {
      const conceptKey = `c_${q.id}`;
      if (!currentUser.conceptSolved.includes(conceptKey)) {
        currentUser.conceptSolved.push(conceptKey);
        currentUser.score += 25;
        saveCurrentUser();
        updateLeaderboardWithUser();
        elUserScore.innerText = `${currentUser.score} pts`;
      }
    }

    revealCliHighlight();

    elConceptFeedback.className = "concept-explanation-box success";
    elConceptFeedback.innerHTML = `
      <strong>Correct Analysis! (+25 Bonus Points)</strong><br>
      ${q.analysisQuestion.explanation}<br>
      <span style="color:var(--accent-yellow); font-size:0.78rem;">✓ Evidence highlighted in yellow in the terminal!</span><br>
      <button class="btn-header" style="margin-top:8px;" onclick="nextQuestion()">Proceed to Next Task &rarr;</button>
    `;
    elConceptFeedback.style.display = "block";

  } else {
    playBeep(false);
    btnElement.classList.add("wrong");
    elConceptFeedback.className = "concept-explanation-box error";
    elConceptFeedback.innerHTML = `
      <strong>Not quite:</strong> Look carefully at the CLI scan output. Try another option or click <strong>Highlight Evidence in Terminal</strong>.
    `;
    elConceptFeedback.style.display = "block";
  }
}

// Append Terminal blocks
function appendTerminalBlock(promptText, cmdText) {
  const block = document.createElement("div");
  block.className = "terminal-output-block";
  block.innerHTML = `<div class="terminal-cmd-echo"><span style="color:#00e676;">${promptText}</span> ${escapeHtml(cmdText)}</div>`;
  elTerminalBody.appendChild(block);
  elTerminalBody.scrollTop = elTerminalBody.scrollHeight;
}

function appendOutputResponse(outputText) {
  const resp = document.createElement("div");
  resp.className = "terminal-response";
  resp.innerText = outputText;
  elTerminalBody.appendChild(resp);
  elTerminalBody.scrollTop = elTerminalBody.scrollHeight;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Next / Prev Nav
function nextQuestion() {
  const target = navTarget(1);
  if (target !== -1) loadQuestion(target);
}

function prevQuestion() {
  const target = navTarget(-1);
  if (target !== -1) loadQuestion(target);
}

// Hint & Solution (Strictly NO Copy/Paste - forces typing)
function showHint() {
  const q = ALL_TASKS[currentIndex];
  if (!q) return;
  if (isCtfTask(q)) {
    showCtfHint(q);
    return;
  }

  if (currentUser && currentUser.role === "student") {
    if (!currentUser.penalties) currentUser.penalties = {};
    const solvedList = Array.isArray(currentUser.solved) ? currentUser.solved : [];
    if (!solvedList.includes(q.id)) {
      currentUser.penalties[q.id] = (currentUser.penalties[q.id] || 0) + 15;
      saveCurrentUser();
    }
  }
  showGuidance("hint", `<strong>💡 Instructor Hint:</strong> ${q.hint}`);
  if (elGuidanceBox) {
    elGuidanceBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function showSolution() {
  const q = ALL_TASKS[currentIndex];
  if (!q || isCtfTask(q)) return;

  if (currentUser && currentUser.role === "student") {
    if (!currentUser.penalties) currentUser.penalties = {};
    const solvedList = Array.isArray(currentUser.solved) ? currentUser.solved : [];
    if (!solvedList.includes(q.id)) {
      currentUser.penalties[q.id] = (currentUser.penalties[q.id] || 0) + 50;
      saveCurrentUser();
    }
  }
  // Reveal Solution optionally activates the live keystroke tracker for assistance!
  setTrackerVisible(true);
  updateKeystrokeTracker(elTerminalInput ? elTerminalInput.value : "");
  showGuidance(
    "hint",
    `<strong>🔑 Solution Command:</strong><br>
     <div class="no-copy" style="color:#ffd600; font-size:0.95rem; font-family:var(--font-mono); background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:4px; display:inline-block; margin:6px 0; border:1px solid rgba(255,214,0,0.3);">
       ${q.solution}
     </div><br>
     <span style="font-size:0.78rem; opacity:0.85;">⚠️ Copying is disabled. Type the command into the terminal using the keystroke guide activated below.</span>`
  );
  if (elGuidanceBox) {
    elGuidanceBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// Clear Terminal
function clearTerminal() {
  elTerminalBody.innerHTML = `
    <div class="terminal-welcome">
      Parrot Security OS / CEH v13 Educational Sandbox<br>
      Target: Windows Server 2022 @ 10.10.1.22<br>
      Type the required command and press [Enter]. Use [Up] and [Down] arrows for history.
    </div>
  `;
  elTerminalInput.focus();
}

// Filter Modules
function setModuleFilter(mod) {
  currentFilter = mod;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    if (chip.getAttribute("data-module") === mod) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  if (mod !== "all") {
    const targetIdx = CEH_QUESTIONS.findIndex((q) => q.module.toString() === mod);
    if (targetIdx !== -1) {
      loadQuestion(targetIdx);
      return;
    }
  }
  renderQuestionGrid();
}

// ========================================================
// Supabase Cloud Backend Configuration
// ========================================================
// You can enter your Supabase credentials here directly,
// OR students and tutors can configure them via the "☁️ Cloud DB" button in the UI.
const DEFAULT_SUPABASE_URL = ""; // e.g. "https://YOUR_PROJECT_ID.supabase.co"
const DEFAULT_SUPABASE_KEY = ""; // e.g. "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

function getSupabaseConfig() {
  const rawUrl = localStorage.getItem("ceh_supabase_url") || window.SUPABASE_URL || DEFAULT_SUPABASE_URL || "";
  const rawKey = localStorage.getItem("ceh_supabase_key") || window.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY || "";
  const url = rawUrl.trim().replace(/\/+$/, "");
  const anonKey = rawKey.trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey)
  };
}

const AUTO_CLOUD_DB_BASE = "https://kvdb.io/duaHz7yFr98EAHvZku3Xz";

function getApiUrl() {
  if (window.location.hostname.includes("vercel.app") || window.location.hostname === "localhost") {
    return "/api/leaderboard";
  }
  return window.VERCEL_API_URL || "https://cyberlab-delta.vercel.app/api/leaderboard";
}

function isCloudApiAvailable() {
  return true; // Live cloud database is pre-provisioned and active across all environments
}

async function fetchDirectCloudUsers() {
  try {
    const resp = await fetch(`${AUTO_CLOUD_DB_BASE}/users?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!resp.ok) return {};
    return await resp.json();
  } catch (e) {
    return {};
  }
}

async function saveDirectCloudUsers(users) {
  try {
    await fetch(`${AUTO_CLOUD_DB_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(users)
    });
  } catch (e) {
    console.warn("Direct cloud save users error:", e);
  }
}

async function fetchDirectCloudLeaderboard() {
  try {
    const resp = await fetch(`${AUTO_CLOUD_DB_BASE}/leaderboard?t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!resp.ok) return [];
    return await resp.json();
  } catch (e) {
    return [];
  }
}

async function saveDirectCloudLeaderboard(lb) {
  try {
    await fetch(`${AUTO_CLOUD_DB_BASE}/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lb)
    });
  } catch (e) {
    console.warn("Direct cloud save leaderboard error:", e);
  }
}

// Auto-discover Supabase credentials if deployed on Vercel with integration
async function autoDiscoverCloudConfig() {
  const current = getSupabaseConfig();
  if (current.isConfigured) return current;

  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}?action=config`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "ok" && data.supabaseUrl && data.supabaseAnonKey) {
        window.SUPABASE_URL = data.supabaseUrl;
        window.SUPABASE_ANON_KEY = data.supabaseAnonKey;
        return {
          url: data.supabaseUrl,
          anonKey: data.supabaseAnonKey,
          isConfigured: true
        };
      }
    }
  } catch (e) {
    // Offline or static
  }
  return getSupabaseConfig();
}

// --------------------------------------------------------
// Cloud Connection & Status Verification
// --------------------------------------------------------
async function testSupabaseConnection(url, anonKey) {
  // If explicitly provided, test direct REST query
  if (url && anonKey) {
    const cleanUrl = url.trim().replace(/\/+$/, "");
    const cleanKey = anonKey.trim();
    try {
      const res = await fetch(`${cleanUrl}/rest/v1/leaderboard?select=username&limit=1`, {
        method: "GET",
        headers: {
          apikey: cleanKey,
          Authorization: `Bearer ${cleanKey}`
        }
      });
      if (res.ok) {
        return { ok: true, message: "Connected successfully to Supabase!" };
      }
      const errText = await res.text();
      return { ok: false, message: `Supabase returned HTTP ${res.status}: ${errText}` };
    } catch (err) {
      return { ok: false, message: `Network error: ${err.message}` };
    }
  }

  // Test via Vercel serverless diagnostic
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}?action=diag`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.hasSupabaseUrl && data.hasSupabaseKey) {
        return { ok: true, message: `Connected via Vercel (${data.resolvedUrl || 'Supabase'})` };
      } else if (data && data.hasKv) {
        return { ok: true, message: "Connected via Vercel KV Redis" };
      } else if (data && (data.hasAutoCloudDb || data.status === "ok")) {
        return { ok: true, message: "Connected to Shared Cloud DB (Live Sync Active)" };
      }
    }
  } catch (e) {}

  // Direct test of AUTO_CLOUD_DB_BASE
  try {
    const res = await fetch(`${AUTO_CLOUD_DB_BASE}/leaderboard`);
    if (res.ok) {
      return { ok: true, message: "Connected to Shared Cloud DB (Direct Active)" };
    }
  } catch (e) {}

  return { ok: false, message: "Cloud database currently unreachable." };
}

async function updateCloudStatusIndicator() {
  const config = getSupabaseConfig();
  const banner = document.getElementById("cloudConnectionBanner");
  const textEl = document.getElementById("cloudStatusText");
  const dotEl = document.getElementById("cloudStatusDot");
  const authNotice = document.getElementById("authCloudNoticeText");
  const authNoticeContainer = document.getElementById("authCloudNotice");
  const isAdmin = currentUser && currentUser.role === "admin";

  if (authNoticeContainer) {
    authNoticeContainer.style.display = isAdmin ? "flex" : "none";
  }

  if (!config.isConfigured && !window.location.hostname.includes("vercel.app")) {
    if (banner) {
      banner.style.background = "rgba(255, 255, 255, 0.04)";
      banner.style.borderColor = "var(--border-color)";
    }
    if (textEl) textEl.innerHTML = `<strong>Offline / Local Storage Mode</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">Scores are saved only in this browser session.</span>`;
    if (dotEl) dotEl.innerText = "⚪";
    if (authNotice) authNotice.innerHTML = `💾 <strong>Local Storage Mode</strong> (Connect Supabase to share rankings)`;
    return;
  }

  if (textEl) textEl.innerText = "Verifying cloud database connection...";
  if (dotEl) dotEl.innerText = "🟡";

  const result = await testSupabaseConnection(config.url, config.anonKey);
  if (result.ok) {
    if (banner) {
      banner.style.background = "rgba(0, 230, 118, 0.1)";
      banner.style.borderColor = "rgba(0, 230, 118, 0.4)";
    }
    const label = config.url ? escapeHtml(config.url) : result.message;
    if (textEl) textEl.innerHTML = `<strong style="color:var(--accent-green);">✓ Connected to Cloud Database</strong><br><span style="font-size:0.72rem; color:var(--text-muted);">${label}</span>`;
    if (dotEl) dotEl.innerText = "🟢";
    if (authNotice) authNotice.innerHTML = `🟢 <strong style="color:var(--accent-green);">Connected to Cloud DB</strong> (Multi-device sync active)`;
  } else {
    if (banner) {
      banner.style.background = "rgba(255, 23, 68, 0.1)";
      banner.style.borderColor = "rgba(255, 23, 68, 0.4)";
    }
    if (textEl) textEl.innerHTML = `<strong style="color:var(--accent-red);">Connection Not Configured</strong><br><span style="font-size:0.72rem; color:#ff80ab;">${escapeHtml(result.message)}</span>`;
    if (dotEl) dotEl.innerText = "🔴";
    if (authNotice) authNotice.innerHTML = `⚠️ <strong style="color:var(--accent-yellow);">Database Disconnected</strong> (Using local cache)`;
  }
}

// --------------------------------------------------------
// Cloud Modal Open/Close & Configuration
// --------------------------------------------------------
function openCloudModal() {
  if (!currentUser || currentUser.role !== "admin") {
    alert("Cloud Database configuration is restricted to the Instructor/Tutor (Admin). Please log in as admin to configure.");
    return;
  }
  const modal = document.getElementById("cloudModal");
  if (!modal) return;
  const config = getSupabaseConfig();
  const inputUrl = document.getElementById("inputSupabaseUrl");
  const inputKey = document.getElementById("inputSupabaseKey");
  if (inputUrl) inputUrl.value = config.url;
  if (inputKey) inputKey.value = config.anonKey;

  modal.style.display = "flex";
  updateCloudStatusIndicator();
}

function closeCloudModal() {
  const modal = document.getElementById("cloudModal");
  if (modal) modal.style.display = "none";
}

async function saveCloudConfig(e) {
  if (e) e.preventDefault();
  const inputUrl = document.getElementById("inputSupabaseUrl")?.value.trim() || "";
  const inputKey = document.getElementById("inputSupabaseKey")?.value.trim() || "";

  if (!inputUrl || !inputKey) {
    alert("Please enter both the Supabase Project URL and Public Anon Key.");
    return;
  }

  const cleanUrl = inputUrl.replace(/\/+$/, "");
  const btn = e?.target?.querySelector("button[type='submit']");
  if (btn) btn.innerText = "Testing Connection...";

  const test = await testSupabaseConnection(cleanUrl, inputKey);
  if (btn) btn.innerText = "💾 Save & Test Connection";

  if (!test.ok) {
    alert(`Connection check failed:\n${test.message}\n\nPlease verify your Supabase URL, anon key, and ensure you ran supabase_setup.sql.`);
    return;
  }

  localStorage.setItem("ceh_supabase_url", cleanUrl);
  localStorage.setItem("ceh_supabase_key", inputKey);

  await updateCloudStatusIndicator();
  await fetchCloudLeaderboard();

  alert("✓ Successfully connected to Supabase Cloud!\nLeaderboard and user credentials are now synced across all devices.");
  closeCloudModal();
}

function clearCloudConfig() {
  if (confirm("Disconnect Supabase and switch back to local browser storage?")) {
    localStorage.removeItem("ceh_supabase_url");
    localStorage.removeItem("ceh_supabase_key");
    const inputUrl = document.getElementById("inputSupabaseUrl");
    const inputKey = document.getElementById("inputSupabaseKey");
    if (inputUrl) inputUrl.value = "";
    if (inputKey) inputKey.value = "";
    updateCloudStatusIndicator();
    alert("Switched to offline local storage mode.");
  }
}

// --------------------------------------------------------
// Cloud User Credentials & Progress Sync
// --------------------------------------------------------
async function cloudSignupUser(username, password) {
  let config = getSupabaseConfig();
  if (!config.isConfigured) {
    config = await autoDiscoverCloudConfig();
  }

  const cleanUser = username.trim();

  // 1. Direct Supabase REST API (when configured directly)
  if (config.isConfigured) {
    try {
      const checkRes = await fetch(
        `${config.url}/rest/v1/lab_users?username=eq.${encodeURIComponent(cleanUser)}&select=username`,
        {
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`
          }
        }
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (Array.isArray(existing) && existing.length > 0) {
          return { ok: false, message: "Username already exists. Please choose a different username or sign in." };
        }
      }

      const nowIso = new Date().toISOString();
      const insertUserRes = await fetch(`${config.url}/rest/v1/lab_users`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          username: cleanUser,
          password: password,
          role: "student",
          score: 0,
          solved: [],
          concept_solved: [],
          penalties: {},
          created_at: nowIso,
          updated_at: nowIso
        })
      });

      if (insertUserRes.ok) {
        await fetch(`${config.url}/rest/v1/leaderboard`, {
          method: "POST",
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates"
          },
          body: JSON.stringify({
            username: cleanUser,
            score: 0,
            solved_count: 0,
            last_active: "Just now",
            updated_at: nowIso
          })
        });
        return { ok: true };
      }
    } catch (err) {
      console.warn("Direct Supabase signup error:", err);
    }
  }

  // 2. Vercel Serverless API Proxy
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}?action=signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUser, password })
    });
    if (res.ok) {
      return { ok: true };
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData && errData.error) {
        return { ok: false, message: errData.error };
      }
    }
  } catch (e) {
    console.warn("Vercel API signup proxy error:", e);
  }

  // 3. Direct Fallback to KV Bucket
  try {
    const users = await fetchDirectCloudUsers();
    if (users[cleanUser]) {
      return { ok: false, message: "Username already exists. Please choose a different username or sign in." };
    }
    users[cleanUser] = {
      password,
      role: 'student',
      score: 0,
      solved: [],
      conceptSolved: [],
      penalties: {},
      currentTaskId: 1,
      currentTaskTitle: "Host Reachability & ICMP Verification",
      currentTaskModule: "Module 01: Introduction to Ethical Hacking",
      lastActive: "Just now",
      updatedAt: Date.now()
    };
    await saveDirectCloudUsers(users);

    const leaderboard = await fetchDirectCloudLeaderboard();
    const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === cleanUser.toLowerCase());
    const entry = {
      username: cleanUser,
      score: 0,
      solvedCount: 0,
      currentTaskId: 1,
      currentTaskTitle: "Host Reachability & ICMP Verification",
      lastActive: 'Just now'
    };
    if (exIdx === -1) leaderboard.push(entry);
    else leaderboard[exIdx] = entry;
    leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
    await saveDirectCloudLeaderboard(leaderboard);
    saveLeaderboard(leaderboard);
    return { ok: true };
  } catch (err) {
    console.warn("Direct auto db signup error:", err);
  }

  return { ok: false, offline: true };
}

async function cloudLoginUser(username, password) {
  let config = getSupabaseConfig();
  if (!config.isConfigured) {
    config = await autoDiscoverCloudConfig();
  }

  const cleanUser = username.trim();

  // 1. Direct Supabase REST API (when configured directly)
  if (config.isConfigured) {
    try {
      const res = await fetch(
        `${config.url}/rest/v1/lab_users?username=eq.${encodeURIComponent(cleanUser)}&select=*`,
        {
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`
          }
        }
      );

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const userRow = rows[0];
          if (userRow.password !== password) {
            return { ok: false, wrongPassword: true, message: "Invalid password. Please check your credentials." };
          }
          return {
            ok: true,
            user: {
              username: userRow.username,
              role: userRow.role || "student",
              score: Number(userRow.score) || 0,
              solved: Array.isArray(userRow.solved) ? userRow.solved : [],
              conceptSolved: Array.isArray(userRow.concept_solved) ? userRow.concept_solved : [],
              penalties: (typeof userRow.penalties === "object" && userRow.penalties !== null) ? userRow.penalties : {},
              currentTaskId: userRow.current_task_id || 1,
              currentTaskTitle: userRow.current_task_title || "Host Reachability & ICMP Verification",
              currentTaskModule: userRow.current_task_module || "Module 01: Introduction to Ethical Hacking"
            }
          };
        } else {
          return { ok: false, notFound: true, message: "Account not found in cloud database." };
        }
      }
    } catch (err) {
      console.warn("Direct Supabase login query error:", err);
    }
  }

  // 2. Vercel Serverless API Proxy
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}?action=login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUser, password })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "ok" && data.user) {
        return { ok: true, user: data.user };
      }
    } else if (res.status === 401) {
      return { ok: false, wrongPassword: true, message: "Invalid password. Please check your credentials." };
    } else if (res.status === 404) {
      return { ok: false, notFound: true, message: "Account not found in cloud database." };
    }
  } catch (e) {
    console.warn("Vercel API login proxy error:", e);
  }

  // 3. Direct Fallback to KV Bucket
  try {
    const users = await fetchDirectCloudUsers();
    const user = users[cleanUser];
    if (user) {
      if (user.password !== password) {
        return { ok: false, wrongPassword: true, message: "Invalid password. Please check your credentials." };
      }
      return {
        ok: true,
        user: {
          username: cleanUser,
          role: user.role || 'student',
          score: Number(user.score) || 0,
          solved: Array.isArray(user.solved) ? user.solved : [],
          conceptSolved: Array.isArray(user.conceptSolved) ? user.conceptSolved : [],
          penalties: (typeof user.penalties === "object" && user.penalties !== null) ? user.penalties : {},
          currentTaskId: user.currentTaskId || 1,
          currentTaskTitle: user.currentTaskTitle || "Host Reachability & ICMP Verification",
          currentTaskModule: user.currentTaskModule || "Module 01: Introduction to Ethical Hacking"
        }
      };
    }
  } catch (err) {
    console.warn("Direct auto db login error:", err);
  }

  return { ok: false, offline: true };
}

async function cloudSaveUserProgress(user) {
  if (!user || user.role === "admin") return;
  let config = getSupabaseConfig();
  if (!config.isConfigured) {
    config = await autoDiscoverCloudConfig();
  }

  const nowIso = new Date().toISOString();

  // 1. Direct Supabase REST API
  if (config.isConfigured) {
    try {
      await fetch(`${config.url}/rest/v1/lab_users?username=eq.${encodeURIComponent(user.username)}`, {
        method: "PATCH",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          score: user.score,
          solved: user.solved,
          concept_solved: user.conceptSolved || [],
          penalties: user.penalties || {},
          current_task_id: user.currentTaskId || 1,
          current_task_title: user.currentTaskTitle || "Host Reachability & ICMP Verification",
          updated_at: nowIso
        })
      });
      syncUserScoreToCloud();
      return;
    } catch (e) {
      console.warn("Direct Supabase progress save error (lab_users):", e);
    }
  }

  // 2. Vercel Serverless API Proxy
  let proxySaved = false;
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}?action=save_progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        score: user.score,
        solved: user.solved,
        conceptSolved: user.conceptSolved || [],
        penalties: user.penalties || {},
        currentTaskId: user.currentTaskId || 1,
        currentTaskTitle: user.currentTaskTitle || "Host Reachability & ICMP Verification",
        currentTaskModule: user.currentTaskModule || "Module 01: Introduction to Ethical Hacking"
      })
    });
    if (res.ok) proxySaved = true;
  } catch (e) {
    console.warn("Vercel API progress save error:", e);
  }

  // 3. Direct Fallback to KV Bucket
  if (!proxySaved && !config.isConfigured) {
    try {
      const users = await fetchDirectCloudUsers();
      users[user.username] = {
        password: users[user.username]?.password || 'Pa$$w0rd',
        role: 'student',
        score: Number(user.score) || 0,
        solved: user.solved || [],
        conceptSolved: user.conceptSolved || [],
        penalties: user.penalties || {},
        currentTaskId: user.currentTaskId || 1,
        currentTaskTitle: user.currentTaskTitle || "Host Reachability & ICMP Verification",
        currentTaskModule: user.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
        lastActive: 'Just now',
        updatedAt: Date.now()
      };
      await saveDirectCloudUsers(users);

      const leaderboard = await fetchDirectCloudLeaderboard();
      const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === user.username.toLowerCase());
      const entry = {
        username: user.username,
        score: Number(user.score) || 0,
        solvedCount: Array.isArray(user.solved) ? user.solved.length : 0,
        currentTaskId: user.currentTaskId || 1,
        currentTaskTitle: user.currentTaskTitle || "Host Reachability & ICMP Verification",
        lastActive: 'Just now'
      };
      if (exIdx !== -1) leaderboard[exIdx] = entry;
      else leaderboard.push(entry);
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await saveDirectCloudLeaderboard(leaderboard);
      saveLeaderboard(leaderboard);
    } catch (err) {
      console.warn("Direct auto db progress save error:", err);
    }
  }
}

// User Persistence & Leaderboard Sync
function saveCurrentUser() {
  if (!currentUser) return;
  const users = getStoredUsers();
  users[currentUser.username] = {
    password: users[currentUser.username]?.password || "Pa$$w0rd",
    role: currentUser.role,
    score: currentUser.score,
    solved: currentUser.solved,
    conceptSolved: currentUser.conceptSolved || [],
    penalties: currentUser.penalties,
    currentTaskId: currentUser.currentTaskId || 1,
    currentTaskTitle: currentUser.currentTaskTitle || "Host Reachability & ICMP Verification",
    currentTaskModule: currentUser.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
    lastActive: "Just now"
  };
  saveStoredUsers(users);

  // Sync to Supabase & Cloud in background
  cloudSaveUserProgress(currentUser);
}

async function syncUserScoreToCloud() {
  if (!currentUser || currentUser.role === "admin") return;

  const config = getSupabaseConfig();

  // 1. Direct Supabase REST API Sync
  if (config.isConfigured) {
    try {
      await fetch(`${config.url}/rest/v1/leaderboard`, {
        method: "POST",
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          username: currentUser.username.trim(),
          score: currentUser.score,
          solved_count: currentUser.solved.length,
          last_active: "Just now",
          updated_at: new Date().toISOString()
        })
      });
      return;
    } catch (e) {
      console.warn("Direct Supabase sync error:", e);
    }
  }

  // 2. Vercel Serverless API Sync
  try {
    const url = getApiUrl();
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: currentUser.username,
        score: currentUser.score,
        solvedCount: currentUser.solved.length,
        role: currentUser.role
      })
    });
  } catch (e) {
    // Offline fallback - local storage handles persistence
  }
}

async function fetchCloudLeaderboard() {
  const config = getSupabaseConfig();

  // 1. Direct Supabase REST API Query
  if (config.isConfigured) {
    try {
      const res = await fetch(
        `${config.url}/rest/v1/leaderboard?select=username,score,solved_count,last_active&order=score.desc,solved_count.desc`,
        {
          headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`
          }
        }
      );
      if (res.ok) {
        const rows = await res.json();
        const list = (rows || []).map((r) => ({
          username: r.username,
          score: Number(r.score) || 0,
          solvedCount: Number(r.solved_count) || 0,
          lastActive: r.last_active || "Recently"
        }));
        if (list.length > 0) {
          saveLeaderboard(list);
          return list;
        }
      }
    } catch (e) {
      console.warn("Direct Supabase fetch error:", e);
    }
  }

  // 2. Vercel Serverless API Query
  try {
    const url = getApiUrl() + "?t=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "ok" && Array.isArray(data.leaderboard)) {
        saveLeaderboard(data.leaderboard);
        return data.leaderboard;
      }
    }
  } catch (e) {
    // Proxy fallback to direct cloud DB
  }

  // 3. Direct Fallback to Shared KV Bucket
  try {
    const list = await fetchDirectCloudLeaderboard();
    if (list && Array.isArray(list) && list.length > 0) {
      list.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      saveLeaderboard(list);
      return list;
    }
  } catch (e) {
    console.warn("Direct KV leaderboard fetch error:", e);
  }

  return getLeaderboard();
}

async function syncLocalUsersToCloud() {
  const localUsers = getStoredUsers();
  const usernames = Object.keys(localUsers).filter(u => u.toLowerCase() !== "admin");
  if (usernames.length === 0) return;

  try {
    const cloudUsers = await fetchDirectCloudUsers();
    const leaderboard = await fetchDirectCloudLeaderboard();
    let modified = false;

    for (const u of usernames) {
      const localData = localUsers[u];
      if (!cloudUsers[u] || (localData.score || 0) > (cloudUsers[u].score || 0)) {
        cloudUsers[u] = {
          password: localData.password || "Pa$$w0rd",
          role: localData.role || "student",
          score: localData.score || 0,
          solved: localData.solved || [],
          conceptSolved: localData.conceptSolved || [],
          penalties: localData.penalties || {},
          currentTaskId: localData.currentTaskId || 1,
          currentTaskTitle: localData.currentTaskTitle || "Host Reachability & ICMP Verification",
          currentTaskModule: localData.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
          lastActive: "Just now",
          updatedAt: Date.now()
        };
        const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === u.toLowerCase());
        const entry = {
          username: u,
          score: Number(localData.score) || 0,
          solvedCount: Array.isArray(localData.solved) ? localData.solved.length : 0,
          currentTaskId: localData.currentTaskId || 1,
          currentTaskTitle: localData.currentTaskTitle || "Host Reachability & ICMP Verification",
          lastActive: "Just now"
        };
        if (exIdx !== -1) leaderboard[exIdx] = entry;
        else leaderboard.push(entry);
        modified = true;
      }
    }

    if (modified) {
      await saveDirectCloudUsers(cloudUsers);
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await saveDirectCloudLeaderboard(leaderboard);
      saveLeaderboard(leaderboard);
    }
  } catch (e) {
    console.warn("Background local user sync error:", e);
  }
}

function updateLeaderboardWithUser() {
  if (!currentUser || currentUser.role === "admin") return;

  let lb = getLeaderboard();
  const existingIdx = lb.findIndex((entry) => entry.username.toLowerCase() === currentUser.username.toLowerCase());
  
  const userEntry = {
    username: currentUser.username,
    score: currentUser.score,
    solvedCount: currentUser.solved.length,
    lastActive: "Just now"
  };

  if (existingIdx !== -1) {
    lb[existingIdx] = userEntry;
  } else {
    lb.push(userEntry);
  }

  lb.sort((a, b) => b.score - a.score || b.solvedCount - a.solvedCount);
  saveLeaderboard(lb);

  // Sync to Supabase & Vercel in background
  syncUserScoreToCloud();
}

// Modals
function openAuthModal(force = false) {
  if (currentUser) {
    if (confirm(`You are currently logged in as "${currentUser.username}".\n\nDo you want to switch accounts or sign out?`)) {
      handleSignOut();
    }
  } else {
    const appRoot = document.getElementById("appRoot");
    const authGate = document.getElementById("authGate");
    if (appRoot) appRoot.style.display = "none";
    if (authGate) authGate.style.display = "flex";
  }
}

function closeAuthModal() {
  const authGate = document.getElementById("authGate");
  const appRoot = document.getElementById("appRoot");
  if (currentUser) {
    if (authGate) authGate.style.display = "none";
    if (appRoot) appRoot.style.display = "flex";
  }
}

function setAuthTab(tab) {
  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const formLogin = document.getElementById("formLogin");
  const formSignup = document.getElementById("formSignup");

  if (tab === "login") {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    formLogin.style.display = "flex";
    formSignup.style.display = "none";
    document.getElementById("loginUsername").focus();
  } else {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    formSignup.style.display = "flex";
    formLogin.style.display = "none";
    document.getElementById("signupUsername").focus();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPassword").value;

  if (!u || !p) {
    alert("Please enter both username and password.");
    return;
  }

  // 1. Tutor Admin login (always accessible)
  if (u.toLowerCase() === "admin" && p === "Pa$$w0rd") {
    const users = getStoredUsers();
    currentUser = {
      username: "admin",
      role: "admin",
      score: users["admin"]?.score || 0,
      solved: users["admin"]?.solved || [],
      conceptSolved: users["admin"]?.conceptSolved || [],
      penalties: {}
    };
    sessionStorage.setItem("ceh_current_user", "admin");
    localStorage.setItem("ceh_last_username", "admin");

    // Unlock and show app workspace
    const authGate = document.getElementById("authGate");
    const appRoot = document.getElementById("appRoot");
    if (authGate) authGate.style.display = "none";
    if (appRoot) appRoot.style.display = "flex";

    updateAuthUI();
    renderQuestionGrid();
    loadQuestion(currentIndex);
    openAdminPortal(); // Auto-open instructor dashboard for admin!
    return;
  }

  // 2. Supabase Cloud Database Login
  if (isCloudApiAvailable()) {
    const submitBtn = document.getElementById("btnLoginSubmit") || document.querySelector("#formLogin button[type='submit']");
    const origText = submitBtn ? submitBtn.innerText : "Sign In";
    if (submitBtn) submitBtn.innerText = "Verifying...";

    const cloudRes = await cloudLoginUser(u, p);
    if (submitBtn) submitBtn.innerText = origText;

    if (cloudRes.ok && cloudRes.user) {
      currentUser = cloudRes.user;
      sessionStorage.setItem("ceh_current_user", currentUser.username);
      localStorage.setItem("ceh_last_username", currentUser.username);

      // Cache user locally
      const users = getStoredUsers();
      users[currentUser.username] = {
        password: p,
        role: currentUser.role,
        score: currentUser.score,
        solved: currentUser.solved,
        conceptSolved: currentUser.conceptSolved,
        penalties: currentUser.penalties,
        currentTaskId: currentUser.currentTaskId || 1,
        currentTaskTitle: currentUser.currentTaskTitle || "Host Reachability & ICMP Verification",
        currentTaskModule: currentUser.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
        lastActive: "Just now"
      };
      saveStoredUsers(users);

      const restoredIdx = currentUser.currentTaskId ? taskIndexById(currentUser.currentTaskId) : -1;
      if (restoredIdx !== -1) {
        currentIndex = restoredIdx;
      }

      // Unlock and show app workspace
      const authGate = document.getElementById("authGate");
      const appRoot = document.getElementById("appRoot");
      if (authGate) authGate.style.display = "none";
      if (appRoot) appRoot.style.display = "flex";

      updateAuthUI();
      renderQuestionGrid();
      loadQuestion(currentIndex);
      return;
    }

    if (cloudRes.wrongPassword) {
      alert("Invalid password. Please check your credentials.");
      return;
    }

    if (cloudRes.notFound) {
      // Check local storage fallback
      const localUsers = getStoredUsers();
      if (localUsers[u] && localUsers[u].password === p) {
        currentUser = {
          username: u,
          role: localUsers[u].role || "student",
          score: localUsers[u].score || 0,
          solved: localUsers[u].solved || [],
          conceptSolved: localUsers[u].conceptSolved || [],
          penalties: localUsers[u].penalties || {},
          currentTaskId: localUsers[u].currentTaskId || 1,
          currentTaskTitle: localUsers[u].currentTaskTitle || "Host Reachability & ICMP Verification",
          currentTaskModule: localUsers[u].currentTaskModule || "Module 01: Introduction to Ethical Hacking"
        };
        sessionStorage.setItem("ceh_current_user", u);
        localStorage.setItem("ceh_last_username", u);
        const restoredIdx = currentUser.currentTaskId ? taskIndexById(currentUser.currentTaskId) : -1;
        if (restoredIdx !== -1) {
          currentIndex = restoredIdx;
        }
        cloudSaveUserProgress(currentUser);
        syncUserScoreToCloud();

        // Unlock and show app workspace
        const authGate = document.getElementById("authGate");
        const appRoot = document.getElementById("appRoot");
        if (authGate) authGate.style.display = "none";
        if (appRoot) appRoot.style.display = "flex";

        updateAuthUI();
        renderQuestionGrid();
        loadQuestion(currentIndex);
        return;
      }
      alert("Account not found. Please click 'Sign Up' to create your practice account.");
      return;
    }
  }

  // 3. Local Storage Fallback
  const users = getStoredUsers();
  if (users[u] && users[u].password === p) {
    currentUser = {
      username: u,
      role: users[u].role || "student",
      score: users[u].score || 0,
      solved: users[u].solved || [],
      conceptSolved: users[u].conceptSolved || [],
      penalties: users[u].penalties || {},
      currentTaskId: users[u].currentTaskId || 1,
      currentTaskTitle: users[u].currentTaskTitle || "Host Reachability & ICMP Verification",
      currentTaskModule: users[u].currentTaskModule || "Module 01: Introduction to Ethical Hacking"
    };
    sessionStorage.setItem("ceh_current_user", u);
    localStorage.setItem("ceh_last_username", u);
    const restoredIdx = currentUser.currentTaskId ? taskIndexById(currentUser.currentTaskId) : -1;
    if (restoredIdx !== -1) {
      currentIndex = restoredIdx;
    }
    cloudSaveUserProgress(currentUser);
    syncUserScoreToCloud();

    // Unlock and show app workspace
    const authGate = document.getElementById("authGate");
    const appRoot = document.getElementById("appRoot");
    if (authGate) authGate.style.display = "none";
    if (appRoot) appRoot.style.display = "flex";

    updateAuthUI();
    renderQuestionGrid();
    loadQuestion(currentIndex);
    return;
  }

  alert("Invalid credentials. Please verify your username and password, or click 'Sign Up' to create an account.");
}

async function handleSignup(e) {
  e.preventDefault();
  const u = document.getElementById("signupUsername").value.trim();
  const p = document.getElementById("signupPassword").value;

  if (!u || !p) {
    alert("Please choose a username and password.");
    return;
  }

  if (u.toLowerCase() === "admin") {
    alert("The username 'admin' is reserved for instructor login.");
    return;
  }

  const users = getStoredUsers();
  if (users[u]) {
    alert("Username already taken! Please choose another username.");
    return;
  }

  const submitBtn = document.getElementById("btnSignupSubmit") || document.querySelector("#formSignup button[type='submit']");
  const origText = submitBtn ? submitBtn.innerText : "Create Practice Account";
  if (submitBtn) submitBtn.innerText = "Creating Account...";

  // 1. Supabase Cloud Signup
  if (isCloudApiAvailable()) {
    const cloudRes = await cloudSignupUser(u, p);
    if (!cloudRes.ok && !cloudRes.offline) {
      if (submitBtn) submitBtn.innerText = origText;
      alert(cloudRes.message || "Failed to create account in Supabase.");
      return;
    }
  }

  if (submitBtn) submitBtn.innerText = origText;

  // 2. Local Storage Cache
  users[u] = {
    password: p,
    role: "student",
    score: 0,
    solved: [],
    conceptSolved: [],
    penalties: {},
    currentTaskId: 1,
    currentTaskTitle: CEH_QUESTIONS[0].title,
    currentTaskModule: CEH_QUESTIONS[0].moduleTitle,
    lastActive: "Just now"
  };
  saveStoredUsers(users);

  currentUser = {
    username: u,
    role: "student",
    score: 0,
    solved: [],
    conceptSolved: [],
    penalties: {},
    currentTaskId: 1,
    currentTaskTitle: CEH_QUESTIONS[0].title,
    currentTaskModule: CEH_QUESTIONS[0].moduleTitle
  };
  sessionStorage.setItem("ceh_current_user", u);
  localStorage.setItem("ceh_last_username", u);

  updateLeaderboardWithUser();

  // Unlock and show app workspace
  const authGate = document.getElementById("authGate");
  const appRoot = document.getElementById("appRoot");
  if (authGate) authGate.style.display = "none";
  if (appRoot) appRoot.style.display = "flex";

  updateAuthUI();
  renderQuestionGrid();
  loadQuestion(0);
}

function handleSignOut() {
  currentUser = null;
  sessionStorage.removeItem("ceh_current_user");
  localStorage.removeItem("ceh_active_user");

  const loginPass = document.getElementById("loginPassword");
  const signupPass = document.getElementById("signupPassword");
  if (loginPass) loginPass.value = "";
  if (signupPass) signupPass.value = "";

  // Hide the lab workspace and lock behind authGate!
  const appRoot = document.getElementById("appRoot");
  const authGate = document.getElementById("authGate");
  if (appRoot) appRoot.style.display = "none";
  if (authGate) authGate.style.display = "flex";

  // Hide any open floating modals
  ["cheatModal", "leaderboardModal", "cloudModal", "adminPortalModal"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  updateAuthUI();
  setAuthTab("login");
}

async function openLeaderboard() {
  document.getElementById("leaderboardModal").style.display = "flex";
  renderLeaderboardRows(getLeaderboard());

  // Background sync any local accounts and fetch live scores from Cloud DB
  await syncLocalUsersToCloud();
  const cloudLb = await fetchCloudLeaderboard();
  if (cloudLb && cloudLb.length > 0) {
    renderLeaderboardRows(cloudLb);
  }
}

function renderLeaderboardRows(lb) {
  const lbBody = document.getElementById("leaderboardBody");
  lbBody.innerHTML = "";

  if (!lb || lb.length === 0) {
    lbBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px 10px;">
          <div style="font-size: 1.5rem; margin-bottom: 8px;">🎯</div>
          <strong style="color: var(--text-main); font-size: 0.95rem;">Leaderboard is currently empty</strong><br>
          <span style="font-size: 0.82rem;">Create a practice account and complete tasks to take the #1 spot!</span>
        </td>
      </tr>
    `;
    return;
  }

  lb.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    if (currentUser && entry.username.toLowerCase() === currentUser.username.toLowerCase()) {
      tr.className = "user-row";
    }

    let rankBadge = "";
    if (idx === 0) rankBadge = '<span class="rank-badge rank-1">🥇</span>';
    else if (idx === 1) rankBadge = '<span class="rank-badge rank-2">🥈</span>';
    else if (idx === 2) rankBadge = '<span class="rank-badge rank-3">🥉</span>';
    else rankBadge = `<span class="rank-badge rank-other">#${idx + 1}</span>`;

    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td><strong>${escapeHtml(entry.username)}</strong> ${currentUser && entry.username === currentUser.username ? '<span style="color:var(--accent-cyan); font-size:0.75rem;">(You)</span>' : ''}</td>
      <td>${entry.solvedCount} / ${taskTotal()}</td>
      <td style="color:var(--accent-yellow); font-weight:700;">${entry.score} pts</td>
      <td style="color:var(--text-muted); font-size:0.78rem;">${entry.lastActive || 'Just now'}</td>
    `;
    lbBody.appendChild(tr);
  });
}

function closeLeaderboard() {
  document.getElementById("leaderboardModal").style.display = "none";
}

function openCheatSheet() {
  document.getElementById("cheatModal").style.display = "flex";
}

function closeCheatSheet() {
  document.getElementById("cheatModal").style.display = "none";
}

function resetProgress() {
  if (!currentUser) return;
  if (confirm(`Reset all solved tasks and score for ${currentUser.username}?`)) {
    currentUser.solved = [];
    currentUser.conceptSolved = [];
    currentUser.score = 0;
    currentUser.penalties = {};
    saveCurrentUser();
    updateLeaderboardWithUser();
    updateAuthUI();
  }
}

// ========================================================
// Admin Portal & Live Student Monitoring Functions
// ========================================================
let adminCachedStudents = [];

function openAdminPortal() {
  if (!currentUser || currentUser.role !== "admin") {
    alert("Instructor Admin access required.");
    return;
  }
  const modal = document.getElementById("adminPortalModal");
  if (modal) {
    modal.style.display = "flex";
    setAdminTab("roster");
    refreshAdminPortal();
  }
}

function closeAdminPortal() {
  const modal = document.getElementById("adminPortalModal");
  if (modal) modal.style.display = "none";
}

function setAdminTab(tab) {
  const tabRoster = document.getElementById("tabAdminRoster");
  const tabMatrix = document.getElementById("tabAdminMatrix");
  const tabCtf = document.getElementById("tabAdminCtf");
  const tabTools = document.getElementById("tabAdminTools");

  const contentRoster = document.getElementById("adminTabContentRoster");
  const contentMatrix = document.getElementById("adminTabContentMatrix");
  const contentCtf = document.getElementById("adminTabContentCtf");
  const contentTools = document.getElementById("adminTabContentTools");

  if (!tabRoster || !contentRoster) return;

  [tabRoster, tabMatrix, tabCtf, tabTools].forEach(t => t && t.classList.remove("active"));
  if (contentRoster) contentRoster.style.display = "none";
  if (contentMatrix) contentMatrix.style.display = "none";
  if (contentCtf) contentCtf.style.display = "none";
  if (contentTools) contentTools.style.display = "none";

  if (tab === "matrix") {
    tabMatrix.classList.add("active");
    contentMatrix.style.display = "block";
    renderAdminMatrix(adminCachedStudents);
  } else if (tab === "ctf" && tabCtf && contentCtf) {
    tabCtf.classList.add("active");
    contentCtf.style.display = "block";
    renderAdminCtfPanel();
  } else if (tab === "tools") {
    tabTools.classList.add("active");
    contentTools.style.display = "block";
  } else {
    tabRoster.classList.add("active");
    contentRoster.style.display = "block";
    renderAdminStudentTable(adminCachedStudents);
  }
}

async function fetchAdminUsers() {
  // 1. Try Vercel Serverless API
  try {
    const url = getApiUrl() + "?action=admin_users&t=" + Date.now();
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "ok" && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (e) {
    console.warn("Vercel admin_users fetch error:", e);
  }

  // 2. Direct fallback to KV Bucket
  try {
    const rawUsers = await fetchDirectCloudUsers();
    const students = [];
    for (const [uname, u] of Object.entries(rawUsers)) {
      if (uname.toLowerCase() === "admin") continue;
      students.push({
        username: uname,
        role: u.role || "student",
        score: Number(u.score) || 0,
        solved: Array.isArray(u.solved) ? u.solved : [],
        solvedCount: Array.isArray(u.solved) ? u.solved.length : 0,
        conceptSolved: Array.isArray(u.conceptSolved) ? u.conceptSolved : [],
        currentTaskId: u.currentTaskId || 1,
        currentTaskTitle: u.currentTaskTitle || "Host Reachability & ICMP Verification",
        currentTaskModule: u.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
        lastActive: u.lastActive || "Recently",
        updatedAt: u.updatedAt || Date.now()
      });
    }

    // Also include any users in local cache not in rawUsers
    const localUsers = getStoredUsers();
    for (const [uname, u] of Object.entries(localUsers)) {
      if (uname.toLowerCase() === "admin") continue;
      if (!students.find(s => s.username.toLowerCase() === uname.toLowerCase())) {
        students.push({
          username: uname,
          role: u.role || "student",
          score: Number(u.score) || 0,
          solved: Array.isArray(u.solved) ? u.solved : [],
          solvedCount: Array.isArray(u.solved) ? u.solved.length : 0,
          conceptSolved: Array.isArray(u.conceptSolved) ? u.conceptSolved : [],
          currentTaskId: u.currentTaskId || 1,
          currentTaskTitle: u.currentTaskTitle || "Host Reachability & ICMP Verification",
          currentTaskModule: u.currentTaskModule || "Module 01: Introduction to Ethical Hacking",
          lastActive: u.lastActive || "Local device",
          updatedAt: u.updatedAt || Date.now()
        });
      }
    }

    students.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
    return students;
  } catch (err) {
    console.warn("Direct KV admin users fetch error:", err);
  }

  // 3. Fallback to Leaderboard
  const lb = getLeaderboard();
  return lb.map(entry => ({
    username: entry.username,
    role: "student",
    score: entry.score || 0,
    solved: [],
    solvedCount: entry.solvedCount || 0,
    currentTaskId: entry.currentTaskId || 1,
    currentTaskTitle: entry.currentTaskTitle || "Host Reachability & ICMP Verification",
    currentTaskModule: "Module 01: Introduction to Ethical Hacking",
    lastActive: entry.lastActive || "Recently"
  }));
}

async function refreshAdminPortal() {
  const tableBody = document.getElementById("adminStudentTableBody");
  if (tableBody && (!adminCachedStudents || adminCachedStudents.length === 0)) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">🔄 Synchronizing student roster from cloud database...</td></tr>`;
  }

  const users = await fetchAdminUsers();
  adminCachedStudents = (users || []).filter(u => u.username.toLowerCase() !== "admin");

  // Calculate KPIs
  const totalStudents = adminCachedStudents.length;
  const totalSolved = adminCachedStudents.reduce((acc, s) => acc + (s.solvedCount || 0), 0);
  const avgScore = totalStudents > 0 ? Math.round(adminCachedStudents.reduce((acc, s) => acc + (s.score || 0), 0) / totalStudents) : 0;
  const topStudent = adminCachedStudents.length > 0 ? adminCachedStudents[0] : null;

  const elTotalStudents = document.getElementById("adminStatTotalStudents");
  const elTotalSolved = document.getElementById("adminStatTotalSolved");
  const elAvgScore = document.getElementById("adminStatAvgScore");
  const elTopStudent = document.getElementById("adminStatTopStudent");

  if (elTotalStudents) elTotalStudents.innerText = totalStudents;
  if (elTotalSolved) elTotalSolved.innerText = totalSolved;
  if (elAvgScore) elAvgScore.innerText = `${avgScore} pts`;
  if (elTopStudent) {
    elTopStudent.innerText = topStudent ? `${topStudent.username} (${topStudent.score} pts)` : "-";
  }

  renderAdminStudentTable(adminCachedStudents);
  renderAdminMatrix(adminCachedStudents);
  renderAdminCtfPanel();
}

function renderAdminStudentTable(students) {
  const tbody = document.getElementById("adminStudentTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!students || students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">
          No registered students found in database.
        </td>
      </tr>
    `;
    return;
  }

  students.forEach((s, idx) => {
    const tr = document.createElement("tr");
    const taskId = s.currentTaskId || 1;
    const taskTitle = s.currentTaskTitle || "Host Reachability & ICMP Verification";
    const taskModule = s.currentTaskModule || "Module 01: Introduction to Ethical Hacking";
    const solvedCount = s.solvedCount || (Array.isArray(s.solved) ? s.solved.length : 0);
    const pct = Math.min(100, Math.round((solvedCount / taskTotal()) * 100));

    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="student-avatar">${escapeHtml(s.username.substring(0, 2).toUpperCase())}</span>
          <strong style="color: var(--text-main); font-size: 0.88rem;">${escapeHtml(s.username)}</strong>
        </div>
      </td>
      <td>
        <div class="admin-task-pill">
          <span>📍</span>
          <strong>Q${taskId}:</strong>
          <span style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(taskTitle)}</span>
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 3px; padding-left: 2px;">
          ${escapeHtml(taskModule)}
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600; font-size: 0.82rem;">${solvedCount} / ${taskTotal()}</span>
          <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; min-width: 50px;">
            <div style="width: ${pct}%; height: 100%; background: var(--accent-green); border-radius: 3px;"></div>
          </div>
        </div>
      </td>
      <td style="color: var(--accent-yellow); font-weight: 700; font-size: 0.88rem;">${s.score || 0} pts</td>
      <td style="color: var(--text-muted); font-size: 0.76rem;">${escapeHtml(s.lastActive || "Recently")}</td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
          <button onclick="adminResetStudent('${escapeHtml(s.username)}')" class="btn-header" style="padding: 3px 8px; font-size: 0.72rem; color: var(--accent-yellow); border-color: rgba(255,215,0,0.3);" title="Reset progress to 0 for ${escapeHtml(s.username)}">
            🔄 Reset
          </button>
          <button onclick="adminDeleteStudent('${escapeHtml(s.username)}')" class="btn-header" style="padding: 3px 8px; font-size: 0.72rem; color: var(--accent-red); border-color: rgba(255,82,82,0.4); background: rgba(255,82,82,0.08);" title="Delete account permanently for ${escapeHtml(s.username)}">
            🗑️ Delete
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAdminMatrix(students) {
  const headerTr = document.getElementById("adminMatrixHeader");
  const matrixBody = document.getElementById("adminMatrixBody");
  if (!headerTr || !matrixBody) return;

  // Columns: Education tasks, plus CTF tasks while CTF mode is on
  const matrixTasks = ctfConfig.enabled ? ALL_TASKS : CEH_QUESTIONS;
  const colLabel = (t) => (isCtfTask(t) ? `🚩${ctfNumber(t)}` : `Q${t.id}`);

  let hHtml = `<th style="position: sticky; left: 0; background: var(--bg-card); z-index: 2; min-width: 120px;">Student</th>`;
  matrixTasks.forEach((t) => {
    hHtml += `<th style="text-align: center; width: 28px; padding: 4px 2px;" title="${isCtfTask(t) ? "CTF" : "Task"} ${isCtfTask(t) ? ctfNumber(t) : t.id}: ${escapeHtml(t.title || '')}">${colLabel(t)}</th>`;
  });
  hHtml += `<th style="text-align: center; width: 60px;">Total</th>`;
  headerTr.innerHTML = hHtml;

  // Build student rows
  matrixBody.innerHTML = "";
  if (!students || students.length === 0) {
    matrixBody.innerHTML = `<tr><td colspan="${matrixTasks.length + 2}" style="text-align:center; padding:20px; color:var(--text-muted);">No student data available.</td></tr>`;
    return;
  }

  students.forEach(s => {
    const tr = document.createElement("tr");
    const solvedSet = new Set(Array.isArray(s.solved) ? s.solved : []);
    const currentQ = Number(s.currentTaskId) || 1;

    let rowHtml = `<td style="position: sticky; left: 0; background: var(--bg-card); z-index: 1; font-weight: 600;">${escapeHtml(s.username)}</td>`;
    let solvedHere = 0;
    matrixTasks.forEach((t) => {
      const label = colLabel(t);
      if (solvedSet.has(t.id)) {
        solvedHere++;
        rowHtml += `<td class="matrix-cell matrix-solved" title="${label}: Solved (Passed)">✓</td>`;
      } else if (t.id === currentQ) {
        rowHtml += `<td class="matrix-cell matrix-current" title="${label}: Active Current Task">📍</td>`;
      } else {
        rowHtml += `<td class="matrix-cell" style="color: var(--text-muted); opacity: 0.35;">·</td>`;
      }
    });
    rowHtml += `<td style="text-align: center; font-weight: 700; color: var(--accent-cyan);">${solvedHere} / ${matrixTasks.length}</td>`;
    tr.innerHTML = rowHtml;
    matrixBody.appendChild(tr);
  });
}

function filterAdminStudents() {
  const query = (document.getElementById("adminStudentSearch")?.value || "").toLowerCase().trim();
  if (!query) {
    renderAdminStudentTable(adminCachedStudents);
    return;
  }
  const filtered = adminCachedStudents.filter(s => s.username.toLowerCase().includes(query));
  renderAdminStudentTable(filtered);
}

function exportAdminCSV() {
  if (!adminCachedStudents || adminCachedStudents.length === 0) {
    alert("No student data available to export.");
    return;
  }

  const headers = ["Username", "Role", "Current_Task_ID", "Current_Task_Title", "Tasks_Solved", "Total_Tasks", "Score", "Last_Active", "Updated_At"];
  const rows = adminCachedStudents.map(s => [
    `"${s.username.replace(/"/g, '""')}"`,
    `"${(s.role || "student").replace(/"/g, '""')}"`,
    s.currentTaskId || 1,
    `"${(s.currentTaskTitle || "Host Reachability").replace(/"/g, '""')}"`,
    s.solvedCount || 0,
    taskTotal(),
    s.score || 0,
    `"${(s.lastActive || "Recently").replace(/"/g, '""')}"`,
    s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString()
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ceh_v13_student_progress_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function handleAdminCreateUser(e) {
  e.preventDefault();
  const unameInput = document.getElementById("adminNewUsername");
  const passInput = document.getElementById("adminNewPassword");
  const uname = (unameInput?.value || "").trim();
  const pass = (passInput?.value || "").trim() || "Pa$$w0rd";

  if (!uname) {
    alert("Please enter a username.");
    return;
  }

  const res = await cloudSignupUser(uname, pass);
  if (!res.ok && !res.offline) {
    alert(res.message || "Failed to create account.");
    return;
  }

  unameInput.value = "";
  if (passInput) passInput.value = "";
  alert(`Student account '${uname}' created successfully with password '${pass}'.`);
  await refreshAdminPortal();
  setAdminTab("roster");
}

async function adminResetStudent(username) {
  if (!confirm(`Are you sure you want to reset all solved tasks and score for student '${username}'? This cannot be undone.`)) {
    return;
  }

  // 1. Try Vercel Serverless API
  try {
    const url = getApiUrl() + "?action=admin_reset_user";
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
  } catch (e) {
    console.warn("Vercel admin_reset_user error:", e);
  }

  // 2. Direct fallback to KV Bucket
  try {
    const users = await fetchDirectCloudUsers();
    if (users[username]) {
      users[username].score = 0;
      users[username].solved = [];
      users[username].conceptSolved = [];
      users[username].penalties = {};
      users[username].currentTaskId = 1;
      users[username].currentTaskTitle = "Host Reachability & ICMP Verification";
      users[username].lastActive = "Reset by Admin";
      users[username].updatedAt = Date.now();
      await saveDirectCloudUsers(users);
    }

    const leaderboard = await fetchDirectCloudLeaderboard();
    const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === username.toLowerCase());
    if (exIdx !== -1) {
      leaderboard[exIdx].score = 0;
      leaderboard[exIdx].solvedCount = 0;
      leaderboard[exIdx].currentTaskId = 1;
      leaderboard[exIdx].currentTaskTitle = "Host Reachability & ICMP Verification";
      leaderboard[exIdx].lastActive = "Reset by Admin";
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await saveDirectCloudLeaderboard(leaderboard);
      saveLeaderboard(leaderboard);
    }
  } catch (err) {
    console.warn("Direct KV reset error:", err);
  }

  // 3. Local Cache reset
  const localUsers = getStoredUsers();
  if (localUsers[username]) {
    localUsers[username].score = 0;
    localUsers[username].solved = [];
    localUsers[username].conceptSolved = [];
    localUsers[username].penalties = {};
    localUsers[username].currentTaskId = 1;
    localUsers[username].currentTaskTitle = "Host Reachability & ICMP Verification";
    localUsers[username].lastActive = "Reset by Admin";
    saveStoredUsers(localUsers);
  }

  alert(`Student '${username}' progress has been reset.`);
  await refreshAdminPortal();
}

async function adminDeleteStudent(username) {
  if (!username || username.toLowerCase() === "admin") {
    alert("Cannot delete administrator account.");
    return;
  }

  if (!confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete student account '${username}'?\n\nThis will remove their login credentials, task progress, and leaderboard record.`)) {
    return;
  }

  // 1. Try Vercel Serverless API
  try {
    const url = getApiUrl() + "?action=admin_delete_user";
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username })
    });
  } catch (e) {
    console.warn("Vercel admin_delete_user error:", e);
  }

  // 2. Direct fallback to KV Bucket
  try {
    const users = await fetchDirectCloudUsers();
    if (users[username]) {
      delete users[username];
      await saveDirectCloudUsers(users);
    }

    const leaderboard = await fetchDirectCloudLeaderboard();
    const updatedLb = (leaderboard || []).filter(x => x.username.toLowerCase() !== username.toLowerCase());
    await saveDirectCloudLeaderboard(updatedLb);
    saveLeaderboard(updatedLb);
  } catch (err) {
    console.warn("Direct KV delete error:", err);
  }

  // 3. Local Cache deletion
  const localUsers = getStoredUsers();
  if (localUsers[username]) {
    delete localUsers[username];
    saveStoredUsers(localUsers);
  }
  let localLb = getLeaderboard();
  localLb = localLb.filter(x => x.username.toLowerCase() !== username.toLowerCase());
  saveLeaderboard(localLb);

  // If deleted user was currently logged in in this session, sign them out
  if (currentUser && currentUser.username.toLowerCase() === username.toLowerCase()) {
    handleSignOut();
  }

  alert(`Student '${username}' has been permanently deleted.`);
  await refreshAdminPortal();
}

// ========================================================
// ANTI-COPY & ANTI-PASTE EVENT LISTENERS
// ========================================================

// 1. Prevent paste into terminal input
elTerminalInput.addEventListener("paste", (e) => {
  e.preventDefault();
  showPasteWarning();
});

// 2. Prevent drop into terminal input
elTerminalInput.addEventListener("drop", (e) => {
  e.preventDefault();
  showPasteWarning();
});

// 3. Block Ctrl+V / Command+V keystrokes
elTerminalInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    e.preventDefault();
    showPasteWarning();
    return;
  }

  if (e.key === "Enter") {
    const val = elTerminalInput.value;
    if (val.trim()) {
      commandHistory.push(val);
      historyIndex = commandHistory.length;
      const hud = document.getElementById("cliIntellisenseHud");
      if (hud) hud.style.display = "none";
      evaluateCommand(val);
      elTerminalInput.value = "";
      updateKeystrokeTracker("");
      updateCliIntellisense("");
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (commandHistory.length > 0 && historyIndex > 0) {
      historyIndex--;
      elTerminalInput.value = commandHistory[historyIndex];
      updateKeystrokeTracker(elTerminalInput.value);
      updateCliIntellisense(elTerminalInput.value);
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      elTerminalInput.value = commandHistory[historyIndex];
      updateKeystrokeTracker(elTerminalInput.value);
      updateCliIntellisense(elTerminalInput.value);
    } else {
      historyIndex = commandHistory.length;
      elTerminalInput.value = "";
      updateKeystrokeTracker("");
      updateCliIntellisense("");
    }
  }
});

// 4. Live typing highlight tracking & Intellisense Parameter HUD!
elTerminalInput.addEventListener("input", () => {
  updateKeystrokeTracker(elTerminalInput.value);
  updateCliIntellisense(elTerminalInput.value);
});

// 5. Block copy on solution and manual areas
document.addEventListener("copy", (e) => {
  const selection = window.getSelection().toString();
  if (selection) {
    const activeEl = document.activeElement;
    if (activeEl && activeEl !== elTerminalInput) {
      // Allow general selection outside, but prevent copying command blocks
      const anchorNode = window.getSelection().anchorNode;
      if (anchorNode && anchorNode.parentElement && anchorNode.parentElement.closest(".no-copy")) {
        e.preventDefault();
        showPasteWarning();
      }
    }
  }
});

document.querySelector(".terminal-pane").addEventListener("click", () => {
  elTerminalInput.focus();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCheatSheet();
    closeLeaderboard();
    closeCloudModal();
    closeAdminPortal();
    if (currentUser) {
      closeAuthModal();
    }
  }
});

["cheatModal", "leaderboardModal", "cloudModal", "adminPortalModal"].forEach((id) => {
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.addEventListener("click", (e) => {
      if (e.target.id === id) {
        modalEl.style.display = "none";
      }
    });
  }
});

// ========================================================
// CLI Intelligence & Real-Time Parameter Intellisense HUD
// ========================================================
const CLI_KNOWLEDGE_BASE = {
  // Primary Utilities & Tools
  tools: {
    "nmap": {
      name: "Network Mapper (Nmap)",
      category: "Port Scanner & Recon",
      desc: "Core port scanner & network discovery utility used to identify alive hosts, open listening ports, daemon versions, and OS fingerprints.",
      tip: "Pro Tip: Type flags like <code>-sS</code> (SYN stealth), <code>-sV</code> (version probe), <code>-O</code> (OS detection), or target IP."
    },
    "ping": {
      name: "Packet Internet Groper (Ping)",
      category: "ICMP Diagnostics",
      desc: "Sends ICMP ECHO_REQUEST packets to network hosts to verify connectivity, latency, and packet loss.",
      tip: "Pro Tip: Use <code>-c &lt;count&gt;</code> to set number of echo requests (e.g. <code>ping -c 4 10.10.1.22</code>)."
    },
    "traceroute": {
      name: "Traceroute Diagnostic",
      category: "Path & Hop Recon",
      desc: "Traces the Layer 3 route packets take to destination, revealing intermediate gateway routers and hop latencies.",
      tip: "Pro Tip: Uses ICMP/UDP with incrementing TTL values to map network topology."
    },
    "tracert": {
      name: "Traceroute Diagnostic (Windows)",
      category: "Path & Hop Recon",
      desc: "Windows utility tracing the route to destination host using ICMP echo requests.",
      tip: "Pro Tip: Use <code>-d</code> to avoid resolving IP addresses to hostnames."
    },
    "curl": {
      name: "Client URL (cURL)",
      category: "HTTP Banner Grabbing",
      desc: "Command-line tool for transferring data with URLs. Used for testing web endpoints, fetching HTTP response headers, and banner grabbing.",
      tip: "Pro Tip: Use <code>-I</code> to retrieve HTTP response headers without downloading the body."
    },
    "dig": {
      name: "Domain Information Groper",
      category: "DNS Reconnaissance",
      desc: "Flexible DNS interrogation tool for querying DNS name servers, verifying MX records, NS delegations, and zone transfers.",
      tip: "Pro Tip: Common queries: <code>mx</code> (mail servers), <code>ns</code> (nameservers), <code>axfr</code> (zone transfer attempt)."
    },
    "nslookup": {
      name: "Name Server Lookup",
      category: "DNS Interrogation",
      desc: "Network administration tool for querying Domain Name System (DNS) servers to obtain domain name or IP address mappings.",
      tip: "Pro Tip: Use <code>-type=ns</code> or <code>-type=soa</code> to query specific DNS resource record types."
    },
    "nbtstat": {
      name: "NetBIOS over TCP/IP Diagnostics",
      category: "Windows NetBIOS Recon",
      desc: "Displays NetBIOS protocol statistics, local name tables, and remote computer name tables mapped via TCP/IP.",
      tip: "Pro Tip: Use <code>-a &lt;IP&gt;</code> to query remote NetBIOS name table, or <code>-c</code> to dump local NetBIOS cache."
    },
    "net": {
      name: "Windows Net Command",
      category: "Windows Resource Admin",
      desc: "Manages network resources, mapped SMB shares, user accounts, and services in Windows and Samba environments.",
      tip: "Pro Tip: Use <code>net use</code> to display currently mapped shared folders and active SMB connections."
    },
    "snmpwalk": {
      name: "SNMP Subtree Query",
      category: "SNMP Enumeration",
      desc: "Queries target network devices via SNMP GETNEXT requests to extract an entire subtree of MIB management values.",
      tip: "Pro Tip: Use <code>-v1</code> or <code>-v2c</code> with community string <code>-c public</code> followed by the target IP."
    },
    "python3": {
      name: "Python Interpreter",
      category: "Script Execution",
      desc: "Executes Python scripts, custom exploits, and automated security scanning tools (such as <code>rpc-scan.py</code>).",
      tip: "Pro Tip: Pass arguments like <code>--rpc</code> to invoke specific RPC enumeration functions."
    },
    "enum4linux": {
      name: "Enum4Linux Recon Utility",
      category: "SMB & Active Directory Recon",
      desc: "Perl tool designed to enumerate security information from Windows and Samba systems (users, shares, password policies, groups).",
      tip: "Pro Tip: Use <code>-U</code> for user accounts, <code>-S</code> for shares, or <code>-a</code> for full enumeration."
    },
    "sgpt": {
      name: "ShellGPT (AI CLI Assistant)",
      category: "AI-Powered Recon & Automation",
      desc: "OpenAI-powered command-line interface that translates plain natural language requests directly into executable shell commands.",
      tip: "Pro Tip: Use <code>--shell</code> with a prompt string in quotes, and optionally <code>--chat &lt;session&gt;</code> to maintain conversational context."
    },
    "nikto": {
      name: "Nikto Web Vulnerability Scanner",
      category: "Web Server Security Auditor",
      desc: "Tests web servers against 6,700+ dangerous files/CGIs, outdated software versions, and common server misconfigurations.",
      tip: "Pro Tip: Use <code>-h &lt;target_url&gt;</code> to target the remote web application (e.g. <code>nikto -h http://10.10.1.22</code>)."
    },
    "searchsploit": {
      name: "SearchSploit (Exploit-DB CLI)",
      category: "Exploit Research & PoC Lookup",
      desc: "Command-line search tool for Exploit-Database. Enables offline searches through thousands of public exploits and shellcodes.",
      tip: "Pro Tip: Search for CVE numbers, OS versions, or vulnerability codes like <code>ms17-010</code>."
    },
    "hping3": {
      name: "Custom Packet Crafter",
      category: "Advanced Packet Crafting",
      desc: "Network tool capable of sending custom TCP/UDP/ICMP packets and analyzing replies for firewall auditing and advanced probing.",
      tip: "Pro Tip: Use <code>-S</code> for SYN mode, <code>-p &lt;port&gt;</code> for port targeting, <code>-c &lt;count&gt;</code>."
    },
    "smbclient": {
      name: "SMB / CIFS Client",
      category: "Network Share Access",
      desc: "Client tool for accessing and enumerating shared resources (SMB/CIFS) on Windows and Samba file servers.",
      tip: "Pro Tip: Use <code>-L &lt;target&gt;</code> to list available shares and <code>-N</code> for anonymous null session."
    },
    "hydra": {
      name: "THC Hydra Network Logon Cracker",
      category: "Online Password Brute-Forcer",
      desc: "High-speed parallelized network authentication cracking tool supporting dozens of protocols (SSH, FTP, HTTP, SMB, RDP).",
      tip: "Pro Tip: Specify <code>-l &lt;user&gt;</code> or <code>-L &lt;wordlist&gt;</code> and <code>-p &lt;pass&gt;</code> or <code>-P &lt;wordlist&gt;</code>."
    },
    "wpscan": {
      name: "WordPress Security Scanner",
      category: "CMS Security Scanner",
      desc: "Black-box WordPress security scanner detecting core vulnerabilities, vulnerable plugins, and user accounts.",
      tip: "Pro Tip: Use <code>--url &lt;target&gt;</code> and <code>-e u,vp</code> to enumerate users and vulnerable plugins."
    },
    "whois": {
      name: "WHOIS Domain Registrar Query",
      category: "Passive Reconnaissance",
      desc: "Queries regional Internet registries for domain ownership, registrar information, DNS nameservers, and IP allocations.",
      tip: "Pro Tip: Generates zero network packets to the actual target servers."
    },
    "msfconsole": {
      name: "Metasploit Framework Console",
      category: "Exploitation Platform",
      desc: "All-in-one penetration testing platform with exploit modules, payloads, auxiliary scanners, and post-exploitation tools.",
      tip: "Pro Tip: Use <code>search</code> to find modules and <code>use &lt;module&gt;</code> to load them."
    }
  },

  // Flags & Parameters Dictionary
  flags: {
    // Nmap Flags
    "-ss": { name: "TCP SYN Stealth Scan", type: "Scan Type", desc: "Half-open scan. Sends SYN, target returns SYN/ACK, scanner immediately replies RST to abort connection before logging." },
    "-st": { name: "TCP Full Connect Scan", type: "Scan Type", desc: "Completes the full 3-way handshake (SYN -> SYN/ACK -> ACK). Slower, logs connections, used when unprivileged." },
    "-su": { name: "UDP Port Scan", type: "Scan Type", desc: "Sends empty UDP packets to ports. Open/filtered ports return no reply; closed ports return ICMP Port Unreachable." },
    "-sv": { name: "Service Version Detection", type: "Detection", desc: "Probes open listening ports with application payloads to extract exact daemon names and version numbers." },
    "-o": { name: "Operating System Detection", type: "Detection", desc: "Sends probe packets and compares TCP/IP stack implementation responses against Nmap OS fingerprint database." },
    "-a": { name: "Aggressive Scan Mode", type: "Scan Mode", desc: "Enables OS detection (-O), service version detection (-sV), Nmap script scanning (-sC), and traceroute (--traceroute)." },
    "-pn": { name: "Skip Host Discovery", type: "Bypass", desc: "Treats all target hosts as online. Bypasses firewalls that block ICMP echo ping packets." },
    "-sn": { name: "Ping Sweep / No Port Scan", type: "Discovery", desc: "Only determines which target hosts are online without conducting any port scanning." },
    "-p": { name: "Port Specification", type: "Targeting", desc: "Specifies target ports to probe (e.g. -p 80,445 or -p 1-1000 or -p- for all 65,535 ports)." },
    "-p-": { name: "All 65,535 Ports", type: "Port Range", desc: "Scans every single port from 1 to 65535 instead of the top 1,000 default ports." },
    "-t4": { name: "Aggressive Timing Template", type: "Performance", desc: "Shortens probe timeouts and speeds up scan execution. Ideal for fast, reliable lab and local networks." },
    "-t2": { name: "Polite Timing Template", type: "Evasion", desc: "Slows scan down to consume minimal target bandwidth and reduce IDS/IPS alert thresholds." },
    "-f": { name: "Packet Fragmentation", type: "Firewall Evasion", desc: "Splits TCP header across 8-byte fragments to evade packet filtering devices and inspection firewalls." },
    "-d": { name: "Decoy Cloaking Scan", type: "Evasion", desc: "Spoofs random decoy IP addresses alongside real scanner IP (e.g. -D RND:5) to conceal the origin of scan." },
    "-g": { name: "Source Port Override", type: "Firewall Bypass", desc: "Transmits scan packets originating from a specific source port (e.g. -g 80) to bypass stateful filtering rules." },
    "-v": { name: "Verbose Output", type: "Verbosity", desc: "Increases verbosity level to display open ports dynamically in real time as they are found." },
    "--script": { name: "Nmap Scripting Engine (NSE)", type: "Scripts", desc: "Executes automated Lua vulnerability and discovery scripts (e.g. --script vuln, smb-os-discovery.nse, banner)." },

    // Ping & Traceroute Flags
    "-c": { name: "Packet Count", type: "Argument", desc: "Specifies the exact number of ICMP echo packets to transmit before exiting." },
    "-i": { name: "Packet Interval", type: "Timing", desc: "Wait interval in seconds between transmitting each packet (default is 1s)." },
    "-m": { name: "Maximum Hops", type: "Routing", desc: "Specifies the maximum number of network hops (TTL) to trace before terminating." },
    "-n": { name: "Numeric Addresses Only", type: "Format", desc: "Displays IP addresses numerically without performing time-consuming reverse DNS lookups." },

    // Curl Flags
    "-i": { name: "HTTP Response Headers Only", type: "Inspection", desc: "Capital -I: Fetches HTTP response headers only without downloading page body. Used for banner grabbing." },

    // Nbtstat & Net Flags
    "-a": { name: "Remote NetBIOS IP / Name Query", type: "NetBIOS", desc: "Dumps remote machine NetBIOS name table (capital -A queries IP, lowercase -a queries hostname)." },
    "use": { name: "Map Remote Share / Drive", type: "Subcommand", desc: "Connects a local drive letter to, or disconnects from, a shared network folder (SMB)." },

    // Enum4linux Flags
    "-u": { name: "Enumerate User Accounts", type: "User Recon", desc: "Queries target Windows/Samba host for list of local user accounts via RPC and RID cycling." },
    "-s": { name: "Enumerate SMB Shares", type: "Share Recon", desc: "Extracts all public and administrative shares (C$, ADMIN$, IPC$) and tests access permissions." },
    "-p": { name: "Extract Password Policy", type: "Policy Recon", desc: "Retrieves target password complexity requirements, minimum length, and account lockout thresholds." },

    // SNMP Flags
    "-v1": { name: "SNMP Protocol Version 1", type: "Version", desc: "Uses SNMPv1 (unencrypted community string authentication)." },
    "-v2c": { name: "SNMP Protocol Version 2c", type: "Version", desc: "Uses SNMPv2c with community strings; standard in most enterprise management environments." },
    "-v3": { name: "SNMP Protocol Version 3", type: "Version", desc: "Uses SNMPv3 with user-based security model (USM) providing authentication and encryption." },
    "public": { name: "Default SNMP Community", type: "Community", desc: "Standard read-only community string commonly configured by default on network equipment." },

    // Dig & DNS Flags
    "axfr": { name: "Authoritative Zone Transfer", type: "DNS Query", desc: "Requests a complete replication/dump of the DNS zone file containing all target subdomains." },
    "any": { name: "Query All DNS Records", type: "DNS Query", desc: "Requests all available DNS records (A, AAAA, CNAME, MX, TXT, SOA) for the domain." },
    "mx": { name: "Mail Exchange Query", type: "DNS Query", desc: "Queries DNS for mail transfer agents (MX) designated to accept incoming email for domain." },
    "ns": { name: "Nameserver Query", type: "DNS Query", desc: "Queries DNS for authoritative name server hosts responsible for resolving records in the zone." },
    "soa": { name: "Start of Authority Query", type: "DNS Query", desc: "Queries DNS Start of Authority record showing primary DNS master server, admin email, and serial." },

    // Nslookup Flags
    "-type=ns": { name: "Nameserver Record Query", type: "DNS Query", desc: "Instructs nslookup to request authoritative nameserver records for the domain." },
    "-type=soa": { name: "Start of Authority Query", type: "DNS Query", desc: "Instructs nslookup to request Start of Authority administrative record." },
    "-type=any": { name: "All Records Query", type: "DNS Query", desc: "Instructs nslookup to request all available DNS records." },

    // ShellGPT Flags
    "--shell": { name: "Shell Mode Execution", type: "AI Action", desc: "Instructs ShellGPT to generate and prompt execution of a shell command based on natural language." },
    "--chat": { name: "Conversational Session", type: "AI State", desc: "Maintains contextual conversational memory across ShellGPT commands in named session." },

    // RPC & Exploit
    "--rpc": { name: "RPC Enumeration Mode", type: "RPC Query", desc: "Executes Remote Procedure Call endpoint enumeration against target Windows services." },
    "ms17-010": { name: "EternalBlue Exploit Search", type: "Vulnerability ID", desc: "Exploit-DB query for MS17-010 Windows SMB Remote Code Execution vulnerability." }
  }
};

// Real-Time CLI Parameter Intellisense HUD Updater
function updateCliIntellisense(rawInput) {
  const hud = document.getElementById("cliIntellisenseHud");
  const hudBadge = document.getElementById("hudBadge");
  const hudTokenName = document.getElementById("hudTokenName");
  const hudTypeLabel = document.getElementById("hudTypeLabel");
  const hudBodyText = document.getElementById("hudBodyText");
  const hudFooterTipText = document.getElementById("hudFooterTipText");

  if (!hud || !hudBadge || !hudTokenName || !hudTypeLabel || !hudBodyText || !hudFooterTipText) return;

  if (isCtfTask(ALL_TASKS[currentIndex])) {
    hud.style.display = "none";
    return;
  }

  if (!rawInput || !rawInput.trim()) {
    hud.style.display = "none";
    return;
  }

  const trimmed = rawInput.trim();
  const endsWithSpace = rawInput.endsWith(" ");
  const tokens = trimmed.split(/\s+/);
  const currentToken = tokens[tokens.length - 1];
  const toolName = tokens[0].toLowerCase();
  const lowerToken = currentToken.toLowerCase();

  // 1. Tool Matching (First token, no space yet)
  if (tokens.length === 1 && !endsWithSpace) {
    const toolInfo = CLI_KNOWLEDGE_BASE.tools[toolName];
    if (toolInfo) {
      hudBadge.className = "hud-badge tool";
      hudBadge.innerText = "COMMAND TOOL";
      hudTokenName.innerText = tokens[0];
      hudTypeLabel.innerText = toolInfo.category;
      hudBodyText.innerText = toolInfo.desc;
      hudFooterTipText.innerHTML = toolInfo.tip;
      hud.style.display = "flex";
      return;
    }
  }

  // 2. Next Expected Arguments Hint (Right after typing tool name and pressing space)
  if (tokens.length === 1 && endsWithSpace) {
    const toolInfo = CLI_KNOWLEDGE_BASE.tools[toolName];
    if (toolInfo) {
      hudBadge.className = "hud-badge option";
      hudBadge.innerText = "NEXT ARGUMENTS";
      hudTokenName.innerText = `${tokens[0]} [flags...]`;
      hudTypeLabel.innerText = "Syntax Helper";
      hudBodyText.innerText = `Command '${tokens[0]}' selected. Now specify scan flags, arguments, or target.`;
      hudFooterTipText.innerHTML = toolInfo.tip;
      hud.style.display = "flex";
      return;
    }
  }

  // 3. Target IP Address Matching
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/\d{1,2})?$/.test(currentToken)) {
    hudBadge.className = "hud-badge target";
    hudBadge.innerText = "TARGET HOST";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = "Destination IP / Subnet";
    const isLabTarget = currentToken === "10.10.1.22" || currentToken === "10.10.1.11" || currentToken === "10.10.1.19";
    hudBodyText.innerText = isLabTarget
      ? `In-scope target system for this CEH exercise (${currentToken}).`
      : `Network target IP address (${currentToken}).`;
    hudFooterTipText.innerHTML = "Make sure the target IP matches the task requirements on the left.";
    hud.style.display = "flex";
    return;
  }

  // 4. Target Domain Name Matching
  if (currentToken.includes(".") && !currentToken.startsWith("-") && !currentToken.endsWith(".nse") && !currentToken.endsWith(".py") && /[a-zA-Z]/.test(currentToken)) {
    hudBadge.className = "hud-badge target";
    hudBadge.innerText = "TARGET DOMAIN";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = "FQDN Domain Target";
    hudBodyText.innerText = `In-scope target domain under agreed Rules of Engagement (${currentToken}).`;
    hudFooterTipText.innerHTML = "DNS or web queries will query this domain to discover records, subdomains, and hosts.";
    hud.style.display = "flex";
    return;
  }

  // 5. DNS Direct Server (@server)
  if (currentToken.startsWith("@")) {
    hudBadge.className = "hud-badge target";
    hudBadge.innerText = "DNS SERVER";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = "Target Nameserver";
    hudBodyText.innerText = `Directs DNS query specifically to nameserver host ${currentToken.slice(1)}.`;
    hudFooterTipText.innerHTML = "Direct querying tests if this nameserver permits unrestricted zone transfers (axfr).";
    hud.style.display = "flex";
    return;
  }

  // 6. Specific Known Flag matching
  const flagInfo = CLI_KNOWLEDGE_BASE.flags[lowerToken];
  if (flagInfo) {
    hudBadge.className = "hud-badge arg";
    hudBadge.innerText = "CLI ARGUMENT";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = flagInfo.type;
    hudBodyText.innerText = flagInfo.desc;
    hudFooterTipText.innerHTML = `<strong>${flagInfo.name}</strong>. Provide target host or next parameter.`;
    hud.style.display = "flex";
    return;
  }

  // 7. Port flag (e.g. -p 53,161 or -p 445 or -p 389)
  if (lowerToken.startsWith("-p") && lowerToken.length > 2) {
    hudBadge.className = "hud-badge arg";
    hudBadge.innerText = "PORT FILTER";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = "Port Targeting";
    hudBodyText.innerText = `Limits scan strictly to specified port(s): ${currentToken.slice(2)}.`;
    hudFooterTipText.innerHTML = "Speeds up scan significantly compared to scanning 1,000+ default ports.";
    hud.style.display = "flex";
    return;
  }

  // 8. NSE script (e.g. --script vuln or smb-os-discovery.nse)
  if (lowerToken.includes("script") || lowerToken.endsWith(".nse")) {
    hudBadge.className = "hud-badge option";
    hudBadge.innerText = "NSE SCRIPT";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = "Nmap Scripting Engine";
    hudBodyText.innerText = `Executes automated security audit / detection script (${currentToken}).`;
    hudFooterTipText.innerHTML = "Scripts run in parallel to probe for vulnerabilities, banners, or service information.";
    hud.style.display = "flex";
    return;
  }

  // 9. Generic Flag (-something)
  if (currentToken.startsWith("-")) {
    hudBadge.className = "hud-badge arg";
    hudBadge.innerText = "FLAG / OPTION";
    hudTokenName.innerText = currentToken;
    hudTypeLabel.innerText = "Command Parameter";
    hudBodyText.innerText = `Command-line flag modifier passed to '${tokens[0]}'.`;
    hudFooterTipText.innerHTML = "Check the Argument Breakdown in the left pane for acceptable parameters.";
    hud.style.display = "flex";
    return;
  }

  // Hide if no match
  hud.style.display = "none";
}

// Render Command Breakdown & Arguments in the Left Manual Pane
function renderCommandBreakdown(q) {
  const container = document.getElementById("cmdArgsBreakdown");
  const altBox = document.getElementById("cmdAltArgsTags");
  const taskCmdEl = document.getElementById("taskRequiredCommand");
  if (!container || !q) return;

  container.innerHTML = "";
  if (altBox) altBox.innerHTML = "";

  const solution = q.solution || "";
  if (taskCmdEl) {
    taskCmdEl.innerText = solution;
  }

  // Tokenize preserving quoted strings
  const regex = /(?:[^\s"']+|"[^"]*"|'[^']*')+/g;
  const rawTokens = solution.match(regex) || [];
  const tool = rawTokens[0] ? rawTokens[0].toLowerCase() : "";

  rawTokens.forEach((token, idx) => {
    const card = document.createElement("div");
    card.className = "arg-chip-card";

    let chipType = "arg";
    let chipCodeClass = "";
    let chipName = "Parameter";
    let chipDesc = "Command-line argument passed to utility.";

    const lowerTok = token.toLowerCase();

    if (idx === 0) {
      chipType = "tool";
      chipCodeClass = "tool";
      const tInfo = CLI_KNOWLEDGE_BASE.tools[lowerTok];
      chipName = tInfo ? tInfo.name : "Primary Binary";
      chipDesc = tInfo ? tInfo.desc : "Executable command or tool.";
    } else if (token.startsWith('"') || token.startsWith("'")) {
      chipType = "option";
      chipCodeClass = "";
      chipName = "Natural Language Prompt";
      chipDesc = "Instruction string passed to AI assistant to synthesize command.";
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(token) || (token.includes(".") && !token.startsWith("-") && !token.endsWith(".py") && !token.endsWith(".nse"))) {
      chipType = "target";
      chipCodeClass = "target";
      chipName = "Target Machine / IP";
      chipDesc = `In-scope destination target system (${token}).`;
    } else if (token.startsWith("@")) {
      chipType = "target";
      chipCodeClass = "target";
      chipName = "DNS Server Target";
      chipDesc = `Nameserver queried directly for DNS records (${token}).`;
    } else {
      // Flag or argument
      const fInfo = CLI_KNOWLEDGE_BASE.flags[lowerTok];
      if (fInfo) {
        chipName = fInfo.name;
        chipDesc = fInfo.desc;
      } else if (lowerTok.startsWith("-p") && lowerTok.length > 2) {
        chipName = "Port Specification";
        chipDesc = `Restricts port probe strictly to port(s) ${token.slice(2)}.`;
      } else if (lowerTok.startsWith("--script=")) {
        chipName = "NSE Script Selection";
        chipDesc = `Runs automated Nmap Lua script: ${token.split("=")[1]}.`;
      } else if (lowerTok.startsWith("-d") && lowerTok.includes("rnd")) {
        chipName = "Decoy IP Cloaking";
        chipDesc = "Generates random decoy IP addresses to conceal scanner's real IP.";
      } else if (lowerTok.startsWith("-g")) {
        chipName = "Source Port Override";
        chipDesc = "Sends probes from custom source port to evade filtering rules.";
      } else if (lowerTok === "public") {
        chipName = "SNMP Community String";
        chipDesc = "Standard default read-only SNMP community password.";
      } else if (lowerTok === "ms17-010") {
        chipName = "Exploit Keyword";
        chipDesc = "Searches Exploit-DB for EternalBlue SMB RCE vulnerability.";
      } else if (lowerTok.endsWith(".nse") || lowerTok.includes("smb-") || lowerTok.includes("ldap-") || lowerTok.includes("smtp-") || lowerTok === "vuln") {
        chipName = "NSE Script";
        chipDesc = `Nmap Scripting Engine module: ${token}.`;
      } else if (lowerTok.endsWith(".py")) {
        chipName = "Python Script";
        chipDesc = `Custom security script: ${token}.`;
      } else {
        chipName = `Option: ${token}`;
        chipDesc = `Configures behavior of ${rawTokens[0]}.`;
      }
    }

    card.innerHTML = `
      <div class="arg-chip-header">
        <span class="arg-chip-code ${chipCodeClass}">${token}</span>
        <span class="arg-chip-name">${chipName}</span>
      </div>
      <div class="arg-chip-desc">${chipDesc}</div>
    `;

    container.appendChild(card);
  });

  // Accepted Pro / Alternative Flags Box
  if (altBox) {
    const altFlags = [];
    if (tool === "nmap") {
      altFlags.push({ code: "-Pn", desc: "Skip ICMP ping / bypass firewall" });
      altFlags.push({ code: "-T4", desc: "Aggressive speed template" });
      altFlags.push({ code: "-p-", desc: "Scan all 65,535 ports" });
      altFlags.push({ code: "-O", desc: "OS TCP/IP fingerprinting" });
      altFlags.push({ code: "-A", desc: "Comprehensive aggressive scan" });
      altFlags.push({ code: "-v / -vv", desc: "Verbose console output" });
    } else if (tool === "ping") {
      altFlags.push({ code: "-c 2", desc: "Transmit 2 packets" });
      altFlags.push({ code: "-c 4", desc: "Transmit 4 packets" });
      altFlags.push({ code: "-i 0.5", desc: "Half-second interval" });
    } else if (tool === "traceroute" || tool === "tracert") {
      altFlags.push({ code: "-n", desc: "Numeric IPs without DNS resolve" });
      altFlags.push({ code: "-m 30", desc: "Max 30 hops" });
    } else if (tool === "nslookup") {
      altFlags.push({ code: "-type=ns", desc: "Nameserver records" });
      altFlags.push({ code: "-type=soa", desc: "Start of authority record" });
      altFlags.push({ code: "-type=any", desc: "All available DNS records" });
    } else if (tool === "dig") {
      altFlags.push({ code: "axfr", desc: "Full zone transfer replication" });
      altFlags.push({ code: "mx", desc: "Mail exchange records" });
      altFlags.push({ code: "ns", desc: "Nameservers list" });
      altFlags.push({ code: "any", desc: "Query all records" });
    } else if (tool === "nbtstat") {
      altFlags.push({ code: "-A <IP>", desc: "Query remote NetBIOS table by IP" });
      altFlags.push({ code: "-a <Name>", desc: "Query remote table by hostname" });
      altFlags.push({ code: "-c", desc: "Dump NetBIOS name cache" });
    } else if (tool === "snmpwalk") {
      altFlags.push({ code: "-v1", desc: "SNMP version 1" });
      altFlags.push({ code: "-v2c", desc: "SNMP version 2c (recommended)" });
      altFlags.push({ code: "-c public", desc: "Default public community" });
    } else if (tool === "enum4linux") {
      altFlags.push({ code: "-a", desc: "Full automated enumeration" });
      altFlags.push({ code: "-U", desc: "User accounts list" });
      altFlags.push({ code: "-S", desc: "Shares list" });
      altFlags.push({ code: "-P", desc: "Password policy settings" });
    } else if (tool === "sgpt") {
      altFlags.push({ code: "--shell", desc: "Execute synthesized command" });
      altFlags.push({ code: "--chat <name>", desc: "Stateful session memory" });
    } else if (tool === "nikto") {
      altFlags.push({ code: "-h <host>", desc: "Target web server" });
      altFlags.push({ code: "-ssl", desc: "Force HTTPS connection" });
    } else if (tool === "searchsploit") {
      altFlags.push({ code: "-w", desc: "Show Exploit-DB web URLs" });
      altFlags.push({ code: "-p <id>", desc: "Show full path to exploit script" });
    } else {
      altFlags.push({ code: "-v", desc: "Verbose execution output" });
      altFlags.push({ code: "--help", desc: "Display manual help page" });
    }

    altFlags.forEach(f => {
      const tag = document.createElement("span");
      tag.className = "alt-arg-tag";
      tag.innerHTML = `<code>${f.code}</code> <span>(${f.desc})</span>`;
      altBox.appendChild(tag);
    });
  }
}

// Initialize on Load
window.addEventListener("DOMContentLoaded", async () => {
  cleanMockData();

  // 1. Enforce strict lock: appRoot hidden, authGate visible
  const appRoot = document.getElementById("appRoot");
  const authGate = document.getElementById("authGate");
  if (appRoot) appRoot.style.display = "none";
  if (authGate) authGate.style.display = "flex";

  // Pre-fill username from previous session if exists
  const lastUser = localStorage.getItem("ceh_last_username");
  const loginUser = document.getElementById("loginUsername");
  if (lastUser && loginUser) {
    loginUser.value = lastUser;
  }

  // Ensure default admin user is initialized in local store
  const users = getStoredUsers();
  if (!users["admin"]) {
    users["admin"] = { password: "Pa$$w0rd", role: "admin", score: 0, solved: [], conceptSolved: [] };
    saveStoredUsers(users);
  }

  // Strictly keep appRoot hidden until user logs in or registers.
  // (Reset before any network await so a fast login is never wiped by slow cloud sync.)
  currentUser = null;
  updateAuthUI();

  // Auto-discover Supabase credentials if deployed on Vercel
  await autoDiscoverCloudConfig();
  updateCloudStatusIndicator();
  await syncLocalUsersToCloud();
  const initialLb = await fetchCloudLeaderboard();
  if (initialLb && initialLb.length > 0) {
    renderLeaderboardRows(initialLb);
  }
});
