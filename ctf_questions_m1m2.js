// ============================================================================
// CTF CHALLENGES: Modules 1 and 2 (second batch, ids 114 to 125)
// ----------------------------------------------------------------------------
// 114 arp, 115-116 netstat, 117 ip, 118 ipconfig, 119-120 host,
// 121-122 dnsrecon, 123 wget, 124 whatweb, 125 theHarvester.
// Same format as ctf_questions.js (see AUTHORING.md). Flags are written as
// flagPlain and turned into flagEnc by tools/encode_flags.py.
// Helpers _n, _has and _hasTarget come from ctf_questions.js.
// ============================================================================

// Options of a command as a flat lowercase list: "-tuln" becomes -t -u -l -n,
// and the long forms are mapped to their short letter (--numeric becomes -n).
const _m12co = (c) => {
  const long = { "--all": "-a", "--numeric": "-n", "--tcp": "-t", "--udp": "-u", "--listening": "-l", "--program": "-p" };
  const out = [];
  _n(c).toLowerCase().split(" ").slice(1).forEach((t) => {
    if (long[t]) out.push(long[t]);
    else if (/^-[a-z]+$/.test(t)) t.slice(1).split("").forEach((ch) => out.push("-" + ch));
  });
  return out;
};

CTF_QUESTIONS.push(
  // ---------------------------------------------------------------- ARP
  {
    id: 114,
    type: "ctf",
    pairedWith: 52,
    module: 1,
    moduleTitle: "CTF · Introduction to Ethical Hacking",
    title: "Two Faces, One MAC",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.0/24 (local network)",
    prompt: "root@parrot:~#",
    scenario: "Users complain that the connection through the gateway 10.10.1.1 is slow and that browsers show strange certificate warnings. You suspect that another machine on the LAN is impersonating the gateway.",
    task: "Inspect the table on this machine that maps IP addresses to hardware addresses. One other host uses exactly the same hardware address as the gateway 10.10.1.1. The flag is CEH{rogue_ip_<n>}, where <n> is the last octet of that other host's IP address.",
    solution: "arp -a",
    derivedFlag: true,
    accepted: [
      (c) => {
        const o = _m12co(c);
        return /^arp\b/.test(_n(c)) && (o.includes("-a") || o.includes("-n")) && !o.includes("-d") && !o.includes("-s");
      },
      (c) => /^ip\s+(-\S+\s+)*(neigh|neighbor|neighbour|n)(\s+(show|list)\b.*)?$/.test(_n(c))
    ],
    hints: [
      "Hint 1: Every host keeps a small cache that links IP addresses to MAC addresses. A classic command-line tool prints it.",
      "Hint 2: Use the arp tool and ask it to show all entries (-a). Look for a MAC address that appears twice.",
      "Hint 3: arp -a"
    ],
    diagnostics: [
      { check: (c) => !/^(arp|ip)\b/.test(c), msg: "Which tool shows this machine's cache of IP-to-MAC mappings?" },
      { check: (c) => /^arp\b/.test(c) && /\s-[a-zA-Z]*[ds]/.test(c), msg: "You only need to read the cache, not change it." },
      { check: (c) => /^arp\b/.test(c) && !/\s-[a-zA-Z]*[an]/.test(c), msg: "Ask the tool to list the entries. Which option shows all of them?" },
      { check: (c) => /^ip\b/.test(c) && !/neigh/.test(c), msg: "That ip sub-command does not show the ARP cache. Which object holds the neighbours?" }
    ],
    tutorNotes: "Teaching point: ARP spoofing leaves a fingerprint in the victim's cache: the attacker's MAC address appears for two IP addresses (its own and the impersonated gateway). Derived flag: the flag is not in the output, students read the duplicate MAC and build it from the last octet. 08:00:27 is the VirtualBox vendor prefix, different from the 00:50:56 VMware prefix of the real hosts.",
    cehExamTip: "Exam Alert: ARP has no authentication. A duplicate MAC address in the ARP cache (two IPs, one MAC) is a classic sign of ARP poisoning and a man-in-the-middle attack. Tools such as arpwatch and Wireshark can alert on it.",
    output: `gateway.corp.local (10.10.1.1) at 08:00:27:d4:7e:66 [ether] on eth0
dc01.corp.local (10.10.1.2) at 00:50:56:aa:01:02 [ether] on eth0
? (10.10.1.11) at 00:50:56:aa:01:0b [ether] on eth0
fileserver.corp.local (10.10.1.20) at 00:50:56:aa:01:14 [ether] on eth0
win-server-2022.corp.local (10.10.1.22) at 00:50:56:aa:01:16 [ether] on eth0
mail.certifiedhacker.com (10.10.1.25) at 00:50:56:aa:01:19 [ether] on eth0
? (10.10.1.66) at 08:00:27:d4:7e:66 [ether] on eth0`,
    outputVariants: [
      {
        test: (c) => /^ip\b/.test(_n(c)),
        output: `10.10.1.1 dev eth0 lladdr 08:00:27:d4:7e:66 REACHABLE
10.10.1.2 dev eth0 lladdr 00:50:56:aa:01:02 STALE
10.10.1.11 dev eth0 lladdr 00:50:56:aa:01:0b STALE
10.10.1.20 dev eth0 lladdr 00:50:56:aa:01:14 STALE
10.10.1.22 dev eth0 lladdr 00:50:56:aa:01:16 REACHABLE
10.10.1.25 dev eth0 lladdr 00:50:56:aa:01:19 STALE
10.10.1.66 dev eth0 lladdr 08:00:27:d4:7e:66 REACHABLE`
      },
      {
        test: (c) => _m12co(c).includes("-a") && _m12co(c).includes("-n"),
        output: `? (10.10.1.1) at 08:00:27:d4:7e:66 [ether] on eth0
? (10.10.1.2) at 00:50:56:aa:01:02 [ether] on eth0
? (10.10.1.11) at 00:50:56:aa:01:0b [ether] on eth0
? (10.10.1.20) at 00:50:56:aa:01:14 [ether] on eth0
? (10.10.1.22) at 00:50:56:aa:01:16 [ether] on eth0
? (10.10.1.25) at 00:50:56:aa:01:19 [ether] on eth0
? (10.10.1.66) at 08:00:27:d4:7e:66 [ether] on eth0`
      },
      {
        test: (c) => _m12co(c).includes("-n"),
        output: `Address                  HWtype  HWaddress           Flags Mask            Iface
10.10.1.1                ether   08:00:27:d4:7e:66   C                     eth0
10.10.1.2                ether   00:50:56:aa:01:02   C                     eth0
10.10.1.11               ether   00:50:56:aa:01:0b   C                     eth0
10.10.1.20               ether   00:50:56:aa:01:14   C                     eth0
10.10.1.22               ether   00:50:56:aa:01:16   C                     eth0
10.10.1.25               ether   00:50:56:aa:01:19   C                     eth0
10.10.1.66               ether   08:00:27:d4:7e:66   C                     eth0`
      }
    ],
    flagEnc: "ICAgVhEbAVgTbloTOl4bHg==",
    writeup: "<code>arp -a</code> printed the ARP cache. The gateway 10.10.1.1 and the host 10.10.1.66 share the MAC address <code>08:00:27:d4:7e:66</code>: the machine at .66 is answering ARP requests for the gateway, a sign of ARP spoofing. The flag is <code>CEH{rogue_ip_66}</code>."
  },

  // ---------------------------------------------------------------- NETSTAT (Linux)
  {
    id: 115,
    type: "ctf",
    pairedWith: 53,
    module: 1,
    moduleTitle: "CTF · Introduction to Ethical Hacking",
    title: "Who Owns Port 4444?",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.30 (Linux Server)",
    prompt: "root@parrot:~#",
    scenario: "Your IDS raised an alert for the Linux server 10.10.1.30: something may be waiting for a reverse shell on port 4444. You have a root shell on the machine and need to know which process is behind that port.",
    task: "Find the process that is listening on TCP port 4444 on this server. The flag is CEH{pid_<PID>}, where <PID> is the process ID that owns the port.",
    solution: "netstat -tulnp",
    derivedFlag: true,
    accepted: [
      (c) => {
        const o = _m12co(c);
        return /^netstat\b/.test(_n(c)) && o.includes("-p") && (o.includes("-l") || o.includes("-a"));
      }
    ],
    hints: [
      "Hint 1: You need the classic tool that lists network sockets. A plain port list does not say who owns a port, so look for the option that adds the process.",
      "Hint 2: Use netstat to show listening TCP and UDP ports, numeric, together with the PID and program name (-tulnp).",
      "Hint 3: netstat -tulnp"
    ],
    diagnostics: [
      { check: (c) => !/^netstat\b/.test(c), msg: "Which tool lists listening ports and connections on a machine?" },
      { check: (c) => !/\s-[a-zA-Z]*p/.test(c) && !/--program/.test(c), msg: "That shows ports but not who owns them. Which option adds the process ID and program name?" },
      { check: (c) => !/\s-[a-zA-Z]*[la]/.test(c) && !/--(listening|all)/.test(c), msg: "Without more options only connected sockets are shown. A service that waits for connections is 'listening'." }
    ],
    tutorNotes: "Teaching point: -p maps a port to a PID and program name (root needed). Derived flag: the flag is not in the output, students read the PID next to port 4444 (the program is nc, a netcat listener). Without -n the port shows as its service name (krb524), a nice example of why numeric output is easier to read.",
    cehExamTip: "Exam Alert: 'netstat -tulnp' lists listening TCP/UDP ports with the owning process. An unknown program such as nc (netcat) bound to a high port is a typical backdoor or reverse-shell listener.",
    output: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      731/sshd: /usr/sbin
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      902/nginx: master p
tcp        0      0 0.0.0.0:4444            0.0.0.0:*               LISTEN      2371/nc
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      845/mysqld
tcp6       0      0 :::22                   :::*                    LISTEN      731/sshd: /usr/sbin
udp        0      0 0.0.0.0:68              0.0.0.0:*                           612/dhclient`,
    outputVariants: [
      {
        test: (c) => _m12co(c).includes("-a") && !_m12co(c).includes("-l"),
        output: `Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      731/sshd: /usr/sbin
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      902/nginx: master p
tcp        0      0 0.0.0.0:4444            0.0.0.0:*               LISTEN      2371/nc
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      845/mysqld
tcp        0      0 10.10.1.30:22           10.10.1.50:50118        ESTABLISHED 1893/sshd: root@pts
tcp        0      0 10.10.1.30:80           10.10.1.11:49733        TIME_WAIT   -
tcp6       0      0 :::22                   :::*                    LISTEN      731/sshd: /usr/sbin
udp        0      0 0.0.0.0:68              0.0.0.0:*                           612/dhclient`
      },
      {
        test: (c) => !_m12co(c).includes("-n"),
        output: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:ssh             0.0.0.0:*               LISTEN      731/sshd: /usr/sbin
tcp        0      0 0.0.0.0:http            0.0.0.0:*               LISTEN      902/nginx: master p
tcp        0      0 0.0.0.0:krb524          0.0.0.0:*               LISTEN      2371/nc
tcp        0      0 localhost:mysql         0.0.0.0:*               LISTEN      845/mysqld
tcp6       0      0 :::ssh                  :::*                    LISTEN      731/sshd: /usr/sbin
udp        0      0 0.0.0.0:bootpc          0.0.0.0:*                           612/dhclient`
      }
    ],
    flagEnc: "ICAgVhMdAnJEAgRSGA==",
    writeup: "<code>netstat -tulnp</code> listed the listening ports with their owners. Port 4444 belongs to <code>2371/nc</code>, a netcat listener that should not be there, so the flag is <code>CEH{pid_2371}</code>. Without <code>-p</code> you would only see that the port is open, never who opened it."
  },

  // ---------------------------------------------------------------- NETSTAT (Windows)
  {
    id: 116,
    type: "ctf",
    pairedWith: 53,
    module: 1,
    moduleTitle: "CTF · Introduction to Ethical Hacking",
    title: "Phoning Home",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.11 (Windows Workstation)",
    prompt: "C:\\Users\\Administrator>",
    scenario: "The firewall logged traffic from the Windows workstation 10.10.1.11 to the Internet address 203.0.113.66, which nobody recognises. You are on the workstation and must find out which process opened that connection.",
    task: "List the connections of this Windows machine together with the process that owns each one, with numeric addresses. Find the connection to 203.0.113.66. The flag is CEH{c2_pid_<PID>}, where <PID> is the process ID that owns that connection.",
    solution: "netstat -ano",
    derivedFlag: true,
    accepted: [
      (c) => /^netstat\b/i.test(_n(c)) && _m12co(c).includes("-o")
    ],
    hints: [
      "Hint 1: The tool that lists connections can also show who owns them. On Windows that column is a number, not a name.",
      "Hint 2: Use netstat with the options for all connections (-a), numeric output (-n) and the owning process ID (-o).",
      "Hint 3: netstat -ano"
    ],
    diagnostics: [
      { check: (c) => !/^netstat\b/i.test(c), msg: "Which tool lists network connections on a Windows machine?" },
      { check: (c) => /\s-[a-zA-Z]*[tul]/.test(c) && !/\s-[a-zA-Z]*o/i.test(c), msg: "That is Linux syntax. On Windows a different option adds the process ID column." },
      { check: (c) => !/\s-[a-zA-Z]*o/i.test(c), msg: "The connections are listed, but who owns them? Which option adds the owning process ID?" }
    ],
    tutorNotes: "Teaching point: -o adds the PID column; tasklist /FI \"PID eq <PID>\" then gives the process name. Derived flag: the flag is not in the output, students read the PID of the one ESTABLISHED connection to the unknown external address.",
    cehExamTip: "Exam Alert: On Windows 'netstat -ano' shows all connections with PIDs. An ESTABLISHED session to an unknown external IP on an unusual port is a common indicator of malware talking to a command-and-control (C2) server.",
    output: `Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       904
  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:3389           0.0.0.0:0              LISTENING       1128
  TCP    10.10.1.11:49712       10.10.1.2:389          ESTABLISHED     640
  TCP    10.10.1.11:49820       10.10.1.22:445         ESTABLISHED     4
  TCP    10.10.1.11:50233       203.0.113.66:8443      ESTABLISHED     3964
  TCP    10.10.1.11:50301       10.10.1.25:443         TIME_WAIT       0
  UDP    0.0.0.0:5353           *:*                                    1672`,
    flagEnc: "ICAgVgBGOV0fVWxQXF4ZHg==",
    writeup: "<code>netstat -ano</code> listed every connection with its owning PID. The only session to <code>203.0.113.66:8443</code> belongs to PID 3964, so the flag is <code>CEH{c2_pid_3964}</code>. The next step of a real investigation is <code>tasklist /FI \"PID eq 3964\"</code> to see which program it is."
  },

  // ---------------------------------------------------------------- IP
  {
    id: 117,
    type: "ctf",
    pairedWith: 54,
    module: 1,
    moduleTitle: "CTF · Introduction to Ethical Hacking",
    title: "Which Way Out?",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.30 (compromised pivot host)",
    prompt: "root@parrot:~#",
    scenario: "You have a shell on a Linux machine that sits between two networks. Before you pivot further you must know through which router this machine reaches everything that is not on one of its own subnets.",
    task: "Find the address of the default gateway of this machine. The flag is CEH{gw_<address>}, where the dots of the gateway's IP address are written as underscores.",
    solution: "ip route",
    derivedFlag: true,
    accepted: [
      (c) => /^ip\s+(-\S+\s+)*(route|r)(\s+(show|list)(\s+\S+)*)?$/.test(_n(c)),
      (c) => /^route\s+-n$/.test(_n(c))
    ],
    hints: [
      "Hint 1: Packets for networks that are not directly connected follow the default route of the routing table.",
      "Hint 2: Use the modern ip command and show the routing table. Look for the line that starts with 'default via'.",
      "Hint 3: ip route"
    ],
    diagnostics: [
      { check: (c) => /^ifconfig\b/.test(c), msg: "That shows interface addresses, not routes." },
      { check: (c) => !/^(ip|route)\b/.test(c), msg: "Which tool shows the routing table of a Linux machine?" },
      { check: (c) => /^ip\s+(-\S+\s+)*(a|addr|address)\b/.test(c), msg: "That lists addresses, not routes. The gateway lives in the routing table." },
      { check: (c) => /^route\b/.test(c), msg: "Without numeric output the gateway is shown as a name. Ask for numbers." },
      { check: (c) => /^ip\b/.test(c) && !/^ip\s+(-\S+\s+)*(route|r)\b/.test(c), msg: "Which ip object holds the routing table?" }
    ],
    tutorNotes: "Teaching point: the default route is the line 'default via <gateway>'. The 10.10.1.0/24 side has no default route, the way out is through eth1. Derived flag: the flag is not in the output, students build it from the gateway address.",
    cehExamTip: "Exam Alert: 'ip route' (or 'route -n' / 'netstat -rn') shows the routing table. The gateway of the default route is the next hop for all traffic leaving the local networks, which matters for pivoting and for mapping network segments.",
    output: `default via 192.168.50.254 dev eth1 proto dhcp metric 100
10.10.1.0/24 dev eth0 proto kernel scope link src 10.10.1.30 metric 101
192.168.50.0/24 dev eth1 proto kernel scope link src 192.168.50.30 metric 100`,
    outputVariants: [
      {
        test: (c) => /^route\b/.test(_n(c)),
        output: `Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.50.254  0.0.0.0         UG    100    0        0 eth1
10.10.1.0       0.0.0.0         255.255.255.0   U     101    0        0 eth0
192.168.50.0    0.0.0.0         255.255.255.0   U     100    0        0 eth1`
      }
    ],
    flagEnc: "ICAgVgQDORxPA2xSU1ByVkQ5H0MFTg==",
    writeup: "<code>ip route</code> printed the routing table. The line <code>default via 192.168.50.254 dev eth1</code> names the default gateway, so the flag is <code>CEH{gw_192_168_50_254}</code>. The machine has no default route on the 10.10.1.0/24 side: everything unknown leaves through the second network."
  },

  // ---------------------------------------------------------------- IPCONFIG
  {
    id: 118,
    type: "ctf",
    pairedWith: 54,
    module: 1,
    moduleTitle: "CTF · Introduction to Ethical Hacking",
    title: "The Generous Stranger",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.61 (Windows Workstation WS-HR07)",
    prompt: "C:\\Users\\Administrator>",
    scenario: "A workstation in the HR department received a very short address lease and its user reports odd network behaviour. The legitimate DHCP and DNS server of the company is the domain controller 10.10.1.2, so a different machine may be answering DHCP requests.",
    task: "Display the complete network configuration of this Windows machine, including the DHCP details. The flag is CEH{rogue_dhcp_<n>}, where <n> is the last octet of the address of the machine that handed out this configuration.",
    solution: "ipconfig /all",
    derivedFlag: true,
    accepted: [/^ipconfig\s+\/all$/i],
    hints: [
      "Hint 1: The basic Windows network command hides the DHCP server. There is a switch that shows every detail.",
      "Hint 2: Use ipconfig with the switch that shows all details (/all), then read the DHCP Server line.",
      "Hint 3: ipconfig /all"
    ],
    diagnostics: [
      { check: (c) => !/^ipconfig\b/i.test(c), msg: "Which Windows command shows the network configuration?" },
      { check: (c) => /\s-+all\b/i.test(c), msg: "Windows switches start with a slash, not a dash." },
      { check: (c) => !/\/all\b/i.test(c), msg: "The short view has no DHCP details. Which switch shows everything?" }
    ],
    tutorNotes: "Teaching point: 'ipconfig /all' shows DHCP server, lease times, DNS servers and the MAC address. A DHCP server that is not the domain controller, a 2-hour lease and a gateway equal to the DHCP server are the signs of a rogue DHCP server (a man-in-the-middle setup). Derived flag: the flag is built from the DHCP server address.",
    cehExamTip: "Exam Alert: A rogue DHCP server can hand out a malicious gateway or DNS server to redirect traffic. DHCP snooping on switches is the countermeasure. 'ipconfig /all' reveals which server issued the lease.",
    output: `Windows IP Configuration

   Host Name . . . . . . . . . . . . : WS-HR07
   Primary Dns Suffix  . . . . . . . : corp.local
   Node Type . . . . . . . . . . . . : Hybrid
   IP Routing Enabled. . . . . . . . : No
   WINS Proxy Enabled. . . . . . . . : No
   DNS Suffix Search List. . . . . . : corp.local

Ethernet adapter Ethernet0:

   Connection-specific DNS Suffix  . : corp.local
   Description . . . . . . . . . . . : Intel(R) 82574L Gigabit Network Connection
   Physical Address. . . . . . . . . : 00-50-56-AA-01-3D
   DHCP Enabled. . . . . . . . . . . : Yes
   Autoconfiguration Enabled . . . . : Yes
   IPv4 Address. . . . . . . . . . . : 10.10.1.61(Preferred)
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Lease Obtained. . . . . . . . . . : Wednesday, October 21, 2026 9:14:02 AM
   Lease Expires . . . . . . . . . . : Wednesday, October 21, 2026 11:14:02 AM
   Default Gateway . . . . . . . . . : 10.10.1.250
   DHCP Server . . . . . . . . . . . : 10.10.1.250
   DNS Servers . . . . . . . . . . . : 10.10.1.250
   NetBIOS over Tcpip. . . . . . . . : Enabled`,
    flagEnc: "ICAgVhEbAVgTblcLBhhyUUFWUA==",
    writeup: "<code>ipconfig /all</code> revealed the DHCP details. The lease came from <code>10.10.1.250</code>, not from the domain controller 10.10.1.2, and the same machine is also the gateway and DNS server: a rogue DHCP server. The flag is <code>CEH{rogue_dhcp_250}</code>."
  },

  // ---------------------------------------------------------------- HOST (TXT)
  {
    id: 119,
    type: "ctf",
    pairedWith: 55,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "A Note from the Admin",
    difficulty: "Beginner",
    points: 150,
    target: "ctf-corp.com",
    prompt: "root@parrot:~#",
    scenario: "The administrator of ctf-corp.com published a few verification entries in the public DNS of the domain and added a personal note of his own. A plain address lookup does not show it.",
    task: "Use a DNS lookup against ctf-corp.com to find the admin's note in the domain's public records and read the flag.",
    solution: "host -t txt ctf-corp.com",
    accepted: [
      (c) => /^host\b/.test(_n(c)) && _has(c, /\s-t\s*txt\s/i) && _hasTarget(c, "ctf-corp.com"),
      (c) => /^dig\b/i.test(_n(c)) && _has(c, /\stxt\s/i) && _hasTarget(c, "ctf-corp.com") && !_has(c, /\saxfr\s/i),
      (c) => /^nslookup\b/i.test(_n(c)) && _has(c, /\s-(type|q|querytype)=txt\s/i) && _hasTarget(c, "ctf-corp.com")
    ],
    hints: [
      "Hint 1: A normal lookup returns addresses and mail servers. Free-form notes live in a different record type.",
      "Hint 2: Use the simple host tool and choose the record type for text with -t.",
      "Hint 3: host -t txt ctf-corp.com"
    ],
    diagnostics: [
      { check: (c) => !/^(host|dig|nslookup)\b/i.test(c), msg: "This is a DNS question. Try a DNS lookup tool." },
      { check: (c) => /^host\b/i.test(c) && !/\s-t\b/.test(c), msg: "A plain lookup shows only the address and mail records. Choose the record type with -t." },
      { check: (c) => !/txt|text/i.test(c), msg: "Which DNS record type holds free-form text?" },
      { check: (c) => !/ctf-corp\.com/i.test(c), msg: "Don't forget the domain: ctf-corp.com." }
    ],
    tutorNotes: "Teaching point: the host tool chooses the record type with -t. TXT records carry SPF, DKIM and verification strings, and sometimes careless notes. The same data is available with dig and nslookup.",
    cehExamTip: "Exam Alert: Query several record types during DNS footprinting: A, MX, NS, TXT, SOA. TXT records reveal mail providers (SPF) and the SaaS services a company uses.",
    output: `ctf-corp.com descriptive text "v=spf1 include:_spf.mailhost.example -all"
ctf-corp.com descriptive text "site-verification=7f2a91c4d0"
ctf-corp.com descriptive text "admin-note={{FLAG}}"`,
    outputVariants: [
      {
        test: /^dig\b/i,
        output: `; <<>> DiG 9.18.1-1-Debian <<>> txt ctf-corp.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 40213
;; flags: qr rd ra; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;ctf-corp.com.                  IN      TXT

;; ANSWER SECTION:
ctf-corp.com.           3600    IN      TXT     "v=spf1 include:_spf.mailhost.example -all"
ctf-corp.com.           3600    IN      TXT     "site-verification=7f2a91c4d0"
ctf-corp.com.           3600    IN      TXT     "admin-note={{FLAG}}"

;; Query time: 9 msec
;; SERVER: 10.10.1.1#53(10.10.1.1) (UDP)`
      },
      {
        test: /^nslookup\b/i,
        output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
ctf-corp.com    text = "v=spf1 include:_spf.mailhost.example -all"
ctf-corp.com    text = "site-verification=7f2a91c4d0"
ctf-corp.com    text = "admin-note={{FLAG}}"

Authoritative answers can be found from:`
      }
    ],
    flagEnc: "ICAgVgsbFVkpRUsXOgZCFxE5SxlEXQcY",
    writeup: "<code>host -t txt ctf-corp.com</code> asked only for the TXT records. Among the SPF and verification strings the administrator had left an <code>admin-note</code> containing the flag. A plain <code>host ctf-corp.com</code> would have shown only the address and mail records."
  },

  // ---------------------------------------------------------------- HOST (zone list)
  {
    id: 120,
    type: "ctf",
    pairedWith: 55,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "List Everything, Politely",
    difficulty: "Intermediate",
    points: 150,
    target: "10.10.1.22 (DNS Server)",
    prompt: "root@parrot:~#",
    scenario: "The internal DNS server 10.10.1.22 is authoritative for the zone ctf-logistics.local. It was set up quickly and may answer anybody who asks it for the whole list of hosts in the zone.",
    task: "Ask the DNS server 10.10.1.22 to list all hosts of the zone ctf-logistics.local. One host name suggests an old backup server. The flag is CEH{backup_<n>}, where <n> is the last octet of that host's IP address.",
    solution: "host -l ctf-logistics.local 10.10.1.22",
    derivedFlag: true,
    accepted: [
      (c) =>
        /^host\b/.test(_n(c)) &&
        (_has(c, /\s-l\s/) || _has(c, /\s-t\s*axfr\s/i)) &&
        _hasTarget(c, "ctf-logistics.local") &&
        _hasTarget(c, "10.10.1.22")
    ],
    hints: [
      "Hint 1: A DNS server that is configured badly will hand out its whole zone to anybody. The simple lookup tool has an option that lists a zone.",
      "Hint 2: Use host with the list-zone option (-l), then the zone name, then the IP of the server to ask.",
      "Hint 3: host -l ctf-logistics.local 10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^host\b/.test(c), msg: "Use the simple DNS lookup tool that has a zone-listing option." },
      { check: (c) => !/\s-l\b/.test(c) && !/axfr/i.test(c), msg: "A normal lookup returns one record. Which option lists the whole zone?" },
      { check: (c) => !/ctf-logistics\.local/.test(c), msg: "The zone to list is ctf-logistics.local." },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Name the server to ask: the DNS server is 10.10.1.22." }
    ],
    tutorNotes: "Teaching point: 'host -l <zone> <server>' performs a zone transfer and prints the A records. A successful transfer to an unauthorised client is a finding. Derived flag: the flag is not in the output, students read the address of the old-backup host.",
    cehExamTip: "Exam Alert: host -l (or dig axfr, nslookup ls) requests a zone transfer over TCP port 53. Only authorised secondary servers should be allowed to do this.",
    output: `Using domain server:
Name: 10.10.1.22
Address: 10.10.1.22#53
Aliases:

ctf-logistics.local name server ns1.ctf-logistics.local.
dispatch.ctf-logistics.local has address 10.10.1.34
erp.ctf-logistics.local has address 10.10.1.35
fleet.ctf-logistics.local has address 10.10.1.36
ns1.ctf-logistics.local has address 10.10.1.22
old-backup.ctf-logistics.local has address 10.10.1.77
vpn.ctf-logistics.local has address 10.10.1.40`,
    flagEnc: "ICAgVgEVBUYDQWxUUhU=",
    writeup: "<code>host -l ctf-logistics.local 10.10.1.22</code> requested a zone transfer and the server listed every host. The name <code>old-backup</code> points to 10.10.1.77, so the flag is <code>CEH{backup_77}</code>. A server that allows this to anyone is misconfigured."
  },

  // ---------------------------------------------------------------- DNSRECON (axfr)
  {
    id: 121,
    type: "ctf",
    pairedWith: 56,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "The Zone Hunter",
    difficulty: "Intermediate",
    points: 150,
    target: "10.10.1.22 (DNS Server)",
    prompt: "root@parrot:~#",
    scenario: "The finance department runs its own zone, ctf-finance.local, on the DNS server 10.10.1.22. An automated DNS enumeration tool can test whether the server leaks the zone, and one record in the zone holds a secret.",
    task: "Use a DNS enumeration tool to test the server 10.10.1.22 for a zone transfer of ctf-finance.local and find the flag in the records you get back.",
    solution: "dnsrecon -d ctf-finance.local -t axfr -n 10.10.1.22",
    accepted: [
      (c) =>
        /^dnsrecon\b/.test(_n(c)) &&
        _has(c, /\s(-d|--domain)[\s=]+ctf-finance\.local\s/) &&
        _has(c, /\s(-t|--type)[\s=]+axfr\s/) &&
        _has(c, /\s(-n|--name_server)[\s=]+10\.10\.1\.22\s/)
    ],
    hints: [
      "Hint 1: Look for the tool that automates DNS reconnaissance, and for the enumeration type that copies a zone from a server.",
      "Hint 2: Use dnsrecon with the domain (-d), the type axfr (-t axfr) and the server to test (-n 10.10.1.22).",
      "Hint 3: dnsrecon -d ctf-finance.local -t axfr -n 10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^dnsrecon\b/.test(c), msg: "Use a DNS enumeration tool. Kali and Parrot ship one that starts with 'dns' and ends with 'recon'." },
      { check: (c) => !/\s(-d|--domain)\b/.test(c) || !/ctf-finance\.local/.test(c), msg: "Give the zone to enumerate: ctf-finance.local." },
      { check: (c) => !/\s(-t|--type)[\s=]+axfr/.test(c), msg: "The default scan only reads the standard records. Which type requests a whole zone?" },
      { check: (c) => !/\s(-n|--name_server)\b/.test(c) || !/10\.10\.1\.22/.test(c), msg: "Aim the test at the DNS server 10.10.1.22 with the name-server option." }
    ],
    tutorNotes: "Teaching point: dnsrecon automates the zone transfer test (-t axfr) and prints every record in a readable format. Compare with dig axfr and host -l from the other labs. A standard scan (-d only) would never contain the secret TXT record.",
    cehExamTip: "Exam Alert: dnsrecon supports std, axfr, brt, rvl and more. A zone transfer returns all records, so internal hostnames and even secrets stored in TXT records are exposed when AXFR is not restricted.",
    output: `[*] Checking for Zone Transfer for ctf-finance.local name servers
[*] Resolving SOA Record
[+]   SOA ns1.ctf-finance.local 10.10.1.22
[*] Resolving NS Records
[*] NS Servers found:
[+]   NS ns1.ctf-finance.local 10.10.1.22
[*] Trying NS server 10.10.1.22
[+] 10.10.1.22 Has port 53 TCP Open
[+] Zone Transfer was successful!!
[*]   SOA ns1.ctf-finance.local 10.10.1.22
[*]   NS ns1.ctf-finance.local 10.10.1.22
[*]   A ledger.ctf-finance.local 10.10.1.52
[*]   A payroll.ctf-finance.local 10.10.1.53
[*]   TXT secret.ctf-finance.local {{FLAG}}
[*] 5 records retrieved from zone transfer`,
    flagEnc: "ICAgVgIMAF8pXVYCDhtyFxwDcgxeXQYY",
    writeup: "<code>dnsrecon -d ctf-finance.local -t axfr -n 10.10.1.22</code> tested the server for a zone transfer. It succeeded and returned every record, including a TXT record named <code>secret</code> that held the flag. A standard scan would have shown none of this."
  },

  // ---------------------------------------------------------------- DNSRECON (brute force)
  {
    id: 122,
    type: "ctf",
    pairedWith: 56,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Guess the Subdomain",
    difficulty: "Intermediate",
    points: 150,
    target: "ctf-corp.com",
    prompt: "root@parrot:~#",
    scenario: "The name servers of ctf-corp.com refuse zone transfers, so the zone cannot simply be copied. The company still has a subdomain whose public DNS record points to a private, internal address (10.x.x.x), a mistake that leaks the internal network layout.",
    task: "Discover the subdomains of ctf-corp.com by guessing names from the wordlist /usr/share/wordlists/dnsmap.txt. Find the subdomain that resolves to a private 10.x address. The flag is CEH{leaked_<name>}, where <name> is that subdomain's name (the part before .ctf-corp.com).",
    solution: "dnsrecon -d ctf-corp.com -t brt -D /usr/share/wordlists/dnsmap.txt",
    derivedFlag: true,
    accepted: [
      (c) =>
        /^dnsrecon\b/.test(_n(c)) &&
        _has(c, /\s(-d|--domain)[\s=]+ctf-corp\.com\s/) &&
        _has(c, /\s(-t|--type)[\s=]+brt\s/) &&
        _has(c, /\s(-D|--dictionary)[\s=]+(\/usr\/share\/wordlists\/)?dnsmap\.txt\s/)
    ],
    hints: [
      "Hint 1: When copying the zone is not allowed, you can still ask the DNS server about many guessed names and keep the ones that exist.",
      "Hint 2: Use dnsrecon with the domain (-d), the brute-force type (-t brt) and the wordlist (-D) /usr/share/wordlists/dnsmap.txt.",
      "Hint 3: dnsrecon -d ctf-corp.com -t brt -D /usr/share/wordlists/dnsmap.txt"
    ],
    diagnostics: [
      { check: (c) => !/^dnsrecon\b/.test(c), msg: "Use the DNS enumeration tool that can guess subdomain names." },
      { check: (c) => !/\s(-d|--domain)\b/.test(c) || !/ctf-corp\.com/.test(c), msg: "Give the domain: ctf-corp.com." },
      { check: (c) => /\s(-t|--type)[\s=]+axfr/.test(c), msg: "Zone transfers are refused here. Which enumeration type guesses names instead?" },
      { check: (c) => !/\s(-t|--type)[\s=]+brt/.test(c), msg: "Which enumeration type brute-forces host names?" },
      { check: (c) => !/\s(-D|--dictionary)\b/.test(c), msg: "A brute force needs a wordlist. It is given with a capital -D." },
      { check: (c) => !/dnsmap\.txt/.test(c), msg: "Use the wordlist /usr/share/wordlists/dnsmap.txt." }
    ],
    tutorNotes: "Teaching point: brute force needs no special permission, it just asks for name.domain for every word. Public DNS must never contain private addresses: intranet.ctf-corp.com pointing at 10.10.1.88 reveals the internal address plan. Derived flag: the flag is not in the output, students take the name of the one subdomain with a 10.x address.",
    cehExamTip: "Exam Alert: Subdomain brute force (dnsrecon -t brt, dnsmap, fierce) finds hosts that are not linked anywhere. Private (RFC 1918) addresses in public DNS leak internal network information.",
    output: `[*] Performing host and subdomain brute force against ctf-corp.com
[*]   A www.ctf-corp.com 203.0.113.10
[*]   A mail.ctf-corp.com 203.0.113.11
[*]   A vpn.ctf-corp.com 203.0.113.12
[*]   A intranet.ctf-corp.com 10.10.1.88
[+] 4 Records Found`,
    flagEnc: "ICAgVg8RB0YTVWwKCxxfAhoDWQs=",
    writeup: "<code>dnsrecon -d ctf-corp.com -t brt -D /usr/share/wordlists/dnsmap.txt</code> tried every name of the wordlist. Three subdomains point to public addresses, but <code>intranet.ctf-corp.com</code> resolves to the private address 10.10.1.88. The flag is <code>CEH{leaked_intranet}</code>."
  },

  // ---------------------------------------------------------------- WGET
  {
    id: 123,
    type: "ctf",
    pairedWith: 57,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Print, Don't Save",
    difficulty: "Beginner",
    points: 150,
    target: "http://10.10.1.22/readme.txt",
    prompt: "root@parrot:~#",
    scenario: "The web server at 10.10.1.22 serves a forgotten text file called readme.txt that contains staging notes. The rules of engagement say you must not leave downloaded files lying around on the test machine.",
    task: "Fetch http://10.10.1.22/readme.txt with the command-line downloader and display its content directly in the terminal, without saving a file. Find the flag in it.",
    solution: "wget -q -O - http://10.10.1.22/readme.txt",
    accepted: [
      (c) => {
        const l = " " + _n(c) + " ";
        const toStdout = /\s(-[a-zA-Z]*O\s*-|--output-document[\s=]+-)\s/.test(l);
        return /^wget\b/.test(_n(c)) && toStdout && /10\.10\.1\.22\/readme\.txt/.test(l);
      }
    ],
    hints: [
      "Hint 1: By default the downloader saves the file to disk. One option sends the content to standard output instead, and the file name for that is a single dash.",
      "Hint 2: Use wget with -O - to print the file, add -q for quiet mode, and give the full URL of readme.txt.",
      "Hint 3: wget -q -O - http://10.10.1.22/readme.txt"
    ],
    diagnostics: [
      { check: (c) => /^curl\b/.test(c), msg: "That would also print it, but this challenge practises the other common command-line downloader." },
      { check: (c) => !/^wget\b/.test(c), msg: "Use the command-line downloader that saves files by default." },
      { check: (c) => !/10\.10\.1\.22\/readme\.txt/.test(c), msg: "Request the file: http://10.10.1.22/readme.txt." },
      { check: (c) => !/\s(-[a-zA-Z]*O\s*-|--output-document[\s=]+-)(\s|$)/.test(c), msg: "That only saves the file to disk. Which option writes the content to the terminal instead?" }
    ],
    tutorNotes: "Teaching point: -O - means 'output document: standard output'. Without -q the progress log is printed first. Without -O - wget just saves readme.txt and the student never sees the content in the terminal.",
    cehExamTip: "Exam Alert: wget and curl are used to download and inspect web content from the command line. Forgotten files such as readme.txt, backup archives and notes often hold credentials and keys.",
    output: `Staging server notes
- admin password rotated (done)
- test data wiped (done)
- deploy key: {{FLAG}}
- TODO: delete this file before go-live`,
    outputVariants: [
      {
        test: (c) => !/\s(--quiet|-[a-zA-Z]*q[a-zA-Z]*)(\s|-|$)/.test(" " + _n(c) + " "),
        output: `--2026-10-21 11:32:10--  http://10.10.1.22/readme.txt
Connecting to 10.10.1.22:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 142 [text/plain]
Saving to: 'STDOUT'

     0K                                                       100% 9.1M=0s

2026-10-21 11:32:10 (9.1 MB/s) - written to stdout [142/142]

Staging server notes
- admin password rotated (done)
- test data wiped (done)
- deploy key: {{FLAG}}
- TODO: delete this file before go-live`
      }
    ],
    flagEnc: "ICAgVhQTA1kpRVw8FhxJDAESUA==",
    writeup: "<code>wget -q -O - http://10.10.1.22/readme.txt</code> wrote the file to standard output instead of saving it (<code>-O -</code>) and suppressed the progress log (<code>-q</code>). The deploy key in the notes was the flag. Without <code>-O -</code> the content would only have been written to a file called readme.txt."
  },

  // ---------------------------------------------------------------- WHATWEB
  {
    id: 124,
    type: "ctf",
    pairedWith: 58,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "What Is the Shop Running?",
    difficulty: "Intermediate",
    points: 150,
    target: "http://10.10.1.40 (Web Application)",
    prompt: "root@parrot:~#",
    scenario: "The company web shop at http://10.10.1.40 was built in a hurry. A technology fingerprinting tool summarises the stack in one line, but a debug header that the summary only mentions by name carries something much more interesting.",
    task: "Fingerprint the web application at http://10.10.1.40 and read the value of its uncommon debug header. That value is the flag.",
    solution: "whatweb -v http://10.10.1.40",
    accepted: [
      (c) => /^whatweb\b/.test(_n(c)) && _has(c, /\s(http:\/\/)?10\.10\.1\.40\/?\s/)
    ],
    hints: [
      "Hint 1: The one-line summary of a fingerprinting tool names the uncommon header but hides its value. The tool can print a more detailed report.",
      "Hint 2: Use whatweb on http://10.10.1.40 with the verbose option (-v) and read the raw HTTP headers section.",
      "Hint 3: whatweb -v http://10.10.1.40"
    ],
    diagnostics: [
      { check: (c) => !/^whatweb\b/.test(c), msg: "Use a web technology fingerprinting tool. Its name starts with 'what'." },
      { check: (c) => !/10\.10\.1\.40/.test(c), msg: "The web shop is at http://10.10.1.40." }
    ],
    tutorNotes: "Teaching point: the default whatweb summary shows UncommonHeaders[x-debug-token] but not the value. The verbose report (-v) prints the raw HTTP headers, including the value. Students who run the plain command see the near-miss output and should be pushed to try a more detailed report.",
    cehExamTip: "Exam Alert: Whatweb fingerprints web servers, frameworks and CMS versions. Uncommon headers such as X-Debug-Token can leak internal information and should be removed in production.",
    output: `WhatWeb report for http://10.10.1.40
Status    : 200 OK
Title     : Acme Shop
IP        : 10.10.1.40
Country   : RESERVED, ZZ

Summary   : Bootstrap, HTML5, HTTPServer[nginx/1.18.0 (Ubuntu)], JQuery[3.5.1], PHP[7.4.3], UncommonHeaders[x-debug-token], X-Powered-By[PHP/7.4.3], nginx[1.18.0]

Detected Plugins:
[ HTTPServer ]
    HTTP server header string. This plugin also attempts to identify the operating system from the server header.
    String      : nginx/1.18.0 (Ubuntu) (from server string)

[ PHP ]
    PHP is a widely-used general-purpose scripting language.
    Version     : 7.4.3

[ UncommonHeaders ]
    Uncommon HTTP server headers. The blacklist includes the common headers.
    String      : x-debug-token (from headers)

[ nginx ]
    Nginx (Engine-X) is a free, open-source, high-performance HTTP server.
    Version     : 1.18.0

HTTP Headers:
    HTTP/1.1 200 OK
    Server: nginx/1.18.0 (Ubuntu)
    Date: Wed, 21 Oct 2026 12:05:40 GMT
    Content-Type: text/html; charset=UTF-8
    Connection: close
    X-Powered-By: PHP/7.4.3
    X-Debug-Token: {{FLAG}}`,
    outputVariants: [
      {
        test: (c) => !_has(c, /\s(-v+|--verbose)\s/),
        output: `http://10.10.1.40 [200 OK] Bootstrap, Country[RESERVED][ZZ], HTML5, HTTPServer[nginx/1.18.0 (Ubuntu)], IP[10.10.1.40], JQuery[3.5.1], PHP[7.4.3], Title[Acme Shop], UncommonHeaders[x-debug-token], X-Powered-By[PHP/7.4.3], nginx[1.18.0]`
      }
    ],
    flagEnc: "ICAgVhQcB1kBVFE8Ew1fARsVSClZVgIBDV8QCQ==",
    writeup: "<code>whatweb -v http://10.10.1.40</code> printed the detailed report with the raw HTTP headers. The summary of the default scan only shows <code>UncommonHeaders[x-debug-token]</code>, but the verbose report reveals the value of <code>X-Debug-Token</code>, which is the flag."
  },

  // ---------------------------------------------------------------- THEHARVESTER
  {
    id: 125,
    type: "ctf",
    pairedWith: 59,
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Addresses in the Search Results",
    difficulty: "Beginner",
    points: 150,
    target: "ctf-corp.com",
    prompt: "root@parrot:~#",
    scenario: "For a phishing-resilience test of ctf-corp.com you need to know which e-mail addresses of the company are visible on the Internet. You must not touch the company's own systems: only public search engines may be used.",
    task: "Collect the public e-mail addresses of ctf-corp.com from a search engine. Exactly one address belongs to a service account (its name starts with svc_). The flag is CEH{mail_<name>}, where <name> is the part before the @ sign of that address.",
    solution: "theHarvester -d ctf-corp.com -b google",
    derivedFlag: true,
    accepted: [
      (c) =>
        /^theharvester\b/i.test(_n(c)) &&
        _has(c, /\s-d[\s=]+ctf-corp\.com\s/) &&
        _has(c, /\s-b[\s=]+(google|bing)\s/i)
    ],
    hints: [
      "Hint 1: A passive OSINT tool can gather e-mail addresses and hostnames of a domain from public search engines. It needs the domain and a data source.",
      "Hint 2: Use theHarvester with the domain (-d ctf-corp.com) and a search engine as source (-b google).",
      "Hint 3: theHarvester -d ctf-corp.com -b google"
    ],
    diagnostics: [
      { check: (c) => !/^theharvester\b/i.test(c), msg: "Use the OSINT tool that harvests e-mails and hosts from public sources." },
      { check: (c) => !/\s-d\b/.test(c) || !/ctf-corp\.com/.test(c), msg: "Give the target domain with -d: ctf-corp.com." },
      { check: (c) => !/\s-b\b/.test(c), msg: "The tool needs to know where to search. Which option selects the data source?" },
      { check: (c) => !/\s-b[\s=]+(google|bing)\b/i.test(c), msg: "Use a classic search engine as the source: google or bing." }
    ],
    tutorNotes: "Teaching point: theHarvester is passive OSINT. Both sources return the service account address, the other addresses differ. Derived flag: the flag is not in the output, students pick out the svc_ address and take the part before the @ sign. Service accounts exposed in public results are an important finding because they often have weak passwords.",
    cehExamTip: "Exam Alert: theHarvester collects e-mail addresses, hostnames and employee names from search engines, PGP servers and other public sources. It is passive footprinting: the target is never contacted.",
    output: `*******************************************************************
* theHarvester 4.6.0                                              *
* Coded by Christian Martorella                                   *
* Edge-Security Research                                          *
* cmartorella@edge-security.com                                   *
*******************************************************************

[*] Target: ctf-corp.com

[*] Searching Google.

[*] No IPs found.

[*] Emails found: 4
----------------------
ceo@ctf-corp.com
hr@ctf-corp.com
sales@ctf-corp.com
svc_backup@ctf-corp.com

[*] Hosts found: 2
---------------------
mail.ctf-corp.com:203.0.113.11
www.ctf-corp.com:203.0.113.10`,
    outputVariants: [
      {
        test: /\s-b[\s=]+bing\b/i,
        output: `*******************************************************************
* theHarvester 4.6.0                                              *
* Coded by Christian Martorella                                   *
* Edge-Security Research                                          *
* cmartorella@edge-security.com                                   *
*******************************************************************

[*] Target: ctf-corp.com

[*] Searching Bing.

[*] No IPs found.

[*] Emails found: 3
----------------------
hr@ctf-corp.com
press@ctf-corp.com
svc_backup@ctf-corp.com

[*] Hosts found: 2
---------------------
vpn.ctf-corp.com:203.0.113.12
www.ctf-corp.com:203.0.113.10`
      }
    ],
    flagEnc: "ICAgVg4VD0EpQkUAOgpMAB8TXQs=",
    writeup: "<code>theHarvester -d ctf-corp.com -b google</code> queried a public search engine for addresses of the domain. Among the results the only service account is <code>svc_backup@ctf-corp.com</code>, so the flag is <code>CEH{mail_svc_backup}</code>. The target never saw a single packet from you."
  }
);
