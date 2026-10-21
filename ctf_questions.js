// ============================================================================
// CTF WALKTHROUGH CHALLENGES (type: "ctf")
// ----------------------------------------------------------------------------
// Beginner-friendly "practice what you learned" challenges. Unlike the guided
// Education tasks, a CTF task never shows the command: the student reads the
// mission, picks the tool, finds the flag inside the output and submits it.
//
// Authoring a new CTF task:
//   * id            -> unique, 101 and up (Education tasks use 1..38)
//   * module        -> 1..5 (topic module, used by the sidebar filter chips)
//   * pairedWith    -> optional id of the Education task this CTF practises; shown as
//                      "Related: Task N" on the CTF card once the challenge is open
//   * accepted      -> RegExp, string, or function(cmd) => boolean
//   * output        -> terminal output; put {{FLAG}} where the flag should appear
//   * outputVariants-> optional [{ test: RegExp|fn, output }] for alternate tools
//   * flagEnc       -> obfuscated flag. Generate it from the browser console with
//                      ctfEncodeFlag("CEH{your_flag_here}")
//                      (obfuscation keeps flags out of casual view-source; it is
//                       not cryptographic security, which is fine for a class.)
//   * hints         -> exactly 3 tiers: nudge, tool, full command
// ============================================================================

const _n = (c) => String(c).trim().replace(/\s+/g, " ");
const _has = (c, re) => re.test(" " + _n(c) + " ");
const _hasTarget = (c, ip) => _n(c).split(" ").includes(ip);
// True when the command scans the given port (no -p flag, -p-, a list, or a range)
const _portsOk = (c, port) => {
  const m = _n(c).match(/\s-p\s*(\S+)/);
  if (!m) return true;
  const v = m[1];
  if (v === "-") return true;
  return v.split(",").some((p) => {
    if (p.includes("-")) {
      const [a, b] = p.split("-").map(Number);
      return port >= a && port <= b;
    }
    return Number(p) === port;
  });
};

