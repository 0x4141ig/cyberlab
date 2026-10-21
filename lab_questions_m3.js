// ============================================================================
// MODULE 3 LABS: Scanning networks (nmap, hping3, netcat, masscan, arp-scan)
// ----------------------------------------------------------------------------
// Nmap is ONE lab with grouped steps. Steps that used to be separate tasks reuse the
// output and the concept question of the old task (looked up in CEH_QUESTIONS), so
// nothing taught before is lost. All outputs are simulated for the fictional lab network.
// ============================================================================

const _old = (id) => CEH_QUESTIONS.find((q) => q.id === id);

// A step built from an old single-step task; `extra` overrides or adds fields
const _fromOld = (id, group, label, extra) => {
  const o = _old(id);
  return Object.assign({
    group,
    label,
    task: o.task,
    solution: o.solution,
    hint: o.hint,
    diagnostics: o.diagnostics,
    highlightText: o.highlightText,
    output: o.output,
    analysisQuestion: o.analysisQuestion,
    target: o.target
  }, extra);
};

// nmap command that contains every required option (any order) and the given target word
const _nm = (c, required, target) => {
  c = _ln(c);
  return /^(sudo )?nmap\b/.test(c) && required.every((re) => _lhas(c, re)) && (!target || _ltarget(c, target));
};

const _NMAP_NET = "10.10.1.0/24";

