# V4 output migration — staged, non-destructive (2026-11-20)

## Objective

One active directory per notebook number under `Final/Outputs/v4/current/`:
`NB00`, `NB01`, `NB02`, `NB03`, `NB04`, `NB05`, `NB05bis`, `NB06`, `NB07`, `NB08`.
The other top-level directories are `shared/` (real cross-notebook inputs and caches) and
`archive/` (obsolete runs, recoverable). Notebook suffixes and version numbers do not define
experiment identity. Only one notebook number belongs to each active slot.

## Created Drive folders

* `current`: https://drive.google.com/drive/folders/14jEkmF47T_NLjXmKLxrxAGl93UMg7Sjz
* `archive`: https://drive.google.com/drive/folders/1bc7Z-qjPJWT9O2X_ZNjKkvrfJgmnhQuu
* `shared`: https://drive.google.com/drive/folders/1nZUdMERItJa7hpVRmxL5Ky7LNFqp9C1u

Folders `current/NB00` through `current/NB08` (plus NB05bis) exist, but are **initially empty**.
The actual production data remains at its original paths to preserve existing notebook behavior.
One explicitly labeled invalid legacy NB02 archive was moved to `archive/`.
**Do not interpret folder creation as a completed migration.**

## Verified dependency constraints (small GitHub notebooks)

* NB00 writes `00_input_audit` and `00_reference_expansion_v1`.
* NB01 uses `00_reference_expansion_v1`, writes/reads both `01_spatial_cover_folds_v1`
  and `01_spatial_cover_folds_v2` in different code sections.
* NB02 reads `00_input_audit`, `01_spatial_cover_folds_v2`, and writes
  `02_rgb_circles_plus_plots_v3`.
* NB03 reads those NB00–NB02 roots and writes `03_paired_rgb_unet_v1`.
* NB04 reads `04_paired_rgb_heldout_v1` and writes `04_RGB_A_equal_footprints_v1`.
* NB05 reads `00_input_audit`, `01_spatial_cover_folds_v2`,
  `02_rgb_circles_plus_plots_v3`, `03_paired_rgb_unet_v1`,
  `04_paired_rgb_heldout_v1`, and writes `05_rgb_dsm_ms_matched_v1`.
* NB05bis includes references to NB01, NB02 and NB05 roots with locally constructed paths.

**NB06, NB07 and NB08 are too large for complete GitHub connector reads.** Do not modify/move
their production outputs before running a full notebook dependency inventory and checking
their current Google Drive state, including Python-built paths and saved checkpoints.

## Correct order of work

1. Stop or finish all NB07 active inference/writes; verify final manifest, tiles and checkpoint.
2. Run `python V4/audit_output_dependencies.py` over the *complete* GitHub checkout.
   It is a read-only initial source scan, not a complete data-lineage proof.
3. Inspect full Drive trees for file-level metadata, checkpoint/caching use and which
   outputs are authoritative; choose one `current/NBxx` producer location per notebook.
4. Implement path changes and tests on branch `chore/v4-output-layout`, with a
   **legacy-path read fallback** until required inputs are migrated. Preserve all
   original files and hashes. Set up one stable output root per notebook.
5. Copy verified results to `current` and shared intermediates to `shared`,
   compare file counts/hashes, run readback and smoke tests from every notebook.
6. Only then move old roots to `archive`; never automatically delete source files
   or unique checkpoints. Remove fallbacks only after all consumers pass.
7. Change production `v4` only after smoke tests and notebook validation.

## GitHub utilities

* `V4/output_paths.py`: read-compatible path resolver and future current-directory targets.
* `V4/audit_output_dependencies.py`: reports literal source references to old outputs;
  can miss dynamic path constructions.

## Why no immediate blanket move

The same notebook sometimes reads a previous version of its own outputs. For instance
NB01 references both `01_spatial_cover_folds_v1` and `v2`. Moving older versions blindly
would break a fresh top-to-bottom run. NB07 is actively performing full mosaic inference
and should be frozen until the job finishes. This migration deliberately prioritizes
data safety over cosmetic folder counts.
