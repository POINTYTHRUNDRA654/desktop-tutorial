# BA2 Archive Packaging, LOD Generation, and MCM Dataset

This guide defines structured Fallout 4 curriculum content for BA2 packaging correctness, distant LOD generation, and in-game Mod Configuration Menu (MCM) setup.

## 1) JSON Dataset: BA2 Packaging and Resource Compression

```json
{
  "fallout4_modding_course": {
    "module_3_submodule_ba2_packaging": {
      "lesson_title": "Advanced BA2 Asset Packaging and Resource Compression",
      "learning_objectives": [
        "Differentiate General vs Texture BA2 formats to avoid crashes.",
        "Apply appropriate compression profiles by asset type.",
        "Use strict archive naming and folder hierarchy for automatic mounting."
      ],
      "technical_blueprint": {
        "archive_types": {
          "general_format": "For nif/bgsm/pex/fuz/hkx and other non-texture assets.",
          "texture_format": "For dds-only texture streaming archives."
        },
        "naming_conventions": {
          "rule": "BA2 prefix must match active plugin root name.",
          "example_main": "MyModName - Main.ba2",
          "example_textures": "MyModName - Textures.ba2"
        },
        "compression_profiles": {
          "textures": "Use DDS-appropriate formats (BC1/BC5/BC7) and avoid redundant extra compression.",
          "audio": "Use .fuz payloads in General BA2 without unnecessary recompression."
        }
      }
    }
  }
}
```

## 2) Practical Blueprint: LOD Generation

1. Install xLODGen and set output to a clean external directory.
2. Select edited worldspace and enable Objects LOD.
3. Generate LOD4/LOD8/LOD16/LOD32 with quality scaled by distance tier.
4. Build atlas textures (for example, 4096 atlas and controlled bake size).
5. Deploy generated `Meshes\\LOD\\` and `Textures\\LOD\\` output into mod packaging workflow.

## 3) Practical Blueprint: In-Game MCM Setup

- Place config at:
  - `Data\\MCM\\Config\\MyModName\\config.json`
- Define pages/panels/controls in JSON with Papyrus-bound IDs.
- Bind settings in a quest script (for example `MyMCMControllerScript`) and react to setting-change events.
- Keep all paths and identifiers stable to avoid runtime setting desync.
