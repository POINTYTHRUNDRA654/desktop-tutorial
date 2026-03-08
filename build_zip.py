import zipfile
import os

# Addon directory name (must match the folder name Blender expects)
addon_name = "fallout4_tutorial_helper"

files = [
    "__init__.py",
    "operators.py",
    "ui_panels.py",
    "preferences.py",
    "export_helpers.py",
    "imageto3d_helpers.py",
    "hunyuan3d_helpers.py",
    "hymotion_helpers.py",
    "point_e_helpers.py",
    "shap_e_helpers.py",
    "rignet_helpers.py",
    "torch_path_manager.py",
    # Core Fallout 4 helper modules
    "asset_ripper_helpers.py",
    "asset_studio_helpers.py",
    "umodel_tools_helpers.py",
    "umodel_helpers.py",
    "unity_fbx_importer_helpers.py",
    "nvtt_helpers.py",
    "mesh_helpers.py",
    "texture_helpers.py",
    "tool_installers.py",
    "notification_system.py",
    "material_manager.py",
    "quest_helpers.py",
    "npc_helpers.py",
    "desktop_tutorial_client.py",
    "ue_importer_helpers.py",
    # Game asset browsers
    "fo4_game_assets.py",
    "unity_game_assets.py",
    "unreal_game_assets.py",
]

zip_path = "fallout4_tutorial_helper-v2.1.3.zip"

# Remove old zip if exists
if os.path.exists(zip_path):
    os.remove(zip_path)

# Create new zip with proper directory structure
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in files:
        if os.path.exists(file):
            # Add file inside addon directory
            arcname = f"{addon_name}/{file}"
            zipf.write(file, arcname=arcname)
            print(f"Added: {arcname}")
        else:
            print(f"Warning: {file} not found")

print(f"\nZip file created: {zip_path}")
print(f"Size: {os.path.getsize(zip_path)} bytes")
print(f"Structure: {addon_name}/ directory with {len([f for f in files if os.path.exists(f)])} files")
