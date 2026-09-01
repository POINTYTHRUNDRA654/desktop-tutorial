# JSON Dataset Structure: 3D Asset & Papyrus Lessons + Stability Manual

This guide stores a structured, machine-readable teaching blueprint for advanced Fallout 4 tutoring.

## Fallout 4 Modding Course Dataset

Use this dataset structure to drive lesson generation, quiz prompts, and AI retrieval routing.

```json
{
  "fallout4_modding_course": {
    "module_1_3d_asset_pipeline": {
      "lesson_title": "Advanced 3D Asset Optimization & NIF Creation",
      "learning_objectives": [
        "Execute high-to-low poly baking for optimized 2026-level game geometry.",
        "Pack texture maps using Bethesda's custom PBR specularity and glossiness channels.",
        "Assemble stable .nif and .bgsm file links using NifSkope and Material Editor."
      ],
      "technical_blueprint": {
        "geometry_targets": {
          "weapon_max_triangles": 40000,
          "environment_max_triangles": 15000,
          "uv_requirement": "All UV seams must be marked as Sharp before baking normal maps."
        },
        "pbr_channel_packing": {
          "diffuse_map_d": "RGB: Albedo/Base Color, Alpha: Transparency/Opacity Mask",
          "normal_map_n": "RGB: DirectX Normal Map (Y-Channel Inverted), Alpha: Smoothness/Glossiness Mask",
          "specular_map_s": "R: Metalness, G: Specular Intensity, B: Ambient Occlusion, Alpha: Subsurface/Rim Light Reflection"
        },
        "material_flags_bgsm": ["Specular", "Receive_Shadows", "Cast_Shadows", "Remap_Textures"],
        "nif_node_hierarchy": [
          "NiNode (Root)",
          "└── BSTriShape (Low-Poly Mesh Geometry)",
          "     └── BSLightingShaderProperty (Material Link Node)",
          "          └── BSShaderTextureSet (Explicit Relative File Paths)"
        ]
      }
    },
    "module_2_papyrus_programming": {
      "lesson_title": "Event-Driven Architecture & Save-Game Optimization",
      "learning_objectives": [
        "Eliminate periodic polling methods to stop runtime script latency.",
        "Build state-driven frameworks to process complex logical workflows.",
        "Implement short-lived quest structures to stop save-file inflation."
      ],
      "technical_blueprint": {
        "memory_management_rules": [
          "Do not dynamically resize script arrays during runtime execution.",
          "Offload mass sorting or filtering to F4SE-backed native structures when needed.",
          "Shut down transient processing with explicit Quest Stop() flow."
        ]
      }
    }
  }
}
```

## Engine Stability & Optimization Manual

### 1) FormID Management and Plugin Boundaries

- Full plugin (`.esm`/`.esp`) capacity is bounded by master slot space (0x00 through 0xFD).
- Use ESL-flagged plugins where appropriate to reduce full-slot pressure.
- ESL-safe record allocation must remain within `0x000` to `0xFFF`; overflow risks runtime corruption.

### 2) Precombined Mesh and Precomputed Visibility Rules

- Fallout 4 performance relies on precombine geometry (`.ucb`) and previs (`.uvd`) data.
- Moving or deleting statics in a cell can invalidate optimization for that cell and cause major FPS loss.
- Required rebuild flow for world edits:
  1. Open changed cells in Creation Kit.
  2. Run `World -> Precombine Geometry for Current Cell`.
  3. Run `World -> Generate Previs for Current Cell`.
  4. Package resulting `.ucb` and `.uvd` with the mod release.
