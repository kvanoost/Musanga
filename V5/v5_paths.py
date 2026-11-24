"""MUSANGA V5: single, fail-closed path contract for the Colab notebooks.

Imports must never silently fall back to V4/V3.1 data roots.
Use `from v5_paths import PATHS` after adding V5 GitHub directory to sys.path.
"""
from dataclasses import dataclass
from pathlib import Path
import os

DEFAULT_ROOT = "/content/drive/MyDrive/Colab Notebooks/Musanga/Final/V5"

@dataclass(frozen=True)
class V5Paths:
    root: Path
    inputs: Path
    outputs: Path
    qa: Path

    @classmethod
    def from_environment(cls):
        # A different owner's mounted Drive may have a different path.
        # Explicit env override is allowed, but the resolved root must be
        # a dedicated V5 directory, never a historical version directory.
        root = Path(os.environ.get("MUSANGA_V5_ROOT", DEFAULT_ROOT)).expanduser().resolve()
        assert root.name.lower() == "v5", (
            "MUSANGA_V5_ROOT must resolve to the dedicated V5 folder", root
        )
        return cls(root, root/"Inputs", root/"Outputs", root/"QA_and_Manifests")

    def check(self, require_inputs=True):
        for p in (self.root, self.inputs, self.outputs, self.qa):
            if not p.is_dir():
                raise FileNotFoundError(f"Missing V5 directory: {p}")
            if p.is_symlink():
                raise RuntimeError(f"V5 must not use directory symlinks: {p}")
        if require_inputs and not any(self.inputs.iterdir()):
            raise RuntimeError(
                "V5/Inputs empty. Freeze, checksum and verify the immutable raw data first."
            )
        return self

    def inside(self, path, *, kind):
        """Reject reads/writes outside a V5 subtree."""
        root = {"input": self.inputs, "output": self.outputs, "qa": self.qa}[kind]
        candidate = Path(path).expanduser().resolve()
        if not candidate.is_relative_to(root):
            raise RuntimeError(f"Illegal {kind} path outside V5: {candidate}")
        return candidate

PATHS = V5Paths.from_environment()
