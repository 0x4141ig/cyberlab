const CEH_QUESTIONS = [
  // ==========================================
  // MODULE 1: INTRODUCTION TO ETHICAL HACKING
  // ==========================================
  {
    id: 1,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "Host Reachability & ICMP Verification",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "Before conducting any penetration testing engagement under your agreed Rules of Engagement (RoE), you must verify that the in-scope target system is alive and reachable over the network.",
    task: "Send exactly 4 ICMP echo request packets to verify network connectivity to the target 10.10.1.22.",
    solution: "ping -c 4 10.10.1.22",
    accepted: [
      /^ping\s+-c\s*4\s+10\.10\.1\.22$/,
      /^ping\s+10\.10\.1\.22\s+-c\s*4$/,
      /^ping\s+10\.10\.1\.22$/
    ],
    hint: "Use the 'ping' command with the '-c' flag set to 4 followed by the target IP address 10.10.1.22.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("ping"), msg: "Use the 'ping' command to send ICMP echo requests." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Make sure you include the target IP address: 10.10.1.22." },
      { check: (cmd) => cmd.includes("-n"), msg: "On Linux (Parrot/Kali), use '-c' to specify the packet count (not Windows '-n')." }
    ],
    tutorNotes: "Teaching Talking Point: Remind students of the Ethical Hacking Phases: 1. Recon, 2. Scanning, 3. Gaining Access, 4. Maintaining Access, 5. Clearing Tracks. Point out that TTL=128 in the ping output indicates a Microsoft Windows kernel, whereas Linux kernels default to TTL=64.",
    highlightText: "ttl=128",
    analysisQuestion: {
      prompt: "Looking at the ping output in the terminal, what specific evidence proves the host is active and strongly indicates it is running a Windows OS?",
      options: [
        { text: "64 bytes received with TTL=128 (Windows defaults to TTL=128; Linux defaults to 64)", correct: true },
        { text: "The response time is 0.452 ms", correct: false },
        { text: "The packet size was 56(84) bytes", correct: false },
        { text: "The target sent back a TCP ACK flag", correct: false }
      ],
      explanation: "Receiving ICMP echo replies proves the host is alive. The Initial TTL (Time To Live) is set by the OS kernel: Windows uses 128, while Linux/Unix systems default to 64."
    },
    output: `PING 10.10.1.22 (10.10.1.22) 56(84) bytes of data.
64 bytes from 10.10.1.22: icmp_seq=1 ttl=128 time=0.452 ms
64 bytes from 10.10.1.22: icmp_seq=2 ttl=128 time=0.389 ms
64 bytes from 10.10.1.22: icmp_seq=3 ttl=128 time=0.410 ms
64 bytes from 10.10.1.22: icmp_seq=4 ttl=128 time=0.421 ms

--- 10.10.1.22 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3072ms
rtt min/avg/max/mdev = 0.389/0.418/0.452/0.023 ms`,
    cehExamTip: "Exam Alert: ICMP Echo Request is Type 8, and Echo Reply is Type 0. Notice the TTL is 128 in the response; standard Windows hosts default to TTL=128, while Linux hosts default to TTL=64."
  },
  {
    id: 2,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "Network Path Discovery (Traceroute)",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.22 (Target Gateway)",
    prompt: "root@parrot:~#",
    scenario: "As part of scoping and network architecture assessment, you need to map out the intermediate routing hops between your testing station and the target server.",
    task: "Trace the network path to the target 10.10.1.22 to discover all intermediate routing devices.",
    solution: "traceroute 10.10.1.22",
    accepted: [
      /^traceroute\s+10\.10\.1\.22$/,
      /^tracert\s+10\.10\.1\.22$/
    ],
    hint: "Type 'traceroute 10.10.1.22' to map the intermediate gateway hops.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("traceroute") && !cmd.startsWith("tracert"), msg: "Use 'traceroute' (Linux) to map network hops." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Specify the target host IP 10.10.1.22." }
    ],
    tutorNotes: "Teaching Talking Point: Draw the packet transit on the board: TTL=1 drops at hop 1, TTL=2 drops at hop 2. Explain how Hop 2 reveals an internal firewall device ('fw-internal.corp.local').",
    highlightText: "fw-internal.corp.local (10.10.1.5)",
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
    output: `traceroute to 10.10.1.22 (10.10.1.22), 30 hops max, 60 byte packets
 1  gateway.corp.local (10.10.1.1)  0.281 ms  0.245 ms  0.210 ms
 2  fw-internal.corp.local (10.10.1.5)  0.412 ms  0.395 ms  0.380 ms
 3  win-server-2022.corp.local (10.10.1.22)  0.512 ms  0.485 ms  0.470 ms`,
    cehExamTip: "Exam Alert: Traceroute on Linux sends UDP packets with incrementing TTL values starting at 1. On Windows, 'tracert' uses ICMP Echo Requests. When TTL reaches 0, intermediate routers return ICMP Type 11 (Time-to-Live Exceeded)."
  },

  // ==========================================
  // MODULE 2: FOOTPRINTING AND RECONNAISSANCE
  // ==========================================
  {
    id: 3,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "DNS Name Server (NS) Footprinting",
    difficulty: "Beginner",
    points: 100,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Passive footprinting involves querying publicly available DNS infrastructure to discover the authoritative name servers managing the target organization's domain.",
    task: "Use nslookup to query the authoritative Name Server (NS) records for the domain 'certifiedhacker.com'.",
    solution: "nslookup -type=ns certifiedhacker.com",
    accepted: [
      /^nslookup\s+-type=ns\s+certifiedhacker\.com$/,
      /^nslookup\s+-query=ns\s+certifiedhacker\.com$/,
      /^nslookup\s+-q=ns\s+certifiedhacker\.com$/,
      /^dig\s+ns\s+certifiedhacker\.com$/
    ],
    hint: "Use 'nslookup -type=ns certifiedhacker.com' to query NS records.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nslookup") && !cmd.startsWith("dig"), msg: "Use 'nslookup' to perform DNS queries." },
      { check: (cmd) => !cmd.toLowerCase().includes("ns"), msg: "Specify the query type for Name Servers: '-type=ns'." },
      { check: (cmd) => !cmd.includes("certifiedhacker.com"), msg: "Target domain must be 'certifiedhacker.com'." }
    ],
    tutorNotes: "Teaching Talking Point: Explain that querying public name servers does not touch the target company's network, making it completely passive and invisible to their security team.",
    highlightText: "nameserver = ns1.bluehost.com.",
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
    output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
certifiedhacker.com     nameserver = ns1.bluehost.com.
certifiedhacker.com     nameserver = ns2.bluehost.com.

Authoritative answers can be found from:
ns1.bluehost.com        internet address = 162.159.24.80
ns2.bluehost.com        internet address = 162.159.25.175`,
    cehExamTip: "Exam Alert: Name Server (NS) records indicate which DNS server is authoritative for a domain. Attackers footprint NS records to target DNS servers for zone transfers or DNS cache poisoning."
  },
  {
    id: 4,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Mail Exchanger (MX) Reconnaissance",
    difficulty: "Beginner",
    points: 100,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Identifying mail servers is crucial during the reconnaissance phase because email infrastructure often reveals spam filters, hosted cloud vendors, and internal naming conventions.",
    task: "Use dig to query the Mail Exchanger (MX) records for 'certifiedhacker.com'.",
    solution: "dig mx certifiedhacker.com",
    accepted: [
      /^dig\s+mx\s+certifiedhacker\.com$/,
      /^dig\s+certifiedhacker\.com\s+mx$/,
      /^nslookup\s+-type=mx\s+certifiedhacker\.com$/
    ],
    hint: "Type 'dig mx certifiedhacker.com' to query mail exchanger records.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("dig") && !cmd.startsWith("nslookup"), msg: "Use 'dig' (Domain Information Groper) to query DNS records." },
      { check: (cmd) => !cmd.toLowerCase().includes("mx"), msg: "Make sure you specify the 'mx' record type." },
      { check: (cmd) => !cmd.includes("certifiedhacker.com"), msg: "Include the target domain: certifiedhacker.com." }
    ],
    tutorNotes: "Teaching Talking Point: Show students the preference number (10). In CEH, questions often present two MX records (e.g. 10 and 20) and ask which server will be contacted first.",
    highlightText: "10 mail.certifiedhacker.com.",
    analysisQuestion: {
      prompt: "In the DNS MX answer, what is the meaning of the preference value '10' next to 'mail.certifiedhacker.com'?",
      options: [
        { text: "Lower numbers have higher delivery priority (10 is contacted before 20)", correct: true },
        { text: "It denotes port 10", correct: false },
        { text: "It represents 10 hops maximum", correct: false },
        { text: "It limits the mailbox size to 10 MB", correct: false }
      ],
      explanation: "In MX records, priority is inverse: the mail server with the lowest preference number is attempted first by sending MTAs."
    },
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
;; SERVER: 10.10.1.1#53(10.10.1.1) (UDP)`,
    cehExamTip: "Exam Alert: The lower the MX preference number (e.g., 10 vs 20), the higher the priority of the mail server. CEH exam questions frequently ask which mail server will be contacted first based on preference."
  },
  {
    id: 5,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "DNS Zone Transfer (AXFR) Attempt",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (DNS Server)",
    prompt: "root@parrot:~#",
    scenario: "A misconfigured DNS server that allows unauthorized Zone Transfers allows an attacker to download the entire DNS database containing internal hostnames and IP addresses.",
    task: "Attempt a full DNS zone transfer (AXFR) for domain 'certifiedhacker.com' against the target server @10.10.1.22.",
    solution: "dig axfr certifiedhacker.com @10.10.1.22",
    accepted: [
      /^dig\s+axfr\s+certifiedhacker\.com\s+@10\.10\.1\.22$/,
      /^dig\s+@10\.10\.1\.22\s+certifiedhacker\.com\s+axfr$/,
      /^dig\s+@10\.10\.1\.22\s+axfr\s+certifiedhacker\.com$/
    ],
    hint: "Use 'dig axfr <domain> @<DNS-Server-IP>' to request a full zone transfer.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("dig"), msg: "Use 'dig' to perform the zone transfer test." },
      { check: (cmd) => !cmd.toLowerCase().includes("axfr"), msg: "AXFR is the DNS protocol record type for full zone transfer." },
      { check: (cmd) => !cmd.includes("@10.10.1.22"), msg: "Specify the DNS server target with an '@' prefix: @10.10.1.22." }
    ],
    tutorNotes: "Teaching Talking Point: Explain to students why AXFR uses TCP port 53 rather than UDP port 53. Because zone files exceed the standard 512-byte UDP payload limit, TCP is required for reliable bulk transmission.",
    highlightText: "db-internal.certifiedhacker.com. 86400 IN A     10.10.1.15",
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
;; XFR size: 9 records (messages 1, bytes 320)`,
    cehExamTip: "Exam Alert: DNS queries normally use UDP port 53. However, DNS Zone Transfers (AXFR) ALWAYS occur over TCP port 53. If TCP 53 is blocked, zone transfers will fail."
  },
  {
    id: 6,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Web Server Banner Grabbing via HTTP Headers",
    difficulty: "Beginner",
    points: 100,
    target: "http://10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Web server banners disclose web server software and operating system details. Extracting headers without retrieving HTML bodies saves bandwidth and avoids triggering full web access logs.",
    task: "Use curl to grab only the HTTP response headers (HEAD request) from target web server http://10.10.1.22.",
    solution: "curl -I http://10.10.1.22",
    accepted: [
      /^curl\s+-I\s+http:\/\/10\.10\.1\.22\/?$/,
      /^curl\s+-I\s+10\.10\.1\.22\/?$/,
      /^curl\s+--head\s+http:\/\/10\.10\.1\.22\/?$/,
      /^curl\s+--head\s+10\.10\.1\.22\/?$/
    ],
    hint: "Use 'curl -I http://10.10.1.22' to fetch headers only (HTTP HEAD).",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("curl"), msg: "Use 'curl' to retrieve web headers." },
      { check: (cmd) => !cmd.includes("-I") && !cmd.includes("--head"), msg: "Use the '-I' (or '--head') flag to fetch headers only without the page body." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Provide the target address: http://10.10.1.22." }
    ],
    tutorNotes: "Teaching Talking Point: Show students that IIS 10.0 and ASP.NET confirm the server is Windows Server. Hardening guidelines recommend removing the 'Server' and 'X-Powered-By' headers.",
    highlightText: "Server: Microsoft-IIS/10.0",
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
    output: `HTTP/1.1 200 OK
