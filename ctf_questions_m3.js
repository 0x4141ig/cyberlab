// ============================================================================
// MODULE 3 CTFs: Scanning networks (nmap, hping3, netcat, masscan, arp-scan)
// Flags are written as flagPlain; run  python tools/encode_flags.py  to obfuscate them.
// ============================================================================

CTF_QUESTIONS.push(
  {
    id: 130,
    type: "ctf",
    derivedFlag: true,
    pairedWith: 7,
    order: 1,   // position among the CTFs of its lab
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Head Count",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.2.0/24 (Branch Office)",
    prompt: "root@parrot:~#",
    scenario: "A branch office network, 10.10.2.0/24, has just been connected to the lab. Before touching any single host you want to know how many devices are alive on it.",
    task: "Find out how many hosts are up on 10.10.2.0/24 without scanning any ports. The flag is CEH{hosts_up_<number>}.",
    solution: "nmap -sn 10.10.2.0/24",
    accepted: [
      (c) => /^(sudo )?nmap\b/.test(_n(c)) && _has(c, /\s-sn\s/) && _hasTarget(c, "10.10.2.0/24")
    ],
    hints: [
      "Hint 1: Nmap can answer 'who is alive?' without looking at ports at all.",
      "Hint 2: Run nmap with the option that only discovers hosts (a ping sweep) against the whole subnet, then count the hosts that are up.",
      "Hint 3: nmap -sn 10.10.2.0/24"
    ],
    diagnostics: [
      { check: (c) => !/^(sudo )?nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/10\.10\.2\.0\/24/.test(c), msg: "Scan the whole branch subnet: 10.10.2.0/24." },
      { check: (c) => !/-sn\b/.test(c), msg: "You only want to know which hosts are alive. Which option does discovery without port scanning?" }
    ],
    tutorNotes: "Teaching point: -sn is the cheapest way to size a network. Derived flag: students count the hosts reported as up.",
    cehExamTip: "Exam Alert: nmap -sn (ping sweep) uses ICMP, TCP and ARP probes to find live hosts without scanning ports.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 10:12 UTC
Nmap scan report for 10.10.2.1
Host is up (0.00041s latency).
Nmap scan report for 10.10.2.4
Host is up (0.00052s latency).
Nmap scan report for 10.10.2.7
Host is up (0.00047s latency).
Nmap scan report for 10.10.2.10
Host is up (0.00060s latency).
Nmap scan report for 10.10.2.21
Host is up (0.00055s latency).
Nmap scan report for 10.10.2.30
Host is up (0.00049s latency).
Nmap done: 256 IP addresses (6 hosts up) scanned in 2.64 seconds`,
    flagEnc: "ICAgVgsbFVkFbkYTOl5Q",
    writeup: "<code>nmap -sn 10.10.2.0/24</code> performed host discovery only. The last line reports <code>6 hosts up</code>, so the flag is <code>CEH{hosts_up_6}</code>. A ping sweep is the quickest way to size a network before choosing what to scan."
  },
  {
    id: 131,
    type: "ctf",
    pairedWith: 7,
    order: 3,   // position among the CTFs of its lab
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "The Port Nobody Scans",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.40 (DMZ Server)",
    prompt: "root@parrot:~#",
    scenario: "The default scan of the DMZ server shows nothing unusual, yet an application on it announces itself in its version string. It listens on a very high port that the default scan never checks.",
    task: "Check every TCP port of 10.10.1.40, identify the software behind the open ones, and find the flag in a version string.",
    solution: "nmap -p- -sV 10.10.1.40",
    accepted: [
      (c) => /^(sudo )?nmap\b/.test(_n(c)) && (_has(c, /\s-p-\s/) || _has(c, /\s-p\s*1-65535\s/)) && _has(c, /\s-sV\s/) && _hasTarget(c, "10.10.1.40")
    ],
    hints: [
      "Hint 1: A normal scan only looks at the 1000 most common ports. You need every port, and you need to ask each open port what it is.",
      "Hint 2: Combine the option that scans all 65535 ports with the version detection option, aimed at 10.10.1.40.",
      "Hint 3: nmap -p- -sV 10.10.1.40"
    ],
    diagnostics: [
      { check: (c) => !/^(sudo )?nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/10\.10\.1\.40/.test(c), msg: "The DMZ server is 10.10.1.40." },
      { check: (c) => !/-p-|-p\s*1-65535/.test(c), msg: "The default scan misses high ports. Which option scans all of them?" },
      { check: (c) => !/-sV/.test(c), msg: "You also need the software and version behind each open port." }
    ],
    tutorNotes: "Teaching point: -p- finds services the default top-1000 scan misses, and -sV reads what each one says about itself. Combining arguments is the real skill.",
    cehExamTip: "Exam Alert: nmap scans only the 1000 most common ports by default. -p- scans all 65535, and service banners often leak product names and notes.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 10:20 UTC
Nmap scan report for 10.10.1.40
Host is up (0.00063s latency).
Not shown: 65532 closed tcp ports (reset)
PORT      STATE SERVICE VERSION
22/tcp    open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 (Ubuntu Linux; protocol 2.0)
80/tcp    open  http    nginx 1.18.0 (Ubuntu)
31337/tcp open  http    CTF-Lab httpd 1.0 ({{FLAG}})
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 21.37 seconds`,
    flagEnc: "ICAgVgsdAUUpQVwRERtyCx0CSClCVhETAU4GBxs=",
    writeup: "<code>nmap -p- -sV 10.10.1.40</code> scanned all 65535 ports and read each service's version string. Port 31337 only shows up with <code>-p-</code>, and its version text held the flag. Neither option alone would have found it."
  },
  {
    id: 132,
    type: "ctf",
    pairedWith: 7,
    order: 2,   // position among the CTFs of its lab
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Silent Service",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.30 (Linux Server)",
    prompt: "root@parrot:~#",
    scenario: "The TCP ports of 10.10.1.30 are boring, but the host also runs a management agent over UDP that describes itself to anyone who asks.",
    task: "Query the SNMP agent on UDP port 161 of 10.10.1.30 with Nmap and read the system description it returns to find the flag.",
    solution: "nmap -sU -p 161 --script snmp-sysdescr 10.10.1.30",
    accepted: [
      (c) => /^(sudo )?nmap\b/.test(_n(c)) && _has(c, /\s-sU\s/) && _portsOk(c, 161) && _has(c, /\s--script[= ]\S*snmp-sysdescr/) && _hasTarget(c, "10.10.1.30")
    ],
    hints: [
      "Hint 1: SNMP lives on UDP, so a TCP scan will never see it. Nmap also has a script that asks an SNMP agent to describe itself.",
      "Hint 2: Use the UDP scan option on port 161 together with the NSE script named snmp-sysdescr.",
      "Hint 3: nmap -sU -p 161 --script snmp-sysdescr 10.10.1.30"
    ],
    diagnostics: [
      { check: (c) => !/^(sudo )?nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/10\.10\.1\.30/.test(c), msg: "The host is 10.10.1.30." },
      { check: (c) => !/-sU/.test(c), msg: "SNMP runs over UDP. Which scan type probes UDP ports?" },
      { check: (c) => !/161/.test(c), msg: "SNMP listens on UDP port 161." },
      { check: (c) => !/snmp-sysdescr/.test(c), msg: "Which NSE script asks an SNMP agent for its system description?" }
    ],
    tutorNotes: "Teaching point: UDP services need -sU, and NSE scripts turn an open port into readable information. The sysDescr field is free text that administrators sometimes fill carelessly.",
    cehExamTip: "Exam Alert: SNMP uses UDP 161. The system description (sysDescr) reveals OS and hardware details to anyone who knows the community string.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 10:31 UTC
Nmap scan report for 10.10.1.30
Host is up (0.00044s latency).

PORT    STATE SERVICE
161/udp open  snmp
| snmp-sysdescr: Linux ctf-agent 5.15.0-91-generic #101-Ubuntu SMP
|_  System uptime: 12 days, 3:41:07.65 ({{FLAG}})
MAC Address: 00:0C:29:7B:11:5C (VMware)

Nmap done: 1 IP address (1 host up) scanned in 1.91 seconds`,
    flagEnc: "ICAgVhYQFnIFVEEVDAtIECsSTBpabBcKB1A=",
    writeup: "<code>nmap -sU -p 161 --script snmp-sysdescr 10.10.1.30</code> probed the UDP SNMP port and ran a script that reads the agent's description. The note in that text was the flag. A TCP-only scan would never have shown this service."
  },
  {
    id: 133,
    type: "ctf",
    derivedFlag: true,
    pairedWith: 60,
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Read the Flags",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.30 (Linux Server)",
    prompt: "root@parrot:~#",
    scenario: "You want to know whether SSH is reachable on 10.10.1.30. A hand-built TCP probe will show it in the flags of the reply.",
    task: "Send exactly 2 TCP SYN probes to port 22 of 10.10.1.30 and read the TCP flags in the replies. The flag is CEH{reply_flags_<flags in lowercase>}.",
    solution: "hping3 -S -p 22 -c 2 10.10.1.30",
    accepted: [
      (c) => /^(sudo )?hping3\b/.test(_n(c)) && _has(c, /\s-S\s/) && _has(c, /\s-p\s*22\s/) && _has(c, /\s-c\s*2\s/) && _hasTarget(c, "10.10.1.30")
    ],
    hints: [
      "Hint 1: You need a tool that lets you choose the TCP flags of the probe yourself.",
      "Hint 2: Use hping3 with the SYN flag, port 22 and a packet count of 2, aimed at 10.10.1.30.",
      "Hint 3: hping3 -S -p 22 -c 2 10.10.1.30"
    ],
    diagnostics: [
      { check: (c) => !/^(sudo )?hping3\b/i.test(c), msg: "Which tool crafts probe packets by hand?" },
      { check: (c) => !/10\.10\.1\.30/.test(c), msg: "The host is 10.10.1.30." },
      { check: (c) => !/-S\b/.test(c), msg: "A SYN probe uses the capital -S." },
      { check: (c) => !/-p\s*22/.test(c), msg: "SSH listens on port 22." },
      { check: (c) => !/-c\s*2/.test(c), msg: "The mission asks for exactly 2 probes." }
    ],
    tutorNotes: "Teaching point: SA means the port is open, RA means closed. Derived flag: students read the flags field.",
    cehExamTip: "Exam Alert: A SYN/ACK (flags=SA) reply means the port is open; RST/ACK (flags=RA) means closed.",
    output: `HPING 10.10.1.30 (eth0 10.10.1.30): S set, 40 headers + 0 data bytes
len=44 ip=10.10.1.30 ttl=64 DF id=0 sport=22 flags=SA seq=0 win=64240 rtt=0.9 ms
len=44 ip=10.10.1.30 ttl=64 DF id=0 sport=22 flags=SA seq=1 win=64240 rtt=0.8 ms

--- 10.10.1.30 hping statistic ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max = 0.8/0.8/0.9 ms`,
    flagEnc: "ICAgVhERFkEPblUPBA9ePAcHUA==",
    writeup: "<code>hping3 -S -p 22 -c 2 10.10.1.30</code> sent two SYN probes. Both replies carried <code>flags=SA</code> (SYN/ACK), which means port 22 is open, so the flag is <code>CEH{reply_flags_sa}</code>."
  },
  {
    id: 134,
    type: "ctf",
    pairedWith: 61,
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Greeting on the Wrong Port",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.19 (Linux Server)",
    prompt: "root@parrot:~#",
    scenario: "A second mail service was started on 10.10.1.19 on the non-standard port 2525, and its greeting line carries a note from the administrator.",
    task: "Connect to port 2525 of 10.10.1.19 and read what the service says first to find the flag.",
    solution: "nc -v 10.10.1.19 2525",
    accepted: [
      (c) => /^(nc|ncat)\b/.test(_n(c)) && _hasTarget(c, "10.10.1.19") && _hasTarget(c, "2525")
    ],
    hints: [
      "Hint 1: Services often speak first when you connect. You only need a tool that opens a raw connection.",
      "Hint 2: Use netcat (verbose is helpful) to connect to 10.10.1.19 on port 2525.",
      "Hint 3: nc -v 10.10.1.19 2525"
    ],
    diagnostics: [
      { check: (c) => !/^(nc|ncat)\b/i.test(c), msg: "Which tool opens a raw network connection? Think netcat." },
      { check: (c) => !/10\.10\.1\.19/.test(c), msg: "The host is 10.10.1.19." },
      { check: (c) => !/\b2525\b/.test(c), msg: "The service listens on port 2525." }
    ],
    tutorNotes: "Teaching point: banner grabbing is just connecting and reading. Non-standard ports do not hide a service from a tester who checks.",
    cehExamTip: "Exam Alert: Banner grabbing reads the greeting a service sends on connect. Changing the port does not change what the banner reveals.",
    output: `Connection to 10.10.1.19 2525 port [tcp/*] succeeded!
220 mail2.ctf.lab ESMTP Postfix ({{FLAG}})`,
    flagEnc: "ICAgVgEVCEMTQ0A8DA9DDAYDcgZeQRc6BlgOFgNfBUw=",
    writeup: "<code>nc -v 10.10.1.19 2525</code> connected and printed the service's greeting. The administrator had put a note in the banner. Moving a service to another port does not stop banner grabbing."
  },
  {
    id: 135,
    type: "ctf",
    derivedFlag: true,
    pairedWith: 62,
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Needle in the Subnet",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.0/24",
    prompt: "root@parrot:~#",
    scenario: "Exactly one machine on 10.10.1.0/24 runs a service on port 8080. Use the high-speed scanner, at a polite 500 packets per second, to find it.",
    task: "Sweep 10.10.1.0/24 for open port 8080 at a rate of 500. The flag is CEH{8080_on_<last octet of the host's IP>}.",
    solution: "masscan 10.10.1.0/24 -p8080 --rate 500",
    accepted: [
      (c) => /^(sudo )?masscan\b/.test(_n(c)) && _has(c, /\s-p\s*8080\s/) && _has(c, /\s--rate[ =]500\s/) && _hasTarget(c, "10.10.1.0/24")
    ],
    hints: [
      "Hint 1: Nmap is not the only scanner. One tool is built to sweep whole ranges very fast and has a speed setting.",
      "Hint 2: Use masscan on the whole subnet, port 8080, with the rate option set to 500.",
      "Hint 3: masscan 10.10.1.0/24 -p8080 --rate 500"
    ],
    diagnostics: [
      { check: (c) => !/^(sudo )?masscan\b/i.test(c), msg: "Which very fast scanner is built for whole ranges? Think masscan." },
      { check: (c) => !/10\.10\.1\.0\/24/.test(c), msg: "Sweep the whole subnet: 10.10.1.0/24." },
      { check: (c) => !/-p\s*8080/.test(c), msg: "The port to look for is 8080." },
      { check: (c) => !/--rate/.test(c), msg: "Set the speed with --rate 500." }
    ],
    tutorNotes: "Teaching point: masscan is fast, so the rate matters. Derived flag: students read the address of the one host that answers.",
    cehExamTip: "Exam Alert: masscan -p chooses ports and --rate sets packets per second. A high rate can overload fragile network devices.",
    output: `Starting masscan 1.3.2 (http://bit.ly/14GZzcT) at 2026-10-21 10:44:09 GMT
Initiating SYN Stealth Scan
Scanning 256 hosts [1 port/host]
Discovered open port 8080/tcp on 10.10.1.30`,
    flagEnc: "ICAgVltEXh0pXl08VlhQ",
    writeup: "<code>masscan 10.10.1.0/24 -p8080 --rate 500</code> swept the subnet for port 8080. Only 10.10.1.30 answered, so the flag is <code>CEH{8080_on_30}</code>."
  },
  {
    id: 136,
    type: "ctf",
    derivedFlag: true,
    pairedWith: 63,
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Who Made That Device?",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.3.0/24 (Local Segment)",
    prompt: "root@parrot:~#",
    scenario: "Your laptop is plugged into a segment with several unknown devices. ARP replies carry the hardware vendor of each device, and one of them, 10.10.3.7, looks like a wireless access point.",
    task: "List the devices on your own network and find the hardware vendor of 10.10.3.7. The flag is CEH{vendor_<first word of the vendor name in lowercase>}.",
    solution: "arp-scan -l",
    accepted: [
      (c) => /^(sudo )?arp-scan\b/.test(_n(c)) && _has(c, /\s(-l|--localnet)\s/)
    ],
    hints: [
      "Hint 1: On your own subnet, devices cannot ignore ARP. There is a scanner that uses exactly that and also shows the vendor.",
      "Hint 2: Use arp-scan with the option that scans your own local network.",
      "Hint 3: arp-scan -l"
    ],
    diagnostics: [
      { check: (c) => !/^(sudo )?arp-scan\b/i.test(c), msg: "Which scanner uses ARP to list the devices on your own network?" },
      { check: (c) => !/-l\b|--localnet/.test(c), msg: "Scan your own network with the local-network option." }
    ],
    tutorNotes: "Teaching point: the vendor comes from the first half of the MAC address (the OUI). Derived flag: students read the vendor column.",
    cehExamTip: "Exam Alert: ARP scanning works only on the local Layer 2 segment, and the MAC address prefix (OUI) identifies the hardware vendor.",
    output: `Interface: eth0, type: EN10MB, MAC: 00:0c:29:3b:1e:77, IPv4: 10.10.3.50
Starting arp-scan 1.10.0 with 256 hosts (https://github.com/royhills/arp-scan)
10.10.3.1       fc:ec:da:11:22:33       Ubiquiti Networks Inc.
10.10.3.7       24:5a:4c:9d:7e:10       Ubiquiti Networks Inc.
10.10.3.12      00:0c:29:a1:62:0d       VMware, Inc.
10.10.3.20      b8:27:eb:44:19:ce       Raspberry Pi Foundation

4 packets received by filter, 0 packets dropped by kernel
Ending arp-scan 1.10.0: 256 hosts scanned in 1.806 seconds (141.75 hosts/sec). 4 responded`,
    flagEnc: "ICAgVhURCEkZQ2wWBwFcFh0SRAs=",
    writeup: "<code>arp-scan -l</code> listed every device on the local segment with its MAC address and vendor. 10.10.3.7 belongs to Ubiquiti Networks, so the flag is <code>CEH{vendor_ubiquiti}</code>."
  }
);
