#!/usr/bin/env python3
"""Audit Musanga V4 notebook output-path dependencies before any move.

Run from a checked-out repository:
    python V4/audit_output_dependencies.py

No files or folders are modified. The report includes all executed code cells
and markdown references; use it to verify migration plans including large NB06–08.
"""
import collections
import json
import re
from pathlib import Path

V4 = Path(__file__).resolve().parent
PAT = re.compile(r"(?:Final/)?Outputs/v4/([A-Za-z0-9_.-]+)")
PREFIX = re.compile(r"^(\d{2}(?:bis)?)_")

def notebook_id(path):
    m = PREFIX.match(path.name)
    return "NB" + m.group(1) if m else path.name

report = {}
reverse = collections.defaultdict(set)
for path in sorted(V4.glob("*.ipynb")):
    nb = json.loads(path.read_text(encoding="utf-8"))
    refs = collections.Counter()
    examples = {}
    for i, cell in enumerate(nb.get("cells", [])):
        source = cell.get("source", [])
        if isinstance(source, list):
            source = "".join(source)
        for m in PAT.finditer(source):
            folder = m.group(1)
            refs[folder] += 1
            reverse[folder].add(notebook_id(path))
            examples.setdefault(folder, f"cell={i} type={cell.get('cell_type')}")
    report[path.name] = {"notebook_id": notebook_id(path),
                         "dependencies": dict(sorted(refs.items())),
                         "examples": examples}

print("NOTEBOOK DEPENDENCIES")
for fname, row in report.items():
    print(f"\n{row['notebook_id']} {fname}")
    for folder, count in row["dependencies"].items():
        print(f"  {folder}: {count} reference(s) [{row['examples'][folder]}]")
print("\nREVERSE DEPENDENCY INDEX")
for folder in sorted(reverse):
    print(f"{folder}: {', '.join(sorted(reverse[folder]))}")

out = V4 / "output_dependency_audit.json"
out.write_text(json.dumps({"notebooks": report,
                           "consumers": {k: sorted(v) for k, v in reverse.items()}},
                          indent=2), encoding="utf-8")
print(f"\nSaved {out}")
print("NO DATA MOVED; NO NOTEBOOKS EDITED.")
