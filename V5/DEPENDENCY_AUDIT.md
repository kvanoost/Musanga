# V5 dependency inventory — updated 2026-11-25

Historical code snapshot: `restore/nb08-scientific-v4` commit `eac970fa7ba2fddc3a5244683d56cd42472e7e96`. Original V3/V3.1/V4 branches remain available for scientific provenance. V5 is a new native pipeline; names of a few V5 audit files retain historical labels but are generated anew under V5.

| Notebook | Native dependencies | Migration / run state |
|---|---|---|
| 00 | permanent raw Final/Data | executed |
| 01 | NB00 native registry | executed |
| 02 | raw labels, NB00/01 | executed |
| 03 | raw labels/RGB, NB00/01/02 | executed |
| 04 | NB03 V5 checkpoints, NB00–02 | executed |
| 05 | NB03/04, raw DSM and MS | executed (five arms) |
| 05bis | NB04/05 and raw RGB/MS headers | earlier V5 version executed; optimized RGB-only version awaiting execution |
| 06 | NB00/04/05, optional NB05bis, raw excerpts | report and manifest observed in V5 Drive |
| 07 | raw RGB/labels, NB00/01, NB03/05 contracts | production training and reconstruction running |
| 08 | NB07 native complete mosaic manifest, raw ROI, newly acquired Earth Engine data | code revised; not executed |

## Open acceptance items

- NB07 completion manifest and NB08 native run not yet verified.
- NB08 now regenerates six-resolution UAV target grids and all principal S2/embedding inputs. It does not read historical frozen reference tables, old TIFFs, or historical structure products.
- Native 1m sampling approximates area; compare with exact native pixel-area spot checks and report discrepancies.
- Optional independently sourced controls must pass access and support gates; balance-qualified matching and MOS slope analysis may be inconclusive or unavailable. JRC release is explicitly v1_2025 with Dec2020 status, not an undocumented historical version.
- NICFI/embedding-context and UAV DSM-context optional ablations are not regenerated. Historical code is preserved, but GitHub code does not preserve the numeric/raster artifacts; retain unique scientific artifacts before deleting old outputs.
- The earlier V4-to-V5 accuracy improvement remains scientifically unexplained and should be independently audited; do not attribute it to unified training alone.
- The original source files stay in Final/Data (Field, Patrick, LAS, MS, Annotations, Ortho_RGB, DSM). The incomplete V5/Inputs/Ortho_RGB copy is not used by notebooks.
- QA_and_Manifests was empty at Drive inspection. Existing stage-level manifests under Outputs are not a substitute for full raw-file checksums, an independently executed release, and a reviewed archival inventory.
- No data has been deleted. Cleanup authorization remains false in the new NB08 completion manifest.

## Final cleanup decision

Verify the complete native run, raw input inventory, permissions, package versions, transfer reproducibility and optional historical artifact retention. Keep both Final/Data and Final/V5. Do not delete Final/Outputs wholesale because unique manually authored reports were observed there.
