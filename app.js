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

// Clean up any old mock test users from previous testing
function cleanMockData() {
  const mockNames = ["ahmed_sec", "fahad_cyber", "sara_ethical", "khalid_net"];
  try {
    const rawLb = localStorage.getItem("ceh_leaderboard");
    if (rawLb) {
      const lb = JSON.parse(rawLb);
      if (Array.isArray(lb)) {
        const cleaned = lb.filter((item) => !mockNames.includes(item.username.toLowerCase()));
        localStorage.setItem("ceh_leaderboard", JSON.stringify(cleaned));
      }
    }
    const rawUsers = localStorage.getItem("ceh_users");
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      let changed = false;
      for (const k of Object.keys(users)) {
        if (mockNames.includes(k.toLowerCase())) {
          delete users[k];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem("ceh_users", JSON.stringify(users));
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
  const mockNames = ["ahmed_sec", "fahad_cyber", "sara_ethical", "khalid_net"];
  const lb = localStorage.getItem("ceh_leaderboard");
  if (lb) {
    try {
      const parsed = JSON.parse(lb);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => !mockNames.includes(item.username.toLowerCase()));
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
  elScenarioText.innerText = q.scenario;
  elTaskText.innerText = q.task;
  elExamTipText.innerText = q.cehExamTip;
  elQuestionIndicator.innerText = `Task ${idx + 1} of ${CEH_QUESTIONS.length}`;
  elPointsPill.innerText = `+${q.points || 100} PTS`;

  // Tutor Notes
  if (currentUser && currentUser.role === "admin") {
    elTutorBox.style.display = "block";
    elTutorNotesText.innerText = q.tutorNotes || "Demonstrate command syntax and review output details with students.";
  } else {
    elTutorBox.style.display = "none";
  }

  // Concept Card
  const isSolved = currentUser ? currentUser.solved.includes(q.id) : false;
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

// Render Question Grid
function renderQuestionGrid() {
  elQuestionGrid.innerHTML = "";
  CEH_QUESTIONS.forEach((q, idx) => {
    if (currentFilter !== "all" && q.module.toString() !== currentFilter) {
      return;
    }

    const isSolved = currentUser ? currentUser.solved.includes(q.id) : false;
    const badge = document.createElement("div");
    badge.className = `q-badge ${idx === currentIndex ? "current" : ""} ${isSolved ? "completed" : ""}`;
    badge.innerText = q.id;
    badge.title = `Q${q.id}: ${q.title}`;
    badge.onclick = () => loadQuestion(idx);
    elQuestionGrid.appendChild(badge);
  });
}

// Update User & Mode UI
function updateAuthUI() {
  const btnSignOut = document.getElementById("btnSignOut");
  const btnCloud = document.getElementById("btnCloudSettings");
  const authNotice = document.getElementById("authCloudNotice");
  const isAdmin = currentUser && currentUser.role === "admin";

  if (btnCloud) btnCloud.style.display = isAdmin ? "inline-flex" : "none";
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
    elRoleBadge.innerText = "Tutor";
    elModeBanner.className = "mode-banner tutor";
    elModeBanner.innerHTML = `
      <span><strong>🎓 Tutor Education Lab Mode</strong> — Teaching Points & Solutions Unlocked</span>
      <span style="opacity: 0.85;">Target: 10.10.1.22 (Windows Server 2022)</span>
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
    openAuthModal(true);
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
    const isTutor = currentUser.role === "admin";
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
    openAuthModal(true);
    return;
  }
  const allBtns = elConceptOptions.querySelectorAll(".concept-opt-btn");
  
  if (option.correct) {
    playBeep(true);
    allBtns.forEach(b => b.disabled = true);
    btnElement.classList.add("correct");

    const conceptKey = `c_${q.id}`;
    if (!currentUser.conceptSolved.includes(conceptKey)) {
      currentUser.conceptSolved.push(conceptKey);
      currentUser.score += 25;
      saveCurrentUser();
      updateLeaderboardWithUser();
      elUserScore.innerText = `${currentUser.score} pts`;
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
  if (!currentUser) {
    openAuthModal(true);
    return;
  }
  const q = CEH_QUESTIONS[currentIndex];
  if (currentUser.role === "student" && !currentUser.solved.includes(q.id)) {
    currentUser.penalties[q.id] = (currentUser.penalties[q.id] || 0) + 15;
  }
  showGuidance("hint", `<strong>💡 Instructor Hint:</strong> ${q.hint}`);
}

function showSolution() {
  if (!currentUser) {
    openAuthModal(true);
    return;
  }
  const q = CEH_QUESTIONS[currentIndex];
  if (currentUser.role === "student" && !currentUser.solved.includes(q.id)) {
    currentUser.penalties[q.id] = (currentUser.penalties[q.id] || 0) + 50;
  }
  // Reveal Solution optionally activates the live keystroke tracker for assistance!
  setTrackerVisible(true);
  updateKeystrokeTracker(elTerminalInput.value);
  showGuidance(
    "hint",
    `<strong>🔑 Solution Command:</strong><br>
     <div class="no-copy" style="color:#ffd600; font-size:0.95rem; font-family:var(--font-mono); background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:4px; display:inline-block; margin:6px 0; border:1px solid rgba(255,214,0,0.3);">
       ${q.solution}
     </div><br>
     <span style="font-size:0.78rem; opacity:0.85;">⚠️ Copying is disabled. Type the command into the terminal using the keystroke guide activated below.</span>`
  );
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

const AUTO_CLOUD_DB_URL = "https://api.restful-api.dev/objects/ff808181a09d98f701a15404502d19ab";

function getApiUrl() {
  if (window.location.hostname.includes("vercel.app") || window.location.hostname === "localhost") {
    return "/api/leaderboard";
  }
  return window.VERCEL_API_URL || "https://cyberlab-delta.vercel.app/api/leaderboard";
}

function isCloudApiAvailable() {
  return true; // Live cloud database is pre-provisioned and active across all environments
}

async function fetchDirectAutoDb() {
  try {
    const resp = await fetch(AUTO_CLOUD_DB_URL, {
      headers: { "Accept": "application/json" }
    });
    if (!resp.ok) return { leaderboard: [], users: {} };
    const json = await resp.json();
    return json.data || { leaderboard: [], users: {} };
  } catch (e) {
    return { leaderboard: [], users: {} };
  }
}

async function patchDirectAutoDb(partialData) {
  try {
    const current = await fetchDirectAutoDb();
    const merged = {
      users: partialData.users !== undefined ? partialData.users : (current.users || {}),
      leaderboard: partialData.leaderboard !== undefined ? partialData.leaderboard : (current.leaderboard || [])
    };
    await fetch(AUTO_CLOUD_DB_URL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ data: merged })
    });
    return merged;
  } catch (e) {
    console.warn("Direct cloud DB patch error:", e);
    return null;
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

  // Direct test of AUTO_CLOUD_DB_URL
  try {
    const res = await fetch(AUTO_CLOUD_DB_URL, { headers: { "Accept": "application/json" } });
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

  // 3. Direct Fallback to AUTO_CLOUD_DB_URL
  try {
    const db = await fetchDirectAutoDb();
    const users = db.users || {};
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
      updatedAt: Date.now()
    };
    const leaderboard = db.leaderboard || [];
    const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === cleanUser.toLowerCase());
    if (exIdx === -1) {
      leaderboard.push({ username: cleanUser, score: 0, solvedCount: 0, lastActive: 'Just now' });
    }
    leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
    await patchDirectAutoDb({ users, leaderboard });
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
              penalties: (typeof userRow.penalties === "object" && userRow.penalties !== null) ? userRow.penalties : {}
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

  // 3. Direct Fallback to AUTO_CLOUD_DB_URL
  try {
    const db = await fetchDirectAutoDb();
    const users = db.users || {};
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
          penalties: (typeof user.penalties === "object" && user.penalties !== null) ? user.penalties : {}
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
        penalties: user.penalties || {}
      })
    });
    if (res.ok) proxySaved = true;
  } catch (e) {
    console.warn("Vercel API progress save error:", e);
  }

  // 3. Direct Fallback to AUTO_CLOUD_DB_URL
  if (!proxySaved && !config.isConfigured) {
    try {
      const db = await fetchDirectAutoDb();
      const users = db.users || {};
      users[user.username] = {
        password: users[user.username]?.password || 'Pa$$w0rd',
        role: 'student',
        score: Number(user.score) || 0,
        solved: user.solved || [],
        conceptSolved: user.conceptSolved || [],
        penalties: user.penalties || {},
        updatedAt: Date.now()
      };
      const leaderboard = db.leaderboard || [];
      const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === user.username.toLowerCase());
      const entry = {
        username: user.username,
        score: Number(user.score) || 0,
        solvedCount: Array.isArray(user.solved) ? user.solved.length : 0,
        lastActive: 'Just now'
      };
      if (exIdx !== -1) leaderboard[exIdx] = entry;
      else leaderboard.push(entry);
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await patchDirectAutoDb({ users, leaderboard });
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
    penalties: currentUser.penalties
  };
  saveStoredUsers(users);

  // Sync to Supabase in background
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
    const url = getApiUrl();
    const res = await fetch(url);
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

  // 3. Direct Fallback to AUTO_CLOUD_DB_URL
  try {
    const db = await fetchDirectAutoDb();
    if (db && Array.isArray(db.leaderboard) && db.leaderboard.length > 0) {
      db.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      saveLeaderboard(db.leaderboard);
      return db.leaderboard;
    }
  } catch (e) {
    console.warn("Direct auto db leaderboard fetch error:", e);
  }

  return getLeaderboard();
}

async function syncLocalUsersToCloud() {
  const localUsers = getStoredUsers();
  const usernames = Object.keys(localUsers).filter(u => u.toLowerCase() !== "admin");
  if (usernames.length === 0) return;

  try {
    const db = await fetchDirectAutoDb();
    const cloudUsers = db.users || {};
    const leaderboard = db.leaderboard || [];
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
          updatedAt: Date.now()
        };
        const exIdx = leaderboard.findIndex(x => x.username.toLowerCase() === u.toLowerCase());
        const entry = {
          username: u,
          score: Number(localData.score) || 0,
          solvedCount: Array.isArray(localData.solved) ? localData.solved.length : 0,
          lastActive: "Just now"
        };
        if (exIdx !== -1) leaderboard[exIdx] = entry;
        else leaderboard.push(entry);
        modified = true;
      }
    }

    if (modified) {
      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0) || (b.solvedCount || 0) - (a.solvedCount || 0));
      await patchDirectAutoDb({ users: cloudUsers, leaderboard });
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
  const modal = document.getElementById("authModal");
  const closeBtn = document.getElementById("authModalClose");
  if (closeBtn) {
    closeBtn.style.display = (!currentUser || force) ? "none" : "block";
  }
  const authNotice = document.getElementById("authCloudNotice");
  if (authNotice) {
    authNotice.style.display = (currentUser && currentUser.role === "admin") ? "flex" : "none";
  }
  modal.style.display = "flex";
  updateCloudStatusIndicator();
  setTimeout(() => {
    const isLogin = document.getElementById("formLogin").style.display !== "none";
    const input = document.getElementById(isLogin ? "loginUsername" : "signupUsername");
    if (input) input.focus();
  }, 100);
}

function closeAuthModal() {
  if (!currentUser) {
    alert("Please sign in or create a practice username to enter the labs.");
    return;
  }
  document.getElementById("authModal").style.display = "none";
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
    closeAuthModal();
    updateAuthUI();
    renderQuestionGrid();
    loadQuestion(currentIndex);
    return;
  }

  // 2. Supabase Cloud Database Login
  if (isCloudApiAvailable()) {
    const submitBtn = document.querySelector("#formLogin button[type='submit']");
    const origText = submitBtn ? submitBtn.innerText : "Sign In";
    if (submitBtn) submitBtn.innerText = "Verifying...";

    const cloudRes = await cloudLoginUser(u, p);
    if (submitBtn) submitBtn.innerText = origText;

    if (cloudRes.ok && cloudRes.user) {
      currentUser = cloudRes.user;
      sessionStorage.setItem("ceh_current_user", currentUser.username);

      // Cache user locally
      const users = getStoredUsers();
      users[currentUser.username] = {
        password: p,
        role: currentUser.role,
        score: currentUser.score,
        solved: currentUser.solved,
        conceptSolved: currentUser.conceptSolved,
        penalties: currentUser.penalties
      };
      saveStoredUsers(users);

      closeAuthModal();
      updateAuthUI();
      renderQuestionGrid();
      loadQuestion(currentIndex);
      alert(`Welcome back, ${currentUser.username}!\nCloud progress restored: ${currentUser.solved.length} tasks solved, ${currentUser.score} pts.`);
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
          penalties: localUsers[u].penalties || {}
        };
        sessionStorage.setItem("ceh_current_user", u);
        cloudSaveUserProgress(currentUser);
        syncUserScoreToCloud();
        closeAuthModal();
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
      penalties: users[u].penalties || {}
    };
    sessionStorage.setItem("ceh_current_user", u);
    cloudSaveUserProgress(currentUser);
    syncUserScoreToCloud();
    closeAuthModal();
    updateAuthUI();
    renderQuestionGrid();
    loadQuestion(currentIndex);
    return;
  }

  alert("Invalid username or password.");
}

async function handleSignup(e) {
  e.preventDefault();
  const u = document.getElementById("signupUsername").value.trim();
  const p = document.getElementById("signupPassword").value;

  if (!u || !p) {
    alert("Please enter both username and password.");
    return;
  }

  if (u.toLowerCase() === "admin") {
    alert("This username is reserved.");
    return;
  }

  // 1. Supabase Cloud Signup
  if (isCloudApiAvailable()) {
    const submitBtn = document.querySelector("#formSignup button[type='submit']");
    const origText = submitBtn ? submitBtn.innerText : "Create Practice Account";
    if (submitBtn) submitBtn.innerText = "Creating Account...";

    const cloudRes = await cloudSignupUser(u, p);
    if (submitBtn) submitBtn.innerText = origText;

    if (!cloudRes.ok && !cloudRes.offline) {
      alert(cloudRes.message || "Failed to create account in Supabase.");
      return;
    }
  }

  // 2. Local Storage Cache
  const users = getStoredUsers();
  users[u] = {
    password: p,
    role: "student",
    score: 0,
    solved: [],
    conceptSolved: [],
    penalties: {}
  };
  saveStoredUsers(users);

  currentUser = {
    username: u,
    role: "student",
    score: 0,
    solved: [],
    conceptSolved: [],
    penalties: {}
  };
  sessionStorage.setItem("ceh_current_user", u);

  updateLeaderboardWithUser();
  closeAuthModal();
  updateAuthUI();
  renderQuestionGrid();
  loadQuestion(currentIndex);
  alert(`Welcome, ${u}! Practice account created.\nYour credentials and progress will synchronize across devices.`);
}

function handleSignOut() {
  currentUser = null;
  sessionStorage.removeItem("ceh_current_user");
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("signupUsername").value = "";
  document.getElementById("signupPassword").value = "";
  updateAuthUI();
  openAuthModal(true);
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
    if (currentUser) {
      closeAuthModal();
    }
  }
});

["cheatModal", "authModal", "leaderboardModal", "cloudModal"].forEach((id) => {
  const modalEl = document.getElementById(id);
  if (modalEl) {
    modalEl.addEventListener("click", (e) => {
      if (e.target.id === id) {
        if (id === "authModal" && !currentUser) {
          return; // Prevent dismissing without login/signup
        }
        modalEl.style.display = "none";
      }
    });
  }
});

// Initialize on Load
window.addEventListener("DOMContentLoaded", async () => {
  cleanMockData();

  const users = getStoredUsers();
  if (!users["admin"]) {
    users["admin"] = { password: "Pa$$w0rd", role: "admin", score: 0, solved: [], conceptSolved: [] };
    saveStoredUsers(users);
  }

  // Auto-discover Supabase credentials if deployed on Vercel
  await autoDiscoverCloudConfig();

  // Pre-fetch cloud leaderboard and update cloud indicator
  updateCloudStatusIndicator();
  await syncLocalUsersToCloud();
  const initialLb = await fetchCloudLeaderboard();
  if (initialLb && initialLb.length > 0) {
    renderLeaderboardRows(initialLb);
  }

  // Check if an authenticated user session is active
  const activeUser = sessionStorage.getItem("ceh_current_user");
  if (activeUser && users[activeUser]) {
    currentUser = {
      username: activeUser,
      role: users[activeUser].role || (activeUser.toLowerCase() === "admin" ? "admin" : "student"),
      score: users[activeUser].score || 0,
      solved: users[activeUser].solved || [],
      conceptSolved: users[activeUser].conceptSolved || [],
      penalties: users[activeUser].penalties || {}
    };
    updateAuthUI();
    renderQuestionGrid();
    loadQuestion(currentIndex);
  } else {
    // Show login / signup modal FIRST when opening the lab!
    currentUser = null;
    updateAuthUI();
    openAuthModal(true);
  }
});
