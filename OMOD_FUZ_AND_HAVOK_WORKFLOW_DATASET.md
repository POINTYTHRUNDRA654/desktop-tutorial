# OMOD Slots, FUZ Lip-Sync, and Havok Collision Workflow Dataset

This dataset defines advanced Fallout 4 instruction content for weapon attachment architecture, voice-line packaging, and collision setup.

## 1) JSON Dataset: Custom Weapon Mod Attachment Slots (OMOD)

```json
{
  "fallout4_modding_course": {
    "module_4_submodule_omod_slots": {
      "lesson_title": "Weapon Attachment Customization Architecture (OMODs)",
      "learning_objectives": [
        "Build OMOD-driven attachment systems linked to weapon records.",
        "Define AP and MA keyword mappings for valid slot filtering.",
        "Apply stat and model transformation properties with controlled math operators."
      ],
      "technical_blueprint": {
        "record_triad_structure": {
          "constructible_object_co": "Workbench recipe that outputs an OMOD-driven attachment.",
          "object_modification_omod": "Primary modifier record controlling model swaps and stat deltas.",
          "misc_object_misc": "Inventory fallback item when an attachment is removed."
        },
        "keyword_mapping": {
          "ap_keyword": "Attach Point keyword defines where the part mounts on the base weapon.",
          "ma_keyword": "Mod Association keyword on the base weapon gates valid recipes."
        },
        "property_data_types": {
          "form_transformation": "Model/path overrides for runtime visual attachment binding.",
          "float_modifiers": "Numeric adjustments (speed, accuracy, weight) via Add/Multiply/Set semantics."
        }
      }
    }
  }
}
```

## 2) Practical Blueprint: Custom Voice Line Lip-Sync (.FUZ) Generation

1. Master source dialogue WAV as PCM 16-bit, mono, 44.1kHz.
2. Generate matching `.lip` data from spoken transcript text.
3. Convert WAV to `.xwm` using a Fallout-compatible converter profile.
4. Package `.xwm` + `.lip` into `.fuz` and deploy into:
   - `Data\\Sound\\Voice\\<PluginName>.esp\\<VoiceType>\\`

## 3) Practical Blueprint: Dynamic Collision Mesh Setup (Havok)

1. Create simplified collision geometry (convex-friendly hull) from the visual mesh.
2. Assign suitable Havok material traits (for example metal/wood/cloth behavior families).
3. In NifSkope, wire collision hierarchy:
   - `bhkCollisionObject` -> `bhkRigidBody` -> `bhkCompressedMeshShape` or `bhkConvexVerticesShape`
4. Tune physics values (mass/friction) to prevent unrealistic sliding or sink-through behavior.

## Troubleshooting Focus

- If OMODs craft but do not appear, verify model target paths/nodes match the intended NIF structure.
- If a recipe is missing in workbench menus, validate category/filter keywords and MA/AP alignment.
- If custom dialogue has no lip movement, verify transcript alignment and `.lip` generation step.
- If placed assets fall through the world, verify collision nodes and valid bound geometry are present.
