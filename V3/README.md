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
- `Annotations/`: per-site tree annotations, plus `Circles_Annotions.shp` (exhaustive Musanga polygons) and `Circles_ROI.shp` (their exhaustive area boundaries). Pixels outside Musanga polygons are confirmed negative only inside these circles. The separate modelling `ROI.shp` may be in `Ortho_RGB/` or the Data root.

Luki is excluded from V3 owing to low imagery quality. The audit checks actual files and paths at runtime; it does not assume the Windows Explorer truncated filenames are complete.

## Outputs

Notebook 00 writes only small reports to `Musanga/Final/Outputs/V3/00_input_audit/` on Drive. No raster copying, reprojection, inference, or training occurs during input audit.
