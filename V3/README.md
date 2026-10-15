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
