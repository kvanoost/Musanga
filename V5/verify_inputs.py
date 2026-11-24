"""V5 immutable input manifest verification (Python 3.9+).

Usage: python V5/verify_inputs.py /path/to/Final/V5

Read-only. Checks every listed immutable input file exists, has expected size,
and matches the SHA-256 in QA_and_Manifests/input_manifest.json.
No reference to old version data or external folder is allowed.
"""
from pathlib import Path
import hashlib,json,sys

def digest(path):
    h=hashlib.sha256()
    with open(path,"rb") as stream:
        for block in iter(lambda:stream.read(8*1024*1024),b""):
            h.update(block)
    return h.hexdigest()

def verify(root):
    root=Path(root).expanduser().resolve()
    assert root.name.lower()=="v5",root
    manifest=root/"QA_and_Manifests"/"input_manifest.json"
    if not manifest.is_file():
        raise FileNotFoundError("Missing V5 immutable source manifest: "+str(manifest))
    obj=json.loads(manifest.read_text())
    entries=obj.get("files",[])
    if not entries:
        raise ValueError("Input manifest contains no files")
    expected=set()
    for row in entries:
        rel=Path(row["relative_path"])
        if rel.is_absolute() or ".." in rel.parts:
            raise ValueError("Unsafe manifest path: "+str(rel))
        p=(root/"Inputs"/rel).resolve()
        p.relative_to((root/"Inputs").resolve())
        if not p.is_file() or p.is_symlink():
            raise FileNotFoundError("Missing or linked input: "+str(p))
        if p.stat().st_size!=int(row["bytes"]):
            raise ValueError("Input size mismatch: "+str(rel))
        if digest(p)!=row["sha256"]:
            raise ValueError("Input hash mismatch: "+str(rel))
        expected.add(rel.as_posix())
    observed={p.relative_to(root/"Inputs").as_posix() for p in
        (root/"Inputs").rglob("*") if p.is_file()}
    if observed!=expected:
        raise ValueError(
            "Manifest/input mismatch. Unlisted: "+str(sorted(observed-expected))+
            "; missing from disk: "+str(sorted(expected-observed)))
    print(f"Verified {len(entries)} immutable V5 inputs under {root}")
    return True

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("Usage: python V5/verify_inputs.py /path/to/Final/V5")
    verify(sys.argv[1])
