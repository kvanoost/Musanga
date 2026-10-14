# Musanga V2 — UAV-first reproducible workflow

**Development branch:** `v2`. The established production notebooks remain on `main`.

## Output contract

Research and experimental files produced by V2 notebooks—metadata, audits, training caches, spatial splits, metrics, logs, checkpoints, trained weights and experimental inference—are written beneath:

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

The older archived Luki evaluation source was the **364-crown** merge produced by V2 Notebook 00: 361 Nadine polygons plus 3 additional field-inventory Musanga polygons from `Annotations/Luki_field_inventory.gpkg` / `couche_top20`, `Espece == Musanga cecropioides` (7 duplicated field crowns). The original `Tree_Annotation_Luki.gpkg` photointerpretation polygons are retained separately and are not used for species labels. These sources must not be combined a second time. Inspect overlap, disagreements, spatial separation, and evaluation leakage first. `Class_ID == 1` denotes Musanga; preserve the original ≥5 m² crown threshold for comparability.

## Notebook sequence

1. [00 — UAV data and illumination audit](00_UAV_Input_Data_Audit.ipynb)
2. [01 — Reference data and spatial splits](01_Reference_Data_and_Spatial_Splits.ipynb) — native UAV crowns, deterministic 250 m block splits, 30 m buffers, independent merged Luki holdout
3. [02 — Frozen U-Net reference and illumination evaluation](02_Frozen_UNet_Reference_and_Illumination_Evaluation.ipynb) — independent Luki crown-level accuracy, brightness-stratified errors and reference-site apparent diagnostics
4. [03 — UAV illumination harmonization](03_UAV_Illumination_Harmonization.ipynb) — CPU-only representative patches, conservative global and local normalization QA, no full mosaics
5. [04 — Illumination-robust U-Net training, LOSO and final Luki test](04_Illumination_Robust_UNet_Pilot.ipynb) — pilot (00–08), four-site LOSO (09–11), final M1 trained on four development sites and external versioned Luki evaluation (12–14); Luki excluded from model fitting
6. 05 — Held-out site and illumination-stratified validation (planned)
7. 06 — Final frozen model and native-resolution UAV probability inference (planned)
8. 07 — Later satellite grid fraction targets (planned; **not** part of initial UAV preprocessing)

No new satellite georeferencing, projection conversion, or target aggregation is permitted in the UAV-only stages. Dataset stats must be measured from Drive sources, not invented from historical results.


## October 2026 — corrected M1 full-map production and satellite handoff

**Notebook 04 Sections 25–28** supersede its earlier experimental Sections 16/18 full-map inference **for new production products**. The saved four-forest M1 checkpoint (run `337073e7b74f`) is unchanged. Small-area experiments (Sections 23–24) found severe hard-edge 512px tile seams; raised-cosine feather blending using a 128px context halo, 512px output blocks at 256px stride largely suppressed artificial seams at Luki and Yoko. This does **not** by itself correct any bias in predicted Musanga fraction.

1. **Section 25 (GPU):** Corrected native-resolution feathered inference for all five sites (MOS_1_2, Yoko, Yangambi, Baego, Luki), resumable in 1024px rows. Canonical **new** production rasters and manifests go to `KVO_work/KVO_04_final_multisite/probability_maps_M1_feathered_v2/`. The historical original `KVO_work/KVO_04_final_multisite/probability_maps/` products are never overwritten. The initial `TEST_STRIPES25=1` is a safety smoke test; set it to `None` for complete products. Mosaics are large; only completed rasters with manifests may be reused downstream.
2. **Section 26 (CPU):** Census the **entire old and new full raster maps**, with identical source RGB-valid pixels, per-site means, P≥0.5 cover fractions, histogram summaries and residual grid seams. Crown-only scores are secondary checks, not proof of unbiased fractional cover.
3. **Section 27 (CPU):** Reuse `KVO_work/KVO_07_GEE_direct_upload_optimized/` satellite upstream data and `KVO_work/KVO_08_satellite_fraction/` feature caches, previously established evaluation design, and satellite grids. Build **new** 10m UAV-response GeoTIFFs in `KVO_08_satellite_fraction/uav_targets_10m_feathered_M1_v2/`, aligned to actual original KVO_08 target GeoTIFF templates where available. **Luki's native UAV grid has a different CRS** and MUST be reprojected *only as part of target aggregation* to the relevant original satellite grid, using raster reprojection with area averaging. Do not reproject the source orthomosaic or confuse its native probability raster with the 10m target. If original grids exist only in Google Earth Engine, reuse the exact KVO_08 grid/export specification; do not infer a projection from another site. Existing satellite trained-model metrics are not valid for the changed target; reuse features and code but re-fit/reevaluate.
4. **Section 28 (CPU, guarded cleanup):** Once all five corrected maps are verified, move obsolete hard-edge *V2 experimental* probability TIFFs into `KVO_work/KVO_04_final_multisite/archive_V2_hardedge_probability_maps/`. No permanent deletion; no checkpoint, reference, metric or original historical probability map is moved. Dry-run by default; set `APPLY_ARCHIVE28=True` after inspection.

**External Luki crown references:** after the earlier 364-crown snapshot, the locked updated Luki dataset has **479 valid crowns** (249 Musanga, 230 non-Musanga), version `d957b570055bf5dd`, at `V2/01_reference_splits/luki_reference_versions/d957b570055bf5dd/01_Luki_frozen_external_reference.gpkg`. Earlier Luki counts are archival and should not be reported as the current independent test.
