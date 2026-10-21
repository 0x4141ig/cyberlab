// ============================================================================
// TOOL LABS (multi-step Education tasks)
// ----------------------------------------------------------------------------
// A lab teaches ONE tool through a few short steps, easiest argument first.
// Each step is a normal command task: it has its own instruction, solution,
// accepted answers, hint, output and (optionally) its own terminal prompt.
// Everything the helper features need works per step:
//   argument breakdown card, live typing guide, Intellisense HUD, hint, solution.
//
// Lab fields (shared by all steps):
//   id, module, moduleTitle, title, difficulty, points, target, prompt,
//   scenario, tutorNotes, cehExamTip, analysisQuestion (asked once the lab is done)
// Step fields:
//   label        short name shown on the stepper, e.g. "Packet count (-c)"
//   task         instruction for this step
//   solution     the command (drives the breakdown card and the typing guide)
//   accepted     RegExp | string | function(cmd) => boolean
//   hint, diagnostics, highlightText
//   output       string, or function(cmd) => string for output that depends on the command
//   prompt, target   optional per-step overrides (for example a Windows prompt)
//
// Curriculum wiring:
//   * A lab with the same id as an existing task replaces it; `replaces: [ids]`
//     folds other old tasks into the lab; `placeAfter: id` inserts a new lab.
//   * HIDDEN_TASK_IDS removes tasks from the Education list without deleting them.
// Step progress is saved as "s_<labId>_<step>" keys in the user's conceptSolved list.
// ============================================================================

const HIDDEN_TASK_IDS = [33, 34, 35];   // ShellGPT tasks: no access to the tool right now

const _ln = (c) => String(c).trim().replace(/\s+/g, " ");
const _lhas = (c, re) => re.test(" " + _ln(c) + " ");
const _ltarget = (c, t) => _ln(c).split(" ").includes(t);

