# Musanga V4 — UAV modality information-content evaluation

**Branch:** `v4`, branched from `v3`. All V3_1 notebooks and `Final/Outputs/V3_1` remain untouched.

## Scientific contract

Primary objective: quantify marginal Musanga prediction value from **RGB, DSM canopy-surface geometry, SfM LAS-derived features, multispectral bands and their combinations** using matched, spatially held-out evaluation supports. RGB remains the full-coverage anchor. The DSM is an SfM canopy surface, *not* a ground-normalized canopy height model. Do not claim CHM, DTM or foliage vertical structure without external ground/penetrating lidar data.

Keep V3_1's field-grounded KVO annotation semantics, 30 retained exhaustive circles, three within-site spatial folds, exclusion of circle IDs 6/9/24/25, 15-m training buffer, and MOS 3–4 training exclusion. The reference folds must be reused rather than redrawn. All comparisons use matched coverage.

## Notebook numbering (match V3_1)

| Notebook | V4 responsibility | Current status |
| --- | --- | --- |
| [NB00](00_UAV_Input_Data_Audit_v4.ipynb) | Inherit approved reference registry; RGB/DSM/LAS/MS inventories, separate MS acquisitions and coverage metadata | Updated; new MS Section 04B needs execution |
| [NB01](01_Reference_Data_and_Spatial_Splits_v4.ipynb) | Preserve V3_1 masks/folds and QA DSM structural channels; Sections 14–15 audit MS circle coverage, all four band validity, duplicate band and quicklook registration | Created; DSM and MS circle coverage QA run by user, four-band Section 15 ready |
| NB02B | V3_1 M2 frozen spatial 3-fold validation, matched RGB vs RGB+DSM and modality ablations on common support | Planned |
| NB03 | Full-mosaic inference for validated RGB+DSM checkpoint with V3_1 feather-blending and restart QA | Planned |
| NB04+ | Satellite predictor and upscaling sequence corresponding to V3_1 | Later, preserve numbering |

## Proposed DSM channels

Start with RGB (3), local canopy prominence, detrended canopy roughness, and convexity (total 6); tune spatial window sizes only within training data. Evaluate an RGB+raw-DSM ablation only if needed. A small, separate LAS 3D pilot may evaluate local vertical point spread, surface normals and observation density in annotated crown samples. Distinguish apparent SfM vertical spread from true foliage architecture.

## Site mapping

* Baego — four SfM LAS zones: Nadine_Baego_B2mlt, B3mlt, C2mlt and C3mlt (2023 Green densified point clouds); retain separate zones and check correspondence with RGB areas.
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

## Extended modality experiment (November 2026)

Inventory `Final/Data/MS` in NB00 Section 04B. Acquisition groups:

* Baego: `Baego_MS_4band_RGB_aligned.tif` (4 bands, order/calibration **not yet verified**).
* MOS1–2 and MOS5–6: individual green, red, red-edge, NIR TIFFs. Duplicate MOS1–2 red-edge naming appears in Drive; do not automatically select an arbitrary file.
* Yangambi: `YBJoseph` and `YBForgeo` are **right-hand survey subregions**, not the Carlier/left Yangambi orthomosaic. Their MS information cannot be assigned indiscriminately to the entire Yangambi reference raster; first establish actual acquisition and spatial match.
* Yoko: no MS.

**Validation hierarchy:** (1) Preserve 30-circle RGB V3_1 benchmark; (2) paired 28-circle RGB vs RGB+DSM, subject to crown co-registration, with MOS circles 26/27 missing DSM; (3) MS and LAS ablations **only** on jointly valid, acquisition-compatible `ROI.shp ∩ RGB ∩ modality` support, keeping original circle IDs and fold assignments; (4) optional spatially held-out within-survey windows if 30 circles contain no overlapping MS. Do not claim comparable overall model performance when evaluation supports differ. LAS is image-based SfM, not penetrating lidar.

## NBAA — Annotation consistency (exploration first)

[Open NBAA exploratory notebook](NBAA_Annotation_Consistency_Exploration_v4.ipynb). Input: `Final/Data/Annotations/Verification` (five separate classification CSVs, four independent GeoJSON polygon exports with no extension, plus reference shapefile). Outputs: `Final/Outputs/v4/NBAA_annotation_consistency` only. The notebook audits joined `verify_id` labels, per-annotator polygon coverage, spatial union IoU and one-to-one crown matching. This is a read-only reconnaissance, not an annotator reliability/biological accuracy claim. Unannotated polygons are not automatically non-Musanga. Do not train new models until completeness, geometry and task differences are resolved.
