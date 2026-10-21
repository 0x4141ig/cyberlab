// ============================================================================
// TOOL LABS: Modules 1 and 2 (second batch)
// ----------------------------------------------------------------------------
// 52 arp, 53 netstat, 54 ip and ipconfig, 55 host, 56 dnsrecon, 57 wget,
// 58 whatweb, 59 theHarvester.
// Same format as lab_questions.js (see AUTHORING.md). Helpers _ln, _lhas and
// _ltarget come from lab_questions.js.
// ============================================================================

// Options of a command as a flat lowercase list: "-tuln" becomes -t -u -l -n,
// and the long forms are mapped to their short letter (--numeric becomes -n).
const _m12lo = (c) => {
  const long = { "--all": "-a", "--numeric": "-n", "--tcp": "-t", "--udp": "-u", "--listening": "-l", "--program": "-p" };
  const out = [];
  _ln(c).toLowerCase().split(" ").slice(1).forEach((t) => {
    if (long[t]) out.push(long[t]);
    else if (/^-[a-z]+$/.test(t)) t.slice(1).split("").forEach((ch) => out.push("-" + ch));
  });
  return out;
};

LAB_QUESTIONS.push(
  // ---------------------------------------------------------------- ARP
  {
    id: 52,
    placeAfter: 2,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "Arp: Neighbours on the LAN",
    difficulty: "Beginner",
    points: 100,
    target: "10.10.1.0/24 (local network)",
    prompt: "root@parrot:~#",
    scenario: "Every host on a local network keeps a small cache that links IP addresses to hardware (MAC) addresses. Reading that cache tells a tester which neighbours were recently active, and it is also the table that an ARP spoofing attack tries to poison.",
    tutorNotes: "Teaching Talking Point: ARP works at Layer 2 and has no authentication, so any host can answer for any IP. Show that every MAC in the lab starts with 00:50:56 (the VMware vendor prefix, called the OUI) and that the last byte matches the last octet of the IP in hex (10.10.1.22 is 0x16). Step 3 introduces 'ip neigh', the modern replacement for the deprecated net-tools arp command. Step 4 shows that Windows keeps the same table but groups it by interface.",
    cehExamTip: "Exam Alert: ARP maps IPv4 addresses to MAC addresses and works only inside one broadcast domain. ARP spoofing (poisoning) sends forged ARP replies so that a victim maps the gateway's IP to the attacker's MAC: a classic man-in-the-middle and sniffing technique. Use 'arp -a' on both Linux and Windows to inspect the cache.",
    analysisQuestion: {
      prompt: "Why can an attacker on the same LAN poison a victim's ARP cache and intercept its traffic?",
      options: [
        { text: "ARP has no authentication, so a forged reply can overwrite the IP-to-MAC mapping of the gateway", correct: true },
        { text: "ARP replies are encrypted with a key the attacker can guess", correct: false },
        { text: "The ARP cache is stored in the cloud and can be edited remotely", correct: false },
        { text: "ARP only works across the Internet, so any remote host can answer", correct: false }
      ],
      explanation: "ARP trusts every reply it receives. A forged reply that maps the gateway's IP to the attacker's MAC is accepted and cached, so the victim sends its traffic to the attacker (ARP spoofing)."
    },
    steps: [
      {
        label: "All entries (-a)",
        task: "Display the ARP cache of this machine with every known neighbour listed by name and address.",
        solution: "arp -a",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^arp\b/.test(_ln(c)) && o.includes("-a") && !o.includes("-n") && !o.includes("-d") && !o.includes("-s");
          }
        ],
        hint: "Type 'arp' with the '-a' option (show all entries).",
        diagnostics: [
          { check: (c) => !/^arp\b/.test(c), msg: "Use the 'arp' command to read the ARP cache." },
          { check: (c) => /\s-[a-zA-Z]*n/.test(c), msg: "-n (numeric) is the next step. Here just show all entries with -a." },
          { check: (c) => !/\s-a\b/.test(c), msg: "The option that shows all entries is -a." }
        ],
        highlightText: "00:50:56:aa:01:16",
        output: `gateway.corp.local (10.10.1.1) at 00:50:56:aa:01:01 [ether] on eth0
dc01.corp.local (10.10.1.2) at 00:50:56:aa:01:02 [ether] on eth0
fw-internal.corp.local (10.10.1.5) at 00:50:56:aa:01:05 [ether] on eth0
? (10.10.1.11) at 00:50:56:aa:01:0b [ether] on eth0
db-internal.corp.local (10.10.1.15) at 00:50:56:aa:01:0f [ether] on eth0
win-server-2022.corp.local (10.10.1.22) at 00:50:56:aa:01:16 [ether] on eth0
mail.certifiedhacker.com (10.10.1.25) at 00:50:56:aa:01:19 [ether] on eth0`,
        analysisQuestion: {
          prompt: "Each line of the arp output links two kinds of address. Which ones?",
          options: [
            { text: "An IP address (Layer 3) to a MAC address (Layer 2)", correct: true },
            { text: "A domain name to a web server banner", correct: false },
            { text: "A TCP port to a process name", correct: false },
            { text: "A username to a password hash", correct: false }
          ],
          explanation: "The ARP cache maps IPv4 addresses to the MAC addresses of the neighbours that answered ARP requests, for example 10.10.1.22 at 00:50:56:aa:01:16."
        }
      },
      {
        label: "Numeric table (-n)",
        task: "Show the same cache as a compact table with raw IP addresses only, without name resolution.",
        solution: "arp -n",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^arp\b/.test(_ln(c)) && o.includes("-n") && !o.includes("-a") && !o.includes("-d") && !o.includes("-s");
          }
        ],
        hint: "Use '-n' on its own. It skips reverse DNS and prints the table with the HWaddress column.",
        diagnostics: [
          { check: (c) => !/^arp\b/.test(c), msg: "Use the 'arp' command." },
          { check: (c) => /\s-[a-zA-Z]*a/.test(c), msg: "-a prints the BSD-style list with names. For the compact table use -n on its own." },
          { check: (c) => !/\s(-[a-zA-Z]*n|--numeric)\b/.test(c), msg: "The option for numeric output (no name lookups) is -n." }
        ],
        highlightText: "00:50:56:aa:01:16",
        output: `Address                  HWtype  HWaddress           Flags Mask            Iface
10.10.1.1                ether   00:50:56:aa:01:01   C                     eth0
10.10.1.2                ether   00:50:56:aa:01:02   C                     eth0
10.10.1.5                ether   00:50:56:aa:01:05   C                     eth0
10.10.1.11               ether   00:50:56:aa:01:0b   C                     eth0
10.10.1.15               ether   00:50:56:aa:01:0f   C                     eth0
10.10.1.22               ether   00:50:56:aa:01:16   C                     eth0
10.10.1.25               ether   00:50:56:aa:01:19   C                     eth0`
      },
      {
        label: "Modern replacement (ip neigh)",
        task: "The arp command is deprecated on modern Linux. Show the neighbour table with the 'ip' command instead.",
        solution: "ip neigh show",
        accepted: [
          (c) => /^ip\s+(-\S+\s+)*(neigh|neighbor|neighbour|n)(\s+(show|list)\b.*)?$/.test(_ln(c))
        ],
        hint: "The sub-command for the ARP/neighbour table is 'neigh': type 'ip neigh show'.",
        diagnostics: [
          { check: (c) => !/^ip\b/.test(c), msg: "Use the 'ip' command from the iproute2 suite." },
          { check: (c) => /^ip\s+(-\S+\s+)*(a|addr|address|r|route)\b/.test(c), msg: "That sub-command shows addresses or routes. Neighbour (ARP) entries live under 'neigh'." },
          { check: (c) => !/neigh/.test(c), msg: "The sub-command for the ARP/neighbour table is 'neigh'." },
          { check: (c) => /\s(flush|add|del|delete|change|replace)\b/.test(c), msg: "Only read the table here: use 'show'." }
        ],
        highlightText: "REACHABLE",
        output: `10.10.1.1 dev eth0 lladdr 00:50:56:aa:01:01 REACHABLE
10.10.1.2 dev eth0 lladdr 00:50:56:aa:01:02 STALE
10.10.1.5 dev eth0 lladdr 00:50:56:aa:01:05 REACHABLE
10.10.1.11 dev eth0 lladdr 00:50:56:aa:01:0b STALE
10.10.1.15 dev eth0 lladdr 00:50:56:aa:01:0f STALE
10.10.1.22 dev eth0 lladdr 00:50:56:aa:01:16 DELAY
10.10.1.25 dev eth0 lladdr 00:50:56:aa:01:19 STALE
fe80::250:56ff:feaa:101 dev eth0 lladdr 00:50:56:aa:01:01 router STALE`,
        analysisQuestion: {
          prompt: "In the 'ip neigh' output, what does the state REACHABLE mean?",
          options: [
            { text: "The neighbour answered recently, so the cached MAC address is confirmed as valid", correct: true },
            { text: "The neighbour has an open web server", correct: false },
            { text: "The entry was added manually by an administrator", correct: false },
            { text: "The neighbour is blocked by the firewall", correct: false }
          ],
          explanation: "REACHABLE means reachability was confirmed recently. STALE entries are still usable but will be re-verified before the next use."
        }
      },
      {
        label: "Windows syntax (arp -a)",
        prompt: "C:\\Users\\Administrator>",
        target: "10.10.1.11 (Windows workstation)",
        task: "You are now on a Windows workstation. Display its ARP table.",
        solution: "arp -a",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^arp\b/i.test(_ln(c)) && (o.includes("-a") || o.includes("-g")) && !o.includes("-d") && !o.includes("-s");
          }
        ],
        hint: "On Windows the list option is also '-a'. There is no '-n' here.",
        diagnostics: [
          { check: (c) => !/^arp\b/i.test(c), msg: "Use the 'arp' command." },
          { check: (c) => /\s-n\b|neigh/.test(c), msg: "-n and 'ip neigh' are Linux syntax. On Windows the whole table is printed with -a." },
          { check: (c) => !/\s-[ag]\b/i.test(c), msg: "On Windows the option that displays the ARP table is -a." }
        ],
        highlightText: "10.10.1.22            00-50-56-aa-01-16     dynamic",
        output: `Interface: 10.10.1.11 --- 0x6
  Internet Address      Physical Address      Type
  10.10.1.1             00-50-56-aa-01-01     dynamic
  10.10.1.2             00-50-56-aa-01-02     dynamic
  10.10.1.22            00-50-56-aa-01-16     dynamic
  10.10.1.25            00-50-56-aa-01-19     dynamic
  10.10.1.255           ff-ff-ff-ff-ff-ff     static
  224.0.0.22            01-00-5e-00-00-16     static
  224.0.0.251           01-00-5e-00-00-fb     static
  239.255.255.250       01-00-5e-7f-ff-fa     static`,
        analysisQuestion: {
          prompt: "In the Windows ARP table, what does the Type 'dynamic' mean?",
          options: [
            { text: "The entry was learned through ARP traffic and expires after a few minutes", correct: true },
            { text: "The entry was typed in by an administrator and never expires", correct: false },
            { text: "The host is using a dynamic DNS name", correct: false },
            { text: "The MAC address changes every second", correct: false }
          ],
          explanation: "Dynamic entries are learned automatically and time out. Static entries are added manually (arp -s) or are built in, like the broadcast and multicast rows."
        }
      }
    ]
  },

  // ---------------------------------------------------------------- NETSTAT
  {
    id: 53,
    placeAfter: 52,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "Netstat: Connections and Listening Ports",
    difficulty: "Beginner",
    points: 100,
    target: "localhost (your workstation)",
    prompt: "root@parrot:~#",
    scenario: "After you land on a machine, you want to know what it is talking to and which services wait for connections. Netstat lists every socket, and with the right options it also tells you which program owns each port.",
    tutorNotes: "Teaching Talking Point: A LISTEN socket is a service waiting for connections (a possible entry point), ESTABLISHED is a live conversation. 0.0.0.0 means 'all interfaces', 127.0.0.1 means 'local only'. The -p option needs root to see other users' processes. Netstat is part of the old net-tools package: on newer systems 'ss -tulnp' gives the same view. Step 4 shows the Windows syntax: -o adds the PID, and 'tasklist /FI \"PID eq 1128\"' turns it into a process name.",
    cehExamTip: "Exam Alert: Netstat is used to find open ports, active connections and the process behind them. Unexpected LISTENING ports and ESTABLISHED sessions to unknown external IPs are classic signs of a backdoor or reverse shell. Linux: netstat -tulnp. Windows: netstat -ano.",
    analysisQuestion: {
      prompt: "You see 'tcp 0.0.0.0:80 LISTEN' and 'tcp 127.0.0.1:631 LISTEN'. What is the security difference?",
      options: [
        { text: "Port 80 accepts connections from other hosts; port 631 only accepts local connections", correct: true },
        { text: "Port 631 is encrypted and port 80 is not", correct: false },
        { text: "Port 80 is closed and port 631 is open", correct: false },
        { text: "There is no difference, both addresses mean the same", correct: false }
      ],
      explanation: "0.0.0.0 means the service is bound to every interface and reachable from the network. 127.0.0.1 is the loopback address: only programs on the same machine can connect."
    },
    steps: [
      {
        label: "All sockets (-an)",
        task: "List all sockets, both listening and connected, with numeric addresses and port numbers.",
        solution: "netstat -an",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^netstat\b/.test(_ln(c)) && o.includes("-a") && o.includes("-n") && !o.includes("-l") && !o.includes("-p");
          }
        ],
        hint: "Combine '-a' (all sockets) and '-n' (numeric): 'netstat -an'.",
        diagnostics: [
          { check: (c) => !/^netstat\b/.test(c), msg: "Use the 'netstat' command." },
          { check: (c) => !_m12lo(c).includes("-a"), msg: "-a shows all sockets, listening and connected." },
          { check: (c) => !_m12lo(c).includes("-n"), msg: "-n shows IP addresses and port numbers instead of names." },
          { check: (c) => _m12lo(c).includes("-l") || _m12lo(c).includes("-p"), msg: "-l and -p come in the next steps. Here use -a and -n only." }
        ],
        highlightText: "10.10.1.50:22           10.10.1.11:51514        ESTABLISHED",
        output: `Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN
tcp        0      0 10.10.1.50:22           10.10.1.11:51514        ESTABLISHED
tcp        0      0 10.10.1.50:45822        10.10.1.22:80           ESTABLISHED
tcp        0      0 10.10.1.50:39104        10.10.1.25:25           TIME_WAIT
tcp6       0      0 :::22                   :::*                    LISTEN
udp        0      0 127.0.0.53:53           0.0.0.0:*
udp        0      0 0.0.0.0:68              0.0.0.0:*
udp        0      0 0.0.0.0:5353            0.0.0.0:*`,
        analysisQuestion: {
          prompt: "What does the TCP state ESTABLISHED mean?",
          options: [
            { text: "A TCP connection is open and both sides can exchange data", correct: true },
            { text: "A service is waiting for new connections", correct: false },
            { text: "The connection was refused by a firewall", correct: false },
            { text: "The port is closed and no program uses it", correct: false }
          ],
          explanation: "ESTABLISHED means the three-way handshake is complete. LISTEN is the state of a service waiting for a client."
        }
      },
      {
        label: "Listening ports (-tuln)",
        task: "Show only the services that are waiting for connections: TCP and UDP listeners, numeric.",
        solution: "netstat -tuln",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^netstat\b/.test(_ln(c)) && o.includes("-t") && o.includes("-u") && o.includes("-l") && o.includes("-n") && !o.includes("-p");
          }
        ],
        hint: "Use '-t' (TCP), '-u' (UDP), '-l' (listening only) and '-n' (numeric): 'netstat -tuln'.",
        diagnostics: [
          { check: (c) => !/^netstat\b/.test(c), msg: "Use the 'netstat' command." },
          { check: (c) => !_m12lo(c).includes("-l"), msg: "-l limits the output to listening sockets." },
          { check: (c) => !_m12lo(c).includes("-t") || !_m12lo(c).includes("-u"), msg: "Use -t for TCP and -u for UDP." },
          { check: (c) => !_m12lo(c).includes("-n"), msg: "Add -n so addresses and ports are numeric." },
          { check: (c) => _m12lo(c).includes("-p"), msg: "The program/PID option (-p) is the next step. Use -tuln here." }
        ],
        highlightText: "0.0.0.0:80",
        output: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN
tcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN
tcp6       0      0 :::22                   :::*                    LISTEN
udp        0      0 127.0.0.53:53           0.0.0.0:*
udp        0      0 0.0.0.0:68              0.0.0.0:*
udp        0      0 0.0.0.0:5353            0.0.0.0:*`,
        analysisQuestion: {
          prompt: "Why is a port in the LISTEN state interesting to an attacker?",
          options: [
            { text: "A program is waiting for connections there, so it is a possible entry point", correct: true },
            { text: "It proves the machine has no firewall", correct: false },
            { text: "It shows the password of the service", correct: false },
            { text: "It means the port is blocked", correct: false }
          ],
          explanation: "Every listening port is an exposed service. Attackers enumerate them to find software with known weaknesses."
        }
      },
      {
        label: "Owning program (-p)",
        task: "Now also show which process ID and program name owns each listening port.",
        solution: "netstat -tulnp",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^netstat\b/.test(_ln(c)) && o.includes("-p") && o.includes("-l");
          }
        ],
        hint: "Add '-p' to the previous command: 'netstat -tulnp' (run as root).",
        diagnostics: [
          { check: (c) => !/^netstat\b/.test(c), msg: "Use the 'netstat' command." },
          { check: (c) => !_m12lo(c).includes("-p"), msg: "The option that adds the PID/program name column is -p." },
          { check: (c) => !_m12lo(c).includes("-l"), msg: "Keep -l (listening sockets) from the previous step." }
        ],
        highlightText: "1044/apache2",
        output: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      812/sshd: /usr/sbin
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1044/apache2
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN      611/systemd-resolve
tcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN      702/cupsd
tcp6       0      0 :::22                   :::*                    LISTEN      812/sshd: /usr/sbin
udp        0      0 127.0.0.53:53           0.0.0.0:*                           611/systemd-resolve
udp        0      0 0.0.0.0:68              0.0.0.0:*                           688/dhclient
udp        0      0 0.0.0.0:5353            0.0.0.0:*                           655/avahi-daemon: r`,
        analysisQuestion: {
          prompt: "Which program is listening on TCP port 80 in this output?",
          options: [
            { text: "apache2 (PID 1044)", correct: true },
            { text: "sshd (PID 812)", correct: false },
            { text: "cupsd (PID 702)", correct: false },
            { text: "dhclient (PID 688)", correct: false }
          ],
          explanation: "The PID/Program name column maps each port to its process: 0.0.0.0:80 belongs to 1044/apache2."
        }
      },
      {
        label: "Windows syntax (-ano)",
        prompt: "C:\\Users\\Administrator>",
        target: "10.10.1.22 (Windows Server 2022)",
        task: "You are now on the Windows server. List all connections and listening ports, numeric, together with the owning process ID.",
        solution: "netstat -ano",
        accepted: [
          (c) => {
            const o = _m12lo(c);
            return /^netstat\b/i.test(_ln(c)) && o.includes("-a") && o.includes("-n") && o.includes("-o");
          }
        ],
        hint: "On Windows: '-a' all, '-n' numeric, '-o' owning process ID. Together: 'netstat -ano'.",
        diagnostics: [
          { check: (c) => !/^netstat\b/i.test(c), msg: "Use the 'netstat' command." },
          { check: (c) => /\s-[a-zA-Z]*[tul]/.test(c) && !/\s-[a-zA-Z]*o/.test(c), msg: "That is the Linux syntax (-tuln). On Windows use -a (all), -n (numeric) and -o (owning PID): -ano." },
          { check: (c) => !_m12lo(c).includes("-o"), msg: "The option that adds the PID column on Windows is -o." },
          { check: (c) => !_m12lo(c).includes("-a") || !_m12lo(c).includes("-n"), msg: "Combine -a (all connections and listening ports) and -n (numeric) with -o." }
        ],
        highlightText: "0.0.0.0:3389           0.0.0.0:0              LISTENING       1128",
        output: `Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       904
  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:3389           0.0.0.0:0              LISTENING       1128
  TCP    10.10.1.22:3389        10.10.1.50:50412       ESTABLISHED     1128
  TCP    10.10.1.22:49688       10.10.1.2:389          ESTABLISHED     640
  UDP    0.0.0.0:161            *:*                                    2216
  UDP    10.10.1.22:53          *:*                                    1980`,
        analysisQuestion: {
          prompt: "Windows netstat shows PID 1128 on port 3389. How do you find out which program that is?",
          options: [
            { text: "Look the PID up with tasklist or in Task Manager (Details tab)", correct: true },
            { text: "Run netstat again with -z", correct: false },
            { text: "A PID cannot be mapped to a program", correct: false },
            { text: "Ping the PID number", correct: false }
          ],
          explanation: "netstat -o only gives the number. 'tasklist /FI \"PID eq 1128\"' or Task Manager translates it to a process name (here the Remote Desktop service)."
        }
      }
    ]
  },

  // ---------------------------------------------------------------- IP and IPCONFIG
  {
    id: 54,
    placeAfter: 53,
    module: 1,
    moduleTitle: "Module 01: Introduction to Ethical Hacking",
    title: "IP and Ipconfig: Network Configuration",
    difficulty: "Beginner",
    points: 100,
    target: "localhost (your workstation)",
    prompt: "root@parrot:~#",
    scenario: "Before attacking anything you must know your own position on the network: your address, your subnet and your way out. Linux uses the 'ip' command for this and Windows uses 'ipconfig'.",
    tutorNotes: "Teaching Talking Point: 'ip' (iproute2) replaced ifconfig, route and arp. 'ip a' shows addresses (10.10.1.50/24 is the CIDR form of mask 255.255.255.0), 'ip route' shows the default gateway. Windows 'ipconfig' is the short view, 'ipconfig /all' adds MAC, DHCP and DNS servers. In an Active Directory network the DNS server is almost always a domain controller, which is a high-value target.",
    cehExamTip: "Exam Alert: 'ipconfig /all' (Windows) and 'ip a' / 'ifconfig' (Linux) show IP, MAC, DHCP and DNS configuration. The default gateway is the router that carries all traffic leaving the subnet: a prime target for sniffing and man-in-the-middle attacks.",
    analysisQuestion: {
      prompt: "Why is the default gateway interesting to a penetration tester?",
      options: [
        { text: "All traffic leaving the subnet passes through it, so it is the next hop to map and a prime interception point", correct: true },
        { text: "It stores all user passwords of the network", correct: false },
        { text: "It is always the domain controller", correct: false },
        { text: "It is the only host that answers ping", correct: false }
      ],
      explanation: "Packets for any destination outside the local subnet are sent to the default gateway. Mapping it shows where the network leads, and controlling it (for example by ARP spoofing) lets an attacker see that traffic."
    },
    steps: [
      {
        label: "Addresses (ip a)",
        task: "Show all network interfaces of this Linux machine with their IP addresses.",
        solution: "ip a",
        accepted: [
          (c) => /^ip\s+(-\S+\s+)*(a|addr|address)(\s+(show|list)(\s+\S+)*)?$/.test(_ln(c))
        ],
        hint: "Type 'ip a' (short for 'ip addr show').",
        diagnostics: [
          { check: (c) => /^ifconfig\b/.test(c), msg: "ifconfig is the legacy tool. Practise the modern 'ip' command." },
          { check: (c) => !/^ip\b/.test(c), msg: "Use the 'ip' command (on Windows the equivalent is ipconfig)." },
          { check: (c) => /^ip\s+(-\S+\s+)*(r|route)\b/.test(c), msg: "'route' is the next step. To list addresses use 'a' (short for addr)." },
          { check: (c) => !/^ip\s+(-\S+\s+)*(a|addr|address)\b/.test(c), msg: "The sub-command that lists addresses is 'a' (short for 'addr')." }
        ],
        highlightText: "inet 10.10.1.50/24",
        output: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 00:50:56:aa:01:32 brd ff:ff:ff:ff:ff:ff
    inet 10.10.1.50/24 brd 10.10.1.255 scope global dynamic eth0
       valid_lft 84312sec preferred_lft 84312sec
    inet6 fe80::250:56ff:feaa:132/64 scope link
       valid_lft forever preferred_lft forever`,
        analysisQuestion: {
          prompt: "What does the /24 in 'inet 10.10.1.50/24' mean?",
          options: [
            { text: "The subnet mask is 255.255.255.0: the first 24 bits identify the network", correct: true },
            { text: "The host has 24 open ports", correct: false },
            { text: "The address lease lasts 24 hours", correct: false },
            { text: "The interface is the 24th on the system", correct: false }
          ],
          explanation: "/24 is CIDR notation for 255.255.255.0. The network is 10.10.1.0 and hosts range from 10.10.1.1 to 10.10.1.254."
        }
      },
      {
        label: "Routing table (ip route)",
        task: "Find the default gateway of this machine by showing its routing table.",
        solution: "ip route",
        accepted: [
          (c) => /^ip\s+(-\S+\s+)*(route|r)(\s+(show|list)(\s+\S+)*)?$/.test(_ln(c))
        ],
        hint: "The routing table lives under 'route': type 'ip route'.",
        diagnostics: [
          { check: (c) => !/^ip\b/.test(c), msg: "Use the 'ip' command." },
          { check: (c) => /^ip\s+(-\S+\s+)*(a|addr|address)\b/.test(c), msg: "That lists addresses. The routing table is under 'route'." },
          { check: (c) => !/route|\sr\b/.test(c), msg: "The sub-command for the routing table is 'route'." }
        ],
        highlightText: "default via 10.10.1.1",
        output: `default via 10.10.1.1 dev eth0 proto dhcp metric 100
10.10.1.0/24 dev eth0 proto kernel scope link src 10.10.1.50 metric 100`,
        analysisQuestion: {
          prompt: "What does the line 'default via 10.10.1.1' tell you?",
          options: [
            { text: "Traffic for any network not listed in the table is sent to 10.10.1.1", correct: true },
            { text: "10.10.1.1 is the only host this machine may talk to", correct: false },
            { text: "10.10.1.1 is the DNS server", correct: false },
            { text: "The interface eth0 is disabled by default", correct: false }
          ],
          explanation: "The default route is the catch-all. Anything that does not match a more specific route, such as the local 10.10.1.0/24 subnet, goes to the default gateway."
        }
      },
      {
        label: "Windows ipconfig",
        prompt: "C:\\Users\\Administrator>",
        target: "10.10.1.11 (Windows workstation)",
        task: "You are now on a Windows workstation. Show its IP configuration with the basic Windows command.",
        solution: "ipconfig",
        accepted: [/^ipconfig$/i],
        hint: "Just type 'ipconfig' with no switches.",
        diagnostics: [
          { check: (c) => !/^ipconfig/i.test(c), msg: "On Windows the command is 'ipconfig' (Linux uses 'ip')." },
          { check: (c) => /\/\w+|\s-\w+/.test(c), msg: "Run the plain command first. The /all switch comes in the next step." }
        ],
        highlightText: "Default Gateway . . . . . . . . . : 10.10.1.1",
        output: `Windows IP Configuration


Ethernet adapter Ethernet0:

   Connection-specific DNS Suffix  . : corp.local
   Link-local IPv6 Address . . . . . : fe80::4c3a:9f1e:21b7:5d02%6
   IPv4 Address. . . . . . . . . . . : 10.10.1.11
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.10.1.1`
      },
      {
        label: "Full details (/all)",
        prompt: "C:\\Users\\Administrator>",
        target: "10.10.1.11 (Windows workstation)",
        task: "Now display the complete configuration, including the MAC address, DHCP server and DNS servers.",
        solution: "ipconfig /all",
        accepted: [/^ipconfig\s+\/all$/i],
        hint: "Windows switches start with a slash: 'ipconfig /all'.",
        diagnostics: [
          { check: (c) => !/^ipconfig/i.test(c), msg: "Use the 'ipconfig' command." },
          { check: (c) => /\s-+all\b/i.test(c), msg: "Windows switches use a slash, not a dash: /all." },
          { check: (c) => !/\/all\b/i.test(c), msg: "The switch that shows every detail is /all." }
        ],
        highlightText: "DNS Servers . . . . . . . . . . . : 10.10.1.2",
        output: `Windows IP Configuration

   Host Name . . . . . . . . . . . . : WS-FINANCE01
   Primary Dns Suffix  . . . . . . . : corp.local
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No
   DNS Suffix Search List. . . . . . : corp.local

Ethernet adapter Ethernet0:

   Connection-specific DNS Suffix  . : corp.local
   Description . . . . . . . . . . . : Intel(R) 82574L Gigabit Network Connection
   Physical Address. . . . . . . . . : 00-50-56-AA-01-0B
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   Link-local IPv6 Address . . . . . : fe80::4c3a:9f1e:21b7:5d02%6(Preferred)
   IPv4 Address. . . . . . . . . . . : 10.10.1.11(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Lease Obtained. . . . . . . . . . : Wednesday, October 21, 2026 8:02:11 AM
   Lease Expires . . . . . . . . . . : Thursday, October 22, 2026 8:02:11 AM
   Default Gateway . . . . . . . . . : 10.10.1.1
   DHCP Server . . . . . . . . . . . : 10.10.1.2
   DNS Servers . . . . . . . . . . . : 10.10.1.2
   NetBIOS over Tcpip. . . . . . . . : Enabled`,
        analysisQuestion: {
          prompt: "In an Active Directory network, the DNS server 10.10.1.2 is most likely which kind of machine?",
          options: [
            { text: "The domain controller (dc01), a high-value target", correct: true },
            { text: "A printer", correct: false },
            { text: "The tester's own laptop", correct: false },
            { text: "A public web server on the Internet", correct: false }
          ],
          explanation: "Domain-joined clients use the domain controller as DNS server because AD relies on DNS records. Seeing it in ipconfig /all reveals where the domain controller is."
        }
      }
    ]
  },

  // ---------------------------------------------------------------- HOST
  {
    id: 55,
    placeAfter: 4,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Host: Quick DNS Lookups",
    difficulty: "Beginner",
    points: 125,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Host is the lightweight DNS lookup tool: one short command, short readable answers. Use it to pull the address, mail servers, name servers and text records of a domain, and to test whether a name server hands out its whole zone.",
    tutorNotes: "Teaching Talking Point: host is the quickest way to read DNS during footprinting. Without options it already prints the address and the mail servers. The -t option chooses the record type, and -l asks for the whole zone (an AXFR transfer). A well-configured public server answers 'REFUSED'. Compare with dig and nslookup from the earlier labs: same data, different style.",
    cehExamTip: "Exam Alert: 'host -t <type> <domain>' queries a specific record type (a, mx, ns, txt, soa). 'host -l <domain> <server>' attempts a zone transfer. MX preference numbers work like priorities: the lowest number is tried first.",
    analysisQuestion: {
      prompt: "Why does 'host -l certifiedhacker.com ns1.bluehost.com' normally fail against a public name server?",
      options: [
        { text: "Zone transfers are restricted to authorised secondary servers, so the request is refused", correct: true },
        { text: "The host command cannot talk to name servers", correct: false },
        { text: "Port 53 is always closed on name servers", correct: false },
        { text: "Zone transfers only work for IP addresses, never for domains", correct: false }
      ],
      explanation: "A properly configured name server only allows AXFR to its secondary servers. A refused transfer is the correct, secure behaviour. A server that answers anyone is a real finding."
    },
    steps: [
      {
        label: "Basic lookup",
        task: "Look up 'certifiedhacker.com' with a plain host query.",
        solution: "host certifiedhacker.com",
        accepted: [/^host\s+certifiedhacker\.com$/i],
        hint: "Type 'host' followed by the domain name. No options are needed.",
        diagnostics: [
          { check: (c) => !/^host\b/.test(c), msg: "Use the 'host' command for a quick DNS lookup." },
          { check: (c) => /\s-/.test(c), msg: "Run the plain lookup first. The options come in the next steps." },
          { check: (c) => !/certifiedhacker\.com/i.test(c), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        highlightText: "certifiedhacker.com has address 162.159.24.80",
        output: `certifiedhacker.com has address 162.159.24.80
certifiedhacker.com mail is handled by 10 mail.certifiedhacker.com.`
      },
      {
        label: "Mail servers (-t mx)",
        task: "Ask only for the mail exchanger (MX) record of 'certifiedhacker.com'.",
        solution: "host -t mx certifiedhacker.com",
        accepted: [
          (c) => /^host\b/.test(_ln(c)) && _lhas(c, /\s-t\s*mx\s/i) && _ltarget(c, "certifiedhacker.com")
        ],
        hint: "The '-t' option chooses the record type: 'host -t mx certifiedhacker.com'.",
        diagnostics: [
          { check: (c) => !/^host\b/.test(c), msg: "Use the 'host' command." },
          { check: (c) => !/\s-t\b/.test(c), msg: "The option that selects the record type is -t." },
          { check: (c) => !/mx\b/i.test(c), msg: "The record type for mail servers is 'mx'." },
          { check: (c) => !/certifiedhacker\.com/i.test(c), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        highlightText: "10 mail.certifiedhacker.com.",
        output: `certifiedhacker.com mail is handled by 10 mail.certifiedhacker.com.`,
        analysisQuestion: {
          prompt: "What does the number 10 in front of mail.certifiedhacker.com mean?",
          options: [
            { text: "The preference (priority): the lowest number is tried first", correct: true },
            { text: "The server has 10 mailboxes", correct: false },
            { text: "The answer is valid for 10 seconds", correct: false },
            { text: "It is the TCP port of the mail service", correct: false }
          ],
          explanation: "MX records carry a preference value. Mail is delivered to the server with the lowest number, and the others act as backups."
        }
      },
      {
        label: "Name servers (-t ns)",
        task: "Now list the authoritative name servers (NS) of 'certifiedhacker.com'.",
        solution: "host -t ns certifiedhacker.com",
        accepted: [
          (c) => /^host\b/.test(_ln(c)) && _lhas(c, /\s-t\s*ns\s/i) && _ltarget(c, "certifiedhacker.com")
        ],
        hint: "Same pattern as before, with the record type 'ns'.",
        diagnostics: [
          { check: (c) => !/^host\b/.test(c), msg: "Use the 'host' command." },
          { check: (c) => !/\s-t\b/.test(c), msg: "The option that selects the record type is -t." },
          { check: (c) => !/\bns\b/i.test(c), msg: "The record type for name servers is 'ns'." },
          { check: (c) => !/certifiedhacker\.com/i.test(c), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        highlightText: "name server ns1.bluehost.com.",
        output: `certifiedhacker.com name server ns1.bluehost.com.
certifiedhacker.com name server ns2.bluehost.com.`
      },
      {
        label: "Text records (-t txt)",
        task: "Query the TXT records of 'certifiedhacker.com'. They hold SPF policies and verification tokens.",
        solution: "host -t txt certifiedhacker.com",
        accepted: [
          (c) => /^host\b/.test(_ln(c)) && _lhas(c, /\s-t\s*txt\s/i) && _ltarget(c, "certifiedhacker.com")
        ],
        hint: "The record type that holds free-form text is 'txt'.",
        diagnostics: [
          { check: (c) => !/^host\b/.test(c), msg: "Use the 'host' command." },
          { check: (c) => !/\s-t\b/.test(c), msg: "The option that selects the record type is -t." },
          { check: (c) => !/txt\b/i.test(c), msg: "Which record type holds free-form text? 'txt'." },
          { check: (c) => !/certifiedhacker\.com/i.test(c), msg: "Target domain must be 'certifiedhacker.com'." }
        ],
        highlightText: "v=spf1 mx a ip4:10.10.1.0/24 ~all",
        output: `certifiedhacker.com descriptive text "v=spf1 mx a ip4:10.10.1.0/24 ~all"
certifiedhacker.com descriptive text "google-site-verification=Zk3b9Qe1Yw0pXJt8aVd2"`
      },
      {
        label: "Zone transfer attempt (-l)",
        target: "ns1.bluehost.com (certifiedhacker.com)",
        task: "Test whether the name server ns1.bluehost.com will list the whole zone of 'certifiedhacker.com'.",
        solution: "host -l certifiedhacker.com ns1.bluehost.com",
        accepted: [
          (c) =>
            /^host\b/.test(_ln(c)) &&
            (_lhas(c, /\s-l\s/) || _lhas(c, /\s-t\s*axfr\s/i)) &&
            _ltarget(c, "certifiedhacker.com") &&
            _ltarget(c, "ns1.bluehost.com")
        ],
        hint: "Use '-l' (list a zone), then the domain, then the name server to ask: 'host -l certifiedhacker.com ns1.bluehost.com'.",
        diagnostics: [
          { check: (c) => !/^host\b/.test(c), msg: "Use the 'host' command." },
          { check: (c) => !/\s-l\b/.test(c) && !/axfr/i.test(c), msg: "The option that lists a whole zone is -l." },
          { check: (c) => !/certifiedhacker\.com/i.test(c), msg: "Target domain must be 'certifiedhacker.com'." },
          { check: (c) => !/ns1\.bluehost\.com/.test(c), msg: "Name the server to ask after the domain: ns1.bluehost.com." }
        ],
        highlightText: "5(REFUSED)",
        output: `Using domain server:
Name: ns1.bluehost.com
Address: 162.241.216.11#53
Aliases:

Host certifiedhacker.com not found: 5(REFUSED)
; Transfer failed.`,
        analysisQuestion: {
          prompt: "Which transport protocol and port does a zone transfer (AXFR) use?",
          options: [
            { text: "TCP port 53", correct: true },
            { text: "UDP port 53", correct: false },
            { text: "TCP port 80", correct: false },
            { text: "UDP port 161", correct: false }
          ],
          explanation: "Normal DNS queries use UDP 53, but a zone transfer is too large for UDP and always runs over TCP port 53."
        }
      }
    ]
  },

  // ---------------------------------------------------------------- DNSRECON
  {
    id: 56,
    placeAfter: 55,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Dnsrecon: DNS Enumeration",
    difficulty: "Intermediate",
    points: 100,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Dnsrecon automates what you did by hand with dig and host: it collects the standard records, tries a zone transfer, brute-forces subdomain names from a wordlist and reverse-looks-up whole IP ranges.",
    tutorNotes: "Teaching Talking Point: -d selects the domain and -t selects the enumeration type: std (default, standard records), axfr (zone transfer against every name server, or the one given with -n), brt (subdomain brute force with the wordlist from -D). The -r option reverse-resolves an IP range and finds PTR names even when forward records are hidden. Standard enumeration is the default when -t is omitted. Output markers: [*] information, [+] success, [-] nothing found.",
    cehExamTip: "Exam Alert: Dnsrecon enumerates DNS: standard records, zone transfers (axfr), brute force (brt) and reverse lookup of ranges. A successful AXFR returns the complete zone, including internal hostnames that were never meant to be public.",
    analysisQuestion: {
      prompt: "A name server refuses the zone transfer. How can dnsrecon still discover hidden subdomains?",
      options: [
        { text: "With -t brt it guesses names from a wordlist and keeps the ones that resolve", correct: true },
        { text: "By guessing the administrator's password", correct: false },
        { text: "By scanning the web server for vulnerabilities", correct: false },
        { text: "It cannot, a refused transfer ends the investigation", correct: false }
      ],
      explanation: "Brute force sends many normal queries (name.domain) and records every name that gets an answer. It needs no special permission, only a good wordlist."
    },
    steps: [
      {
        label: "Standard scan (-d)",
        task: "Run a standard DNS enumeration of the domain 'certifiedhacker.com'.",
        solution: "dnsrecon -d certifiedhacker.com",
        accepted: [
          (c) =>
            /^dnsrecon\b/.test(_ln(c)) &&
            _lhas(c, /\s(-d|--domain)[\s=]+certifiedhacker\.com\s/) &&
            (!_lhas(c, /\s(-t|--type)[\s=]/) || _lhas(c, /\s(-t|--type)[\s=]+std\s/))
        ],
        hint: "Use '-d' followed by the domain: 'dnsrecon -d certifiedhacker.com'.",
        diagnostics: [
          { check: (c) => !/^dnsrecon\b/.test(c), msg: "Use the 'dnsrecon' command." },
          { check: (c) => !/\s(-d|--domain)\b/.test(c), msg: "The domain to enumerate is given with -d." },
          { check: (c) => !/certifiedhacker\.com/.test(c), msg: "Target domain must be 'certifiedhacker.com'." },
          { check: (c) => /\s(-t|--type)[\s=]+(axfr|brt)/.test(c), msg: "Those types come in the next steps. Run the default scan first." }
        ],
        highlightText: "NS ns1.bluehost.com 162.159.24.80",
        output: `[*] std: Performing General Enumeration against: certifiedhacker.com...
[-] DNSSEC is not configured for certifiedhacker.com
[*]   SOA ns1.bluehost.com 162.159.24.80
[*]   NS ns1.bluehost.com 162.159.24.80
[*]   NS ns2.bluehost.com 162.159.25.175
[*]   MX mail.certifiedhacker.com 10.10.1.25
[*]   A certifiedhacker.com 162.159.24.80
[*]   TXT certifiedhacker.com v=spf1 mx a ip4:10.10.1.0/24 ~all
[*]   TXT certifiedhacker.com google-site-verification=Zk3b9Qe1Yw0pXJt8aVd2
[*] Enumerating SRV Records
[-] No SRV Records Found for certifiedhacker.com`
      },
      {
        label: "Zone transfer (-t axfr -n)",
        target: "10.10.1.22 (DNS Server)",
        task: "Test the DNS server 10.10.1.22 for a zone transfer of 'certifiedhacker.com'.",
        solution: "dnsrecon -d certifiedhacker.com -t axfr -n 10.10.1.22",
        accepted: [
          (c) =>
            /^dnsrecon\b/.test(_ln(c)) &&
            _lhas(c, /\s(-d|--domain)[\s=]+certifiedhacker\.com\s/) &&
            _lhas(c, /\s(-t|--type)[\s=]+axfr\s/) &&
            _lhas(c, /\s(-n|--name_server)[\s=]+10\.10\.1\.22\s/)
        ],
        hint: "Add the type '-t axfr' and aim it at the server with '-n 10.10.1.22'.",
        diagnostics: [
          { check: (c) => !/^dnsrecon\b/.test(c), msg: "Use the 'dnsrecon' command." },
          { check: (c) => !/\s(-d|--domain)\b/.test(c), msg: "The domain is given with -d certifiedhacker.com." },
          { check: (c) => !/\s(-t|--type)[\s=]+axfr/.test(c), msg: "The enumeration type for a zone transfer is -t axfr." },
          { check: (c) => !/\s(-n|--name_server)\b/.test(c), msg: "Name the DNS server to test with -n 10.10.1.22." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "The DNS server to test is 10.10.1.22." }
        ],
        highlightText: "Zone Transfer was successful!!",
        output: `[*] Checking for Zone Transfer for certifiedhacker.com name servers
[*] Resolving SOA Record
[+]   SOA ns1.certifiedhacker.com 10.10.1.22
[*] Resolving NS Records
[*] NS Servers found:
[+]   NS ns1.certifiedhacker.com 10.10.1.22
[*] Trying NS server 10.10.1.22
[+] 10.10.1.22 Has port 53 TCP Open
[+] Zone Transfer was successful!!
[*]   SOA ns1.certifiedhacker.com 10.10.1.22
[*]   NS ns1.certifiedhacker.com 10.10.1.22
[*]   MX mail.certifiedhacker.com 10.10.1.25
[*]   A gateway.certifiedhacker.com 10.10.1.1
[*]   A dc01.certifiedhacker.com 10.10.1.2
[*]   A db-internal.certifiedhacker.com 10.10.1.15
[*]   A fileserver.certifiedhacker.com 10.10.1.20
[*]   A win2022.certifiedhacker.com 10.10.1.22
[*] 8 records retrieved from zone transfer`,
        analysisQuestion: {
          prompt: "What does a successful zone transfer give an attacker?",
          options: [
            { text: "The complete list of the zone's hostnames and IPs, including internal hosts", correct: true },
            { text: "Remote shell access to the DNS server", correct: false },
            { text: "The passwords of the domain users", correct: false },
            { text: "Only the address of the public web server", correct: false }
          ],
          explanation: "AXFR copies the whole zone. In this output the attacker learns about the domain controller (dc01), the internal database server and the file server."
        }
      },
      {
        label: "Brute force (-t brt -D)",
        task: "Brute-force subdomains of 'certifiedhacker.com' with the wordlist /usr/share/wordlists/dnsmap.txt.",
        solution: "dnsrecon -d certifiedhacker.com -t brt -D /usr/share/wordlists/dnsmap.txt",
        accepted: [
          (c) =>
            /^dnsrecon\b/.test(_ln(c)) &&
            _lhas(c, /\s(-d|--domain)[\s=]+certifiedhacker\.com\s/) &&
            _lhas(c, /\s(-t|--type)[\s=]+brt\s/) &&
            _lhas(c, /\s(-D|--dictionary)[\s=]+(\/usr\/share\/wordlists\/)?dnsmap\.txt\s/)
        ],
        hint: "Use the type '-t brt' and give the wordlist with a capital '-D': -D /usr/share/wordlists/dnsmap.txt.",
        diagnostics: [
          { check: (c) => !/^dnsrecon\b/.test(c), msg: "Use the 'dnsrecon' command." },
          { check: (c) => !/\s(-d|--domain)\b/.test(c), msg: "The domain is given with a lowercase -d." },
          { check: (c) => !/\s(-t|--type)[\s=]+brt/.test(c), msg: "The enumeration type for brute force is -t brt." },
          { check: (c) => !/\s(-D|--dictionary)\b/.test(c), msg: "The wordlist is given with a capital -D." },
          { check: (c) => !/dnsmap\.txt/.test(c), msg: "Use the wordlist /usr/share/wordlists/dnsmap.txt." }
        ],
        highlightText: "A vpn.certifiedhacker.com 10.10.1.40",
        output: `[*] Performing host and subdomain brute force against certifiedhacker.com
[*]   A www.certifiedhacker.com 162.159.24.80
[*]   A mail.certifiedhacker.com 10.10.1.25
[*]   A gateway.certifiedhacker.com 10.10.1.1
[*]   A dc01.certifiedhacker.com 10.10.1.2
[*]   A vpn.certifiedhacker.com 10.10.1.40
[+] 5 Records Found`
      },
      {
        label: "Reverse range (-r)",
        target: "10.10.1.0/24",
        task: "Reverse-resolve every address of the range 10.10.1.0/24 to find the hostnames behind the IPs.",
        solution: "dnsrecon -r 10.10.1.0/24",
        accepted: [
          (c) =>
            /^dnsrecon\b/.test(_ln(c)) &&
            _lhas(c, /\s(-r|--range)[\s=]+(10\.10\.1\.0\/24|10\.10\.1\.0-10\.10\.1\.255)\s/)
        ],
        hint: "The '-r' option takes an IP range: 'dnsrecon -r 10.10.1.0/24'.",
        diagnostics: [
          { check: (c) => !/^dnsrecon\b/.test(c), msg: "Use the 'dnsrecon' command." },
          { check: (c) => !/\s(-r|--range)\b/.test(c), msg: "The option for a reverse lookup of an IP range is -r." },
          { check: (c) => !/10\.10\.1\.0/.test(c), msg: "The range to resolve is 10.10.1.0/24." }
        ],
        highlightText: "PTR dc01.certifiedhacker.com 10.10.1.2",
        output: `[*] Reverse Look-up of a Range
[*] Performing Reverse Lookup from 10.10.1.0 to 10.10.1.255
[+]   PTR gateway.certifiedhacker.com 10.10.1.1
[+]   PTR dc01.certifiedhacker.com 10.10.1.2
[+]   PTR db-internal.certifiedhacker.com 10.10.1.15
[+]   PTR fileserver.certifiedhacker.com 10.10.1.20
[+]   PTR win2022.certifiedhacker.com 10.10.1.22
[+]   PTR mail.certifiedhacker.com 10.10.1.25
[+] 6 Records Found`
      }
    ]
  },

  // ---------------------------------------------------------------- WGET
  {
    id: 57,
    placeAfter: 51,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Wget: Downloading and Probing Web Content",
    difficulty: "Beginner",
    points: 100,
    target: "http://10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Wget is a non-interactive downloader. Testers use it to save a page, print it straight to the terminal, check whether a URL exists without downloading it, and follow links to copy part of a site for offline review.",
    tutorNotes: "Teaching Talking Point: wget saves the file to disk by default (index.html). '-O -' sends it to standard output so it can be piped. '--spider' only checks, and the status code is the evidence: 200 exists, 401 exists but needs credentials, 404 does not exist. '-r -l 1' crawls one level deep: always keep the depth small and stay inside the agreed scope. Wget downloads robots.txt first when it recurses.",
    cehExamTip: "Exam Alert: wget and curl are command-line HTTP clients. 'wget -r' recursively downloads (mirrors) a site, '--spider' checks links without saving, '-O -' prints to stdout. A 401 response proves the resource exists.",
    analysisQuestion: {
      prompt: "Which wget option lets you check whether a URL exists without downloading it?",
      options: [
        { text: "--spider", correct: true },
        { text: "-r -l 5", correct: false },
        { text: "-O -", correct: false },
        { text: "-q", correct: false }
      ],
      explanation: "--spider makes wget behave like a web spider: it requests the URL, reports the status code and downloads nothing."
    },
    steps: [
      {
        label: "Download a page",
        task: "Download the home page of the web server at http://10.10.1.22 and save it to disk.",
        solution: "wget http://10.10.1.22",
        accepted: [/^wget\s+(http:\/\/)?10\.10\.1\.22\/?$/],
        hint: "Type 'wget' followed by the URL. It saves the page as index.html.",
        diagnostics: [
          { check: (c) => !/^wget\b/.test(c), msg: "Use the 'wget' command to download a page." },
          { check: (c) => /\s-/.test(c), msg: "Run the plain download first. The options come in the next steps." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "'index.html' saved [703/703]",
        output: `--2026-10-21 10:12:03--  http://10.10.1.22/
Connecting to 10.10.1.22:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 703 [text/html]
Saving to: 'index.html'

index.html          100%[===================>]     703  --.-KB/s    in 0s

2026-10-21 10:12:03 (41.2 MB/s) - 'index.html' saved [703/703]`
      },
      {
        label: "Print to terminal (-q -O -)",
        task: "Show the page directly in the terminal instead of saving a file, and keep wget quiet (no progress output).",
        solution: "wget -q -O - http://10.10.1.22",
        accepted: [
          (c) => {
            const l = " " + _ln(c) + " ";
            const quiet = /\s(--quiet|-[a-zA-Z]*q[a-zA-Z]*)(?=[\s-])/.test(l);
            const toStdout = /\s(-[a-zA-Z]*O\s*-|--output-document[\s=]+-)\s/.test(l);
            return /^wget\b/.test(_ln(c)) && quiet && toStdout && /10\.10\.1\.22/.test(l);
          }
        ],
        hint: "'-q' keeps it quiet and '-O -' writes the page to standard output (the lone dash means the terminal).",
        diagnostics: [
          { check: (c) => !/^wget\b/.test(c), msg: "Use the 'wget' command." },
          { check: (c) => !/\s(--quiet|-[a-zA-Z]*q[a-zA-Z]*)/.test(c), msg: "-q switches off the progress output." },
          { check: (c) => !/\s(-[a-zA-Z]*O\s*-|--output-document[\s=]+-)(\s|$)/.test(c), msg: "Use a capital -O followed by a dash: '-O -' writes the page to the terminal." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        output: `<!DOCTYPE html>
<html><head><title>IIS Windows Server</title></head>
<body><h1>CertifiedHacker Intranet</h1><p>Welcome. Authorised users only.</p></body></html>`
      },
      {
        label: "Check without downloading (--spider)",
        task: "Check whether the page http://10.10.1.22/admin exists, without downloading anything.",
        solution: "wget --spider http://10.10.1.22/admin",
        accepted: [
          (c) => /^wget\b/.test(_ln(c)) && _lhas(c, /\s--spider\s/) && _lhas(c, /\s(http:\/\/)?10\.10\.1\.22\/admin\/?\s/)
        ],
        hint: "Add '--spider' (two dashes) and the URL http://10.10.1.22/admin.",
        diagnostics: [
          { check: (c) => !/^wget\b/.test(c), msg: "Use the 'wget' command." },
          { check: (c) => !/--spider/.test(c), msg: "The option that only checks a URL is --spider (two dashes)." },
          { check: (c) => !/\/admin/.test(c), msg: "Check the path /admin: http://10.10.1.22/admin." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22/admin." }
        ],
        highlightText: "401 Unauthorized",
        output: `Spider mode enabled. Check if remote file exists.
--2026-10-21 10:15:31--  http://10.10.1.22/admin
Connecting to 10.10.1.22:80... connected.
HTTP request sent, awaiting response... 401 Unauthorized

Username/Password Authentication Failed.`,
        analysisQuestion: {
          prompt: "The spider run returned '401 Unauthorized' for /admin. What does that tell a tester?",
          options: [
            { text: "The page exists but needs credentials", correct: true },
            { text: "The page does not exist", correct: false },
            { text: "The web server is offline", correct: false },
            { text: "The page was moved to another address", correct: false }
          ],
          explanation: "A 404 would mean 'not found'. A 401 proves the resource exists and is protected by authentication, so it is worth noting as a target."
        }
      },
      {
        label: "Recursive download (-r -l 1)",
        task: "Download the home page and the files it links to, going only one level deep.",
        solution: "wget -r -l 1 http://10.10.1.22",
        accepted: [
          (c) => {
            const l = " " + _ln(c) + " ";
            const recursive = /\s(--recursive|-[a-zA-Z]*r[a-zA-Z]*)(\s|$)/.test(l);
            const level = /\s(-[a-zA-Z]*l\s*1|--level[=\s]+1)(\s|$)/.test(l);
            return /^wget\b/.test(_ln(c)) && recursive && level && /10\.10\.1\.22/.test(l);
          }
        ],
        hint: "'-r' follows links and '-l 1' limits the depth to one level.",
        diagnostics: [
          { check: (c) => !/^wget\b/.test(c), msg: "Use the 'wget' command." },
          { check: (c) => !/\s(--recursive|-[a-zA-Z]*r[a-zA-Z]*)(\s|$)/.test(c), msg: "The option that follows links is -r (recursive)." },
          { check: (c) => !/\s(-[a-zA-Z]*l\s*1|--level[=\s]+1)(\s|$)/.test(c), msg: "Limit the depth to one level with -l 1." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "Downloaded: 2 files",
        output: `--2026-10-21 10:18:44--  http://10.10.1.22/
Connecting to 10.10.1.22:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 703 [text/html]
Saving to: '10.10.1.22/index.html'

10.10.1.22/index.html   100%[===================>]     703  --.-KB/s    in 0s

2026-10-21 10:18:44 (38.5 MB/s) - '10.10.1.22/index.html' saved [703/703]

Loading robots.txt; please ignore errors.
--2026-10-21 10:18:44--  http://10.10.1.22/robots.txt
Reusing existing connection to 10.10.1.22:80.
HTTP request sent, awaiting response... 200 OK
Length: 118 [text/plain]
Saving to: '10.10.1.22/robots.txt'

10.10.1.22/robots.txt   100%[===================>]     118  --.-KB/s    in 0s

2026-10-21 10:18:44 (4.6 MB/s) - '10.10.1.22/robots.txt' saved [118/118]

FINISHED --2026-10-21 10:18:44--
Total wall clock time: 0.2s
Downloaded: 2 files, 821 in 0s (22.1 MB/s)`
      }
    ]
  },

  // ---------------------------------------------------------------- WHATWEB
  {
    id: 58,
    placeAfter: 57,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "Whatweb: Web Technology Fingerprinting",
    difficulty: "Beginner",
    points: 100,
    target: "http://10.10.1.22",
    prompt: "root@parrot:~#",
    scenario: "Whatweb identifies the technologies behind a website: web server, framework, CMS, cookies and more. You will run it in its default mode, ask for a detailed report, raise the aggression level and change the browser identity.",
    tutorNotes: "Teaching Talking Point: whatweb turns headers, HTML and cookies into a technology list. Aggression levels: 1 (default) makes a single request and is stealthy, 3 (aggressive) makes extra requests to confirm plugins, 4 is heavy. Higher levels find more but are noisier in the target's logs. -v prints a detailed report with the raw HTTP headers, which also exposes uncommon headers. Some sites change their response for crawler user-agents.",
    cehExamTip: "Exam Alert: Whatweb, Wappalyzer and BuiltWith identify web technologies. Server banners and headers such as 'Microsoft-IIS/10.0' and 'X-Powered-By: ASP.NET' reveal the platform. Whatweb aggression levels range from 1 (stealthy) to 4 (heavy).",
    analysisQuestion: {
      prompt: "What is the trade-off of raising the whatweb aggression level to 3?",
      options: [
        { text: "More requests find more technologies but make the scan noisier and easier to detect", correct: true },
        { text: "It encrypts the scan so it cannot be logged", correct: false },
        { text: "It only works against Linux servers", correct: false },
        { text: "It reduces the number of detected plugins", correct: false }
      ],
      explanation: "Level 1 sends one request. Level 3 sends additional requests to confirm and discover plugins, so it detects more but leaves more traces in the target's logs."
    },
    steps: [
      {
        label: "Default scan",
        task: "Fingerprint the web server at http://10.10.1.22 with a plain whatweb scan.",
        solution: "whatweb http://10.10.1.22",
        accepted: [/^whatweb\s+(http:\/\/)?10\.10\.1\.22\/?$/],
        hint: "Type 'whatweb' followed by the URL. No options are needed.",
        diagnostics: [
          { check: (c) => !/^whatweb\b/.test(c), msg: "Use the 'whatweb' command." },
          { check: (c) => /\s-/.test(c), msg: "Run the plain scan first. The options come in the next steps." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "HTTPServer[Microsoft-IIS/10.0]",
        output: `http://10.10.1.22 [200 OK] ASP_NET[4.0.30319], Country[RESERVED][ZZ], HTTPServer[Microsoft-IIS/10.0], IP[10.10.1.22], Microsoft-IIS[10.0], Title[IIS Windows Server], X-Powered-By[ASP.NET]`,
        analysisQuestion: {
          prompt: "Which part of the whatweb result tells you the server runs on Windows?",
          options: [
            { text: "HTTPServer[Microsoft-IIS/10.0] together with ASP_NET and X-Powered-By[ASP.NET]", correct: true },
            { text: "Country[RESERVED][ZZ]", correct: false },
            { text: "Title[IIS Windows Server] is the only possible evidence", correct: false },
            { text: "[200 OK]", correct: false }
          ],
          explanation: "IIS and ASP.NET only run on Windows. The server header and the framework headers are far stronger evidence than a page title, which anyone can edit."
        }
      },
      {
        label: "Verbose report (-v)",
        task: "Ask whatweb for a detailed report of http://10.10.1.22, including the plugin descriptions and raw headers.",
        solution: "whatweb -v http://10.10.1.22",
        accepted: [
          (c) => /^whatweb\b/.test(_ln(c)) && _lhas(c, /\s(-v+|--verbose)\s/) && /10\.10\.1\.22/.test(c)
        ],
        hint: "Add '-v' (verbose) before the URL.",
        diagnostics: [
          { check: (c) => !/^whatweb\b/.test(c), msg: "Use the 'whatweb' command." },
          { check: (c) => !/\s(-v+|--verbose)\b/.test(c), msg: "The option for a detailed report is -v (verbose)." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "X-Powered-By: ASP.NET",
        output: `WhatWeb report for http://10.10.1.22
Status    : 200 OK
Title     : IIS Windows Server
IP        : 10.10.1.22
Country   : RESERVED, ZZ

Summary   : ASP_NET[4.0.30319], HTTPServer[Microsoft-IIS/10.0], Microsoft-IIS[10.0], X-Powered-By[ASP.NET]

Detected Plugins:
[ ASP_NET ]
    ASP.NET is a free web framework for building web sites and applications.
    Version     : 4.0.30319
    Website     : http://www.asp.net/

[ HTTPServer ]
    HTTP server header string. This plugin also attempts to identify the operating system from the server header.
    String      : Microsoft-IIS/10.0 (from server string)

[ Microsoft-IIS ]
    Microsoft Internet Information Services (IIS) for Windows Server.
    Version     : 10.0
    Website     : http://www.iis.net/

[ X-Powered-By ]
    X-Powered-By HTTP header
    String      : ASP.NET (from x-powered-by string)

HTTP Headers:
    HTTP/1.1 200 OK
    Content-Type: text/html
    Server: Microsoft-IIS/10.0
    X-Powered-By: ASP.NET
    Content-Length: 703`
      },
      {
        label: "Aggression level (-a 3)",
        task: "Raise the aggression level to 3 so whatweb sends extra requests to confirm more plugins.",
        solution: "whatweb -a 3 http://10.10.1.22",
        accepted: [
          (c) => /^whatweb\b/.test(_ln(c)) && _lhas(c, /\s(-a\s*3|--aggression[=\s]+3)\s/) && /10\.10\.1\.22/.test(c)
        ],
        hint: "The aggression option is '-a' followed by the level: '-a 3'.",
        diagnostics: [
          { check: (c) => !/^whatweb\b/.test(c), msg: "Use the 'whatweb' command." },
          { check: (c) => !/\s(-a|--aggression)\b/.test(c), msg: "The aggression level is set with -a." },
          { check: (c) => !/\s(-a\s*3|--aggression[=\s]+3)(\s|$)/.test(c), msg: "The task asks for level 3: -a 3." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "Cookies[ASP.NET_SessionId]",
        output: `http://10.10.1.22 [200 OK] ASP_NET[4.0.30319], Allow[GET, HEAD, OPTIONS, POST], Cookies[ASP.NET_SessionId], Country[RESERVED][ZZ], HTTPServer[Microsoft-IIS/10.0], HttpOnly[ASP.NET_SessionId], IP[10.10.1.22], Microsoft-IIS[10.0], Title[IIS Windows Server], X-Powered-By[ASP.NET]`
      },
      {
        label: "Browser identity (--user-agent)",
        task: "Repeat the scan while identifying yourself as the Googlebot crawler instead of the default whatweb agent.",
        solution: "whatweb --user-agent Googlebot http://10.10.1.22",
        accepted: [
          (c) => /^whatweb\b/.test(_ln(c)) && _lhas(c, /\s(--user-agent|-U)[\s=]/) && /googlebot/i.test(c) && /10\.10\.1\.22/.test(c)
        ],
        hint: "Use '--user-agent' (or '-U') followed by the agent name Googlebot.",
        diagnostics: [
          { check: (c) => !/^whatweb\b/.test(c), msg: "Use the 'whatweb' command." },
          { check: (c) => !/\s(--user-agent|-U)\b/.test(c), msg: "The option that sets the browser identity is --user-agent (short: -U)." },
          { check: (c) => !/googlebot/i.test(c), msg: "Send the agent name Googlebot." },
          { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Provide the target address: http://10.10.1.22." }
        ],
        highlightText: "UncommonHeaders[vary]",
        output: `http://10.10.1.22 [200 OK] ASP_NET[4.0.30319], Country[RESERVED][ZZ], HTTPServer[Microsoft-IIS/10.0], IP[10.10.1.22], Microsoft-IIS[10.0], Title[IIS Windows Server], UncommonHeaders[vary], X-Powered-By[ASP.NET]`
      }
    ]
  },

  // ---------------------------------------------------------------- THEHARVESTER
  {
    id: 59,
    placeAfter: 58,
    module: 2,
    moduleTitle: "Module 02: Footprinting and Reconnaissance",
    title: "TheHarvester: Emails and Subdomains (OSINT)",
    difficulty: "Beginner",
    points: 100,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "Employees leave traces on the Internet: e-mail addresses and hostnames appear in search engine results. TheHarvester collects them from public sources without ever contacting the target, giving you names for phishing tests and subdomains to look at.",
    tutorNotes: "Teaching Talking Point: theHarvester is passive reconnaissance (OSINT). -d is the domain, -b the data source (google, bing, and many more), -l caps the number of results per source, and -f saves a report as XML and JSON. Different sources return different results, so professionals run several. Collected e-mail addresses feed social engineering tests, and found hosts feed the next scanning phase. Several sources need API keys in real life.",
    cehExamTip: "Exam Alert: theHarvester gathers e-mail addresses, subdomains, hosts and employee names from public sources such as search engines. It is a passive footprinting tool: the target's own systems are not touched.",
    analysisQuestion: {
      prompt: "Why is theHarvester considered passive reconnaissance?",
      options: [
        { text: "It reads public search engine results and never sends packets to the target's systems", correct: true },
        { text: "It only works when the target gives permission", correct: false },
        { text: "It encrypts all of its traffic", correct: false },
        { text: "It scans every port of the target quietly", correct: false }
      ],
      explanation: "TheHarvester queries third-party sources such as Google or Bing. The target organisation sees no traffic from you, so its IDS and logs cannot detect the activity."
    },
    steps: [
      {
        label: "Search engine (-d -b)",
        task: "Collect e-mail addresses and hostnames of 'certifiedhacker.com' from the search engine Google.",
        solution: "theHarvester -d certifiedhacker.com -b google",
        accepted: [
          (c) =>
            /^theharvester\b/i.test(_ln(c)) &&
            _lhas(c, /\s-d[\s=]+certifiedhacker\.com\s/) &&
            _lhas(c, /\s-b[\s=]+google\s/i)
        ],
        hint: "Use '-d' for the domain and '-b' for the source: 'theHarvester -d certifiedhacker.com -b google'.",
        diagnostics: [
          { check: (c) => !/^theharvester\b/i.test(c), msg: "Use the 'theHarvester' command (capital H)." },
          { check: (c) => !/\s-d\b/.test(c), msg: "The target domain is given with -d." },
          { check: (c) => !/certifiedhacker\.com/.test(c), msg: "Target domain must be 'certifiedhacker.com'." },
          { check: (c) => !/\s-b\b/.test(c), msg: "The data source is given with -b." },
          { check: (c) => !/google/i.test(c), msg: "Use the source 'google'." }
        ],
        highlightText: "admin@certifiedhacker.com",
        output: `*******************************************************************
* theHarvester 4.6.0                                              *
* Coded by Christian Martorella                                   *
* Edge-Security Research                                          *
* cmartorella@edge-security.com                                   *
*******************************************************************

[*] Target: certifiedhacker.com

[*] Searching Google.

[*] No IPs found.

[*] Emails found: 3
----------------------
admin@certifiedhacker.com
info@certifiedhacker.com
support@certifiedhacker.com

[*] Hosts found: 4
---------------------
dc01.certifiedhacker.com
mail.certifiedhacker.com:10.10.1.25
vpn.certifiedhacker.com
www.certifiedhacker.com:162.159.24.80`
      },
      {
        label: "Limit results (-l)",
        task: "Repeat the Google search but limit it to the first 100 results.",
        solution: "theHarvester -d certifiedhacker.com -b google -l 100",
        accepted: [
          (c) =>
            /^theharvester\b/i.test(_ln(c)) &&
            _lhas(c, /\s-d[\s=]+certifiedhacker\.com\s/) &&
            _lhas(c, /\s-b[\s=]+google\s/i) &&
            _lhas(c, /\s-l[\s=]*100\s/)
        ],
        hint: "Add '-l 100' (limit) to the previous command.",
        diagnostics: [
          { check: (c) => !/^theharvester\b/i.test(c), msg: "Use the 'theHarvester' command." },
          { check: (c) => !/\s-d\b/.test(c) || !/\s-b\b/.test(c), msg: "Keep -d <domain> and -b google from the previous step." },
          { check: (c) => !/\s-l\b/.test(c), msg: "The option that limits the number of results is -l." },
          { check: (c) => !/\s-l[\s=]*100(\s|$)/.test(c), msg: "The task asks for 100 results: -l 100." }
        ],
        highlightText: "Searching 100 results.",
        output: `*******************************************************************
* theHarvester 4.6.0                                              *
*******************************************************************

[*] Target: certifiedhacker.com
 Searching 100 results.

[*] Searching Google.

[*] No IPs found.

[*] Emails found: 2
----------------------
admin@certifiedhacker.com
info@certifiedhacker.com

[*] Hosts found: 3
---------------------
mail.certifiedhacker.com:10.10.1.25
vpn.certifiedhacker.com
www.certifiedhacker.com:162.159.24.80`,
        analysisQuestion: {
          prompt: "What does the -l option control in theHarvester?",
          options: [
            { text: "The maximum number of results that are processed from the source", correct: true },
            { text: "The login name used on the target", correct: false },
            { text: "The language of the search engine", correct: false },
            { text: "The location of the output file", correct: false }
          ],
          explanation: "-l sets the result limit. A smaller limit is faster and quieter, a larger one finds more addresses."
        }
      },
      {
        label: "Another source (-b bing)",
        task: "Search the same domain again, this time using the search engine Bing as the data source.",
        solution: "theHarvester -d certifiedhacker.com -b bing",
        accepted: [
          (c) =>
            /^theharvester\b/i.test(_ln(c)) &&
            _lhas(c, /\s-d[\s=]+certifiedhacker\.com\s/) &&
            _lhas(c, /\s-b[\s=]+bing\s/i)
        ],
        hint: "Change the source: '-b bing'.",
        diagnostics: [
          { check: (c) => !/^theharvester\b/i.test(c), msg: "Use the 'theHarvester' command." },
          { check: (c) => !/\s-d\b/.test(c) || !/certifiedhacker\.com/.test(c), msg: "Keep -d certifiedhacker.com." },
          { check: (c) => !/\s-b\b/.test(c), msg: "The data source is given with -b." },
          { check: (c) => !/bing/i.test(c), msg: "Use the source 'bing'." }
        ],
        highlightText: "hr@certifiedhacker.com",
        output: `*******************************************************************
* theHarvester 4.6.0                                              *
*******************************************************************

[*] Target: certifiedhacker.com

[*] Searching Bing.

[*] No IPs found.

[*] Emails found: 3
----------------------
admin@certifiedhacker.com
hr@certifiedhacker.com
sales@certifiedhacker.com

[*] Hosts found: 3
---------------------
mail.certifiedhacker.com:10.10.1.25
portal.certifiedhacker.com:10.10.1.31
www.certifiedhacker.com:162.159.24.80`,
        analysisQuestion: {
          prompt: "Why do penetration testers query several sources with theHarvester?",
          options: [
            { text: "Each source indexes different addresses and hosts, so the combined result is more complete", correct: true },
            { text: "Using one source is forbidden by the tool", correct: false },
            { text: "Every source returns the identical list", correct: false },
            { text: "Additional sources hide the tester's IP address", correct: false }
          ],
          explanation: "Bing found hr@ and sales@ and a portal host that Google did not. Combining sources gives a better picture of the target."
        }
      },
      {
        label: "Save a report (-f)",
        task: "Run the Google search again and save the results to a report file named 'report'.",
        solution: "theHarvester -d certifiedhacker.com -b google -f report",
        accepted: [
          (c) =>
            /^theharvester\b/i.test(_ln(c)) &&
            _lhas(c, /\s-d[\s=]+certifiedhacker\.com\s/) &&
            _lhas(c, /\s-b[\s=]+google\s/i) &&
            _lhas(c, /\s-f[\s=]+[^\s-]/)
        ],
        hint: "The '-f' option saves the report: add '-f report'.",
        diagnostics: [
          { check: (c) => !/^theharvester\b/i.test(c), msg: "Use the 'theHarvester' command." },
          { check: (c) => !/\s-d\b/.test(c) || !/\s-b\b/.test(c), msg: "Keep -d certifiedhacker.com and -b google." },
          { check: (c) => !/\s-f\b/.test(c), msg: "The option that saves the results to a file is -f." },
          { check: (c) => !/\s-f[\s=]+[^\s-]/.test(c), msg: "Give the report a name after -f, for example 'report'." }
        ],
        highlightText: "JSON File saved.",
        output: `*******************************************************************
* theHarvester 4.6.0                                              *
*******************************************************************

[*] Target: certifiedhacker.com

[*] Searching Google.

[*] No IPs found.

[*] Emails found: 3
----------------------
admin@certifiedhacker.com
info@certifiedhacker.com
support@certifiedhacker.com

[*] Hosts found: 4
---------------------
dc01.certifiedhacker.com
mail.certifiedhacker.com:10.10.1.25
vpn.certifiedhacker.com
www.certifiedhacker.com:162.159.24.80

[*] Reporting started.
[*] XML File saved.
[*] JSON File saved.`
      }
    ]
  }
);

// ----------------------------------------------------------------------------
// Argument help for the typing helpers (breakdown card, HUD, valid variations)
// ----------------------------------------------------------------------------
Object.assign(LAB_TOOL_HELP.tools, {
  arp: {
    name: "ARP Cache Viewer",
    category: "Layer 2 Recon",
    desc: "Shows the ARP cache: the table that maps IP addresses of neighbours to their MAC addresses.",
    tip: "Pro Tip: <code>-a</code> prints every entry with names, <code>-n</code> prints a numeric table. On Windows <code>arp -a</code> is the only list option you need."
  },
  netstat: {
    name: "Network Statistics",
    category: "Local Recon",
    desc: "Lists network connections, listening ports and (with the right options) the program that owns each socket.",
    tip: "Pro Tip: On Linux use <code>-tulnp</code>, on Windows use <code>-ano</code>. Unexpected LISTEN ports or unknown remote addresses deserve a closer look."
  },
  ip: {
    name: "IP Configuration (iproute2)",
    category: "Local Recon",
    desc: "Modern Linux tool to show and manage addresses, routes and neighbour (ARP) entries. The first argument is the object: a, route or neigh.",
    tip: "Pro Tip: <code>ip a</code> shows addresses, <code>ip route</code> shows the default gateway, <code>ip neigh show</code> replaces <code>arp -a</code>."
  },
  ipconfig: {
    name: "Windows IP Configuration",
    category: "Local Recon",
    desc: "Windows command that shows the IP configuration of the network adapters.",
    tip: "Pro Tip: Windows switches start with a slash. <code>ipconfig /all</code> adds the MAC address, DHCP server and DNS servers."
  },
  host: {
    name: "DNS Lookup Utility",
    category: "DNS Recon",
    desc: "Simple DNS lookup tool with short, readable answers. Chooses the record type with -t and can request a zone with -l.",
    tip: "Pro Tip: <code>host -t mx|ns|txt &lt;domain&gt;</code> for single record types, <code>host -l &lt;domain&gt; &lt;server&gt;</code> to test a zone transfer."
  },
  dnsrecon: {
    name: "DNS Enumeration Tool",
    category: "DNS Recon",
    desc: "Automates DNS enumeration: standard records, zone transfers, subdomain brute force and reverse lookups of IP ranges.",
    tip: "Pro Tip: <code>-d</code> is the domain, <code>-t</code> is the type (std, axfr, brt), <code>-n</code> picks the name server, <code>-D</code> the wordlist."
  },
  wget: {
    name: "Web Downloader",
    category: "Web Recon",
    desc: "Non-interactive command-line downloader for HTTP and FTP. Saves files, prints to the terminal, checks URLs or crawls links.",
    tip: "Pro Tip: <code>-q -O -</code> prints the page, <code>--spider</code> only checks it, <code>-r -l 1</code> follows links one level deep."
  },
  whatweb: {
    name: "Web Technology Fingerprinter",
    category: "Web Recon",
    desc: "Identifies web servers, frameworks, CMS platforms, cookies and headers of a website.",
    tip: "Pro Tip: <code>-v</code> gives a detailed report, <code>-a 3</code> is aggressive, <code>--user-agent</code> changes the browser identity."
  },
  theharvester: {
    name: "OSINT Harvester",
    category: "Passive Recon",
    desc: "Collects e-mail addresses, subdomains and hostnames of a domain from public sources such as search engines.",
    tip: "Pro Tip: <code>-d</code> is the domain, <code>-b</code> the source (google, bing), <code>-l</code> limits results and <code>-f</code> saves a report."
  }
});

Object.assign(LAB_TOOL_HELP.toolFlags, {
  arp: {
    "-a": { name: "Show All Entries", type: "Argument", desc: "Displays all ARP entries in BSD style with hostnames: name (IP) at MAC. On Windows this is the option that lists the whole table." },
    "-n": { name: "Numeric Table", type: "Argument", desc: "Shows IP addresses instead of resolving names and prints the classic table with HWaddress and Iface columns (Linux)." },
    "--numeric": { name: "Numeric Table", type: "Argument", desc: "Long form of -n: show numeric addresses, no name lookups." },
    "-d": { name: "Delete Entry", type: "Argument", desc: "Deletes an entry from the ARP cache (needs a host address)." },
    "-s": { name: "Set Static Entry", type: "Argument", desc: "Adds a permanent entry that maps an IP to a MAC address." }
  },
  netstat: {
    "-a": { name: "All Sockets", type: "Argument", desc: "Shows both listening and non-listening (connected) sockets." },
    "-n": { name: "Numeric", type: "Argument", desc: "Shows numeric IP addresses and port numbers instead of resolving names." },
    "-t": { name: "TCP", type: "Argument", desc: "Shows TCP sockets." },
    "-u": { name: "UDP", type: "Argument", desc: "Shows UDP sockets." },
    "-l": { name: "Listening Only", type: "Argument", desc: "Shows only sockets that are listening for connections." },
    "-p": { name: "PID / Program", type: "Argument", desc: "Shows the process ID and program name that owns each socket (needs root on Linux)." },
    "-o": { name: "Owning Process ID", type: "Argument", desc: "Windows option: adds a PID column with the process that owns each connection." },
    "-an": { name: "All + Numeric", type: "Argument", desc: "Combined -a (all sockets) and -n (numeric addresses and ports)." },
    "-tuln": { name: "TCP + UDP + Listening + Numeric", type: "Argument", desc: "Combined -t, -u, -l and -n: every listening TCP and UDP port, numeric." },
    "-tulnp": { name: "Listening Ports + Program", type: "Argument", desc: "Combined -t, -u, -l, -n and -p: listening ports with the owning PID and program name." },
    "-ano": { name: "All + Numeric + PID (Windows)", type: "Argument", desc: "Combined -a (all), -n (numeric) and -o (owning process ID). The standard Windows netstat command." }
  },
  ip: {
    "a": { name: "Addresses", type: "Argument", desc: "Short for 'addr show': lists all interfaces with their IP and MAC addresses." },
    "addr": { name: "Addresses", type: "Argument", desc: "Shows interfaces and their IP addresses." },
    "route": { name: "Routing Table", type: "Argument", desc: "Shows the routing table, including the default gateway ('default via ...')." },
    "neigh": { name: "Neighbour (ARP) Table", type: "Argument", desc: "Shows the ARP/neighbour cache: IP to MAC mappings and their state (REACHABLE, STALE)." },
    "show": { name: "Show", type: "Argument", desc: "Display the entries of the chosen object (default action)." },
    "-4": { name: "IPv4 Only", type: "Argument", desc: "Limit the output to IPv4." },
    "-6": { name: "IPv6 Only", type: "Argument", desc: "Limit the output to IPv6." },
    "-br": { name: "Brief Output", type: "Argument", desc: "Prints a compact one-line-per-interface table." }
  },
  ipconfig: {
    "/all": { name: "Full Configuration", type: "Argument", desc: "Shows every detail: host name, MAC address, DHCP server, DNS servers, lease times." },
    "/release": { name: "Release Lease", type: "Argument", desc: "Releases the DHCP lease of the adapter." },
    "/renew": { name: "Renew Lease", type: "Argument", desc: "Requests a new DHCP lease." },
    "/flushdns": { name: "Flush DNS Cache", type: "Argument", desc: "Clears the local DNS resolver cache." },
    "/displaydns": { name: "Show DNS Cache", type: "Argument", desc: "Displays the contents of the local DNS resolver cache." }
  },
  host: {
    "-t": { name: "Record Type", type: "Argument", desc: "Selects the DNS record type to query (a, mx, ns, txt, soa, axfr).", val: true, valDesc: "Record type: mx, ns, txt, soa..." },
    "-l": { name: "List Zone", type: "Argument", desc: "Attempts a zone transfer (AXFR): lists all hosts of the zone from the chosen server." },
    "-a": { name: "All Records", type: "Argument", desc: "Requests every record type (ANY) with verbose output." },
    "-v": { name: "Verbose", type: "Argument", desc: "Shows the full DNS response, like dig." }
  },
  dnsrecon: {
    "-d": { name: "Domain", type: "Argument", desc: "The domain to enumerate.", val: true, valDesc: "Target domain" },
    "--domain": { name: "Domain", type: "Argument", desc: "Long form of -d.", val: true, valDesc: "Target domain" },
    "-t": { name: "Enumeration Type", type: "Argument", desc: "Selects the scan: std (standard records), axfr (zone transfer), brt (brute force), rvl (reverse lookup) and more.", val: true, valDesc: "Type: std, axfr or brt" },
    "-n": { name: "Name Server", type: "Argument", desc: "The DNS server to use or to test for a zone transfer.", val: true, valDesc: "Name server IP address" },
    "-D": { name: "Wordlist (Dictionary)", type: "Argument", desc: "Capital D: the wordlist file used for brute force (-t brt).", val: true, valDesc: "Path of the wordlist file" },
    "-r": { name: "Reverse Lookup Range", type: "Argument", desc: "Reverse-resolves every address of an IP range (CIDR or start-end) to find PTR records.", val: true, valDesc: "IP range, e.g. 10.10.1.0/24" }
  },
  wget: {
    "-q": { name: "Quiet", type: "Argument", desc: "Switches off wget's progress and status output." },
    "--quiet": { name: "Quiet", type: "Argument", desc: "Long form of -q." },
    "-O": { name: "Output Document", type: "Argument", desc: "Capital O: writes the download to the given file. The special name '-' means standard output (the terminal).", val: true, valDesc: "File name, or - for the terminal" },
    "-": { name: "Standard Output", type: "Argument", desc: "The lone dash after -O means: write the content to the terminal instead of a file." },
    "--spider": { name: "Spider Mode", type: "Argument", desc: "Checks that the URL exists (status code) without downloading it." },
    "-r": { name: "Recursive", type: "Argument", desc: "Follows links and downloads the linked files too." },
    "-l": { name: "Recursion Depth", type: "Argument", desc: "Maximum depth of a recursive download. -l 1 means one level of links.", val: true, valDesc: "Depth (number of levels)" }
  },
  whatweb: {
    "-v": { name: "Verbose Report", type: "Argument", desc: "Prints a detailed report with plugin descriptions, versions and the raw HTTP headers." },
    "--verbose": { name: "Verbose Report", type: "Argument", desc: "Long form of -v." },
    "-a": { name: "Aggression Level", type: "Argument", desc: "1 = stealthy (one request, default), 3 = aggressive (extra requests), 4 = heavy.", val: true, valDesc: "Level 1 to 4" },
    "--aggression": { name: "Aggression Level", type: "Argument", desc: "Long form of -a.", val: true, valDesc: "Level 1 to 4" },
    "--user-agent": { name: "User-Agent", type: "Argument", desc: "Sends the given browser identity instead of the default WhatWeb agent. Short form: -U.", val: true, valDesc: "User-Agent name, e.g. Googlebot" },
    "-U": { name: "User-Agent", type: "Argument", desc: "Short form of --user-agent.", val: true, valDesc: "User-Agent name" }
  },
  theharvester: {
    "-d": { name: "Domain", type: "Argument", desc: "The domain to search for.", val: true, valDesc: "Target domain" },
    "-b": { name: "Data Source", type: "Argument", desc: "The public source to query: google, bing, duckduckgo, crtsh and many more (or all).", val: true, valDesc: "Source name" },
    "-l": { name: "Result Limit", type: "Argument", desc: "Limits the number of results taken from the source (default 500).", val: true, valDesc: "Number of results" },
    "-f": { name: "Save Report", type: "Argument", desc: "Saves the results to files with the given name (XML and JSON).", val: true, valDesc: "Report file name" }
  }
});

LAB_TOOL_HELP.altFlags.arp = [
  { code: "-a", desc: "All entries with names" },
  { code: "-n", desc: "Numeric table (Linux)" },
  { code: "ip neigh show", desc: "Modern replacement" },
  { code: "-a (Windows)", desc: "List the ARP table" }
];
LAB_TOOL_HELP.altFlags.netstat = [
  { code: "-an", desc: "All sockets, numeric" },
  { code: "-tuln", desc: "Listening TCP/UDP ports" },
  { code: "-tulnp", desc: "Listening ports with PID/program" },
  { code: "-ano", desc: "Windows: all, numeric, PID" }
];
LAB_TOOL_HELP.altFlags.ip = [
  { code: "a / addr", desc: "Interfaces and addresses" },
  { code: "route / r", desc: "Routing table, default gateway" },
  { code: "neigh show", desc: "ARP/neighbour table" },
  { code: "-br a", desc: "Brief address list" }
];
LAB_TOOL_HELP.altFlags.ipconfig = [
  { code: "(none)", desc: "Basic IP, mask and gateway" },
  { code: "/all", desc: "Full details incl. MAC, DHCP, DNS" },
  { code: "/displaydns", desc: "Show the DNS cache" },
  { code: "/flushdns", desc: "Clear the DNS cache" }
];
LAB_TOOL_HELP.altFlags.host = [
  { code: "-t mx", desc: "Mail servers" },
  { code: "-t ns", desc: "Name servers" },
  { code: "-t txt", desc: "Text records" },
  { code: "-l <domain> <server>", desc: "Zone transfer attempt" },
  { code: "-t axfr", desc: "Same as -l" }
];
LAB_TOOL_HELP.altFlags.dnsrecon = [
  { code: "-d <domain>", desc: "Standard enumeration" },
  { code: "-t axfr -n <server>", desc: "Zone transfer test" },
  { code: "-t brt -D <wordlist>", desc: "Subdomain brute force" },
  { code: "-r <range>", desc: "Reverse lookup of an IP range" }
];
LAB_TOOL_HELP.altFlags.wget = [
  { code: "-q -O -", desc: "Print the page, no progress" },
  { code: "--spider", desc: "Check a URL, no download" },
  { code: "-r -l 1", desc: "Follow links one level deep" },
  { code: "--recursive --level=1", desc: "Long forms of -r -l 1" }
];
LAB_TOOL_HELP.altFlags.whatweb = [
  { code: "-v", desc: "Detailed report" },
  { code: "-a 3", desc: "Aggressive scan" },
  { code: "--aggression=3", desc: "Long form of -a 3" },
  { code: "--user-agent <name>", desc: "Custom browser identity (-U)" }
];
LAB_TOOL_HELP.altFlags.theharvester = [
  { code: "-b google", desc: "Search engine source" },
  { code: "-b bing", desc: "Another source" },
  { code: "-l <n>", desc: "Limit the results" },
  { code: "-f <name>", desc: "Save XML and JSON report" }
];
