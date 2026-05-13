# Advanced NIF Export and Event-Driven Papyrus Pipeline

This guide gives Mossy a compact, modern teaching blueprint for two advanced Fallout 4 modding lesson tracks:

1. The 3D asset and `.nif` optimization pipeline
2. Event-driven Papyrus programming

It is intended to support 2025-2026 teaching flows focused on real production practices, optimized assets, and low-latency scripting.

---

## Lesson Module 1: The 3D Asset & `.NIF` Optimization Pipeline

### Learning Objectives

- Master a modern high-to-low poly baking workflow
- Convert standard PBR outputs into Fallout 4-ready texture and material structures
- Structure, sanitize, and validate exported `.nif` files before testing in-game

### Step-by-Step `.NIF` Export Pipeline

#### Step 1: High-to-Low Poly Baking

- Build the source asset in a high-detail package such as Blender or ZBrush
- Bake detail from the high-poly source onto an optimized low-poly game mesh
- Keep the low-poly mesh clean, smooth-shaded, and properly UV unwrapped
- Verify hard edges, smoothing splits, and bake cages before exporting textures

#### Step 2: PBR Texture Exporting

- Texture the asset in a standard Metallic/Roughness PBR workflow
- Export with a Fallout 4-oriented preset
- Required output set:
  - `*_d.dds` = Base Color / Albedo
  - `*_n.dds` = Normal map with gloss or smoothness packed into alpha
  - `*_s.dds` = Specular map with auxiliary packed data in alpha

#### Step 3: Preparing the NIF Structure

- Import a reference `.nif` of a similar vanilla asset with Blender NifTools
- Parent or bind the custom geometry to the matching reference hierarchy
- Match vertex colors, weights, and expected mesh structure to the reference
- Use the reference setup to preserve expected game-side deformation and shading behavior

#### Step 4: Creating the Material (`.BGSM`)

- Open Material Editor and create a new `.bgsm`
- Point the material to the relative paths for the exported `_d`, `_n`, and `_s` textures
- Configure the required shader options for the target asset class
- Typical flags to verify include:
  - `Specular`
  - `Specular_Lighting`
  - `Receive_Shadows`
  - `Cast_Shadows`
  - `Double Sided` when appropriate, such as foliage or thin planes

#### Step 5: Finalizing in NifSkope

- Export the mesh from Blender as a `.nif`
- Open the exported file in NifSkope
- Find the `BSTriShape` or `NiTriShape` and its `BSLightingShaderProperty`
- Put the relative `.bgsm` path in the material hook/name field used by the shader property
- Sanitize the file before testing:
  - `Spells -> Optimize -> Clean Nifty String Index Table`

### Geometry and UV Optimization Rules

- Keep weapon models under roughly 40,000 triangles unless the design requires otherwise
- Keep large environmental assets under roughly 15,000 triangles unless there is a justified exception
- Pack UV islands tightly to maximize texel density
- Mark seam-driven hard edges intentionally before baking normals
- Validate normal direction, tangent continuity, and smoothing group consistency

### PBR Packing Reference

Fallout 4 teaching shorthand for the packed outputs:

- `Texture_d.dds`
  - RGB = Albedo
  - Alpha = Transparency when needed
- `Texture_n.dds`
  - RGB = Normal map
  - Alpha = Smoothness or gloss data
- `Texture_s.dds`
  - R = Specular
  - G = Metalness
  - B = Ambient Occlusion
  - Alpha = Rim or auxiliary surface response data

### NIF Material Hook Structure

```text
NiNode (Root)
└── BSTriShape / NiTriShape
    └── BSLightingShaderProperty
        └── relative path to file.bgsm
```

### Common Errors to Teach

#### Issue: The asset is pitch black in-game

Likely checks:

- The `.bgsm` path is wrong or absolute instead of relative
- The normal map alpha channel is missing required packed data
- The shader flags do not match the asset type

#### Issue: The asset causes an instant CTD on load

Likely checks:

- The exported `.nif` has a corrupted string index table
- The shader/material block points to invalid data
- The mesh structure deviates too far from the expected reference layout

Primary cleanup step:

- Run `Spells -> Optimize -> Clean Nifty String Index Table`

---

## Lesson Module 2: Event-Driven Papyrus Programming

### Learning Objectives

- Replace polling loops with targeted event registration
- Use Papyrus states to simplify branching and reduce script overhead
- Reduce save bloat by minimizing long-lived active script attachments

### Rule 1: Eliminate `OnUpdate()` Loops

Do not teach constant polling as a default architecture.

- Avoid `RegisterForUpdate()` and `RegisterForSingleUpdate()` for routine background checks
- Prefer event-driven registration:
  - `RegisterForAnimationEvent()`
  - `RegisterForCustomEvent()`
  - `RegisterForRemoteEvent()`

Teach the idea that a script should sleep until the engine delivers the exact event it needs.

### Rule 2: Implement State-Driven Architecture

Use Papyrus states instead of large repeated conditional chains.

- Put baseline behavior in an `Auto State`
- Switch into focused work states with `GoToState("Active")`
- Exit back to the idle/default state immediately after completing one-shot logic

This keeps execution paths narrow and easier to reason about.

### Rule 3: Use Strict Array Planning and Memory Discipline

- Avoid repeated runtime resizing of arrays
- Pre-plan array sizes when possible
- Prefer native or F4SE-assisted structures when the design requires heavier data handling
- Keep array-heavy work out of frequently triggered events whenever possible

### Rule 4: Use Short-Lived Quest Logic for Persistence Control

- Scripts attached to persistent actors or world objects can stay resident in save data
- For transient operations, prefer quest-driven processing that starts, performs work, and stops cleanly
- Design short-lived orchestration flows that release memory pressure after the action completes

### Modern Teaching Pattern

- Register for the exact game event
- Transition to a processing state only when the trigger occurs
- Perform the work once
- Return to the idle state or stop the owning quest cleanly

### Common Errors to Teach

#### Issue: The script stops responding after long play sessions

Likely checks:

- The script entered a custom state and never returned
- The exit path back to the default state is missing

#### Issue: The mod causes stack dumping or script lag

Likely checks:

- Heavy native calls are firing inside loops
- Array operations are happening too often on active events
- The design still depends on periodic polling instead of exact event hooks

### Tutor Framing Notes

When Mossy teaches this material, emphasize:

- event-driven logic over polling
- states over sprawling conditional chains
- short-lived quest orchestration over permanent save residency
- validation in-game after every structural change

These topics should be taught as optimization-first production habits, not optional cleanup steps.
