# CEH v13 Interactive Lab Walkthrough & CTF Platform (Modules 01–05)

A lightweight, NetAcad-inspired ethical hacking lab simulator and CTF training platform designed for **CEH v13 (Certified Ethical Hacker)** preparation and university tutorial sessions (TM359).

Runs **100% in the browser** using pure HTML5, CSS3, and modern Vanilla JavaScript — **zero server setup, zero Node.js dependencies, and zero risk of campus network firewall blocks**. Colleagues can practice without needing a local Kali Linux virtual machine installed.

---

## 🌟 Key Features

- **28 Hands-On Interactive Lab Tasks** covering CEH v13 Modules 1 through 5.
- **Dual-Mode System**:
  - **🎓 Tutor Education Mode**: Designed for instructors/tutors to demonstrate commands, review output talking points, reveal unmasked evidence, and guide students with zero point penalties.
  - **🎯 Colleague CTF Practice Mode**: Students create a profile, manually type commands into the simulated CLI, earn +100 points per solve, answer post-scan concept questions (+25 points), and compete on the live CTF Leaderboard.
- **Simulated Linux & Windows CLI Terminals**:
  - Realistic prompts: `root@parrot:~#`, `msf6 >`, and `C:\Users\Administrator>`.
  - Command history navigation using **[Up]** and **[Down]** arrow keys.
  - Diagnostic error feedback pointing out exact typos, flag mistakes, or wrong IP addresses.
- **Anti-Copy & Anti-Paste Enforcement**:
  - Copy/paste shortcuts (`Ctrl+V`, `Cmd+V`, context menu paste, drag-and-drop) are blocked to build authentic terminal typing speed and muscle memory.
- **Optional Keystroke Typing Assistant**:
  - Hidden by default for experienced users.
  - Activates when clicking **"Reveal Solution"** or toggled via `⌨️ Guide: ON/OFF` to guide typing character-by-character (`.char-correct`, `.char-next`, `.char-wrong`).
- **Post-Scan Concept Analysis**:
  - Every challenge tests the *security rationale* of the output (e.g. why TTL=128 indicates Windows, why NetBIOS suffix `<20>` flags file sharing, why MS17-010 allows unauthenticated remote SYSTEM code execution).
- **Comprehensive Reference & Cheat Sheet**:
  - Nmap scanning flags (`-sS`, `-sT`, `-sU`, `-sV`, `-O`, `-A`, `-f`, `-D`, `-g`).
  - Critical CEH default port reference table.
  - NetBIOS suffix codes (`<00>`, `<03>`, `<1B>`, `<1C>`, `<1D>`, `<1E>`, `<20>`).
  - Windows `nbtstat` command syntax (`-A`, `-a`, `-c`, `-n`, `-r`, `-R`, `-s`).

---

## 🚩 CTF Mode (Learn → Practice Path)

Beyond the 38 guided Education labs, the platform has **walkthrough CTF challenges** (`ctf_questions.js`). A CTF task never shows the command: students read a mission, pick the tool, find a `CEH{...}` flag in the output and submit it. Hints are a 3-step ladder with small point costs, and a write-up appears after solving.

The instructor controls everything from **Admin > 🚩 CTF Control**:

| Setting | What it does |
|---|---|
| **CTF Mode ON/OFF** | OFF: students only see the Education labs. ON: students follow the learn/CTF path. |
| **Path pattern** | `5:5` (5 learn, then 5 CTF, repeating), `1:1`, or custom like `E3,C1,E2,C2` (E = learn, C = CTF). |
| **Release / Lock** | CTF tasks stay locked (and reveal nothing) until the instructor releases them. Changes reach students within seconds via the shared cloud bucket. |

**Adding a CTF task:** copy an entry in `ctf_questions.js`, use the next id (101+), write the `output` with a `{{FLAG}}` placeholder, and generate `flagEnc` in the browser console with `ctfEncodeFlag("CEH{your_flag}")`.

> Flags are obfuscated (XOR + base64), not encrypted, and release gating is a classroom pacing tool. Everything ships to the browser, so this is not a security boundary. Use a server-side check if you run a competitive event.

## 📚 Curriculum Breakdown (Modules 1–5)

