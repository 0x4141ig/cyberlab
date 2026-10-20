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
function loadQuestion(idx) {
  if (idx < 0 || idx >= CEH_QUESTIONS.length) return;
  currentIndex = idx;
  const q = CEH_QUESTIONS[idx];

  // Update Left Manual Pane
  elModuleTag.innerText = q.moduleTitle;
  elTaskTitle.innerText = `Task ${q.id}: ${q.title}`;
  elTargetBadge.innerHTML = `<strong>Target:</strong> ${q.target}`;

  // Update Required Command Box
  const elTaskRequiredCommand = document.getElementById("taskRequiredCommand");
  if (elTaskRequiredCommand) {
    elTaskRequiredCommand.innerText = q.solution || "";
  }

  elScenarioText.innerText = q.scenario;
  elTaskText.innerText = q.task;
  elExamTipText.innerText = q.cehExamTip;
  elQuestionIndicator.innerText = `Task ${idx + 1} of ${CEH_QUESTIONS.length}`;
  elPointsPill.innerText = `+${q.points || 100} PTS`;

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
    elTutorNotesText.innerText = q.tutorNotes || "Demonstrate command syntax and review output details with students.";
  } else {
    elTutorBox.style.display = "none";
  }

  // Concept Card
  const isSolved = (currentUser && Array.isArray(currentUser.solved)) ? currentUser.solved.includes(q.id) : false;
  if (isSolved) {
    showGuidance("success", `<strong>Challenge Solved!</strong> You've successfully executed this command.`);
    renderConceptQuestion(q, true);
  } else {
    hideGuidance();
    elConceptCard.style.display = "none";
  }

  // Nav buttons
  elBtnPrev.disabled = idx === 0;
  elBtnNext.disabled = idx === CEH_QUESTIONS.length - 1;

  // Terminal Prompt
  elTerminalPrompt.innerText = q.prompt;
  if (q.prompt.startsWith("msf")) {
    elTerminalPrompt.classList.add("msf");
  } else {
    elTerminalPrompt.classList.remove("msf");
  }

  elTerminalInput.value = "";
  elTerminalInput.focus();

  // Reset Live Keystroke Tracker (Hidden by default for pro users)
  setTrackerVisible(false);
  updateKeystrokeTracker("");

  renderQuestionGrid();
}

