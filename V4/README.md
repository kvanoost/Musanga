# Musanga V4 — RGB + DSM multimodal segmentation

**Branch:** `v4`, branched from `v3`. All V3_1 notebooks and `Final/Outputs/V3_1` remain untouched.

## Scientific contract

Primary objective: compare **RGB-only** and **RGB + DSM-derived surface geometry** in matched, spatially held-out Musanga segmentation. The DSM is an SfM canopy surface, *not* a ground-normalized canopy height model. Do not claim CHM, DTM or foliage vertical structure without external ground/penetrating lidar data.

Keep V3_1's field-grounded KVO annotation semantics, 30 retained exhaustive circles, three within-site spatial folds, exclusion of circle IDs 6/9/24/25, 15-m training buffer, and MOS 3–4 training exclusion. The reference folds must be reused rather than redrawn. All comparisons use matched coverage.

## Notebook numbering (match V3_1)

| Notebook | V4 responsibility | Current status |
| --- | --- | --- |
| [NB00](00_UAV_Input_Data_Audit_v4.ipynb) | Inherit V3_1 approved reference registry, audit RGB/DSM pairing, LAS headers and site coverage | Created; requires Colab execution and DSM path confirmation |
| NB01 | Generate / align DSM structural channels while preserving reference masks and spatial splits | Planned |
| NB02B | Identical M2 RGB vs RGB+DSM spatial 3-fold validation, optional fixed M1 reference | Planned |
| NB03 | Full-mosaic inference for validated RGB+DSM checkpoint with V3_1 feather-blending and restart QA | Planned |
| NB04+ | Satellite predictor and upscaling sequence corresponding to V3_1 | Later, preserve numbering |

## Proposed DSM channels

Start with RGB (3), local canopy prominence, detrended canopy roughness, and convexity (total 6); tune spatial window sizes only within training data. Evaluate an RGB+raw-DSM ablation only if needed. A small, separate LAS 3D pilot may evaluate local vertical point spread, surface normals and observation density in annotated crown samples. Distinguish apparent SfM vertical spread from true foliage architecture.

## Site mapping

* Baego — no LAS identified; DSM/RGB should exist.
* MOS — Mos 1–2, 3–4 and 5–6 SfM clouds.
* Yangambi — Carlier2020 six parts, YBJoseph and YBForgeo.
* Yoko — Yoko_survey_georef.las.

Carlier's six part files constitute **one logical Yangambi point cloud**. Do not merge with other Yangambi acquisitions before CRS, overlap and vertical reference QA.

## Paths

* **Inputs** `Final/Data/` (read-only)
* **New outputs** `Final/Outputs/v4/`
* **Reference manifests** `Final/Outputs/V3_1/` (read-only)
* **Notebook location** `V4/` in this GitHub repository

NB00 does not train models and does not create model-specific outputs. In Google Colab, confirm the DSM raster mapping using the metadata report before moving to NB01.

## Validation distinction

Original V3_1 primary M2 benchmark: 30 held-out circles (R² 0.683, cover MAE 7.297 pp, pixel F1 0.576). The 29-circle Yangambi-16-exclusion result is *post hoc sensitivity* only; warm-start full mosaic QA is in-sample. V4 improvements must be evaluated on the same 30 held-out supports; a LAS-vs-DSM comparison requires matched point-cloud coverage and cannot be compared against all-four-site metrics as if identical.