Content-Type: text/html
Last-Modified: Sun, 18 Oct 2026 14:12:00 GMT
Accept-Ranges: bytes
ETag: "813f89a9c2d1:0"
Server: Microsoft-IIS/10.0
X-Powered-By: ASP.NET
Date: Sun, 18 Oct 2026 18:22:45 GMT
Content-Length: 703`,
    cehExamTip: "Exam Alert: The 'Server: Microsoft-IIS/10.0' banner immediately reveals the target is running Windows Server 2016, 2019, or 2022. Banner grabbing can be done actively via Telnet/Netcat/cURL, or passively via Wireshark."
  },

  // ==========================================
  // MODULE 3: SCANNING NETWORKS
  // ==========================================
  {
    id: 7,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "TCP SYN Stealth Scan (-sS)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "In Module 3 Lab 2, your objective is to discover open ports using the default and most popular scan technique: the half-open TCP SYN scan.",
    task: "Perform a TCP SYN Stealth scan on target 10.10.1.22 using Nmap.",
    solution: "nmap -sS 10.10.1.22",
    accepted: [
      /^nmap\s+-sS\s+10\.10\.1\.22$/,
      /^sudo\s+nmap\s+-sS\s+10\.10\.1\.22$/,
      /^nmap\s+10\.10\.1\.22\s+-sS$/
    ],
    hint: "Use 'nmap -sS 10.10.1.22'. Note that '-sS' is case-sensitive (capital 'S').",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nmap") && !cmd.startsWith("sudo nmap"), msg: "Use the 'nmap' command." },
      { check: (cmd) => cmd.includes("-ss"), msg: "Case sensitivity error: In Nmap, flags are case-sensitive. Use '-sS' (capital 'S')." },
      { check: (cmd) => !cmd.includes("-sS"), msg: "Specify the '-sS' parameter for TCP SYN Stealth scan." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Specify target IP: 10.10.1.22." }
    ],
    tutorNotes: "Teaching Talking Point: Draw the TCP handshake on the board: SYN -> SYN/ACK -> RST. Highlight port 445 (microsoft-ds) and explain that it is the primary SMB file-sharing port.",
    highlightText: "445/tcp  open  microsoft-ds",
    analysisQuestion: {
      prompt: "Which open port in the scan output represents the Microsoft Directory Services (SMB) protocol commonly targeted for lateral movement?",
      options: [
        { text: "Port 445/tcp (microsoft-ds)", correct: true },
        { text: "Port 80/tcp (http)", correct: false },
        { text: "Port 135/tcp (msrpc)", correct: false },
        { text: "Port 5357/tcp (wsdapi)", correct: false }
      ],
      explanation: "TCP Port 445 runs Microsoft SMB directly over IP without NetBIOS. It is the primary transport for Windows file sharing and remote administrative RPCs."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:30 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00042s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
5357/tcp open  wsdapi
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.48 seconds`,
    cehExamTip: "Exam Alert: TCP SYN scan is also called 'Half-Open' scanning. Attacker sends SYN -> Target responds with SYN/ACK -> Attacker immediately responds with RST (Reset). Because the 3-way handshake is never completed, application-level logs historically failed to record the connection."
  },
  {
    id: 8,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "TCP Connect Scan with Verbose Output (-sT -v)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "When scanning without raw socket / root privileges, or when auditing through strict application proxies, a full 3-way handshake scan must be employed.",
    task: "Run a full TCP Connect scan with verbose output (-v) against target 10.10.1.22.",
    solution: "nmap -sT -v 10.10.1.22",
    accepted: [
      /^nmap\s+-sT\s+-v\s+10\.10\.1\.22$/,
      /^nmap\s+-v\s+-sT\s+10\.10\.1\.22$/,
      /^nmap\s+-sTv\s+10\.10\.1\.22$/,
      /^nmap\s+-vsT\s+10\.10\.1\.22$/,
      /^nmap\s+-sT\s+10\.10\.1\.22\s+-v$/
    ],
    hint: "Use 'nmap -sT -v 10.10.1.22' to initiate the full TCP connect scan with verbose output.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nmap"), msg: "Use 'nmap' as the scanner utility." },
      { check: (cmd) => !cmd.includes("-sT"), msg: "Use '-sT' (capital T) for TCP Connect scan." },
      { check: (cmd) => !cmd.includes("-v"), msg: "Include the '-v' flag for verbose output as requested in the scenario." }
    ],
    tutorNotes: "Teaching Talking Point: Contrast -sT vs -sS. Highlight port 3389 (ms-wbt-server / RDP), which indicates Remote Desktop Protocol is active and listening for logins.",
    highlightText: "3389/tcp open  ms-wbt-server",
    analysisQuestion: {
      prompt: "What graphical remote administration protocol is listening on port 3389/tcp?",
      options: [
        { text: "Remote Desktop Protocol (RDP / ms-wbt-server)", correct: true },
        { text: "Secure Shell (SSH)", correct: false },
        { text: "VNC Remote Display", correct: false },
        { text: "Telnet Console", correct: false }
      ],
      explanation: "Port 3389 is the default for Microsoft RDP (Remote Desktop Protocol), an attractive target for credential stuffing, brute-forcing, and BlueKeep-style flaws."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:32 UTC
Initiating Connect Scan at 22:32
Scanning 10.10.1.22 [1000 ports]
Discovered open port 80/tcp on 10.10.1.22
Discovered open port 135/tcp on 10.10.1.22
Discovered open port 445/tcp on 10.10.1.22
Discovered open port 3389/tcp on 10.10.1.22
Completed Connect Scan at 22:32, 2.15s elapsed (1000 total ports)
Nmap scan report for 10.10.1.22
Host is up (0.00051s latency).
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server

Nmap done: 1 IP address (1 host up) scanned in 2.19 seconds`,
    cehExamTip: "Exam Alert: TCP Connect scan completes the entire 3-way handshake (SYN -> SYN/ACK -> ACK). It is the default scan type when a non-root / non-administrative user runs Nmap."
  },
  {
    id: 9,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "UDP Port Discovery (-sU)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Ports 53, 161)",
    prompt: "root@parrot:~#",
    scenario: "UDP services such as DNS (53) and SNMP (161) do not use handshakes and are frequently overlooked by system administrators.",
    task: "Perform a UDP scan on specific ports 53 and 161 on target 10.10.1.22.",
    solution: "nmap -sU -p 53,161 10.10.1.22",
    accepted: [
      /^nmap\s+-sU\s+-p\s*53,161\s+10\.10\.1\.22$/,
      /^nmap\s+-p\s*53,161\s+-sU\s+10\.10\.1\.22$/,
      /^nmap\s+-sU\s+10\.10\.1\.22\s+-p\s*53,161$/
    ],
    hint: "Use 'nmap -sU -p 53,161 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-sU"), msg: "Use '-sU' (capital 'U') for UDP scanning." },
      { check: (cmd) => !cmd.includes("53") || !cmd.includes("161"), msg: "Specify ports 53 and 161 using '-p 53,161'." }
    ],
    tutorNotes: "Teaching Talking Point: Highlight port 161 (snmp). Explain that SNMP exposes device configuration, routing tables, and process lists if default community strings are unchanged.",
    highlightText: "161/udp open  snmp",
    analysisQuestion: {
      prompt: "What critical network management protocol was discovered open on UDP port 161?",
      options: [
        { text: "SNMP (Simple Network Management Protocol)", correct: true },
        { text: "NTP (Network Time Protocol)", correct: false },
        { text: "TFTP (Trivial File Transfer)", correct: false },
        { text: "DHCP Client", correct: false }
      ],
      explanation: "UDP port 161 runs SNMP. In Module 4, this service will be enumerated using community strings to extract system configuration."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:35 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00045s latency).
PORT    STATE SERVICE
53/udp  open  domain
161/udp open  snmp
MAC Address: 00:0C:29:8E:4F:1A (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.12 seconds`,
    cehExamTip: "Exam Alert: In UDP scanning: If the target port is CLOSED, the host responds with an ICMP Type 3, Code 3 (Destination Port Unreachable). If NO response is returned, Nmap flags the port as 'open|filtered'."
  },
  {
    id: 10,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Service Version Detection (-sV)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Knowing only that port 80 is open is insufficient for a pen tester. You must determine the exact daemon and software version to identify known exploits.",
    task: "Scan target 10.10.1.22 to discover the running service versions on open ports.",
    solution: "nmap -sV 10.10.1.22",
    accepted: [
      /^nmap\s+-sV\s+10\.10\.1\.22$/,
      /^nmap\s+10\.10\.1\.22\s+-sV$/
    ],
    hint: "Use 'nmap -sV 10.10.1.22'. The '-sV' flag instructs Nmap to determine service versions.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-sV"), msg: "Use '-sV' (capital 'V') to enable Service Version Detection." },
      { check: (cmd) => cmd.includes("-sv"), msg: "Case sensitive: use '-sV' with a capital V." }
    ],
    tutorNotes: "Teaching Talking Point: Show students the Version column: 'Microsoft Windows Server 2022 microsoft-ds'. Point out that service versioning provides the exact query string used for vulnerability database lookups.",
    highlightText: "Microsoft Windows Server 2022 microsoft-ds",
    analysisQuestion: {
      prompt: "Why is acquiring the exact service version ('Microsoft Windows Server 2022') essential before launching exploit payloads?",
      options: [
        { text: "It allows looking up specific CVEs and prevents crashing services with mismatched exploits", correct: true },
        { text: "It generates a valid SSL certificate", correct: false },
        { text: "It changes the target MAC address", correct: false },
        { text: "It bypasses the physical network switch", correct: false }
      ],
      explanation: "Penetration testers need exact versions to select reliable, non-destructive exploits and avoid causing system crashes on unsupported builds."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:38 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00048s latency).
