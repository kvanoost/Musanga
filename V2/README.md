# Musanga V2 — UAV-first reproducible workflow

**Development branch:** `v2`. The established production notebooks remain on `main`.

## Output contract

All files **produced by any V2 notebook**—metadata, audits, training caches, spatial splits, metrics, logs, checkpoints, trained weights, validation maps, predictions, and full-resolution inference—must be written beneath:

```
/content/drive/MyDrive/Colab Notebooks/Musanga/KVO_work/V2/
```

Use separate directories per notebook:

```
KVO_work/V2/
  00_input_audit/
  01_reference_splits/
  02_frozen_baseline/
  03_illumination_harmonization/
  04_illumination_robust_training/
  05_spatial_evaluation/
  06_final_inference/
  07_satellite_targets/
```

Read existing UAV input files, tree annotations, and optional frozen baseline predictions from the **unchanged original Drive locations**, e.g. `Musanga/data/Geo_Ref/` and `Musanga/KVO_work/KVO_04_final_multisite/`. Existing images, georeferencing, annotations, legacy weights and legacy outputs are **immutable**.

## Site and annotation contract

Four legacy training sites: MOS_1_2, Yoko, Yangambi, Baego. Luki was external to original four-site U-Net training. Use the existing `Geo_Ref/Luki.tif` in its **current georeferenced form**; do not re-georeference or resample it for the UAV workflow.

Retain two separate Luki annotation sources:

- Original: `Geo_Ref/Annotations/Tree_Annotation_Luki.gpkg` (layer `photointerpretation_inventory`)
- New Nadine dataset: `Geo_Ref/Annotations/Tree_Annotation_Luki_Nadine.shp` plus its `.shx`, `.dbf`, `.prj` and other provided sidecars.

The authoritative Luki evaluation source is the validated **364-crown** merge produced by V2 Notebook 00: 361 Nadine polygons plus 3 additional field-inventory Musanga polygons from `Annotations/Luki_field_inventory.gpkg` / `couche_top20`, `Espece == Musanga cecropioides` (7 duplicated field crowns). The original `Tree_Annotation_Luki.gpkg` photointerpretation polygons are retained separately and are not used for species labels. These sources must not be combined a second time. Inspect overlap, disagreements, spatial separation, and evaluation leakage first. `Class_ID == 1` denotes Musanga; preserve the original ≥5 m² crown threshold for comparability.

## Notebook sequence

1. [00 — UAV data and illumination audit](00_UAV_Input_Data_Audit.ipynb)
2. [01 — Reference data and spatial splits](01_Reference_Data_and_Spatial_Splits.ipynb) — native UAV crowns, deterministic 250 m block splits, 30 m buffers, independent merged Luki holdout
3. [02 — Frozen U-Net reference and illumination evaluation](02_Frozen_UNet_Reference_and_Illumination_Evaluation.ipynb) — independent Luki crown-level accuracy, brightness-stratified errors and reference-site apparent diagnostics
4. [03 — UAV illumination harmonization](03_UAV_Illumination_Harmonization.ipynb) — CPU-only representative patches, conservative global and local normalization QA, no full mosaics
5. [04 — Illumination-robust U-Net pilot](04_Illumination_Robust_UNet_Pilot.ipynb) — GPU M0/M1/M2 pilot, fingerprinted patch cache, per-epoch progress and resumable checkpoints; Luki excluded
6. 05 — Held-out site and illumination-stratified validation (planned)
7. 06 — Final frozen model and native-resolution UAV probability inference (planned)
8. 07 — Later satellite grid fraction targets (planned; **not** part of initial UAV preprocessing)

No new satellite georeferencing, projection conversion, or target aggregation is permitted in the UAV-only stages. Dataset stats must be measured from Drive sources, not invented from historical results.
