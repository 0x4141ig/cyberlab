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
  // MODULE 4: ENUMERATION (NBTSTAT & NETBIOS LABS)
  // ==========================================
  {
    id: 17,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NetBIOS Remote Name Table by IP (nbtstat -A)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "C:\\Users\\Administrator>",
    scenario: "Following network port scanning, ethical hackers perform NetBIOS enumeration on ports 137 (UDP) and 139 (TCP). In Windows, 'nbtstat' is the premier built-in command to query remote NetBIOS name tables.",
    task: "Use nbtstat with capital '-A' to enumerate the remote NetBIOS name table of target IP 10.10.1.22.",
    solution: "nbtstat -A 10.10.1.22",
    accepted: [
      /^nbtstat\s+-A\s+10\.10\.1\.22$/,
      /^nbtstat\s+-a\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nbtstat -A 10.10.1.22'. Remember: capital '-A' queries by IP address, while lowercase '-a' requires a hostname.",
    diagnostics: [
      { check: (cmd) => !cmd.toLowerCase().startsWith("nbtstat"), msg: "Use the Windows built-in 'nbtstat' utility." },
      { check: (cmd) => !cmd.includes("-A") && !cmd.includes("-a"), msg: "Use '-A' (capital) followed by the remote IP address." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Target IP 10.10.1.22 is missing." }
    ],
    tutorNotes: "Teaching Talking Point: This is a classic CEH exam question! Teach students the difference: 'nbtstat -a <ComputerName>' vs 'nbtstat -A <IPAddress>'. Highlight the NetBIOS suffix '<20>' under type UNIQUE, which proves the Server Service (File and Print Sharing) is active.",
    highlightText: "WIN-SERVER2022 <20>  UNIQUE      Registered",
    analysisQuestion: {
      prompt: "In the NetBIOS name table, what does the hex suffix '<20>' next to 'WIN-SERVER2022' reveal to an ethical hacker?",
      options: [
        { text: "The Server Service is running, confirming file and printer sharing is enabled", correct: true },
        { text: "The machine is a primary DNS server", correct: false },
        { text: "The host has 20 active user sessions", correct: false },
        { text: "The machine is running a web proxy", correct: false }
      ],
      explanation: "NetBIOS names are 16 bytes: 15 for the name and the 16th byte is the hex suffix. <00> = Workstation service, <20> = Server service (File/Print sharing), <1B> = Domain Master Browser, <1D> = Master Browser."
    },
    output: `       NetBIOS Remote Machine Name Table

       Name               Type         Status
    ---------------------------------------------
    WIN-SERVER2022 <00>  UNIQUE      Registered
    CEH            <00>  GROUP       Registered
    WIN-SERVER2022 <20>  UNIQUE      Registered
    CEH            <1E>  GROUP       Registered
    CEH            <1D>  UNIQUE      Registered
    ..__MSBROWSE__.<01>  GROUP       Registered

    MAC Address = 00-0C-29-8E-4F-1A`,
    cehExamTip: "Exam Alert: CEH loves asking about nbtstat parameters: '-a <hostname>' requires a computer name, while '-A <IP>' requires an IP address. Suffix <20> denotes File/Print Sharing (Server Service), and <00> denotes Workstation/Domain name."
  },
  {
    id: 18,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NetBIOS Remote Name Cache (nbtstat -c)",
    difficulty: "Intermediate",
    points: 100,
    target: "Local NetBIOS Cache",
    prompt: "C:\\Users\\Administrator>",
    scenario: "Attackers inspect the local NetBIOS name cache to identify recently resolved hostnames and IP addresses of sensitive internal targets (like domain controllers and file servers) without generating network noise.",
    task: "Display the contents of the local NetBIOS Remote Cache Name Table using nbtstat.",
    solution: "nbtstat -c",
    accepted: [
      /^nbtstat\s+-c$/
    ],
    hint: "Type 'nbtstat -c' to view the NetBIOS name cache table.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nbtstat"), msg: "Use the 'nbtstat' command." },
      { check: (cmd) => !cmd.includes("-c"), msg: "Use the '-c' (cache) parameter." }
    ],
    tutorNotes: "Teaching Talking Point: Show students: 'DC01 <20> UNIQUE 10.10.1.2'. Point out how cache snooping allows ethical hackers to identify the Domain Controller (10.10.1.2) without running any active port scans across the subnet.",
    highlightText: "DC01           <20>  UNIQUE          10.10.1.2",
    analysisQuestion: {
      prompt: "What critical internal infrastructure server was discovered in the NetBIOS cache without sending packets across the network?",
      options: [
        { text: "Primary Domain Controller (DC01 @ 10.10.1.2)", correct: true },
        { text: "External Cloud Firewall", correct: false },
        { text: "Public DNS Root Server", correct: false },
        { text: "Guest Wi-Fi Gateway", correct: false }
      ],
      explanation: "'nbtstat -c' displays recently resolved NetBIOS names stored in RAM, uncovering internal servers like 'DC01' (10.10.1.2) passively."
    },
    output: `Local Area Connection:
Node IpAddress: [10.10.1.50] Scope Id: []

                  NetBIOS Remote Cache Name Table

       Name              Type       Host Address    Life [sec]
    ------------------------------------------------------------
    DC01           <20>  UNIQUE          10.10.1.2          240
    FILESERVER     <20>  UNIQUE         10.10.1.20          300
    WIN-SERVER2022 <20>  UNIQUE         10.10.1.22          360`,
    cehExamTip: "Exam Alert: 'nbtstat -c' displays the NetBIOS name cache. To purge and reload this cache from the LMHOSTS file, the command is 'nbtstat -R' (capital R). To purge and re-register names, use 'nbtstat -RR'."
  },
  {
    id: 19,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "Local NetBIOS Name Table (nbtstat -n)",
    difficulty: "Beginner",
    points: 100,
    target: "Local Workstation",
    prompt: "C:\\Users\\Administrator>",
    scenario: "To audit what NetBIOS services and workgroups your current system is broadcasting to the local network, you can dump your own local NetBIOS table.",
    task: "Use nbtstat to display the local machine's NetBIOS names and registered workgroup.",
    solution: "nbtstat -n",
    accepted: [
      /^nbtstat\s+-n$/
    ],
    hint: "Type 'nbtstat -n' to display names registered locally.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nbtstat"), msg: "Use 'nbtstat'." },
      { check: (cmd) => !cmd.includes("-n"), msg: "Use the '-n' (names) option." }
    ],
    tutorNotes: "Teaching Talking Point: Show students: '<00> GROUP Registered'. Explain that <00> with type GROUP always represents the Domain or Workgroup name, whereas <00> with type UNIQUE is the computer hostname.",
    highlightText: "WORKGROUP      <00>  GROUP       Registered",
    analysisQuestion: {
      prompt: "In the local NetBIOS name table, what does the entry 'WORKGROUP <00> GROUP' represent?",
      options: [
        { text: "The local Workgroup or Domain name that this host is joined to", correct: true },
        { text: "A list of banned IP addresses", correct: false },
        { text: "The network router's MAC address", correct: false },
        { text: "A group of active malware connections", correct: false }
      ],
      explanation: "A NetBIOS <00> suffix with type GROUP indicates the Domain or Workgroup name. A <00> suffix with type UNIQUE indicates the individual computer hostname."
    },
    output: `Local Area Connection:
Node IpAddress: [10.10.1.50] Scope Id: []

                NetBIOS Local Name Table

       Name               Type         Status
    ---------------------------------------------
    ADMIN-PC       <00>  UNIQUE      Registered
    ADMIN-PC       <20>  UNIQUE      Registered
    WORKGROUP      <00>  GROUP       Registered
    WORKGROUP      <1E>  GROUP       Registered`,
    cehExamTip: "Exam Alert: 'nbtstat -n' lists names that were registered locally by applications such as the Workstation service, Server service, and Messenger service."
  },
  {
    id: 20,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "NetBIOS Connection Table by IP (nbtstat -s)",
    difficulty: "Intermediate",
    points: 100,
    target: "Local Connection Table",
    prompt: "C:\\Users\\Administrator>",
    scenario: "Monitoring active NetBIOS sessions helps identify active SMB connections, open shares, and network file transfers in progress.",
    task: "Display the NetBIOS connection session table listing remote hosts by IP address using nbtstat.",
    solution: "nbtstat -s",
    accepted: [
      /^nbtstat\s+-s$/,
      /^nbtstat\s+-S$/
    ],
    hint: "Use 'nbtstat -s' to list NetBIOS sessions by IP address.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("nbtstat"), msg: "Use 'nbtstat'." },
      { check: (cmd) => !cmd.toLowerCase().includes("-s"), msg: "Use '-s' (or '-S') to view the sessions connection table." }
    ],
    tutorNotes: "Teaching Talking Point: Explain the difference between '-s' and '-S': '-s' lists remote hosts by IP address; capital '-S' attempts to resolve remote IPs to NetBIOS computer names.",
    highlightText: "10.10.1.22:139",
    analysisQuestion: {
      prompt: "Which legacy NetBIOS transport port is actively connected to remote host 10.10.1.22?",
      options: [
        { text: "TCP Port 139 (NetBIOS Session Service)", correct: true },
        { text: "UDP Port 137 (NetBIOS Name Service)", correct: false },
        { text: "UDP Port 138 (NetBIOS Datagram Service)", correct: false },
        { text: "TCP Port 22 (SSH)", correct: false }
      ],
      explanation: "NetBIOS over TCP/IP uses 3 ports: UDP 137 (Name Service), UDP 138 (Datagram Service), and TCP 139 (Session Service). Direct-hosted SMB uses TCP 445."
    },
    output: `Local Area Connection:
Node IpAddress: [10.10.1.50] Scope Id: []

                  NetBIOS Connection Table

    Local Name             State    In/Out  Remote Host           Input   Output
    --------------------------------------------------------------------------------
    ADMIN-PC       <00>  Connected  Out     10.10.1.22:139        18KB    12KB
    ADMIN-PC       <00>  Connected  Out     10.10.1.2:139         4KB     2KB`,
    cehExamTip: "Exam Alert: Memorize the NetBT port numbers: UDP 137 = NetBIOS Name Service (NBNS), UDP 138 = NetBIOS Datagram Service, TCP 139 = NetBIOS Session Service."
  },
  {
    id: 21,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "Metasploit: Loading SYN Port Scanner Module",
    difficulty: "Intermediate",
    points: 100,
    target: "Metasploit Console",
    prompt: "msf6 >",
    scenario: "In Lab 5 of your network scanning document, you transition from standalone Nmap to Metasploit auxiliary scanning modules.",
    task: "Load the auxiliary SYN port scanner module inside Metasploit console.",
    solution: "use auxiliary/scanner/portscan/syn",
    accepted: [
      /^use\s+auxiliary\/scanner\/portscan\/syn$/,
      /^use\s+scanner\/portscan\/syn$/
    ],
    hint: "Type 'use auxiliary/scanner/portscan/syn'.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("use"), msg: "In Metasploit, use the 'use' command to load an auxiliary module." },
      { check: (cmd) => !cmd.includes("auxiliary/scanner/portscan/syn"), msg: "Module path must be 'auxiliary/scanner/portscan/syn'." }
    ],
    tutorNotes: "Teaching Talking Point: Show students the prompt change: from 'msf6 >' to 'msf6 auxiliary(scanner/portscan/syn) >'. Explain that auxiliary modules never deploy payloads.",
    highlightText: "msf6 auxiliary(scanner/portscan/syn) >",
    analysisQuestion: {
      prompt: "What distinguishes a Metasploit 'auxiliary' module from an 'exploit' module in penetration testing?",
      options: [
        { text: "Auxiliary modules perform scanning, fuzzing, and discovery without deploying a payload", correct: true },
        { text: "Auxiliary modules grant interactive meterpreter root access", correct: false },
        { text: "Auxiliary modules are only written in Python", correct: false },
        { text: "Auxiliary modules permanently erase hard drives", correct: false }
      ],
      explanation: "Auxiliary modules in Metasploit perform supporting actions: port scanning, brute-forcing, service fingerprinting, and denial of service. They do not attach or deliver payloads."
    },
    output: `[+] Module loaded: auxiliary/scanner/portscan/syn
msf6 auxiliary(scanner/portscan/syn) >`,
    cehExamTip: "Exam Alert: Metasploit auxiliary modules are used for scanning, discovery, fingerprinting, and denial of service. Unlike exploits, auxiliary modules do NOT drop a payload on the target."
  },
  {
    id: 22,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "Metasploit: SMB Version Enumeration Module",
    difficulty: "Intermediate",
    points: 100,
    target: "Metasploit Console",
    prompt: "msf6 >",
    scenario: "As covered in Task 1 of Lab 5, once open port 445 is found, ethical hackers load the SMB version auxiliary scanner to pinpoint the exact operating system build.",
    task: "Load the Metasploit auxiliary module used to discover SMB versions.",
    solution: "use auxiliary/scanner/smb/smb_version",
    accepted: [
      /^use\s+auxiliary\/scanner\/smb\/smb_version$/,
      /^use\s+scanner\/smb\/smb_version$/
    ],
    hint: "Type 'use auxiliary/scanner/smb/smb_version'.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("use"), msg: "Use the 'use' keyword." },
      { check: (cmd) => !cmd.includes("smb_version"), msg: "Module name is 'auxiliary/scanner/smb/smb_version'." }
    ],
    tutorNotes: "Teaching Talking Point: Reference Question 3.5.1.1 from the class lab docx! Metasploit parameters: 'set RHOSTS 10.10.1.5-23'. Emphasize that SMB discovery determines if EternalBlue is applicable.",
    highlightText: "msf6 auxiliary(scanner/smb/smb_version) >",
    analysisQuestion: {
      prompt: "According to CEH Question 3.5.1.1 in your class document, how do you set the target range for this module to scan hosts 5 through 23?",
      options: [
        { text: "set RHOSTS 10.10.1.5-23", correct: true },
        { text: "target 10.10.1.5 to 23", correct: false },
        { text: "set IP 10.10.1.5:23", correct: false },
        { text: "scan --range 5-23", correct: false }
      ],
      explanation: "In Metasploit auxiliary modules, the remote targets parameter is 'RHOSTS', which accepts hyphenated ranges like 'set RHOSTS 10.10.1.5-23'."
    },
    output: `[+] Module loaded: auxiliary/scanner/smb/smb_version
msf6 auxiliary(scanner/smb/smb_version) >`,
    cehExamTip: "Exam Alert: Lab Question 3.5.1.1 from your doc asks about setting RHOSTS for this exact module: 'set RHOSTS 10.10.1.5-23'. Metasploit supports single IPs, CIDR blocks (10.10.1.0/24), and hyphenated IP ranges."
  },
  {
    id: 23,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "User Enumeration via enum4linux",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Windows/Samba)",
    prompt: "root@parrot:~#",
    scenario: "Enumeration extracts active user accounts, group memberships, and share paths from the target. In CEH Module 4, enum4linux is the premier tool for Windows and Samba enumeration.",
    task: "Use enum4linux to enumerate all user accounts (-U) from target 10.10.1.22.",
    solution: "enum4linux -U 10.10.1.22",
    accepted: [
      /^enum4linux\s+-U\s+10\.10\.1\.22$/,
      /^enum4linux\s+-a\s+10\.10\.1\.22$/,
      /^enum4linux\s+10\.10\.1\.22\s+-U$/
    ],
    hint: "Type 'enum4linux -U 10.10.1.22' to enumerate user accounts.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("enum4linux"), msg: "Use the 'enum4linux' tool." },
      { check: (cmd) => !cmd.includes("-U") && !cmd.includes("-a"), msg: "Use the '-U' flag to specifically enumerate users (or '-a' for all simple enumeration)." },
      { check: (cmd) => !cmd.includes("10.10.1.22"), msg: "Target IP 10.10.1.22 missing." }
    ],
    tutorNotes: "Teaching Talking Point: Show students: 'user:[Administrator] rid:[0x1f4]'. Explain hex 0x1f4 = decimal 500. This RID proves it is the built-in Windows admin even if the account was renamed.",
    highlightText: "user:[Administrator] rid:[0x1f4]",
    analysisQuestion: {
      prompt: "In Windows Relative Identifiers (RID), what does RID 0x1f4 (Decimal 500) always identify?",
      options: [
        { text: "The built-in local or domain Administrator account", correct: true },
        { text: "The Guest account", correct: false },
        { text: "A temporary service account", correct: false },
        { text: "An unprivileged remote desktop user", correct: false }
      ],
      explanation: "Windows security accounts end in a RID. RID 500 is reserved for the built-in Administrator, while RID 501 is the Guest account. Attackers use RID cycling to enumerate users."
    },
    output: `Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ ) on Sun Oct 18 22:58:12 2026

 ========================== 
|    Users on 10.10.1.22   |
 ========================== 
[+] Enumerating users using SID S-1-5-21-28947192-19284719-2918471
user:[Administrator] rid:[0x1f4]
user:[Guest] rid:[0x1f5]
user:[krbtgt] rid:[0x1f6]
user:[jdoe] rid:[0x450]
user:[sarah_admin] rid:[0x451]
user:[backup_service] rid:[0x452]

[+] Got domain users via RPC!`,
    cehExamTip: "Exam Alert: Look at RID 0x1f4 (Hex 0x1f4 = Decimal 500). In Windows, the built-in Administrator account ALWAYS has RID 500, and Guest has RID 501. Attackers use RID cycling to uncover usernames even if the administrator was renamed."
  },
  {
    id: 24,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SNMP MIB Walking with Community String",
    difficulty: "Advanced",
    points: 100,
    target: "10.10.1.22 (UDP 161)",
    prompt: "root@parrot:~#",
    scenario: "Simple Network Management Protocol (SNMP) using default community strings like 'public' allows unauthorized remote querying of hardware, software, and network configuration.",
    task: "Perform an SNMP walk on 10.10.1.22 using SNMP version 2c (-v 2c) and community string 'public' (-c public).",
    solution: "snmpwalk -v 2c -c public 10.10.1.22",
    accepted: [
      /^snmpwalk\s+-v\s*2c\s+-c\s+public\s+10\.10\.1\.22$/,
      /^snmpwalk\s+-c\s+public\s+-v\s*2c\s+10\.10\.1\.22$/
    ],
    hint: "Use 'snmpwalk -v 2c -c public 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.startsWith("snmpwalk"), msg: "Use 'snmpwalk' to query the SNMP Management Information Base (MIB)." },
      { check: (cmd) => !cmd.includes("-v 2c") && !cmd.includes("-v2c"), msg: "Specify SNMP version 2c with '-v 2c'." },
      { check: (cmd) => !cmd.includes("public"), msg: "Specify community string 'public' using '-c public'." }
    ],
    tutorNotes: "Teaching Talking Point: Show students: 'SNMPv2-MIB::sysContact.0 = STRING: IT-Support <admin@ceh.corp>'. Point out how SNMP provides employee emails and system uptime (30 minutes).",
    highlightText: "STRING: IT-Support <admin@ceh.corp>",
    analysisQuestion: {
      prompt: "What sensitive administrative contact detail was extracted from the SNMP MIB?",
      options: [
        { text: "IT Support email address: admin@ceh.corp", correct: true },
        { text: "The router's WiFi WPA3 key", correct: false },
        { text: "A list of encrypted credit card numbers", correct: false },
        { text: "The Kerberos krbtgt hash", correct: false }
      ],
      explanation: "SNMP sysContact often contains real IT administrator email addresses, which can be immediately leveraged for spear-phishing and social engineering attacks."
    },
    output: `SNMPv2-MIB::sysDescr.0 = STRING: Hardware: Intel64 Family 6 Model 158 - Software: Windows Version 10.0 (Build 20348 Multiprocessor Free)
SNMPv2-MIB::sysObjectID.0 = OID: SNMPv2-SMI::enterprises.311.1.1.3.1.2
DISMAN-EVENT-MIB::sysUpTimeInstance = Timeticks: (182910) 0:30:29.10
SNMPv2-MIB::sysContact.0 = STRING: IT-Support <admin@ceh.corp>
SNMPv2-MIB::sysName.0 = STRING: WIN-SERVER2022
HOST-RESOURCES-MIB::hrSystemProcesses.0 = Gauge32: 68
HOST-RESOURCES-MIB::hrStorageDescr.1 = STRING: C:\\ Label:System Serial Number 4A12F981`,
    cehExamTip: "Exam Alert: SNMP versions 1 and 2c transmit community strings in CLEAR TEXT. Only SNMPv3 provides strong authentication (MD5/SHA) and encryption (DES/AES). Default community string for read-only is 'public'; read-write is 'private'."
  },
  {
    id: 25,
    module: 4,
    moduleTitle: "Module 04: Enumeration",
    title: "SMTP User Enumeration (VRFY / EXPN)",
    difficulty: "Intermediate",
    points: 100,
    target: "10.10.1.22 (Port 25)",
    prompt: "root@parrot:~#",
    scenario: "SMTP servers support commands like VRFY (verify user) and EXPN (expand mailing list). Misconfigured mail servers confirm whether a given mailbox exists.",
    task: "Use Nmap's 'smtp-enum-users.nse' script to test for valid user accounts on target mail server 10.10.1.22.",
    solution: "nmap --script smtp-enum-users.nse 10.10.1.22",
    accepted: [
      /^nmap\s+--script\s+smtp-enum-users\.nse\s+10\.10\.1\.22$/,
      /^nmap\s+--script=smtp-enum-users\.nse\s+10\.10\.1\.22$/,
      /^nmap\s+--script\s+smtp-enum-users\s+10\.10\.1\.22$/
    ],
    hint: "Use 'nmap --script smtp-enum-users.nse 10.10.1.22'.",
    diagnostics: [
      { check: (cmd) => !cmd.includes("--script"), msg: "Use '--script' parameter." },
      { check: (cmd) => !cmd.includes("smtp-enum-users"), msg: "Script name is 'smtp-enum-users.nse'." }
    ],
    tutorNotes: "Teaching Talking Point: Explain that VRFY returns 250 (User exists) or 550 (User does not exist). Mail admins must disable VRFY and EXPN in sendmail, postfix, or exchange configurations.",
    highlightText: "webmaster",
    analysisQuestion: {
      prompt: "Which 3 SMTP commands are traditionally exploited by enumeration scripts to confirm valid email mailboxes?",
      options: [
        { text: "VRFY, EXPN, and RCPT TO", correct: true },
        { text: "SYN, ACK, and FIN", correct: false },
        { text: "GET, POST, and PUT", correct: false },
        { text: "PING, WHOIS, and DIG", correct: false }
      ],
      explanation: "SMTP enumeration probes VRFY (verify), EXPN (expand alias list), and RCPT TO (recipient check) to confirm whether a user mailbox exists on the server."
    },
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-18 23:02 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00044s latency).
PORT   STATE SERVICE
25/tcp open  smtp
| smtp-enum-users: 
|   Administrator
|   admin
|   support
|   webmaster
|_  postmaster

Nmap done: 1 IP address (1 host up) scanned in 2.14 seconds`,
    cehExamTip: "Exam Alert: The 3 primary SMTP enumeration commands tested in CEH are: 1. VRFY (verifies user), 2. EXPN (expands mailing aliases), and 3. RCPT TO (defines the mail recipient)."
  },

  // ==========================================
  // MODULE 5: VULNERABILITY ANALYSIS
  // ==========================================
  {
    id: 26,
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
    id: 27,
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
    id: 28,
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