// Render Question Grid with Module Separation & Ability to Show All
function renderQuestionGrid() {
  if (!elQuestionGrid) return;
  elQuestionGrid.innerHTML = "";

  const modules = [
    { id: 1, name: "Intro to Ethical Hacking" },
    { id: 2, name: "Footprinting & Recon" },
    { id: 3, name: "Scanning Networks" },
    { id: 4, name: "Enumeration & Information Gathering" },
    { id: 5, name: "Vulnerability Analysis" }
  ];

  // If filtered to a specific module, show quick indicator + Show All button
  if (currentFilter !== "all") {
    const activeMod = modules.find(m => m.id.toString() === currentFilter);
    const count = CEH_QUESTIONS.filter(q => q.module.toString() === currentFilter).length;

    const notice = document.createElement("div");
    notice.className = "grid-filter-notice";
    notice.innerHTML = `
      <span>Showing <strong>Module 0${currentFilter}: ${activeMod ? activeMod.name : ''}</strong> (${count} Tasks)</span>
      <button class="btn-grid-show-all" onclick="setModuleFilter('all')">👁️ Show All Modules (${CEH_QUESTIONS.length} Tasks)</button>
    `;
    elQuestionGrid.appendChild(notice);
  }

  const activeModules = currentFilter === "all"
    ? modules
    : modules.filter(m => m.id.toString() === currentFilter);

  activeModules.forEach(mod => {
    const modQuestions = [];
    CEH_QUESTIONS.forEach((q, idx) => {
      if (q.module === mod.id) {
        modQuestions.push({ q, idx });
      }
    });

    if (modQuestions.length === 0) return;

    const row = document.createElement("div");
    row.className = "module-section-row";

    const header = document.createElement("div");
    header.className = "module-row-header";
    header.innerHTML = `
      <span class="module-row-pill mod-${mod.id}">Mod 0${mod.id}</span>
      <span class="module-row-name" title="${mod.name}">${mod.name}</span>
      <span class="module-row-count">(${modQuestions.length})</span>
    `;

    const badgesContainer = document.createElement("div");
    badgesContainer.className = "module-row-badges";

    modQuestions.forEach(({ q, idx }) => {
      const isSolved = (currentUser && Array.isArray(currentUser.solved)) ? currentUser.solved.includes(q.id) : false;
      const badge = document.createElement("div");
      badge.className = `q-badge ${idx === currentIndex ? "current" : ""} ${isSolved ? "completed" : ""}`;
      badge.innerText = q.id;
      badge.title = `Task ${q.id}: ${q.title}`;
      badge.onclick = () => loadQuestion(idx);
      badgesContainer.appendChild(badge);
    });

    row.appendChild(header);
    row.appendChild(badgesContainer);
    elQuestionGrid.appendChild(row);
  });
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
      <span><strong>🔒 Authentication Required</strong> — Please Sign In or Create a Practice Account to begin</span>
      <span style="opacity: 0.85;">Target: 10.10.1.22 (Windows Server 2022)</span>
    `;
    updateProgress();
    renderQuestionGrid();
    loadQuestion(currentIndex);
    return;
  }

  if (btnSignOut) btnSignOut.style.display = "inline-flex";
  elUserDisplay.innerText = currentUser.username;
  elUserScore.innerText = `${currentUser.score} pts`;

  if (currentUser.role === "admin") {
    elRoleBadge.className = "role-badge tutor";
    elRoleBadge.innerText = "Instructor Admin";
    elModeBanner.className = "mode-banner tutor";
    elModeBanner.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%; flex-wrap:wrap; gap:8px;">
        <span><strong>🎓 Instructor Admin Mode</strong> — Full Teaching Access &amp; Solutions Unlocked | Target: 10.10.1.22</span>
        <button class="btn-header" onclick="openAdminPortal()" style="background:var(--accent-cyan); color:#0a0e17; font-weight:700; border:none; padding:4px 12px; font-size:0.75rem; border-radius:4px; cursor:pointer;">
          🛡️ Open Admin Portal &amp; Live Matrix
        </button>
      </div>
    `;
  } else {
    elRoleBadge.className = "role-badge student";
    elRoleBadge.innerText = "Practice";
    elModeBanner.className = "mode-banner student";
    elModeBanner.innerHTML = `
      <span><strong>🎯 Colleague CTF Practice Lab Mode</strong> — Manual typing enforced, earn points</span>
      <span style="color: var(--accent-yellow); font-weight:600;">Score: ${currentUser.score} pts</span>
    `;
  }

  updateProgress();
  renderQuestionGrid();
  loadQuestion(currentIndex);
}

