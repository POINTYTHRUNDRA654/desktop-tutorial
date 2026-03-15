# Unity asset import tips

- Preferred inputs: FBX or GLTF exported from Unity; otherwise extract via AssetRipper/AssetStudio to FBX + textures.
- Scale: Unity units = meters; usually aligns with Blender 1m; still apply transforms after import.
- Materials: Unity standard maps often named `_Albedo`, `_Normal`, `_MetallicSmoothness`:
  - Albedo → BC1/BC7, sRGB.
  - Normal → BC5, linear.
  - Metallic/smoothness (often R=metal, A=smoothness) → BC3/BC7, linear.
- Armatures: if humanoid, check bone orientation after import; apply scale and fix roll if needed.
- Colliders: if missing, generate simplified collision meshes in Blender.
- After import: apply transforms, set Auto Smooth, fix non-manifold, triangulate before export.
