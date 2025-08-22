#!/usr/bin/env python3
import sys, os, json, re
def extract_title(text, fallback):
    m = re.search(r"<title>([\s\S]*?)</title>", text, re.I)
    return (m.group(1).strip() if m else None) or fallback
if len(sys.argv) < 2:
    print("Usage: python tools/generate_chapters.py <book_folder>"); sys.exit(1)
directory = sys.argv[1]
files = sorted([f for f in os.listdir(directory) if f.lower().endswith(".xhtml")], key=lambda s: [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s)])
chapters = []
for f in files:
    p = os.path.join(directory, f)
    with open(p, "r", encoding="utf-8") as fh:
        txt = fh.read()
    title = extract_title(txt, os.path.splitext(f)[0])
    chapters.append({"file": f, "title": title})
out = os.path.join(directory, "chapters.json")
with open(out, "w", encoding="utf-8") as fh:
    json.dump({"chapters": chapters}, fh, indent=2)
print(f"Wrote {len(chapters)} chapters to {out}")
