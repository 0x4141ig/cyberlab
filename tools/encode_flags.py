"""Turn `flagPlain: "CEH{...}"` into the obfuscated `flagEnc: "..."` in the CTF source files.

Usage (from the project folder):   python tools/encode_flags.py

Write new CTF tasks with `flagPlain`, run this once, and the plain flag disappears from
the source. The encoding is the same XOR + base64 that ctfEncodeFlag() uses in the browser.
It keeps flags out of casual view-source; it is obfuscation, not cryptography.
"""
import base64
import glob
import os
import re

KEY = "ceh-ctf-v13"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def encode(flag):
    raw = bytes(ord(ch) ^ ord(KEY[i % len(KEY)]) for i, ch in enumerate(flag))
    return base64.b64encode(raw).decode()


total = 0
for path in sorted(glob.glob(os.path.join(ROOT, "ctf_questions*.js"))):
    text = open(path, encoding="utf-8", newline="").read()
    count = 0

    def repl(match):
        global count
        count += 1
        return 'flagEnc: "%s"' % encode(match.group(1))

    new = re.sub(r'flagPlain:\s*"(CEH\{[^}]+\})"', repl, text)
    if count:
        open(path, "w", encoding="utf-8", newline="").write(new)
    print("%-32s %d flag(s) encoded" % (os.path.basename(path), count))
    total += count
print("total:", total)