const CTF_QUESTIONS = [
  // ---------------------------------------------------------------- ROUND 1: DNS & WEB RECON
  {
    id: 101,
    type: "ctf",
    pairedWith: 4,   // practises Education task 4
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "The Note in the DNS",
    difficulty: "Beginner",
    points: 150,
    target: "certifiedhacker.com",
    prompt: "root@parrot:~#",
    scenario: "The sysadmin of certifiedhacker.com is proud of the company's 'domain verification' setup and left a reminder note somewhere in the public DNS records of the domain.",
    task: "Use DNS reconnaissance against certifiedhacker.com and find the flag hidden in the domain's public records.",
    solution: "dig txt certifiedhacker.com",
    accepted: [
      (c) => /^dig\b/i.test(_n(c)) && _has(c, /\stxt\s/i) && _has(c, /\scertifiedhacker\.com\s/i) && !_has(c, /\saxfr\s/i),
      (c) => /^nslookup\b/i.test(_n(c)) && _has(c, /\s-(type|q|querytype)=txt\s/i) && _has(c, /\scertifiedhacker\.com\s/i)
    ],
    hints: [
      "Hint 1: Free-form notes in DNS are not stored in A or MX records. Which record type is meant for plain text?",
      "Hint 2: Query the TXT record of the domain with a DNS tool (dig or nslookup).",
      "Hint 3: dig txt certifiedhacker.com"
    ],
    diagnostics: [
      { check: (c) => !/^(dig|nslookup)\b/i.test(c), msg: "This is a DNS question. Try a DNS tool such as dig or nslookup." },
      { check: (c) => !/txt/i.test(c), msg: "Which DNS record type holds free-form text notes?" },
      { check: (c) => !/certifiedhacker\.com/i.test(c), msg: "Don't forget the target domain: certifiedhacker.com." }
    ],
    tutorNotes: "Teaching point: TXT records hold SPF, domain verification tokens and sometimes careless notes. Always pull TXT during footprinting.",
    cehExamTip: "Exam Alert: TXT records are used for SPF/DKIM/DMARC and domain ownership proofs. Attackers read them to learn which mail and SaaS providers a company uses.",
    output: `; <<>> DiG 9.18.1-1-Debian <<>> txt certifiedhacker.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 31877
;; flags: qr rd ra; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;certifiedhacker.com.           IN      TXT

;; ANSWER SECTION:
certifiedhacker.com.    3600    IN      TXT     "v=spf1 mx a ip4:10.10.1.0/24 ~all"
certifiedhacker.com.    3600    IN      TXT     "google-site-verification=Zk3b9Qe1Yw0pXJt8aVd2"
certifiedhacker.com.    3600    IN      TXT     "ctf-note={{FLAG}}"

;; Query time: 11 msec
;; SERVER: 10.10.1.1#53(10.10.1.1) (UDP)
;; MSG SIZE  rcvd: 214`,
    outputVariants: [
      {
        test: /^nslookup\b/i,
        output: `Server:         10.10.1.1
Address:        10.10.1.1#53

Non-authoritative answer:
certifiedhacker.com     text = "v=spf1 mx a ip4:10.10.1.0/24 ~all"
certifiedhacker.com     text = "google-site-verification=Zk3b9Qe1Yw0pXJt8aVd2"
certifiedhacker.com     text = "ctf-note={{FLAG}}"

Authoritative answers can be found from:`
      }
    ],
    flagEnc: "ICAgVhcMEnIEVFAMFwxePBcHQyldVgION14GFxRIAkJO",
    writeup: "You queried the <strong>TXT</strong> record type (<code>dig txt certifiedhacker.com</code>). TXT records store arbitrary text such as SPF policies and verification tokens, and admins sometimes leave notes there. Recon tip: always request TXT, MX and NS for a target domain."
  },
  {
    id: 102,
    type: "ctf",
    pairedWith: 5,   // practises Education task 5
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Everything the DNS Server Knows",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (DNS Server)",
    prompt: "root@parrot:~#",
    scenario: "The internal DNS server at 10.10.1.22 is responsible for the domain ctf-corp.local. Rumour says it is badly configured and will happily hand its whole database to anyone who asks nicely.",
    task: "Ask the DNS server for the complete contents of the ctf-corp.local zone and find the flag inside it.",
    solution: "dig axfr ctf-corp.local @10.10.1.22",
    accepted: [
      (c) => /^dig\b/i.test(_n(c)) && _has(c, /\saxfr\s/i) && _has(c, /\sctf-corp\.local\s/i) && _has(c, /\s@10\.10\.1\.22\s/)
    ],
    hints: [
      "Hint 1: There is a special DNS query type that copies an entire zone from one server to another.",
      "Hint 2: Use dig with the AXFR query type, for the domain ctf-corp.local, aimed at the server 10.10.1.22 using @.",
      "Hint 3: dig axfr ctf-corp.local @10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^dig\b/i.test(c), msg: "Use dig to talk directly to the DNS server." },
      { check: (c) => !/axfr/i.test(c), msg: "Which query type requests a full copy of a zone?" },
      { check: (c) => !/ctf-corp\.local/i.test(c), msg: "The zone you want is ctf-corp.local." },
      { check: (c) => !/@10\.10\.1\.22/.test(c), msg: "Aim the query at the DNS server itself using @10.10.1.22." }
    ],
    tutorNotes: "Teaching point: a successful AXFR from an untrusted host means zone transfers are not restricted to secondary name servers. Show how it reveals internal hostnames.",
    cehExamTip: "Exam Alert: DNS zone transfer uses AXFR over TCP port 53. Restrict transfers to authorised secondary servers only.",
    output: `; <<>> DiG 9.18.1-1-Debian <<>> axfr ctf-corp.local @10.10.1.22
;; global options: +cmd
ctf-corp.local.            3600  IN  SOA  ns1.ctf-corp.local. admin.ctf-corp.local. 2026102101 3600 600 86400 3600
ctf-corp.local.            3600  IN  NS   ns1.ctf-corp.local.
ctf-corp.local.            3600  IN  A    10.10.1.22
dev.ctf-corp.local.        3600  IN  A    10.10.1.30
hr-portal.ctf-corp.local.  3600  IN  A    10.10.1.31
vpn.ctf-corp.local.        3600  IN  A    10.10.1.40
secret.ctf-corp.local.     3600  IN  TXT  "{{FLAG}}"
ns1.ctf-corp.local.        3600  IN  A    10.10.1.22
ctf-corp.local.            3600  IN  SOA  ns1.ctf-corp.local. admin.ctf-corp.local. 2026102101 3600 600 86400 3600
;; Query time: 3 msec
;; SERVER: 10.10.1.22#53(10.10.1.22) (TCP)
;; XFR size: 9 records (messages 1, bytes 412)`,
    flagEnc: "ICAgVhkbCEgpRUECCxtLBgYVchNJQwwWDXIGAgNfD0VbCgsPUA==",
    writeup: "<code>dig axfr ctf-corp.local @10.10.1.22</code> requested a full zone transfer. Because the server did not restrict AXFR, it returned every record, including internal hosts (dev, hr-portal, vpn) and a TXT record with the flag."
  },
  {
    id: 103,
    type: "ctf",
    pairedWith: 6,   // practises Education task 6
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Chatty Web Server",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22:8080 (Web Server)",
    prompt: "root@parrot:~#",
    scenario: "A second web application is running on port 8080 of the target. Developers often leave debug information in the HTTP response headers of staging servers.",
    task: "Inspect only the HTTP response headers of the web service on port 8080 at 10.10.1.22 and find the flag.",
    solution: "curl -I http://10.10.1.22:8080",
    accepted: [
      (c) => /^curl\b/i.test(_n(c)) && (_has(c, /\s-[a-zA-Z]*[Iiv][a-zA-Z]*\s/) || _has(c, /\s--(head|include|verbose)\s/)) && /10\.10\.1\.22:8080/.test(c)
    ],
    hints: [
      "Hint 1: Headers are sent before the page body. Your HTTP client needs a flag that shows (or fetches only) the headers. Also check the port.",
      "Hint 2: Use curl with the option that requests headers only (-I), and include the port 8080 in the URL.",
      "Hint 3: curl -I http://10.10.1.22:8080"
    ],
    diagnostics: [
      { check: (c) => !/^curl\b/i.test(c), msg: "Use an HTTP client such as curl." },
      { check: (c) => !/8080/.test(c), msg: "The interesting service is not on the default web port." },
      { check: (c) => !/(\s-[a-zA-Z]*[Iiv]|--head|--include|--verbose)/.test(c), msg: "You need to see the response headers, not just the page body." }
    ],
    tutorNotes: "Teaching point: banner grabbing over HTTP. Server, X-Powered-By and custom X- headers leak technology and sometimes secrets.",
    cehExamTip: "Exam Alert: Banner grabbing can be active (connect and read) or passive. HTTP headers like Server and X-Powered-By reveal software and version.",
    output: `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Wed, 21 Oct 2026 10:44:02 GMT
Content-Type: text/html; charset=utf-8
Content-Length: 1843
Connection: keep-alive
X-Powered-By: PHP/7.4.3
X-Debug-Token: {{FLAG}}
Set-Cookie: PHPSESSID=7f3k2n9d8q1c; path=/; HttpOnly`,
    flagEnc: "ICAgVgsRB0kTQ0A8EQlBCCsSQhluXhYGAFA=",
    writeup: "<code>curl -I http://10.10.1.22:8080</code> fetched only the headers. The custom <code>X-Debug-Token</code> header leaked the flag. Real servers leak software versions and debug data the same way, which is why banner grabbing is an early recon step."
  },
  {
    id: 104,
    type: "ctf",
    pairedWith: 37,   // practises Education task 37
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Please Do Not Crawl",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Web Server)",
    prompt: "root@parrot:~#",
    scenario: "Websites publish a small public file that politely tells search engine crawlers which paths to avoid. Developers sometimes forget that humans (and attackers) can read it too.",
    task: "Retrieve the crawler-instructions file from the web server at 10.10.1.22 and find the flag in it.",
    solution: "curl http://10.10.1.22/robots.txt",
    accepted: [
      (c) => /^curl\b/i.test(_n(c)) && /10\.10\.1\.22(:80)?\/robots\.txt/i.test(c)
    ],
    hints: [
      "Hint 1: The file has a standard name and always lives in the root of the website. It begins with the letter r.",
      "Hint 2: Request /robots.txt from the web server with curl.",
      "Hint 3: curl http://10.10.1.22/robots.txt"
    ],
    diagnostics: [
      { check: (c) => !/^(curl|wget)\b/i.test(c), msg: "Use an HTTP client such as curl to download a file from the web server." },
      { check: (c) => !/robots/i.test(c), msg: "Which standard file tells crawlers what to avoid?" },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Remember the target web server: 10.10.1.22." }
    ],
    tutorNotes: "Teaching point: robots.txt is advice, not access control. Disallowed paths are a treasure map for pentesters.",
    cehExamTip: "Exam Alert: robots.txt is public and lists paths the owner wants hidden from crawlers. It often reveals admin panels and backup folders.",
    output: `User-agent: *
Disallow: /admin/
Disallow: /backup/
Disallow: /internal-notes/
# TODO: remove staging key before launch -> {{FLAG}}
Sitemap: http://10.10.1.22/sitemap.xml`,
    flagEnc: "ICAgVhEbBEICQmwXHRxyCgc5QxlFbAI6G0gABgNZCw==",
    writeup: "<code>curl http://10.10.1.22/robots.txt</code> returned the file. It lists sensitive-looking paths and a careless developer comment containing the flag. Never rely on robots.txt to hide anything."
  },
  {
    id: 105,
    type: "ctf",
    pairedWith: 6,   // practises Education task 6
    module: 2,
    moduleTitle: "CTF · Footprinting & Reconnaissance",
    title: "Read the Fine Print",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Web Server)",
    prompt: "root@parrot:~#",
    scenario: "The intranet landing page of the target looks harmless in a browser, but the HTML source can contain comments that were never meant for visitors.",
    task: "Download the home page of the web server at 10.10.1.22 and read its source to find the flag.",
    solution: "curl http://10.10.1.22",
    accepted: [
      (c) => {
        c = _n(c);
        if (!/^curl\b/i.test(c)) return false;
        if (/\s-[a-zA-Z]*I/.test(" " + c) || /--head/.test(c)) return false;
        const urls = c.split(" ").slice(1).filter((t) => !t.startsWith("-"));
        const url = urls[urls.length - 1] || "";
        return /^(http:\/\/)?10\.10\.1\.22(:80)?\/?$/.test(url);
      }
    ],
    hints: [
      "Hint 1: A browser renders the page; a command-line HTTP client shows you the raw HTML, including comments.",
      "Hint 2: Use curl to request the home page (the root path) of 10.10.1.22 without header-only options.",
      "Hint 3: curl http://10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^curl\b/i.test(c), msg: "Use an HTTP client such as curl to fetch the page source." },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Remember the target web server: 10.10.1.22." },
      { check: (c) => /(\s-[a-zA-Z]*I|--head)/.test(c), msg: "Header-only mode hides the page body. You need the HTML source this time." }
    ],
    tutorNotes: "Teaching point: view-source and HTML comments. Developers leave TODOs, credentials and debug keys in markup.",
    cehExamTip: "Exam Alert: Information gathered from page source (comments, hidden fields, script paths) is part of web application footprinting.",
    output: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CertifiedHacker Intranet</title>
  <link rel="stylesheet" href="/static/site.css">
