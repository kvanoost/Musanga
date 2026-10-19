# Musanga V3 — UAV Musanga mapping (October 2026)

## Active notebooks

1. **[00 — UAV input audit](00_UAV_Input_Data_Audit.ipynb)** — input registry, geometry and annotation QA.
2. **[01 — Reference data and spatial folds](01_Reference_Data_and_Spatial_Splits.ipynb)** — five retained UAV mosaics at four sites (Baego, MOS 1–2, MOS 5–6, Yangambi, Yoko), **30 exhaustive Nadine circles**, three within-site spatial folds, candidate training windows and exclusion buffers. **MOS 3–4 is entirely excluded.**
3. **[02A — Partial-only LOSO](02A_Partial_Only_LOSO.ipynb)** — four ImageNet-pretrained ResNet18 U-Nets, each held out from one entire forest site. Separate **site-transfer benchmark**: partial-label ROC-AUC/AP, independent 30-circle fractional cover and spatial occurrence diagnostics. The primary objective is *not* transfer to unseen forests.
4. **[02B — Primary spatial 3-fold M1/M2 benchmark](02B_Exhaustive_Circles_LOSO.ipynb)** — three site-stratified spatial folds, 30 exhaustive circles each tested exactly once per strategy, 15 m exclusion buffer. M1: non-exhaustive annotated crowns only; M2: partial crowns plus *training-fold* exhaustive circles. Same ImageNet-pretrained ResNet18 U-Net, masked BCE, AdamW, crop size and epochs. Evaluate pixel discrimination and overlap, fractional cover and site-level performance. **Block 07** creates publication-ready site-coloured observed–predicted scatterplots with circle IDs, paired circle absolute errors, site facets, fold variability and supplementary **RPD/RPIQ**. No additional training for Block 07.
5. **[02C — Historical reference only](02C_Simple_Models_Fraction_Validation.ipynb)** — preserved frozen earlier 7-circle TinyUNet benchmark; **not part of the current 30-circle ResNet18 experiment**. Do not use to select the current production model.
6. **03 — Final production model (planned)** — select strategy from spatial CV; train on all eligible verified annotations; infer full usable-ROI probability maps on five retained mosaics.
7. **04 — Satellite-grid fraction modelling (planned)** — summarize UAV Musanga probability/cover onto satellite-compatible grids.

## Current scientific priority

Accurate Musanga occurrence and fractional cover **within the four studied forest sites**, not unseen-site transfer. Final model should be multi-site. The within-site 3-fold estimates predictive skill on withheld geographic circles; final all-label refit is not an independent evaluation.

**NB02B outcome (30 held-out circles):** M1 fraction R²≈0.540, MAE≈11.57 pp, pixel F1≈0.387; M2 fraction R²≈0.742, MAE≈9.34 pp, pixel F1≈0.532. Yangambi (old-growth forest) is an important low-contrast, lower-prevalence specificity benchmark. Analyze sites separately as well as pooled.

## Dataset and evaluation safeguards

- RGB from the five retained GeoTIFFs, original projected coordinate system, general modelling ROI. No predictions outside usable ROI.
- Partial crown `Class_ID=1` is Musanga; other numeric class IDs are annotated non-Musanga. Unannotated partial-inventory background is **unknown**, not negative.
- Within exhaustive circles, positive polygons are Musanga regardless of their `Class_ID`; remaining valid in-circle pixels are non-Musanga for supervised M2 training.
- All 30 exhaustive circles are independent when used as a fold's held-out reference; full circle plus 15 m buffer excluded from training windows, including cross-mosaic MOS intersections. The other folds' circles can contribute M2 supervision.
- Only training-fold annotations can be used for model fitting or tuning; test-fold circles are for reporting out-of-fold metrics only.
- Do not infer per-circle cross-validation error bars: each circle has only one out-of-fold prediction per model. The three fold means/SDs describe fold variability, not a confidence interval.
- No changes to model architecture, validation design, training data selection, preprocessing, weighting, or hyperparameters without explicitly discussing scientific consequences first.
- Cached chips and completed checkpoints live on Google Drive; existing earlier versions can be recovered from Git history on branch `v3`.

## Paths

Source data: `Musanga/Final/Data/`.

Current NB01 reference: `Musanga/Final/Outputs/V3/01_reference_data_no_MOS34/`.

NB02A LOSO output: `Musanga/Final/Outputs/V3/02A_partial_only_LOSO_no_MOS34/`.

NB02B spatial CV: `Musanga/Final/Outputs/V3/02B_spatial3fold_no_MOS34/`.

NB02B figures: `Musanga/Final/Outputs/V3/02B_spatial3fold_no_MOS34/figures/`.

Older, superseded NB02 notebooks were removed from the working `v3` directory to reduce clutter; Git history retains them.