LAB_QUESTIONS.push(
  // ---------------------------------------------------------------- NMAP (one lab, many steps)
  {
    id: 7,
    replaces: [8, 9, 10, 11, 12, 13, 14, 15, 16, 22, 23, 28, 29, 30, 32, 36],
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Nmap: The Network Scanner",
    difficulty: "Intermediate",
    points: 750,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "Nmap is the standard tool for discovering live hosts, open ports, services, operating systems and misconfigurations. This single lab walks through the options a tester must know, grouped by purpose: find the hosts, pick a scan type, choose ports, identify what runs, tune speed and evasion, use the scripting engine, and save the results.",
    tutorNotes: "Teaching Talking Point: Work through the groups in order: host discovery, scan types, ports, detection, timing and evasion, NSE scripts, output. The evasion steps (-f, -D, -g) are here so students understand what defenders must detect: ask what logs and IDS rules would catch each one. Only scan systems you are authorised to test.",
    cehExamTip: "Exam Alert: -sS = SYN (half-open), -sT = connect, -sU = UDP, -sA = ACK (maps firewall rules), -sX/-sF/-sN = Xmas/FIN/Null (fail against Windows), -sn = ping sweep, -Pn = skip host discovery, -sV = versions, -O = OS, -A = everything, -p- = all 65535 ports.",
    analysisQuestion: {
      prompt: "A host is up but blocks ping probes, so Nmap reports 'Host seems down'. Which option makes Nmap scan its ports anyway?",
      options: [
        { text: "-Pn (skip host discovery and treat the host as up)", correct: true },
        { text: "-sn (ping sweep only)", correct: false },
        { text: "-sV (version detection)", correct: false },
        { text: "-oN (normal output file)", correct: false }
      ],
      explanation: "By default Nmap pings a host first and skips it if there is no answer. -Pn disables that discovery step, so the ports are scanned even when ICMP and the usual probes are filtered."
    },
    steps: [
      // ---- Host discovery
      {
        group: "Host discovery",
        label: "Ping sweep (-sn)",
        target: "10.10.1.0/24",
        task: "Find which hosts are alive on the 10.10.1.0/24 network without scanning any ports.",
        solution: "nmap -sn 10.10.1.0/24",
        accepted: [(c) => _nm(c, [/\s-sn\s/], _NMAP_NET)],
        hint: "The '-sn' option performs host discovery only (a ping sweep). Give it the whole subnet 10.10.1.0/24.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-sn\b/.test(c), msg: "Which option means 'discover hosts, do not scan ports'? It is -sn." },
          { check: (c) => !c.includes("10.10.1.0/24"), msg: "Scan the whole subnet: 10.10.1.0/24." }
        ],
        highlightText: "256 IP addresses (9 hosts up)",
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:20 UTC
Nmap scan report for gateway.corp.local (10.10.1.1)
Host is up (0.00031s latency).
Nmap scan report for dc01.certifiedhacker.com (10.10.1.2)
Host is up (0.00040s latency).
Nmap scan report for fw-internal.corp.local (10.10.1.5)
Host is up (0.00038s latency).
Nmap scan report for 10.10.1.11
Host is up (0.00052s latency).
Nmap scan report for db-internal.certifiedhacker.com (10.10.1.15)
Host is up (0.00047s latency).
Nmap scan report for 10.10.1.19
Host is up (0.00044s latency).
Nmap scan report for fileserver.certifiedhacker.com (10.10.1.20)
Host is up (0.00046s latency).
Nmap scan report for win2022.certifiedhacker.com (10.10.1.22)
Host is up (0.00041s latency).
Nmap scan report for mail.certifiedhacker.com (10.10.1.25)
Host is up (0.00049s latency).
Nmap done: 256 IP addresses (9 hosts up) scanned in 2.87 seconds`,
        analysisQuestion: {
          prompt: "What does the -sn option do?",
          options: [
            { text: "It discovers live hosts without scanning their ports", correct: true },
            { text: "It scans every port quietly", correct: false },
            { text: "It detects service versions", correct: false },
            { text: "It disables DNS for the scan", correct: false }
          ],
          explanation: "-sn (formerly -sP) is a ping sweep: Nmap only checks which hosts respond and prints them, which is the cheapest way to map a subnet."
        }
      },
      {
        group: "Host discovery",
        label: "Skip discovery (-Pn)",
        target: "10.10.1.22",
        task: "Scan 10.10.1.22 treating it as online, skipping the host discovery ping. This is how you scan hosts that block ping.",
        solution: "nmap -Pn 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-Pn\s/], "10.10.1.22")],
        hint: "Add '-Pn' (capital P, lowercase n) before the target.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-Pn\b/.test(c), msg: "The option that skips host discovery is -Pn (capital P)." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:24 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00043s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.52 seconds`
      },

      // ---- Scan types
      _fromOld(7, "Scan types", "SYN scan (-sS)", {
        accepted: [(c) => _nm(c, [/\s-sS\s/], "10.10.1.22")]
      }),
      _fromOld(8, "Scan types", "Connect scan (-sT -v)", {
        accepted: [(c) => _nm(c, [/\s-sT\s/, /\s-vv?\s/], "10.10.1.22")]
      }),
      _fromOld(9, "Scan types", "UDP scan (-sU)", {
        accepted: [(c) => _nm(c, [/\s-sU\s/, /\s-p\s*53,161\s/], "10.10.1.22")]
      }),
      {
        group: "Scan types",
        label: "ACK scan (-sA)",
        target: "10.10.1.22",
        task: "Run a TCP ACK scan against 10.10.1.22. It does not find open ports: it shows whether a firewall is filtering.",
        solution: "nmap -sA 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-sA\s/], "10.10.1.22")],
        hint: "The ACK scan option is '-sA' (capital A).",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-sA\b/.test(c), msg: "The ACK scan option is -sA (capital A)." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        highlightText: "1000 unfiltered tcp ports (reset)",
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:48 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00039s latency).
All 1000 scanned ports on 10.10.1.22 are in ignored states.
Not shown: 1000 unfiltered tcp ports (reset)
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.31 seconds`,
        analysisQuestion: {
          prompt: "An ACK scan reports every port as 'unfiltered'. What does that tell you?",
          options: [
            { text: "No stateful firewall is blocking ACK packets to the host, but open and closed ports are not distinguished", correct: true },
            { text: "All 1000 ports are open", correct: false },
            { text: "All ports are protected by a firewall", correct: false },
            { text: "The host is offline", correct: false }
          ],
          explanation: "ACK scans never decide open versus closed. 'Unfiltered' means the packets reached the host and it answered with RST, so no stateful filter sits in between. 'Filtered' would indicate one."
        }
      },
      {
        group: "Scan types",
        label: "Xmas / FIN / Null (-sX)",
        target: "10.10.1.19",
        task: "Run an Xmas scan (-sX) against the Linux server 10.10.1.19. (-sF and -sN work the same way.)",
        solution: "nmap -sX 10.10.1.19",
        accepted: [(c) => _nm(c, [/\s-s[XFN]\s/], "10.10.1.19")],
        hint: "Use '-sX' (capital X). Note the target is the Linux server 10.10.1.19.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-s[XFN]\b/.test(c), msg: "The Xmas scan option is -sX (FIN is -sF, Null is -sN)." },
          { check: (c) => !c.includes("10.10.1.19"), msg: "The target for this step is the Linux server 10.10.1.19." }
        ],
        highlightText: "open|filtered",
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:52 UTC
Nmap scan report for 10.10.1.19
Host is up (0.00036s latency).
Not shown: 997 closed tcp ports (reset)
PORT     STATE         SERVICE
25/tcp   open|filtered smtp
111/tcp  open|filtered rpcbind
2049/tcp open|filtered nfs
MAC Address: 00:0C:29:5D:C3:08 (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.64 seconds`,
        analysisQuestion: {
          prompt: "Why are the ports shown as 'open|filtered' after an Xmas scan?",
          options: [
            { text: "A listening port stays silent for these odd packets, so Nmap cannot tell it from a filtered port", correct: true },
            { text: "The ports answered with a SYN/ACK", correct: false },
            { text: "Nmap could not reach the host", correct: false },
            { text: "The ports are encrypted", correct: false }
          ],
          explanation: "Per the TCP RFC, closed ports reply with RST and open ports ignore the packet. No answer therefore means open or filtered. Windows breaks the rule and answers RST everywhere, so these scans are unreliable against Windows."
        }
      },

      // ---- Ports
      {
        group: "Ports",
        label: "Port list (-p)",
        target: "10.10.1.22",
        task: "Scan only ports 80, 445 and 3389 on 10.10.1.22.",
        solution: "nmap -p 80,445,3389 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-p\s*80,445,3389\s/], "10.10.1.22")],
        hint: "Use '-p' followed by the comma-separated list of ports.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-p\s*\d/.test(c), msg: "Choose ports with '-p' followed by the list, for example -p 80,445." },
          { check: (c) => !/80,445,3389/.test(c), msg: "The ports to scan are 80, 445 and 3389, in a comma-separated list." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:55 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00040s latency).
PORT     STATE SERVICE
80/tcp   open  http
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 0.21 seconds`
      },
      {
        group: "Ports",
        label: "All ports (-p-)",
        target: "10.10.1.22",
        task: "Scan all 65,535 TCP ports of 10.10.1.22 instead of the default top 1000.",
        solution: "nmap -p- 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-p-\s/], "10.10.1.22")],
        hint: "'-p-' (a dash right after -p) means every port from 1 to 65535.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-p-/.test(c), msg: "The option for all ports is -p- (the dash is part of it)." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        highlightText: "5985/tcp  open  wsman",
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:58 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00041s latency).
Not shown: 65521 closed tcp ports (reset)
PORT      STATE SERVICE
80/tcp    open  http
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
445/tcp   open  microsoft-ds
3389/tcp  open  ms-wbt-server
5357/tcp  open  wsdapi
5985/tcp  open  wsman
47001/tcp open  winrm
49664/tcp open  unknown
49665/tcp open  unknown
49666/tcp open  unknown
49667/tcp open  unknown
49668/tcp open  unknown
49669/tcp open  unknown
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 14.77 seconds`,
        analysisQuestion: {
          prompt: "What does a full -p- scan find that the default scan missed?",
          options: [
            { text: "Services on high ports, such as WinRM on 5985 and 47001", correct: true },
            { text: "Only the same ports, but faster", correct: false },
            { text: "Hidden hosts on other subnets", correct: false },
            { text: "The administrator password", correct: false }
          ],
          explanation: "The default scan checks only the 1000 most common ports. Administrators sometimes run services on high ports, and -p- is how you find them."
        }
      },
      {
        group: "Ports",
        label: "Most common ports (--top-ports)",
        target: "10.10.1.22",
        task: "Scan only the 20 most common ports of 10.10.1.22.",
        solution: "nmap --top-ports 20 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s--top-ports[ =]20\s/], "10.10.1.22")],
        hint: "Use '--top-ports 20' (two dashes, then the number of ports).",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !c.includes("--top-ports"), msg: "The option is --top-ports followed by a number." },
          { check: (c) => !/--top-ports[ =]20\b/.test(c), msg: "The task asks for the top 20 ports: --top-ports 20." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:01 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00040s latency).
Not shown: 15 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 0.19 seconds`
      },
      {
        group: "Ports",
        label: "Fast scan (-F)",
        target: "10.10.1.22",
        task: "Run a fast scan of 10.10.1.22 that checks only the 100 most common ports.",
        solution: "nmap -F 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-F\s/], "10.10.1.22")],
        hint: "'-F' (capital F) is the fast scan option.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-F\b/.test(c), msg: "The fast scan option is a capital -F." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:03 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00041s latency).
Not shown: 95 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 0.24 seconds`
      },

      // ---- Detection
      _fromOld(10, "Detection", "Service versions (-sV)", {
        accepted: [(c) => _nm(c, [/\s-sV\s/], "10.10.1.22")]
      }),
      _fromOld(11, "Detection", "OS detection (-O)", {
        accepted: [(c) => _nm(c, [/\s-O\s/], "10.10.1.22")]
      }),
      {
        group: "Detection",
        label: "Default scripts (-sC)",
        target: "10.10.1.22",
        task: "Run Nmap's default safe scripts against 10.10.1.22 to pull extra details from each service.",
        solution: "nmap -sC 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s(-sC|--script[= ]default)\s/], "10.10.1.22")],
        hint: "'-sC' runs the default script set. (Capital C.)",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-sC\b|--script/.test(c), msg: "The default scripts option is -sC (capital C)." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        highlightText: "Message signing enabled but not required",
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:06 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00042s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
|_http-title: IIS Windows Server
| http-methods:
|_  Potentially risky methods: TRACE
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
| rdp-ntlm-info:
|   Target_Name: CEH
|   NetBIOS_Domain_Name: CEH
|   DNS_Computer_Name: WIN-SERVER2022.CEH.CORP
|_  Product_Version: 10.0.20348
5357/tcp open  wsdapi
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Host script results:
| smb2-security-mode:
|   3:1:1:
|_    Message signing enabled but not required

Nmap done: 1 IP address (1 host up) scanned in 7.94 seconds`,
        analysisQuestion: {
          prompt: "Which finding in the default-script output matters for SMB relay attacks?",
          options: [
            { text: "SMB message signing is enabled but not required", correct: true },
            { text: "Port 80 serves a page titled IIS Windows Server", correct: false },
            { text: "Port 5357 is open", correct: false },
            { text: "The host is a VMware machine", correct: false }
          ],
          explanation: "When SMB signing is not required, an attacker can relay captured authentication to other hosts. The smb2-security-mode script reports it without any credentials."
        }
      },
      _fromOld(16, "Detection", "Aggressive scan (-A)", {
        accepted: [(c) => _nm(c, [/\s-A\s/], "10.10.1.22")]
      }),

      // ---- Timing and evasion
      {
        group: "Timing and evasion",
        label: "Timing template (-T4)",
        target: "10.10.1.22",
        task: "Speed the scan up with the aggressive timing template (T4). It suits fast, reliable lab networks.",
        solution: "nmap -T4 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-T\s*4\s/], "10.10.1.22")],
        hint: "Timing templates run from -T0 (paranoid) to -T5 (insane). Use -T4.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-T\s*\d/.test(c), msg: "Timing templates start with a capital T and a number from 0 to 5." },
          { check: (c) => !/-T\s*4/.test(c), msg: "The task asks for the aggressive template: -T4." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:10 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00040s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 0.62 seconds`
      },
      _fromOld(13, "Timing and evasion", "Fragments (-f)", {
        accepted: [(c) => _nm(c, [/\s-f\s/], "10.10.1.22")]
      }),
      _fromOld(14, "Timing and evasion", "Decoys (-D)", {
        accepted: [(c) => _nm(c, [/\s-D\s*RND:5\s/], "10.10.1.22")]
      }),
      _fromOld(15, "Timing and evasion", "Source port (-g)", {
        accepted: [(c) => _nm(c, [/\s(-g|--source-port)[ =]?80\s/], "10.10.1.22")]
      }),

      // ---- NSE scripts
      _fromOld(12, "NSE scripts", "SMB OS discovery", {
        accepted: [(c) => _nm(c, [/\s--script[= ]smb-os-discovery(\.nse)?\s/], "10.10.1.22")]
      }),
      _fromOld(32, "NSE scripts", "SMB shares and users", {
        accepted: [(c) => _nm(c, [/\s--script[= ]\S*smb-enum-shares/, /\s--script[= ]\S*smb-enum-users/], "10.10.1.22")]
      }),
      _fromOld(22, "NSE scripts", "LDAP root DSE", {
        accepted: [(c) => _nm(c, [/\s-p\s*389\s/, /\s--script[= ]ldap-rootdse(\.nse)?\s/], "10.10.1.22")]
      }),
      _fromOld(23, "NSE scripts", "NFS port (2049)", {
        accepted: [(c) => _nm(c, [/\s-p\s*2049\s/], "10.10.1.19")]
      }),
      _fromOld(28, "NSE scripts", "SMTP users", {
        accepted: [(c) => _nm(c, [/\s-p\s*25\s/, /\s--script[= ]smtp-enum-users(\.nse)?\s/], "10.10.1.19")]
      }),
      _fromOld(29, "NSE scripts", "SMTP open relay", {
        accepted: [(c) => _nm(c, [/\s-p\s*25\s/, /\s--script[= ]smtp-open-relay(\.nse)?\s/], "10.10.1.19")]
      }),
      _fromOld(30, "NSE scripts", "SMTP commands", {
        accepted: [(c) => _nm(c, [/\s-p\s*25\s/, /\s--script[= ]smtp-commands(\.nse)?\s/], "10.10.1.19")]
      }),
      _fromOld(36, "NSE scripts", "Vulnerability scripts", {
        accepted: [(c) => _nm(c, [/\s--script[= ]vuln\s/], "10.10.1.22")]
      }),

      // ---- Output
      {
        group: "Output",
        label: "Save normal output (-oN)",
        target: "10.10.1.22",
        task: "Scan 10.10.1.22 and save the normal-format output to a file called scan.txt.",
        solution: "nmap -oN scan.txt 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-oN\s*\S+\s/], "10.10.1.22")],
        hint: "'-oN' (capital N) writes the normal output to the file name that follows it.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-oN\b/.test(c), msg: "Normal output is saved with -oN (capital N) followed by a file name." },
          { check: (c) => !/-oN\s*\S+/.test(c), msg: "Give -oN a file name, for example scan.txt." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: (cmd) => {
          const file = (String(cmd).match(/-oN\s*(\S+)/) || [, "scan.txt"])[1];
          return `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:14 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00041s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi

Nmap done: 1 IP address (1 host up) scanned in 1.49 seconds
(results were also written to ${"" + file})`;
        }
      },
      {
        group: "Output",
        label: "Greppable output (-oG)",
        target: "10.10.1.22",
        task: "Print the scan in greppable format straight to the screen (use - as the file name). Greppable output is easy to filter with grep.",
        solution: "nmap -oG - 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s-oG\s*-\s/], "10.10.1.22")],
        hint: "'-oG -' writes greppable output to standard output instead of a file.",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !/-oG\b/.test(c), msg: "Greppable output is -oG (capital G)." },
          { check: (c) => !/-oG\s*-(\s|$)/.test(c), msg: "A single dash as the file name sends the output to the screen." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        output: `# Nmap 7.94 scan initiated Sun Oct 18 23:16:11 2026 as: nmap -oG - 10.10.1.22
Host: 10.10.1.22 ()    Status: Up
Host: 10.10.1.22 ()    Ports: 80/open/tcp//http///, 135/open/tcp//msrpc///, 139/open/tcp//netbios-ssn///, 445/open/tcp//microsoft-ds///, 3389/open/tcp//ms-wbt-server///, 5357/open/tcp//wsdapi///    Ignored State: closed (994)
# Nmap done at Sun Oct 18 23:16:12 2026 -- 1 IP address (1 host up) scanned in 1.52 seconds`
      },
      {
        group: "Output",
        label: "Open ports and reasons (--open --reason)",
        target: "10.10.1.22",
        task: "Scan 10.10.1.22 but list only open ports, and show why Nmap decided each port is open.",
        solution: "nmap --open --reason 10.10.1.22",
        accepted: [(c) => _nm(c, [/\s--open\s/, /\s--reason\s/], "10.10.1.22")],
        hint: "Combine '--open' (only open ports) with '--reason' (explain each state).",
        diagnostics: [
          { check: (c) => !/^(sudo )?nmap\b/.test(c), msg: "Use the network scanner nmap." },
          { check: (c) => !c.includes("--open"), msg: "Show only open ports with --open." },
          { check: (c) => !c.includes("--reason"), msg: "Ask Nmap to explain each state with --reason." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the target 10.10.1.22." }
        ],
        highlightText: "syn-ack ttl 128",
        output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:19 UTC
Nmap scan report for 10.10.1.22
Host is up, received arp-response (0.00041s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE       REASON
80/tcp   open  http          syn-ack ttl 128
135/tcp  open  msrpc         syn-ack ttl 128
139/tcp  open  netbios-ssn   syn-ack ttl 128
445/tcp  open  microsoft-ds  syn-ack ttl 128
3389/tcp open  ms-wbt-server syn-ack ttl 128
5357/tcp open  wsdapi        syn-ack ttl 128
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.50 seconds`
      }
    ]
  },

  // ---------------------------------------------------------------- HPING3
  {
    id: 60,
    placeAfter: 7,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Hping3: Crafting Probe Packets",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "Hping3 builds packets by hand. It lets you send ICMP, TCP and UDP probes and read the exact reply flags, which is how testers check firewall behaviour one port at a time.",
    tutorNotes: "Teaching Talking Point: Show the reply flags. SA (SYN/ACK) means open, RA (RST/ACK) means closed, and no reply means filtered or open for UDP. Always use -c so the tool stops: only send probes you are authorised to send.",
    cehExamTip: "Exam Alert: With hping3 -S a SYN/ACK reply (flags=SA) means the port is open and RST/ACK (flags=RA) means closed. -1 selects ICMP mode, -2 selects UDP mode, and -p sets the destination port.",
    analysisQuestion: {
      prompt: "You send hping3 -S -p 80 and the reply shows flags=SA. What does that mean?",
      options: [
        { text: "Port 80 is open (the host answered SYN/ACK)", correct: true },
        { text: "Port 80 is closed", correct: false },
        { text: "A firewall dropped the packet", correct: false },
        { text: "The host does not exist", correct: false }
      ],
      explanation: "A SYN probe to an open port gets a SYN/ACK. A closed port gets RST/ACK (flags=RA). No answer usually means a firewall dropped the packet."
    },
    steps: [
      {
        label: "ICMP mode (-1)",
        task: "Send 3 ICMP probes to 10.10.1.22 in hping3's ICMP mode.",
        solution: "hping3 -1 -c 3 10.10.1.22",
        accepted: [(c) => /^(sudo )?hping3\b/.test(_ln(c)) && _lhas(c, /\s-1\s/) && _lhas(c, /\s-c\s*3\s/) && _ltarget(c, "10.10.1.22")],
        hint: "'-1' selects ICMP mode and '-c 3' limits it to three packets.",
        diagnostics: [
          { check: (c) => !/^(sudo )?hping3\b/.test(c), msg: "Use the packet crafter hping3." },
          { check: (c) => !/-1\b/.test(c), msg: "ICMP mode is the option -1." },
          { check: (c) => !/-c\s*3/.test(c), msg: "Send exactly 3 packets with -c 3." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Probe the target 10.10.1.22." }
        ],
        output: `HPING 10.10.1.22 (eth0 10.10.1.22): icmp mode set, 28 headers + 0 data bytes
len=28 ip=10.10.1.22 ttl=128 id=18331 icmp_seq=0 rtt=0.6 ms
len=28 ip=10.10.1.22 ttl=128 id=18332 icmp_seq=1 rtt=0.5 ms
len=28 ip=10.10.1.22 ttl=128 id=18333 icmp_seq=2 rtt=0.5 ms

--- 10.10.1.22 hping statistic ---
3 packets transmitted, 3 packets received, 0% packet loss
round-trip min/avg/max = 0.5/0.5/0.6 ms`
      },
      {
        label: "SYN probe, open port (-S -p)",
        task: "Send 3 TCP SYN probes to port 80 of 10.10.1.22 and read the reply flags.",
        solution: "hping3 -S -p 80 -c 3 10.10.1.22",
        accepted: [(c) => /^(sudo )?hping3\b/.test(_ln(c)) && _lhas(c, /\s-S\s/) && _lhas(c, /\s-p\s*80\s/) && _lhas(c, /\s-c\s*3\s/) && _ltarget(c, "10.10.1.22")],
        hint: "'-S' sets the SYN flag, '-p 80' picks the port and '-c 3' limits the count.",
        diagnostics: [
          { check: (c) => !/^(sudo )?hping3\b/.test(c), msg: "Use the packet crafter hping3." },
          { check: (c) => !/-S\b/.test(c), msg: "A SYN probe uses the capital -S." },
          { check: (c) => !/-p\s*80/.test(c), msg: "Pick the destination port with -p 80." },
          { check: (c) => !/-c\s*3/.test(c), msg: "Send exactly 3 packets with -c 3." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Probe the target 10.10.1.22." }
        ],
        highlightText: "flags=SA",
        output: `HPING 10.10.1.22 (eth0 10.10.1.22): S set, 40 headers + 0 data bytes
len=44 ip=10.10.1.22 ttl=128 DF id=20481 sport=80 flags=SA seq=0 win=8192 rtt=1.1 ms
len=44 ip=10.10.1.22 ttl=128 DF id=20482 sport=80 flags=SA seq=1 win=8192 rtt=0.9 ms
len=44 ip=10.10.1.22 ttl=128 DF id=20483 sport=80 flags=SA seq=2 win=8192 rtt=0.9 ms

--- 10.10.1.22 hping statistic ---
3 packets transmitted, 3 packets received, 0% packet loss
round-trip min/avg/max = 0.9/1.0/1.1 ms`
      },
      {
        label: "SYN probe, closed port",
        task: "Now probe port 81, which is closed, with the same kind of SYN probe (3 packets) and compare the reply flags.",
        solution: "hping3 -S -p 81 -c 3 10.10.1.22",
        accepted: [(c) => /^(sudo )?hping3\b/.test(_ln(c)) && _lhas(c, /\s-S\s/) && _lhas(c, /\s-p\s*81\s/) && _lhas(c, /\s-c\s*3\s/) && _ltarget(c, "10.10.1.22")],
        hint: "Same command as before, but the port is 81.",
        diagnostics: [
          { check: (c) => !/^(sudo )?hping3\b/.test(c), msg: "Use the packet crafter hping3." },
          { check: (c) => !/-S\b/.test(c), msg: "Keep the SYN option -S." },
          { check: (c) => !/-p\s*81/.test(c), msg: "This step probes port 81: -p 81." },
          { check: (c) => !/-c\s*3/.test(c), msg: "Send exactly 3 packets with -c 3." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Probe the target 10.10.1.22." }
        ],
        highlightText: "flags=RA",
        output: `HPING 10.10.1.22 (eth0 10.10.1.22): S set, 40 headers + 0 data bytes
len=40 ip=10.10.1.22 ttl=128 DF id=20511 sport=81 flags=RA seq=0 win=0 rtt=0.8 ms
len=40 ip=10.10.1.22 ttl=128 DF id=20512 sport=81 flags=RA seq=1 win=0 rtt=0.7 ms
len=40 ip=10.10.1.22 ttl=128 DF id=20513 sport=81 flags=RA seq=2 win=0 rtt=0.7 ms

--- 10.10.1.22 hping statistic ---
3 packets transmitted, 3 packets received, 0% packet loss
round-trip min/avg/max = 0.7/0.7/0.8 ms`
      },
      {
        label: "UDP mode (-2)",
        task: "Send 3 UDP probes to port 161 of 10.10.1.22 using hping3's UDP mode.",
        solution: "hping3 -2 -p 161 -c 3 10.10.1.22",
        accepted: [(c) => /^(sudo )?hping3\b/.test(_ln(c)) && _lhas(c, /\s-2\s/) && _lhas(c, /\s-p\s*161\s/) && _lhas(c, /\s-c\s*3\s/) && _ltarget(c, "10.10.1.22")],
        hint: "'-2' selects UDP mode. Add '-p 161' and '-c 3'.",
        diagnostics: [
          { check: (c) => !/^(sudo )?hping3\b/.test(c), msg: "Use the packet crafter hping3." },
          { check: (c) => !/-2\b/.test(c), msg: "UDP mode is the option -2." },
          { check: (c) => !/-p\s*161/.test(c), msg: "Probe the SNMP port with -p 161." },
          { check: (c) => !/-c\s*3/.test(c), msg: "Send exactly 3 packets with -c 3." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Probe the target 10.10.1.22." }
        ],
        output: `HPING 10.10.1.22 (eth0 10.10.1.22): udp mode set, 28 headers + 0 data bytes

--- 10.10.1.22 hping statistic ---
3 packets transmitted, 0 packets received, 100% packet loss
round-trip min/avg/max = 0.0/0.0/0.0 ms`
      }
    ]
  },

  // ---------------------------------------------------------------- NETCAT
  {
    id: 61,
    placeAfter: 60,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Netcat: The Swiss Army Knife",
    difficulty: "Beginner",
    points: 125,
    target: "10.10.1.19 (Linux Server)",
    prompt: "root@parrot:~#",
    scenario: "Netcat opens raw TCP and UDP connections. Testers use it to grab service banners, check whether a port is open, and talk to a service by hand.",
    tutorNotes: "Teaching Talking Point: Banner grabbing is just connecting and reading what the service says first. -z checks a port without sending data, -n skips DNS, -u switches to UDP, and piping a command into nc lets you speak the protocol in one line.",
    cehExamTip: "Exam Alert: Netcat flags: -v verbose, -n no DNS, -z zero-I/O scan mode, -u UDP, -l listen, -p port. nc can grab banners from any TCP service and is often called the 'Swiss Army knife' of networking.",
    analysisQuestion: {
      prompt: "What does the line '220 mail.certifiedhacker.com ESMTP Postfix (Ubuntu)' disclose after connecting to port 25?",
      options: [
        { text: "The mail server software (Postfix) and the operating system hint, before any login", correct: true },
        { text: "The administrator password", correct: false },
        { text: "The list of valid users", correct: false },
        { text: "The server's private key", correct: false }
      ],
      explanation: "Services announce themselves when you connect. This SMTP banner reveals the product and platform without authentication, which is why banner grabbing is an early recon step."
    },
    steps: [
      {
        label: "Grab a banner (-v)",
        task: "Connect to the SMTP service on 10.10.1.19, port 25, in verbose mode to read its banner.",
        solution: "nc -v 10.10.1.19 25",
        accepted: [(c) => /^(nc|ncat)\b/.test(_ln(c)) && _lhas(c, /\s-v\s/) && _ltarget(c, "10.10.1.19") && _ltarget(c, "25")],
        hint: "Use 'nc -v <host> <port>'.",
        diagnostics: [
          { check: (c) => !/^(nc|ncat)\b/.test(c), msg: "Use netcat: nc." },
          { check: (c) => !/-v\b/.test(c), msg: "Verbose mode is -v." },
          { check: (c) => !c.includes("10.10.1.19"), msg: "Connect to the Linux server 10.10.1.19." },
          { check: (c) => !/\s25\b/.test(c), msg: "Mail (SMTP) listens on port 25." }
        ],
        highlightText: "220 mail.certifiedhacker.com ESMTP Postfix (Ubuntu)",
        output: `Connection to 10.10.1.19 25 port [tcp/smtp] succeeded!
220 mail.certifiedhacker.com ESMTP Postfix (Ubuntu)`
      },
      {
        label: "Check ports (-z)",
        task: "Check whether ports 20 to 25 are open on 10.10.1.19 without sending any data, in verbose mode.",
        solution: "nc -zv 10.10.1.19 20-25",
        accepted: [(c) => /^(nc|ncat)\b/.test(_ln(c)) && _lhas(c, /\s-(zv|vz)\s|\s-z\s.*\s-v\s|\s-v\s.*\s-z\s/) && _ltarget(c, "10.10.1.19") && /\b20-25\b/.test(c)],
        hint: "Combine '-z' (scan only) and '-v' (verbose), then give the range 20-25.",
        diagnostics: [
          { check: (c) => !/^(nc|ncat)\b/.test(c), msg: "Use netcat: nc." },
          { check: (c) => !/-[a-z]*z/.test(c), msg: "The option that only checks ports (no data) is -z." },
          { check: (c) => !/-[a-z]*v/.test(c), msg: "Add -v so netcat reports each port." },
          { check: (c) => !c.includes("10.10.1.19"), msg: "Check the Linux server 10.10.1.19." },
          { check: (c) => !/20-25/.test(c), msg: "Use the port range 20-25." }
        ],
        output: `nc: connect to 10.10.1.19 port 20 (tcp) failed: Connection refused
nc: connect to 10.10.1.19 port 21 (tcp) failed: Connection refused
nc: connect to 10.10.1.19 port 22 (tcp) failed: Connection refused
nc: connect to 10.10.1.19 port 23 (tcp) failed: Connection refused
nc: connect to 10.10.1.19 port 24 (tcp) failed: Connection refused
Connection to 10.10.1.19 25 port [tcp/smtp] succeeded!`
      },
      {
        label: "No DNS (-n)",
        target: "10.10.1.22",
        task: "Check port 445 on the Windows server 10.10.1.22 using numeric addresses only (no DNS), in verbose scan mode.",
        solution: "nc -nvz 10.10.1.22 445",
        accepted: [(c) => /^(nc|ncat)\b/.test(_ln(c)) && _lhas(c, /\s-[a-z]*n[a-z]*\s|\s-n\s/) && _lhas(c, /\s-[a-z]*z[a-z]*\s|\s-z\s/) && _ltarget(c, "10.10.1.22") && _ltarget(c, "445")],
        hint: "Add '-n' next to '-v' and '-z': for example 'nc -nvz <host> <port>'.",
        diagnostics: [
          { check: (c) => !/^(nc|ncat)\b/.test(c), msg: "Use netcat: nc." },
          { check: (c) => !/-[a-z]*n/.test(c), msg: "The no-DNS option is -n." },
          { check: (c) => !/-[a-z]*z/.test(c), msg: "Keep -z so netcat only checks the port." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Check the Windows server 10.10.1.22." },
          { check: (c) => !/\s445\b/.test(c), msg: "SMB listens on port 445." }
        ],
        output: `(UNKNOWN) [10.10.1.22] 445 (microsoft-ds) open`
      },
      {
        label: "UDP (-u)",
        target: "10.10.1.22",
        task: "Check the SNMP UDP port 161 on 10.10.1.22 in verbose scan mode.",
        solution: "nc -u -zv 10.10.1.22 161",
        accepted: [(c) => /^(nc|ncat)\b/.test(_ln(c)) && _lhas(c, /\s-[a-z]*u[a-z]*\s|\s-u\s/) && _lhas(c, /\s-[a-z]*z[a-z]*\s|\s-z\s/) && _ltarget(c, "10.10.1.22") && _ltarget(c, "161")],
        hint: "UDP mode is '-u'. Keep '-z' and '-v' and give port 161.",
        diagnostics: [
          { check: (c) => !/^(nc|ncat)\b/.test(c), msg: "Use netcat: nc." },
          { check: (c) => !/-[a-z]*u/.test(c), msg: "UDP mode is -u." },
          { check: (c) => !/-[a-z]*z/.test(c), msg: "Keep -z so netcat only checks the port." },
          { check: (c) => !/\s161\b/.test(c), msg: "SNMP listens on UDP port 161." }
        ],
        output: `Connection to 10.10.1.22 161 port [udp/snmp] succeeded!`
      },
      {
        label: "Speak SMTP by hand",
        task: "Pipe the SMTP command 'VRFY root' into netcat to ask the mail server on 10.10.1.19 (port 25) whether the user root exists.",
        solution: "echo \"VRFY root\" | nc 10.10.1.19 25",
        accepted: [/^echo\s+(-e\s+)?["']?VRFY\s+root(\\r\\n)?["']?\s*\|\s*(nc|ncat)\s+10\.10\.1\.19\s+25$/i],
        hint: "Send the text with echo and pipe (|) it into 'nc 10.10.1.19 25'.",
        diagnostics: [
          { check: (c) => !/^echo\b/.test(c), msg: "Start with echo and the SMTP command in quotes." },
          { check: (c) => !/VRFY\s+root/i.test(c), msg: "The SMTP command to verify a user is VRFY root." },
          { check: (c) => !c.includes("|"), msg: "Pipe the echo output into netcat with the | symbol." },
          { check: (c) => !/nc\s+10\.10\.1\.19\s+25/.test(c), msg: "Pipe into: nc 10.10.1.19 25." }
        ],
        highlightText: "252 2.0.0 root",
        output: `220 mail.certifiedhacker.com ESMTP Postfix (Ubuntu)
252 2.0.0 root`
      }
    ]
  },

  // ---------------------------------------------------------------- MASSCAN
  {
    id: 62,
    placeAfter: 61,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Masscan: Very Fast Port Scanning",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.0/24",
    prompt: "root@parrot:~#",
    scenario: "Masscan sends packets asynchronously and can sweep very large ranges in minutes. In the lab it shows how rate, ports and banners change what you learn about a network.",
    tutorNotes: "Teaching Talking Point: Masscan trades accuracy and politeness for speed. The --rate value is packets per second: on a real network a high rate can overload devices, so agree it in the rules of engagement. In this lab keep it low.",
    cehExamTip: "Exam Alert: Masscan is an asynchronous SYN scanner that can scan the whole Internet quickly. Use -p for ports, --rate for packets per second, --banners to grab banners, and -oL/-oX/-oJ for output files.",
    analysisQuestion: {
      prompt: "What does the --rate option control in masscan?",
      options: [
        { text: "How many packets per second are sent, which sets scan speed and network load", correct: true },
        { text: "How many ports are reported", correct: false },
        { text: "The number of retries per host", correct: false },
        { text: "The scan output format", correct: false }
      ],
      explanation: "--rate is packets per second. A high rate finishes sooner but can saturate links or knock over fragile devices, so testers choose it carefully."
    },
    steps: [
      {
        label: "Ports and rate (-p, --rate)",
        task: "Scan the 10.10.1.0/24 network for open ports 80 and 443 at a rate of 1000 packets per second.",
        solution: "masscan 10.10.1.0/24 -p80,443 --rate 1000",
        accepted: [(c) => /^(sudo )?masscan\b/.test(_ln(c)) && _lhas(c, /\s-p\s*80,443\s/) && _lhas(c, /\s--rate[ =]1000\s/) && _ltarget(c, "10.10.1.0/24")],
        hint: "Use '-p80,443' for the ports and '--rate 1000' for the speed.",
        diagnostics: [
          { check: (c) => !/^(sudo )?masscan\b/.test(c), msg: "Use the fast scanner masscan." },
          { check: (c) => !c.includes("10.10.1.0/24"), msg: "Scan the subnet 10.10.1.0/24." },
          { check: (c) => !/-p\s*80,443/.test(c), msg: "Choose the ports with -p80,443." },
          { check: (c) => !/--rate/.test(c), msg: "Set the speed with --rate 1000." }
        ],
        output: `Starting masscan 1.3.2 (http://bit.ly/14GZzcT) at 2026-10-18 23:01:07 GMT
Initiating SYN Stealth Scan
Scanning 256 hosts [2 ports/host]
Discovered open port 80/tcp on 10.10.1.22
Discovered open port 80/tcp on 10.10.1.25
Discovered open port 443/tcp on 10.10.1.25`
      },
      {
        label: "Port range (-p1-1000)",
        target: "10.10.1.22",
        task: "Scan ports 1 to 1000 on the single host 10.10.1.22 at a rate of 500.",
        solution: "masscan 10.10.1.22 -p1-1000 --rate 500",
        accepted: [(c) => /^(sudo )?masscan\b/.test(_ln(c)) && _lhas(c, /\s-p\s*1-1000\s/) && _lhas(c, /\s--rate[ =]500\s/) && _ltarget(c, "10.10.1.22")],
        hint: "A range is written '-p1-1000'. Keep '--rate 500'.",
        diagnostics: [
          { check: (c) => !/^(sudo )?masscan\b/.test(c), msg: "Use the fast scanner masscan." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the host 10.10.1.22." },
          { check: (c) => !/-p\s*1-1000/.test(c), msg: "Use the range -p1-1000." },
          { check: (c) => !/--rate[ =]500/.test(c), msg: "Set the speed with --rate 500." }
        ],
        output: `Starting masscan 1.3.2 (http://bit.ly/14GZzcT) at 2026-10-18 23:04:22 GMT
Initiating SYN Stealth Scan
Scanning 1 hosts [1000 ports/host]
Discovered open port 80/tcp on 10.10.1.22
Discovered open port 135/tcp on 10.10.1.22
Discovered open port 139/tcp on 10.10.1.22
Discovered open port 445/tcp on 10.10.1.22`
      },
      {
        label: "Grab banners (--banners)",
        target: "10.10.1.22",
        task: "Scan port 80 on 10.10.1.22 and also grab the service banner.",
        solution: "masscan 10.10.1.22 -p80 --banners --rate 100",
        accepted: [(c) => /^(sudo )?masscan\b/.test(_ln(c)) && _lhas(c, /\s-p\s*80\s/) && _lhas(c, /\s--banners\s/) && _ltarget(c, "10.10.1.22")],
        hint: "Add '--banners'. Keep a low rate such as '--rate 100'.",
        diagnostics: [
          { check: (c) => !/^(sudo )?masscan\b/.test(c), msg: "Use the fast scanner masscan." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Scan the host 10.10.1.22." },
          { check: (c) => !/-p\s*80\b/.test(c), msg: "Scan port 80 with -p80." },
          { check: (c) => !c.includes("--banners"), msg: "The banner option is --banners." }
        ],
        highlightText: "Server: Microsoft-IIS/10.0",
        output: `Starting masscan 1.3.2 (http://bit.ly/14GZzcT) at 2026-10-18 23:07:40 GMT
Initiating SYN Stealth Scan
Scanning 1 hosts [1 port/host]
Discovered open port 80/tcp on 10.10.1.22
Banner on port 80/tcp on 10.10.1.22: [http] HTTP/1.1 200 OK\\x0d\\x0a Server: Microsoft-IIS/10.0\\x0d\\x0a X-Powered-By: ASP.NET`
      },
      {
        label: "List output (-oL)",
        target: "10.10.1.0/24",
        task: "Look for SMB (port 445) across 10.10.1.0/24 and save the results to a list file called result.txt.",
        solution: "masscan 10.10.1.0/24 -p445 --rate 500 -oL result.txt",
        accepted: [(c) => /^(sudo )?masscan\b/.test(_ln(c)) && _lhas(c, /\s-p\s*445\s/) && _lhas(c, /\s-oL\s*\S+\s/) && _ltarget(c, "10.10.1.0/24")],
        hint: "'-oL' saves a simple list of results to the file name you give it.",
        diagnostics: [
          { check: (c) => !/^(sudo )?masscan\b/.test(c), msg: "Use the fast scanner masscan." },
          { check: (c) => !c.includes("10.10.1.0/24"), msg: "Scan the subnet 10.10.1.0/24." },
          { check: (c) => !/-p\s*445/.test(c), msg: "SMB is port 445: -p445." },
          { check: (c) => !/-oL\s*\S+/.test(c), msg: "Save a list with -oL followed by a file name." }
        ],
        output: `Starting masscan 1.3.2 (http://bit.ly/14GZzcT) at 2026-10-18 23:10:05 GMT
Initiating SYN Stealth Scan
Scanning 256 hosts [1 port/host]
Discovered open port 445/tcp on 10.10.1.2
Discovered open port 445/tcp on 10.10.1.11
Discovered open port 445/tcp on 10.10.1.20
Discovered open port 445/tcp on 10.10.1.22`
      }
    ]
  },

  // ---------------------------------------------------------------- ARP-SCAN
  {
    id: 63,
    placeAfter: 62,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Arp-scan: Local Network Discovery",
    difficulty: "Beginner",
    points: 75,
    target: "10.10.1.0/24",
    prompt: "root@parrot:~#",
    scenario: "On your own subnet, ARP is the most reliable way to find hosts: devices cannot ignore it the way they ignore ping. Arp-scan lists every neighbour with its MAC address and hardware vendor.",
    tutorNotes: "Teaching Talking Point: ARP works only on the local Layer 2 segment, so it cannot cross a router. The vendor column comes from the MAC address prefix (OUI) and helps identify device types. Netdiscover does a similar job interactively.",
    cehExamTip: "Exam Alert: ARP scanning works only within the local broadcast domain and finds hosts that block ICMP. The first half of a MAC address (the OUI) identifies the hardware vendor.",
    analysisQuestion: {
      prompt: "Why does arp-scan find hosts that a ping sweep can miss?",
      options: [
        { text: "Hosts must answer ARP to communicate on the LAN, even if they block ICMP", correct: true },
        { text: "ARP packets are encrypted", correct: false },
        { text: "ARP works across the Internet", correct: false },
        { text: "It scans all 65535 ports", correct: false }
      ],
      explanation: "A host that drops ping still has to answer ARP requests to exchange traffic on its own subnet, so an ARP sweep sees it."
    },
    steps: [
      {
        label: "Scan the local network (-l)",
        task: "List all hosts on your local network with arp-scan's local-network option.",
        solution: "arp-scan -l",
        accepted: [(c) => /^(sudo )?arp-scan\b/.test(_ln(c)) && _lhas(c, /\s(-l|--localnet)\s/)],
        hint: "'-l' (or '--localnet') scans the network of your own interface.",
        diagnostics: [
          { check: (c) => !/^(sudo )?arp-scan\b/.test(c), msg: "Use the ARP scanner arp-scan." },
          { check: (c) => !/-l\b|--localnet/.test(c), msg: "Scan your own network with -l (or --localnet)." }
        ],
        highlightText: "6 responded",
        output: `Interface: eth0, type: EN10MB, MAC: 00:0c:29:3b:1e:77, IPv4: 10.10.1.50
Starting arp-scan 1.10.0 with 256 hosts (https://github.com/royhills/arp-scan)
10.10.1.1       00:50:56:c0:00:08       VMware, Inc.
10.10.1.2       00:0c:29:41:7a:92       VMware, Inc.
10.10.1.5       00:50:56:e1:12:3f       VMware, Inc.
10.10.1.19      00:0c:29:5d:c3:08       VMware, Inc.
10.10.1.22      00:0c:29:8e:4f:1a       VMware, Inc.
10.10.1.25      00:0c:29:a4:09:5e       VMware, Inc.

6 packets received by filter, 0 packets dropped by kernel
Ending arp-scan 1.10.0: 256 hosts scanned in 1.842 seconds (138.98 hosts/sec). 6 responded`
      },
      {
        label: "Choose the interface (-I)",
        task: "Scan the local network again, this time naming the interface eth0 explicitly.",
        solution: "arp-scan -I eth0 -l",
        accepted: [(c) => /^(sudo )?arp-scan\b/.test(_ln(c)) && _lhas(c, /\s(-I|--interface)[ =]?eth0\s/) && _lhas(c, /\s(-l|--localnet)\s/)],
        hint: "'-I eth0' picks the interface. Keep '-l'.",
        diagnostics: [
          { check: (c) => !/^(sudo )?arp-scan\b/.test(c), msg: "Use the ARP scanner arp-scan." },
          { check: (c) => !/-I\b|--interface/.test(c), msg: "Choose the interface with a capital -I." },
          { check: (c) => !/eth0/.test(c), msg: "The interface is eth0." },
          { check: (c) => !/-l\b|--localnet/.test(c), msg: "Keep the local-network option -l." }
        ],
        output: `Interface: eth0, type: EN10MB, MAC: 00:0c:29:3b:1e:77, IPv4: 10.10.1.50
Starting arp-scan 1.10.0 with 256 hosts (https://github.com/royhills/arp-scan)
10.10.1.1       00:50:56:c0:00:08       VMware, Inc.
10.10.1.2       00:0c:29:41:7a:92       VMware, Inc.
10.10.1.5       00:50:56:e1:12:3f       VMware, Inc.
10.10.1.19      00:0c:29:5d:c3:08       VMware, Inc.
10.10.1.22      00:0c:29:8e:4f:1a       VMware, Inc.
10.10.1.25      00:0c:29:a4:09:5e       VMware, Inc.

6 packets received by filter, 0 packets dropped by kernel
Ending arp-scan 1.10.0: 256 hosts scanned in 1.846 seconds (138.65 hosts/sec). 6 responded`
      },
      {
        label: "Scan a range",
        task: "Scan only the addresses 10.10.1.20 to 10.10.1.25.",
        solution: "arp-scan 10.10.1.20-10.10.1.25",
        accepted: [(c) => /^(sudo )?arp-scan\b/.test(_ln(c)) && _ltarget(c, "10.10.1.20-10.10.1.25")],
        hint: "Give arp-scan the range as 10.10.1.20-10.10.1.25.",
        diagnostics: [
          { check: (c) => !/^(sudo )?arp-scan\b/.test(c), msg: "Use the ARP scanner arp-scan." },
          { check: (c) => !c.includes("10.10.1.20"), msg: "The range starts at 10.10.1.20." },
          { check: (c) => !/10\.10\.1\.20-10\.10\.1\.25/.test(c), msg: "Write the range as 10.10.1.20-10.10.1.25." }
        ],
        output: `Interface: eth0, type: EN10MB, MAC: 00:0c:29:3b:1e:77, IPv4: 10.10.1.50
Starting arp-scan 1.10.0 with 6 hosts (https://github.com/royhills/arp-scan)
10.10.1.22      00:0c:29:8e:4f:1a       VMware, Inc.
10.10.1.25      00:0c:29:a4:09:5e       VMware, Inc.

2 packets received by filter, 0 packets dropped by kernel
Ending arp-scan 1.10.0: 6 hosts scanned in 1.352 seconds (4.44 hosts/sec). 2 responded`
      }
    ]
  }
);

// ---------------------------------------------------------------- argument help for the typing helpers
Object.assign(LAB_TOOL_HELP.tools, {
  nc: { name: "Netcat", category: "Banner Grabbing & Port Checks", desc: "Opens raw TCP/UDP connections. Used to grab banners, test ports and talk to services by hand.", tip: "Pro Tip: <code>nc -v host port</code> grabs a banner; <code>-z</code> only checks the port; <code>-u</code> uses UDP." },
  ncat: { name: "Ncat", category: "Banner Grabbing & Port Checks", desc: "Nmap's modern netcat: connects to TCP/UDP services, optionally with SSL.", tip: "Pro Tip: Works like nc: <code>ncat -v host port</code>." },
  masscan: { name: "Masscan", category: "High-Speed Port Scanner", desc: "Asynchronous SYN scanner that can sweep huge ranges quickly. Speed is set with --rate.", tip: "Pro Tip: Use <code>-p</code> for ports, <code>--rate</code> for packets per second, <code>--banners</code> to grab banners." },
  "arp-scan": { name: "Arp-scan", category: "Layer 2 Host Discovery", desc: "Sends ARP requests to find every host on the local network, with MAC address and vendor.", tip: "Pro Tip: <code>arp-scan -l</code> scans your local network." }
});

Object.assign(LAB_TOOL_HELP.toolFlags, {
  nmap: {
    "-sn": { name: "Ping Sweep (No Port Scan)", type: "Discovery", desc: "Only discovers which hosts are online. No ports are scanned." },
    "-Pn": { name: "Skip Host Discovery", type: "Discovery", desc: "Treats every target as online. Use it when a host blocks ping, otherwise Nmap reports 'Host seems down'." },
    "-sS": { name: "TCP SYN Stealth Scan", type: "Scan Type", desc: "Half-open scan: sends SYN, a SYN/ACK means open, and Nmap answers RST before the connection completes. Needs root." },
    "-sT": { name: "TCP Connect Scan", type: "Scan Type", desc: "Completes the full 3-way handshake. Slower and logged, but works without root privileges." },
    "-sU": { name: "UDP Scan", type: "Scan Type", desc: "Probes UDP ports (DNS 53, SNMP 161...). Slow, because silent ports are open or filtered." },
    "-sA": { name: "TCP ACK Scan", type: "Scan Type", desc: "Sends ACK packets to map firewall rules: 'unfiltered' means no stateful filter, 'filtered' means one exists." },
    "-sF": { name: "TCP FIN Scan", type: "Scan Type", desc: "Sends only the FIN flag. Closed ports answer RST, open ports stay silent. Unreliable against Windows." },
    "-sX": { name: "TCP Xmas Scan", type: "Scan Type", desc: "Sets FIN, PSH and URG (the packet is lit up like a Christmas tree). Silent ports are open or filtered." },
    "-sN": { name: "TCP Null Scan", type: "Scan Type", desc: "Sends a packet with no flags set. Behaves like the FIN and Xmas scans." },
    "-p": { name: "Port Specification", type: "Ports", desc: "Chooses ports to scan, for example -p 80,445 or -p 1-1000.", val: true, valDesc: "Port list or range, for example 80,445,3389." },
    "-p-": { name: "All 65,535 Ports", type: "Ports", desc: "Scans every TCP port instead of the default top 1000." },
    "--top-ports": { name: "Most Common Ports", type: "Ports", desc: "Scans only the N most frequently open ports.", val: true, valDesc: "How many of the most common ports to scan." },
    "-F": { name: "Fast Scan", type: "Ports", desc: "Scans only the 100 most common ports." },
    "-sV": { name: "Service Version Detection", type: "Detection", desc: "Probes open ports to identify the software and version behind them." },
    "-O": { name: "OS Detection", type: "Detection", desc: "Fingerprints the TCP/IP stack to guess the operating system. Needs an open and a closed port." },
    "-sC": { name: "Default NSE Scripts", type: "Detection", desc: "Runs Nmap's default set of safe scripts for extra service details." },
    "-A": { name: "Aggressive Scan", type: "Detection", desc: "Enables OS detection, version detection, default scripts and traceroute together." },
    "-T4": { name: "Aggressive Timing", type: "Timing", desc: "Shortens timeouts for a faster scan. Good for fast, reliable networks." },
    "-f": { name: "Packet Fragmentation", type: "Evasion", desc: "Splits probes into small IP fragments. Shown so defenders understand what to detect." },
    "-D": { name: "Decoy Scan", type: "Evasion", desc: "Mixes decoy source addresses in with the real one (for example RND:5). Shown so defenders understand what to detect.", val: true, valDesc: "Decoy list, for example RND:5 for five random decoys." },
    "-g": { name: "Source Port", type: "Evasion", desc: "Sends probes from a chosen source port (for example 80). Some weak firewall rules trust it.", val: true, valDesc: "The source port number." },
    "--source-port": { name: "Source Port", type: "Evasion", desc: "Long form of -g.", val: true, valDesc: "The source port number." },
    "--script": { name: "Nmap Scripting Engine", type: "Scripts", desc: "Runs NSE scripts by name or category, for example smb-os-discovery or vuln.", val: true, valDesc: "Script name, comma list or category." },
    "-oN": { name: "Normal Output File", type: "Output", desc: "Writes the results in normal format to a file.", val: true, valDesc: "The output file name." },
    "-oG": { name: "Greppable Output", type: "Output", desc: "Writes one line per host that is easy to filter with grep. Use - as the name to print to the screen.", val: true, valDesc: "The output file name, or - for the screen." },
    "--open": { name: "Open Ports Only", type: "Output", desc: "Shows only ports that are open (or possibly open)." },
    "--reason": { name: "Show Reasons", type: "Output", desc: "Explains why each port was given its state, for example syn-ack." },
    "-v": { name: "Verbose Output", type: "Output", desc: "Prints more detail while scanning, such as open ports as they are found." },
    "-vv": { name: "Very Verbose Output", type: "Output", desc: "Even more detail than -v." }
  },
  hping3: {
    "-1": { name: "ICMP Mode", type: "Mode", desc: "Sends ICMP echo requests instead of TCP packets." },
    "-2": { name: "UDP Mode", type: "Mode", desc: "Sends UDP packets." },
    "-S": { name: "SYN Flag", type: "TCP Flag", desc: "Sets the SYN flag. A SYN/ACK reply (flags=SA) means open, RST/ACK (flags=RA) means closed." },
    "-p": { name: "Destination Port", type: "Argument", desc: "The destination port to probe.", val: true, valDesc: "Port number." },
    "-c": { name: "Packet Count", type: "Argument", desc: "Stops after sending N packets.", val: true, valDesc: "Number of packets to send." }
  },
  nc: {
    "-v": { name: "Verbose", type: "Output", desc: "Reports connection results (open, refused)." },
    "-n": { name: "No DNS", type: "Format", desc: "Numeric addresses only, no name lookups." },
    "-z": { name: "Zero-I/O Scan Mode", type: "Mode", desc: "Only checks whether the port is open. No data is sent." },
    "-u": { name: "UDP Mode", type: "Mode", desc: "Uses UDP instead of TCP." },
    "-zv": { name: "Scan and Report", type: "Mode", desc: "-z (check only) combined with -v (verbose)." },
    "-nv": { name: "No DNS and Verbose", type: "Mode", desc: "-n (numeric) combined with -v (verbose)." },
    "-nvz": { name: "Numeric Verbose Scan", type: "Mode", desc: "-n, -v and -z combined: numeric addresses, verbose, check only." },
    "-uzv": { name: "UDP Verbose Scan", type: "Mode", desc: "-u, -z and -v combined." }
  },
  masscan: {
    "-p": { name: "Ports", type: "Ports", desc: "Ports to scan, for example -p80,443 or -p1-1000 (no space needed).", val: true, valDesc: "Port list or range." },
    "--rate": { name: "Packets Per Second", type: "Speed", desc: "Sets the transmit rate. Higher is faster but loads the network more.", val: true, valDesc: "Packets per second." },
    "--banners": { name: "Grab Banners", type: "Detection", desc: "Completes connections to read service banners." },
    "-oL": { name: "List Output File", type: "Output", desc: "Saves results as a simple list.", val: true, valDesc: "The output file name." }
  },
  "arp-scan": {
    "-l": { name: "Local Network", type: "Target", desc: "Scans the network configured on the interface." },
    "--localnet": { name: "Local Network", type: "Target", desc: "Long form of -l." },
    "-I": { name: "Interface", type: "Argument", desc: "The network interface to scan from.", val: true, valDesc: "Interface name, for example eth0." },
    "--interface": { name: "Interface", type: "Argument", desc: "Long form of -I.", val: true, valDesc: "Interface name." }
  }
});

LAB_TOOL_HELP.altFlags.nmap = [
  { code: "-sn", desc: "Ping sweep only" },
  { code: "-Pn", desc: "Skip host discovery" },
  { code: "-p-", desc: "All 65,535 ports" },
  { code: "-sV / -O / -A", desc: "Versions, OS, everything" },
  { code: "-T4", desc: "Faster timing" },
  { code: "-oN <file>", desc: "Save normal output" }
];
LAB_TOOL_HELP.altFlags.hping3 = [
  { code: "-c <n>", desc: "Packet count" },
  { code: "-1 / -2", desc: "ICMP / UDP mode" },
  { code: "-S", desc: "SYN flag" }
];
LAB_TOOL_HELP.altFlags.nc = [
  { code: "-v", desc: "Verbose" },
  { code: "-z", desc: "Check only" },
  { code: "-n", desc: "No DNS" },
  { code: "-u", desc: "UDP" }
];
LAB_TOOL_HELP.altFlags.masscan = [
  { code: "-p<ports>", desc: "Ports or range" },
  { code: "--rate <n>", desc: "Packets per second" },
  { code: "--banners", desc: "Grab banners" }
];
LAB_TOOL_HELP.altFlags["arp-scan"] = [
  { code: "-l", desc: "Local network" },
  { code: "-I <iface>", desc: "Choose interface" }
];