PORT     STATE SERVICE       VERSION
80/tcp   open  http          Microsoft IIS httpd 10.0
135/tcp  open  msrpc         Microsoft Windows RPC
139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp  open  microsoft-ds  Microsoft Windows Server 2022 microsoft-ds
3389/tcp open  ms-wbt-server Microsoft Terminal Services
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 6.42 seconds`,
    cehExamTip: "Exam Alert: '-sV' interrogates open ports using probes defined in 'nmap-service-probes'. You can adjust probe intensity from 0 (light) to 9 (all probes) with '--version-intensity <0-9>'."
  },
  {
    id: 11,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Operating System Detection (-O)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "This is exactly where your last tutorial class stopped! Active banner grabbing and OS fingerprinting analyzes TCP/IP stack implementation nuances.",
    task: "Perform OS detection against the target machine 10.10.1.22.",
    solution: "nmap -O 10.10.1.22",
    accepted: [
      /^nmap\s+-O\s+10\.10\.1\.22$/,
      /^sudo\s+nmap\s+-O\s+10\.10\.1\.22$/,
      /^nmap\s+10\.10\.1\.22\s+-O$/
    ],
    hint: "Use 'nmap -O 10.10.1.22'. Notice it is an uppercase letter 'O' (for Operating System), not zero or lowercase 'o'.",
    diagnostics: [
      { check: (cmd) => cmd.includes("-0"), msg: "Character error: That is a zero '0'. Use capital letter 'O'." },
      { check: (cmd) => cmd.includes("-o "), msg: "Lowercase '-o' is for saving output files (-oN, -oX). For OS detection use capital '-O'." },
      { check: (cmd) => !cmd.includes("-O"), msg: "Specify the '-O' parameter for OS discovery." }
    ],
    tutorNotes: "Teaching Talking Point: Point out 'TCP Sequence Prediction: Difficulty=260'. Explain that Windows uses randomized TCP ISNs (Initial Sequence Numbers), making TCP session hijacking attacks very difficult.",
    highlightText: "OS details: Microsoft Windows Server 2022 Standard 21H2",
    analysisQuestion: {
      prompt: "What exact Operating System edition and build was identified by Nmap's TCP/IP stack fingerprinting engine?",
      options: [
        { text: "Microsoft Windows Server 2022 Standard 21H2", correct: true },
        { text: "Windows XP Service Pack 2", correct: false },
        { text: "Ubuntu Linux 22.04 LTS", correct: false },
        { text: "FreeBSD 13.0 Release", correct: false }
      ],
      explanation: "Nmap's fingerprint database matched the TCP/IP stack response signatures to 'Microsoft Windows Server 2022 Standard 21H2'."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:40 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00049s latency).
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
Device type: general purpose
Running: Microsoft Windows Server 2022
OS CPE: cpe:/o:microsoft:windows_server_2022
OS details: Microsoft Windows Server 2022 Standard 21H2
Network Distance: 1 hop
TCP Sequence Prediction: Difficulty=260 (Good luck!)
IP ID Sequence Generation: Incremental

OS detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds`,
    cehExamTip: "Exam Alert: Nmap OS detection (-O) requires at least ONE open port and ONE closed port to reliably calculate TCP sequence predictability, window sizes, and response flags."
  },
  {
    id: 12,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "SMB OS Discovery via Nmap Script Engine (NSE)",
    difficulty: "Advanced",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Continuing in your lab document right after 'nmap -O', Lab 3 demonstrates how to extract exact hostname, domain name, NetBIOS name, and OS build over the SMB protocol using NSE.",
    task: "Run the Nmap NSE script 'smb-os-discovery.nse' against target 10.10.1.22.",
    solution: "nmap --script smb-os-discovery.nse 10.10.1.22",
    accepted: [
      /^nmap\s+--script\s+smb-os-discovery\.nse\s+10\.10\.1\.22$/,
      /^nmap\s+--script=smb-os-discovery\.nse\s+10\.10\.1\.22$/,
      /^nmap\s+--script\s+smb-os-discovery\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nmap --script smb-os-discovery.nse 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("--script"), msg: "Use the '--script' option to invoke an Nmap NSE script." },
      { check: (cmd) => !cmd.includes("smb-os-discovery"), msg: "Script name must be 'smb-os-discovery.nse'." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Target IP 10.10.1.22 is missing." }
    ],
    tutorNotes: "Teaching Talking Point: Show students the FQDN: 'WIN-SERVER2022.CEH.CORP'. Explain that without any authentication, SMB dialect negotiation leaked the entire Active Directory domain name.",
    highlightText: "Domain name: CEH.CORP",
    analysisQuestion: {
      prompt: "What is the name of the Active Directory domain discovered by the smb-os-discovery script?",
      options: [
        { text: "CEH.CORP", correct: true },
        { text: "WORKGROUP.LOCAL", correct: false },
        { text: "MICROSOFT.COM", correct: false },
        { text: "TARGET.INTERNAL", correct: false }
      ],
      explanation: "SMB header negotiation reveals the corporate forest and domain name 'CEH.CORP', providing attackers with the exact Active Directory domain needed for Kerberos ticket requests."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:42 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00041s latency).

Host script results:
| smb-os-discovery: 
|   OS: Windows Server 2022 Standard 20348 (Windows Server 2022 6.3)
|   OS CPE: cpe:/o:microsoft:windows_server_2022::-
|   Computer name: WIN-SERVER2022
|   NetBIOS computer name: WIN-SERVER2022\x00
|   Domain name: CEH.CORP
|   Forest name: CEH.CORP
|   FQDN: WIN-SERVER2022.CEH.CORP
|_  System time: 2026-10-18T22:42:15+00:00

Nmap done: 1 IP address (1 host up) scanned in 1.85 seconds`,
    cehExamTip: "Exam Alert: NSE scripts are located in '/usr/share/nmap/scripts/' on Kali/Parrot. The 'smb-os-discovery' script queries ports 139 and 445 directly without requiring authentication credentials."
  },
  {
    id: 13,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "IDS/Firewall Evasion: Packet Fragmentation (-f)",
    difficulty: "Advanced",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "In Lab 4 of your lab guide, you learn how to scan beyond network security perimeters. Simple packet-filtering firewalls can be evaded by splitting TCP headers across tiny fragments.",
    task: "Use Nmap to scan target 10.10.1.22 using packet fragmentation (-f) to split the IP packets into 8-byte fragments.",
    solution: "nmap -f 10.10.1.22",
    accepted: [
      /^nmap\s+-f\s+10\.10\.1\.22$/,
      /^nmap\s+-f\s+-sS\s+10\.10\.1\.22$/,
      /^nmap\s+-sS\s+-f\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nmap -f 10.10.1.22'. The '-f' option splits TCP headers into 8-byte fragments.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-f"), msg: "Use the '-f' option to enable packet fragmentation." },
      { check: (cmd) => cmd.includes("-F"), msg: "Case error: '-F' (capital) is fast scan (top 100 ports). Lowercase '-f' is packet fragmentation." }
    ],
    tutorNotes: "Teaching Talking Point: Remind students of Question 3.4.1.1 from the docx! Emphasize that adding '-f' splits the 20-byte TCP header across multiple fragments so packet filters that do not perform stateful packet reassembly cannot match rules.",
    highlightText: "PORT     STATE SERVICE",
    analysisQuestion: {
      prompt: "Why does packet fragmentation (-f) succeed in evading simple stateless network firewalls?",
      options: [
        { text: "It splits the TCP header so port information lands in subsequent fragments, bypassing header filters", correct: true },
        { text: "It encrypts the payload with TLS 1.3", correct: false },
        { text: "It converts TCP into ICMP packets", correct: false },
        { text: "It spoofs the MAC address at Layer 2", correct: false }
      ],
      explanation: "Firewalls without full packet reassembly inspect each fragment independently. Because the TCP destination port is placed in the second fragment, port-filtering rules are bypassed."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:45 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00062s latency).
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server

Nmap done: 1 IP address (1 host up) scanned in 3.12 seconds`,
    cehExamTip: "Exam Alert: CEH question 3.4.1.1 specifically tests this flag! Adding a second '-f' (or '-f -f') splits packets into 16-byte fragments. You can also specify an exact MTU using '--mtu <multiple-of-8>' (e.g. '--mtu 16')."
  },
  {
    id: 14,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "IDS Evasion: Decoy IP Addresses (-D)",
    difficulty: "Advanced",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "To hide your real scanning IP from network forensics and IDS logs, you can generate decoy traffic that makes it appear multiple random hosts are scanning simultaneously.",
    task: "Scan target 10.10.1.22 using 5 random decoy IP addresses using the -D parameter.",
    solution: "nmap -D RND:5 10.10.1.22",
    accepted: [
      /^nmap\s+-D\s+RND:5\s+10\.10\.1\.22$/,
      /^nmap\s+-D\s+RND:10\s+10\.10\.1\.22$/,
      /^nmap\s+-D\s+10\.10\.1\.5,10\.10\.1\.6,ME\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nmap -D RND:5 10.10.1.22' to generate 5 random decoys.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-D"), msg: "Use '-D' (capital D) for Decoy scanning." },
      { check: (cmd) => !cmd.includes("RND"), msg: "Use 'RND:5' to specify 5 random decoy IP addresses." }
    ],
    tutorNotes: "Teaching Talking Point: Show students how decoy scans confuse IDS log analysis: if 5 random decoys are generated, the target's firewall log records 6 different IPs scanning the same port.",
    highlightText: "Nmap scan report for 10.10.1.22",
    analysisQuestion: {
      prompt: "What is the primary operational objective of conducting an Nmap scan using Decoy IP addresses (-D)?",
      options: [
        { text: "Concealing the attacker's true IP address among multiple spoofed source addresses in IDS alerts", correct: true },
        { text: "Increasing scanning bandwidth and speed", correct: false },
        { text: "Cracking password hashes automatically", correct: false },
        { text: "Disabling the target host's network card", correct: false }
      ],
      explanation: "Decoy scans send spoofed packets alongside the attacker's true packet. The IDS sees alerts from all IPs, making forensic attribution nearly impossible without deep hop inspection."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:48 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00054s latency).
PORT     STATE SERVICE
80/tcp   open  http
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
445/tcp  open  microsoft-ds

Nmap done: 1 IP address (1 host up) scanned in 2.80 seconds`,
    cehExamTip: "Exam Alert: With decoy scanning, your REAL IP address is mixed among the decoys. If you specify 'ME' (e.g. '-D 1.1.1.1,ME,2.2.2.2'), Nmap places your real IP at that exact slot in the list."
  },
  {
    id: 15,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Firewall Evasion: Source Port Spoofing (-g)",
    difficulty: "Advanced",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Many poorly configured firewalls allow inbound traffic if it originates from well-known ports like HTTP (80) or DNS (53), assuming it is return traffic.",
    task: "Scan target 10.10.1.22 while spoofing your source port to HTTP port 80.",
    solution: "nmap -g 80 10.10.1.22",
    accepted: [
      /^nmap\s+-g\s+80\s+10\.10\.1\.22$/,
      /^nmap\s+--source-port\s+80\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nmap -g 80 10.10.1.22' (or '--source-port 80').",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-g") && !cmd.includes("--source-port"), msg: "Use '-g 80' or '--source-port 80' to spoof the originating port." },
      { check: (cmd) => !cmd.includes("80"), msg: "Set the source port to 80." }
    ],
    tutorNotes: "Teaching Talking Point: Show students why source port 80 or 53 works: network admins often write firewall ACL rules like 'permit tcp any eq 80 any' believing it only allows web traffic.",
    highlightText: "3389/tcp open  ms-wbt-server",
    analysisQuestion: {
      prompt: "Why does manipulating the scanner's source port (-g 80) bypass certain firewall rules?",
      options: [
        { text: "Misconfigured firewall rules may unconditionally allow inbound packets with source port 80 assuming they are web server responses", correct: true },
        { text: "Port 80 is hardware-encrypted by Intel processors", correct: false },
        { text: "It prevents target operating systems from logging connections", correct: false },
        { text: "It automatically grants root privileges on the remote host", correct: false }
      ],
      explanation: "Stateless or poorly configured firewalls often trust well-known source ports (80 HTTP, 53 DNS) assuming they originate from established external servers."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:50 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00045s latency).
PORT     STATE SERVICE
80/tcp   open  http
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server

Nmap done: 1 IP address (1 host up) scanned in 1.95 seconds`,
    cehExamTip: "Exam Alert: '-g' and '--source-port' are identical. Common source ports used for firewall evasion are 53 (DNS) and 88 (Kerberos)."
  },
  {
    id: 16,
    module: 3,
    moduleTitle: "Module 03: Scanning Networks",
    title: "Aggressive All-in-One Scan (-A)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "When authorized to perform a comprehensive audit where stealth is not required, Nmap provides an aggressive scan that bundles multiple discovery engines into one command.",
    task: "Execute an aggressive scan (-A) on target 10.10.1.22.",
    solution: "nmap -A 10.10.1.22",
    accepted: [
      /^nmap\s+-A\s+10\.10\.1\.22$/,
      /^sudo\s+nmap\s+-A\s+10\.10\.1\.22$/
    ],
    hint: "Type 'nmap -A 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-A"), msg: "Use the '-A' flag for aggressive scan." },
      { check: (cmd) => cmd.includes("-a"), msg: "Nmap flags are case-sensitive. Use capital '-A'." }
    ],
    tutorNotes: "Teaching Talking Point: Remind students of the 4 components in -A: -O (OS), -sV (Version), -sC (Default NSE), --traceroute. Highlight the SMB security mode showing message signing required.",
    highlightText: "Message signing enabled and required",
    analysisQuestion: {
      prompt: "In the aggressive scan results, what security control is reported under 'smb2-security-mode' that protects against SMB relay attacks?",
      options: [
        { text: "Message signing enabled and required", correct: true },
        { text: "Telnet cleartext fallback", correct: false },
        { text: "Anonymous guest write permissions", correct: false },
        { text: "Null session binding enabled", correct: false }
      ],
      explanation: "SMB Message Signing cryptographically signs packets. When 'required', SMB relay attacks (e.g. ntlmrelayx) will fail against this target."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 22:52 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00048s latency).
