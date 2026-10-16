# Musanga V3

Clean starting point for Musanga UAV mapping and canopy modelling. Historical notebooks remain available on the `v2` branch.

## Repository

- `Crown/`: preserved crown-analysis notebooks, unchanged.
- `V3/00_UAV_Input_Data_Audit.ipynb`: **start here** — read-only inventory and spatial checks for the new final datasets.
- Subsequent V3 notebooks will be designed from audited data contracts.

## Authoritative Google Drive data

`Musanga/Final/Data/` with these subfolders:

- `Ortho_RGB/`: six RGB orthomosaics: Baego, Yangambi, Yoko, and three MOS mosaics. MOS has **one shared** tree-annotation dataset.
- `DSM/`: Baego DSM currently available; missing DSMs for other sites are expected.
- `Annotations/`: per-site tree annotations, plus `Circles_Annotations.shp` (exhaustive Musanga polygons) and `Circles_ROI.shp` (their exhaustive area boundaries). Pixels outside Musanga polygons are confirmed negative only inside these circles. The separate modelling `ROI.shp` may be in `Ortho_RGB/` or the Data root.

Luki is excluded from V3 owing to low imagery quality. The audit checks actual files and paths at runtime; it does not assume the Windows Explorer truncated filenames are complete.

## Outputs

Notebook 00 writes audit tables and RGB agreement preview figures to `Musanga/Final/Outputs/V3/00_input_audit/` on Drive. No raster copying, reprojection, inference, or training occurs during input audit.

## Annotation quality control

Notebook 00 additionally reports native-RGB illumination, per-site partial crown labels and their class distributions, and circle-level annotation concordance (area precision/recall, Dice/F1, IoU, fractional cover, crown-object F1 at IoU >= 0.5). Per-circle RGB maps show green agreement, orange tree-only and blue exhaustive-only Musanga polygons, following `Crown/02` SAM diagnostics. These comparisons quantify agreement between two annotation sources; they do not automatically imply that unannotated partial crowns are non-Musanga.

## Authoritative modelling mask

The general `ROI.shp` defines usable UAV imagery for illumination QA, model input sampling, training and prediction. **Never model or output predictions outside this ROI.** `Circles_ROI.shp` is a separate mask used only to identify the exhaustively labelled validation/training circles. Notebook 00 Section 05 samples RGB exclusively inside the general ROI.

## Notebook 01 — Reference supervision and within-site spatial CV

- [V3/01_Reference_Data_and_Spatial_Splits.ipynb](01_Reference_Data_and_Spatial_Splits.ipynb) reads Notebook 00's source manifest; prepares in-memory repaired reference polygons, three within-site spatial circle folds, native window-based label/uncertainty masks, and compact train/validation patch manifests.
- Primary task: create high-quality full-ROI UAV Musanga probability maps for later satellite fractional-cover modelling, **not** generalization to never-seen forests. MOS is one forest group despite three mosaics.
- Explicit label contradictions receive zero training weight; unlabelled partial-inventory background remains unknown. Exhaustive circles are the primary quantitative reference. Spatial holdout is used for model selection, followed by refitting on all verified labels for production.
- Outputs written under `Final/Outputs/V3/01_reference_data/`. The notebook deliberately does **not** fit a model, copy whole UAV rasters, or produce full-mosaic predictions.

## Current modelling sequence (October 2026)

1. **[02C — frozen successful M1/M2/M3 comparison](02C_Simple_Models_Fraction_Validation.ipynb)** — saved 15/7 circle split; independent seven-circle cover R² 0.830 and MAE 8.52 percentage points for M2. Do not retrain or overwrite.
2. **[02D — primary within-site CV + illumination](02D_Spatial_CV_Illumination_Comparison.ipynb)** — canonical **new** 02D, not the earlier exploratory `02D_Rotating_Circle_CV_Illumination.ipynb`. Three spatial folds rotate complete exhaustive circles; evaluate M1 and M2 with native RGB, colour augmentation and V2 Notebook 03's **E1 fixed-site luminance correction** (cap 0.85–1.15). Full-circle fraction R², MAE, RMSE, bias and Brier. Produces `02D_selected_strategy.json`.
3. **[02E — selected model four-site LOSO](02E_Selected_Model_LOSO.ipynb)** — runs only after 02D, loads its locked method choice, trains on three sites and evaluates all circles in the fourth site; holds all three MOS mosaics together. Separate transferability benchmark, **not** the main production-selection objective.
4. **03 — final refit and seamless full-ROI orthomosaic inference** — planned. Train selected method on all accepted crowns and circles, export native-resolution feathered probability GeoTIFF with complete valid-ROI coverage checks. Do not assume the prior V2 tiling issues are resolved before production tests.
5. **04 — satellite-grid Musanga fraction targets**, subsequently satellite extrapolation — planned.

Older `02_First_UNet_Pilot.ipynb`, `02B_Overnight_Strategy_Benchmark.ipynb`, and `02D_Rotating_Circle_CV_Illumination.ipynb` are retained for reproducibility only, not the main run sequence. No field-plot data enter 02D/02E. Ground plots remain a separate ecological diagnostic.

**Dependency:** if general `ROI.shp` changed, rerun NB00 data manifest and NB01 reference/windows before starting a fresh 02D. Previously saved 02C/02B checkpoints remain unchanged on Drive. Do not compare new CV metrics against a prior model without considering different ROI/annotation versions.

**Methodological note:** canonical 02D's quantitative CV is based on exhaustive circles. Independent crown-level spatial holdout, to compare fairly with V2 crown AUC, is a separate validation extension rather than a by-product of circle CV. V2-style E1 is not the same as its experimental E2/E3 local illumination methods.