| Module | Topic | Tasks | Key Tools & Concepts |
| :--- | :--- | :---: | :--- |
| **Mod 01** | Introduction to Ethical Hacking | 2 | `ping -c 4` (TTL OS fingerprinting), `traceroute` (Perimeter discovery) |
| **Mod 02** | Footprinting & Reconnaissance | 4 | `nslookup -type=ns`, `dig mx`, `dig axfr` (Zone Transfer), `curl -I` |
| **Mod 03** | Scanning Networks | 10 | Nmap `-sS`, `-sT`, `-sU`, `-sV`, `-O`, SMB scripts, `-f` (Frag), `-D` (Decoys), `-g` (Spoof), `-A` (Aggressive) |
| **Mod 04** | Enumeration & NetBIOS | 9 | `nbtstat -A`, `nbtstat -c`, `nbtstat -n`, `nbtstat -s`, Metasploit portscan & SMB, `enum4linux`, `snmpwalk`, `smtp-enum-users` |
| **Mod 05** | Vulnerability Analysis | 3 | Nmap `--script vuln` (MS17-010), `nikto -h`, `searchsploit ms17-010` |

---

## 🚀 How to Run Locally

1. Clone or download this repository:
   ```bash
   git clone https://github.com/0x4141ig/cyberlab.git
   cd cyberlab
   ```
2. Double-click `index.html` to open it in Google Chrome, Microsoft Edge, Firefox, or Safari.
3. No local server or installation is needed!

---

## 🌐 How to Host on GitHub Pages (Free Live Web Link)

You can publish this app online so all your colleagues and students can access it via a public URL:

1. Push this repository to GitHub.
2. In your GitHub repository, navigate to **Settings** > **Pages** (under "Code and automation").
3. Under **Build and deployment** > **Branch**:
   - Select **`main`** branch.
   - Folder: **`/ (root)`**.
   - Click **Save**.
4. In ~60 seconds, GitHub will provide a live link:
   ```
   https://0x4141ig.github.io/cyberlab/
   ```
5. Share the link with your tutorial class!

---

## ⚡ Supabase Setup (Shared CTF Leaderboard & User Accounts Sync)

To allow colleagues and students to register, log in from any phone or computer with their progress saved, and appear on a **shared real-time CTF Leaderboard**:

### Step 1: Create a Free Supabase Project
1. Go to **[supabase.com](https://supabase.com)** and create a free account (or log in with GitHub).
2. Click **"New Project"**, name it `cyberlab`, set a database password, and choose your region.

### Step 2: Run the 1-Click Database Setup Script
1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **"New Query"**.
3. Open `supabase_setup.sql`, copy its entire content, paste it into the editor, and click **"Run"** (`Ctrl+Enter`).
   - This automatically creates the `leaderboard` and `lab_users` tables with all necessary Row Level Security (RLS) policies.

### Step 3: Get Your API Credentials
1. In Supabase, navigate to **Project Settings** (gear icon at the bottom of the left sidebar) > **API**.
2. Copy:
   - **Project URL** (e.g. `https://xyzabcdefg.supabase.co`)
   - **Project API Keys** &rarr; `anon` / `public` (e.g. `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)

### Step 4: Connect to CyberLab
You can connect in either of two ways:
- **Option A (Instant in Browser UI)**: Open your CyberLab site (`https://0x4141ig.github.io/cyberlab/`), click the **"☁️ Cloud DB"** button in the top navigation bar, paste your Project URL and Anon Key, and click **"Save & Test Connection"**.
- **Option B (Permanent for All Students)**: Open `app.js` and paste your Project URL and Anon Key into:
  ```javascript
  const DEFAULT_SUPABASE_URL = "https://your-project-ref.supabase.co";
  const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6...";
  ```
  Then run `push.bat` to push to GitHub. All students visiting the link will automatically connect without needing any setup!

---

## ▲ How to Deploy on Vercel (Alternative Backend Option)

If you prefer deploying via Vercel:

1. Go to **[vercel.com](https://vercel.com)** and sign in with your GitHub account (`0x4141ig`).
2. Click **"Add New..."** > **"Project"**.
3. Select your repository: **`cyberlab`** and click **"Deploy"**.
4. In your Vercel project dashboard, go to **Settings** > **Environment Variables**:
   - Add `SUPABASE_URL` = your Supabase Project URL.
   - Add `SUPABASE_ANON_KEY` = your Supabase anon key.
5. Alternatively, create an Upstash Redis database from Vercel's **Storage** tab.

---

## 🔄 Making Changes & Pushing to GitHub

Whenever you edit files or add new lab questions:

```bash
# 1. Check changed files
git status

# 2. Stage all modifications
git add .

# 3. Commit with a descriptive message
git commit -m "Add new lab questions and update cheat sheet"

# 4. Push updates to GitHub
git push
```

---

## 📄 License
This project is prepared for educational purposes, university coursework, and tutorial training.