PORT     STATE SERVICE       VERSION
80/tcp   open  http          Microsoft IIS httpd 10.0
|_http-title: Corporate Portal
135/tcp  open  msrpc         Microsoft Windows RPC
445/tcp  open  microsoft-ds  Windows Server 2022 Standard 20348 microsoft-ds
3389/tcp open  ms-wbt-server Microsoft Terminal Services
| ssl-cert: Subject: commonName=WIN-SERVER2022
| Not valid before: 2026-09-01T10:00:00
|_Not valid after:  2027-03-01T10:00:00
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: 0s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

TRACEROUTE
HOP RTT     ADDRESS
1   0.48 ms 10.10.1.22

Nmap done: 1 IP address (1 host up) scanned in 12.35 seconds`,
    cehExamTip: "Exam Alert: The '-A' flag enables four things simultaneously: 1. OS Detection (-O), 2. Version Scanning (-sV), 3. Default Script Scanning (-sC), and 4. Traceroute (--traceroute)."
  },

  // ==========================================
// ==========================================
  // MODULE 4: ENUMERATION (CEH v13 Lab 04)
  // ==========================================
  {
    id: 17,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NetBIOS Remote Machine Name Table (nbtstat -a)",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.11 (Windows 11)",
    prompt: "C:\\Users\\Administrator>",
    scenario: "As described in CEH Lab 1 (Task 1), NetBIOS enumeration allows penetration testers to extract computer names, domain workgroups, and service record types from remote Windows hosts over TCP/IP.",
    task: "Run the nbtstat command with the -a parameter to resolve and display the NetBIOS name table of remote Windows 11 target 10.10.1.11.",
    solution: "nbtstat -a 10.10.1.11",
    accepted: [
      /^nbtstat\s+-a\s+10\.10\.1\.11$/,
      /^nbtstat\s+-A\s+10\.10\.1\.11$/
    ],
    hint: "Use 'nbtstat -a 10.10.1.11' to view the NetBIOS name table for the remote computer.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nbtstat"), msg: "Use the Windows 'nbtstat' utility." },
      { check: (cmd) => !cmd.includes("-a") && !cmd.includes("-A"), msg: "Include the '-a' switch to query the remote NetBIOS table." },
      { check: (cmd) => !cmd.includes("10.10.1.11"), msg: "Target the Windows 11 machine at 10.10.1.11." }
    ],
    tutorNotes: "Teaching Point: Explain NetBIOS suffix types. <00> denotes Workstation or Domain name, <20> denotes File Server (Server service enabled), and <1E> is Browser Service election.",
    highlightText: "WINDOWS11      <20>  UNIQUE      Registered",
    analysisQuestion: {
      prompt: "What does the '<20>' service suffix in the NetBIOS name table output indicate?",
      options: [
        { text: "The Server Service (File and Printer Sharing) is active and running on the target", correct: true },
        { text: "The machine is a Domain Controller", correct: false },
        { text: "The system is running an unauthenticated FTP daemon", correct: false },
        { text: "Port 20 is being used for active FTP data transfers", correct: false }
      ],
      explanation: "In NetBIOS naming conventions, <20> represents the Server service, indicating that Windows file sharing (SMB) is actively enabled and can be enumerated."
    },
    output: `NetBIOS Remote Machine Name Table

       Name               Type         Status
    ---------------------------------------------
    WINDOWS11      <00>  UNIQUE      Registered
    CORP           <00>  GROUP       Registered
    WINDOWS11      <20>  UNIQUE      Registered
    CORP           <1E>  GROUP       Registered
    CORP           <1D>  UNIQUE      Registered
    ..__MSBROWSE__.<01>  GROUP       Registered

    MAC Address = 00-0C-29-84-3A-1B`,
    cehExamTip: "Exam Alert: NetBIOS suffix codes to memorize: <00> Workstation Service, <03> Messenger Service, <20> Server Service, <1B> Domain Master Browser."
  },
  {
    id: 18,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NetBIOS Remote Name Cache (nbtstat -c)",
    difficulty: "Beginner",
    points: 100,
    target: "Local NetBIOS Cache",
    prompt: "C:\\Users\\Administrator>",
    scenario: "To inspect recently resolved NetBIOS names without generating noisy network broadcasts, ethical hackers check the local NetBIOS cache.",
    task: "Execute the nbtstat command with the -c parameter to list the contents of the NetBIOS name cache and resolved IP addresses.",
    solution: "nbtstat -c",
    accepted: [
      /^nbtstat\s+-c$/
    ],
    hint: "Execute 'nbtstat -c' to dump the cached NetBIOS names.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nbtstat"), msg: "Use 'nbtstat' command." },
      { check: (cmd) => !cmd.includes("-c"), msg: "Use the '-c' switch for cache listing." }
    ],
    tutorNotes: "Teaching Point: NetBIOS cache stores name-to-IP resolutions temporarily. Show students how recently contacted hosts stay in cache for fast lookup.",
    highlightText: "10.10.1.11",
    analysisQuestion: {
      prompt: "What information does the 'nbtstat -c' command extract from the local system?",
      options: [
        { text: "The NetBIOS name cache containing remote machine names and their resolved IP addresses", correct: true },
        { text: "The ARP table of physical MAC addresses", correct: false },
        { text: "The active TCP listening sockets", correct: false },
        { text: "The DNS server root hints", correct: false }
      ],
      explanation: "The -c switch lists the contents of the NetBIOS name cache, showing the table of NetBIOS names and their resolved IP addresses."
    },
    output: `Ethernet0:
Node IpAddress: [10.10.1.19] Scope Id: []

                  NetBIOS Remote Cache Name Table

        Name              Type       Host Address    Life [sec]
    ------------------------------------------------------------
    WINDOWS11      <20>  UNIQUE          10.10.1.11         540
    CORP           <00>  GROUP           10.10.1.11         540
    DC-WIN2022     <00>  UNIQUE          10.10.1.22         580`,
    cehExamTip: "Exam Alert: 'nbtstat -c' displays the NetBIOS name cache. 'nbtstat -R' purges and reloads the cache from the LMHOSTS file."
  },
  {
    id: 19,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NetBIOS Shared Drive Mapping (net use)",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.19 (Windows Server 2019)",
    prompt: "C:\\Users\\Administrator>",
    scenario: "As covered in CEH Lab 1 (Step 60), the 'net use' command connects a computer to, or disconnects from, shared resources and displays active remote network connections.",
    task: "Run the 'net use' command to display all currently mapped shares, local drive letters, and remote network connection states.",
    solution: "net use",
    accepted: [
      /^net\s+use$/
    ],
    hint: "Type 'net use' and press Enter to list mapped drives and active shares.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("net"), msg: "Use the Windows 'net' utility." },
      { check: (cmd) => !cmd.includes("use"), msg: "Use the 'use' subcommand." }
    ],
    tutorNotes: "Teaching Point: Net use is a vital post-enumeration tool. Attackers establish null sessions via 'net use \\target\ipc$ \"\" /u:\"\"' to dump SAM accounts without valid credentials.",
    highlightText: "\\10.10.1.19\CEHv13",
    analysisQuestion: {
      prompt: "Based on the 'net use' output, what shared network folder is actively mapped to local drive Z:?",
      options: [
        { text: "\\10.10.1.19\CEHv13", correct: true },
        { text: "\\10.10.1.22\SYSVOL", correct: false },
        { text: "\\10.10.1.11\ADMIN$", correct: false },
        { text: "\\10.10.1.5\IPC$", correct: false }
      ],
      explanation: "The net use output shows local drive Z: connected to remote network share \\10.10.1.19\CEHv13 over the Microsoft Windows Network."
    },
    output: `Status       Local     Remote                    Network
-------------------------------------------------------------------------------
OK           Z:        \\10.10.1.19\CEHv13       Microsoft Windows Network
The command completed successfully.`,
    cehExamTip: "Exam Alert: Net use connects to SMB/CIFS shares over TCP port 445 (or NetBIOS port 139). Connecting to IPC$ creates an Inter-Process Communication pipe."
  },
  {
    id: 20,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SNMPv1 Community String MIB Walk",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 2 (Task 1), penetration testers use SnmpWalk to query the SNMP agent running on target 10.10.1.22. SNMPv1 transmits community strings in cleartext and provides detailed device telemetry.",
    task: "Execute snmpwalk using SNMP version 1 (-v1) and community string 'public' (-c public) against target 10.10.1.22.",
    solution: "snmpwalk -v1 -c public 10.10.1.22",
    accepted: [
      /^snmpwalk\s+-v\s*1\s+-c\s+public\s+10\.10\.1\.22$/,
      /^snmpwalk\s+-v1\s+-c\s+public\s+10\.10\.1\.22$/
    ],
    hint: "Use 'snmpwalk -v1 -c public 10.10.1.22' to perform an SNMPv1 MIB walk.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("snmpwalk"), msg: "Use the 'snmpwalk' command-line utility." },
      { check: (cmd) => !cmd.includes("-v1") && !cmd.includes("-v 1"), msg: "Specify SNMP version 1 using '-v1'." },
      { check: (cmd) => !cmd.includes("-c public"), msg: "Set community string to 'public' with '-c public'." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Target IP must be 10.10.1.22." }
    ],
    tutorNotes: "Teaching Point: Emphasize Question 4.2.1.1 from the manual: '-c' sets the community string. Show how sysDescr reveals the Windows kernel build version (Build 20348).",
    highlightText: "DC-WIN2022.CEH.COM",
    analysisQuestion: {
      prompt: "According to the CEH Lab Manual, which command-line option in SnmpWalk sets the community string?",
      options: [
        { text: "-c (e.g. -c public)", correct: true },
        { text: "-v (specifies version)", correct: false },
        { text: "-p (specifies port)", correct: false },
        { text: "-s (specifies socket)", correct: false }
      ],
      explanation: "In SnmpWalk, -c sets the community string (acting like a cleartext password), while -v specifies the SNMP version number (1, 2c, or 3)."
    },
    output: `SNMPv2-MIB::sysDescr.0 = STRING: Hardware: Intel64 Family 6 Model 85 Stepping 7 - Software: Windows Version 10.0 (Build 20348 Multiprocessor Free)
SNMPv2-MIB::sysObjectID.0 = OID: SNMPv2-SMI::enterprises.311.1.1.3.1.2
DISMAN-EVENT-MIB::sysUpTimeInstance = Timeticks: (2841920) 7:53:39.20
SNMPv2-MIB::sysContact.0 = STRING: admin@certifiedhacker.com
SNMPv2-MIB::sysName.0 = STRING: DC-WIN2022.CEH.COM
SNMPv2-MIB::sysLocation.0 = STRING: Primary Data Center Rack 4
IP-MIB::ipAdEntAddr.10.10.1.22 = IpAddress: 10.10.1.22
IP-MIB::ipAdEntNetMask.10.10.1.22 = IpAddress: 255.255.255.0`,
    cehExamTip: "Exam Alert: SNMP operates on UDP port 161 (queries) and UDP port 162 (SNMP Traps). Default community strings: 'public' (read-only) and 'private' (read-write)."
  },
  {
    id: 21,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SNMPv2c Advanced MIB Walking",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "As demonstrated in Step 84 of CEH Lab 2, SNMPv2c adds support for 64-bit counters and bulk data transfers, allowing testers to extract running processes, installed software, and storage devices.",
    task: "Perform an SNMPv2c enumeration scan against 10.10.1.22 using community string 'public'.",
    solution: "snmpwalk -v2c -c public 10.10.1.22",
    accepted: [
      /^snmpwalk\s+-v\s*2c\s+-c\s+public\s+10\.10\.1\.22$/,
      /^snmpwalk\s+-v2c\s+-c\s+public\s+10\.10\.1\.22$/
    ],
    hint: "Execute 'snmpwalk -v2c -c public 10.10.1.22' to enumerate SNMPv2c OIDs.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("-v2c") && !cmd.includes("-v 2c"), msg: "Specify SNMP version 2c using '-v2c' or '-v 2c'." },
      { check: (cmd) => !cmd.includes("-c public"), msg: "Set the community string to 'public'." }
    ],
    tutorNotes: "Teaching Point: Point out OID 1.3.6.1.2.1.25.4.2.1.2 (hrSWRunName) in the output. Attackers use this to identify running antivirus, EDR agents, or vulnerable services.",
    highlightText: "hrSWRunName",
    analysisQuestion: {
      prompt: "What critical system information does SNMP MIB walking reveal to an attacker?",
      options: [
        { text: "Running processes, storage drive labels, network routing tables, and user accounts", correct: true },
        { text: "Encrypted Kerberos TGT tickets", correct: false },
        { text: "BGP route maps from autonomous systems", correct: false },
        { text: "SSL private keys stored in the Windows cert store", correct: false }
      ],
      explanation: "SNMP MIB trees contain comprehensive host resources, including running software (hrSWRun), storage volumes (hrStorage), network interfaces (ifDescr), and system variables."
    },
    output: `HOST-RESOURCES-MIB::hrSystemUptime.0 = Timeticks: (2842100) 7:53:41.00
