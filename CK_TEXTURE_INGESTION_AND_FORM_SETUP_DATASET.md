# Creation Kit Texture Ingestion & Form Setup Dataset

This guide defines a structured lesson dataset for registering custom assets in Fallout 4 Creation Kit, configuring BGSM materials, and evaluating student optimization quality.

## 1) JSON Dataset: CK Asset Registration and Form Setup

```json
{
  "fallout4_modding_course": {
    "module_1_submodule_ck_ingestion": {
      "lesson_title": "Creation Kit Asset Registration & Form Setup",
      "learning_objectives": [
        "Ingest custom .nif meshes and textures into the Creation Kit data directory.",
        "Construct Material Swap records for runtime texture variation without mesh duplication.",
        "Create Armor, Weapon, and Static forms with correct model/material pathing."
      ],
      "technical_blueprint": {
        "directory_structure": {
          "meshes_path": "Data\\Meshes\\MyMod\\",
          "textures_path": "Data\\Textures\\MyMod\\",
          "materials_path": "Data\\Materials\\MyMod\\"
        },
        "form_creation_steps": {
          "static_objects": "Object Window -> WorldData -> Static -> New -> set ID and model .nif path.",
          "weapons_and_armor": "Items -> Weapon/Armor -> duplicate vanilla base -> update Model/FirstPerson/MaterialSwap."
        },
        "material_swaps": {
          "definition": "Runtime records that remap source .bgsm references to alternate target materials.",
          "editor_setup": "Miscellaneous -> Material Swap -> map source and target material paths exactly."
        }
      }
    }
  }
}
```

## 2) Practical Blueprint: Custom BGSM Generation

- Create a new BGSM in Material Editor (`File -> New -> BGSM`).
- Use relative texture paths only:
  - `Textures\\MyMod\\MyAsset_d.dds`
  - `Textures\\MyMod\\MyAsset_n.dds`
  - `Textures\\MyMod\\MyAsset_s.dds`
- Set material properties:
  - Smoothness baseline `1.0` when relying on `_n.dds` alpha gloss data.
  - Specular color baseline `1.0, 1.0, 1.0` unless deliberate metal tinting is needed.
- Enable required shader flags:
  - `Specular_Lighting`
  - `Receive_Shadows`
  - `Cast_Shadows`
  - `Model_Space_Normals` only for world-space normal workflows.

## 3) Student Assessment Rubric

| Grading Metric | Target Threshold | Weight | Failure Trigger |
| --- | --- | --- | --- |
| Geometry Optimization | Weapons < 40k tris, Armor < 30k tris, Statics < 15k tris | 35% | Triangles exceed target by >25% |
| UV Texel Density Uniformity | Consistent density across related mesh pieces | 25% | Visible blur/stretch on secondary surfaces |
| UV Island Packing Efficiency | >85% texture coverage (<15% wasted area) | 20% | Large empty UV zones or excessive gaps |
| Material Path Sanity Alignment | 100% relative mesh/texture/material paths | 20% | Absolute `C:\\...` paths or unsanitized NIF string tables |
