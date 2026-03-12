$files = @(
    '__init__.py',
    'operators.py',
    'ui_panels.py',
    'preferences.py',
    'tutorial_system.py',
    'notification_system.py',
    'mesh_helpers.py',
    'advanced_mesh_helpers.py',
    'texture_helpers.py',
    'animation_helpers.py',
    'rignet_helpers.py',
    'motion_generation_helpers.py',
    'quest_helpers.py',
    'npc_helpers.py',
    'world_building_helpers.py',
    'item_helpers.py',
    'preset_library.py',
    'automation_system.py',
    'addon_integration.py',
    'desktop_tutorial_client.py',
    'torch_path_manager.py',
    'shap_e_helpers.py',
    'point_e_helpers.py',
    'advisor_helpers.py',
    'knowledge_helpers.py',
    'mossy_link.py',
    'export_helpers.py',
    'image_to_mesh_helpers.py',
    'hunyuan3d_helpers.py',
    'zoedepth_helpers.py',
    'gradio_helpers.py',
    'hymotion_helpers.py',
    'nvtt_helpers.py',
    'realesrgan_helpers.py',
    'get3d_helpers.py',
    'stylegan2_helpers.py',
    'instantngp_helpers.py',
    'imageto3d_helpers.py',
    'tool_installers.py',
    'sync_state.py',
    'ue_importer_helpers.py',
    'umodel_tools_helpers.py',
    'umodel_helpers.py',
    'unity_fbx_importer_helpers.py',
    'asset_studio_helpers.py',
    'asset_ripper_helpers.py',
    'fo4_game_assets.py',
    'unity_game_assets.py',
    'unreal_game_assets.py'
)

$zipPath = 'fallout4_tutorial_helper-v2.1.6.zip'
$addonName = 'fallout4_tutorial_helper'

# Remove old zip if exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

# Create new zip using .NET
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

foreach ($file in $files) {
    if (Test-Path $file) {
        # Add files inside a directory in the zip
        $entryName = "$addonName/$file"
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $entryName, 'Optimal') | Out-Null
        Write-Host "Added: $entryName"
    }
    else {
        Write-Host "Warning: $file not found" -ForegroundColor Yellow
    }
}

$zip.Dispose()

Write-Host "`nZip file created: $zipPath" -ForegroundColor Green
$size = (Get-Item $zipPath).Length
Write-Host "Size: $size bytes"
