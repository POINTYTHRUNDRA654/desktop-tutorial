# Niftools setup (Fallout 4 NIF export)

The add-on exports NIF files via three methods, tried in order:

1. **Niftools v0.1.1 Blender operator** — direct, highest fidelity (skinning, morphs, collision)
2. **Native NIF writer** (built-in, no Niftools needed) — pure-Python BSTriShape exporter for static meshes
3. **FBX fallback** — for external conversion with Cathedral Assets Optimizer

## Version

**Latest release: v0.1.1** (2023-11-03) — this is the version used for method 1.

- Officially compatible with Blender 2.8 – 3.6.
- **Blender 4.x** — niftools v0.1.1 was not originally designed for Blender 4.x,
  but this add-on automatically patches two known incompatibilities so NIF
  export works on Blender 4.x without needing Blender 3.6:
  - `AttributeError: 'Object' object has no attribute 'face_maps'`
    (`get_polygon_parts` and `export_skin_partition` patched at runtime).
  - The patches are applied transparently before every export — no user action
    required.
- **Blender 4.2 / 5.x** — Niftools installs as a **Legacy Add-on** (not an
  Extension).  After running the installer you must enable "Allow Legacy
  Add-ons" in Edit → Preferences → Add-ons, then enable the add-on.
  Two additional API patches are applied automatically:
  - `calc_normals_split()` / `free_normals_split()` removed in Blender 5.0 →
    `Mesh.get_geom_data` is wrapped with a transparent proxy that provides
    no-op versions of those methods; loop normals are auto-computed.
  - `normals_split_custom_set_from_vertices` removed in Blender 5.0 →
    `Vertex.map_normals` (NIF import path) is replaced to use
    `normals_split_custom_set` with per-loop normals.
- If Niftools is not installed or the operator fails, the **native NIF writer**
  (`native_nif_writer.py`) handles static mesh export automatically — no
  additional tools required.

## Quick install on Windows (PowerShell)

```powershell
# Blender 3.x (standard)
pwsh -File tools/install_niftools.ps1 -BlenderVersion 3.6

# Blender 5.x (legacy add-on path — same scripts\addons directory)
pwsh -File tools/install_niftools.ps1 -BlenderVersion 5.0
```

This downloads and extracts the Niftools add-on into:

```
%APPDATA%\Blender Foundation\Blender\{version}\scripts\addons
```

**For Blender 4.2 and later**, after running the installer:
1. Open Blender → Edit → Preferences → Add-ons
2. Check **"Allow Legacy Add-ons"** (checkbox at the top of the list)
3. Search for **"NetImmerse"** and enable **"NetImmerse/Gamebryo (.nif)"**

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
4. **Applies Blender 4.x patches** to niftools at runtime so the removed
   `face_maps` API does not crash the export.
5. Passes the exact NIF settings for the target game (auto-detected from the
   scene or defaulting to Fallout 4 OG):
   - `game = FALLOUT_4` → NIF 20.2.0.7, user_version 12, bsver 130, BSTriShape
   - `use_tangent_space = True` → required for FO4 normal maps
   - `scale_correction = 1.0` → 1 Blender unit = 1 NIF unit
   - `apply_modifiers = True` → bakes triangulate into export
   - `export_type = nif` → geometry file, not KF animation
   - `skin_partition = False` → FO4 uses BSSubIndexTriShape, not old partitions
6. Includes any associated `UCX_` collision mesh in the export.
7. Falls back to FBX (for external conversion) if NIF export fails, and prints
   the full error traceback to the system console for debugging.

## Supported NIF game profiles

Every supported game is pre-configured with the correct version numbers
(verified against the authoritative **niftools/nifxml** `nif.xml` spec):

| Game | Profile key | NIF version | user_version | bsver |
|------|-------------|-------------|-------------|-------|
| Morrowind | `MORROWIND` | 4.0.0.2 | 0 | 0 |
| Oblivion | `OBLIVION` | 20.0.0.5 | 11 | 11 |
| Fallout 3 | `FALLOUT_3` | 20.2.0.7 | 11 | 34 |
| Fallout: New Vegas | `FALLOUT_NV` | 20.2.0.7 | 11 | 34 |
| Skyrim LE | `SKYRIM` | 20.2.0.7 | 12 | 83 |
| Skyrim SE | `SKYRIM_SE` | 20.2.0.7 | 12 | 100 |
| **Fallout 4 OG** | `FALLOUT_4` | 20.2.0.7 | **12** | **130** |
| **Fallout 4 NG** | `FALLOUT_4_NG` | 20.2.0.7 | **12** | **130** |
| **Fallout 4 AE** | `FALLOUT_4_AE` | 20.2.0.7 | **12** | **130** |

### Fallout 4 editions

| Edition | Description |
|---------|-------------|
| **OG** | Original 2015 release — standard FO4 modding target |
| **NG** | Next Gen update (April 25, 2024) — new Creation Club assets |
| **AE** | Anniversary Edition (November 10, 2025) — 10th anniversary; all DLC + 150+ Creation Club items, built on NG engine |

All three editions share the same NIF format (`user_version=12`, `bsver=130`).
To select a specific edition set the scene's niftools_scene game to the
corresponding profile key (e.g. `FALLOUT_4_NG`).  If the scene game is not
set (UNKNOWN) the add-on defaults to `FALLOUT_4` (OG).

## Troubleshooting "Export of nif failed"

1. **Open the system console** (Window menu → Toggle System Console on Windows)
   to see the full error traceback printed by the add-on.
2. **Common causes:**
   - Unapplied scale/rotation (Ctrl+A → All Transforms before exporting).
   - No UV map on the mesh.
   - Mesh contains quads that somehow bypassed the auto-triangulate step.
   - Niftools not installed or not enabled in Preferences.
   - `AttributeError: 'Object' has no attribute 'face_maps'` — this is
     auto-patched on Blender 4.x; if it still appears, re-install the add-on.
   - `"Do not know how to export texture node … with label …"` — this error
     means the texture node's **label** does not contain any of the slot strings
     that niftools recognises.  Niftools uses a **substring** (contains) check
     against the ``TEX_SLOTS`` constants in
     ``io_scene_niftools/utils/consts.py``.  The correct canonical labels are:

     | Niftools TEX_SLOTS | Texture type            | FO4 suffix | BSShaderTextureSet slot |
     |--------------------|-------------------------|------------|------------------------|
     | `Base`             | Diffuse / albedo colour | `_d`       | 0                      |
     | `Normal`           | Tangent-space normal    | `_n`       | 1                      |
     | `Specular`         | Specular / smoothness   | `_s`       | 3                      |
     | `Glow`             | Glow / emissive mask    | `_g`       | 2                      |

     **Important:** the label must **contain** the slot string — e.g. `"Base"`
     works, but `"Diffuse"` does **not** because `"Base"` is not a substring of
     `"Diffuse"`.

     The add-on automatically fixes legacy and incorrect labels (e.g. `"Diffuse"`,
     `"Diffuse (_d)"`, `"Normal Map (_n)"`) to the canonical TEX_SLOTS form
     before every NIF export.  New materials are created with label `"Base"` for
     the diffuse slot.  If you manually labelled a texture node, ensure its
     label **contains** one of the four canonical strings in the table above.
3. If NIF export is unavailable or fails, the add-on automatically exports an
   FBX file in the same location. Convert it to NIF using Cathedral Assets
   Optimizer or NifSkope.
