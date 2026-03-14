"""Build script for the Fallout 4 Mod Assistant Blender add-on.

Produces fallout4_tutorial_helper-v2.1.3.zip with the correct internal
directory structure (fallout4_tutorial_helper/<file>) so Blender can
install it directly from the zip.

Excludes:
  - build helpers / example / test scripts that are not part of the add-on
  - material_manager.py  (does not exist — legacy reference removed)
  - __pycache__ / *.pyc
"""

import zipfile
import os
from pathlib import Path

# ── Identity ──────────────────────────────────────────────────────────────────
ADDON_NAME = "fallout4_tutorial_helper"
VERSION    = "2.4.0"
ZIP_PATH   = f"{ADDON_NAME}-v{VERSION}.zip"

# ── Add-on Python modules (all must exist in the repo root) ───────────────────
ADDON_FILES = [
    # Entry point
    "__init__.py",

    # UI + operators
    "operators.py",
    "ui_panels.py",
    "preferences.py",

    # Core FO4 helpers
    "mesh_helpers.py",
    "advanced_mesh_helpers.py",
    "texture_helpers.py",
    "export_helpers.py",
    "tool_installers.py",
    "notification_system.py",
    "nvtt_helpers.py",
    "realesrgan_helpers.py",
    "animation_helpers.py",
    "advisor_helpers.py",
    "mossy_link.py",
    "knowledge_helpers.py",

    # Asset browsers / importers
    "asset_ripper_helpers.py",
    "asset_studio_helpers.py",
    "umodel_tools_helpers.py",
    "umodel_helpers.py",
    "unity_fbx_importer_helpers.py",
    "ue_importer_helpers.py",
    "fo4_game_assets.py",
    "unity_game_assets.py",
    "unreal_game_assets.py",

    # AI / ML helpers
    "image_to_mesh_helpers.py",
    "imageto3d_helpers.py",
    "hunyuan3d_helpers.py",
    "hymotion_helpers.py",
    "gradio_helpers.py",
    "get3d_helpers.py",
    "stylegan2_helpers.py",
    "instantngp_helpers.py",
    "zoedepth_helpers.py",
    "rignet_helpers.py",
    "motion_generation_helpers.py",
    "shap_e_helpers.py",
    "point_e_helpers.py",
    "torch_path_manager.py",

    # World / quest / NPC / item helpers
    "quest_helpers.py",
    "npc_helpers.py",
    "world_building_helpers.py",
    "item_helpers.py",

    # System / workflow helpers
    "preset_library.py",
    "automation_system.py",
    "addon_integration.py",
    "desktop_tutorial_client.py",
    "tutorial_system.py",
    "sync_state.py",
]

# ── knowledge_base/ directory (markdown files Mossy reads) ───────────────────
KB_DIR = Path("knowledge_base")

# ── Build ─────────────────────────────────────────────────────────────────────
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)

added = 0
skipped = []

with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:

    # Python modules
    for fname in ADDON_FILES:
        if os.path.exists(fname):
            zipf.write(fname, arcname=f"{ADDON_NAME}/{fname}")
            print(f"  [OK]  {ADDON_NAME}/{fname}")
            added += 1
        else:
            skipped.append(fname)
            print(f"  [SKIP]  {fname}  ← NOT FOUND, skipped")

    # knowledge_base/ markdown files
    if KB_DIR.is_dir():
        for md_file in sorted(KB_DIR.glob("*.md")):
            arcname = f"{ADDON_NAME}/knowledge_base/{md_file.name}"
            zipf.write(str(md_file), arcname=arcname)
            print(f"  [OK]  {arcname}")
            added += 1
    else:
        print(f"  ℹ  {KB_DIR}/ not found — skipping knowledge base files")

size_kb = os.path.getsize(ZIP_PATH) / 1024
print(f"\n{'='*60}")
print(f"  Built: {ZIP_PATH}")
print(f"  Files: {added}")
print(f"  Size:  {size_kb:.1f} KB")
if skipped:
    print(f"  Skipped ({len(skipped)}): {', '.join(skipped)}")
print(f"{'='*60}")
