# High-to-Low Poly Baking Workflow Dataset (Fallout 4)

This document provides a structured lesson dataset and practical execution checklist for high-to-low baking workflows used in modern Fallout 4 asset production.

## JSON Lesson Dataset

```json
{
  "fallout4_modding_course": {
    "module_1_submodule_baking": {
      "lesson_title": "High-to-Low Poly Baking for Fallout 4 Assets",
      "learning_objectives": [
        "Construct matching high-poly and low-poly geometric pairs for uniform baking.",
        "Configure custom cage meshes to control raycast distances and prevent projection artifacts.",
        "Bake error-free tangent space normal maps tailored to Creation Engine shading rules."
      ],
      "technical_blueprint": {
        "mesh_preparation": {
          "naming_convention": "High-poly meshes use suffix _high and low-poly meshes use suffix _low.",
          "topology_rules": "Low-poly meshes keep UV seam edges sharp and should use weighted normals before baking."
        },
        "cage_mesh_generation": {
          "definition": "A cage is an inflated low-poly duplicate that fully encloses high and low meshes.",
          "execution": "Duplicate the low mesh, rename to _cage, and displace outward uniformly without changing vertex order."
        },
        "baking_parameters": {
          "software": "Substance Painter / Marmoset Toolbag",
          "tangent_space": "MikkTSpace",
          "output_resolution": "2048 for weapons/items, 4096 for large environment structures",
          "anti_aliasing": "4x4 or 8x8 subsampling",
          "padding_dilation": "Minimum 16px"
        }
      },
      "troubleshooting_guide": [
        {
          "symptom": "Wavy lines and skewed details on flat surfaces.",
          "cause": "Ray skew from low-poly normal alignment issues.",
          "resolution": "Enable averaged normals in baker or use a corrected custom cage."
        },
        {
          "symptom": "Black gradients, seam lines, or missing edge details.",
          "cause": "Ray distance mismatch or missing sharp-edge seam setup.",
          "resolution": "Increase front/rear ray distances and expand cage coverage."
        }
      ]
    }
  }
}
```

## Step-by-Step Practical Blueprint

1. **Geometric alignment and pivot matching**
   - Align `_high` and `_low` meshes in world space.
   - Apply transforms (`Ctrl + A -> All Transforms`) and ensure matching origins.
2. **Hard edges and UV seam setup**
   - Mark UV boundary edges as sharp.
   - Use Auto Smooth or an edge-split strategy to prevent normal bleed.
3. **Export to baker**
   - Export separate `_high` and `_low` FBX/OBJ files at scale `1.0`.
   - Keep required modifiers applied and omit unnecessary rig/armature data.
4. **Substance Painter bake setup**
   - Load `_low` as project mesh.
   - Assign `_high` as high-definition source.
   - Set **Match** to **By Mesh Name** to isolate projection pairs and avoid cross-bleed.
