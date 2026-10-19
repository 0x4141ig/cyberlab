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
}

// Supabase Cloud Configuration
// When you provide your Supabase URL & Anon Key, it syncs directly from all browsers!
const SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || "", // e.g. "https://xxxx.supabase.co"
  anonKey: window.SUPABASE_ANON_KEY || ""
};

function getApiUrl() {
  if (window.location.hostname.includes("vercel.app") || window.location.hostname === "localhost") {
    return "/api/leaderboard";
  }
  return window.VERCEL_API_URL || "/api/leaderboard";
}

async function syncUserScoreToCloud() {
  if (!currentUser || currentUser.role === "admin") return;

  // 1. Direct Supabase REST API Sync
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/leaderboard`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
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
  // 1. Direct Supabase REST API Query
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    try {
      const res = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/leaderboard?select=username,score,solved_count,last_active&order=score.desc,solved_count.desc`,
        {
          headers: {
            apikey: SUPABASE_CONFIG.anonKey,
            Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`
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
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.status === "ok" && Array.isArray(data.leaderboard)) {
      saveLeaderboard(data.leaderboard);
      return data.leaderboard;
    }
  } catch (e) {
    // Offline fallback
  }
  return null;
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

  // Sync to Vercel KV cloud in background
  syncUserScoreToCloud();
}

// Modals
function openAuthModal(force = false) {
  const modal = document.getElementById("authModal");
  const closeBtn = document.getElementById("authModalClose");
  if (closeBtn) {
    closeBtn.style.display = (!currentUser || force) ? "none" : "block";
  }
  modal.style.display = "flex";
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

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById("loginUsername").value.trim();
  const p = document.getElementById("loginPassword").value;

  const users = getStoredUsers();
  if (u.toLowerCase() === "admin" && p === "Pa$$w0rd") {
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
    return;
  }

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
    closeAuthModal();
    updateAuthUI();
    return;
  }

  alert("Invalid username or password.");
}

function handleSignup(e) {
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

  const users = getStoredUsers();
  if (users[u]) {
    alert("Username already exists. Please choose another username or log in.");
    return;
  }

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
  alert(`Welcome, ${u}! Practice account created. Your scores will be tracked on the CTF leaderboard.`);
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

  // Asynchronously fetch live scores from Vercel Cloud API
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
    if (currentUser) {
      closeAuthModal();
    }
  }
});

["cheatModal", "authModal", "leaderboardModal"].forEach((id) => {
  document.getElementById(id).addEventListener("click", (e) => {
    if (e.target.id === id) {
      if (id === "authModal" && !currentUser) {
        return; // Prevent dismissing without login/signup
      }
      document.getElementById(id).style.display = "none";
    }
  });
});

// Initialize on Load
window.addEventListener("DOMContentLoaded", () => {
  cleanMockData();

  const users = getStoredUsers();
  if (!users["admin"]) {
    users["admin"] = { password: "Pa$$w0rd", role: "admin", score: 0, solved: [], conceptSolved: [] };
    saveStoredUsers(users);
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
  } else {
    // Show login / signup modal FIRST when opening the lab!
    currentUser = null;
    updateAuthUI();
    openAuthModal(true);
  }
});