</head>
<body>
  <h1>Welcome to the Intranet</h1>
  <p>Please log in with your corporate credentials.</p>
  <!-- DEV NOTE: test account disabled. Debug key: {{FLAG}} -->
  <form action="/login" method="post">
    <input type="text" name="user" placeholder="Username">
    <input type="password" name="pass" placeholder="Password">
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`,
    flagEnc: "ICAgVhUdA1opQlwWFwtIPBYDSxlDVjwcB1g8BwVMGEw=",
    writeup: "<code>curl http://10.10.1.22</code> printed the raw HTML. The flag was inside an HTML comment, invisible in a browser but plainly visible in the source. Always read the source before reaching for heavier tools."
  },

  // ---------------------------------------------------------------- ROUND 2: SCANNING & ENUMERATION
  {
    id: 106,
    type: "ctf",
    pairedWith: 10,   // practises Education task 10
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "Odd Service in the Version Column",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "A port scan shows several open ports on 10.10.1.22, but one service is advertising something unusual about itself once you ask it for its version information.",
    task: "Scan the target and detect service versions. One service's version string contains the flag.",
    solution: "nmap -sV 10.10.1.22",
    accepted: [
      (c) => /^nmap\b/i.test(_n(c)) && _has(c, /\s-sV\s/) && _hasTarget(c, "10.10.1.22") && _portsOk(c, 8080)
    ],
    hints: [
      "Hint 1: A basic port scan only says a port is open. A different scan type probes each open port to identify the software and its version.",
      "Hint 2: Run nmap with the service/version detection option (-sV) against 10.10.1.22.",
      "Hint 3: nmap -sV 10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/-sV/.test(c), msg: "Which nmap option detects service versions?" },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Don't forget the target: 10.10.1.22." },
      { check: (c) => /-p\s*\S+/.test(c) && !/8080|-p\s*-/.test(c), msg: "You limited the ports. Make sure the interesting port is included, or scan the default ports." }
    ],
    tutorNotes: "Teaching point: -sV turns 'open' into 'what is running'. Version strings drive vulnerability research.",
    cehExamTip: "Exam Alert: nmap -sV performs service/version detection; -O performs OS detection; -A combines both with scripts and traceroute.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 10:51 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00061s latency).
Not shown: 995 closed tcp ports (reset)
PORT     STATE SERVICE       VERSION
80/tcp   open  http          Microsoft IIS httpd 10.0
135/tcp  open  msrpc         Microsoft Windows RPC
445/tcp  open  microsoft-ds  Microsoft Windows Server 2022 microsoft-ds
3389/tcp open  ms-wbt-server Microsoft Terminal Services
8080/tcp open  http          CTF-Lab httpd 1.0 ({{FLAG}})
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 14.52 seconds`,
    flagEnc: "ICAgVhURFF4fXl08BwlDDREUXilDVhUACUE8AA5IKUJHAgYDUA==",
    writeup: "<code>nmap -sV 10.10.1.22</code> probed each open port to identify its software. Port 8080 returned a custom version string containing the flag. In real engagements the version column is what you search for known vulnerabilities."
  },
  {
    id: 107,
    type: "ctf",
    pairedWith: 12,   // practises Education task 12
    module: 3,
    moduleTitle: "CTF · Scanning Networks",
    title: "What Is the Page Called?",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "The target runs two web servers. Nmap can ask each one for the title of its home page using a built-in script, which is faster than opening every page by hand. The staging site has an interesting title.",
    task: "Use nmap's scripting engine against the target's web ports to read the page titles and find the flag.",
    solution: "nmap --script http-title 10.10.1.22",
    accepted: [
      (c) =>
        /^nmap\b/i.test(_n(c)) &&
        (_has(c, /\s--script[= ](\S*,)?(http-title|default)(,\S*)?\s/) || _has(c, /\s-(sC|A)\s/)) &&
        _hasTarget(c, "10.10.1.22") &&
        _portsOk(c, 8080)
    ],
    hints: [
      "Hint 1: nmap is not just a port scanner. It has a scripting engine (NSE) with scripts for many services, including web servers.",
      "Hint 2: Run nmap with --script and the name of the script that reads an HTTP page title.",
      "Hint 3: nmap --script http-title 10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/(--script|-sC|-A)/.test(c), msg: "You need nmap's scripting engine. Which option runs NSE scripts?" },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Don't forget the target: 10.10.1.22." }
    ],
    tutorNotes: "Teaching point: NSE categories and single scripts. http-title is a quick way to fingerprint many web servers in one sweep.",
    cehExamTip: "Exam Alert: Nmap NSE scripts are invoked with --script. Default scripts (-sC) are safe, commonly used discovery scripts.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 10:55 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00058s latency).
Not shown: 995 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
|_http-title: IIS Windows Server
135/tcp  open  msrpc
445/tcp  open  microsoft-ds
3389/tcp open  ms-wbt-server
8080/tcp open  http-proxy
|_http-title: Staging Portal - {{FLAG}}

Nmap done: 1 IP address (1 host up) scanned in 6.31 seconds`,
    flagEnc: "ICAgVg0HA3IFUkEKFRxePBIPQxJuRAsEHHIQFwdDBW5eChYbUA==",
    writeup: "<code>nmap --script http-title 10.10.1.22</code> ran the http-title NSE script on the web ports. The staging site's title contained the flag. NSE lets you automate checks that would otherwise take many manual requests."
  },
  {
    id: 108,
    type: "ctf",
    pairedWith: 30,   // practises Education task 30
    module: 4,
    moduleTitle: "CTF · Enumeration",
    title: "Mail Server Greeting",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.19 (Linux Mail Server)",
    prompt: "root@parrot:~#",
    scenario: "Mail servers announce themselves with a greeting line as soon as you connect to port 25. Administrators sometimes customise that greeting and put more in it than they should.",
    task: "Grab the SMTP service banner from port 25 on 10.10.1.19 using nmap's scripting engine and find the flag.",
    solution: "nmap -p 25 --script banner 10.10.1.19",
    accepted: [
      (c) => /^nmap\b/i.test(_n(c)) && _has(c, /\s--script[= ]\S*banner/) && _hasTarget(c, "10.10.1.19") && _portsOk(c, 25)
    ],
    hints: [
      "Hint 1: Connecting to a service and reading what it says first is called banner grabbing. Nmap has an NSE script for it.",
      "Hint 2: Run nmap against 10.10.1.19, limit it to port 25, and use the script named banner.",
      "Hint 3: nmap -p 25 --script banner 10.10.1.19"
    ],
    diagnostics: [
      { check: (c) => !/^nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/--script/.test(c), msg: "Use nmap's scripting engine (--script)." },
      { check: (c) => !/banner/.test(c), msg: "Which NSE script simply grabs the service banner?" },
      { check: (c) => !/10\.10\.1\.19/.test(c), msg: "The mail server is 10.10.1.19, not .22." }
    ],
    tutorNotes: "Teaching point: SMTP banners reveal the MTA, hostname and sometimes custom text. Tie this back to SMTP enumeration (VRFY/EXPN).",
    cehExamTip: "Exam Alert: SMTP uses TCP port 25 (and 587/465 for submission). Banner grabbing is usually the first enumeration step against a mail server.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 11:02 UTC
Nmap scan report for 10.10.1.19
Host is up (0.00072s latency).

PORT   STATE SERVICE
25/tcp open  smtp
|_banner: 220 mail.ctf.lab ESMTP Postfix ({{FLAG}})

Nmap done: 1 IP address (1 host up) scanned in 1.12 seconds`,
    flagEnc: "ICAgVgEVCEMTQ0A8BBpIPBIUSBNuWg0RDUEe",
    writeup: "<code>nmap -p 25 --script banner 10.10.1.19</code> connected to SMTP and printed the greeting line. The administrator's custom banner contained the flag. Banners often disclose product, version and hostname with no authentication at all."
  },
  {
    id: 109,
    type: "ctf",
    pairedWith: 32,   // practises Education task 32
    module: 4,
    moduleTitle: "CTF · Enumeration",
    title: "The Share Nobody Remembered",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "Windows hosts expose network shares over SMB on port 445. An old backup share was created years ago and its description field was used as a notepad.",
    task: "Enumerate the SMB shares on 10.10.1.22 with nmap and read the share comments to find the flag.",
    solution: "nmap -p 445 --script smb-enum-shares 10.10.1.22",
    accepted: [
      (c) => /^nmap\b/i.test(_n(c)) && _has(c, /\s--script[= ]\S*smb-enum-shares/) && _hasTarget(c, "10.10.1.22") && _portsOk(c, 445)
    ],
    hints: [
      "Hint 1: SMB (port 445) can list the shares a Windows machine offers. Nmap has an NSE script whose name says exactly what it does.",
      "Hint 2: Use the NSE script that enumerates SMB shares against port 445 of 10.10.1.22.",
      "Hint 3: nmap -p 445 --script smb-enum-shares 10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^nmap\b/i.test(c), msg: "Use the network scanner nmap." },
      { check: (c) => !/--script/.test(c), msg: "Use nmap's scripting engine (--script)." },
      { check: (c) => !/smb-enum/.test(c), msg: "Which NSE script enumerates SMB shares?" },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Don't forget the target: 10.10.1.22." }
    ],
    tutorNotes: "Teaching point: hidden ($) shares are hidden from browsing only, not protected. Anonymous READ on a backup share is a finding.",
    cehExamTip: "Exam Alert: SMB runs on TCP 445 (and NetBIOS session on 139). Null sessions and guest access allow share and user enumeration.",
    output: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-10-21 11:08 UTC
Nmap scan report for 10.10.1.22
Host is up (0.00044s latency).

PORT    STATE SERVICE
445/tcp open  microsoft-ds

Host script results:
| smb-enum-shares:
|   account_used: guest
|   \\\\10.10.1.22\\ADMIN$:
|     Type: STYPE_DISKTREE_HIDDEN
|     Comment: Remote Admin
|     Anonymous access: <none>
|   \\\\10.10.1.22\\Backup$:
|     Type: STYPE_DISKTREE_HIDDEN
|     Comment: {{FLAG}}
|     Anonymous access: READ
|   \\\\10.10.1.22\\C$:
|     Type: STYPE_DISKTREE_HIDDEN
|     Comment: Default share
|     Anonymous access: <none>
|   \\\\10.10.1.22\\IPC$:
|     Type: STYPE_IPC_HIDDEN
|     Comment: Remote IPC
|_    Anonymous access: READ

Nmap done: 1 IP address (1 host up) scanned in 3.84 seconds`,
    flagEnc: "ICAgVgsdAkkTX2wQDQlfBgc5TARUbA0KHHITBglZE1JHBgEV",
    writeup: "<code>nmap -p 445 --script smb-enum-shares 10.10.1.22</code> listed all shares. The hidden <code>Backup$</code> share had anonymous READ access and its comment field held the flag. A trailing $ hides a share from browsing, it does not secure it."
  },
  {
    id: 110,
    type: "ctf",
    pairedWith: 20,   // practises Education task 20
    module: 4,
    moduleTitle: "CTF · Enumeration",
    title: "The Community Is Public",
    difficulty: "Beginner",
    points: 150,
    target: "10.10.1.22 (Windows Server 2022)",
    prompt: "root@parrot:~#",
    scenario: "The target runs an SNMP agent that still uses the default read-only community string. The agent describes the system, including who runs it and where it is located.",
    task: "Walk the SNMP data of 10.10.1.22 using the default community string and find the flag in the system information.",
    solution: "snmpwalk -v2c -c public 10.10.1.22",
    accepted: [
      (c) => /^snmpwalk\b/i.test(_n(c)) && _has(c, /\s-v\s*(1|2c)\s/) && _has(c, /\s-c\s*public\s/) && _hasTarget(c, "10.10.1.22")
    ],
    hints: [
      "Hint 1: SNMP agents protect their data with a 'community string'. The default read-only value is a very common misconfiguration.",
      "Hint 2: Use snmpwalk with SNMP version 1 or 2c, the community string 'public', and the target IP.",
      "Hint 3: snmpwalk -v2c -c public 10.10.1.22"
    ],
    diagnostics: [
      { check: (c) => !/^snmpwalk\b/i.test(c), msg: "Use snmpwalk to walk the SNMP MIB tree." },
      { check: (c) => !/-v\s*(1|2c)/.test(c), msg: "Specify the SNMP version: -v1 or -v2c." },
      { check: (c) => !/-c\s*public/.test(c), msg: "What is the default read-only community string?" },
      { check: (c) => !/10\.10\.1\.22/.test(c), msg: "Don't forget the target: 10.10.1.22." }
    ],
    tutorNotes: "Teaching point: SNMP v1/v2c send the community string in clear text. 'public' and 'private' are the classic defaults; sysContact and sysLocation are free-text fields.",
    cehExamTip: "Exam Alert: SNMP uses UDP 161 (queries) and 162 (traps). Default community strings are 'public' (read) and 'private' (read/write).",
    output: `SNMPv2-MIB::sysDescr.0 = STRING: Hardware: Intel64 Family 6 - Software: Windows Version 10.0 (Build 20348 Multiprocessor Free)
SNMPv2-MIB::sysObjectID.0 = OID: SNMPv2-SMI::enterprises.311.1.1.3.1.3
DISMAN-EVENT-MIB::sysUpTimeInstance = Timeticks: (3487120) 9:41:11.20
SNMPv2-MIB::sysContact.0 = STRING: sysadmin@ctf.lab
SNMPv2-MIB::sysName.0 = STRING: WIN-SRV22
SNMPv2-MIB::sysLocation.0 = STRING: Rack 4 - {{FLAG}}
SNMPv2-MIB::sysServices.0 = INTEGER: 76
IF-MIB::ifNumber.0 = INTEGER: 2`,
    flagEnc: "ICAgVhMBBEEfUmwACgVAFhoPWQ9uQBcXAUMEKw9eKVBsBAwOWR4=",
    writeup: "<code>snmpwalk -v2c -c public 10.10.1.22</code> authenticated with the default community string and dumped system information. The free-text <code>sysLocation</code> field held the flag. Default community strings let anyone enumerate hosts, users and network details."
  }
];
