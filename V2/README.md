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
  03_illumination_robust_training/
  04_spatial_evaluation/
  05_final_inference/
  06_satellite_targets/
```

Read existing UAV input files, tree annotations, and optional frozen baseline predictions from the **unchanged original Drive locations**, e.g. `Musanga/data/Geo_Ref/` and `Musanga/KVO_work/KVO_04_final_multisite/`. Existing images, georeferencing, annotations, legacy weights and legacy outputs are **immutable**.

## Site and annotation contract

Four legacy training sites: MOS_1_2, Yoko, Yangambi, Baego. Luki was external to original four-site U-Net training. Use the existing `Geo_Ref/Luki.tif` in its **current georeferenced form**; do not re-georeference or resample it for the UAV workflow.

Retain two separate Luki annotation sources:

- Original: `Geo_Ref/Annotations/Tree_Annotation_Luki.gpkg` (layer `photointerpretation_inventory`)
- New Nadine dataset: `Geo_Ref/Annotations/Tree_Annotation_Luki_Nadine.shp` plus its `.shx`, `.dbf`, `.prj` and other provided sidecars.

These sources must not be automatically merged. Inspect overlap, disagreements, spatial separation, and evaluation leakage first. `Class_ID == 1` denotes Musanga; preserve the original ≥5 m² crown threshold for comparability.

## Notebook sequence

1. [00 — UAV data and illumination audit](00_UAV_Input_Data_Audit.ipynb)
2. 01 — Annotation QA and spatial partitions (planned)
3. 02 — Frozen U-Net reproducibility and illumination baseline (planned)
4. 03 — Illumination-robust model development (planned)
5. 04 — Held-out site and illumination-stratified validation (planned)
6. 05 — Final frozen model and native-resolution UAV probability inference (planned)
7. 06 — Later satellite grid fraction targets (planned; **not** part of initial UAV preprocessing)

No new satellite georeferencing, projection conversion, or target aggregation is permitted in the UAV-only stages. Dataset stats must be measured from Drive sources, not invented from historical results.
