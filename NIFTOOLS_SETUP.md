# Niftools setup (Fallout 4 NIF export)

The add-on calls the Blender Niftools exporter when it is installed.

## Version

**Latest release: v0.1.1** (2023-11-03) — this is the newest version available.

- Compatible with Blender 2.8 – 3.6.
- **NOT** compatible with Blender 4.x.
- If you run Blender 4.x, install Blender 3.6 LTS side-by-side and do the
  final NIF export there, or rely on the FBX fallback and convert with an
  external tool (NifSkope, Outfit Studio, Cathedral Assets Optimizer).

## Quick install on Windows (PowerShell)

```powershell
# From repo root
pwsh -File tools/install_niftools.ps1 -BlenderVersion 3.6
```

This downloads and extracts the Niftools add-on into:

```
%APPDATA%\Blender Foundation\Blender\3.6\scripts\addons
```

Then open Blender 3.6 → Edit → Preferences → Add-ons → search **"NetImmerse"**
and enable **"NetImmerse/Gamebryo (.nif)"**.

## Manual install

1. Download the v0.1.1 zip (newest release):
   `https://github.com/niftools/blender_niftools_addon/releases/download/v0.1.1/blender_niftools_addon-v0.1.1-2023-11-03-0305c8d5.zip`
2. Blender → Edit → Preferences → Add-ons → **Install…** → pick the zip.
3. Enable **"NetImmerse/Gamebryo (.nif)"**.

## What the add-on does automatically

When you click **Export Mesh (.nif)** the add-on:

1. **Applies transforms** (scale + rotation) so geometry arrives at the correct
   size/orientation in Fallout 4.
2. **Creates a UV map** via smart-unwrap if none is present (Niftools requires
   UV coordinates on every mesh).
3. **Triangulates** via a temporary modifier — FO4 BSTriShape nodes store
   triangles only; the modifier is removed after export so your mesh is
   unchanged.
4. Passes the exact Fallout 4 NIF settings to Niftools v0.1.1:
   - `game = FALLOUT_4` → NIF 20.2.0.7, user ver 12, uv2 131073, BSTriShape
   - `use_tangent_space = True` → required for FO4 normal maps
   - `scale_correction = 1.0` → 1 Blender unit = 1 NIF unit
   - `apply_modifiers = True` → bakes triangulate into export
   - `export_type = nif` → geometry file, not KF animation
5. Includes any associated `UCX_` collision mesh in the export.
6. Falls back to FBX (for external conversion) if NIF export fails, and prints
   the full error traceback to the system console for debugging.

## Fallout 4 NIF format reference

| Parameter       | Value    |
|-----------------|----------|
| NIF version     | 20.2.0.7 |
| User version    | 12       |
| User version 2  | 131073   |
| Geometry nodes  | BSTriShape (NOT NiTriShape) |
| Shader property | BSLightingShaderProperty |

## Troubleshooting "Export of nif failed"

1. **Open the system console** (Window menu → Toggle System Console on Windows)
   to see the full error traceback printed by the add-on.
2. **Common causes:**
   - Unapplied scale/rotation (Ctrl+A → All Transforms before exporting).
   - No UV map on the mesh.
   - Mesh contains quads that somehow bypassed the auto-triangulate step.
   - Wrong Blender version: Niftools v0.1.1 only supports Blender 2.8–3.6.
   - Niftools not installed or not enabled in Preferences.
3. If NIF export is unavailable, the add-on automatically exports an FBX file
   in the same location. Convert it to NIF using Cathedral Assets Optimizer or
   NifSkope.
