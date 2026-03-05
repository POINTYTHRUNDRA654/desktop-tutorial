# Tooling setup (FO4 export, textures, game engine assets)

## Included helper installers
- **Niftools exporter (FO4 NIF)**: [tools/install_niftools.ps1](tools/install_niftools.ps1) — installs Blender Niftools add-on v0.1.1 into the chosen Blender version (supports 2.8–3.6). For Blender 4.x, install 3.6 LTS side-by-side for NIF export, or use FBX fallback.
- **texconv (DDS/BCn converter)**: [tools/install_texconv.ps1](tools/install_texconv.ps1) — downloads Microsoft texconv (MIT, DirectXTex) to `tools/bin/texconv.exe` for BC1/BC3/BC5/BC7 DDS output.

## External tools (not bundled; provide links)
- **NVTT (NVIDIA Texture Tools)**: https://github.com/castano/nvidia-texture-tools (BCn compression). Build or download a release; point the add-on to the binary if you prefer NVTT over texconv.
- **Unity asset extraction**: AssetRipper (GUI/CLI) https://github.com/AssetRipper/AssetRipper or AssetStudio https://github.com/Perfare/AssetStudio to unpack .unitypackage / project assets to FBX + textures. Respect asset licenses.
- **Unreal asset extraction**: UModel (UE Viewer) https://www.gildor.org/en/projects/umodel or Unreal Editor command-line exporters to FBX/GLTF. Respect project licenses.
- **UE5‑asset importer**: the add-on bundles a lightweight front‑end for the
  community-maintained [Blender‑UE4‑Importer](https://github.com/Waffle1434/Blender-UE4-Importer).
  The importer itself isn’t shipped due to size/license churn; when you click
  “Check/Install UE Importer” in the Tools panel the wrapper will automatically
  download the latest copy from GitHub or, if that isn’t possible, it will
  prompt you to fetch it manually from the project page.

  *Offline/manual install:* if you prefer to vendor the importer or are
  working in an environment without network access simply clone or download
  the repository yourself and place it under
  `tools/Blender-UE4-Importer` inside the add‑on directory.  The next time the
  add-on is enabled the helper will detect the code and register it without
  touching GitHub.

- **Local dependency cache:** the add-on can install Python packages such as
  `libigl` automatically when needed.  To support fully offline setups you can
  drop a wheel file (e.g. `libigl‑0.?.?.whl`) into `tools/`; the auto-weight
  helper will prefer that file over downloading from PyPI.

## Usage tips
- Install the Niftools add-on per Blender version you plan to export with; on Blender 4.x use a compatible fork or export via Blender 3.6 LTS.
- Configure converter paths in Add-on Preferences: set `nvcompress` (NVTT) and/or `texconv` (DirectXTex). The add-on will auto-detect them and fall back to texconv if NVTT is missing.
- Use texconv or NVTT to convert textures to DDS: BC1 for diffuse, BC3 for alpha, BC5 for normals, BC7 if desired.
- Keep meshes clean/triangulated before NIF export; apply transforms and ensure correct armature bindings when exporting skinned assets.
- In the Texture Conversion panel, run “Self-Test Converters” to verify nvcompress/texconv are working.
