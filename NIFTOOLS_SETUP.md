# Niftools setup (Fallout 4 NIF export)

The add-on now calls the Blender Niftools exporter when it is installed. Install it for each Blender version you use.

## Compatibility
- Official release v0.1.1 (2023-11-03) supports Blender 2.8–3.6. It is not marked compatible with Blender 4.x yet.
- If you use Blender 4.x (e.g., 4.5.5), install Blender 3.6 LTS side-by-side and perform the final NIF export there, or rely on the FBX fallback and external converters.

## Quick install on Windows (PowerShell)
```
# From repo root
pwsh -File tools/install_niftools.ps1 -BlenderVersion 3.6
```
This downloads and extracts the Niftools add-on into:
```
%APPDATA%\Blender Foundation\Blender\3.6\scripts\addons
```
Then open Blender 3.6 → Edit → Preferences → Add-ons → search "NetImmerse" and enable "NetImmerse/Gamebryo (.nif)".

## Manual install
1) Download the latest zip:
   https://github.com/niftools/blender_niftools_addon/releases/download/v0.1.1/blender_niftools_addon-v0.1.1-2023-11-03-0305c8d5.zip
2) Blender → Edit → Preferences → Add-ons → Install… → pick the zip → enable "NetImmerse/Gamebryo (.nif)".

## Notes
- The exporter uses the "Fallout 4" game profile when available.
- If the exporter is absent or fails, the add-on falls back to FBX export so you can convert externally.
- Keep your meshes triangulated/clean and textures ready for DDS (BC1/BC3/BC5) for FO4.
