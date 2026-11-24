# V5 dependency inventory (initial source scan, 2026-11-24)

Source snapshot: `restore/nb08-scientific-v4` commit `eac970fa7ba2fddc3a5244683d56cd42472e7e96`.
All ten V4 notebooks copied to `V5/`, all outputs and execution counts cleared, first-cell V5 safety guard inserted.

| V5 notebook | Existing legacy dependency / migration requirement | Status |
|---|---|---|
| 00 Input audit | Reads `Final/Data` and approved V3.1 input-audit manifest; rewrite to establish native V5 immutable raw input registry, with no V3.1 manifest requirement | blocked |
| 01 Reference/spatial folds | Reads `Outputs/v4/00_reference_expansion_v1`; rewire to NB00 V5 registry, validate cover and spatial splits | blocked |
| 02 RGB circles/plots | Reads V3.1 annotated/reference metadata, V4 audit + spatial folds; reconstruct from V5 source labels and NB00/01 outputs | blocked |
| 03 RGB U-Net | Reads V3.1 metadata and V4 annotation, fold and chip outputs; rebuild chips, train and validate from V5-only inputs | blocked |
| 04 RGB evaluation | Reads V4 `04_paired_rgb_heldout_v1`; confirm upstream generation and avoid self-reading old evaluation products | blocked |
| 05 RGB/DSM/MS comparison | Reads V3.1 annotation manifest, V4 matched RGB, folds, NB03 and NB04 outputs; rewire all to V5-native products | blocked |
| 05bis UAV quality | Reads V3.1 manifest, V4 splits and NB05; establish its ordering relative to NB06/07 | blocked |
| 06 Scientific report | Reads V3.1 manifest and V4 NB00–NB05 outputs; convert report to generated V5 scientific products | blocked |
| 07 MS inference | Reads V3.1 manifest, V4 training/model outputs; multiple late-stage cells hardcode Drive root and V4 inference paths; consolidate to one V5 checkpoint and reproducible mosaic reconstruction | blocked |
| 08 Satellite detectability | **Critical:** reads V3.1 `06_spatial_planet_embeddings/CLEAN_NB06/frozen_50m_reference.parquet` for spatial cell grid and S2+embedding predictors; also reads NB07 V4 reconstructed masks and V4 structure products. Must create V5-native satellite reference/extraction and transfer of supporting environmental datasets, then retarget analyses 00–24. | blocked |

## Raw source folders observed in Google Drive

`Final/Data` currently contains `Field/`, `Patrick/`, `LAS/`, `MS/`, `Annotations/`, `Ortho_RGB/`, `DSM/`. These are the **source inventory**, not yet validated against individual notebook read paths, nor copied into `V5/Inputs`.

## Additional handover specifications

- Immutable scientific decisions: binary Musanga band-2 threshold 0.5; six NB07 georeferenced mosaics; spatially independent CV/LOFO; strict balance-qualified MOS B8; 50m primary satellite support and 30m secondary sensitivity. Preserve underlying code and documented uncertainty.
- No copy of generated legacy caches as V5 outputs. Raw/reference snapshots may only be admitted into `Inputs` with explicit provenance, hashes and frozen contract.
- Resolve third-party authorizations for S2 / Earth Engine / embeddings and any NICFI, TMF, Copernicus and forest-condition layers, including collection versions, date ranges and read permissions.
- Never use the presence of source names or output files as evidence that a notebook ran successfully; verify outputs, metadata, and clean-process execution.
- No automated deletion of historical Drive files. Deletion requires a complete inventory, user-approved archival scope, recovery test, and verified V5 release.

## Release ledger

- GitHub branch `V5` created: **yes**
- V5 notebook snapshots copied: **10 of 10**
- Dedicated V5 Drive folders created: **yes**
- Raw data copied and hashed: **no**
- Old paths refactored: **no**
- New native satellite inputs: **no**
- Cold sequential Colab execution: **no**
- Handover to another user: **no**
- Old Drive data deleted: **no**
