# MUSANGA V5 — reproducible handover (MIGRATION IN PROGRESS)

**Status: NOT YET RUNNABLE.** This branch intentionally quarantines the copied notebooks with a first-cell safety stop. Do not remove that stop until the V5 dependency audit passes. **Do not delete previous Drive data.**

## Single source of truth

- GitHub branch: `V5`
- Notebooks: `V5/00_*.ipynb` through `V5/08_*.ipynb`, including `05bis` (10 notebooks in all).
- Colab Drive root: `/content/drive/MyDrive/Colab Notebooks/Musanga/Final/V5`
- Google Drive folder: https://drive.google.com/drive/folders/1Ss8xMqp8Im95HBGDZMXpZJIEwEtXv96e
- Permanent raw inputs: `Final/Data` (read-only). Derived outputs: `Final/V5/Outputs`; QA: `Final/V5/QA_and_Manifests`.

Read original source data directly from `Final/Data`. All derived products must be generated under `Final/V5/Outputs`, without reading legacy output directories. Satellite extraction must be regenerated and documented under V5. No raw-data duplication is required.

## Scientific integrity and migration policy

The notebook copies are **frozen reference snapshots**, not refactored V5 implementations yet. All historical scientific analyses and methods have been carried forward intact, with saved outputs removed and an explicit blocking cell added. V5 must retain decisions and traceable performance benchmarks while replacing its historical dependencies. In particular, **NB08 currently reads V3.1 `frozen_50m_reference.parquet`**; that cannot be treated as a legitimate V5-native intermediate. Either regenerate the table from frozen V5-native inputs through NB00–NB07 (including S2 / embeddings acquisition), or explicitly promote it to an immutable, checksum-verified source data product with complete reproducible provenance and a documented scientific limitation. The latter is not a clean end-to-end regeneration and does not satisfy the requested sequential workflow unless explicitly approved.

## Reproducible release acceptance gates

1. Inventory fixed raw source inputs in `Final/Data` using relative paths, sizes, provenance and available checksums. Do not duplicate original data.
2. All V5 notebooks import the same `V5/config.py` or equivalent shared configuration; no hardcoded paths to `Outputs/V3_1`, `Outputs/v4`, `ROOTS`-based legacy discovery, historical cached tables or absolute source paths.
3. Outputs are deterministic, version-stamped, and written under `V5/Outputs/NN_...` only. Each notebook emits a machine-readable output manifest (relative path, SHA-256, upstream manifests and parameters), scientific QA table and `SUCCESS` marker **only after passing assertions**.
4. Notebook NB00–NB08, plus 05bis when part of the scientific workflow, execute in the prescribed order from a new Colab runtime / clean V5 Outputs folder, retaining Final/Data. No fallback reads from legacy directories or internet data outside recorded input acquisition.
5. Frozen test results: expected sample counts/site distributions, ROI sizes, data CRS/resolution, model fingerprints, image and mosaic footprint, V4-era performance benchmark comparisons, bias and high-cover support. Document scientifically justified deviations.
6. Run a second clean sequential execution on a second Colab account or by a colleague granted access to both GitHub and the Drive input dataset; record runtime versions, GPU, Python wheels, Google Earth Engine project credentials and required permissions.
7. Only after two complete successful runs, independently verify all V5 outputs and their checksums, storage capacity and recoverability. Prepare an old-data inventory and a reversible archival plan. **No old data has been deleted.**

## Immediate migration blockers

See `V5/DEPENDENCY_AUDIT.md`. Source `Final/Data` has seven folders (Ortho_RGB, MS, DSM, Annotations, Field, LAS, Patrick) and remains in place. Executable path literals have been redirected to V5 outputs and the permanent source folder. Native manifest and circle reference generation, NB04 upstream evaluation and NB08 satellite extraction remain unresolved; notebooks remain guarded.

## Colab launch

Notebooks are available on the `V5` branch. Example NB00:
https://colab.research.google.com/github/kvanoost/Musanga/blob/V5/V5/00_UAV_Input_Data_Audit_v5.ipynb

**Do not execute staged notebooks until the first-cell migration stop is removed after verification.**
