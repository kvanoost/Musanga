# NB08 V4 scientific recovery — execution notes

This is a **recovery branch**, not an executed scientific validation.

## What was recovered

The complete original 20 November NB08 notebook (21 numbered scientific sections, 00–20), including: physical S2 spectral comparisons, annual vs seasonal ablations, LOFO, multiscale tests, NICFI spectral/texture models, independent ETH canopy-height/JRC disturbance/Copernicus tree-cover controls, UAV SfM DSM roughness sensitivity, within-forest high/low Musanga matching, standardized-difference balance diagnostics, B8 and exploratory band contrasts, spatial-clustered confidence intervals, and 30/50 m diagnostics.

The 22 November simplified V4 pilot is preserved separately in `V4/archive/08_Satellite_Musanga_V4_simplified_pilot_20261122.ipynb`. V4 NB07 full-ROI inference is not changed or rerun.

## V4 input bridge

Run **Section 00, then Section 00V4** before Sections 01–06 and 11–18.

Section 00 reads the legacy reference *feature table* to retain exactly matched geographic cells and satellite/context observations. Section 00V4 reads all six complete V4 NB07 raster products under:

`Final/Outputs/v4/07_RGB_MS_100m_ROI_complete_sensors_v4/reconstructed_mosaics/`

For **every historical reference-table 50 m cell location**, it re-extracts Musanga cover from the existing full-ROI V4 raster (band 2, binary crown cover) and mean probability from band 1. Rejects cells with <90% V4 valid coverage. No neural-network inference, no random subsampling of reference cells, and no satellite imagery download. Strict four-forest support and V4-only outputs:

`Final/Outputs/v4/08_satellite_science_restored/`

The original V3_1 targets and prior predictions must **never** be reused for V4 conclusions. Independent satellite/forest-condition predictors are reused as predictors, subject to their original dates, coverage, and calibration.

**Critical limitations:**

1. These 50 m scientific comparisons cover **all historically selected reference-cell locations**, not newly available parts of the full NB07 ROI. A genuinely exhaustive new V4 satellite grid is a separate task and should not be described as already produced.
2. Historical native **10 m V3_1 teacher rasters** are still hardcoded in old Sections 07–10; do **not** run or cite their outputs as V4. Rebuild the V4 10 m teacher grids from the NB07 full-ROI bands and retarget those sections. Sections 19–20 depend on their new 30/50 m predictions.
3. Legacy independent-product forest-condition sample `07A` and NICFI context features represent the **historical selection and dates**. The V4 updated labels are used at their matched cell coordinates; results do not establish species uniqueness.
4. The notebook is **not executed or validated against the user's Google Drive data by this GitHub edit**. Inspect support/CRS and run assertions in Colab. Do not report the historical V3_1 numerical findings as V4 results.
5. The 90% support estimate uses downsampled V4 raster masks; edge cells should be checked with exact native-area weighting if they materially affect results.

## Safe next steps

- Validate Section 00V4 across Baego, all three MOS mosaic groups, Yangambi and Yoko; compare retained cells and cover distributions. Check the probability-versus-binary target sensitivity.
- Build complete-ROI V4 10 m probability, binary-cover and valid-area grids aligned to the existing S2 inputs; refactor Sections 07–10 and 19–20 to consume only those.
- Run all recovered scientific comparisons, with new unique V4 output fingerprints and the old baseline held only for side-by-side historical comparison.
