# Musanga V3.1 — authoritative notebooks and dependency map

**Branch:** `v3`. Updated 2026-10-26.

## Important rule

**`06_Musanga_Satellite_Clean_v3_1.ipynb` is the authoritative satellite-analysis notebook.** Keep Blocks 00–10 together and append future experiments as numbered blocks. Do not silently refactor or overwrite validated work. The stand-alone `08B` and `09` notebooks are *copies* of analyses now within 06; the 13-series notebooks are separate historical experimental branches, NOT validated replacements.

The numbered notebook names identify historical development stages, not a guarantee that all filenames reflect a single sequential run.

## Pipeline dependencies

| Area | Notebook | Role and inputs | Status |
|---|---|---|---|
| UAV audit | `00_UAV_Input_Data_Audit_v3_1.ipynb` | Input/shapefile audit and manifest | Keep |
| Reference | `01_Reference_Data_and_Spatial_Splits_v3_1.ipynb` | UAV annotations, exhaustive circles and spatial validation definitions | Keep |
| UAV modeling | `02B_Exhaustive_Circles_LOSO_v3_1.ipynb` | ResNet18 U-Net / spatial hold-out training and assessment | Keep |
| UAV inference | `03_Full_Mosaic_M2_Inference_v3_1.ipynb` | Frozen UAV model applied to full orthomosaics; probability maps feed downstream satellite work | Keep |
| Seasonal extraction | `04A_S2_Quarterly_3Year_Extraction_v3_1.ipynb` | Generates 44-band three-year seasonal S2 composites; independent extraction/audit stage | Keep until reconciled |
| Seasonal grid correction | `04A_Quarterly_S2_3Year_Audit_Export_v3_1.ipynb` | Corrected grid orientation/alignment export; outputs `04A_quarterly_3year_gridfix` | Keep until reconciled |
| ROI validation | `04B_ROI_Quarterly_LOSO_v3_1.ipynb` | Uses NB04 aggregates and ROI-restricted satellite inputs; LOSO tests | Keep as supporting stage |
| Satellite source work | `04_Satellite_Musanga_Full_Experiment_v3_1.ipynb` | Establishes and reads `04_satellite_predictors/input_layers`, maps and uncertainty; upstream provenance | Keep |
| Planet + EMB preprocessing | `06_Planet_Embedding_Spatial_Features_v3_1.ipynb` | Produces/uses `06_spatial_planet_embeddings` and native S2/EMB spatial feature inputs | Keep in preprocessing; do not archive yet |
| Satellite modeling | **`06_Musanga_Satellite_Clean_v3_1.ipynb`** | Frozen 14,454 50m reference cells, S2+EMB strict LOFO, Planet comparisons, 08A/08B GEDI, 09 weighting, 10 spatial CNN | **Authoritative; keep intact** |
| External UAV validation | `07_Luki_External_UAV_Validation_v3_1.ipynb` | Uses frozen M2 on Luki; document describes seven northern circles | Keep pending duplicate audit |
| External UAV validation variant | `07_Luki_Northern7_External_Validation_v3_1.ipynb` | Large output-embedded notebook; distinct execution provenance not fully checked | Keep pending duplicate audit |

## Historical or auxiliary notebooks

| Notebook | Classification | Proposed action |
|---|---|---|
| `02D2_V2_Photometric_Augmentation_v3_1.ipynb` | UAV model sensitivity experiment | Archive after verifying model provenance |
| `02F_Paired_V3_V3_1_Cross_Evaluation.ipynb` | Cross-version assessment | Archive after verifying referenced results |
| `04_Satellite_Musanga_Quick_Verification_v3_1.ipynb` | Earlier quick satellite pilot | Archive; not authoritative |
| `04_Satellite_Musanga_Final.ipynb` | Large historical notebook, provenance not fully checked | **Review before moving** |
| `05_Satellite_Predictor_Exploration_Planet_NICFI_v3_1.ipynb` | Planet predictor exploration | Keep supporting until verified |
| `08B_GEDI_Vertical_Structure_v2.ipynb` | Corrected code already integrated into 06 Block 08B | Archive source copy, then remove from top-level |
| `09_Abundance_Weighted_LOFO_S2_EMB.ipynb` | Experiment already integrated into 06 Block 09 | Archive source copy, then remove from top-level |
| `13A2_Planet_UAV_teacher_audit_v3_1.ipynb` | Separate dense-teacher diagnostic | Archive; not merged into 06 |
| `13B_Dense_Planet_UAV_tiles_v3_1.ipynb` | Separate Planet/UAV dense-training experiment | Archive; not merged into 06 |

