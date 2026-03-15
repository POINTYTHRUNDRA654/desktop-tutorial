# Unreal Engine FBX import tips

- Preferred inputs: FBX/GLTF exported from UE (Editor or command-line). Raw .uasset/.umap require external extraction.
- Scale: UE uses centimeters; imports may come in scaled by 0.01. Apply transforms to get 1 unit = 1 meter in Blender.
- Skeletons: UE mannequin uses specific bone names; keep naming intact. Check armature modifier and apply scale.
- Materials: exported FBX often carries material slots; textures usually T_* names:
  - T_*_D / _BaseColor → BC1/BC7, sRGB.
  - T_*_N → BC5, linear.
  - T_*_M / _R / _O / _A packed maps: route channels accordingly; likely BC3/BC7, linear.
- LODs: UE FBX may include LODs; choose desired LOD or import all and pick one.
- After import: apply transforms, enable Auto Smooth, triangulate, fix non-manifold, ensure collision meshes exist.