HOST-RESOURCES-MIB::hrStorageDescr.1 = STRING: C:\\ Label:System  Serial Number 4A8F21
HOST-RESOURCES-MIB::hrStorageSize.1 = INTEGER: 15728639
HOST-RESOURCES-MIB::hrStorageUsed.1 = INTEGER: 7842190
HOST-RESOURCES-MIB::hrSWRunName.1 = STRING: "System Idle Process"
HOST-RESOURCES-MIB::hrSWRunName.4 = STRING: "System"
HOST-RESOURCES-MIB::hrSWRunName.512 = STRING: "lsass.exe"
HOST-RESOURCES-MIB::hrSWRunName.820 = STRING: "services.exe"
HOST-RESOURCES-MIB::hrSWRunName.1240 = STRING: "spoolsv.exe"`,
    cehExamTip: "Exam Alert: SNMPv1 and SNMPv2c send community strings in unencrypted plaintext. Only SNMPv3 provides confidentiality (encryption) and message integrity."
  },
  {
    id: 22,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "LDAP RootDSE Directory Enumeration",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Port 389)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 3, Active Directory Explorer connects to Active Directory via LDAP on port 389. From the Linux command line, Nmap's 'ldap-rootdse' script enumerates the naming contexts and Domain Controller FQDN.",
    task: "Use Nmap on port 389 with the 'ldap-rootdse' script to enumerate the Active Directory domain naming contexts on target 10.10.1.22.",
    solution: "nmap -p 389 --script ldap-rootdse 10.10.1.22",
    accepted: [
      /^nmap\s+-p\s*389\s+--script\s+ldap-rootdse\s+10\.10\.1\.22$/,
      /^nmap\s+--script\s+ldap-rootdse\s+-p\s*389\s+10\.10\.1\.22$/
    ],
    hint: "Run 'nmap -p 389 --script ldap-rootdse 10.10.1.22' to discover Active Directory domain naming contexts.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("389"), msg: "Specify LDAP port 389 using '-p 389'." },
      { check: (cmd) => !cmd.includes("ldap-rootdse"), msg: "Specify the '--script ldap-rootdse' NSE script." }
    ],
    tutorNotes: "Teaching Point: In CEH Lab 3 Question 4.3.1.1, students identify the Domain Controller machine IP. RootDSE reveals defaultNamingContext: DC=CEH,DC=com and dnsHostName: DC-WIN2022.CEH.com.",
    highlightText: "defaultNamingContext: DC=CEH,DC=com",
    analysisQuestion: {
      prompt: "What is the primary LDAP base distinguished name (naming context) discovered on the target Domain Controller?",
      options: [
        { text: "DC=CEH,DC=com", correct: true },
        { text: "CN=Users,DC=Windows,DC=local", correct: false },
        { text: "OU=Domain Controllers,DC=org", correct: false },
        { text: "DC=corp,DC=internal", correct: false }
      ],
      explanation: "The LDAP rootDSE response specifies 'defaultNamingContext: DC=CEH,DC=com', defining the root partition of the target Active Directory domain."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-19 14:10 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00041s latency).

PORT    STATE SERVICE
389/tcp open  ldap
| ldap-rootdse: 
|   currentTime: 20261019141012.0Z
|   subschemaSubentry: CN=Aggregate,CN=Schema,CN=Configuration,DC=CEH,DC=com
|   dsServiceName: CN=NTDS Settings,CN=DC-WIN2022,CN=Servers,CN=Default-First-Site-Name,CN=Sites,CN=Configuration,DC=CEH,DC=com
|   namingContexts: DC=CEH,DC=com
|   namingContexts: CN=Configuration,DC=CEH,DC=com
|   namingContexts: CN=Schema,CN=Configuration,DC=CEH,DC=com
|   defaultNamingContext: DC=CEH,DC=com
|   dnsHostName: DC-WIN2022.CEH.com
|_  serverName: CN=DC-WIN2022,CN=Servers,CN=Default-First-Site-Name,CN=Sites,CN=Configuration,DC=CEH,DC=com

Nmap done: 1 IP address (1 host up) scanned in 0.28 seconds`,
    cehExamTip: "Exam Alert: LDAP operates on TCP/UDP port 389. LDAPS (LDAP over SSL) uses TCP port 636. Global Catalog queries use port 3268 (LDAP) and 3269 (LDAPS)."
  },
  {
    id: 23,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NFS Service & Port 2049 Discovery",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.19 (Windows Server 2019)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 4 (Task 1, Step 140), after enabling the Network File System (NFS) role on Windows Server 2019, the ethical hacker scans port 2049 to verify that the NFS daemon is actively listening.",
    task: "Scan port 2049 on target 10.10.1.19 using Nmap to verify that the NFS service is open.",
    solution: "nmap -p 2049 10.10.1.19",
    accepted: [
      /^nmap\s+-p\s*2049\s+10\.10\.1\.19$/,
      /^nmap\s+10\.10\.1\.19\s+-p\s*2049$/
    ],
    hint: "Run 'nmap -p 2049 10.10.1.19' to test the NFS port.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("2049"), msg: "Specify NFS port 2049 with '-p 2049'." },
      { check: (cmd) => !cmd.includes("10.10.1.19"), msg: "Target the Windows Server 2019 machine at 10.10.1.19." }
    ],
    tutorNotes: "Teaching Point: Address Question 4.4.1.1 from the lab manual: 'Find the port used by the NFS service on 10.10.1.19' -> Answer: 2049.",
    highlightText: "2049/tcp open  nfs",
    analysisQuestion: {
      prompt: "According to CEH Question 4.4.1.1, what port is standardly used by the Network File System (NFS) service?",
      options: [
        { text: "Port 2049", correct: true },
        { text: "Port 111", correct: false },
        { text: "Port 445", correct: false },
        { text: "Port 139", correct: false }
      ],
      explanation: "Port 2049 is the standardized TCP/UDP port for Network File System (NFS) communication."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-19 14:12 UTC
Nmap scan report for 10.10.1.19
Host is up (0.00045s latency).

PORT     STATE SERVICE
2049/tcp open  nfs
MAC Address: 00:0C:29:91:EE:54 (VMware)

Nmap done: 1 IP address (1 host up) scanned in 0.18 seconds`,
    cehExamTip: "Exam Alert: Port 2049 = NFS (Network File System). Port 111 = rpcbind / portmapper, used by clients to locate RPC-based services like NFS mountd."
  },
  {
    id: 24,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NFS Mountpoint Enumeration (RPCScan)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.19 (RPC Portmapper 111)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 4 (Step 154), RPCScan is used to query the RPC portmapper on target 10.10.1.19 to discover exported NFS directories and access permissions.",
    task: "Execute the RPCScan Python tool with the '--rpc' argument against target 10.10.1.19 to enumerate exported NFS shares and mountpoints.",
    solution: "python3 rpc-scan.py 10.10.1.19 --rpc",
    accepted: [
      /^python3?\s+rpc-scan\.py\s+10\.10\.1\.19\s+--rpc$/,
      /^python3?\s+rpc-scan\.py\s+--rpc\s+10\.10\.1\.19$/
    ],
    hint: "Run 'python3 rpc-scan.py 10.10.1.19 --rpc' to enumerate NFS mountpoints.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("rpc-scan.py"), msg: "Execute the 'rpc-scan.py' script." },
      { check: (cmd) => !cmd.includes("--rpc"), msg: "Include the '--rpc' switch to list RPC portmapper services." }
    ],
    tutorNotes: "Teaching Point: Explain how attackers exploit NFS shares exported to '(everyone)'. If no_root_squash is enabled, an attacker mounting the share gets full root privileges.",
    highlightText: "/exports/engineering  (everyone: read-write)",
    analysisQuestion: {
      prompt: "What serious misconfiguration did RPCScan uncover on the exported NFS share '/exports/engineering'?",
      options: [
        { text: "It is exported to 'everyone' with read-write permissions without authentication", correct: true },
        { text: "It enforces Kerberos AES-256 ticket verification", correct: false },
        { text: "It is restricted strictly to localhost 127.0.0.1", correct: false },
        { text: "It blocks remote root users via root_squash", correct: false }
      ],
      explanation: "Exporting NFS shares to 'everyone' allows any network host to mount the filesystem and read or modify sensitive files without valid credentials."
    },
    output: `[+] Scanning RPC services on 10.10.1.19 ...
[+] Portmapper (111/tcp) responding.
[+] Program: 100003 (nfs) Version: 3,4 Port: 2049/tcp
[+] Program: 100005 (mountd) Version: 1,3 Port: 20048/tcp
[+] Exported NFS Shares:
    /exports/engineering  (everyone: read-write)
    /exports/backups      (10.10.1.0/24: read-only)
[+] RPC scan completed successfully.`,
    cehExamTip: "Exam Alert: On Linux, 'showmount -e <target_ip>' queries the mountd RPC service to display exported NFS filesystems."
  },
  {
    id: 25,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "DNS Name Server Enumeration (dig ns)",
    difficulty: "Beginner",
    points: 100,
    target: "www.certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 5 (Step 177), penetration testers use the 'dig' command on Linux to enumerate the authoritative DNS name servers responsible for the target domain www.certifiedhacker.com.",
    task: "Use dig with the 'ns' query type to discover all authoritative DNS name servers for domain www.certifiedhacker.com.",
    solution: "dig ns www.certifiedhacker.com",
    accepted: [
      /^dig\s+ns\s+www\.certifiedhacker\.com$/,
      /^dig\s+www\.certifiedhacker\.com\s+ns$/
    ],
    hint: "Execute 'dig ns www.certifiedhacker.com' to list the authoritative name servers.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("dig"), msg: "Use the 'dig' utility on Linux." },
      { check: (cmd) => !cmd.includes("ns"), msg: "Specify the 'ns' query type for Name Server records." },
      { check: (cmd) => !cmd.includes("www.certifiedhacker.com"), msg: "Target domain is 'www.certifiedhacker.com'." }
    ],
    tutorNotes: "Teaching Point: Review DNS record types: A (IPv4), AAAA (IPv6), MX (Mail Exchanger), NS (Name Server), SOA (Start of Authority), TXT (SPF/DKIM verification).",
    highlightText: "ns1.bluehost.com",
    analysisQuestion: {
      prompt: "What primary authoritative DNS name server was discovered for the domain www.certifiedhacker.com?",
      options: [
        { text: "ns1.bluehost.com", correct: true },
        { text: "dns.google.com", correct: false },
        { text: "ns.cloudflare.com", correct: false },
        { text: "root-server.net", correct: false }
      ],
      explanation: "The ANSWER SECTION of the dig ns response returns 'www.certifiedhacker.com. IN NS ns1.bluehost.com' and 'ns2.bluehost.com'."
    },
    output: `; <<>> DiG 9.18.1-1-Debian <<>> ns www.certifiedhacker.com
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48192
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; ANSWER SECTION:
www.certifiedhacker.com. 86400 IN NS ns1.bluehost.com.
www.certifiedhacker.com. 86400 IN NS ns2.bluehost.com.

;; Query time: 14 msec
;; SERVER: 10.10.1.1#53(10.10.1.1)
;; WHEN: Mon Oct 19 14:15:20 UTC 2026`,
    cehExamTip: "Exam Alert: 'dig' stands for Domain Information Groper. It queries DNS directly and provides detailed diagnostic sections (QUESTION, ANSWER, AUTHORITY, ADDITIONAL)."
  },
  {
    id: 26,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "DNS Zone Transfer Attempt (dig axfr)",
    difficulty: "Intermediate",
    points: 100,
    target: "ns1.bluehost.com (certifiedhacker.com)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 5 (Step 181), an attacker attempts an AXFR zone transfer against authoritative server ns1.bluehost.com to copy the entire zone database.",
    task: "Use dig with the 'axfr' query type targeting name server '@ns1.bluehost.com' for domain www.certifiedhacker.com.",
    solution: "dig @ns1.bluehost.com www.certifiedhacker.com axfr",
    accepted: [
      /^dig\s+@ns1\.bluehost\.com\s+www\.certifiedhacker\.com\s+axfr$/,
      /^dig\s+axfr\s+@ns1\.bluehost\.com\s+www\.certifiedhacker\.com$/
    ],
    hint: "Run 'dig @ns1.bluehost.com www.certifiedhacker.com axfr' to test for zone transfer permissions.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("@ns1.bluehost.com"), msg: "Specify the target name server with '@ns1.bluehost.com'." },
      { check: (cmd) => !cmd.includes("axfr"), msg: "Use 'axfr' to request a full zone transfer." }
    ],
    tutorNotes: "Teaching Point: Reference Question 4.5.1.1: 'Can you perform zone transfer on the primary host of certifiedhacker.com? -> Answer: No (Transfer failed)'. Emphasize that zone transfers operate over TCP port 53.",
    highlightText: "Transfer failed.",
    analysisQuestion: {
      prompt: "Based on Question 4.5.1.1 and the dig output, was the DNS zone transfer permitted by ns1.bluehost.com?",
      options: [
        { text: "No, the transfer failed because the DNS server refused unauthenticated AXFR requests", correct: true },
        { text: "Yes, all zone records were downloaded successfully", correct: false },
        { text: "The name server timed out on port 53 UDP", correct: false },
        { text: "The zone transfer succeeded over DNS over HTTPS (DoH)", correct: false }
      ],
      explanation: "The response explicitly states 'Transfer failed.', proving that the primary name server correctly restricts AXFR zone transfers to authorized secondary servers."
    },
    output: `; <<>> DiG 9.18.1-1-Debian <<>> @ns1.bluehost.com www.certifiedhacker.com axfr
; (1 server found)
;; global options: +cmd
; Transfer failed.
;; Query time: 38 msec
;; SERVER: 162.241.216.11#53(ns1.bluehost.com)
;; WHEN: Mon Oct 19 14:16:02 UTC 2026`,
    cehExamTip: "Exam Alert: Standard DNS lookups use UDP port 53. DNS Zone Transfers (AXFR/IXFR) use TCP port 53 because reliable data transmission is required."
  },
  {
    id: 27,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "DNS SOA Administrative Record Query",
    difficulty: "Beginner",
    points: 100,
    target: "certifiedhacker.com",
    prompt: "C:\\Users\\Administrator>",
    scenario: "In CEH Lab 5 (Step 189), penetration testers execute nslookup to query the Start of Authority (SOA) record for certifiedhacker.com to find the responsible administrator email address.",
    task: "Execute nslookup with query type SOA (-type=soa) for certifiedhacker.com.",
    solution: "nslookup -type=soa certifiedhacker.com",
    accepted: [
      /^nslookup\s+-type=soa\s+certifiedhacker\.com$/,
      /^nslookup\s+-querytype=soa\s+certifiedhacker\.com$/
    ],
    hint: "Execute 'nslookup -type=soa certifiedhacker.com' to view the SOA record.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nslookup"), msg: "Use the 'nslookup' command." },
      { check: (cmd) => !cmd.includes("soa"), msg: "Specify '-type=soa' to query Start of Authority." }
    ],
    tutorNotes: "Teaching Point: Address Question 4.5.1.2 from the manual: 'Find the responsible mail address for domain certifiedhacker.com' -> Answer: root.box5311.bluehost.com (representing root@box5311.bluehost.com).",
    highlightText: "responsible mail addr = root.box5311.bluehost.com",
    analysisQuestion: {
      prompt: "According to Question 4.5.1.2, what is the 'responsible mail address' recorded in the SOA record of certifiedhacker.com?",
      options: [
        { text: "root.box5311.bluehost.com (root@box5311.bluehost.com)", correct: true },
        { text: "admin@certifiedhacker.com", correct: false },
        { text: "postmaster@cloudflare.com", correct: false },
        { text: "hostmaster@iana.org", correct: false }
      ],
      explanation: "In DNS SOA records, email addresses replace '@' with the first dot ('.'). The responsible mail address is root.box5311.bluehost.com."
    },
    output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
certifiedhacker.com
        primary name server = ns1.bluehost.com
        responsible mail addr = root.box5311.bluehost.com
        serial  = 2023051801
        refresh = 86400
        retry   = 7200
        expire  = 3600000
        default TTL = 86400`,
    cehExamTip: "Exam Alert: The SOA record contains: Primary Name Server, Responsible Person Email, Serial Number, Refresh Interval, Retry Interval, Expire Limit, and Minimum TTL."
  },
  {
    id: 28,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SMTP User Enumeration (smtp-enum-users)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.19 (SMTP Port 25)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 6 (Task 1, Step 214), penetration testers use Nmap's 'smtp-enum-users' script to query SMTP port 25 and harvest valid mail usernames via VRFY, EXPN, and RCPT TO verbs.",
    task: "Use Nmap on port 25 with '--script=smtp-enum-users' to enumerate valid mail users on target 10.10.1.19.",
    solution: "nmap -p 25 --script=smtp-enum-users 10.10.1.19",
    accepted: [
      /^nmap\s+-p\s*25\s+--script=smtp-enum-users\s+10\.10\.1\.19$/,
      /^nmap\s+-p\s*25\s+--script\s+smtp-enum-users(\.nse)?\s+10\.10\.1\.19$/,
      /^nmap\s+--script=smtp-enum-users\s+-p\s*25\s+10\.10\.1\.19$/
    ],
    hint: "Run 'nmap -p 25 --script=smtp-enum-users 10.10.1.19' to harvest email user accounts.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("25"), msg: "Specify SMTP port 25 using '-p 25'." },
      { check: (cmd) => !cmd.includes("smtp-enum-users"), msg: "Include '--script=smtp-enum-users'." }
    ],
    tutorNotes: "Teaching Point: Address Question 4.6.1.1: 'Enter the number of users enumerated on target machine' -> 4 users (administrator, postmaster, support, backup).",
    highlightText: "Accounts found: administrator, postmaster, support, backup",
    analysisQuestion: {
      prompt: "According to Question 4.6.1.1 in the CEH Lab Manual, how many valid email user accounts were enumerated by Nmap on the target SMTP server?",
      options: [
        { text: "4 users (administrator, postmaster, support, backup)", correct: true },
        { text: "0 users (all rejected by anti-spam filter)", correct: false },
        { text: "12 users (Active Directory sync)", correct: false },
        { text: "1 user (only root)", correct: false }
      ],
      explanation: "The smtp-enum-users script successfully identified 4 valid recipient accounts on the target server: administrator, postmaster, support, and backup."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-19 14:18 UTC
Nmap scan report for 10.10.1.19
Host is up (0.00036s latency).

PORT   STATE SERVICE
25/tcp open  smtp
|_smtp-enum-users: 
|   Method RCPT returned 4 valid accounts:
|     administrator
|     postmaster
|     support
|     backup
|_  Total: 4 valid accounts found.

Nmap done: 1 IP address (1 host up) scanned in 0.45 seconds`,
    cehExamTip: "Exam Alert: SMTP commands used for user enumeration: VRFY (verifies user existence), EXPN (expands alias/mailing list), and RCPT TO (identifies message recipient)."
  },
  {
    id: 29,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SMTP Open Mail Relay Testing",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.19 (SMTP Port 25)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 6 (Step 217), ethical hackers test whether the target SMTP server operates as an open relay, which would allow unauthorized attackers to distribute spoofed phishing emails.",
    task: "Run Nmap with the 'smtp-open-relay' script on port 25 of target 10.10.1.19.",
    solution: "nmap -p 25 --script=smtp-open-relay 10.10.1.19",
    accepted: [
      /^nmap\s+-p\s*25\s+--script=smtp-open-relay\s+10\.10\.1\.19$/,
      /^nmap\s+-p\s*25\s+--script\s+smtp-open-relay(\.nse)?\s+10\.10\.1\.19$/
    ],
    hint: "Execute 'nmap -p 25 --script=smtp-open-relay 10.10.1.19' to test for open relaying.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("smtp-open-relay"), msg: "Use '--script=smtp-open-relay'." },
      { check: (cmd) => !cmd.includes("10.10.1.19"), msg: "Target IP must be 10.10.1.19." }
    ],
    tutorNotes: "Teaching Point: Explain SMTP status code 503 (5.5.1 Error: authentication required). This indicates the server correctly denies relaying to unauthenticated hosts.",
    highlightText: "Server is not an open relay",
    analysisQuestion: {
      prompt: "What does the Nmap 'smtp-open-relay' scan result tell us about the security posture of the mail server?",
      options: [
        { text: "The server is secure against open relaying; it enforces authentication before accepting external forwarding", correct: true },
        { text: "The server allows any anonymous user to send outbound email", correct: false },
        { text: "Port 25 is blocked by a Layer 7 Web Application Firewall", correct: false },
        { text: "The mail queue has overflowed and dropped the connection", correct: false }
      ],
      explanation: "The output states 'Server is not an open relay (503 5.5.1 Error: authentication required)', confirming that unauthenticated email relaying is disabled."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-19 14:20 UTC
Nmap scan report for 10.10.1.19
Host is up (0.00038s latency).

PORT   STATE SERVICE
25/tcp open  smtp
|_smtp-open-relay: Server is not an open relay (503 5.5.1 Error: authentication required)

Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds`,
    cehExamTip: "Exam Alert: An open relay (third-party relay) occurs when an SMTP server forwards email without requiring sender authentication. RFC 5321 mandates disabling open relaying."
  },
  {
    id: 30,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SMTP Extension Commands Enumeration",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.19 (SMTP Port 25)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 6 (Step 221), penetration testers enumerate supported SMTP verbs (EHLO response) to discover server capabilities, supported auth protocols, and max message sizes.",
    task: "Execute Nmap with '--script=smtp-commands' on port 25 of 10.10.1.19 to list all supported SMTP extension verbs.",
    solution: "nmap -p 25 --script=smtp-commands 10.10.1.19",
    accepted: [
      /^nmap\s+-p\s*25\s+--script=smtp-commands\s+10\.10\.1\.19$/,
      /^nmap\s+-p\s*25\s+--script\s+smtp-commands(\.nse)?\s+10\.10\.1\.19$/
    ],
    hint: "Type 'nmap -p 25 --script=smtp-commands 10.10.1.19' to view the supported command verbs.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("smtp-commands"), msg: "Include '--script=smtp-commands'." }
    ],
    tutorNotes: "Teaching Point: Point out AUTH LOGIN PLAIN in the output. This tells the tester that brute forcing or password spraying can be performed using base64 encoded credentials.",
    highlightText: "AUTH LOGIN PLAIN",
    analysisQuestion: {
      prompt: "Which authentication mechanisms does the target SMTP server advertise in its EHLO response?",
      options: [
        { text: "AUTH LOGIN PLAIN", correct: true },
        { text: "GSSAPI Kerberos v5", correct: false },
        { text: "NTLMv2 only", correct: false },
        { text: "No authentication is supported", correct: false }
      ],
      explanation: "The smtp-commands output lists 'AUTH LOGIN PLAIN', indicating that both LOGIN and PLAIN standard SASL authentication mechanisms are enabled."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-19 14:22 UTC
Nmap scan report for 10.10.1.19
Host is up (0.00035s latency).

PORT   STATE SERVICE
25/tcp open  smtp
|_smtp-commands: mail.corp.local Hello [10.10.1.1], enhancedstatuscodes, PIPELINING, 8BITMIME, SIZE 20971520, VRFY, ETRN, AUTH LOGIN PLAIN, ENHANCEDSTATUSCODES

Nmap done: 1 IP address (1 host up) scanned in 0.35 seconds`,
    cehExamTip: "Exam Alert: In SMTP, HELO is the original greeting command (RFC 821). EHLO (Extended HELO) is used in ESMTP (RFC 5321) to request supported extension features."
  },
  {
    id: 31,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "Samba User Enumeration (enum4linux -U)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Windows/Samba)",
    prompt: "root@parrot:~#",
    scenario: "enum4linux is the premier Linux-based enumeration tool for extracting Windows and Samba accounts, password policies, and domain groups via IPC$ and NetBIOS.",
    task: "Use enum4linux with the -U flag to extract all user accounts from target 10.10.1.22.",
    solution: "enum4linux -U 10.10.1.22",
    accepted: [
      /^enum4linux\s+-U\s+10\.10\.1\.22$/,
      /^enum4linux\s+-u\s+10\.10\.1\.22$/
    ],
    hint: "Execute 'enum4linux -U 10.10.1.22' to enumerate user accounts.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("enum4linux"), msg: "Use 'enum4linux' utility." },
      { check: (cmd) => !cmd.includes("-U") && !cmd.includes("-u"), msg: "Include the '-U' switch for user enumeration." }
    ],
    tutorNotes: "Teaching Point: enum4linux wraps polenum, rpcclient, smbclient, and net commands into a single script. Explain RID cycling used by enum4linux to uncover hidden usernames.",
    highlightText: "user:[Administrator] rid:[0x1f4]",
    analysisQuestion: {
      prompt: "What standard RID (Relative Identifier) is assigned to the built-in Windows Administrator account in the enum4linux output?",
      options: [
        { text: "500 (hex 0x1f4)", correct: true },
        { text: "501 (hex 0x1f5 - Guest)", correct: false },
        { text: "1000 (standard user)", correct: false },
        { text: "0 (System)", correct: false }
      ],
      explanation: "Windows assigns fixed RIDs to built-in accounts: RID 500 (0x1f4) is always Administrator, and RID 501 (0x1f5) is Guest."
    },
    output: `Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ )
Target: 10.10.1.22
========================== 
|   Users on 10.10.1.22   |
========================== 
[+] Enumerating users using SID S-1-5-21-284918204-192840192-384910294
[+] Found user: 'Administrator' (RID: 500/0x1f4)
[+] Found user: 'Guest' (RID: 501/0x1f5)
[+] Found user: 'krbtgt' (RID: 502/0x1f6)
[+] Found user: 'backup_admin' (RID: 1104/0x450)
[+] Found user: 'jdoe' (RID: 1105/0x451)
enum4linux complete.`,
    cehExamTip: "Exam Alert: RID (Relative Identifier) is the last part of a Windows SID. Built-in Administrator = 500, Guest = 501. Custom domain users start at RID 1000 and increment sequentially."
  },
  {
    id: 32,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SMB Shares & Security Audit",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Port 445)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 7, ethical hackers audit SMB shares and operating system details. Nmap's 'smb-enum-shares' and 'smb-enum-users' scripts audit shared directories and access controls on port 445.",
    task: "Audit port 445 on target 10.10.1.22 using Nmap scripts 'smb-enum-shares,smb-enum-users'.",
    solution: "nmap -p 445 --script smb-enum-shares,smb-enum-users 10.10.1.22",
    accepted: [
      /^nmap\s+-p\s*445\s+--script\s+smb-enum-shares,smb-enum-users\s+10\.10\.1\.22$/,
      /^nmap\s+--script=smb-enum-shares,smb-enum-users\s+-p\s*445\s+10\.10\.1\.22$/,
      /^nmap\s+-p\s*445\s+--script\s+smb-enum-shares\s+10\.10\.1\.22$/
    ],
    hint: "Run 'nmap -p 445 --script smb-enum-shares,smb-enum-users 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("445"), msg: "Specify SMB port 445 with '-p 445'." },
      { check: (cmd) => !cmd.includes("smb-enum-shares"), msg: "Include 'smb-enum-shares' in the script argument." }
    ],
    tutorNotes: "Teaching Point: Address Question 4.7.1.1: 'Find the full name of the OS installed in machine 10.10.1.22' -> Windows Server 2022 Datacenter.",
    highlightText: "Windows Server 2022 Datacenter",
    analysisQuestion: {
      prompt: "According to Question 4.7.1.1 in the CEH Lab Manual, what is the exact operating system installed on the target machine at 10.10.1.22?",
      options: [
        { text: "Windows Server 2022 Datacenter", correct: true },
        { text: "Windows 11 Enterprise", correct: false },
        { text: "Ubuntu Linux 22.04 LTS", correct: false },
        { text: "Windows Server 2016 Standard", correct: false }
      ],
      explanation: "SMB enumeration returns the exact OS build: 'OS: Windows Server 2022 Datacenter (build 20348)'."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-19 14:25 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00039s latency).

PORT    STATE SERVICE
445/tcp open  microsoft-ds

Host script results:
| smb-os-discovery: 
|   OS: Windows Server 2022 Datacenter (build 20348)
|   Computer name: DC-WIN2022
|   NetBIOS computer name: DC-WIN2022\x00
|   Domain name: CEH.com
| smb-enum-shares: 
|   account_used: guest
|   \\10.10.1.22\ADMIN$: 
|     Type: Special
|     Anonymous access: <none>
|   \\10.10.1.22\C$: 
|     Type: Special
|     Anonymous access: <none>
|   \\10.10.1.22\SYSVOL: 
|     Type: Read
|     Anonymous access: READ
|   \\10.10.1.22\NETLOGON: 
|     Type: Read
|_    Anonymous access: READ`,
    cehExamTip: "Exam Alert: Port 445 runs SMB directly over TCP/IP without NetBIOS encapsulation. Default administrative shares include C$, ADMIN$, and IPC$."
  },
  {
    id: 33,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "AI-Assisted NetBIOS Enumeration (ShellGPT)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.11 (Parrot Terminal)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 8 (Task 1, Step 283), ethical hackers use ShellGPT (sgpt) to leverage AI models in generating and executing NetBIOS enumeration commands directly from natural language prompts.",
    task: "Execute the ShellGPT command with the --shell flag: sgpt --shell \"Perform NetBIOS enumeration on target IP 10.10.1.11\".",
    solution: "sgpt --shell \"Perform NetBIOS enumeration on target IP 10.10.1.11\"",
    accepted: [
      /^sgpt\s+--shell\s+["']Perform NetBIOS enumeration on target IP 10\.10\.1\.11["']$/,
      /^sgpt\s+--shell\s+.*NetBIOS.*10\.10\.1\.11.*$/
    ],
    hint: "Run: sgpt --shell \"Perform NetBIOS enumeration on target IP 10.10.1.11\"",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("sgpt"), msg: "Use the 'sgpt' (ShellGPT) CLI utility." },
      { check: (cmd) => !cmd.includes("--shell"), msg: "Include the '--shell' argument." },
      { check: (cmd) => !cmd.includes("10.10.1.11"), msg: "Include target IP '10.10.1.11' in your prompt string." }
    ],
    tutorNotes: "Teaching Point: ShellGPT connects to GPT-4 to generate shell commands. Explain how the '[E]xecute, [D]escribe, [A]bort' safety prompt protects against unintended execution.",
    highlightText: "nbtstat -A 10.10.1.11",
    analysisQuestion: {
      prompt: "What shell command was autonomously synthesized by ShellGPT to perform the NetBIOS enumeration?",
      options: [
        { text: "nbtstat -A 10.10.1.11", correct: true },
        { text: "ping -c 4 10.10.1.11", correct: false },
        { text: "ssh root@10.10.1.11", correct: false },
        { text: "hydra -l admin 10.10.1.11", correct: false }
      ],
      explanation: "ShellGPT analyzed the natural language prompt and accurately generated 'nbtstat -A 10.10.1.11' to enumerate the remote machine's NetBIOS table."
    },
    output: `[ShellGPT: AI Command Synthesis]
Prompt: "Perform NetBIOS enumeration on target IP 10.10.1.11"
> Synthesized Command: nbtstat -A 10.10.1.11

[E]xecute, [D]escribe, [A]bort: E
Executing: nbtstat -A 10.10.1.11 ...

NetBIOS Remote Machine Name Table

       Name               Type         Status
    ---------------------------------------------
    WINDOWS11      <00>  UNIQUE      Registered
    CORP           <00>  GROUP       Registered
    WINDOWS11      <20>  UNIQUE      Registered
    MAC Address = 00-0C-29-84-3A-1B`,
    cehExamTip: "Exam Alert: AI-driven security automation enables real-time syntax generation and automated log triage, augmenting traditional CLI tooling."
  },
  {
    id: 34,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "AI-Assisted SNMP MIB Walking (ShellGPT)",
    difficulty: "Advanced",
    points: 100,
    target: "10.10.1.22 (ShellGPT Session)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 8 (Step 289), ethical hackers maintain conversational context using '--chat enum' in ShellGPT to automate SNMP enumeration using SnmpWalk.",
    task: "Execute the ShellGPT command: sgpt --chat enum --shell \"Perform SNMP enumeration on target IP 10.10.1.22 using SnmpWalk and display the result here\".",
    solution: "sgpt --chat enum --shell \"Perform SNMP enumeration on target IP 10.10.1.22 using SnmpWalk and display the result here\"",
    accepted: [
      /^sgpt\s+--chat\s+enum\s+--shell\s+["']Perform SNMP enumeration on target IP 10\.10\.1\.22 using SnmpWalk and display the result here["']$/,
      /^sgpt\s+--chat\s+enum\s+--shell\s+.*SNMP.*10\.10\.1\.22.*SnmpWalk.*$/
    ],
    hint: "Run: sgpt --chat enum --shell \"Perform SNMP enumeration on target IP 10.10.1.22 using SnmpWalk and display the result here\"",
    diagnostics: [
      { check: (cmd) => !cmd.includes("--chat enum"), msg: "Include '--chat enum' to use the persistent enum session." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Include target IP 10.10.1.22." }
    ],
    tutorNotes: "Teaching Point: Explain the '--chat <session_name>' parameter in ShellGPT. It preserves conversation memory across prompts so the AI remembers prior reconnaissance findings.",
    highlightText: "snmpwalk -v 2c -c public 10.10.1.22",
    analysisQuestion: {
      prompt: "What is the benefit of the '--chat <session_name>' argument in ShellGPT during a penetration test?",
      options: [
        { text: "It maintains stateful conversational context across multiple command generations", correct: true },
        { text: "It bypasses local firewall egress rules", correct: false },
        { text: "It encrypts terminal output using AES-GCM", correct: false },
        { text: "It launches a multi-threaded port scanner", correct: false }
      ],
      explanation: "The --chat flag establishes a session history, allowing ShellGPT to reference earlier discovered IP addresses, ports, and credentials in subsequent prompts."
    },
    output: `[ShellGPT: Session 'enum']
Prompt: "Perform SNMP enumeration on target IP 10.10.1.22 using SnmpWalk and display the result here"
> Synthesized Command: snmpwalk -v 2c -c public 10.10.1.22

[E]xecute, [D]escribe, [A]bort: E
Executing: snmpwalk -v 2c -c public 10.10.1.22 ...

SNMPv2-MIB::sysDescr.0 = STRING: Windows Server 2022 Datacenter Build 20348
SNMPv2-MIB::sysName.0 = STRING: DC-WIN2022.CEH.COM
HOST-RESOURCES-MIB::hrStorageDescr.1 = STRING: C:\\ Label:System  Serial Number 4a218d
HOST-RESOURCES-MIB::hrStorageSize.1 = INTEGER: 15728639
HOST-RESOURCES-MIB::hrSWRunName.1 = STRING: "System Idle Process"
HOST-RESOURCES-MIB::hrSWRunName.4 = STRING: "System"
HOST-RESOURCES-MIB::hrSWRunName.512 = STRING: "lsass.exe"`,
    cehExamTip: "Exam Alert: ShellGPT can generate bash one-liners, explain complex command options, and convert natural language queries into security scanner commands."
  },
  {
    id: 35,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "AI-Assisted SMB Port Discovery (ShellGPT)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (ShellGPT Session)",
    prompt: "root@parrot:~#",
    scenario: "In CEH Lab 8 (Step 305 and Question 4.8.1.1), penetration testers write a ShellGPT prompt to identify the service running on port 445 on the Windows Server 2022 target.",
    task: "Execute the ShellGPT command: sgpt --shell \"Scan the target IP 10.10.1.22 for the port using SMB with Nmap\".",
    solution: "sgpt --shell \"Scan the target IP 10.10.1.22 for the port using SMB with Nmap\"",
    accepted: [
      /^sgpt\s+--shell\s+["']Scan the target IP 10\.10\.1\.22 for the port using SMB with Nmap["']$/,
      /^sgpt\s+--shell\s+.*10\.10\.1\.22.*SMB.*Nmap.*$/
    ],
    hint: "Run: sgpt --shell \"Scan the target IP 10.10.1.22 for the port using SMB with Nmap\"",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("sgpt"), msg: "Use 'sgpt' utility." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Include target IP 10.10.1.22." }
    ],
    tutorNotes: "Teaching Point: Address Question 4.8.1.1: 'Identify the service that is running on port 445 in Windows Server 2022 machine' -> Answer: microsoft-ds.",
    highlightText: "445/tcp open  microsoft-ds",
    analysisQuestion: {
      prompt: "According to Question 4.8.1.1 in the CEH Lab Manual, what service name is identified running on port 445 in the Windows Server 2022 machine?",
      options: [
        { text: "microsoft-ds", correct: true },
        { text: "netbios-ssn", correct: false },
        { text: "msrpc", correct: false },
        { text: "domain", correct: false }
      ],
      explanation: "Port 445 is officially registered as 'microsoft-ds' (Microsoft Directory Services), used for direct SMB over TCP."
    },
    output: `[ShellGPT: AI Command Synthesis]
Prompt: "Scan the target IP 10.10.1.22 for the port using SMB with Nmap"
> Synthesized Command: nmap -p 445 -sV 10.10.1.22

[E]xecute, [D]escribe, [A]bort: E
Executing: nmap -p 445 -sV 10.10.1.22 ...

PORT    STATE SERVICE      VERSION
445/tcp open  microsoft-ds Windows Server 2022 Datacenter 17763 microsoft-ds
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Nmap done: 1 IP address (1 host up) scanned in 0.22 seconds`,
    cehExamTip: "Exam Alert: Service on port 445 is 'microsoft-ds' (Direct Host SMB). Port 139 is 'netbios-ssn' (NetBIOS Session Service)."
  },

  // ==========================================
  // MODULE 5: VULNERABILITY ANALYSIS
  // ==========================================
  {
    id: 36,
    module: 5,
    moduleTitle: "Module 05: Vulnerability Analysis",
    title: "Vulnerability Scanning via Nmap 'vuln' Category",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "In Module 5, vulnerability analysis shifts from passive/active enumeration to identifying security weaknesses, missing patches, and known CVEs.",
    task: "Scan target 10.10.1.22 using Nmap's built-in 'vuln' script category to uncover known vulnerabilities.",
    solution: "nmap --script vuln 10.10.1.22",
    accepted: [
      /^nmap\s+--script\s+vuln\s+10\.10\.1\.22$/,
      /^nmap\s+--script=vuln\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nmap --script vuln 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("--script"), msg: "Use '--script' to run script categories." },
      { check: (cmd) => !cmd.includes("vuln"), msg: "Specify the 'vuln' category." }
    ],
    tutorNotes: "Teaching Talking Point: Show students: 'State: VULNERABLE - Remote Code Execution in Microsoft SMBv1 servers (ms17-010) - CVE-2017-0143'. Emphasize that EternalBlue allows unauthenticated SYSTEM shell access.",
    highlightText: "State: VULNERABLE",
    analysisQuestion: {
      prompt: "What critical vulnerability was detected on port 445 that allows remote code execution without authentication?",
      options: [
        { text: "MS17-010 (EternalBlue) Remote Code Execution in Microsoft SMBv1 (CVE-2017-0143)", correct: true },
        { text: "Apache Log4j JNDI injection (CVE-2021-44228)", correct: false },
        { text: "Heartbleed OpenSSL memory leakage (CVE-2014-0160)", correct: false },
        { text: "DNS Cache Poisoning vulnerability", correct: false }
      ],
      explanation: "Nmap's smb-vuln-ms17-010 script confirmed the target is unpatched and vulnerable to MS17-010 (EternalBlue), a critical vulnerability granting full remote SYSTEM access."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:05 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00052s latency).

PORT    STATE SERVICE
445/tcp open  microsoft-ds
| smb-vuln-ms17-010: 
|   VULNERABLE:
|   Remote Code Execution vulnerability in Microsoft SMBv1 servers (ms17-010)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-0143
|     Risk factor: HIGH
|       A critical remote code execution vulnerability exists in Microsoft SMBv1
|_      Disclosure date: 2017-03-14

Nmap done: 1 IP address (1 host up) scanned in 8.21 seconds`,
    cehExamTip: "Exam Alert: NSE script categories include: auth, broadcast, default, discovery, dos, exploit, external, fuzzer, intrusive, malware, safe, version, and vuln. Questions often ask which category safely checks without crashing services ('safe')."
  },
  {
    id: 37,
    module: 5,
    moduleTitle: "Module 05: Vulnerability Analysis",
    title: "Web Server Vulnerability Scanning with Nikto",
    difficulty: "Intermediate",
    points: 100,
    target: "http://10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Nikto is an open-source web server scanner that tests web servers for dangerous files, outdated server software, and security misconfigurations.",
    task: "Perform a web vulnerability scan against target web server http://10.10.1.22 using Nikto.",
    solution: "nikto -h http://10.10.1.22",
    accepted: [
      /^nikto\s+-h\s+http:\/\/10\.10\.1\.22\/?$/,
      /^nikto\s+-h\s+10\.10\.1\.22\/?$/,
      /^nikto\s+-host\s+http:\/\/10\.10\.1\.22\/?$/
    ],
    hint: "Type 'nikto -h http://10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nikto"), msg: "Use the 'nikto' web scanner." },
      { check: (cmd) => !cmd.includes("-h") && !cmd.includes("-host"), msg: "Use '-h' (host) to specify target." }
    ],
    tutorNotes: "Teaching Talking Point: Show students the missing 'X-Frame-Options' header. Explain that this header prevents Clickjacking (UI redressing) by forbidding other sites from embedding this page in an iframe.",
    highlightText: "The anti-clickjacking X-Frame-Options header is not present.",
    analysisQuestion: {
      prompt: "What web vulnerability becomes possible when the 'X-Frame-Options' HTTP header is missing?",
      options: [
        { text: "Clickjacking (UI Redressing attack via hidden iframes)", correct: true },
        { text: "SQL Injection into the backend database", correct: false },
        { text: "Buffer Overflow in the network card", correct: false },
        { text: "ARP cache poisoning on the local switch", correct: false }
      ],
      explanation: "Without the 'X-Frame-Options' header (DENY or SAMEORIGIN), malicious websites can frame the target web application and trick users into clicking buttons invisibly (Clickjacking)."
    },
    output: `- Nikto v2.5.0
---------------------------------------------------------------------------
+ Target IP:          10.10.1.22
+ Target Hostname:    10.10.1.22
+ Target Port:        80
---------------------------------------------------------------------------
+ Server: Microsoft-IIS/10.0
+ [OSVDB-3092] /admin/: Directory indexing found or accessible admin area.
+ [CVE-2015-1635] /: MS15-034 HTTP.sys Remote Code Execution check.
+ The anti-clickjacking X-Frame-Options header is not present.
+ The X-Content-Type-Options header is not set. This could allow the user agent to render the content of the site in a different fashion to the MIME type.
+ 7915 requests: 0 error(s) and 4 item(s) reported on remote host`,
    cehExamTip: "Exam Alert: Nikto scans rely on a database of known vulnerable paths (nikto_tests.csv). In CEH, remember that vulnerability scanners like Nessus, OpenVAS, and Nikto generate FALSE POSITIVES that must be manually validated by the ethical hacker."
  },
  {
    id: 38,
    module: 5,
    moduleTitle: "Module 05: Vulnerability Analysis",
    title: "Offline Exploit Database Searching (searchsploit)",
    difficulty: "Intermediate",
    points: 100,
    target: "Local Exploit-DB",
    prompt: "root@parrot:~#",
    scenario: "Once a specific software vulnerability or CVE is identified during vulnerability analysis, ethical hackers use searchsploit to search their offline copy of Exploit-DB.",
    task: "Use searchsploit to search for published exploits related to 'ms17-010'.",
    solution: "searchsploit ms17-010",
    accepted: [
      /^searchsploit\s+ms17-010$/,
      /^searchsploit\s+"ms17-010"$/,
      /^searchsploit\s+smb\s+ms17-010$/
    ],
    hint: "Type 'searchsploit ms17-010'.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("searchsploit"), msg: "Use the 'searchsploit' utility." },
      { check: (cmd) => !cmd.includes("ms17-010"), msg: "Specify the vulnerability identifier: ms17-010." }
    ],
    tutorNotes: "Teaching Talking Point: Show students that searchsploit matches exploit title to local file paths (e.g. windows/remote/42315.py). Explain that penetration testers copy these scripts using 'searchsploit -m 42315.py'.",
    highlightText: "Microsoft Windows SMB Remote Code Execution (MS17-010)",
    analysisQuestion: {
      prompt: "Why is searchsploit considered an essential tool for penetration testers working in isolated or classified lab environments?",
      options: [
        { text: "It queries a complete offline local clone of Exploit-DB without requiring internet access or leaking targets", correct: true },
        { text: "It cracks WPA2 Wi-Fi handshakes in the background", correct: false },
        { text: "It automatically generates phishing emails", correct: false },
        { text: "It intercepts cellular LTE communications", correct: false }
      ],
      explanation: "Searchsploit is included in Kali/Parrot as an offline search tool for Exploit-DB. It enables pen testers to identify matching exploits in air-gapped test networks without external web queries."
    },
    output: `---------------------------------------------------------- ---------------------------------
 Exploit Title                                            |  Path
---------------------------------------------------------- ---------------------------------
Microsoft Windows - 'EternalRomance'/'EternalSynergy' (MS1| windows/remote/43970.py
Microsoft Windows 7/8.1/2008 R2/2016 R2 - 'Eternal| windows/remote/42031.py
Microsoft Windows 8/8.1/2012 R2 (x64) - 'EternalBlue' Rem| windows_x86-64/remote/42030.py
Microsoft Windows SMB Remote Code Execution (MS17-010)     | windows/remote/42315.py
---------------------------------------------------------- ---------------------------------
Shellcodes: No Results
Papers: No Results`,
    cehExamTip: "Exam Alert: CVSS v3.1 ratings: None (0.0), Low (0.1 - 3.9), Medium (4.0 - 6.9), High (7.0 - 8.9), Critical (9.0 - 10.0). MS17-010 (EternalBlue) has a CVSS v3 score of 9.8 (Critical) with Attack Vector: Network."
  }
];