## Output dependencies (Google Drive, not Git)

- `Final/Outputs/V3_1/03_M2_warmstart_.../probability_maps`: frozen UAV full-mosaic probability rasters.
- `Final/Outputs/V3_1/04_satellite_predictors/input_layers/{RAW_ANNUAL,S2_QUARTERLY_3YR,EMB_ANNUAL}`: native 10 m remote-sensing predictors.
- `Final/Outputs/V3_1/06_spatial_planet_embeddings`: cached satellite and Planet processing.
- `.../CLEAN_NB06/frozen_50m_reference.parquet`: authoritative 14,454-cell satellite modeling reference.
- `.../CLEAN_NB06/08_GEDI_UAV_matching` and `08B_GEDI_vertical_structure`: GEDI descriptive analyses.
- `.../CLEAN_NB06/09_abundance_weighted_LOFO`: 60 completed weighting fits and comparisons.
- `.../CLEAN_NB06/10_native_spatial_CNN`: current native spatial CNN work.

**Moving repository notebooks does not move the data in Google Drive.** Keep original output directories unchanged. Before any notebook is removed from the repository root, verify that no active workflow imports it by file path, check exact content SHA of the archived copy, and ensure the master or retained notebook contains the needed functionality.

## Cleanup result — 2026-10-26

**Completed on branch `v3` in commit `374f9b10`:** seven historical or companion notebooks were moved out of the `V3_1` root into `V3_1/archive/`, preserving the **exact original Git blob SHA** (identical contents):

- `02D2_V2_Photometric_Augmentation_v3_1.ipynb` and `02F_Paired_V3_V3_1_Cross_Evaluation.ipynb` — historical UAV model comparisons
- `04_Satellite_Musanga_Quick_Verification_v3_1.ipynb` — historical quick transfer pilot
- `08B_GEDI_Vertical_Structure_v2.ipynb` — GEDI analysis already copied into the main 06 master
- `09_Abundance_Weighted_LOFO_S2_EMB.ipynb` — experiment already copied into the main 06 master
- `13A2_Planet_UAV_teacher_audit_v3_1.ipynb` and `13B_Dense_Planet_UAV_tiles_v3_1.ipynb` — independent Planet/UAV dense supervision experiments; archived, **not merged into NB06**

**Verification:** 14 notebooks remain directly under `V3_1` (down from 21); 9 notebooks are in `archive/` (up from 2). The master `06_Musanga_Satellite_Clean_v3_1.ipynb` has the same blob SHA `55bcdf5ed8f4956f8ea5018fba9cd4ba368bc534` before and after the archive commit.

**Retained intentionally:** `04_Satellite_Musanga_Final.ipynb` (large historical notebook, unique provenance not yet established); both Luki 07 notebooks (different execution/output evidence); both 04A stages, 04B, and `06_Planet_Embedding_Spatial_Features_v3_1.ipynb` (active upstream data dependencies). These have **not** been declared duplicates or deleted.

Data files, model checkpoints, output directories and all previously created predictions were not changed. Because notebook paths may be referenced by external Colab links, archived companions should be opened at their new path.

## Working convention going forward

1. New validated satellite experiments are numbered sequentially **inside the master 06 notebook**.
2. Use separate notebooks only for distinct upstream preprocessing/UAV inference or external validation workflows.
3. Keep exploration and superseded versions in `archive/` rather than renaming them to another apparent master.
4. Keep an exact Git revision in analyses and reports; opening a cached Colab copy of the `v3` branch is not the same as opening the latest code.
