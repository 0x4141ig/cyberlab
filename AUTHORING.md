# Authoring labs and CTFs

CyberLab teaches **one tool per lab**. A lab is a short sequence of steps, each step teaching one important argument of that tool. Every lab has at least one **CTF** that practises the same tool without showing the command.

No build step: everything is plain JavaScript loaded by `index.html`.

| What | Where |
|---|---|
| Labs (Education) | `lab_questions.js` (pilot) and `lab_questions_*.js` |
| CTF challenges | `ctf_questions.js` and `ctf_questions_*.js` |
| Engine | `labs.js` (labs), `ctf.js` (CTF, tabs, locks), `app.js` (UI, terminal) |
| Flag encoder | `tools/encode_flags.py` |
| Self-test | run `contentSelfTest()` in the browser console |

New files must be registered in `index.html` after `lab_questions.js` / `ctf_questions.js` and before `labs.js`.

## Labs

Add a lab with `LAB_QUESTIONS.push({ ... })`. Fields:

```js
{
  id: 52,                       // unique number, never reuse. Old single tasks keep their old ids
  replaces: [18],               // optional: old single-step tasks folded into this lab (they disappear)
  placeAfter: 2,                // optional: for a NEW lab, insert it after the lab/task with this id
  module: 1,                    // 1..5 (CEH module of the tool)
  moduleTitle: "Module 01: Introduction to Ethical Hacking",
  title: "Arp: Neighbours on the LAN",
  difficulty: "Beginner",       // Beginner | Intermediate | Advanced
  points: 100,                  // awarded when the LAST step is done, about 25 per step
  target: "10.10.1.22 (Windows Server 2022)",
  prompt: "root@parrot:~#",     // default terminal prompt
  scenario: "...",              // why a tester uses this tool (2 sentences)
  tutorNotes: "...",            // teaching points for the instructor
  cehExamTip: "Exam Alert: ...",
  analysisQuestion: { prompt, options: [{ text, correct }], explanation },  // exactly ONE correct option
  steps: [ ... ]
}
```

### Steps

```js
{
  group: "Scan types",          // optional heading; use it in long labs such as nmap
  label: "Packet count (-c)",   // short name on the stepper
  task: "Send exactly 4 ...",   // the instruction. Say WHAT to do, mention the target
  solution: "ping -c 4 10.10.1.22",     // the command. Drives the breakdown card and typing guide
  accepted: [ RegExp | "string" | (cmd) => boolean ],   // must accept `solution`
  hint: "...",                  // one sentence, may name the option
  diagnostics: [ { check: (cmd) => boolean, msg: "..." } ],   // FIRST matching message is shown on a wrong command
  highlightText: "ttl=128",     // optional: evidence line the concept question points at
  output: `...` ,               // string, or (cmd) => string when the output depends on the command
  prompt: "C:\\Users\\Administrator>",   // optional per-step prompt (Windows, msf6 >)
  target: "203.0.113.10",       // optional per-step target card
  analysisQuestion: { ... }     // optional per-step concept question (+25 bonus, never blocks)
}
```

Rules for good steps:

1. **Cover the need-to-know arguments of the tool**, easiest first, one idea per step. Small tools get 3 to 5 steps. A big tool (nmap) is still ONE lab: use `group` headings and as many steps as it needs.
2. **Accepted rules are strict about the argument being taught and relaxed about everything else**: any order, extra spaces. Use the helpers below and avoid long hand-written regexes.
3. **Diagnostics go from generic to specific** and help a beginner ("Use the capital -I"). None may fire on the correct solution.
4. **Outputs look real and stay consistent** with the lab network (below) and with the other labs. No random values.
5. Windows tools (`nbtstat`, `net`, `ipconfig`, `tracert`) use the prompt `C:\\Users\\Administrator>`; Metasploit uses `msf6 >`.

Helpers available inside lab files (defined at the top of `lab_questions.js`):

```js
_ln(cmd)                 // trim and collapse spaces
_lhas(cmd, /\s-c\s*4\s/) // regex test on " " + cmd + " ", so flags can sit anywhere
_ltarget(cmd, "10.10.1.22")  // is this exact word one of the arguments
```

### Argument help (the typing helpers)

Every tool needs entries so the breakdown card, the live HUD and the "valid variations" box explain its arguments:

```js
Object.assign(LAB_TOOL_HELP.tools, {
  arp: { name: "ARP Cache Viewer", category: "Layer 2 Recon", desc: "...", tip: "Pro Tip: Use <code>-a</code> ..." }
});
Object.assign(LAB_TOOL_HELP.toolFlags, {
  arp: {
    "-a": { name: "Show All Entries", type: "Argument", desc: "..." },
    "-i": { name: "Interface", type: "Argument", desc: "...", val: true, valDesc: "Interface name" }   // val: takes a value
  }
});
LAB_TOOL_HELP.altFlags.arp = [ { code: "-a", desc: "All entries" }, { code: "-n", desc: "Numeric" } ];
```

Flag keys are exact-case (`-I` and `-i` differ). Cover every argument used in a `solution`, long forms included.

## CTF challenges

Add with `CTF_QUESTIONS.push({ ... })`. A CTF never shows the command: the student reads a mission, picks the tool, and finds a `CEH{...}` flag in the output.

```js
{
  id: 114, type: "ctf",         // CTF ids are 101 and up
  pairedWith: 52,               // id of the lab it practises (every lab needs one)
  module: 1, moduleTitle: "CTF · Introduction to Ethical Hacking",
  title: "...", difficulty: "Beginner", points: 150,
  target: "10.10.1.30 (Linux Server)", prompt: "root@parrot:~#",
  scenario: "...", task: "...", // the mission. Do NOT name the command or the options
  solution: "arp -a",           // the tutor's answer
  accepted: [ (c) => /^arp\b/.test(_n(c)) && _has(c, /\s-a\s/) ],     // helpers: _n, _has, _hasTarget, _portsOk
  hints: [ "Hint 1: nudge", "Hint 2: name the tool and the idea", "Hint 3: arp -a" ],  // hint 3 == solution
  diagnostics: [ { check: (c) => ..., msg: "..." } ],
  tutorNotes: "...", cehExamTip: "Exam Alert: ...",
  output: `... {{FLAG}} ...`,   // put {{FLAG}} where the flag appears (banner, comment, record...)
  outputVariants: [ { test: /^nslookup/i, output: `...` } ],   // optional: output for other accepted tools
  flagPlain: "CEH{arp_cache_leaks_hosts}",   // run tools/encode_flags.py, it becomes flagEnc
  writeup: "..."                // shown after solving: which command and why
}
```

Design guidelines:

- **Beginner friendly.** One idea, one command, a hint ladder that really helps.
- **The flag depends on the lab's key argument.** Without it the output does not contain the flag. Use `outputVariants` to show a realistic near-miss output when it fits.
- For tools whose output has no free text (ping, traceroute, netstat...), build a **derived flag** from the output (for example `CEH{ttl_64}`): set `derivedFlag: true`, describe the format in `task`, and leave `{{FLAG}}` out of the output.
- Flags are `CEH{lowercase_words_or_digits}`.

## Checking your work

1. `python tools/encode_flags.py` (if you used `flagPlain`).
2. Open the page, then in the console run `contentSelfTest()`. It must report `problems: 0`.
3. Try a lab as a student: every step, wrong commands, the typing guide.

The self-test checks: unique ids, every solution accepted by its own rules, outputs present, exactly one correct concept answer, hints, flags decodable, and that every lab has a CTF.

## Lab network (keep outputs consistent)

Domain `certifiedhacker.com`, internal names `*.corp.local`. Hosts:

| IP | Role |
|---|---|
| 10.10.1.1 | gateway.corp.local |
| 10.10.1.2 | dc01, domain controller |
| 10.10.1.5 | fw-internal.corp.local (firewall) |
| 10.10.1.11 | Windows workstation (NetBIOS, SMB) |
| 10.10.1.15 | db-internal |
| 10.10.1.19 | Linux server: SMTP 25, RPC 111, NFS 2049 |
| 10.10.1.20 | fileserver |
| 10.10.1.22 | Windows Server 2022 (win2022): IIS 80, RPC 135, SMB 445, RDP 3389, DNS 53, LDAP 389, SNMP 161/udp |
| 10.10.1.25 | mail.certifiedhacker.com |

The existing tasks in `questions.js` hold the details (users, shares, banners). Reuse their outputs.
