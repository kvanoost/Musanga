"""Musanga V4 stable output-path resolver.

Migration-aware: existing notebook reads keep working until outputs are moved.
New outputs can be directed to current/NBxx once migration is validated.

Do not move active NB07 prediction tiles while inference is running.
"""
from pathlib import Path

NOTEBOOKS = ("NB00", "NB01", "NB02", "NB03", "NB04",
             "NB05", "NB05bis", "NB06", "NB07", "NB08")

# Verified currently existing paths. These are not interchangeable experiments.
LEGACY = {
    "NB00": "00_input_audit",
    "NB01": "01_spatial_cover_folds_v2",
    "NB02": "02_rgb_circles_plus_plots_v3",
    "NB03": "03_paired_rgb_unet_v1",
    "NB04": "04_RGB_A_equal_footprints_v1",
    "NB05": "05_rgb_dsm_ms_matched_v1",
    "NB05bis": "05bis_acquisition_quality_v1",
    "NB06": "06_scientific_report_v1",
    "NB07": "07_RGB_MS_100m_ROI_complete_sensors_v4",
}

# Explicit external artifacts that downstream notebooks still read.
SHARED_INPUTS = {
    "audit": "00_input_audit",
    "reference_registry": "00_reference_expansion_v1",
    "spatial_folds": "01_spatial_cover_folds_v2",
    "rgb_references": "02_rgb_circles_plus_plots_v3",
    "rgb_training": "03_paired_rgb_unet_v1",
    "rgb_heldout": "04_paired_rgb_heldout_v1",
    "ms_chip_cache": "04_ms_unet_fourband_chip_cache",
    "joint_chip_cache": "05_optionB_joint_chips_cache_v1",
    "harmonized": "05_harmonized_optionB_v4_003",
}

def outputs_root(musanga_final_root):
    """Take a Path to Musanga/Final (not to Outputs/v4)."""
    return Path(musanga_final_root) / "Outputs" / "v4"

def current_dir(musanga_final_root, notebook, create=False):
    if notebook not in NOTEBOOKS:
        raise ValueError(f"Unknown notebook: {notebook}")
    p = outputs_root(musanga_final_root) / "current" / notebook
    if create:
        p.mkdir(parents=True, exist_ok=True)
    return p

def shared_dir(musanga_final_root, key, create=False):
    if key not in SHARED_INPUTS:
        raise ValueError(f"Unknown shared artifact: {key}")
    base = outputs_root(musanga_final_root)
    modern = base / "shared" / SHARED_INPUTS[key]
    legacy = base / SHARED_INPUTS[key]
    # On transition, prefer migrated artifact only when it exists.
    p = modern if modern.exists() else legacy
    if create:
        p.mkdir(parents=True, exist_ok=True)
    return p

def existing_output(musanga_final_root, notebook):
    """Read-only compatibility path, selected without creating any directories."""
    if notebook not in LEGACY:
        return current_dir(musanga_final_root, notebook)
    current = current_dir(musanga_final_root, notebook)
    legacy = outputs_root(musanga_final_root) / LEGACY[notebook]
    # Only prefer current if it contains actual entries.
    return current if current.exists() and any(current.iterdir()) else legacy