// Progress Bar
function updateProgress() {
  const total = CEH_QUESTIONS.length;
  const done = currentUser ? currentUser.solved.length : 0;
  const pct = Math.round((done / total) * 100);
  elProgressBarFill.style.width = `${pct}%`;
  elProgressText.innerText = `${done} / ${total} (${pct}%)`;
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

  const q = CEH_QUESTIONS[currentIndex];
  const trimmed = userCmd.trim();

  if (!trimmed) return;

  appendTerminalBlock(q.prompt, trimmed);

  // Check acceptance
  let isCorrect = false;
  for (let rule of q.accepted) {
    if (typeof rule === "string" && trimmed.toLowerCase() === rule.toLowerCase()) {
      isCorrect = true;
      break;
    } else if (rule instanceof RegExp && rule.test(trimmed)) {
      isCorrect = true;
      break;
    }
  }

  if (isCorrect) {
    playBeep(true);
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

  const q = CEH_QUESTIONS[currentIndex];
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
  if (currentIndex < CEH_QUESTIONS.length - 1) {
    loadQuestion(currentIndex + 1);
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    loadQuestion(currentIndex - 1);
  }
}

// Hint & Solution (Strictly NO Copy/Paste - forces typing)
function showHint() {
  const q = CEH_QUESTIONS[currentIndex];
  if (!q) return;

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
  const q = CEH_QUESTIONS[currentIndex];
  if (!q) return;

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
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store" }
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
      cache: "no-store",
      headers: { "Cache-Control": "no-cache, no-store" }
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
    const res = await fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
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

      if (currentUser.currentTaskId && currentUser.currentTaskId >= 1 && currentUser.currentTaskId <= CEH_QUESTIONS.length) {
        currentIndex = currentUser.currentTaskId - 1;
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
        if (currentUser.currentTaskId && currentUser.currentTaskId >= 1 && currentUser.currentTaskId <= CEH_QUESTIONS.length) {
          currentIndex = currentUser.currentTaskId - 1;
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
    if (currentUser.currentTaskId && currentUser.currentTaskId >= 1 && currentUser.currentTaskId <= CEH_QUESTIONS.length) {
      currentIndex = currentUser.currentTaskId - 1;
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
      <td>${entry.solvedCount} / ${CEH_QUESTIONS.length}</td>
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
  const tabTools = document.getElementById("tabAdminTools");

  const contentRoster = document.getElementById("adminTabContentRoster");
  const contentMatrix = document.getElementById("adminTabContentMatrix");
  const contentTools = document.getElementById("adminTabContentTools");

  if (!tabRoster || !contentRoster) return;

  [tabRoster, tabMatrix, tabTools].forEach(t => t && t.classList.remove("active"));
  if (contentRoster) contentRoster.style.display = "none";
  if (contentMatrix) contentMatrix.style.display = "none";
  if (contentTools) contentTools.style.display = "none";

  if (tab === "matrix") {
    tabMatrix.classList.add("active");
    contentMatrix.style.display = "block";
    renderAdminMatrix(adminCachedStudents);
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
    const res = await fetch(url, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
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
    const pct = Math.round((solvedCount / CEH_QUESTIONS.length) * 100);

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
          <span style="font-weight: 600; font-size: 0.82rem;">${solvedCount} / ${CEH_QUESTIONS.length}</span>
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

  // Build header Q1..Q25
  let hHtml = `<th style="position: sticky; left: 0; background: var(--bg-card); z-index: 2; min-width: 120px;">Student</th>`;
  for (let q = 1; q <= CEH_QUESTIONS.length; q++) {
    hHtml += `<th style="text-align: center; width: 28px; padding: 4px 2px;" title="Task ${q}: ${escapeHtml(CEH_QUESTIONS[q - 1]?.title || '')}">Q${q}</th>`;
  }
  hHtml += `<th style="text-align: center; width: 60px;">Total</th>`;
  headerTr.innerHTML = hHtml;

  // Build student rows
  matrixBody.innerHTML = "";
  if (!students || students.length === 0) {
    matrixBody.innerHTML = `<tr><td colspan="${CEH_QUESTIONS.length + 2}" style="text-align:center; padding:20px; color:var(--text-muted);">No student data available.</td></tr>`;
    return;
  }

  students.forEach(s => {
    const tr = document.createElement("tr");
    const solvedSet = new Set(Array.isArray(s.solved) ? s.solved : []);
    const currentQ = Number(s.currentTaskId) || 1;

    let rowHtml = `<td style="position: sticky; left: 0; background: var(--bg-card); z-index: 1; font-weight: 600;">${escapeHtml(s.username)}</td>`;
    for (let q = 1; q <= CEH_QUESTIONS.length; q++) {
      if (solvedSet.has(q)) {
        rowHtml += `<td class="matrix-cell matrix-solved" title="Q${q}: Solved (Passed)">✓</td>`;
      } else if (q === currentQ) {
        rowHtml += `<td class="matrix-cell matrix-current" title="Q${q}: Active Current Task">📍</td>`;
      } else {
        rowHtml += `<td class="matrix-cell" style="color: var(--text-muted); opacity: 0.35;">·</td>`;
      }
    }
    rowHtml += `<td style="text-align: center; font-weight: 700; color: var(--accent-cyan);">${solvedSet.size} / ${CEH_QUESTIONS.length}</td>`;
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
    CEH_QUESTIONS.length,
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
      evaluateCommand(val);
      elTerminalInput.value = "";
      updateKeystrokeTracker("");
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (commandHistory.length > 0 && historyIndex > 0) {
      historyIndex--;
      elTerminalInput.value = commandHistory[historyIndex];
      updateKeystrokeTracker(elTerminalInput.value);
    }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      elTerminalInput.value = commandHistory[historyIndex];
      updateKeystrokeTracker(elTerminalInput.value);
    } else {
      historyIndex = commandHistory.length;
      elTerminalInput.value = "";
      updateKeystrokeTracker("");
    }
  }
});

// 4. Live typing highlight tracking on every key pressed!
elTerminalInput.addEventListener("input", () => {
  updateKeystrokeTracker(elTerminalInput.value);
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

  // Auto-discover Supabase credentials if deployed on Vercel
  await autoDiscoverCloudConfig();
  updateCloudStatusIndicator();
  await syncLocalUsersToCloud();
  const initialLb = await fetchCloudLeaderboard();
  if (initialLb && initialLb.length > 0) {
    renderLeaderboardRows(initialLb);
  }

  // Strictly keep appRoot hidden until user logs in or registers
  currentUser = null;
  updateAuthUI();
});