const LAB_QUESTIONS = [
  // ---------------------------------------------------------------- PING
  {
    id: 1,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "Ping: Host Reachability & ICMP",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "Before conducting any penetration testing engagement under your agreed Rules of Engagement (RoE), you must verify that the in-scope target system is alive and reachable. Ping is the first tool you reach for: learn its main options.",
    tutorNotes: "Teaching Talking Point: Remind students of the Ethical Hacking Phases: 1. Recon, 2. Scanning, 3. Gaining Access, 4. Maintaining Access, 5. Clearing Tracks. Point out that TTL=128 indicates a Microsoft Windows kernel, whereas Linux kernels default to TTL=64. Step 4 shows the same tool with Windows syntax (-n instead of -c).",
    cehExamTip: "Exam Alert: ICMP Echo Request is Type 8, and Echo Reply is Type 0. Notice the TTL is 128 in the response; standard Windows hosts default to TTL=128, while Linux hosts default to TTL=64.",
    analysisQuestion: {
      prompt: "Looking at the ping output, what specific evidence proves the host is active and strongly indicates it is running a Windows OS?",
      options: [
        { text: "Replies with TTL=128 (Windows defaults to TTL=128; Linux defaults to 64)", correct: true },
        { text: "The response time is below 1 ms", correct: false },
        { text: "The packet size was 56(84) bytes", correct: false },
        { text: "The target sent back a TCP ACK flag", correct: false }
      ],
      explanation: "Receiving ICMP echo replies proves the host is alive. The initial TTL (Time To Live) is set by the OS kernel: Windows uses 128, while Linux/Unix systems default to 64."
    },
    steps: [
      {
        label: "Packet count (-c)",
        task: "Send exactly 4 ICMP echo requests to 10.10.1.22 using the packet-count option.",
        solution: "ping -c 4 10.10.1.22",
        accepted: [
          /^ping\s+-c\s*4\s+10\.10\.1\.22$/,
          /^ping\s+10\.10\.1\.22\s+-c\s*4$/
        ],
        hint: "Use 'ping' with the '-c' option set to 4, followed by the target IP address 10.10.1.22.",
        diagnostics: [
          { check: (c) => !c.startsWith("ping"), msg: "Use the 'ping' command to send ICMP echo requests." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Make sure you include the target IP address: 10.10.1.22." },
          { check: (c) => c.includes("-n"), msg: "On Linux (Parrot/Kali), use '-c' for the packet count. '-n' is the Windows option (you will meet it in step 4)." },
          { check: (c) => !/-c\s*4/.test(c), msg: "Set the packet count to exactly 4 with '-c 4'." }
        ],
        highlightText: "ttl=128",
        output: `PING 10.10.1.22 (10.10.1.22) 56(84) bytes of data.
64 bytes from 10.10.1.22: icmp_seq=1 ttl=128 time=0.452 ms
64 bytes from 10.10.1.22: icmp_seq=2 ttl=128 time=0.389 ms
64 bytes from 10.10.1.22: icmp_seq=3 ttl=128 time=0.410 ms
64 bytes from 10.10.1.22: icmp_seq=4 ttl=128 time=0.421 ms

--- 10.10.1.22 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3072ms
rtt min/avg/max/mdev = 0.389/0.418/0.452/0.023 ms`
      },
      {
        label: "Packet size (-s)",
        task: "Send 3 packets with a 1000-byte payload to see how the host handles larger packets.",
        solution: "ping -c 3 -s 1000 10.10.1.22",
        accepted: [
          (c) => /^ping\b/.test(_ln(c)) && _lhas(c, /\s-c\s*3\s/) && _lhas(c, /\s-s\s*1000\s/) && _ltarget(c, "10.10.1.22")
        ],
        hint: "Combine '-c 3' (three packets) with '-s 1000' (payload size in bytes) and the target IP.",
        diagnostics: [
          { check: (c) => !c.startsWith("ping"), msg: "Use the 'ping' command." },
          { check: (c) => !/-s\s*\d+/.test(c), msg: "The packet-size option is '-s' followed by the number of bytes." },
          { check: (c) => !/-c\s*3/.test(c), msg: "The task asks for 3 packets: use '-c 3'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Include the target IP address: 10.10.1.22." }
        ],
        output: `PING 10.10.1.22 (10.10.1.22) 1000(1028) bytes of data.
1008 bytes from 10.10.1.22: icmp_seq=1 ttl=128 time=0.611 ms
1008 bytes from 10.10.1.22: icmp_seq=2 ttl=128 time=0.598 ms
1008 bytes from 10.10.1.22: icmp_seq=3 ttl=128 time=0.604 ms

--- 10.10.1.22 ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2046ms
rtt min/avg/max/mdev = 0.598/0.604/0.611/0.005 ms`
      },
      {
        label: "Interval (-i)",
        task: "Send 5 packets, one every half second, to measure the host's response timing.",
        solution: "ping -c 5 -i 0.5 10.10.1.22",
        accepted: [
          (c) => /^ping\b/.test(_ln(c)) && _lhas(c, /\s-c\s*5\s/) && _lhas(c, /\s-i\s*0?\.5\s/) && _ltarget(c, "10.10.1.22")
        ],
        hint: "Add '-i 0.5' (seconds between packets) to '-c 5' and the target IP.",
        diagnostics: [
          { check: (c) => !c.startsWith("ping"), msg: "Use the 'ping' command." },
          { check: (c) => !/-i\s*\d*\.?\d+/.test(c), msg: "The interval option is '-i' followed by seconds, for example '-i 0.5'." },
          { check: (c) => !/-c\s*5/.test(c), msg: "The task asks for 5 packets: use '-c 5'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Include the target IP address: 10.10.1.22." }
        ],
        output: `PING 10.10.1.22 (10.10.1.22) 56(84) bytes of data.
64 bytes from 10.10.1.22: icmp_seq=1 ttl=128 time=0.447 ms
64 bytes from 10.10.1.22: icmp_seq=2 ttl=128 time=0.402 ms
64 bytes from 10.10.1.22: icmp_seq=3 ttl=128 time=0.396 ms
64 bytes from 10.10.1.22: icmp_seq=4 ttl=128 time=0.415 ms
64 bytes from 10.10.1.22: icmp_seq=5 ttl=128 time=0.409 ms

--- 10.10.1.22 ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 2007ms
rtt min/avg/max/mdev = 0.396/0.413/0.447/0.018 ms`
      },
      {
        label: "Windows syntax (-n)",
        prompt: "C:\\Users\\Administrator>",
        task: "You are now on a Windows workstation. Windows uses a different option for the packet count: send 4 echo requests to 10.10.1.22.",
        solution: "ping -n 4 10.10.1.22",
        accepted: [
          /^ping\s+-n\s*4\s+10\.10\.1\.22$/,
          /^ping\s+10\.10\.1\.22\s+-n\s*4$/
        ],
        hint: "On Windows the packet count option is '-n', not '-c'.",
        diagnostics: [
          { check: (c) => !c.startsWith("ping"), msg: "Use the 'ping' command." },
          { check: (c) => c.includes("-c"), msg: "'-c' is the Linux option. On Windows the packet count is '-n'." },
          { check: (c) => !/-n\s*4/.test(c), msg: "Send exactly 4 packets with '-n 4'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Include the target IP address: 10.10.1.22." }
        ],
        output: `Pinging 10.10.1.22 with 32 bytes of data:
Reply from 10.10.1.22: bytes=32 time<1ms TTL=128
Reply from 10.10.1.22: bytes=32 time<1ms TTL=128
Reply from 10.10.1.22: bytes=32 time<1ms TTL=128
Reply from 10.10.1.22: bytes=32 time<1ms TTL=128

Ping statistics for 10.10.1.22:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum = 0ms, Average = 0ms`
      }
    ]
  },

  // ---------------------------------------------------------------- TRACEROUTE
  {
    id: 2,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "Traceroute: Mapping the Network Path",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Target Gateway)",
    prompt: "root@parrot:~#",
    scenario: "As part of scoping and network architecture assessment, you need to map out the intermediate routing hops between your testing station and the target server, and learn how to control the trace.",
    tutorNotes: "Teaching Talking Point: Draw the packet transit on the board: TTL=1 drops at hop 1, TTL=2 drops at hop 2. Hop 2 reveals an internal firewall ('fw-internal.corp.local'). Compare the default UDP probes with -I (ICMP): some firewalls only allow one of them.",
    cehExamTip: "Exam Alert: Traceroute on Linux sends UDP packets with incrementing TTL values starting at 1. On Windows, 'tracert' uses ICMP Echo Requests. When TTL reaches 0, intermediate routers return ICMP Type 11 (Time-to-Live Exceeded).",
    analysisQuestion: {
      prompt: "What critical security perimeter device was discovered at hop 2 along the network route?",
      options: [
        { text: "An internal corporate firewall (fw-internal.corp.local @ 10.10.1.5)", correct: true },
        { text: "A public DNS root server", correct: false },
        { text: "A honeypot decoy system", correct: false },
        { text: "A border BGP exterior gateway router", correct: false }
      ],
      explanation: "Traceroute maps network topology. Hop 2 explicitly identifies an internal firewall gateway (10.10.1.5) sitting in front of the target server 10.10.1.22."
    },
    steps: [
      {
        label: "Basic trace",
        task: "Trace the network path to 10.10.1.22 to discover all intermediate routing devices.",
        solution: "traceroute 10.10.1.22",
        accepted: [/^traceroute\s+10\.10\.1\.22$/],
        hint: "Type 'traceroute 10.10.1.22' to map the intermediate gateway hops.",
        diagnostics: [
          { check: (c) => !c.startsWith("traceroute"), msg: "Use 'traceroute' (Linux) to map network hops." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Specify the target host IP 10.10.1.22." },
          { check: (c) => /\s-/.test(c), msg: "Run the plain command first. The options come in the next steps." }
        ],
        highlightText: "fw-internal.corp.local (10.10.1.5)",
        output: `traceroute to 10.10.1.22 (10.10.1.22), 30 hops max, 60 byte packets
 1  gateway.corp.local (10.10.1.1)  0.281 ms  0.245 ms  0.210 ms
 2  fw-internal.corp.local (10.10.1.5)  0.412 ms  0.395 ms  0.380 ms
 3  win-server-2022.corp.local (10.10.1.22)  0.512 ms  0.485 ms  0.470 ms`
      },
      {
        label: "No DNS lookups (-n)",
        task: "Repeat the trace, but show raw IP addresses only and skip the slow reverse DNS lookups.",
        solution: "traceroute -n 10.10.1.22",
        accepted: [
          /^traceroute\s+-n\s+10\.10\.1\.22$/,
          /^traceroute\s+10\.10\.1\.22\s+-n$/
        ],
        hint: "Add the '-n' option (numeric output) before the target IP.",
        diagnostics: [
          { check: (c) => !c.startsWith("traceroute"), msg: "Use the 'traceroute' command." },
          { check: (c) => !/-n\b/.test(c), msg: "The option that disables name resolution is '-n'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Specify the target host IP 10.10.1.22." }
        ],
        output: `traceroute to 10.10.1.22 (10.10.1.22), 30 hops max, 60 byte packets
 1  10.10.1.1  0.253 ms  0.221 ms  0.198 ms
 2  10.10.1.5  0.398 ms  0.371 ms  0.362 ms
 3  10.10.1.22  0.498 ms  0.471 ms  0.455 ms`
      },
      {
        label: "Limit hops (-m)",
        task: "Stop the trace after only 2 hops, to look at just the first routers on the path.",
        solution: "traceroute -m 2 10.10.1.22",
        accepted: [
          /^traceroute\s+-m\s*2\s+10\.10\.1\.22$/,
          /^traceroute\s+10\.10\.1\.22\s+-m\s*2$/
        ],
        hint: "The '-m' option sets the maximum number of hops. Use '-m 2'.",
        diagnostics: [
          { check: (c) => !c.startsWith("traceroute"), msg: "Use the 'traceroute' command." },
          { check: (c) => !/-m\s*\d+/.test(c), msg: "The maximum-hops option is '-m' followed by a number." },
          { check: (c) => !/-m\s*2\b/.test(c), msg: "The task asks for exactly 2 hops: use '-m 2'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Specify the target host IP 10.10.1.22." }
        ],
        output: `traceroute to 10.10.1.22 (10.10.1.22), 2 hops max, 60 byte packets
 1  gateway.corp.local (10.10.1.1)  0.279 ms  0.241 ms  0.216 ms
 2  fw-internal.corp.local (10.10.1.5)  0.408 ms  0.391 ms  0.377 ms`
      },
      {
        label: "ICMP probes (-I)",
        task: "By default Linux traceroute sends UDP probes. Switch to ICMP echo probes, which some firewalls treat differently.",
        solution: "traceroute -I 10.10.1.22",
        accepted: [
          /^traceroute\s+-I\s+10\.10\.1\.22$/,
          /^traceroute\s+10\.10\.1\.22\s+-I$/
        ],
        hint: "A capital '-I' switches traceroute to ICMP ECHO probes.",
        diagnostics: [
          { check: (c) => !c.startsWith("traceroute"), msg: "Use the 'traceroute' command." },
          { check: (c) => !/-I\b/.test(c), msg: "The ICMP option is a capital '-I'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Specify the target host IP 10.10.1.22." }
        ],
        output: `traceroute to 10.10.1.22 (10.10.1.22), 30 hops max, 60 byte packets
 1  gateway.corp.local (10.10.1.1)  0.301 ms  0.264 ms  0.249 ms
 2  fw-internal.corp.local (10.10.1.5)  0.437 ms  0.410 ms  0.402 ms
 3  win-server-2022.corp.local (10.10.1.22)  0.531 ms  0.502 ms  0.489 ms`
      }
    ]
  },

  // ---------------------------------------------------------------- NSLOOKUP
  {
    id: 3,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Nslookup: Querying DNS Records",
    difficulty: "Beginner",
    points: 150,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Passive footprinting involves querying publicly available DNS infrastructure. Nslookup lets you ask for different record types: the address, the name servers, the mail servers and the administrative record of the target domain.",
    tutorNotes: "Teaching Talking Point: Querying public name servers does not touch the target company's network, making it passive and invisible to their security team. Walk through each record type and what it tells an attacker: A = where, NS = who answers for the domain, MX = mail infrastructure, SOA = administrative contact and zone serial.",
    cehExamTip: "Exam Alert: Name Server (NS) records indicate which DNS server is authoritative for a domain. Attackers footprint NS records to target DNS servers for zone transfers or DNS cache poisoning.",
    analysisQuestion: {
      prompt: "Why is discovering the authoritative Name Server (NS) beneficial for an ethical hacker during reconnaissance?",
      options: [
        { text: "It identifies the exact DNS servers holding the target domain's full DNS records for zone transfer tests", correct: true },
        { text: "It cracks the administrator password of the web server", correct: false },
        { text: "It bypasses HTTPS SSL certificate validation", correct: false },
        { text: "It extracts active user sessions from memory", correct: false }
      ],
      explanation: "Identifying the authoritative DNS servers allows penetration testers to test those specific servers for DNS zone transfers, cache poisoning, and misconfigurations."
    },
    steps: [
      {
        label: "Default lookup",
        task: "Look up the IP address of 'certifiedhacker.com' with a plain nslookup query.",
        solution: "nslookup certifiedhacker.com",
        accepted: [
          /^nslookup\s+certifiedhacker\.com$/,
          /^nslookup\s+-type=a\s+certifiedhacker\.com$/i
        ],
        hint: "Type 'nslookup' followed by the domain name. No options are needed.",
        diagnostics: [
          { check: (c) => !c.startsWith("nslookup"), msg: "Use 'nslookup' to perform DNS queries." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." },
          { check: (c) => /-type|-q/.test(c), msg: "A plain lookup needs no record type. Try just the command and the domain." }
        ],
        output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
Name:   certifiedhacker.com
Address: 162.159.24.80`
      },
      {
        label: "Name servers (-type=ns)",
        task: "Use nslookup to query the authoritative Name Server (NS) records for 'certifiedhacker.com'.",
        solution: "nslookup -type=ns certifiedhacker.com",
        accepted: [
          /^nslookup\s+-type=ns\s+certifiedhacker\.com$/i,
          /^nslookup\s+-query=ns\s+certifiedhacker\.com$/i,
          /^nslookup\s+-q=ns\s+certifiedhacker\.com$/i
        ],
        hint: "Use 'nslookup -type=ns certifiedhacker.com' to query NS records.",
        diagnostics: [
          { check: (c) => !c.startsWith("nslookup"), msg: "Use 'nslookup' to perform DNS queries." },
          { check: (c) => !/ns\b/i.test(c.replace("nslookup", "")), msg: "Specify the query type for Name Servers: '-type=ns'." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        highlightText: "nameserver = ns1.bluehost.com.",
        output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
certifiedhacker.com     nameserver = ns1.bluehost.com.
certifiedhacker.com     nameserver = ns2.bluehost.com.

Authoritative answers can be found from:
ns1.bluehost.com        internet address = 162.159.24.80
ns2.bluehost.com        internet address = 162.159.25.175`
      },
      {
        label: "Mail servers (-type=mx)",
        task: "Now ask for the Mail Exchanger (MX) records of 'certifiedhacker.com'.",
        solution: "nslookup -type=mx certifiedhacker.com",
        accepted: [
          /^nslookup\s+-type=mx\s+certifiedhacker\.com$/i,
          /^nslookup\s+-query=mx\s+certifiedhacker\.com$/i,
          /^nslookup\s+-q=mx\s+certifiedhacker\.com$/i
        ],
        hint: "Same command as before, but the record type is 'mx'.",
        diagnostics: [
          { check: (c) => !c.startsWith("nslookup"), msg: "Use 'nslookup' to perform DNS queries." },
          { check: (c) => !/mx\b/i.test(c), msg: "Specify the query type for mail servers: '-type=mx'." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
certifiedhacker.com     mail exchanger = 10 mail.certifiedhacker.com.

Authoritative answers can be found from:
mail.certifiedhacker.com        internet address = 10.10.1.25`
      },
      {
        label: "Start of authority (-type=soa)",
        task: "Query the Start of Authority (SOA) record to find the primary server and the administrator's contact.",
        solution: "nslookup -type=soa certifiedhacker.com",
        accepted: [
          /^nslookup\s+-type=soa\s+certifiedhacker\.com$/i,
          /^nslookup\s+-query=soa\s+certifiedhacker\.com$/i,
          /^nslookup\s+-q=soa\s+certifiedhacker\.com$/i
        ],
        hint: "The record type for the zone's administrative record is 'soa'.",
        diagnostics: [
          { check: (c) => !c.startsWith("nslookup"), msg: "Use 'nslookup' to perform DNS queries." },
          { check: (c) => !/soa\b/i.test(c), msg: "Specify the query type: '-type=soa'." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
certifiedhacker.com
        origin = ns1.bluehost.com
        mail addr = dnsadmin.box5331.bluehost.com
        serial = 2026101801
        refresh = 86400
        retry = 7200
        expire = 3600000
        minimum = 300`
      },
      {
        label: "Choose the DNS server",
        task: "Ask a specific public DNS server instead of the default resolver: query certifiedhacker.com using Google's server 8.8.8.8.",
        solution: "nslookup certifiedhacker.com 8.8.8.8",
        accepted: [
          /^nslookup\s+certifiedhacker\.com\s+\d{1,3}(\.\d{1,3}){3}$/
        ],
        hint: "Put the DNS server's IP address after the domain name: 'nslookup <domain> <server>'.",
        diagnostics: [
          { check: (c) => !c.startsWith("nslookup"), msg: "Use 'nslookup' to perform DNS queries." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." },
          { check: (c) => !/\d{1,3}(\.\d{1,3}){3}/.test(c), msg: "Add the DNS server's IP address after the domain, for example 8.8.8.8." }
        ],
        output: (cmd) => {
          const server = (String(cmd).match(/(\d{1,3}(?:\.\d{1,3}){3})\s*$/) || [, "8.8.8.8"])[1];
          return `Server:         ${server}
Address:        ${server}#53

Non-authoritative answer:
Name:   certifiedhacker.com
Address: 162.159.24.80`;
        }
      }
    ]
  },

  // ---------------------------------------------------------------- DIG
  {
    id: 4,
    replaces: [5],
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Dig: DNS Records & Zone Transfer",
    difficulty: "Intermediate",
    points: 200,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Dig is the professional's DNS tool. Learn to pull specific records, trim the output, run a reverse lookup, and finally test whether a DNS server leaks its entire zone to anyone who asks.",
    tutorNotes: "Teaching Talking Point: In MX records the lowest preference number is contacted first. For the final step, explain why AXFR uses TCP port 53 rather than UDP: zone files exceed the 512-byte UDP limit. A successful zone transfer from an untrusted host is a real finding.",
    cehExamTip: "Exam Alert: DNS queries normally use UDP port 53. However, DNS Zone Transfers (AXFR) ALWAYS occur over TCP port 53. If TCP 53 is blocked, zone transfers will fail. For MX records, the lower the preference number, the higher the priority.",
    analysisQuestion: {
      prompt: "What sensitive internal asset was revealed in the dumped zone records that was not publicly advertised?",
      options: [
        { text: "An internal database server: db-internal.certifiedhacker.com @ 10.10.1.15", correct: true },
        { text: "A cloud Bitcoin wallet", correct: false },
        { text: "The root CA private key", correct: false },
        { text: "Cleartext passwords of all employees", correct: false }
      ],
      explanation: "A successful zone transfer reveals all internal DNS records, including non-public internal hosts like database servers (10.10.1.15) and domain controllers (10.10.1.2)."
    },
    steps: [
      {
        label: "Mail servers (mx)",
        task: "Use dig to query the Mail Exchanger (MX) records for 'certifiedhacker.com'.",
        solution: "dig mx certifiedhacker.com",
        accepted: [
          /^dig\s+mx\s+certifiedhacker\.com$/,
          /^dig\s+certifiedhacker\.com\s+mx$/
        ],
        hint: "Type 'dig mx certifiedhacker.com' to query mail exchanger records.",
        diagnostics: [
          { check: (c) => !c.startsWith("dig"), msg: "Use 'dig' (Domain Information Groper) to query DNS records." },
          { check: (c) => !c.toLowerCase().includes("mx"), msg: "Make sure you specify the 'mx' record type." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Include the target domain: certifiedhacker.com." }
        ],
        highlightText: "10 mail.certifiedhacker.com.",
        output: `; <<>> DiG 9.18.1-1-Debian <<>> mx certifiedhacker.com
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, reqnum: 48921
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 2, ADDITIONAL: 3

;; QUESTION SECTION:
;certifiedhacker.com.           IN      MX

;; ANSWER SECTION:
certifiedhacker.com.    3600    IN      MX      10 mail.certifiedhacker.com.

;; ADDITIONAL SECTION:
mail.certifiedhacker.com. 3600  IN      A       10.10.1.25

;; Query time: 14 msec
;; SERVER: 10.10.1.1#53(10.10.1.1) (UDP)`
      },
      {
        label: "Text records (txt)",
        task: "Query the TXT records of 'certifiedhacker.com'. They hold SPF policies and verification tokens.",
        solution: "dig txt certifiedhacker.com",
        accepted: [
          /^dig\s+txt\s+certifiedhacker\.com$/i,
          /^dig\s+certifiedhacker\.com\s+txt$/i
        ],
        hint: "Same pattern as the MX query, but the record type is 'txt'.",
        diagnostics: [
          { check: (c) => !c.startsWith("dig"), msg: "Use 'dig' to query DNS records." },
          { check: (c) => !/txt/i.test(c), msg: "Which record type holds free-form text? 'txt'." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Include the target domain: certifiedhacker.com." }
        ],
        output: `; <<>> DiG 9.18.1-1-Debian <<>> txt certifiedhacker.com
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 27304
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;certifiedhacker.com.           IN      TXT

;; ANSWER SECTION:
certifiedhacker.com.    3600    IN      TXT     "v=spf1 mx a ip4:10.10.1.0/24 ~all"
certifiedhacker.com.    3600    IN      TXT     "google-site-verification=Zk3b9Qe1Yw0pXJt8aVd2"

;; Query time: 9 msec
;; SERVER: 10.10.1.1#53(10.10.1.1) (UDP)`
      },
      {
        label: "Short answer (+short)",
        task: "Ask for the MX record again, but print only the answer with no extra detail.",
        solution: "dig +short mx certifiedhacker.com",
        accepted: [
          /^dig\s+\+short\s+mx\s+certifiedhacker\.com$/,
          /^dig\s+mx\s+certifiedhacker\.com\s+\+short$/,
          /^dig\s+certifiedhacker\.com\s+mx\s+\+short$/,
          /^dig\s+\+short\s+certifiedhacker\.com\s+mx$/
        ],
        hint: "Add the '+short' query option (note the plus sign) to the MX query.",
        diagnostics: [
          { check: (c) => !c.startsWith("dig"), msg: "Use 'dig' to query DNS records." },
          { check: (c) => !c.includes("+short"), msg: "dig's query options start with a plus sign. The brief-output option is '+short'." },
          { check: (c) => !/mx/i.test(c), msg: "Keep the 'mx' record type from step 1." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Include the target domain: certifiedhacker.com." }
        ],
        output: `10 mail.certifiedhacker.com.`
      },
      {
        label: "Reverse lookup (-x)",
        target: "10.10.1.22",
        task: "Find which hostname belongs to the IP address 10.10.1.22 with a reverse (PTR) lookup.",
        solution: "dig -x 10.10.1.22",
        accepted: [/^dig\s+-x\s+10\.10\.1\.22$/],
        hint: "The '-x' option performs a reverse lookup. Give it the IP address.",
        diagnostics: [
          { check: (c) => !c.startsWith("dig"), msg: "Use 'dig' to query DNS records." },
          { check: (c) => !c.includes("-x"), msg: "The reverse lookup option is '-x'." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Look up the IP address 10.10.1.22." }
        ],
        highlightText: "win2022.certifiedhacker.com.",
        output: `; <<>> DiG 9.18.1-1-Debian <<>> -x 10.10.1.22
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 20711
;; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;22.1.10.10.in-addr.arpa.       IN      PTR

;; ANSWER SECTION:
22.1.10.10.in-addr.arpa. 3600   IN      PTR     win2022.certifiedhacker.com.

;; Query time: 6 msec
;; SERVER: 10.10.1.1#53(10.10.1.1) (UDP)`
      },
      {
        label: "Zone transfer (axfr @server)",
        target: "10.10.1.22 (DNS Server)",
        task: "Attempt a full DNS zone transfer (AXFR) for 'certifiedhacker.com' against the DNS server 10.10.1.22.",
        solution: "dig axfr certifiedhacker.com @10.10.1.22",
        accepted: [
          /^dig\s+axfr\s+certifiedhacker\.com\s+@10\.10\.1\.22$/,
          /^dig\s+@10\.10\.1\.22\s+certifiedhacker\.com\s+axfr$/,
          /^dig\s+@10\.10\.1\.22\s+axfr\s+certifiedhacker\.com$/
        ],
        hint: "Use 'dig axfr <domain> @<DNS-Server-IP>' to request a full zone transfer.",
        diagnostics: [
          { check: (c) => !c.startsWith("dig"), msg: "Use 'dig' to perform the zone transfer test." },
          { check: (c) => !c.toLowerCase().includes("axfr"), msg: "AXFR is the DNS query type for a full zone transfer." },
          { check: (c) => !c.includes("@10.10.1.22"), msg: "Specify the DNS server with an '@' prefix: @10.10.1.22." }
        ],
        highlightText: "db-internal.certifiedhacker.com. 86400 IN A     10.10.1.15",
        output: `; <<>> DiG 9.18.1-1-Debian <<>> axfr certifiedhacker.com @10.10.1.22
; (1 server found)
;; global options: +cmd
certifiedhacker.com.    86400   IN      SOA     ns1.certifiedhacker.com. admin.certifiedhacker.com. 2026101801 7200 3600 1209600 3600
certifiedhacker.com.    86400   IN      NS      ns1.certifiedhacker.com.
certifiedhacker.com.    86400   IN      MX      10 mail.certifiedhacker.com.
gateway.certifiedhacker.com. 86400 IN   A       10.10.1.1
dc01.certifiedhacker.com. 86400 IN      A       10.10.1.2
db-internal.certifiedhacker.com. 86400 IN A     10.10.1.15
fileserver.certifiedhacker.com. 86400 IN A      10.10.1.20
win2022.certifiedhacker.com. 86400 IN   A       10.10.1.22
certifiedhacker.com.    86400   IN      SOA     ns1.certifiedhacker.com. admin.certifiedhacker.com. 2026101801 7200 3600 1209600 3600
;; Query time: 18 msec
;; SERVER: 10.10.1.22#53(10.10.1.22) (TCP)
;; XFR size: 9 records (messages 1, bytes 320)`
      }
    ]
  },

  // ---------------------------------------------------------------- CURL
  {
    id: 6,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Curl: Web Banner Grabbing",
    difficulty: "Beginner",
    points: 150,
    target: "http://10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Web server banners disclose the server software and operating system. Curl lets you look at exactly what a web server says about itself: headers only, headers with the page, redirects, and how it reacts to a different browser identity.",
    tutorNotes: "Teaching Talking Point: IIS 10.0 and ASP.NET confirm the server is Windows Server. Hardening guidelines recommend removing the 'Server' and 'X-Powered-By' headers. Show that -I sends a HEAD request, while -i sends a normal GET and prints the headers too.",
    cehExamTip: "Exam Alert: The 'Server: Microsoft-IIS/10.0' banner immediately reveals the target is running Windows Server 2016, 2019, or 2022. Banner grabbing can be done actively via Telnet/Netcat/cURL, or passively via Wireshark.",
    analysisQuestion: {
      prompt: "What operating system family and web engine are revealed by the HTTP response banner?",
      options: [
        { text: "Microsoft Windows Server running Internet Information Services (IIS 10.0)", correct: true },
        { text: "Ubuntu Linux running Nginx 1.18", correct: false },
        { text: "Red Hat Enterprise Linux running Apache Tomcat", correct: false },
        { text: "macOS Server running Lighttpd", correct: false }
      ],
      explanation: "The header 'Server: Microsoft-IIS/10.0' together with 'X-Powered-By: ASP.NET' directly confirms Windows Server 2016/2019/2022."
    },
    steps: [
      {
        label: "Headers only (-I)",
        task: "Grab only the HTTP response headers (a HEAD request) from the web server at http://10.10.1.22.",
        solution: "curl -I http://10.10.1.22",
        accepted: [
          /^curl\s+-I\s+http:\/\/10\.10\.1\.22\/?$/,
          /^curl\s+-I\s+10\.10\.1\.22\/?$/,
          /^curl\s+--head\s+http:\/\/10\.10\.1\.22\/?$/,
          /^curl\s+--head\s+10\.10\.1\.22\/?$/
        ],
        hint: "Use 'curl -I http://10.10.1.22' to fetch headers only (HTTP HEAD).",
        diagnostics: [
          { check: (c) => !c.startsWith("curl"), msg: "Use 'curl' to retrieve web headers." },
          { check: (c) => !c.includes("-I") && !c.includes("--head"), msg: "Use the capital '-I' (or '--head') option to fetch headers only, without the page body." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "Server: Microsoft-IIS/10.0",
        output: `HTTP/1.1 200 OK
Content-Type: text/html
Last-Modified: Sun, 18 Oct 2026 14:12:00 GMT
Accept-Ranges: bytes
ETag: "813f89a9c2d1:0"
Server: Microsoft-IIS/10.0
X-Powered-By: ASP.NET
Date: Sun, 18 Oct 2026 18:22:45 GMT
Content-Length: 703`
      },
      {
        label: "Headers and body (-i)",
        task: "Now fetch the page itself and include the response headers in the output.",
        solution: "curl -i http://10.10.1.22",
        accepted: [
          /^curl\s+-i\s+(http:\/\/)?10\.10\.1\.22\/?$/,
          /^curl\s+--include\s+(http:\/\/)?10\.10\.1\.22\/?$/
        ],
        hint: "A lowercase '-i' includes the headers in a normal request. (Capital '-I' sends HEAD instead.)",
        diagnostics: [
          { check: (c) => !c.startsWith("curl"), msg: "Use 'curl' to talk to the web server." },
          { check: (c) => c.includes("-I"), msg: "Capital '-I' returns headers only. Use the lowercase '-i' to get headers and the page." },
          { check: (c) => !c.includes("-i") && !c.includes("--include"), msg: "Use the lowercase '-i' option to include response headers." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Provide the target address: http://10.10.1.22." }
        ],
        output: `HTTP/1.1 200 OK
Content-Type: text/html
Last-Modified: Sun, 18 Oct 2026 14:12:00 GMT
Accept-Ranges: bytes
ETag: "813f89a9c2d1:0"
Server: Microsoft-IIS/10.0
X-Powered-By: ASP.NET
Date: Sun, 18 Oct 2026 18:25:10 GMT
Content-Length: 703

<!DOCTYPE html>
<html><head><title>IIS Windows Server</title></head>
<body><h1>CertifiedHacker Intranet</h1><p>Welcome. Authorised users only.</p></body></html>`
      },
      {
        label: "Follow redirects (-L)",
        task: "The page http://10.10.1.22/old has moved. Follow the redirect automatically to reach the final page.",
        solution: "curl -L http://10.10.1.22/old",
        accepted: [
          /^curl\s+-L\s+(http:\/\/)?10\.10\.1\.22\/old\/?$/,
          /^curl\s+--location\s+(http:\/\/)?10\.10\.1\.22\/old\/?$/
        ],
        hint: "Add '-L' (follow redirects) and request http://10.10.1.22/old.",
        diagnostics: [
          { check: (c) => !c.startsWith("curl"), msg: "Use 'curl' to talk to the web server." },
          { check: (c) => !c.includes("-L") && !c.includes("--location"), msg: "The follow-redirects option is a capital '-L'." },
          { check: (c) => !c.includes("/old"), msg: "Request the moved page: http://10.10.1.22/old." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Provide the target address: http://10.10.1.22/old." }
        ],
        output: `<!DOCTYPE html>
<html><head><title>Intranet - New Portal</title></head>
<body><h1>We have moved</h1><p>This is the new CertifiedHacker portal.</p></body></html>`
      },
      {
        label: "Custom user agent (-A)",
        task: "Some servers react to the browser identity. Send the User-Agent \"Mozilla/5.0\" and fetch only the headers from http://10.10.1.22.",
        solution: "curl -A \"Mozilla/5.0\" -I http://10.10.1.22",
        accepted: [
          (c) => /^curl\b/.test(_ln(c)) && /\s(-A|--user-agent)[\s=]*["']?Mozilla\/5\.0["']?(\s|$)/.test(" " + _ln(c)) && _lhas(c, /\s(-I|--head)\s/) && /10\.10\.1\.22/.test(c)
        ],
        hint: "Combine '-A \"Mozilla/5.0\"' (the User-Agent) with '-I' (headers only).",
        diagnostics: [
          { check: (c) => !c.startsWith("curl"), msg: "Use 'curl' to talk to the web server." },
          { check: (c) => !c.includes("-A") && !c.includes("--user-agent"), msg: "The User-Agent option is a capital '-A'. Put the agent string in quotes after it." },
          { check: (c) => !c.includes("-I") && !c.includes("--head"), msg: "Keep '-I' from step 1 so only the headers come back." },
          { check: (c) => !c.includes("10.10.1.22"), msg: "Provide the target address: http://10.10.1.22." }
        ],
        output: `HTTP/1.1 200 OK
Content-Type: text/html
Server: Microsoft-IIS/10.0
Vary: User-Agent
X-Powered-By: ASP.NET
Date: Sun, 18 Oct 2026 18:27:31 GMT
Content-Length: 703`
      }
    ]
  },

  // ---------------------------------------------------------------- WHOIS (new tool)
  {
    id: 51,
    placeAfter: 6,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Whois: Domain & IP Registration",
    difficulty: "Beginner",
    points: 100,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Registration records are public. Whois shows who registered a domain, when, through which registrar, who owns an IP block, and which name servers are used, all without sending a single packet to the target.",
    tutorNotes: "Teaching Talking Point: Whois is passive reconnaissance. Registrar, creation and expiry dates, name servers and contact emails all feed later phases (social engineering, DNS tests, phishing-resilience checks). Many registrars offer privacy services that redact contact data.",
    cehExamTip: "Exam Alert: WHOIS data is held by regional registries (ARIN, RIPE, APNIC, LACNIC, AFRINIC). Querying it is passive footprinting because it does not touch the target's own servers.",
    analysisQuestion: {
      prompt: "Why is a WHOIS lookup classified as passive reconnaissance?",
      options: [
        { text: "It queries a public registry, not the target's own systems, so the target sees nothing", correct: true },
        { text: "It only works on domains you own", correct: false },
        { text: "It encrypts the traffic so nobody can see it", correct: false },
        { text: "It scans the target's open ports quietly", correct: false }
      ],
      explanation: "WHOIS data lives in public registry databases. Asking those servers generates no traffic to the target organisation, so it cannot trigger its IDS or logs."
    },
    steps: [
      {
        label: "Domain registration",
        task: "Look up the registration record of the domain 'certifiedhacker.com'.",
        solution: "whois certifiedhacker.com",
        accepted: [/^whois\s+certifiedhacker\.com$/i],
        hint: "Type 'whois' followed by the domain name.",
        diagnostics: [
          { check: (c) => !c.startsWith("whois"), msg: "Use the 'whois' command to query registration data." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        highlightText: "Name Server: NS1.BLUEHOST.COM",
        output: `   Domain Name: CERTIFIEDHACKER.COM
   Registry Domain ID: 1233471899_DOMAIN_COM-VRSN
   Registrar WHOIS Server: whois.networksolutions.com
   Registrar URL: http://www.networksolutions.com
   Updated Date: 2025-09-22T10:41:09Z
   Creation Date: 2002-07-30T01:03:50Z
   Registry Expiry Date: 2026-07-30T01:03:50Z
   Registrar: Network Solutions, LLC
   Name Server: NS1.BLUEHOST.COM
   Name Server: NS2.BLUEHOST.COM
   DNSSEC: unsigned

Registrant Organization: CertifiedHacker Labs
Registrant State/Province: NM
Registrant Country: US
Admin Email: dnsadmin@certifiedhacker.com`
      },
      {
        label: "IP ownership",
        target: "203.0.113.10",
        task: "The web host answers from 203.0.113.10. Find out who owns that IP address block.",
        solution: "whois 203.0.113.10",
        accepted: [/^whois\s+203\.0\.113\.10$/],
        hint: "Whois also accepts an IP address instead of a domain name.",
        diagnostics: [
          { check: (c) => !c.startsWith("whois"), msg: "Use the 'whois' command." },
          { check: (c) => !c.includes("203.0.113.10"), msg: "Query the IP address 203.0.113.10." }
        ],
        output: `NetRange:       203.0.113.0 - 203.0.113.255
CIDR:           203.0.113.0/24
NetName:        TEST-NET-3
NetType:        IANA Special Use
OrgName:        Internet Assigned Numbers Authority
OrgId:          IANA
Comment:        Documentation range. Not routable on the Internet.`
      },
      {
        label: "Choose the server (-h)",
        task: "Ask a specific WHOIS server, whois.iana.org, about 'certifiedhacker.com' instead of the default one.",
        solution: "whois -h whois.iana.org certifiedhacker.com",
        accepted: [
          /^whois\s+-h\s+whois\.iana\.org\s+certifiedhacker\.com$/i,
          /^whois\s+certifiedhacker\.com\s+-h\s+whois\.iana\.org$/i
        ],
        hint: "The '-h' option sets the WHOIS server host: 'whois -h <server> <domain>'.",
        diagnostics: [
          { check: (c) => !c.startsWith("whois"), msg: "Use the 'whois' command." },
          { check: (c) => !c.includes("-h"), msg: "The option that selects the WHOIS server is '-h'." },
          { check: (c) => !c.includes("whois.iana.org"), msg: "Use the server whois.iana.org." },
          { check: (c) => !c.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        output: `% IANA WHOIS server
% for more information on IANA, visit http://www.iana.org

refer:        whois.verisign-grs.com

domain:       COM
organisation: VeriSign Global Registry Services
whois:        whois.verisign-grs.com
status:       ACTIVE`
      }
    ]
  }
];
